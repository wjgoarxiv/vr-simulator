/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'vr-bg': '#0D1117',
        'vr-bg2': '#161B22',
        'vr-card': '#21262D',
        'vr-accent': '#30363D',
        'vr-border': '#30363D',
        'vr-text': '#E6EDF3',
        'vr-text2': '#8B949E',
        'vr-muted': '#6E7681',
        'vr-blue': '#58A6FF',
        'vr-green': '#3FB950',
        'vr-red': '#F85149',
        'vr-yellow': '#D29922',
        'vr-purple': '#A371F7',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
