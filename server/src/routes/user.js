/**
 * 用户路由 - 个人信息、修改资料、修改密码、统计数据
 * 基础路径: /api/user
 * 所有接口需要登录认证
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, body } = require('../middleware/validator');
const { getUserById, updateProfile, changePassword, getUserStats } = require('../services/userService');

// 获取当前用户信息
router.get('/profile', auth, (req, res, next) => {
  try {
    const result = getUserById(req.user.userId);
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

// 更新用户资料（仅允许修改白名单字段）
router.put('/profile', auth, validate([
  body('nickname')
    .optional()
    .isLength({ max: 50 }).withMessage('昵称最多50字'),
  body('phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
  body('theme')
    .optional()
    .isIn(['light', 'dark']).withMessage('主题只能是 light 或 dark')
]), (req, res, next) => {
  try {
    const allowedFields = ['nickname', 'avatar', 'theme', 'phone'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的更新字段' });
    }
    updateProfile(req.user.userId, updates);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    next(err);
  }
});

// 修改密码（需验证原密码，新密码需符合强度要求）
router.put('/password', auth, validate([
  body('oldPassword')
    .notEmpty().withMessage('原密码不能为空'),
  body('newPassword')
    .notEmpty().withMessage('新密码不能为空')
    .isLength({ min: 8 }).withMessage('新密码至少8位')
    .matches(/[a-z]/).withMessage('新密码需包含小写字母')
    .matches(/[A-Z]/).withMessage('新密码需包含大写字母')
    .matches(/\d/).withMessage('新密码需包含数字')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('新密码需包含特殊字符')
]), (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    changePassword(req.user.userId, oldPassword, newPassword);
    res.json({ code: 200, message: '密码修改成功' });
  } catch (err) {
    next(err);
  }
});

// 获取用户统计数据（总打卡天数、连续天数、积分等）
router.get('/stats', auth, (req, res, next) => {
  try {
    const result = getUserStats(req.user.userId);
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
