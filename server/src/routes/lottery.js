/**
 * 抽奖路由 - 奖品列表、执行抽奖、中奖记录查询
 * 基础路径: /api/lottery
 * 所有接口需要登录认证
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPrizes, draw, getLotteryRecords } = require('../services/lotteryService');
const { success } = require('../utils/responseHelper');

/**
 * 获取奖品列表 - 查看所有可抽奖品及概率配置
 * GET /api/lottery/prizes
 * 权限：登录用户
 * 返回：奖品列表，含名称、概率、库存等信息
 */
router.get('/prizes', auth, (req, res, next) => {
  try {
    const result = getPrizes();
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 执行抽奖 - 消耗积分进行一次抽奖
 * POST /api/lottery/draw
 * 权限：登录用户
 * 返回：中奖结果（奖品信息或未中奖提示）
 * 前置条件：用户积分余额需满足抽奖消耗
 */
router.post('/draw', auth, (req, res, next) => {
  try {
    // req.user.userId 由 auth 中间件注入，确保积分从正确用户扣除
    const result = draw(req.user.userId);
    return success(res, result, '抽奖成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 获取个人抽奖记录 - 查询当前用户的抽奖历史
 * GET /api/lottery/records
 * 权限：登录用户（仅查看自己的记录）
 * 查询参数：
 *   page     - 页码，默认1
 *   pageSize - 每页条数，默认20
 * 返回：分页的抽奖记录及分页信息
 */
router.get('/records', auth, (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = getLotteryRecords(
      // req.user.userId 由 auth 中间件注入，确保只能查看自己的抽奖记录
      req.user.userId,
      parseInt(page) || 1,
      Math.min(parseInt(pageSize) || 20, 100)
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;