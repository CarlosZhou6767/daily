/**
 * 路由配置
 * 采用 Vue Router + History 模式，通过路由守卫实现认证拦截
 * 页面组件均使用动态导入（路由懒加载）
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  // 登录页 —— 游客可访问，已登录用户自动跳转首页
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false },
  },
  // 注册页 —— 游客可访问，已登录用户自动跳转首页
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false },
  },
  // 首页/仪表盘 —— 需登录，展示打卡统计与趋势图表
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  // 积分中心 —— 需登录，展示积分余额、流水明细与规则
  {
    path: '/points',
    name: 'PointsCenter',
    component: () => import('../views/PointsCenter.vue'),
    meta: { requiresAuth: true },
  },
  // 幸运转盘抽奖 —— 需登录，Canvas 绘制转盘抽奖
  {
    path: '/lottery',
    name: 'Lottery',
    component: () => import('../views/Lottery.vue'),
    meta: { requiresAuth: true },
  },
  // 打卡记录 —— 需登录，打卡/积分/日志多 Tab 历史查询
  {
    path: '/history',
    name: 'CheckinRecords',
    component: () => import('../views/CheckinRecords.vue'),
    meta: { requiresAuth: true },
  },
  // 个人设置 —— 需登录，修改资料、主题切换、数据管理
  {
    path: '/profile',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  // 使用 HTML5 History 模式（需后端配合处理 404 回退）
  history: createWebHistory(),
  routes,
})

/**
 * 全局路由守卫
 * - 未登录用户访问需认证页面 → 重定向至 /login
 * - 已登录用户访问登录/注册页 → 重定向至首页 /
 * - 普通用户访问管理页面 → 重定向至首页 /
 */
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('daily_token')
  const userStore = useUserStore()
  const isAdmin = userStore.isAdmin

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if ((to.name === 'Login' || to.name === 'Register') && token) {
    next('/')
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next('/')
  } else {
    next()
  }
})

export default router