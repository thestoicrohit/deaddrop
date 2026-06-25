import { useState, useEffect } from 'react'
import { motion }              from 'framer-motion'
import { useNavigate }         from 'react-router-dom'
import { useAppStore }         from '@/store/useAppStore'
import { useTranslation }      from '@/lib/translations'
import { useDeadDrop }         from '@/hooks/useDeadDrop'
import { useKeyRegistry, fetchPublicKey } from '@/hooks/useKeyRegistry'
import { useAccount, useSignMessage, usePublicClient } from 'wagmi'
import { formatEther }         from 'viem'
import { hexlify, getBytes }   from 'ethers'
import { format, differenceInDays } from 'date-fns'
import toast                   from 'react-hot-toast'
import FlowingCanvas            from '@/components/ui/FlowingCanvas'
import SideDecorCanvas          from '@/components/ui/SideDecorCanvas'
import {
  IDENTITY_MESSAGE,
  deriveIdentityKeyPair,
  generateContentKey,
  exportKeyRaw,
  encryptText,
  wrapContentKeyForRecipient,
} from '@/lib/crypto'
import { uploadBlob, uploadJSON, isIPFSConfigured } from '@/lib/ipfs'

function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ boxShadow: '0 8px 32px rgba(142,182,155,0.1)' }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'rgba(142,182,155,0.1)', border: '1px solid rgba(142,182,155,0.18)' }}
        >
          {icon}
        </div>
        <h2 className="font-sora font-semibold text-base" style={{ color: '#DAF1DE' }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  )
}

function TxBadge({ isPending, isConfirming, txHash }) {
  if (!isPending && !isConfirming && !txHash) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-inter"
      style={{ background: 'rgba(142,182,155,0.1)', border: '1px solid rgba(142,182,155,0.2)', color: '#8EB69B' }}
    >
      {(isPending || isConfirming) ? (
        <>
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⟳</motion.span>
          {isPending ? 'Awaiting signature…' : 'Confirming on Sepolia…'}
        </>
      ) : (
        <>✓ Confirmed on-chain</>
      )}
    </motion.div>
  )
}

// ── threshold label <-> days helpers (label is just a UI convenience; the
//    contract only ever stores raw days/seconds) ────────────────────────────
function daysToThresholdLabel(thresholdSeconds) {
  const days = Number(thresholdSeconds) / 86400
  if (days >= 365) return '1year'
  if (days >= 180) return '6months'
  return '3months'
}
function thresholdLabelToDays(label) {
  if (label === '6months') return 180
  if (label === '1year')   return 365
  return 90
}

const THRESHOLD_OPTIONS = [
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '1year',   label: '1 Year'   },
]

export default function LegacyPage() {
  const { lang, emergencyContact, setEmergencyContact } = useAppStore()
  const tr = useTranslation(lang)
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { signMessageAsync }     = useSignMessage()
  const publicClient             = usePublicClient()
  const dd     = useDeadDrop()
  const keyReg = useKeyRegistry()

  const hasOnChain = !!dd.vaultExists

  const [threshold,   setThreshold]   = useState('3months')
  const [gracePeriod, setGracePeriod] = useState(30)
  const [multiSig,    setMultiSig]    = useState(false)
  const [beneficiaries, setBeneficiariesLocal] = useState([])
  const [finalMessage, setFinalMessage] = useState('')
  const [depositAmt,   setDepositAmt]   = useState('')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [isRegisteringKey, setIsRegisteringKey] = useState(false)

  const [ecName,    setEcName]    = useState(emergencyContact?.name    || '')
  const [ecContact, setEcContact] = useState(emergencyContact?.contact || '')
  const [ecSaved,   setEcSaved]   = useState(!!emergencyContact)

  // Pull current on-chain settings into the local form whenever they load —
  // this page no longer has a local/demo fallback, everything reflects chain state.
  useEffect(() => {
    if (!dd.vaultInfo) return
    setThreshold(daysToThresholdLabel(dd.vaultInfo.inactivityThreshold))
    setGracePeriod(Math.max(7, Math.round(Number(dd.vaultInfo.gracePeriodDuration) / 86400)))
    setMultiSig(!!dd.vaultInfo.multiSig)
  }, [dd.vaultInfo])

  useEffect(() => {
    if (!dd.beneficiaryData?.wallets?.length) return
    const { wallets, shares, names } = dd.beneficiaryData
    setBeneficiariesLocal(wallets.map((w, i) => ({
      wallet:     w,
      name:       names[i] || '',
      percentage: Number(shares[i]) / 100, // basis points -> percent
    })))
  }, [dd.beneficiaryData])

  const handleSaveEC = () => {
    if (!ecName.trim() || !ecContact.trim()) { toast.error('Enter both name and contact.'); return }
    setEmergencyContact({ name: ecName.trim(), contact: ecContact.trim() })
    setEcSaved(true)
    toast.success('Emergency contact saved.')
  }

  const addBeneficiary    = () => setBeneficiariesLocal([...beneficiaries, { wallet: '', name: '', percentage: 0 }])
  const removeBeneficiary = (i) => setBeneficiariesLocal(beneficiaries.filter((_, j) => j !== i))
  const updateBeneficiary = (i, field, value) =>
    setBeneficiariesLocal(beneficiaries.map((b, j) =>
      j === i ? { ...b, [field]: field === 'percentage' ? Number(value) : value } : b
    ))

  const handlePing = () => {
    if (!isConnected) { toast.error('Connect your wallet to ping.'); return }
    if (!hasOnChain)  { toast.error('Create your on-chain vault first (see button below).'); return }
    dd.ping()
  }

  const handleCreateVault = () => {
    dd.createVault(thresholdLabelToDays(threshold), gracePeriod)
  }

  const handleDeposit = () => {
    if (!depositAmt || Number(depositAmt) <= 0) { toast.error('Enter an ETH amount.'); return }
    dd.depositETH(depositAmt)
    setDepositAmt('')
  }

  const handleRegisterKey = async () => {
    if (!isConnected) { toast.error('Connect your wallet first.'); return }
    setIsRegisteringKey(true)
    try {
      const signature = await signMessageAsync({ message: IDENTITY_MESSAGE })
      const { publicKey64 } = deriveIdentityKeyPair(signature)
      keyReg.registerPublicKey(hexlify(publicKey64))
    } catch (err) {
      toast.error(err?.shortMessage || err?.message || 'Could not sign the identity message.')
    } finally {
      setIsRegisteringKey(false)
    }
  }

  // Encrypt the final message once with a fresh content key, upload the
  // ciphertext to IPFS, then wrap that content key separately for each
  // beneficiary who has registered an encryption identity (see
  // useKeyRegistry.js / crypto.js). Beneficiaries who haven't registered yet
  // are skipped with a warning — there is no way to encrypt *to* a wallet
  // that hasn't published a public key, the same limitation PGP has.
  async function buildEncryptedFinalMessageCID(validBens) {
    if (!isIPFSConfigured()) {
      toast.error('IPFS is not configured — add VITE_PINATA_JWT to your .env to save an encrypted final message.')
      return null
    }

    const contentKey = await generateContentKey()
    const rawKey      = await exportKeyRaw(contentKey)
    const cipherBlob  = await encryptText(finalMessage, contentKey)
    const contentCID  = await uploadBlob(cipherBlob, 'final-message.enc')

    const recipients = []
    for (const b of validBens) {
      const pubKeyHex = await fetchPublicKey(publicClient, b.wallet)
      if (!pubKeyHex) {
        const label = b.name || `${b.wallet.slice(0, 6)}…${b.wallet.slice(-4)}`
        toast(`${label} hasn't set up encrypted messaging yet — they won't be able to read the final message until they register a key.`, { icon: '⚠️', duration: 6000 })
        continue
      }
      const wrapped = await wrapContentKeyForRecipient(rawKey, getBytes(pubKeyHex))
      recipients.push({ wallet: b.wallet, ephemeralPublicKey: wrapped.ephemeralPublicKey, payload: wrapped.payload })
    }

    const manifest = { v: 1, contentCID, recipients }
    return uploadJSON(manifest, 'final-message-manifest.json')
  }

  const handleSave = async () => {
    if (!isConnected) { toast.error('Connect your wallet to save legacy settings.'); return }
    if (!hasOnChain)  { toast.error('Create your on-chain vault first.'); return }

    const totalPct = beneficiaries.reduce((s, b) => s + b.percentage, 0)
    if (beneficiaries.length > 0 && totalPct !== 100) {
      toast.error(`Beneficiary percentages must total 100% (currently ${totalPct}%)`)
      return
    }

    const validBens = beneficiaries.filter((b) => b.wallet?.startsWith('0x') && b.wallet.length === 42)
    if (beneficiaries.length > 0 && validBens.length !== beneficiaries.length) {
      toast.error('Every beneficiary needs a valid 0x… wallet address.')
      return
    }

    let msgCID = dd.vaultCIDs?.finalMessageCID || ''
    if (finalMessage.trim()) {
      setIsEncrypting(true)
      try {
        const built = await buildEncryptedFinalMessageCID(validBens)
        if (built == null) { setIsEncrypting(false); return }
        msgCID = built
      } catch (err) {
        setIsEncrypting(false)
        toast.error(err?.message || 'Failed to encrypt & upload final message.')
        return
      }
      setIsEncrypting(false)
    }

    dd.updateSettings(threshold, gracePeriod, multiSig, dd.vaultCIDs?.metadataCID || '', msgCID)

    if (validBens.length > 0) {
      dd.setBeneficiaries(validBens)
    }
  }

  const totalPct        = beneficiaries.reduce((s, b) => s + b.percentage, 0)
  const depositedETHFmt = dd.depositedETH
    ? parseFloat(formatEther(dd.depositedETH)).toFixed(4)
    : '0.0000'

  return (
    <div className="relative min-h-screen" style={{ paddingTop: '80px' }}>
      <FlowingCanvas />
      <div className="fixed top-0 left-0 h-full pointer-events-none"
        style={{ width: 'clamp(140px, 16vw, 260px)', zIndex: 1, opacity: 0.8 }}>
        <SideDecorCanvas type="hand-left" />
      </div>
      <div className="fixed top-0 right-0 h-full pointer-events-none"
        style={{ width: 'clamp(140px, 16vw, 260px)', zIndex: 1, opacity: 0.8 }}>
        <SideDecorCanvas type="sphere" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: '#8EB69B' }} />
            <span className="font-inter text-xs uppercase tracking-widest" style={{ color: '#8EB69B' }}>
              {isConnected ? 'Ethereum Sepolia' : 'Wallet not connected'}
            </span>
          </div>
          <h1 className="font-sora font-bold text-3xl shimmer-text mb-2">{tr('legacy.title')}</h1>
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            {isConnected
              ? 'Your legacy is recorded on Ethereum Sepolia. Every save is a real transaction.'
              : 'Connect your wallet to create and manage your on-chain legacy vault.'}
          </p>
        </motion.div>

        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <span className="text-3xl block mb-3">🔐</span>
            <h3 className="font-sora font-semibold text-lg mb-2" style={{ color: '#DAF1DE' }}>
              Connect your wallet to continue
            </h3>
            <p className="font-inter text-sm mb-5" style={{ color: '#8EB69B' }}>
              Legacy settings, beneficiaries, and your final message all live on-chain — there's no local
              or demo mode to fall back on.
            </p>
            <motion.button
              onClick={() => navigate('/connect')}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="btn-primary text-sm"
            >
              Connect wallet →
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* ── Create Vault on-chain (shown when vault not yet created) ── */}
            {!hasOnChain && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 mb-6"
                style={{ border: '1px solid rgba(209,96,31,0.3)', background: 'rgba(209,96,31,0.05)' }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">⛓️</span>
                  <div className="flex-1">
                    <h3 className="font-sora font-semibold text-base mb-1" style={{ color: '#DAF1DE' }}>
                      Register your vault on-chain
                    </h3>
                    <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
                      This one-time transaction registers your address on the DeadDropVault contract on Sepolia.
                      After this, all legacy settings are stored immutably on Ethereum.
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <motion.button
                        onClick={handleCreateVault}
                        disabled={dd.isPending || dd.isConfirming}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {dd.isPending ? 'Confirm in MetaMask…' : dd.isConfirming ? 'Confirming…' : 'Create vault on Sepolia →'}
                      </motion.button>
                      <TxBadge isPending={dd.isPending} isConfirming={dd.isConfirming} txHash={dd.txHash} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── On-chain status banner (shown when vault exists) ── */}
            {hasOnChain && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl mb-6"
                style={{ background: 'rgba(74,158,106,0.08)', border: '1px solid rgba(74,158,106,0.2)' }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  Vault registered on Sepolia ·{' '}
                  <span style={{ color: '#DAF1DE' }}>
                    {address?.slice(0, 6)}…{address?.slice(-4)}
                  </span>
                  {dd.depositedETH > 0n && (
                    <> · <span style={{ color: '#DAF1DE' }}>{depositedETHFmt} ETH</span> deposited</>
                  )}
                </span>
                {dd.txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${dd.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs font-inter transition-opacity hover:opacity-70 shrink-0"
                    style={{ color: '#8EB69B' }}
                  >
                    View tx ↗
                  </a>
                )}
              </motion.div>
            )}

            <div className="space-y-6">

              {/* Inactivity threshold */}
              <SectionCard title="Inactivity Threshold" icon="⏳" delay={0.05}>
                <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
                  After this period of inactivity, the grace period begins.
                </p>
                <div className="flex gap-3 flex-wrap">
                  {THRESHOLD_OPTIONS.map((t) => (
                    <motion.button
                      key={t.value}
                      onClick={() => setThreshold(t.value)}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-5 py-2 rounded-full font-sora text-sm font-semibold transition-all"
                      style={{
                        background: threshold === t.value ? '#0B2B26' : 'rgba(11,43,38,0.2)',
                        color:      threshold === t.value ? '#DAF1DE' : '#8EB69B',
                        border:     `1px solid ${threshold === t.value ? 'rgba(218,241,222,0.4)' : 'rgba(218,241,222,0.1)'}`,
                        boxShadow:  threshold === t.value ? '0 0 18px rgba(142,182,155,0.25)' : 'none',
                      }}
                    >
                      {t.label}
                    </motion.button>
                  ))}
                </div>
              </SectionCard>

              {/* Alive ping */}
              <SectionCard title="Alive Ping" icon="💓" delay={0.1}>
                {(() => {
                  if (!hasOnChain) {
                    return (
                      <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                        Create your on-chain vault above to start the inactivity clock.
                      </p>
                    )
                  }

                  const lastPingDate = dd.lastPingTs && dd.lastPingTs > 0n ? new Date(Number(dd.lastPingTs) * 1000) : null
                  const nextPingDate = dd.pingDeadline ? new Date(Number(dd.pingDeadline) * 1000) : null
                  const daysLeft      = nextPingDate ? Math.max(0, differenceInDays(nextPingDate, new Date())) : null
                  const totalDays     = dd.vaultInfo ? Math.max(1, Math.round(Number(dd.vaultInfo.inactivityThreshold) / 86400)) : 90
                  const pct           = daysLeft != null ? Math.min(1, daysLeft / totalDays) : 0
                  const color         = daysLeft == null ? '#8EB69B' : daysLeft > 14 ? '#8EB69B' : daysLeft > 7 ? '#D1601F' : '#e05252'

                  return (
                    <>
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.7)' }}>Time until next required ping</span>
                          <span className="font-sora font-bold text-sm" style={{ color }}>
                            {daysLeft === 0 ? 'Overdue!' : daysLeft != null ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : '—'}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(142,182,155,0.1)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct * 100}%` }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                          />
                        </div>
                        {daysLeft != null && daysLeft <= 7 && daysLeft > 0 && (
                          <p className="font-inter text-xs mt-2" style={{ color: '#D1601F' }}>
                            ⚠ Ping soon — grace period begins after threshold is crossed.
                          </p>
                        )}
                        {daysLeft === 0 && (
                          <p className="font-inter text-xs mt-2 font-semibold" style={{ color: '#e05252' }}>
                            ⚠ Ping overdue. Anyone can now trigger your grace period on-chain.
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <p className="font-inter text-xs mb-1" style={{ color: '#8EB69B' }}>Last ping</p>
                          <p className="font-sora font-semibold" style={{ color: '#DAF1DE' }}>
                            {lastPingDate ? format(lastPingDate, 'dd MMM yyyy') : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="font-inter text-xs mb-1" style={{ color: '#8EB69B' }}>Next ping due</p>
                          <p className="font-sora font-semibold" style={{ color }}>
                            {nextPingDate ? format(nextPingDate, 'dd MMM yyyy') : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <motion.button
                          onClick={handlePing}
                          disabled={dd.isPending || dd.isConfirming}
                          className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(142,182,155,0.3)' }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {dd.isPending ? 'Confirm in MetaMask…' : dd.isConfirming ? 'Confirming…' : "Ping — I'm here ✓"}
                        </motion.button>
                        <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>→ sends a real Sepolia transaction</span>
                      </div>
                    </>
                  )
                })()}
              </SectionCard>

              {/* Beneficiaries */}
              <SectionCard title="Beneficiary Assignment" icon="🕊️" delay={0.15}>
                <p className="font-inter text-xs mb-4" style={{ color: 'rgba(142,182,155,0.6)' }}>
                  Wallet addresses and shares are stored on-chain. Percentages must total 100%.
                </p>
                <div className="space-y-3">
                  {beneficiaries.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="grid grid-cols-3 gap-2 items-center"
                    >
                      <input
                        className="vault-input text-xs"
                        placeholder="Wallet 0x…"
                        value={b.wallet}
                        onChange={(e) => updateBeneficiary(i, 'wallet', e.target.value)}
                      />
                      <input
                        className="vault-input text-xs"
                        placeholder="Name"
                        value={b.name}
                        onChange={(e) => updateBeneficiary(i, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-1">
                        <input
                          className="vault-input text-xs w-full"
                          type="number" min={0} max={100} placeholder="%"
                          value={b.percentage}
                          onChange={(e) => updateBeneficiary(i, 'percentage', e.target.value)}
                        />
                        <button
                          onClick={() => removeBeneficiary(i)}
                          className="text-sm px-2 transition-opacity hover:opacity-70 flex-shrink-0"
                          style={{ color: '#8EB69B' }}
                        >✕</button>
                      </div>
                    </motion.div>
                  ))}

                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={addBeneficiary}
                      className="text-sm px-4 py-2 rounded-lg transition-all hover:opacity-90"
                      style={{ background: 'rgba(142,182,155,0.12)', color: '#8EB69B' }}
                    >
                      + Add beneficiary
                    </button>
                    <span className="font-inter text-sm font-semibold" style={{ color: totalPct === 100 ? '#4a9e6a' : '#D1601F' }}>
                      Total: {totalPct}%
                      {totalPct !== 100 && totalPct > 0 && (
                        <span className="ml-1 text-xs opacity-75">
                          ({totalPct < 100 ? `+${100 - totalPct}` : `-${totalPct - 100}`} to balance)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </SectionCard>

              {/* ETH Deposit */}
              {hasOnChain && (
                <SectionCard title="Deposit ETH into Vault" icon="Ξ" delay={0.18}>
                  <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
                    ETH locked here is distributed to beneficiaries on legacy release. Use Sepolia test ETH.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      className="vault-input text-sm flex-1"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Amount in ETH (e.g. 0.01)"
                      value={depositAmt}
                      onChange={(e) => setDepositAmt(e.target.value)}
                    />
                    <motion.button
                      onClick={handleDeposit}
                      disabled={dd.isPending || dd.isConfirming}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="btn-primary text-sm whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Deposit ETH
                    </motion.button>
                  </div>
                  {dd.depositedETH > 0n && (
                    <p className="font-inter text-xs mt-3" style={{ color: '#4a9e6a' }}>
                      ✓ {depositedETHFmt} ETH currently locked in vault
                    </p>
                  )}
                </SectionCard>
              )}

              {/* Grace period */}
              <SectionCard title="Grace Period" icon="⏱️" delay={0.2}>
                <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
                  After inactivity is detected, beneficiaries wait this many days before claiming.
                  You can still ping and cancel during this window.
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={7} max={60} value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value))}
                    className="flex-1"
                    style={{ accentColor: '#8EB69B' }}
                  />
                  <span className="font-sora font-bold text-xl w-16 text-center" style={{ color: '#DAF1DE' }}>
                    {gracePeriod}d
                  </span>
                </div>
              </SectionCard>

              {/* Multi-sig */}
              <SectionCard title="Multi-sig Release" icon="🔑" delay={0.25}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-inter text-sm" style={{ color: '#DAF1DE' }}>
                      Require 2 family members to confirm before release
                    </p>
                    <p className="font-inter text-xs mt-1" style={{ color: '#8EB69B' }}>
                      Adds protection against fraudulent claims.
                    </p>
                  </div>
                  <button
                    onClick={() => setMultiSig(!multiSig)}
                    className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ml-4"
                    style={{ background: multiSig ? '#163832' : 'rgba(11,43,38,0.4)', border: '1px solid rgba(142,182,155,0.25)' }}
                  >
                    <motion.span
                      className="absolute top-1 w-4 h-4 rounded-full"
                      animate={{ left: multiSig ? '26px' : '4px' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      style={{ background: multiSig ? '#DAF1DE' : '#8EB69B' }}
                    />
                  </button>
                </div>
              </SectionCard>

              {/* Encryption identity */}
              <SectionCard title="Encryption Identity" icon="🗝️" delay={0.28}>
                <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
                  Register a public encryption key so others — like the beneficiaries you list below — can
                  send you content (such as a final message) that only you can decrypt. This costs one
                  signature and one on-chain transaction, and never exposes your wallet's private key.
                </p>
                {keyReg.hasPublicKey ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(74,158,106,0.08)', border: '1px solid rgba(74,158,106,0.2)' }}>
                    <span className="text-lg">✓</span>
                    <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                      Encryption key registered on-chain —{' '}
                      <span style={{ color: '#DAF1DE' }}>others can now send you encrypted content.</span>
                    </span>
                  </div>
                ) : (
                  <motion.button
                    onClick={handleRegisterKey}
                    disabled={isRegisteringKey || keyReg.isPending || keyReg.isConfirming}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRegisteringKey ? 'Awaiting signature…' : keyReg.isPending ? 'Confirm in MetaMask…' : keyReg.isConfirming ? 'Confirming…' : 'Enable encrypted messaging →'}
                  </motion.button>
                )}
              </SectionCard>

              {/* Automated release */}
              <SectionCard title="Automated Release" icon="⛓️" delay={0.3}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-3 h-3 rounded-full animate-pulse-dot"
                    style={{ background: dd.isActive ? '#8EB69B' : dd.isGracePeriod ? '#D1601F' : '#235347' }}
                  />
                  <span className="badge-cobalt">
                    {!hasOnChain ? 'No vault yet' : dd.isActive ? 'Active — clock running' : dd.isGracePeriod ? 'Grace period in progress' : dd.isReleased ? 'Released' : 'Unknown'}
                  </span>
                </div>
                <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
                  DeadDrop doesn't run a centralized monitoring bot. Once your inactivity threshold passes,{' '}
                  <code className="px-1 rounded" style={{ background: 'rgba(142,182,155,0.1)' }}>triggerGracePeriod()</code>{' '}
                  becomes callable on-chain by anyone — a beneficiary, a friend, or your own scheduled script.
                  That's what keeps the system trustless: no party needs special permission to start the
                  countdown once the chain itself proves you've gone silent.
                </p>
              </SectionCard>

              {/* Final message */}
              <SectionCard title="Final Message" icon="💌" delay={0.35}>
                <p className="font-inter text-sm mb-3" style={{ color: '#8EB69B' }}>
                  Encrypted client-side and delivered to your beneficiaries when the legacy releases.
                  Only beneficiaries who've registered an encryption key (above) can decrypt it.
                </p>
                {dd.vaultCIDs?.finalMessageCID && !finalMessage.trim() && (
                  <p className="font-inter text-xs mb-2" style={{ color: '#4a9e6a' }}>
                    ✓ An encrypted message is already saved on-chain. Leave this blank to keep it, or write
                    a new one to replace it.
                  </p>
                )}
                <textarea
                  className="vault-input resize-none leading-relaxed"
                  rows={6}
                  placeholder="Write something for the people you love. They will read this when the time comes."
                  value={finalMessage}
                  onChange={(e) => setFinalMessage(e.target.value)}
                />
                <p className="font-inter text-xs mt-2" style={{ color: 'rgba(142,182,155,0.5)' }}>
                  {finalMessage.length} characters
                </p>
              </SectionCard>

              {/* Emergency contact */}
              <SectionCard title="Emergency Contact" icon="🚨" delay={0.38}>
                <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
                  This person is called first when the grace period begins — before any formal claim.
                </p>
                {ecSaved ? (
                  <div className="flex items-center justify-between p-3 rounded-xl mb-3"
                    style={{ background: 'rgba(74,158,106,0.08)', border: '1px solid rgba(74,158,106,0.2)' }}>
                    <div>
                      <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{emergencyContact.name}</p>
                      <p className="font-inter text-xs mt-0.5" style={{ color: '#8EB69B' }}>{emergencyContact.contact}</p>
                    </div>
                    <button onClick={() => setEcSaved(false)} className="text-xs px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B' }}>
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-inter text-xs mb-1.5" style={{ color: '#8EB69B' }}>Name</label>
                      <input className="vault-input text-sm" placeholder="e.g. Priya Sharma" value={ecName} onChange={(e) => setEcName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block font-inter text-xs mb-1.5" style={{ color: '#8EB69B' }}>Phone or email</label>
                      <input className="vault-input text-sm" placeholder="e.g. +91 98765 43210" value={ecContact} onChange={(e) => setEcContact(e.target.value)} />
                    </div>
                    <button onClick={handleSaveEC} className="btn-primary text-sm">Save emergency contact</button>
                  </div>
                )}
              </SectionCard>

              {/* Save settings */}
              <motion.div
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: 0.5 }}
                className="flex items-center justify-between flex-wrap gap-4"
              >
                <div>
                  <p className="font-inter text-xs" style={{ color: 'rgba(142,182,155,0.5)' }}>
                    {hasOnChain ? 'Sends one or more Sepolia transactions.' : 'Create your vault above to save settings on-chain.'}
                  </p>
                  <TxBadge isPending={dd.isPending} isConfirming={dd.isConfirming} txHash={dd.txHash} />
                </div>
                <motion.button
                  onClick={handleSave}
                  disabled={dd.isPending || dd.isConfirming || isEncrypting || !hasOnChain}
                  className="btn-primary text-base px-10 disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(142,182,155,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isEncrypting ? 'Encrypting & uploading…' : dd.isPending ? 'Confirm in MetaMask…' : dd.isConfirming ? 'Confirming…' : 'Save legacy settings'}
                </motion.button>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
