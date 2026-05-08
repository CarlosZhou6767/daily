/**
 * 统一响应工具测试
 * 验证 success 和 fail 函数的响应格式
 * 针对 BUG-OPT-005 新增的统一响应工具进行覆盖
 */
const { success, fail } = require('../src/utils/responseHelper');

describe('统一响应工具测试', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      json: jest.fn(() => mockRes),
      status: jest.fn(() => mockRes),
    };
  });

  describe('success', () => {
    test('返回默认格式响应', () => {
      success(mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        message: '操作成功',
        data: null,
      });
    });

    test('携带数据时正确返回', () => {
      const data = { id: 1, name: 'test' };
      success(mockRes, data);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        message: '操作成功',
        data,
      });
    });

    test('自定义消息时正确返回', () => {
      success(mockRes, null, '登录成功');
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        message: '登录成功',
        data: null,
      });
    });

    test('自定义消息和数据时正确返回', () => {
      const data = { token: 'abc123' };
      success(mockRes, data, '注册成功');
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        message: '注册成功',
        data,
      });
    });

    test('返回 Express 响应对象支持链式调用', () => {
      const result = success(mockRes);
      expect(result).toBe(mockRes);
    });
  });

  describe('fail', () => {
    test('返回默认格式失败响应', () => {
      fail(mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 400,
        message: '请求失败',
      });
    });

    test('自定义错误码和消息时正确返回', () => {
      fail(mockRes, 404, '资源不存在');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 404,
        message: '资源不存在',
      });
    });

    test('返回 Express 响应对象支持链式调用', () => {
      const result = fail(mockRes);
      expect(result).toBe(mockRes);
    });

    test('支持 500 错误码', () => {
      fail(mockRes, 500, '服务器内部错误');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 500,
        message: '服务器内部错误',
      });
    });

    test('支持 401 未授权错误码', () => {
      fail(mockRes, 401, '未授权访问');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 401,
        message: '未授权访问',
      });
    });
  });
});
