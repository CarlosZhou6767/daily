<!--
  小程序个人中心页 — 用户信息、统计数据与功能菜单
  展示用户头像、昵称，打卡/积分统计，以及各页面导航和退出登录
-->
<template>
  <view class="container">
    <!-- 用户基本信息 -->
    <view class="user-card">
      <view class="avatar">{{ (user.nickname || 'U').charAt(0) }}</view>
      <view class="user-info">
        <text class="nickname">{{ user.nickname || '用户' }}</text>
        <text class="username">@{{ user.username || '' }}</text>
      </view>
    </view>

    <!-- 个人统计数据 -->
    <view class="stats-row">
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalCheckinDays || 0 }}</text>
        <text class="stat-label">总打卡</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.longestStreak || 0 }}</text>
        <text class="stat-label">最长连续</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ user.points || 0 }}</text>
        <text class="stat-label">积分</text>
      </view>
    </view>

    <!-- 功能菜单列表 -->
    <view class="menu-list">
      <view class="menu-item" @tap="goTo('/pages/checkin/index')">
        <text>✅ 每日打卡</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goTo('/pages/lottery/index')">
        <text>🎰 积分抽奖</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goTo('/pages/points/index')">
        <text>💰 积分明细</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goTo('/pages/profile/records')">
        <text>📋 我的记录</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="handleLogout">
        <text class="logout-text">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * 个人中心页组件
 * 展示用户信息、个人统计数据，提供功能导航和退出登录
 */
import { ref } from 'vue'
import api from '../../api'

// 从本地存储读取缓存的用户信息
const user = ref((() => { try { return JSON.parse(uni.getStorageSync('daily_user') || '{}') } catch(e) { return {} } })())
const stats = ref({ totalCheckinDays: 0, longestStreak: 0, totalLottery: 0 })

/** 获取用户统计数据 */
async function fetchStats() {
  try {
    const res = await api.get('/user/stats')
    stats.value = res.data
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function goTo(url) {
  const tabBarPages = ['/pages/index/index', '/pages/points/index', '/pages/lottery/index', '/pages/profile/index']
  if (tabBarPages.some(p => url.startsWith(p))) {
    uni.switchTab({ url })
  } else {
    uni.navigateTo({ url })
  }
}

/**
 * 退出登录
 * 清除本地存储的登录凭证，并使用 uni.reLaunch 重定向到首页
 */
function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('daily_token')
        uni.removeStorageSync('daily_user')
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}

// 每次页面显示时重新获取统计数据
import { onShow } from '@dcloudio/uni-app'
onShow(() => {
  try { user.value = JSON.parse(uni.getStorageSync('daily_user') || '{}') } catch(e) { user.value = {} }
  fetchStats()
})
</script>

<style scoped>
.container { padding: 30rpx; }
.user-card { display: flex; align-items: center; gap: 24rpx; margin-bottom: 30rpx; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: bold; }
.nickname { font-size: 32rpx; font-weight: bold; display: block; }
.username { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.stats-row { display: flex; justify-content: space-around; background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 30rpx; }
.stat-item { text-align: center; }
.stat-value { font-size: 36rpx; font-weight: bold; display: block; color: #333; }
.stat-label { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.menu-list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #f0f0f0; font-size: 28rpx; }
.arrow { color: #ccc; font-size: 32rpx; }
.logout-text { color: #ef4444; }
</style>
