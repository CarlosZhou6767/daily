/**
 * 请求参数校验中间件
 * 基于 express-validator 实现，支持对 body/param/query 参数进行链式规则校验
 * 校验逻辑：并行执行所有验证规则，取第一个校验失败的规则返回错误信息
 * 拦截条件：任一校验规则未通过 → 返回 400 + 错误消息；全部通过 → 放行到路由
 */
const { body, param, query, validationResult } = require('express-validator');

/**
 * 创建参数校验中间件
 * 并行执行所有校验规则，取第一个失败的错误信息返回
 * @param {Array} validations - express-validator 校验规则链数组
 * @returns {Function} Express 中间件函数
 */
const validate = (validations) => {
  return async (req, res, next) => {
    try {
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      const firstError = errors.array()[0];
      return res.status(400).json({
        code: 400,
        message: firstError.msg
      });
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  validate,
  // 重新导出 express-validator 的校验函数，便于路由层直接使用
  body,   // 校验请求体参数
  param,  // 校验路由参数
  query,  // 校验查询参数
};
