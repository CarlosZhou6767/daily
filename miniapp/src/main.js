/**
 * 微信小程序入口文件
 * 使用 uni-app 框架，基于 Vue3 SSR 模式初始化应用
 * 导出 createApp 函数供 uni-app 引擎调用
 */
import { createSSRApp } from 'vue'
import App from './App.vue'

/** 创建并返回 SSR 应用实例 */
export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
