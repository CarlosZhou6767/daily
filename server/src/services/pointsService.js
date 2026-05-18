/**
 * 积分服务 - 余额查询、流水查询、积分增减
 * 提供积分操作的基础能力，供其他服务调用
 * 使用乐观锁机制防止并发扣减导致负数积分
 */
const { getDb, runInTransaction } = require('../db');
const { paginate } = require('./paginationHelper');
const AppError = require('../utils/AppError');

/**
 * 获取用户积分余额
 * @param {number} userId - 用户 ID
 * @returns {Object} 包含 balance 字段的对象
 */
function getBalance(userId) {
  const db = getDb();
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new AppError('用户不存在');
  }
  return { balance: user.points };
}

/**
 * 获取积分流水记录（分页）
 * 支持按积分类型筛选，按创建时间倒序排列
 * @param {number} userId - 用户 ID
 * @param {string} type - 积分类型筛选（空字符串表示全部，如 checkin/lottery/admin_adjust）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果 { records, total, page, pageSize, totalPages }
 */
function getPointsLog(userId, type, page = 1, pageSize = 20) {
  const db = getDb();

  // 动态构建筛选条件
  let where = 'user_id = ?';
  const params = [userId];

  if (type) { where += ' AND type = ?'; params.push(type); }

  return paginate(db, {
    countSql: `points_log WHERE ${where}`,
    dataSql: `SELECT id, type, amount, description, related_id, created_at
     FROM points_log
     WHERE ${where}
     ORDER BY created_at DESC`,
    params,
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, type: row.type, amount: row.amount, description: row.description,
      relatedId: row.related_id, createdAt: row.created_at,
    }),
  });
}

/**
 * 增加积分
 * 同时写入积分流水（正数）和更新用户余额
 * 注意：此函数不包含事务保护，由外部调用方自行管理事务
 * @param {number} userId - 用户 ID
 * @param {string} type - 积分类型（checkin/image/streak/lottery_reward/admin_adjust）
 * @param {number} amount - 积分数量（正数）
 * @param {string} description - 描述信息，用于追溯积分来源
 * @param {number} relatedId - 关联 ID（可选，如关联的打卡记录 ID）
 */
function addPoints(userId, type, amount, description, relatedId = null) {
  const db = getDb();
  // 先写入流水记录，再更新余额（流水是明细，余额是汇总）
  db.prepare(
    'INSERT INTO points_log (user_id, type, amount, description, related_id) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, type, amount, description, relatedId);
  // 使用原子 UPDATE 直接修改余额值，避免 SELECT + UPDATE 的并发问题
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(amount, userId);
}

/**
 * 扣减积分
 * 使用乐观锁机制：UPDATE 时检查余额是否充足（WHERE points >= ?），防止并发导致负数积分
 * 整个扣减流程在事务中执行，确保余额检查和扣减的原子性
 * 性能考量：先查询用户余额进行前置校验，避免无效 UPDATE 操作；再通过条件 UPDATE 确保最终一致性
 * @param {number} userId - 用户 ID
 * @param {number} amount - 扣减数量（正数，内部会转为负数记录流水）
 * @param {string} type - 积分类型
 * @param {string} description - 描述信息
 * @returns {Object} 操作结果 { success, deducted, remaining }
 * @throws {Error} 积分不足时抛出错误
 */
function deductPoints(userId, amount, type, description) {
  // 在事务中执行，确保 SELECT 检查和 UPDATE 扣减的原子性
  return runInTransaction(() => {
    const db = getDb();

    // 先查询用户是否存在
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new AppError('用户不存在');
    }

    if (user.points < amount) {
      throw new AppError('积分不足');
    }

    // 使用条件更新实现乐观锁：WHERE points >= ? 确保余额充足时才扣减
    // 如果并发情况下余额已被其他事务扣减，changes 将返回 0
    const updateResult = db.prepare(
      'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
    ).run(amount, userId, amount);

    // 如果更新失败（changes === 0），说明并发情况下余额已被其他事务扣减
    if (updateResult.changes === 0) {
      throw new AppError('积分扣减失败，请重试');
    }

    // 记录积分流水（金额为负数表示支出）
    db.prepare(
      'INSERT INTO points_log (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, type, -amount, description);

    return { success: true, deducted: amount, remaining: user.points - amount };
  });
}

/**
 * 获取用户已消耗积分总数
 * 通过数据库聚合查询 SUM(ABS(amount)) 计算，WHERE amount < 0 筛选支出记录
 * 性能考量：使用数据库层面的聚合而非前端全量遍历，仅返回最终汇总值
 * @param {number} userId - 用户 ID
 * @returns {number} 已消耗积分总数（正数）
 */
function getConsumedPoints(userId) {
  const db = getDb();
  // COALESCE 处理无支出记录时返回 0，而非 NULL
  const result = db.prepare(
    'SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM points_log WHERE user_id = ? AND amount < 0'
  ).get(userId);
  return result.total;
}

module.exports = { getBalance, getPointsLog, addPoints, deductPoints, getConsumedPoints };