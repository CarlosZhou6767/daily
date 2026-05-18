/**
 * 数据库连接管理模块
 * 基于 better-sqlite3 实现，支持原生 SQLite 访问和 WAL 模式并发
 * 直接连接磁盘文件，无需加载到内存，实时写入
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const initSQL = require('./init');
const logger = require('../utils/logger');

let db = null;

/**
 * 获取数据库实例（单例模式）
 * 首次调用时打开数据库文件，设置 PRAGMA 并初始化表结构
 * @returns {Database} better-sqlite3 数据库实例
 */
function getDb() {
  if (db) return db;

  // 确保数据库目录存在
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 打开或创建数据库文件
  db = new Database(config.dbPath);

  // 启用 WAL 模式，提升并发性能
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -2000');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');

  // 初始化表结构和默认数据
  initSQL(db);

  return db;
}

/**
 * 安全关闭数据库连接
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 检查数据库健康状态
 * 执行 SELECT 1 测试连接是否正常
 * @returns {{status: 'healthy'|'unhealthy', error?: string}}
 */
function getDbHealth() {
  try {
    const instance = getDb();
    instance.prepare('SELECT 1').get();
    return { status: 'healthy' };
  } catch (err) {
    logger.error('Database health check failed', { error: err.message });
    return { status: 'unhealthy', error: err.message };
  }
}

/**
 * 在事务中执行数据库操作
 * 自动处理 BEGIN/COMMIT/ROLLBACK
 * @param {Function} fn - 接收 db 实例的事务操作函数
 * @returns {any} fn 的返回值
 */
function runInTransaction(fn) {
  const db = getDb();
  const transaction = db.transaction(fn);
  return transaction();
}

// 监听进程退出信号，确保数据安全关闭
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

module.exports = { getDb, closeDb, runInTransaction, getDbHealth };
