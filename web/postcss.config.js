/**
 * PostCSS 配置
 * - tailwindcss: 原子化 CSS 框架
 * - autoprefixer: 自动添加浏览器厂商前缀
 */
export default {
  plugins: {
    // 编译 Tailwind CSS 原子类
    tailwindcss: {},
    // 根据 browserslist 自动添加 CSS 前缀
    autoprefixer: {},
  },
}