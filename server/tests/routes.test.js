/**
 * 路由同步处理测试
 * 验证所有路由正确移除不必要的 async/await
 */
const request = require('supertest');
const express = require('express');

// 模拟数据库和服务
jest.mock('../src/db', () => ({
  getDb: jest.fn(() => ({
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(() => ({ id: 1, username: 'test' })),
      all: jest.fn(() => []),
    })),
    transaction: jest.fn((fn) => fn),
  })),
  runInTransaction: jest.fn((fn) => fn()),
}));

jest.mock('../src/services/userService', () => ({
  register: jest.fn(() => ({ token: 'test-token', user: { id: 1 } })),
  login: jest.fn(() => ({ token: 'test-token', user: { id: 1 } })),
  wechatLogin: jest.fn(() => ({ token: 'test-token', user: { id: 1 } })),
  getUserById: jest.fn(() => ({ id: 1, username: 'test' })),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  getUserStats: jest.fn(() => ({ totalCheckins: 10, streak: 5 })),
}));

jest.mock('../src/services/checkinService', () => ({
  doCheckin: jest.fn(() => ({ checkinId: 1 })),
  getTodayCheckin: jest.fn(() => []),
  getCheckinHistory: jest.fn(() => ({ list: [], total: 0 })),
  getStreak: jest.fn(() => 5),
  createTask: jest.fn(() => ({ id: 1 })),
  deleteTask: jest.fn(),
  getTasks: jest.fn(() => []),
}));

jest.mock('../src/services/pointsService', () => ({
  getBalance: jest.fn(() => 100),
  getPointsLog: jest.fn(() => ({ list: [], total: 0 })),
}));

jest.mock('../src/services/lotteryService', () => ({
  getPrizes: jest.fn(() => []),
  draw: jest.fn(() => ({ prize: '积分x5' })),
  getLotteryRecords: jest.fn(() => ({ list: [], total: 0 })),
}));

jest.mock('../src/services/adminService', () => ({
  makeupCheckin: jest.fn(() => ({})),
  adjustPoints: jest.fn(() => ({})),
  getDashboard: jest.fn(() => ({})),
  getUsers: jest.fn(() => ({ list: [], total: 0 })),
  updateUserStatus: jest.fn(),
  getAllCheckins: jest.fn(() => ({ list: [], total: 0 })),
  getAllPointsLog: jest.fn(() => ({ list: [], total: 0 })),
  managePrize: jest.fn(() => ({})),
  getAllLotteryRecords: jest.fn(() => ({ list: [], total: 0 })),
  getAllImages: jest.fn(() => ({ list: [], total: 0 })),
  getAdminLogs: jest.fn(() => ({ list: [], total: 0 })),
}));

jest.mock('../src/utils/backup', () => ({
  backupDatabase: jest.fn(() => ({ filename: 'backup.zip' })),
}));

jest.mock('../src/middleware/auth', () => (req, res, next) => {
  req.user = { userId: 1, username: 'test', isAdmin: true };
  next();
});

jest.mock('../src/middleware/adminAuth', () => (req, res, next) => next());

jest.mock('../src/middleware/upload', () => {
  const fn = () => (req, res, next) => {
    req.file = { path: 'E:\\MyProject\\Daily\\server\\uploads\\test.jpg', originalname: 'test.jpg', size: 1000 };
    next();
  };
  fn.single = () => fn();
  fn.validateFileContent = (req, res, next) => next();
  return fn;
});

jest.mock('../src/utils/fileValidator', () => ({
  validateFileContent: jest.fn(() => ({ valid: true, type: 'jpeg' })),
}));

jest.mock('../src/utils/imageCompress', () => ({
  compressImage: jest.fn(() => ({
    compressedPath: 'E:\\MyProject\\Daily\\server\\uploads\\test_compressed.jpg',
    width: 800,
    height: 600,
  })),
}));

describe('路由同步处理测试', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../src/routes/auth'));
    app.use('/api/user', require('../src/routes/user'));
    app.use('/api/checkin', require('../src/routes/checkin'));
    app.use('/api/points', require('../src/routes/points'));
    app.use('/api/lottery', require('../src/routes/lottery'));
    app.use('/api/admin', require('../src/routes/admin'));
    app.use('/api/upload', require('../src/routes/upload'));

    // 错误处理中间件
    app.use((err, req, res, next) => {
      res.status(500).json({ code: 500, message: err.message });
    });
  });

  test('POST /api/auth/register 同步处理成功', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', password: '123456', nickname: 'Test' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('POST /api/auth/login 同步处理成功', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('GET /api/user/profile 同步处理成功', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('POST /api/checkin 同步处理成功', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .send({ taskId: 1 })
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('GET /api/points/balance 同步处理成功', async () => {
    const res = await request(app)
      .get('/api/points/balance')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('POST /api/lottery/draw 同步处理成功', async () => {
    const res = await request(app)
      .post('/api/lottery/draw')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('GET /api/admin/dashboard 同步处理成功', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('POST /api/upload 同步处理成功', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  test('路由错误被正确捕获', async () => {
    const { register } = require('../src/services/userService');
    register.mockImplementationOnce(() => {
      throw new Error('注册失败');
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', password: '123456' });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('注册失败');
  });
});
