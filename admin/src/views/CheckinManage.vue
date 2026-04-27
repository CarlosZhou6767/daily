<!--
  管理后台 - 打卡管理
  打卡记录查看、管理员补打卡
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">打卡管理</h2>

    <!-- 补打卡操作区 -->
    <el-card shadow="hover" class="mb-4">
      <template #header>管理员补打卡</template>
      <el-form :model="makeupForm" inline>
        <el-form-item label="用户ID">
          <el-input v-model="makeupForm.userId" placeholder="目标用户ID" />
        </el-form-item>
        <el-form-item label="任务ID">
          <el-input v-model="makeupForm.taskId" placeholder="任务ID" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="makeupForm.checkinDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-button type="primary" @click="handleMakeup">补打卡</el-button>
      </el-form>
    </el-card>

    <!-- 打卡记录筛选 -->
    <div class="flex gap-3 mb-4">
      <el-input v-model="filterUserId" placeholder="用户ID" class="w-40" clearable />
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
      <el-button type="primary" @click="fetchCheckins">查询</el-button>
    </div>

    <!-- 打卡记录表格 -->
    <el-table :data="checkins" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="taskName" label="任务" width="120" />
      <el-table-column prop="checkinDate" label="打卡日期" width="120" />
      <el-table-column prop="pointsEarned" label="获得积分" width="80" />
      <el-table-column prop="isMakeup" label="补打卡" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isMakeup ? 'warning' : 'success'">
            {{ row.isMakeup ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" />
      <el-table-column prop="createdAt" label="时间" width="160" />
    </el-table>

    <!-- 分页 -->
    <div class="flex justify-end mt-4">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="fetchCheckins" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const checkins = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterUserId = ref('')
const dateRange = ref(null)

const makeupForm = ref({ userId: '', taskId: '', checkinDate: '' })

async function fetchCheckins() {
  const params = { page: page.value, pageSize: pageSize.value, userId: filterUserId.value }
  if (dateRange.value) {
    params.startDate = dateRange.value[0]
    params.endDate = dateRange.value[1]
  }
  const res = await api.get('/admin/checkins', { params })
  checkins.value = res.data.records
  total.value = res.data.total
}

async function handleMakeup() {
  if (!makeupForm.value.userId || !makeupForm.value.taskId || !makeupForm.value.checkinDate) {
    ElMessage.warning('请填写完整补打卡信息')
    return
  }
  await api.post('/admin/checkin/makeup', makeupForm.value)
  ElMessage.success('补打卡成功')
  makeupForm.value = { userId: '', taskId: '', checkinDate: '' }
  fetchCheckins()
}

onMounted(() => {
  fetchCheckins()
})
</script>
