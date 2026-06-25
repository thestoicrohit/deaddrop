// ─────────────────────────────────────────────────────────────────────────────
// DeadDrop — client-side encryption
//
// Two layers, used together:
//
//  1. SYMMETRIC (content encryption) — every file/blob that leaves the
//     browser is AES-256-GCM encrypted with a random per-item key *before*
//     it's uploaded to IPFS (src/lib/ipfs.js). IPFS/Pinata only ever sees
//     ciphertext.
//
//  2. ASYMMETRIC (key sharing / ECIES) — to let a beneficiary decrypt a
//     legacy item only after release, the owner "wraps" (encrypts) that
//     item's symmetric key to the beneficiary's public *identity key*,
//     using ECDH + AES-GCM. The wrapped key can be stored publicly (on
//     IPFS or on-chain) — only the intended beneficiary can unwrap it.
//
// Identity keys are NOT the wallet's native secp256k1 key (browser wallets
// don't expose raw ECDH over the real private key). Instead they're
// deterministically derived from one wallet signature — see
// deriveIdentityKeyPair() below. Re-signing the same fixed message always
// reproduces the same keypair, so there is nothing to back up or lose.
// ─────────────────────────────────────────────────────────────────────────────

import { SigningKey, sha256, randomBytes, hexlify, getBytes } from 'ethers'

// ── constants ────────────────────────────────────────────────────────────────

export const IDENTITY_MESSAGE =
  'Sign this message to generate your DeadDrop encryption identity.\n\n' +
  'This signature never touches the blockchain and costs no gas. It is used ' +
  'only to deterministically derive a key that lets other DeadDrop users ' +
  'share encrypted content with you.\n\n' +
  'App: DeadDrop\nPurpose: identity-key-v1'

// A separate fixed message (distinct from IDENTITY_MESSAGE) used only to
// derive the Private Safe's symmetric master key — see deriveSafeKey() below.
// Keeping the two messages distinct means a signature captured for one
// purpose can never be replayed to derive the other key.
export const SAFE_MESSAGE =
  'Sign this message to unlock your DeadDrop Private Safe.\n\n' +
  'This signature never touches the blockchain and costs no gas. It is used ' +
  'only to deterministically derive the AES-256 key that encrypts everything ' +
  'in your private safe. Anyone who obtains this signature could decrypt ' +
  'your safe — never share it.\n\n' +
  'App: DeadDrop\nPurpose: safe-key-v1'

// A separate fixed message (distinct from IDENTITY_MESSAGE/SAFE_MESSAGE) used
// only to derive the Memory Capsules' symmetric master key — see
// deriveMemoryKey() below. Keeping every purpose's message distinct means a
// signature captured for one purpose can never be replayed to derive another.
export const MEMORY_MESSAGE =
  'Sign this message to unlock your DeadDrop Memory Capsules.\n\n' +
  'This signature never touches the blockchain and costs no gas. It is used ' +
  'only to deterministically derive the AES-256 key that encrypts the photos, ' +
  'letters, and voice notes inside your memory capsules. Anyone who obtains ' +
  'this signature could decrypt them — never share it.\n\n' +
  'App: DeadDrop\nPurpose: memory-key-v1'

const AES_ALGO    = { name: 'AES-GCM', length: 256 }
const IV_BYTES    = 12 // 96-bit IV, the AES-GCM recommended size

// ── symmetric content encryption (AES-256-GCM via Web Crypto) ───────────────

/** Generate a fresh random AES-256-GCM key for encrypting one item's content. */
export async function generateContentKey() {
  return crypto.subtle.generateKey(AES_ALGO, true, ['encrypt', 'decrypt'])
}

/** Export a CryptoKey to raw bytes (32 bytes) so it can be wrapped/stored. */
export async function exportKeyRaw(key) {
  const raw = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(raw)
}

/** Re-import raw key bytes (32 bytes) back into a usable CryptoKey. */
export async function importKeyRaw(rawBytes) {
  return crypto.subtle.importKey('raw', rawBytes, AES_ALGO, true, ['encrypt', 'decrypt'])
}

/**
 * Encrypt arbitrary bytes with an AES-GCM CryptoKey.
 * @returns {Promise<Uint8Array>} iv (12 bytes) concatenated with ciphertext —
 *          this combined blob is what you upload to IPFS as a single file.
 */
export async function encryptBlob(plaintextBytes, key) {
  const iv         = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBytes)
  const combined    = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return combined
}

/**
 * Decrypt a combined (iv + ciphertext) blob produced by encryptBlob().
 * @returns {Promise<Uint8Array>} the original plaintext bytes
 */
export async function decryptBlob(combinedBytes, key) {
  const bytes = combinedBytes instanceof Uint8Array ? combinedBytes : new Uint8Array(combinedBytes)
  const iv         = bytes.slice(0, IV_BYTES)
  const ciphertext = bytes.slice(IV_BYTES)
  const plaintext  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new Uint8Array(plaintext)
}

/** Convenience: encrypt a UTF-8 string, returning the combined blob. */
export async function encryptText(str, key) {
  return encryptBlob(new TextEncoder().encode(str), key)
}

/** Convenience: decrypt back to a UTF-8 string. */
export async function decryptText(combinedBytes, key) {
  const plaintext = await decryptBlob(combinedBytes, key)
  return new TextDecoder().decode(plaintext)
}

/**
 * Convenience: encrypt a UTF-8 string and return it as a 0x-prefixed hex
 * string — the right shape for an on-chain `string` field (e.g. DeadDropSafe
 * entry labels, which must be ciphertext per that contract's design).
 */
export async function encryptTextToHex(str, key) {
  return hexlify(await encryptText(str, key))
}

/** Convenience: decrypt a hex string produced by encryptTextToHex() back to UTF-8. */
export async function decryptHexToText(hex, key) {
  return decryptText(getBytes(hex), key)
}

// ── identity keypair (deterministic, derived from a wallet signature) ───────

/**
 * Derive a deterministic secp256k1 identity keypair from a wallet signature
 * of the fixed IDENTITY_MESSAGE. Call this any time you need the keypair —
 * it's cheap and always reproduces the same result for the same wallet.
 *
 * @param {string} signatureHex - result of having the connected wallet sign
 *        IDENTITY_MESSAGE (e.g. via wagmi's signMessageAsync or an ethers
 *        Signer's signMessage).
 * @returns {{ privateKey: string, publicKey64: Uint8Array }}
 *        privateKey is a 0x-prefixed 32-byte hex scalar (keep in memory only —
 *        never persist it; re-derive by re-signing instead).
 *        publicKey64 is the raw 64-byte uncompressed public key (no 0x04
 *        prefix) — this is what gets registered via DeadDropKeyRegistry.
 */
export function deriveIdentityKeyPair(signatureHex) {
  let seed = getBytes(sha256(signatureHex))

  // sha256 output is uniformly distributed over 256 bits, and secp256k1's
  // order n is astronomically close to 2^256, so a retry is essentially
  // never needed in practice — but guard against the invalid-scalar edge
  // case (zero, or >= n) by re-hashing deterministically until valid.
  for (let i = 0; i < 16; i++) {
    const candidate = hexlify(seed)
    try {
      const sk = new SigningKey(candidate)
      const uncompressed = getBytes(sk.publicKey) // 0x04 || X(32) || Y(32) = 65 bytes
      return { privateKey: candidate, publicKey64: uncompressed.slice(1) }
    } catch {
      seed = getBytes(sha256(seed))
    }
  }
  throw new Error('Failed to derive a valid identity keypair (this should never happen)')
}

/** Recompute just the 64-byte public key from a previously derived private key. */
export function getIdentityPublicKey(privateKeyHex) {
  const sk = new SigningKey(privateKeyHex)
  return getBytes(sk.publicKey).slice(1)
}

// ── safe key (deterministic AES-256-GCM key, derived from a wallet signature) ─

/**
 * Derive a deterministic AES-256-GCM CryptoKey from a wallet signature of
 * the fixed SAFE_MESSAGE. Unlike the identity keypair (which is asymmetric,
 * for sharing content with *other* people), the Private Safe only ever
 * needs to be read by its own owner — so a single symmetric key, re-derived
 * by re-signing SAFE_MESSAGE, is enough. Nothing is ever persisted; lose the
 * wallet, lose the safe (there is nothing else to back up).
 *
 * @param {string} signatureHex - result of having the connected wallet sign
 *        SAFE_MESSAGE.
 * @returns {Promise<CryptoKey>} usable directly with encryptBlob/decryptBlob.
 */
export async function deriveSafeKey(signatureHex) {
  const keyMaterial = getBytes(sha256(signatureHex)) // 32 bytes
  return crypto.subtle.importKey('raw', keyMaterial, AES_ALGO, true, ['encrypt', 'decrypt'])
}

// ── memory key (deterministic AES-256-GCM key, derived from a wallet signature) ─

/**
 * Derive a deterministic AES-256-GCM CryptoKey from a wallet signature of
 * the fixed MEMORY_MESSAGE. Mirrors deriveSafeKey() exactly — Memory Capsule
 * content (photos/letters/voice notes) is always owner-only, never shared
 * with other wallets, so one re-derivable symmetric key is enough. A capsule
 * being tagged "Shared" only shares its cleartext title/preview/circle link
 * (see DeadDropCapsules.sol) — the actual content stays encrypted to the
 * owner alone.
 *
 * @param {string} signatureHex - result of having the connected wallet sign
 *        MEMORY_MESSAGE.
 * @returns {Promise<CryptoKey>} usable directly with encryptBlob/decryptBlob.
 */
export async function deriveMemoryKey(signatureHex) {
  const keyMaterial = getBytes(sha256(signatureHex)) // 32 bytes
  return crypto.subtle.importKey('raw', keyMaterial, AES_ALGO, true, ['encrypt', 'decrypt'])
}

// ── ECIES-style key wrapping (ECDH + AES-GCM) ────────────────────────────────

async function deriveAesKeyFromSharedSecret(sharedSecretHex) {
  const keyMaterial = getBytes(sha256(sharedSecretHex)) // 32 bytes
  return crypto.subtle.importKey('raw', keyMaterial, AES_ALGO, false, ['encrypt', 'decrypt'])
}

/**
 * Encrypt (wrap) a raw content key so only the holder of
 * `recipientPublicKey64` can recover it.
 *
 * @param {Uint8Array} rawContentKeyBytes - exportKeyRaw() output (32 bytes)
 * @param {Uint8Array} recipientPublicKey64 - recipient's identity public key,
 *        as stored in DeadDropKeyRegistry (64 bytes, no 0x04 prefix)
 * @returns {{ ephemeralPublicKey: string, payload: string }}
 *        Both are 0x-prefixed hex strings, safe to store in IPFS metadata or
 *        on-chain. `ephemeralPublicKey` is 64 bytes (no prefix); `payload` is
 *        iv + ciphertext, mirroring encryptBlob()'s combined format.
 */
export async function wrapContentKeyForRecipient(rawContentKeyBytes, recipientPublicKey64) {
  // A fresh, one-time keypair — never reused, never tied to any wallet.
  const ephemeralPrivate = hexlify(randomBytes(32))
  const ephemeralSK      = new SigningKey(ephemeralPrivate)

  const recipientPubKeyFull = '0x04' + hexlify(recipientPublicKey64).slice(2)
  const sharedSecret         = ephemeralSK.computeSharedSecret(recipientPubKeyFull)
  const aesKey                = await deriveAesKeyFromSharedSecret(sharedSecret)

  const payload = await encryptBlob(rawContentKeyBytes, aesKey)

  return {
    ephemeralPublicKey: hexlify(getBytes(ephemeralSK.publicKey).slice(1)),
    payload: hexlify(payload),
  }
}

/**
 * Decrypt (unwrap) a content key that was wrapped with
 * wrapContentKeyForRecipient(), using the recipient's own identity private
 * key (re-derived locally via deriveIdentityKeyPair()).
 *
 * @returns {Promise<Uint8Array>} the original raw content key (32 bytes)
 */
export async function unwrapContentKeyFromSender({ ephemeralPublicKey, payload }, myPrivateKeyHex) {
  const mySK = new SigningKey(myPrivateKeyHex)

  const ephemeralPubKeyFull = '0x04' + hexlify(ephemeralPublicKey).slice(2)
  const sharedSecret         = mySK.computeSharedSecret(ephemeralPubKeyFull)
  const aesKey                 = await deriveAesKeyFromSharedSecret(sharedSecret)

  return decryptBlob(getBytes(payload), aesKey)
}
