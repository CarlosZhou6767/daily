<!--
  页面标题组件
  统一所有页面的标题结构，减少重复代码
  支持自定义标题和副标题
-->
<template>
  <div class="mb-6">
    <h1 class="page-title">{{ title }}</h1>
    <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup>
/**
 * 页面标题组件
 * @param {string} title - 页面主标题（必填）
 * @param {string} [subtitle] - 页面副标题（可选）
 */
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
});
</script>
