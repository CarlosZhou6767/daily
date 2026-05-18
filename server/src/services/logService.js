/**
 * 日志服务 - 用户操作日志、管理员操作日志、系统日志查询与清理
 * 提供行为审计和问题追溯能力
 */
const { getDb } = require('../db');
const { paginate } = require('./paginationHelper');
const fs = require('fs');
const path = require('path');
const AppError = require('../utils/AppError');

// 系统日志文件存储目录
const LOG_DIR = path.join(__dirname, '../../logs');

/**
 * 记录用户操作日志
 * 将用户行为写入 user_logs 表，包含操作类型、目标、详情、IP、User-Agent
 * @param {number} userId - 用户 ID
 * @param {string} action - 操作类型（如 login/checkin/lottery）
 * @param {string|null} targetType - 操作目标类型（如 task/prize）
 * @param {number|null} targetId - 操作目标 ID
 * @param {Object|null} detail - 操作详情对象
 * @param {Object|null} req - Express 请求对象（用于提取 IP 和 User-Agent）
 */
function logUserAction(userId, action, targetType, targetId, detail, req) {
  const db = getDb();
  // 提取请求上下文信息用于审计
  const ip = req ? (req.ip || req.connection?.remoteAddress || '') : '';
  // 截断 User-Agent 至 500 字符，防止过长占用存储
  const userAgent = req ? (req.headers?.['user-agent'] || '').substring(0, 500) : '';
  // 脱敏处理详情中的敏感字段（密码、Token 等）
  const safeDetail = sanitizeLogDetail(detail);
  db.prepare(
    'INSERT INTO user_logs (user_id, action, target_type, target_id, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, action, targetType || null, targetId || null, safeDetail ? JSON.stringify(safeDetail) : null, ip, userAgent);
}

/**
 * 记录管理员操作日志
 * 将所有管理员操作写入 admin_logs 表，用于审计和问题追溯
 * @param {number} adminId - 管理员 ID
 * @param {string} action - 操作类型（如 makeup_checkin/adjust_points/prize_create）
 * @param {string|null} targetType - 操作目标类型
 * @param {number|null} targetId - 操作目标 ID
 * @param {Object|null} detail - 操作详情对象
 * @param {Object|null} req - Express 请求对象（用于提取 IP）
 */
function logAdminAction(adminId, action, targetType, targetId, detail, req) {
  const db = getDb();
  const ip = req ? (req.ip || req.connection?.remoteAddress || '') : '';
  // 脱敏处理防止敏感信息泄露到日志
  const safeDetail = sanitizeLogDetail(detail);
  db.prepare(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(adminId, action, targetType || null, targetId || null, safeDetail ? JSON.stringify(safeDetail) : null, ip);
}

/**
 * 日志详情脱敏处理
 * 识别并替换敏感字段（password/token/secret/key/auth），防止敏感信息被记录到日志
 * 采用浅拷贝方式处理，不修改原始对象
 * @param {Object|null} detail - 原始详情对象
 * @returns {Object|null} 脱敏后的详情对象
 */
function sanitizeLogDetail(detail) {
  if (!detail || typeof detail !== 'object') return detail;
  // 定义敏感字段关键词，匹配包含这些词的任意字段名
  const sensitive = ['password', 'token', 'secret', 'key', 'auth'];
  const result = { ...detail };
  for (const key of Object.keys(result)) {
    // 不区分大小写匹配敏感字段
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      result[key] = '***';
    }
  }
  return result;
}

/**
 * 查询用户操作日志（分页，多条件筛选）
 * 支持按用户ID、操作类型、日期范围、关键词组合查询
 * @param {Object} options - 查询参数
 * @param {number} options.userId - 用户 ID 筛选（可选）
 * @param {string} options.action - 操作类型筛选（可选）
 * @param {string} options.startDate - 开始日期（可选，YYYY-MM-DD）
 * @param {string} options.endDate - 结束日期（可选，YYYY-MM-DD，自动补 23:59:59 以包含整天）
 * @param {string} options.keyword - 详情关键词搜索（可选，LIKE 模糊匹配）
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页条数
 * @returns {Object} 分页结果 { records, total, page, pageSize, totalPages }
 */
function getUserLogs({ userId, action, startDate, endDate, keyword, page = 1, pageSize = 20 }) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (userId) { conditions.push('user_id = ?'); params.push(userId); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (startDate) { conditions.push('created_at >= ?'); params.push(startDate); }
  // 结束日期追加时间后缀，确保包含当天全天数据
  if (endDate) { conditions.push('created_at <= ?'); params.push(endDate + ' 23:59:59'); }
  if (keyword) { conditions.push('detail LIKE ?'); params.push(`%${keyword}%`); }

  const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  return paginate(db, {
    countSql: `user_logs WHERE ${where}`,
    dataSql: `SELECT id, user_id, action, target_type, target_id, detail, ip, user_agent, created_at
     FROM user_logs WHERE ${where}
     ORDER BY created_at DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, userId: row.user_id, action: row.action,
      targetType: row.target_type, targetId: row.target_id,
      detail: row.detail, ip: row.ip, userAgent: row.user_agent, createdAt: row.created_at,
    }),
  });
}

/**
 * 查询管理员操作日志（分页，多条件筛选）
 * 关联用户表获取管理员名称，支持按管理员ID、操作类型、目标类型、日期范围、关键词查询
 * @param {Object} options - 查询参数
 * @param {number} options.adminId - 管理员 ID 筛选（可选）
 * @param {string} options.action - 操作类型筛选（可选）
 * @param {string} options.targetType - 目标类型筛选（可选）
 * @param {string} options.startDate - 开始日期（可选，YYYY-MM-DD）
 * @param {string} options.endDate - 结束日期（可选，YYYY-MM-DD）
 * @param {string} options.keyword - 详情关键词搜索（可选）
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页条数
 * @returns {Object} 分页结果 { records, total, page, pageSize, totalPages }
 */
function getAdminLogs({ adminId, action, targetType, startDate, endDate, keyword, page = 1, pageSize = 20 }) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (adminId) { conditions.push('al.admin_id = ?'); params.push(adminId); }
  if (action) { conditions.push('al.action = ?'); params.push(action); }
  if (targetType) { conditions.push('al.target_type = ?'); params.push(targetType); }
  if (startDate) { conditions.push('al.created_at >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('al.created_at <= ?'); params.push(endDate + ' 23:59:59'); }
  if (keyword) { conditions.push('al.detail LIKE ?'); params.push(`%${keyword}%`); }

  const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  // LEFT JOIN users 获取管理员名称，即使管理员被删除日志仍可展示
  return paginate(db, {
    countSql: `admin_logs al WHERE ${where}`,
    dataSql: `SELECT al.id, al.admin_id, u.username as admin_name, al.action, al.target_type, al.target_id, al.detail, al.ip, al.created_at
     FROM admin_logs al
     LEFT JOIN users u ON al.admin_id = u.id
     WHERE ${where}
     ORDER BY al.created_at DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, adminId: row.admin_id, adminName: row.admin_name,
      action: row.action, targetType: row.target_type, targetId: row.target_id,
      detail: row.detail, ip: row.ip, createdAt: row.created_at,
    }),
  });
}

/**
 * 解析日志文件（逐行 JSON 解析）
 * 从文件末尾向前读取，获取最近的日志记录
 * 支持按日志级别、日期范围、分页筛选
 * @param {string} filePath - 日志文件绝对路径
 * @param {Object} options - 筛选参数
 * @param {string} options.level - 日志级别筛选（可选，如 error/warn/info）
 * @param {string} options.startDate - 开始日期（可选）
 * @param {string} options.endDate - 结束日期（可选）
 * @param {number} options.limit - 返回条数上限，默认 100
 * @param {number} options.offset - 偏移量，用于分页
 * @returns {Array} 匹配的日志记录数组
 */
function parseLogFile(filePath, { level, startDate, endDate, limit = 100, offset = 0 }) {
  const results = [];
  if (!fs.existsSync(filePath)) return results;

  // 同步读取整个文件（日志文件通常不大，一次性读取效率更高）
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  // 从文件末尾向前遍历，优先获取最新日志
  for (let i = lines.length - 1; i >= 0; i--) {
    // 达到所需数量后提前退出，避免不必要的解析
    if (results.length >= limit + offset) break;
    try {
      const log = JSON.parse(lines[i]);

      if (level && log.level !== level) continue;
      if (startDate) {
        const logDate = new Date(log.timestamp);
        if (logDate < new Date(startDate)) continue;
      }
      if (endDate) {
        const logDate = new Date(log.timestamp);
        if (logDate > new Date(endDate + 'T23:59:59')) continue;
      }

      results.push(log);
    } catch (e) {
      // 跳过无法解析的行（可能是非 JSON 格式的日志行）
      continue;
    }
  }

  return results;
}

/**
 * 获取系统运行日志
 * 从 combined.log 文件中读取，支持按级别、日期范围、分页查询
 * @param {Object} options - 查询参数
 * @param {string} options.level - 日志级别筛选（可选，如 error/warn/info）
 * @param {string} options.startDate - 开始日期（可选）
 * @param {string} options.endDate - 结束日期（可选）
 * @param {number} options.limit - 返回条数上限，默认 100
 * @param {number} options.offset - 偏移量，默认 0
 * @returns {Object} { records, total, limit, offset }
 */
function getSystemLogs({ level, startDate, endDate, page = 1, pageSize = 20 }) {
  const filePath = path.join(LOG_DIR, 'combined.log');
  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  const records = parseLogFile(filePath, { level, startDate, endDate, limit, offset });
  const total = parseLogFile(filePath, { level, startDate, endDate, limit: Infinity, offset: 0 }).length;
  return {
    records: records.map(r => ({
      timestamp: r.timestamp,
      level: r.level,
      message: r.message,
      service: r.service,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取错误日志
 * 从 error.log 文件中读取，仅返回 level 为 error 的记录，包含堆栈信息
 * @param {Object} options - 查询参数
 * @param {string} options.startDate - 开始日期（可选）
 * @param {string} options.endDate - 结束日期（可选）
 * @param {number} options.limit - 返回条数上限，默认 100
 * @param {number} options.offset - 偏移量，默认 0
 * @returns {Object} { records, total, limit, offset }
 */
function getErrorLogs({ startDate, endDate, page = 1, pageSize = 20 }) {
  const filePath = path.join(LOG_DIR, 'error.log');
  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  const records = parseLogFile(filePath, { level: 'error', startDate, endDate, limit, offset });
  const total = parseLogFile(filePath, { level: 'error', startDate, endDate, limit: Infinity, offset: 0 }).length;
  return {
    records: records.map(r => ({
      timestamp: r.timestamp,
      level: r.level,
      message: r.message,
      stack: r.stack,
      service: r.service,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 删除日志
 * 支持两种删除方式：按 ID 列表精确删除，或按日期批量删除早于指定日期的日志
 * 包含表名白名单校验，防止 SQL 注入
 * @param {Object} options - 删除参数
 * @param {string} options.type - 日志类型（'admin' 或 'user'）
 * @param {Array<number>} options.ids - 要删除的日志 ID 列表（与 beforeDate 二选一）
 * @param {string} options.beforeDate - 删除此日期之前的所有日志（与 ids 二选一）
 * @returns {Object} { deleted: number } 或 { deletedBefore: string }
 */
function deleteLogs({ type, ids, beforeDate }) {
  const db = getDb();
  // 白名单校验：仅允许操作已知的日志表，防止表名注入攻击
  const ALLOWED_TABLES = ['admin_logs', 'user_logs'];

  // 按 ID 列表删除：精确删除指定日志记录
  if (ids && Array.isArray(ids) && ids.length > 0) {
    const table = (type === 'admin') ? 'admin_logs' : 'user_logs';
    if (!ALLOWED_TABLES.includes(table)) {
      throw new AppError('无效的日志类型');
    }
    // 过滤非法 ID 值（非正整数），防止 SQL 注入
    const safeIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (safeIds.length === 0) {
      throw new AppError('无效的ID列表');
    }
    const placeholders = safeIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM ${table} WHERE id IN (${placeholders})`).run(...safeIds);
    return { deleted: safeIds.length };
  }

  // 按日期批量清理：删除指定日期之前的所有日志（用于定期清理）
  if (beforeDate) {
    db.prepare('DELETE FROM admin_logs WHERE created_at < ?').run(beforeDate);
    db.prepare('DELETE FROM user_logs WHERE created_at < ?').run(beforeDate);
    return { deletedBefore: beforeDate };
  }

  throw new AppError('必须提供 ids 或 beforeDate 参数');
}

module.exports = {
  logUserAction, logAdminAction, sanitizeLogDetail,
  getUserLogs, getAdminLogs, getSystemLogs, getErrorLogs, deleteLogs,
};