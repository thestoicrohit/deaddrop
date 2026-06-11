import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/lib/translations'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

// ── Settings panel ─────────────────────────────────────────────────────────────
function SettingsPanel({ onClose }) {
  const { displayName, updateDisplayName, updatePin, safePin, clearDemoData, resetAll, disconnectWallet, importVault } = useAppStore()
  const navigate = useNavigate()
  const [editingName,  setEditingName]  = useState(false)
  const [nameVal,      setNameVal]      = useState(displayName || '')
  const [editingPin,   setEditingPin]   = useState(false)
  const [newPin,       setNewPin]       = useState('')
  const [pinConfirm,   setPinConfirm]   = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const importRef = useRef(null)

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw  = JSON.parse(ev.target.result)
        const data = raw.state || raw
        importVault(data)
        toast.success('Vault data imported successfully.')
        onClose()
      } catch {
        toast.error('Invalid backup file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSaveName = () => {
    if (!nameVal.trim()) { toast.error('Name cannot be empty.'); return }
    updateDisplayName(nameVal.trim())
    toast.success('Display name updated.')
    setEditingName(false)
  }
  const handleSavePin = () => {
    if (newPin.length !== 6)    { toast.error('PIN must be 6 digits.'); return }
    if (newPin !== pinConfirm)  { toast.error('PINs do not match.'); return }
    updatePin(newPin)
    toast.success('Vault PIN updated.')
    setEditingPin(false); setNewPin(''); setPinConfirm('')
  }
  const handleExport = () => {
    const store = JSON.parse(localStorage.getItem('deaddrop-store') || '{}')
    const blob  = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `deaddrop-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Vault data exported.')
  }
  const handleReset = () => { resetAll(); onClose(); navigate('/connect') }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-full mt-2 w-80 z-50"
      style={{ background: 'rgba(5,31,32,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(142,182,155,0.2)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(5,31,32,0.8)' }}
    >
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(142,182,155,0.1)' }}>
        <span className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>Vault Settings</span>
        <button onClick={onClose} className="text-sm transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>✕</button>
      </div>
      <div className="p-5 space-y-5">
        {/* Display name */}
        <div>
          <label className="block font-inter text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(142,182,155,0.6)' }}>Display Name</label>
          {editingName ? (
            <div className="flex gap-2">
              <input className="vault-input text-sm flex-1" value={nameVal} onChange={(e) => setNameVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} autoFocus />
              <button onClick={handleSaveName} className="btn-primary text-xs px-3">Save</button>
              <button onClick={() => { setEditingName(false); setNameVal(displayName || '') }} className="btn-outline text-xs px-2">✕</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-inter text-sm" style={{ color: '#DAF1DE' }}>{displayName || <span style={{ color: 'rgba(142,182,155,0.4)' }}>Not set</span>}</span>
              <button onClick={() => setEditingName(true)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}>Edit</button>
            </div>
          )}
        </div>
        {/* PIN */}
        <div>
          <label className="block font-inter text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(142,182,155,0.6)' }}>Vault PIN</label>
          {editingPin ? (
            <div className="space-y-2">
              <input className="vault-input text-sm text-center tracking-widest" type="password" maxLength={6} placeholder="New 6-digit PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g,'').slice(0,6))} autoFocus />
              <input className="vault-input text-sm text-center tracking-widest" type="password" maxLength={6} placeholder="Confirm PIN" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={(e) => e.key === 'Enter' && handleSavePin()} />
              <div className="flex gap-2">
                <button onClick={handleSavePin} className="btn-primary text-xs flex-1">Save PIN</button>
                <button onClick={() => { setEditingPin(false); setNewPin(''); setPinConfirm('') }} className="btn-outline text-xs flex-1">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-inter text-sm" style={{ color: '#DAF1DE' }}>{safePin ? '••••••' : <span style={{ color: 'rgba(142,182,155,0.4)' }}>Not set</span>}</span>
              <button onClick={() => setEditingPin(true)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}>{safePin ? 'Change' : 'Set PIN'}</button>
            </div>
          )}
        </div>
        <div style={{ height: '1px', background: 'rgba(142,182,155,0.1)' }} />
        {/* Data */}
        <div className="space-y-2">
          <label className="block font-inter text-xs mb-3 uppercase tracking-widest" style={{ color: 'rgba(142,182,155,0.6)' }}>Data</label>
          <button onClick={handleExport} className="w-full text-left px-4 py-3 rounded-xl text-sm font-inter transition-all" style={{ background: 'rgba(142,182,155,0.06)', border: '1px solid rgba(142,182,155,0.15)', color: '#8EB69B' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(142,182,155,0.12)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(142,182,155,0.06)' }}>
            <div className="font-semibold font-sora" style={{ color: '#DAF1DE' }}>Export vault data</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.6)' }}>Download all data as JSON backup</div>
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button onClick={() => importRef.current?.click()} className="w-full text-left px-4 py-3 rounded-xl text-sm font-inter transition-all" style={{ background: 'rgba(142,182,155,0.06)', border: '1px solid rgba(142,182,155,0.15)', color: '#8EB69B' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(142,182,155,0.12)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(142,182,155,0.06)' }}>
            <div className="font-semibold font-sora" style={{ color: '#DAF1DE' }}>Import vault backup</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.6)' }}>Restore from a JSON backup file</div>
          </button>
          <button onClick={() => { clearDemoData(); toast.success('Demo data cleared.'); onClose() }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-inter transition-all" style={{ background: 'rgba(142,182,155,0.06)', border: '1px solid rgba(142,182,155,0.15)', color: '#8EB69B' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(142,182,155,0.12)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(142,182,155,0.06)' }}>
            <div className="font-semibold font-sora" style={{ color: '#DAF1DE' }}>Clear demo data</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.6)' }}>Removes sample circles &amp; capsules</div>
          </button>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-inter transition-all" style={{ background: 'rgba(209,96,31,0.06)', border: '1px solid rgba(209,96,31,0.2)', color: '#D1601F' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(209,96,31,0.12)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(209,96,31,0.06)' }}>
              <div className="font-semibold font-sora">Reset all vault data</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(209,96,31,0.7)' }}>Permanently erases everything</div>
            </button>
          ) : (
            <div className="px-4 py-3 rounded-xl space-y-2" style={{ background: 'rgba(209,96,31,0.08)', border: '1px solid rgba(209,96,31,0.3)' }}>
              <p className="font-sora text-sm font-semibold" style={{ color: '#D1601F' }}>Cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleReset} className="flex-1 text-xs py-2 rounded-lg font-sora font-semibold" style={{ background: 'rgba(209,96,31,0.3)', color: '#D1601F', border: '1px solid rgba(209,96,31,0.5)' }}>Yes, reset</button>
                <button onClick={() => setConfirmReset(false)} className="flex-1 text-xs py-2 rounded-lg font-sora" style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.2)' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Notifications panel ────────────────────────────────────────────────────────
function NotificationsPanel({ onClose }) {
  const { notifications, markAllRead, clearNotifications } = useAppStore()
  useEffect(() => { markAllRead() }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-full mt-2 w-80 z-50"
      style={{ background: 'rgba(5,31,32,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(142,182,155,0.2)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(5,31,32,0.8)' }}
    >
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(142,182,155,0.1)' }}>
        <span className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>
          Notifications {notifications.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(142,182,155,0.15)', color: '#8EB69B' }}>{notifications.length}</span>}
        </span>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button onClick={() => { clearNotifications(); onClose() }} className="text-xs transition-opacity hover:opacity-70" style={{ color: 'rgba(142,182,155,0.6)' }}>Clear all</button>
          )}
          <button onClick={onClose} className="text-sm transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>✕</button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <span className="text-3xl block mb-2">🔔</span>
            <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.5)' }}>No notifications yet.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-3 py-3 rounded-xl" style={{ background: n.read ? 'transparent' : 'rgba(142,182,155,0.04)' }}>
                <span className="text-lg flex-shrink-0 mt-0.5">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-sora font-semibold text-xs" style={{ color: '#DAF1DE' }}>{n.title}</p>
                  <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.7)' }}>{n.body}</p>
                  <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.4)' }}>
                    {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Search overlay ─────────────────────────────────────────────────────────────
function SearchOverlay({ onClose }) {
  const { capsules, profiles, safeData } = useAppStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  const q = query.toLowerCase().trim()
  const results = q.length < 2 ? [] : [
    ...capsules.filter(c => c.title?.toLowerCase().includes(q) || c.contentPreview?.toLowerCase().includes(q))
      .map(c => ({ type: 'capsule', icon: '🌸', label: c.title, sub: c.type, path: '/memory' })),
    ...profiles.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .map(p => ({ type: 'circle', icon: '👥', label: p.name, sub: p.type, path: `/profiles/${p.id}` })),
    ...(safeData.documents || []).filter(d => d.name?.toLowerCase().includes(q))
      .map(d => ({ type: 'doc', icon: '📄', label: d.name, sub: d.nftId, path: '/safe' })),
    ...(safeData.passwords || []).filter(p => p.label?.toLowerCase().includes(q))
      .map(p => ({ type: 'password', icon: '🔑', label: p.label, sub: 'Password vault', path: '/safe' })),
    ...(safeData.cryptoKeys || []).filter(k => k.label?.toLowerCase().includes(q))
      .map(k => ({ type: 'key', icon: '🗝️', label: k.label, sub: 'Crypto key', path: '/safe' })),
  ]

  const go = (path) => { navigate(path); onClose() }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.92)', backdropFilter: 'blur(16px)' }} onClick={onClose} />
      <div className="relative z-10 max-w-2xl mx-auto w-full mt-24 px-4">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl mb-2" style={{ background: 'rgba(11,43,38,0.7)', border: '1px solid rgba(142,182,155,0.25)' }}>
            <span style={{ color: '#8EB69B' }}>🔍</span>
            <input
              ref={inputRef}
              className="flex-1 bg-transparent outline-none font-inter text-base"
              style={{ color: '#DAF1DE' }}
              placeholder="Search capsules, circles, safe contents…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && onClose()}
            />
            <button onClick={onClose} className="text-sm transition-opacity hover:opacity-60" style={{ color: '#8EB69B' }}>Esc</button>
          </div>

          {results.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(11,43,38,0.7)', border: '1px solid rgba(142,182,155,0.15)' }}>
              {results.map((r, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => go(r.path)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left transition-all"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(142,182,155,0.08)' : 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(142,182,155,0.07)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="text-xl">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-sora font-semibold text-sm truncate" style={{ color: '#DAF1DE' }}>{r.label}</p>
                    <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>{r.sub}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-sora capitalize" style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}>{r.type}</span>
                </motion.button>
              ))}
            </div>
          )}
          {q.length >= 2 && results.length === 0 && (
            <div className="text-center py-8">
              <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.5)' }}>No results for "{query}"</p>
            </div>
          )}
          {q.length < 2 && (
            <p className="text-center font-inter text-xs mt-4" style={{ color: 'rgba(142,182,155,0.4)' }}>
              Type at least 2 characters to search
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { walletAddress, walletConnected, disconnectWallet, lang, displayName, notifications } = useAppStore()
  const tr = useTranslation(lang)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)
  const settingsRef = useRef(null)
  const notifRef    = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false)
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Global keyboard shortcut: Ctrl+K / Cmd+K → search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (location.pathname === '/') return null

  const short = walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : null
  const unreadCount = notifications.filter(n => !n.read).length

  const navLinks = [
    { to: '/dashboard', label: 'Home'                 },
    { to: '/profiles',  label: tr('navbar.profiles')  },
    { to: '/memory',    label: tr('navbar.memorySpace') },
    { to: '/safe',      label: tr('navbar.privateSafe') },
    { to: '/legacy',    label: tr('navbar.legacy')    },
  ]

  const isActive = (to) => to === '/dashboard'
    ? location.pathname === '/dashboard'
    : location.pathname.startsWith(to)

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-40"
        style={{ background: 'rgba(5,31,32,0.93)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(142,182,155,0.1)' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to={walletConnected ? '/dashboard' : '/'} className="flex items-center gap-2.5 flex-shrink-0 group">
            <div style={{ perspective: '200px' }}>
              <img
                src="/logo.png"
                alt="DeadDrop"
                className="w-10 h-10 rounded-full transition-all duration-500"
                style={{
                  transform: 'rotateY(-12deg) rotateX(4deg)',
                  boxShadow: '4px 4px 16px rgba(142,182,155,0.25), -1px -1px 6px rgba(142,182,155,0.08)',
                  filter: 'drop-shadow(0 0 8px rgba(142,182,155,0.3))',
                  transformStyle: 'preserve-3d',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1.08)'
                  e.currentTarget.style.boxShadow = '0 0 28px rgba(142,182,155,0.45)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'rotateY(-12deg) rotateX(4deg)'
                  e.currentTarget.style.boxShadow = '4px 4px 16px rgba(142,182,155,0.25), -1px -1px 6px rgba(142,182,155,0.08)'
                }}
              />
            </div>
            <span className="font-sora font-bold text-base tracking-tight hidden sm:block" style={{ color: '#DAF1DE' }}>DeadDrop</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}
                className="px-3 py-2 rounded-lg font-inter text-sm transition-all duration-200 relative"
                style={{ color: isActive(link.to) ? '#DAF1DE' : '#8EB69B', background: isActive(link.to) ? 'rgba(142,182,155,0.08)' : 'transparent', fontWeight: isActive(link.to) ? '600' : '400' }}
                onMouseEnter={(e) => { if (!isActive(link.to)) e.currentTarget.style.color = '#DAF1DE' }}
                onMouseLeave={(e) => { if (!isActive(link.to)) e.currentTarget.style.color = '#8EB69B' }}
              >
                {link.label}
                {isActive(link.to) && (
                  <motion.div layoutId="nav-underline" className="absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full" style={{ background: '#8EB69B' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(11,43,38,0.5)', border: '1px solid rgba(142,182,155,0.12)' }}
              title="Search (Ctrl+K)"
            >
              <span className="text-sm">🔍</span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setSettingsOpen(false) }}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'rgba(11,43,38,0.5)', border: '1px solid rgba(142,182,155,0.12)' }}
              >
                <span className="text-sm">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-sora font-bold"
                    style={{ background: '#8EB69B', color: '#051F20', fontSize: '9px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
              </AnimatePresence>
            </div>

            {walletConnected ? (
              <div className="flex items-center gap-2">
                {/* Wallet chip + settings */}
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => { setSettingsOpen(!settingsOpen); setNotifOpen(false) }}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: settingsOpen ? 'rgba(142,182,155,0.15)' : 'rgba(142,182,155,0.08)', border: `1px solid ${settingsOpen ? 'rgba(142,182,155,0.4)' : 'rgba(142,182,155,0.2)'}` }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-sora font-bold flex-shrink-0"
                      style={{ background: 'rgba(142,182,155,0.25)', color: '#DAF1DE' }}>
                      {displayName ? displayName.charAt(0).toUpperCase() : '·'}
                    </div>
                    <span className="font-inter text-xs font-medium" style={{ color: '#8EB69B' }}>{short}</span>
                    <span className="text-xs" style={{ color: '#8EB69B', opacity: 0.7 }}>⚙</span>
                  </button>
                  <AnimatePresence>
                    {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => { disconnectWallet(); navigate('/') }}
                  className="text-xs font-inter px-3 py-1.5 rounded-xl transition-all hidden sm:block"
                  style={{ background: 'rgba(5,31,32,0.6)', color: '#235347', border: '1px solid rgba(142,182,155,0.12)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#DAF1DE' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#235347' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => navigate('/connect')} className="btn-primary text-sm px-4 py-2">Open Vault</button>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden w-9 h-9 rounded-xl flex flex-col items-center justify-center gap-1.5"
              style={{ background: 'rgba(11,43,38,0.5)', border: '1px solid rgba(142,182,155,0.12)' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {[0,1,2].map((i) => (
                <span key={i} className="block h-px transition-all" style={{ background: '#DAF1DE', width: i === 1 ? '14px' : '18px' }} />
              ))}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="md:hidden overflow-hidden" style={{ borderTop: '1px solid rgba(142,182,155,0.1)' }}>
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-xl font-inter text-sm transition-all"
                    style={{ color: isActive(link.to) ? '#DAF1DE' : '#8EB69B', background: isActive(link.to) ? 'rgba(142,182,155,0.08)' : 'transparent' }}>
                    {link.label}
                  </Link>
                ))}
                {walletConnected && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(142,182,155,0.1)', margin: '8px 0' }} />
                    <button
                      onClick={() => { setMenuOpen(false); setSettingsOpen(true) }}
                      className="block w-full text-left px-4 py-2.5 rounded-xl font-inter text-sm transition-all"
                      style={{ color: '#8EB69B' }}
                    >
                      ⚙ Settings
                    </button>
                    <button
                      onClick={() => { disconnectWallet(); navigate('/') }}
                      className="block w-full text-left px-4 py-2.5 rounded-xl font-inter text-sm transition-all"
                      style={{ color: '#D1601F' }}
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
