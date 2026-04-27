/**
 * 用户服务 - 注册、登录、微信登录、资料管理
 * 处理用户相关的核心业务逻辑
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDb } = require('../db');

/**
 * 用户注册
 * 创建用户账号并初始化默认打卡任务
 * @param {string} username - 用户名
 * @param {string} password - 明文密码
 * @param {string} nickname - 昵称（可选）
 * @returns {Object} 包含 userId, username, nickname 的对象
 */
function register(username, password, nickname) {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new Error('用户名已存在');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const displayName = nickname || username;

  const result = db.prepare(
    'INSERT INTO users (username, password, nickname, status) VALUES (?, ?, ?, ?)'
  ).run(username, hashedPassword, displayName, 'active');

  const userId = result.lastInsertRowid;

  const taskStmt = db.prepare(
    'INSERT INTO tasks (user_id, name, icon, description, is_default) VALUES (?, ?, ?, ?, 1)'
  );
  config.defaultTasks.forEach((task) => {
    taskStmt.run(userId, task.name, task.icon, task.description);
  });

  return { userId, username, nickname: displayName };
}

/**
 * 用户登录
 * 验证用户名密码，返回 JWT Token
 * @param {string} username - 用户名
 * @param {string} password - 明文密码
 * @returns {Object} 包含 token 和 user 信息的对象
 */
function login(username, password) {
  const db = getDb();

  const user = db.prepare(
    'SELECT id, username, password, nickname, is_admin, status FROM users WHERE username = ? AND status != ?'
  ).get(username, 'disabled');

  if (!user) {
    throw new Error('用户名或密码错误');
  }

  if (!bcrypt.compareSync(password, user.password)) {
    throw new Error('用户名或密码错误');
  }

  const token = jwt.sign(
    { userId: user.id, isAdmin: user.is_admin },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      isAdmin: user.is_admin,
    },
  };
}

/**
 * 微信小程序登录
 * 通过 openid 自动注册或登录
 * @param {string} openid - 微信用户唯一标识
 * @returns {Object} 包含 token 和 user 信息的对象
 */
function wechatLogin(openid) {
  const db = getDb();

  let user = db.prepare('SELECT id, username, nickname, is_admin FROM users WHERE wechat_openid = ?').get(openid);

  let userId;
  if (user) {
    userId = user.id;
  } else {
    const username = `wx_${openid.substring(0, 10)}`;
    const result = db.prepare(
      'INSERT INTO users (username, password, nickname, wechat_openid, status) VALUES (?, ?, ?, ?, ?)'
    ).run(username, bcrypt.hashSync(Math.random().toString(36), 10), '微信用户', openid, 'active');
    userId = result.lastInsertRowid;

    const taskStmt = db.prepare(
      'INSERT INTO tasks (user_id, name, icon, description, is_default) VALUES (?, ?, ?, ?, 1)'
    );
    config.defaultTasks.forEach((task) => {
      taskStmt.run(userId, task.name, task.icon, task.description);
    });
  }

  user = db.prepare('SELECT id, username, nickname, is_admin FROM users WHERE id = ?').get(userId);

  const token = jwt.sign(
    { userId: user.id, isAdmin: user.is_admin },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: { id: user.id, username: user.username, nickname: user.nickname, isAdmin: user.is_admin },
  };
}

/**
 * 根据 ID 获取用户信息
 * @param {number} userId - 用户 ID
 * @returns {Object} 用户信息对象
 */
function getUserById(userId) {
  const db = getDb();
  const user = db.prepare(
    `SELECT id, username, nickname, avatar, phone, points, total_checkin_days, current_streak, longest_streak, status, theme, is_admin, created_at
     FROM users WHERE id = ?`
  ).get(userId);

  if (!user) {
    throw new Error('用户不存在');
  }

  return {
    id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone,
    points: user.points, totalCheckinDays: user.total_checkin_days, currentStreak: user.current_streak, longestStreak: user.longest_streak,
    status: user.status, theme: user.theme, isAdmin: user.is_admin, createdAt: user.created_at,
  };
}

/**
 * 更新用户资料
 * 仅允许更新白名单字段，防止 SQL 注入和非法字段更新
 * @param {number} userId - 用户 ID
 * @param {Object} updates - 需要更新的字段键值对
 */
function updateProfile(userId, updates) {
  const db = getDb();

  // 定义允许更新的字段白名单，键为字段名，值为是否需要校验
  const allowedFields = {
    nickname: { maxLength: 50 },
    avatar: { maxLength: 500 },
    theme: { allowedValues: ['light', 'dark'] },
    phone: { pattern: /^1[3-9]\d{9}$/ },
  };

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const fieldConfig = allowedFields[key];
    if (!fieldConfig) {
      throw new Error(`不允许更新的字段: ${key}`);
    }

    // 校验字段值
    if (value !== null && value !== undefined) {
      if (fieldConfig.maxLength && String(value).length > fieldConfig.maxLength) {
        throw new Error(`${key} 超过最大长度限制 ${fieldConfig.maxLength}`);
      }
      if (fieldConfig.allowedValues && !fieldConfig.allowedValues.includes(value)) {
        throw new Error(`${key} 必须是以下值之一: ${fieldConfig.allowedValues.join(', ')}`);
      }
      if (fieldConfig.pattern && !fieldConfig.pattern.test(String(value))) {
        throw new Error(`${key} 格式不正确`);
      }
    }

    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(userId);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(values);
}

/**
 * 修改密码
 * @param {number} userId - 用户 ID
 * @param {string} oldPassword - 原密码
 * @param {string} newPassword - 新密码
 */
function changePassword(userId, oldPassword, newPassword) {
  const db = getDb();
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);

  if (!user) {
    throw new Error('用户不存在');
  }

  if (!bcrypt.compareSync(oldPassword, user.password)) {
    throw new Error('原密码错误');
  }

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), userId);
}

/**
 * 获取用户统计数据
 * @param {number} userId - 用户 ID
 * @returns {Object} 包含总打卡天数、连续天数、积分、抽奖次数等统计
 */
function getUserStats(userId) {
  const db = getDb();

  const user = getUserById(userId);

  const totalPoints = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM points_log WHERE user_id = ? AND amount > 0').get(userId).total;
  const totalLottery = db.prepare('SELECT COUNT(*) as total FROM lottery_records WHERE user_id = ?').get(userId).total;

  return {
    totalCheckinDays: user.totalCheckinDays,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalPoints,
    currentPoints: user.points,
    totalLottery,
  };
}

module.exports = { register, login, wechatLogin, getUserById, updateProfile, changePassword, getUserStats };
