/**
 * 日期工具函数
 * 提供日期格式化、日期范围计算等通用方法
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date - 日期对象，默认当前日期
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 * @param {Date} date - 日期对象，默认当前日期
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取 N 天前的日期
 * @param {number} days - 天数
 * @returns {string} 格式化后的日期字符串
 */
function getDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

/**
 * 获取指定年月的日期范围
 * @param {number} year - 年份
 * @param {number} month - 月份（1-12）
 * @returns {Object} 包含 start 和 end 的日期范围对象
 */
function getMonthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

/**
 * 获取当前月份的日期范围
 * @returns {Object} 包含 start 和 end 的日期范围对象
 */
function getCurrentMonthRange() {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth() + 1);
}

module.exports = { formatDate, formatDateTime, getDaysAgo, getMonthRange, getCurrentMonthRange };
