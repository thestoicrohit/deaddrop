import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'

const EASE = [0.22, 1, 0.36, 1]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Replaces the old "connect a wallet or you can't proceed" gate. Shown once
 * a visitor has already expressed intent (clicked a real CTA, not just
 * landed on the page) — captures an email so we can reach them, then lets
 * them straight into the app. A wallet is only ever asked for later, at the
 * specific moment an action actually needs one (deposit, ping, etc).
 */
export default function EmailCaptureModal({ open, onClose, destination = '/dashboard' }) {
  const navigate = useNavigate()
  const captureLead = useAppStore((s) => s.captureLead)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setError('That email doesn’t look right — mind double-checking it?')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, name: name.trim(), source: 'entry-cta', page: window.location.pathname }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save your email.')
      captureLead(trimmed)
      toast.success('You’re in. Let’s set up your vault.')
      // Navigate straight away rather than closing the modal first — the
      // whole page (modal included) unmounts together via the route
      // transition, so there's no need for the modal's own close animation
      // to run at the same time as the page-level one (the two competing
      // AnimatePresence exits were stalling the transition indefinitely).
      navigate(destination)
    } catch (err) {
      // Dev server unreachable, or the /api/leads middleware isn't wired up
      // (e.g. a static preview build) — don't block the person from entering
      // just because the local spreadsheet write failed.
      captureLead(trimmed)
      toast('Saved locally — continuing.', { icon: '📝' })
      navigate(destination)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(5,31,32,0.72)', backdropFilter: 'blur(6px)' }}
            onClick={() => onClose?.()}
          />

          <motion.div
            className="relative w-full max-w-md rounded-2xl p-8"
            style={{
              background: 'rgba(11,43,38,0.92)',
              border: '1px solid rgba(142,182,155,0.18)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5), 0 0 60px rgba(142,182,155,0.08)',
            }}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-5"
              style={{ background: 'rgba(142,182,155,0.12)', border: '1px solid rgba(142,182,155,0.2)' }}>
              ✉️
            </div>

            <h2 className="font-sora font-bold text-xl mb-2" style={{ color: '#DAF1DE' }}>
              Where should we reach you?
            </h2>
            <p className="font-inter text-sm mb-6 leading-relaxed" style={{ color: 'rgba(142,182,155,0.75)' }}>
              No wallet needed yet — leave your email and we'll walk you straight into your vault.
              We'll only ask for a wallet the moment you actually store something on-chain.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                autoFocus
                type="email"
                className="vault-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="text"
                className="vault-input"
                placeholder="First name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error && (
                <p className="font-inter text-xs" style={{ color: '#e08a6a' }}>{error}</p>
              )}
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={!submitting ? { y: -1, boxShadow: '0 0 26px rgba(142,182,155,0.22)' } : {}}
                whileTap={!submitting ? { scale: 0.98 } : {}}
                transition={{ duration: 0.25, ease: EASE }}
                className="btn-primary w-full mt-1 disabled:opacity-60"
              >
                {submitting ? 'Getting your vault ready…' : 'Take me in →'}
              </motion.button>
            </form>

            <button
              onClick={() => { onClose?.(); navigate('/connect') }}
              className="w-full text-center font-inter text-xs mt-5 transition-opacity hover:opacity-70"
              style={{ color: 'rgba(142,182,155,0.55)' }}
            >
              Already have a wallet? Connect it instead →
            </button>

            <p className="text-center font-inter text-[11px] mt-4" style={{ color: 'rgba(142,182,155,0.4)' }}>
              By continuing you agree to our{' '}
              <Link to="/terms" onClick={() => onClose?.()} className="underline hover:opacity-80">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" onClick={() => onClose?.()} className="underline hover:opacity-80">Privacy Policy</Link>.
              {' '}Beta software on Ethereum Sepolia testnet — no password reset if you lose a connected wallet.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
