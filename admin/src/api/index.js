/**
 * 管理后台 API 请求封装
 * 基于 Axios 实例，自动注入管理员 Token，统一错误处理和 401 拦截
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

// 创建 Axios 实例，配置基础路径和超时时间
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 请求拦截器：自动从 localStorage 读取管理员 Token 并注入 Authorization 请求头
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 时清除 Token 并跳转登录页，其他错误弹窗提示
let isRedirecting = false

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        ElMessage.error('登录已过期，请重新登录')
        router.push('/login')
        setTimeout(() => { isRedirecting = false }, 1000)
      }
    } else {
      ElMessage.error(error.response?.data?.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default api
