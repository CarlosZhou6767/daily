<!--
  管理后台 - 积分管理
  积分流水查看、手动调整用户积分
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">积分管理</h2>

    <!-- 积分调整操作区 -->
    <el-card shadow="hover" class="mb-4">
      <template #header>手动调整积分</template>
      <el-form :model="adjustForm" inline>
        <el-form-item label="用户ID">
          <el-input v-model="adjustForm.userId" placeholder="目标用户ID" />
        </el-form-item>
        <el-form-item label="积分数量">
          <el-input-number v-model="adjustForm.amount" :step="10" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="adjustForm.reason" placeholder="调整原因" class="w-48" />
        </el-form-item>
        <el-button type="primary" @click="handleAdjust">调整</el-button>
      </el-form>
      <div class="text-xs text-gray-400 mt-2">正数增加积分，负数扣减积分</div>
    </el-card>

    <!-- 积分流水筛选 -->
    <div class="flex gap-3 mb-4">
      <el-input v-model="filterUserId" placeholder="用户ID" class="w-40" clearable />
      <el-select v-model="filterType" placeholder="类型筛选" clearable>
        <el-option label="打卡" value="checkin" />
        <el-option label="抽奖" value="lottery" />
        <el-option label="连续奖励" value="streak_bonus" />
        <el-option label="管理调整" value="admin_adjust" />
      </el-select>
      <el-button type="primary" @click="fetchPoints">查询</el-button>
    </div>

    <!-- 积分流水表格 -->
    <el-table :data="records" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="type" label="类型" width="100" />
      <el-table-column prop="amount" label="积分" width="80">
        <template #default="{ row }">
          <span :class="row.amount > 0 ? 'text-green-600' : 'text-red-600'">
            {{ row.amount > 0 ? '+' : '' }}{{ row.amount }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" />
      <el-table-column prop="createdAt" label="时间" width="160" />
    </el-table>

    <!-- 分页 -->
    <div class="flex justify-end mt-4">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="fetchPoints" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const records = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterUserId = ref('')
const filterType = ref('')

const adjustForm = ref({ userId: '', amount: 0, reason: '' })

async function fetchPoints() {
  const res = await api.get('/admin/points', {
    params: { page: page.value, pageSize: pageSize.value, userId: filterUserId.value, type: filterType.value },
  })
  records.value = res.data.records
  total.value = res.data.total
}

async function handleAdjust() {
  if (!adjustForm.value.userId || adjustForm.value.amount === 0) {
    ElMessage.warning('请填写用户ID和积分数量')
    return
  }
  await api.post('/admin/points/adjust', adjustForm.value)
  ElMessage.success('积分调整成功')
  adjustForm.value = { userId: '', amount: 0, reason: '' }
  fetchPoints()
}

onMounted(() => {
  fetchPoints()
})
</script>
