// Vercel serverless function — production counterpart of the dev-only
// scripts/leadsPlugin.mjs. Forwards email signups to a Google Sheet via a
// Google Apps Script web app (see scripts/google-sheets-leads.gs for setup).
//
// Env vars (set in Vercel → Project → Settings → Environment Variables).
// Deliberately NOT prefixed with VITE_, so they never reach the browser:
//   LEADS_WEBHOOK_URL     the Apps Script "Web app" URL
//   LEADS_WEBHOOK_SECRET  any random string; must match SECRET in the script
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clip = (v, n) => String(v || '').trim().slice(0, n)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body   = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {})
  const email  = clip(body.email, 254).toLowerCase()
  const name   = clip(body.name, 80)
  const source = clip(body.source || 'landing', 40)
  const page   = clip(body.page, 120)

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' })
  }

  const url = process.env.LEADS_WEBHOOK_URL
  if (!url) {
    return res.status(503).json({ ok: false, error: 'Signup storage is not configured.' })
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.LEADS_WEBHOOK_SECRET || '',
        timestamp: new Date().toISOString(),
        email, name, source, page,
      }),
      redirect: 'follow',
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || !data.ok) throw new Error(data.error || `Webhook responded ${r.status}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[leads] forward failed:', err.message)
    return res.status(502).json({ ok: false, error: 'Could not save your email. Please try again.' })
  }
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return {} }
}
