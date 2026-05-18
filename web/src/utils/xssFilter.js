/**
 * XSS 过滤工具
 * 提供 HTML 转义和 URL 安全校验
 */

/**
 * 转义 HTML 特殊字符，防止 XSS 注入
 * @param {string} text - 原始文本
 * @returns {string} 转义后的安全文本
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return ''
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * 校验 URL 协议，只允许安全的协议
 * @param {string} url - 原始 URL
 * @returns {string} 安全的 URL，若协议不安全则返回空字符串
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') {
    return ''
  }
  const allowedProtocols = /^https?:\/\//i
  const isMailto = /^mailto:/i
  if (allowedProtocols.test(url) || isMailto.test(url)) {
    return url
  }
  return ''
}

export default {
  escapeHtml,
  sanitizeUrl
}
