/**
 * 抽奖服务 - 奖品查询、抽奖逻辑、中奖记录
 * 抽奖算法：按概率加权随机选择，库存不足时自动降级
 * 使用数据库事务确保并发安全
 */
const { getDb, runInTransaction } = require('../db');
const config = require('../config');

/**
 * 获取所有活跃奖品列表
 * @returns {Array} 奖品列表
 */
function getPrizes() {
  const db = getDb();
  return db.prepare(
    'SELECT id, name, description, image, probability, prize_type, points_reward, stock, status FROM prizes WHERE status = ? ORDER BY id'
  ).all('active').map((row) => ({
    id: row.id, name: row.name, description: row.description, image: row.image,
    probability: row.probability, prizeType: row.prize_type, pointsReward: row.points_reward,
    stock: row.stock, status: row.status,
  }));
}

/**
 * 执行抽奖
 * 1. 检查积分余额
 * 2. 按概率加权随机选择奖品
 * 3. 在事务中原子性扣除积分、扣减库存、记录中奖、发放奖品积分
 * 使用数据库行锁防止并发超卖
 * @param {number} userId - 用户 ID
 * @returns {Object} 中奖结果（prizeId, prizeName, prizeType, pointsReward）
 */
function draw(userId) {
  const db = getDb();

  return runInTransaction(() => {
    // 在事务中查询用户积分，使用行锁防止并发修改
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.points < config.pointsRules.lotteryCost) {
      throw new Error(`积分不足，需要${config.pointsRules.lotteryCost}积分`);
    }

    // 在事务中查询奖品列表，确保库存数据一致性
    const prizes = db.prepare(
      'SELECT id, name, probability, prize_type, points_reward, stock FROM prizes WHERE status = ?'
    ).all('active');

    if (prizes.length === 0) {
      throw new Error('暂无可用奖品');
    }

    // 按概率加权随机选择奖品
    // 算法步骤：
    // 1. 计算所有奖品概率之和
    // 2. 生成 [0, totalProb) 范围内的随机数
    // 3. 依次减去每个奖品的概率，直到随机数 <= 0
    // 4. 选中的奖品即为中奖结果
    const totalProb = prizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalProb;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      random -= prize.probability;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // 检查库存，库存不足时自动降级到无限库存奖品
    if (selectedPrize.stock !== -1 && selectedPrize.stock <= 0) {
      const fallbackPrize = prizes.find((p) => p.stock === -1 || p.stock > 0);
      if (fallbackPrize) {
        selectedPrize = fallbackPrize;
      } else {
        throw new Error('所有奖品库存不足');
      }
    }

    // 原子性扣除积分
    const pointsResult = db.prepare(
      'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
    ).run(config.pointsRules.lotteryCost, userId, config.pointsRules.lotteryCost);

    if (pointsResult.changes === 0) {
      throw new Error('积分扣减失败，请重试');
    }

    // 记录积分消耗流水
    db.prepare(
      'INSERT INTO points_log (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, 'lottery', -config.pointsRules.lotteryCost, '抽奖消耗');

    // 扣减奖品库存（有限库存）
    if (selectedPrize.stock !== -1) {
      const stockResult = db.prepare(
        'UPDATE prizes SET stock = stock - 1 WHERE id = ? AND stock > 0'
      ).run(selectedPrize.id);

      if (stockResult.changes === 0) {
        throw new Error('奖品库存不足');
      }
    }

    // 记录抽奖结果
    db.prepare(
      'INSERT INTO lottery_records (user_id, prize_id, points_cost) VALUES (?, ?, ?)'
    ).run(userId, selectedPrize.id, config.pointsRules.lotteryCost);

    // 发放奖品积分（如有）
    if (selectedPrize.points_reward > 0) {
      db.prepare(
        'INSERT INTO points_log (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
      ).run(userId, 'lottery_reward', selectedPrize.points_reward, `抽奖获得: ${selectedPrize.name}`);
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(selectedPrize.points_reward, userId);
    }

    return {
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      prizeType: selectedPrize.prize_type,
      pointsReward: selectedPrize.points_reward,
    };
  });
}

/**
 * 获取用户抽奖记录（分页）
 * @param {number} userId - 用户 ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果
 */
function getLotteryRecords(userId, page = 1, pageSize = 20) {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const total = db.prepare(
    'SELECT COUNT(*) as total FROM lottery_records WHERE user_id = ?'
  ).get(userId).total;

  const records = db.prepare(
    `SELECT lr.id, lr.prize_id, p.name as prize_name, p.prize_type, p.points_reward, lr.points_cost, lr.is_received, lr.created_at
     FROM lottery_records lr
     LEFT JOIN prizes p ON lr.prize_id = p.id
     WHERE lr.user_id = ?
     ORDER BY lr.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(userId, pageSize, offset).map((row) => ({
    id: row.id, prizeId: row.prize_id, prizeName: row.prize_name, prizeType: row.prize_type,
    pointsReward: row.points_reward, pointsCost: row.points_cost, isReceived: row.is_received, createdAt: row.created_at,
  }));

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

module.exports = { getPrizes, draw, getLotteryRecords };
