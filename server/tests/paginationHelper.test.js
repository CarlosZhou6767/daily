/**
 * 分页辅助函数测试
 * 验证分页逻辑和筛选条件构建
 */
const { paginate, buildWhere } = require('../src/services/paginationHelper');

describe('分页辅助函数测试', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      prepare: jest.fn(() => ({
        get: jest.fn(() => ({ total: 100 })),
        all: jest.fn(() => [
          { id: 1, name: 'Test 1' },
          { id: 2, name: 'Test 2' },
        ]),
      })),
    };
  });

  test('paginate 返回标准分页结构', () => {
    const result = paginate(mockDb, {
      countSql: 'users WHERE status = ?',
      dataSql: 'SELECT * FROM users WHERE status = ? ORDER BY id',
      params: ['active'],
      page: 2,
      pageSize: 10,
      mapper: (row) => ({ id: row.id, name: row.name }),
    });

    expect(result).toHaveProperty('records');
    expect(result).toHaveProperty('total', 100);
    expect(result).toHaveProperty('page', 2);
    expect(result).toHaveProperty('pageSize', 10);
    expect(result).toHaveProperty('totalPages', 10);
    expect(result.records).toHaveLength(2);
  });

  test('buildWhere 构建等值筛选条件', () => {
    const params = [];
    const where = buildWhere([
      { field: 'status', value: 'active' },
      { field: 'type', value: 'user' },
    ], params);

    expect(where).toBe('status = ? AND type = ?');
    expect(params).toEqual(['active', 'user']);
  });

  test('buildWhere 构建模糊筛选条件', () => {
    const params = [];
    const where = buildWhere([
      { field: 'username', value: 'test', operator: 'LIKE' },
    ], params);

    expect(where).toBe('username LIKE ?');
    expect(params).toEqual(['%test%']);
  });

  test('buildWhere 忽略空值条件', () => {
    const params = [];
    const where = buildWhere([
      { field: 'status', value: 'active' },
      { field: 'type', value: '' },
      { field: 'name', value: null },
    ], params);

    expect(where).toBe('status = ?');
    expect(params).toEqual(['active']);
  });
});
