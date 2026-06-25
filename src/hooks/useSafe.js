// ─────────────────────────────────────────────────────────────────────────────
// useSafe — on-chain Private Safe (DeadDropSafe.sol)
//
// Replaces the old localStorage-only `safeData` mock domain.
//
// IMPORTANT: `label` and `cid` are stored in the clear on a public ledger —
// both MUST be ciphertext produced client-side (src/lib/crypto.js) before
// being passed into addEntry()/updateEntry(). Only `category` and timestamps
// are ever readable in plain text on-chain. This hook does not encrypt
// anything itself; encrypt first, then call these actions with the result.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi'
import { SAFE_ADDRESS, SAFE_ABI } from '@/lib/contracts/safe'
import toast from 'react-hot-toast'

function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…` : ''
}

// Mirrors DeadDropSafe.sol's `enum SafeCategory`.
export const SAFE_CATEGORY = {
  CRYPTO_KEY: 0,
  LETTER:     1,
  VOICE_NOTE: 2,
  PASSWORD:   3,
  DOCUMENT:   4,
  PHOTO:      5,
}

// ── main hook: the connected wallet's own safe + actions ───────────────────
export function useSafe() {
  const { address } = useAccount()
  const isReal      = !!address && !!SAFE_ADDRESS

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  // getAllEntries() returns SafeEntry[] — a single tuple[] output, which viem
  // decodes into an array of objects with named keys (id, category, label,
  // cid, addedAt, deleted) — no positional-array normalization needed here.
  const { data: entries, refetch: refetchEntries } = useReadContract({
    address:      SAFE_ADDRESS,
    abi:          SAFE_ABI,
    functionName: 'getAllEntries',
    args:         [address],
    query:        { enabled: isReal },
  })

  function write(functionName, args, opts = {}) {
    if (!SAFE_ADDRESS) {
      toast.error('Safe contract not deployed yet — run: npm run deploy:sepolia')
      return
    }
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }
    writeContract(
      { address: SAFE_ADDRESS, abi: SAFE_ABI, functionName, args },
      {
        onSuccess: (hash) => {
          toast.success(`${opts.successMsg || 'Transaction sent!'} (${shortHash(hash)})`)
          opts.onSuccess?.()
        },
        onError: (err) => {
          toast.error(err.shortMessage || err.message || 'Transaction failed')
          opts.onError?.()
        },
      }
    )
  }

  // `label` and `cid` must already be ciphertext (see file header).
  function addEntry(category, label, cid) {
    if (!cid) { toast.error('Encrypt and upload to IPFS first.'); return }
    write('addEntry', [category, label, cid], {
      successMsg: 'Entry added to your safe!',
      onSuccess:  refetchEntries,
    })
  }

  function updateEntry(entryId, label, cid) {
    write('updateEntry', [entryId, label, cid], {
      successMsg: 'Entry updated!',
      onSuccess:  refetchEntries,
    })
  }

  function removeEntry(entryId) {
    write('removeEntry', [entryId], {
      successMsg: 'Entry removed.',
      onSuccess:  refetchEntries,
    })
  }

  // Memoized on `entries` (referentially stable across renders unless the
  // underlying query actually refetches) so consumers that key effects off
  // entriesByCategory[...] (e.g. to lazily decrypt/fetch from IPFS) don't
  // re-run on every unrelated render of the page that called useSafe().
  const entriesByCategory = useMemo(
    () =>
      (entries || []).reduce((acc, e) => {
        const key = Number(e.category)
        ;(acc[key] ||= []).push(e)
        return acc
      }, {}),
    [entries]
  )

  return {
    contractReady: !!SAFE_ADDRESS,

    entries,
    entriesByCategory,

    isPending,
    isConfirming,
    isConfirmed,
    txHash,

    refetchEntries,

    addEntry,
    updateEntry,
    removeEntry,
  }
}

// ── per-owner reads (any address — entries are a public ledger, opaque ciphertext) ──
export function useSafeEntries(ownerAddr, category) {
  return useReadContract({
    address:      SAFE_ADDRESS,
    abi:          SAFE_ABI,
    functionName: 'getEntries',
    args:         [ownerAddr, category],
    query:        { enabled: !!ownerAddr && category != null && !!SAFE_ADDRESS },
  })
}

export function useAllSafeEntries(ownerAddr) {
  return useReadContract({
    address:      SAFE_ADDRESS,
    abi:          SAFE_ABI,
    functionName: 'getAllEntries',
    args:         [ownerAddr],
    query:        { enabled: !!ownerAddr && !!SAFE_ADDRESS },
  })
}

export function useSafeEntryCount(ownerAddr) {
  return useReadContract({
    address:      SAFE_ADDRESS,
    abi:          SAFE_ABI,
    functionName: 'entryCount',
    args:         [ownerAddr],
    query:        { enabled: !!ownerAddr && !!SAFE_ADDRESS },
  })
}
