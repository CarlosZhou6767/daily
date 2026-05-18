/**
 * 统一响应工具测试
 * 覆盖：成功响应格式、失败响应格式、默认值、状态码设置
 */
describe('统一响应工具测试', () => {
  let success, fail;
  let mockRes;

  beforeEach(() => {
    jest.resetModules();
    const responseHelper = require('../src/utils/responseHelper');
    success = responseHelper.success;
    fail = responseHelper.fail;

    mockRes = {
      json: jest.fn(() => mockRes),
      status: jest.fn(() => mockRes),
    };
  });

  describe('success 成功响应', () => {
    test('默认消息为"操作成功"', () => {
      success(mockRes, { id: 1 });
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        message: '操作成功',
        data: { id: 1 },
      });
    });

    test('自定义消息', () => {
      success(mockRes, null, '登录成功');
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        message: '登录成功',
        data: null,
      });
    });

    test('data 默认为 null', () => {
      success(mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        message: '操作成功',
        data: null,
      });
    });

    test('返回 res 对象以支持链式调用', () => {
      const result = success(mockRes, { test: true });
      expect(result).toBe(mockRes);
    });
  });

  describe('fail 失败响应', () => {
    test('默认状态码 400 和消息"请求失败"', () => {
      fail(mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 400,
        message: '请求失败',
      });
    });

    test('自定义状态码和消息', () => {
      fail(mockRes, 401, '未登录');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 401,
        message: '未登录',
      });
    });

    test('403 禁止访问', () => {
      fail(mockRes, 403, '无权限');
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 403,
        message: '无权限',
      });
    });

    test('500 服务器错误', () => {
      fail(mockRes, 500, '服务器内部错误');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 500,
        message: '服务器内部错误',
      });
    });

    test('返回 res 对象以支持链式调用', () => {
      const result = fail(mockRes, 400, '错误');
      expect(result).toBe(mockRes);
    });
  });
});
