<!--
  侧边栏导航组件
  按照设计原型：Logo + 导航菜单 + 底部信息
-->
<template>
  <aside class="sidebar">
    <!-- Logo 区域 -->
    <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <div>
          <div class="font-bold text-slate-800 dark:text-slate-200 text-sm">自律打卡</div>
          <div class="text-[10px] text-slate-400">SelfDiscipline</div>
        </div>
      </div>
    </div>

    <!-- 用户信息 -->
    <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-lg">
          {{ avatar }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{{ userStore.user?.nickname || '用户' }}</div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-brand-600 dark:text-brand-400">连续 {{ streak }} 天</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="flex-1 py-3 space-y-1 overflow-y-auto">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="sidebar-nav-item"
        active-class="active"
      >
        <span class="text-base">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="badge-new ml-auto">{{ item.badge }}</span>
      </router-link>
    </nav>

    <!-- 底部信息 -->
    <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800">
      <button
        @click="themeStore.toggleTheme()"
        class="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <span class="text-base">{{ themeStore.theme === 'light' ? '🌙' : '☀️' }}</span>
        <span>{{ themeStore.theme === 'light' ? '深色模式' : '浅色模式' }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()

const streak = computed(() => userStore.user?.currentStreak || 0)
const avatar = computed(() => userStore.user?.nickname?.charAt(0) || '😊')

const navItems = [
  { path: '/', icon: '📊', label: '仪表盘' },
  { path: '/points', icon: '⭐', label: '积分中心' },
  { path: '/lottery', icon: '🎁', label: '幸运抽奖', badge: 'NEW' },
  { path: '/history', icon: '📋', label: '打卡记录' },
  { path: '/profile', icon: '⚙️', label: '个人设置' },
]
</script>
