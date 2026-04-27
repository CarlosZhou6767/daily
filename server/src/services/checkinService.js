/**
 * 打卡服务 - 打卡逻辑、连续打卡天数计算、任务管理
 * 连续打卡天数计算优化：单次查询最近365天记录，内存计算连续天数
 */
const { getDb, runInTransaction } = require('../db');
const { formatDate } = require('../utils/dateHelper');
const { addPoints } = require('./pointsService');
const config = require('../config');

// 连续打卡计算的最大天数限制，防止无限循环
const MAX_STREAK_DAYS = 365;

/**
 * 执行打卡
 * 1. 检查今日是否已打卡（同一任务同一天只能打卡一次）
 * 2. 插入打卡记录
 * 3. 增加积分
 * 4. 更新连续打卡天数和总打卡天数
 * @param {number} userId - 用户 ID
 * @param {number} taskId - 任务 ID
 * @param {string} imagePath - 上传图片路径（可选）
 * @param {string} note - 打卡备注（可选）
 * @returns {Object} 包含 pointsEarned 和 newStreak 的对象
 */
function doCheckin(userId, taskId, imagePath, note) {
  const db = getDb();
  const today = formatDate();

  return runInTransaction(() => {
    // 检查今日该任务是否已打卡
    const existing = db.prepare(
      'SELECT id FROM checkins WHERE user_id = ? AND task_id = ? AND checkin_date = ?'
    ).get(userId, taskId, today);
    if (existing) {
      throw new Error('今日该任务已打卡');
    }

    const pointsEarned = config.pointsRules.checkin;

    // 插入打卡记录
    db.prepare(
      'INSERT INTO checkins (user_id, task_id, checkin_date, image_path, note, points_earned) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, taskId, today, imagePath || null, note || null, pointsEarned);

    // 增加积分
    addPoints(userId, 'checkin', pointsEarned, '每日打卡');

    // 上传图片额外积分
    if (imagePath) {
      addPoints(userId, 'image', config.pointsRules.image, '上传打卡图片');
    }

    // 更新总打卡天数
    db.prepare('UPDATE users SET total_checkin_days = total_checkin_days + 1 WHERE id = ?').run(userId);

    // 计算并更新连续打卡天数
    const newStreak = calculateStreak(db, userId, today);
    updateStreak(db, userId, newStreak);

    // 连续打卡奖励
    const streakBonus = getStreakBonus(newStreak);
    if (streakBonus > 0) {
      addPoints(userId, 'streak', streakBonus, `连续${newStreak}天奖励`);
    }

    return { pointsEarned: pointsEarned + (imagePath ? config.pointsRules.image : 0) + streakBonus, newStreak };
  });
}

/**
 * 获取今日打卡状态
 * @param {number} userId - 用户 ID
 * @returns {Array} 今日打卡记录列表
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
 * @param {number} userId - 用户 ID
 * @param {number} year - 年份筛选（可选）
 * @param {number} month - 月份筛选（可选）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果
 */
function getCheckinHistory(userId, year, month, page = 1, pageSize = 30) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let where = 'WHERE c.user_id = ?';
  const params = [userId];

  if (year) { where += ' AND strftime("%Y", c.checkin_date) = ?'; params.push(String(year)); }
  if (month) { where += ' AND strftime("%m", c.checkin_date) = ?'; params.push(String(month).padStart(2, '0')); }

  const total = db.prepare(`SELECT COUNT(*) as total FROM checkins c ${where}`).get(params).total;

  const records = db.prepare(
    `SELECT c.id, c.task_id, t.name as task_name, c.checkin_date, c.image_path, c.note, c.points_earned, c.created_at
     FROM checkins c
     LEFT JOIN tasks t ON c.task_id = t.id
     ${where}
     ORDER BY c.checkin_date DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset).map((row) => ({
    id: row.id, taskId: row.task_id, taskName: row.task_name, checkinDate: row.checkin_date,
    imagePath: row.image_path, note: row.note, pointsEarned: row.points_earned, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 计算连续打卡天数
 * 一次性查询最近 MAX_STREAK_DAYS 天的打卡记录，在内存中计算连续天数
 * 时间复杂度从 O(n) 数据库查询降至 O(1) 查询 + O(n) 内存遍历
 * @param {Database} db - 数据库实例
 * @param {number} userId - 用户 ID
 * @param {string} today - 起始日期（YYYY-MM-DD）
 * @returns {number} 连续打卡天数
 */
function calculateStreak(db, userId, today) {
  // 计算一年前的日期作为查询起点
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - MAX_STREAK_DAYS);

  // 单次查询获取最近一年的所有打卡日期
  const rows = db.prepare(
    'SELECT DISTINCT checkin_date FROM checkins WHERE user_id = ? AND checkin_date >= ? AND checkin_date <= ? ORDER BY checkin_date DESC'
  ).all(userId, formatDate(startDate), today);

  // 将打卡日期存入 Set 以便快速查找
  const checkinDates = new Set(rows.map(r => r.checkin_date));

  let streak = 0;
  let checkDate = new Date(today);

  // 从今天开始向前遍历，检查每一天是否打卡
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
 * @param {Database} db - 数据库实例
 * @param {number} userId - 用户 ID
 * @param {number} streak - 新的连续打卡天数
 */
function updateStreak(db, userId, streak) {
  db.prepare(
    'UPDATE users SET current_streak = ?, longest_streak = MAX(longest_streak, ?) WHERE id = ?'
  ).run(streak, streak, userId);
}

/**
 * 获取连续打卡奖励积分
 * @param {number} streak - 连续打卡天数
 * @returns {number} 奖励积分
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
 * @param {string} icon - 任务图标（可选）
 * @param {string} description - 任务描述（可选）
 * @returns {Object} 创建的任务对象
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
 * @param {number} userId - 用户 ID
 * @param {number} taskId - 任务 ID
 */
function deleteTask(userId, taskId) {
  const db = getDb();
  db.prepare('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?').run('deleted', taskId, userId);
}

/**
 * 获取用户的打卡任务列表
 * @param {number} userId - 用户 ID
 * @returns {Array} 任务列表
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