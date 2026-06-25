import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSignMessage } from 'wagmi'
import { useAppStore } from '@/store/useAppStore'
import { useSafe, SAFE_CATEGORY } from '@/hooks/useSafe'
import { useTranslation } from '@/lib/translations'
import {
  SAFE_MESSAGE, deriveSafeKey,
  encryptBlob, decryptBlob, encryptTextToHex, decryptHexToText,
} from '@/lib/crypto'
import { uploadBlob, fetchBlob, isIPFSConfigured } from '@/lib/ipfs'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'
import SideDecorCanvas from '@/components/ui/SideDecorCanvas'

// ── Tiny UID (local-only, for unsaved form rows before they exist on-chain) ──
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

// ── Crypto helpers shared by every section below ────────────────────────────
// Schema: every SafeEntry's `label` is encryptTextToHex(shortTitle) — cheap to
// decrypt locally (no network), so list rows can show a real title without
// fetching anything. The heavier payload (secret value, file bytes, letter
// text, password fields, voice metadata) is AES-256-GCM encrypted and pinned
// to IPFS; `cid` points to that blob and is only fetched+decrypted on demand.
async function encryptAndUpload(bytes, filename, safeKey) {
  const encrypted = await encryptBlob(bytes, safeKey)
  return uploadBlob(encrypted, filename)
}

async function fetchAndDecrypt(cid, safeKey) {
  const blob  = await fetchBlob(cid)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return decryptBlob(bytes, safeKey)
}

function jsonToBytes(obj) {
  return new TextEncoder().encode(JSON.stringify(obj))
}

function bytesToJson(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes))
}

function requireIPFS() {
  if (!isIPFSConfigured()) {
    toast.error('IPFS storage not configured — add VITE_PINATA_JWT to .env first.')
    return false
  }
  return true
}

function addedAtToDate(addedAt) {
  return new Date(Number(addedAt) * 1000)
}

// Decrypts every entry's `label` (cheap, local-only) into a plain string.
// Used directly as a display title (Crypto Keys, Passwords, Voice Notes) or
// JSON.parse'd by callers that packed structured metadata into the label
// (Documents, Photos).
function useDecryptedLabels(entries, safeKey) {
  const [labels, setLabels] = useState({})

  useEffect(() => {
    if (!safeKey || !entries?.length) { setLabels({}); return }
    let cancelled = false
    Promise.all(
      entries.map(async (e) => {
        try { return [e.id.toString(), await decryptHexToText(e.label, safeKey)] }
        catch { return [e.id.toString(), '(unreadable)'] }
      })
    ).then((pairs) => { if (!cancelled) setLabels(Object.fromEntries(pairs)) })
    return () => { cancelled = true }
  }, [entries, safeKey])

  return labels
}

// ── File preview modal ────────────────────────────────────────────────────────
function FilePreview({ file, onClose }) {
  const isImage = file.url && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.type?.toLowerCase())

  const handleDownload = () => {
    if (file.url) {
      const a = document.createElement('a')
      a.href = file.url
      a.download = file.name || 'deaddrop-file'
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
              {file.date && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(11,43,38,0.4)' }}>
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Added</p>
                  <p className="font-sora font-semibold text-sm mt-0.5" style={{ color: '#DAF1DE' }}>{format(new Date(file.date), 'dd MMM yyyy')}</p>
                </div>
              )}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(11,43,38,0.4)' }}>
                <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Storage</p>
                <p className="font-sora font-semibold text-sm mt-0.5" style={{ color: '#8EB69B' }}>IPFS · encrypted</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleDownload} className="btn-primary flex-1 text-sm">Download</button>
              <button onClick={onClose} className="btn-outline text-sm px-4">Close</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Vault lock intro (cosmetic — real access control is the signature gate) ──
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
function CryptoKeys({ safe, safeKey }) {
  const chainEntries = safe.entriesByCategory[SAFE_CATEGORY.CRYPTO_KEY] || []
  const titles = useDecryptedLabels(chainEntries, safeKey)

  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [showValues, setShowValues] = useState(false)
  const [revealed, setRevealed] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!label.trim() || !value.trim()) { toast.error('Add a label and a value to save.'); return }
    if (!requireIPFS()) return
    setSaving(true)
    try {
      const cid = await encryptAndUpload(jsonToBytes({ value }), 'crypto-key.enc', safeKey)
      const encLabel = await encryptTextToHex(label.trim(), safeKey)
      safe.addEntry(SAFE_CATEGORY.CRYPTO_KEY, encLabel, cid)
      setLabel(''); setValue('')
    } catch (err) {
      toast.error(err.message || 'Failed to encrypt/upload.')
    } finally {
      setSaving(false)
    }
  }

  const reveal = async (entry) => {
    const idKey = entry.id.toString()
    if (revealed[idKey]) return
    try {
      const bytes = await fetchAndDecrypt(entry.cid, safeKey)
      const { value: v } = bytesToJson(bytes)
      setRevealed((r) => ({ ...r, [idKey]: v }))
    } catch {
      toast.error('Failed to decrypt this entry.')
    }
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
          AES-256 encrypted in your browser, then pinned to IPFS — only you can decrypt it.
        </p>
        <button
          onClick={() => setShowValues(!showValues)}
          className="text-xs px-2 py-1 rounded transition-all"
          style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}
        >
          {showValues ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <input
          className="vault-input text-sm flex-1"
          placeholder="Label (e.g. MetaMask Seed)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="vault-input text-sm font-mono flex-1"
          type={showValues ? 'text' : 'password'}
          placeholder="Seed phrase or private key"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button onClick={handleSave} disabled={saving || safe.isPending || safe.isConfirming} className="btn-primary text-sm px-4 flex-shrink-0">
          {saving ? 'Encrypting…' : '+ Add'}
        </button>
      </div>

      {chainEntries.length > 0 && (
        <div className="space-y-2 pt-2">
          {chainEntries.map((entry) => {
            const idKey = entry.id.toString()
            return (
              <div key={idKey} className="flex gap-2 items-center p-2 rounded-lg" style={{ background: 'rgba(11,43,38,0.25)' }}>
                <span className="font-inter text-sm flex-1 truncate" style={{ color: '#DAF1DE' }}>
                  {titles[idKey] ?? 'Decrypting…'}
                </span>
                {showValues && (
                  <span className="font-mono text-xs flex-1 truncate" style={{ color: '#8EB69B' }}>
                    {revealed[idKey] ?? '••••••••'}
                  </span>
                )}
                {showValues && !revealed[idKey] && (
                  <button onClick={() => reveal(entry)} className="text-xs px-2" style={{ color: '#8EB69B' }}>Reveal</button>
                )}
                <button onClick={() => safe.removeEntry(entry.id)} className="text-sm px-2 flex-shrink-0 transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>
                  ✕
                </button>
              </div>
            )
          })}
          <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
            {chainEntries.length} key{chainEntries.length !== 1 ? 's' : ''} on-chain · encrypted
          </p>
        </div>
      )}
    </div>
  )
}

// ── Documents section ─────────────────────────────────────────────────────────
function DocumentsSection({ safe, safeKey }) {
  const chainEntries = safe.entriesByCategory[SAFE_CATEGORY.DOCUMENT] || []
  const labels = useDecryptedLabels(chainEntries, safeKey)
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  const docs = chainEntries.map((e) => {
    let meta = {}
    try { meta = JSON.parse(labels[e.id.toString()] || '{}') } catch { /* still decrypting */ }
    return {
      id: e.id, entryId: e.id, cid: e.cid, addedAt: e.addedAt,
      name: meta.name || (labels[e.id.toString()] ? 'Document' : 'Decrypting…'),
      type: meta.type || 'file',
      size: meta.size || '',
    }
  })

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (!requireIPFS()) { e.target.value = ''; return }
    setUploading(true)
    try {
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer())
        const cid = await encryptAndUpload(bytes, `${f.name}.enc`, safeKey)
        const meta = {
          name: f.name,
          type: f.name.split('.').pop()?.toLowerCase() || 'file',
          size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(1)} KB`,
        }
        const label = await encryptTextToHex(JSON.stringify(meta), safeKey)
        safe.addEntry(SAFE_CATEGORY.DOCUMENT, label, cid)
      }
      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} encrypted and pinned to IPFS.`)
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeDoc = (entryId) => safe.removeEntry(entryId)

  const openPreview = async (doc) => {
    try {
      const bytes = await fetchAndDecrypt(doc.cid, safeKey)
      const blobUrl = URL.createObjectURL(new Blob([bytes]))
      setPreview({ ...doc, url: blobUrl, date: doc.addedAt ? addedAtToDate(doc.addedAt).toISOString() : null })
    } catch {
      toast.error('Failed to decrypt this document.')
    }
  }

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
          {uploading ? 'Encrypting and uploading…' : 'Click to upload documents — encrypted before upload'}
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
              key={doc.id.toString()}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: 'rgba(11,43,38,0.25)' }}
            >
              <span className="text-lg flex-shrink-0 cursor-pointer" onClick={() => openPreview(doc)}>
                {doc.type === 'pdf' ? '📄' : ['jpg', 'jpeg', 'png'].includes(doc.type) ? '🖼️' : '📁'}
              </span>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openPreview(doc)}>
                <p className="font-inter text-sm truncate" style={{ color: '#DAF1DE' }}>{doc.name}</p>
                <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                  {doc.size}{doc.size ? ' · ' : ''}on-chain{doc.addedAt ? ` · ${format(addedAtToDate(doc.addedAt), 'dd MMM yyyy')}` : ''}
                </p>
              </div>
              <button
                onClick={() => removeDoc(doc.entryId)}
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
function LettersSection({ safe, safeKey }) {
  const chainEntries = safe.entriesByCategory[SAFE_CATEGORY.LETTER] || []
  const sorted = useMemo(
    () => [...chainEntries].sort((a, b) => Number(b.addedAt) - Number(a.addedAt)),
    [chainEntries]
  )
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [previews, setPreviews] = useState({})

  useEffect(() => {
    const targets = sorted.slice(0, 4).filter((e) => previews[e.id.toString()] === undefined)
    if (targets.length === 0) return
    let cancelled = false
    Promise.all(
      targets.map(async (e) => {
        try {
          const bytes = await fetchAndDecrypt(e.cid, safeKey)
          return [e.id.toString(), new TextDecoder().decode(bytes)]
        } catch {
          return [e.id.toString(), '(unable to decrypt)']
        }
      })
    ).then((pairs) => { if (!cancelled) setPreviews((p) => ({ ...p, ...Object.fromEntries(pairs) })) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, safeKey])

  const handleSave = async () => {
    if (!content.trim()) { toast.error('Write something first.'); return }
    if (!requireIPFS()) return
    setSaving(true)
    try {
      const cid = await encryptAndUpload(new TextEncoder().encode(content.trim()), 'letter.enc', safeKey)
      const label = await encryptTextToHex(`Letter — ${format(new Date(), 'dd MMM yyyy')}`, safeKey)
      safe.addEntry(SAFE_CATEGORY.LETTER, label, cid)
    } catch (err) {
      toast.error(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const loadLetter = async (e) => {
    try {
      const bytes = await fetchAndDecrypt(e.cid, safeKey)
      setContent(new TextDecoder().decode(bytes))
    } catch {
      toast.error('Failed to decrypt this letter.')
    }
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
            {content.length} characters · AES-256 encrypted
          </span>
          {sorted.length > 0 && (
            <span className="font-inter text-xs ml-3" style={{ color: 'rgba(142,182,155,0.5)' }}>
              {sorted.length} letter{sorted.length > 1 ? 's' : ''} on-chain
            </span>
          )}
        </div>
        <button onClick={handleSave} disabled={saving || safe.isPending || safe.isConfirming} className="btn-primary text-sm">
          {saving ? 'Encrypting…' : 'Save letter'}
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="space-y-1 mt-1">
          <p className="font-inter text-xs font-semibold" style={{ color: 'rgba(142,182,155,0.6)' }}>
            Previously saved
          </p>
          {sorted.slice(0, 4).map((e) => {
            const idKey = e.id.toString()
            const snippet = previews[idKey]
            return (
              <div key={idKey} className="flex items-center gap-2">
                <button
                  onClick={() => loadLetter(e)}
                  className="flex-1 text-left p-2 rounded-lg text-xs transition-all hover:opacity-90"
                  style={{ background: 'rgba(11,43,38,0.2)', color: '#8EB69B' }}
                >
                  {format(addedAtToDate(e.addedAt), 'dd MMM yyyy HH:mm')} — {snippet ? `${snippet.slice(0, 60)}…` : 'Decrypting…'}
                </button>
                <button onClick={() => safe.removeEntry(e.id)} className="text-xs px-1" style={{ color: '#8EB69B' }}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Voice section (metadata only — no microphone capture in this build) ─────
function VoiceSection({ safe, safeKey }) {
  const chainEntries = safe.entriesByCategory[SAFE_CATEGORY.VOICE_NOTE] || []
  const labels = useDecryptedLabels(chainEntries, safeKey)
  const [recording, setRecording] = useState(false)
  const recordStartRef = useRef(null)
  const [saving, setSaving] = useState(false)

  const handleRecordToggle = async () => {
    if (!recording) {
      recordStartRef.current = Date.now()
      setRecording(true)
      toast.success('Recording started…')
      return
    }
    const seconds = Math.max(1, Math.floor((Date.now() - recordStartRef.current) / 1000))
    setRecording(false)
    if (!requireIPFS()) return
    setSaving(true)
    try {
      const name = `Voice Note — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
      const cid = await encryptAndUpload(jsonToBytes({ duration }), 'voice-note.enc', safeKey)
      const label = await encryptTextToHex(name, safeKey)
      safe.addEntry(SAFE_CATEGORY.VOICE_NOTE, label, cid)
      toast.success('Voice note saved.')
    } catch (err) {
      toast.error(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

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
            {saving
              ? 'Encrypting…'
              : chainEntries.length === 0
                ? 'Tap to record a voice note'
                : `${chainEntries.length} note${chainEntries.length > 1 ? 's' : ''} on-chain · Tap to record`}
          </p>
        )}
      </div>

      {chainEntries.length > 0 && (
        <div className="space-y-2">
          {chainEntries.map((entry) => {
            const idKey = entry.id.toString()
            return (
              <motion.div
                key={idKey}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(11,43,38,0.25)' }}
              >
                <button
                  className="text-xl flex-shrink-0"
                  onClick={() => toast('Voice notes store metadata only — no audio capture in this build.', { icon: '🎙️' })}
                >
                  ▶️
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-sm truncate" style={{ color: '#DAF1DE' }}>{labels[idKey] ?? 'Decrypting…'}</p>
                </div>
                <span className="font-inter text-xs flex-shrink-0" style={{ color: '#8EB69B' }}>
                  {format(addedAtToDate(entry.addedAt), 'dd MMM')}
                </span>
                <button
                  onClick={() => safe.removeEntry(entry.id)}
                  className="text-sm flex-shrink-0 transition-opacity hover:opacity-60"
                  style={{ color: '#8EB69B' }}
                >
                  ✕
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Photos section ────────────────────────────────────────────────────────────
function PhotosSection({ safe, safeKey }) {
  const chainEntries = safe.entriesByCategory[SAFE_CATEGORY.PHOTO] || []
  const labels = useDecryptedLabels(chainEntries, safeKey)
  const fileInputRef = useRef(null)
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [thumbs, setThumbs] = useState({})

  const photos = chainEntries.map((e) => {
    let meta = {}
    try { meta = JSON.parse(labels[e.id.toString()] || '{}') } catch { /* still decrypting */ }
    return { id: e.id, entryId: e.id, cid: e.cid, addedAt: e.addedAt, name: meta.name || 'Photo', type: meta.type || 'img' }
  })

  useEffect(() => {
    let cancelled = false
    photos.slice(0, 8).forEach(async (p) => {
      const idKey = p.id.toString()
      if (thumbs[idKey]) return
      try {
        const bytes = await fetchAndDecrypt(p.cid, safeKey)
        const url = URL.createObjectURL(new Blob([bytes]))
        if (!cancelled) setThumbs((t) => ({ ...t, [idKey]: url }))
      } catch { /* leave thumbnail blank on failure */ }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainEntries, safeKey])

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (!requireIPFS()) { e.target.value = ''; return }
    setUploading(true)
    try {
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer())
        const cid = await encryptAndUpload(bytes, `${f.name}.enc`, safeKey)
        const meta = { name: f.name, type: f.name.split('.').pop()?.toLowerCase() || 'img' }
        const label = await encryptTextToHex(JSON.stringify(meta), safeKey)
        safe.addEntry(SAFE_CATEGORY.PHOTO, label, cid)
      }
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} encrypted and pinned.`)
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removePhoto = (entryId) => safe.removeEntry(entryId)

  const openPreview = (photo) => {
    const url = thumbs[photo.id.toString()]
    setPreviewPhoto({ ...photo, url, date: photo.addedAt ? addedAtToDate(photo.addedAt).toISOString() : null })
  }

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
        <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>{uploading ? 'Encrypting and uploading…' : 'Upload photos or videos'}</p>
      </div>

      {photos.length > 0 && (
        <>
          <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>
            {photos.length} file{photos.length > 1 ? 's' : ''} on-chain
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.slice(0, 8).map((photo, i) => {
              const idKey = photo.id.toString()
              return (
                <div
                  key={idKey}
                  className="aspect-square rounded-xl relative overflow-hidden group cursor-pointer"
                  style={{ background: `hsl(${150 + i * 12}, 30%, ${12 + i * 3}%)` }}
                  onClick={() => openPreview(photo)}
                >
                  {thumbs[idKey] && <img src={thumbs[idKey]} alt={photo.name} className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(5,31,32,0.75)' }}>
                    <p className="font-inter text-xs text-center px-1" style={{ color: '#DAF1DE' }}>
                      {photo.name.length > 12 ? `${photo.name.slice(0, 10)}…` : photo.name}
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); removePhoto(photo.entryId) }} className="text-xs mt-1" style={{ color: '#8EB69B' }}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
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
function PasswordVault({ safe, safeKey }) {
  const chainEntries = safe.entriesByCategory[SAFE_CATEGORY.PASSWORD] || []
  const labels = useDecryptedLabels(chainEntries, safeKey)

  const [label, setLabel]       = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [revealed, setRevealed] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!label.trim()) { toast.error('Add a label to save.'); return }
    if (!requireIPFS()) return
    setSaving(true)
    try {
      const cid = await encryptAndUpload(jsonToBytes({ username, password }), 'password.enc', safeKey)
      const encLabel = await encryptTextToHex(label.trim(), safeKey)
      safe.addEntry(SAFE_CATEGORY.PASSWORD, encLabel, cid)
      setLabel(''); setUsername(''); setPassword('')
    } catch (err) {
      toast.error(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const reveal = async (entry) => {
    const idKey = entry.id.toString()
    if (revealed[idKey]) return
    try {
      const bytes = await fetchAndDecrypt(entry.cid, safeKey)
      setRevealed((r) => ({ ...r, [idKey]: bytesToJson(bytes) }))
    } catch {
      toast.error('Failed to decrypt this entry.')
    }
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
          AES-256 encrypted, pinned to IPFS — never readable on-chain.
        </p>
        <button
          onClick={() => setShowPasswords(!showPasswords)}
          className="text-xs px-2 py-1 rounded transition-all"
          style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}
        >
          {showPasswords ? 'Hide' : 'Reveal'} passwords
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <input className="vault-input text-sm" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="vault-input text-sm" placeholder="Username / Email" value={username} onChange={(e) => setUsername(e.target.value)} />
        <div className="flex gap-1">
          <input
            className="vault-input text-sm font-mono flex-1"
            type={showPasswords ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleSave}
            disabled={saving || safe.isPending || safe.isConfirming}
            className="text-sm px-1.5 transition-opacity hover:opacity-80 flex-shrink-0"
            style={{ color: '#8EB69B' }}
          >
            {saving ? '…' : '+'}
          </button>
        </div>
      </div>

      {chainEntries.length > 0 && (
        <div className="space-y-2 pt-2">
          {chainEntries.map((entry) => {
            const idKey = entry.id.toString()
            const r = revealed[idKey]
            return (
              <div key={idKey} className="grid grid-cols-3 gap-2 items-center p-2 rounded-lg" style={{ background: 'rgba(11,43,38,0.25)' }}>
                <span className="font-inter text-sm truncate" style={{ color: '#DAF1DE' }}>{labels[idKey] ?? 'Decrypting…'}</span>
                <span className="font-inter text-sm truncate" style={{ color: '#8EB69B' }}>{showPasswords ? (r?.username ?? '') : '••••'}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm truncate flex-1" style={{ color: '#8EB69B' }}>
                    {showPasswords ? (r?.password ?? '') : '••••••••'}
                  </span>
                  {showPasswords && !r && (
                    <button onClick={() => reveal(entry)} className="text-xs" style={{ color: '#8EB69B' }}>Reveal</button>
                  )}
                  <button onClick={() => safe.removeEntry(entry.id)} className="text-sm px-1" style={{ color: '#8EB69B' }}>✕</button>
                </div>
              </div>
            )
          })}
          <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
            {chainEntries.length} password{chainEntries.length > 1 ? 's' : ''} on-chain
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PrivateSafePage() {
  const navigate = useNavigate()
  const { lang } = useAppStore()
  const tr = useTranslation(lang)
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const safe = useSafe()

  const [showLock, setShowLock] = useState(true)
  const [safeKey, setSafeKey] = useState(null)
  const [unlocking, setUnlocking] = useState(false)

  const handleSignToUnlock = async () => {
    setUnlocking(true)
    try {
      const signature = await signMessageAsync({ message: SAFE_MESSAGE })
      const key = await deriveSafeKey(signature)
      setSafeKey(key)
    } catch (err) {
      toast.error(err.shortMessage || err.message || 'Signature rejected — cannot unlock safe.')
    } finally {
      setUnlocking(false)
    }
  }

  const SECTIONS = safeKey ? [
    { icon: '🔐', titleKey: 'safe.sections.keys',      delay: 0.05, content: <CryptoKeys safe={safe} safeKey={safeKey} /> },
    { icon: '📄', titleKey: 'safe.sections.docs',      delay: 0.10, content: <DocumentsSection safe={safe} safeKey={safeKey} /> },
    { icon: '💌', titleKey: 'safe.sections.letters',   delay: 0.15, content: <LettersSection safe={safe} safeKey={safeKey} /> },
    { icon: '🎙️', titleKey: 'safe.sections.voice',     delay: 0.20, content: <VoiceSection safe={safe} safeKey={safeKey} /> },
    { icon: '📸', titleKey: 'safe.sections.photos',    delay: 0.25, content: <PhotosSection safe={safe} safeKey={safeKey} /> },
    { icon: '🗝️', titleKey: 'safe.sections.passwords', delay: 0.30, content: <PasswordVault safe={safe} safeKey={safeKey} /> },
  ] : []

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '64px' }}>
      {!isConnected ? (
        <div className="relative z-10 max-w-md mx-auto px-4 py-24 text-center">
          <div className="glass-card p-8 text-center">
            <span className="text-4xl mb-3 inline-block">🔐</span>
            <h2 className="font-sora font-semibold text-lg mb-2" style={{ color: '#DAF1DE' }}>Connect your wallet to continue</h2>
            <p className="font-inter text-sm mb-5" style={{ color: '#8EB69B' }}>
              Your Private Safe is encrypted per-wallet — connect to unlock it.
            </p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/connect')} className="btn-primary text-sm px-5 py-2.5">
              Connect wallet →
            </motion.button>
          </div>
        </div>
      ) : (
        <>
          <AnimatePresence>
            {showLock && <VaultLock onUnlock={() => setShowLock(false)} />}
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

          {!showLock && !safeKey && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55 }} className="relative z-10 max-w-md mx-auto px-4 py-24 text-center">
              <div className="glass-card p-8 text-center">
                <span className="text-4xl mb-3 inline-block">🗝️</span>
                <h2 className="font-sora font-semibold text-lg mb-2" style={{ color: '#DAF1DE' }}>Sign to unlock your safe</h2>
                <p className="font-inter text-sm mb-5" style={{ color: '#8EB69B' }}>
                  A free wallet signature deterministically derives the AES-256 key that protects every entry below. It costs no gas and never touches the blockchain.
                </p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSignToUnlock} disabled={unlocking} className="btn-primary text-sm px-5 py-2.5">
                  {unlocking ? 'Waiting for signature…' : 'Sign to unlock →'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {!showLock && safeKey && (
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
                    {safe.contractReady ? 'Encrypted vault active' : 'Safe contract not deployed'}
                  </span>
                </div>
                <h1 className="font-sora font-bold text-3xl shimmer-text mb-2">
                  {tr('safe.title')}
                </h1>
                <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  {address ? `${address.slice(0, 10)}…${address.slice(-6)}` : 'Connected'}{' '}
                  · AES-256 · IPFS-backed
                </p>
                {!safe.contractReady && (
                  <p className="font-inter text-xs mt-2" style={{ color: 'rgba(218,180,120,0.85)' }}>
                    Deploy the Safe contract and set VITE_SAFE_ADDRESS, then refresh — entries can't be saved until then.
                  </p>
                )}
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
        </>
      )}
    </div>
  )
}
