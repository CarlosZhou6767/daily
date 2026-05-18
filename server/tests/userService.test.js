/**
 * 用户服务安全测试
 * 验证 updateProfile 字段白名单、SQL注入防护、输入校验
 */
const { getDb, runInTransaction } = require('../src/db');
const { updateProfile } = require('../src/services/userService');

describe('用户服务安全测试', () => {
  let db;

  beforeAll(() => {
    db = getDb();
    // 创建测试用户
    try {
      db.prepare("INSERT INTO users (id, username, password, nickname, status) VALUES (9999, 'testuser', 'testpass', 'Test', 'active')").run();
    } catch (e) {
      // 用户可能已存在
    }
  });

  afterAll(() => {
    // 清理测试数据
    try {
      db.prepare('DELETE FROM users WHERE id = 9999').run();
    } catch (e) {
      // 忽略清理错误
    }
  });

  test('updateProfile 拒绝非法字段', () => {
    expect(() => {
      updateProfile(9999, { password: 'hacked123' });
    }).toThrow('不允许更新的字段: password');
  });

  test('updateProfile 拒绝 SQL 注入尝试', () => {
    expect(() => {
      updateProfile(9999, { "nickname' OR '1'='1": 'hack' });
    }).toThrow("不允许更新的字段: nickname' OR '1'='1");
  });

  test('updateProfile 校验 nickname 长度', () => {
    const longNickname = 'a'.repeat(51);
    expect(() => {
      updateProfile(9999, { nickname: longNickname });
    }).toThrow('nickname 超过最大长度限制 50');
  });

  test('updateProfile 校验 theme 允许值', () => {
    expect(() => {
      updateProfile(9999, { theme: 'hacker' });
    }).toThrow("theme 必须是以下值之一: light, dark");
  });

  test('updateProfile 校验 phone 格式', () => {
    expect(() => {
      updateProfile(9999, { phone: '12345678901' });
    }).toThrow('phone 格式不正确');
  });

  test('updateProfile 允许合法手机号', () => {
    expect(() => {
      updateProfile(9999, { phone: '13800138000' });
    }).not.toThrow();
  });

  test('updateProfile 成功更新合法字段', () => {
    expect(() => {
      updateProfile(9999, { nickname: '新昵称', theme: 'dark' });
    }).not.toThrow();

    const user = db.prepare('SELECT nickname, theme FROM users WHERE id = 9999').get();
    expect(user.nickname).toBe('新昵称');
    expect(user.theme).toBe('dark');
  });
});
