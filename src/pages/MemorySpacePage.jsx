import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'

const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

const TYPE_BADGES = {
  Private:      { cls: 'badge-satsuma', icon: '🔒' },
  Shared:       { cls: 'badge-cobalt',  icon: '👥' },
  'Time-locked':{ cls: 'badge-satsuma', icon: '⏰' },
  Legacy:       { cls: 'badge-yellow',  icon: '🕊️' },
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #051F20, #0B2B26)',
  'linear-gradient(135deg, #0B2B26, #163832)',
  'linear-gradient(135deg, #163832, #051F20)',
  'linear-gradient(135deg, #70191D, #0B2B26)',
  'linear-gradient(135deg, #1a0810, #051F20)',
  'linear-gradient(135deg, #0a1525, #0B2B26)',
]

// ── Capsule card ──────────────────────────────────────────────────────────────
function CapsuleCard({ capsule, onClick }) {
  const { reactions, addReaction } = useAppStore()
  const badge      = TYPE_BADGES[capsule.type] || TYPE_BADGES.Private
  const capReacts  = reactions[capsule.id] || {}
  const userReacted = capReacts.userReacted || []

  // Stable gradient per capsule id
  const gradIdx = capsule.id
    ? capsule.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % COVER_GRADIENTS.length
    : 0

  const handleReaction = (e, emoji) => {
    e.stopPropagation()
    const added = addReaction(capsule.id, emoji)
    toast(added ? `${emoji} reaction added` : `${emoji} reaction removed`, { duration: 1400 })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -6, boxShadow: '0 20px 50px rgba(142,182,155,0.15), 0 0 0 1px rgba(142,182,155,0.12)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="glass-card overflow-hidden cursor-pointer group break-inside-avoid mb-4 relative"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(142,182,155,0.04) 0%, transparent 60%)' }}
      />

      {/* Cover */}
      <div
        className="relative w-full flex items-end p-4"
        style={{ minHeight: '120px', background: COVER_GRADIENTS[gradIdx] }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          <span className="text-6xl">{badge.icon}</span>
        </div>
        <span className={`${badge.cls} relative z-10`}>{badge.icon} {capsule.type}</span>
        {capsule.unlockDate && (
          <div
            className="absolute top-3 right-3 text-xs font-sora px-2 py-1 rounded-lg"
            style={{ background: 'rgba(11,43,38,0.7)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.2)' }}
          >
            Unlocks {format(new Date(capsule.unlockDate), 'MMM yyyy')}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-sora font-semibold text-base mb-2 line-clamp-2" style={{ color: '#DAF1DE' }}>
          {capsule.title}
        </h3>
        <p className="font-inter text-sm mb-4 line-clamp-3" style={{ color: '#8EB69B' }}>
          {capsule.contentPreview}
        </p>

        <div className="flex gap-3 mb-4">
          {capsule.photos > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#8EB69B' }}>
              <span>📸</span> {capsule.photos}
            </div>
          )}
          {capsule.voice > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#8EB69B' }}>
              <span>🎙️</span> {capsule.voice}
            </div>
          )}
          {capsule.letters > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#8EB69B' }}>
              <span>💌</span> {capsule.letters}
            </div>
          )}
        </div>

        <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
          {format(new Date(capsule.date), 'dd MMMM yyyy')}
        </p>

        {/* Reactions */}
        <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(218,241,222,0.07)' }}>
          {['🕯️', '❤️', '🌸'].map((emoji) => {
            const count      = capReacts[emoji] || 0
            const hasReacted = userReacted.includes(emoji)
            return (
              <button
                key={emoji}
                onClick={(e) => handleReaction(e, emoji)}
                className="flex items-center gap-1 text-lg transition-transform hover:scale-125"
                style={{ opacity: hasReacted ? 1 : 0.65, transform: hasReacted ? 'scale(1.12)' : undefined }}
                title={hasReacted ? 'Remove reaction' : 'Add reaction'}
              >
                {emoji}
                {count > 0 && (
                  <span className="text-xs font-sora font-semibold" style={{ color: '#8EB69B' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ── Capsule detail modal ──────────────────────────────────────────────────────
function CapsuleDetail({ capsule, onClose, onDelete }) {
  const { setAiOpen, capsuleContent, addCapsuleContent, removeCapsuleContent, updateCapsule } = useAppStore()
  const [tab,           setTab]          = useState('overview')
  const [confirmDelete, setConfirmDelete]= useState(false)
  const [editing,       setEditing]      = useState(false)
  const [editTitle,     setEditTitle]    = useState(capsule.title)
  const [editDesc,      setEditDesc]     = useState(capsule.contentPreview)
  const [letterText,    setLetterText]   = useState('')
  const [recording,     setRecording]    = useState(false)
  const photoRef    = useRef(null)
  const recordRef   = useRef(null)
  const content     = capsuleContent[capsule.id] || { photos: [], letters: [], voice: [] }

  const handleSaveEdit = () => {
    if (!editTitle.trim()) { toast.error('Title cannot be empty.'); return }
    updateCapsule(capsule.id, { title: editTitle.trim(), contentPreview: editDesc.trim() })
    toast.success('Capsule updated.')
    setEditing(false)
  }

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files)
    files.forEach((f) => {
      addCapsuleContent(capsule.id, 'photos', { id: uid(), name: f.name, url: URL.createObjectURL(f), date: new Date().toISOString() })
    })
    toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} added.`)
    e.target.value = ''
  }

  const handleLetterSave = () => {
    if (!letterText.trim()) { toast.error('Write something first.'); return }
    addCapsuleContent(capsule.id, 'letters', { id: uid(), content: letterText.trim(), savedAt: new Date().toISOString() })
    setLetterText('')
    toast.success('Letter saved to capsule.')
  }

  const handleRecordToggle = () => {
    if (!recording) {
      recordRef.current = Date.now()
      setRecording(true)
      toast.success('Recording…')
    } else {
      const secs = Math.max(1, Math.floor((Date.now() - recordRef.current) / 1000))
      addCapsuleContent(capsule.id, 'voice', {
        id: uid(),
        name: `Voice — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        duration: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
        date: new Date().toISOString(),
      })
      setRecording(false)
      toast.success('Voice note saved.')
    }
  }

  const handleAiPortrait = () => { onClose(); setAiOpen(true); toast.success('Opening AI assistant…') }

  return (
    <motion.div className="fixed inset-0 z-50 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.94)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <motion.div className="relative z-10 max-w-2xl mx-auto my-8 px-4"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
        <div className="glass-card overflow-hidden">
          {/* Cover */}
          <div className="relative w-full h-36 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #051F20, #0B2B26)' }}>
            <span className="text-6xl opacity-20">{TYPE_BADGES[capsule.type]?.icon}</span>
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(11,43,38,0.7)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.2)' }}>✕</button>
          </div>

          <div className="p-6">
            {/* Title row */}
            {editing ? (
              <div className="space-y-3 mb-4">
                <input className="vault-input font-sora font-bold text-lg" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                <textarea className="vault-input text-sm resize-none" rows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description…" />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="btn-primary text-sm flex-1">Save</button>
                  <button onClick={() => { setEditing(false); setEditTitle(capsule.title); setEditDesc(capsule.contentPreview) }} className="btn-outline text-sm px-4">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                <div>
                  <h2 className="font-sora font-bold text-xl mb-1" style={{ color: '#DAF1DE' }}>{capsule.title}</h2>
                  <span className={TYPE_BADGES[capsule.type]?.cls}>{TYPE_BADGES[capsule.type]?.icon} {capsule.type}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}>Edit</button>
                  <button onClick={handleAiPortrait} className="btn-cobalt text-sm px-4 py-2">AI Portrait ✨</button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(11,43,38,0.4)' }}>
              {['overview', 'photos', 'letters', 'voice'].map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-sora font-semibold capitalize transition-all"
                  style={{ background: tab === t ? 'rgba(142,182,155,0.15)' : 'transparent', color: tab === t ? '#DAF1DE' : '#8EB69B' }}>
                  {t}{t === 'photos' && content.photos.length > 0 ? ` (${content.photos.length})` : ''}
                  {t === 'letters' && content.letters.length > 0 ? ` (${content.letters.length})` : ''}
                  {t === 'voice'   && content.voice.length   > 0 ? ` (${content.voice.length})`   : ''}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {tab === 'overview' && (
              <div>
                <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>{capsule.contentPreview}</p>
                <div className="flex gap-4 flex-wrap mb-4">
                  {[['📸', 'photos', capsule.photos], ['🎙️', 'voice', capsule.voice], ['💌', 'letters', capsule.letters]].map(([icon, type, count]) => (
                    <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      style={{ background: 'rgba(11,43,38,0.4)' }} onClick={() => setTab(type)}>
                      <span>{icon}</span>
                      <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>{count} {type}</span>
                    </div>
                  ))}
                </div>
                <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
                  Created {format(new Date(capsule.date), 'dd MMM yyyy')}
                  {capsule.unlockDate && ` · Unlocks ${format(new Date(capsule.unlockDate), 'dd MMM yyyy')}`}
                </p>
              </div>
            )}

            {/* Photos tab */}
            {tab === 'photos' && (
              <div className="space-y-3">
                <input ref={photoRef} type="file" multiple accept="image/*" hidden onChange={handlePhotoAdd} />
                <button onClick={() => photoRef.current?.click()} className="w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all"
                  style={{ borderColor: 'rgba(218,241,222,0.2)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.45)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.2)')}>
                  <span className="text-2xl">📸</span>
                  <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>Click to add photos</span>
                </button>
                {content.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {content.photos.map((p) => (
                      <div key={p.id} className="aspect-square rounded-xl overflow-hidden relative group">
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                        <button onClick={() => removeCapsuleContent(capsule.id, 'photos', p.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(5,31,32,0.8)', color: '#DAF1DE' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Letters tab */}
            {tab === 'letters' && (
              <div className="space-y-3">
                <textarea className="vault-input resize-none text-sm leading-relaxed w-full" rows={5}
                  placeholder="Write a letter for this capsule…"
                  value={letterText} onChange={(e) => setLetterText(e.target.value)} />
                <div className="flex justify-end">
                  <button onClick={handleLetterSave} className="btn-primary text-sm">Save letter</button>
                </div>
                {content.letters.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {content.letters.map((l) => (
                      <div key={l.id} className="p-3 rounded-xl relative group" style={{ background: 'rgba(11,43,38,0.3)' }}>
                        <p className="font-inter text-sm leading-relaxed" style={{ color: '#DAF1DE' }}>{l.content.slice(0, 120)}{l.content.length > 120 ? '…' : ''}</p>
                        <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.5)' }}>{format(new Date(l.savedAt), 'dd MMM yyyy HH:mm')}</p>
                        <button onClick={() => removeCapsuleContent(capsule.id, 'letters', l.id)}
                          className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-60 transition-opacity"
                          style={{ color: '#8EB69B' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Voice tab */}
            {tab === 'voice' && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <motion.button onClick={handleRecordToggle} whileTap={{ scale: 0.92 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: recording ? '#0B2B26' : 'rgba(142,182,155,0.12)', border: '2px solid rgba(142,182,155,0.35)' }}
                    animate={recording ? { boxShadow: ['0 0 0 0 rgba(142,182,155,0.4)', '0 0 0 14px rgba(142,182,155,0)'] } : {}}
                    transition={recording ? { duration: 1, repeat: Infinity } : {}}>
                    🎙️
                  </motion.button>
                  <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                    {recording ? 'Recording… tap to stop' : content.voice.length === 0 ? 'Tap to record' : `${content.voice.length} note${content.voice.length > 1 ? 's' : ''} · Tap to record more`}
                  </p>
                </div>
                {content.voice.length > 0 && (
                  <div className="space-y-2">
                    {content.voice.map((n) => (
                      <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(11,43,38,0.3)' }}>
                        <button className="text-lg flex-shrink-0" onClick={() => toast('Audio playback requires the full app.', { icon: '🎙️' })}>▶️</button>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-sm truncate" style={{ color: '#DAF1DE' }}>{n.name}</p>
                        </div>
                        <span className="font-inter text-xs flex-shrink-0" style={{ color: '#8EB69B' }}>{n.duration}</span>
                        <button onClick={() => removeCapsuleContent(capsule.id, 'voice', n.id)} className="text-sm flex-shrink-0 transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delete */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(142,182,155,0.08)' }}>
              <AnimatePresence mode="wait">
                {confirmDelete ? (
                  <motion.div key="confirm-del" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2">
                    <button onClick={() => { onDelete(capsule.id); onClose() }} className="flex-1 text-sm py-2 rounded-xl font-sora font-semibold" style={{ background: 'rgba(209,96,31,0.2)', color: '#D1601F', border: '1px solid rgba(209,96,31,0.4)' }}>Confirm delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="text-sm px-5 py-2 rounded-xl" style={{ background: 'rgba(142,182,155,0.08)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.18)' }}>Cancel</button>
                  </motion.div>
                ) : (
                  <motion.button key="del-btn" animate={{ opacity: 1 }} onClick={() => setConfirmDelete(true)}
                    className="w-full text-xs font-inter text-center py-1.5 transition-opacity hover:opacity-80"
                    style={{ color: 'rgba(142,182,155,0.4)' }}>
                    Delete capsule
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Create capsule modal ──────────────────────────────────────────────────────
function CreateCapsuleModal({ onClose }) {
  const { addCapsule } = useAppStore()
  const [title,       setTitle]      = useState('')
  const [type,        setType]       = useState('Private')
  const [description, setDescription]= useState('')
  const [unlockDate,  setUnlockDate] = useState('')

  const handleCreate = () => {
    if (!title.trim()) { toast.error('Please name your capsule.'); return }
    addCapsule({ title: title.trim(), type, description: description.trim(), unlockDate: unlockDate || null })
    toast.success(`"${title.trim()}" capsule created!`)
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
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-sora font-bold text-xl mb-6" style={{ color: '#DAF1DE' }}>
          Create a memory capsule
        </h2>
        <div className="space-y-4">
          <input
            className="vault-input"
            placeholder="Capsule name…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <input
            className="vault-input"
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            {Object.keys(TYPE_BADGES).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="py-2 px-4 rounded-lg text-sm font-sora flex items-center gap-2 transition-all"
                style={{
                  background: type === t ? 'rgba(142,182,155,0.15)' : 'rgba(11,43,38,0.1)',
                  border: `1px solid ${type === t ? 'rgba(218,241,222,0.4)' : 'rgba(218,241,222,0.1)'}`,
                  color: type === t ? '#DAF1DE' : '#8EB69B',
                }}
              >
                <span>{TYPE_BADGES[t].icon}</span> {t}
              </button>
            ))}
          </div>

          {type === 'Time-locked' && (
            <div>
              <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>
                Unlock date
              </label>
              <input
                type="date"
                className="vault-input"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={handleCreate} className="btn-primary flex-1 text-sm">
              Create capsule
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MemorySpacePage() {
  const { lang, capsules, deleteCapsule } = useAppStore()
  const tr = useTranslation(lang)
  const [selectedCapsule, setSelectedCapsule] = useState(null)
  const [showCreate,      setShowCreate]       = useState(false)
  const [filter,          setFilter]           = useState('All')

  const handleDeleteCapsule = (id) => {
    deleteCapsule(id)
    toast.success('Capsule deleted.')
  }

  const filters  = ['All', 'Private', 'Shared', 'Time-locked', 'Legacy']
  const filtered = filter === 'All' ? capsules : capsules.filter((c) => c.type === filter)

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>

      <FlowingCanvas />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: '#8EB69B' }} />
            <span className="font-inter text-xs uppercase tracking-widest" style={{ color: '#8EB69B' }}>
              Encrypted · IPFS-backed
            </span>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-sora font-bold text-3xl md:text-4xl shimmer-text mb-2">
                {tr('memory.title')}
              </h1>
              <p className="font-inter text-base" style={{ color: '#8EB69B' }}>
                {tr('memory.subtitle')}
              </p>
            </div>
            <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
              {capsules.length} capsule{capsules.length !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>

        {/* Filter pills */}
        <motion.div
          className="flex gap-2 flex-wrap mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
        >
          {filters.map((f) => (
            <motion.button
              key={f}
              onClick={() => setFilter(f)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="px-4 py-1.5 rounded-full text-sm font-sora font-medium transition-all"
              style={{
                background: filter === f ? '#0B2B26' : 'rgba(11,43,38,0.2)',
                color:      filter === f ? '#DAF1DE' : '#8EB69B',
                border:     `1px solid ${filter === f ? 'rgba(218,241,222,0.3)' : 'rgba(218,241,222,0.08)'}`,
                boxShadow:  filter === f ? '0 0 14px rgba(142,182,155,0.2)' : 'none',
              }}
            >
              {f}
            </motion.button>
          ))}
        </motion.div>

        {/* Masonry grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {filtered.map((capsule, i) => (
            <motion.div
              key={capsule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <CapsuleCard capsule={capsule} onClick={() => setSelectedCapsule(capsule)} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="text-5xl block mb-4">🌸</span>
            <p className="font-sora text-lg mb-2" style={{ color: '#8EB69B' }}>
              No {filter.toLowerCase()} capsules yet.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-2 text-sm">
              Create one now
            </button>
          </motion.div>
        )}
      </div>

      {/* Floating create button */}
      <motion.button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-6 z-40 btn-primary w-14 h-14 rounded-full text-2xl flex items-center justify-center"
        whileHover={{ scale: 1.12, boxShadow: '0 0 32px rgba(142,182,155,0.4)' }}
        whileTap={{ scale: 0.95 }}
        title={tr('memory.createCapsule')}
      >
        +
      </motion.button>

      <AnimatePresence>
        {selectedCapsule && (
          <CapsuleDetail
            capsule={selectedCapsule}
            onClose={() => setSelectedCapsule(null)}
            onDelete={handleDeleteCapsule}
          />
        )}
        {showCreate && <CreateCapsuleModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  )
}
