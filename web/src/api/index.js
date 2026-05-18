/**
 * API 请求封装
 * 基于 Axios，统一处理请求拦截（注入 Token）和响应拦截（错误处理）
 * 所有错误统一处理，包括网络错误、业务错误和认证错误
 */
import axios from 'axios'
import router from '../router'
import { useUserStore } from '../stores/user'

let isRedirecting = false

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截：自动注入 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('daily_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  // 请求发送失败（网络问题等）
  console.error('请求发送失败:', error.message)
  return Promise.reject({ code: 0, message: '网络请求失败，请检查网络连接' })
})

// 响应拦截：统一错误处理
api.interceptors.response.use(
  // 成功响应：直接返回 data 层，简化调用方代码
  (response) => response.data,
  // 错误响应：统一处理各种错误情况
  (error) => {
    // 处理没有响应的情况（网络错误、超时等）
    if (!error.response) {
      const errorMessage = error.code === 'ECONNABORTED' 
        ? '请求超时，请稍后重试' 
        : '网络连接失败，请检查网络'
      return Promise.reject({ code: 0, message: errorMessage })
    }

    const { status, data } = error.response

    // 401 未授权：清除登录态并跳转登录页
    if (status === 401) {
      if (!isRedirecting) {
        isRedirecting = true
        localStorage.removeItem('daily_token')
        localStorage.removeItem('daily_user')
        const userStore = useUserStore()
        userStore.$reset()
        router.push('/login').finally(() => { isRedirecting = false })
      }
      return Promise.reject({ code: 401, message: '登录已过期，请重新登录' })
    }

    // 403 禁止访问
    if (status === 403) {
      return Promise.reject({ code: 403, message: data?.message || '无权访问该资源' })
    }

    // 404 资源不存在
    if (status === 404) {
      return Promise.reject({ code: 404, message: '请求的资源不存在' })
    }

    // 422 参数验证错误
    if (status === 422) {
      return Promise.reject({ code: 422, message: data?.message || '请求参数错误' })
    }

    // 429 请求过于频繁
    if (status === 429) {
      return Promise.reject({ code: 429, message: '请求过于频繁，请稍后重试' })
    }

    // 500+ 服务器错误
    if (status >= 500) {
      return Promise.reject({ code: status, message: '服务器内部错误，请稍后重试' })
    }

    // 其他客户端错误（400, 409 等）
    return Promise.reject({ 
      code: status, 
      message: data?.message || `请求失败 (${status})` 
    })
  }
)

export default api
