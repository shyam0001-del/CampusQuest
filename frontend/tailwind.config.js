/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        quest: {
          bg: '#0a0d17',
          surface: '#111726',
          card: '#161e33',
          cardHover: '#1c2642',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.18)',
          accentViolet: '#8b5cf6',
          accentCyan: '#06b6d4',
          accentCoral: '#f43f5e',
          accentGold: '#f59e0b',
          accentGreen: '#10b981',
          textMuted: '#94a3b8',
          textSub: '#cbd5e1',
          textBright: '#f8fafc',
        },
      },
      boxShadow: {
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-gold': '0 0 25px -5px rgba(245, 158, 11, 0.4)',
        'glow-coral': '0 0 25px -5px rgba(244, 63, 94, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'quest-gradient': 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #030712 100%)',
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
        'violet-cyan': 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
        'coral-amber': 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
