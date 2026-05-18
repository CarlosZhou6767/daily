/**
 * Jest 自动化测试配置
 * 测试环境：Node.js
 * 测试文件：tests/ 目录下的 .test.js 文件
 * 环境变量：通过 setup.js 预加载测试数据库等依赖
 * 覆盖率：收集 src/ 下全部代码，排除入口文件和初始化脚本
 */
module.exports = {
  // 测试运行环境：Node.js 服务端环境
  testEnvironment: 'node',

  // 测试文件匹配规则：tests 目录下所有 .test.js 文件
  testMatch: ['**/tests/**/*.test.js'],

  // 测试前置脚本：初始化测试数据库、Mock 外部依赖等
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 代码覆盖率收集范围
  collectCoverageFrom: [
    'src/**/*.js',        // 收集 src/ 下所有 JS 文件
    '!src/app.js',        // 排除服务入口文件（涉及端口监听）
    '!src/db/init.js',    // 排除数据库初始化脚本（由 setup 替代）
  ],

  // 覆盖率报告输出目录
  coverageDirectory: 'coverage',

  // 覆盖率最低阈值：低于此值测试不通过
  coverageThreshold: {
    global: {
      branches: 10,       // 分支覆盖率 ≥ 10%
      functions: 10,      // 函数覆盖率 ≥ 10%
      lines: 10,          // 行覆盖率 ≥ 10%
      statements: 10,     // 语句覆盖率 ≥ 10%
    },
  },

  // 模块路径别名：@/ 映射到 src/ 目录
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 每次测试后自动清除 Mock 状态，避免测试间相互影响
  clearMocks: true,

  // 单个测试用例超时时间（毫秒），含数据库操作等可能较慢的场景
  testTimeout: 10000,
};
