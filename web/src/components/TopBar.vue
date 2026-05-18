<!--
  顶部信息栏
  显示打卡天数、积分、今日打卡进度
-->
<template>
  <header class="top-bar">
    <div class="flex items-center gap-6">
      <!-- 连续打卡天数 -->
      <div class="flex items-center gap-2 text-sm">
        <span class="text-amber-500">🔥</span>
        <span class="text-slate-600 dark:text-slate-400">{{ streak }} 天</span>
        <span class="text-slate-400">连续打卡</span>
      </div>
      <!-- 积分 -->
      <div class="flex items-center gap-2 text-sm">
        <span class="text-amber-500">⭐</span>
        <span class="text-slate-600 dark:text-slate-400">{{ userStore.user?.points || 0 }}</span>
        <span class="text-slate-400">总积分</span>
      </div>
      <!-- 今日打卡 -->
      <div class="flex items-center gap-2 text-sm">
        <span class="text-slate-400">○</span>
        <span class="text-slate-600 dark:text-slate-400">{{ todayDone }}/{{ totalTasks }}</span>
        <span class="text-slate-400">今日打卡</span>
      </div>
    </div>

    <!-- 右侧操作 -->
    <div class="flex items-center gap-3">
      <button
        v-if="userStore.isAdmin"
        @click="goToAdmin"
        class="px-3 py-1.5 text-xs text-brand-600 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-400 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
      >
        管理后台
      </button>
      <button
        @click="handleLogout"
        class="px-3 py-1.5 text-xs text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        退出
      </button>
    </div>
  </header>
</template>

<script setup>
/**
 * 顶部信息栏组件
 * 展示连续打卡天数、总积分、今日打卡进度
 * 提供管理后台入口（管理员可见）和退出登录按钮
 */
import { computed } from 'vue'
// Vue Router 路由跳转
import { useRouter } from 'vue-router'
// 用户状态管理
import { useUserStore } from '../stores/user'
// 打卡状态管理
import { useCheckinStore } from '../stores/checkin'

const router = useRouter()
const userStore = useUserStore()
const checkinStore = useCheckinStore()

// 连续打卡天数
const streak = computed(() => checkinStore.streak?.currentStreak || 0)
// 今日打卡进度：已完成数 & 总任务数
const todayDone = computed(() => checkinStore.todayTasks.filter(t => t.checkedIn).length)
const totalTasks = computed(() => checkinStore.todayTasks.length)

/**
 * 跳转管理后台（新窗口打开 /admin）
 */
function goToAdmin() {
  window.open('/admin', '_blank')
}

/**
 * 处理退出登录
 * 调用 store logout → 跳转登录页
 */
function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>
