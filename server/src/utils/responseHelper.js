/**
 * 统一响应工具
 * 消除路由层手动构造 { code, message, data } 的重复代码
 * 确保所有 API 响应格式一致，便于前端统一处理
 */

/**
 * 成功响应
 * @param {Object} res - Express 响应对象
 * @param {*} data - 响应数据，默认为 null
 * @param {string} message - 提示消息，默认'操作成功'
 * @returns {Object} Express 响应
 */
function success(res, data = null, message = '操作成功') {
  return res.json({ code: 200, message, data });
}

/**
 * 失败响应
 * @param {Object} res - Express 响应对象
 * @param {number} code - HTTP 状态码，默认 400
 * @param {string} message - 错误消息，默认'请求失败'
 * @returns {Object} Express 响应
 */
function fail(res, code = 400, message = '请求失败') {
  const statusCode = (Number.isInteger(code) && code >= 100 && code <= 599) ? code : 400;
  return res.status(statusCode).json({ code: statusCode, message });
}

module.exports = { success, fail };
