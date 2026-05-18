/**
 * 管理员服务 - 数据面板、用户管理、补打卡、积分调整、奖品管理、日志
 * 所有管理操作都会记录到 admin_logs 表
 * 敏感操作（禁用用户、调整积分、删除奖品）需要二次确认
 */
const { getDb, runInTransaction } = require('../db');
const { paginate } = require('./paginationHelper');
const { formatDate } = require('../utils/dateHelper');
const { addPoints, deductPoints } = require('./pointsService');
const { calculateStreak, updateStreak } = require('./checkinService');
const config = require('../config');
const AppError = require('../utils/AppError');

// 需要二次确认的操作列表（BUG-OPT-001 修复：添加 makeup_checkin，确保补打卡需要二次确认）
const SENSITIVE_ACTIONS = ['update_user_status', 'adjust_points', 'prize_delete', 'makeup_checkin'];

/**
 * 验证操作是否已确认
 * 敏感操作列表中的操作必须通过 confirmed 参数明确授权，防止误操作
 * @param {string} action - 操作类型
 * @param {boolean} confirmed - 是否已确认
 * @throws {Error} 敏感操作未确认时抛出错误
 */
function requireConfirmation(action, confirmed) {
  if (SENSITIVE_ACTIONS.includes(action) && !confirmed) {
    throw new AppError('该操作需要二次确认，请在请求中设置 confirmed: true');
  }
}

/**
 * 管理员补打卡
 * 在事务中原子性完成：插入打卡记录、增加积分、更新总打卡天数、重新计算连续天数
 * 使用事务确保数据一致性：任一操作失败则全部回滚
 * @param {number} adminId - 管理员 ID
 * @param {number} userId - 目标用户 ID
 * @param {number} taskId - 任务 ID
 * @param {string} checkinDate - 补打卡日期（YYYY-MM-DD）
 * @param {boolean} confirmed - 是否已确认，敏感操作需要此参数
 * @returns {Object} 包含 pointsEarned 和 newStreak 的对象
 */
function makeupCheckin(adminId, userId, taskId, checkinDate, confirmed = false) {
  requireConfirmation('makeup_checkin', confirmed);

  const db = getDb();

  // 校验用户存在且未被禁用
  const user = db.prepare('SELECT id, username FROM users WHERE id = ? AND status != ?').get(userId, 'disabled');
  if (!user) {
    throw new AppError('用户不存在或已禁用');
  }

  // 校验任务存在且属于该用户
  const task = db.prepare('SELECT id, name FROM tasks WHERE id = ? AND user_id = ? AND status = ?').get(taskId, userId, 'active');
  if (!task) {
    throw new AppError('任务不存在');
  }

  // 防止重复补打卡：同一用户、任务、日期已存在打卡记录则拒绝
  const existing = db.prepare(
    'SELECT id FROM checkins WHERE user_id = ? AND task_id = ? AND checkin_date = ?'
  ).get(userId, taskId, checkinDate);
  if (existing) {
    throw new AppError('该日期该任务已打卡');
  }

  const pointsEarned = config.pointsRules.checkin;

  // 使用事务包裹多个写操作，保证原子性
  return runInTransaction(() => {
    db.prepare(
      'INSERT INTO checkins (user_id, task_id, checkin_date, points_earned, is_makeup, makeup_by) VALUES (?, ?, ?, ?, 1, ?)'
    ).run(userId, taskId, checkinDate, pointsEarned, adminId);

    addPoints(userId, 'checkin', pointsEarned, `管理员补打卡: ${checkinDate}`);

    db.prepare('UPDATE users SET total_checkin_days = total_checkin_days + 1 WHERE id = ?').run(userId);

    // 补打卡后需要重新计算连续打卡天数，以当前日期为基准
    const today = formatDate();
    const newStreak = calculateStreak(db, userId, today);
    updateStreak(db, userId, newStreak);

    // 记录管理员操作日志用于审计
    logAdminAction(adminId, 'makeup_checkin', 'checkin', null, {
      userId, taskId, checkinDate, pointsEarned,
    });

    return { pointsEarned, newStreak };
  });
}

/**
 * 管理员调整用户积分
 * 支持正向增加和负向扣减，在事务中原子性完成
 * @param {number} adminId - 管理员 ID
 * @param {number} userId - 目标用户 ID
 * @param {number} amount - 调整数量（正数增加，负数扣减）
 * @param {string} reason - 调整原因，用于审计追溯
 * @param {boolean} confirmed - 是否已确认，敏感操作需要此参数
 * @returns {Object} 操作结果 { success, adjusted, userId }
 */
function adjustPoints(adminId, userId, amount, reason, confirmed = false) {
  requireConfirmation('adjust_points', confirmed);

  const db = getDb();

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new AppError('用户不存在');
  }

  // 在事务中执行积分调整和日志记录，确保日志与数据变更同步
  return runInTransaction(() => {
    if (amount > 0) {
      addPoints(userId, 'admin_adjust', amount, reason || '管理员调整');
    } else {
      deductPoints(userId, Math.abs(amount), 'admin_adjust', reason || '管理员调整');
    }

    logAdminAction(adminId, 'adjust_points', 'points', userId, { amount, reason });

    return { success: true, adjusted: amount, userId };
  });
}

/**
 * 获取管理面板数据
 * 聚合查询用户总数、打卡总数、积分总额、图片总数等关键指标
 * 包含今日活跃用户数和近7天每日打卡趋势数据
 * @returns {Object} 面板统计数据
 */
function getDashboard() {
  const db = getDb();

  // COALESCE 处理空表情况，避免 NULL 影响展示
  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE status != 'disabled'").get().cnt;
  const totalCheckins = db.prepare('SELECT COUNT(*) as cnt FROM checkins').get().cnt;
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM users').get().total;
  const totalImages = db.prepare("SELECT COUNT(*) as cnt FROM images WHERE status = 'active'").get().cnt;

  // 今日活跃用户数（去重统计）
  const today = formatDate();
  const todayCheckins = db.prepare(
    'SELECT COUNT(DISTINCT user_id) as cnt FROM checkins WHERE checkin_date = ?'
  ).get(today).cnt;

  // 近7天每日打卡趋势：按日期分组统计独立用户数和打卡次数
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekStart = formatDate(sevenDaysAgo);

  const weekData = db.prepare(
    `SELECT checkin_date, COUNT(DISTINCT user_id) as userCount, COUNT(*) as checkinCount
     FROM checkins
     WHERE checkin_date >= ?
     GROUP BY checkin_date
     ORDER BY checkin_date`
  ).all(weekStart);

  return {
    totalUsers, totalCheckins, totalPoints, totalImages, todayCheckins, weekData,
  };
}

/**
 * 获取用户列表（分页，支持搜索和状态筛选）
 * 使用 LIKE 模糊匹配用户名和昵称，支持多条件组合筛选
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} search - 搜索关键词（匹配用户名或昵称）
 * @param {string} status - 状态筛选（active/disabled）
 * @returns {Object} 分页结果 { records, total, page, pageSize, totalPages }
 */
function getUsers(page = 1, pageSize = 20, search = '', status = '') {
  const db = getDb();

  // 动态构建 WHERE 条件，避免 SQL 拼接，使用参数化查询防止注入
  const conditions = ['1=1'];
  const params = [];

  if (search) {
    conditions.push('(username LIKE ? OR nickname LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = conditions.join(' AND ');

  return paginate(db, {
    countSql: `users WHERE ${where}`,
    dataSql: `SELECT id, username, nickname, avatar, points, total_checkin_days, current_streak, status, is_admin, created_at
     FROM users WHERE ${where}
     ORDER BY id DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, username: row.username, nickname: row.nickname, avatar: row.avatar,
      points: row.points, totalCheckinDays: row.total_checkin_days, currentStreak: row.current_streak,
      status: row.status, isAdmin: row.is_admin, createdAt: row.created_at,
    }),
  });
}

/**
 * 更新用户状态（启用/禁用）
 * 敏感操作，需要二次确认
 * 包含状态值合法性校验和自身操作保护
 * @param {number} adminId - 管理员 ID
 * @param {number} userId - 目标用户 ID
 * @param {string} status - 新状态（active/disabled）
 * @param {boolean} confirmed - 是否已确认
 * @returns {Object} 操作结果 { success, userId, status }
 */
function updateUserStatus(adminId, userId, status, confirmed = false) {
  requireConfirmation('update_user_status', confirmed);

  const db = getDb();

  // 验证状态值合法性
  const allowedStatuses = ['active', 'disabled'];
  if (!allowedStatuses.includes(status)) {
    throw new AppError(`无效的状态值，允许的值: ${allowedStatuses.join(', ')}`);
  }

  // 防止管理员禁用自己
  if (userId === adminId) {
    throw new AppError('不能修改自己的状态');
  }

  const result = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  if (result.changes === 0) {
    throw new AppError('用户不存在或状态未改变');
  }

  logAdminAction(adminId, 'update_user_status', 'user', userId, { status });
  return { success: true, userId, status };
}

/**
 * 获取所有打卡记录（管理员视角，分页）
 * 支持按用户ID和日期范围筛选，关联用户表和任务表获取详细信息
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} userId - 用户 ID 筛选（可选）
 * @param {string} startDate - 开始日期筛选（可选，YYYY-MM-DD）
 * @param {string} endDate - 结束日期筛选（可选，YYYY-MM-DD）
 * @returns {Object} 分页结果
 */
function getAllCheckins(page = 1, pageSize = 20, userId = '', startDate = '', endDate = '') {
  const db = getDb();

  // 动态构建筛选条件
  const conditions = ['1=1'];
  const params = [];

  if (userId) { conditions.push('c.user_id = ?'); params.push(userId); }
  if (startDate) { conditions.push('c.checkin_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('c.checkin_date <= ?'); params.push(endDate); }

  const where = conditions.join(' AND ');

  // LEFT JOIN 用户和任务表，即使关联数据被删除也能正常展示打卡记录
  return paginate(db, {
    countSql: `checkins c WHERE ${where}`,
    dataSql: `SELECT c.id, c.user_id, u.username, u.nickname, t.name as task_name, c.checkin_date, c.image_path, c.note, c.points_earned, c.is_makeup, c.makeup_by, c.created_at
     FROM checkins c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN tasks t ON c.task_id = t.id
     WHERE ${where}
     ORDER BY c.created_at DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
      taskName: row.task_name, checkinDate: row.checkin_date, imagePath: row.image_path, note: row.note,
      pointsEarned: row.points_earned, isMakeup: row.is_makeup, makeupBy: row.makeup_by, createdAt: row.created_at,
    }),
  });
}

/**
 * 获取所有积分流水（管理员视角，分页）
 * 支持按用户ID和积分类型筛选，关联用户表获取用户名和昵称
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} userId - 用户 ID 筛选（可选）
 * @param {string} type - 积分类型筛选（可选，如 checkin/lottery/admin_adjust）
 * @returns {Object} 分页结果
 */
function getAllPointsLog(page = 1, pageSize = 20, userId = '', type = '') {
  const db = getDb();

  const conditions = ['1=1'];
  const params = [];

  if (userId) { conditions.push('pl.user_id = ?'); params.push(userId); }
  if (type) { conditions.push('pl.type = ?'); params.push(type); }

  const where = conditions.join(' AND ');

  return paginate(db, {
    countSql: `points_log pl WHERE ${where}`,
    dataSql: `SELECT pl.id, pl.user_id, u.username, u.nickname, pl.type, pl.amount, pl.description, pl.created_at
     FROM points_log pl
     LEFT JOIN users u ON pl.user_id = u.id
     WHERE ${where}
     ORDER BY pl.created_at DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
      type: row.type, amount: row.amount, description: row.description, createdAt: row.created_at,
    }),
  });
}

/**
 * 创建奖品
 * 将 managePrize 拆分为独立函数，提高代码可读性
 * 创建成功后失效奖品缓存，确保下次查询获取最新数据
 * @param {number} adminId - 管理员 ID
 * @param {Object} prizeData - 奖品数据 { name, description, image, probability, prizeType, pointsReward, stock }
 * @returns {Object} 操作结果 { success: true }
 */
function createPrize(adminId, prizeData) {
  const db = getDb();
  db.prepare(
    'INSERT INTO prizes (name, description, image, probability, prize_type, points_reward, stock) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(prizeData.name, prizeData.description || null, prizeData.image || null, prizeData.probability,
    prizeData.prizeType || 'virtual', prizeData.pointsReward || 0, prizeData.stock ?? -1);
  
  logAdminAction(adminId, 'prize_create', 'prize', null, prizeData);
  // 奖品变更后失效缓存，确保下次查询获取最新数据
  const { invalidatePrizeCache } = require('./lotteryService');
  invalidatePrizeCache();
  return { success: true };
}

/**
 * 更新奖品
 * 更新成功后失效奖品缓存，抽奖服务下次查询时会重新加载
 * @param {number} adminId - 管理员 ID
 * @param {Object} prizeData - 奖品数据（需包含 id 字段用于定位记录）
 * @returns {Object} 操作结果 { success: true }
 */
function updatePrize(adminId, prizeData) {
  const db = getDb();
  db.prepare(
    'UPDATE prizes SET name = ?, description = ?, probability = ?, points_reward = ?, stock = ?, prize_type = ? WHERE id = ?'
  ).run(prizeData.name, prizeData.description || null, prizeData.probability,
    prizeData.pointsReward || 0, prizeData.stock ?? -1, prizeData.prizeType || 'virtual', prizeData.id);
  
  logAdminAction(adminId, 'prize_update', 'prize', prizeData.id, prizeData);
  // 奖品变更后失效缓存
  const { invalidatePrizeCache } = require('./lotteryService');
  invalidatePrizeCache();
  return { success: true };
}

/**
 * 删除奖品（软删除）
 * 将 status 设为 'deleted'，保留历史抽奖记录的关联关系
 * 敏感操作，需要二次确认
 * @param {number} adminId - 管理员 ID
 * @param {number} prizeId - 奖品 ID
 * @param {boolean} confirmed - 是否已确认
 * @returns {Object} 操作结果 { success: true }
 */
function deletePrize(adminId, prizeId, confirmed = false) {
  requireConfirmation('prize_delete', confirmed);
  
  const db = getDb();
  // 软删除：仅更新状态标记，不物理删除记录
  db.prepare('UPDATE prizes SET status = ? WHERE id = ?').run('deleted', prizeId);
  
  logAdminAction(adminId, 'prize_delete', 'prize', prizeId, { id: prizeId });
  // 奖品删除后失效缓存
  const { invalidatePrizeCache } = require('./lotteryService');
  invalidatePrizeCache();
  return { success: true };
}

/**
 * 获取所有抽奖记录（管理员视角，分页）
 * 关联用户表和奖品表，展示完整的抽奖历史信息
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果
 */
function getAllLotteryRecords(page = 1, pageSize = 20) {
  const db = getDb();

  return paginate(db, {
    countSql: 'lottery_records',
    dataSql: `SELECT lr.id, lr.user_id, u.username, u.nickname, p.name as prize_name, lr.points_cost, lr.is_received, lr.created_at
     FROM lottery_records lr
     LEFT JOIN users u ON lr.user_id = u.id
     LEFT JOIN prizes p ON lr.prize_id = p.id
     ORDER BY lr.created_at DESC`,
    params: [],
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
      prizeName: row.prize_name, pointsCost: row.points_cost, isReceived: row.is_received, createdAt: row.created_at,
    }),
  });
}

/**
 * 获取所有图片资源（管理员视角，分页）
 * 仅查询状态为 active 的图片，支持按用户ID筛选
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} userId - 用户 ID 筛选（可选）
 * @returns {Object} 分页结果
 */
function getAllImages(page = 1, pageSize = 20, userId = '') {
  const db = getDb();

  // 默认仅查询活跃状态的图片
  const conditions = ["i.status = 'active'"];
  const params = [];

  if (userId) { conditions.push('i.user_id = ?'); params.push(userId); }

  const where = conditions.join(' AND ');

  return paginate(db, {
    countSql: `images i WHERE ${where}`,
    dataSql: `SELECT i.id, i.user_id, u.username, u.nickname, i.file_path, i.original_name, i.file_size, i.width, i.height, i.related_type, i.created_at
     FROM images i
     LEFT JOIN users u ON i.user_id = u.id
     WHERE ${where}
     ORDER BY i.created_at DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
      filePath: row.file_path, originalName: row.original_name, fileSize: row.file_size,
      width: row.width, height: row.height, relatedType: row.related_type, createdAt: row.created_at,
    }),
  });
}

/**
 * 记录管理员操作日志
 * 所有管理操作统一通过此函数记录，便于审计和问题追溯
 * @param {number} adminId - 管理员 ID
 * @param {string} action - 操作类型（makeup_checkin/adjust_points/prize_create 等）
 * @param {string} targetType - 目标类型（user/checkin/prize/points/image）
 * @param {number|null} targetId - 目标 ID，无具体目标时传 null
 * @param {Object|null} detail - 操作详情，包含关键参数信息
 */
function logAdminAction(adminId, action, targetType, targetId, detail) {
  const { logAdminAction: logServiceLog } = require('./logService');
  logServiceLog(adminId, action, targetType, targetId, detail, null);
}

module.exports = {
  makeupCheckin, adjustPoints, getDashboard, getUsers, updateUserStatus,
  getAllCheckins, getAllPointsLog, createPrize, updatePrize, deletePrize, getAllLotteryRecords,
  getAllImages,
};