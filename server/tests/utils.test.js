/**
 * 工具函数测试
 * 验证工具函数统一入口和 dateHelper
 */
const { formatDate } = require('../src/utils/dateHelper');

describe('工具函数测试', () => {
  test('formatDate 格式化当前日期', () => {
    const result = formatDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('formatDate 格式化指定日期', () => {
    const date = new Date('2024-03-15');
    const result = formatDate(date);
    expect(result).toBe('2024-03-15');
  });

  test('utils/index.js 统一导出所有工具函数', () => {
    const utils = require('../src/utils');
    expect(utils).toHaveProperty('formatDate');
    expect(utils).toHaveProperty('compressImage');
    expect(utils).toHaveProperty('backupDatabase');
    expect(utils).toHaveProperty('listBackups');
    expect(utils).toHaveProperty('restoreBackup');
  });
});
