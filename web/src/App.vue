<!--
  根组件 - 全局布局容器
  结构：侧边栏（Sidebar） + 顶部栏（TopBar） + 主内容区（RouterView）
  登录页面不显示侧边栏和顶部栏，由 isLoggedIn 计算属性控制
-->
<template>
  <div class="flex min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- 侧边栏：仅登录状态下显示 -->
    <Sidebar v-if="isLoggedIn" />

    <!-- 主内容区：登录状态下为侧边栏留出 64 偏移 -->
    <div class="flex-1 flex flex-col" :class="{ 'md:ml-64': isLoggedIn }">
      <!-- 顶部信息栏：仅登录状态下显示 -->
      <TopBar v-if="isLoggedIn" />

      <!-- 路由出口：页面切换带过渡动画 -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
/**
 * App 根组件
 * 根据登录状态决定是否渲染侧边栏和顶部栏，未登录时全屏展示登录/注册页面
 */
import { computed } from 'vue'
// 用户状态管理 store
import { useUserStore } from './stores/user'
// 侧边栏导航组件
import Sidebar from './components/Sidebar.vue'
// 顶部信息栏组件
import TopBar from './components/TopBar.vue'

const userStore = useUserStore()
// 是否已登录：基于 token 判断
const isLoggedIn = computed(() => userStore.isLoggedIn)
</script>