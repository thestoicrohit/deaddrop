# DeadDrop — On-Chain Digital Legacy Vault

> *"What happens to everything you built, saved, and loved — when you're no longer here?"*

DeadDrop is a fully decentralised Web3 application that lets you store your digital legacy — crypto, memories, documents, letters, passwords — encrypted on IPFS, and release it automatically to your chosen beneficiaries when you stop being active. No lawyers. No banks. No middlemen. Just code running on Ethereum.

---

## The Problem

Every year:
- **$50B+** in cryptocurrency sits permanently locked because owners died without leaving access
- **2B+ photos** are lost when cloud subscriptions lapse after death
- Families are left with no access to accounts, seed phrases, or important documents

Traditional solutions (wills, password managers, cloud backups) all have the same flaw: they depend on a company or a person to execute. Companies shut down. People forget. Lawyers take months.

DeadDrop replaces all of that with a smart contract.

---

## How It Works

```
You create a vault on-chain
         ↓
You ping it every few months to prove you're alive
         ↓
If you stop pinging → Chainlink Automation triggers a grace period
         ↓
If you don't cancel the grace period → beneficiaries can claim
         ↓
Your ETH transfers on-chain. Your encrypted files on IPFS become accessible.
```

**The owner is always in control.** Ping to cancel a grace period at any time. Update beneficiaries, settings, and files at any time. Nothing releases without the inactivity window being truly exceeded.

---

## Architecture

### Smart Contracts (Solidity 0.8 — Sepolia Testnet)

Six independent contracts. No external dependencies at deploy time (Chainlink interface implemented inline).

---

### 1. `DeadDropVault.sol` — The Core

The heart of the protocol. Manages vault lifecycle, inactivity detection, and ETH inheritance.

**State machine:**
```
Active → GracePeriod → Released
           ↑ ↓ (owner pings → back to Active)
```

**Write functions:**

| Function | Who calls it | What it does |
|---|---|---|
| `createVault(thresholdDays, graceDays)` | Owner | Registers vault on-chain. Minimum 30-day threshold, 7-day grace period. Initialises `lastPing` to now. |
| `ping()` | Owner | Resets the inactivity clock. If called during a grace period, cancels it and returns vault to Active state. |
| `updateSettings(thresholdDays, graceDays, multiSig, metadataCID, finalMessageCID)` | Owner | Updates all vault configuration. CIDs point to IPFS-stored encrypted metadata and final message. |
| `setBeneficiaries(wallets[], sharesBPS[], names[])` | Owner | Sets the full beneficiary list. Shares must sum to exactly 10,000 basis points (100%). Clears and replaces any existing list. |
| `depositETH()` | Owner | Locks ETH into the vault. This ETH is split among beneficiaries on release. |
| `triggerGracePeriod(ownerAddr)` | Anyone | Moves vault to GracePeriod if owner hasn't pinged past their threshold. Also called automatically by Chainlink. |
| `claimLegacy(ownerAddr)` | Beneficiary | Releases ETH to all beneficiaries by their share percentage. Supports optional multi-sig (requires 2 beneficiary confirmations). |
| `checkUpkeep(checkData)` | Chainlink node (off-chain) | Scans all vaults. Returns `true` and the first overdue owner's address when any Active vault has exceeded its threshold. |
| `performUpkeep(performData)` | Chainlink node (on-chain) | Decodes the owner address and calls `triggerGracePeriod` automatically. |

**View functions:**

| Function | Returns |
|---|---|
| `hasVault(owner)` | Whether an address has registered a vault |
| `getVaultInfo(owner)` | Full vault state: state enum, lastPing, thresholds, ETH balance, multiSig flag, beneficiary count |
| `getBeneficiaries(owner)` | All beneficiary wallets, share amounts, and names |
| `getNextPingDeadline(owner)` | Unix timestamp of when the next ping must happen |
| `isGracePeriodOver(owner)` | Whether the grace period has fully expired (beneficiary can claim) |
| `getVaultCIDs(owner)` | The IPFS CIDs for vault metadata and final message |
| `getVaultCount()` | Total number of registered vaults |

**Events:** `VaultCreated`, `PingRecorded`, `SettingsUpdated`, `BeneficiariesSet`, `ETHDeposited`, `GracePeriodStarted`, `GracePeriodCancelled`, `MultiSigConfirmed`, `LegacyReleased`

---

### 2. `DeadDropKeyRegistry.sol` — Identity Keys

Stores each user's ECIES public key on-chain. This enables cross-wallet encrypted sharing — if you want to share a capsule with someone, you encrypt the content key with their registered public key, so only their wallet can decrypt it.

**Functions:**

| Function | What it does |
|---|---|
| `registerPublicKey(pubKey)` | Stores your ECIES compressed public key (33 bytes) on-chain |
| `getPublicKey(wallet)` | Returns the registered public key for any address |
| `hasPublicKey(wallet)` | Whether an address has registered a key |

**Event:** `PublicKeyRegistered`

---

### 3. `DeadDropCircles.sol` — Legacy Groups

Circles are on-chain groups — Family, Friends, Work, University, or custom. Each circle has members, roles, and a shared file vault. Think of a circle as a living family album that never gets lost.

**Write functions:**

| Function | What it does |
|---|---|
| `createCircle(name, description, circleType)` | Creates a new circle. Creator is automatically an Admin. |
| `updateCircle(circleId, name, description)` | Updates circle metadata. Admin only. |
| `addMember(circleId, wallet, name, role)` | Adds a wallet to the circle with a role (Member=0, Admin=1). Admin only. |
| `joinCircle(circleId, name)` | Any wallet can join an existing circle as a member. |
| `removeMember(circleId, wallet)` | Removes a member. Admin only. Cannot remove the last admin. |
| `uploadFile(circleId, name, fileType, cid, sizeMB)` | Logs an encrypted file's IPFS CID to the circle. Actual bytes are on IPFS; only the CID lives on-chain. |
| `removeFile(circleId, fileId)` | Removes a file record from the circle. Admin only. |

**View functions:** `getMembers`, `getFiles`, `getMyCircles`, `isMemberOf`, `memberCount`, `fileCount`

**Events:** `CircleCreated`, `CircleUpdated`, `MemberAdded`, `MemberRemoved`, `FileUploaded`, `FileRemoved`

---

### 4. `DeadDropCapsules.sol` — Memory Capsules

Time-locked or condition-locked containers for memories. Each capsule has a type, optional unlock date, optional circle link, and holds encrypted content CIDs.

**Capsule types:**
- `Private` — only the owner can open it
- `Shared` — visible to everyone in a linked circle
- `TimeLocked` — sealed until a specific date
- `Legacy` — released to beneficiaries when the vault triggers

**Content types stored per capsule:** `Photo`, `Letter`, `Voice`

**Write functions:**

| Function | What it does |
|---|---|
| `createCapsule(title, capsuleType, contentPreview, circleId, unlockDate)` | Creates a new capsule. Pass `unlockDate=0` for no time lock, `circleId=0` for no circle link. |
| `updateCapsule(capsuleId, title, contentPreview)` | Updates capsule metadata. Owner only. |
| `deleteCapsule(capsuleId)` | Deletes capsule and all its content records. Owner only. |
| `addContent(capsuleId, itemType, cid, label)` | Adds an encrypted IPFS CID as a content item (photo/letter/voice). |
| `removeContent(capsuleId, itemId)` | Removes a content item. Owner only. |
| `react(capsuleId, reactionIndex)` | Toggles a reaction (0=candle, 1=heart, 2=blossom). Stored per-user on-chain. |

**View functions:** `getContent`, `getMyCapsules`, `getReactions`, `getUserReactions`, `isUnlocked`, `contentCount`

**Events:** `CapsuleCreated`, `ContentAdded`, `ContentRemoved`, `Reacted`

---

### 5. `DeadDropSafe.sol` — Private Safe

The most sensitive part of the vault. Stores encrypted entries by category. Every `label`, `cid`, and `hint` stored here is ciphertext — the contract never sees plaintext.

**Categories:** `CryptoKey`, `Letter`, `VoiceNote`, `Password`, `Document`, `Photo`

**Write functions:**

| Function | What it does |
|---|---|
| `addEntry(category, label, cid, hint)` | Adds an encrypted entry. `label` is the encrypted title, `cid` points to the encrypted blob on IPFS, `hint` is optional encrypted metadata. |
| `updateEntry(entryId, label, cid, hint)` | Replaces an entry's ciphertext. Owner only. |
| `removeEntry(entryId)` | Deletes an entry permanently. Owner only. |

**View functions:** `getEntries(owner, category)`, `getAllEntries(owner)`, `entryCount(owner)`

**Events:** `SafeEntryAdded`, `SafeEntryUpdated`, `SafeEntryRemoved`

---

### 6. `DeadDropCredentials.sol` — Verifiable Credentials (ERC-721)

Universities and companies can issue verifiable credentials as NFTs — degree certificates, offer letters, equity agreements. Stored permanently, verified on-chain, impossible to forge or lose.

**Write functions:**

| Function | Who calls it | What it does |
|---|---|---|
| `setIssuer(address, verified)` | Admin | Grants or revokes issuer status for an institution's wallet |
| `transferAdmin(newAdmin)` | Admin | Transfers protocol admin rights |
| `issueCredential(recipient, credentialType, metadataCID, issuedAt)` | Verified Issuer | Mints an ERC-721 NFT to the recipient. `metadataCID` points to encrypted credential metadata on IPFS. |
| `revokeCredential(tokenId)` | Issuer who minted it | Marks credential as revoked. NFT still exists but `credentials[id].revoked = true`. |

**View functions:** `getCredentialsOf(recipient)`, `tokenURI`, `balanceOf`, `ownerOf` — plus full ERC-721 interface (`approve`, `transferFrom`, etc.)

**Events:** `IssuerStatusChanged`, `CredentialIssued`, `CredentialRevoked`, `Transfer`

---

## Encryption Model

All content is encrypted **in the browser** before any network call. Nothing sensitive ever leaves the device in plaintext.

```
Symmetric key (AES-256-GCM)
    derived from: wallet.signMessage("deaddrop:identity:v1")
    → deterministic — same wallet always produces same key
    → never stored anywhere — derived fresh each session

Content encryption:
    plaintext → AES-256-GCM(symmetricKey) → ciphertext blob → IPFS → CID stored on-chain

Cross-wallet sharing (ECIES):
    sharedKey → encrypted with recipient's public key (from KeyRegistry)
    → recipient decrypts with their wallet's private key
```

Keys are **never** sent to a server, stored in localStorage, or included in any transaction. Lose your wallet → lose your keys. This is intentional: the same guarantee that makes crypto self-sovereign applies here.

---

## Frontend — Pages & Features

| Route | Page | What it does |
|---|---|---|
| `/` | Entry | Landing page — hero, stats counter animation, how-it-works |
| `/about` | About | Mission, problem statement, team |
| `/connect` | Connect | 3-step onboarding: connect wallet → set display name → set PIN |
| `/dashboard` | Dashboard | Vault health score (8-point check), alive ping ring, quick stats, recent on-chain activity |
| `/legacy` | Legacy | Create/configure vault, set inactivity threshold, manage beneficiaries, deposit ETH, write final message |
| `/profiles` | Circles | Create and manage legacy circles, view members and files |
| `/profiles/:id` | Circle Detail | 4 tabs: Vault (files), Memories (capsules), Members, Timeline (on-chain events) |
| `/memory` | Memory Space | All memory capsules — create, filter by type, add photos/letters/voice, react |
| `/safe` | Private Safe | 6-section encrypted vault: Crypto Keys, Letters, Voice Notes, Passwords, Documents, Photos |
| `/organizations` | Organizations | Issue ERC-721 credentials, verify issuers, view issued/received credentials |
| `/activity` | Activity | Live on-chain event feed across all 6 contracts with search and domain filters |
| `/claim` | Claim Portal | Beneficiary-facing: look up any vault by owner address, view contents, claim ETH |

---

## Vault Health Score

The dashboard computes a score (0–100%) from 8 on-chain checks:

| Check | Condition |
|---|---|
| Wallet connected | wagmi account connected |
| Vault created | `hasVault(address)` returns true |
| Beneficiaries set | `beneficiaryCount > 0` |
| ETH deposited | `depositedETH > 0` |
| At least one circle | `getMyCircles(address).length > 0` |
| At least one capsule | `getMyCapsules(address).length > 0` |
| Safe has entries | `entryCount(address) > 0` |
| Public key registered | `hasPublicKey(address)` returns true |

Score = (checks passed / 8) × 100. Ring color: green ≥ 75%, orange ≥ 50%, red < 50%.

---

## Claim Portal Flow

When a vault owner goes inactive and the grace period ends, their beneficiaries:

1. Go to `/claim` and enter the owner's wallet address
2. Contract is queried — vault state, ETH balance, and beneficiary list are shown
3. If the connected wallet is a registered beneficiary and the grace period is over, claim is unlocked
4. An **AI Memory Portrait** is generated from on-chain data — capsule titles, circle count, safe entries, ETH locked
5. Beneficiary calls `claimLegacy(ownerAddr)` — ETH splits and transfers on-chain automatically
6. If multi-sig is enabled, two beneficiaries must both confirm before release

---

## Chainlink Automation

The vault contract implements `AutomationCompatibleInterface`:

- **`checkUpkeep`** — scans all registered vault owners every block (off-chain, gas-free). Returns `true` + the first overdue owner's address when any Active vault has exceeded its threshold.
- **`performUpkeep`** — called on-chain by the Chainlink node. Transitions the vault to GracePeriod and emits `GracePeriodStarted`.

To activate: register the deployed vault contract as a **Custom Logic** upkeep at [automation.chain.link](https://automation.chain.link). No code changes needed — just a one-time registration with LINK funding.

Without Chainlink: anyone can still call `triggerGracePeriod(ownerAddr)` manually.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | TailwindCSS + custom CSS (glass morphism) |
| Animations | Framer Motion 11 |
| Canvas FX | HTML5 Canvas 2D — aurora ribbons, particle streams, neural sphere |
| State | Zustand (UI only — theme, language, display name) |
| Routing | React Router v6 |
| Web3 | wagmi v2 + viem |
| Wallet | MetaMask (injected) + WalletConnect |
| Smart Contracts | Solidity 0.8 + Hardhat |
| Tests | Chai + ethers.js — 79 tests across 6 contracts |
| Storage | IPFS via Pinata |
| Encryption | AES-256-GCM + ECIES (Web Crypto API) |
| Automation | Chainlink Automation (Custom Logic upkeep) |
| Credentials | ERC-721 NFT |
| Network | Ethereum Sepolia testnet |

---

## Local Setup

```bash
git clone https://github.com/your-org/deaddrop.git
cd deaddrop
npm install

# Run all 79 tests
npm test

# Start the frontend (no contracts needed for UI exploration)
npm run dev
# or double-click open-deaddrop.bat on Windows
```

### Deploy to Sepolia

```bash
# 1. Copy and fill environment file
cp .env.example .env
# Set SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY

# 2. Compile contracts
npm run compile

# 3. Deploy all 6 contracts
npm run deploy:sepolia
# Prints all 6 addresses — paste them into .env

# 4. Regenerate ABI modules (only if you changed contracts)
node scripts/gen-contract-modules.mjs
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `SEPOLIA_RPC_URL` | Alchemy/Infura RPC for deployment |
| `DEPLOYER_PRIVATE_KEY` | Deployer wallet — only used at deploy time, never in the app |
| `VITE_VAULT_ADDRESS` | DeadDropVault deployed address |
| `VITE_KEY_REGISTRY_ADDRESS` | DeadDropKeyRegistry deployed address |
| `VITE_CIRCLES_ADDRESS` | DeadDropCircles deployed address |
| `VITE_CAPSULES_ADDRESS` | DeadDropCapsules deployed address |
| `VITE_SAFE_ADDRESS` | DeadDropSafe deployed address |
| `VITE_CREDENTIALS_ADDRESS` | DeadDropCredentials deployed address |
| `VITE_PINATA_JWT` | Pinata JWT for IPFS uploads |
| `VITE_ALCHEMY_KEY` | Alchemy key for frontend RPC |
| `VITE_DEPLOY_BLOCK` | Block number of first deploy (speeds up activity feed) |

---

## Contract Tests — 79 total

| Contract | Tests cover |
|---|---|
| DeadDropVault | createVault, ping, setBeneficiaries, depositETH, triggerGracePeriod, claimLegacy, multiSig, updateSettings, getVaultCIDs, view helpers, **Chainlink checkUpkeep/performUpkeep** |
| DeadDropKeyRegistry | registerPublicKey, getPublicKey, hasPublicKey, duplicate registration |
| DeadDropCircles | createCircle, updateCircle, addMember, joinCircle, removeMember, uploadFile, removeFile, access control |
| DeadDropCapsules | createCapsule, updateCapsule, deleteCapsule, addContent, removeContent, react, time-lock, view helpers |
| DeadDropSafe | addEntry, updateEntry, removeEntry, getEntries by category, getAllEntries, access control |
| DeadDropCredentials | setIssuer, issueCredential, revokeCredential, ERC-721 transfers, tokenURI, access control |

---

## What Makes This Different

| Feature | DeadDrop | Traditional Will | Password Manager | Cloud Backup |
|---|---|---|---|---|
| Crypto key transfer | ✅ | ❌ | ❌ | ❌ |
| Automated trustless release | ✅ Chainlink | ❌ Manual | ❌ | ❌ |
| Memory preservation | ✅ | ❌ | ❌ | Partial |
| Decentralised storage | ✅ IPFS | ❌ | ❌ | ❌ |
| Zero-knowledge encryption | ✅ | N/A | Partial | ❌ |
| No single point of failure | ✅ | ❌ | ❌ | ❌ |
| Works without lawyers | ✅ | ❌ | ✅ | ✅ |
| Verifiable credentials | ✅ ERC-721 | ❌ | ❌ | ❌ |
| On-chain activity log | ✅ | ❌ | ❌ | ❌ |

---

## The Name

**DeadDrop** — in espionage, a dead drop is a method of passing information between two parties without them ever meeting directly. One person leaves something. Another person retrieves it. No contact. No intermediary. No risk.

That's exactly what this is. You leave things for the people you love. They find them when the time comes. You never have to be in the room.

---

*Built with care, for the people who think about tomorrow.*
