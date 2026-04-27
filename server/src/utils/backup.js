/**
 * 数据库备份工具
 * 将数据库文件和上传目录打包为 ZIP 文件
 */
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 执行数据库备份
 * better-sqlite3 实时写入磁盘，无需手动保存
 * @returns {Promise<Object>} 包含 path, size, fileName 的备份信息
 */
function backupDatabase() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const backupFileName = `daily-backup-${timestamp}.zip`;
    const backupPath = path.join(config.backupDir, backupFileName);

    // 确保备份目录存在
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }

    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve({ path: backupPath, size: archive.pointer(), fileName: backupFileName });
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // 打包数据库文件（包括 WAL 和 SHM 文件）
    if (fs.existsSync(config.dbPath)) {
      archive.file(config.dbPath, { name: 'daily.db' });
    }
    if (fs.existsSync(config.dbPath + '-wal')) {
      archive.file(config.dbPath + '-wal', { name: 'daily.db-wal' });
    }
    if (fs.existsSync(config.dbPath + '-shm')) {
      archive.file(config.dbPath + '-shm', { name: 'daily.db-shm' });
    }

    // 打包上传目录（如果存在）
    if (fs.existsSync(config.uploadDir)) {
      archive.directory(config.uploadDir, 'uploads');
    }

    archive.finalize();
  });
}

module.exports = { backupDatabase };
