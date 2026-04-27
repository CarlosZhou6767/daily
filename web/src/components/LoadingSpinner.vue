<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div
      class="animate-spin rounded-full border-2 border-current border-t-transparent"
      :class="spinnerClass"
      role="status"
      aria-label="加载中"
    >
      <span class="sr-only">加载中...</span>
    </div>
    <span v-if="text" class="ml-2 text-sm text-slate-500">{{ text }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md'
  },
  text: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'text-brand-500'
  }
})

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const spinnerClass = computed(() => `${sizeMap[props.size] || sizeMap.md} ${props.color}`)
const containerClass = computed(() => props.text ? 'gap-2' : '')
</script>
