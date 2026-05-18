/**
 * Vite 构建配置
 * - Vue 3 单文件组件编译
 * - 开发服务器代理（API & 上传文件）
 * - 生产构建分包策略
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Vue 3 SFC 编译插件
  plugins: [vue()],
  // 开发服务器配置
  server: {
    // 本地开发端口
    port: 5173,
    // 代理转发，避免开发阶段跨域问题
    proxy: {
      // API 请求代理至后端 3000 端口
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 上传文件（图片等）代理至后端 3000 端口
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // 生产构建配置
  build: {
    rollupOptions: {
      output: {
        // 手动分包：将第三方核心库单独打包为 vendor chunk
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', 'axios'],
        },
      },
    },
  },
})