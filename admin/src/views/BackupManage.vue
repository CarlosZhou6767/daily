<!--
  管理后台 - 数据备份
  一键备份数据库和上传文件，下载 ZIP 包
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">数据备份</h2>

    <el-card shadow="hover">
      <template #header>创建备份</template>
      <p class="text-gray-500 mb-4">备份将打包数据库文件和上传目录为 ZIP 文件</p>
      <el-button type="primary" :loading="backing" @click="handleBackup">
        {{ backing ? '备份中...' : '立即备份' }}
      </el-button>
    </el-card>

    <!-- 备份结果 -->
    <el-card v-if="backupResult" shadow="hover" class="mt-4">
      <template #header>备份结果</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="文件名">{{ backupResult.fileName }}</el-descriptions-item>
        <el-descriptions-item label="大小">{{ ((backupResult.size || 0) / 1024 / 1024).toFixed(2) }} MB</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 数据备份组件
 * 触发服务端执行数据库和上传文件打包，展示备份结果信息
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const backing = ref(false)
const backupResult = ref(null)

/**
 * 触发服务端执行备份操作
 * 备份完成后显示文件名和大小
 */
async function handleBackup() {
  backing.value = true
  try {
    const res = await api.post('/admin/backup')
    backupResult.value = res.data
    ElMessage.success('备份成功')
  } catch (err) {
    ElMessage.error('备份失败')
  } finally {
    backing.value = false
  }
}
</script>