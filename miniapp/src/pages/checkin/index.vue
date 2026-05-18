<!--
  小程序打卡页 — 今日打卡任务列表
  展示连续打卡天数、今日任务，支持打卡操作并自动刷新状态
-->
<template>
  <view class="container">
    <!-- 连续打卡天数卡片 -->
    <view class="streak-card">
      <text class="streak-label">当前连续</text>
      <text class="streak-value">{{ streak.currentStreak || 0 }} 天</text>
    </view>

    <!-- 今日打卡任务列表 -->
    <view class="task-list">
      <view v-for="task in todayTasks" :key="task.taskId" class="task-item" :class="{ 'task-done': task.checkedIn }">
        <view class="task-info">
          <text class="task-icon">{{ task.icon }}</text>
          <view>
            <text class="task-name">{{ task.name }}</text>
            <text class="task-desc">{{ task.description }}</text>
          </view>
        </view>
        <button v-if="!task.checkedIn" class="checkin-btn" @tap="handleCheckin(task.taskId)" :loading="loadingTasks.has(task.taskId)">
          打卡
        </button>
        <text v-else class="done-text">✅ 已打卡</text>
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * 打卡页组件
 * 获取今日打卡任务和连续打卡天数，支持打卡交互
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../api'

const todayTasks = ref([])
const streak = ref({ currentStreak: 0, longestStreak: 0 })
const loadingTasks = ref(new Set())

async function fetchToday() {
  try {
    const res = await api.get('/checkin/today')
    todayTasks.value = res.data
  } catch (err) {
    throw err
  }
}

async function fetchStreak() {
  try {
    const res = await api.get('/checkin/streak')
    streak.value = res.data
  } catch (err) {
    throw err
  }
}

async function handleCheckin(taskId) {
  loadingTasks.value.add(taskId)
  try {
    await api.post('/checkin', { taskId })
    uni.showToast({ title: '打卡成功', icon: 'success' })
    await Promise.all([fetchToday(), fetchStreak()])
  } catch (err) {
    uni.showToast({ title: err.message || '打卡失败', icon: 'none' })
  } finally {
    loadingTasks.value.delete(taskId)
  }
}

onShow(async () => {
  try {
    await Promise.all([fetchToday(), fetchStreak()])
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
})
</script>

<style scoped>
.container { padding: 30rpx; }
.streak-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 24rpx; padding: 40rpx; color: #fff; text-align: center; margin-bottom: 30rpx; }
.streak-label { font-size: 24rpx; opacity: 0.8; display: block; }
.streak-value { font-size: 56rpx; font-weight: bold; display: block; margin-top: 8rpx; }
.task-list { display: flex; flex-direction: column; gap: 20rpx; }
.task-item { background: #fff; border-radius: 16rpx; padding: 30rpx; display: flex; justify-content: space-between; align-items: center; }
.task-item.task-done { opacity: 0.6; }
.task-info { display: flex; align-items: center; gap: 20rpx; }
.task-icon { font-size: 40rpx; }
.task-name { font-size: 28rpx; font-weight: 500; display: block; }
.task-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.checkin-btn { background: #667eea; color: #fff; border-radius: 32rpx; font-size: 24rpx; padding: 12rpx 32rpx; }
.done-text { color: #52c41a; font-size: 24rpx; }
</style>
