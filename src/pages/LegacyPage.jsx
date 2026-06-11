import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'
import SideDecorCanvas from '@/components/ui/SideDecorCanvas'

function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ boxShadow: '0 8px 32px rgba(142,182,155,0.1)' }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'rgba(142,182,155,0.1)', border: '1px solid rgba(142,182,155,0.18)' }}
        >
          {icon}
        </div>
        <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>
          {title}
        </h2>
      </div>
      {children}
    </motion.div>
  )
}

export default function LegacyPage() {
  const { lang, legacySettings, updateLegacySettings, pingAlive, emergencyContact, setEmergencyContact } = useAppStore()
  const tr = useTranslation(lang)

  // Local drafts — committed to store on Save
  const [threshold,    setThreshold]    = useState(legacySettings.inactivityThreshold)
  const [gracePeriod,  setGracePeriod]  = useState(legacySettings.gracePeriod)
  const [multiSig,     setMultiSig]     = useState(legacySettings.multiSig)
  const [beneficiaries,setBeneficiaries]= useState(legacySettings.beneficiaries)
  const [finalMessage, setFinalMessage] = useState(legacySettings.finalMessage)

  const [ecName,    setEcName]    = useState(emergencyContact?.name    || '')
  const [ecContact, setEcContact] = useState(emergencyContact?.contact || '')
  const [ecSaved,   setEcSaved]   = useState(!!emergencyContact)

  const handleSaveEC = () => {
    if (!ecName.trim() || !ecContact.trim()) { toast.error('Enter both name and contact.'); return }
    setEmergencyContact({ name: ecName.trim(), contact: ecContact.trim() })
    setEcSaved(true)
    toast.success('Emergency contact saved.')
  }

  const thresholds = [
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '1year',   label: '1 Year'   },
  ]

  const addBeneficiary = () => {
    setBeneficiaries([...beneficiaries, { asset: 'All IPFS Files', wallet: '', name: '', percentage: 0 }])
  }

  const removeBeneficiary = (i) => {
    setBeneficiaries(beneficiaries.filter((_, j) => j !== i))
  }

  const updateBeneficiary = (i, field, value) => {
    setBeneficiaries(beneficiaries.map((b, j) =>
      j === i ? { ...b, [field]: field === 'percentage' ? Number(value) : value } : b
    ))
  }

  const handleSave = () => {
    const totalPct = beneficiaries.reduce((s, b) => s + b.percentage, 0)
    if (beneficiaries.length > 0 && totalPct !== 100) {
      toast.error(`Beneficiary percentages must total 100% (currently ${totalPct}%)`)
      return
    }
    updateLegacySettings({
      inactivityThreshold: threshold,
      gracePeriod,
      multiSig,
      beneficiaries,
      finalMessage,
    })
    toast.success('Legacy settings saved on-chain.')
  }

  const handlePing = () => {
    pingAlive()
    toast.success("You're alive! Ping recorded on-chain.")
  }

  const totalPct = beneficiaries.reduce((s, b) => s + b.percentage, 0)

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>

      <FlowingCanvas />

      <div className="fixed top-0 left-0 h-full pointer-events-none"
        style={{ width: 'clamp(140px, 16vw, 260px)', zIndex: 1, opacity: 0.8 }}>
        <SideDecorCanvas type="hand-left" />
      </div>
      <div className="fixed top-0 right-0 h-full pointer-events-none"
        style={{ width: 'clamp(140px, 16vw, 260px)', zIndex: 1, opacity: 0.8 }}>
        <SideDecorCanvas type="sphere" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: '#8EB69B' }} />
            <span className="font-inter text-xs uppercase tracking-widest" style={{ color: '#8EB69B' }}>
              On-chain · Immutable
            </span>
          </div>
          <h1 className="font-sora font-bold text-3xl shimmer-text mb-2">
            {tr('legacy.title')}
          </h1>
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            These settings are stored on-chain. They are immutable until you change them.
          </p>
        </motion.div>

        <div className="space-y-6">

          {/* Inactivity threshold */}
          <SectionCard title="Inactivity Threshold" icon="⏳" delay={0.05}>
            <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
              After this period of inactivity, the grace period begins.
            </p>
            <div className="flex gap-3 flex-wrap">
              {thresholds.map((t) => (
                <motion.button
                  key={t.value}
                  onClick={() => setThreshold(t.value)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2 rounded-full font-sora text-sm font-semibold transition-all"
                  style={{
                    background: threshold === t.value ? '#0B2B26' : 'rgba(11,43,38,0.2)',
                    color:      threshold === t.value ? '#DAF1DE' : '#8EB69B',
                    border:     `1px solid ${threshold === t.value ? 'rgba(218,241,222,0.4)' : 'rgba(218,241,222,0.1)'}`,
                    boxShadow:  threshold === t.value ? '0 0 18px rgba(142,182,155,0.25)' : 'none',
                  }}
                >
                  {t.label}
                </motion.button>
              ))}
            </div>
          </SectionCard>

          {/* Alive ping */}
          <SectionCard title="Alive Ping" icon="💓" delay={0.1}>
            {(() => {
              const daysLeft  = Math.max(0, differenceInDays(new Date(legacySettings.nextPing), new Date()))
              const totalDays = 30
              const pct       = Math.min(1, daysLeft / totalDays)
              const color     = daysLeft > 14 ? '#8EB69B' : daysLeft > 7 ? '#D1601F' : '#e05252'
              return (
                <>
                  {/* Countdown bar */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.7)' }}>Time until next required ping</span>
                      <span className="font-sora font-bold text-sm" style={{ color }}>
                        {daysLeft === 0 ? 'Overdue!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(142,182,155,0.1)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                      />
                    </div>
                    {daysLeft <= 7 && daysLeft > 0 && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-inter text-xs mt-2" style={{ color: '#D1601F' }}>
                        ⚠ Ping soon — grace period begins after threshold is crossed.
                      </motion.p>
                    )}
                    {daysLeft === 0 && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-inter text-xs mt-2 font-semibold" style={{ color: '#e05252' }}>
                        ⚠ Ping overdue. Your beneficiaries may be notified soon.
                      </motion.p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="font-inter text-xs mb-1" style={{ color: '#8EB69B' }}>Last ping</p>
                      <p className="font-sora font-semibold" style={{ color: '#DAF1DE' }}>
                        {format(new Date(legacySettings.lastPing), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="font-inter text-xs mb-1" style={{ color: '#8EB69B' }}>Next ping due</p>
                      <p className="font-sora font-semibold" style={{ color }}>
                        {format(new Date(legacySettings.nextPing), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={handlePing}
                    className="btn-primary text-sm"
                    whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(142,182,155,0.3)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Ping — I'm here ✓
                  </motion.button>
                </>
              )
            })()}
          </SectionCard>

          {/* Beneficiaries */}
          <SectionCard title="Beneficiary Assignment" icon="🕊️" delay={0.15}>
            <div className="space-y-3">
              {beneficiaries.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="grid grid-cols-4 gap-2 items-center"
                >
                  <input
                    className="vault-input text-xs"
                    placeholder="Asset"
                    value={b.asset}
                    onChange={(e) => updateBeneficiary(i, 'asset', e.target.value)}
                  />
                  <input
                    className="vault-input text-xs"
                    placeholder="Wallet 0x…"
                    value={b.wallet}
                    onChange={(e) => updateBeneficiary(i, 'wallet', e.target.value)}
                  />
                  <input
                    className="vault-input text-xs"
                    placeholder="Name"
                    value={b.name}
                    onChange={(e) => updateBeneficiary(i, 'name', e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      className="vault-input text-xs w-full"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="%"
                      value={b.percentage}
                      onChange={(e) => updateBeneficiary(i, 'percentage', e.target.value)}
                    />
                    <button
                      onClick={() => removeBeneficiary(i)}
                      className="text-sm px-2 transition-opacity hover:opacity-70 flex-shrink-0"
                      style={{ color: '#8EB69B' }}
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}

              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={addBeneficiary}
                  className="text-sm px-4 py-2 rounded-lg transition-all hover:opacity-90"
                  style={{ background: 'rgba(142,182,155,0.12)', color: '#8EB69B' }}
                >
                  + Add beneficiary
                </button>
                <span
                  className="font-inter text-sm font-semibold"
                  style={{ color: totalPct === 100 ? '#4a9e6a' : '#D1601F' }}
                >
                  Total: {totalPct}%
                  {totalPct !== 100 && totalPct > 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({totalPct < 100 ? `+${100 - totalPct}` : `-${totalPct - 100}`} to balance)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Grace period */}
          <SectionCard title="Grace Period" icon="⏱️" delay={0.2}>
            <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
              After inactivity is detected, beneficiaries must wait this many days before claiming.
              You can still ping and cancel during this window.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={7}
                max={60}
                value={gracePeriod}
                onChange={(e) => setGracePeriod(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: '#8EB69B' }}
              />
              <span className="font-sora font-bold text-xl w-16 text-center" style={{ color: '#DAF1DE' }}>
                {gracePeriod}d
              </span>
            </div>
          </SectionCard>

          {/* Multi-sig */}
          <SectionCard title="Multi-sig Release" icon="🔑" delay={0.25}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-inter text-sm" style={{ color: '#DAF1DE' }}>
                  Require 2 family members to confirm before release
                </p>
                <p className="font-inter text-xs mt-1" style={{ color: '#8EB69B' }}>
                  Adds protection against fraudulent claims.
                </p>
              </div>
              <button
                onClick={() => setMultiSig(!multiSig)}
                className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ml-4"
                style={{
                  background: multiSig ? '#163832' : 'rgba(11,43,38,0.4)',
                  border: '1px solid rgba(142,182,155,0.25)',
                }}
              >
                <motion.span
                  className="absolute top-1 w-4 h-4 rounded-full"
                  animate={{ left: multiSig ? '26px' : '4px' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{ background: multiSig ? '#DAF1DE' : '#8EB69B' }}
                />
              </button>
            </div>
          </SectionCard>

          {/* Chainlink status */}
          <SectionCard title="Chainlink Automation" icon="⛓️" delay={0.3}>
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full animate-pulse-dot"
                style={{ background: legacySettings.chainlinkActive ? '#8EB69B' : '#235347' }}
              />
              <span className="badge-cobalt">
                {legacySettings.chainlinkActive ? 'Active — monitoring inactivity' : 'Inactive'}
              </span>
            </div>
            <p className="font-inter text-xs mt-3" style={{ color: '#8EB69B' }}>
              Chainlink Keepers check your last ping every 24 hours. If threshold is crossed,
              the grace period begins automatically.
            </p>
          </SectionCard>

          {/* Final message */}
          <SectionCard title="Final Message" icon="💌" delay={0.35}>
            <p className="font-inter text-sm mb-3" style={{ color: '#8EB69B' }}>
              This message is delivered to all beneficiaries when the legacy is released.
              It is stored encrypted.
            </p>
            <textarea
              className="vault-input resize-none leading-relaxed"
              rows={6}
              placeholder="Write something for the people you love. They will read this when the time comes."
              value={finalMessage}
              onChange={(e) => setFinalMessage(e.target.value)}
            />
            <p className="font-inter text-xs mt-2" style={{ color: 'rgba(142,182,155,0.5)' }}>
              {finalMessage.length} characters
            </p>
          </SectionCard>

          {/* Emergency contact */}
          <SectionCard title="Emergency Contact" icon="🚨" delay={0.38}>
            <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
              This person is contacted immediately when your inactivity grace period begins — before any formal claim process.
              Think of it as a "call this person first" failsafe.
            </p>
            {ecSaved ? (
              <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ background: 'rgba(74,158,106,0.08)', border: '1px solid rgba(74,158,106,0.2)' }}>
                <div>
                  <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{emergencyContact.name}</p>
                  <p className="font-inter text-xs mt-0.5" style={{ color: '#8EB69B' }}>{emergencyContact.contact}</p>
                </div>
                <button onClick={() => setEcSaved(false)} className="text-xs px-3 py-1 rounded-lg" style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}>
                  Edit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block font-inter text-xs mb-1.5" style={{ color: '#8EB69B' }}>Name</label>
                  <input className="vault-input text-sm" placeholder="e.g. Priya Sharma" value={ecName} onChange={(e) => setEcName(e.target.value)} />
                </div>
                <div>
                  <label className="block font-inter text-xs mb-1.5" style={{ color: '#8EB69B' }}>Phone or email</label>
                  <input className="vault-input text-sm" placeholder="e.g. +91 98765 43210 or priya@email.com" value={ecContact} onChange={(e) => setEcContact(e.target.value)} />
                </div>
                <button onClick={handleSaveEC} className="btn-primary text-sm">Save emergency contact</button>
              </div>
            )}
            <p className="font-inter text-xs mt-3" style={{ color: 'rgba(142,182,155,0.4)' }}>
              This contact is stored encrypted in your vault. They will not be notified unless the grace period begins.
            </p>
          </SectionCard>

          {/* Save */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
              Changes are saved locally and signed on-chain.
            </p>
            <motion.button
              onClick={handleSave}
              className="btn-primary text-base px-10"
              whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(142,182,155,0.3)' }}
              whileTap={{ scale: 0.97 }}
            >
              Save legacy settings
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
