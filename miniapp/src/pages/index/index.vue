<!--
  小程序首页 - 用户概览、快捷操作入口
  未登录时显示登录引导
  包含完善的错误处理和用户提示
-->
<template>
  <view class="container">
    <!-- 未登录状态 -->
    <view v-if="!isLoggedIn" class="login-prompt">
      <text class="title">Daily 自律打卡</text>
      <text class="subtitle">坚持自律，遇见更好的自己</text>
      <button class="login-btn" @tap="handleLogin" :loading="isLoggingIn">微信登录</button>
    </view>

    <!-- 已登录状态 -->
    <view v-else class="content">
      <!-- 用户信息 -->
      <view class="user-card">
        <text class="nickname">{{ user.nickname || '用户' }}</text>
        <text class="points">{{ user.points || 0 }} 积分</text>
      </view>

      <!-- 统计数据 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-value">{{ streak.currentStreak || 0 }}</text>
          <text class="stat-label">连续天数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ user.totalCheckinDays || 0 }}</text>
          <text class="stat-label">总打卡</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ user.points || 0 }}</text>
          <text class="stat-label">积分</text>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="actions">
        <view class="action-item" @tap="goTo('/pages/checkin/index')">
          <text class="action-icon">✅</text>
          <text class="action-text">去打卡</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/lottery/index')">
          <text class="action-icon">🎰</text>
          <text class="action-text">去抽奖</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/points/index')">
          <text class="action-icon">💰</text>
          <text class="action-text">积分</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/profile/index')">
          <text class="action-icon">👤</text>
          <text class="action-text">我的</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../../api'

const user = ref(JSON.parse(uni.getStorageSync('daily_user') || '{}'))
const streak = ref({ currentStreak: 0, longestStreak: 0 })
const isLoggingIn = ref(false)
const isLoggedIn = computed(() => !!uni.getStorageSync('daily_token'))

// 微信登录
async function handleLogin() {
  // 防止重复点击
  if (isLoggingIn.value) return
  isLoggingIn.value = true

  try {
    // 调用微信登录接口
    const loginResult = await uni.login({ provider: 'weixin' })
    
    // 检查登录结果
    if (!loginResult || !loginResult.code) {
      throw new Error('微信登录失败：未获取到授权码')
    }

    // 发送 code 到后端换取 token
    const res = await api.post('/auth/wechat-login', { openid: loginResult.code })
    
    // 验证响应数据
    if (!res.data || !res.data.token) {
      throw new Error('登录响应异常：未获取到令牌')
    }

    // 保存登录态
    uni.setStorageSync('daily_token', res.data.token)
    uni.setStorageSync('daily_user', JSON.stringify(res.data.user))
    user.value = res.data.user

    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (err) {
    console.error('登录失败:', err)
    
    // 根据错误类型显示不同提示
    let errorMessage = '登录失败，请重试'
    if (err.message && err.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络'
    } else if (err.message && err.message.includes('超时')) {
      errorMessage = '请求超时，请稍后重试'
    } else if (err.code === 401) {
      errorMessage = '登录授权失败'
    }

    uni.showToast({ title: errorMessage, icon: 'none', duration: 3000 })
  } finally {
    isLoggingIn.value = false
  }
}

function goTo(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.container { padding: 40rpx; }
.login-prompt { text-align: center; padding-top: 200rpx; }
.title { font-size: 48rpx; font-weight: bold; display: block; }
.subtitle { font-size: 28rpx; color: #999; margin-top: 16rpx; display: block; }
.login-btn { margin-top: 60rpx; background: #07c160; color: #fff; border-radius: 48rpx; }
.user-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 24rpx; padding: 40rpx; color: #fff; }
.nickname { font-size: 36rpx; font-weight: bold; display: block; }
.points { font-size: 24rpx; opacity: 0.8; margin-top: 8rpx; display: block; }
.stats-row { display: flex; justify-content: space-around; margin-top: 30rpx; }
.stat-item { text-align: center; }
.stat-value { font-size: 36rpx; font-weight: bold; display: block; color: #333; }
.stat-label { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.actions { display: flex; justify-content: space-around; margin-top: 40rpx; }
.action-item { text-align: center; }
.action-icon { font-size: 48rpx; display: block; }
.action-text { font-size: 24rpx; color: #666; display: block; margin-top: 8rpx; }
</style>
