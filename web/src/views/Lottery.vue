<!--
  幸运抽奖页面
  Canvas 绘制转盘，CSS 动画控制旋转
-->
<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="page-title">幸运转盘</h1>
      <p class="page-subtitle">消耗积分，赢取丰厚奖励！</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 转盘区域 -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-800">
          <div class="wheel-container" style="max-width: 320px; margin: 0 auto;">
            <!-- 指针 -->
            <div class="wheel-pointer">
              <div class="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-red-500"></div>
            </div>

            <!-- 转盘画布 -->
            <canvas ref="canvasRef" :width="wheelSize" :height="wheelSize"
              class="rounded-full shadow-lg transition-transform ease-out"
              :style="{ transform: `rotate(${currentRotation}deg)`, transitionDuration: spinning ? '4s' : '0s' }"
            ></canvas>

            <!-- 中心按钮 -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg z-10 cursor-pointer"
              @click="handleSpin"
            >
              <span class="text-lg">🎯</span>
            </div>
          </div>

          <!-- 抽奖按钮 -->
          <div class="text-center mt-6">
            <button
              @click="handleSpin"
              :disabled="spinning || isProcessing || (userStore.user?.points || 0) < lotteryCost"
              class="btn-primary text-base px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="flex items-center gap-2">
                ✨ 开始抽奖（{{ lotteryCost }}积分）
              </span>
            </button>
            <div class="text-xs text-slate-400 mt-3">
              当前可用积分：<span class="text-brand-600 dark:text-brand-400 font-medium">{{ userStore.user?.points || 0 }}</span>
              · 剩余抽奖次数：{{ remainingDraws }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：中奖记录 -->
      <div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card border border-slate-100 dark:border-slate-800">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span>🏆</span> 历史中奖记录
          </h3>
          <div class="space-y-2">
            <div v-for="record in records" :key="record.id"
              class="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">🎁</span>
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ record.prizeName }}</span>
              </div>
              <span class="text-xs text-slate-400">{{ record.createdAt }}</span>
            </div>
            <div v-if="records.length === 0" class="text-center py-8 text-slate-400 text-sm">
              暂无中奖记录
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 中奖结果弹窗 -->
    <div v-if="showResult" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="showResult = false">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
        <div class="text-5xl mb-4">🎉</div>
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">{{ resultPrize }}</h2>
        <p v-if="resultPoints > 0" class="text-brand-600 dark:text-brand-400 font-medium text-lg">+{{ resultPoints }} 积分</p>
        <button @click="showResult = false" class="mt-6 btn-primary w-full">好的</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '../stores/user'
import api from '../api'

const userStore = useUserStore()
const canvasRef = ref(null)
const currentRotation = ref(0)
const spinning = ref(false)
const isProcessing = ref(false) // 防重复点击锁（BUG-OPT-006 修复），避免快速连点导致状态错乱
const prizes = ref([])
const records = ref([])
const showResult = ref(false)
const resultPrize = ref('')
const resultPoints = ref(0)
/**
 * 剩余抽奖次数（BUG-OPT-002 修复）
 * 当前使用频率限制默认值，后续应从服务端限流配置动态获取
 */
const remainingDraws = ref(9)
/**
 * 抽奖消耗积分（BUG-OPT-002 修复）
 * 从服务端 pointsRules.lotteryCost 配置同步，默认 20
 * 后续应通过 API 动态获取以保持与服务端一致
 */
const lotteryCost = ref(20)

const wheelSize = 300

// 绘制转盘
function drawWheel() {
  const canvas = canvasRef.value
  if (!canvas || prizes.value.length === 0) return

  const ctx = canvas.getContext('2d')
  const center = wheelSize / 2
  const radius = center - 10
  const sliceAngle = (2 * Math.PI) / prizes.value.length

  const colors = ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#a3a3a3', '#ef4444']

  prizes.value.forEach((prize, i) => {
    const startAngle = i * sliceAngle
    const endAngle = startAngle + sliceAngle

    ctx.beginPath()
    ctx.moveTo(center, center)
    ctx.arc(center, center, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.save()
    ctx.translate(center, center)
    ctx.rotate(startAngle + sliceAngle / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(prize.name, radius * 0.6, 4)
    ctx.restore()
  })
}

// 监听奖品变化重绘
watch(() => prizes.value, () => {
  drawWheel()
}, { deep: true })

async function fetchPrizes() {
  try {
    const res = await api.get('/lottery/prizes')
    prizes.value = res.data
  } catch (err) {
    console.error('Failed to fetch prizes:', err)
  }
}

async function fetchRecords() {
  try {
    const res = await api.get('/lottery/records', { params: { page: 1, pageSize: 5 } })
    records.value = res.data.records
  } catch (err) {
    console.error('Failed to fetch records:', err)
  }
}

async function handleSpin() {
  // BUG-OPT-006 修复：防重复点击锁，避免快速连点导致状态错乱
  if (spinning.value || isProcessing.value) return
  if ((userStore.user?.points || 0) < lotteryCost.value) return

  isProcessing.value = true
  spinning.value = true
  try {
    const res = await api.post('/lottery/draw')
    const prize = res.data

    resultPrize.value = prize.prizeName
    resultPoints.value = prize.pointsReward

    // 计算目标角度：确保转盘旋转多圈后停在目标奖品区域
    const prizeIndex = prizes.value.findIndex(p => p.id === prize.prizeId)
    const sliceAngle = 360 / prizes.value.length
    const targetAngle = 360 * 5 + (360 - prizeIndex * sliceAngle - sliceAngle / 2)
    currentRotation.value = targetAngle

    // 等待转盘动画结束后显示结果
    setTimeout(async () => {
      spinning.value = false
      // BUG-OPT-006 修复：重置转盘动画时长，确保下次抽奖动画正常
      setTimeout(() => { currentRotation.value = currentRotation.value % 360 }, 100)
      showResult.value = true
      await userStore.fetchProfile()
      await fetchRecords()
      isProcessing.value = false
    }, 4200)
  } catch (err) {
    spinning.value = false
    isProcessing.value = false
    alert(err.message || '抽奖失败')
  }
}

onMounted(() => {
  fetchPrizes()
  fetchRecords()
})
</script>
