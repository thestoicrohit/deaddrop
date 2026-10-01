import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

const THEMES = [
  { id: 'dark',  label: 'Forest',        swatch: 'linear-gradient(135deg, #163832, #051F20)', dot: '#8EB69B' },
  { id: 'light', label: 'Light',         swatch: 'linear-gradient(135deg, #FFFFFF, #E6F0E8)', dot: '#3D6B57' },
  { id: 'gold',  label: 'Obsidian Gold', swatch: 'linear-gradient(135deg, #2A2312, #0B0A08)', dot: '#D4AF37', premium: true },
]

const SIZES = [
  { id: 'sm', label: 'A', size: 11 },
  { id: 'md', label: 'A', size: 14 },
  { id: 'lg', label: 'A', size: 17 },
]

// One floating ⚙️ button holding every display preference. All of it is
// persisted by the store, so choices survive reloads and return visits.
export default function SettingsPanel({ className = 'fixed bottom-12 right-5 z-50' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { theme, setTheme, lang, toggleLang, textSize, setTextSize, reduceMotion, setReduceMotion } = useAppStore()

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={className}>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Display settings"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-12 right-0 w-72 rounded-2xl p-4 space-y-4"
            style={{
              background: 'rgba(var(--c-0-rgb),0.97)',
              border: '1px solid rgba(var(--c-4-rgb),0.25)',
              boxShadow: '0 20px 50px -15px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <p className="font-sora font-semibold text-sm" style={{ color: 'var(--c-5)' }}>Display settings</p>

            <Section title="Theme">
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => {
                  const active = theme === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      aria-pressed={active}
                      className="relative rounded-xl p-2 text-left transition-transform hover:-translate-y-0.5"
                      style={{
                        border: active ? '1.5px solid var(--c-4)' : '1px solid rgba(var(--c-4-rgb),0.2)',
                        background: 'rgba(var(--c-1-rgb),0.6)',
                      }}
                    >
                      <span className="block h-9 rounded-lg mb-1.5 relative overflow-hidden" style={{ background: t.swatch, border: '1px solid rgba(128,128,128,0.25)' }}>
                        <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full" style={{ background: t.dot, boxShadow: t.premium ? '0 0 8px #D4AF37' : 'none' }} />
                      </span>
                      <span className="block font-inter text-[11px] leading-tight" style={{ color: 'var(--c-5)' }}>{t.label}</span>
                      {t.premium && (
                        <span className="absolute -top-2 -right-1 px-1.5 py-px rounded-full font-sora font-bold text-[9px] tracking-wide"
                          style={{ background: 'linear-gradient(90deg, #E8C766, #D4AF37)', color: '#0B0A08' }}>
                          ✦ PREMIUM
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Section>

            <Section title="Language">
              <Segmented
                options={[{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिंदी' }]}
                value={lang}
                onChange={(v) => { if (v !== lang) toggleLang() }}
              />
            </Section>

            <Section title="Text size">
              <Segmented
                options={SIZES.map((s) => ({ id: s.id, label: <span style={{ fontSize: s.size, fontWeight: 700 }}>{s.label}</span>, aria: `Text size ${s.id}` }))}
                value={textSize}
                onChange={setTextSize}
              />
            </Section>

            <label className="flex items-center justify-between cursor-pointer">
              <span>
                <span className="block font-inter text-xs font-medium" style={{ color: 'var(--c-5)' }}>Reduce motion</span>
                <span className="block font-inter text-[11px]" style={{ color: 'var(--c-4)' }}>Calmer, faster on slow phones</span>
              </span>
              <button
                role="switch"
                aria-checked={reduceMotion}
                onClick={() => setReduceMotion(!reduceMotion)}
                className="relative w-10 h-6 rounded-full transition-colors"
                style={{ background: reduceMotion ? 'var(--c-4)' : 'rgba(var(--c-4-rgb),0.2)' }}
              >
                <span className="absolute top-1 w-4 h-4 rounded-full transition-all"
                  style={{ left: reduceMotion ? 20 : 4, background: reduceMotion ? 'var(--c-0)' : 'var(--c-5)' }} />
              </button>
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label="Display settings"
        aria-expanded={open}
        title="Display settings"
        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer select-none"
        style={{
          background: 'rgba(var(--c-0-rgb),0.85)',
          border: '1px solid rgba(var(--c-4-rgb),0.3)',
          backdropFilter: 'blur(12px)',
          color: 'var(--c-5)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.3 }} className="text-base leading-none">⚙️</motion.span>
      </motion.button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="font-inter text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--c-4)' }}>{title}</p>
      {children}
    </div>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(var(--c-1-rgb),0.7)', border: '1px solid rgba(var(--c-4-rgb),0.15)' }}>
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            aria-label={o.aria}
            className="flex-1 py-1.5 rounded-lg font-inter text-xs transition-colors"
            style={{
              background: active ? 'var(--c-4)' : 'transparent',
              color: active ? 'var(--c-0)' : 'var(--c-5)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
