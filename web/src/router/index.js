/**
 * 路由配置
 * 按照新设计原型更新路由
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
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/points',
    name: 'PointsCenter',
    component: () => import('../views/PointsCenter.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/lottery',
    name: 'Lottery',
    component: () => import('../views/Lottery.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/history',
    name: 'CheckinRecords',
    component: () => import('../views/CheckinRecords.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('daily_token')
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
  } else if ((to.name === 'Login' || to.name === 'Register') && token) {
    next('/')
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next('/')
  } else {
    next()
  }
})

export default router
