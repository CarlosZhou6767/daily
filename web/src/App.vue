<!--
  根组件 - 侧边栏 + 顶部栏 + 主内容区
  按照新设计原型重构布局
-->
<template>
  <div class="flex min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- 侧边栏（登录状态显示） -->
    <Sidebar v-if="isLoggedIn" />

    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col" :class="{ 'md:ml-64': isLoggedIn }">
      <!-- 顶部信息栏（登录状态显示） -->
      <TopBar v-if="isLoggedIn" />

      <!-- 路由内容 -->
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
import { computed } from 'vue'
import { useUserStore } from './stores/user'
import Sidebar from './components/Sidebar.vue'
import TopBar from './components/TopBar.vue'

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)
</script>
