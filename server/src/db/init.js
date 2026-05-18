/**
 * 数据库表结构初始化模块
 * 定义所有数据表、索引，以及默认数据（管理员账号、默认奖品）
 */
const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 初始化所有数据表和索引
 * 使用 CREATE TABLE IF NOT EXISTS 确保可重复执行
 * 使用事务包裹初始化过程，确保数据一致性
 *
 * 注意：所有外键字段已定义 FOREIGN KEY 约束（REFERENCES 子句）。
 * 由于 SQLite 的 CREATE TABLE IF NOT EXISTS 不会修改已存在的表结构，
 * 已有数据库中的旧表不会自动获得外键约束，需删除旧数据库文件重新初始化才能生效。
 * 新建的数据库将自动包含完整的外键约束。
 *
 * @param {Database} db - better-sqlite3 数据库实例
 */
function initTables(db) {
  // 使用事务包裹所有初始化操作，确保原子性
  const initTransaction = db.transaction(() => {
    // 用户表
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT,
        avatar TEXT,
        phone TEXT,
        wechat_openid TEXT,
        points INTEGER DEFAULT 0,
        total_checkin_days INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        theme TEXT DEFAULT 'light',
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 打卡任务表
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        icon TEXT,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 打卡记录表（同一用户同一任务同一天只能打卡一次）
    db.exec(`
      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        task_id INTEGER NOT NULL REFERENCES tasks(id),
        checkin_date TEXT NOT NULL,
        image_path TEXT,
        note TEXT,
        points_earned INTEGER DEFAULT 0,
        is_makeup INTEGER DEFAULT 0,
        makeup_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_id, checkin_date)
      )
    `);

    // 积分流水表
    db.exec(`
      CREATE TABLE IF NOT EXISTS points_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        related_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 奖品表
    db.exec(`
      CREATE TABLE IF NOT EXISTS prizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        probability REAL NOT NULL,
        prize_type TEXT DEFAULT 'virtual',
        points_reward INTEGER DEFAULT 0,
        stock INTEGER DEFAULT -1,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 抽奖记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS lottery_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        prize_id INTEGER NOT NULL REFERENCES prizes(id),
        points_cost INTEGER DEFAULT 20,
        is_received INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 管理员操作日志表
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        detail TEXT,
        ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 用户行为日志表
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        detail TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 图片资源表
    db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        file_path TEXT NOT NULL,
        original_name TEXT,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        related_type TEXT,
        related_id INTEGER,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引：优化常用查询性能
    db.exec('CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, checkin_date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_points_log_user ON points_log(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_points_log_user_type_time ON points_log(user_id, type, created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_lottery_records_user ON lottery_records(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON admin_logs(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_images_user ON images(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_logs_user ON user_logs(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_logs_action ON user_logs(action)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_logs_time ON user_logs(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_logs_user_time ON user_logs(user_id, created_at)');

    // 兼容已有数据库：为 admin_logs 添加 ip 列
    try {
      db.exec('ALTER TABLE admin_logs ADD COLUMN ip TEXT');
    } catch (e) {
      // 列已存在时忽略
    }

    // 初始化默认数据
    initDefaultData(db);
  });

  // 执行事务
  initTransaction();
}

/**
 * 初始化默认数据
 * - 创建管理员账号（密码使用 bcrypt 加密存储）
 * - 创建默认抽奖奖品
 * 在事务中执行，确保数据一致性
 * @param {Database} db - better-sqlite3 数据库实例
 */
function initDefaultData(db) {
  // 检查管理员账号是否已存在
  const adminExists = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE username = ?").get(config.adminCredentials.username);
  if (adminExists.cnt === 0) {
    const hashedPassword = bcrypt.hashSync(config.adminCredentials.password, 10);
    db.prepare(
      `INSERT INTO users (username, password, nickname, is_admin, status) VALUES (?, ?, '管理员', 1, 'active')`
    ).run(config.adminCredentials.username, hashedPassword);
    logger.info('Default admin account created');
  }

  // 检查奖品是否已初始化
  const prizeExists = db.prepare("SELECT COUNT(*) as cnt FROM prizes").get();
  if (prizeExists.cnt === 0) {
    const stmt = db.prepare(
      `INSERT INTO prizes (name, description, probability, prize_type, points_reward, stock) VALUES (?, ?, ?, ?, ?, -1)`
    );
    config.defaultPrizes.forEach((prize) => {
      stmt.run(prize.name, prize.description, prize.probability, prize.prize_type, prize.points_reward);
    });
    logger.info('Default prizes initialized');
  }
}

module.exports = initTables;
