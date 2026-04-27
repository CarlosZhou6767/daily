<!--
  注册页 - 新版设计
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
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-200">创建账号</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1 text-sm">开始你的自律之旅</p>
      </div>

      <!-- 注册卡片 -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-800">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">用户名</label>
            <input v-model="form.username" type="text" placeholder="3-20位字母数字下划线"
              class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">昵称</label>
            <input v-model="form.nickname" type="text" placeholder="显示名称（可选）"
              class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">密码</label>
            <input v-model="form.password" type="password" placeholder="至少6位"
              class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              @keyup.enter="handleRegister"
            />
          </div>

          <div v-if="error" class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{{ error }}</div>
          <div v-if="success" class="text-brand-600 text-sm bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-lg">{{ success }}</div>

          <button
            @click="handleRegister"
            :disabled="loading"
            class="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </div>

        <div class="mt-4 text-center text-sm text-slate-500">
          已有账号？
          <router-link to="/login" class="text-brand-600 dark:text-brand-400 hover:underline font-medium">去登录</router-link>
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

const form = ref({ username: '', password: '', nickname: '' })
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleRegister() {
  if (!form.value.username || !form.value.password) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    await userStore.register(form.value.username, form.value.password, form.value.nickname)
    success.value = '注册成功，正在跳转...'
    setTimeout(() => router.push('/login'), 1500)
  } catch (err) {
    error.value = err.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>
