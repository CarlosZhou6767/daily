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
  getAllImages,
} = require('../services/adminService');
const { getAdminLogs, getUserLogs, getSystemLogs, getErrorLogs, deleteLogs } = require('../services/logService');
const { getPrizes } = require('../services/lotteryService');
const { backupDatabase } = require('../utils/backup');
const { success, fail } = require('../utils/responseHelper');

function escapeCsvCell(val) {
  const str = String(val ?? '')
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str
  }
  return str
}

// 全局中间件：所有管理员路由都需要登录认证 + 管理员权限校验
// auth: 验证JWT令牌，确保用户已登录并将用户信息注入 req.user
// adminAuth: 检查用户角色是否为管理员，非管理员用户将被拒绝访问
router.use(auth, adminAuth);

/**
 * 数据面板 - 获取概览统计数据
 * GET /api/admin/dashboard
 * 权限：管理员
 * 返回：总用户数、总打卡数、今日打卡数、近7天趋势数据
 */
router.get('/dashboard', (req, res, next) => {
  try {
    const result = getDashboard();
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 用户列表 - 获取所有注册用户
 * GET /api/admin/users
 * 权限：管理员
 * 查询参数：
 *   page       - 页码，默认1
 *   pageSize   - 每页条数，默认20
 *   search     - 搜索关键词（模糊匹配用户名/昵称）
 *   status     - 状态筛选（active/disabled，空字符串表示全部）
 */
router.get('/users', (req, res, next) => {
  try {
    const { page, pageSize, search, status } = req.query;
    const result = getUsers(
      parseInt(page) || 1,
      Math.min(parseInt(pageSize) || 20, 100),
      search || '',
      status || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 更新用户状态（启用/禁用）
 * PUT /api/admin/users/:id
 * 权限：管理员
 * 敏感操作：需要 confirmed 参数进行二次确认
 * 请求体：
 *   status    - 目标状态（active/disabled）
 *   confirmed - 二次确认标记（必须为 true）
 */
router.put('/users/:id', (req, res, next) => {
  try {
    const { status, confirmed } = req.body;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return fail(res, 400, '无效的ID');
    const result = updateUserStatus(req.user.userId, id, status, confirmed === true);
    return success(res, result, '更新成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 管理员补打卡 - 为指定用户补录打卡记录
 * POST /api/admin/checkin/makeup
 * 权限：管理员
 * 敏感操作：需要 confirmed 参数进行二次确认
 * 请求体：
 *   userId      - 目标用户ID
 *   taskId      - 打卡任务ID
 *   checkinDate - 补打卡日期
 *   confirmed   - 二次确认标记（必须为 true）
 */
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

/**
 * 所有打卡记录 - 查询全平台打卡记录
 * GET /api/admin/checkins
 * 权限：管理员
 * 查询参数：
 *   page      - 页码，默认1
 *   pageSize  - 每页条数，默认20
 *   userId    - 按用户ID筛选（可选）
 *   startDate - 按起始日期筛选（可选）
 *   endDate   - 按截止日期筛选（可选）
 */
router.get('/checkins', (req, res, next) => {
  try {
    const { page, pageSize, userId, startDate, endDate } = req.query;
    const result = getAllCheckins(
      parseInt(page) || 1,
      Math.min(parseInt(pageSize) || 20, 100),
      userId || '',
      startDate || '',
      endDate || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 所有积分流水 - 查询全平台积分变动记录
 * GET /api/admin/points
 * 权限：管理员
 * 查询参数：
 *   page     - 页码，默认1
 *   pageSize - 每页条数，默认20
 *   userId   - 按用户ID筛选（可选）
 *   type     - 按积分变动类型筛选（如 checkin/lottery/adjust，可选）
 */
router.get('/points', (req, res, next) => {
  try {
    const { page, pageSize, userId, type } = req.query;
    const result = getAllPointsLog(
      parseInt(page) || 1,
      Math.min(parseInt(pageSize) || 20, 100),
      userId || '',
      type || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 手动调整用户积分 - 管理员为用户增减积分
 * POST /api/admin/points/adjust
 * 权限：管理员
 * 敏感操作：需要 confirmed 参数进行二次确认
 * 请求体：
 *   userId    - 目标用户ID
 *   amount    - 调整数量（正数为增加，负数为扣减）
 *   reason    - 调整原因说明
 *   confirmed - 二次确认标记（必须为 true）
 */
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

/**
 * 获取奖品列表 - 查看所有抽奖奖品配置
 * GET /api/admin/prizes
 * 权限：管理员
 */
router.get('/prizes', (req, res, next) => {
  try {
    const result = getPrizes();
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 创建新奖品 - 添加抽奖奖品配置
 * POST /api/admin/prizes
 * 权限：管理员
 * 请求体：
 *   name        - 奖品名称
 *   probability - 中奖概率（0-1之间的小数）
 *   其他字段由 adminService.createPrize 处理
 */
router.post('/prizes', (req, res, next) => {
  try {
    const { name, probability } = req.body;
    if (!name) {
      return fail(res, 400, '奖品名称不能为空');
    }
    if (probability == null || isNaN(Number(probability)) || Number(probability) < 0 || Number(probability) > 1) {
      return fail(res, 400, '概率必须在0-1之间');
    }
    const result = createPrize(req.user.userId, req.body);
    return success(res, result, '创建成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 更新奖品信息 - 修改已有奖品配置
 * PUT /api/admin/prizes/:id
 * 权限：管理员
 * 路径参数：:id - 奖品ID
 * 请求体：需要更新的奖品字段（name, probability 等）
 */
router.put('/prizes/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return fail(res, 400, '无效的ID');
    const prizeData = { ...req.body, id };
    const result = updatePrize(req.user.userId, prizeData);
    return success(res, result, '更新成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 删除奖品（软删除）
 * DELETE /api/admin/prizes/:id
 * 权限：管理员
 * 敏感操作：需要 confirmed 参数进行二次确认
 * 路径参数：:id - 奖品ID
 * 请求体：
 *   confirmed - 二次确认标记（必须为 true）
 */
router.delete('/prizes/:id', (req, res, next) => {
  try {
    const { confirmed } = req.body;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return fail(res, 400, '无效的ID');
    const result = deletePrize(req.user.userId, id, confirmed === true);
    return success(res, result, '删除成功');
  } catch (err) {
    next(err);
  }
});

/**
 * 所有抽奖记录 - 查询全平台抽奖历史
 * GET /api/admin/lottery/records
 * 权限：管理员
 * 查询参数：
 *   page     - 页码，默认1
 *   pageSize - 每页条数，默认20
 */
router.get('/lottery/records', (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = getAllLotteryRecords(parseInt(page) || 1, Math.min(parseInt(pageSize) || 20, 100));
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 图片资源列表 - 查询全平台用户上传的图片
 * GET /api/admin/images
 * 权限：管理员
 * 查询参数：
 *   page     - 页码，默认1
 *   pageSize - 每页条数，默认20
 *   userId   - 按用户ID筛选（可选）
 */
router.get('/images', (req, res, next) => {
  try {
    const { page, pageSize, userId } = req.query;
    const result = getAllImages(
      parseInt(page) || 1,
      Math.min(parseInt(pageSize) || 20, 100),
      userId || ''
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 数据库备份 - 将数据库文件和上传目录打包为ZIP
 * POST /api/admin/backup
 * 权限：管理员
 * 敏感操作：需要 confirmed 参数进行二次确认
 * 请求体：
 *   confirmed - 二次确认标记（必须为 true）
 */
router.post('/backup', async (req, res, next) => {
  try {
    const { confirmed } = req.body;
    if (!confirmed) {
      return fail(res, 400, '备份操作需要二次确认，请在请求中设置 confirmed: true');
    }
    const result = await backupDatabase();
    return success(res, result, '备份成功');
  } catch (err) {
    next(err);
  }
});

// ========== 日志中心 ==========

/**
 * 管理员操作日志 - 查询管理员行为审计记录
 * GET /api/admin/logs/admin
 * 权限：管理员
 * 查询参数：
 *   adminId    - 按管理员ID筛选
 *   action     - 按操作类型筛选
 *   targetType - 按目标类型筛选
 *   startDate  - 按起始日期筛选
 *   endDate    - 按截止日期筛选
 *   keyword    - 关键词搜索
 *   page       - 页码，默认1
 *   pageSize   - 每页条数，默认20，最大100
 */
router.get('/logs/admin', (req, res, next) => {
  try {
    const { adminId, action, targetType, startDate, endDate, keyword, page, pageSize } = req.query;
    const result = getAdminLogs({
      adminId: adminId ? parseInt(adminId) : '',
      action: action || '',
      targetType: targetType || '',
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
 * 全部用户行为日志 - 查询所有用户操作记录
 * GET /api/admin/logs/user
 * 权限：管理员
 * 查询参数：
 *   userId    - 按用户ID筛选
 *   action    - 按操作类型筛选
 *   startDate - 按起始日期筛选
 *   endDate   - 按截止日期筛选
 *   keyword   - 关键词搜索
 *   page      - 页码，默认1
 *   pageSize  - 每页条数，默认20，最大100
 */
router.get('/logs/user', (req, res, next) => {
  try {
    const { userId, action, startDate, endDate, keyword, page, pageSize } = req.query;
    const result = getUserLogs({
      userId: userId || '',
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
 * 系统运行日志 - 解析服务端日志文件
 * GET /api/admin/logs/system
 * 权限：管理员
 * 查询参数：
 *   level     - 按日志级别筛选（info/warn/error）
 *   startDate - 按起始日期筛选
 *   endDate   - 按截止日期筛选
 *   page      - 页码，默认1
 *   pageSize  - 每页条数，默认20，最大100
 */
router.get('/logs/system', (req, res, next) => {
  try {
    const { level, startDate, endDate, page, pageSize } = req.query;
    const result = getSystemLogs({
      level: level || '',
      startDate: startDate || '',
      endDate: endDate || '',
      page: parseInt(page) || 1,
      pageSize: Math.min(parseInt(pageSize) || 20, 100),
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 错误日志 - 解析服务端错误日志文件
 * GET /api/admin/logs/error
 * 权限：管理员
 * 查询参数：
 *   startDate - 按起始日期筛选
 *   endDate   - 按截止日期筛选
 *   page      - 页码，默认1
 *   pageSize  - 每页条数，默认20，最大100
 */
router.get('/logs/error', (req, res, next) => {
  try {
    const { startDate, endDate, page, pageSize } = req.query;
    const result = getErrorLogs({
      startDate: startDate || '',
      endDate: endDate || '',
      page: parseInt(page) || 1,
      pageSize: Math.min(parseInt(pageSize) || 20, 100),
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * 导出日志为CSV文件
 * GET /api/admin/logs/export
 * 权限：管理员
 * 查询参数：
 *   type      - 日志类型（admin/管理员操作日志 或 user/用户行为日志）
 *   action    - 按操作类型筛选
 *   adminId   - 按管理员ID筛选（仅type=admin时有效）
 *   userId    - 按用户ID筛选（仅type=user时有效）
 *   startDate - 按起始日期筛选
 *   endDate   - 按截止日期筛选
 *   keyword   - 关键词搜索
 * 返回：CSV格式文件下载（UTF-8 BOM编码，兼容Excel打开）
 */
router.get('/logs/export', (req, res, next) => {
  try {
    const { type, action, adminId, userId, startDate, endDate, keyword } = req.query;

    let records = [];
    if (type === 'admin') {
      // 导出管理员日志，pageSize 设为5000以获取大量数据
      const result = getAdminLogs({
        adminId: adminId || '', action: action || '', targetType: '', startDate: startDate || '',
        endDate: endDate || '', keyword: keyword || '', page: 1, pageSize: 5000,
      });
      records = result.records;
    } else if (type === 'user') {
      // 导出用户行为日志，pageSize 设为5000以获取大量数据
      const result = getUserLogs({
        userId: userId || '', action: action || '', startDate: startDate || '',
        endDate: endDate || '', keyword: keyword || '', page: 1, pageSize: 5000,
      });
      records = result.records;
    }

    // 构建CSV内容：首行为列头，后续行为数据行
    // detail字段中双引号需要转义（CSV标准：两个双引号表示一个双引号）
    const header = 'ID,时间,用户/管理员,操作类型,目标类型,详情,IP\n';
    const rows = records.map(r => {
      const name = r.adminName || r.userId || '';
      return `${escapeCsvCell(r.id)},"${escapeCsvCell(r.createdAt)}","${escapeCsvCell(name)}","${escapeCsvCell(r.action)}","${escapeCsvCell(r.targetType || '')}","${escapeCsvCell((r.detail || '').replace(/"/g, '""'))}","${escapeCsvCell(r.ip || '')}"`;
    }).join('\n');
    // \uFEFF 为 UTF-8 BOM，确保Excel正确识别中文编码
    const csv = '\uFEFF' + header + rows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${type || 'logs'}_export.csv`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * 删除日志（按类型+ID列表 或 按日期之前批量删除）
 * DELETE /api/admin/logs
 * 权限：管理员
 * 敏感操作：需要 confirmed 参数进行二次确认
 * 请求体：
 *   type       - 日志类型（admin/user/system/error）
 *   ids        - 要删除的日志ID数组（精确删除）
 *   beforeDate - 删除此日期之前的所有日志（批量清理）
 *   confirmed  - 二次确认标记（必须为 true）
 */
router.delete('/logs', (req, res, next) => {
  try {
    const { type, ids, beforeDate, confirmed } = req.body;
    // 删除操作不可逆，需要二次确认
    if (!confirmed) {
      return fail(res, 400, '删除日志需要二次确认，请设置 confirmed: true');
    }
    const result = deleteLogs({ type, ids, beforeDate });
    return success(res, result, '删除成功');
  } catch (err) {
    next(err);
  }
});

module.exports = router;