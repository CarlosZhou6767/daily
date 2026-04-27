<!--
  打卡记录页面
  包含：统计卡片、月度日历视图
-->
<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="page-title">打卡记录</h1>
      <p class="page-subtitle">回顾你的自律旅程，见证每一份坚持</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-brand-50 dark:bg-brand-900/20">
            <span>📅</span>
          </div>
          <div>
            <div class="stat-label">累计打卡天数</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ userStore.user?.totalCheckinDays || 0 }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-orange-50 dark:bg-orange-900/20">
            <span>🔥</span>
          </div>
          <div>
            <div class="stat-label">最长连续天数</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ longestStreak }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-blue-50 dark:bg-blue-900/20">
            <span>📊</span>
          </div>
          <div>
            <div class="stat-label">当月打卡率</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ completionRate }}%</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-purple-50 dark:bg-purple-900/20">
            <span>🎯</span>
          </div>
          <div>
            <div class="stat-label">当前连续天数</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ currentStreak }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 月度日历 -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-800">
      <!-- 月份切换 -->
      <div class="flex items-center justify-between mb-6">
        <button @click="prevMonth" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ currentMonthLabel }}</h3>
        <button @click="nextMonth" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- 星期标题 -->
      <div class="grid grid-cols-7 gap-2 mb-3">
        <div v-for="d in weekDays" :key="d" class="text-center text-xs text-slate-400 py-2">{{ d }}</div>
      </div>

      <!-- 日历格子 -->
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="(cell, i) in calendarCells"
          :key="i"
          class="w-12 h-12 md:w-16 md:h-16 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-all"
          :class="getCellClass(cell)"
        >
          <span v-if="cell.day">{{ cell.day }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { useCheckinStore } from '../stores/checkin'

const userStore = useUserStore()
const checkinStore = useCheckinStore()

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const checkedDates = ref(new Set())

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const currentMonthLabel = computed(() => `${viewYear.value}年${viewMonth.value + 1}月`)
const currentStreak = computed(() => checkinStore.streak?.currentStreak || 0)
const longestStreak = computed(() => checkinStore.streak?.longestStreak || 0)
const completionRate = computed(() => {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const today = now.getDate()
  return today > 0 ? Math.round((checkedDates.value.size / today) * 100) : 0
})

// 日历单元格
const calendarCells = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstDay = new Date(year, month, 1)
  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const now = new Date()
  const cells = []

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: 0, dateStr: '', checked: false, isToday: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate()
    cells.push({
      day: d,
      dateStr,
      checked: checkedDates.value.has(dateStr),
      isToday,
    })
  }

  return cells
})

function getCellClass(cell) {
  if (!cell.day) return 'invisible'
  if (cell.checked && cell.isToday) return 'bg-brand-600 text-white shadow-lg scale-110'
  if (cell.checked) return 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
  if (cell.isToday) return 'border-2 border-brand-400 text-brand-600 dark:text-brand-400'
  if (cell.dateStr && new Date(cell.dateStr) > new Date()) return 'text-slate-300 dark:text-slate-600'
  return 'text-slate-400 dark:text-slate-500'
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

// 获取历史打卡记录填充日历
async function fetchCheckinHistory() {
  try {
    const res = await api.get('/checkin/history', { params: { page: 1, pageSize: 100 } })
    checkedDates.value = new Set(res.data.records.map(r => r.checkinDate))
  } catch (err) {
    console.error('Failed to fetch history:', err)
  }
}

import api from '../api'

onMounted(async () => {
  await Promise.all([
    checkinStore.fetchStreak(),
    fetchCheckinHistory(),
  ])
})
</script>
