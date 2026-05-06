/**
 * 抽奖路由 - 奖品列表、抽奖、中奖记录
 * 基础路径: /api/lottery
 * 所有接口需要登录认证
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPrizes, draw, getLotteryRecords } = require('../services/lotteryService');
const { success } = require('../utils/responseHelper');

// 获取奖品列表
router.get('/prizes', auth, (req, res, next) => {
  try {
    const result = getPrizes();
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// 执行抽奖（消耗积分）
router.post('/draw', auth, (req, res, next) => {
  try {
    const result = draw(req.user.userId);
    return success(res, result, '抽奖成功');
  } catch (err) {
    next(err);
  }
});

// 获取抽奖记录（分页）
router.get('/records', auth, (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = getLotteryRecords(
      req.user.userId,
      parseInt(page) || 1,
      parseInt(pageSize) || 20
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
