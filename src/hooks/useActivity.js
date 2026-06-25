// ─────────────────────────────────────────────────────────────────────────────
// useActivity — unified on-chain activity feed across all six DeadDrop
// contracts. Replaces the old localStorage `profileTimeline` mock domain.
//
// Historical events are fetched once per contract via viem's
// getContractEvents(), then the feed stays live via six static
// useWatchContractEvent() calls (one per contract; Rules of Hooks requires a
// fixed call count, so each is gated with `enabled` rather than being called
// conditionally/in a loop).
//
// Set VITE_DEPLOY_BLOCK in your .env after deploying to skip scanning from
// the genesis block — much faster on a real network than fromBlock: 0n.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { usePublicClient, useWatchContractEvent } from 'wagmi'

import { VAULT_ADDRESS,        VAULT_ABI }        from '@/lib/contracts/vault'
import { KEY_REGISTRY_ADDRESS, KEY_REGISTRY_ABI } from '@/lib/contracts/keyRegistry'
import { CIRCLES_ADDRESS,      CIRCLES_ABI }      from '@/lib/contracts/circles'
import { CAPSULES_ADDRESS,     CAPSULES_ABI }     from '@/lib/contracts/capsules'
import { SAFE_ADDRESS,         SAFE_ABI }         from '@/lib/contracts/safe'
import { CREDENTIALS_ADDRESS,  CREDENTIALS_ABI }  from '@/lib/contracts/credentials'

const DOMAIN_LIST = [
  { key: 'vault',       label: 'Vault',        address: VAULT_ADDRESS,        abi: VAULT_ABI },
  { key: 'keyRegistry', label: 'Key Registry', address: KEY_REGISTRY_ADDRESS, abi: KEY_REGISTRY_ABI },
  { key: 'circles',     label: 'Circles',      address: CIRCLES_ADDRESS,      abi: CIRCLES_ABI },
  { key: 'capsules',    label: 'Capsules',     address: CAPSULES_ADDRESS,     abi: CAPSULES_ABI },
  { key: 'safe',        label: 'Safe',         address: SAFE_ADDRESS,         abi: SAFE_ABI },
  { key: 'credentials', label: 'Credentials',  address: CREDENTIALS_ADDRESS,  abi: CREDENTIALS_ABI },
]

const DEPLOYED_DOMAINS = DOMAIN_LIST.filter((d) => !!d.address)

const DEPLOY_FROM_BLOCK = (() => {
  const raw = import.meta.env.VITE_DEPLOY_BLOCK
  try { return raw ? BigInt(raw) : 0n } catch { return 0n }
})()

function logToItem(domain, log) {
  return {
    id:              `${domain.key}-${log.transactionHash}-${log.logIndex}`,
    domain:          domain.key,
    domainLabel:     domain.label,
    eventName:       log.eventName,
    args:            log.args,
    blockNumber:     log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex:        log.logIndex,
    timestamp:       null, // filled in by attachTimestamps()
  }
}

function sortFeed(items) {
  return [...items].sort((a, b) => {
    const blockDiff = (b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)
    if (blockDiff !== 0n) return blockDiff > 0n ? 1 : -1
    return (b.logIndex ?? 0) - (a.logIndex ?? 0)
  })
}

// Batch-fetch block timestamps for a set of logs, deduped by block number.
async function attachTimestamps(publicClient, items) {
  if (!publicClient || items.length === 0) return items
  const uniqueBlocks = [...new Set(items.map((i) => i.blockNumber).filter((b) => b != null))]
  const blocks = await Promise.all(
    uniqueBlocks.map((bn) => publicClient.getBlock({ blockNumber: bn }).catch(() => null))
  )
  const tsByBlock = new Map(uniqueBlocks.map((bn, i) => [bn, blocks[i]?.timestamp ?? null]))
  return items.map((i) => ({ ...i, timestamp: tsByBlock.get(i.blockNumber) ?? null }))
}

export function useActivity() {
  const publicClient = usePublicClient()
  const [items, setItems]       = useState([])
  const [isLoading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    if (!publicClient || DEPLOYED_DOMAINS.length === 0) { setLoading(false); return }
    setLoading(true)
    try {
      const perDomain = await Promise.all(
        DEPLOYED_DOMAINS.map((domain) =>
          publicClient
            .getContractEvents({ address: domain.address, abi: domain.abi, fromBlock: DEPLOY_FROM_BLOCK, toBlock: 'latest' })
            .then((logs) => logs.map((log) => logToItem(domain, log)))
            .catch((err) => {
              console.error(`useActivity: failed to fetch ${domain.label} events`, err)
              return []
            })
        )
      )
      const merged = await attachTimestamps(publicClient, perDomain.flat())
      setItems(sortFeed(merged))
    } finally {
      setLoading(false)
    }
  }, [publicClient])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  function prependLogs(domain, logs) {
    const fresh = logs.map((log) => logToItem(domain, log))
    attachTimestamps(publicClient, fresh).then((withTs) => {
      setItems((prev) => sortFeed([...withTs, ...prev.filter((p) => !withTs.some((f) => f.id === p.id))]))
    })
  }

  // Six static call sites — one watcher per contract, gated by `enabled`
  // rather than by conditionally calling the hook (which Rules of Hooks
  // forbids). onLogs receives only NEW logs going forward.
  useWatchContractEvent({ address: VAULT_ADDRESS,        abi: VAULT_ABI,        enabled: !!VAULT_ADDRESS,        onLogs: (logs) => prependLogs(DOMAIN_LIST[0], logs) })
  useWatchContractEvent({ address: KEY_REGISTRY_ADDRESS, abi: KEY_REGISTRY_ABI, enabled: !!KEY_REGISTRY_ADDRESS, onLogs: (logs) => prependLogs(DOMAIN_LIST[1], logs) })
  useWatchContractEvent({ address: CIRCLES_ADDRESS,      abi: CIRCLES_ABI,      enabled: !!CIRCLES_ADDRESS,      onLogs: (logs) => prependLogs(DOMAIN_LIST[2], logs) })
  useWatchContractEvent({ address: CAPSULES_ADDRESS,     abi: CAPSULES_ABI,     enabled: !!CAPSULES_ADDRESS,     onLogs: (logs) => prependLogs(DOMAIN_LIST[3], logs) })
  useWatchContractEvent({ address: SAFE_ADDRESS,         abi: SAFE_ABI,         enabled: !!SAFE_ADDRESS,         onLogs: (logs) => prependLogs(DOMAIN_LIST[4], logs) })
  useWatchContractEvent({ address: CREDENTIALS_ADDRESS,  abi: CREDENTIALS_ABI,  enabled: !!CREDENTIALS_ADDRESS,  onLogs: (logs) => prependLogs(DOMAIN_LIST[5], logs) })

  return {
    activity:      items,
    isLoading,
    refetch:       fetchHistory,
    domainsReady:  DEPLOYED_DOMAINS.map((d) => d.key),
  }
}

// ── human-readable one-liners for the Activity page ─────────────────────────
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function describeActivity(item) {
  const a = item.args || {}
  switch (`${item.domain}:${item.eventName}`) {
    case 'vault:VaultCreated':         return 'Vault created.'
    case 'vault:PingRecorded':         return 'Owner pinged — still active.'
    case 'vault:GracePeriodStarted':   return 'Grace period started.'
    case 'vault:GracePeriodCancelled': return 'Grace period cancelled — owner is back.'
    case 'vault:LegacyReleased':       return 'Legacy released to beneficiaries.'
    case 'vault:ETHDeposited':         return 'ETH deposited into the vault.'
    case 'vault:BeneficiariesSet':     return 'Beneficiaries updated.'
    case 'vault:SettingsUpdated':      return 'Vault settings updated.'
    case 'vault:MultiSigConfirmed':    return 'Multi-sig claim confirmation recorded.'

    case 'keyRegistry:PublicKeyRegistered': return 'Encryption identity key registered.'

    case 'circles:CircleCreated': return `Circle "${a.name}" created.`
    case 'circles:CircleUpdated': return 'Circle details updated.'
    case 'circles:MemberAdded':   return `${a.name || 'A member'} joined the circle.`
    case 'circles:MemberRemoved': return 'A member was removed from the circle.'
    case 'circles:FileUploaded':  return `File "${a.name}" uploaded to circle.`
    case 'circles:FileRemoved':   return 'A file was removed from the circle.'

    case 'capsules:CapsuleCreated': return `Capsule "${a.title}" created.`
    case 'capsules:ContentAdded':   return 'Content added to a memory capsule.'
    case 'capsules:ContentRemoved': return 'Content removed from a memory capsule.'
    case 'capsules:Reacted':        return a.on ? 'Someone reacted to a capsule.' : 'A reaction was removed.'

    case 'safe:SafeEntryAdded':   return 'A new entry was added to a private safe.'
    case 'safe:SafeEntryUpdated': return 'A safe entry was updated.'
    case 'safe:SafeEntryRemoved': return 'A safe entry was removed.'

    case 'credentials:CredentialIssued':    return `Credential "${a.credentialType}" issued.`
    case 'credentials:CredentialRevoked':   return 'A credential was revoked.'
    case 'credentials:IssuerStatusChanged': return a.verified ? 'Issuer verified.' : 'Issuer revoked.'
    case 'credentials:Transfer':            return a.from === ZERO_ADDRESS ? 'Credential minted.' : 'Credential transferred.'

    default: return `${item.domainLabel}: ${item.eventName}`
  }
}
