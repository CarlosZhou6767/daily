/**
 * 管理员服务 - 数据面板、用户管理、补打卡、积分调整、奖品管理、日志
 * 所有管理操作都会记录到 admin_logs 表
 * 敏感操作（禁用用户、调整积分、删除奖品）需要二次确认
 */
const { getDb, runInTransaction } = require('../db');
const { formatDate } = require('../utils/dateHelper');
const { addPoints, deductPoints } = require('./pointsService');
const { calculateStreak, updateStreak } = require('./checkinService');
const config = require('../config');

// 需要二次确认的操作列表
const SENSITIVE_ACTIONS = ['update_user_status', 'adjust_points', 'prize_delete'];

/**
 * 验证操作是否已确认
 * @param {string} action - 操作类型
 * @param {boolean} confirmed - 是否已确认
 * @throws {Error} 敏感操作未确认时抛出错误
 */
function requireConfirmation(action, confirmed) {
  if (SENSITIVE_ACTIONS.includes(action) && !confirmed) {
    throw new Error('该操作需要二次确认，请在请求中设置 confirmed: true');
  }
}

/**
 * 管理员补打卡
 * @param {number} adminId - 管理员 ID
 * @param {number} userId - 目标用户 ID
 * @param {number} taskId - 任务 ID
 * @param {string} checkinDate - 补打卡日期
 * @param {boolean} confirmed - 是否已确认
 * @returns {Object} 包含 pointsEarned 和 newStreak 的对象
 */
function makeupCheckin(adminId, userId, taskId, checkinDate, confirmed = false) {
  requireConfirmation('makeup_checkin', confirmed);

  const db = getDb();

  const user = db.prepare('SELECT id, username FROM users WHERE id = ? AND status != ?').get(userId, 'disabled');
  if (!user) {
    throw new Error('用户不存在或已禁用');
  }

  const task = db.prepare('SELECT id, name FROM tasks WHERE id = ? AND user_id = ? AND status = ?').get(taskId, userId, 'active');
  if (!task) {
    throw new Error('任务不存在');
  }

  const existing = db.prepare(
    'SELECT id FROM checkins WHERE user_id = ? AND task_id = ? AND checkin_date = ?'
  ).get(userId, taskId, checkinDate);
  if (existing) {
    throw new Error('该日期该任务已打卡');
  }

  const pointsEarned = config.pointsRules.checkin;

  db.prepare(
    'INSERT INTO checkins (user_id, task_id, checkin_date, points_earned, is_makeup, makeup_by) VALUES (?, ?, ?, ?, 1, ?)'
  ).run(userId, taskId, checkinDate, pointsEarned, adminId);

  addPoints(userId, 'checkin', pointsEarned, `管理员补打卡: ${checkinDate}`);

  db.prepare('UPDATE users SET total_checkin_days = total_checkin_days + 1 WHERE id = ?').run(userId);

  const today = formatDate();
  const newStreak = calculateStreak(db, userId, today);
  updateStreak(db, userId, newStreak);

  logAdminAction(adminId, 'makeup_checkin', 'checkin', null, {
    userId, taskId, checkinDate, pointsEarned,
  });

  return { pointsEarned, newStreak };
}

/**
 * 管理员调整用户积分
 * @param {number} adminId - 管理员 ID
 * @param {number} userId - 目标用户 ID
 * @param {number} amount - 调整数量（正数增加，负数扣减）
 * @param {string} reason - 调整原因
 * @param {boolean} confirmed - 是否已确认
 * @returns {Object} 操作结果
 */
function adjustPoints(adminId, userId, amount, reason, confirmed = false) {
  requireConfirmation('adjust_points', confirmed);

  const db = getDb();

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

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
 * @returns {Object} 面板统计数据
 */
function getDashboard() {
  const db = getDb();

  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE status != 'disabled'").get().cnt;
  const totalCheckins = db.prepare('SELECT COUNT(*) as cnt FROM checkins').get().cnt;
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM users').get().total;
  const totalImages = db.prepare("SELECT COUNT(*) as cnt FROM images WHERE status = 'active'").get().cnt;

  const today = formatDate();
  const todayCheckins = db.prepare(
    'SELECT COUNT(DISTINCT user_id) as cnt FROM checkins WHERE checkin_date = ?'
  ).get(today).cnt;

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
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} search - 搜索关键词（用户名/昵称）
 * @param {string} status - 状态筛选
 * @returns {Object} 分页结果
 */
function getUsers(page = 1, pageSize = 20, search = '', status = '') {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (search) {
    where += ' AND (username LIKE ? OR nickname LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const total = db.prepare(`SELECT COUNT(*) as total FROM users ${where}`).get(params).total;

  const users = db.prepare(
    `SELECT id, username, nickname, avatar, points, total_checkin_days, current_streak, status, is_admin, created_at
     FROM users ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset).map((row) => ({
    id: row.id, username: row.username, nickname: row.nickname, avatar: row.avatar,
    points: row.points, totalCheckinDays: row.total_checkin_days, currentStreak: row.current_streak,
    status: row.status, isAdmin: row.is_admin, createdAt: row.created_at,
  }));

  return { users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 更新用户状态（启用/禁用）
 * 敏感操作，需要二次确认
 * @param {number} adminId - 管理员 ID
 * @param {number} userId - 目标用户 ID
 * @param {string} status - 新状态
 * @param {boolean} confirmed - 是否已确认
 * @returns {Object} 操作结果
 */
function updateUserStatus(adminId, userId, status, confirmed = false) {
  requireConfirmation('update_user_status', confirmed);

  const db = getDb();

  // 验证状态值合法性
  const allowedStatuses = ['active', 'disabled'];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`无效的状态值，允许的值: ${allowedStatuses.join(', ')}`);
  }

  // 防止管理员禁用自己
  if (userId === adminId) {
    throw new Error('不能修改自己的状态');
  }

  const result = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  if (result.changes === 0) {
    throw new Error('用户不存在或状态未改变');
  }

  logAdminAction(adminId, 'update_user_status', 'user', userId, { status });
  return { success: true, userId, status };
}

/**
 * 获取所有打卡记录（管理员视角，分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} userId - 用户 ID 筛选
 * @param {string} startDate - 开始日期筛选
 * @param {string} endDate - 结束日期筛选
 * @returns {Object} 分页结果
 */
function getAllCheckins(page = 1, pageSize = 20, userId = '', startDate = '', endDate = '') {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (userId) { where += ' AND c.user_id = ?'; params.push(userId); }
  if (startDate) { where += ' AND c.checkin_date >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND c.checkin_date <= ?'; params.push(endDate); }

  const total = db.prepare(`SELECT COUNT(*) as total FROM checkins c ${where}`).get(params).total;

  const records = db.prepare(
    `SELECT c.id, c.user_id, u.username, u.nickname, t.name as task_name, c.checkin_date, c.image_path, c.note, c.points_earned, c.is_makeup, c.makeup_by, c.created_at
     FROM checkins c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN tasks t ON c.task_id = t.id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset).map((row) => ({
    id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
    taskName: row.task_name, checkinDate: row.checkin_date, imagePath: row.image_path, note: row.note,
    pointsEarned: row.points_earned, isMakeup: row.is_makeup, makeupBy: row.makeup_by, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 获取所有积分流水（管理员视角，分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} userId - 用户 ID 筛选
 * @param {string} type - 积分类型筛选
 * @returns {Object} 分页结果
 */
function getAllPointsLog(page = 1, pageSize = 20, userId = '', type = '') {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (userId) { where += ' AND pl.user_id = ?'; params.push(userId); }
  if (type) { where += ' AND pl.type = ?'; params.push(type); }

  const total = db.prepare(`SELECT COUNT(*) as total FROM points_log pl ${where}`).get(params).total;

  const records = db.prepare(
    `SELECT pl.id, pl.user_id, u.username, u.nickname, pl.type, pl.amount, pl.description, pl.created_at
     FROM points_log pl
     LEFT JOIN users u ON pl.user_id = u.id
     ${where}
     ORDER BY pl.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset).map((row) => ({
    id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
    type: row.type, amount: row.amount, description: row.description, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 管理奖品（创建/更新/删除）
 * 删除操作需要二次确认
 * @param {number} adminId - 管理员 ID
 * @param {string} action - 操作类型：create/update/delete
 * @param {Object} prizeData - 奖品数据
 * @param {boolean} confirmed - 是否已确认
 * @returns {Object} 操作结果
 */
function managePrize(adminId, action, prizeData, confirmed = false) {
  if (action === 'delete') {
    requireConfirmation('prize_delete', confirmed);
  }

  const db = getDb();

  if (action === 'create') {
    db.prepare(
      'INSERT INTO prizes (name, description, image, probability, prize_type, points_reward, stock) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(prizeData.name, prizeData.description || null, prizeData.image || null, prizeData.probability,
      prizeData.prizeType || 'virtual', prizeData.pointsReward || 0, prizeData.stock || -1);
  } else if (action === 'update') {
    db.prepare(
      'UPDATE prizes SET name = ?, description = ?, probability = ?, points_reward = ?, stock = ?, prize_type = ? WHERE id = ?'
    ).run(prizeData.name, prizeData.description || null, prizeData.probability,
      prizeData.pointsReward || 0, prizeData.stock || -1, prizeData.prizeType || 'virtual', prizeData.id);
  } else if (action === 'delete') {
    db.prepare('UPDATE prizes SET status = ? WHERE id = ?').run('deleted', prizeData.id);
  }

  logAdminAction(adminId, `prize_${action}`, 'prize', prizeData.id, prizeData);
  return { success: true };
}

/**
 * 获取所有抽奖记录（管理员视角，分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果
 */
function getAllLotteryRecords(page = 1, pageSize = 20) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const total = db.prepare('SELECT COUNT(*) as total FROM lottery_records').get().total;

  const records = db.prepare(
    `SELECT lr.id, lr.user_id, u.username, u.nickname, p.name as prize_name, lr.points_cost, lr.is_received, lr.created_at
     FROM lottery_records lr
     LEFT JOIN users u ON lr.user_id = u.id
     LEFT JOIN prizes p ON lr.prize_id = p.id
     ORDER BY lr.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(pageSize, offset).map((row) => ({
    id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
    prizeName: row.prize_name, pointsCost: row.points_cost, isReceived: row.is_received, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 获取所有图片资源（管理员视角，分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} userId - 用户 ID 筛选
 * @returns {Object} 分页结果
 */
function getAllImages(page = 1, pageSize = 20, userId = '') {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let where = "WHERE i.status = 'active'";
  const params = [];

  if (userId) { where += ' AND i.user_id = ?'; params.push(userId); }

  const total = db.prepare(`SELECT COUNT(*) as total FROM images i ${where}`).get(params).total;

  const records = db.prepare(
    `SELECT i.id, i.user_id, u.username, u.nickname, i.file_path, i.original_name, i.file_size, i.width, i.height, i.related_type, i.created_at
     FROM images i
     LEFT JOIN users u ON i.user_id = u.id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset).map((row) => ({
    id: row.id, userId: row.user_id, username: row.username, nickname: row.nickname,
    filePath: row.file_path, originalName: row.original_name, fileSize: row.file_size,
    width: row.width, height: row.height, relatedType: row.related_type, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 获取管理员操作日志（分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果
 */
function getAdminLogs(page = 1, pageSize = 20) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const total = db.prepare('SELECT COUNT(*) as total FROM admin_logs').get().total;

  const records = db.prepare(
    `SELECT al.id, al.admin_id, u.username as admin_name, al.action, al.target_type, al.target_id, al.detail, al.created_at
     FROM admin_logs al
     LEFT JOIN users u ON al.admin_id = u.id
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(pageSize, offset).map((row) => ({
    id: row.id, adminId: row.admin_id, adminName: row.admin_name, action: row.action,
    targetType: row.target_type, targetId: row.target_id, detail: row.detail, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 记录管理员操作日志
 * @param {number} adminId - 管理员 ID
 * @param {string} action - 操作类型
 * @param {string} targetType - 目标类型
 * @param {number} targetId - 目标 ID
 * @param {Object} detail - 操作详情
 */
function logAdminAction(adminId, action, targetType, targetId, detail) {
  const db = getDb();
  db.prepare(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(adminId, action, targetType, targetId, JSON.stringify(detail));
}

module.exports = {
  makeupCheckin, adjustPoints, getDashboard, getUsers, updateUserStatus,
  getAllCheckins, getAllPointsLog, managePrize, getAllLotteryRecords,
  getAllImages, getAdminLogs,
};
