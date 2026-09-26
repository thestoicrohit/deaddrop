import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'

// Dev-only Vite middleware that appends email signups to a local .xlsx file.
// Only wired up under `vite` (npm run dev) — there is no server process once
// this app is built/deployed (e.g. to Vercel), so this never runs in
// production. See data/leads.xlsx for the captured rows.
const DATA_DIR   = path.resolve(process.cwd(), 'data')
const LEADS_FILE = path.join(DATA_DIR, 'leads.xlsx')
const SHEET_NAME = 'Leads'
const HEADER     = ['timestamp', 'email', 'name', 'source', 'page']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readRows() {
  if (!fs.existsSync(LEADS_FILE)) return []
  const wb = XLSX.readFile(LEADS_FILE)
  const ws = wb.Sheets[SHEET_NAME]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { header: HEADER, range: 1 })
}

function writeRows(rows) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADER })
  ws['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME)
  XLSX.writeFile(wb, LEADS_FILE)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

export default function leadsPlugin() {
  return {
    name: 'deaddrop-leads-plugin',
    configureServer(server) {
      server.middlewares.use('/api/leads', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
          return
        }

        try {
          const body  = await readJsonBody(req)
          const email = String(body.email || '').trim().toLowerCase()
          const name  = String(body.name || '').trim()
          const source = String(body.source || 'landing').trim()
          const page   = String(body.page || '').trim()

          if (!EMAIL_RE.test(email)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Please enter a valid email address.' }))
            return
          }

          const rows = readRows()
          rows.push({ timestamp: new Date().toISOString(), email, name, source, page })
          writeRows(rows)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Could not save your email. Please try again.' }))
        }
      })
    },
  }
}
