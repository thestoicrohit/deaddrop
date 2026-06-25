import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import FlowingCanvas from '@/components/ui/FlowingCanvas'
import SideDecorCanvas from '@/components/ui/SideDecorCanvas'
const STATS_COUNTERS = [
  { value: 50000000000, label: 'Unclaimed Crypto',   prefix: '$', display: '$50B+' },
  { value: 2000000000,  label: 'Photos Deleted Yearly', prefix: '', display: '2B+' },
  { value: 400000000,   label: 'Unbanked Indians',    prefix: '', display: '400M+' },
]

const STORAGE_TYPES = [
  { icon: '📸', label: 'Photos & Videos' },
  { icon: '🎙️', label: 'Voice Notes' },
  { icon: '💌', label: 'Letters' },
  { icon: '₿',  label: 'Crypto Keys' },
  { icon: '📄', label: 'Documents' },
  { icon: '🎵', label: 'Playlists' },
  { icon: '🖼️', label: 'Art & NFTs' },
  { icon: '🔐', label: 'Passwords' },
]

function CounterCard({ value, label, prefix }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const dur = 2000, steps = 60
    const inc = value / steps
    let cur = 0
    const t = setInterval(() => {
      cur += inc
      if (cur >= value) { setCount(value); clearInterval(t) }
      else setCount(Math.floor(cur))
    }, dur / steps)
    return () => clearInterval(t)
  }, [isInView, value])

  const fmt = (n) => {
    if (n >= 1e9) return `${prefix}${(n/1e9).toFixed(0)}B+`
    if (n >= 1e6) return `${prefix}${(n/1e6).toFixed(0)}M+`
    if (n >= 1e3) return `${prefix}${(n/1e3).toFixed(0)}K+`
    return `${prefix}${n}+`
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(142,182,155,0.12)' }}
      className="glass-card p-8 text-center flex-1 min-w-[200px]"
    >
      <div className="font-sora font-bold text-4xl md:text-5xl mb-2 shimmer-text">
        {isInView ? fmt(count) : `${prefix}0`}
      </div>
      <div className="font-inter text-sm" style={{ color: '#8EB69B' }}>{label}</div>
    </motion.div>
  )
}

const HOW_IT_WORKS = [
  { step: 1, icon: '🔐', title: 'Connect Your Wallet', desc: 'Your wallet address is your identity. No username. No password. Just your keys.' },
  { step: 2, icon: '📦', title: 'Create a Capsule', desc: 'Add photos, voice notes, letters, documents. Everything encrypted before it leaves your browser.' },
  { step: 3, icon: '⛓️', title: 'Minted on Chain', desc: 'Every file becomes an NFT. Every capsule is a permanent CID on IPFS. Nothing can delete it.' },
  { step: 4, icon: '🕊️', title: 'Your Legacy Triggers', desc: 'Chainlink detects inactivity. After your grace period, beneficiaries receive everything you left.' },
]

const PROFILE_TYPES = [
  { name: 'Family',     desc: 'Your roots, preserved forever.',    color: '#DAF1DE', icon: '🏡' },
  { name: 'Friends',    desc: 'The moments only you shared.',       color: '#8EB69B', icon: '🤝' },
  { name: 'University', desc: 'Credentials. Chapters. Proof.',      color: '#4a9e6a', icon: '🎓' },
  { name: 'Work',       desc: 'Equity docs. Employment. Legacy.',   color: '#DAF1DE', icon: '💼' },
]

const COMPARISON = [
  { feature: 'You own your data',                     cloud: false, dd: true },
  { feature: 'No terms of service',                   cloud: false, dd: true },
  { feature: 'Cryptographic proof of ownership',      cloud: false, dd: true },
  { feature: 'Legacy transfer without lawyers',       cloud: false, dd: true },
  { feature: 'Survives the company closing',          cloud: false, dd: true },
  { feature: 'Encrypted before upload',               cloud: false, dd: true },
  { feature: 'Works without internet',                cloud: false, dd: true },
  { feature: 'Bilingual (EN + Hindi)',                cloud: false, dd: true },
]

const stagger = (i) => ({ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] })

export default function AboutPage() {
  const navigate = useNavigate()
  const { lang } = useAppStore()
  const tr = useTranslation(lang)

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '64px' }}>
      {/* Animated flowing canvas background */}
      <FlowingCanvas opacity={1} />

      {/* Left decorative side art */}
      <div
        className="fixed left-0 top-0 bottom-0 pointer-events-none z-[1]"
        style={{ width: 'clamp(160px, 18vw, 280px)' }}
      >
        <SideDecorCanvas type="hand-left" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Right decorative side art */}
      <div
        className="fixed right-0 top-0 bottom-0 pointer-events-none z-[1]"
        style={{ width: 'clamp(160px, 18vw, 280px)' }}
      >
        <SideDecorCanvas type="hand-right" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Page content */}
      <div className="relative z-10">

        {/* ── Hero ── */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-28 min-h-[85vh]">
          <motion.div
            className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(142,182,155,0.08)', border: '1px solid rgba(142,182,155,0.2)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#8EB69B' }} />
            <span className="font-sora text-xs tracking-[0.2em] uppercase" style={{ color: '#8EB69B' }}>Digital Legacy</span>
          </motion.div>

          <motion.h1
            className="font-sora font-bold max-w-3xl leading-[1.08] tracking-[-0.025em] mb-6"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4.5rem)', color: '#DAF1DE' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Your memories deserve{' '}
            <span style={{ color: '#8EB69B' }}>better</span>{' '}
            than a terms of service.
          </motion.h1>

          <motion.p
            className="font-inter text-lg max-w-xl mb-10 leading-relaxed"
            style={{ color: 'rgba(142,182,155,0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            DeadDrop is a blockchain-powered vault for the things that matter most - your memories, your documents, your legacy.
          </motion.p>

          <motion.button
            onClick={() => navigate('/connect')}
            className="font-sora font-semibold text-base px-10 py-4 rounded-xl flex items-center gap-3"
            style={{
              background: 'rgba(142,182,155,0.12)',
              color: '#DAF1DE',
              border: '1px solid rgba(142,182,155,0.4)',
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ background: 'rgba(142,182,155,0.2)', boxShadow: '0 0 36px rgba(142,182,155,0.25)', scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>💳</span>
            {tr('connectWallet')}
            <span style={{ opacity: 0.6 }}>›</span>
          </motion.button>
        </section>

        {/* ── Stats ── */}
        <section className="max-w-5xl mx-auto px-8 pb-28">
          <motion.h2
            className="font-sora font-semibold text-2xl text-center mb-12"
            style={{ color: '#DAF1DE' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            The scale of the problem
          </motion.h2>
          <div className="flex flex-col sm:flex-row gap-6">
            {STATS_COUNTERS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={stagger(i)}>
                <CounterCard {...s} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── What you can store ── */}
        <section className="max-w-5xl mx-auto px-8 pb-28">
          <motion.h2
            className="font-sora font-semibold text-2xl text-center mb-12"
            style={{ color: '#DAF1DE' }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            What you can store
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STORAGE_TYPES.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={stagger(i)}
                whileHover={{ y: -6, scale: 1.04, boxShadow: '0 12px 36px rgba(142,182,155,0.15)' }}
                className="glass-card p-6 flex flex-col items-center gap-3 text-center cursor-default"
              >
                <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 10px rgba(142,182,155,0.5))' }}>
                  {item.icon}
                </span>
                <span className="font-sora text-sm font-medium" style={{ color: '#DAF1DE' }}>{item.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="max-w-5xl mx-auto px-8 pb-28">
          <motion.h2
            className="font-sora font-semibold text-2xl text-center mb-14"
            style={{ color: '#DAF1DE' }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            How it works
          </motion.h2>
          <div className="relative">
            <div
              className="absolute top-8 left-0 right-0 h-px hidden md:block"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(142,182,155,0.25), rgba(142,182,155,0.25), transparent)' }}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={stagger(i)}
                  whileHover={{ y: -5, boxShadow: '0 14px 40px rgba(142,182,155,0.12)' }}
                  className="glass-card p-6 text-center"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 relative z-10"
                    style={{ background: 'rgba(11,43,38,0.6)', border: '1.5px solid rgba(218,241,222,0.3)' }}
                  >
                    {step.icon}
                  </div>
                  <div className="font-sora font-bold text-xs mb-2 uppercase tracking-wider" style={{ color: 'rgba(142,182,155,0.5)' }}>
                    Step {step.step}
                  </div>
                  <div className="font-sora font-semibold text-base mb-2" style={{ color: '#DAF1DE' }}>
                    {step.title}
                  </div>
                  <div className="font-inter text-sm leading-relaxed" style={{ color: '#8EB69B' }}>
                    {step.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Your circles ── */}
        <section className="max-w-5xl mx-auto px-8 pb-28">
          <motion.h2
            className="font-sora font-semibold text-2xl text-center mb-10"
            style={{ color: '#DAF1DE' }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            Your circles
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {PROFILE_TYPES.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={stagger(i)}
                whileHover={{ y: -5, boxShadow: `0 14px 40px rgba(142,182,155,0.12)` }}
                className="glass-card p-6 text-center"
                style={{ borderLeft: `2px solid ${p.color}` }}
              >
                <span className="text-3xl block mb-3">{p.icon}</span>
                <div className="font-sora font-bold text-lg mb-1" style={{ color: p.color }}>{p.name}</div>
                <div className="font-inter text-sm" style={{ color: '#8EB69B' }}>{p.desc}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Comparison ── */}
        <section className="max-w-4xl mx-auto px-8 pb-28">
          <motion.h2
            className="font-sora font-semibold text-2xl text-center mb-10"
            style={{ color: '#DAF1DE' }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            Why not Google or iCloud?
          </motion.h2>
          <motion.div
            className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <div className="grid grid-cols-3 p-4" style={{ background: 'rgba(11,43,38,0.4)', borderBottom: '1px solid rgba(218,241,222,0.08)' }}>
              <span className="font-sora font-semibold text-sm" style={{ color: '#8EB69B' }}>Feature</span>
              <span className="font-sora font-semibold text-sm text-center" style={{ color: '#8EB69B' }}>Cloud</span>
              <span className="font-sora font-semibold text-sm text-center" style={{ color: '#DAF1DE' }}>DeadDrop</span>
            </div>
            {COMPARISON.map((row, i) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="grid grid-cols-3 px-4 py-3"
                style={{ borderBottom: i < COMPARISON.length - 1 ? '1px solid rgba(218,241,222,0.05)' : 'none' }}
              >
                <span className="font-inter text-sm" style={{ color: '#DAF1DE' }}>{row.feature}</span>
                <span className="text-center text-base">❌</span>
                <span className="text-center text-base">✅</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── Final CTA ── */}
        <section className="text-center px-6 py-28">
          <motion.h2
            className="font-sora font-bold max-w-2xl mx-auto mb-8"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', color: '#DAF1DE' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            Start your vault today.
          </motion.h2>
          <motion.button
            onClick={() => navigate('/connect')}
            className="font-sora font-semibold text-lg px-12 py-4 rounded-xl"
            style={{ background: 'rgba(142,182,155,0.12)', color: '#DAF1DE', border: '1px solid rgba(142,182,155,0.4)' }}
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            whileHover={{ background: 'rgba(142,182,155,0.22)', boxShadow: '0 0 40px rgba(142,182,155,0.25)', scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Open My Vault
          </motion.button>
        </section>
      </div>
    </div>
  )
}
