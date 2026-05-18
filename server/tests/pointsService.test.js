/**
 * 积分服务测试
 * 覆盖：余额查询、积分增减、乐观锁扣减、已消耗积分计算、边界条件
 * 使用 mock 数据库避免依赖 native modules
 */
describe('积分服务测试', () => {
  let mockDb;

  beforeEach(() => {
    jest.resetModules();

    mockDb = {
      prepare: jest.fn(() => ({
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1 })),
        all: jest.fn(() => []),
      })),
      transaction: jest.fn((fn) => fn),
    };

    jest.mock('../src/db', () => ({
      getDb: jest.fn(() => mockDb),
      runInTransaction: jest.fn((fn) => fn()),
    }));
  });

  describe('getBalance 余额查询', () => {
    test('返回用户积分余额', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ points: 500 })),
      }));

      const { getBalance } = require('../src/services/pointsService');
      const result = getBalance(1);
      expect(result).toEqual({ balance: 500 });
    });

    test('用户不存在时抛出错误', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => null),
      }));

      const { getBalance } = require('../src/services/pointsService');
      expect(() => getBalance(99999)).toThrow('用户不存在');
    });
  });

  describe('addPoints 增加积分', () => {
    test('调用数据库写入积分流水并更新余额', () => {
      const mockRun = jest.fn(() => ({ changes: 1 }));
      mockDb.prepare.mockImplementation(() => ({ run: mockRun }));

      const { addPoints } = require('../src/services/pointsService');
      addPoints(1, 'checkin', 5, '打卡奖励', 123);

      expect(mockRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('deductPoints 扣减积分（乐观锁）', () => {
    test('正常扣减积分返回成功', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points')) {
          return { get: jest.fn(() => ({ points: 100 })) };
        }
        return { run: jest.fn(() => ({ changes: 1 })) };
      });

      const { deductPoints } = require('../src/services/pointsService');
      const result = deductPoints(1, 50, 'lottery', '抽奖消耗');
      expect(result.success).toBe(true);
      expect(result.deducted).toBe(50);
      expect(result.remaining).toBe(50);
    });

    test('积分不足时抛出错误', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points')) {
          return { get: jest.fn(() => ({ points: 10 })) };
        }
        return { run: jest.fn(() => ({ changes: 0 })) };
      });

      const { deductPoints } = require('../src/services/pointsService');
      expect(() => deductPoints(1, 50, 'lottery', '超额扣减')).toThrow('积分不足');
    });

    test('用户不存在时抛出错误', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => null),
        run: jest.fn(),
      }));

      const { deductPoints } = require('../src/services/pointsService');
      expect(() => deductPoints(99999, 10, 'test', '测试')).toThrow('用户不存在');
    });

    test('乐观锁冲突时抛出错误（changes === 0）', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points')) {
          return { get: jest.fn(() => ({ points: 100 })) };
        }
        if (sql.includes('UPDATE users SET points = points -')) {
          return { run: jest.fn(() => ({ changes: 0 })) };
        }
        return { run: jest.fn(() => ({ changes: 1 })) };
      });

      const { deductPoints } = require('../src/services/pointsService');
      expect(() => deductPoints(1, 50, 'test', '并发扣减')).toThrow('积分扣减失败，请重试');
    });

    test('扣减后流水金额为负数', () => {
      const mockRun = jest.fn(() => ({ changes: 1 }));
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT points')) {
          return { get: jest.fn(() => ({ points: 100 })) };
        }
        return { run: mockRun };
      });

      const { deductPoints } = require('../src/services/pointsService');
      deductPoints(1, 30, 'test_deduct', '测试负数流水');

      const logCall = mockRun.mock.calls.find(call =>
        call[0] === 1 && call[2] === -30
      );
      expect(logCall).toBeTruthy();
    });
  });

  describe('getConsumedPoints 已消耗积分计算', () => {
    test('无消耗记录时返回 0', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ total: 0 })),
      }));

      const { getConsumedPoints } = require('../src/services/pointsService');
      const result = getConsumedPoints(1);
      expect(result).toBe(0);
    });

    test('正确汇总负数积分流水', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ total: 50 })),
      }));

      const { getConsumedPoints } = require('../src/services/pointsService');
      const result = getConsumedPoints(1);
      expect(result).toBe(50);
    });
  });

  describe('getPointsLog 积分流水查询', () => {
    test('返回标准分页结构', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('COUNT')) {
          return { get: jest.fn(() => ({ total: 0 })) };
        }
        return { all: jest.fn(() => []) };
      });

      const { getPointsLog } = require('../src/services/pointsService');
      const result = getPointsLog(1, '', 1, 10);
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 10);
    });

    test('按类型筛选时添加 WHERE 条件', () => {
      const mockAll = jest.fn(() => []);
      const mockGet = jest.fn(() => ({ total: 0 }));
      mockDb.prepare.mockImplementation(() => ({
        get: mockGet,
        all: mockAll,
      }));

      const { getPointsLog } = require('../src/services/pointsService');
      getPointsLog(1, 'checkin', 1, 10);

      const countCall = mockGet.mock.calls[0];
      expect(countCall).toBeDefined();
    });
  });
});
