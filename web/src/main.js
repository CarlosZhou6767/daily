/**
 * Daily 前端应用入口
 * 初始化 Vue3 + Pinia + Vue Router，注册全局 XSS 过滤器
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)
// 注册 Pinia 状态管理
app.use(createPinia())
// 注册 Vue Router 路由
app.use(router)
app.mount('#app')