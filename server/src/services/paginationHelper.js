/**
 * 分页辅助函数
 * 统一处理分页查询的重复逻辑，减少代码冗余
 * 提供标准化的分页接口和动态 WHERE 子句构建能力
 */

/**
 * 构建分页查询结果
 * 单次数据库连接完成 COUNT 和数据查询两个操作
 * 通过 mapper 函数将数据库行映射为前端友好的 camelCase 格式
 * 使用参数化查询防止 SQL 注入
 * @param {Database} db - better-sqlite3 数据库实例
 * @param {Object} options - 查询配置
 * @param {string} options.countSql - 计数 SQL（不含 SELECT COUNT(*) as total FROM，即为 FROM 之后的部分）
 * @param {string} options.dataSql - 数据查询 SQL（不含 LIMIT OFFSET）
 * @param {Array} options.params - SQL 参数数组，用于参数化查询
 * @param {number} options.page - 页码（从 1 开始）
 * @param {number} options.pageSize - 每页条数
 * @param {Function} options.mapper - 数据映射函数（将数据库行映射为返回对象，如 snake_case 转 camelCase）
 * @returns {Object} 标准分页结果 { records, total, page, pageSize, totalPages }
 */
function paginate(db, options) {
  const { countSql, dataSql, params = [], page = 1, pageSize = 20, mapper = (row) => row } = options;

  // 计算数据库 OFFSET 偏移量
  const offset = (page - 1) * pageSize;

  // 查询总数：使用 COUNT(*) 聚合
  const total = db.prepare(`SELECT COUNT(*) as total FROM ${countSql}`).get(params).total;

  // 查询当前页数据：LIMIT 限制条数，OFFSET 控制偏移
  const records = db.prepare(`${dataSql} LIMIT ? OFFSET ?`).all(...params, pageSize, offset).map(mapper);

  return {
    records,
    total,
    page,
    pageSize,
    // 向上取整计算总页数
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 构建带筛选条件的 WHERE 子句
 * 动态拼接筛选条件，自动忽略未提供值的条件
 * 支持 = 和 LIKE 两种运算符，LIKE 时自动添加 % 通配符
 * 所有值通过参数化查询传入，防止 SQL 注入
 * @param {Array<{field: string, value: any, operator?: string}>} filters - 筛选条件数组
 *   每项包含：field（字段名）、value（筛选值）、operator（可选，默认为 =，支持 LIKE）
 * @param {Array} params - 参数数组（会被原地修改，追加筛选值）
 * @returns {string} WHERE 子句（不含 WHERE 关键字），无条件时返回 '1=1'（永远为真）
 */
function buildWhere(filters, params) {
  const conditions = [];

  for (const filter of filters) {
    // 仅当值有效时才添加筛选条件（忽略 undefined/null/空字符串）
    if (filter.value !== undefined && filter.value !== null && filter.value !== '') {
      const operator = filter.operator || '=';
      if (operator === 'LIKE') {
        // LIKE 查询自动添加 % 通配符实现模糊匹配
        conditions.push(`${filter.field} LIKE ?`);
        params.push(`%${filter.value}%`);
      } else {
        conditions.push(`${filter.field} ${operator} ?`);
        params.push(filter.value);
      }
    }
  }

  // 无条件时返回永真条件，简化后续 SQL 拼接
  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
}

module.exports = { paginate, buildWhere };