/**
 * 积分路由 - 积分余额、积分流水、已消耗积分
 * 基础路径: /api/points
 * 所有接口需要登录认证，用户只能查询自己的积分数据
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBalance, getPointsLog, getConsumedPoints } = require('../services/pointsService');
const { success } = require('../utils/responseHelper');

/**
 * 获取当前积分余额
 * GET /api/points/balance
 * 权限：登录用户（仅查看自己的余额）
 * 返回：当前可用积分数量
 */
router.get('/balance', auth, (req, res, next) => {
  try {
    // req.user.userId 由 auth 中间件注入，确保只能查询自己的积分余额
    const result = getBalance(req.user.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 获取积分流水记录 - 查询积分变动明细
 * GET /api/points/log
 * 权限：登录用户（仅查看自己的流水）
 * 查询参数：
 *   type     - 按变动类型筛选（可选，如 checkin/lottery/adjust）
 *   page     - 页码，默认1
 *   pageSize - 每页条数，默认20
 * 返回：分页的积分变动记录及分页信息
 */
router.get('/log', auth, (req, res, next) => {
  try {
    const { type, page, pageSize } = req.query;
    const result = getPointsLog(
      // req.user.userId 由 auth 中间件注入，确保只能查询自己的积分流水
      req.user.userId,
      type || '',
      parseInt(page) || 1,
      Math.min(parseInt(pageSize) || 20, 100)
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 获取已消耗积分总数 - 服务端聚合计算
 * GET /api/points/consumed
 * 权限：登录用户（仅查看自己的数据）
 * 返回：{ total: number } 已消耗的积分总数
 * 说明：在服务端完成聚合计算，避免前端全量遍历数据，提升性能
 */
router.get('/consumed', auth, (req, res, next) => {
  try {
    // req.user.userId 由 auth 中间件注入，确保只能查询自己的消耗数据
    const total = getConsumedPoints(req.user.userId);
    return success(res, { total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;