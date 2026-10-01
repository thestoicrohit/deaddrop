// Vercel serverless function — hands the browser a short-lived Pinata upload
// URL, so the Pinata JWT stays on the server instead of shipping in the JS
// bundle. The browser then uploads its (already-encrypted) file straight to
// Pinata with that URL; the file never passes through this function.
//
// Env vars (Vercel → Project → Settings → Environment Variables; no VITE_
// prefix, so they never reach the browser):
//   PINATA_JWT   a Pinata API key JWT (Files: Write is enough)
//
// Callers must prove they control a wallet by signing uploadAuthMessage().
import { verifyMessage, isAddress } from 'viem'
import { uploadAuthMessage, UPLOAD_AUTH_TTL_MS } from '../src/lib/uploadAuthMessage.js'

const MAX_FILE_BYTES = 25 * 1024 * 1024 // matches the client-side cap in src/lib/ipfs.js
const URL_TTL_SECONDS = 60

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const jwt = process.env.PINATA_JWT
  if (!jwt) {
    return res.status(503).json({ ok: false, code: 'not_configured', error: 'File storage is not set up yet.' })
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {})
  const { address, issuedAt, signature } = body
  if (!isAddress(address || '') || typeof issuedAt !== 'string' || typeof signature !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing wallet authorization.' })
  }

  const issued = Date.parse(issuedAt)
  const age = Date.now() - issued
  if (!Number.isFinite(issued) || age > UPLOAD_AUTH_TTL_MS || age < -5 * 60 * 1000) {
    return res.status(401).json({ ok: false, code: 'auth_expired', error: 'Upload authorization expired — please sign again.' })
  }

  let valid = false
  try {
    valid = await verifyMessage({ address, message: uploadAuthMessage(address, issuedAt), signature })
  } catch { /* malformed signature */ }
  if (!valid) {
    return res.status(401).json({ ok: false, code: 'auth_invalid', error: 'Wallet signature did not verify.' })
  }

  try {
    const r = await fetch('https://uploads.pinata.cloud/v3/files/sign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: 'public',
        date: Math.floor(Date.now() / 1000),
        expires: URL_TTL_SECONDS,
        max_file_size: MAX_FILE_BYTES,
        keyvalues: { uploader: address.toLowerCase() },
      }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || typeof data.data !== 'string') throw new Error(`Pinata responded ${r.status}`)
    return res.status(200).json({ ok: true, url: data.data })
  } catch (err) {
    console.error('[pin-url] signing failed:', err.message)
    return res.status(502).json({ ok: false, error: 'Could not prepare the upload. Please try again.' })
  }
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return {} }
}
