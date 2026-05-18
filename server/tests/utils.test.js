/**
 * 工具函数测试
 * 验证 dateHelper 核心功能
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
});
