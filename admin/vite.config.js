/**
 * 管理后台 Vite 构建配置
 * - 开发服务器端口 5174，代理 /api 和 /uploads 到后端 3000 端口
 * - 生产构建基础路径为 /admin/
 * - 代码分包：element-plus 独立 chunk，vue 生态依赖合并为 vendor chunk
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 开发服务器配置
  server: {
    port: 5174,
    // 代理配置：将 /api 和 /uploads 请求转发到后端服务
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // 生产构建时的公共基础路径
  base: '/admin/',
  // 生产构建配置：手动分包优化加载性能
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus'],
          vendor: ['vue', 'vue-router', 'axios'],
        },
      },
    },
  },
})
