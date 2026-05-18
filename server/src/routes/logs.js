/**
 * 用户端日志路由 - 个人操作记录中心
 * 基础路径: /api/logs
 * 所有接口需要登录认证，用户只能查看和导出自己的数据
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getUserLogs } = require('../services/logService');
const { success, fail } = require('../utils/responseHelper');

function escapeCsvCell(val) {
  const str = String(val ?? '')
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str
  }
  return str
}

// 全局中间件：所有日志路由都需要登录认证
// auth: 验证JWT令牌，确保用户已登录并将用户信息注入 req.user
router.use(auth);

/**
 * 查询个人操作日志 - 获取当前用户的历史行为记录
 * GET /api/logs/user
 * 权限：登录用户（仅查看自己的数据）
 * 查询参数：
 *   action    - 按操作类型筛选（可选，如 login/checkin/lottery）
 *   startDate - 按起始日期筛选（可选）
 *   endDate   - 按截止日期筛选（可选）
 *   keyword   - 关键词搜索（可选）
 *   page      - 页码，默认1
 *   pageSize  - 每页条数，默认20，最大100
 * 返回：分页的日志记录及分页信息
 */
router.get('/user', (req, res, next) => {
  try {
    const { action, startDate, endDate, keyword, page, pageSize } = req.query;
    const result = getUserLogs({
      // userId 由 auth 中间件注入，确保用户只能查询自己的日志
      userId: req.user.userId,
      action: action || '',
      startDate: startDate || '',
      endDate: endDate || '',
      keyword: keyword || '',
      page: parseInt(page) || 1,
      // pageSize 限制最大值为100，防止单次查询数据量过大
      pageSize: Math.min(parseInt(pageSize) || 20, 100),
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 导出个人操作日志为CSV文件
 * GET /api/logs/user/export
 * 权限：登录用户（仅导出自己的数据）
 * 查询参数：
 *   action    - 按操作类型筛选（可选）
 *   startDate - 按起始日期筛选（可选）
 *   endDate   - 按截止日期筛选（可选）
 *   keyword   - 关键词搜索（可选）
 * 返回：CSV格式文件下载（UTF-8 BOM编码，兼容Excel打开）
 */
router.get('/user/export', (req, res, next) => {
  try {
    const { action, startDate, endDate, keyword } = req.query;
    const result = getUserLogs({
      // userId 由 auth 中间件注入，确保只能导出自己的日志
      userId: req.user.userId,
      action: action || '',
      startDate: startDate || '',
      endDate: endDate || '',
      keyword: keyword || '',
      // 导出时不分页，pageSize 设为1000以获取足够多的数据
      page: 1,
      pageSize: 1000,
    });

    // 构建CSV内容：首行为列头，后续行为数据行
    // detail字段中双引号需要转义（CSV标准：两个双引号表示一个双引号）
    const header = 'ID,时间,操作类型,目标类型,详情,IP\n';
    const rows = result.records.map(r => `${escapeCsvCell(r.id)},"${escapeCsvCell(r.createdAt)}","${escapeCsvCell(r.action)}","${escapeCsvCell(r.targetType || '')}","${escapeCsvCell((r.detail || '').replace(/"/g, '""'))}","${escapeCsvCell(r.ip || '')}"`).join('\n');
    // \uFEFF 为 UTF-8 BOM，确保Excel正确识别中文编码
    const csv = '\uFEFF' + header + rows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=operation_logs.csv');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;