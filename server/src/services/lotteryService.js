/**
 * 抽奖服务 - 奖品查询、抽奖逻辑、中奖记录
 * 抽奖算法：按概率加权随机选择，库存不足时自动降级
 * 使用数据库事务确保并发安全
 */
const { getDb, runInTransaction } = require('../db');
const config = require('../config');
const { paginate } = require('./paginationHelper');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * 奖品内存缓存
 * 减少抽奖时的重复数据库查询，提升响应速度
 * TTL 默认 5 分钟，管理员修改奖品后通过 invalidatePrizeCache 主动失效
 */
let prizesCache = null;
let prizesCacheTime = 0;
const PRIZES_CACHE_TTL = 5 * 60 * 1000;

/**
 * 获取所有活跃奖品列表
 * 使用内存缓存减少数据库查询频次，缓存 TTL 为 5 分钟
 * @returns {Array} 奖品列表，每项包含 id, name, description, image, probability, prizeType, pointsReward, stock, status
 */
function getPrizes() {
  const now = Date.now();
  // 缓存未过期时直接返回缓存数据，避免数据库 IO
  if (prizesCache && (now - prizesCacheTime) < PRIZES_CACHE_TTL) {
    return prizesCache;
  }

  const db = getDb();
  // 仅查询状态为 active 的奖品
  prizesCache = db.prepare(
    'SELECT id, name, description, image, probability, prize_type, points_reward, stock, status FROM prizes WHERE status = ? ORDER BY id'
  ).all('active').map((row) => ({
    id: row.id, name: row.name, description: row.description, image: row.image,
    probability: row.probability, prizeType: row.prize_type, pointsReward: row.points_reward,
    stock: row.stock, status: row.status,
  }));
  prizesCacheTime = now;
  return prizesCache;
}

/**
 * 执行抽奖
 * 在事务中原子性完成以下步骤：
 * 1. 检查积分余额（行锁防并发）
 * 2. 按概率加权随机选择奖品
 * 3. 扣减积分（带条件 UPDATE 实现乐观锁）
 * 4. 扣减奖品库存
 * 5. 记录中奖结果和发放积分
 * 使用数据库行锁和条件更新防止并发超卖
 * @param {number} userId - 用户 ID
 * @returns {Object} 中奖结果 { prizeId, prizeName, prizeType, pointsReward }
 */
function draw(userId) {
  const db = getDb();

  // 使用事务确保积分扣减、库存扣减、记录写入的原子性
  return runInTransaction(() => {
    // 在事务中查询用户积分，利用 SQLite 的行级锁防止并发修改
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new AppError('用户不存在');
    }

    if (user.points < config.pointsRules.lotteryCost) {
      throw new AppError(`积分不足，需要${config.pointsRules.lotteryCost}积分`);
    }

    // 使用缓存获取奖品列表，减少事务内数据库查询，缩短事务持有时间
    const prizes = getPrizes();

    if (prizes.length === 0) {
      throw new AppError('暂无可用奖品');
    }

    // 按概率加权随机选择奖品
    // 算法步骤：
    // 1. 计算所有奖品概率之和作为总权重
    // 2. 生成 [0, totalProb) 范围内的随机数
    // 3. 依次减去每个奖品的概率（类似轮盘赌），直到随机数 <= 0
    // 4. 选中的奖品即为中奖结果
    // 此算法确保每个奖品被选中的概率与其 probability 成正比
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

    // 库存不足降级策略：选中奖品库存为0时，自动降级到无限库存的奖品
    // stock === -1 表示无限库存
    if (selectedPrize.stock !== -1 && selectedPrize.stock <= 0) {
      const fallbackPrize = prizes.find((p) => p.stock === -1 || p.stock > 0);
      if (fallbackPrize) {
        selectedPrize = fallbackPrize;
      } else {
        throw new AppError('所有奖品库存不足');
      }
    }

    // 原子性扣除积分：使用 WHERE points >= ? 条件更新，防止并发导致负积分
    const pointsResult = db.prepare(
      'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
    ).run(config.pointsRules.lotteryCost, userId, config.pointsRules.lotteryCost);

    if (pointsResult.changes === 0) {
      throw new AppError('积分扣减失败，请重试');
    }

    // 记录积分消耗流水（负数表示支出）
    db.prepare(
      'INSERT INTO points_log (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, 'lottery', -config.pointsRules.lotteryCost, '抽奖消耗');

    // 扣减奖品库存：使用 WHERE stock > 0 防止超卖
    if (selectedPrize.stock !== -1) {
      const stockResult = db.prepare(
        'UPDATE prizes SET stock = stock - 1 WHERE id = ? AND stock > 0'
      ).run(selectedPrize.id);

      if (stockResult.changes === 0) {
        throw new AppError('奖品库存不足');
      }
    }

    // 记录抽奖结果到 lottery_records 表
    db.prepare(
      'INSERT INTO lottery_records (user_id, prize_id, points_cost) VALUES (?, ?, ?)'
    ).run(userId, selectedPrize.id, config.pointsRules.lotteryCost);

    // 发放奖品积分（如奖品包含积分奖励）
    if (selectedPrize.pointsReward > 0) {
      db.prepare(
        'INSERT INTO points_log (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
      ).run(userId, 'lottery_reward', selectedPrize.pointsReward, `抽奖获得: ${selectedPrize.name}`);
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(selectedPrize.pointsReward, userId);
    }

    return {
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      prizeType: selectedPrize.prizeType,
      pointsReward: selectedPrize.pointsReward,
    };
  });
}

/**
 * 获取用户抽奖记录（分页）
 * 关联奖品表获取奖品名称和类型信息
 * @param {number} userId - 用户 ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Object} 分页结果 { records, total, page, pageSize, totalPages }
 */
function getLotteryRecords(userId, page = 1, pageSize = 20) {
  const db = getDb();

  return paginate(db, {
    countSql: 'lottery_records WHERE user_id = ?',
    dataSql: `SELECT lr.id, lr.prize_id, p.name as prize_name, p.prize_type, p.points_reward, lr.points_cost, lr.is_received, lr.created_at
     FROM lottery_records lr
     LEFT JOIN prizes p ON lr.prize_id = p.id
     WHERE lr.user_id = ?
     ORDER BY lr.created_at DESC`,
    params: [userId],
    page,
    pageSize,
    mapper: (row) => ({
      id: row.id, prizeId: row.prize_id, prizeName: row.prize_name, prizeType: row.prize_type,
      pointsReward: row.points_reward, pointsCost: row.points_cost, isReceived: row.is_received, createdAt: row.created_at,
    }),
  });
}

/**
 * 失效奖品缓存
 * 管理员修改奖品（创建/更新/删除）后调用，确保下次 getPrizes 查询强制刷新缓存
 * 通过将缓存时间和数据重置为初始值实现即时失效
 */
function invalidatePrizeCache() {
  prizesCache = null;
  prizesCacheTime = 0;
}

module.exports = { getPrizes, draw, getLotteryRecords, invalidatePrizeCache };