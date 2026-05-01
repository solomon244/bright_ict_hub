/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6D28D9',
          dark: '#4C1D95',
          light: '#A78BFA',
        },
        secondary: '#0EA5E9',
        accent: '#22D3EE',
        warning: '#F59E0B',
        success: '#10B981',
        danger: '#EF4444',
        stone: {
          50: '#f8fafc',
          100: '#e2e8f0',
          300: '#cbd5e1',
          500: '#64748b',
          700: '#1e293b',
        },
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 50px -24px rgba(76, 29, 149, 0.35)',
      },
    },
  },
  plugins: [],
};

