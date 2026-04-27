<!--
  个人设置页面
  包含：个人信息、外观主题、数据管理
-->
<template>
  <div class="page-container max-w-2xl">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="page-title">个人设置</h1>
      <p class="page-subtitle">个性化你的自律打卡体验</p>
    </div>

    <!-- 个人信息 -->
    <div class="settings-section">
      <h3 class="settings-title">
        <span class="text-brand-600">👤</span> 个人信息
      </h3>

      <div class="space-y-4">
        <!-- 昵称 -->
        <div>
          <label class="block text-xs text-slate-500 mb-1.5">昵称</label>
          <input v-model="nickname" type="text"
            class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
            placeholder="请输入昵称"
          />
        </div>

        <!-- 头像选择 -->
        <div>
          <label class="block text-xs text-slate-500 mb-1.5">头像</label>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="emoji in avatarOptions"
              :key="emoji"
              @click="selectedAvatar = emoji"
              class="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
              :class="selectedAvatar === emoji ? 'bg-brand-100 dark:bg-brand-900/30 ring-2 ring-brand-500' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'"
            >
              {{ emoji }}
            </button>
          </div>
        </div>

        <button @click="saveProfile" class="btn-primary flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          保存修改
        </button>
      </div>
    </div>

    <!-- 外观主题 -->
    <div class="settings-section">
      <h3 class="settings-title">
        <span class="text-blue-500">🎨</span> 外观主题
      </h3>

      <div class="flex items-center justify-between py-2">
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-600 dark:text-slate-400">☀️</span>
          <span class="text-sm text-slate-700 dark:text-slate-300">深色模式</span>
        </div>
        <div class="toggle" :class="{ active: themeStore.theme === 'dark' }" @click="themeStore.toggleTheme()">
          <div class="toggle-dot"></div>
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="settings-section">
      <h3 class="settings-title">
        <span class="text-red-500">⚠️</span> 数据管理
      </h3>
      <p class="text-xs text-slate-400 mb-4">重置将清除所有打卡记录、积分数据，此操作不可撤销。</p>
      <button @click="handleReset" class="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
        🗑️ 重置所有数据
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'
import api from '../api'

const userStore = useUserStore()
const themeStore = useThemeStore()

const nickname = ref(userStore.user?.nickname || '')
const selectedAvatar = ref(userStore.user?.avatar || '😊')

const avatarOptions = ['😊', '🌟', '', '🦊', '🐱', '🦋', '', '⚡', '🔥', '💎']

async function saveProfile() {
  try {
    await api.put('/user/profile', { nickname: nickname.value, avatar: selectedAvatar.value })
    await userStore.fetchProfile()
    alert('保存成功')
  } catch (err) {
    alert(err.message || '保存失败')
  }
}

function handleReset() {
  if (confirm('确定要重置所有数据吗？此操作不可撤销。')) {
    // 实际项目中应调用后端 API
    alert('数据重置功能开发中')
  }
}

onMounted(() => {
  nickname.value = userStore.user?.nickname || ''
  selectedAvatar.value = userStore.user?.avatar || '😊'
})
</script>
