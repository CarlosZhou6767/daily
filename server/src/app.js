/**
 * Daily 自律打卡积分抽奖系统 - 应用入口
 * 负责初始化 Express 中间件、注册路由、启动 HTTP 服务
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const { getDb, getDbHealth } = require('./db');
const logger = require('./utils/logger');

const app = express();

// 安全中间件：设置 HTTP 安全头
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 响应压缩中间件
app.use(compression());

// 跨域配置
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 请求体解析，限制大小防止恶意大请求
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 全局宽松限流：15分钟200次
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
});
app.use(globalLimiter);

// 认证接口严格限流：5分钟5次，登录成功不计入
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { code: 429, message: '认证请求过于频繁，请稍后再试' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 抽奖接口限流：1分钟10次
const lotteryDrawLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '抽奖请求过于频繁，请稍后再试' },
});
app.use('/api/lottery/draw', lotteryDrawLimiter);

// 静态文件服务：上传的图片资源，设置7天缓存
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  },
}));

// 注册 API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/points', require('./routes/points'));
app.use('/api/lottery', require('./routes/lottery'));
app.use('/api/user', require('./routes/user'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));

// 健康检查接口
app.get('/api/health', (req, res) => {
  const dbHealth = getDbHealth();
  const isHealthy = dbHealth.status === 'healthy';
  res.status(isHealthy ? 200 : 503).json({
    code: isHealthy ? 200 : 503,
    message: 'Daily Server is running',
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// 全局错误处理中间件（必须放在所有路由之后）
app.use(errorHandler);

const PORT = config.port;

/**
 * 启动服务器
 * 先初始化数据库连接，再监听端口
 */
async function start() {
  await getDb();
  logger.info('Database initialized');

  app.listen(PORT, () => {
    logger.info(`Daily Server running on port ${PORT}`);
    logger.info(`API: http://localhost:${PORT}/api/health`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
