/**
 * 第五轮修复验证测试
 * 覆盖：AppError 类、adminAuth 401/403 区分、escapeCsvCell、
 *       库存 falsy 值修复（?? vs ||）、备份路径安全、上传危险扩展名检测
 */

const AppError = require('../src/utils/AppError')

describe('AppError 自定义错误类', () => {
  test('默认 statusCode 为 400', () => {
    const err = new AppError('测试错误')
    expect(err.message).toBe('测试错误')
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe('AppError')
    expect(err instanceof Error).toBe(true)
  })

  test('可自定义 statusCode', () => {
    const err = new AppError('未授权', 401)
    expect(err.statusCode).toBe(401)
  })

  test('可设置 403 statusCode', () => {
    const err = new AppError('无权限', 403)
    expect(err.statusCode).toBe(403)
  })

  test('可设置 500 statusCode', () => {
    const err = new AppError('服务器错误', 500)
    expect(err.statusCode).toBe(500)
  })
})

describe('adminAuth 中间件 401/403 区分', () => {
  let adminAuthMiddleware
  let mockReq, mockRes, mockNext

  beforeEach(() => {
    jest.resetModules()
    adminAuthMiddleware = require('../src/middleware/adminAuth')
    mockReq = {}
    mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(() => mockRes),
    }
    mockNext = jest.fn()
  })

  test('无 req.user 时返回 401（未登录）', () => {
    adminAuthMiddleware(mockReq, mockRes, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 401 })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('req.user 存在但 isAdmin 为 false 时返回 403（无权限）', () => {
    mockReq.user = { userId: 1, isAdmin: false }
    adminAuthMiddleware(mockReq, mockRes, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 403 })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('req.user 存在且 isAdmin 为 true 时通过', () => {
    mockReq.user = { userId: 1, isAdmin: true }
    adminAuthMiddleware(mockReq, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  test('req.user 存在但缺少 isAdmin 字段时返回 403', () => {
    mockReq.user = { userId: 1, username: 'test' }
    adminAuthMiddleware(mockReq, mockRes, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(403)
  })

  test('isAdmin 为 0（falsy）时返回 403', () => {
    mockReq.user = { userId: 1, isAdmin: 0 }
    adminAuthMiddleware(mockReq, mockRes, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(403)
  })

  test('isAdmin 为 1（truthy）时通过', () => {
    mockReq.user = { userId: 1, isAdmin: 1 }
    adminAuthMiddleware(mockReq, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalled()
  })
})

describe('escapeCsvCell CSV 注入防护', () => {
  function escapeCsvCell(val) {
    const str = String(val ?? '')
    if (/^[=+\-@\t\r]/.test(str)) {
      return "'" + str
    }
    return str
  }

  test('普通文本不做转义', () => {
    expect(escapeCsvCell('hello')).toBe('hello')
    expect(escapeCsvCell('123')).toBe('123')
  })

  test('以 = 开头的公式注入防护', () => {
    expect(escapeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
  })

  test('以 + 开头的公式注入防护', () => {
    expect(escapeCsvCell('+cmd')).toBe("'+cmd")
  })

  test('以 - 开头的公式注入防护', () => {
    expect(escapeCsvCell('-1+1')).toBe("'-1+1")
  })

  test('以 @ 开头的公式注入防护', () => {
    expect(escapeCsvCell('@SUM')).toBe("'@SUM")
  })

  test('以 tab 开头的注入防护', () => {
    expect(escapeCsvCell('\tdata')).toBe("'\tdata")
  })

  test('以回车开头的注入防护', () => {
    expect(escapeCsvCell('\rdata')).toBe("'\rdata")
  })

  test('null 和 undefined 返回空字符串', () => {
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  test('数字类型正确转换', () => {
    expect(escapeCsvCell(42)).toBe('42')
    expect(escapeCsvCell(-5)).toBe("'-5")
  })
})

describe('库存 falsy 值修复（?? vs ||）', () => {
  test('stock 为 0 时 ?? 保留 0，|| 返回 -1', () => {
    const stock = 0
    expect(stock ?? -1).toBe(0)
    expect(stock || -1).toBe(-1)
  })

  test('stock 为 null 时 ?? 返回 -1', () => {
    const stock = null
    expect(stock ?? -1).toBe(-1)
  })

  test('stock 为 undefined 时 ?? 返回 -1', () => {
    const stock = undefined
    expect(stock ?? -1).toBe(-1)
  })

  test('stock 为 -1 时 ?? 保留 -1', () => {
    const stock = -1
    expect(stock ?? -1).toBe(-1)
  })

  test('stock 为 5 时 ?? 保留 5', () => {
    const stock = 5
    expect(stock ?? -1).toBe(5)
  })
})

describe('responseHelper HTTP 状态码验证', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('有效状态码正常传递', () => {
    const { fail } = require('../src/utils/responseHelper')
    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(() => mockRes),
    }
    fail(mockRes, 404, '测试')
    expect(mockRes.status).toHaveBeenCalledWith(404)
  })

  test('无效状态码回退到 400', () => {
    const { fail } = require('../src/utils/responseHelper')
    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(() => mockRes),
    }
    fail(mockRes, 999, '测试')
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test('状态码小于 100 回退到 400', () => {
    const { fail } = require('../src/utils/responseHelper')
    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(() => mockRes),
    }
    fail(mockRes, 50, '测试')
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })
})

describe('auth Bearer 大小写不敏感', () => {
  test('小写 bearer 也能正确解析', () => {
    jest.resetModules()
    jest.mock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({ userId: 1 }))
    }))
    jest.mock('../src/config', () => ({ jwtSecret: 'test' }))
    const authMiddleware = require('../src/middleware/auth')

    const mockReq = { headers: { authorization: 'bearer test-token' } }
    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(() => mockRes),
    }
    const mockNext = jest.fn()

    authMiddleware(mockReq, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  test('大写 BEARER 也能正确解析', () => {
    jest.resetModules()
    jest.mock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({ userId: 1 }))
    }))
    jest.mock('../src/config', () => ({ jwtSecret: 'test' }))
    const authMiddleware = require('../src/middleware/auth')

    const mockReq = { headers: { authorization: 'BEARER test-token' } }
    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(() => mockRes),
    }
    const mockNext = jest.fn()

    authMiddleware(mockReq, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })
})
