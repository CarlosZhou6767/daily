/**
 * 微信小程序 API 请求封装
 * 基于 uni.request，统一处理 Token 注入和错误处理
 */
const BASE_URL = '/api'

/**
 * 封装请求方法
 * @param {string} url - 请求路径（不含基础路径）
 * @param {Object} data - 请求参数
 * @param {string} method - 请求方法
 * @returns {Promise} 响应数据
 */
function request(url, data = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    // 从本地存储获取 Token
    const token = uni.getStorageSync('daily_token')

    uni.request({
      url: BASE_URL + url,
      data,
      method,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res) => {
        // 401 未授权，清除登录态并跳转登录
        if (res.statusCode === 401) {
          uni.removeStorageSync('daily_token')
          uni.removeStorageSync('daily_user')
          uni.reLaunch({ url: '/pages/index/index' })
          reject(new Error('登录已过期'))
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

export default {
  get: (url, data) => request(url, data, 'GET'),
  post: (url, data) => request(url, data, 'POST'),
  put: (url, data) => request(url, data, 'PUT'),
  delete: (url, data) => request(url, data, 'DELETE'),
}
