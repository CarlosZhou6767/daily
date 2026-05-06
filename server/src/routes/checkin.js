/**
 * 打卡路由 - 打卡操作、今日打卡查询、历史记录、连续天数、任务管理
 * 基础路径: /api/checkin
 * 所有接口需要登录认证
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, body } = require('../middleware/validator');
const { doCheckin, getTodayCheckin, getCheckinHistory, getStreak, createTask, deleteTask, getTasks } = require('../services/checkinService');
const { success } = require('../utils/responseHelper');

// 执行打卡
router.post('/', auth, validate([
  body('taskId')
    .notEmpty().withMessage('任务ID不能为空')
    .isInt({ min: 1 }).withMessage('任务ID必须是正整数'),
  body('note')
    .optional()
    .isLength({ max: 500 }).withMessage('备注最多500字')
]), (req, res, next) => {
  try {
    const { taskId, imagePath, note } = req.body;
    const result = doCheckin(req.user.userId, taskId, imagePath, note);
    return success(res, result, '打卡成功');
  } catch (err) {
    next(err);
  }
});

// 获取今日打卡状态
router.get('/today', auth, (req, res, next) => {
  try {
    const result = getTodayCheckin(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 获取打卡历史记录（支持按年月筛选和分页）
router.get('/history', auth, (req, res, next) => {
  try {
    const { year, month, page, pageSize } = req.query;
    const result = getCheckinHistory(
      req.user.userId,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
      parseInt(page) || 1,
      parseInt(pageSize) || 30
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 获取连续打卡天数
router.get('/streak', auth, (req, res, next) => {
  try {
    const result = getStreak(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 获取用户的打卡任务列表
router.get('/tasks', auth, (req, res, next) => {
  try {
    const result = getTasks(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 创建自定义打卡任务
router.post('/tasks', auth, validate([
  body('name')
    .notEmpty().withMessage('任务名称不能为空')
]), (req, res, next) => {
  try {
    const { name, icon, description } = req.body;
    const result = createTask(req.user.userId, name, icon, description);
    return success(res, result, '创建成功');
  } catch (err) {
    next(err);
  }
});

// 删除打卡任务（软删除）
router.delete('/tasks/:id', auth, (req, res, next) => {
  try {
    deleteTask(req.user.userId, parseInt(req.params.id));
    return success(res, null, '删除成功');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
