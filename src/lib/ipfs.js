// ─────────────────────────────────────────────────────────────────────────────
// DeadDrop — IPFS storage via Pinata
//
// Every file/blob that goes through this module should already be
// AES-256-GCM ciphertext (see src/lib/crypto.js) — Pinata is a *public*
// pinning service, so plaintext must never be uploaded directly.
//
// The Pinata key stays on the server. To upload, the browser:
//   1. proves it controls a wallet by signing uploadAuthMessage() once
//      (cached for a few hours, so it's one wallet prompt per session),
//   2. asks /api/pin-url (api/pin-url.js) for a one-minute upload URL,
//   3. sends the encrypted file straight to Pinata with that URL.
// ─────────────────────────────────────────────────────────────────────────────
import { getAccount, signMessage } from 'wagmi/actions'
import { wagmiConfig } from '@/lib/wagmi'
import { uploadAuthMessage, UPLOAD_AUTH_TTL_MS } from '@/lib/uploadAuthMessage'

const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

// Matches the server-side cap in api/pin-url.js.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB
const AUTH_KEY = 'deaddrop-upload-auth'

function byteLengthOf(data) {
  if (data instanceof Blob)        return data.size
  if (data instanceof ArrayBuffer) return data.byteLength
  if (ArrayBuffer.isView(data))    return data.byteLength
  return null // unknown — skip the check rather than guess
}

export class IPFSNotConfiguredError extends Error {
  constructor() {
    super("File storage isn't set up on this site yet.")
    this.name = 'IPFSNotConfiguredError'
  }
}

// The server decides; a missing PINATA_JWT surfaces as IPFSNotConfiguredError
// on the first upload attempt.
export function isIPFSConfigured() {
  return true
}

function readCachedAuth(address) {
  try {
    const a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null')
    const fresh = a && Date.now() - Date.parse(a.issuedAt) < UPLOAD_AUTH_TTL_MS - 10 * 60 * 1000
    return fresh && a.address === address.toLowerCase() ? a : null
  } catch { return null }
}

async function uploadAuth({ force = false } = {}) {
  const { address } = getAccount(wagmiConfig)
  if (!address) throw new Error('Connect a wallet to upload.')
  if (!force) {
    const cached = readCachedAuth(address)
    if (cached) return cached
  }
  const issuedAt = new Date().toISOString()
  const signature = await signMessage(wagmiConfig, { message: uploadAuthMessage(address, issuedAt) })
  const auth = { address: address.toLowerCase(), issuedAt, signature }
  try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth)) } catch { /* private mode */ }
  return auth
}

async function requestUploadUrl() {
  for (const force of [false, true]) {
    const auth = await uploadAuth({ force })
    const res = await fetch('/api/pin-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auth),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.url) return data.url
    if (data.code === 'not_configured') throw new IPFSNotConfiguredError()
    // A stale or rejected signature gets one fresh attempt.
    if (!force && (data.code === 'auth_expired' || data.code === 'auth_invalid')) {
      try { sessionStorage.removeItem(AUTH_KEY) } catch { /* ignore */ }
      continue
    }
    throw new Error(data.error || `Upload could not start (${res.status}).`)
  }
}

/**
 * Upload raw bytes (already-encrypted) to IPFS via Pinata.
 * @param {Blob|Uint8Array|ArrayBuffer} data
 * @param {string} filename - non-sensitive label only (e.g. "capsule-photo.enc")
 * @returns {Promise<string>} the IPFS CID
 */
export async function uploadBlob(data, filename = 'deaddrop-blob.enc') {
  const size = byteLengthOf(data)
  if (size !== null && size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is too large to upload (${(size / 1024 / 1024).toFixed(1)} MB). ` +
      `Maximum is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
    )
  }

  const url = await requestUploadUrl()
  const blob = data instanceof Blob ? data : new Blob([data])
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('network', 'public')
  form.append('name', filename)

  const res = await fetch(url, { method: 'POST', body: form })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.data?.cid) {
    throw new Error(`Upload failed (${res.status}): ${json.error?.message || json.error || res.statusText}`)
  }
  return json.data.cid
}

/**
 * Upload a JSON-serializable object to IPFS via Pinata.
 * Useful for capsule/credential metadata. If the object may contain
 * sensitive fields, encrypt them client-side first — this just pins
 * whatever JSON you give it.
 * @param {object} obj
 * @param {string} name - metadata label
 * @returns {Promise<string>} the IPFS CID
 */
export async function uploadJSON(obj, name = 'deaddrop-metadata.json') {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' })
  return uploadBlob(blob, name)
}

/** Returns a fetchable gateway URL for a given CID. */
export function getGatewayUrl(cid) {
  return `${PINATA_GATEWAY}/${cid}`
}

/**
 * Fetch raw bytes for a CID (e.g. to hand off to decryptBlob in crypto.js).
 * @param {string} cid
 * @returns {Promise<Blob>}
 */
export async function fetchBlob(cid) {
  const res = await fetch(getGatewayUrl(cid))
  if (!res.ok) throw new Error(`Failed to fetch ${cid} from IPFS gateway (${res.status})`)
  return res.blob()
}

/**
 * Fetch and parse a JSON object previously pinned with uploadJSON.
 * @param {string} cid
 * @returns {Promise<object>}
 */
export async function fetchJSON(cid) {
  const res = await fetch(getGatewayUrl(cid))
  if (!res.ok) throw new Error(`Failed to fetch ${cid} from IPFS gateway (${res.status})`)
  return res.json()
}
