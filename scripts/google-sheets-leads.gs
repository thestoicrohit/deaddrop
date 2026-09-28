/**
 * DeadDrop — email signups → Google Sheet
 *
 * One-time setup (about 3 minutes):
 *  1. Create a new Google Sheet (e.g. "DeadDrop Leads").
 *  2. Extensions → Apps Script. Delete the sample code, paste this whole file.
 *  3. Change SECRET below to any long random string. Save.
 *  4. Deploy → New deployment → type "Web app".
 *       Execute as:     Me
 *       Who has access: Anyone
 *     Click Deploy, authorize, and copy the "Web app URL".
 *  5. In Vercel → your project → Settings → Environment Variables, add:
 *       LEADS_WEBHOOK_URL    = the Web app URL from step 4
 *       LEADS_WEBHOOK_SECRET = the same SECRET string from step 3
 *     Then redeploy (Deployments → ⋯ → Redeploy).
 *
 * If you ever edit this script, use Deploy → Manage deployments → Edit →
 * Version: New version, so the URL stays the same.
 */
const SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING'
const HEADER = ['timestamp', 'email', 'name', 'source', 'page']

function doPost(e) {
  let body = {}
  try { body = JSON.parse(e.postData.contents) } catch (err) { return json({ ok: false, error: 'bad json' }) }
  if (body.secret !== SECRET) return json({ ok: false, error: 'unauthorized' })

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADER)
    // Prefix a quote on values starting with = + - @ so they can't run as formulas.
    sheet.appendRow(HEADER.map((k) => safeCell(body[k])))
  } finally {
    lock.releaseLock()
  }
  return json({ ok: true })
}

function safeCell(v) {
  const s = String(v == null ? '' : v)
  return /^[=+\-@]/.test(s) ? "'" + s : s
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
