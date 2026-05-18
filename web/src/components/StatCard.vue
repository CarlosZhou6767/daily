<template>
  <div class="stat-card">
    <div class="flex items-center gap-3">
      <div class="stat-icon" :class="iconBgClass">
        <span>{{ icon }}</span>
      </div>
      <div class="flex-1">
        <div class="stat-label">{{ label }}</div>
        <div class="text-2xl font-bold text-slate-800 dark:text-slate-200">{{ value }}</div>
        <div v-if="subText" class="text-xs text-brand-600 dark:text-brand-400 mt-0.5">{{ subText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 统计卡片组件
 * 通用展示组件，接收图标、标签、数值、副文本和背景色 props
 *
 * Props:
 * - icon: 图标文本（emoji）
 * - label: 统计项标签
 * - value: 统计数值（支持 String / Number）
 * - subText: 副文本说明（可选）
 * - iconBg: 图标区域背景 Tailwind CSS 类名（可选，有默认值）
 */
import { computed } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  subText: {
    type: String,
    default: ''
  },
  iconBg: {
    type: String,
    default: 'bg-brand-50 dark:bg-brand-900/20'
  }
})

const iconBgClass = computed(() => props.iconBg)
</script>
