<!-- 个人记录中心：打卡记录 / 积分流水 / 操作日志 -->
<template>
  <div class="page-container">
    <div class="mb-6">
      <h1 class="page-title">我的记录</h1>
      <p class="page-subtitle">回顾你的自律旅程，查看积分变动和操作历史</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-brand-50 dark:bg-brand-900/20"><span>📅</span></div>
          <div>
            <div class="stat-label">累计打卡天数</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ userStore.user?.totalCheckinDays || 0 }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-orange-50 dark:bg-orange-900/20"><span>🔥</span></div>
          <div>
            <div class="stat-label">最长连续天数</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ longestStreak }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-blue-50 dark:bg-blue-900/20"><span>📊</span></div>
          <div>
            <div class="stat-label">当月打卡率</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ completionRate }}%</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-purple-50 dark:bg-purple-900/20"><span>🎯</span></div>
          <div>
            <div class="stat-label">当前连续天数</div>
            <div class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ currentStreak }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div class="flex border-b border-slate-200 dark:border-slate-700">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="flex-1 py-3 text-sm font-medium transition-colors"
          :class="activeTab === tab.key
            ? 'text-brand-600 border-b-2 border-brand-600'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'">
          {{ tab.label }}
        </button>
      </div>

      <div class="p-6">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <input v-model="filters.keyword" :placeholder="activeTab === 'checkins' ? '搜索任务名称' : '搜索关键词'"
            class="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-48" />
          <select v-if="activeTab === 'points'" v-model="filters.pointsType"
            class="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <option value="">全部类型</option>
            <option value="checkin">打卡</option>
            <option value="image">图片</option>
            <option value="streak">连续奖励</option>
            <option value="lottery">抽奖消耗</option>
            <option value="lottery_reward">抽奖奖励</option>
            <option value="admin_adjust">管理员调整</option>
          </select>
          <select v-if="activeTab === 'logs'" v-model="filters.logAction"
            class="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <option value="">全部操作</option>
            <option value="login">登录</option>
            <option value="logout">登出</option>
            <option value="checkin">打卡</option>
            <option value="lottery_draw">抽奖</option>
            <option value="profile_update">修改资料</option>
            <option value="password_change">修改密码</option>
            <option value="upload">上传图片</option>
            <option value="task_create">创建任务</option>
            <option value="task_delete">删除任务</option>
          </select>
          <div class="flex items-center gap-1 text-sm">
            <input type="date" v-model="filters.startDate"
              class="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
            <span class="text-slate-400">~</span>
            <input type="date" v-model="filters.endDate"
              class="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
          </div>
          <button @click="search" class="px-4 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
            查询
          </button>
          <button v-if="activeTab === 'logs'" @click="exportCSV" class="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            导出CSV
          </button>
        </div>

        <table v-if="activeTab === 'checkins'" class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th class="text-left py-2 text-slate-500 font-medium">日期</th>
              <th class="text-left py-2 text-slate-500 font-medium">任务</th>
              <th class="text-left py-2 text-slate-500 font-medium">积分</th>
              <th class="text-left py-2 text-slate-500 font-medium">状态</th>
              <th class="text-left py-2 text-slate-500 font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" class="border-b border-slate-100 dark:border-slate-800">
              <td class="py-2 text-slate-700 dark:text-slate-300">{{ r.checkinDate }}</td>
              <td class="py-2 text-slate-700 dark:text-slate-300">{{ r.taskName || '-' }}</td>
              <td class="py-2"><span class="text-green-600">+{{ r.pointsEarned }}</span></td>
              <td class="py-2"><span v-if="r.isMakeup" class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">补打卡</span><span v-else class="text-green-600">✓</span></td>
              <td class="py-2 text-slate-500 dark:text-slate-400">{{ r.note || '-' }}</td>
            </tr>
            <tr v-if="records.length === 0">
              <td colspan="5" class="py-8 text-center text-slate-400">暂无打卡记录</td>
            </tr>
          </tbody>
        </table>

        <table v-if="activeTab === 'points'" class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th class="text-left py-2 text-slate-500 font-medium">时间</th>
              <th class="text-left py-2 text-slate-500 font-medium">类型</th>
              <th class="text-left py-2 text-slate-500 font-medium">数量</th>
              <th class="text-left py-2 text-slate-500 font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" class="border-b border-slate-100 dark:border-slate-800">
              <td class="py-2 text-slate-700 dark:text-slate-300">{{ r.createdAt }}</td>
              <td class="py-2">{{ pointsTypeLabel(r.type) }}</td>
              <td class="py-2"><span :class="r.amount > 0 ? 'text-green-600' : 'text-red-500'">{{ r.amount > 0 ? '+' : '' }}{{ r.amount }}</span></td>
              <td class="py-2 text-slate-500 dark:text-slate-400">{{ r.description || '-' }}</td>
            </tr>
            <tr v-if="records.length === 0">
              <td colspan="4" class="py-8 text-center text-slate-400">暂无积分流水</td>
            </tr>
          </tbody>
        </table>

        <table v-if="activeTab === 'logs'" class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th class="text-left py-2 text-slate-500 font-medium">时间</th>
              <th class="text-left py-2 text-slate-500 font-medium">操作</th>
              <th class="text-left py-2 text-slate-500 font-medium">详情</th>
              <th class="text-left py-2 text-slate-500 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" class="border-b border-slate-100 dark:border-slate-800">
              <td class="py-2 text-slate-700 dark:text-slate-300">{{ r.createdAt }}</td>
              <td class="py-2"><span class="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{{ r.action }}</span></td>
              <td class="py-2 text-slate-500 dark:text-slate-400 max-w-xs truncate">{{ r.detail || '-' }}</td>
              <td class="py-2 text-slate-400 font-mono text-xs">{{ r.ip || '-' }}</td>
            </tr>
            <tr v-if="records.length === 0">
              <td colspan="4" class="py-8 text-center text-slate-400">暂无操作日志</td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-center items-center gap-2 mt-4">
          <button @click="page--" :disabled="page <= 1" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-30">上一页</button>
          <span class="text-sm text-slate-500">第 {{ page }} / {{ totalPages || 1 }} 页（共 {{ total }} 条）</span>
          <button @click="page++" :disabled="page >= totalPages" class="px-3 py-1 text-sm border rounded-lg disabled:opacity-30">下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 个人记录中心页面
 * 提供打卡记录、积分流水、操作日志三个 Tab 的历史查询
 * 支持关键词搜索、类型筛选、日期范围过滤，可导出 CSV
 */
import { ref, watch, onMounted, computed } from 'vue'
// 用户状态管理（获取累计打卡天数等统计）
import { useUserStore } from '../stores/user'
// 打卡状态管理（获取连续打卡数据）
import { useCheckinStore } from '../stores/checkin'
import api from '../api'

const userStore = useUserStore()
const checkinStore = useCheckinStore()

// Tab 定义：打卡记录 / 积分流水 / 操作日志
const tabs = [
  { key: 'checkins', label: '打卡记录' },
  { key: 'points', label: '积分流水' },
  { key: 'logs', label: '操作日志' },
]
// 当前激活的 Tab
const activeTab = ref('checkins')
// 当前页数据记录列表
const records = ref([])
// 分页：当前页、总数、总页数
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

// 筛选条件
const filters = ref({
  keyword: '', pointsType: '', logAction: '',
  startDate: '', endDate: '',
})

// 当前连续天数 & 最长连续天数
const currentStreak = computed(() => checkinStore.streak?.currentStreak || 0)
const longestStreak = computed(() => checkinStore.streak?.longestStreak || 0)
// 当月已打卡天数
const monthCheckedDays = ref(0)
// 当月打卡完成率 = 已打卡天数 / 当月已过天数
const completionRate = computed(() => {
  const today = new Date().getDate()
  return today > 0 ? Math.round((monthCheckedDays.value / today) * 100) : 0
})

/**
 * 积分类型中文映射
 * @param {string} type - 积分变动类型标识
 * @returns {string} 中文标签
 */
function pointsTypeLabel(type) {
  const map = { checkin: '打卡', image: '图片', streak: '连续奖励', lottery: '抽奖消耗', lottery_reward: '抽奖奖励', admin_adjust: '管理员调整' }
  return map[type] || type
}

/**
 * 根据当前 Tab 和筛选条件获取数据
 * 打卡记录：按年月查询；积分流水/操作日志：支持类型、关键词、日期范围筛选
 */
async function fetchData() {
  try {
    let res
    if (activeTab.value === 'checkins') {
      const now = new Date()
      const p = { year: now.getFullYear(), month: now.getMonth() + 1, page: page.value, pageSize: 20 }
      if (filters.value.startDate) p.startDate = filters.value.startDate
      if (filters.value.endDate) p.endDate = filters.value.endDate
      if (filters.value.keyword) p.keyword = filters.value.keyword
      res = await api.get('/checkin/history', { params: p })
      records.value = (res.data.records || []).map(r => ({ ...r, taskName: r.taskName || '打卡任务' }))
    } else if (activeTab.value === 'points') {
      const p = { page: page.value, pageSize: 20 }
      if (filters.value.pointsType) p.type = filters.value.pointsType
      res = await api.get('/points/log', { params: p })
      records.value = res.data.records
    } else if (activeTab.value === 'logs') {
      const p = { page: page.value, pageSize: 20 }
      if (filters.value.logAction) p.action = filters.value.logAction
      if (filters.value.keyword) p.keyword = filters.value.keyword
      if (filters.value.startDate) p.startDate = filters.value.startDate
      if (filters.value.endDate) p.endDate = filters.value.endDate
      res = await api.get('/logs/user', { params: p })
      records.value = res.data.records
    }
    total.value = res.data.total || 0
    totalPages.value = res.data.totalPages || 0
  } catch (err) {
    console.error('Failed to fetch data:', err)
  }
}

/**
 * 搜索：重置到第一页后重新加载数据
 */
function getDateParams() {
  const p = {}
  if (filters.value.startDate) p.startDate = filters.value.startDate
  if (filters.value.endDate) p.endDate = filters.value.endDate
  if (filters.value.keyword) p.keyword = filters.value.keyword
  if (activeTab.value === 'points' && filters.value.pointsType) p.type = filters.value.pointsType
  if (activeTab.value === 'logs' && filters.value.logAction) p.action = filters.value.logAction
  return p
}

function search() {
  page.value = 1
  fetchData()
}

/**
 * 导出操作日志为 CSV 文件
 * 通过浏览器新窗口触发后端导出接口下载
 */
async function exportCSV() {
  try {
    const params = { ...getDateParams(), type: activeTab.value, format: 'csv' }
    const blob = await api.get('/logs/user/export', { params, responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab.value}_export.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('导出失败:', err)
  }
}

watch(activeTab, () => { page.value = 1; fetchData() })
watch(page, fetchData)

onMounted(async () => {
  await Promise.all([fetchData(), checkinStore.fetchStreak()])
  try {
    const now = new Date()
    const res = await api.get('/checkin/history', { params: { year: now.getFullYear(), month: now.getMonth() + 1, page: 1, pageSize: 1000 } })
    const uniqueDates = new Set((res.data.records || []).map(r => r.checkinDate))
    monthCheckedDays.value = uniqueDates.size
  } catch (e) { console.error(e) }
})
</script>