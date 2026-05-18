/**
 * 主题状态管理（Pinia Store）
 * 职责：管理深色/浅色模式切换，持久化到 localStorage，初始化时自动应用到 DOM
 *
 * State:
 * - theme: 当前主题 'light' | 'dark'（优先读取 localStorage）
 *
 * Actions:
 * - toggleTheme(): 切换深浅主题
 * - applyTheme(): 将当前主题应用到 HTML class
 * - initTheme(): 初始化时调用，应用已保存的主题
 */
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // 当前主题：优先从 localStorage 恢复，默认浅色模式
    theme: ['light', 'dark'].includes(localStorage.getItem('daily_theme'))
      ? localStorage.getItem('daily_theme')
      : 'light',
  }),
  actions: {
    /**
     * 切换深浅色主题
     * 更新 state → 持久化存储 → 应用到 DOM
     */
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('daily_theme', this.theme)
      this.applyTheme()
    },
    /**
     * 将当前主题应用到 HTML class
     * 深色模式时添加 'dark' class，触发 Tailwind dark: 变体
     */
    applyTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    /**
     * 初始化主题
     * 在 App 挂载时调用，确保页面加载时主题立即可用
     */
    initTheme() {
      this.applyTheme()
    },
  },
})