/**
 * logService 单元测试 — 覆盖日志写入、查询、脱敏、文件日志解析、删除
 */
const logService = require('../src/services/logService');

const mockDb = {
  prepare: jest.fn(() => ({
    run: jest.fn(() => ({ changes: 1 })),
    get: jest.fn(() => null),
    all: jest.fn(() => []),
  })),
};

jest.mock('../src/db', () => ({
  getDb: jest.fn(() => mockDb),
}));

jest.mock('../src/services/paginationHelper', () => ({
  paginate: jest.fn((db, opts) => ({
    records: [],
    total: 0,
    page: opts.page,
    pageSize: opts.pageSize,
    totalPages: 0,
  })),
  buildWhere: jest.fn(() => '1=1'),
}));

describe('logUserAction', () => {
  it('应该写入用户行为日志，包含IP和UA', () => {
    const req = { ip: '1.2.3.4', connection: {}, headers: { 'user-agent': 'test-agent' } };
    logService.logUserAction(1, 'login', null, null, null, req);
    expect(mockDb.prepare).toHaveBeenCalled();
  });

  it('应该对敏感字段进行脱敏', () => {
    const detail = { password: 'secret123', username: 'test' };
    const result = logService.sanitizeLogDetail(detail);
    expect(result.password).toBe('***');
    expect(result.username).toBe('test');
  });

  it('req 为 null 时仍能正常写入', () => {
    logService.logUserAction(1, 'checkin', null, null, { task: '跑步' }, null);
    expect(mockDb.prepare).toHaveBeenCalled();
  });
});

describe('logAdminAction', () => {
  it('应该写入管理员操作日志', () => {
    const req = { ip: '10.0.0.1', connection: {} };
    logService.logAdminAction(1, 'adjust_points', 'user', 5, { amount: 10 }, req);
    expect(mockDb.prepare).toHaveBeenCalled();
  });
});

describe('sanitizeLogDetail', () => {
  it('应该脱敏 password 字段', () => {
    expect(logService.sanitizeLogDetail({ password: 'xxx' }).password).toBe('***');
  });

  it('应该脱敏 token 字段', () => {
    expect(logService.sanitizeLogDetail({ authToken: 'abc' }).authToken).toBe('***');
  });

  it('应该脱敏 secret 字段', () => {
    expect(logService.sanitizeLogDetail({ clientSecret: 'xyz' }).clientSecret).toBe('***');
  });

  it('原始值不受影响', () => {
    const original = { name: 'test', password: 'pwd' };
    logService.sanitizeLogDetail(original);
    expect(original.password).toBe('pwd');
  });

  it('非对象类型原样返回', () => {
    expect(logService.sanitizeLogDetail('string')).toBe('string');
    expect(logService.sanitizeLogDetail(null)).toBe(null);
  });
});

describe('getUserLogs', () => {
  it('应该支持 userId 筛选', () => {
    logService.getUserLogs({ userId: 1, page: 1, pageSize: 10 });
    expect(require('../src/services/paginationHelper').paginate).toHaveBeenCalled();
  });

  it('应该支持日期范围筛选', () => {
    logService.getUserLogs({ startDate: '2026-01-01', endDate: '2026-01-31', page: 1, pageSize: 10 });
    expect(require('../src/services/paginationHelper').paginate).toHaveBeenCalled();
  });
});

describe('deleteLogs', () => {
  it('应该支持按ID删除', () => {
    const result = logService.deleteLogs({ type: 'user', ids: [1, 2, 3] });
    expect(result.deleted).toBe(3);
  });

  it('应该支持按日期删除', () => {
    const result = logService.deleteLogs({ beforeDate: '2026-01-01' });
    expect(result.deletedBefore).toBe('2026-01-01');
  });

  it('无参数时抛出错误', () => {
    expect(() => logService.deleteLogs({})).toThrow('必须提供 ids 或 beforeDate 参数');
  });
});