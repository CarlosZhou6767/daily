/**
 * 工具函数统一入口
 * 集中导出所有工具函数，简化导入路径
 */
const { formatDate } = require('./dateHelper');
const { compressImage } = require('./imageCompress');
const { backupDatabase, listBackups, restoreBackup } = require('./backup');

module.exports = {
  formatDate,
  compressImage,
  backupDatabase,
  listBackups,
  restoreBackup,
};
