/**
 * 抽奖路由 - 奖品列表、抽奖、中奖记录
 * 基础路径: /api/lottery
 * 所有接口需要登录认证
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { getPrizes, draw, getLotteryRecords } = require('../services/lotteryService');

// 获取奖品列表
router.get('/prizes', auth, (req, res, next) => {
  try {
    const result = getPrizes();
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

// 执行抽奖（消耗积分）
router.post('/draw', auth, validate([]), (req, res, next) => {
  try {
    const result = draw(req.user.userId);
    res.json({ code: 200, message: '抽奖成功', data: result });
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
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
