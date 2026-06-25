import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { isAddress } from 'ethers'
import { useAppStore } from '@/store/useAppStore'
import { useCredentials, useAllCredentials } from '@/hooks/useCredentials'
import { uploadJSON, getGatewayUrl, isIPFSConfigured } from '@/lib/ipfs'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import FlowingCanvas from '@/components/ui/FlowingCanvas'

// ─────────────────────────────────────────────────────────────────────────────
// OrganizationsPage — issuer dashboard for DeadDropCredentials.sol
//
// Any wallet can hold credentials (see "Credentials You've Received" below),
// but only a wallet the contract admin has verified via setIssuer() can mint
// new ones. The wallet that ran `npm run deploy:sepolia` is auto-verified as
// both admin and the first issuer (see the contract's constructor) — that
// wallet can verify additional issuer wallets from the admin panel here.
//
// There is no getCredentialsIssuedBy() on-chain, so "credentials I've
// issued" is reconstructed client-side via useAllCredentials() (reads every
// token 1..tokenCount and filters by issuer) — see that hook for caveats.
// ─────────────────────────────────────────────────────────────────────────────

const ORG_TYPES = [
  { type: 'University', icon: '🎓', description: 'Issue verified degree certificates and transcripts as NFTs. Students keep their credentials forever — no registrar required.', features: ['Degree NFTs', 'Transcript Verification', 'Student ID Hashing', 'Alumni Network'], color: '#4a9e6a', prefix: 'DEG' },
  { type: 'Company',    icon: '🏢', description: 'Issue equity documents, offer letters, and employment records as tamper-proof NFTs. Permanent. Unforgeable.', features: ['Equity Docs NFT', 'Offer Letters', 'Employee Records', 'Board Resolutions'], color: '#8EB69B', prefix: 'EMP' },
]

const CRED_TYPES = {
  University: ['Degree Certificate', 'Transcript', 'Student ID', 'Research Paper', 'Merit Award'],
  Company:    ['Offer Letter', 'Employment Record', 'Equity Agreement', 'Board Resolution', 'Non-disclosure Agreement'],
}

function credIcon(type) {
  if (!type) return '📋'
  const t = type.toLowerCase()
  if (t.includes('degree') || t.includes('transcript') || t.includes('merit') || t.includes('student')) return '🎓'
  if (t.includes('equity') || t.includes('board')) return '📊'
  if (t.includes('research') || t.includes('paper')) return '📝'
  return '📋'
}

function tsToDate(ts) {
  const n = Number(ts || 0)
  return n > 0 ? new Date(n * 1000) : null
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

function requireIPFS() {
  if (!isIPFSConfigured()) {
    toast.error('IPFS storage is not configured yet. Add VITE_PINATA_JWT to .env.')
    return false
  }
  return true
}

// ── issue modal ──────────────────────────────────────────────────────────────
function IssueCredentialModal({ orgType, credentials, onClose }) {
  const { address }               = useAccount()
  const { displayName }           = useAppStore()
  const org                       = ORG_TYPES.find((o) => o.type === orgType)
  const [recipient, setRecipient] = useState('')
  const [wallet,    setWallet]    = useState('')
  const [credType,  setCredType]  = useState(CRED_TYPES[orgType]?.[0] || '')
  const [details,   setDetails]   = useState('')
  const [uploading, setUploading] = useState(false)

  const busy = uploading || credentials.isPending || credentials.isConfirming

  const handleIssue = async () => {
    if (!recipient.trim())         { toast.error('Enter recipient name.'); return }
    if (!isAddress(wallet.trim())) { toast.error('Enter a valid recipient wallet address.'); return }
    if (!requireIPFS()) return

    setUploading(true)
    try {
      // Credential content is intentionally public/verifiable — plain JSON,
      // never encrypted (see useCredentials.js's doc comment).
      const metadataCID = await uploadJSON({
        institution:    orgType,
        credentialType: credType,
        recipientName:  recipient.trim(),
        details:        details.trim(),
        issuedBy:       displayName || 'DeadDrop issuer',
        issuedAt:       new Date().toISOString(),
      }, `credential-${Date.now()}.json`)

      credentials.issueCredential(wallet.trim(), credType, `${credType} — ${recipient.trim()}`, metadataCID)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to upload credential metadata to IPFS.')
    } finally {
      setUploading(false)
    }
  }

  if (!credentials.isVerifiedIssuer) {
    return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.9)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
        <motion.div className="glass-card p-8 w-full max-w-md relative z-10 text-center" initial={{ scale: 0.88, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <span className="text-4xl block mb-3">🔒</span>
          <h2 className="font-sora font-bold text-lg mb-2" style={{ color: '#DAF1DE' }}>Not a verified issuer</h2>
          <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
            Your connected wallet isn't verified to issue {orgType.toLowerCase()} credentials yet. Share your address with the contract admin and ask them to verify it from the admin panel below.
          </p>
          <p className="font-inter text-xs font-mono break-all p-3 rounded-lg mb-2" style={{ background: 'rgba(11,43,38,0.4)', color: '#DAF1DE' }}>
            {address || '—'}
          </p>
          {credentials.adminAddress && (
            <p className="font-inter text-xs mb-4" style={{ color: 'rgba(142,182,155,0.6)' }}>
              Current admin: {shortAddr(credentials.adminAddress)}
            </p>
          )}
          <button onClick={onClose} className="btn-primary w-full">Got it</button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(5,31,32,0.9)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <motion.div className="glass-card p-8 w-full max-w-md relative z-10" initial={{ scale: 0.88, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
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
            <button onClick={handleIssue} disabled={busy} className="flex-1 text-sm py-2 px-4 rounded-xl font-sora font-semibold transition-all disabled:opacity-50"
              style={{ background: `${org.color}20`, color: org.color, border: `1px solid ${org.color}50` }}>
              {uploading ? 'Uploading metadata…' : busy ? 'Minting…' : 'Mint & Issue'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── admin: verify / revoke issuer wallets ───────────────────────────────────
function ManageIssuersPanel({ credentials }) {
  const [addr, setAddr] = useState('')

  const handleSet = (verified) => {
    if (!isAddress(addr.trim())) { toast.error('Enter a valid wallet address.'); return }
    credentials.setIssuer(addr.trim(), verified)
    setAddr('')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-16" style={{ borderLeft: '3px solid #8EB69B' }}>
      <h2 className="font-sora font-bold text-lg mb-1" style={{ color: '#DAF1DE' }}>Admin · Manage issuers</h2>
      <p className="font-inter text-xs mb-4" style={{ color: 'rgba(142,182,155,0.7)' }}>
        You deployed the credentials contract, so this wallet is its admin. Verify another wallet so it can issue credentials too.
      </p>
      <div className="flex gap-3 flex-wrap">
        <input className="vault-input font-mono text-sm flex-1 min-w-[240px]" placeholder="0x… wallet to verify" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <button onClick={() => handleSet(true)} disabled={credentials.isPending || credentials.isConfirming} className="btn-primary text-sm px-5">Verify</button>
        <button onClick={() => handleSet(false)} disabled={credentials.isPending || credentials.isConfirming} className="btn-outline text-sm px-5">Revoke</button>
      </div>
    </motion.div>
  )
}

// ── one row in either credential list ───────────────────────────────────────
function CredentialRow({ cred, variant, onRevoke, index }) {
  const date = tsToDate(cred.issuedAt)
  return (
    <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }} className="glass-card p-5 flex items-center gap-4 group">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'rgba(142,182,155,0.1)' }}>
        {credIcon(cred.credentialType)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{cred.title || cred.credentialType}</p>
          {cred.revoked
            ? <span className="font-inter text-xs px-2 py-0.5 rounded-full" style={{ color: '#D1601F', background: 'rgba(209,96,31,0.12)' }}>Revoked</span>
            : <span className="badge-cobalt flex items-center gap-1">✓ On-chain</span>}
        </div>
        <p className="font-inter text-xs mt-0.5 font-mono" style={{ color: '#8EB69B' }}>
          {variant === 'issued' ? `to ${shortAddr(cred.recipient)}` : `from ${shortAddr(cred.issuer)}`}
          {date && ` · ${format(date, 'dd MMM yyyy')}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0 flex items-center gap-3">
        <a href={getGatewayUrl(cred.metadataCID)} target="_blank" rel="noreferrer" className="font-inter text-xs underline transition-opacity hover:opacity-70" style={{ color: '#8EB69B' }}>
          View
        </a>
        {variant === 'issued' && !cred.revoked && (
          <button onClick={() => onRevoke(cred.tokenId)} className="font-inter text-xs transition-opacity hover:opacity-70 opacity-0 group-hover:opacity-60" style={{ color: '#D1601F' }}>
            Revoke
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── main page ────────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
  const navigate                  = useNavigate()
  const { address, isConnected }  = useAccount()
  const credentials                = useCredentials()
  const allCreds                   = useAllCredentials()
  const [issueFor, setIssueFor]   = useState(null)

  // Any confirmed write from this page's useCredentials() instance (issue,
  // revoke, setIssuer) should refresh both the recipient-side list and the
  // full issuer-side scan it renders from.
  useEffect(() => {
    if (credentials.isConfirmed) { credentials.refetchAll(); allCreds.refetch() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.isConfirmed, credentials.txHash])

  const issuedByMe = useMemo(
    () => allCreds.all.filter((c) => address && c.issuer.toLowerCase() === address.toLowerCase()),
    [allCreds.all, address]
  )

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-sora text-xl mb-4" style={{ color: '#8EB69B' }}>Connect your wallet to issue or view credentials.</p>
          <button onClick={() => navigate('/connect')} className="btn-primary">Connect Wallet</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>
      <FlowingCanvas />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {!credentials.contractReady && (
          <div className="mb-6 p-3 rounded-xl text-center font-inter text-sm" style={{ background: 'rgba(209,96,31,0.12)', color: '#D1601F' }}>
            Credentials contract not deployed yet — run <code>npm run deploy:sepolia</code>.
          </div>
        )}

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

        {credentials.isAdmin && <ManageIssuersPanel credentials={credentials} />}

        {/* Issued by me */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sora font-bold text-2xl" style={{ color: '#DAF1DE' }}>
              Issued Credentials {issuedByMe.length > 0 && <span className="text-base font-normal ml-2" style={{ color: '#8EB69B' }}>({issuedByMe.length})</span>}
            </h2>
          </div>

          {issuedByMe.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <span className="text-4xl block mb-3">🎓</span>
              <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.6)' }}>
                {credentials.isVerifiedIssuer ? 'No credentials issued yet. Use the cards above to mint one.' : "You haven't issued any credentials. Your wallet needs to be verified as an issuer first."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issuedByMe.map((cred, i) => (
                <CredentialRow key={cred.tokenId.toString()} cred={cred} variant="issued" index={i} onRevoke={credentials.revokeCredential} />
              ))}
            </div>
          )}
        </motion.section>

        {/* Received by me */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sora font-bold text-2xl" style={{ color: '#DAF1DE' }}>
              Credentials You've Received {credentials.myCredentials.length > 0 && <span className="text-base font-normal ml-2" style={{ color: '#8EB69B' }}>({credentials.myCredentials.length})</span>}
            </h2>
          </div>

          {credentials.myCredentials.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <span className="text-4xl block mb-3">📬</span>
              <p className="font-inter text-sm" style={{ color: 'rgba(142,182,155,0.6)' }}>Nothing here yet — credentials issued to your wallet will show up automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {credentials.myCredentials.map((cred, i) => (
                <CredentialRow key={cred.tokenId.toString()} cred={cred} variant="received" index={i} />
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
        {issueFor && <IssueCredentialModal orgType={issueFor} credentials={credentials} onClose={() => setIssueFor(null)} />}
      </AnimatePresence>
    </div>
  )
}
