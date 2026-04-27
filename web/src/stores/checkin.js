/**
 * 打卡状态管理
 * 管理今日打卡数据、连续天数
 */
import { defineStore } from 'pinia'
import api from '../api'

const CACHE_TTL = 5 * 60 * 1000

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    todayTasks: [],
    streak: { currentStreak: 0, longestStreak: 0 },
    lastFetchTime: null,
  }),
  actions: {
    async fetchToday(force = false) {
      if (!force && this.lastFetchTime && Date.now() - this.lastFetchTime < CACHE_TTL) {
        return this.todayTasks
      }
      const res = await api.get('/checkin/today')
      this.todayTasks = res.data
      this.lastFetchTime = Date.now()
      return res.data
    },
    async fetchStreak() {
      const res = await api.get('/checkin/streak')
      this.streak = res.data
      return res.data
    },
    async doCheckin(taskId) {
      const res = await api.post('/checkin', { taskId })
      this.lastFetchTime = null
      await this.fetchToday()
      await this.fetchStreak()
      return res.data
    },
  },
})
