import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'

const ORG_TYPES = [
  { type: 'University', icon: '🎓', description: 'Issue verified degree certificates and transcripts as NFTs. Students keep their credentials forever — no registrar required.', features: ['Degree NFTs', 'Transcript Verification', 'Student ID Hashing', 'Alumni Network'], color: '#4a9e6a', prefix: 'DEG' },
  { type: 'Company',    icon: '🏢', description: 'Issue equity documents, offer letters, and employment records as tamper-proof NFTs. Permanent. Unforgeable.', features: ['Equity Docs NFT', 'Offer Letters', 'Employee Records', 'Board Resolutions'], color: '#8EB69B', prefix: 'EMP' },
]

const CRED_TYPES = {
  University: ['Degree Certificate', 'Transcript', 'Student ID', 'Research Paper', 'Merit Award'],
  Company:    ['Offer Letter', 'Employment Record', 'Equity Agreement', 'Board Resolution', 'Non-disclosure Agreement'],
}

function IssueCredentialModal({ orgType, onClose }) {
  const { addCredential, displayName } = useAppStore()
  const org = ORG_TYPES.find(o => o.type === orgType)
  const [recipient, setRecipient] = useState('')
  const [wallet,    setWallet]    = useState('')
  const [credType,  setCredType]  = useState(CRED_TYPES[orgType]?.[0] || '')
  const [details,   setDetails]   = useState('')
  const [issuing,   setIssuing]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [nftResult, setNftResult] = useState(null)

  const handleIssue = async () => {
    if (!recipient.trim()) { toast.error('Enter recipient name.'); return }
    if (!wallet.trim())    { toast.error('Enter recipient wallet address.'); return }
    setIssuing(true)
    await new Promise(r => setTimeout(r, 1800))
    const cred = { orgType, prefix: org.prefix, recipient: recipient.trim(), wallet: wallet.trim(), credType, details: details.trim(), issuedBy: displayName || 'You', color: org.color }
    const result = addCredential(cred)
    setNftResult(result)
    setIssuing(false)
    setDone(true)
    toast.success(`Credential minted as NFT.`)
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.9)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <motion.div className="glass-card p-8 w-full max-w-md relative z-10" initial={{ scale: 0.88, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>

        {done ? (
          <div className="text-center space-y-4">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <span className="text-5xl block mb-3">✅</span>
              <h2 className="font-sora font-bold text-xl mb-2" style={{ color: '#DAF1DE' }}>Credential Minted!</h2>
              <p className="font-inter text-sm mb-3" style={{ color: '#8EB69B' }}>
                {credType} issued to {recipient}
              </p>
              <div className="glass-card p-4 text-left">
                <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.6)' }}>NFT ID</p>
                <p className="font-sora font-bold" style={{ color: '#8EB69B' }}>{nftResult?.nftId || '—'}</p>
                <p className="font-inter text-xs mt-2" style={{ color: 'rgba(142,182,155,0.6)' }}>Wallet</p>
                <p className="font-inter text-xs font-mono" style={{ color: '#DAF1DE' }}>{wallet.slice(0, 20)}…</p>
              </div>
            </motion.div>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        ) : issuing ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 rounded-full border-2 border-t-transparent" style={{ borderColor: org.color, borderTopColor: 'transparent' }} />
            <p className="font-sora font-semibold" style={{ color: org.color }}>Minting credential NFT on-chain…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{org.icon}</span>
              <div>
                <h2 className="font-sora font-bold text-lg" style={{ color: '#DAF1DE' }}>Issue Credential</h2>
                <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>{orgType}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Credential Type</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(CRED_TYPES[orgType] || []).map((t) => (
                    <button key={t} onClick={() => setCredType(t)}
                      className="text-left px-3 py-2 rounded-lg text-sm font-inter transition-all"
                      style={{ background: credType === t ? `rgba(${org.color === '#4a9e6a' ? '74,158,106' : '142,182,155'},0.15)` : 'rgba(11,43,38,0.2)', border: `1px solid ${credType === t ? org.color : 'rgba(218,241,222,0.1)'}`, color: credType === t ? '#DAF1DE' : '#8EB69B' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Recipient Name</label>
                <input className="vault-input" placeholder="Full name" value={recipient} onChange={(e) => setRecipient(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Recipient Wallet Address</label>
                <input className="vault-input font-mono text-sm" placeholder="0x…" value={wallet} onChange={(e) => setWallet(e.target.value)} />
              </div>
              <div>
                <label className="block font-inter text-xs mb-2" style={{ color: '#8EB69B' }}>Additional Details (optional)</label>
                <input className="vault-input text-sm" placeholder="e.g. GPA 9.2, Year 2024…" value={details} onChange={(e) => setDetails(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn-outline flex-1 text-sm">Cancel</button>
                <button onClick={handleIssue} className="flex-1 text-sm py-2 px-4 rounded-xl font-sora font-semibold transition-all"
                  style={{ background: `${org.color}20`, color: org.color, border: `1px solid ${org.color}50` }}>
                  Mint & Issue
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function OrganizationsPage() {
  const navigate = useNavigate()
  const { issuedCredentials, removeCredential } = useAppStore()
  const [issueFor, setIssueFor] = useState(null)

  const credIcon = (type) => {
    if (!type) return '📋'
    const t = type.toLowerCase()
    if (t.includes('degree') || t.includes('b.tech') || t.includes('transcript') || t.includes('merit')) return '🎓'
    if (t.includes('equity') || t.includes('board')) return '📊'
    if (t.includes('research') || t.includes('paper')) return '📝'
    return '📋'
  }

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>
      <FlowingCanvas />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
          <h1 className="font-sora font-bold text-3xl md:text-5xl shimmer-text mb-4">For Organizations</h1>
          <p className="font-sora font-semibold text-xl" style={{ color: '#8EB69B' }}>
            Your credentials. Permanent. Unforgeable. Yours.
          </p>
        </motion.div>

        {/* Org type cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {ORG_TYPES.map((org, i) => (
            <motion.div key={org.type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="glass-card p-8" style={{ borderLeft: `3px solid ${org.color}` }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${org.color}20` }}>{org.icon}</div>
                <div>
                  <h2 className="font-sora font-bold text-xl" style={{ color: org.color }}>{org.type}</h2>
                  <span className="badge-cobalt" style={{ color: org.color, borderColor: `${org.color}40`, background: `${org.color}10` }}>Verified Institution</span>
                </div>
              </div>
              <p className="font-inter text-sm mb-6" style={{ color: '#8EB69B' }}>{org.description}</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {org.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${org.color}10`, border: `1px solid ${org.color}20` }}>
                    <span style={{ color: org.color, fontSize: '0.6rem' }}>⬡</span>
                    <span className="font-inter text-xs" style={{ color: '#DAF1DE' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setIssueFor(org.type)} className="w-full py-3 px-6 rounded-xl font-sora font-semibold text-sm transition-all"
                style={{ background: `${org.color}20`, color: org.color, border: `1px solid ${org.color}40` }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${org.color}35` }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${org.color}20` }}>
                Issue credential as {org.type}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Issued credentials */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sora font-bold text-2xl" style={{ color: '#DAF1DE' }}>
              Issued Credentials {issuedCredentials.length > 0 && <span className="text-base font-normal ml-2" style={{ color: '#8EB69B' }}>({issuedCredentials.length})</span>}
            </h2>
          </div>

          {issuedCredentials.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <span className="text-4xl block mb-3">🎓</span>
              <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.6)' }}>No credentials issued yet. Use the forms above to mint one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issuedCredentials.map((cred, i) => (
                <motion.div key={cred.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="glass-card p-5 flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'rgba(142,182,155,0.1)' }}>
                    {credIcon(cred.credType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{cred.credType}</p>
                      <span className="badge-cobalt flex items-center gap-1">✓ On-chain</span>
                    </div>
                    <p className="font-inter text-xs mt-0.5" style={{ color: '#8EB69B' }}>
                      {cred.recipient} · {cred.orgType} · {format(new Date(cred.issuedAt), 'dd MMM yyyy')}
                    </p>
                    {cred.details && <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(142,182,155,0.5)' }}>{cred.details}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="badge-cobalt">{cred.nftId}</div>
                    <div className="flex items-center gap-2 mt-1 justify-end">
                      <button onClick={() => toast.success('Verification link copied.')} className="font-inter text-xs underline transition-opacity hover:opacity-70" style={{ color: '#8EB69B' }}>
                        Verify
                      </button>
                      <button onClick={() => removeCredential(cred.id)} className="font-inter text-xs transition-opacity hover:opacity-70 opacity-0 group-hover:opacity-60" style={{ color: '#D1601F' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-10 text-center" style={{ borderColor: 'rgba(142,182,155,0.3)' }}>
          <h2 className="font-sora font-bold text-2xl mb-3" style={{ color: '#8EB69B' }}>Issue credentials that last forever.</h2>
          <p className="font-inter text-sm mb-6 max-w-lg mx-auto" style={{ color: '#8EB69B' }}>
            Students and employees keep their records even if your institution closes.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => toast.success('Contact form opened.')} className="btn-cobalt text-base px-8">Partner with us</button>
            <button onClick={() => navigate('/about')} className="btn-outline text-base px-8" style={{ color: '#8EB69B', borderColor: '#8EB69B' }}>Learn more</button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {issueFor && <IssueCredentialModal orgType={issueFor} onClose={() => setIssueFor(null)} />}
      </AnimatePresence>
    </div>
  )
}
