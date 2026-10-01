// Shared by the browser (src/lib/ipfs.js) and the server (api/pin-url.js), so
// keep this file free of Vite-only syntax (no `@/` imports, no import.meta.env).
//
// Before handing out an upload link the server wants proof that the caller
// controls a wallet. The wallet signs this message once; the signature is
// reused until it expires.

export const UPLOAD_AUTH_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

export function uploadAuthMessage(address, issuedAt) {
  return [
    'DeadDrop: allow encrypted uploads from this browser.',
    '',
    'This does not move funds or cost gas.',
    `Wallet: ${address.toLowerCase()}`,
    `Issued: ${issuedAt}`,
  ].join('\n')
}
