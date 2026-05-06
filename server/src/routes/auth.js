/**
 * 认证路由 - 用户注册、登录、微信登录
 * 基础路径: /api/auth
 */
const express = require('express');
const router = express.Router();
const { register, login, wechatLogin } = require('../services/userService');
const { validate, body } = require('../middleware/validator');
const { success } = require('../utils/responseHelper');

// 用户注册
router.post('/register', validate([
  body('username')
    .notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 3, max: 20 }).withMessage('用户名需3-20位')
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

// 用户登录
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

// 微信小程序登录
router.post('/wechat-login', validate([
  body('openid')
    .notEmpty().withMessage('openid不能为空')
]), (req, res, next) => {
  try {
    const { openid } = req.body;
    const result = wechatLogin(openid);
    return success(res, result, '登录成功');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
