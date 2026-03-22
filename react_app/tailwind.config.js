/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#07080C',
          1: '#0E1018',
          2: '#151820',
          3: '#1C2030',
          4: '#252A3A',
        },
        tx: {
          primary: '#E8ECF4',
          secondary: '#7A8299',
          muted: '#4A5168',
        },
        accent: {
          cyan: '#00D4FF',
          green: '#00FF88',
          red: '#FF3860',
          amber: '#FFB020',
          violet: '#8B5CF6',
        },
        glow: {
          cyan: 'rgba(0, 212, 255, 0.15)',
          green: 'rgba(0, 255, 136, 0.12)',
          red: 'rgba(255, 56, 96, 0.12)',
          amber: 'rgba(255, 176, 32, 0.12)',
        },
        border: {
          default: '#1E2235',
          active: '#2A3050',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
        sans: ['"Noto Sans KR"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['50px', { lineHeight: '1.1', fontWeight: '800' }],
        'h1': ['37px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['21px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'xs': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'data-lg': ['28px', { lineHeight: '1.1', fontWeight: '700' }],
        'data-md': ['21px', { lineHeight: '1.2', fontWeight: '600' }],
        'data-sm': ['16px', { lineHeight: '1.3', fontWeight: '500' }],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.15), 0 0 40px rgba(0, 212, 255, 0.05)',
        'glow-green': '0 0 20px rgba(0, 255, 136, 0.15), 0 0 40px rgba(0, 255, 136, 0.05)',
        'glow-red': '0 0 20px rgba(255, 56, 96, 0.15), 0 0 40px rgba(255, 56, 96, 0.05)',
        'glow-amber': '0 0 20px rgba(255, 176, 32, 0.15), 0 0 40px rgba(255, 176, 32, 0.05)',
        'glow-cyan-strong': '0 0 30px rgba(0, 212, 255, 0.25), 0 0 60px rgba(0, 212, 255, 0.08)',
        'glow-green-strong': '0 0 30px rgba(0, 255, 136, 0.25), 0 0 60px rgba(0, 255, 136, 0.08)',
        'glow-red-strong': '0 0 30px rgba(255, 56, 96, 0.25), 0 0 60px rgba(255, 56, 96, 0.08)',
      },
      animation: {
        'pulse-green': 'pulse-glow-green 3s ease-in-out infinite',
        'pulse-red': 'pulse-glow-red 3s ease-in-out infinite',
        'pulse-cyan': 'pulse-glow-cyan 3s ease-in-out infinite',
        'pulse-amber': 'pulse-glow-amber 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.4s ease-out forwards',
      },
      keyframes: {
        'pulse-glow-green': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0,255,136,0.08), inset 0 0 15px rgba(0,255,136,0.03)' },
          '50%': { boxShadow: '0 0 25px rgba(0,255,136,0.2), inset 0 0 20px rgba(0,255,136,0.06)' },
        },
        'pulse-glow-red': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255,56,96,0.08), inset 0 0 15px rgba(255,56,96,0.03)' },
          '50%': { boxShadow: '0 0 25px rgba(255,56,96,0.2), inset 0 0 20px rgba(255,56,96,0.06)' },
        },
        'pulse-glow-cyan': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0,212,255,0.08), inset 0 0 15px rgba(0,212,255,0.03)' },
          '50%': { boxShadow: '0 0 25px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,212,255,0.06)' },
        },
        'pulse-glow-amber': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255,176,32,0.08), inset 0 0 15px rgba(255,176,32,0.03)' },
          '50%': { boxShadow: '0 0 25px rgba(255,176,32,0.2), inset 0 0 20px rgba(255,176,32,0.06)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
