<!--
  管理后台 - 登录页
  管理员使用用户名密码登录
-->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <el-card class="w-96">
      <template #header>
        <div class="text-center">
          <h1 class="text-xl font-bold">Daily 管理后台</h1>
          <p class="text-sm text-gray-500 mt-1">管理员登录</p>
        </div>
      </template>

      <el-form :model="form" @submit.prevent="handleLogin">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入管理员用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-button type="primary" class="w-full" :loading="loading" native-type="submit">
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 管理员登录组件
 * 使用用户名密码登录，验证管理员权限后将 Token 和用户信息存入 localStorage
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const form = ref({ username: '', password: '' })
const loading = ref(false)

/**
 * 登录处理函数
 * - 校验账号密码非空
 * - 调用登录接口验证管理员身份
 * - 将 Token 和管理员信息持久化到 localStorage
 */
async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/login', form.value)
    // 验证是否为管理员
    const isAdmin = res.data?.user?.isAdmin === true || res.data?.user?.isAdmin === 1
    if (!isAdmin) {
      ElMessage.error('该账号无管理员权限')
      return
    }
    // 持久化存储 Token 和管理员基础信息
    localStorage.setItem('admin_token', res.data.token)
    localStorage.setItem('admin_user', JSON.stringify({ id: res.data?.user?.id, username: res.data?.user?.username, isAdmin: res.data?.user?.isAdmin }))
    router.push('/')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>