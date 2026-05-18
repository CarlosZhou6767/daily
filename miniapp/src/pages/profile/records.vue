<!--
  小程序我的记录页 — 打卡、积分、日志分类记录
  支持 Tab 切换查看不同类型的记录，分页加载更多数据
-->
<template>
  <view class="container">
    <!-- Tab 切换栏 -->
    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.key" class="tab-item" :class="{ active: activeTab === tab.key }" @tap="switchTab(tab.key)">
        {{ tab.label }}
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="list">
      <!-- 打卡记录 -->
      <view v-for="item in records" :key="item.id" class="list-item">
        <view v-if="activeTab === 'checkins'" class="row">
          <text class="date">{{ item.checkinDate }}</text>
          <text class="points green">+{{ item.pointsEarned }}</text>
        </view>
        <!-- 积分记录 -->
        <view v-if="activeTab === 'points'" class="row">
          <text class="desc">{{ item.description || item.type }}</text>
          <text :class="item.amount > 0 ? 'green' : 'red'">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}</text>
        </view>
        <!-- 操作日志记录 -->
        <view v-if="activeTab === 'logs'" class="row">
          <text class="desc">{{ item.action }}</text>
          <text class="time">{{ item.createdAt }}</text>
        </view>
        <!-- 附加信息行 -->
        <text class="extra" v-if="item.note && activeTab === 'checkins'">{{ item.note }}</text>
        <text class="extra" v-if="item.createdAt && activeTab === 'points'">{{ item.createdAt }}</text>
        <text class="extra" v-if="item.detail && activeTab === 'logs'">{{ item.detail }}</text>
      </view>
      <!-- 空状态提示 -->
      <view v-if="records.length === 0" class="empty">暂无记录</view>
    </view>

    <!-- 分页加载 -->
    <view v-if="hasMore" class="load-more" @tap="loadMore">加载更多</view>
    <view v-else class="no-more">没有更多了</view>
  </view>
</template>

<script setup>
/**
 * 我的记录页组件
 * 支持打卡/积分/日志三类记录的分页查询和 Tab 切换
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../api'

/** Tab 配置：key 对应后端分类标识，label 为展示文本 */
const tabs = [
  { key: 'checkins', label: '打卡' },
  { key: 'points', label: '积分' },
  { key: 'logs', label: '日志' },
]
const activeTab = ref('checkins')
const records = ref([])
const page = ref(1)
const hasMore = ref(false)

/**
 * 根据当前激活的 Tab 获取对应类型的记录数据
 * @param {boolean} reset - 是否重置分页（切换 Tab 时传入 true）
 */
async function fetchData(reset = false) {
  if (!reset && loadingMore.value) return
  loadingMore.value = true
  try {
    if (reset) { page.value = 1; records.value = [] }
    const p = page.value
    let res
    if (activeTab.value === 'checkins') {
      const now = new Date()
      res = await api.get('/checkin/history', { year: now.getFullYear(), month: now.getMonth() + 1, page: p, pageSize: 20 })
      records.value = [...records.value, ...(res.data.records || [])]
    } else if (activeTab.value === 'points') {
      res = await api.get('/points/log', { page: p, pageSize: 20 })
      records.value = [...records.value, ...(res.data.records || [])]
    } else {
      res = await api.get('/logs/user', { page: p, pageSize: 20 })
      records.value = [...records.value, ...(res.data.records || [])]
    }
    hasMore.value = p < (res.data.totalPages || 1)
    if (hasMore.value) page.value = p + 1
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

/** 切换 Tab 并重置分页加载新数据 */
function switchTab(key) {
  activeTab.value = key
  fetchData(true)
}

/** 加载下一页数据 */
function loadMore() {
  fetchData()
}

// 组件挂载时首次加载数据
onShow(() => fetchData(true))
</script>

<style scoped>
.container { padding: 20rpx; }
.tabs { display: flex; background: #fff; border-radius: 12rpx; margin-bottom: 20rpx; overflow: hidden; }
.tab-item { flex: 1; text-align: center; padding: 20rpx; font-size: 28rpx; color: #666; border-bottom: 4rpx solid transparent; }
.tab-item.active { color: #6172f3; border-bottom-color: #6172f3; font-weight: bold; }
.list { background: #fff; border-radius: 12rpx; overflow: hidden; }
.list-item { padding: 24rpx; border-bottom: 1rpx solid #f0f0f0; }
.row { display: flex; justify-content: space-between; align-items: center; }
.date, .desc { font-size: 28rpx; color: #333; }
.time { font-size: 24rpx; color: #999; }
.points { font-weight: bold; }
.green { color: #16a34a; }
.red { color: #ef4444; }
.extra { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.empty { text-align: center; padding: 80rpx; color: #999; font-size: 28rpx; }
.load-more, .no-more { text-align: center; padding: 30rpx; font-size: 26rpx; color: #999; }
</style>