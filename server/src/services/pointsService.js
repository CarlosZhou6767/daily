/**
 * 积分服务 - 余额查询、流水查询、积分增减
 * 提供积分操作的基础能力，供其他服务调用
 * 使用乐观锁机制防止并发扣减导致负数积分
 */
const { getDb, runInTransaction } = require('../db');

/**
 * 获取用户积分余额
 * @param {number} userId - 用户 ID
 * @returns {Object} 包含 balance 字段的对象
 */
function getBalance(userId) {
  const db = getDb();
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  return { balance: user.points };
}

/**
 * 获取积分流水记录（分页）
 * @param {number} userId - 用户 ID
 * @param {string} type - 积分类型筛选（空字符串表示全部）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果
 */
function getPointsLog(userId, type, page = 1, pageSize = 20) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  let typeFilter = '';
  const params = [userId];

  if (type) {
    typeFilter = ' AND type = ?';
    params.push(type);
  }

  const total = db.prepare(
    `SELECT COUNT(*) as total FROM points_log WHERE user_id = ?${typeFilter}`
  ).get(params).total;

  const records = db.prepare(
    `SELECT id, type, amount, description, related_id, created_at
     FROM points_log
     WHERE user_id = ?${typeFilter}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset).map((row) => ({
    id: row.id, type: row.type, amount: row.amount, description: row.description,
    relatedId: row.related_id, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * 增加积分
 * @param {number} userId - 用户 ID
 * @param {string} type - 积分类型
 * @param {number} amount - 积分数量（正数）
 * @param {string} description - 描述
 * @param {number} relatedId - 关联 ID（可选）
 */
function addPoints(userId, type, amount, description, relatedId = null) {
  const db = getDb();
  db.prepare(
    'INSERT INTO points_log (user_id, type, amount, description, related_id) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, type, amount, description, relatedId);
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(amount, userId);
}

/**
 * 扣减积分
 * 使用乐观锁机制：UPDATE 时检查余额是否充足，防止并发导致负数积分
 * @param {number} userId - 用户 ID
 * @param {number} amount - 扣减数量（正数）
 * @param {string} type - 积分类型
 * @param {string} description - 描述
 * @throws {Error} 积分不足时抛出错误
 */
function deductPoints(userId, amount, type, description) {
  return runInTransaction(() => {
    const db = getDb();

    // 先查询用户是否存在
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.points < amount) {
      throw new Error('积分不足');
    }

    // 使用条件更新实现乐观锁，确保余额充足时才扣减
    const updateResult = db.prepare(
      'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
    ).run(amount, userId, amount);

    // 如果更新失败（changes === 0），说明并发情况下余额已被其他事务扣减
    if (updateResult.changes === 0) {
      throw new Error('积分扣减失败，请重试');
    }

    // 记录积分流水
    db.prepare(
      'INSERT INTO points_log (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, type, -amount, description);

    return { success: true, deducted: amount, remaining: user.points - amount };
  });
}

module.exports = { getBalance, getPointsLog, addPoints, deductPoints };
