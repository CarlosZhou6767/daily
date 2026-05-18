<!--
  小程序首页 — 用户概览与快捷操作入口
  未登录时引导微信登录；已登录后展示用户信息、打卡统计和导航菜单
  包含完善的错误处理和分类用户提示
-->
<template>
  <view class="container">
    <!-- 未登录状态：展示登录引导 -->
    <view v-if="!isLoggedIn" class="login-prompt">
      <text class="title">Daily 自律打卡</text>
      <text class="subtitle">坚持自律，遇见更好的自己</text>
      <button class="login-btn" @tap="handleLogin" :loading="isLoggingIn">微信登录</button>
    </view>

    <!-- 已登录状态：展示用户概览 -->
    <view v-else class="content">
      <!-- 用户信息卡片 -->
      <view class="user-card">
        <text class="nickname">{{ user.nickname || '用户' }}</text>
        <text class="points">{{ user.points || 0 }} 积分</text>
      </view>

      <!-- 打卡统计数据 -->
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

      <!-- 快捷操作入口 -->
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
/**
 * 首页组件
 * 处理微信登录流程，展示用户概览和快捷导航
 */
import { ref } from 'vue'
import api from '../../api'
import { onShow } from '@dcloudio/uni-app'

// 从本地存储读取缓存的用户信息
const user = ref((() => { try { return JSON.parse(uni.getStorageSync('daily_user') || '{}') } catch(e) { return {} } })())
const streak = ref({ currentStreak: 0, longestStreak: 0 })
const isLoggingIn = ref(false)
const isLoggedIn = ref(!!uni.getStorageSync('daily_token'))

/**
 * 微信登录流程
 * 1. 调用 uni.login 获取微信授权码（code）
 * 2. 将 code 发送至后端换取 JWT Token 和用户信息
 * 3. 将 Token 和用户信息持久化到本地存储
 */
async function handleLogin() {
  // 防止重复点击
  if (isLoggingIn.value) return
  isLoggingIn.value = true

  try {
    // 调用微信登录接口获取临时 code
    const loginResult = await uni.login({ provider: 'weixin' })

    // 检查登录结果
    if (!loginResult || !loginResult.code) {
      throw new Error('微信登录失败：未获取到授权码')
    }

    // 将 code 发送到后端换取 token
    const res = await api.post('/auth/wechat-login', { code: loginResult.code })

    // 验证响应数据
    if (!res.data || !res.data.token) {
      throw new Error('登录响应异常：未获取到令牌')
    }

    // 持久化登录凭证到本地存储
    uni.setStorageSync('daily_token', res.data.token)
    uni.setStorageSync('daily_user', JSON.stringify(res.data.user))
    user.value = res.data.user || {}
    isLoggedIn.value = true
    await fetchStreak()

    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (err) {
    console.error('登录失败:', err)

    // 根据错误类型展示不同的用户提示
    let errorMessage = '登录失败，请重试'
    if (err.message && err.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络'
    } else if (err.message && err.message.includes('超时')) {
      errorMessage = '请求超时，请稍后重试'
    } else if (err.message?.includes('401') || err.message?.includes('过期')) {
      errorMessage = '登录授权失败'
    }

    uni.showToast({ title: errorMessage, icon: 'none', duration: 3000 })
  } finally {
    isLoggingIn.value = false
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

/** 获取用户连续打卡天数 */
async function fetchStreak() {
  try {
    const res = await api.get('/checkin/streak')
    streak.value = res.data
  } catch (err) {
    console.error('获取打卡连续天数失败:', err)
  }
}

onShow(() => {
  isLoggedIn.value = !!uni.getStorageSync('daily_token')
  if (isLoggedIn.value) {
    fetchStreak()
  }
})
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
