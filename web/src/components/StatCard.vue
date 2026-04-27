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
