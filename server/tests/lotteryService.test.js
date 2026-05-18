/**
 * 抽奖服务测试
 * 覆盖：奖品查询、缓存失效机制、抽奖核心逻辑、库存降级、积分扣减验证
 * 使用 mock 数据库避免依赖 native modules
 */
const config = require('../src/config');

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('抽奖服务测试', () => {
  let mockDb;

  beforeEach(() => {
    jest.resetModules();

    mockDb = {
      prepare: jest.fn(() => ({
        all: jest.fn(() => [
          { id: 1, name: '积分x5', description: '获得5积分', image: null, probability: 0.3, prize_type: 'virtual', points_reward: 5, stock: -1, status: 'active' },
          { id: 2, name: '积分x20', description: '获得20积分', image: null, probability: 0.1, prize_type: 'virtual', points_reward: 20, stock: 100, status: 'active' },
        ]),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1 })),
      })),
      transaction: jest.fn((fn) => fn),
    };

    jest.mock('../src/db', () => ({
      getDb: jest.fn(() => mockDb),
      runInTransaction: jest.fn((fn) => fn()),
    }));
  });

  describe('getPrizes 奖品查询', () => {
    test('返回活跃状态的奖品列表并正确映射字段', () => {
      const { getPrizes } = require('../src/services/lotteryService');
      const prizes = getPrizes();
      expect(Array.isArray(prizes)).toBe(true);
      expect(prizes.length).toBe(2);
      expect(prizes[0]).toHaveProperty('prizeType');
      expect(prizes[0]).toHaveProperty('pointsReward');
      expect(prizes[0]).toHaveProperty('stock');
    });
  });

  describe('draw 抽奖核心逻辑', () => {
    test('用户不存在时抛出错误', () => {
      mockDb.prepare.mockImplementation((sql) => ({
        all: jest.fn(() => []),
        get: jest.fn(() => null),
        run: jest.fn(() => ({ changes: 0 })),
      }));

      const { draw } = require('../src/services/lotteryService');
      expect(() => draw(99999)).toThrow('用户不存在');
    });

    test('积分不足时抛出错误', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points FROM users')) {
          return { get: jest.fn(() => ({ points: 5 })) };
        }
        return { all: jest.fn(() => []), get: jest.fn(), run: jest.fn() };
      });

      const { draw } = require('../src/services/lotteryService');
      expect(() => draw(1)).toThrow('积分不足');
    });

    test('无可用奖品时抛出错误', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points FROM users')) {
          return { get: jest.fn(() => ({ points: 1000 })) };
        }
        if (sql.includes('FROM prizes')) {
          return { all: jest.fn(() => []) };
        }
        return { get: jest.fn(), run: jest.fn(() => ({ changes: 1 })) };
      });

      const { draw } = require('../src/services/lotteryService');
      expect(() => draw(1)).toThrow('暂无可用奖品');
    });

    test('积分扣减失败时抛出错误（乐观锁冲突）', () => {
      let callCount = 0;
      mockDb.prepare.mockImplementation((sql) => {
        callCount++;
        if (sql.includes('SELECT points FROM users')) {
          return { get: jest.fn(() => ({ points: 1000 })) };
        }
        if (sql.includes('FROM prizes')) {
          return { all: jest.fn(() => [
            { id: 1, name: '积分x5', probability: 1.0, prize_type: 'virtual', points_reward: 5, stock: -1, status: 'active' },
          ]) };
        }
        if (sql.includes('UPDATE users SET points = points -')) {
          return { run: jest.fn(() => ({ changes: 0 })) };
        }
        return { get: jest.fn(), run: jest.fn(() => ({ changes: 1 })) };
      });

      const { draw } = require('../src/services/lotteryService');
      expect(() => draw(1)).toThrow('积分扣减失败，请重试');
    });

    test('奖品库存不足时自动降级', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points FROM users')) {
          return { get: jest.fn(() => ({ points: 1000 })) };
        }
        if (sql.includes('FROM prizes')) {
          return { all: jest.fn(() => [
            { id: 1, name: '稀有奖品', probability: 0.01, prize_type: 'virtual', points_reward: 100, stock: 0, status: 'active' },
            { id: 2, name: '普通奖品', probability: 0.99, prize_type: 'virtual', points_reward: 5, stock: -1, status: 'active' },
          ]) };
        }
        if (sql.includes('UPDATE prizes SET stock')) {
          return { run: jest.fn(() => ({ changes: 1 })) };
        }
        return { get: jest.fn(), run: jest.fn(() => ({ changes: 1 })) };
      });

      jest.spyOn(Math, 'random').mockReturnValue(0.001);
      const { draw } = require('../src/services/lotteryService');
      const result = draw(1);
      expect(result).toHaveProperty('prizeId', 2);
      Math.random.mockRestore();
    });

    test('所有奖品库存不足时抛出错误', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points FROM users')) {
          return { get: jest.fn(() => ({ points: 1000 })) };
        }
        if (sql.includes('FROM prizes')) {
          return { all: jest.fn(() => [
            { id: 1, name: '奖品A', probability: 0.5, prize_type: 'virtual', points_reward: 10, stock: 0, status: 'active' },
            { id: 2, name: '奖品B', probability: 0.5, prize_type: 'virtual', points_reward: 20, stock: 0, status: 'active' },
          ]) };
        }
        return { get: jest.fn(), run: jest.fn(() => ({ changes: 1 })) };
      });

      const { draw } = require('../src/services/lotteryService');
      expect(() => draw(1)).toThrow('所有奖品库存不足');
    });

    test('正常抽奖返回完整中奖结果', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points FROM users')) {
          return { get: jest.fn(() => ({ points: 1000 })) };
        }
        if (sql.includes('FROM prizes')) {
          return { all: jest.fn(() => [
            { id: 1, name: '积分x5', probability: 1.0, prize_type: 'virtual', points_reward: 5, stock: -1, status: 'active' },
          ]) };
        }
        return { get: jest.fn(), run: jest.fn(() => ({ changes: 1 })) };
      });

      const { draw } = require('../src/services/lotteryService');
      const result = draw(1);
      expect(result).toHaveProperty('prizeId', 1);
      expect(result).toHaveProperty('prizeName', '积分x5');
      expect(result).toHaveProperty('prizeType');
      expect(result).toHaveProperty('pointsReward', 5);
    });
  });

  describe('getLotteryRecords 抽奖记录查询', () => {
    test('返回标准分页结构', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('COUNT')) {
          return { get: jest.fn(() => ({ total: 0 })) };
        }
        return { all: jest.fn(() => []) };
      });

      const { getLotteryRecords } = require('../src/services/lotteryService');
      const result = getLotteryRecords(1, 1, 10);
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 10);
    });
  });

  describe('invalidatePrizeCache 缓存失效', () => {
    test('缓存失效函数可正常调用', () => {
      const { invalidatePrizeCache } = require('../src/services/lotteryService');
      expect(() => invalidatePrizeCache()).not.toThrow();
    });
  });
});
