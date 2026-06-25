// ─────────────────────────────────────────────────────────────────────────────
// useKeyRegistry — on-chain ECIES public-key directory (DeadDropKeyRegistry.sol)
//
// Every wallet that wants to be able to *receive* end-to-end-encrypted content
// (e.g. a beneficiary on someone's Final Message) must first register the
// public half of a deterministic keypair derived from their own wallet
// signature — see deriveIdentityKeyPair() / getIdentityPublicKey() in
// src/lib/crypto.js. This hook reads/writes that single on-chain record.
//
// Encryption itself never touches this file — crypto.js owns that. This hook
// only ever moves opaque public-key bytes (0x-prefixed hex) on-chain.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi'
import { KEY_REGISTRY_ADDRESS, KEY_REGISTRY_ABI } from '@/lib/contracts/keyRegistry'
import toast from 'react-hot-toast'

function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…` : ''
}

// ── main hook: the connected wallet's own registration + actions ──────────
export function useKeyRegistry() {
  const { address } = useAccount()
  const isReal      = !!address && !!KEY_REGISTRY_ADDRESS

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  const { data: hasPublicKey, refetch: refetchHasPublicKey } = useReadContract({
    address:      KEY_REGISTRY_ADDRESS,
    abi:          KEY_REGISTRY_ABI,
    functionName: 'hasPublicKey',
    args:         [address],
    query:        { enabled: isReal },
  })

  const { data: myPublicKey, refetch: refetchMyPublicKey } = useReadContract({
    address:      KEY_REGISTRY_ADDRESS,
    abi:          KEY_REGISTRY_ABI,
    functionName: 'getPublicKey',
    args:         [address],
    query:        { enabled: isReal && !!hasPublicKey },
  })

  function refetchAll() {
    refetchHasPublicKey()
    refetchMyPublicKey()
  }

  // `pubKeyHex` must be a 0x-prefixed hex string — typically publicKey64 from
  // deriveIdentityKeyPair()/getIdentityPublicKey() in crypto.js.
  function registerPublicKey(pubKeyHex, opts = {}) {
    if (!KEY_REGISTRY_ADDRESS) {
      toast.error('Key registry contract not deployed yet — run: npm run deploy:sepolia')
      return
    }
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }
    if (!pubKeyHex) {
      toast.error('No encryption key to register.')
      return
    }
    writeContract(
      { address: KEY_REGISTRY_ADDRESS, abi: KEY_REGISTRY_ABI, functionName: 'registerPublicKey', args: [pubKeyHex] },
      {
        onSuccess: (hash) => {
          toast.success(`Encryption identity registered on-chain! (${shortHash(hash)})`)
          refetchAll()
          opts.onSuccess?.()
        },
        onError: (err) => {
          toast.error(err.shortMessage || err.message || 'Transaction failed')
          opts.onError?.()
        },
      }
    )
  }

  return {
    contractReady: !!KEY_REGISTRY_ADDRESS,

    hasPublicKey: !!hasPublicKey,
    myPublicKey,

    isPending,
    isConfirming,
    isConfirmed,
    txHash,

    refetchHasPublicKey,
    refetchMyPublicKey,
    refetchAll,

    registerPublicKey,
  }
}

// ── read any single address's registration (for occasional one-off UI use) ──
export function useOwnerPublicKey(ownerAddr) {
  const enabled = !!ownerAddr && !!KEY_REGISTRY_ADDRESS

  const { data: hasPublicKey, refetch: refetchHasPublicKey } = useReadContract({
    address:      KEY_REGISTRY_ADDRESS,
    abi:          KEY_REGISTRY_ABI,
    functionName: 'hasPublicKey',
    args:         [ownerAddr],
    query:        { enabled },
  })

  const { data: publicKey, refetch: refetchPublicKey, isLoading } = useReadContract({
    address:      KEY_REGISTRY_ADDRESS,
    abi:          KEY_REGISTRY_ABI,
    functionName: 'getPublicKey',
    args:         [ownerAddr],
    query:        { enabled: enabled && !!hasPublicKey },
  })

  return {
    hasPublicKey: !!hasPublicKey,
    publicKey,
    isLoading,
    refetch: () => { refetchHasPublicKey(); refetchPublicKey() },
  }
}

// ── imperative lookup, for use OUTSIDE of render (e.g. inside a for-loop in
//    an event handler, such as LegacyPage's per-beneficiary Final Message
//    encryption flow). React hooks can't be called per-beneficiary since the
//    beneficiary count is dynamic — this is a plain async helper around
//    viem's publicClient.readContract() instead. Pair with usePublicClient().
//    Returns the raw 0x-prefixed public key bytes, or null if unregistered.
export async function fetchPublicKey(publicClient, address) {
  if (!publicClient || !address || !KEY_REGISTRY_ADDRESS) return null
  try {
    const has = await publicClient.readContract({
      address:      KEY_REGISTRY_ADDRESS,
      abi:          KEY_REGISTRY_ABI,
      functionName: 'hasPublicKey',
      args:         [address],
    })
    if (!has) return null
    const key = await publicClient.readContract({
      address:      KEY_REGISTRY_ADDRESS,
      abi:          KEY_REGISTRY_ABI,
      functionName: 'getPublicKey',
      args:         [address],
    })
    return key || null
  } catch {
    return null
  }
}
