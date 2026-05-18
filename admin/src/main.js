/**
 * 管理后台应用入口
 * 初始化 Vue3 + Element Plus（中文语言包）+ Vue Router
 */
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import router from './router'
import App from './App.vue'

const app = createApp(App)
// 注册 Element Plus 组件库，使用中文语言包
app.use(ElementPlus, { locale: zhCn })
// 注册 Vue Router 路由系统
app.use(router)
// 挂载到 #app 根节点
app.mount('#app')
