// ─────────────────────────────────────────────────────────────────────────────
// DeadDrop — IPFS storage via Pinata
//
// Every file/blob that goes through this module should already be
// AES-256-GCM ciphertext (see src/lib/crypto.js) — Pinata is a *public*
// pinning service, so plaintext must never be uploaded directly.
//
// ⚠️ SECURITY — the Pinata JWT ships to the browser.
//   Vite inlines every `VITE_*` variable into the client bundle, so whatever
//   key you put in VITE_PINATA_JWT is extractable from the deployed JavaScript
//   by anyone. Therefore:
//     • Create a key SCOPED to only `pinFileToIPFS` + `pinJSONToIPFS`
//       (Pinata dashboard → API Keys → New Key → uncheck Admin, enable just
//       those two endpoints). NEVER use an Admin-scope key here — an Admin key
//       would let anyone who reads the bundle list, unpin, and delete all of
//       your pinned content.
//     • For production, prefer routing uploads through a small backend proxy
//       that holds the secret server-side, or use short-lived signed JWTs, so
//       no long-lived credential ever reaches the client at all.
//   Until VITE_PINATA_JWT is set, every function here throws
//   IPFSNotConfiguredError so calling code can show a clear message instead of
//   a confusing network failure.
// ─────────────────────────────────────────────────────────────────────────────

const PINATA_JWT     = import.meta.env.VITE_PINATA_JWT || ''
const PINATA_GATEWAY  = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'
const PINATA_API_BASE = 'https://api.pinata.cloud'

// Reject oversized uploads client-side. A scoped key can still be abused to
// burn the account's storage quota, so cap individual blobs (encrypted content
// for this app is small — letters, photos, short voice notes). Tune as needed.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

function byteLengthOf(data) {
  if (data instanceof Blob)        return data.size
  if (data instanceof ArrayBuffer) return data.byteLength
  if (ArrayBuffer.isView(data))    return data.byteLength
  return null // unknown — skip the check rather than guess
}

export class IPFSNotConfiguredError extends Error {
  constructor() {
    super('IPFS storage is not configured yet. Add VITE_PINATA_JWT to your .env file (get a free key at https://pinata.cloud) and restart the dev server.')
    this.name = 'IPFSNotConfiguredError'
  }
}

export function isIPFSConfigured() {
  return Boolean(PINATA_JWT)
}

function requireConfigured() {
  if (!isIPFSConfigured()) throw new IPFSNotConfiguredError()
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${PINATA_JWT}`, ...extra }
}

/**
 * Upload raw bytes (already-encrypted) to IPFS via Pinata.
 * @param {Blob|Uint8Array|ArrayBuffer} data
 * @param {string} filename - non-sensitive label only (e.g. "capsule-photo.enc")
 * @returns {Promise<string>} the IPFS CID
 */
export async function uploadBlob(data, filename = 'deaddrop-blob.enc') {
  requireConfigured()

  const size = byteLengthOf(data)
  if (size !== null && size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is too large to upload (${(size / 1024 / 1024).toFixed(1)} MB). ` +
      `Maximum is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
    )
  }

  const blob = data instanceof Blob ? data : new Blob([data])
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('pinataMetadata', JSON.stringify({ name: filename }))
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  const res = await fetch(`${PINATA_API_BASE}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Pinata upload failed (${res.status}): ${text || res.statusText}`)
  }

  const { IpfsHash } = await res.json()
  return IpfsHash
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
  requireConfigured()

  const res = await fetch(`${PINATA_API_BASE}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      pinataContent: obj,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Pinata JSON upload failed (${res.status}): ${text || res.statusText}`)
  }

  const { IpfsHash } = await res.json()
  return IpfsHash
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
