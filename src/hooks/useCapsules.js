// ─────────────────────────────────────────────────────────────────────────────
// useCapsules — on-chain Memory Capsules (DeadDropCapsules.sol)
//
// Replaces the old localStorage `capsules` / `capsuleContent` mock domain.
// As with circles, only IPFS CIDs of pre-encrypted blobs are ever passed in
// here — see src/lib/crypto.js + src/lib/ipfs.js for the encrypt+upload step.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi'
import { CAPSULES_ADDRESS, CAPSULES_ABI } from '@/lib/contracts/capsules'
import toast from 'react-hot-toast'

function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…` : ''
}

// Mirrors DeadDropCapsules.sol's enums.
export const CAPSULE_TYPE  = { PRIVATE: 0, SHARED: 1, TIME_LOCKED: 2, LEGACY: 3 }
export const CONTENT_TYPE  = { PHOTO: 0, LETTER: 1, VOICE: 2 }
// react(capsuleId, reactionIndex) — see DeadDropCapsules.sol's doc comment.
export const REACTION      = { CANDLE: 0, HEART: 1, BLOSSOM: 2 }

// capsules(id) declares 9 separate top-level outputs, so viem decodes the
// result as a plain positional array — normalize once here.
function normalizeCapsule(raw, fallbackId) {
  if (!raw) return null
  const [id, owner, title, capsuleType, contentPreview, circleId, createdAt, unlockDate, exists] = raw
  if (!exists) return null
  return {
    id, capsuleId: fallbackId ?? id, owner, title, capsuleType,
    contentPreview, circleId, createdAt, unlockDate, exists,
  }
}

// ── main hook: the connected wallet's own capsules + actions ───────────────
export function useCapsules() {
  const { address } = useAccount()
  const isReal      = !!address && !!CAPSULES_ADDRESS

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  const { data: myCapsuleIds, refetch: refetchMyCapsuleIds } = useReadContract({
    address:      CAPSULES_ADDRESS,
    abi:          CAPSULES_ABI,
    functionName: 'getMyCapsules',
    args:         [address],
    query:        { enabled: isReal },
  })

  const idList = myCapsuleIds || []
  const { data: capsuleResults, refetch: refetchCapsules } = useReadContracts({
    contracts: idList.map((id) => ({
      address:      CAPSULES_ADDRESS,
      abi:          CAPSULES_ABI,
      functionName: 'capsules',
      args:         [id],
    })),
    query: { enabled: isReal && idList.length > 0 },
  })

  const myCapsules = (capsuleResults || [])
    .map((r, i) => (r?.status === 'success' ? normalizeCapsule(r.result, idList[i]) : null))
    .filter(Boolean)

  function refetchAll() {
    refetchMyCapsuleIds()
    refetchCapsules()
  }

  function write(functionName, args, opts = {}) {
    if (!CAPSULES_ADDRESS) {
      toast.error('Capsules contract not deployed yet — run: npm run deploy:sepolia')
      return
    }
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }
    writeContract(
      { address: CAPSULES_ADDRESS, abi: CAPSULES_ABI, functionName, args },
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

  // unlockDate: pass 0 for "no time lock", or a unix-seconds timestamp.
  function createCapsule(title, capsuleType, contentPreview, circleId = 0, unlockDate = 0) {
    if (!title?.trim()) { toast.error('Capsule title is required.'); return }
    write('createCapsule', [title, capsuleType, contentPreview || '', BigInt(circleId), BigInt(unlockDate)], {
      successMsg: 'Capsule created on-chain!',
      onSuccess:  refetchAll,
    })
  }

  function updateCapsule(capsuleId, title, contentPreview) {
    write('updateCapsule', [capsuleId, title, contentPreview], {
      successMsg: 'Capsule updated!',
      onSuccess:  refetchAll,
    })
  }

  function deleteCapsule(capsuleId) {
    write('deleteCapsule', [capsuleId], {
      successMsg: 'Capsule deleted.',
      onSuccess:  refetchAll,
    })
  }

  // `cid` must already be the IPFS CID of an AES-256-GCM encrypted blob.
  function addContent(capsuleId, itemType, cid, label) {
    if (!cid) { toast.error('Upload to IPFS first.'); return }
    write('addContent', [capsuleId, itemType, cid, label || ''], {
      successMsg: 'Content added to capsule!',
    })
  }

  function removeContent(capsuleId, itemId) {
    write('removeContent', [capsuleId, itemId], { successMsg: 'Content removed.' })
  }

  function react(capsuleId, reactionIndex) {
    write('react', [capsuleId, reactionIndex], { successMsg: 'Reaction recorded!' })
  }

  return {
    contractReady: !!CAPSULES_ADDRESS,

    myCapsuleIds,
    myCapsules,

    isPending,
    isConfirming,
    isConfirmed,
    txHash,

    refetchMyCapsuleIds,
    refetchCapsules,
    refetchAll,

    createCapsule,
    updateCapsule,
    deleteCapsule,
    addContent,
    removeContent,
    react,
  }
}

// ── read any owner's capsules (used by ClaimPage's ReleasePortal) ──────────
// getMyCapsules(address) accepts any address, not just msg.sender — the
// contract is a public ledger, so this is just a read-only mirror of
// useCapsules() above, scoped to an arbitrary owner instead of the
// connected wallet, with no write actions exposed.
export function useOwnerCapsules(ownerAddr) {
  const enabled = !!ownerAddr && !!CAPSULES_ADDRESS

  const { data: capsuleIds, refetch: refetchCapsuleIds } = useReadContract({
    address:      CAPSULES_ADDRESS,
    abi:          CAPSULES_ABI,
    functionName: 'getMyCapsules',
    args:         [ownerAddr],
    query:        { enabled },
  })

  const idList = capsuleIds || []
  const { data: capsuleResults, refetch: refetchCapsules, isLoading } = useReadContracts({
    contracts: idList.map((id) => ({
      address:      CAPSULES_ADDRESS,
      abi:          CAPSULES_ABI,
      functionName: 'capsules',
      args:         [id],
    })),
    query: { enabled: enabled && idList.length > 0 },
  })

  const capsules = (capsuleResults || [])
    .map((r, i) => (r?.status === 'success' ? normalizeCapsule(r.result, idList[i]) : null))
    .filter(Boolean)

  return {
    capsuleIds,
    capsules,
    isLoading,
    refetch: () => { refetchCapsuleIds(); refetchCapsules() },
  }
}

// ── per-capsule detail reads (for MemorySpacePage, called with any id) ─────
export function useCapsule(capsuleId) {
  const enabled = capsuleId != null && !!CAPSULES_ADDRESS
  const { data: raw, ...rest } = useReadContract({
    address:      CAPSULES_ADDRESS,
    abi:          CAPSULES_ABI,
    functionName: 'capsules',
    args:         [capsuleId],
    query:        { enabled },
  })
  return { ...rest, data: normalizeCapsule(raw, capsuleId) }
}

export function useCapsuleContent(capsuleId) {
  return useReadContract({
    address:      CAPSULES_ADDRESS,
    abi:          CAPSULES_ABI,
    functionName: 'getContent',
    args:         [capsuleId],
    query:        { enabled: capsuleId != null && !!CAPSULES_ADDRESS },
  })
}

export function useCapsuleReactions(capsuleId) {
  return useReadContract({
    address:      CAPSULES_ADDRESS,
    abi:          CAPSULES_ABI,
    functionName: 'getReactions',
    args:         [capsuleId],
    query:        { enabled: capsuleId != null && !!CAPSULES_ADDRESS },
  })
}

export function useMyReactions(capsuleId, wallet) {
  return useReadContract({
    address:      CAPSULES_ADDRESS,
    abi:          CAPSULES_ABI,
    functionName: 'getUserReactions',
    args:         [capsuleId, wallet],
    query:        { enabled: capsuleId != null && !!wallet && !!CAPSULES_ADDRESS },
  })
}

export function useCapsuleUnlocked(capsuleId) {
  return useReadContract({
    address:      CAPSULES_ADDRESS,
    abi:          CAPSULES_ABI,
    functionName: 'isUnlocked',
    args:         [capsuleId],
    query:        { enabled: capsuleId != null && !!CAPSULES_ADDRESS },
  })
}
