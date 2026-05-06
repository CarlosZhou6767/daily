/**
 * 用户状态管理
 * 管理登录态、用户信息、Token 持久化
 */
import { defineStore } from 'pinia'
import api from '../api'

const PROFILE_CACHE_TTL = 5 * 60 * 1000

export const useUserStore = defineStore('user', {
  state: () => ({
    // 从 localStorage 恢复登录态
    // BUG-OPT-015 优化：延迟解析，仅在本地存储有值时执行 JSON.parse
    // 避免不必要的 JSON 解析操作，减少内存分配
    user: (() => {
      const stored = localStorage.getItem('daily_user')
      return stored ? JSON.parse(stored) : null
    })(),
    token: localStorage.getItem('daily_token') || '',
    profileLastFetch: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.isAdmin === 1,
  },
  actions: {
    // 用户登录
    async login(username, password) {
      const res = await api.post('/auth/login', { username, password })
      this.token = res.data.token
      this.user = res.data.user
      this.profileLastFetch = null
      localStorage.setItem('daily_token', res.data.token)
      localStorage.setItem('daily_user', JSON.stringify(res.data.user))
      return res
    },
    // 用户注册
    async register(username, password, nickname) {
      const res = await api.post('/auth/register', { username, password, nickname })
      return res
    },
    // 刷新用户信息
    async fetchProfile(force = false) {
      if (!force && this.profileLastFetch && Date.now() - this.profileLastFetch < PROFILE_CACHE_TTL) {
        return this.user
      }
      const res = await api.get('/user/profile')
      this.user = res.data
      this.profileLastFetch = Date.now()
      localStorage.setItem('daily_user', JSON.stringify(res.data))
      return res.data
    },
    // 退出登录
    logout() {
      this.user = null
      this.token = ''
      this.profileLastFetch = null
      localStorage.removeItem('daily_token')
      localStorage.removeItem('daily_user')
    },
  },
})
