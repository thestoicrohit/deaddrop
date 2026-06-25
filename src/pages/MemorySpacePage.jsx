import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSignMessage } from 'wagmi'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import {
  useCapsules, useCapsule, useCapsuleContent, useCapsuleReactions, useMyReactions, useCapsuleUnlocked,
  CAPSULE_TYPE, CONTENT_TYPE,
} from '@/hooks/useCapsules'
import { useCircles } from '@/hooks/useCircles'
import { MEMORY_MESSAGE, deriveMemoryKey, encryptBlob, decryptBlob } from '@/lib/crypto'
import { uploadBlob, fetchBlob, isIPFSConfigured } from '@/lib/ipfs'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'

// ─────────────────────────────────────────────────────────────────────────────
// MemorySpacePage — on-chain Memory Capsules (DeadDropCapsules.sol)
//
// Title/description/type/circle-link are plain on-chain fields — visible
// instantly, no signature needed. Only the actual content (photos, letters,
// voice notes) is AES-256-GCM encrypted client-side with a key deterministically
// derived from a free wallet signature (deriveMemoryKey, src/lib/crypto.js) —
// requested lazily, the first time a capsule's content is opened or added to,
// not as an up-front gate on the whole page.
// ─────────────────────────────────────────────────────────────────────────────

const CAPSULE_TYPE_META = {
  [CAPSULE_TYPE.PRIVATE]:     { label: 'Private',     icon: '🔒', badge: 'satsuma' },
  [CAPSULE_TYPE.SHARED]:      { label: 'Shared',       icon: '👥', badge: 'cobalt'  },
  [CAPSULE_TYPE.TIME_LOCKED]: { label: 'Time-locked',  icon: '⏰', badge: 'satsuma' },
  [CAPSULE_TYPE.LEGACY]:      { label: 'Legacy',       icon: '🕊️', badge: 'yellow'  },
}

const FILTERS = [
  { label: 'All',         value: null },
  { label: 'Private',     value: CAPSULE_TYPE.PRIVATE },
  { label: 'Shared',      value: CAPSULE_TYPE.SHARED },
  { label: 'Time-locked', value: CAPSULE_TYPE.TIME_LOCKED },
  { label: 'Legacy',      value: CAPSULE_TYPE.LEGACY },
]

const REACTION_EMOJI = ['🕯️', '❤️', '🌸']

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #051F20, #0B2B26)',
  'linear-gradient(135deg, #0B2B26, #163832)',
  'linear-gradient(135deg, #163832, #051F20)',
  'linear-gradient(135deg, #70191D, #0B2B26)',
  'linear-gradient(135deg, #1a0810, #051F20)',
  'linear-gradient(135deg, #0a1525, #0B2B26)',
]

// ── helpers ──────────────────────────────────────────────────────────────────
function tsToDate(ts) {
  return new Date(Number(ts || 0) * 1000)
}

function requireIPFS() {
  if (!isIPFSConfigured()) {
    toast.error('IPFS storage not configured — add VITE_PINATA_JWT to .env first.')
    return false
  }
  return true
}

async function encryptAndUpload(bytes, filename, key) {
  const encrypted = await encryptBlob(bytes, key)
  return uploadBlob(encrypted, filename)
}

async function fetchAndDecrypt(cid, key) {
  const blob  = await fetchBlob(cid)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return decryptBlob(bytes, key)
}

function jsonToBytes(obj) {
  return new TextEncoder().encode(JSON.stringify(obj))
}

// ── File preview modal ────────────────────────────────────────────────────────
function FilePreview({ file, onClose }) {
  const isImage = file.url && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes((file.type || '').toLowerCase())

  const handleDownload = () => {
    if (file.url) {
      const a = document.createElement('a')
      a.href = file.url
      a.download = file.name || 'deaddrop-memory'
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.success('Downloaded.')
    } else {
      toast.error('Could not decrypt this file.')
    }
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.94)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-lg" initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        <div className="glass-card overflow-hidden">
          <div className="w-full flex items-center justify-center" style={{ minHeight: '200px', background: 'rgba(5,31,32,0.6)' }}>
            {isImage && file.url ? (
              <img src={file.url} alt={file.name} className="max-w-full max-h-80 object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12">
                <span className="text-5xl">📁</span>
                <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.6)' }}>Preview not available</p>
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-sora font-semibold text-base truncate" style={{ color: '#DAF1DE' }}>{file.name}</h3>
                <p className="font-inter text-xs mt-0.5" style={{ color: '#8EB69B' }}>IPFS · encrypted</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(11,43,38,0.7)', color: '#8EB69B' }}>✕</button>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDownload} className="btn-primary flex-1 text-sm">Download</button>
              <button onClick={onClose} className="btn-outline text-sm px-4">Close</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Capsule card ──────────────────────────────────────────────────────────────
function CapsuleCard({ capsule, capsules, onClick }) {
  const { address } = useAccount()
  const meta = CAPSULE_TYPE_META[Number(capsule.capsuleType)] || CAPSULE_TYPE_META[CAPSULE_TYPE.PRIVATE]

  const { data: content } = useCapsuleContent(capsule.id)
  const { data: unlockedData } = useCapsuleUnlocked(capsule.id)
  const unlocked = unlockedData ?? true
  const { data: reactionCounts, refetch: refetchReactions } = useCapsuleReactions(capsule.id)
  const { data: myBits, refetch: refetchMyReactions } = useMyReactions(capsule.id, address)

  useEffect(() => {
    if (capsules.isConfirmed) { refetchReactions(); refetchMyReactions() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capsules.isConfirmed, capsules.txHash])

  const counts = useMemo(() => {
    const items = content || []
    return {
      photos:  items.filter((i) => Number(i.itemType) === CONTENT_TYPE.PHOTO).length,
      letters: items.filter((i) => Number(i.itemType) === CONTENT_TYPE.LETTER).length,
      voice:   items.filter((i) => Number(i.itemType) === CONTENT_TYPE.VOICE).length,
    }
  }, [content])

  const gradIdx  = Number(capsule.id % BigInt(COVER_GRADIENTS.length))
  const unlockMs = Number(capsule.unlockDate || 0) * 1000
  const isTimeLocked = Number(capsule.capsuleType) === CAPSULE_TYPE.TIME_LOCKED && unlockMs > 0

  const handleReaction = (e, idx) => {
    e.stopPropagation()
    capsules.react(capsule.id, idx)
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

      <div className="relative w-full flex items-end p-4" style={{ minHeight: '120px', background: COVER_GRADIENTS[gradIdx] }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          <span className="text-6xl">{meta.icon}</span>
        </div>
        <span className={`badge-${meta.badge} relative z-10`}>{meta.icon} {meta.label}</span>
        {isTimeLocked && (
          <div className="absolute top-3 right-3 text-xs font-sora px-2 py-1 rounded-lg"
            style={{ background: 'rgba(11,43,38,0.7)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.2)' }}>
            {unlocked ? 'Unlocked' : `Unlocks ${format(new Date(unlockMs), 'MMM yyyy')}`}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-sora font-semibold text-base mb-2 line-clamp-2" style={{ color: '#DAF1DE' }}>
          {capsule.title}
        </h3>
        {capsule.contentPreview && (
          <p className="font-inter text-sm mb-4 line-clamp-3" style={{ color: '#8EB69B' }}>
            {capsule.contentPreview}
          </p>
        )}

        <div className="flex gap-3 mb-4">
          {counts.photos > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#8EB69B' }}><span>📸</span> {counts.photos}</div>
          )}
          {counts.voice > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#8EB69B' }}><span>🎙️</span> {counts.voice}</div>
          )}
          {counts.letters > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#8EB69B' }}><span>💌</span> {counts.letters}</div>
          )}
        </div>

        <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
          {format(tsToDate(capsule.createdAt), 'dd MMMM yyyy')}
        </p>

        <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(218,241,222,0.07)' }}>
          {REACTION_EMOJI.map((emoji, idx) => {
            const count      = Number(reactionCounts?.[idx] || 0)
            const hasReacted = !!(Number(myBits || 0) & (1 << idx))
            return (
              <button
                key={idx}
                onClick={(e) => handleReaction(e, idx)}
                className="flex items-center gap-1 text-lg transition-transform hover:scale-125"
                style={{ opacity: hasReacted ? 1 : 0.65, transform: hasReacted ? 'scale(1.12)' : undefined }}
                title={hasReacted ? 'Remove reaction' : 'Add reaction'}
              >
                {emoji}
                {count > 0 && <span className="text-xs font-sora font-semibold" style={{ color: '#8EB69B' }}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ── Capsule detail modal ──────────────────────────────────────────────────────
function CapsuleDetail({ capsuleId, capsules, circles, memoryKey, unlocking, ensureMemoryKey, onClose }) {
  const { data: capsule, isLoading } = useCapsule(capsuleId)
  const meta = capsule ? (CAPSULE_TYPE_META[Number(capsule.capsuleType)] || CAPSULE_TYPE_META[CAPSULE_TYPE.PRIVATE]) : null

  const { data: unlockedData } = useCapsuleUnlocked(capsuleId)
  const unlocked = unlockedData ?? true
  const { data: rawContent, refetch: refetchContent } = useCapsuleContent(capsuleId)
  const items = rawContent || []
  const photos  = useMemo(() => items.filter((i) => Number(i.itemType) === CONTENT_TYPE.PHOTO),  [items])
  const letters = useMemo(() => items.filter((i) => Number(i.itemType) === CONTENT_TYPE.LETTER), [items])
  const voice   = useMemo(() => items.filter((i) => Number(i.itemType) === CONTENT_TYPE.VOICE),  [items])

  useEffect(() => {
    if (capsules.isConfirmed) refetchContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capsules.isConfirmed, capsules.txHash])

  // Capsule got soft-deleted (exists=false) while this modal was open — close it.
  useEffect(() => {
    if (!isLoading && !capsule) onClose()
  }, [isLoading, capsule]) // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab]                 = useState('overview')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing]         = useState(false)
  const [editTitle, setEditTitle]     = useState('')
  const [editDesc, setEditDesc]       = useState('')

  useEffect(() => {
    if (capsule) { setEditTitle(capsule.title); setEditDesc(capsule.contentPreview) }
  }, [capsule?.title, capsule?.contentPreview]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!capsule) return null

  const linkedCircle = (circles.myCircles || []).find((c) => Number(c.id) === Number(capsule.circleId))

  const handleSaveEdit = () => {
    if (!editTitle.trim()) { toast.error('Title cannot be empty.'); return }
    capsules.updateCapsule(capsule.id, editTitle.trim(), editDesc.trim())
    setEditing(false)
  }

  const handleDelete = () => {
    capsules.deleteCapsule(capsule.id)
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-50 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.94)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <motion.div className="relative z-10 max-w-2xl mx-auto my-8 px-4"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
        <div className="glass-card overflow-hidden">
          <div className="relative w-full h-36 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #051F20, #0B2B26)' }}>
            <span className="text-6xl opacity-20">{meta.icon}</span>
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(11,43,38,0.7)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.2)' }}>✕</button>
          </div>

          <div className="p-6">
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
                  <span className={`badge-${meta.badge}`}>{meta.icon} {meta.label}</span>
                  {linkedCircle && (
                    <span className="font-inter text-xs ml-2" style={{ color: '#8EB69B' }}>· shared with {linkedCircle.name}</span>
                  )}
                </div>
                <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-lg transition-all flex-shrink-0" style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}>Edit</button>
              </div>
            )}

            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(11,43,38,0.4)' }}>
              {['overview', 'photos', 'letters', 'voice'].map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-sora font-semibold capitalize transition-all"
                  style={{ background: tab === t ? 'rgba(142,182,155,0.15)' : 'transparent', color: tab === t ? '#DAF1DE' : '#8EB69B' }}>
                  {t}{t === 'photos' && photos.length > 0 ? ` (${photos.length})` : ''}
                  {t === 'letters' && letters.length > 0 ? ` (${letters.length})` : ''}
                  {t === 'voice'   && voice.length   > 0 ? ` (${voice.length})`   : ''}
                </button>
              ))}
            </div>

            {tab !== 'overview' && !memoryKey && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl mb-4" style={{ background: 'rgba(11,43,38,0.35)', border: '1px solid rgba(142,182,155,0.15)' }}>
                <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                  Sign once (free, no gas) to decrypt this capsule's content.
                </p>
                <button onClick={ensureMemoryKey} disabled={unlocking} className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap">
                  {unlocking ? 'Signing…' : 'Sign to view'}
                </button>
              </div>
            )}

            {tab === 'overview' && (
              <div>
                {capsule.contentPreview && (
                  <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>{capsule.contentPreview}</p>
                )}
                <div className="flex gap-4 flex-wrap mb-4">
                  {[['📸', 'photos', photos.length], ['🎙️', 'voice', voice.length], ['💌', 'letters', letters.length]].map(([icon, t, count]) => (
                    <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      style={{ background: 'rgba(11,43,38,0.4)' }} onClick={() => setTab(t)}>
                      <span>{icon}</span>
                      <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>{count} {t}</span>
                    </div>
                  ))}
                </div>
                <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
                  Created {format(tsToDate(capsule.createdAt), 'dd MMM yyyy')}
                  {Number(capsule.unlockDate) > 0 && ` · ${unlocked ? 'Unlocked' : 'Unlocks'} ${format(tsToDate(capsule.unlockDate), 'dd MMM yyyy')}`}
                </p>
              </div>
            )}

            {tab === 'photos'  && <PhotosTab  capsule={capsule} capsules={capsules} items={photos}  unlocked={unlocked} memoryKey={memoryKey} ensureMemoryKey={ensureMemoryKey} />}
            {tab === 'letters' && <LettersTab capsule={capsule} capsules={capsules} items={letters} unlocked={unlocked} ensureMemoryKey={ensureMemoryKey} />}
            {tab === 'voice'   && <VoiceTab   capsule={capsule} capsules={capsules} items={voice}   ensureMemoryKey={ensureMemoryKey} />}

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(142,182,155,0.08)' }}>
              <AnimatePresence mode="wait">
                {confirmDelete ? (
                  <motion.div key="confirm-del" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2">
                    <button onClick={handleDelete} className="flex-1 text-sm py-2 rounded-xl font-sora font-semibold" style={{ background: 'rgba(209,96,31,0.2)', color: '#D1601F', border: '1px solid rgba(209,96,31,0.4)' }}>Confirm delete</button>
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

// ── Photos tab ────────────────────────────────────────────────────────────────
function PhotosTab({ capsule, capsules, items, unlocked, memoryKey, ensureMemoryKey }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [thumbs, setThumbs]       = useState({})
  const [preview, setPreview]     = useState(null)

  useEffect(() => {
    if (!unlocked || !memoryKey) return
    let cancelled = false
    items.slice(0, 8).forEach(async (it) => {
      const idKey = it.id.toString()
      if (thumbs[idKey]) return
      try {
        const bytes = await fetchAndDecrypt(it.cid, memoryKey)
        const url = URL.createObjectURL(new Blob([bytes]))
        if (!cancelled) setThumbs((t) => ({ ...t, [idKey]: url }))
      } catch { /* leave thumbnail blank on failure */ }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, unlocked, memoryKey])

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (!requireIPFS()) { e.target.value = ''; return }
    const key = await ensureMemoryKey()
    if (!key) { e.target.value = ''; return }
    setUploading(true)
    try {
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer())
        const cid = await encryptAndUpload(bytes, `${f.name}.enc`, key)
        capsules.addContent(capsule.id, CONTENT_TYPE.PHOTO, cid, f.name)
      }
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} encrypted and added.`)
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const openPreview = (it) => {
    if (!unlocked) { toast('🔒 Sealed until the unlock date.', { icon: '⏰' }); return }
    const url = thumbs[it.id.toString()]
    if (!url) { toast.error('Still decrypting — try again in a moment.'); return }
    setPreview({ name: it.label, url, type: it.label?.split('.').pop() })
  }

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
      <button onClick={() => fileInputRef.current?.click()}
        className="w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all"
        style={{ borderColor: 'rgba(218,241,222,0.2)' }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.45)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.2)')}>
        <span className="text-2xl">📸</span>
        <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>{uploading ? 'Encrypting and uploading…' : 'Click to add photos'}</span>
      </button>

      {!unlocked && items.length > 0 && (
        <p className="font-inter text-xs" style={{ color: 'rgba(218,180,120,0.85)' }}>
          🔒 Sealed until the unlock date — you can still add photos, but not view existing ones yet.
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.slice(0, 8).map((it, i) => {
            const idKey = it.id.toString()
            return (
              <div key={idKey} className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer"
                style={{ background: `hsl(${150 + i * 12}, 30%, ${12 + i * 3}%)` }}
                onClick={() => openPreview(it)}>
                {unlocked && thumbs[idKey] && <img src={thumbs[idKey]} alt={it.label} className="w-full h-full object-cover" />}
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🔒</div>
                )}
                <button onClick={(e) => { e.stopPropagation(); capsules.removeContent(capsule.id, it.id) }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(5,31,32,0.8)', color: '#DAF1DE' }}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Letters tab ───────────────────────────────────────────────────────────────
function LettersTab({ capsule, capsules, items, unlocked, ensureMemoryKey }) {
  const [content, setContent] = useState('')
  const [saving, setSaving]   = useState(false)
  const [revealed, setRevealed] = useState({})
  const sorted = useMemo(() => [...items].sort((a, b) => Number(b.addedAt) - Number(a.addedAt)), [items])

  const handleSave = async () => {
    if (!content.trim()) { toast.error('Write something first.'); return }
    if (!requireIPFS()) return
    const key = await ensureMemoryKey()
    if (!key) return
    setSaving(true)
    try {
      const cid   = await encryptAndUpload(new TextEncoder().encode(content.trim()), 'letter.enc', key)
      const label = `Letter — ${format(new Date(), 'dd MMM yyyy')}`
      capsules.addContent(capsule.id, CONTENT_TYPE.LETTER, cid, label)
      setContent('')
    } catch (err) {
      toast.error(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const reveal = async (it) => {
    if (!unlocked) { toast('🔒 Sealed until the unlock date.', { icon: '⏰' }); return }
    const idKey = it.id.toString()
    if (revealed[idKey]) return
    const key = await ensureMemoryKey()
    if (!key) return
    try {
      const bytes = await fetchAndDecrypt(it.cid, key)
      setRevealed((r) => ({ ...r, [idKey]: new TextDecoder().decode(bytes) }))
    } catch {
      toast.error('Failed to decrypt this letter.')
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="vault-input resize-none text-sm leading-relaxed w-full"
        rows={5}
        placeholder="Write a letter for this capsule…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Encrypting…' : 'Save letter'}
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="space-y-2 mt-2">
          {sorted.map((it) => {
            const idKey = it.id.toString()
            return (
              <div key={idKey} className="p-3 rounded-xl relative group" style={{ background: 'rgba(11,43,38,0.3)' }}>
                <p className="font-inter text-sm" style={{ color: '#DAF1DE' }}>{it.label}</p>
                {revealed[idKey] ? (
                  <p className="font-inter text-sm leading-relaxed mt-1" style={{ color: '#8EB69B' }}>{revealed[idKey]}</p>
                ) : (
                  <button onClick={() => reveal(it)} className="font-inter text-xs mt-1 transition-opacity hover:opacity-80" style={{ color: '#8EB69B' }}>
                    {unlocked ? 'Reveal' : '🔒 Sealed until unlock date'}
                  </button>
                )}
                <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.5)' }}>{format(tsToDate(it.addedAt), 'dd MMM yyyy HH:mm')}</p>
                <button onClick={() => capsules.removeContent(capsule.id, it.id)}
                  className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: '#8EB69B' }}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Voice tab (simulated — no real microphone capture in this build) ────────
function VoiceTab({ capsule, capsules, items, ensureMemoryKey }) {
  const [recording, setRecording] = useState(false)
  const recordRef = useRef(null)
  const [saving, setSaving] = useState(false)

  const handleRecordToggle = async () => {
    if (!recording) {
      recordRef.current = Date.now()
      setRecording(true)
      toast.success('Recording started…')
      return
    }
    const seconds = Math.max(1, Math.floor((Date.now() - recordRef.current) / 1000))
    setRecording(false)
    if (!requireIPFS()) return
    const key = await ensureMemoryKey()
    if (!key) return
    setSaving(true)
    try {
      const name     = `Voice — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
      const cid      = await encryptAndUpload(jsonToBytes({ duration }), 'voice-note.enc', key)
      capsules.addContent(capsule.id, CONTENT_TYPE.VOICE, cid, `${name} · ${duration}`)
      toast.success('Voice note saved.')
    } catch (err) {
      toast.error(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handlePlay = () => toast('Voice notes store metadata only — no audio capture in this build.', { icon: '🎙️' })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <motion.button
          onClick={handleRecordToggle}
          whileTap={{ scale: 0.92 }}
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: recording ? '#0B2B26' : 'rgba(142,182,155,0.12)', border: '2px solid rgba(142,182,155,0.35)' }}
          animate={recording ? { boxShadow: ['0 0 0 0 rgba(142,182,155,0.4)', '0 0 0 14px rgba(142,182,155,0)'] } : {}}
          transition={recording ? { duration: 1, repeat: Infinity } : {}}
        >
          🎙️
        </motion.button>
        <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
          {saving ? 'Encrypting…' : recording ? 'Recording… tap to stop' : items.length === 0 ? 'Tap to record' : `${items.length} note${items.length > 1 ? 's' : ''} · Tap to record more`}
        </p>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it) => (
            <motion.div key={it.id.toString()} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(11,43,38,0.3)' }}>
              <button className="text-lg flex-shrink-0" onClick={handlePlay}>▶️</button>
              <div className="flex-1 min-w-0">
                <p className="font-inter text-sm truncate" style={{ color: '#DAF1DE' }}>{it.label}</p>
              </div>
              <span className="font-inter text-xs flex-shrink-0" style={{ color: '#8EB69B' }}>{format(tsToDate(it.addedAt), 'dd MMM')}</span>
              <button onClick={() => capsules.removeContent(capsule.id, it.id)} className="text-sm flex-shrink-0 transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>✕</button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Create capsule modal ──────────────────────────────────────────────────────
function CreateCapsuleModal({ capsules, circles, onClose }) {
  const [title, setTitle]           = useState('')
  const [preview, setPreview]       = useState('')
  const [type, setType]             = useState(CAPSULE_TYPE.PRIVATE)
  const [circleId, setCircleId]     = useState('')
  const [unlockDate, setUnlockDate] = useState('')

  const handleCreate = () => {
    if (!title.trim()) { toast.error('Give your capsule a title.'); return }
    if (type === CAPSULE_TYPE.SHARED && !circleId) { toast.error('Pick a circle to share with.'); return }
    if (type === CAPSULE_TYPE.TIME_LOCKED && !unlockDate) { toast.error('Pick an unlock date.'); return }

    const circleArg = type === CAPSULE_TYPE.SHARED ? Number(circleId) : 0
    const unlockArg = type === CAPSULE_TYPE.TIME_LOCKED ? Math.floor(new Date(unlockDate).getTime() / 1000) : 0

    capsules.createCapsule(title.trim(), type, preview.trim(), circleArg, unlockArg)
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-50 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.94)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <motion.div className="relative z-10 max-w-lg mx-auto my-12 px-4"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sora font-bold text-xl" style={{ color: '#DAF1DE' }}>New memory capsule</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(11,43,38,0.7)', color: '#8EB69B' }}>✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="font-inter text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#8EB69B' }}>Title</label>
              <input className="vault-input" placeholder="e.g. For my daughter's wedding" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>

            <div>
              <label className="font-inter text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#8EB69B' }}>Description (optional)</label>
              <textarea className="vault-input text-sm resize-none" rows={2} placeholder="A short note about what's inside…" value={preview} onChange={(e) => setPreview(e.target.value)} />
            </div>

            <div>
              <label className="font-inter text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#8EB69B' }}>Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CAPSULE_TYPE_META).map(([val, m]) => (
                  <button key={val} onClick={() => setType(Number(val))}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-inter transition-all"
                    style={{
                      background: type === Number(val) ? 'rgba(142,182,155,0.15)' : 'rgba(11,43,38,0.3)',
                      color: type === Number(val) ? '#DAF1DE' : '#8EB69B',
                      border: type === Number(val) ? '1px solid rgba(142,182,155,0.4)' : '1px solid rgba(142,182,155,0.1)',
                    }}>
                    <span>{m.icon}</span> {m.label}
                  </button>
                ))}
              </div>
            </div>

            {type === CAPSULE_TYPE.SHARED && (
              <div>
                <label className="font-inter text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#8EB69B' }}>Share with circle</label>
                {circles.myCircles.length === 0 ? (
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>You haven't created a circle yet — visit Legacy Circles first.</p>
                ) : (
                  <select className="vault-input" value={circleId} onChange={(e) => setCircleId(e.target.value)}>
                    <option value="">Choose a circle…</option>
                    {circles.myCircles.map((c) => (
                      <option key={c.id.toString()} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {type === CAPSULE_TYPE.TIME_LOCKED && (
              <div>
                <label className="font-inter text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#8EB69B' }}>Unlock date</label>
                <input type="date" className="vault-input" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleCreate} disabled={capsules.isPending || capsules.isConfirming} className="btn-primary flex-1 text-sm">
              {capsules.isPending || capsules.isConfirming ? 'Creating…' : 'Create capsule'}
            </button>
            <button onClick={onClose} className="btn-outline text-sm px-5">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MemorySpacePage() {
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { lang } = useAppStore()
  const tr = useTranslation(lang)

  const capsules = useCapsules()
  const circles  = useCircles()

  const [filter, setFilter]         = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [memoryKey, setMemoryKey]   = useState(null)
  const [unlocking, setUnlocking]   = useState(false)

  const ensureMemoryKey = async () => {
    if (memoryKey) return memoryKey
    setUnlocking(true)
    try {
      const signature = await signMessageAsync({ message: MEMORY_MESSAGE })
      const key = await deriveMemoryKey(signature)
      setMemoryKey(key)
      return key
    } catch {
      toast.error('Signature declined — content stays sealed.')
      return null
    } finally {
      setUnlocking(false)
    }
  }

  const filtered = useMemo(() => {
    if (filter == null) return capsules.myCapsules
    return capsules.myCapsules.filter((c) => Number(c.capsuleType) === filter)
  }, [capsules.myCapsules, filter])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-sora text-xl mb-4" style={{ color: '#8EB69B' }}>Connect your wallet to view your memory capsules.</p>
          <button onClick={() => navigate('/connect')} className="btn-primary">Connect Wallet</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>
      <FlowingCanvas />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {!capsules.contractReady && (
          <div className="mb-6 p-3 rounded-xl text-center font-inter text-sm" style={{ background: 'rgba(209,96,31,0.12)', color: '#D1601F' }}>
            Capsules contract not deployed yet — run <code>npm run deploy:sepolia</code>.
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: '#8EB69B' }} />
              <span className="font-inter text-xs uppercase tracking-widest" style={{ color: '#8EB69B' }}>Memory Space</span>
            </div>
            <h1 className="font-sora font-bold text-3xl md:text-4xl shimmer-text">{tr('memory.title')}</h1>
            <p className="font-inter text-sm mt-1" style={{ color: '#8EB69B' }}>{tr('memory.subtitle')}</p>
          </motion.div>

          <motion.button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            + {tr('memory.createCapsule')}
          </motion.button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f.label} onClick={() => setFilter(f.value)}
              className="px-4 py-1.5 rounded-full text-sm font-inter whitespace-nowrap transition-all"
              style={{
                background: filter === f.value ? 'rgba(142,182,155,0.18)' : 'rgba(11,43,38,0.3)',
                color: filter === f.value ? '#DAF1DE' : '#8EB69B',
                border: filter === f.value ? '1px solid rgba(142,182,155,0.4)' : '1px solid rgba(142,182,155,0.1)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <motion.div className="text-center py-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-5xl mb-4">🕊️</div>
            <p className="font-sora text-lg" style={{ color: '#8EB69B' }}>
              {capsules.myCapsules.length === 0 ? 'No memory capsules yet.' : 'No capsules match this filter.'}
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-6">Create your first capsule</button>
          </motion.div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
            {filtered.map((capsule) => (
              <CapsuleCard key={capsule.id.toString()} capsule={capsule} capsules={capsules} onClick={() => setSelectedId(capsule.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Floating create button (mobile) */}
      <motion.button
        onClick={() => setShowCreate(true)}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl z-40 sm:hidden"
        style={{ background: '#8EB69B', color: '#051F20', boxShadow: '0 8px 24px rgba(142,182,155,0.35)' }}
      >
        +
      </motion.button>

      <AnimatePresence>
        {selectedId != null && (
          <CapsuleDetail
            capsuleId={selectedId}
            capsules={capsules}
            circles={circles}
            memoryKey={memoryKey}
            unlocking={unlocking}
            ensureMemoryKey={ensureMemoryKey}
            onClose={() => setSelectedId(null)}
          />
        )}
        {showCreate && (
          <CreateCapsuleModal capsules={capsules} circles={circles} onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
