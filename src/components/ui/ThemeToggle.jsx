import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore()

  return (
    <motion.button
      onClick={toggleTheme}
      className="fixed bottom-12 right-5 z-50 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer select-none"
      style={{
        background: 'rgba(5,31,32,0.85)',
        border: '1px solid rgba(142,182,155,0.2)',
        backdropFilter: 'blur(12px)',
      }}
      whileHover={{ scale: 1.1, borderColor: 'rgba(142,182,155,0.55)', boxShadow: '0 0 16px rgba(142,182,155,0.18)' }}
      whileTap={{ scale: 0.92 }}
      title={theme === 'dark' ? 'Switch to warm mode' : 'Switch to dark mode'}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 30, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="text-base"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </motion.span>
    </motion.button>
  )
}
