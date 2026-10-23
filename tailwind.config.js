/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 品牌主色：取代原本全站按鈕/連結統一用的 slate-900（近黑），
        // 增加辨識度並用於導覽列當前頁面標示
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
        },
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
