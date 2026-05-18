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
/**
 * 管理后台主布局组件
 * 左侧深色侧边栏菜单（使用 el-menu router 模式实现路由跳转）
 * 顶部导航栏含退出登录按钮，下方为子路由内容区
 */
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 根据当前路由路径高亮对应菜单项
const currentPath = computed(() => route.path)

/** 清除本地存储的 Token 和用户信息，跳转到登录页 */
function handleLogout() {
  // 当前后端使用无状态 JWT，未提供 logout 接口，Token 在过期前仍有效
  // 如需使 Token 立即失效，需后端实现 Token 黑名单或 logout 接口
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  router.push('/login')
}
</script>