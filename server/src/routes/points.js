/**
 * 积分路由 - 积分余额、积分流水
 * 基础路径: /api/points
 * 所有接口需要登录认证
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBalance, getPointsLog, getConsumedPoints } = require('../services/pointsService');
const { success } = require('../utils/responseHelper');

// 获取当前积分余额
router.get('/balance', auth, (req, res, next) => {
  try {
    const result = getBalance(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 获取积分流水记录（支持按类型筛选和分页）
router.get('/log', auth, (req, res, next) => {
  try {
    const { type, page, pageSize } = req.query;
    const result = getPointsLog(
      req.user.userId,
      type || '',
      parseInt(page) || 1,
      parseInt(pageSize) || 20
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 获取已消耗积分总数（服务端聚合计算，避免前端全量遍历）
router.get('/consumed', auth, (req, res, next) => {
  try {
    const total = getConsumedPoints(req.user.userId);
    return success(res, { total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
