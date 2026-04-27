<!--
  登录页 - 新版设计
-->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg mb-4">
          <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-200">自律打卡</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1 text-sm">坚持自律，遇见更好的自己</p>
      </div>

      <!-- 登录卡片 -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-800">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">用户名</label>
            <input v-model="form.username" type="text" placeholder="请输入用户名"
              class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              @keyup.enter="handleLogin"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">密码</label>
            <input v-model="form.password" type="password" placeholder="请输入密码"
              class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              @keyup.enter="handleLogin"
            />
          </div>

          <div v-if="error" class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{{ error }}</div>

          <button
            @click="handleLogin"
            :disabled="loading"
            class="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>

        <div class="mt-4 text-center text-sm text-slate-500">
          还没有账号？
          <router-link to="/register" class="text-brand-600 dark:text-brand-400 hover:underline font-medium">去注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await userStore.login(form.value.username, form.value.password)
    router.push('/')
  } catch (err) {
    error.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
