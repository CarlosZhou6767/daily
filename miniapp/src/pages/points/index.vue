<!--
  小程序积分页 - 积分余额和流水记录
-->
<template>
  <view class="container">
    <!-- 积分余额 -->
    <view class="balance-card">
      <text class="balance-label">当前积分</text>
      <text class="balance-value">{{ balance }}</text>
    </view>

    <!-- 流水列表 -->
    <view class="records">
      <view v-for="record in records" :key="record.id" class="record-item">
        <view class="record-info">
          <text class="record-desc">{{ record.description }}</text>
          <text class="record-time">{{ record.createdAt }}</text>
        </view>
        <text class="record-amount" :class="record.amount > 0 ? 'positive' : 'negative'">
          {{ record.amount > 0 ? '+' : '' }}{{ record.amount }}
        </text>
      </view>
    </view>

    <!-- 加载更多 -->
    <button v-if="hasMore" class="load-more" @tap="loadMore">加载更多</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import api from '../../api'

const balance = ref(0)
const records = ref([])
const page = ref(1)
const hasMore = ref(false)

async function fetchBalance() {
  const res = await api.get('/points/balance')
  balance.value = res.data.balance
}

async function fetchRecords() {
  const res = await api.get('/points/log', { page: page.value, pageSize: 20 })
  records.value.push(...res.data.records)
  hasMore.value = page.value < res.data.totalPages
}

function loadMore() {
  page.value++
  fetchRecords()
}

import { onShow } from '@dcloudio/uni-app'
onShow(() => {
  page.value = 1
  records.value = []
  fetchBalance()
  fetchRecords()
})
</script>

<style scoped>
.container { padding: 30rpx; }
.balance-card { background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 24rpx; padding: 40rpx; color: #fff; text-align: center; margin-bottom: 30rpx; }
.balance-label { font-size: 24rpx; opacity: 0.8; display: block; }
.balance-value { font-size: 56rpx; font-weight: bold; display: block; margin-top: 8rpx; }
.record-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.record-info { flex: 1; }
.record-desc { font-size: 26rpx; display: block; }
.record-time { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.record-amount { font-size: 28rpx; font-weight: 500; }
.positive { color: #52c41a; }
.negative { color: #ef4444; }
.load-more { background: #f5f5f5; color: #666; font-size: 24rpx; margin-top: 20rpx; }
</style>
