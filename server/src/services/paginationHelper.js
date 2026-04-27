/**
 * 分页辅助函数
 * 统一处理分页查询的重复逻辑，减少代码冗余
 */

/**
 * 构建分页查询结果
 * @param {Database} db - better-sqlite3 数据库实例
 * @param {Object} options - 查询配置
 * @param {string} options.countSql - 计数 SQL（不含 SELECT COUNT(*) as total FROM）
 @param {string} options.dataSql - 数据查询 SQL（不含 LIMIT OFFSET）
 * @param {Array} options.params - SQL 参数数组
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页条数
 * @param {Function} options.mapper - 数据映射函数（将数据库行映射为返回对象）
 * @returns {Object} 标准分页结果 { records, total, page, pageSize, totalPages }
 */
function paginate(db, options) {
  const { countSql, dataSql, params = [], page = 1, pageSize = 20, mapper = (row) => row } = options;

  const offset = (page - 1) * pageSize;

  // 查询总数
  const total = db.prepare(`SELECT COUNT(*) as total FROM ${countSql}`).get(params).total;

  // 查询数据
  const records = db.prepare(`${dataSql} LIMIT ? OFFSET ?`).all(...params, pageSize, offset).map(mapper);

  return {
    records,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 构建带筛选条件的 WHERE 子句
 * @param {Array<{field: string, value: any, operator?: string}>} filters - 筛选条件数组
 * @param {Array} params - 参数数组（会被修改）
 * @returns {string} WHERE 子句（不含 WHERE 关键字）
 */
function buildWhere(filters, params) {
  const conditions = [];

  for (const filter of filters) {
    if (filter.value !== undefined && filter.value !== null && filter.value !== '') {
      const operator = filter.operator || '=';
      if (operator === 'LIKE') {
        conditions.push(`${filter.field} LIKE ?`);
        params.push(`%${filter.value}%`);
      } else {
        conditions.push(`${filter.field} ${operator} ?`);
        params.push(filter.value);
      }
    }
  }

  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
}

module.exports = { paginate, buildWhere };
