import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
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

function AvatarStack({ members }) {
  return (
    <div className="flex -space-x-2">
      {members.slice(0, 4).map((m, i) => (
        <div
          key={m.address}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-sora font-bold border-2 relative"
          style={{
            background: `hsl(${i * 60 + 140}, 35%, 28%)`,
            borderColor: 'rgba(5,31,32,0.9)',
            color: '#DAF1DE',
            zIndex: members.length - i,
          }}
        >
          {m.name.charAt(0)}
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

function ProfileCard({ profile, onClick, onDelete, onEdit }) {
  const typeColor = TYPE_COLORS[profile.type] || TYPE_COLORS.Custom
  const typeRgb   = TYPE_RGB[profile.type]   || TYPE_RGB.Custom
  const [confirmDelete, setConfirmDelete] = useState(false)

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
      onClick={confirmDelete ? undefined : onClick}
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

      {/* Edit + Delete buttons — appear on hover, top-right corner */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        <motion.button
          className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(5,31,32,0.85)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.18)', fontSize: '11px' }}
          onClick={(e) => { e.stopPropagation(); onEdit(profile) }}
          title="Edit circle"
        >
          ✎
        </motion.button>
      </div>
      <div className="absolute top-3 right-12 z-20">
        <AnimatePresence mode="wait">
          {confirmDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(profile.id) }}
                className="text-xs px-2.5 py-1.5 rounded-lg font-sora font-semibold transition-all"
                style={{ background: 'rgba(209,96,31,0.25)', color: '#D1601F', border: '1px solid rgba(209,96,31,0.4)' }}
              >
                Delete
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(11,43,38,0.6)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.2)' }}
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'rgba(5,31,32,0.85)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.18)' }}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
              title="Delete circle"
            >
              ×
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>
                {profile.name}
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
              {profile.type}
            </span>
          </div>
          <div className="text-right">
            <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>{profile.fileCount} files</div>
            <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>{profile.memoryCount} memories</div>
          </div>
        </div>

        <p className="font-inter text-sm mb-4 line-clamp-2" style={{ color: '#8EB69B' }}>
          {profile.description}
        </p>

        <div className="flex items-center justify-between">
          <AvatarStack members={profile.members} />
          <div className="text-right">
            <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>Last active</div>
            <div className="font-inter text-xs" style={{ color: '#DAF1DE' }}>
              {formatDistanceToNow(new Date(profile.lastActivity), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CreateProfileModal({ onClose }) {
  const { addProfile } = useAppStore()
  const [name, setName]               = useState('')
  const [type, setType]               = useState('Family')
  const [description, setDescription] = useState('')

  const handleCreate = () => {
    if (!name.trim()) { toast.error('Please enter a circle name.'); return }
    addProfile({ name: name.trim(), type, description: description.trim() })
    toast.success(`Circle "${name.trim()}" created!`)
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
            <button onClick={handleCreate} className="btn-primary flex-1 text-sm">
              Create circle
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function EditProfileModal({ profile, onClose }) {
  const { updateProfile } = useAppStore()
  const [name,        setName]        = useState(profile.name)
  const [description, setDescription] = useState(profile.description)
  const [type,        setType]        = useState(profile.type)

  const handleSave = () => {
    if (!name.trim()) { toast.error('Name cannot be empty.'); return }
    updateProfile(profile.id, { name: name.trim(), description: description.trim(), type })
    toast.success('Circle updated.')
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
            <button onClick={handleSave} className="btn-primary flex-1 text-sm">Save changes</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function JoinModal({ onClose }) {
  const { joinProfile } = useAppStore()
  const [code, setCode] = useState('')

  const handleJoin = () => {
    if (!code.trim()) { toast.error('Please enter an invite code or wallet address.'); return }
    joinProfile(code.trim())
    toast.success('Join request sent! Circle added to your list.')
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
              Invite Code or Wallet Address
            </label>
            <input
              className="vault-input"
              placeholder="dd-xxxxxxxx or 0x..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={handleJoin} className="btn-cobalt flex-1 text-sm">
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
  const { lang, profiles, setActiveProfile, deleteProfile } = useAppStore()
  const tr = useTranslation(lang)
  const [showCreate,  setShowCreate]  = useState(false)
  const [showJoin,    setShowJoin]    = useState(false)
  const [editProfile, setEditProfile] = useState(null)

  const handleOpenProfile = (profile) => {
    setActiveProfile(profile)
    navigate(`/profiles/${profile.id}`)
  }

  const handleDeleteProfile = (id) => {
    deleteProfile(id)
    toast.success('Circle removed.')
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
              {profiles.length} active circle{profiles.length !== 1 ? 's' : ''} — encrypted &amp; on-chain
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
        {profiles.length === 0 ? (
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
            {profiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProfileCard
                  profile={profile}
                  onClick={() => handleOpenProfile(profile)}
                  onDelete={handleDeleteProfile}
                  onEdit={(p) => setEditProfile(p)}
                />
              </motion.div>
            ))}

            {/* Add circle card */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: profiles.length * 0.08, duration: 0.5 }}
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
        {showCreate  && <CreateProfileModal onClose={() => setShowCreate(false)} />}
        {showJoin    && <JoinModal          onClose={() => setShowJoin(false)}   />}
        {editProfile && <EditProfileModal   profile={editProfile} onClose={() => setEditProfile(null)} />}
      </AnimatePresence>
    </div>
  )
}
