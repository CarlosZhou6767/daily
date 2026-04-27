/**
 * 管理员权限验证中间件
 * 必须在 auth 中间件之后使用，依赖 req.user.isAdmin 字段
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express next 函数
 */
function adminAuthMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ code: 403, message: '无管理员权限' });
  }
  next();
}

module.exports = adminAuthMiddleware;
