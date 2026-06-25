// ─────────────────────────────────────────────────────────────────────────────
// useCircles — on-chain "Legacy Circles" (DeadDropCircles.sol)
//
// Replaces the old localStorage `profiles` / `profileMembers` / `profileFiles`
// / `profileTimeline` mock domain. File content itself never touches this
// hook — upload the encrypted blob via src/lib/crypto.js + src/lib/ipfs.js
// first, then pass the resulting CID into uploadFile().
// ─────────────────────────────────────────────────────────────────────────────

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi'
import { CIRCLES_ADDRESS, CIRCLES_ABI } from '@/lib/contracts/circles'
import toast from 'react-hot-toast'

function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…` : ''
}

// Mirrors DeadDropCircles.sol's `enum Role { Member, Admin }`
export const CIRCLE_ROLE = { MEMBER: 0, ADMIN: 1 }

// circles(id) declares 7 separate top-level outputs (not one struct), so
// viem decodes the result as a plain positional array — there is no .name,
// .creator, etc. to read off it directly. Normalize once here.
function normalizeCircle(raw, fallbackId) {
  if (!raw) return null
  const [id, creator, name, circleType, description, createdAt, exists] = raw
  if (!exists) return null
  return { id, circleId: fallbackId ?? id, creator, name, circleType, description, createdAt, exists }
}

// ── main hook: the connected wallet's own circles + actions ────────────────
export function useCircles() {
  const { address } = useAccount()
  const isReal      = !!address && !!CIRCLES_ADDRESS

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  // ── ids of circles I belong to ────────────────────────────────────────────
  const { data: myCircleIds, refetch: refetchMyCircleIds } = useReadContract({
    address:      CIRCLES_ADDRESS,
    abi:          CIRCLES_ABI,
    functionName: 'getMyCircles',
    args:         [address],
    query:        { enabled: isReal },
  })

  // ── batch-fetch full circle metadata for each id via multicall ─────────────
  const idList = myCircleIds || []
  const { data: circleResults, refetch: refetchCircles } = useReadContracts({
    contracts: idList.map((id) => ({
      address:      CIRCLES_ADDRESS,
      abi:          CIRCLES_ABI,
      functionName: 'circles',
      args:         [id],
    })),
    query: { enabled: isReal && idList.length > 0 },
  })

  const myCircles = (circleResults || [])
    .map((r, i) => (r?.status === 'success' ? normalizeCircle(r.result, idList[i]) : null))
    .filter(Boolean)

  function refetchAll() {
    refetchMyCircleIds()
    refetchCircles()
  }

  // ── shared write helper ─────────────────────────────────────────────────────
  function write(functionName, args, opts = {}) {
    if (!CIRCLES_ADDRESS) {
      toast.error('Circles contract not deployed yet — run: npm run deploy:sepolia')
      return
    }
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }
    writeContract(
      { address: CIRCLES_ADDRESS, abi: CIRCLES_ABI, functionName, args },
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

  // ── actions ──────────────────────────────────────────────────────────────────
  function createCircle(name, circleType, description, creatorName) {
    if (!name?.trim()) { toast.error('Circle name is required.'); return }
    write('createCircle', [name, circleType, description || '', creatorName || ''], {
      successMsg: 'Circle created on-chain!',
      onSuccess:  refetchAll,
    })
  }

  function updateCircle(circleId, name, circleType, description) {
    write('updateCircle', [circleId, name, circleType, description], {
      successMsg: 'Circle updated!',
      onSuccess:  refetchAll,
    })
  }

  function addMember(circleId, wallet, name, role = CIRCLE_ROLE.MEMBER) {
    write('addMember', [circleId, wallet, name, role], { successMsg: 'Member added!' })
  }

  function joinCircle(circleId, name) {
    write('joinCircle', [circleId, name], {
      successMsg: 'Joined circle!',
      onSuccess:  refetchAll,
    })
  }

  function removeMember(circleId, wallet) {
    write('removeMember', [circleId, wallet], { successMsg: 'Member removed.' })
  }

  // `cid` must already be the IPFS CID of an AES-256-GCM encrypted blob — see
  // src/lib/crypto.js (encryptBlob) and src/lib/ipfs.js (uploadBlob).
  function uploadFile(circleId, name, cid, fileType, size) {
    if (!cid) { toast.error('Upload to IPFS first.'); return }
    write('uploadFile', [circleId, name, cid, fileType || '', BigInt(size || 0)], {
      successMsg: 'File added to circle!',
    })
  }

  function removeFile(circleId, fileId) {
    write('removeFile', [circleId, fileId], { successMsg: 'File removed.' })
  }

  return {
    contractReady: !!CIRCLES_ADDRESS,

    myCircleIds,
    myCircles,

    isPending,
    isConfirming,
    isConfirmed,
    txHash,

    refetchMyCircleIds,
    refetchCircles,
    refetchAll,

    createCircle,
    updateCircle,
    addMember,
    joinCircle,
    removeMember,
    uploadFile,
    removeFile,
  }
}

// ── read any owner's circles + files (used by ClaimPage's ReleasePortal) ───
// getMyCircles(address) accepts any address, not just msg.sender — the
// contract is a public ledger, so this mirrors useCircles() above but is
// scoped to an arbitrary owner with no write actions exposed. Files are
// batched per-circle via a second multicall rather than calling
// useCircleFiles() once per circle in a loop, since React's Rules of Hooks
// forbid a variable number of hook calls (the circle list's length changes
// across renders as data loads).
export function useOwnerCircles(ownerAddr) {
  const enabled = !!ownerAddr && !!CIRCLES_ADDRESS

  const { data: circleIds, refetch: refetchCircleIds } = useReadContract({
    address:      CIRCLES_ADDRESS,
    abi:          CIRCLES_ABI,
    functionName: 'getMyCircles',
    args:         [ownerAddr],
    query:        { enabled },
  })

  const idList = circleIds || []
  const { data: circleResults, refetch: refetchCircleMeta, isLoading: loadingMeta } = useReadContracts({
    contracts: idList.map((id) => ({
      address:      CIRCLES_ADDRESS,
      abi:          CIRCLES_ABI,
      functionName: 'circles',
      args:         [id],
    })),
    query: { enabled: enabled && idList.length > 0 },
  })

  const baseCircles = (circleResults || [])
    .map((r, i) => (r?.status === 'success' ? normalizeCircle(r.result, idList[i]) : null))
    .filter(Boolean)

  // getFiles(id) returns a single tuple[] output, which viem decodes as an
  // array of named objects (no positional normalization needed) — see the
  // module doc comment in useDeadDrop.js for the general decode rule.
  const { data: fileResults, refetch: refetchFiles, isLoading: loadingFiles } = useReadContracts({
    contracts: baseCircles.map((c) => ({
      address:      CIRCLES_ADDRESS,
      abi:          CIRCLES_ABI,
      functionName: 'getFiles',
      args:         [c.id],
    })),
    query: { enabled: enabled && baseCircles.length > 0 },
  })

  const circles = baseCircles.map((c, i) => ({
    ...c,
    files: fileResults?.[i]?.status === 'success' ? fileResults[i].result : [],
  }))

  return {
    circleIds,
    circles,
    isLoading: loadingMeta || loadingFiles,
    refetch: () => { refetchCircleIds(); refetchCircleMeta(); refetchFiles() },
  }
}

// ── per-circle detail reads (for ProfileDetailPage, called with any id) ─────
export function useCircle(circleId) {
  const enabled = circleId != null && !!CIRCLES_ADDRESS
  const { data: raw, ...rest } = useReadContract({
    address:      CIRCLES_ADDRESS,
    abi:          CIRCLES_ABI,
    functionName: 'circles',
    args:         [circleId],
    query:        { enabled },
  })
  return { ...rest, data: normalizeCircle(raw, circleId) }
}

export function useCircleMembers(circleId) {
  return useReadContract({
    address:      CIRCLES_ADDRESS,
    abi:          CIRCLES_ABI,
    functionName: 'getMembers',
    args:         [circleId],
    query:        { enabled: circleId != null && !!CIRCLES_ADDRESS },
  })
}

export function useCircleFiles(circleId) {
  return useReadContract({
    address:      CIRCLES_ADDRESS,
    abi:          CIRCLES_ABI,
    functionName: 'getFiles',
    args:         [circleId],
    query:        { enabled: circleId != null && !!CIRCLES_ADDRESS },
  })
}

export function useIsMemberOf(circleId, wallet) {
  return useReadContract({
    address:      CIRCLES_ADDRESS,
    abi:          CIRCLES_ABI,
    functionName: 'isMemberOf',
    args:         [circleId, wallet],
    query:        { enabled: circleId != null && !!wallet && !!CIRCLES_ADDRESS },
  })
}
