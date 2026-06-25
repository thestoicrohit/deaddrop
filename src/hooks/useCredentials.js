// ─────────────────────────────────────────────────────────────────────────────
// useCredentials — on-chain Credential NFTs (DeadDropCredentials.sol)
//
// Powers the Organizations feature: verified issuers (universities, employers)
// mint ERC-721 credentials directly to a recipient's wallet. Replaces the old
// localStorage `issuedCredentials` mock domain. Credential *content* lives in
// a JSON file on IPFS (institution, date, details, ...) — pin it yourself via
// src/lib/ipfs.js (uploadJSON) before calling issueCredential().
// ─────────────────────────────────────────────────────────────────────────────

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi'
import { CREDENTIALS_ADDRESS, CREDENTIALS_ABI } from '@/lib/contracts/credentials'
import toast from 'react-hot-toast'

function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…` : ''
}

// credentials(tokenId) declares 8 separate top-level outputs, so viem decodes
// the result as a plain positional array — normalize once here.
function normalizeCredential(raw, fallbackId) {
  if (!raw) return null
  const [tokenId, issuer, recipient, credentialType, title, metadataCID, issuedAt, revoked] = raw
  return { tokenId: fallbackId ?? tokenId, issuer, recipient, credentialType, title, metadataCID, issuedAt, revoked }
}

// ── main hook: credentials owned by / issuable by the connected wallet ─────
export function useCredentials() {
  const { address } = useAccount()
  const isReal      = !!address && !!CREDENTIALS_ADDRESS

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  // ── credentials I hold ──────────────────────────────────────────────────────
  const { data: myTokenIds, refetch: refetchMyTokenIds } = useReadContract({
    address:      CREDENTIALS_ADDRESS,
    abi:          CREDENTIALS_ABI,
    functionName: 'getCredentialsOf',
    args:         [address],
    query:        { enabled: isReal },
  })

  const idList = myTokenIds || []
  const { data: credentialResults, refetch: refetchCredentials } = useReadContracts({
    contracts: idList.map((id) => ({
      address:      CREDENTIALS_ADDRESS,
      abi:          CREDENTIALS_ABI,
      functionName: 'credentials',
      args:         [id],
    })),
    query: { enabled: isReal && idList.length > 0 },
  })

  const myCredentials = (credentialResults || [])
    .map((r, i) => (r?.status === 'success' ? normalizeCredential(r.result, idList[i]) : null))
    .filter(Boolean)

  // ── am I a verified issuer / the admin? ─────────────────────────────────────
  const { data: isVerifiedIssuer, refetch: refetchIsIssuer } = useReadContract({
    address:      CREDENTIALS_ADDRESS,
    abi:          CREDENTIALS_ABI,
    functionName: 'verifiedIssuers',
    args:         [address],
    query:        { enabled: isReal },
  })

  const { data: adminAddress } = useReadContract({
    address:      CREDENTIALS_ADDRESS,
    abi:          CREDENTIALS_ABI,
    functionName: 'admin',
    query:        { enabled: !!CREDENTIALS_ADDRESS },
  })
  const isAdmin = !!address && !!adminAddress && address.toLowerCase() === adminAddress.toLowerCase()

  function refetchAll() {
    refetchMyTokenIds()
    refetchCredentials()
    refetchIsIssuer()
  }

  function write(functionName, args, opts = {}) {
    if (!CREDENTIALS_ADDRESS) {
      toast.error('Credentials contract not deployed yet — run: npm run deploy:sepolia')
      return
    }
    if (!address) {
      toast.error('Connect your wallet first.')
      return
    }
    writeContract(
      { address: CREDENTIALS_ADDRESS, abi: CREDENTIALS_ABI, functionName, args },
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

  // `metadataCID` = IPFS CID of a JSON blob ({institution, date, details, ...}).
  // Credential content is intentionally public/verifiable — do NOT encrypt it
  // the way circle files / safe entries are encrypted.
  function issueCredential(recipient, credentialType, title, metadataCID) {
    if (!isVerifiedIssuer) { toast.error('Your wallet is not a verified issuer.'); return }
    if (!metadataCID)      { toast.error('Upload credential metadata to IPFS first.'); return }
    write('issueCredential', [recipient, credentialType, title, metadataCID], {
      successMsg: 'Credential issued on-chain!',
    })
  }

  function revokeCredential(tokenId) {
    write('revokeCredential', [tokenId], {
      successMsg: 'Credential revoked.',
      onSuccess:  refetchAll,
    })
  }

  // Admin-only: grant or revoke another wallet's issuer status.
  function setIssuer(issuerAddr, verified) {
    if (!isAdmin) { toast.error('Only the contract admin can manage issuers.'); return }
    write('setIssuer', [issuerAddr, verified], {
      successMsg: verified ? 'Issuer verified!' : 'Issuer revoked.',
    })
  }

  function transferAdmin(newAdmin) {
    if (!isAdmin) { toast.error('Only the contract admin can transfer admin.'); return }
    write('transferAdmin', [newAdmin], { successMsg: 'Admin transferred.' })
  }

  // Simple wallet-to-wallet transfer (no data payload) — see safeTransferFrom
  // overloads in DeadDropCredentials.sol if a data payload is ever needed.
  function transferCredential(to, tokenId) {
    if (!address) { toast.error('Connect your wallet first.'); return }
    write('safeTransferFrom', [address, to, tokenId], {
      successMsg: 'Credential transferred.',
      onSuccess:  refetchAll,
    })
  }

  return {
    contractReady: !!CREDENTIALS_ADDRESS,

    myTokenIds,
    myCredentials,
    isVerifiedIssuer,
    isAdmin,
    adminAddress,

    isPending,
    isConfirming,
    isConfirmed,
    txHash,

    refetchMyTokenIds,
    refetchCredentials,
    refetchAll,

    issueCredential,
    revokeCredential,
    setIssuer,
    transferAdmin,
    transferCredential,
  }
}

// ── per-token / per-address reads (for OrganizationsPage, any address) ─────
export function useCredential(tokenId) {
  const enabled = tokenId != null && !!CREDENTIALS_ADDRESS
  const { data: raw, ...rest } = useReadContract({
    address:      CREDENTIALS_ADDRESS,
    abi:          CREDENTIALS_ABI,
    functionName: 'credentials',
    args:         [tokenId],
    query:        { enabled },
  })
  return { ...rest, data: normalizeCredential(raw, tokenId) }
}

export function useCredentialsOf(recipientAddr) {
  return useReadContract({
    address:      CREDENTIALS_ADDRESS,
    abi:          CREDENTIALS_ABI,
    functionName: 'getCredentialsOf',
    args:         [recipientAddr],
    query:        { enabled: !!recipientAddr && !!CREDENTIALS_ADDRESS },
  })
}

export function useIsVerifiedIssuer(issuerAddr) {
  return useReadContract({
    address:      CREDENTIALS_ADDRESS,
    abi:          CREDENTIALS_ABI,
    functionName: 'verifiedIssuers',
    args:         [issuerAddr],
    query:        { enabled: !!issuerAddr && !!CREDENTIALS_ADDRESS },
  })
}

// ── every credential ever minted (for OrganizationsPage's issuer dashboard) ─
// There is no getCredentialsIssuedBy() on-chain — only getCredentialsOf()
// (recipient-side). tokenCount is a public counter (1..tokenCount are the
// only token ids that can ever exist), so the issuer-side view is rebuilt
// client-side by multicalling credentials(id) for every id and filtering by
// issuer === address, mirroring the batching pattern in useOwnerCircles.
// Fine for a small/demo-scale credential ledger; would want a subgraph or
// an on-chain index if this app ever needs to handle thousands of tokens.
export function useAllCredentials() {
  const { data: tokenCount, refetch: refetchCount } = useReadContract({
    address:      CREDENTIALS_ADDRESS,
    abi:          CREDENTIALS_ABI,
    functionName: 'tokenCount',
    query:        { enabled: !!CREDENTIALS_ADDRESS },
  })

  const count = Number(tokenCount || 0)
  const ids   = Array.from({ length: count }, (_, i) => BigInt(i + 1))

  const { data: results, refetch: refetchResults, isLoading } = useReadContracts({
    contracts: ids.map((id) => ({
      address:      CREDENTIALS_ADDRESS,
      abi:          CREDENTIALS_ABI,
      functionName: 'credentials',
      args:         [id],
    })),
    query: { enabled: !!CREDENTIALS_ADDRESS && count > 0 },
  })

  const all = (results || [])
    .map((r, i) => (r?.status === 'success' ? normalizeCredential(r.result, ids[i]) : null))
    .filter(Boolean)

  return {
    all,
    isLoading,
    refetch: () => { refetchCount(); refetchResults() },
  }
}
