/**
 * 用户路由 - 个人信息查询、修改资料、修改密码、统计数据
 * 基础路径: /api/user
 * 所有接口需要登录认证，用户只能操作自己的数据
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, body } = require('../middleware/validator');
const { getUserById, updateProfile, changePassword, getUserStats } = require('../services/userService');
const { success, fail } = require('../utils/responseHelper');

/**
 * 获取当前用户信息 - 查询个人资料
 * GET /api/user/profile
 * 权限：登录用户（仅查看自己的资料）
 * 返回：用户基本信息（用户名、昵称、头像、积分等，不含密码）
 */
router.get('/profile', auth, (req, res, next) => {
  try {
    // req.user.userId 由 auth 中间件注入，确保只能获取自己的资料
    const result = getUserById(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 更新用户资料 - 修改昵称、手机号、主题等可编辑字段
 * PUT /api/user/profile
 * 权限：登录用户（仅能修改自己的资料）
 * 请求体（均为可选，至少提供一个）：
 *   nickname - 昵称（最多50字）
 *   phone    - 手机号（中国大陆格式）
 *   theme    - UI主题偏好（light/dark）
 *   avatar   - 头像路径
 * 安全机制：仅允许修改白名单字段（nickname, avatar, theme, phone），
 *           防止用户通过请求体篡改敏感字段如角色、积分等
 */
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
    // 白名单字段：仅提取允许更新的字段，防止用户越权修改敏感数据
    const allowedFields = ['nickname', 'avatar', 'theme', 'phone'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return fail(res, 400, '没有有效的更新字段');
    }
    // req.user.userId 确保只能更新自己的资料
    updateProfile(req.user.userId, updates);
    return success(res, null, '更新成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 修改密码 - 需验证原密码，新密码需符合强度要求
 * PUT /api/user/password
 * 权限：登录用户
 * 请求体：
 *   oldPassword - 当前密码（用于验证身份）
 *   newPassword - 新密码（至少8位，需包含大小写字母、数字和特殊字符）
 * 密码强度要求：大小写字母 + 数字 + 特殊字符，防止弱密码
 */
router.put('/password', auth, validate([
  body('oldPassword')
    .notEmpty().withMessage('原密码不能为空'),
  body('newPassword')
    .notEmpty().withMessage('新密码不能为空')
    .isLength({ min: 8 }).withMessage('新密码至少8位')
    // 密码强度校验：必须包含小写字母
    .matches(/[a-z]/).withMessage('新密码需包含小写字母')
    // 密码强度校验：必须包含大写字母
    .matches(/[A-Z]/).withMessage('新密码需包含大写字母')
    // 密码强度校验：必须包含数字
    .matches(/\d/).withMessage('新密码需包含数字')
    // 密码强度校验：必须包含特殊字符
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('新密码需包含特殊字符')
]), (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    // req.user.userId 确保只能修改自己的密码
    changePassword(req.user.userId, oldPassword, newPassword);
    return success(res, null, '密码修改成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 获取用户统计数据 - 综合统计信息
 * GET /api/user/stats
 * 权限：登录用户（仅查看自己的数据）
 * 返回：总打卡天数、当前连续天数、最长连续天数、积分总计等统计数据
 */
router.get('/stats', auth, (req, res, next) => {
  try {
    // req.user.userId 由 auth 中间件注入，确保只能查看自己的统计数据
    const result = getUserStats(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;