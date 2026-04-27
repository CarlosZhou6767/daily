/**
 * 积分路由 - 积分余额、积分流水
 * 基础路径: /api/points
 * 所有接口需要登录认证
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBalance, getPointsLog } = require('../services/pointsService');

// 获取当前积分余额
router.get('/balance', auth, (req, res, next) => {
  try {
    const result = getBalance(req.user.userId);
    res.json({ code: 200, data: result });
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
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
