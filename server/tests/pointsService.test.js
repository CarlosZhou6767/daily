/**
 * 积分服务测试
 * 验证 getBalance、getPointsLog、addPoints、deductPoints、getConsumedPoints
 * 针对 BUG-OPT-003 积分已消耗服务端聚合计算进行覆盖
 */
const { getDb, runInTransaction } = require('../src/db');
const { getBalance, getPointsLog, addPoints, deductPoints, getConsumedPoints } = require('../src/services/pointsService');

describe('积分服务测试', () => {
  let db;
  const testUserId = 9996;

  beforeAll(() => {
    db = getDb();
    try {
      db.prepare("INSERT INTO users (id, username, password, nickname, points, status) VALUES (9996, 'pointstest', 'testpass', 'PointsTest', 100, 'active')").run();
    } catch (e) {
      db.prepare('UPDATE users SET points = 100 WHERE id = 9996').run();
    }
  });

  beforeEach(() => {
    db.prepare('DELETE FROM points_log WHERE user_id = ?').run(testUserId);
    db.prepare('UPDATE users SET points = 100 WHERE id = 9996').run();
  });

  afterAll(() => {
    db.prepare('DELETE FROM points_log WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  describe('getBalance', () => {
    test('返回用户积分余额', () => {
      const result = getBalance(testUserId);
      expect(result).toHaveProperty('balance');
      expect(typeof result.balance).toBe('number');
    });

    test('用户不存在时抛出错误', () => {
      expect(() => {
        getBalance(99999);
      }).toThrow('用户不存在');
    });

    test('余额正确反映当前积分', () => {
      db.prepare('UPDATE users SET points = 50 WHERE id = ?').run(testUserId);
      const result = getBalance(testUserId);
      expect(result.balance).toBe(50);
    });
  });

  describe('getPointsLog', () => {
    beforeEach(() => {
      db.prepare(
        "INSERT INTO points_log (user_id, type, amount, description) VALUES (?, 'checkin', 5, '打卡获得')"
      ).run(testUserId);
      db.prepare(
        "INSERT INTO points_log (user_id, type, amount, description) VALUES (?, 'lottery', -20, '抽奖消耗')"
      ).run(testUserId);
    });

    test('返回分页结构', () => {
      const result = getPointsLog(testUserId, '');
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
    });

    test('records 为数组', () => {
      const result = getPointsLog(testUserId, '');
      expect(Array.isArray(result.records)).toBe(true);
    });

    test('支持按类型筛选', () => {
      const result = getPointsLog(testUserId, 'checkin');
      expect(result.total).toBe(1);
      result.records.forEach((record) => {
        expect(record.type).toBe('checkin');
      });
    });

    test('空类型筛选返回所有记录', () => {
      const result = getPointsLog(testUserId, '');
      expect(result.total).toBe(2);
    });

    test('records 包含正确字段', () => {
      const result = getPointsLog(testUserId, '');
      result.records.forEach((record) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('type');
        expect(record).toHaveProperty('amount');
        expect(record).toHaveProperty('description');
        expect(record).toHaveProperty('createdAt');
      });
    });

    test('支持分页参数', () => {
      const result = getPointsLog(testUserId, '', 1, 10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('addPoints', () => {
    test('增加积分成功', () => {
      const initialPoints = db.prepare('SELECT points FROM users WHERE id = ?').get(testUserId).points;
      addPoints(testUserId, 'test', 10, '测试增加');
      const finalPoints = db.prepare('SELECT points FROM users WHERE id = ?').get(testUserId).points;
      expect(finalPoints).toBe(initialPoints + 10);
    });

    test('正确记录积分流水', () => {
      addPoints(testUserId, 'test', 10, '测试增加');
      const log = db.prepare(
        'SELECT * FROM points_log WHERE user_id = ? AND type = ? AND amount = ?'
      ).get(testUserId, 'test', 10);
      expect(log).not.toBeUndefined();
      expect(log.description).toBe('测试增加');
    });

    test('支持可选的 relatedId', () => {
      addPoints(testUserId, 'test', 10, '测试增加', 123);
      const log = db.prepare(
        'SELECT * FROM points_log WHERE user_id = ? AND related_id = ?'
      ).get(testUserId, 123);
      expect(log).not.toBeUndefined();
    });

    test('正数积分正确记录', () => {
      addPoints(testUserId, 'checkin', 5, '打卡奖励');
      const log = db.prepare(
        'SELECT amount FROM points_log WHERE user_id = ? AND type = ?'
      ).get(testUserId, 'checkin');
      expect(log.amount).toBe(5);
    });
  });

  describe('deductPoints', () => {
    test('扣减积分成功', () => {
      const initialPoints = db.prepare('SELECT points FROM users WHERE id = ?').get(testUserId).points;
      deductPoints(testUserId, 10, 'test', '测试扣减');
      const finalPoints = db.prepare('SELECT points FROM users WHERE id = ?').get(testUserId).points;
      expect(finalPoints).toBe(initialPoints - 10);
    });

    test('积分不足时抛出错误', () => {
      expect(() => {
        deductPoints(testUserId, 200, 'test', '超额扣减');
      }).toThrow('积分不足');
    });

    test('正确记录负数积分流水', () => {
      deductPoints(testUserId, 10, 'test', '测试扣减');
      const log = db.prepare(
        'SELECT * FROM points_log WHERE user_id = ? AND type = ? AND amount = ?'
      ).get(testUserId, 'test', -10);
      expect(log).not.toBeUndefined();
      expect(log.description).toBe('测试扣减');
    });

    test('返回正确的扣减结果', () => {
      const result = deductPoints(testUserId, 10, 'test', '测试扣减');
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('deducted', 10);
      expect(result).toHaveProperty('remaining');
    });

    test('用户不存在时抛出错误', () => {
      expect(() => {
        deductPoints(99999, 10, 'test', '用户不存在');
      }).toThrow('用户不存在');
    });

    test('并发扣减失败时抛出错误', () => {
      jest.resetModules();
      jest.mock('../src/db', () => ({
        getDb: jest.fn(() => ({
          prepare: jest.fn(() => ({
            get: jest.fn(() => ({ points: 100 })),
            run: jest.fn(() => ({ changes: 0 })),
          })),
        })),
        runInTransaction: jest.fn((fn) => fn()),
      }));

      const { deductPoints: mockedDeduct } = require('../src/services/pointsService');
      expect(() => {
        mockedDeduct(1, 10, 'test', '并发扣减');
      }).toThrow('积分扣减失败，请重试');
    });
  });

  describe('getConsumedPoints', () => {
    beforeEach(() => {
      db.prepare("DELETE FROM points_log WHERE user_id = ?").run(testUserId);
      db.prepare(
        "INSERT INTO points_log (user_id, type, amount, description) VALUES (?, 'lottery', -20, '抽奖消耗')"
      ).run(testUserId);
      db.prepare(
        "INSERT INTO points_log (user_id, type, amount, description) VALUES (?, 'lottery', -20, '抽奖消耗')"
      ).run(testUserId);
      db.prepare(
        "INSERT INTO points_log (user_id, type, amount, description) VALUES (?, 'checkin', 5, '打卡获得')"
      ).run(testUserId);
    });

    test('正确计算已消耗积分总数', () => {
      const consumed = getConsumedPoints(testUserId);
      expect(consumed).toBe(40);
    });

    test('无消耗记录时返回0', () => {
      db.prepare('DELETE FROM points_log WHERE user_id = ? AND amount < 0').run(testUserId);
      const consumed = getConsumedPoints(testUserId);
      expect(consumed).toBe(0);
    });

    test('正数记录不计入消耗', () => {
      const consumed = getConsumedPoints(testUserId);
      const log = db.prepare(
        'SELECT SUM(ABS(amount)) as total FROM points_log WHERE user_id = ? AND amount < 0'
      ).get(testUserId);
      expect(consumed).toBe(log.total);
    });

    test('用户不存在时返回0', () => {
      const consumed = getConsumedPoints(99999);
      expect(consumed).toBe(0);
    });
  });
});
