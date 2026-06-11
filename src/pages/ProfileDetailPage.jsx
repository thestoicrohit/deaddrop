import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const TYPE_COLORS = {
  Family:     '#DAF1DE',
  Friends:    '#8EB69B',
  University: '#4a9e6a',
  Work:       '#D1601F',
  Custom:     '#8EB69B',
}

// ── Tab: Shared Vault ─────────────────────────────────────────────────────────
function SharedVault({ profileId }) {
  const { profileFiles, addProfileFile, addTimelineEvent, displayName, deleteProfileFile } = useAppStore()
  const files        = profileFiles?.[profileId] || []
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files)
    if (!selected.length) return
    selected.forEach((file) => {
      const newFile = addProfileFile(profileId, file)
      addTimelineEvent(profileId, {
        icon:        '📎',
        wallet:      displayName || 'You',
        description: `uploaded "${file.name}"`,
      })
    })
    toast.success(`${selected.length} file${selected.length > 1 ? 's' : ''} uploaded and minted to IPFS.`)
    e.target.value = ''
  }

  const handleView = (file) => {
    toast(`Viewing ${file.name}\nIPFS CID: ${file.cid?.slice(0, 20)}…`, { duration: 3000, icon: '🔍' })
  }

  const handleDownload = (file) => {
    toast.success(`Downloading ${file.name} from IPFS…`)
  }

  const handleDelete = (file) => {
    deleteProfileFile(profileId, file.id)
    addTimelineEvent(profileId, {
      icon:        '🗑️',
      wallet:      displayName || 'You',
      description: `removed "${file.name}"`,
    })
    toast.success(`${file.name} removed from vault.`)
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />

      {/* Upload zone */}
      <motion.div
        className="w-full py-10 rounded-xl border-2 border-dashed flex flex-col items-center gap-3 cursor-pointer transition-all"
        style={{ borderColor: 'rgba(218,241,222,0.25)' }}
        whileHover={{ borderColor: 'rgba(218,241,222,0.5)', background: 'rgba(218,241,222,0.03)' }}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="text-3xl" style={{ color: '#DAF1DE' }}>☁️</span>
        <div className="text-center">
          <p className="font-sora text-sm font-semibold" style={{ color: '#DAF1DE' }}>
            Drop files here or click to upload
          </p>
          <p className="font-inter text-xs mt-1" style={{ color: '#8EB69B' }}>
            All files minted as NFTs on IPFS · {files.length} file{files.length !== 1 ? 's' : ''} in vault
          </p>
        </div>
      </motion.div>

      {/* File grid */}
      {files.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file, i) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4 group"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'rgba(209,96,31,0.15)' }}
                >
                  {file.type === 'pdf' ? '📄' : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.type) ? '🖼️' : '📁'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-sm font-medium truncate" style={{ color: '#DAF1DE' }}>
                    {file.name}
                  </p>
                  <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                    {file.size} · {format(new Date(file.date), 'dd MMM yyyy')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge-cobalt">{file.nftId}</span>
                    <span className="font-inter text-xs truncate" style={{ color: '#8EB69B' }}>
                      {file.uploader}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleView(file)}
                  className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(142,182,155,0.2)', color: '#8EB69B' }}
                >
                  View
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(218,241,222,0.1)', color: '#DAF1DE' }}
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80 ml-auto"
                  style={{ background: 'rgba(209,96,31,0.15)', color: '#D1601F' }}
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
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
function MemorySpaceTab({ profileId }) {
  const { capsules } = useAppStore()
  // Show capsules linked to this profile, or all capsules as a fallback
  const linked = capsules.filter((c) => c.profileId === profileId)
  const shown  = linked.length > 0 ? linked : capsules.slice(0, 4)

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {shown.map((capsule, i) => (
        <motion.div
          key={capsule.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-5 break-inside-avoid mb-4 cursor-pointer group"
          whileHover={{ y: -2 }}
        >
          <div
            className="w-full h-24 rounded-lg mb-3 flex items-center justify-center"
            style={{ background: capsule.coverColor || 'linear-gradient(135deg,#051F20,#0B2B26)' }}
          >
            <span className="text-3xl opacity-60">
              {capsule.type === 'Legacy' ? '🕊️' : capsule.type === 'Time-locked' ? '⏰' : capsule.type === 'Shared' ? '👥' : '🔒'}
            </span>
          </div>
          <h3 className="font-sora font-semibold text-sm mb-1" style={{ color: '#DAF1DE' }}>
            {capsule.title}
          </h3>
          <p className="font-inter text-xs mb-3 line-clamp-2" style={{ color: '#8EB69B' }}>
            {capsule.contentPreview}
          </p>
          <div className="flex items-center justify-between">
            <span className={`badge-${capsule.type === 'Legacy' ? 'yellow' : capsule.type === 'Shared' ? 'cobalt' : 'satsuma'}`}>
              {capsule.type}
            </span>
            <div className="flex gap-1 text-xs" style={{ color: '#8EB69B' }}>
              {capsule.photos > 0 && <span>📸{capsule.photos}</span>}
              {capsule.voice  > 0 && <span>🎙️{capsule.voice}</span>}
              {capsule.letters > 0 && <span>💌{capsule.letters}</span>}
            </div>
          </div>
          {capsule.unlockDate && (
            <div className="mt-2 text-xs font-inter" style={{ color: '#D1601F' }}>
              Unlocks {format(new Date(capsule.unlockDate), 'dd MMM yyyy')}
            </div>
          )}
        </motion.div>
      ))}
      {shown.length === 0 && (
        <p className="font-inter text-sm col-span-3 text-center py-10" style={{ color: '#8EB69B' }}>
          No capsules linked to this circle yet.
        </p>
      )}
    </div>
  )
}

// ── Invite member modal ───────────────────────────────────────────────────────
function InviteMemberModal({ profileId, onClose }) {
  const { addProfileMember, addTimelineEvent, displayName } = useAppStore()
  const [name,    setName]    = useState('')
  const [address, setAddress] = useState('')
  const [role,    setRole]    = useState('Member')
  const [copied,  setCopied]  = useState(false)

  const inviteCode = `dd-${profileId.slice(-4)}-${Math.random().toString(36).slice(2, 7)}`

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success(`Invite code copied: ${inviteCode}`)
    } catch {
      toast.success(`Share this code: ${inviteCode}`)
    }
  }

  const handleAdd = () => {
    if (!name.trim()) { toast.error('Enter the member\'s name.'); return }
    addProfileMember(profileId, { name: name.trim(), address: address.trim(), role })
    addTimelineEvent(profileId, {
      icon:        '👤',
      wallet:      displayName || 'You',
      description: `added ${name.trim()} to the circle`,
    })
    toast.success(`${name.trim()} added to circle!`)
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
          Invite a Member
        </h2>

        {/* Invite code */}
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(11,43,38,0.3)', border: '1px solid rgba(142,182,155,0.15)' }}>
          <p className="font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Share this invite code</p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm flex-1" style={{ color: '#DAF1DE' }}>{inviteCode}</code>
            <button
              onClick={handleCopyCode}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: copied ? 'rgba(74,158,106,0.25)' : 'rgba(142,182,155,0.15)', color: copied ? '#4a9e6a' : '#8EB69B' }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-inter text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(142,182,155,0.5)' }}>
            Or add directly
          </p>
          <input
            className="vault-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            className="vault-input font-mono text-sm"
            placeholder="Wallet address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="flex gap-2">
            {['Member', 'Admin'].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="flex-1 py-2 rounded-lg text-sm font-sora transition-all"
                style={{
                  background: role === r ? 'rgba(142,182,155,0.15)' : 'rgba(11,43,38,0.1)',
                  border: `1px solid ${role === r ? 'rgba(218,241,222,0.35)' : 'rgba(218,241,222,0.1)'}`,
                  color: role === r ? '#DAF1DE' : '#8EB69B',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={handleAdd} className="btn-cobalt flex-1 text-sm">Add Member</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Tab: Members ──────────────────────────────────────────────────────────────
function MembersTab({ profileId }) {
  const { profileMembers } = useAppStore()
  const [showInvite, setShowInvite] = useState(false)
  const members = profileMembers?.[profileId] || []

  return (
    <div className="space-y-3">
      {members.map((m, i) => (
        <motion.div
          key={m.address}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass-card p-4 flex items-center gap-4"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-sora font-bold flex-shrink-0"
            style={{ background: `hsl(${i * 60 + 200}, 40%, 25%)`, color: '#DAF1DE' }}
          >
            {m.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>
                {m.name}
              </span>
              {m.verified && (
                <span className="badge-cobalt flex items-center gap-1">✓ verified</span>
              )}
            </div>
            <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
              {m.short || m.address?.slice(0, 12) + '…'} · Joined {formatDistanceToNow(new Date(m.joinDate), { addSuffix: true })}
            </p>
          </div>
          <span
            className="text-xs font-sora font-semibold px-2 py-1 rounded-full flex-shrink-0"
            style={{
              background: m.role === 'Admin' ? 'rgba(218,241,222,0.15)' : 'rgba(11,43,38,0.3)',
              color:      m.role === 'Admin' ? '#DAF1DE' : '#8EB69B',
            }}
          >
            {m.role}
          </span>
        </motion.div>
      ))}

      {members.length === 0 && (
        <p className="text-center font-inter text-sm py-6" style={{ color: '#8EB69B' }}>
          No members yet. Invite someone to join.
        </p>
      )}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => setShowInvite(true)}
        className="btn-cobalt w-full mt-4"
      >
        + Invite Member
      </motion.button>

      <AnimatePresence>
        {showInvite && (
          <InviteMemberModal profileId={profileId} onClose={() => setShowInvite(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Tab: Timeline ─────────────────────────────────────────────────────────────
function TimelineTab({ profileId }) {
  const { profileTimeline } = useAppStore()
  const events = profileTimeline?.[profileId] || []

  return (
    <div className="space-y-3">
      {events.length === 0 && (
        <p className="text-center font-inter text-sm py-6" style={{ color: '#8EB69B' }}>
          No activity yet. Start by uploading a file or inviting a member.
        </p>
      )}
      {events.map((event, i) => (
        <motion.div
          key={event.id || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex gap-4 glass-card p-4"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'rgba(11,43,38,0.4)' }}
          >
            {event.icon}
          </div>
          <div className="flex-1">
            <p className="font-inter text-sm" style={{ color: '#DAF1DE' }}>
              <span style={{ color: '#8EB69B' }}>{event.wallet}</span>{' '}
              {event.description}
            </p>
            <p className="font-inter text-xs mt-1" style={{ color: '#8EB69B' }}>
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'vault',   label: 'Shared Vault'  },
  { id: 'memory',  label: 'Memory Space'  },
  { id: 'members', label: 'Members'       },
  { id: 'timeline',label: 'Timeline'      },
]

export default function ProfileDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { activeProfile, profiles } = useAppStore()
  const [activeTab, setActiveTab] = useState('vault')

  // Find profile from store (works after refresh too)
  const profile   = activeProfile?.id === id
    ? activeProfile
    : profiles?.find((p) => p.id === id)

  const typeColor = TYPE_COLORS[profile?.type] || '#DAF1DE'

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-sora text-xl mb-4" style={{ color: '#8EB69B' }}>Profile not found.</p>
          <button onClick={() => navigate('/profiles')} className="btn-primary">Back to Profiles</button>
        </div>
      </div>
    )
  }

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
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-sora font-bold text-2xl md:text-3xl" style={{ color: '#DAF1DE' }}>
                  {profile.name}
                </h1>
                <span
                  className="badge-cobalt text-xs"
                  style={{ background: `${typeColor}20`, color: typeColor, borderColor: `${typeColor}40` }}
                >
                  {profile.type}
                </span>
              </div>
              <p className="font-inter text-sm mt-1" style={{ color: '#8EB69B' }}>
                {profile.description}
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex -space-x-2">
                  {profile.members.slice(0, 5).map((m, i) => (
                    <div
                      key={m.address || i}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-sora font-bold border-2"
                      style={{ background: `hsl(${i * 60 + 200}, 40%, 25%)`, borderColor: 'rgba(13,5,7,0.8)', color: '#DAF1DE' }}
                    >
                      {m.name.charAt(0)}
                    </div>
                  ))}
                </div>
                <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  {profile.members.length} member{profile.members.length !== 1 ? 's' : ''}
                </span>
                <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  Created {format(new Date(profile.createdAt), 'MMM yyyy')}
                </span>
                <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  {profile.fileCount} file{profile.fileCount !== 1 ? 's' : ''}
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
            {activeTab === 'vault'    && <SharedVault    profileId={id} />}
            {activeTab === 'memory'   && <MemorySpaceTab profileId={id} />}
            {activeTab === 'members'  && <MembersTab     profileId={id} />}
            {activeTab === 'timeline' && <TimelineTab    profileId={id} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
