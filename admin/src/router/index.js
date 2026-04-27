/**
 * 管理后台路由配置
 * 包含登录页和主布局（侧边栏+内容区）
 */
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'users', name: 'UserManage', component: () => import('../views/UserManage.vue') },
      { path: 'checkins', name: 'CheckinManage', component: () => import('../views/CheckinManage.vue') },
      { path: 'points', name: 'PointsManage', component: () => import('../views/PointsManage.vue') },
      { path: 'lottery', name: 'LotteryManage', component: () => import('../views/LotteryManage.vue') },
      { path: 'images', name: 'ImageManage', component: () => import('../views/ImageManage.vue') },
      { path: 'backup', name: 'BackupManage', component: () => import('../views/BackupManage.vue') },
      { path: 'logs', name: 'AdminLogs', component: () => import('../views/AdminLogs.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫：未登录或非管理员重定向到登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  const dailyUser = localStorage.getItem('daily_user')
  let user = null
  try {
    user = dailyUser ? JSON.parse(dailyUser) : null
  } catch (e) {
    user = null
  }
  const isAdmin = user && user.isAdmin === true

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else if (to.meta.requiresAuth && !isAdmin) {
    next('/login')
  } else {
    next()
  }
})

export default router
