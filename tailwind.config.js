/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // New palette
        'soil-maroon': '#2C0F10',
        'bordeaux': '#461615',
        'dull-amber': '#927355',
        'dusty-taupe': '#5D4733',
        'forest-moss': '#332D1A',
        // Accent — kept from original spec
        'lunar-yellow': '#FECD6D',
        'cobalt': '#5686BB',
        'satsuma': '#D1601F',
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'aurora': 'aurora 20s ease infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'orbit': 'orbit 18s linear infinite',
        'orbit-rev': 'orbit-rev 24s linear infinite',
        'ticker': 'ticker 40s linear infinite',
        'spin-slow': 'spin 12s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.9', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.025)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.3', transform: 'scale(0.75)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(160px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(160px) rotate(-360deg)' },
        },
        'orbit-rev': {
          '0%': { transform: 'rotate(0deg) translateX(240px) rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg) translateX(240px) rotate(360deg)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(146, 115, 85, 0.2)' },
          '50%': { boxShadow: '0 0 50px rgba(146, 115, 85, 0.5), 0 0 100px rgba(146, 115, 85, 0.15)' },
        },
      },
    },
  },
  plugins: [],
}
