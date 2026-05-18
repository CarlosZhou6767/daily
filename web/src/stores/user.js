/**
 * 用户状态管理（Pinia Store）
 * 职责：管理登录态、用户信息、Token 持久化，提供登录/注册/登出操作
 *
 * State:
 * - user: 当前用户信息对象（从 localStorage 恢复）
 * - token: JWT Token 字符串（从 localStorage 恢复）
 * - profileLastFetch: 用户信息上次请求时间（缓存判断）
 *
 * Getters:
 * - isLoggedIn: 基于 token 判断是否已登录
 * - isAdmin: 基于 user.isAdmin 判断是否为管理员
 *
 * Actions:
 * - login(username, password): 用户登录，保存 token 和用户信息到 localStorage
 * - register(username, password, nickname): 用户注册
 * - fetchProfile(force): 刷新用户信息，默认缓存 5 分钟
 * - logout(): 退出登录，清除所有状态和本地存储
 */
import { defineStore } from 'pinia'
import api from '../api'

// 用户信息缓存有效期：5 分钟
const PROFILE_CACHE_TTL = 5 * 60 * 1000

export const useUserStore = defineStore('user', {
  state: () => ({
    // 从 localStorage 恢复登录态（延迟解析，仅在本地存储有值时执行 JSON.parse）
    user: (() => {
      try {
        const stored = localStorage.getItem('daily_user')
        return stored ? JSON.parse(stored) : null
      } catch {
        localStorage.removeItem('daily_user')
        return null
      }
    })(),
    // JWT Token
    token: localStorage.getItem('daily_token') || '',
    // 用户信息上次请求时间（用于缓存判断）
    profileLastFetch: null,
  }),
  getters: {
    // 是否已登录：token 非空即为已登录
    isLoggedIn: (state) => !!state.token,
    // 是否管理员：user.isAdmin === 1
    isAdmin: (state) => state.user?.isAdmin === 1,
  },
  actions: {
    /**
     * 用户登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Promise<Object>} 登录结果 { token, user }
     */
    async login(username, password) {
      const res = await api.post('/auth/login', { username, password })
      this.token = res.data.token
      this.user = res.data.user
      // 清除用户信息缓存，确保下次 fetchProfile 重新请求
      this.profileLastFetch = null
      // 持久化存储
      localStorage.setItem('daily_token', res.data.token)
      localStorage.setItem('daily_user', JSON.stringify(res.data.user))
      return res
    },
    /**
     * 用户注册
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @param {string} nickname - 昵称（可选）
     * @returns {Promise<Object>} 注册结果
     */
    async register(username, password, nickname) {
      const res = await api.post('/auth/register', { username, password, nickname })
      return res
    },
    /**
     * 刷新用户信息
     * @param {boolean} [force=false] - 是否强制刷新，跳过缓存
     * @returns {Promise<Object>} 最新用户信息
     */
    async fetchProfile(force = false) {
      if (!force && this.profileLastFetch && Date.now() - this.profileLastFetch < PROFILE_CACHE_TTL) {
        return this.user
      }
      const res = await api.get('/user/profile')
      this.user = res.data
      this.profileLastFetch = Date.now()
      // 同步更新 localStorage
      localStorage.setItem('daily_user', JSON.stringify(res.data))
      return res.data
    },
    /**
     * 退出登录
     * 清除 state、localStorage 中的所有登录态
     */
    logout() {
      this.user = null
      this.token = ''
      this.profileLastFetch = null
      localStorage.removeItem('daily_token')
      localStorage.removeItem('daily_user')
    },
  },
})