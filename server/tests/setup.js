/**
 * 测试环境初始化
 * 设置测试数据库和全局配置
 */
const path = require('path');

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'test-password';

// 使用内存数据库进行测试
process.env.DB_PATH = ':memory:';

// 全局测试超时设置
jest.setTimeout(10000);

// 测试完成后清理
afterAll(() => {
  // 清理数据库连接等资源
  try {
    const { closeDb } = require('../src/db');
    if (typeof closeDb === 'function') {
      closeDb();
    }
  } catch (e) {
    // 忽略清理错误
  }
});
