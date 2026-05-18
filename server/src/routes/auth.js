/**
 * 认证路由 - 用户注册、登录、微信登录
 * 基础路径: /api/auth
 * 所有接口为公开接口，无需登录认证
 */
const express = require('express');
const router = express.Router();
const { register, login, wechatLogin } = require('../services/userService');
const { exchangeWechatCode } = require('../services/wechatService');
const { validate, body } = require('../middleware/validator');
const { success } = require('../utils/responseHelper');

/**
 * 用户注册
 * POST /api/auth/register
 * 权限：公开（无需登录）
 * 请求体：
 *   username - 用户名（3-20位，仅字母数字下划线）
 *   password - 密码（至少6位）
 *   nickname - 昵称（可选，最多50字）
 * 返回：注册成功后的用户信息和JWT令牌
 */
router.post('/register', validate([
  body('username')
    .notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 3, max: 20 }).withMessage('用户名需3-20位')
    // 仅允许字母、数字、下划线，防止特殊字符注入
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6 }).withMessage('密码至少6位'),
  body('nickname')
    .optional()
    .isLength({ max: 50 }).withMessage('昵称最多50字')
]), (req, res, next) => {
  try {
    const { username, password, nickname } = req.body;
    const result = register(username, password, nickname);
    return success(res, result, '注册成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 用户登录 - 用户名密码登录
 * POST /api/auth/login
 * 权限：公开（无需登录）
 * 请求体：
 *   username - 用户名
 *   password - 密码
 * 返回：登录成功后的用户信息和JWT令牌
 */
router.post('/login', validate([
  body('username')
    .notEmpty().withMessage('用户名不能为空'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
]), (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = login(username, password);
    return success(res, result, '登录成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 微信小程序登录 - 通过微信授权code换取openid进行登录
 * POST /api/auth/wechat-login
 * 权限：公开（无需登录）
 * 请求体：
 *   code - 微信授权code（由微信小程序 wx.login 获取）
 * 返回：登录成功后的用户信息和JWT令牌
 * 说明：服务端使用code调用微信API换取openid，首次登录时自动创建用户
 */
router.post('/wechat-login', validate([
  body('code')
    .notEmpty().withMessage('code不能为空')
]), async (req, res, next) => {
  try {
    const { code } = req.body;
    const openid = await exchangeWechatCode(code);
    const result = wechatLogin(openid);
    return success(res, result, '登录成功');
  } catch (err) {
    next(err);
  }
});

module.exports = router;