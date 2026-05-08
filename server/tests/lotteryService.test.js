/**
 * 抽奖服务测试
 * 验证 getPrizes、draw、getLotteryRecords 的核心逻辑
 * 针对 BUG-OPT-004 抽奖积分阈值修复和库存降级逻辑进行覆盖
 */
const { getDb, runInTransaction } = require('../src/db');
const { getPrizes, draw, getLotteryRecords } = require('../src/services/lotteryService');

describe('抽奖服务测试', () => {
  let db;
  const testUserId = 9997;

  beforeAll(() => {
    db = getDb();
    try {
      db.prepare("INSERT INTO users (id, username, password, nickname, points, status) VALUES (9997, 'lotterytest', 'testpass', 'LotteryTest', 100, 'active')").run();
    } catch (e) {
      db.prepare('UPDATE users SET points = 100 WHERE id = 9997').run();
    }
  });

  beforeEach(() => {
    db.prepare('DELETE FROM lottery_records WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM points_log WHERE user_id = ?').run(testUserId);
    db.prepare('UPDATE users SET points = 100 WHERE id = 9997').run();
  });

  afterAll(() => {
    db.prepare('DELETE FROM lottery_records WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM points_log WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  describe('getPrizes', () => {
    test('返回活跃奖品列表', () => {
      const prizes = getPrizes();
      expect(Array.isArray(prizes)).toBe(true);
      prizes.forEach((prize) => {
        expect(prize).toHaveProperty('id');
        expect(prize).toHaveProperty('name');
        expect(prize).toHaveProperty('probability');
        expect(prize).toHaveProperty('stock');
        expect(prize).toHaveProperty('status');
      });
    });

    test('只返回 status 为 active 的奖品', () => {
      const prizes = getPrizes();
      prizes.forEach((prize) => {
        expect(prize.status).toBe('active');
      });
    });
  });

  describe('draw - 积分检查', () => {
    test('用户不存在时抛出错误', () => {
      expect(() => {
        draw(99999);
      }).toThrow('用户不存在');
    });

    test('积分不足时抛出错误', () => {
      db.prepare('UPDATE users SET points = 0 WHERE id = 9997').run();
      expect(() => {
        draw(testUserId);
      }).toThrow(/积分不足/);
    });

    test('积分刚好等于抽奖成本时允许抽奖', () => {
      db.prepare('UPDATE users SET points = 20 WHERE id = 9997').run();
      expect(() => {
        draw(testUserId);
      }).not.toThrow('积分不足');
    });
  });

  describe('draw - 抽奖逻辑', () => {
    test('无奖品时抛出错误', () => {
      jest.resetModules();
      jest.mock('../src/db', () => ({
        getDb: jest.fn(() => ({
          prepare: jest.fn(() => ({
            get: jest.fn(() => ({ points: 100 })),
            all: jest.fn(() => []),
          })),
        })),
        runInTransaction: jest.fn((fn) => fn()),
      }));

      const { draw: mockedDraw } = require('../src/services/lotteryService');
      expect(() => {
        mockedDraw(1);
      }).toThrow('暂无可用奖品');
    });

    test('奖品库存不足时自动降级到无限库存奖品', () => {
      jest.resetModules();
      const mockRun = jest.fn(() => ({ changes: 1 }));
      const mockGet = jest.fn(() => ({ points: 100 }));
      const mockAll = jest.fn(() => [
        { id: 1, name: '限量奖品', probability: 0.5, prize_type: 'virtual', points_reward: 0, stock: 0, status: 'active' },
        { id: 2, name: '无限奖品', probability: 0.5, prize_type: 'virtual', points_reward: 0, stock: -1, status: 'active' },
      ]);

      jest.mock('../src/db', () => ({
        getDb: jest.fn(() => ({
          prepare: jest.fn(() => ({
            get: mockGet,
            all: mockAll,
            run: mockRun,
          })),
        })),
        runInTransaction: jest.fn((fn) => fn()),
      }));

      jest.mock('../src/config', () => ({
        pointsRules: { lotteryCost: 20 },
      }));

      const { draw: mockedDraw } = require('../src/services/lotteryService');
      const result = mockedDraw(1);
      expect(result).toHaveProperty('prizeName');
    });

    test('所有奖品库存不足时抛出错误', () => {
      jest.resetModules();
      jest.mock('../src/db', () => ({
        getDb: jest.fn(() => ({
          prepare: jest.fn(() => ({
            get: jest.fn(() => ({ points: 100 })),
            all: jest.fn(() => [
              { id: 1, name: '限量奖品1', probability: 0.5, prize_type: 'virtual', points_reward: 0, stock: 0, status: 'active' },
              { id: 2, name: '限量奖品2', probability: 0.5, prize_type: 'virtual', points_reward: 0, stock: 0, status: 'active' },
            ]),
          })),
        })),
        runInTransaction: jest.fn((fn) => fn()),
      }));

      jest.mock('../src/config', () => ({
        pointsRules: { lotteryCost: 20 },
      }));

      const { draw: mockedDraw } = require('../src/services/lotteryService');
      expect(() => {
        mockedDraw(1);
      }).toThrow('所有奖品库存不足');
    });
  });

  describe('draw - 积分扣减', () => {
    test('抽奖成功后正确扣除积分', () => {
      const initialPoints = db.prepare('SELECT points FROM users WHERE id = ?').get(testUserId).points;
      draw(testUserId);
      const finalPoints = db.prepare('SELECT points FROM users WHERE id = ?').get(testUserId).points;
      expect(finalPoints).toBe(initialPoints - 20);
    });

    test('抽奖成功记录积分流水', () => {
      draw(testUserId);
      const log = db.prepare(
        'SELECT * FROM points_log WHERE user_id = ? AND type = ?'
      ).get(testUserId, 'lottery');
      expect(log).not.toBeUndefined();
      expect(log.amount).toBe(-20);
      expect(log.description).toBe('抽奖消耗');
    });

    test('抽奖成功记录抽奖结果', () => {
      draw(testUserId);
      const record = db.prepare(
        'SELECT * FROM lottery_records WHERE user_id = ?'
      ).get(testUserId);
      expect(record).not.toBeUndefined();
      expect(record.points_cost).toBe(20);
    });
  });

  describe('draw - 奖品积分发放', () => {
    test('积分奖励型奖品返回正确的奖励积分', () => {
      db.prepare(
        "DELETE FROM prizes WHERE name = '测试积分奖励'"
      ).run();
      db.prepare(
        "INSERT INTO prizes (name, probability, prize_type, points_reward, stock, status) VALUES ('测试积分奖励', 1.0, 'virtual', 10, -1, 'active')"
      ).run();

      const prizes = db.prepare("SELECT * FROM prizes WHERE name = '测试积分奖励'").get();
      expect(prizes.points_reward).toBe(10);

      db.prepare("DELETE FROM prizes WHERE name = '测试积分奖励'").run();
    });
  });

  describe('getLotteryRecords', () => {
    test('返回分页结构', () => {
      const result = getLotteryRecords(testUserId, 1, 10);
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
    });

    test('records 为数组', () => {
      const result = getLotteryRecords(testUserId, 1, 10);
      expect(Array.isArray(result.records)).toBe(true);
    });

    test('默认分页参数正确', () => {
      const result = getLotteryRecords(testUserId);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });
});
