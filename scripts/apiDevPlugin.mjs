import { loadEnv } from 'vite'

// Dev-only: serves the Vercel functions in /api (currently just pin-url) from
// `npm run dev`, with a tiny req/res shim, so uploads work locally too.
// Server-side secrets come from .env (e.g. PINATA_JWT, no VITE_ prefix).
export default function apiDevPlugin() {
  return {
    name: 'deaddrop-api-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))
      server.middlewares.use('/api/pin-url', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/pin-url.js')
        let raw = ''
        for await (const chunk of req) raw += chunk
        req.body = raw ? JSON.parse(raw) : {}
        const shim = {
          status(code) { res.statusCode = code; return shim },
          setHeader: (k, v) => res.setHeader(k, v),
          json(obj) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) },
        }
        try { await handler(req, shim) } catch (err) { shim.status(500).json({ ok: false, error: err.message }) }
      })
    },
  }
}
