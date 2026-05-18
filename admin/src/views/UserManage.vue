<!--
  管理后台 - 用户管理
  用户列表、搜索、状态管理（启用/禁用）
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">用户管理</h2>

    <!-- 搜索和筛选 -->
    <div class="flex gap-3 mb-4">
      <el-input v-model="search" placeholder="搜索用户名/昵称" class="w-60" clearable @clear="page = 1; fetchUsers()" @keyup.enter="fetchUsers" />
      <el-select v-model="statusFilter" placeholder="状态筛选" clearable @change="page = 1; fetchUsers()">
        <el-option label="正常" value="active" />
        <el-option label="禁用" value="disabled" />
      </el-select>
      <el-button type="primary" @click="page = 1; fetchUsers()">搜索</el-button>
    </div>

    <!-- 用户列表表格 -->
    <el-table :data="users" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="points" label="积分" width="80" />
      <el-table-column prop="totalCheckinDays" label="总打卡" width="80" />
      <el-table-column prop="currentStreak" label="连续天数" width="90" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间" width="160" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'active'"
            type="danger" size="small"
            @click="toggleStatus(row.id, 'disabled')"
          >禁用</el-button>
          <el-button
            v-else
            type="success" size="small"
            @click="toggleStatus(row.id, 'active')"
          >启用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="flex justify-end mt-4">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="fetchUsers"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * 用户管理组件
 * 用户列表分页展示，支持按用户名/昵称搜索和按状态筛选
 * 管理员可启用/禁用用户账号
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const users = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const search = ref('')
const statusFilter = ref('')

/**
 * 获取用户分页列表
 * 支持按用户名/昵称搜索和按状态（active/disabled）筛选
 */
async function fetchUsers() {
  const params = { page: page.value, pageSize: pageSize.value }
  if (search.value) params.search = search.value
  if (statusFilter.value) params.status = statusFilter.value
  try {
    const res = await api.get('/admin/users', { params })
    users.value = res.data.users
    total.value = res.data.total
  } catch {}
}

/**
 * 切换用户启用/禁用状态
 * 需要二次确认弹窗
 * @param {number} userId - 用户ID
 * @param {string} status - 目标状态：'active' 启用 / 'disabled' 禁用
 */
async function toggleStatus(userId, status) {
  const action = status === 'disabled' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定${action}该用户？`, '确认')
  } catch {
    return
  }
  try {
    await api.put(`/admin/users/${userId}`, { status })
    ElMessage.success(`${action}成功`)
    fetchUsers()
  } catch {
    ElMessage.error(`${action}失败`)
  }
}

onMounted(() => {
  fetchUsers()
})
</script>