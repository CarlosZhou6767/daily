/**
 * 打卡服务扩展测试
 * 覆盖：打卡流程、重复打卡防护、连续打卡奖励阶梯、任务管理
 * 使用 mock 数据库避免依赖 native modules
 */
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('打卡服务扩展测试', () => {
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

    jest.mock('../src/services/pointsService', () => ({
      addPoints: jest.fn(),
    }));
  });

  describe('doCheckin 打卡流程', () => {
    test('正常打卡成功', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT id FROM checkins WHERE user_id')) {
          return { get: jest.fn(() => null) };
        }
        if (sql.includes('SELECT DISTINCT checkin_date')) {
          return { all: jest.fn(() => []) };
        }
        if (sql.includes('SELECT')) {
          return { get: jest.fn(() => ({ id: 1, points: 100, status: 'active', longest_streak: 0 })) };
        }
        return { run: jest.fn(() => ({ changes: 1 })), get: jest.fn(), all: jest.fn(() => []) };
      });

      const { doCheckin } = require('../src/services/checkinService');
      const result = doCheckin(1, 1);
      expect(result).toHaveProperty('pointsEarned');
      expect(result).toHaveProperty('newStreak');
    });

    test('重复打卡被拒绝', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('SELECT id FROM checkins WHERE user_id')) {
          return { get: jest.fn(() => ({ id: 999 })) };
        }
        return { get: jest.fn(() => null), run: jest.fn(() => ({ changes: 1 })), all: jest.fn(() => []) };
      });

      const { doCheckin } = require('../src/services/checkinService');
      expect(() => doCheckin(1, 1)).toThrow('今日该任务已打卡');
    });
  });

  describe('getStreakBonus 连续打卡奖励阶梯', () => {
    test('连续 0-2 天无奖励', () => {
      const { getStreakBonus } = require('../src/services/checkinService');
      expect(getStreakBonus(0)).toBe(0);
      expect(getStreakBonus(1)).toBe(0);
      expect(getStreakBonus(2)).toBe(0);
    });

    test('连续 3 天获得奖励', () => {
      const { getStreakBonus } = require('../src/services/checkinService');
      expect(getStreakBonus(3)).toBeGreaterThan(0);
    });

    test('连续 7 天获得更多奖励', () => {
      const { getStreakBonus } = require('../src/services/checkinService');
      expect(getStreakBonus(7)).toBeGreaterThan(getStreakBonus(3));
    });

    test('连续 30 天获得最多奖励', () => {
      const { getStreakBonus } = require('../src/services/checkinService');
      expect(getStreakBonus(30)).toBeGreaterThan(getStreakBonus(7));
    });

    test('连续天数递增奖励递增', () => {
      const { getStreakBonus } = require('../src/services/checkinService');
      const bonus3 = getStreakBonus(3);
      const bonus7 = getStreakBonus(7);
      const bonus30 = getStreakBonus(30);
      expect(bonus7).toBeGreaterThan(bonus3);
      expect(bonus30).toBeGreaterThan(bonus7);
    });
  });

  describe('createTask / deleteTask 任务管理', () => {
    test('创建任务成功', () => {
      mockDb.prepare.mockImplementation(() => ({
        run: jest.fn(() => ({ changes: 1 })),
        get: jest.fn(() => ({ id: 1, name: '新任务', icon: '🏃', description: '每天跑步', status: 'active' })),
      }));

      const { createTask } = require('../src/services/checkinService');
      const result = createTask(1, '新任务', '🏃', '每天跑步');
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('新任务');
      expect(result.icon).toBe('🏃');
    });

    test('删除任务（软删除）', () => {
      mockDb.prepare.mockImplementation(() => ({
        run: jest.fn(() => ({ changes: 1 })),
        get: jest.fn(() => ({ id: 1 })),
      }));

      const { deleteTask } = require('../src/services/checkinService');
      expect(() => deleteTask(1, 1)).not.toThrow();
    });
  });

  describe('getTodayCheckin 今日打卡状态', () => {
    test('未打卡时返回空数组', () => {
      mockDb.prepare.mockImplementation(() => ({
        all: jest.fn(() => []),
      }));

      const { getTodayCheckin } = require('../src/services/checkinService');
      const result = getTodayCheckin(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCheckinHistory 打卡历史查询', () => {
    test('返回标准分页结构', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('COUNT')) {
          return { get: jest.fn(() => ({ total: 0 })) };
        }
        return { all: jest.fn(() => []) };
      });

      const { getCheckinHistory } = require('../src/services/checkinService');
      const result = getCheckinHistory(1);
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
    });
  });
});
