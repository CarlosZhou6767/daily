<!--
  仪表盘页面
  包含：统计卡片、今日打卡列表、本周趋势图表、打卡日历
-->
<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="page-title">你好，{{ safeNickname }} <span class="text-amber-500">☀️</span></h1>
      <p class="page-subtitle">{{ greetingMessage }}</p>
    </div>

    <!-- 统计卡片行 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon="⭐"
        label="总积分"
        :value="userStore.user?.points || 0"
        sub-text="↑ 持续增长"
        icon-bg="bg-amber-50 dark:bg-amber-900/20"
      />
      <StatCard
        icon="🔥"
        label="连续打卡"
        :value="checkinStore.streak?.currentStreak || 0"
        sub-text="↑ 继续坚持"
        icon-bg="bg-orange-50 dark:bg-orange-900/20"
      />
      <StatCard
        icon="📅"
        label="累计打卡"
        :value="userStore.user?.totalCheckinDays || 0"
        sub-text="↑ 共完成打卡"
        icon-bg="bg-blue-50 dark:bg-blue-900/20"
      />
      <StatCard
        icon="🎯"
        label="本月完成率"
        :value="completionRate + '%'"
        :sub-text="monthCheckedDays + ' / ' + monthTotalDays + ' 天'"
        icon-bg="bg-purple-50 dark:bg-purple-900/20"
      />
    </div>

    <!-- 今日习惯打卡 -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-slate-700 dark:text-slate-300">今日习惯打卡</h2>
        <span class="text-xs text-slate-400">已完成 {{ todayDone }}/{{ totalTasks }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="task in checkinStore.todayTasks"
          :key="task.taskId"
          class="checkin-card"
          :class="{ 'checked': task.checkedIn }"
        >
          <div class="flex items-center gap-4">
            <!-- 任务图标 -->
            <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
              :class="getTaskBgClass(task.name)"
            >
              {{ task.icon }}
            </div>

            <!-- 任务信息 -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ task.name }}</div>
              <div class="text-xs text-slate-400 mt-0.5 truncate">{{ task.description }}</div>
            </div>

            <!-- 右侧操作 -->
            <div class="flex items-center gap-3">
              <!-- 进度环 -->
              <div class="relative w-10 h-10">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke-width="3"
                    class="stroke-slate-100 dark:stroke-slate-700" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke-width="3"
                    :class="getProgressColor(task)"
                    stroke-dasharray="88"
                    :stroke-dashoffset="88 - (88 * (task.checkedIn ? 100 : 0)) / 100"
                    stroke-linecap="round" />
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-500">
                  {{ task.checkedIn ? '100' : '0' }}%
                </span>
              </div>

              <!-- 打卡按钮 -->
              <button
                v-if="!task.checkedIn"
                @click="handleCheckin(task.taskId)"
                :disabled="loading === task.taskId"
                class="btn-checkin btn-checkin-default disabled:opacity-50"
              >
                {{ loading === task.taskId ? '打卡中...' : '✓ 打卡' }}
              </button>
              <span v-else class="btn-checkin btn-checkin-done cursor-default">
                ✓ 打卡
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部图表区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 本周打卡完成率 -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card border border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">本周打卡完成率</h3>
          <span class="text-xs text-slate-400">近7天趋势</span>
        </div>
        <div class="flex items-end gap-3 h-32">
          <div v-for="(day, i) in weekData" :key="i" class="flex-1 flex flex-col items-center gap-1">
            <div class="w-full bg-brand-100 dark:bg-brand-900/30 rounded-t-lg relative" :style="{ height: (day.rate * 100) + '%' }">
              <div class="absolute inset-0 bg-brand-400 dark:bg-brand-500 rounded-t-lg transition-all" :style="{ height: (day.rate * 100) + '%' }"></div>
            </div>
            <span class="text-[10px] text-slate-400">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <!-- 本月打卡日历 -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card border border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">本月打卡日历</h3>
          <span class="text-xs text-slate-400">{{ currentMonthLabel }}</span>
        </div>
        <!-- 星期标题 -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div v-for="d in weekDays" :key="d" class="text-center text-[10px] text-slate-400 py-1">{{ d }}</div>
        </div>
        <!-- 日历格子 -->
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="(cell, i) in calendarCells"
            :key="i"
            class="calendar-circle"
            :class="getCellClass(cell)"
          >
            <span v-if="cell.day">{{ cell.day }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { useCheckinStore } from '../stores/checkin'
import { escapeHtml } from '../utils/xssFilter'
import StatCard from '../components/StatCard.vue'
import api from '../api'

const userStore = useUserStore()
const checkinStore = useCheckinStore()
const loading = ref(null)
const monthCheckedDays = ref(0)
const monthTotalDays = ref(0)

// XSS 过滤后的用户昵称
const safeNickname = computed(() => {
  const nickname = userStore.user?.nickname
  return nickname ? escapeHtml(nickname) : '自律达人'
})

// 问候语
const greetingMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 12) return '今天是坚持的第 ' + (checkinStore.streak?.currentStreak || 0) + ' 天，继续保持！'
  if (hour < 14) return '中午好，记得午间打卡'
  if (hour < 18) return '下午好，继续坚持自律'
  return '晚上好，完成今日目标了吗？'
})

// 今日打卡进度
const todayDone = computed(() => checkinStore.todayTasks.filter(t => t.checkedIn).length)
const totalTasks = computed(() => checkinStore.todayTasks.length)

// 完成率
const completionRate = computed(() => {
  if (monthTotalDays.value === 0) return 0
  return Math.round((monthCheckedDays.value / monthTotalDays.value) * 100)
})

// 当前月份标签
const currentMonthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月`
})

// 星期标题
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 本周数据（模拟）
const weekData = computed(() => {
  const today = new Date()
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const rate = i === 0 ? (totalTasks.value > 0 ? todayDone.value / totalTasks.value : 0) : Math.random() * 0.8 + 0.2
    days.push({
      label: 'W' + (7 - i),
      rate: Math.min(rate, 1),
    })
  }
  return days
})

// 日历单元格
const calendarCells = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: 0, dateStr: '', checked: false, isToday: false })
  }

  const checkedDates = new Set(
    checkinStore.todayTasks.filter(t => t.checkedIn).map(() => now.toISOString().split('T')[0])
  )

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = d === now.getDate()
    cells.push({
      day: d,
      dateStr,
      checked: checkedDates.has(dateStr) || (isToday && todayDone.value > 0),
      isToday,
    })
  }

  return cells
})

// 任务背景色
function getTaskBgClass(name) {
  const map = {
    '早起': 'bg-orange-50 dark:bg-orange-900/20',
    '运动': 'bg-blue-50 dark:bg-blue-900/20',
    '阅读': 'bg-purple-50 dark:bg-purple-900/20',
    '早睡': 'bg-indigo-50 dark:bg-indigo-900/20',
    '健康': 'bg-green-50 dark:bg-green-900/20',
    '早餐': 'bg-amber-50 dark:bg-amber-900/20',
    '喝水': 'bg-cyan-50 dark:bg-cyan-900/20',
  }
  for (const [key, val] of Object.entries(map)) {
    if (name.includes(key)) return val
  }
  return 'bg-brand-50 dark:bg-brand-900/20'
}

// 进度环颜色
function getProgressColor(task) {
  return task.checkedIn ? 'stroke-brand-500' : 'stroke-slate-200 dark:stroke-slate-600'
}

// 日历单元格样式
function getCellClass(cell) {
  if (!cell.day) return 'invisible'
  if (cell.checked && cell.isToday) return 'today'
  if (cell.checked) return 'checked'
  if (cell.isToday) return 'border-2 border-brand-400 text-brand-600 dark:text-brand-400'
  return 'bg-brand-50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400'
}

// 打卡
async function handleCheckin(taskId) {
  loading.value = taskId
  try {
    await checkinStore.doCheckin(taskId)
    await userStore.fetchProfile()
  } catch (err) {
    alert(err.message || '打卡失败')
  } finally {
    loading.value = null
  }
}

// 获取月度打卡数据
async function fetchMonthStats() {
  try {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    monthTotalDays.value = Math.min(now.getDate(), lastDay)
    // 简化计算，实际应从API获取
    monthCheckedDays.value = checkinStore.todayTasks.filter(t => t.checkedIn).length > 0 ? now.getDate() : now.getDate() - 1
  } catch (err) {
    console.error('Failed to fetch month stats:', err)
  }
}

onMounted(async () => {
  await Promise.all([
    checkinStore.fetchToday(),
    checkinStore.fetchStreak(),
  ])
  fetchMonthStats()
})
</script>
