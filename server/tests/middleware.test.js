/**
 * 中间件测试
 * 覆盖：JWT 认证、管理员权限校验
 * 通过 mock 整个 auth 模块依赖来测试，避免依赖未安装的 native modules
 */

describe('中间件测试', () => {
  describe('adminAuth 管理员权限中间件', () => {
    let adminAuthMiddleware;
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      jest.resetModules();
      adminAuthMiddleware = require('../src/middleware/adminAuth');
      mockReq = {};
      mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      };
      mockNext = jest.fn();
    });

    test('无 req.user 时返回 401', () => {
      adminAuthMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 401, message: expect.any(String) })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('req.user 存在但 isAdmin 为 false 时返回 403', () => {
      mockReq.user = { userId: 1, isAdmin: false };
      adminAuthMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('req.user 存在且 isAdmin 为 true 时通过', () => {
      mockReq.user = { userId: 1, isAdmin: true };
      adminAuthMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('req.user 存在但缺少 isAdmin 字段时返回 403', () => {
      mockReq.user = { userId: 1, username: 'test' };
      adminAuthMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('isAdmin 为 0（falsy）时返回 403', () => {
      mockReq.user = { userId: 1, isAdmin: 0 };
      adminAuthMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('auth JWT 认证中间件（逻辑验证）', () => {
    test('auth 中间件导出为函数', () => {
      jest.resetModules();
      jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
      jest.mock('../src/config', () => ({ jwtSecret: 'test' }));
      const authMiddleware = require('../src/middleware/auth');
      expect(typeof authMiddleware).toBe('function');
    });

    test('无 Authorization 头时返回 401', () => {
      jest.resetModules();
      jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
      jest.mock('../src/config', () => ({ jwtSecret: 'test' }));
      const authMiddleware = require('../src/middleware/auth');

      const mockReq = { headers: {} };
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      };
      const mockNext = jest.fn();

      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('空 Token 时返回 401', () => {
      jest.resetModules();
      jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
      jest.mock('../src/config', () => ({ jwtSecret: 'test' }));
      const authMiddleware = require('../src/middleware/auth');

      const mockReq = { headers: { authorization: 'Bearer ' } };
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      };
      const mockNext = jest.fn();

      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Token 验证失败时返回 401', () => {
      jest.resetModules();
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn(() => { throw new Error('invalid signature'); })
      }));
      jest.mock('../src/config', () => ({ jwtSecret: 'test' }));
      const authMiddleware = require('../src/middleware/auth');

      const mockReq = { headers: { authorization: 'Bearer bad-token' } };
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      };
      const mockNext = jest.fn();

      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Token 验证成功时设置 req.user 并调用 next', () => {
      const decoded = { userId: 1, username: 'test', isAdmin: false };
      jest.resetModules();
      jest.mock('jsonwebtoken', () => ({
        verify: jest.fn(() => decoded)
      }));
      jest.mock('../src/config', () => ({ jwtSecret: 'test' }));
      const authMiddleware = require('../src/middleware/auth');

      const mockReq = { headers: { authorization: 'Bearer valid-token' } };
      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      };
      const mockNext = jest.fn();

      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockReq.user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
