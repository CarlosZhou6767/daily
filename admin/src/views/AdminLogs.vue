<!--
  管理后台 - 全量日志中心
  支持管理员操作日志、用户行为日志、系统日志、错误日志的查看/筛选/导出/删除
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">日志中心</h2>

    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="管理员操作" name="admin" />
      <el-tab-pane label="用户行为" name="user" />
      <el-tab-pane label="系统日志" name="system" />
      <el-tab-pane label="错误日志" name="error" />
    </el-tabs>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <el-input v-if="activeTab === 'user'" v-model="filters.userId" placeholder="用户ID" class="w-32" size="small" />
      <el-select v-if="activeTab === 'admin' || activeTab === 'user'" v-model="filters.action" placeholder="操作类型" class="w-32" size="small" clearable>
        <el-option v-for="a in actionOptions" :key="a.value" :label="a.label" :value="a.value" />
      </el-select>
      <el-input v-if="activeTab === 'admin' || activeTab === 'user'" v-model="filters.keyword" placeholder="关键词搜索" class="w-40" size="small" />
      <el-select v-if="activeTab === 'system'" v-model="filters.level" placeholder="日志级别" class="w-28" size="small" clearable>
        <el-option label="info" value="info" />
        <el-option label="warn" value="warn" />
        <el-option label="error" value="error" />
      </el-select>
      <el-date-picker v-model="filters.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" size="small" value-format="YYYY-MM-DD" />
      <el-button type="primary" size="small" @click="search">查询</el-button>
      <el-button v-if="activeTab === 'admin' || activeTab === 'user'" type="success" size="small" @click="exportLogs">导出CSV</el-button>
      <el-button v-if="activeTab === 'admin' || activeTab === 'user'" type="danger" size="small" @click="confirmDelete">删除选中</el-button>
    </div>

    <el-table v-if="activeTab === 'admin' || activeTab === 'user'" :data="records" stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="45" />
      <el-table-column :prop="activeTab === 'admin' ? 'adminName' : 'userId'" :label="activeTab === 'admin' ? '管理员' : '用户ID'" width="100" />
      <el-table-column prop="action" label="操作" width="130">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.action }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="targetType" label="目标" width="80" />
      <el-table-column prop="detail" label="详情">
        <template #default="{ row }">
          <span class="truncate max-w-xs inline-block">{{ row.detail || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP" width="130" />
      <el-table-column prop="createdAt" label="时间" width="170" />
    </el-table>

    <el-table v-if="activeTab === 'system' || activeTab === 'error'" :data="records" stripe>
      <el-table-column prop="timestamp" label="时间" width="200" />
      <el-table-column prop="level" label="级别" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.level === 'error' ? 'danger' : row.level === 'warn' ? 'warning' : 'info'">
            {{ row.level }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="消息" show-overflow-tooltip />
    </el-table>

    <div class="flex justify-end mt-4">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="fetchLogs" />
    </div>
  </div>
</template>

<script setup>
/**
 * 日志中心组件
 * 提供四种日志类型的 Tab 切换查看，支持多条件筛选、CSV 导出和批量删除
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const activeTab = ref('admin')
const records = ref([])
const selectedRows = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = ref({
  userId: '', action: '', keyword: '', level: '', dateRange: null,
})

// 日志操作类型选项，用于筛选下拉框
const actionOptions = [
  { label: '登录', value: 'login' }, { label: '登出', value: 'logout' },
  { label: '打卡', value: 'checkin' }, { label: '抽奖', value: 'lottery_draw' },
  { label: '修改资料', value: 'profile_update' }, { label: '修改密码', value: 'password_change' },
  { label: '上传', value: 'upload' }, { label: '创建任务', value: 'task_create' },
  { label: '删除任务', value: 'task_delete' },
  { label: '补打卡', value: 'makeup_checkin' }, { label: '调整积分', value: 'adjust_points' },
  { label: '用户状态', value: 'update_user_status' }, { label: '创建奖品', value: 'prize_create' },
  { label: '更新奖品', value: 'prize_update' }, { label: '删除奖品', value: 'prize_delete' },
]

/**
 * 表格多选变化回调
 * @param {Array} rows - 当前选中的行数据
 */
function handleSelectionChange(rows) {
  selectedRows.value = rows
}

/**
 * 从日期范围筛选器中提取开始和结束日期参数
 * @returns {Object} 包含 startDate 和 endDate 的参数对象
 */
function getDateParams() {
  const p = {}
  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    const d = filters.value.dateRange[0]; const e = filters.value.dateRange[1]
    p.startDate = d instanceof Date ? d.toISOString().slice(0, 10) : d
    p.endDate = e instanceof Date ? e.toISOString().slice(0, 10) : e
  }
  return p
}

/**
 * 根据当前激活的 Tab 类型请求对应的日志数据
 * - admin/user Tab 调用对应管理日志接口
 * - system/error Tab 调用系统和错误日志接口
 */
async function fetchLogs() {
  try {
    const params = { page: page.value, pageSize: pageSize.value, ...getDateParams() }

    if (activeTab.value === 'admin') {
      if (filters.value.action) params.action = filters.value.action
      if (filters.value.keyword) params.keyword = filters.value.keyword
      const res = await api.get('/admin/logs/admin', { params })
      records.value = res.data.records; total.value = res.data.total
    } else if (activeTab.value === 'user') {
      if (filters.value.userId) params.userId = filters.value.userId
      if (filters.value.action) params.action = filters.value.action
      if (filters.value.keyword) params.keyword = filters.value.keyword
      const res = await api.get('/admin/logs/user', { params })
      records.value = res.data.records; total.value = res.data.total
    } else if (activeTab.value === 'system') {
      const sysParams = { ...getDateParams() }
      if (filters.value.level) sysParams.level = filters.value.level
      sysParams.limit = pageSize.value; sysParams.offset = (page.value - 1) * pageSize.value
      const res = await api.get('/admin/logs/system', { params: sysParams })
      records.value = res.data.records; total.value = res.data.total
    } else if (activeTab.value === 'error') {
      const errParams = { ...getDateParams() }
      errParams.limit = pageSize.value; errParams.offset = (page.value - 1) * pageSize.value
      const res = await api.get('/admin/logs/error', { params: errParams })
      records.value = res.data.records; total.value = res.data.total
    }
  } catch {
    ElMessage.error('获取日志失败')
  }
}

/** 重置到第一页并查询 */
function search() { page.value = 1; fetchLogs() }
/** Tab 切换时重置页码并重新请求 */
function onTabChange() { page.value = 1; fetchLogs() }

/**
 * 导出当前日志为 CSV 文件
 * 通过新窗口打开导出接口，携带当前筛选条件
 */
async function exportLogs() {
  const params = { type: activeTab.value, ...getDateParams() }
  if (filters.value.action) params.action = filters.value.action
  if (filters.value.userId) params.userId = filters.value.userId
  if (filters.value.keyword) params.keyword = filters.value.keyword
  try {
    const blob = await api.get('/admin/logs/export', { params, responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs_${activeTab.value}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    ElMessage.error('导出失败')
  }
}

/**
 * 二次确认后批量删除选中的日志记录
 * 操作不可撤销，需要用户显式确认
 */
async function confirmDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的日志'); return
  }
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 条日志？此操作不可撤销。`, '二次确认', {
      confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning',
    })
    const ids = selectedRows.value.map(r => r.id)
    await api.delete('/admin/logs', { data: { type: activeTab.value, ids, confirmed: true } })
    ElMessage.success('删除成功')
    selectedRows.value = []
    fetchLogs()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(fetchLogs)
</script>