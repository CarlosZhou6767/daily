<!--
  管理后台 - 操作日志
  查看所有管理员操作记录，便于审计追踪
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">操作日志</h2>

    <el-table :data="logs" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="adminName" label="管理员" width="100" />
      <el-table-column prop="action" label="操作" width="150" />
      <el-table-column prop="targetType" label="目标类型" width="100" />
      <el-table-column prop="targetId" label="目标ID" width="80" />
      <el-table-column prop="detail" label="详情">
        <template #default="{ row }">
          <el-tooltip :content="row.detail" placement="top">
            <span class="truncate max-w-xs inline-block">{{ row.detail }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="160" />
    </el-table>

    <!-- 分页 -->
    <div class="flex justify-end mt-4">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="fetchLogs" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const logs = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function fetchLogs() {
  const res = await api.get('/admin/logs', { params: { page: page.value, pageSize: pageSize.value } })
  logs.value = res.data.records
  total.value = res.data.total
}

onMounted(() => {
  fetchLogs()
})
</script>
