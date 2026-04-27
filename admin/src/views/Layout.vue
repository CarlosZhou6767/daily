<!--
  管理后台主布局
  左侧菜单 + 顶部导航 + 内容区域
-->
<template>
  <el-container class="h-screen">
    <!-- 左侧菜单 -->
    <el-aside width="220px" class="bg-gray-900 text-white">
      <div class="p-4 text-center border-b border-gray-700">
        <h1 class="text-lg font-bold">Daily 管理后台</h1>
      </div>
      <el-menu
        :default-active="currentPath"
        router
        background-color="#1f2937"
        text-color="#9ca3af"
        active-text-color="#60a5fa"
      >
        <el-menu-item index="/">
          <span>📊 数据面板</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <span>👥 用户管理</span>
        </el-menu-item>
        <el-menu-item index="/checkins">
          <span>✅ 打卡管理</span>
        </el-menu-item>
        <el-menu-item index="/points">
          <span>💰 积分管理</span>
        </el-menu-item>
        <el-menu-item index="/lottery">
          <span>🎰 奖品管理</span>
        </el-menu-item>
        <el-menu-item index="/images">
          <span>📷 图片管理</span>
        </el-menu-item>
        <el-menu-item index="/backup">
          <span>💾 数据备份</span>
        </el-menu-item>
        <el-menu-item index="/logs">
          <span>📋 操作日志</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="flex items-center justify-between border-b bg-white">
        <span class="text-gray-500">管理后台</span>
        <el-button type="danger" size="small" @click="handleLogout">退出登录</el-button>
      </el-header>

      <!-- 主内容 -->
      <el-main class="bg-gray-50">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const currentPath = computed(() => route.path)

function handleLogout() {
  localStorage.removeItem('admin_token')
  router.push('/login')
}
</script>
