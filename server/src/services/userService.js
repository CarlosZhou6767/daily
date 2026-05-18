/**
 * 用户服务 - 注册、登录、微信登录、资料管理
 * 处理用户相关的核心业务逻辑
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDb } = require('../db');
const AppError = require('../utils/AppError');

/**
 * 用户注册
 * 创建用户账号并初始化默认打卡任务
 * 密码使用 bcrypt 哈希存储（cost factor = 10），不保存明文
 * @param {string} username - 用户名
 * @param {string} password - 明文密码
 * @param {string} nickname - 昵称（可选，不传时默认使用用户名）
 * @returns {Object} 包含 userId, username, nickname 的对象
 */
function register(username, password, nickname) {
  const db = getDb();

  // 检查用户名唯一性
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new AppError('用户名已存在');
  }

  // 密码加密：bcrypt hashSync 同步生成哈希，cost factor 为 10（平衡安全性和性能）
  const hashedPassword = bcrypt.hashSync(password, 10);
  const displayName = nickname || username;

  const result = db.prepare(
    'INSERT INTO users (username, password, nickname, status) VALUES (?, ?, ?, ?)'
  ).run(username, hashedPassword, displayName, 'active');

  const userId = result.lastInsertRowid;

  // 为新用户批量创建默认打卡任务（复用预编译的 prepared statement 提高性能）
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
 * 错误消息统一返回"用户名或密码错误"，不区分具体错误原因，防止用户枚举攻击
 * @param {string} username - 用户名
 * @param {string} password - 明文密码
 * @returns {Object} 包含 token 和 user 信息的对象
 */
function login(username, password) {
  const db = getDb();

  // 查询用户时排除已禁用状态，防止被禁用账号登录
  const user = db.prepare(
    'SELECT id, username, password, nickname, is_admin, status FROM users WHERE username = ? AND status != ?'
  ).get(username, 'disabled');

  if (!user) {
    throw new AppError('用户名或密码错误');
  }

  if (!bcrypt.compareSync(password, user.password)) {
    throw new AppError('用户名或密码错误');
  }

  // JWT 签名：包含 userId 和 isAdmin 信息，expiresIn 从配置读取
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
 * 通过 openid 自动注册或登录：已绑定 openid 的用户直接登录，新用户自动创建账号
 * 新用户使用随机密码（不可用于密码登录），用户名格式为 wx_ 前缀 + openid 前 10 位
 * @param {string} openid - 微信用户唯一标识
 * @returns {Object} 包含 token 和 user 信息的对象
 */
function wechatLogin(openid) {
  const db = getDb();

  // 查询是否已有绑定此 openid 的用户
  let user = db.prepare('SELECT id, username, nickname, is_admin FROM users WHERE wechat_openid = ?').get(openid);

  let userId;
  if (user) {
    // 已有用户，直接使用其 ID
    userId = user.id;
  } else {
    // 新用户：自动创建账号
    const username = `wx_${openid.substring(0, 10)}`;
    // 生成随机密码（用户无法通过密码登录），确保账号安全
    const result = db.prepare(
      'INSERT INTO users (username, password, nickname, wechat_openid, status) VALUES (?, ?, ?, ?, ?)'
    ).run(username, bcrypt.hashSync(Math.random().toString(36), 10), '微信用户', openid, 'active');
    userId = result.lastInsertRowid;

    // 为新微信用户批量创建默认打卡任务
    const taskStmt = db.prepare(
      'INSERT INTO tasks (user_id, name, icon, description, is_default) VALUES (?, ?, ?, ?, 1)'
    );
    config.defaultTasks.forEach((task) => {
      taskStmt.run(userId, task.name, task.icon, task.description);
    });
  }

  // 重新查询获取完整的用户信息
  user = db.prepare('SELECT id, username, nickname, is_admin FROM users WHERE id = ?').get(userId);

  // 生成 JWT Token
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
 * 返回完整的用户信息，不包含密码等敏感字段
 * @param {number} userId - 用户 ID
 * @returns {Object} 用户信息对象，包含 id, username, nickname, avatar, phone, points, totalCheckinDays, currentStreak, longestStreak, status, theme, isAdmin, createdAt
 */
function getUserById(userId) {
  const db = getDb();
  const user = db.prepare(
    `SELECT id, username, nickname, avatar, phone, points, total_checkin_days, current_streak, longest_streak, status, theme, is_admin, created_at
     FROM users WHERE id = ?`
  ).get(userId);

  if (!user) {
    throw new AppError('用户不存在');
  }

  // 蛇形转驼峰映射，统一前端接口风格
  return {
    id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone,
    points: user.points, totalCheckinDays: user.total_checkin_days, currentStreak: user.current_streak, longestStreak: user.longest_streak,
    status: user.status, theme: user.theme, isAdmin: user.is_admin, createdAt: user.created_at,
  };
}

/**
 * 更新用户资料
 * 仅允许更新白名单字段（nickname/avatar/theme/phone），防止 SQL 注入和非法字段更新
 * 对每个字段进行长度、格式、取值范围校验
 * 安全设计：白名单机制确保只有预定义的字段可被更新，动态字段名来自白名单，不存在注入风险
 * @param {number} userId - 用户 ID
 * @param {Object} updates - 需要更新的字段键值对（仅允许 nickname/avatar/theme/phone）
 */
function updateProfile(userId, updates) {
  const db = getDb();

  // 定义允许更新的字段白名单，键为字段名，值为校验规则
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
      throw new AppError(`不允许更新的字段: ${key}`);
    }

    // 校验字段值：长度限制、枚举值、正则格式
    if (value !== null && value !== undefined) {
      if (fieldConfig.maxLength && String(value).length > fieldConfig.maxLength) {
        throw new AppError(`${key} 超过最大长度限制 ${fieldConfig.maxLength}`);
      }
      if (fieldConfig.allowedValues && !fieldConfig.allowedValues.includes(value)) {
        throw new AppError(`${key} 必须是以下值之一: ${fieldConfig.allowedValues.join(', ')}`);
      }
      if (fieldConfig.pattern && !fieldConfig.pattern.test(String(value))) {
        throw new AppError(`${key} 格式不正确`);
      }
    }

    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;

  // 自动更新 updated_at 时间戳
  fields.push("updated_at = datetime('now')");
  values.push(userId);

  // 动态 SQL 的字段名来自白名单 key，不存在注入风险
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(values);
}

/**
 * 修改密码
 * 需要验证原密码正确后才能修改为新密码
 * @param {number} userId - 用户 ID
 * @param {string} oldPassword - 原密码
 * @param {string} newPassword - 新密码
 */
function changePassword(userId, oldPassword, newPassword) {
  const db = getDb();
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);

  if (!user) {
    throw new AppError('用户不存在');
  }

  if (!bcrypt.compareSync(oldPassword, user.password)) {
    throw new AppError('原密码错误');
  }

  // 新密码同样使用 bcrypt 加密存储
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), userId);
}

/**
 * 获取用户统计数据
 * 聚合总打卡天数、连续打卡天数、积分总额、当前积分、抽奖次数等关键统计
 * @param {number} userId - 用户 ID
 * @returns {Object} 包含 totalCheckinDays, currentStreak, longestStreak, totalPoints, currentPoints, totalLottery 的对象
 */
function getUserStats(userId) {
  const db = getDb();

  // 复用 getUserById 获取基础信息
  const user = getUserById(userId);

  // 累加所有正向积分流水得到总获得积分
  const totalPoints = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM points_log WHERE user_id = ? AND amount > 0').get(userId).total;
  // 统计抽奖总次数
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