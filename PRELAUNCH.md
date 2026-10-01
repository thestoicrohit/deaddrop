# DeadDrop — Pre-Launch Checklist

Status as of this pass: **not ready for a public launch with real user funds or
real user data.** Treat this as a beta running entirely on Sepolia testnet
until every item below is either done or explicitly accepted as a known
limitation.

---

## 1. Testnet first

**Status: OK.** `hardhat.config.cjs` only defines `hardhat`, `localhost`, and
`sepolia` networks — there is no mainnet target configured, so a mainnet
deploy can't happen by accident. Keep it that way until an independent
review has happened. When you do eventually consider mainnet, do it on a
low-value L2 first (e.g. Base or Polygon PoS), not Ethereum mainnet directly.

## 2. Smart contract security

**Status: partially done.**

- ✅ 106 Hardhat tests pass (`npx hardhat test`), covering the vault state
  machine, multi-sig epoch invalidation, grace-period guards, pull-payment
  withdrawal, and Chainlink `checkUpkeep`/`performUpkeep` edge cases
  (double-trigger, index windows, index clamping).
- ✅ Reentrancy: every function that moves ETH out of `DeadDropVault`
  (`withdrawDeposit`, `claimLegacy`, `withdraw`) is `nonReentrant` and follows
  the pull-payment pattern (credit a mapping, let the recipient pull it in a
  separate call) — checked in this pass.
- ✅ Fixed in this pass: `DeadDropCredentials.safeTransferFrom(address,address,uint256)`
  (the 3-argument convenience overload) called `this.safeTransferFrom(...)`
  internally, which makes a *new* external call whose `msg.sender` becomes the
  contract's own address — so the authorization check inside `transferFrom`
  would reject every legitimate caller. Fixed by making the 4-arg function
  `public` and calling it directly instead of through `this.`.
- ⚠️ Noted, not fixed: `DeadDropCapsules.deleteCapsule()` flips `exists =
  false` but never removes the id from `ownerCapsules[msg.sender]`, so
  `getMyCapsules()` keeps returning deleted ids forever (the frontend already
  filters on `.exists`, so this isn't user-visible, but it's unbounded storage
  growth worth cleaning up before scale).
- ❌ **Not run: Slither.** This environment has no Python/pip, so static
  analysis couldn't be run here. Before launch, run it somewhere that does:
  ```bash
  pip install slither-analyzer
  slither contracts/ --solc-remaps @openzeppelin=node_modules/@openzeppelin
  ```
  and address anything it flags above "informational" severity.
- ❌ **No independent audit.** Given real funds and real personal data are
  the whole point of this product, get at least one outside review (even an
  informal one from another Solidity dev) before mainnet — self-review misses
  things by definition.

## 3. Client-side encryption

**Status: OK, verified in this pass.**

- `src/lib/crypto.js` has zero network calls — everything (AES-256-GCM
  encrypt/decrypt, key derivation from a wallet signature) happens in the
  browser.
- `src/lib/ipfs.js` only ever uploads/fetches opaque encrypted blobs; it never
  sees plaintext.
- Nothing server-side ever touches a decryption key — keys are derived
  per-session from a `personal_sign` signature and held only in React state
  (lost on refresh, by design).
- ✅ Fixed: the Pinata key is now server-side only (`PINATA_JWT`, read by
  `api/pin-url.js`). The browser proves wallet control with a signed message
  (cached ~12 h), gets a 60-second, 25 MB-capped upload URL, and uploads the
  encrypted file straight to Pinata. Remaining risk: anyone with *a* wallet
  can still spend upload quota — add per-wallet rate limits if that bites.

## 4. IPFS persistence

**Status: needs a decision before launch.** Right now content is pinned to
whatever Pinata account owns `PINATA_JWT`. Before calling this
production-ready:

- Decide who pays for and owns the pin long-term — a personal Pinata free
  tier will not survive at any real scale, and if that account lapses,
  **every user's encrypted data becomes unreachable** (not deleted, just
  unfetchable — the CID still exists on the IPFS network in theory, but
  nothing keeps it pinned).
- Document this trade-off for users plainly: "if DeadDrop the company/project
  disappears, your data survives on-chain as a CID, but only stays
  *retrievable* as long as someone is paying to pin it." This directly
  contradicts the "outlives the company" pitch on the landing page unless you
  either use a redundant multi-pinner setup (Pinata + web3.storage/Filecoin)
  or tell users to pin their own critical CIDs as a backup.
- Content on IPFS/Pinata **cannot be truly deleted** once pinned and
  propagated — "soft delete" in the UI only stops your app from showing it;
  the ciphertext blob may still be fetchable by CID by anyone who has it.
  Since it's encrypted, this is a much smaller problem than plaintext would
  be, but say so in the privacy policy rather than implying deletion is real
  deletion.

## 5. Key loss and recovery

**Status: not built — biggest gap for real users.**

- There is currently no recovery path. If a user loses their wallet's seed
  phrase, their vault, safe entries, and capsules become permanently
  unreadable — the contracts have no owner-reset or social-recovery
  mechanism.
- Before launch, at minimum: put a clear, hard-to-miss warning on every
  screen that writes an encrypted entry (Safe, Legacy final message, Memory
  capsules) saying **"There is no password reset. If you lose this wallet,
  this data is gone forever."**
- For a real recovery flow (recommended before wide release, not necessarily
  before a small beta), the cheapest options in order of effort:
  1. **Beneficiary-based recovery**: let the owner designate a recovery
     wallet (not a full beneficiary) that can co-sign a key-rotation
     transaction after a time delay — similar machinery to the existing
     multi-sig confirm pattern.
  2. **Social recovery (Safe/Gnosis-style)**: M-of-N trusted guardians can
     jointly authorize moving vault ownership to a new address.
  3. Simplest but weakest: let users export an encrypted local backup of
     their derived keys, protected by a separate passphrase, that they store
     themselves.

## 6. Legal and trust

**Status: not started — required before collecting any real user's data or
funds.**

- No Privacy Policy, no Terms of Service, no "Beta" label anywhere in the
  product right now.
- You are processing personal data (emails via the leads capture, and
  whatever users put in their vault) from what looks like a primarily Indian
  user base given the landing page's sample content — so **India's DPDP Act
  2023** applies at minimum, and if any EU/UK users sign up, **GDPR** applies
  too. Both require, at minimum: a stated lawful basis for processing, a
  named contact for data requests, a retention/deletion policy, and
  (for DPDP specifically) that this is a "Significant Data Fiduciary"
  question only once you're at scale — but the basic notice obligations
  apply from day one.
- Concretely still to do:
  - Add a "Beta" badge next to the logo/header until this checklist is clear.
  - Write and publish a Privacy Policy covering: what's collected (wallet
    address, optional email, encrypted blobs on IPFS/chain), what's never
    collected (plaintext content, private keys), how long data is retained,
    and how a user requests deletion of their email from `data/leads.xlsx`
    (note: on-chain and IPFS data can't be truly deleted — see §4).
  - Write Terms of Service covering: no warranty on fund custody, no
    liability for lost keys, beta-software disclaimer, and that DeadDrop the
    project doesn't itself hold or control any user funds (only the
    open-source contract code does).
  - Link both from the footer and from the email-capture modal, since that's
    the first point of real data collection.

## 7. Open-source readiness

**Status: see the rewritten [README.md](README.md)** — now documents setup,
architecture, the contract addresses/network, how encryption works, and
explicitly flags this checklist's outstanding items so a new contributor (or
auditor) doesn't have to reverse-engineer the same context.

---

## Suggested order to close the gaps

1. Beta label + Privacy Policy + Terms (a few hours, blocks nothing else).
2. Key-loss warning copy on every write screen (< 1 hour).
3. Decide and document the IPFS pinning story (§4) — this is a decision, not
   code.
4. Fix the Pinata JWT exposure (§3) — scope the key or move behind a
   function.
5. Run Slither somewhere with Python available; fix anything above
   informational severity.
6. Get one outside pair of eyes on the contracts before any mainnet
   conversation.
7. Only after 1–6: design and build real key recovery (§5).
