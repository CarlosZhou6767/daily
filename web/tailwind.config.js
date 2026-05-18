/**
 * Tailwind CSS 配置
 * - 内容扫描路径（按需生成 CSS）
 * - 深色模式策略（class 切换）
 * - 自定义品牌色板、字体、阴影、圆角
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  // 扫描文件路径，生产构建时按需生成原子类
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // 深色模式通过 HTML class="dark" 切换
  darkMode: 'class',
  theme: {
    extend: {
      // 自定义色板扩展
      colors: {
        // 主品牌色：绿色系（主色调）
        brand: {
          50: '#f6fff6',
          100: '#e6fde6',
          200: '#ccfacc',
          300: '#99f699',
          400: '#66f066',
          500: '#43d94a',
          600: '#35b93c',
          700: '#2a9430',
          800: '#237628',
          900: '#1d6222',
          950: '#0c3811',
        },
        // 辅助色：薄荷绿
        mint: {
          50: '#f6ffef',
          100: '#e8fde0',
          200: '#d3fbc3',
          300: '#aef594',
          400: '#82e960',
          500: '#5bd735',
          600: '#44b825',
          700: '#37911f',
          800: '#2f731e',
          900: '#275e1d',
          950: '#11350b',
        },
        // 中性色：石板灰（背景/文字）
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // 语义色：用于统计卡片/状态标识
        orange: {
          400: '#fb923c',
          500: '#f97316',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        red: {
          400: '#f87171',
          500: '#ef4444',
        },
        blue: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        purple: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      // 自定义无衬线字体栈
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      // 自定义卡片阴影：默认 & hover 状态
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
      },
      // 自定义大圆角值
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  // 暂未引入官方插件（如 typography、forms 等）
  plugins: [],
}