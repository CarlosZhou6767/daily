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
const { success, fail } = require('../utils/responseHelper');

/**
 * 执行打卡 - 对指定任务进行今日打卡
 * POST /api/checkin
 * 权限：登录用户
 * 请求体：
 *   taskId    - 打卡任务ID（正整数）
 *   imagePath - 打卡图片路径（可选）
 *   note      - 打卡备注（可选，最多500字）
 * 返回：打卡记录详情，含积分奖励
 */
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

/**
 * 获取今日打卡状态 - 查询用户各项任务今天的打卡完成情况
 * GET /api/checkin/today
 * 权限：登录用户（仅查看自己的数据）
 * 返回：各任务今日是否已打卡的状态列表
 */
router.get('/today', auth, (req, res, next) => {
  try {
    // req.user.userId 由 auth 中间件注入，确保用户只能查看自己的数据
    const result = getTodayCheckin(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 获取打卡历史记录 - 查询历史打卡明细
 * GET /api/checkin/history
 * 权限：登录用户（仅查看自己的数据）
 * 查询参数：
 *   year     - 按年份筛选（可选，如 2026）
 *   month    - 按月份筛选（可选，如 5，需与 year 配合使用）
 *   page     - 页码，默认1
 *   pageSize - 每页条数，默认30
 * 返回：分页的打卡历史记录及分页信息
 */
router.get('/history', auth, (req, res, next) => {
  try {
    const { year, month, page, pageSize } = req.query;
    const result = getCheckinHistory(
      req.user.userId,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
      parseInt(page) || 1,
      Math.min(parseInt(pageSize) || 30, 100)
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 获取连续打卡天数 - 查询当前连续打卡的统计
 * GET /api/checkin/streak
 * 权限：登录用户（仅查看自己的数据）
 * 返回：当前连续打卡天数、最长连续天数等统计信息
 */
router.get('/streak', auth, (req, res, next) => {
  try {
    const result = getStreak(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 获取用户的打卡任务列表 - 包含系统预设任务和用户自定义任务
 * GET /api/checkin/tasks
 * 权限：登录用户（仅查看自己的数据）
 * 返回：用户所有活跃的打卡任务
 */
router.get('/tasks', auth, (req, res, next) => {
  try {
    const result = getTasks(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 创建自定义打卡任务 - 用户可创建个性化任务
 * POST /api/checkin/tasks
 * 权限：登录用户
 * 请求体：
 *   name        - 任务名称（必填）
 *   icon        - 任务图标（可选）
 *   description - 任务描述（可选）
 */
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

/**
 * 删除打卡任务（软删除，仅标记为删除状态而不物理删除数据）
 * DELETE /api/checkin/tasks/:id
 * 权限：登录用户（仅能删除自己的任务）
 * 路径参数：:id - 要删除的任务ID
 * 返回：删除成功确认
 */
router.delete('/tasks/:id', auth, (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return fail(res, 400, '无效的ID');
    deleteTask(req.user.userId, id);
    return success(res, null, '删除成功');
  } catch (err) {
    next(err);
  }
});

module.exports = router;