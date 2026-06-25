import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useCapsules } from '@/hooks/useCapsules'
import { useCircles } from '@/hooks/useCircles'
import { useDeadDrop } from '@/hooks/useDeadDrop'
import { useSafe, SAFE_CATEGORY } from '@/hooks/useSafe'
import { useTranslation } from '@/lib/translations'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: '#8EB69B' }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

const SECONDS_PER_DAY = 86400

function formatThreshold(seconds) {
  if (!seconds) return 'not set'
  const days = Math.round(Number(seconds) / SECONDS_PER_DAY)
  if (days > 0 && days % 365 === 0) return `${days / 365} year${days / 365 !== 1 ? 's' : ''}`
  if (days > 0 && days % 30 === 0)  return `${days / 30} month${days / 30 !== 1 ? 's' : ''}`
  return `${days} day${days !== 1 ? 's' : ''}`
}

// Context-aware responses based on keywords in the user's message. All data
// is read from on-chain contracts via the hooks in src/hooks/ — there is no
// local mock data anymore. Private Safe entries are encrypted client-side, so
// only counts (not contents) are available here.
const getResponse = (msg, { capsules, circles, vaultExists, vaultInfo, beneficiaryData, safeCounts, displayName }) => {
  const m = msg.toLowerCase()

  if (m.includes('capsule') || m.includes('memory')) {
    const count = capsules?.length || 0
    const latest = capsules?.[0]
    return `You have ${count} memory capsule${count !== 1 ? 's' : ''}${latest ? `. The most recent is "${latest.title}".` : '.'} Want me to help you create a new one or search through them?`
  }

  if (m.includes('circle') || m.includes('profile') || m.includes('family') || m.includes('group')) {
    const count = circles?.length || 0
    return `You're in ${count} circle${count !== 1 ? 's' : ''}${count > 0 ? ` — ${circles.map(p => p.name).join(', ')}` : ''}. Each circle has its own shared vault and memory space, all on-chain.`
  }

  if (m.includes('ping') || m.includes('alive') || m.includes('inactivity') || m.includes('legacy')) {
    if (!vaultExists) {
      return `You haven't created your legacy vault yet. Head to the Legacy page to set an inactivity threshold and beneficiaries on-chain.`
    }
    const threshold = formatThreshold(vaultInfo?.inactivityThreshold)
    if (vaultInfo?.lastPing) {
      const lastDate = new Date(Number(vaultInfo.lastPing) * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const nextDate = new Date((Number(vaultInfo.lastPing) + Number(vaultInfo.inactivityThreshold)) * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      return `Your inactivity threshold is ${threshold}. Last ping was ${lastDate}. Next ping due by ${nextDate}. You're safe — go to Legacy settings to ping now and reset the clock.`
    }
    return `Your legacy settings control what happens if you go inactive. Head to the Legacy page to configure your inactivity threshold, beneficiaries, and final message.`
  }

  if (m.includes('safe') || m.includes('vault') || m.includes('key') || m.includes('password') || m.includes('document')) {
    const { cryptoKeys = 0, passwords = 0, documents = 0, photos = 0 } = safeCounts || {}
    return `Your private vault holds: ${cryptoKeys} crypto key${cryptoKeys !== 1 ? 's' : ''}, ${passwords} password${passwords !== 1 ? 's' : ''}, ${documents} document${documents !== 1 ? 's' : ''}, and ${photos} photo${photos !== 1 ? 's' : ''}. Entries are AES-256 encrypted client-side before being written on-chain.`
  }

  if (m.includes('portrait') || m.includes('ai') || m.includes('generate')) {
    return `I can generate an AI Memory Portrait from your capsules — a visual story of your memories. Select a capsule and tap "AI Portrait ✨" to begin. Based on ${capsules?.length || 0} capsules across your vault.`
  }

  if (m.includes('beneficiar') || m.includes('heir') || m.includes('inherit')) {
    const names  = beneficiaryData?.names  || []
    const shares = beneficiaryData?.shares || []
    if (names.length > 0) {
      const list  = names.map((n, i) => `${n || 'Unnamed'} (${(Number(shares[i] || 0) / 100).toFixed(0)}%)`).join(', ')
      const total = shares.reduce((s, b) => s + Number(b || 0), 0) / 100
      return `You have ${names.length} beneficiar${names.length > 1 ? 'ies' : 'y'}: ${list}. Total: ${total}%. Update these on the Legacy page.`
    }
    return `You haven't set up beneficiaries yet. Head to the Legacy page to assign who receives your vault when the time comes.`
  }

  if (m.includes('hello') || m.includes('hi ') || m.includes('hey') || m.includes('help')) {
    return `Hello${displayName ? `, ${displayName}` : ''}. I'm your vault assistant. I can help you find memories, check your legacy status, review your safe contents, or tell you about your circles. What would you like to explore?`
  }

  // Default responses
  const defaults = [
    `I found ${capsules?.length || 0} memory capsules in your vault. The most recent is "${capsules?.[0]?.title || 'unnamed'}". Want me to open it?`,
    `Your ${circles?.length || 0} circle${(circles?.length || 0) !== 1 ? 's' : ''} ha${(circles?.length || 0) !== 1 ? 've' : 's'} files and memories shared across members, all on-chain. Check the Profiles page to see activity.`,
    `Your inactivity threshold is set to ${vaultExists ? formatThreshold(vaultInfo?.inactivityThreshold) : 'not configured yet'}. Ping the Legacy page to reset the clock and stay active.`,
    `Your private safe has ${(safeCounts?.cryptoKeys || 0) + (safeCounts?.passwords || 0) + (safeCounts?.documents || 0) + (safeCounts?.photos || 0)} encrypted entries. Content is encrypted client-side before it ever touches the chain.`,
    `I can generate a Memory Portrait from your capsules using AI — visual stories of your life. Try tapping "AI Portrait ✨" on any capsule.`,
  ]
  return defaults[Math.floor(Math.random() * defaults.length)]
}

export default function AIAssistant() {
  const { aiOpen, setAiOpen, lang, aiMessages, addAiMessage, clearAiMessages, displayName } = useAppStore()
  const { myCapsules } = useCapsules()
  const { myCircles }  = useCircles()
  const { vaultExists, vaultInfo, beneficiaryData } = useDeadDrop()
  const { entriesByCategory } = useSafe()
  const tr       = useTranslation(lang)
  const [input,  setInput]  = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  const safeCounts = {
    cryptoKeys: entriesByCategory[SAFE_CATEGORY.CRYPTO_KEY]?.length || 0,
    passwords:  entriesByCategory[SAFE_CATEGORY.PASSWORD]?.length   || 0,
    documents:  entriesByCategory[SAFE_CATEGORY.DOCUMENT]?.length   || 0,
    photos:     entriesByCategory[SAFE_CATEGORY.PHOTO]?.length      || 0,
  }

  const storeCtx = { capsules: myCapsules, circles: myCircles, vaultExists, vaultInfo, beneficiaryData, safeCounts, displayName }

  useEffect(() => {
    if (aiOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [aiOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, typing])

  const sendMessage = async (text) => {
    const msg = (text || input).trim()
    if (!msg) return

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    addAiMessage(userMsg)
    setInput('')
    setTyping(true)

    await new Promise((r) => setTimeout(r, 900 + Math.random() * 700))
    setTyping(false)

    const res = getResponse(msg, storeCtx)
    const aiMsg = { role: 'assistant', content: res, timestamp: new Date().toISOString() }
    addAiMessage(aiMsg)
  }

  const suggested = tr('ai.suggested')

  return (
    <>
      {/* Floating orb */}
      <motion.button
        onClick={() => setAiOpen(!aiOpen)}
        className="fixed bottom-24 right-5 z-50 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #235347, #163832)',
          border: '1px solid rgba(142,182,155,0.35)',
          boxShadow: '0 0 20px rgba(142,182,155,0.2)',
        }}
        whileHover={{ scale: 1.1, boxShadow: '0 0 32px rgba(142,182,155,0.4)' }}
        whileTap={{ scale: 0.92 }}
        animate={aiOpen ? { rotate: 45 } : { rotate: 0 }}
        transition={{ duration: 0.3 }}
        title="AI Vault Assistant"
      >
        <span className="text-lg" style={{ color: '#DAF1DE' }}>{aiOpen ? '✕' : '✦'}</span>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {aiOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: 'rgba(5,31,32,0.65)', backdropFilter: 'blur(4px)' }}
              onClick={() => setAiOpen(false)}
            />
            <motion.div
              className="fixed right-0 bottom-0 z-40 flex flex-col"
              style={{
                width: 'min(420px, 100vw)',
                height: 'min(580px, 100vh)',
                background: 'rgba(5,31,32,0.97)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(142,182,155,0.18)',
                borderRadius: '20px 0 0 0',
              }}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(142,182,155,0.1)' }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #235347, #163832)' }}
                >
                  <span className="text-base" style={{ color: '#DAF1DE' }}>✦</span>
                </div>
                <div>
                  <p className="font-sora font-semibold text-sm" style={{ color: '#8EB69B' }}>
                    {tr('ai.title')}
                  </p>
                  <p className="font-inter text-xs" style={{ color: '#235347' }}>
                    Vault-aware · {myCapsules?.length || 0} capsules · {myCircles?.length || 0} circles
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={clearAiMessages}
                    className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
                    style={{ background: 'rgba(142,182,155,0.08)', color: '#235347' }}
                    title="Clear history"
                  >
                    Clear
                  </button>
                  <button onClick={() => setAiOpen(false)} className="text-sm" style={{ color: '#235347' }}>
                    ✕
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] px-4 py-3 font-inter text-sm leading-relaxed"
                      style={{
                        background: msg.role === 'user'
                          ? 'rgba(11,43,38,0.7)'
                          : 'rgba(142,182,155,0.07)',
                        color: '#DAF1DE',
                        border: `1px solid ${msg.role === 'user' ? 'rgba(142,182,155,0.15)' : 'rgba(142,182,155,0.14)'}`,
                        borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      }}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {typing && (
                  <div className="flex justify-start">
                    <div style={{ background: 'rgba(142,182,155,0.07)', border: '1px solid rgba(142,182,155,0.14)', borderRadius: '4px 16px 16px 16px' }}>
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggested prompts (only when only greeting exists) */}
              {aiMessages.length <= 1 && (
                <div className="px-4 pb-2 flex gap-2 flex-wrap">
                  {(Array.isArray(suggested) ? suggested : []).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-90"
                      style={{
                        background: 'rgba(142,182,155,0.07)',
                        color: '#8EB69B',
                        border: '1px solid rgba(142,182,155,0.18)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-4 flex gap-3 items-end" style={{ borderTop: '1px solid rgba(142,182,155,0.08)' }}>
                <textarea
                  ref={inputRef}
                  className="vault-input flex-1 resize-none text-sm"
                  style={{ minHeight: '42px', maxHeight: '120px' }}
                  placeholder={tr('ai.placeholder')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                  }}
                  rows={1}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || typing}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: input.trim() && !typing ? 'linear-gradient(135deg, #235347, #163832)' : 'rgba(142,182,155,0.08)',
                    color:      input.trim() && !typing ? '#DAF1DE' : '#235347',
                  }}
                >
                  ↑
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
