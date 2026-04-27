/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
}
