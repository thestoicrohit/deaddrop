import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import { useCircles, useOwnerCircles, useCircleMembers, CIRCLE_ROLE } from '@/hooks/useCircles'
import { useCapsules } from '@/hooks/useCapsules'
import { useActivity } from '@/hooks/useActivity'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'
import SideDecorCanvas from '@/components/ui/SideDecorCanvas'

const TYPE_COLORS = {
  Family:     '#DAF1DE',
  Friends:    '#8EB69B',
  University: '#4a9e6a',
  Work:       '#D1601F',
  Custom:     '#8EB69B',
}

const TYPE_RGB = {
  Family:     '218,241,222',
  Friends:    '142,182,155',
  University: '74,158,106',
  Work:       '209,96,31',
  Custom:     '142,182,155',
}

function tsToDate(ts) {
  return new Date(Number(ts || 0) * 1000)
}

function AvatarStack({ members }) {
  return (
    <div className="flex -space-x-2">
      {members.slice(0, 4).map((m, i) => (
        <div
          key={m.wallet}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-sora font-bold border-2 relative"
          style={{
            background: `hsl(${i * 60 + 140}, 35%, 28%)`,
            borderColor: 'rgba(5,31,32,0.9)',
            color: '#DAF1DE',
            zIndex: members.length - i,
          }}
        >
          {(m.name || m.wallet || '?').charAt(0).toUpperCase()}
        </div>
      ))}
      {members.length > 4 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-inter border-2"
          style={{ background: 'rgba(11,43,38,0.7)', borderColor: 'rgba(5,31,32,0.9)', color: '#8EB69B' }}
        >
          +{members.length - 4}
        </div>
      )}
    </div>
  )
}

// Each card fetches its own member roster (small, per-circle reads — bounded
// by however many circles one wallet belongs to) so it can render the avatar
// stack and work out, locally, whether the connected wallet is an Admin
// (only Admins may edit a circle's details on-chain — see onlyAdmin in
// DeadDropCircles.sol). There is no on-chain "delete circle" or "leave
// circle" function, so neither action is offered here.
function ProfileCard({ circle, fileCount, memoryCount, lastActivityTs, onClick, onEdit }) {
  const { address } = useAccount()
  const { data: members } = useCircleMembers(circle.id)
  const memberList = members || []
  const isAdmin = memberList.some(
    (m) => m.wallet?.toLowerCase() === address?.toLowerCase() && Number(m.role) === CIRCLE_ROLE.ADMIN
  )

  const typeColor = TYPE_COLORS[circle.circleType] || TYPE_COLORS.Custom
  const typeRgb   = TYPE_RGB[circle.circleType]   || TYPE_RGB.Custom

  const lastActiveLabel = lastActivityTs
    ? formatDistanceToNow(new Date(lastActivityTs * 1000), { addSuffix: true })
    : `created ${formatDistanceToNow(tsToDate(circle.createdAt), { addSuffix: true })}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{
        y: -6,
        boxShadow: `0 20px 50px rgba(${typeRgb},0.18), 0 0 0 1px rgba(${typeRgb},0.25)`,
      }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="glass-card p-6 cursor-pointer relative overflow-hidden group"
      style={{ borderLeft: `3px solid ${typeColor}` }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 30% 50%, rgba(${typeRgb},1), transparent 65%)` }}
      />
      <motion.div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${typeRgb},0.6), transparent)` }}
        transition={{ duration: 0.4 }}
      />

      {isAdmin && (
        <div className="absolute top-3 right-3 z-20">
          <motion.button
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(5,31,32,0.85)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.18)', fontSize: '11px' }}
            onClick={(e) => { e.stopPropagation(); onEdit(circle) }}
            title="Edit circle"
          >
            ✎
          </motion.button>
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>
                {circle.name}
              </h3>
            </div>
            <span
              className="inline-block text-xs font-sora font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `rgba(${typeRgb},0.12)`,
                color: typeColor,
                border: `1px solid rgba(${typeRgb},0.35)`,
              }}
            >
              {circle.circleType}
            </span>
          </div>
          <div className="text-right">
            <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>{fileCount} files</div>
            <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>{memoryCount} memories</div>
          </div>
        </div>

        <p className="font-inter text-sm mb-4 line-clamp-2" style={{ color: '#8EB69B' }}>
          {circle.description}
        </p>

        <div className="flex items-center justify-between">
          <AvatarStack members={memberList} />
          <div className="text-right">
            <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>Last active</div>
            <div className="font-inter text-xs capitalize" style={{ color: '#DAF1DE' }}>
              {lastActiveLabel}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CreateProfileModal({ onClose, circles }) {
  const { displayName } = useAppStore()
  const [name,        setName]        = useState('')
  const [type,        setType]        = useState('Family')
  const [description, setDescription] = useState('')
  const [creatorName, setCreatorName] = useState(displayName || '')

  const handleCreate = () => {
    if (!name.trim()) { toast.error('Please enter a circle name.'); return }
    if (!creatorName.trim()) { toast.error('Please enter your name for this circle.'); return }
    circles.createCircle(name.trim(), type, description.trim(), creatorName.trim())
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(5,31,32,0.88)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />
      <motion.div
        className="glass-card p-8 w-full max-w-md relative z-10"
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-sora font-bold text-xl mb-6" style={{ color: '#DAF1DE' }}>
          Create a new circle
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Circle Name</label>
            <input
              className="vault-input"
              placeholder="e.g. Sharma Family"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Your Name (visible to members)</label>
            <input
              className="vault-input"
              placeholder="e.g. Rohit"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Description (optional)</label>
            <input
              className="vault-input"
              placeholder="What's this circle for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_COLORS).map(([t, c]) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="py-2 px-4 rounded-lg text-sm font-sora font-semibold transition-all"
                  style={{
                    background: type === t ? `rgba(${TYPE_RGB[t]},0.15)` : 'rgba(11,43,38,0.12)',
                    border: `1px solid ${type === t ? c : 'rgba(218,241,222,0.1)'}`,
                    color: type === t ? c : '#8EB69B',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={handleCreate} disabled={circles.isPending || circles.isConfirming} className="btn-primary flex-1 text-sm">
              Create circle
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function EditProfileModal({ circle, onClose, circles }) {
  const [name,        setName]        = useState(circle.name)
  const [description, setDescription] = useState(circle.description)
  const [type,        setType]        = useState(circle.circleType)

  const handleSave = () => {
    if (!name.trim()) { toast.error('Name cannot be empty.'); return }
    circles.updateCircle(circle.id, name.trim(), type, description.trim())
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.88)', backdropFilter: 'blur(12px)' }} onClick={onClose} />
      <motion.div className="glass-card p-8 w-full max-w-md relative z-10"
        initial={{ scale: 0.88, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <h2 className="font-sora font-bold text-xl mb-6" style={{ color: '#DAF1DE' }}>Edit circle</h2>
        <div className="space-y-4">
          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Circle Name</label>
            <input className="vault-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} autoFocus />
          </div>
          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Description</label>
            <input className="vault-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_COLORS).map(([t, c]) => (
                <button key={t} onClick={() => setType(t)}
                  className="py-2 px-4 rounded-lg text-sm font-sora font-semibold transition-all"
                  style={{ background: type === t ? `rgba(${TYPE_RGB[t]},0.15)` : 'rgba(11,43,38,0.12)', border: `1px solid ${type === t ? c : 'rgba(218,241,222,0.1)'}`, color: type === t ? c : '#8EB69B' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={handleSave} disabled={circles.isPending || circles.isConfirming} className="btn-primary flex-1 text-sm">Save changes</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Circles have no off-chain invite-code system — joinCircle() just needs the
// numeric Circle ID (share it with people the way you'd share an invite link)
// plus the display name you want other members to see.
function JoinModal({ onClose, circles }) {
  const { displayName } = useAppStore()
  const [circleId, setCircleId] = useState('')
  const [name,     setName]     = useState(displayName || '')

  const handleJoin = () => {
    const idNum = circleId.trim()
    if (!/^\d+$/.test(idNum) || idNum === '0') { toast.error('Enter a valid numeric Circle ID.'); return }
    if (!name.trim()) { toast.error('Enter your name.'); return }
    circles.joinCircle(idNum, name.trim())
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(5,31,32,0.88)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />
      <motion.div
        className="glass-card p-8 w-full max-w-md relative z-10"
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-sora font-bold text-xl mb-6" style={{ color: '#DAF1DE' }}>
          Join a circle
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>
              Circle ID
            </label>
            <input
              className="vault-input"
              placeholder="e.g. 3"
              value={circleId}
              onChange={(e) => setCircleId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
          </div>
          <div>
            <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>
              Your Name
            </label>
            <input
              className="vault-input"
              placeholder="e.g. Rohit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={handleJoin} disabled={circles.isPending || circles.isConfirming} className="btn-cobalt flex-1 text-sm">
              Send Request
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ProfilesPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { lang } = useAppStore()
  const tr = useTranslation(lang)

  const circles = useCircles()
  const owner   = useOwnerCircles(address)
  const { myCapsules } = useCapsules()
  const { activity } = useActivity()

  const [showCreate,  setShowCreate]  = useState(false)
  const [showJoin,    setShowJoin]    = useState(false)
  const [editCircle, setEditCircle]   = useState(null)

  // Any confirmed write from this page's useCircles() instance (create,
  // update, join) should refresh the owner's circle/file list it renders from.
  useEffect(() => {
    if (circles.isConfirmed) owner.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circles.isConfirmed, circles.txHash])

  const memoryCountByCircle = useMemo(() => {
    const map = {}
    myCapsules.forEach((c) => {
      if (c.circleId == null) return
      const k = c.circleId.toString()
      map[k] = (map[k] || 0) + 1
    })
    return map
  }, [myCapsules])

  const lastActivityByCircle = useMemo(() => {
    const map = {}
    activity.forEach((item) => {
      if (item.domain !== 'circles' || item.args?.circleId == null) return
      const k  = item.args.circleId.toString()
      const ts = Number(item.timestamp || 0)
      if (!map[k] || ts > map[k]) map[k] = ts
    })
    return map
  }, [activity])

  const handleOpenProfile = (circle) => navigate(`/profiles/${circle.id.toString()}`)

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-sora text-xl mb-4" style={{ color: '#8EB69B' }}>Connect your wallet to view your circles.</p>
          <button onClick={() => navigate('/connect')} className="btn-primary">Connect Wallet</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>

      <FlowingCanvas />

      <div className="fixed top-0 left-0 h-full pointer-events-none"
        style={{ width: 'clamp(130px, 15vw, 240px)', zIndex: 1, opacity: 0.75 }}>
        <SideDecorCanvas type="hand-left" />
      </div>
      <div className="fixed top-0 right-0 h-full pointer-events-none"
        style={{ width: 'clamp(130px, 15vw, 240px)', zIndex: 1, opacity: 0.75 }}>
        <SideDecorCanvas type="hand-right" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {!circles.contractReady && (
          <div className="mb-6 p-3 rounded-xl text-center font-inter text-sm" style={{ background: 'rgba(209,96,31,0.12)', color: '#D1601F' }}>
            Circles contract not deployed yet — run <code>npm run deploy:sepolia</code>.
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: '#8EB69B' }} />
              <span className="font-inter text-xs uppercase tracking-widest" style={{ color: '#8EB69B' }}>
                Legacy Circles
              </span>
            </div>
            <h1 className="font-sora font-bold text-3xl md:text-4xl shimmer-text">
              {tr('profiles.title')}
            </h1>
            <p className="font-inter text-sm mt-1" style={{ color: '#8EB69B' }}>
              {owner.circles.length} active circle{owner.circles.length !== 1 ? 's' : ''} — encrypted &amp; on-chain
            </p>
          </motion.div>

          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={() => setShowJoin(true)}
              className="btn-outline text-sm px-4 py-2 hidden sm:block"
              style={{ color: '#8EB69B', borderColor: 'rgba(142,182,155,0.4)' }}
            >
              {tr('profiles.join')}
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2">
              + {tr('profiles.create')}
            </button>
          </motion.div>
        </div>

        {/* Grid */}
        {owner.isLoading ? (
          <div className="text-center py-24">
            <p className="font-sora text-lg" style={{ color: '#8EB69B' }}>Loading your circles…</p>
          </div>
        ) : owner.circles.length === 0 ? (
          <motion.div className="text-center py-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-5xl mb-4">🏡</div>
            <p className="font-sora text-lg" style={{ color: '#8EB69B' }}>
              {tr('profiles.empty')}
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-6">
              Create your first circle
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {owner.circles.map((circle, i) => {
              const key = circle.id.toString()
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProfileCard
                    circle={circle}
                    fileCount={circle.files?.length || 0}
                    memoryCount={memoryCountByCircle[key] || 0}
                    lastActivityTs={lastActivityByCircle[key]}
                    onClick={() => handleOpenProfile(circle)}
                    onEdit={(c) => setEditCircle(c)}
                  />
                </motion.div>
              )
            })}

            {/* Add circle card */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: owner.circles.length * 0.08, duration: 0.5 }}
              whileHover={{
                borderColor: 'rgba(142,182,155,0.55)',
                boxShadow: '0 12px 40px rgba(142,182,155,0.1)',
                scale: 1.015,
              }}
              onClick={() => setShowCreate(true)}
              className="glass-card p-6 cursor-pointer flex flex-col items-center justify-center gap-3 group min-h-[180px]"
              style={{ border: '2px dashed rgba(218,241,222,0.18)' }}
            >
              <motion.span
                className="text-3xl transition-transform"
                style={{ color: '#8EB69B', opacity: 0.45 }}
                whileHover={{ opacity: 0.85, scale: 1.15 }}
              >
                +
              </motion.span>
              <span className="font-sora text-sm" style={{ color: '#8EB69B' }}>New circle</span>
            </motion.div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate  && <CreateProfileModal onClose={() => setShowCreate(false)} circles={circles} />}
        {showJoin    && <JoinModal          onClose={() => setShowJoin(false)}   circles={circles} />}
        {editCircle  && <EditProfileModal   circle={editCircle} onClose={() => setEditCircle(null)} circles={circles} />}
      </AnimatePresence>
    </div>
  )
}
