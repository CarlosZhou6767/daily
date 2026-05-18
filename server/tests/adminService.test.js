/**
 * 管理员服务测试
 * 覆盖：二次确认机制、补打卡流程、积分调整、用户状态管理、奖品管理拆分函数
 * 使用 mock 数据库避免依赖 native modules
 */
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('管理员服务测试', () => {
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
      deductPoints: jest.fn(),
    }));

    jest.mock('../src/services/checkinService', () => ({
      calculateStreak: jest.fn(() => 3),
      updateStreak: jest.fn(),
    }));
  });

  describe('requireConfirmation 二次确认机制', () => {
    test('makeup_checkin 未确认时抛出错误', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ id: 1, username: 'test' })),
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { makeupCheckin } = require('../src/services/adminService');
      expect(() => makeupCheckin(1, 2, 1, '2026-01-01', false))
        .toThrow('二次确认');
    });

    test('adjust_points 未确认时抛出错误', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ id: 1 })),
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { adjustPoints } = require('../src/services/adminService');
      expect(() => adjustPoints(1, 2, 10, '测试', false))
        .toThrow('二次确认');
    });

    test('update_user_status 未确认时抛出错误', () => {
      const { updateUserStatus } = require('../src/services/adminService');
      expect(() => updateUserStatus(1, 2, 'disabled', false))
        .toThrow('二次确认');
    });

    test('非敏感操作不需要确认', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ cnt: 0, total: 0 })),
        all: jest.fn(() => []),
      }));

      const { getDashboard } = require('../src/services/adminService');
      expect(() => getDashboard()).not.toThrow();
    });
  });

  describe('updateUserStatus 用户状态管理', () => {
    test('无效状态值被拒绝', () => {
      const { updateUserStatus } = require('../src/services/adminService');
      expect(() => updateUserStatus(1, 2, 'hacker', true))
        .toThrow('无效的状态值');
    });

    test('管理员不能禁用自己', () => {
      const { updateUserStatus } = require('../src/services/adminService');
      expect(() => updateUserStatus(1, 1, 'disabled', true))
        .toThrow('不能修改自己的状态');
    });

    test('合法状态更新成功', () => {
      mockDb.prepare.mockImplementation(() => ({
        run: jest.fn(() => ({ changes: 1 })),
        get: jest.fn(),
      }));

      const { updateUserStatus } = require('../src/services/adminService');
      const result = updateUserStatus(1, 2, 'disabled', true);
      expect(result.success).toBe(true);
      expect(result.status).toBe('disabled');
    });

    test('用户不存在或状态未改变时抛出错误', () => {
      mockDb.prepare.mockImplementation(() => ({
        run: jest.fn(() => ({ changes: 0 })),
        get: jest.fn(),
      }));

      const { updateUserStatus } = require('../src/services/adminService');
      expect(() => updateUserStatus(1, 999, 'disabled', true))
        .toThrow('用户不存在或状态未改变');
    });
  });

  describe('adjustPoints 积分调整', () => {
    test('正数增加积分', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ id: 1 })),
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { adjustPoints } = require('../src/services/adminService');
      const result = adjustPoints(1, 2, 50, '测试增加', true);
      expect(result.success).toBe(true);
      expect(result.adjusted).toBe(50);
    });

    test('负数扣减积分', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ id: 1 })),
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { adjustPoints } = require('../src/services/adminService');
      const result = adjustPoints(1, 2, -20, '测试扣减', true);
      expect(result.success).toBe(true);
      expect(result.adjusted).toBe(-20);
    });

    test('用户不存在时抛出错误', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => null),
      }));

      const { adjustPoints } = require('../src/services/adminService');
      expect(() => adjustPoints(1, 99999, 10, '测试', true))
        .toThrow('用户不存在');
    });
  });

  describe('makeupCheckin 补打卡', () => {
    test('用户不存在或已禁用时抛出错误', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => null),
        run: jest.fn(),
      }));

      const { makeupCheckin } = require('../src/services/adminService');
      expect(() => makeupCheckin(1, 999, 1, '2026-01-01', true))
        .toThrow('用户不存在或已禁用');
    });

    test('任务不存在时抛出错误', () => {
      let getCallCount = 0;
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => {
          getCallCount++;
          if (getCallCount === 1) return { id: 1, username: 'test' };
          if (getCallCount === 2) return null;
          return null;
        }),
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { makeupCheckin } = require('../src/services/adminService');
      expect(() => makeupCheckin(1, 1, 999, '2026-01-01', true))
        .toThrow('任务不存在');
    });

    test('重复补打卡被拒绝', () => {
      let getCallCount = 0;
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => {
          getCallCount++;
          if (getCallCount === 1) return { id: 1, username: 'test' };
          if (getCallCount === 2) return { id: 1, name: '任务' };
          if (getCallCount === 3) return { id: 100 };
          return null;
        }),
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { makeupCheckin } = require('../src/services/adminService');
      expect(() => makeupCheckin(1, 1, 1, '2026-01-01', true))
        .toThrow('该日期该任务已打卡');
    });
  });

  describe('createPrize 创建奖品', () => {
    test('创建奖品成功', () => {
      mockDb.prepare.mockImplementation(() => ({
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { createPrize } = require('../src/services/adminService');
      const result = createPrize(1, {
        name: '测试奖品',
        probability: 0.1,
        prizeType: 'virtual',
        pointsReward: 5,
        stock: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('deletePrize 删除奖品', () => {
    test('未确认时抛出错误', () => {
      const { deletePrize } = require('../src/services/adminService');
      expect(() => deletePrize(1, 1, false)).toThrow('二次确认');
    });

    test('确认后软删除成功', () => {
      mockDb.prepare.mockImplementation(() => ({
        run: jest.fn(() => ({ changes: 1 })),
      }));

      const { deletePrize } = require('../src/services/adminService');
      const result = deletePrize(1, 1, true);
      expect(result.success).toBe(true);
    });
  });

  describe('getDashboard 数据面板', () => {
    test('返回完整的面板统计数据', () => {
      mockDb.prepare.mockImplementation(() => ({
        get: jest.fn(() => ({ cnt: 10, total: 500 })),
        all: jest.fn(() => []),
      }));

      const { getDashboard } = require('../src/services/adminService');
      const result = getDashboard();
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalCheckins');
      expect(result).toHaveProperty('totalPoints');
      expect(result).toHaveProperty('todayCheckins');
      expect(result).toHaveProperty('weekData');
    });
  });

  describe('getUsers 用户列表查询', () => {
    test('返回标准分页结构', () => {
      mockDb.prepare.mockImplementation((sql) => {
        if (sql.includes('COUNT')) {
          return { get: jest.fn(() => ({ total: 1 })) };
        }
        return { all: jest.fn(() => [{ id: 1, username: 'test' }]) };
      });

      const { getUsers } = require('../src/services/adminService');
      const result = getUsers(1, 10);
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
    });
  });
});
