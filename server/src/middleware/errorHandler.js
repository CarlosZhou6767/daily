/**
 * 全局错误处理中间件
 * 捕获所有路由中抛出的错误，统一格式化响应
 * 生产环境下隐藏详细错误信息，避免泄露内部实现
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // 记录错误日志（包含请求上下文，便于排查问题）
  logger.error(`[Error] ${req.method} ${req.url}: ${err.message || err}`, {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Multer 文件上传错误处理
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: 400, message: '文件大小超过5MB限制' });
    }
    return res.status(400).json({ code: 400, message: '上传错误' });
  }

  // 文件类型限制错误
  if (err.message && err.message.includes('仅支持')) {
    return res.status(400).json({ code: 400, message: err.message });
  }

  // 通用错误处理
  const statusCode = err.statusCode || 500;

  // 生产环境统一返回通用错误信息，避免泄露内部实现细节
  if (process.env.NODE_ENV === 'production') {
    // 对于客户端错误（4xx），可以返回具体错误信息
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({
        code: statusCode,
        message: err.message || '请求参数错误',
      });
    }
    // 服务器错误（5xx）统一隐藏详情
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
    });
  }

  // 开发环境返回详细错误信息
  res.status(statusCode).json({
    code: statusCode,
    message: err.message || '服务器内部错误',
    stack: err.stack,
  });
}

module.exports = errorHandler;
