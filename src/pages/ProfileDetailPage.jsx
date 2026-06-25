import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSignMessage, usePublicClient } from 'wagmi'
import { hexlify, getBytes } from 'ethers'
import {
  useCircles, useCircle, useCircleMembers, useCircleFiles, useIsMemberOf, CIRCLE_ROLE,
} from '@/hooks/useCircles'
import { useCapsules, CAPSULE_TYPE } from '@/hooks/useCapsules'
import { useActivity, describeActivity } from '@/hooks/useActivity'
import { useKeyRegistry, fetchPublicKey } from '@/hooks/useKeyRegistry'
import {
  IDENTITY_MESSAGE, deriveIdentityKeyPair,
  generateContentKey, exportKeyRaw, importKeyRaw,
  encryptBlob, decryptBlob,
  wrapContentKeyForRecipient, unwrapContentKeyFromSender,
} from '@/lib/crypto'
import { uploadBlob, uploadJSON, fetchBlob, fetchJSON, isIPFSConfigured } from '@/lib/ipfs'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const TYPE_COLORS = {
  Family:     '#DAF1DE',
  Friends:    '#8EB69B',
  University: '#4a9e6a',
  Work:       '#D1601F',
  Custom:     '#8EB69B',
}

const CAPSULE_TYPE_META = {
  [CAPSULE_TYPE.LEGACY]:      { label: 'Legacy',      icon: '🕊️', badge: 'yellow'  },
  [CAPSULE_TYPE.SHARED]:      { label: 'Shared',       icon: '👥', badge: 'cobalt'  },
  [CAPSULE_TYPE.TIME_LOCKED]: { label: 'Time-locked',  icon: '⏰', badge: 'satsuma' },
  [CAPSULE_TYPE.PRIVATE]:     { label: 'Private',      icon: '🔒', badge: 'satsuma' },
}

const EVENT_ICON = {
  CircleCreated: '🎉',
  CircleUpdated: '✏️',
  MemberAdded:   '👤',
  MemberRemoved: '🗑️',
  FileUploaded:  '📎',
  FileRemoved:   '🗑️',
}

// ── Tiny shared helpers ───────────────────────────────────────────────────────
function tsToDate(ts) {
  return new Date(Number(ts || 0) * 1000)
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

function formatSize(bytes) {
  const n = Number(bytes || 0)
  if (!n) return ''
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`
}

function requireIPFS() {
  if (!isIPFSConfigured()) {
    toast.error('IPFS storage not configured — add VITE_PINATA_JWT to .env first.')
    return false
  }
  return true
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
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Uploaded</p>
                  <p className="font-sora font-semibold text-sm mt-0.5" style={{ color: '#DAF1DE' }}>{format(new Date(file.date), 'dd MMM yyyy')}</p>
                </div>
              )}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(11,43,38,0.4)' }}>
                <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>Storage</p>
                <p className="font-sora font-semibold text-sm mt-0.5" style={{ color: '#8EB69B' }}>IPFS · end-to-end encrypted</p>
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

// ── Tab: Shared Vault ─────────────────────────────────────────────────────────
// Files are end-to-end encrypted: a fresh content key encrypts the bytes once,
// then that key is individually wrapped (ECIES) to every circle member who has
// registered an encryption identity (see useKeyRegistry / crypto.js). Only
// IPFS CIDs and wrapped keys ever leave the browser — Pinata and the chain
// only ever see ciphertext.
function SharedVault({ circleId, isMember, members, files, circles }) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const publicClient = usePublicClient()
  const keyReg = useKeyRegistry()

  const fileInputRef = useRef(null)
  const [identity, setIdentity]       = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [registering, setRegistering] = useState(false)
  const [decryptingId, setDecryptingId] = useState(null)
  const [preview, setPreview]         = useState(null)

  const list = files || []

  async function ensureIdentity() {
    if (identity) return identity
    const signature = await signMessageAsync({ message: IDENTITY_MESSAGE })
    const kp = deriveIdentityKeyPair(signature)
    setIdentity(kp)
    return kp
  }

  const handleRegisterKey = async () => {
    setRegistering(true)
    try {
      const kp = await ensureIdentity()
      keyReg.registerPublicKey(hexlify(kp.publicKey64))
    } catch (err) {
      toast.error(err?.shortMessage || err?.message || 'Could not sign the identity message.')
    } finally {
      setRegistering(false)
    }
  }

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files)
    if (!selected.length) return
    if (!requireIPFS()) { e.target.value = ''; return }
    if (!members?.length) { toast.error('No members to share with yet.'); e.target.value = ''; return }

    setUploading(true)
    try {
      for (const file of selected) {
        const bytes       = new Uint8Array(await file.arrayBuffer())
        const contentKey   = await generateContentKey()
        const rawKey        = await exportKeyRaw(contentKey)
        const cipherBlob     = await encryptBlob(bytes, contentKey)
        const contentCID       = await uploadBlob(cipherBlob, `${file.name}.enc`)

        const recipients = []
        for (const m of members) {
          const pubKeyHex = await fetchPublicKey(publicClient, m.wallet)
          if (!pubKeyHex) {
            toast(`${m.name || shortAddr(m.wallet)} hasn't enabled secure sharing yet — skipped for "${file.name}".`, { icon: '⚠️', duration: 5000 })
            continue
          }
          const wrapped = await wrapContentKeyForRecipient(rawKey, getBytes(pubKeyHex))
          recipients.push({ wallet: m.wallet, ephemeralPublicKey: wrapped.ephemeralPublicKey, payload: wrapped.payload })
        }

        if (recipients.length === 0) {
          toast.error(`No registered recipients — "${file.name}" was not shared.`)
          continue
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'file'
        const manifest    = { v: 1, name: file.name, type: ext, size: file.size, contentCID, recipients }
        const manifestCID = await uploadJSON(manifest, `${file.name}-manifest.json`)

        circles.uploadFile(circleId, file.name, manifestCID, ext, file.size)
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const openFile = async (f) => {
    if (!requireIPFS()) return
    setDecryptingId(f.id.toString())
    try {
      const kp       = await ensureIdentity()
      const manifest = await fetchJSON(f.cid)
      const mine = (manifest.recipients || []).find(
        (r) => r.wallet?.toLowerCase() === address?.toLowerCase()
      )
      if (!mine) { toast.error('This file was not shared with your wallet.'); return }

      const rawKey     = await unwrapContentKeyFromSender(mine, kp.privateKey)
      const contentKey = await importKeyRaw(rawKey)
      const blob       = await fetchBlob(manifest.contentCID)
      const cipherBytes = new Uint8Array(await blob.arrayBuffer())
      const plain       = await decryptBlob(cipherBytes, contentKey)
      const url         = URL.createObjectURL(new Blob([plain]))

      setPreview({
        name: manifest.name || f.name,
        type: manifest.type || f.fileType,
        size: manifest.size ? formatSize(manifest.size) : formatSize(f.size),
        url,
        date: f.uploadedAt ? tsToDate(f.uploadedAt).toISOString() : null,
      })
    } catch (err) {
      toast.error(err.message || 'Failed to decrypt — you may not have access to this file.')
    } finally {
      setDecryptingId(null)
    }
  }

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const handleRemove = (fileId) => circles.removeFile(circleId, fileId)

  if (!isMember) {
    return (
      <div className="text-center py-14">
        <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
          Join this circle (see the Members tab) to access its shared, end-to-end encrypted vault.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!keyReg.hasPublicKey && (
        <div className="p-4 rounded-xl flex items-center gap-3 flex-wrap" style={{ background: 'rgba(11,43,38,0.3)', border: '1px solid rgba(142,182,155,0.2)' }}>
          <span className="text-lg">🔑</span>
          <p className="font-inter text-sm flex-1" style={{ color: '#DAF1DE' }}>
            Enable secure sharing — a free signature lets other members encrypt files just for you.
          </p>
          <button onClick={handleRegisterKey} disabled={registering || keyReg.isPending || keyReg.isConfirming} className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
            {registering ? 'Waiting for signature…' : 'Enable secure sharing'}
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />

      <motion.div
        className="w-full py-10 rounded-xl border-2 border-dashed flex flex-col items-center gap-3 cursor-pointer transition-all"
        style={{ borderColor: 'rgba(218,241,222,0.25)' }}
        whileHover={{ borderColor: 'rgba(218,241,222,0.5)', background: 'rgba(218,241,222,0.03)' }}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="text-3xl" style={{ color: '#DAF1DE' }}>☁️</span>
        <div className="text-center">
          <p className="font-sora text-sm font-semibold" style={{ color: '#DAF1DE' }}>
            {uploading ? 'Encrypting and uploading…' : 'Drop files here or click to upload'}
          </p>
          <p className="font-inter text-xs mt-1" style={{ color: '#8EB69B' }}>
            End-to-end encrypted to every registered member · {list.length} file{list.length !== 1 ? 's' : ''} in vault
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {preview && <FilePreview file={preview} onClose={closePreview} />}
      </AnimatePresence>

      {list.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((file, i) => {
            const idKey = file.id.toString()
            return (
              <motion.div
                key={idKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-4 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(209,96,31,0.15)' }}>
                    {file.fileType === 'pdf' ? '📄' : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.fileType) ? '🖼️' : '📁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter text-sm font-medium truncate" style={{ color: '#DAF1DE' }}>{file.name}</p>
                    <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                      {formatSize(file.size)} · {format(tsToDate(file.uploadedAt), 'dd MMM yyyy')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-cobalt">encrypted</span>
                      <span className="font-inter text-xs truncate" style={{ color: '#8EB69B' }}>
                        {shortAddr(file.uploader)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openFile(file)}
                    disabled={decryptingId === idKey}
                    className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                    style={{ background: 'rgba(142,182,155,0.2)', color: '#8EB69B' }}
                  >
                    {decryptingId === idKey ? 'Decrypting…' : 'View'}
                  </button>
                  <button
                    onClick={() => handleRemove(file.id)}
                    className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80 ml-auto"
                    style={{ background: 'rgba(209,96,31,0.15)', color: '#D1601F' }}
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            No files yet. Upload your first file above.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Tab: Memory Space ─────────────────────────────────────────────────────────
function MemorySpaceTab({ circleId }) {
  const navigate = useNavigate()
  const { myCapsules } = useCapsules()

  const linked = myCapsules.filter((c) => Number(c.circleId) === Number(circleId))
  const shown  = linked.length > 0 ? linked : myCapsules.slice(0, 4)

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {shown.map((capsule, i) => {
        const meta     = CAPSULE_TYPE_META[Number(capsule.capsuleType)] || CAPSULE_TYPE_META[CAPSULE_TYPE.PRIVATE]
        const unlockMs = Number(capsule.unlockDate || 0) * 1000

        return (
          <motion.div
            key={capsule.id.toString()}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 break-inside-avoid mb-4 cursor-pointer group"
            whileHover={{ y: -2 }}
            onClick={() => navigate('/memory')}
          >
            <div className="w-full h-24 rounded-lg mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#051F20,#0B2B26)' }}>
              <span className="text-3xl opacity-60">{meta.icon}</span>
            </div>
            <h3 className="font-sora font-semibold text-sm mb-1" style={{ color: '#DAF1DE' }}>
              {capsule.title}
            </h3>
            <p className="font-inter text-xs mb-3 line-clamp-2" style={{ color: '#8EB69B' }}>
              {capsule.contentPreview}
            </p>
            <div className="flex items-center justify-between">
              <span className={`badge-${meta.badge}`}>{meta.label}</span>
            </div>
            {unlockMs > 0 && (
              <div className="mt-2 text-xs font-inter" style={{ color: '#D1601F' }}>
                Unlocks {format(new Date(unlockMs), 'dd MMM yyyy')}
              </div>
            )}
          </motion.div>
        )
      })}
      {shown.length === 0 && (
        <p className="font-inter text-sm col-span-3 text-center py-10" style={{ color: '#8EB69B' }}>
          No capsules linked to this circle yet.
        </p>
      )}
    </div>
  )
}

// ── Add member modal (admin-only) ─────────────────────────────────────────────
function AddMemberModal({ circleId, circles, onClose }) {
  const [name,   setName]   = useState('')
  const [wallet, setWallet] = useState('')
  const [role,   setRole]   = useState(CIRCLE_ROLE.MEMBER)

  const handleAdd = () => {
    if (!name.trim()) { toast.error("Enter the member's name."); return }
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) { toast.error('Enter a valid wallet address.'); return }
    circles.addMember(circleId, wallet.trim(), name.trim(), role)
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.88)', backdropFilter: 'blur(12px)' }} onClick={onClose} />
      <motion.div
        className="glass-card p-8 w-full max-w-md relative z-10"
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-sora font-bold text-xl mb-6" style={{ color: '#DAF1DE' }}>
          Add a Member
        </h2>
        <div className="space-y-3">
          <input className="vault-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className="vault-input font-mono text-sm" placeholder="Wallet address (0x…)" value={wallet} onChange={(e) => setWallet(e.target.value)} />
          <div className="flex gap-2">
            {[['Member', CIRCLE_ROLE.MEMBER], ['Admin', CIRCLE_ROLE.ADMIN]].map(([label, r]) => (
              <button
                key={label}
                onClick={() => setRole(r)}
                className="flex-1 py-2 rounded-lg text-sm font-sora transition-all"
                style={{
                  background: role === r ? 'rgba(142,182,155,0.15)' : 'rgba(11,43,38,0.1)',
                  border: `1px solid ${role === r ? 'rgba(218,241,222,0.35)' : 'rgba(218,241,222,0.1)'}`,
                  color: role === r ? '#DAF1DE' : '#8EB69B',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={circles.isPending || circles.isConfirming} className="btn-cobalt flex-1 text-sm">Add Member</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Tab: Members ──────────────────────────────────────────────────────────────
function MembersTab({ circleId, members, isMember, isAdmin, circles }) {
  const [showAdd, setShowAdd]   = useState(false)
  const [joinName, setJoinName] = useState('')
  const list = members || []

  const handleJoin = () => {
    if (!joinName.trim()) { toast.error('Enter your name to join.'); return }
    circles.joinCircle(circleId, joinName.trim())
  }

  return (
    <div className="space-y-3">
      {list.map((m, i) => (
        <motion.div
          key={m.wallet}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass-card p-4 flex items-center gap-4"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-sora font-bold flex-shrink-0"
            style={{ background: `hsl(${i * 60 + 200}, 40%, 25%)`, color: '#DAF1DE' }}
          >
            {(m.name || m.wallet || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>
                {m.name || shortAddr(m.wallet)}
              </span>
            </div>
            <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
              {shortAddr(m.wallet)} · Joined {formatDistanceToNow(tsToDate(m.joinedAt), { addSuffix: true })}
            </p>
          </div>
          <span
            className="text-xs font-sora font-semibold px-2 py-1 rounded-full flex-shrink-0"
            style={{
              background: Number(m.role) === CIRCLE_ROLE.ADMIN ? 'rgba(218,241,222,0.15)' : 'rgba(11,43,38,0.3)',
              color:      Number(m.role) === CIRCLE_ROLE.ADMIN ? '#DAF1DE' : '#8EB69B',
            }}
          >
            {Number(m.role) === CIRCLE_ROLE.ADMIN ? 'Admin' : 'Member'}
          </span>
          {isAdmin && (
            <button onClick={() => circles.removeMember(circleId, m.wallet)} className="text-sm px-1 flex-shrink-0 transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>
              ✕
            </button>
          )}
        </motion.div>
      ))}

      {list.length === 0 && (
        <p className="text-center font-inter text-sm py-6" style={{ color: '#8EB69B' }}>
          No members yet.
        </p>
      )}

      {isMember ? (
        isAdmin && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setShowAdd(true)}
            className="btn-cobalt w-full mt-4"
          >
            + Add Member
          </motion.button>
        )
      ) : (
        <div className="glass-card p-4 mt-4 flex items-center gap-3 flex-wrap">
          <input className="vault-input flex-1 text-sm" placeholder="Your name" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
          <button onClick={handleJoin} disabled={circles.isPending || circles.isConfirming} className="btn-primary text-sm px-4 whitespace-nowrap">
            Join Circle
          </button>
        </div>
      )}

      <AnimatePresence>
        {showAdd && <AddMemberModal circleId={circleId} circles={circles} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Tab: Timeline ─────────────────────────────────────────────────────────────
function TimelineTab({ circleId }) {
  const { activity, isLoading } = useActivity()
  const events = activity.filter(
    (item) => item.domain === 'circles' && item.args?.circleId != null && Number(item.args.circleId) === Number(circleId)
  )

  return (
    <div className="space-y-3">
      {isLoading && (
        <p className="text-center font-inter text-sm py-6" style={{ color: '#8EB69B' }}>
          Loading on-chain activity…
        </p>
      )}
      {!isLoading && events.length === 0 && (
        <p className="text-center font-inter text-sm py-6" style={{ color: '#8EB69B' }}>
          No activity yet. Start by uploading a file or inviting a member.
        </p>
      )}
      {events.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex gap-4 glass-card p-4"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(11,43,38,0.4)' }}>
            {EVENT_ICON[event.eventName] || '📌'}
          </div>
          <div className="flex-1">
            <p className="font-inter text-sm" style={{ color: '#DAF1DE' }}>
              {describeActivity(event)}
            </p>
            <p className="font-inter text-xs mt-1" style={{ color: '#8EB69B' }}>
              {event.timestamp != null
                ? formatDistanceToNow(new Date(Number(event.timestamp) * 1000), { addSuffix: true })
                : `Block #${event.blockNumber}`}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'vault',    label: 'Shared Vault'  },
  { id: 'memory',   label: 'Memory Space'  },
  { id: 'members',  label: 'Members'       },
  { id: 'timeline', label: 'Timeline'      },
]

export default function ProfileDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const circles  = useCircles()

  const { data: circle,  isLoading: loadingCircle } = useCircle(id)
  const { data: members, refetch: refetchMembers }  = useCircleMembers(id)
  const { data: files,   refetch: refetchFiles }     = useCircleFiles(id)
  const { data: isMember } = useIsMemberOf(id, address)

  const [activeTab, setActiveTab] = useState('vault')

  // Any confirmed write from this shared useCircles() instance — add/remove
  // member, upload/remove file, update circle, join — should refresh the
  // member and file lists this page renders from.
  useEffect(() => {
    if (circles.isConfirmed) { refetchMembers(); refetchFiles() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circles.isConfirmed, circles.txHash])

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-sora text-xl mb-4" style={{ color: '#8EB69B' }}>Connect your wallet to view this circle.</p>
          <button onClick={() => navigate('/connect')} className="btn-primary">Connect Wallet</button>
        </div>
      </div>
    )
  }

  if (!circles.contractReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-sora text-xl mb-4" style={{ color: '#8EB69B' }}>Circles contract not deployed yet.</p>
          <button onClick={() => navigate('/profiles')} className="btn-primary">Back to Circles</button>
        </div>
      </div>
    )
  }

  if (loadingCircle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-sora text-xl" style={{ color: '#8EB69B' }}>Loading circle…</p>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-sora text-xl mb-4" style={{ color: '#8EB69B' }}>Profile not found.</p>
          <button onClick={() => navigate('/profiles')} className="btn-primary">Back to Profiles</button>
        </div>
      </div>
    )
  }

  const typeColor  = TYPE_COLORS[circle.circleType] || '#DAF1DE'
  const memberList = members || []
  const fileList   = files || []
  const isAdmin    = !!isMember && memberList.some(
    (m) => m.wallet?.toLowerCase() === address?.toLowerCase() && Number(m.role) === CIRCLE_ROLE.ADMIN
  )

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '64px' }}>

      {/* Hero banner */}
      <div
        className="relative py-10 px-6"
        style={{
          background: `linear-gradient(135deg, rgba(13,5,7,0.9), ${typeColor}15, rgba(13,5,7,0.9))`,
          borderBottom: `1px solid ${typeColor}30`,
        }}
      >
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/profiles')}
            className="text-xs font-inter mb-4 inline-flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ color: '#8EB69B' }}
          >
            ← Back to circles
          </button>

          <div className="flex items-start gap-6 flex-wrap">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-sora font-bold flex-shrink-0"
              style={{ background: `${typeColor}20`, border: `2px solid ${typeColor}40`, color: typeColor }}
            >
              {circle.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-sora font-bold text-2xl md:text-3xl" style={{ color: '#DAF1DE' }}>
                  {circle.name}
                </h1>
                <span
                  className="badge-cobalt text-xs"
                  style={{ background: `${typeColor}20`, color: typeColor, borderColor: `${typeColor}40` }}
                >
                  {circle.circleType}
                </span>
                {!isMember && <span className="badge-cobalt text-xs">Not a member</span>}
              </div>
              <p className="font-inter text-sm mt-1" style={{ color: '#8EB69B' }}>
                {circle.description}
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex -space-x-2">
                  {memberList.slice(0, 5).map((m, i) => (
                    <div
                      key={m.wallet || i}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-sora font-bold border-2"
                      style={{ background: `hsl(${i * 60 + 200}, 40%, 25%)`, borderColor: 'rgba(13,5,7,0.8)', color: '#DAF1DE' }}
                    >
                      {(m.name || m.wallet || '?').charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  {memberList.length} member{memberList.length !== 1 ? 's' : ''}
                </span>
                <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  Created {format(tsToDate(circle.createdAt), 'MMM yyyy')}
                </span>
                <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  {fileList.length} file{fileList.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="sticky top-16 z-30 px-6"
        style={{ background: 'rgba(13,5,7,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(218,241,222,0.08)' }}
      >
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-4 font-sora text-sm font-medium whitespace-nowrap transition-all relative"
              style={{
                color:        activeTab === tab.id ? '#DAF1DE' : '#8EB69B',
                borderBottom: activeTab === tab.id ? '2px solid #DAF1DE' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'vault'    && <SharedVault circleId={id} isMember={isMember} members={memberList} files={fileList} circles={circles} />}
            {activeTab === 'memory'   && <MemorySpaceTab circleId={id} />}
            {activeTab === 'members'  && <MembersTab circleId={id} members={memberList} isMember={isMember} isAdmin={isAdmin} circles={circles} />}
            {activeTab === 'timeline' && <TimelineTab circleId={id} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
