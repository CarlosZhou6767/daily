/**
 * Daily 系统配置文件
 * 集中管理所有可配置项，敏感信息通过环境变量注入
 * 生产环境必须设置环境变量，禁止依赖默认值
 */
const path = require('path');

/**
 * 获取环境变量，生产环境必须设置，开发环境可使用默认值
 * @param {string} key - 环境变量名
 * @param {string} defaultValue - 默认值（仅开发环境使用）
 * @param {boolean} required - 生产环境是否必填
 * @returns {string} 环境变量值
 * @throws {Error} 生产环境必填项未设置时抛出错误
 */
function getEnv(key, defaultValue, required = false) {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('环境变量名必须为非空字符串');
  }

  const value = process.env[key];
  if (value) return value;

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && required) {
    throw new Error(`生产环境必须设置环境变量: ${key}`);
  }
  return defaultValue;
}

/** @type {number} 服务端口 */
const port = parseInt(getEnv('PORT', '3000'));

/** @type {string} JWT 认证密钥 */
const jwtSecret = getEnv('JWT_SECRET', 'DEV_ONLY_CHANGE_ME_IN_PRODUCTION', true);

/** @type {string} JWT Token 过期时间 */
const jwtExpiresIn = getEnv('JWT_EXPIRES_IN', '7d');

/** @type {string} 数据库文件路径 */
const dbPath = path.join(__dirname, '../../data/daily.db');

/** @type {string} 文件上传目录 */
const uploadDir = path.join(__dirname, '../../uploads');

/** @type {string} 数据备份目录 */
const backupDir = path.join(__dirname, '../../backups');

/** @type {number} 上传文件大小限制（5MB） */
const uploadMaxSize = 5 * 1024 * 1024;

/** @type {number} 图片压缩：最大宽度 */
const imageMaxWidth = 800;

/** @type {number} 图片压缩：WebP 质量（0-100） */
const imageQuality = 80;

/**
 * 积分规则配置
 * @property {number} checkin - 每日打卡基础积分
 * @property {number} streak3 - 连续3天奖励积分
 * @property {number} streak7 - 连续7天奖励积分
 * @property {number} streak30 - 连续30天奖励积分
 * @property {number} image - 上传图片额外积分
 * @property {number} lotteryCost - 抽奖消耗积分
 * @property {number} makeupCost - 补打卡消耗积分
 */
const pointsRules = {
  checkin: 5,
  streak3: 10,
  streak7: 30,
  streak30: 100,
  image: 3,
  lotteryCost: 20,
  makeupCost: 10,
};

/**
 * 新用户默认任务列表
 * @type {Array<{name: string, icon: string, description: string}>}
 */
const defaultTasks = [
  { name: '早起打卡', icon: '🌅', description: '每天6:00前起床' },
  { name: '运动健身', icon: '💪', description: '每天运动30分钟' },
  { name: '阅读学习', icon: '📚', description: '每天阅读30分钟' },
  { name: '早睡打卡', icon: '🌙', description: '每天23:00前入睡' },
];

/**
 * 默认抽奖奖品配置（概率之和应为1）
 * @type {Array<{name: string, description: string, probability: number, prize_type: string, points_reward: number}>}
 */
const defaultPrizes = [
  { name: '积分x5', description: '获得5积分', probability: 0.30, prize_type: 'virtual', points_reward: 5 },
  { name: '积分x10', description: '获得10积分', probability: 0.25, prize_type: 'virtual', points_reward: 10 },
  { name: '谢谢参与', description: '下次好运', probability: 0.20, prize_type: 'virtual', points_reward: 0 },
  { name: '积分x50', description: '获得50积分', probability: 0.12, prize_type: 'virtual', points_reward: 50 },
  { name: '神秘礼物', description: '神秘惊喜', probability: 0.08, prize_type: 'virtual', points_reward: 0 },
  { name: '积分x100', description: '获得100积分', probability: 0.05, prize_type: 'virtual', points_reward: 100 },
];

/**
 * 管理员默认账号配置
 * @property {string} username - 管理员用户名
 * @property {string} password - 管理员密码（生产环境必填）
 */
const adminCredentials = {
  username: getEnv('ADMIN_USERNAME', 'admin', true),
  password: getEnv('ADMIN_PASSWORD', 'dev_password_change_me', true),
};

/**
 * 请求限流配置
 * @property {number} windowMs - 时间窗口（毫秒）
 * @property {number} max - 最大请求次数
 */
const rateLimit = {
  windowMs: 15 * 60 * 1000,
  max: 100,
};

/**
 * CORS 允许的来源
 * 生产环境必须指定具体域名，禁止设置为 *
 * @type {string|string[]}
 */
const corsOrigin = (() => {
  const origin = getEnv('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174', true);
  if (origin === '*') {
    console.warn('[警告] CORS_ORIGIN 设置为 *，允许所有来源访问，生产环境请指定具体域名');
    return '*';
  }
  return origin.split(',').map(s => s.trim());
})();

module.exports = {
  port,
  jwtSecret,
  jwtExpiresIn,
  dbPath,
  uploadDir,
  backupDir,
  uploadMaxSize,
  imageMaxWidth,
  imageQuality,
  pointsRules,
  defaultTasks,
  defaultPrizes,
  adminCredentials,
  rateLimit,
  corsOrigin,
  getEnv,
};
