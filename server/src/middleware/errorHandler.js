/**
 * 全局错误处理中间件
 * 捕获所有路由中抛出的错误，统一格式化响应
 * 生产环境下隐藏详细错误信息，避免泄露内部实现
 */
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  logger.error(`[Error] ${req.method} ${req.url}: ${err.message || err}`, {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: 400, message: '文件大小超过5MB限制' });
    }
    return res.status(400).json({ code: 400, message: '上传错误' });
  }

  if (err.message && err.message.includes('仅支持')) {
    return res.status(400).json({ code: 400, message: err.message });
  }

  const statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'production') {
    if (err instanceof AppError || (statusCode >= 400 && statusCode < 500)) {
      return res.status(statusCode).json({
        code: statusCode,
        message: err.message || '请求参数错误',
      });
    }
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
    });
  }

  res.status(statusCode).json({
    code: statusCode,
    message: err.message || '服务器内部错误',
    stack: err.stack,
  });
}

module.exports = errorHandler;
