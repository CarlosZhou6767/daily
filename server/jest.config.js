/**
 * Jest 测试配置
 */
module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: ['**/tests/**/*.test.js'],

  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 覆盖率收集目录
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/db/init.js',
  ],

  // 覆盖率报告输出目录
  coverageDirectory: 'coverage',

  // 覆盖率阈值（当前测试覆盖范围有限，设置合理阈值）
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },

  // 模块路径别名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 每次测试后清理 mock
  clearMocks: true,

  // 测试超时时间（毫秒）
  testTimeout: 10000,
};
