/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 巡檢結果語意色，對應 workplan_v2.md 第11節
        result: {
          good: '#16a34a', // 良好：正向色
          acceptable: '#d97706', // 尚可：提醒色
          poor: '#dc2626', // 不良：警示色
          na: '#64748b', // 不適用：獨立冷色系，避免與良好混淆
        },
      },
    },
  },
  plugins: [],
};
