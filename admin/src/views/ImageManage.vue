<!--
  管理后台 - 图片管理
  查看所有上传的图片资源，支持按用户筛选
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">图片管理</h2>

    <!-- 筛选 -->
    <div class="flex gap-3 mb-4">
      <el-input v-model="filterUserId" placeholder="用户ID" class="w-40" clearable />
      <el-button type="primary" @click="fetchImages">查询</el-button>
    </div>

    <!-- 图片列表 -->
    <el-table :data="images" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="originalName" label="文件名" />
      <el-table-column prop="fileSize" label="大小" width="100">
        <template #default="{ row }">{{ (row.fileSize / 1024).toFixed(1) }}KB</template>
      </el-table-column>
      <el-table-column prop="width" label="宽" width="60" />
      <el-table-column prop="height" label="高" width="60" />
      <el-table-column prop="relatedType" label="关联类型" width="90" />
      <el-table-column prop="createdAt" label="上传时间" width="160" />
      <el-table-column label="预览" width="80">
        <template #default="{ row }">
          <el-image :src="'/' + row.filePath" style="width: 50px; height: 50px" fit="cover" :preview-src-list="['/' + row.filePath]" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="flex justify-end mt-4">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="fetchImages" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const images = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterUserId = ref('')

async function fetchImages() {
  const res = await api.get('/admin/images', {
    params: { page: page.value, pageSize: pageSize.value, userId: filterUserId.value },
  })
  images.value = res.data.records
  total.value = res.data.total
}

onMounted(() => {
  fetchImages()
})
</script>
