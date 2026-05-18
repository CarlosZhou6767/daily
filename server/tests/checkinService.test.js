/**
 * 打卡服务性能测试
 * 验证 calculateStreak 优化后的正确性和性能
 */
const { getDb, runInTransaction } = require('../src/db');
const { calculateStreak, doCheckin } = require('../src/services/checkinService');
const { formatDate } = require('../src/utils/dateHelper');

describe('打卡服务性能测试', () => {
  let db;
  const testUserId = 9998;

  beforeAll(() => {
    db = getDb();
    try {
      db.prepare("INSERT INTO users (id, username, password, nickname, status) VALUES (9998, 'streaktest', 'testpass', 'StreakTest', 'active')").run();
    } catch (e) {
      // 用户可能已存在
    }
    try {
      db.prepare("INSERT INTO tasks (id, user_id, name, description, icon, status) VALUES (1, ?, '测试任务', '测试', '✅', 'active')").run(testUserId);
    } catch (e) {
      // 任务可能已存在
    }
  });

  beforeEach(() => {
    // 清理测试用户的打卡记录
    db.prepare('DELETE FROM checkins WHERE user_id = ?').run(testUserId);
  });

  afterAll(() => {
    db.prepare('DELETE FROM checkins WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  test('calculateStreak 空记录返回 0', () => {
    const today = formatDate();
    const streak = calculateStreak(db, testUserId, today);
    expect(streak).toBe(0);
  });

  test('calculateStreak 连续 5 天', () => {
    const today = new Date();

    // 插入连续 5 天的打卡记录
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      db.prepare(
        'INSERT INTO checkins (user_id, task_id, checkin_date, points_earned) VALUES (?, 1, ?, 5)'
      ).run(testUserId, dateStr);
    }

    const streak = calculateStreak(db, testUserId, formatDate(today));
    expect(streak).toBe(5);
  });

  test('calculateStreak 中间断开后重新计算', () => {
    const today = new Date();

    // 今天、昨天、前天打卡，然后跳过一天，再之前两天打卡
    const checkinDays = [0, 1, 2, 4, 5]; // 0=今天, 1=昨天, ...
    for (const dayOffset of checkinDays) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      db.prepare(
        'INSERT INTO checkins (user_id, task_id, checkin_date, points_earned) VALUES (?, 1, ?, 5)'
      ).run(testUserId, formatDate(date));
    }

    const streak = calculateStreak(db, testUserId, formatDate(today));
    expect(streak).toBe(3); // 今天、昨天、前天连续
  });

  test('calculateStreak 性能：100 次调用应在 100ms 内完成', () => {
    const today = formatDate();

    // 先插入一些数据
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      db.prepare(
        'INSERT INTO checkins (user_id, task_id, checkin_date, points_earned) VALUES (?, 1, ?, 5)'
      ).run(testUserId, formatDate(date));
    }

    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      calculateStreak(db, testUserId, today);
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
