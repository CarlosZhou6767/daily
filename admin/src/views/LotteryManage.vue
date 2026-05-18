<!--
  管理后台 - 奖品管理
  奖品列表、创建/编辑/删除奖品、抽奖记录查看
-->
<template>
  <div>
    <h2 class="text-xl font-bold mb-4">奖品管理</h2>

    <!-- 创建奖品 -->
    <el-card shadow="hover" class="mb-4">
      <template #header>添加奖品</template>
      <el-form :model="prizeForm" inline>
        <el-form-item label="名称">
          <el-input v-model="prizeForm.name" placeholder="奖品名称" />
        </el-form-item>
        <el-form-item label="概率">
          <el-input-number v-model="prizeForm.probability" :min="0" :max="1" :step="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="积分奖励">
          <el-input-number v-model="prizeForm.pointsReward" :min="0" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="prizeForm.stock" :min="-1" placeholder="-1为无限" />
        </el-form-item>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </el-form>
    </el-card>

    <!-- 奖品列表 -->
    <el-table :data="prizes" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="probability" label="概率" width="80" />
      <el-table-column prop="prizeType" label="类型" width="80" />
      <el-table-column prop="pointsReward" label="积分奖励" width="90" />
      <el-table-column prop="stock" label="库存" width="80">
        <template #default="{ row }">{{ row.stock === -1 ? '无限' : row.stock }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 抽奖记录 -->
    <h3 class="text-lg font-bold mt-6 mb-3">抽奖记录</h3>
    <el-table :data="lotteryRecords" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="prizeName" label="奖品" />
      <el-table-column prop="pointsCost" label="消耗积分" width="90" />
      <el-table-column prop="createdAt" label="时间" width="160" />
    </el-table>

    <div class="flex justify-end mt-4">
      <el-pagination v-model:current-page="lotteryPage" :page-size="20" :total="lotteryTotal" layout="prev, pager, next" @current-change="fetchLotteryRecords" />
    </div>
  </div>
</template>

<script setup>
/**
 * 奖品管理组件
 * 管理奖品池（创建/删除），展示抽奖记录分页列表
 * 创建时校验概率总和不超出 100%
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const prizes = ref([])
const prizeForm = ref({ name: '', probability: 0.1, pointsReward: 0, stock: -1 })

const lotteryRecords = ref([])
const lotteryPage = ref(1)
const lotteryTotal = ref(0)

/** 获取奖品池列表 */
async function fetchPrizes() {
  try {
    const res = await api.get('/admin/prizes')
    prizes.value = res.data
  } catch {}
}

async function fetchLotteryRecords() {
  try {
    const res = await api.get('/admin/lottery/records', { params: { page: lotteryPage.value, pageSize: 20 } })
    lotteryRecords.value = res.data.records
    lotteryTotal.value = res.data.total
  } catch {}
}

/**
 * 创建奖品
 * 校验名称非空和概率总和不超出 101%（容差 1%），防止概率溢出
 */
async function handleCreate() {
  if (!prizeForm.value.name) {
    ElMessage.warning('请输入奖品名称')
    return
  }
  // 校验所有奖品概率总和不超过 1.01（容差 1%）
  const totalProb = prizes.value.reduce((sum, p) => sum + (p.probability || 0), 0) + prizeForm.value.probability
  if (totalProb > 1.01) {
    ElMessage.warning(`概率总和将超过100%（当前已有${(totalProb - prizeForm.value.probability).toFixed(2)}，新增后为${totalProb.toFixed(2)}），请调整概率`)
    return
  }
  try {
    await api.post('/admin/prizes', prizeForm.value)
    ElMessage.success('创建成功')
    prizeForm.value = { name: '', probability: 0.1, pointsReward: 0, stock: -1 }
    fetchPrizes()
  } catch {
    ElMessage.error('创建失败')
  }
}

/**
 * 删除指定奖品
 * 需要二次确认弹窗
 * @param {number} id - 奖品ID
 */
async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除该奖品？', '确认')
  } catch {
    return
  }
  try {
    await api.delete(`/admin/prizes/${id}`)
    ElMessage.success('删除成功')
    fetchPrizes()
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchPrizes()
  fetchLotteryRecords()
})
</script>