import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { formatDistanceToNow, format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'

// ── Greeting ──────────────────────────────────────────────────────────────────
function greeting(name) {
  const h = new Date().getHours()
  const salute = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${salute}, ${name}.` : `${salute}.`
}

// ── Vault health score ────────────────────────────────────────────────────────
function computeHealth({ displayName, safePin, capsules, profiles, safeData, legacySettings, daysLeft }) {
  const safeCount = (safeData.documents?.length || 0) + (safeData.photos?.length || 0)
    + (safeData.cryptoKeys?.length || 0) + (safeData.passwords?.filter(p => p.label).length || 0)
  return [
    { label: 'Display name set',          done: !!displayName },
    { label: 'Vault PIN configured',       done: !!safePin },
    { label: 'Memory capsule created',     done: capsules.length > 0 },
    { label: 'Circle with members',        done: profiles.some(p => (p.members?.length || 0) > 1) },
    { label: 'Files in Private Safe',      done: safeCount > 0 },
    { label: 'Beneficiary assigned',       done: (legacySettings.beneficiaries || []).some(b => b.wallet?.trim()) },
    { label: 'Final message written',      done: (legacySettings.finalMessage || '').length > 20 },
    { label: 'Ping is current',            done: daysLeft > 0 },
  ]
}

function HealthRing({ score }) {
  const color = score >= 80 ? '#4a9e6a' : score >= 50 ? '#D1601F' : '#e05252'
  const r     = 36
  const circ  = 2 * Math.PI * r
  const dash  = circ * (score / 100)
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" className="flex-shrink-0">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(142,182,155,0.1)" strokeWidth="6" />
      <circle
        cx="45" cy="45" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 1.2s ease, stroke 0.5s' }}
      />
      <text x="45" y="41" textAnchor="middle" fill={color} fontSize="17" fontWeight="700" fontFamily="Sora, sans-serif">
        {score}
      </text>
      <text x="45" y="55" textAnchor="middle" fill="rgba(142,182,155,0.6)" fontSize="8" fontFamily="Inter, sans-serif">
        / 100
      </text>
    </svg>
  )
}

function VaultHealthScore({ checks, navigate }) {
  const done  = checks.filter(c => c.done).length
  const score = Math.round((done / checks.length) * 100)
  const color = score >= 80 ? '#4a9e6a' : score >= 50 ? '#D1601F' : '#e05252'
  const label = score >= 80 ? 'Well protected' : score >= 50 ? 'Needs attention' : 'At risk'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'rgba(142,182,155,0.1)', border: '1px solid rgba(142,182,155,0.18)' }}>
          🛡️
        </div>
        <div>
          <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>Vault Health</h2>
          <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>How protected is your legacy?</p>
        </div>
      </div>

      <div className="flex items-center gap-5 mb-5">
        <HealthRing score={score} />
        <div>
          <p className="font-sora font-bold text-2xl" style={{ color }}>{score}%</p>
          <p className="font-inter text-sm font-medium" style={{ color }}>{label}</p>
          <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.5)' }}>
            {done} of {checks.length} tasks complete
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-sm flex-shrink-0" style={{ color: c.done ? '#4a9e6a' : 'rgba(142,182,155,0.3)' }}>
              {c.done ? '✓' : '○'}
            </span>
            <span className="font-inter text-xs" style={{ color: c.done ? '#8EB69B' : 'rgba(142,182,155,0.45)' }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Onboarding checklist ──────────────────────────────────────────────────────
function OnboardingChecklist({ checks, onDismiss, navigate }) {
  const steps = [
    { icon: '👤', label: 'Set your display name',   hint: 'Wallet chip → Settings',                  done: checks.find(c => c.label === 'Display name set')?.done,         action: null },
    { icon: '🌸', label: 'Create a memory capsule', hint: 'Memory Space → New capsule',                done: checks.find(c => c.label === 'Memory capsule created')?.done,   action: () => navigate('/memory') },
    { icon: '👥', label: 'Add a circle member',     hint: 'Circles → open a circle → Add member',    done: checks.find(c => c.label === 'Circle with members')?.done,       action: () => navigate('/profiles') },
    { icon: '🕊️', label: 'Assign a beneficiary',    hint: 'Legacy → Beneficiary Assignment',          done: checks.find(c => c.label === 'Beneficiary assigned')?.done,     action: () => navigate('/legacy') },
    { icon: '🔐', label: 'Set your vault PIN',       hint: 'Wallet chip → Settings → Set PIN',        done: checks.find(c => c.label === 'Vault PIN configured')?.done,     action: null },
  ]
  const doneCount = steps.filter(s => s.done).length
  const pct = (doneCount / steps.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden mb-8"
    >
      <div className="glass-card p-6" style={{ border: '1px solid rgba(142,182,155,0.25)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>Getting started</h2>
            <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.6)' }}>
              Complete these steps to protect your legacy.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'rgba(142,182,155,0.5)', border: '1px solid rgba(142,182,155,0.15)' }}
          >
            Dismiss
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={step.action || undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${step.action && !step.done ? 'cursor-pointer' : ''}`}
              style={{ background: step.done ? 'rgba(74,158,106,0.08)' : 'rgba(11,43,38,0.25)' }}
              whileHover={step.action && !step.done ? { background: 'rgba(142,182,155,0.08)' } : {}}
            >
              <span className="text-base flex-shrink-0" style={{ opacity: step.done ? 1 : 0.6 }}>
                {step.done ? '✅' : step.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-inter text-xs font-medium leading-tight"
                  style={{ color: step.done ? '#4a9e6a' : '#DAF1DE', textDecoration: step.done ? 'line-through' : 'none', opacity: step.done ? 0.7 : 1 }}>
                  {step.label}
                </p>
                <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.45)' }}>{step.hint}</p>
              </div>
              {step.action && !step.done && (
                <span className="text-xs flex-shrink-0" style={{ color: 'rgba(142,182,155,0.4)' }}>→</span>
              )}
            </motion.div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>Progress</span>
            <span className="font-sora text-xs font-semibold" style={{ color: '#8EB69B' }}>{doneCount}/{steps.length}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(142,182,155,0.1)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'linear-gradient(90deg, #4a9e6a, #8EB69B)' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Ping progress ring ────────────────────────────────────────────────────────
function PingRing({ daysLeft, totalDays }) {
  const pct   = Math.max(0, Math.min(1, daysLeft / totalDays))
  const r     = 44
  const circ  = 2 * Math.PI * r
  const dash  = circ * pct
  const color = daysLeft > 14 ? '#8EB69B' : daysLeft > 7 ? '#D1601F' : '#e05252'

  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(142,182,155,0.1)" strokeWidth="7" />
      <circle
        cx="54" cy="54" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s' }}
      />
      <text x="54" y="50" textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="Sora, sans-serif">
        {daysLeft}
      </text>
      <text x="54" y="66" textAnchor="middle" fill="rgba(142,182,155,0.7)" fontSize="9" fontFamily="Inter, sans-serif">
        days left
      </text>
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, sub, color = '#8EB69B', delay = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: `0 12px 30px rgba(142,182,155,0.12)` }}
      onClick={onClick}
      className={`glass-card p-5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="font-sora font-bold text-2xl" style={{ color }}>{value}</span>
      </div>
      <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{label}</p>
      {sub && <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.6)' }}>{sub}</p>}
    </motion.div>
  )
}

// ── Quick action ──────────────────────────────────────────────────────────────
function QuickAction({ icon, label, sub, onClick, delay = 0 }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 4, background: 'rgba(142,182,155,0.1)' }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
      style={{ background: 'rgba(142,182,155,0.04)', border: '1px solid rgba(142,182,155,0.1)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: 'rgba(142,182,155,0.1)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{label}</p>
        <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>{sub}</p>
      </div>
      <span style={{ color: 'rgba(142,182,155,0.4)' }}>→</span>
    </motion.button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const {
    displayName, capsules, profiles, safeData,
    legacySettings, pingAlive, profileTimeline,
    safePin, onboardingChecklistDone, dismissOnboardingChecklist,
  } = useAppStore()

  // Stats
  const safeCount = (safeData.cryptoKeys?.length || 0)
    + (safeData.letters?.length || 0)
    + (safeData.voiceNotes?.length || 0)
    + (safeData.passwords?.filter(p => p.label).length || 0)
    + (safeData.documents?.length || 0)
    + (safeData.photos?.length || 0)

  // Ping countdown
  const nextPing   = new Date(legacySettings.nextPing)
  const daysLeft   = Math.max(0, differenceInDays(nextPing, new Date()))
  const totalDays  = 30
  const pingStatus = daysLeft === 0 ? 'overdue' : daysLeft <= 7 ? 'urgent' : 'safe'

  // Vault health
  const healthChecks = computeHealth({ displayName, safePin, capsules, profiles, safeData, legacySettings, daysLeft })
  const healthDone   = healthChecks.filter(c => c.done).length
  const healthPct    = Math.round((healthDone / healthChecks.length) * 100)
  const showChecklist = !onboardingChecklistDone && healthPct < 100

  // Recent activity — flatten all timelines, take last 6
  const recentActivity = useMemo(() => {
    const all = []
    Object.values(profileTimeline || {}).forEach((events) => {
      events.forEach((e) => all.push(e))
    })
    return all
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6)
  }, [profileTimeline])

  const handlePing = () => {
    pingAlive()
    toast.success("You're alive! Clock reset on-chain.")
  }

  const statusColor  = pingStatus === 'safe' ? '#8EB69B' : pingStatus === 'urgent' ? '#D1601F' : '#e05252'
  const statusLabel  = pingStatus === 'safe' ? 'Vault is active' : pingStatus === 'urgent' ? 'Ping soon!' : 'Ping overdue!'

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>
      <FlowingCanvas />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: statusColor }} />
            <span className="font-inter text-xs uppercase tracking-widest" style={{ color: statusColor }}>
              {statusLabel}
            </span>
          </div>
          <h1 className="font-sora font-bold text-3xl md:text-4xl shimmer-text mb-1">
            {greeting(displayName)}
          </h1>
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </motion.div>

        {/* Onboarding checklist */}
        <AnimatePresence>
          {showChecklist && (
            <OnboardingChecklist
              checks={healthChecks}
              onDismiss={dismissOnboardingChecklist}
              navigate={navigate}
            />
          )}
        </AnimatePresence>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Memory Capsules" value={capsules.length} icon="🌸"
            sub={capsules.length > 0 ? `Latest: ${capsules[0]?.title?.slice(0, 18)}…` : 'None yet'}
            delay={0.05} onClick={() => navigate('/memory')}
          />
          <StatCard
            label="Legacy Circles" value={profiles.length} icon="👥"
            sub={`${profiles.reduce((s, p) => s + (p.members?.length || 0), 0)} total members`}
            delay={0.1} onClick={() => navigate('/profiles')}
          />
          <StatCard
            label="Safe Items" value={safeCount} icon="🔐"
            sub="AES-256 encrypted"
            delay={0.15} onClick={() => navigate('/safe')}
          />
          <StatCard
            label="Days to Ping" value={daysLeft}
            icon={daysLeft <= 7 ? '⚠️' : '💓'}
            sub={`Due ${format(nextPing, 'dd MMM yyyy')}`}
            color={statusColor} delay={0.2}
            onClick={() => navigate('/legacy')}
          />
        </div>

        {/* Vault health + ping */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <VaultHealthScore checks={healthChecks} navigate={navigate} />

          {/* Ping status card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(142,182,155,0.1)', border: '1px solid rgba(142,182,155,0.18)' }}>
                💓
              </div>
              <div>
                <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>Alive Ping</h2>
                <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>On-chain inactivity monitor</p>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-5">
              <PingRing daysLeft={daysLeft} totalDays={totalDays} />
              <div className="space-y-3">
                <div>
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Last ping</p>
                  <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>
                    {format(new Date(legacySettings.lastPing), 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Next due</p>
                  <p className="font-sora font-semibold text-sm" style={{ color: statusColor }}>
                    {format(nextPing, 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Threshold</p>
                  <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>
                    {legacySettings.inactivityThreshold}
                  </p>
                </div>
              </div>
            </div>

            <motion.button
              onClick={handlePing}
              className="btn-primary w-full text-sm"
              whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(142,182,155,0.3)' }}
              whileTap={{ scale: 0.97 }}
            >
              Ping — I'm here ✓
            </motion.button>
          </motion.div>
        </div>

        {/* Quick actions + recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(142,182,155,0.1)', border: '1px solid rgba(142,182,155,0.18)' }}>
                ⚡
              </div>
              <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <QuickAction icon="🌸" label="New memory capsule" sub="Add a photo, letter, or voice note" onClick={() => navigate('/memory')} delay={0.37} />
              <QuickAction icon="🔐" label="Upload to Private Safe" sub="Documents, crypto keys, passwords" onClick={() => navigate('/safe')} delay={0.41} />
              <QuickAction icon="🕊️" label="Configure legacy" sub="Beneficiaries, threshold, final message" onClick={() => navigate('/legacy')} delay={0.45} />
              <QuickAction icon="📋" label="View all activity" sub="Full history of vault events" onClick={() => navigate('/activity')} delay={0.49} />
            </div>
          </motion.div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>Recent Activity</h2>
              <button
                onClick={() => navigate('/activity')}
                className="font-inter text-xs transition-opacity hover:opacity-70"
                style={{ color: '#8EB69B' }}
              >
                View all →
              </button>
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((e, i) => (
                  <motion.div
                    key={e.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.42 + i * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{e.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-sm leading-snug" style={{ color: '#DAF1DE' }}>
                        <span style={{ color: '#8EB69B' }}>{e.wallet}</span> {e.description}
                      </p>
                      <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.5)' }}>
                        {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">📭</span>
                <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.5)' }}>
                  No activity yet — upload a file or create a capsule.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Capsule preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>Recent Capsules</h2>
            <button
              onClick={() => navigate('/memory')}
              className="font-inter text-xs transition-opacity hover:opacity-70"
              style={{ color: '#8EB69B' }}
            >
              View all →
            </button>
          </div>
          {capsules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {capsules.slice(0, 4).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.47 + i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{ background: 'rgba(11,43,38,0.3)' }}
                  onClick={() => navigate('/memory')}
                  whileHover={{ background: 'rgba(11,43,38,0.5)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'rgba(142,182,155,0.1)' }}>
                    {c.type === 'Legacy' ? '🕊️' : c.type === 'Time-locked' ? '⏰' : c.type === 'Shared' ? '👥' : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sora font-semibold text-xs truncate" style={{ color: '#DAF1DE' }}>{c.title}</p>
                    <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>
                      {c.photos + c.voice + c.letters} items
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">🌸</span>
              <p className="font-inter text-sm mb-3" style={{ color: 'rgba(142,182,155,0.5)' }}>No capsules yet.</p>
              <button onClick={() => navigate('/memory')} className="btn-primary text-xs px-4 py-2">
                Create first capsule
              </button>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
