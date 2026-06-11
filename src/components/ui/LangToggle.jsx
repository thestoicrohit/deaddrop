import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export default function LangToggle() {
  const { lang, toggleLang } = useAppStore()

  return (
    <motion.button
      onClick={toggleLang}
      className="fixed bottom-12 left-5 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer select-none"
      style={{
        background: 'rgba(5,31,32,0.85)',
        border: '1px solid rgba(142,182,155,0.2)',
        backdropFilter: 'blur(12px)',
      }}
      whileHover={{ scale: 1.05, borderColor: 'rgba(142,182,155,0.55)', boxShadow: '0 0 14px rgba(142,182,155,0.14)' }}
      whileTap={{ scale: 0.95 }}
      title="Toggle language"
    >
      <motion.span
        key={lang}
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-xs font-sora font-bold"
        style={{ color: '#DAF1DE' }}
      >
        {lang === 'en' ? 'EN' : 'हिंदी'}
      </motion.span>
      <span className="text-xs font-inter" style={{ color: '#235347' }}>
        {lang === 'en' ? '/ हिंदी' : '/ EN'}
      </span>
    </motion.button>
  )
}
