/**
 * 主题状态管理
 * 管理深色/浅色模式切换，持久化到 localStorage
 */
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: localStorage.getItem('daily_theme') || 'light',
  }),
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('daily_theme', this.theme)
      this.applyTheme()
    },
    applyTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    initTheme() {
      this.applyTheme()
    },
  },
})
