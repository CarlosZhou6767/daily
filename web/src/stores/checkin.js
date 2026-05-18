/**
 * 打卡状态管理（Pinia Store）
 * 职责：管理今日打卡任务列表、连续天数统计，支持带 TTL 的本地缓存
 *
 * State:
 * - todayTasks: 今日待打卡任务列表
 * - streak: 连续打卡统计 { currentStreak, longestStreak }
 * - lastFetchTime: 上次请求时间戳（用于缓存过期判断）
 *
 * Actions:
 * - fetchToday(force): 获取今日打卡任务，默认缓存 5 分钟
 * - fetchStreak(): 获取连续打卡统计数据
 * - doCheckin(taskId): 执行打卡操作，完成后刷新今日任务和连续天数
 */
import { defineStore } from 'pinia'
import api from '../api'

// 缓存有效期：5 分钟
const CACHE_TTL = 5 * 60 * 1000

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    todayTasks: [],
    streak: { currentStreak: 0, longestStreak: 0 },
    lastFetchTime: null,
    history: null,
  }),
  actions: {
    /**
     * 获取今日打卡任务列表
     * @param {boolean} [force=false] - 是否强制刷新，跳过缓存
     * @returns {Promise<Array>} 今日任务列表
     */
    async fetchToday(force = false) {
      if (!force && this.lastFetchTime && Date.now() - this.lastFetchTime < CACHE_TTL) {
        return this.todayTasks
      }
      const res = await api.get('/checkin/today')
      this.todayTasks = res.data
      this.lastFetchTime = Date.now()
      return res.data
    },
    /**
     * 获取连续打卡统计数据
     * @returns {Promise<Object>} { currentStreak, longestStreak }
     */
    async fetchStreak() {
      const res = await api.get('/checkin/streak')
      this.streak = res.data
      return res.data
    },
    /**
     * 执行打卡操作
     * @param {number} taskId - 任务 ID
     * @returns {Promise<Object>} 打卡结果
     */
    async doCheckin(taskId) {
      const res = await api.post('/checkin', { taskId })
      this.lastFetchTime = null
      await this.fetchToday()
      await this.fetchStreak()
      return res.data
    },
    async fetchHistory(year, month) {
      const res = await api.get('/checkin/history', {
        params: { year, month, page: 1, pageSize: 1000 },
      })
      this.history = res.data
      return res.data
    },
  },
})