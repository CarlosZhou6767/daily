/**
 * JWT 认证中间件
 * 从请求头 Authorization 中提取 Bearer Token 并验证
 * 验证成功后将用户信息挂载到 req.user
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 用户认证中间件
 * 检查请求头中的 JWT Token，验证通过后解析用户信息
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express next 函数
 */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

module.exports = authMiddleware;
