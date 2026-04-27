/**
 * Daily 前端应用入口
 * 初始化 Vue3 + Pinia + Vue Router
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import xssFilter from './utils/xssFilter'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.config.globalProperties.$xssFilter = xssFilter
app.mount('#app')
