/**
 * 管理员路由 - 数据面板、用户管理、打卡管理、积分管理、奖品管理、备份、日志
 * 基础路径: /api/admin
 * 所有接口需要登录认证 + 管理员权限
 * 敏感操作（禁用用户、调整积分、删除奖品）需要二次确认
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  makeupCheckin, adjustPoints, getDashboard, getUsers, updateUserStatus,
  getAllCheckins, getAllPointsLog, createPrize, updatePrize, deletePrize, getAllLotteryRecords,
  getAllImages, getAdminLogs,
} = require('../services/adminService');
const { getPrizes } = require('../services/lotteryService');
const { backupDatabase } = require('../utils/backup');
const { success, fail } = require('../utils/responseHelper');

// 所有管理员路由都需要认证 + 管理员权限
router.use(auth, adminAuth);

// 数据面板：总用户数、总打卡数、今日打卡、近7天趋势
router.get('/dashboard', (req, res, next) => {
  try {
    const result = getDashboard();
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 用户列表（支持搜索和状态筛选）
router.get('/users', (req, res, next) => {
  try {
    const { page, pageSize, search, status } = req.query;
    const result = getUsers(
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
      search || '',
      status || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 更新用户状态（启用/禁用）- 敏感操作，需要 confirmed 参数
router.put('/users/:id', (req, res, next) => {
  try {
    const { status, confirmed } = req.body;
    const result = updateUserStatus(req.user.userId, parseInt(req.params.id), status, confirmed === true);
    return success(res, result, '更新成功');
  } catch (err) {
    next(err);
  }
});

// 管理员补打卡 - 需要 confirmed 参数
router.post('/checkin/makeup', (req, res, next) => {
  try {
    const { userId, taskId, checkinDate, confirmed } = req.body;
    if (!userId || !taskId || !checkinDate) {
      return fail(res, 400, '用户ID、任务ID和日期不能为空');
    }
    const result = makeupCheckin(req.user.userId, userId, taskId, checkinDate, confirmed === true);
    return success(res, result, '补打卡成功');
  } catch (err) {
    next(err);
  }
});

// 所有打卡记录（支持按用户和日期范围筛选）
router.get('/checkins', (req, res, next) => {
  try {
    const { page, pageSize, userId, startDate, endDate } = req.query;
    const result = getAllCheckins(
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
      userId || '',
      startDate || '',
      endDate || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 所有积分流水（支持按用户和类型筛选）
router.get('/points', (req, res, next) => {
  try {
    const { page, pageSize, userId, type } = req.query;
    const result = getAllPointsLog(
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
      userId || '',
      type || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 手动调整用户积分 - 敏感操作，需要 confirmed 参数
router.post('/points/adjust', (req, res, next) => {
  try {
    const { userId, amount, reason, confirmed } = req.body;
    if (!userId || amount === undefined) {
      return fail(res, 400, '用户ID和积分数量不能为空');
    }
    const result = adjustPoints(req.user.userId, userId, amount, reason, confirmed === true);
    return success(res, result, '积分调整成功');
  } catch (err) {
    next(err);
  }
});

// 获取奖品列表
router.get('/prizes', (req, res, next) => {
  try {
    const result = getPrizes();
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 创建新奖品
router.post('/prizes', (req, res, next) => {
  try {
    const { name, probability } = req.body;
    if (!name) {
      return fail(res, 400, '奖品名称不能为空');
    }
    if (probability === undefined || probability < 0 || probability > 1) {
      return fail(res, 400, '概率必须在0-1之间');
    }
    const result = createPrize(req.user.userId, req.body);
    return success(res, result, '创建成功');
  } catch (err) {
    next(err);
  }
});

// 更新奖品信息
router.put('/prizes/:id', (req, res, next) => {
  try {
    const prizeData = { ...req.body, id: parseInt(req.params.id) };
    const result = updatePrize(req.user.userId, prizeData);
    return success(res, result, '更新成功');
  } catch (err) {
    next(err);
  }
});

// 删除奖品（软删除）- 敏感操作，需要 confirmed 参数
router.delete('/prizes/:id', (req, res, next) => {
  try {
    const { confirmed } = req.body;
    const result = deletePrize(req.user.userId, parseInt(req.params.id), confirmed === true);
    return success(res, result, '删除成功');
  } catch (err) {
    next(err);
  }
});

// 所有抽奖记录（分页）
router.get('/lottery/records', (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = getAllLotteryRecords(parseInt(page) || 1, parseInt(pageSize) || 20);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 图片资源列表（支持按用户筛选）
router.get('/images', (req, res, next) => {
  try {
    const { page, pageSize, userId } = req.query;
    const result = getAllImages(
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
      userId || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 数据库备份（打包数据库文件和上传目录为 ZIP）- 敏感操作，需要二次确认
router.post('/backup', (req, res, next) => {
  try {
    const { confirmed } = req.body;
    // 数据库备份涉及完整数据导出，属于敏感操作，需要二次确认
    if (!confirmed) {
      return fail(res, 400, '备份操作需要二次确认，请在请求中设置 confirmed: true');
    }
    const result = backupDatabase();
    return success(res, result, '备份成功');
  } catch (err) {
    next(err);
  }
});

// 管理员操作日志（分页）
router.get('/logs', (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = getAdminLogs(parseInt(page) || 1, parseInt(pageSize) || 20);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
