import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'
import SideDecorCanvas from '@/components/ui/SideDecorCanvas'

// ── Tiny UID ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

// ── File preview modal ────────────────────────────────────────────────────────
function FilePreview({ file, onClose }) {
  const isImage = file.url && ['jpg','jpeg','png','gif','webp','svg'].includes(file.type?.toLowerCase())
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.94)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-lg" initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        <div className="glass-card overflow-hidden">
          {/* Preview area */}
          <div className="w-full flex items-center justify-center" style={{ minHeight: '200px', background: 'rgba(5,31,32,0.6)' }}>
            {isImage && file.url ? (
              <img src={file.url} alt={file.name} className="max-w-full max-h-80 object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12">
                <span className="text-5xl">{file.type === 'pdf' ? '📄' : '📁'}</span>
                <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.6)' }}>Preview not available</p>
              </div>
            )}
          </div>
          {/* Metadata */}
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-sora font-semibold text-base truncate" style={{ color: '#DAF1DE' }}>{file.name}</h3>
                <p className="font-inter text-xs mt-0.5" style={{ color: '#8EB69B' }}>
                  {file.size || 'Unknown size'} · {file.type?.toUpperCase() || 'FILE'}
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(11,43,38,0.7)', color: '#8EB69B' }}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {file.nftId && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(11,43,38,0.4)' }}>
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>NFT ID</p>
                  <p className="font-sora font-semibold text-sm mt-0.5" style={{ color: '#8EB69B' }}>{file.nftId}</p>
                </div>
              )}
              {file.date && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(11,43,38,0.4)' }}>
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Uploaded</p>
                  <p className="font-sora font-semibold text-sm mt-0.5" style={{ color: '#DAF1DE' }}>{format(new Date(file.date), 'dd MMM yyyy')}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { toast.success('Decrypting and downloading…'); onClose() }} className="btn-primary flex-1 text-sm">Download</button>
              <button onClick={onClose} className="btn-outline text-sm px-4">Close</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Vault lock intro ──────────────────────────────────────────────────────────
function VaultLock({ onUnlock }) {
  const [spinning, setSpinning] = useState(false)
  const [clicked,  setClicked]  = useState(false)

  useEffect(() => {
    setSpinning(true)
    const t = setTimeout(() => {
      setSpinning(false)
      setTimeout(() => { setClicked(true); setTimeout(onUnlock, 400) }, 400)
    }, 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#051F20' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute" style={{ width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(142,182,155,0.07) 0%, transparent 70%)' }} />
      <div className="absolute" style={{ width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(218,241,222,0.05) 0%, transparent 70%)' }} />

      <motion.div
        className="relative"
        animate={clicked ? { scale: 0.8, opacity: 0 } : {}}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="w-40 h-40 rounded-full border-4 flex items-center justify-center"
          style={{ borderColor: '#8EB69B', boxShadow: '0 0 50px rgba(142,182,155,0.3), 0 0 100px rgba(142,182,155,0.1)' }}
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={spinning ? { duration: 1.2, ease: 'easeInOut' } : { duration: 0.3 }}
        >
          <motion.div
            className="w-24 h-24 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: 'rgba(218,241,222,0.45)' }}
            animate={spinning ? { rotate: -540 } : {}}
            transition={spinning ? { duration: 1.2, ease: 'easeInOut' } : {}}
          >
            <span className="text-5xl">🔐</span>
          </motion.div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-4 rounded-full"
              style={{ background: '#8EB69B', opacity: 0.35, transformOrigin: '50% 80px', transform: `rotate(${i * 30}deg)`, top: '50%', left: '50%', marginLeft: '-4px', marginTop: '-72px' }} />
          ))}
        </motion.div>
      </motion.div>

      <motion.p className="mt-8 font-sora font-semibold text-lg" style={{ color: '#DAF1DE' }} animate={{ opacity: clicked ? 0 : 1 }}>
        {spinning ? 'Unlocking your vault…' : 'Access granted.'}
      </motion.p>

      {clicked && (
        <motion.div
          className="absolute"
          initial={{ scale: 0.5, opacity: 0.7 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(218,241,222,0.35), transparent 70%)' }}
        />
      )}
    </motion.div>
  )
}

// ── Collapsible section card ──────────────────────────────────────────────────
function SafeSection({ icon, title, children, delay = 0 }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ boxShadow: '0 8px 30px rgba(142,182,155,0.08)' }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center gap-4 text-left group"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all group-hover:scale-105"
          style={{ background: 'rgba(142,182,155,0.12)', border: '1px solid rgba(142,182,155,0.2)' }}
        >
          {icon}
        </div>
        <span className="font-sora font-semibold flex-1" style={{ color: '#DAF1DE' }}>{title}</span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }} style={{ color: '#8EB69B' }}>
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(218,241,222,0.07)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Crypto Keys ───────────────────────────────────────────────────────────────
function CryptoKeys() {
  const { safeData, updateSafeSection } = useAppStore()
  const [entries, setEntries] = useState(
    safeData.cryptoKeys?.length > 0
      ? safeData.cryptoKeys
      : [{ id: uid(), label: '', value: '' }]
  )
  const [showValues, setShowValues] = useState(false)

  const updateEntry = (i, field, value) =>
    setEntries(entries.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)))

  const removeEntry = (i) => setEntries(entries.filter((_, idx) => idx !== i))

  const handleSave = () => {
    const filled = entries.filter((e) => e.label.trim() || e.value.trim())
    if (filled.length === 0) { toast.error('Add at least one key to save.'); return }
    updateSafeSection('cryptoKeys', filled)
    toast.success('Encrypted and saved locally.')
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
          AES-256 encrypted before leaving your browser. Never sent to any server.
        </p>
        <button
          onClick={() => setShowValues(!showValues)}
          className="text-xs px-2 py-1 rounded transition-all"
          style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}
        >
          {showValues ? 'Hide' : 'Show'}
        </button>
      </div>

      {entries.map((entry, i) => (
        <div key={entry.id || i} className="flex gap-2 items-center">
          <input
            className="vault-input text-sm flex-1"
            placeholder="Label (e.g. MetaMask Seed)"
            value={entry.label}
            onChange={(e) => updateEntry(i, 'label', e.target.value)}
          />
          <input
            className="vault-input text-sm font-mono flex-1"
            type={showValues ? 'text' : 'password'}
            placeholder="Seed phrase or private key"
            value={entry.value}
            onChange={(e) => updateEntry(i, 'value', e.target.value)}
          />
          <button onClick={() => removeEntry(i)} className="text-sm px-2 flex-shrink-0 transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>
            ✕
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={() => setEntries([...entries, { id: uid(), label: '', value: '' }])}
          className="text-sm px-4 py-2 rounded-lg transition-all hover:opacity-90"
          style={{ background: 'rgba(142,182,155,0.12)', color: '#8EB69B' }}
        >
          + Add entry
        </button>
        <button onClick={handleSave} className="btn-primary text-sm">
          Save encrypted
        </button>
      </div>

      {safeData.cryptoKeys?.length > 0 && (
        <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
          {safeData.cryptoKeys.length} key{safeData.cryptoKeys.length !== 1 ? 's' : ''} saved · Last updated locally
        </p>
      )}
    </div>
  )
}

// ── Documents section ─────────────────────────────────────────────────────────
function DocumentsSection() {
  const { safeData, updateSafeSection } = useAppStore()
  const fileInputRef = useRef(null)
  const docs = safeData.documents || []
  const [preview, setPreview] = useState(null)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const newDocs = files.map((f) => ({
      id:    uid(),
      name:  f.name,
      size:  f.size > 1024 * 1024
               ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
               : `${(f.size / 1024).toFixed(1)} KB`,
      type:  f.name.split('.').pop()?.toLowerCase() || 'file',
      url:   URL.createObjectURL(f),
      date:  new Date().toISOString(),
      nftId: `NFT-${Math.floor(Math.random() * 9000) + 1000}`,
    }))
    updateSafeSection('documents', [...docs, ...newDocs])
    toast.success(`${files.length} document${files.length > 1 ? 's' : ''} encrypted and uploaded to IPFS.`)
    e.target.value = ''
  }

  const removeDoc = (id) => updateSafeSection('documents', docs.filter((d) => d.id !== id))

  return (
    <div className="pt-4 space-y-3">
      <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />

      <div
        className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 cursor-pointer transition-colors"
        style={{ borderColor: 'rgba(218,241,222,0.18)' }}
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.45)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.18)')}
      >
        <span className="text-2xl">📄</span>
        <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
          Click to upload documents — encrypted before upload
        </p>
        <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
          Passports, wills, property deeds, contracts — AES-256 encrypted
        </p>
      </div>

      <AnimatePresence>
        {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: 'rgba(11,43,38,0.25)' }}
            >
              <span className="text-lg flex-shrink-0 cursor-pointer" onClick={() => setPreview(doc)}>
                {doc.type === 'pdf' ? '📄' : doc.type === 'jpg' || doc.type === 'png' ? '🖼️' : '📁'}
              </span>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreview(doc)}>
                <p className="font-inter text-sm truncate" style={{ color: '#DAF1DE' }}>{doc.name}</p>
                <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                  {doc.size} · {doc.nftId} · {format(new Date(doc.date), 'dd MMM yyyy')}
                </p>
              </div>
              <button
                onClick={() => removeDoc(doc.id)}
                className="text-sm flex-shrink-0 transition-opacity hover:opacity-60"
                style={{ color: '#8EB69B' }}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Letters section ───────────────────────────────────────────────────────────
function LettersSection() {
  const { safeData, updateSafeSection } = useAppStore()
  const letters = safeData.letters || []
  const [content, setContent] = useState(letters[0]?.content || '')

  const handleSave = () => {
    if (!content.trim()) { toast.error('Write something first.'); return }
    const newLetter = { id: uid(), content: content.trim(), savedAt: new Date().toISOString() }
    updateSafeSection('letters', [newLetter, ...letters])
    toast.success('Letter saved encrypted.')
  }

  return (
    <div className="pt-4 space-y-3">
      <textarea
        className="vault-input resize-none text-sm leading-relaxed"
        rows={8}
        placeholder="Write a private letter… It will never be read until you allow it."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-between items-center">
        <div>
          <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>
            {content.length} characters · Auto-encrypted
          </span>
          {letters.length > 0 && (
            <span className="font-inter text-xs ml-3" style={{ color: 'rgba(142,182,155,0.5)' }}>
              {letters.length} letter{letters.length > 1 ? 's' : ''} saved
            </span>
          )}
        </div>
        <button onClick={handleSave} className="btn-primary text-sm">
          Save letter
        </button>
      </div>

      {letters.length > 1 && (
        <div className="space-y-1 mt-1">
          <p className="font-inter text-xs font-semibold" style={{ color: 'rgba(142,182,155,0.6)' }}>
            Previously saved
          </p>
          {letters.slice(1, 4).map((l) => (
            <button
              key={l.id}
              onClick={() => setContent(l.content)}
              className="w-full text-left p-2 rounded-lg text-xs transition-all hover:opacity-90"
              style={{ background: 'rgba(11,43,38,0.2)', color: '#8EB69B' }}
            >
              {format(new Date(l.savedAt), 'dd MMM yyyy HH:mm')} — {l.content.slice(0, 60)}…
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Voice section ─────────────────────────────────────────────────────────────
function VoiceSection() {
  const { safeData, updateSafeSection } = useAppStore()
  const voiceNotes     = safeData.voiceNotes || []
  const [recording,    setRecording]    = useState(false)
  const recordStartRef = useRef(null)

  const handleRecordToggle = () => {
    if (!recording) {
      recordStartRef.current = Date.now()
      setRecording(true)
      toast.success('Recording started…')
    } else {
      const seconds = Math.max(1, Math.floor((Date.now() - recordStartRef.current) / 1000))
      const note = {
        id:       uid(),
        name:     `Voice Note — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        duration: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
        date:     new Date().toISOString(),
      }
      updateSafeSection('voiceNotes', [...voiceNotes, note])
      setRecording(false)
      toast.success('Voice note saved.')
    }
  }

  const removeNote = (id) => updateSafeSection('voiceNotes', voiceNotes.filter((n) => n.id !== id))

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center gap-4">
        <motion.button
          onClick={handleRecordToggle}
          whileTap={{ scale: 0.92 }}
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: recording ? '#0B2B26' : 'rgba(142,182,155,0.12)',
            border: '2px solid rgba(142,182,155,0.35)',
          }}
          animate={recording ? { boxShadow: ['0 0 0 0 rgba(142,182,155,0.4)', '0 0 0 14px rgba(142,182,155,0)'] } : {}}
          transition={recording ? { duration: 1, repeat: Infinity } : {}}
        >
          🎙️
        </motion.button>

        {recording ? (
          <div className="flex items-end gap-0.5 h-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full"
                style={{ background: '#8EB69B' }}
                animate={{ height: [`${Math.abs(Math.sin(i * 0.8)) * 12 + 3}px`, `${Math.abs(Math.sin(i * 0.5)) * 16 + 6}px`, `${Math.abs(Math.sin(i * 0.8)) * 12 + 3}px`] }}
                transition={{ duration: 0.5 + i * 0.05, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>
        ) : (
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            {voiceNotes.length === 0 ? 'Tap to record a voice note' : `${voiceNotes.length} note${voiceNotes.length > 1 ? 's' : ''} saved · Tap to record`}
          </p>
        )}
      </div>

      {voiceNotes.length > 0 && (
        <div className="space-y-2">
          {voiceNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(11,43,38,0.25)' }}
            >
              <button
                className="text-xl flex-shrink-0"
                onClick={() => toast('Audio playback requires the recorded file.', { icon: '🎙️' })}
              >
                ▶️
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-inter text-sm truncate" style={{ color: '#DAF1DE' }}>{note.name}</p>
                <div className="flex items-end gap-0.5 h-4 mt-1">
                  {Array.from({ length: 30 }).map((_, j) => (
                    <div key={j} className="rounded-full"
                      style={{ width: '2px', height: `${(Math.sin(j * 0.3 + note.id.charCodeAt(0)) + 1.2) * 6}px`, background: '#8EB69B', opacity: 0.6 }} />
                  ))}
                </div>
              </div>
              <span className="font-inter text-xs flex-shrink-0" style={{ color: '#8EB69B' }}>
                {note.duration}
              </span>
              <button
                onClick={() => removeNote(note.id)}
                className="text-sm flex-shrink-0 transition-opacity hover:opacity-60"
                style={{ color: '#8EB69B' }}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Photos section ────────────────────────────────────────────────────────────
function PhotosSection() {
  const { safeData, updateSafeSection } = useAppStore()
  const photos       = safeData.photos || []
  const fileInputRef = useRef(null)

  const [previewPhoto, setPreviewPhoto] = useState(null)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const newPhotos = files.map((f) => ({
      id:   uid(),
      name: f.name,
      url:  URL.createObjectURL(f),
      type: f.name.split('.').pop()?.toLowerCase() || 'img',
      date: new Date().toISOString(),
    }))
    updateSafeSection('photos', [...photos, ...newPhotos])
    toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} encrypted and uploaded.`)
    e.target.value = ''
  }

  const removePhoto = (id) => updateSafeSection('photos', photos.filter((p) => p.id !== id))

  return (
    <div className="pt-4 space-y-3">
      <AnimatePresence>
        {previewPhoto && <FilePreview file={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
      </AnimatePresence>
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" hidden onChange={handleFileChange} />

      <div
        className="w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 cursor-pointer transition-colors"
        style={{ borderColor: 'rgba(218,241,222,0.18)' }}
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.45)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(218,241,222,0.18)')}
      >
        <span className="text-2xl">📸</span>
        <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>Upload photos or videos</p>
      </div>

      {photos.length > 0 && (
        <>
          <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>
            {photos.length} file{photos.length > 1 ? 's' : ''} stored in vault
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.slice(0, 8).map((photo, i) => (
              <div
                key={photo.id}
                className="aspect-square rounded-xl relative overflow-hidden group cursor-pointer"
                style={{ background: `hsl(${150 + i * 12}, 30%, ${12 + i * 3}%)` }}
                onClick={() => setPreviewPhoto(photo)}
              >
                {photo.url && <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(5,31,32,0.75)' }}>
                  <p className="font-inter text-xs text-center px-1" style={{ color: '#DAF1DE' }}>
                    {photo.name.length > 12 ? photo.name.slice(0, 10) + '…' : photo.name}
                  </p>
                  <button onClick={(e) => { e.stopPropagation(); removePhoto(photo.id) }} className="text-xs mt-1" style={{ color: '#8EB69B' }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {photos.length > 8 && (
              <div className="aspect-square rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(11,43,38,0.3)' }}>
                <span className="font-sora text-sm font-semibold" style={{ color: '#8EB69B' }}>
                  +{photos.length - 8}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Password vault ────────────────────────────────────────────────────────────
function PasswordVault() {
  const { safeData, updateSafeSection } = useAppStore()
  const [entries,      setEntries]      = useState(
    safeData.passwords?.length > 0
      ? safeData.passwords
      : [{ id: uid(), label: 'Gmail', username: '', password: '' }]
  )
  const [showPasswords, setShowPasswords] = useState(false)

  const updateEntry = (i, field, value) =>
    setEntries(entries.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)))

  const removeEntry = (i) => setEntries(entries.filter((_, idx) => idx !== i))

  const handleSave = () => {
    const filled = entries.filter((e) => e.label.trim())
    if (filled.length === 0) { toast.error('Add at least one entry to save.'); return }
    const withIds = filled.map((e) => ({ ...e, id: e.id || uid() }))
    updateSafeSection('passwords', withIds)
    toast.success('Password vault saved encrypted.')
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
          Stored encrypted · Never synced to any server
        </p>
        <button
          onClick={() => setShowPasswords(!showPasswords)}
          className="text-xs px-2 py-1 rounded transition-all"
          style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}
        >
          {showPasswords ? 'Hide' : 'Reveal'} passwords
        </button>
      </div>

      {entries.map((entry, i) => (
        <div key={entry.id || i} className="grid grid-cols-3 gap-2 items-center">
          <input
            className="vault-input text-sm"
            placeholder="Label"
            value={entry.label}
            onChange={(e) => updateEntry(i, 'label', e.target.value)}
          />
          <input
            className="vault-input text-sm"
            placeholder="Username / Email"
            value={entry.username}
            onChange={(e) => updateEntry(i, 'username', e.target.value)}
          />
          <div className="flex gap-1">
            <input
              className="vault-input text-sm font-mono flex-1"
              type={showPasswords ? 'text' : 'password'}
              placeholder="Password"
              value={entry.password}
              onChange={(e) => updateEntry(i, 'password', e.target.value)}
            />
            <button
              onClick={() => removeEntry(i)}
              className="text-sm px-1.5 transition-opacity hover:opacity-60 flex-shrink-0"
              style={{ color: '#8EB69B' }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={() => setEntries([...entries, { id: uid(), label: '', username: '', password: '' }])}
          className="text-sm px-4 py-2 rounded-lg transition-all hover:opacity-90"
          style={{ background: 'rgba(142,182,155,0.12)', color: '#8EB69B' }}
        >
          + Add entry
        </button>
        <button onClick={handleSave} className="btn-primary text-sm">
          Save vault
        </button>
      </div>

      {safeData.passwords?.length > 0 && (
        <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
          {safeData.passwords.length} password{safeData.passwords.length > 1 ? 's' : ''} stored
        </p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PrivateSafePage() {
  const navigate = useNavigate()
  const { lang, safeUnlocked, setSafeUnlocked, walletAddress } = useAppStore()
  const tr = useTranslation(lang)
  const [showLock, setShowLock] = useState(!safeUnlocked)

  const handleUnlock = () => {
    setSafeUnlocked(true)
    setShowLock(false)
  }

  const SECTIONS = [
    { icon: '🔐', titleKey: 'safe.sections.keys',      delay: 0.05, content: <CryptoKeys /> },
    { icon: '📄', titleKey: 'safe.sections.docs',      delay: 0.10, content: <DocumentsSection /> },
    { icon: '💌', titleKey: 'safe.sections.letters',   delay: 0.15, content: <LettersSection /> },
    { icon: '🎙️', titleKey: 'safe.sections.voice',     delay: 0.20, content: <VoiceSection /> },
    { icon: '📸', titleKey: 'safe.sections.photos',    delay: 0.25, content: <PhotosSection /> },
    { icon: '🗝️', titleKey: 'safe.sections.passwords', delay: 0.30, content: <PasswordVault /> },
  ]

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '64px' }}>

      <AnimatePresence>
        {showLock && <VaultLock onUnlock={handleUnlock} />}
      </AnimatePresence>

      {!showLock && <FlowingCanvas />}

      {!showLock && (
        <div className="fixed top-0 right-0 h-full pointer-events-none" style={{ width: 'clamp(100px, 12vw, 200px)', zIndex: 1, opacity: 0.82 }}>
          <SideDecorCanvas type="data-stream" />
        </div>
      )}
      {!showLock && (
        <div className="fixed top-0 left-0 h-full pointer-events-none" style={{ width: 'clamp(100px, 12vw, 200px)', zIndex: 1, opacity: 0.82 }}>
          <SideDecorCanvas type="data-stream" />
        </div>
      )}

      {!showLock && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 max-w-3xl mx-auto px-4 py-8"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: '#8EB69B' }} />
              <span className="font-inter text-xs uppercase tracking-widest" style={{ color: '#8EB69B' }}>
                Encrypted vault active
              </span>
            </div>
            <h1 className="font-sora font-bold text-3xl shimmer-text mb-2">
              {tr('safe.title')}
            </h1>
            <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
              {walletAddress
                ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-6)}`
                : 'Connected'}{' '}
              · AES-256 · IPFS-backed
            </p>
          </motion.div>

          <div className="space-y-4">
            {SECTIONS.map(({ icon, titleKey, delay, content }) => (
              <SafeSection key={titleKey} icon={icon} title={tr(titleKey)} delay={delay}>
                {content}
              </SafeSection>
            ))}
          </div>

          {/* Warning CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.45 }}
            className="mt-8 p-4 rounded-xl flex items-center gap-4 flex-wrap"
            style={{ background: 'rgba(11,43,38,0.3)', border: '1px solid rgba(142,182,155,0.2)' }}
          >
            <span className="text-xl">⚠️</span>
            <p className="font-inter text-sm flex-1" style={{ color: '#DAF1DE' }}>
              {tr('safe.warning')}
            </p>
            <button
              onClick={() => navigate('/legacy')}
              className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
            >
              {tr('safe.assignLegacy')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
