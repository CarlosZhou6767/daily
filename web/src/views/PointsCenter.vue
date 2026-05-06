<!--
  积分中心页面
  包含：积分概览卡片、积分流水列表、积分规则说明、快捷抽奖入口
-->
<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="page-title">积分中心</h1>
      <p class="page-subtitle">坚持打卡，积累积分，兑换精彩奖励</p>
    </div>

    <!-- 积分概览卡片 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-amber-50 dark:bg-amber-900/20">
            <span>⭐</span>
          </div>
          <div>
            <div class="stat-label">总积分</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-200">{{ balance }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-brand-50 dark:bg-brand-900/20">
            <span>💰</span>
          </div>
          <div>
            <div class="stat-label">可用积分</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-200">{{ balance }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-3">
          <div class="stat-icon bg-red-50 dark:bg-red-900/20">
            <span>🎁</span>
          </div>
          <div>
            <div class="stat-label">已消耗积分</div>
            <div class="text-2xl font-bold text-slate-800 dark:text-slate-200">{{ consumedPoints }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 积分流水明细 -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">积分流水明细</h3>
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="record in records" :key="record.id" class="flow-item mx-4 my-2">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  :class="record.amount > 0 ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-red-50 dark:bg-red-900/20'"
                >
                  {{ record.amount > 0 ? '↑' : '↓' }}
                </div>
                <div>
                  <div class="text-sm text-slate-700 dark:text-slate-300">{{ record.description }}</div>
                  <div class="text-xs text-slate-400 mt-0.5">{{ record.createdAt }}</div>
                </div>
              </div>
              <span :class="record.amount > 0 ? 'flow-positive' : 'flow-negative'">
                {{ record.amount > 0 ? '+' : '' }}{{ record.amount }}
              </span>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMore" class="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <button @click="loadMore" class="text-sm text-brand-600 dark:text-brand-400 hover:underline">加载更多</button>
          </div>
        </div>
      </div>

      <!-- 右侧边栏 -->
      <div class="space-y-4">
        <!-- 积分规则说明 -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card border border-slate-100 dark:border-slate-800">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span class="text-brand-600">ℹ️</span> 积分规则说明
          </h3>
          <div class="space-y-3">
            <!-- BUG-OPT-003 修复：积分规则与服务端 config.pointsRules 保持一致 -->
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-2 h-2 rounded-full bg-brand-500"></span>
              <span>每次成功打卡 <span class="font-medium text-brand-600">+5 积分</span></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              <span>连续3天打卡 <span class="font-medium text-green-600">+10 积分奖励</span></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>连续7天打卡 <span class="font-medium text-blue-600">+30 积分奖励</span></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>连续30天打卡 <span class="font-medium text-cyan-600">+100 积分奖励</span></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>参与幸运转盘 <span class="font-medium text-orange-600">-20 积分</span></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>补签历史打卡 <span class="font-medium text-purple-600">-10 积分</span></span>
            </div>
          </div>
        </div>

        <!-- 快捷抽奖入口 -->
        <router-link to="/lottery" class="block bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/30 rounded-2xl p-5 text-center border border-brand-200 dark:border-brand-800 hover:shadow-card-hover transition-all">
          <div class="text-2xl mb-2">🎰</div>
          <div class="text-sm font-medium text-brand-700 dark:text-brand-400">幸运转盘抽奖</div>
          <div class="text-xs text-brand-500 dark:text-brand-500 mt-1">每次消耗 20 积分</div>
          <div class="mt-3">
            <span class="inline-flex items-center gap-1 px-4 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors">
              立即抽奖
            </span>
          </div>
          <div class="text-[10px] text-brand-400 mt-2">剩余 9 次</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const balance = ref(0)
const records = ref([])
const consumedPoints = ref(0)
const page = ref(1)
const hasMore = ref(false)

async function fetchBalance() {
  try {
    const res = await api.get('/points/balance')
    balance.value = res.data.balance
  } catch (err) {
    console.error('Failed to fetch balance:', err)
  }
}

async function fetchRecords() {
  try {
    const res = await api.get('/points/log', { params: { page: page.value, pageSize: 20 } })
    if (page.value === 1) {
      records.value = res.data.records
    } else {
      records.value.push(...res.data.records)
    }
    hasMore.value = page.value < res.data.totalPages
  } catch (err) {
    console.error('Failed to fetch records:', err)
  }
}

/**
 * 获取已消耗积分总数（BUG-OPT-003 修复）
 * 从服务端聚合查询获取，避免前端全量遍历计算
 */
async function fetchConsumedPoints() {
  try {
    const res = await api.get('/points/consumed')
    consumedPoints.value = res.data.total
  } catch (err) {
    console.error('Failed to fetch consumed points:', err)
  }
}

function loadMore() {
  page.value++
  fetchRecords()
}

onMounted(() => {
  fetchBalance()
  fetchRecords()
  fetchConsumedPoints()
})
</script>
