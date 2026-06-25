// Standalone sanity check for src/lib/crypto.js — not a hardhat/mocha test
// (this file is plain client-side crypto, no contract involved), but worth
// verifying end-to-end since it's security-critical. Run with:
//   node test/verify-crypto.mjs
import assert from 'node:assert/strict'
import { Wallet, hexlify } from 'ethers'
import {
  generateContentKey, exportKeyRaw, importKeyRaw,
  encryptBlob, decryptBlob, encryptText, decryptText,
  deriveIdentityKeyPair, getIdentityPublicKey,
  wrapContentKeyForRecipient, unwrapContentKeyFromSender,
  IDENTITY_MESSAGE,
} from '../src/lib/crypto.js'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error(`FAILED: ${label}`)
  passed++
  console.log(`  ok - ${label}`)
}

async function main() {
  // ── 1. AES-256-GCM symmetric round trip ──────────────────────────────────
  console.log('Symmetric content encryption (AES-256-GCM)')
  const key = await generateContentKey()
  const plaintext = new TextEncoder().encode('a private memory capsule message')
  const encrypted = await encryptBlob(plaintext, key)
  check('ciphertext differs from plaintext', hexlify(encrypted).indexOf(hexlify(plaintext).slice(2)) === -1)
  const decrypted = await decryptBlob(encrypted, key)
  check('round-trip bytes match', Buffer.from(decrypted).equals(Buffer.from(plaintext)))

  const textRound = await decryptText(await encryptText('hello legacy', key), key)
  check('text round-trip matches', textRound === 'hello legacy')

  // raw export/import round trip (needed so a key can be wrapped for a beneficiary)
  const raw = await exportKeyRaw(key)
  check('exported raw key is 32 bytes', raw.length === 32)
  const reimported = await importKeyRaw(raw)
  const reDecrypted = await decryptBlob(encrypted, reimported)
  check('re-imported key decrypts the same ciphertext', Buffer.from(reDecrypted).equals(Buffer.from(plaintext)))

  // tampering should fail (GCM auth tag integrity)
  let tamperFailed = false
  const tampered = new Uint8Array(encrypted)
  tampered[tampered.length - 1] ^= 0xff
  try { await decryptBlob(tampered, key) } catch { tamperFailed = true }
  check('tampered ciphertext fails to decrypt', tamperFailed)

  // ── 2. Deterministic identity keypair derivation ─────────────────────────
  console.log('\nIdentity keypair derivation (deterministic from a wallet signature)')
  const aliceWallet = Wallet.createRandom()
  const sigA1 = await aliceWallet.signMessage(IDENTITY_MESSAGE)
  const sigA2 = await aliceWallet.signMessage(IDENTITY_MESSAGE)
  // ECDSA signatures over the same message+key are deterministic per RFC6979,
  // so signing twice should yield the same signature, and therefore the same
  // derived identity keypair both times.
  const idA1 = deriveIdentityKeyPair(sigA1)
  const idA2 = deriveIdentityKeyPair(sigA2)
  check('same wallet re-signing derives the identical private key', idA1.privateKey === idA2.privateKey)
  check('public key is 64 bytes', idA1.publicKey64.length === 64)
  check('getIdentityPublicKey recomputes the same public key', Buffer.from(getIdentityPublicKey(idA1.privateKey)).equals(Buffer.from(idA1.publicKey64)))

  const bobWallet = Wallet.createRandom()
  const sigB = await bobWallet.signMessage(IDENTITY_MESSAGE)
  const idB = deriveIdentityKeyPair(sigB)
  check('different wallets derive different identity keys', idA1.privateKey !== idB.privateKey)

  // ── 3. ECIES-style key wrapping between two identities ───────────────────
  console.log('\nECIES key wrapping (ECDH + AES-GCM)')
  const contentKey = await generateContentKey()
  const rawContentKey = await exportKeyRaw(contentKey)

  // Owner (Alice) wraps a content key for beneficiary Bob, using only Bob's
  // public identity key (as it would be read from DeadDropKeyRegistry).
  const wrapped = await wrapContentKeyForRecipient(rawContentKey, idB.publicKey64)
  check('wrapped payload has ephemeralPublicKey + payload fields', Boolean(wrapped.ephemeralPublicKey && wrapped.payload))

  // Bob unwraps using his own derived private key (re-signed locally, never stored)
  const unwrapped = await unwrapContentKeyFromSender(wrapped, idB.privateKey)
  check('Bob recovers the exact original content key', Buffer.from(unwrapped).equals(Buffer.from(rawContentKey)))

  // Alice (or anyone else) must NOT be able to unwrap Bob's payload
  let wrongRecipientFailed = false
  try {
    const recovered = await unwrapContentKeyFromSender(wrapped, idA1.privateKey)
    // Even if decryption doesn't throw (GCM should make this fail), the
    // recovered bytes must not match — either is an acceptable failure mode.
    wrongRecipientFailed = !Buffer.from(recovered).equals(Buffer.from(rawContentKey))
  } catch {
    wrongRecipientFailed = true
  }
  check('a different identity cannot unwrap the payload', wrongRecipientFailed)

  // The unwrapped key must actually still work to decrypt real content
  const reimportedContentKey = await importKeyRaw(unwrapped)
  const message = await decryptText(await encryptText('release the legacy capsule', contentKey), reimportedContentKey)
  check('unwrapped key decrypts content encrypted with the original key', message === 'release the legacy capsule')

  console.log(`\n${passed} checks passed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
