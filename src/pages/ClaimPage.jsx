import { useState }                    from 'react'
import { motion, AnimatePresence }      from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { formatEther }                  from 'viem'
import { useTranslation }               from '@/lib/translations'
import { useAppStore }                  from '@/store/useAppStore'
import { VAULT_ADDRESS, VAULT_ABI }     from '@/lib/contracts/vault'
import { useOwnerCircles }              from '@/hooks/useCircles'
import { useOwnerCapsules }             from '@/hooks/useCapsules'
import { useAllSafeEntries }            from '@/hooks/useSafe'
import AuroraBackground                 from '@/components/ui/AuroraBackground'
import { format }                       from 'date-fns'
import toast                            from 'react-hot-toast'

// ── Vault reads for an arbitrary owner address ─────────────────────────────────
function useVaultLookup(ownerAddr) {
  const enabled = !!ownerAddr && ownerAddr.startsWith('0x') && ownerAddr.length === 42 && !!VAULT_ADDRESS

  const { data: exists, isLoading: loadingExists } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI,
    functionName: 'hasVault', args: [ownerAddr],
    query: { enabled },
  })

  const { data: infoRaw, isLoading: loadingInfo } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI,
    functionName: 'getVaultInfo', args: [ownerAddr],
    query: { enabled: enabled && !!exists },
  })

  const { data: bensRaw } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI,
    functionName: 'getBeneficiaries', args: [ownerAddr],
    query: { enabled: enabled && !!exists },
  })

  const { data: gracePeriodOver } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI,
    functionName: 'isGracePeriodOver', args: [ownerAddr],
    query: { enabled: enabled && !!exists },
  })

  const { data: cidsRaw } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI,
    functionName: 'getVaultCIDs', args: [ownerAddr],
    query: { enabled: enabled && !!exists },
  })

  // Normalize positional tuple results
  const info = infoRaw
    ? { state: infoRaw[0], lastPing: infoRaw[1], inactivityThreshold: infoRaw[2], gracePeriodDuration: infoRaw[3], gracePeriodStart: infoRaw[4], depositedETH: infoRaw[5], multiSig: infoRaw[6], beneficiaryCount: infoRaw[7] }
    : null

  const bens = bensRaw
    ? { wallets: bensRaw[0], shares: bensRaw[1], names: bensRaw[2] }
    : null

  const cids = cidsRaw
    ? { metadataCID: cidsRaw[0], finalMessageCID: cidsRaw[1] }
    : null

  return {
    exists,
    info,
    bens,
    cids,
    gracePeriodOver,
    isLoading: loadingExists || loadingInfo,
  }
}

// ── Step 1: look up a vault by owner address ───────────────────────────────────
function VerificationStep({ onVerify }) {
  const [ownerAddr, setOwnerAddr] = useState('')
  const [checking,  setChecking]  = useState(false)
  const [checked,   setChecked]   = useState(false)

  const { exists, info, isLoading } = useVaultLookup(checked ? ownerAddr : '')

  const handleLookup = () => {
    if (!ownerAddr.trim()) { toast.error('Enter a wallet address.'); return }
    if (!ownerAddr.startsWith('0x') || ownerAddr.length !== 42) {
      toast.error('Enter a valid 0x Ethereum address.')
      return
    }
    setChecking(true)
    setTimeout(() => { setChecked(true); setChecking(false) }, 800)
  }

  const handleVerify = () => {
    if (!exists) { toast.error('No vault found for this address on Sepolia.'); return }
    if (info && Number(info.state) === 2) { toast.error('This legacy has already been released.'); return }
    onVerify(ownerAddr.trim())
  }

  const vaultState = info ? Number(info.state) : null
  const stateName  = vaultState === 0 ? 'Active' : vaultState === 1 ? 'Grace Period' : vaultState === 2 ? 'Released' : null

  return (
    <div className="text-center space-y-6">
      <div
        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl"
        style={{ background: 'rgba(11,43,38,0.3)', border: '2px solid rgba(218,241,222,0.2)' }}
      >
        🕊️
      </div>

      {!checked ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            Enter the wallet address of the person who left you their legacy.
          </p>
          <input
            className="vault-input text-center"
            placeholder="0x… wallet address"
            value={ownerAddr}
            onChange={(e) => setOwnerAddr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <button onClick={handleLookup} className="btn-primary w-full" disabled={checking}>
            {checking ? 'Looking up on Sepolia…' : 'Look up legacy'}
          </button>
          {!VAULT_ADDRESS && (
            <p className="font-inter text-xs" style={{ color: '#D1601F' }}>
              ⚠ Contract not deployed yet. Run <code className="font-mono">npm run deploy:sepolia</code>.
            </p>
          )}
        </motion.div>
      ) : isLoading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2"
            style={{ borderColor: '#8EB69B', borderTopColor: 'transparent' }}
          />
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>Querying Sepolia…</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          {exists ? (
            <>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl"
                style={{ background: 'rgba(74,158,106,0.08)', border: '1px solid rgba(74,158,106,0.2)' }}>
                <span className="text-3xl">✓</span>
                <p className="font-sora font-semibold" style={{ color: '#4a9e6a' }}>Vault found on-chain</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="px-3 py-1 rounded-full text-xs font-inter"
                    style={{
                      background: vaultState === 1 ? 'rgba(209,96,31,0.15)' : 'rgba(142,182,155,0.1)',
                      color:      vaultState === 1 ? '#D1601F' : '#8EB69B',
                      border:     `1px solid ${vaultState === 1 ? 'rgba(209,96,31,0.3)' : 'rgba(142,182,155,0.2)'}`,
                    }}
                  >
                    State: {stateName || 'Unknown'}
                  </div>
                  {info?.depositedETH > 0n && (
                    <div className="px-3 py-1 rounded-full text-xs font-inter"
                      style={{ background: 'rgba(142,182,155,0.1)', color: '#8EB69B', border: '1px solid rgba(142,182,155,0.2)' }}>
                      {parseFloat(formatEther(info.depositedETH)).toFixed(4)} ETH locked
                    </div>
                  )}
                </div>
              </div>

              {vaultState === 0 && (
                <p className="font-inter text-sm" style={{ color: '#D1601F' }}>
                  ⚠ The vault owner is still active. The grace period has not started yet.
                </p>
              )}
              {vaultState === 1 && (
                <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                  This vault is in its grace period. The owner can still cancel by pinging.
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setChecked(false); setOwnerAddr('') }} className="btn-outline flex-1 text-sm">
                  ← Back
                </button>
                <button
                  onClick={handleVerify}
                  className="btn-primary flex-1 text-sm"
                  disabled={vaultState === 0}
                >
                  {vaultState === 0 ? 'Not yet claimable' : 'Continue to claim →'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl text-center"
                style={{ background: 'rgba(209,96,31,0.05)', border: '1px solid rgba(209,96,31,0.2)' }}>
                <p className="font-inter text-sm" style={{ color: '#D1601F' }}>
                  No vault found for {ownerAddr.slice(0, 8)}…{ownerAddr.slice(-6)} on Sepolia.
                </p>
                <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.5)' }}>
                  The owner may not have deployed their vault on-chain yet.
                </p>
              </div>
              <button onClick={() => { setChecked(false); setOwnerAddr('') }} className="btn-outline w-full text-sm">
                Try another address
              </button>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ── AI Memory Portrait — generated from live on-chain data ────────────────────
function generatePortrait(ownerAddr, circles, capsules, safeEntries, info, cids) {
  const short = `${ownerAddr.slice(0, 6)}…${ownerAddr.slice(-4)}`
  const circleCount   = circles?.length   ?? 0
  const capsuleCount  = capsules?.length  ?? 0
  const safeCount     = safeEntries?.length ?? 0
  const ethLocked     = info?.depositedETH ? parseFloat(formatEther(info.depositedETH)) : 0
  const hasFinalMsg   = !!(cids?.finalMessageCID)
  const threshold     = info?.inactivityThreshold
    ? Math.round(Number(info.inactivityThreshold) / 86400)
    : null

  const parts = []

  parts.push(
    circleCount > 0
      ? `${short} built their vault around ${circleCount} legacy circle${circleCount !== 1 ? 's' : ''} — the people they chose to remember and be remembered by.`
      : `${short} kept their vault private, with no shared circles.`
  )

  if (capsuleCount > 0) {
    const capsuleNames = capsules.slice(0, 3).map(c => `"${c.title}"`).join(', ')
    parts.push(
      `They sealed ${capsuleCount} memory capsule${capsuleCount !== 1 ? 's' : ''} — ${capsuleNames}${capsuleCount > 3 ? ` and ${capsuleCount - 3} more` : ''} — each one a moment they decided was worth keeping forever.`
    )
  }

  if (safeCount > 0) {
    parts.push(
      `${safeCount} encrypted entr${safeCount === 1 ? 'y' : 'ies'} in the private safe — keys, documents, or letters meant only for the people who unlocked this vault.`
    )
  }

  if (ethLocked > 0) {
    parts.push(`They locked ${ethLocked.toFixed(4)} ETH here — their final financial act, waiting for you.`)
  }

  if (threshold) {
    const months = Math.round(threshold / 30)
    parts.push(
      `They set a ${months}-month inactivity window — meaning they planned ahead, and they planned for you.`
    )
  }

  if (hasFinalMsg) {
    parts.push(`They left a final message. It is encrypted and waiting below.`)
  }

  return parts.join(' ')
}

function MemoryPortrait({ ownerAddr, circles, capsules, safeEntries, info, cids, isLoading }) {
  const text = isLoading ? null : generatePortrait(ownerAddr, circles, capsules, safeEntries, info, cids)

  return (
    <div className="glass-card p-6" style={{ borderColor: 'rgba(142,182,155,0.3)' }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="badge-cobalt">AI Memory Portrait</span>
        <span className="font-inter text-xs" style={{ color: '#8EB69B' }}>Generated from on-chain data</span>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 rounded-full border-2 border-t-transparent flex-shrink-0"
            style={{ borderColor: '#8EB69B', borderTopColor: 'transparent' }}
          />
          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>Reading on-chain data…</p>
        </div>
      ) : (
        <p className="font-inter text-sm leading-relaxed" style={{ color: '#DAF1DE' }}>
          "{text}"
        </p>
      )}
    </div>
  )
}

// ── Step 2: release portal — live on-chain data for the found vault ────────────
function ReleasePortal({ ownerAddr }) {
  const { address: claimerAddress } = useAccount()
  const { info, bens, cids, gracePeriodOver } = useVaultLookup(ownerAddr)

  // On-chain content for this owner
  const { circles, isLoading: loadingCircles }   = useOwnerCircles(ownerAddr)
  const { capsules, isLoading: loadingCapsules } = useOwnerCapsules(ownerAddr)
  const { data: safeEntries }                    = useAllSafeEntries(ownerAddr)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isClaimed } = useWaitForTransactionReceipt({ hash: txHash })

  const [openCapsule, setOpenCapsule] = useState(null)

  const shortOwner    = `${ownerAddr.slice(0, 6)}…${ownerAddr.slice(-4)}`
  const depositedETH  = info?.depositedETH ?? 0n
  const ethDisplay    = parseFloat(formatEther(depositedETH)).toFixed(4)

  const isBeneficiary = bens?.wallets?.some(
    (w) => w?.toLowerCase() === claimerAddress?.toLowerCase()
  ) ?? false

  // Total file count across all circles
  const totalFiles = circles.reduce((s, c) => s + (c.files?.length ?? 0), 0)

  const handleClaim = () => {
    if (!VAULT_ADDRESS)    { toast.error('Contract not deployed.'); return }
    if (!claimerAddress)   { toast.error('Connect your wallet to claim.'); return }
    if (!isBeneficiary)    { toast.error('Your wallet is not registered as a beneficiary.'); return }
    if (!gracePeriodOver)  { toast.error('Grace period has not ended yet.'); return }

    writeContract(
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimLegacy', args: [ownerAddr] },
      {
        onSuccess: (hash) => toast.success(`Claim submitted! (${hash.slice(0, 10)}…)`),
        onError:   (err)  => toast.error(err.shortMessage || err.message || 'Claim failed'),
      }
    )
  }

  const CAPSULE_ICON = { Legacy: '🕊️', 'Time-locked': '⏰', Personal: '💌' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-4">🕊️</div>
        <h2 className="font-sora font-bold text-2xl mb-2" style={{ color: '#DAF1DE' }}>
          They left this for you.
        </h2>
        <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
          From: {shortOwner}
          <br />Retrieved: {format(new Date(), 'dd MMMM yyyy')}
        </p>
      </div>

      {/* On-chain status */}
      {info && (
        <div className="glass-card p-4 flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(142,182,155,0.2)' }}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: Number(info.state) === 1 ? '#D1601F' : Number(info.state) === 2 ? '#4a9e6a' : '#8EB69B' }} />
          <span className="font-inter text-sm" style={{ color: '#8EB69B' }}>
            Contract state:{' '}
            <span style={{ color: '#DAF1DE' }}>
              {Number(info.state) === 0 ? 'Active' : Number(info.state) === 1 ? 'Grace Period' : 'Released'}
            </span>
          </span>
          {depositedETH > 0n && (
            <span className="font-inter text-sm ml-auto" style={{ color: '#DAF1DE' }}>
              {ethDisplay} ETH locked
            </span>
          )}
          {isBeneficiary && (
            <span className="px-2 py-0.5 rounded-full text-xs font-inter ml-auto"
              style={{ background: 'rgba(74,158,106,0.15)', color: '#4a9e6a', border: '1px solid rgba(74,158,106,0.3)' }}>
              ✓ You are a beneficiary
            </span>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🌐', value: circles.length,  label: 'Circles'  },
          { icon: '🌸', value: capsules.length,  label: 'Capsules' },
          { icon: '📎', value: totalFiles,       label: 'Files'    },
        ].map((s, i) => (
          <div key={i} className="glass-card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-sora font-bold text-xl" style={{ color: '#DAF1DE' }}>{s.value}</div>
            <div className="font-inter text-xs" style={{ color: '#8EB69B' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Memory Portrait */}
      <MemoryPortrait
        ownerAddr={ownerAddr}
        circles={circles}
        capsules={capsules}
        safeEntries={safeEntries}
        info={info}
        cids={cids}
        isLoading={loadingCircles || loadingCapsules}
      />

      {/* Circles */}
      {(loadingCircles ? true : circles.length > 0) && (
        <div>
          <h3 className="font-sora font-semibold text-lg mb-4" style={{ color: '#DAF1DE' }}>Legacy Circles</h3>
          {loadingCircles ? (
            <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>Loading circles…</p>
          ) : (
            <div className="space-y-3">
              {circles.map((circle) => (
                <div key={circle.id} className="glass-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: 'rgba(11,43,38,0.4)' }}>
                    🌐
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{circle.name}</h4>
                    {circle.description && (
                      <p className="font-inter text-xs mt-0.5 truncate" style={{ color: '#8EB69B' }}>{circle.description}</p>
                    )}
                    <p className="font-inter text-xs mt-1" style={{ color: 'rgba(142,182,155,0.5)' }}>
                      {circle.memberCount?.toString() ?? '0'} members · {circle.files?.length ?? 0} files
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Memory Capsules */}
      {(loadingCapsules ? true : capsules.length > 0) && (
        <div>
          <h3 className="font-sora font-semibold text-lg mb-4" style={{ color: '#DAF1DE' }}>Memory Capsules</h3>
          {loadingCapsules ? (
            <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>Loading capsules…</p>
          ) : (
            <div className="space-y-3">
              {capsules.map((capsule, i) => (
                <motion.div
                  key={capsule.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="glass-card p-4 cursor-pointer"
                  onClick={() => setOpenCapsule(openCapsule === capsule.id ? null : capsule.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: 'rgba(11,43,38,0.4)' }}>
                      {CAPSULE_ICON[capsule.capsuleType] || '🌸'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>{capsule.title}</h4>
                      {capsule.contentPreview && (
                        <p className="font-inter text-xs mt-0.5 truncate" style={{ color: '#8EB69B' }}>{capsule.contentPreview}</p>
                      )}
                      <span className="text-xs mt-1" style={{ color: 'rgba(142,182,155,0.4)' }}>{capsule.capsuleType}</span>
                    </div>
                    <span style={{ color: '#8EB69B' }}>{openCapsule === capsule.id ? '▲' : '▼'}</span>
                  </div>
                  <AnimatePresence>
                    {openCapsule === capsule.id && capsule.contentPreview && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(218,241,222,0.1)' }}>
                          <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>{capsule.contentPreview}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safe entries (count only — contents are encrypted) */}
      {safeEntries?.length > 0 && (
        <div className="glass-card p-4 flex items-center gap-3"
          style={{ borderColor: 'rgba(142,182,155,0.2)' }}>
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-sora font-semibold text-sm" style={{ color: '#DAF1DE' }}>Private Safe</p>
            <p className="font-inter text-xs" style={{ color: '#8EB69B' }}>
              {safeEntries.length} encrypted entr{safeEntries.length === 1 ? 'y' : 'ies'} — decryption requires owner's key.
            </p>
          </div>
        </div>
      )}

      {/* Final message CID hint */}
      {cids?.finalMessageCID && (
        <div className="glass-card p-6" style={{ borderColor: 'rgba(142,182,155,0.25)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💌</span>
            <h3 className="font-sora font-semibold" style={{ color: '#DAF1DE' }}>Final Message</h3>
          </div>
          <p className="font-inter text-sm mb-3" style={{ color: '#8EB69B' }}>
            An encrypted final message is stored on IPFS. Decryption requires the key derived from the owner's wallet signature.
          </p>
          <p className="font-mono text-xs truncate" style={{ color: 'rgba(142,182,155,0.4)' }}>
            CID: {cids.finalMessageCID}
          </p>
        </div>
      )}

      {/* Claim ETH */}
      <div className="glass-card p-6 text-center" style={{ borderColor: 'rgba(142,182,155,0.3)' }}>
        <h3 className="font-sora font-bold text-xl mb-2" style={{ color: '#8EB69B' }}>Claim ETH from vault</h3>
        {depositedETH > 0n ? (
          <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
            {ethDisplay} ETH locked on Sepolia — will transfer to your wallet.
          </p>
        ) : (
          <p className="font-inter text-sm mb-4" style={{ color: '#8EB69B' }}>
            No ETH deposited in this vault.
          </p>
        )}

        {isClaimed ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
            <p className="text-3xl">✅</p>
            <p className="font-sora font-semibold" style={{ color: '#4a9e6a' }}>Transfer complete. Check your wallet.</p>
            {txHash && (
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="font-inter text-xs underline" style={{ color: '#8EB69B' }}>
                View on Etherscan ↗
              </a>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {!claimerAddress && (
              <p className="font-inter text-xs" style={{ color: '#D1601F' }}>⚠ Connect your wallet to claim.</p>
            )}
            {claimerAddress && !isBeneficiary && (
              <p className="font-inter text-xs" style={{ color: '#D1601F' }}>
                ⚠ {claimerAddress.slice(0,6)}…{claimerAddress.slice(-4)} is not a registered beneficiary.
              </p>
            )}
            {claimerAddress && isBeneficiary && !gracePeriodOver && (
              <p className="font-inter text-xs" style={{ color: '#D1601F' }}>⚠ Grace period has not ended yet.</p>
            )}
            <button
              onClick={handleClaim}
              disabled={isPending || isConfirming || !isBeneficiary || !gracePeriodOver || depositedETH === 0n}
              className="btn-cobalt text-base px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Confirm in MetaMask…' : isConfirming ? 'Confirming on-chain…' : 'Claim to my wallet →'}
            </button>
            {txHash && (
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="font-inter text-xs underline" style={{ color: '#8EB69B' }}>
                View transaction ↗
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ClaimPage() {
  const { lang } = useAppStore()
  const tr = useTranslation(lang)
  const [verified,  setVerified]  = useState(false)
  const [ownerAddr, setOwnerAddr] = useState('')

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start px-4" style={{ paddingTop: '80px' }}>
      <AuroraBackground />

      <div className="relative z-10 w-full max-w-2xl py-12">
        {!verified ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8"
          >
            <div className="text-center mb-8">
              <h1 className="font-sora font-bold text-2xl mb-2" style={{ color: '#DAF1DE' }}>
                {tr('claim.title')}
              </h1>
              <p className="font-inter text-sm" style={{ color: '#8EB69B' }}>
                {tr('claim.subtitle')}
              </p>
            </div>
            <VerificationStep onVerify={(addr) => { setOwnerAddr(addr); setVerified(true) }} />
          </motion.div>
        ) : (
          <ReleasePortal ownerAddr={ownerAddr} />
        )}
      </div>
    </div>
  )
}
