import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi'
import { parseEther }       from 'viem'
import { VAULT_ADDRESS as CONTRACT_ADDRESS, VAULT_ABI as DEADDROP_ABI } from '@/lib/contracts/vault'
import toast from 'react-hot-toast'

// ── helpers ───────────────────────────────────────────────────────────────────
function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…` : ''
}

function thresholdToDays(value) {
  // value is one of: '3months' | '6months' | '1year'  (from the UI select)
  if (value === '6months') return 180
  if (value === '1year')   return 365
  return 90 // default: 3months
}

// getVaultInfo()'s outputs are 8 separate named outputs in the ABI, which
// viem decodes as a plain positional array (no named-property access) —
// see DeadDropVault.sol / contracts/vault.js for the exact order.
function normalizeVaultInfo(raw) {
  if (!raw) return null
  const [state, lastPing, inactivityThreshold, gracePeriodDuration, gracePeriodStart, depositedETH, multiSig, beneficiaryCount] = raw
  return { state, lastPing, inactivityThreshold, gracePeriodDuration, gracePeriodStart, depositedETH, multiSig, beneficiaryCount }
}

// getBeneficiaries() likewise declares 3 separate top-level array outputs.
function normalizeBeneficiaries(raw) {
  if (!raw) return undefined
  const [wallets, shares, names] = raw
  return { wallets, shares, names }
}

// getVaultCIDs() declares 2 separate top-level string outputs — same
// positional-array decode rule applies.
function normalizeVaultCIDs(raw) {
  if (!raw) return undefined
  const [metadataCID, finalMessageCID] = raw
  return { metadataCID, finalMessageCID }
}

// ── main hook ─────────────────────────────────────────────────────────────────
export function useDeadDrop() {
  const { address } = useAccount()
  const isReal      = !!address && !!CONTRACT_ADDRESS

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  // ── reads ──────────────────────────────────────────────────────────────────
  const { data: vaultExists, refetch: refetchVault } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          DEADDROP_ABI,
    functionName: 'hasVault',
    args:         [address],
    query:        { enabled: isReal },
  })

  // getVaultInfo() declares 8 separate top-level outputs (not one struct), so
  // viem/wagmi decode it as a plain positional array — there is no .state,
  // .depositedETH, etc. to read. Normalize it into an object once here so
  // every consumer of this hook gets named fields.
  const { data: vaultInfoRaw, refetch: refetchInfo } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          DEADDROP_ABI,
    functionName: 'getVaultInfo',
    args:         [address],
    query:        { enabled: isReal && !!vaultExists },
  })
  const vaultInfo = normalizeVaultInfo(vaultInfoRaw)

  // getBeneficiaries() likewise declares 3 top-level array outputs — normalize
  // the same way so callers can use beneficiaryData.wallets / .shares / .names.
  const { data: beneficiaryRaw, refetch: refetchBens } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          DEADDROP_ABI,
    functionName: 'getBeneficiaries',
    args:         [address],
    query:        { enabled: isReal && !!vaultExists },
  })
  const beneficiaryData = normalizeBeneficiaries(beneficiaryRaw)

  const { data: pingDeadline } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          DEADDROP_ABI,
    functionName: 'getNextPingDeadline',
    args:         [address],
    query:        { enabled: isReal && !!vaultExists },
  })

  // metadataCID / finalMessageCID — set via createVault()/updateSettings(),
  // read back through the dedicated getVaultCIDs() getter (see DeadDropVault.sol).
  const { data: vaultCIDsRaw, refetch: refetchCIDs } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          DEADDROP_ABI,
    functionName: 'getVaultCIDs',
    args:         [address],
    query:        { enabled: isReal && !!vaultExists },
  })
  const vaultCIDs = normalizeVaultCIDs(vaultCIDsRaw)

  // ── read for any owner address (used by ClaimPage) ─────────────────────────
  function useOwnerVaultInfo(ownerAddr) {
    const result = useReadContract({
      address:      CONTRACT_ADDRESS,
      abi:          DEADDROP_ABI,
      functionName: 'getVaultInfo',
      args:         [ownerAddr],
      query:        { enabled: !!ownerAddr && !!CONTRACT_ADDRESS },
    })
    // Same positional-array decode applies here — normalize before returning.
    return { ...result, data: normalizeVaultInfo(result.data) }
  }

  // ── read beneficiaries for any owner address (used by ClaimPage) ───────────
  function useOwnerBeneficiaries(ownerAddr) {
    const result = useReadContract({
      address:      CONTRACT_ADDRESS,
      abi:          DEADDROP_ABI,
      functionName: 'getBeneficiaries',
      args:         [ownerAddr],
      query:        { enabled: !!ownerAddr && !!CONTRACT_ADDRESS },
    })
    return { ...result, data: normalizeBeneficiaries(result.data) }
  }

  function useOwnerHasVault(ownerAddr) {
    return useReadContract({
      address:      CONTRACT_ADDRESS,
      abi:          DEADDROP_ABI,
      functionName: 'hasVault',
      args:         [ownerAddr],
      query:        { enabled: !!ownerAddr && !!CONTRACT_ADDRESS },
    })
  }

  function useGracePeriodOver(ownerAddr) {
    return useReadContract({
      address:      CONTRACT_ADDRESS,
      abi:          DEADDROP_ABI,
      functionName: 'isGracePeriodOver',
      args:         [ownerAddr],
      query:        { enabled: !!ownerAddr && !!CONTRACT_ADDRESS },
    })
  }

  // ── read the metadata/final-message CIDs for any owner (used by ClaimPage) ──
  function useOwnerVaultCIDs(ownerAddr) {
    const result = useReadContract({
      address:      CONTRACT_ADDRESS,
      abi:          DEADDROP_ABI,
      functionName: 'getVaultCIDs',
      args:         [ownerAddr],
      query:        { enabled: !!ownerAddr && !!CONTRACT_ADDRESS },
    })
    return { ...result, data: normalizeVaultCIDs(result.data) }
  }

  // ── shared write helper ────────────────────────────────────────────────────
  function write(functionName, args, opts = {}) {
    if (!CONTRACT_ADDRESS) {
      toast.error('Contract not deployed yet — run: npm run deploy:sepolia')
      return
    }
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }

    writeContract(
      {
        address:      CONTRACT_ADDRESS,
        abi:          DEADDROP_ABI,
        functionName,
        args,
        ...(opts.value ? { value: opts.value } : {}),
      },
      {
        onSuccess: (hash) => {
          const msg = opts.successMsg || 'Transaction sent!'
          toast.success(`${msg} (${shortHash(hash)})`)
          opts.onSuccess?.()
        },
        onError: (err) => {
          const msg = err.shortMessage || err.message || 'Transaction failed'
          toast.error(msg)
          opts.onError?.()
        },
      }
    )
  }

  // ── public actions ─────────────────────────────────────────────────────────
  function createVault(thresholdDays = 90, graceDays = 30) {
    write('createVault', [BigInt(thresholdDays), BigInt(graceDays)], {
      successMsg: 'Vault created on Sepolia!',
      onSuccess:  () => { refetchVault(); refetchInfo() },
    })
  }

  function ping(onSuccess) {
    write('ping', [], {
      successMsg: 'Alive ping recorded on-chain!',
      onSuccess:  () => { refetchInfo(); onSuccess?.() },
    })
  }

  function updateSettings(thresholdLabel, graceDays, multiSig, metaCID = '', msgCID = '') {
    const days = thresholdToDays(thresholdLabel)
    write('updateSettings', [BigInt(days), BigInt(graceDays), multiSig, metaCID, msgCID], {
      successMsg: 'Settings saved on-chain!',
      onSuccess:  () => { refetchInfo(); refetchCIDs() },
    })
  }

  function setBeneficiaries(beneficiaries) {
    if (!beneficiaries?.length) { toast.error('Add at least one beneficiary.'); return }

    const wallets   = beneficiaries.map((b) => b.wallet)
    const sharesBPS = beneficiaries.map((b) => BigInt(Math.round(b.percentage * 100)))
    const names     = beneficiaries.map((b) => b.name || '')

    write('setBeneficiaries', [wallets, sharesBPS, names], {
      successMsg: 'Beneficiaries saved on-chain!',
      onSuccess:  () => refetchBens(),
    })
  }

  function depositETH(amountEth) {
    if (!amountEth || Number(amountEth) <= 0) { toast.error('Enter an ETH amount.'); return }
    write('depositETH', [], {
      value:      parseEther(String(amountEth)),
      successMsg: `${amountEth} ETH deposited into vault!`,
      onSuccess:  () => refetchInfo(),
    })
  }

  function triggerGracePeriod(ownerAddr) {
    write('triggerGracePeriod', [ownerAddr], {
      successMsg: 'Grace period triggered on-chain.',
    })
  }

  function claimLegacy(ownerAddr) {
    write('claimLegacy', [ownerAddr], {
      successMsg: 'Claim submitted — ETH transfer initiated!',
    })
  }

  // ── derived state ──────────────────────────────────────────────────────────
  const vaultState     = vaultInfo ? Number(vaultInfo.state) : null
  const isActive       = vaultState === 0
  const isGracePeriod  = vaultState === 1
  const isReleased     = vaultState === 2
  const depositedETH   = vaultInfo?.depositedETH ?? 0n
  const lastPingTs     = vaultInfo?.lastPing      ?? 0n  // BigInt seconds

  return {
    // Contract deployment status
    contractReady: !!CONTRACT_ADDRESS,

    // Vault state
    vaultExists,
    vaultInfo,
    vaultState,
    isActive,
    isGracePeriod,
    isReleased,
    depositedETH,
    lastPingTs,
    pingDeadline,
    beneficiaryData,
    vaultCIDs,

    // Transaction state
    isPending,
    isConfirming,
    isConfirmed,
    txHash,

    // Refetchers
    refetchVault,
    refetchInfo,
    refetchCIDs,

    // Per-owner reads (for ClaimPage — called with any address)
    useOwnerVaultInfo,
    useOwnerBeneficiaries,
    useOwnerHasVault,
    useGracePeriodOver,
    useOwnerVaultCIDs,

    // Actions
    createVault,
    ping,
    updateSettings,
    setBeneficiaries,
    depositETH,
    triggerGracePeriod,
    claimLegacy,
  }
}
