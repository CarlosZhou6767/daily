<!--
  管理后台 - 数据面板
  展示系统核心指标：总用户数、总打卡数、今日打卡、近7天趋势图
  包含错误边界处理，防止 API 失败导致页面崩溃
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">数据面板</h2>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      closable
      @close="error = ''"
      class="mb-4"
    />

    <!-- 核心指标卡片 -->
    <el-row :gutter="16" class="mb-6">
      <el-col :span="6">
        <el-card shadow="hover" v-loading="loading">
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">{{ dashboard.totalUsers }}</div>
            <div class="text-sm text-gray-500 mt-1">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" v-loading="loading">
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">{{ dashboard.totalCheckins }}</div>
            <div class="text-sm text-gray-500 mt-1">总打卡数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" v-loading="loading">
          <div class="text-center">
            <div class="text-3xl font-bold text-orange-600">{{ dashboard.todayCheckins }}</div>
            <div class="text-sm text-gray-500 mt-1">今日打卡</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" v-loading="loading">
          <div class="text-center">
            <div class="text-3xl font-bold text-purple-600">{{ dashboard.totalPoints }}</div>
            <div class="text-sm text-gray-500 mt-1">总积分</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 近7天趋势 -->
    <el-card shadow="hover" v-loading="loading">
      <template #header>
        <div class="flex justify-between items-center">
          <span>近7天打卡趋势</span>
          <el-button v-if="error" type="primary" size="small" @click="fetchDashboard">重试</el-button>
        </div>
      </template>
      <el-table :data="dashboard.weekData" stripe>
        <el-table-column prop="date" label="日期" />
        <el-table-column prop="userCount" label="打卡人数" />
        <el-table-column prop="checkinCount" label="打卡次数" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 数据面板组件
 * 展示系统核心运营指标，包含错误边界处理防止 API 异常导致白屏
 */
import { ref, onMounted } from 'vue'
import api from '../api'

// 面板数据：总用户数、总打卡数、今日打卡、总积分、近7天趋势
const dashboard = ref({
  totalUsers: 0,
  totalCheckins: 0,
  todayCheckins: 0,
  totalPoints: 0,
  weekData: [],
})

const loading = ref(false)
const error = ref('')

/**
 * 获取仪表盘数据
 * 包含完整的错误处理：区分 401、403、网络错误和通用错误
 */
async function fetchDashboard() {
  loading.value = true
  error.value = ''

  try {
    const res = await api.get('/admin/dashboard')
    
    // 验证响应数据完整性
    if (!res.data) {
      throw new Error('响应数据为空')
    }

    dashboard.value = {
      totalUsers: res.data.totalUsers ?? 0,
      totalCheckins: res.data.totalCheckins ?? 0,
      todayCheckins: res.data.todayCheckins ?? 0,
      totalPoints: res.data.totalPoints ?? 0,
      weekData: res.data.weekData ?? [],
    }
  } catch (err) {
    console.error('获取数据面板失败:', err)
    
    // 根据错误类型显示不同提示
    if (err.response?.status === 401) {
      error.value = '登录已过期，请重新登录'
    } else if (err.response?.status === 403) {
      error.value = '无权访问该页面'
    } else if (!err.response) {
      error.value = '网络连接失败，请检查网络'
    } else {
      error.value = err.message || '获取数据失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
})
</script>