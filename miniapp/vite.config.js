/**
 * Vite 构建配置文件
 * 用于 uni-app 小程序的编译和打包
 */
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
})
