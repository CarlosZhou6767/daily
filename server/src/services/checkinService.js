/**
 * 打卡服务 - 打卡逻辑、连续打卡天数计算、任务管理
 * 连续打卡天数计算优化：单次查询最近365天记录，内存计算连续天数
 */
const { getDb, runInTransaction } = require('../db');
const { formatDate } = require('../utils/dateHelper');
const { addPoints } = require('./pointsService');
const config = require('../config');
const { paginate } = require('./paginationHelper');
const AppError = require('../utils/AppError');

// 连续打卡计算的最大天数限制，防止无限循环
const MAX_STREAK_DAYS = 365;

/**
 * 执行打卡
 * 在事务中原子性完成：检查重复、插入记录、增加积分、更新连续天数、发放连续奖励
 * 上传图片可获得额外积分奖励
 * @param {number} userId - 用户 ID
 * @param {number} taskId - 任务 ID
 * @param {string} imagePath - 上传图片路径（可选）
 * @param {string} note - 打卡备注（可选）
 * @returns {Object} 包含 pointsEarned（总获得积分）和 newStreak（新连续天数）的对象
 */
function doCheckin(userId, taskId, imagePath, note) {
  const db = getDb();
  const today = formatDate();

  // 使用事务确保打卡操作的原子性：如果任一环节失败，所有变更回滚
  return runInTransaction(() => {
    // 检查今日该任务是否已打卡
    const existing = db.prepare(
      'SELECT id FROM checkins WHERE user_id = ? AND task_id = ? AND checkin_date = ?'
    ).get(userId, taskId, today);
    if (existing) {
      throw new AppError('今日该任务已打卡');
    }

    const pointsEarned = config.pointsRules.checkin;

    // 插入打卡记录
    try {
      db.prepare(
        'INSERT INTO checkins (user_id, task_id, checkin_date, image_path, note, points_earned) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(userId, taskId, today, imagePath || null, note || null, pointsEarned);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new AppError('今日该任务已打卡');
      }
      throw err;
    }

    // 增加基础打卡积分
    addPoints(userId, 'checkin', pointsEarned, '每日打卡');

    // 上传图片额外积分：激励用户上传图片增强打卡内容的丰富度
    if (imagePath) {
      addPoints(userId, 'image', config.pointsRules.image, '上传打卡图片');
    }

    // 更新总打卡天数
    db.prepare('UPDATE users SET total_checkin_days = total_checkin_days + 1 WHERE id = ?').run(userId);

    // 计算并更新连续打卡天数
    const newStreak = calculateStreak(db, userId, today);
    updateStreak(db, userId, newStreak);

    // 连续打卡奖励：根据连续天数阶梯发放额外积分
    let streakBonus = getStreakBonus(newStreak);
    if (streakBonus > 0) {
      const alreadyAwarded = db.prepare(
        "SELECT id FROM points_log WHERE user_id = ? AND type = 'streak' AND date(created_at) = ?"
      ).get(userId, today);
      if (!alreadyAwarded) {
        addPoints(userId, 'streak', streakBonus, `连续${newStreak}天奖励`);
      } else {
        streakBonus = 0;
      }
    }

    // 返回总积分（基础打卡 + 图片积分 + 连续奖励）
    return { pointsEarned: pointsEarned + (imagePath ? config.pointsRules.image : 0) + streakBonus, newStreak };
  });
}

/**
 * 获取今日打卡状态
 * 查询用户今日所有打卡记录，关联任务表获取任务名称
 * @param {number} userId - 用户 ID
 * @returns {Array} 今日打卡记录列表，每项包含 id, taskId, taskName, imagePath, note, pointsEarned, createdAt
 */
function getTodayCheckin(userId) {
  const db = getDb();
  const today = formatDate();
  return db.prepare(
    'SELECT c.id, c.task_id, t.name as task_name, c.image_path, c.note, c.points_earned, c.created_at FROM checkins c LEFT JOIN tasks t ON c.task_id = t.id WHERE c.user_id = ? AND c.checkin_date = ?'
  ).all(userId, today).map((row) => ({
    id: row.id, taskId: row.task_id, taskName: row.task_name, imagePath: row.image_path,
    note: row.note, pointsEarned: row.points_earned, createdAt: row.created_at,
  }));
}

/**
 * 获取打卡历史记录（分页）
 * 支持按年份和月份筛选，使用 strftime 对日期进行条件匹配
 * @param {number} userId - 用户 ID
 * @param {number} year - 年份筛选（可选，如 2025）
 * @param {number} month - 月份筛选（可选，1-12）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果 { records, total, page, pageSize, totalPages }
 */
function getCheckinHistory(userId, year, month, page = 1, pageSize = 30) {
  const db = getDb();

  // 构建动态筛选条件，使用参数化查询避免 SQL 注入
  const conditions = ['c.user_id = ?'];
  const params = [userId];

  if (year) { conditions.push('strftime("%Y", c.checkin_date) = ?'); params.push(String(year)); }
  if (month) { conditions.push('strftime("%m", c.checkin_date) = ?'); params.push(String(month).padStart(2, '0')); }

  const where = conditions.join(' AND ');

  return paginate(db, {
    countSql: `checkins c WHERE ${where}`,
    dataSql: `SELECT c.id, c.task_id, t.name as task_name, c.checkin_date, c.image_path, c.note, c.points_earned, c.created_at
     FROM checkins c
     LEFT JOIN tasks t ON c.task_id = t.id
     WHERE ${where}
     ORDER BY c.checkin_date DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, taskId: row.task_id, taskName: row.task_name, checkinDate: row.checkin_date,
      imagePath: row.image_path, note: row.note, pointsEarned: row.points_earned, createdAt: row.created_at,
    }),
  });
}

/**
 * 计算连续打卡天数
 * 性能优化：一次性查询最近 MAX_STREAK_DAYS 天的打卡记录，在内存中计算连续天数
 * 将时间复杂度从 O(n) 数据库查询降至 O(1) 查询 + O(n) 内存遍历，大幅减少数据库 IO
 * @param {Database} db - better-sqlite3 数据库实例
 * @param {number} userId - 用户 ID
 * @param {string} today - 起始日期（YYYY-MM-DD），作为连续计算的终点
 * @returns {number} 从 today 向前连续打卡的天数
 */
function calculateStreak(db, userId, today) {
  // 计算一年前的日期作为查询起点
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - MAX_STREAK_DAYS);

  // 单次查询获取最近一年的所有打卡日期（DISTINCT 去重，确保每日只计一次）
  const rows = db.prepare(
    'SELECT DISTINCT checkin_date FROM checkins WHERE user_id = ? AND checkin_date >= ? AND checkin_date <= ? ORDER BY checkin_date DESC'
  ).all(userId, formatDate(startDate), today);

  // 将打卡日期存入 Set 以便 O(1) 时间复杂度查找
  const checkinDates = new Set(rows.map(r => r.checkin_date));

  let streak = 0;
  let checkDate = new Date(today);

  // 从今天开始向前遍历，检查每一天是否打卡
  // 一旦某天未打卡即停止遍历，连续天数即为当前计数值
  for (let i = 0; i < MAX_STREAK_DAYS; i++) {
    const dateStr = formatDate(checkDate);
    if (checkinDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 更新用户连续打卡天数
 * 同时使用 MAX 函数确保最长连续天数不会被覆盖
 * @param {Database} db - better-sqlite3 数据库实例
 * @param {number} userId - 用户 ID
 * @param {number} streak - 新的连续打卡天数
 */
function updateStreak(db, userId, streak) {
  // MAX(longest_streak, ?) 确保历史最长记录不会被较小的当前值覆盖
  db.prepare(
    'UPDATE users SET current_streak = ?, longest_streak = MAX(longest_streak, ?) WHERE id = ?'
  ).run(streak, streak, userId);
}

/**
 * 获取连续打卡奖励积分
 * 阶梯奖励机制：3天起奖，7天/30天递增奖励额度，鼓励用户长期坚持打卡
 * @param {number} streak - 连续打卡天数
 * @returns {number} 奖励积分数量
 */
function getStreakBonus(streak) {
  if (streak >= 30) return config.pointsRules.streak30;
  if (streak >= 7) return config.pointsRules.streak7;
  if (streak >= 3) return config.pointsRules.streak3;
  return 0;
}

/**
 * 获取用户连续打卡天数（对外接口）
 * @param {number} userId - 用户 ID
 * @returns {Object} 包含 currentStreak 和 longestStreak 的对象
 */
function getStreak(userId) {
  const db = getDb();
  const today = formatDate();
  const currentStreak = calculateStreak(db, userId, today);
  const user = db.prepare('SELECT longest_streak FROM users WHERE id = ?').get(userId);
  return { currentStreak, longestStreak: user?.longest_streak || 0 };
}

/**
 * 创建自定义打卡任务
 * @param {number} userId - 用户 ID
 * @param {string} name - 任务名称
 * @param {string} icon - 任务图标（可选，默认为 📝）
 * @param {string} description - 任务描述（可选，默认为空字符串）
 * @returns {Object} 创建的任务对象 { id, name, icon, description }
 */
function createTask(userId, name, icon, description) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO tasks (user_id, name, icon, description) VALUES (?, ?, ?, ?)'
  ).run(userId, name, icon || '📝', description || '');
  return { id: result.lastInsertRowid, name, icon: icon || '📝', description: description || '' };
}

/**
 * 删除打卡任务（软删除）
 * 将任务状态标记为 'deleted'，保留历史打卡记录的关联关系
 * @param {number} userId - 用户 ID（确保只能删除自己的任务）
 * @param {number} taskId - 任务 ID
 */
function deleteTask(userId, taskId) {
  const db = getDb();
  // 软删除：通过 user_id 校验确保用户只能操作自己的任务
  db.prepare('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?').run('deleted', taskId, userId);
}

/**
 * 获取用户的打卡任务列表
 * 仅返回状态为 'active' 的任务
 * @param {number} userId - 用户 ID
 * @returns {Array} 任务列表，每项包含 id, name, icon, description, isDefault, status
 */
function getTasks(userId) {
  const db = getDb();
  return db.prepare(
    'SELECT id, name, icon, description, is_default, status FROM tasks WHERE user_id = ? AND status = ?'
  ).all(userId, 'active').map((row) => ({
    id: row.id, name: row.name, icon: row.icon, description: row.description,
    isDefault: row.is_default, status: row.status,
  }));
}

module.exports = {
  doCheckin, getTodayCheckin, getCheckinHistory, calculateStreak, updateStreak,
  getStreak, createTask, deleteTask, getTasks, getStreakBonus,
};