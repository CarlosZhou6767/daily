/**
 * 配置安全测试
 * 验证环境变量加载、生产环境必填项检查、CORS配置
 */
const path = require('path');

// 保存原始环境变量
const originalEnv = process.env;

describe('配置安全测试', () => {
  beforeEach(() => {
    // 重置模块缓存，确保每次加载最新配置
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('开发环境使用默认值', () => {
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.ADMIN_PASSWORD;

    const config = require('../src/config');
    expect(config.jwtSecret).not.toBe('DEV_ONLY_CHANGE_ME_IN_PRODUCTION');
    expect(typeof config.jwtSecret).toBe('string');
    expect(config.jwtSecret.length).toBeGreaterThan(0);
    expect(config.adminCredentials.password).toBe('dev_password_change_me');
  });

  test('生产环境 JWT_SECRET 未设置时抛出错误', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => {
      require('../src/config');
    }).toThrow('生产环境必须设置环境变量: JWT_SECRET');
  });

  test('生产环境 ADMIN_PASSWORD 未设置时抛出错误', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.ADMIN_PASSWORD;

    expect(() => {
      require('../src/config');
    }).toThrow('生产环境必须设置环境变量: ADMIN_PASSWORD');
  });

  test('生产环境 CORS_ORIGIN 设置为 * 时发出警告', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_PASSWORD = 'test-password';
    process.env.CORS_ORIGIN = '*';

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const config = require('../src/config');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CORS_ORIGIN 设置为 *')
    );
    expect(config.corsOrigin).toBe('*');
    consoleSpy.mockRestore();
  });

  test('CORS_ORIGIN 多个域名解析为数组', () => {
    process.env.CORS_ORIGIN = 'https://app.example.com, https://admin.example.com';
    process.env.JWT_SECRET = 'test-secret';

    const config = require('../src/config');
    expect(config.corsOrigin).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  test('环境变量正确加载', () => {
    process.env.JWT_SECRET = 'my-secret-key';
    process.env.ADMIN_USERNAME = 'superadmin';
    process.env.ADMIN_PASSWORD = 'super-password';
    process.env.PORT = '8080';

    const config = require('../src/config');
    expect(config.jwtSecret).toBe('my-secret-key');
    expect(config.adminCredentials.username).toBe('superadmin');
    expect(config.adminCredentials.password).toBe('super-password');
    expect(config.port).toBe(8080);
  });

  test('getEnv 参数 key 为空字符串时抛出错误', () => {
    jest.resetModules();
    const { getEnv } = require('../src/config');
    expect(() => {
      getEnv('', 'default');
    }).toThrow('环境变量名必须为非空字符串');
  });

  test('getEnv 参数 key 为非字符串时抛出错误', () => {
    jest.resetModules();
    const { getEnv } = require('../src/config');
    expect(() => {
      getEnv(123, 'default');
    }).toThrow('环境变量名必须为非空字符串');
  });

  test('getEnv 参数 key 为纯空格字符串时抛出错误', () => {
    jest.resetModules();
    const { getEnv } = require('../src/config');
    expect(() => {
      getEnv('   ', 'default');
    }).toThrow('环境变量名必须为非空字符串');
  });

  test('getEnv 参数 key 为合法字符串时正常执行', () => {
    jest.resetModules();
    const { getEnv } = require('../src/config');
    expect(() => {
      getEnv('VALID_KEY', 'default');
    }).not.toThrow();
  });
});
