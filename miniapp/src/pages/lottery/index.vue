<!--
  小程序抽奖页 — 积分抽奖
  展示奖品列表和中奖概率，用户消耗积分进行抽奖，查看中奖结果和历史记录
-->
<template>
  <view class="container">
    <text class="page-title">积分抽奖</text>
    <text class="points-info">当前积分: {{ userPoints }}</text>

    <!-- 奖品列表 -->
    <view class="prize-list">
      <view v-for="prize in prizes" :key="prize.id" class="prize-item">
        <text class="prize-name">{{ prize.name }}</text>
        <text class="prize-prob">{{ (Number(prize.probability || 0) * 100).toFixed(0) }}%</text>
      </view>
    </view>

    <!-- 抽奖按钮 -->
    <button class="draw-btn" @tap="handleDraw" :loading="drawing">
      抽奖（消耗20积分）
    </button>

    <!-- 中奖结果展示 -->
    <view v-if="result" class="result-card">
      <text class="result-text">🎉 {{ result.prizeName }}</text>
      <text v-if="result.pointsReward > 0" class="result-points">+{{ result.pointsReward }} 积分</text>
    </view>

    <!-- 历史抽奖记录 -->
    <view class="records">
      <text class="section-title">抽奖记录</text>
      <view v-for="record in records" :key="record.id" class="record-item">
        <text class="record-name">{{ record.prizeName }}</text>
        <text class="record-time">{{ record.createdAt }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * 抽奖页组件
 * 获取奖品配置、执行抽奖操作、展示中奖结果和历史记录
 */
import { ref } from 'vue'
import api from '../../api'

const prizes = ref([])
const records = ref([])
const drawing = ref(false)
const result = ref(null)
const userPoints = ref(0)

/** 获取所有奖品及其概率配置 */
async function fetchPrizes() {
  try {
    const res = await api.get('/lottery/prizes')
    prizes.value = res.data
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

/** 获取用户的抽奖历史记录 */
async function fetchRecords() {
  try {
    const res = await api.get('/lottery/records', { page: 1, pageSize: 10 })
    records.value = res.data.records
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

/** 获取用户当前积分余额 */
async function fetchUserPoints() {
  try {
    const res = await api.get('/points/balance')
    userPoints.value = res.data.balance
  } catch (err) {
    console.error('获取积分余额失败:', err)
  }
}

/**
 * 执行抽奖操作
 * 调用后端抽奖接口，展示结果后刷新记录列表
 */
async function handleDraw() {
  if (userPoints.value < 20) { uni.showToast({ title: '积分不足', icon: 'none' }); return }
  if (drawing.value) return
  drawing.value = true
  result.value = null

  try {
    const res = await api.post('/lottery/draw')
    result.value = res.data
    await Promise.all([fetchRecords(), fetchUserPoints()])
  } catch (err) {
    uni.showToast({ title: err.message || '抽奖失败', icon: 'none' })
  } finally {
    drawing.value = false
  }
}

// 每次页面显示时重新获取最新数据
import { onShow } from '@dcloudio/uni-app'
onShow(() => {
  fetchPrizes()
  fetchRecords()
  fetchUserPoints()
})
</script>

<style scoped>
.container { padding: 30rpx; }
.page-title { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.points-info { font-size: 26rpx; color: #666; display: block; margin-bottom: 30rpx; }
.prize-list { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 30rpx; }
.prize-item { background: #fff; border-radius: 12rpx; padding: 16rpx 24rpx; display: flex; gap: 12rpx; align-items: center; }
.prize-name { font-size: 26rpx; }
.prize-prob { font-size: 22rpx; color: #999; }
.draw-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 48rpx; margin-bottom: 30rpx; }
.result-card { background: #fff; border-radius: 16rpx; padding: 40rpx; text-align: center; margin-bottom: 30rpx; }
.result-text { font-size: 32rpx; font-weight: bold; display: block; }
.result-points { font-size: 26rpx; color: #52c41a; display: block; margin-top: 8rpx; }
.section-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 16rpx; }
.record-item { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.record-name { font-size: 26rpx; }
.record-time { font-size: 22rpx; color: #999; }
</style>
