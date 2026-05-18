/**
 * 微信小程序 API 请求封装
 * 基于 uni.request，统一处理 Token 注入、401 拦截和错误处理
 */

/** API 基础路径 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

let isRedirecting401 = false

function request(url, data = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    if (!BASE_URL) {
      reject(new Error('API地址未配置，请设置VITE_API_BASE_URL'))
      return
    }

    const token = uni.getStorageSync('daily_token')

    uni.request({
      url: BASE_URL + url,
      data,
      method,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode === 401) {
          uni.removeStorageSync('daily_token')
          uni.removeStorageSync('daily_user')
          if (!isRedirecting401) {
            isRedirecting401 = true
            uni.reLaunch({ url: '/pages/index/index' })
          }
          reject(new Error('登录已过期'))
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          isRedirecting401 = false
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
