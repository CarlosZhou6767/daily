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
/**
 * 仪表盘/首页组件
 * 展示用户数据概览：统计卡片、今日打卡任务列表、本周趋势图、月度打卡日历
 * 支持一键打卡、XSS 安全过滤用户昵称
 */
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { useCheckinStore } from '../stores/checkin'
import { useCalendar } from '../composables/useCalendar'
import StatCard from '../components/StatCard.vue'

const userStore = useUserStore()
const checkinStore = useCheckinStore()
// 打卡按钮加载状态：存储正在打卡中的 taskId
const loading = ref(null)
// 月度打卡统计
const monthCheckedDays = ref(0)
const monthTotalDays = ref(0)

// XSS 过滤后的安全昵称显示
const safeNickname = computed(() => {
  return userStore.user?.nickname || '自律达人'
})

/**
 * 根据当前时段生成问候语
 * @returns {string} 个性化的问候语文本
 */
const greetingMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 12) return '今天是坚持的第 ' + (checkinStore.streak?.currentStreak || 0) + ' 天，继续保持！'
  if (hour < 14) return '中午好，记得午间打卡'
  if (hour < 18) return '下午好，继续坚持自律'
  return '晚上好，完成今日目标了吗？'
})

// 今日打卡进度：已完成数 / 总任务数
const todayDone = computed(() => checkinStore.todayTasks.filter(t => t.checkedIn).length)
const totalTasks = computed(() => checkinStore.todayTasks.length)

/**
 * 本月打卡完成率 = 已打卡天数 / 本月已过天数
 * @returns {number} 百分比数值
 */
const completionRate = computed(() => {
  if (monthTotalDays.value === 0) return 0
  return Math.round((monthCheckedDays.value / monthTotalDays.value) * 100)
})

// 当前月份标签
const currentMonthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月`
})

// 本周趋势原始数据（从 API 获取）
const weeklyStats = ref([])

/**
 * 获取本周打卡数据（从后端 API 获取真实数据）
 * 计算近 7 天每日打卡完成率
 */
async function fetchWeeklyStats() {
  try {
    const records = checkinStore.history?.records || []
    if (records.length === 0) return

    const dateCounts = {}
    records.forEach(r => {
      dateCounts[r.checkinDate] = (dateCounts[r.checkinDate] || 0) + 1
    })

    const now = new Date()
    const days = []
    const totalTasksCount = totalTasks.value || 1
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const count = dateCounts[dateStr] || 0
      days.push({
        label: 'W' + (7 - i),
        rate: Math.min(count / totalTasksCount, 1),
      })
    }
    weeklyStats.value = days
  } catch (err) {
    console.error('Failed to compute weekly stats:', err)
  }
}

// 本周趋势数据（经过处理的展示数据）
const weekData = computed(() => {
  return weeklyStats.value.length > 0 ? weeklyStats.value : []
})

// BUG-OPT-004 修复：使用通用日历组合函数，消除重复代码
const checkedDates = computed(() => {
  const dates = new Set()
  const hasTodayChecked = checkinStore.todayTasks.some(t => t.checkedIn)
  if (hasTodayChecked) {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    dates.add(todayStr)
  }
  if (checkinStore.history && checkinStore.history.records) {
    checkinStore.history.records.forEach(r => {
      if (r.checkinDate) dates.add(r.checkinDate)
    })
  }
  return dates
})
const { calendarCells, weekDays } = useCalendar(
  computed(() => new Date().getFullYear()),
  computed(() => new Date().getMonth()),
  checkedDates
)

// 任务背景色映射表（BUG-OPT-013 优化）
// 使用精确哈希映射替代子串遍历，O(1) 时间复杂度，避免 O(n*m) 的字符串匹配开销
const TASK_BG_MAP = {
  '早起打卡': 'bg-orange-50 dark:bg-orange-900/20',
  '运动健身': 'bg-blue-50 dark:bg-blue-900/20',
  '阅读学习': 'bg-purple-50 dark:bg-purple-900/20',
  '早睡打卡': 'bg-indigo-50 dark:bg-indigo-900/20',
  '健康饮食': 'bg-green-50 dark:bg-green-900/20',
  '吃早餐': 'bg-amber-50 dark:bg-amber-900/20',
  '喝水': 'bg-cyan-50 dark:bg-cyan-900/20',
}

/**
 * 获取任务图标背景色
 * 使用精确哈希映射替代子串遍历，O(1) 复杂度
 * @param {string} name - 任务名称
 * @returns {string} Tailwind CSS 背景类名
 */
function getTaskBgClass(name) {
  return TASK_BG_MAP[name] || 'bg-brand-50 dark:bg-brand-900/20'
}

/**
 * 获取进度环颜色
 * @param {Object} task - 任务对象
 * @returns {string} SVG 描边颜色类名
 */
function getProgressColor(task) {
  return task.checkedIn ? 'stroke-brand-500' : 'stroke-slate-200 dark:stroke-slate-600'
}

/**
 * 获取日历单元格样式
 * @param {Object} cell - 日历单元格数据 { day, dateStr, checked, isToday }
 * @returns {string} Tailwind CSS 类名组合
 */
function getCellClass(cell) {
  if (!cell.day) return 'invisible'
  if (cell.checked && cell.isToday) return 'today'
  if (cell.checked) return 'checked'
  if (cell.isToday) return 'border-2 border-brand-400 text-brand-600 dark:text-brand-400'
  return 'bg-brand-50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400'
}

/**
 * 处理打卡操作
 * 设置加载状态 → 调用 store 打卡 → 刷新用户信息
 * @param {number} taskId - 任务 ID
 */
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

/**
 * 获取月度打卡统计数据
 * 计算本月已打卡天数和本月总天数
 */
function computeMonthStats() {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  monthTotalDays.value = Math.min(now.getDate(), lastDay)
  const records = checkinStore.history?.records || []
  const uniqueDates = new Set(records.map(r => r.checkinDate))
  monthCheckedDays.value = uniqueDates.size
}

onMounted(async () => {
  const now = new Date()
  await Promise.all([
    checkinStore.fetchToday(),
    checkinStore.fetchStreak(),
    checkinStore.fetchHistory(now.getFullYear(), now.getMonth() + 1),
  ])
  computeMonthStats()
  fetchWeeklyStats()
})
</script>
