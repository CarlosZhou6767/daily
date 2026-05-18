/**
 * 管理后台路由配置
 * - 登录页：无需认证，已登录用户自动重定向到首页
 * - 主布局：需管理员认证，包含侧边栏菜单和子路由内容区
 * - 路由守卫：校验 Token 和管理员身份，未授权重定向到登录页
 */
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // 登录页路由：无需认证，独立页面（不含侧边栏布局）
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false },
  },
  // 主布局路由：需管理员认证，包含侧边栏导航
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      // 数据面板：系统核心指标概览
      { path: '', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
      // 用户管理：用户列表、搜索、启用/禁用
      { path: 'users', name: 'UserManage', component: () => import('../views/UserManage.vue') },
      // 打卡管理：打卡记录查看、管理员补打卡
      { path: 'checkins', name: 'CheckinManage', component: () => import('../views/CheckinManage.vue') },
      // 积分管理：积分流水查看、手动调整用户积分
      { path: 'points', name: 'PointsManage', component: () => import('../views/PointsManage.vue') },
      // 奖品管理：奖品CRUD、抽奖记录查看
      { path: 'lottery', name: 'LotteryManage', component: () => import('../views/LotteryManage.vue') },
      // 图片管理：查看所有上传的图片资源
      { path: 'images', name: 'ImageManage', component: () => import('../views/ImageManage.vue') },
      // 数据备份：一键备份数据库和上传文件
      { path: 'backup', name: 'BackupManage', component: () => import('../views/BackupManage.vue') },
      // 日志中心：管理员操作/用户行为/系统/错误日志
      { path: 'logs', name: 'AdminLogs', component: () => import('../views/AdminLogs.vue') },
    ],
  },
]

const router = createRouter({
  // 使用 HTML5 History 模式，需要服务端配置回退
  history: createWebHistory(),
  routes,
})

/**
 * 全局前置路由守卫
 * - 校验规则：
 *   1. 需认证页面但无 Token → 重定向到 /login
 *   2. 已登录访问 /login → 重定向到 /
 *   3. 需认证页面但非管理员 → 重定向到 /login
 * - admin_user 中的 isAdmin 字段兼容布尔值和数字类型
 */
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  const adminUser = localStorage.getItem('admin_user')
  let user = null
  try {
    user = adminUser ? JSON.parse(adminUser) : null
  } catch (e) {
    user = null
  }
  // 兼容 isAdmin 为布尔值 true 或数字 1 的情况
  const isAdmin = user && (user.isAdmin === true || user.isAdmin === 1)

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else if (to.meta.requiresAuth && !isAdmin) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    next('/login')
  } else {
    next()
  }
})

export default router