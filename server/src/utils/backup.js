/**
 * 数据库备份工具
 * 将数据库文件和上传目录打包为 ZIP 文件
 */
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getDb } = require('../db');

function isPathWithin(filePath, baseDir) {
  const resolved = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolved.startsWith(resolvedBase + path.sep) || resolved === resolvedBase;
}

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

    if (!isPathWithin(backupPath, config.backupDir)) {
      return reject(new Error('备份路径不合法'));
    }

    // 确保备份目录存在
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }

    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      // 清理临时备份文件
      try { fs.unlinkSync(tempDbPath); } catch (e) { /* ignore */ }
      resolve({ path: backupPath, size: archive.pointer(), fileName: backupFileName });
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // 使用 better-sqlite3 内置备份方法，避免直接复制在线数据库文件导致损坏
    const db = getDb();
    const tempDbPath = path.join(config.backupDir, `daily-backup-tmp-${Date.now()}.db`);
    if (!isPathWithin(tempDbPath, config.backupDir)) {
      return reject(new Error('临时文件路径不合法'));
    }
    db.backup(tempDbPath);
    archive.file(tempDbPath, { name: 'daily.db' });

    // 打包上传目录（如果存在）
    if (fs.existsSync(config.uploadDir)) {
      archive.directory(config.uploadDir, 'uploads');
    }

    archive.finalize();
  });
}

module.exports = { backupDatabase };
