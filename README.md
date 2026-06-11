# DeadDrop — Digital Legacy Vault

> *"What happens to everything you built, saved, and loved — when you're no longer here?"*

---

## The Problem

Every year, over **$50 billion** in cryptocurrency sits unclaimed because the owner passed away without leaving access instructions. More than **2 billion photos** are lost annually when cloud subscriptions lapse after death. In India alone, **400 million+ people** remain unbanked — their financial lives entirely undocumented, inaccessible to the families they leave behind.

Beyond money, there's a quieter loss: the voice notes that were never meant to be deleted, the letters never sent, the family documents scattered across hard drives no one can unlock, the seed phrases memorised but never written down anywhere safe.

We built DeadDrop to solve this.

---

## What is DeadDrop?

DeadDrop is a **Web3 digital legacy vault** — a private, encrypted space where you store everything that matters: your crypto keys, important documents, family memories, voice messages, letters, and passwords. You decide who gets access, when they get it, and under what conditions.

It is not a will. It is not a cloud backup. It is **your digital afterlife, on your terms**.

When you go inactive — when you stop logging in past a threshold you set — DeadDrop's on-chain automation triggers a grace period. Your chosen beneficiaries are notified. They can claim what you left them. Everything you stored is released, decrypted, and delivered. No lawyers. No bank bureaucracy. No lost passwords.

---

## The Vision

Most people spend their lives accumulating things — memories, assets, relationships, knowledge. But almost no one has a plan for what happens to the *digital* version of all of that.

DeadDrop's vision is simple: **make digital inheritance as natural as writing a will, and as easy as sending a message**. We believe every person — regardless of wealth, location, or technical knowledge — deserves the ability to decide what happens to their digital life after they're gone.

We're building this for:
- The father who wants his children to find his photo albums, not lose them
- The crypto investor who doesn't want their ETH permanently locked in a wallet
- The mother who has letters she wants delivered only after she's gone
- The founder who needs their equity documents preserved and handed over correctly
- Anyone who has ever thought: *"What if something happens to me tomorrow?"*

---

## How It Works

DeadDrop operates on three core principles: **Privacy**, **Control**, and **Certainty**.

### 1. You Store Everything

Your private vault holds:
- **Crypto keys** — seed phrases, private keys, wallet addresses
- **Documents** — property deeds, wills, passports, contracts
- **Letters** — messages written for people to receive after you're gone
- **Voice notes** — audio recordings for the moments words aren't enough
- **Photos & videos** — encrypted personal archives
- **Passwords** — your digital accounts, securely stored

Everything is encrypted with **AES-256** before leaving your browser. Nothing is ever sent to a server in plaintext. Files are stored on **IPFS** — a decentralised, permanent file system. Your data isn't on a company's server that can shut down.

### 2. You Set the Rules

You configure your **legacy settings** on-chain:

- **Inactivity threshold** — how long you can go without logging in (3 months / 6 months / 1 year)
- **Grace period** — how many days your beneficiaries must wait before claiming, giving you time to reappear and cancel
- **Multi-sig** — require two family members to confirm a claim before release
- **Beneficiaries** — who gets what, with percentage allocations per asset
- **Final message** — an encrypted message delivered to all beneficiaries when the legacy releases
- **Emergency contact** — one person called immediately when the grace period begins, before any formal claim process

### 3. Chainlink Keeps Watch

**Chainlink Keepers** (Chainlink Automation) run on-chain checks every 24 hours. If you haven't pinged in longer than your threshold, the grace period begins automatically. No human intervention. No single point of failure. No company that can go bankrupt and take your legacy with it.

You stay alive in the system simply by logging in and clicking **"Ping — I'm here"**. That's it.

### 4. Your Beneficiaries Claim

When the grace period ends and the legacy releases, your beneficiaries receive:
- An AI-generated **Memory Portrait** — a narrative summary of your digital life, built from your capsules
- Access to all memory capsules you designated as shareable
- Your documents and files, decrypted with their authorised wallet
- Your crypto assets, transferred on-chain

---

## Core Features

### Dashboard (`/dashboard`)
A central home screen showing the state of your vault at a glance:
- **Vault Health Score** — an 8-point scoring system (0–100%) that evaluates how well-protected your vault is. Checks: display name set, PIN set, at least one capsule, at least one circle, safe data stored, legacy settings configured, beneficiary assigned, final message written. Color-coded SVG ring (green ≥ 75% / orange ≥ 50% / red < 50%).
- **Onboarding Checklist** — a 5-step guided checklist for new users (dismissable once vault is complete). Tracks progress with a bar and links directly to incomplete steps.
- **Alive Ping ring** — visual countdown showing days remaining before the next required ping, with color shift as the deadline approaches.
- **Quick stats** — capsule count, active circles, days until next ping, beneficiary count.
- **Quick actions** — one-click shortcuts to every major section.
- **Recent activity** — the last 5 vault events, inline.

### Activity Log (`/activity`)
A full chronological record of everything that has happened in your vault:
- Merges circle events (from all legacy circle timelines) and system notifications into one unified feed
- **Filter chips** — All / Circles / System with live counts
- **Search** — real-time filtering across event descriptions, wallet addresses, and circle names (activates at 2+ characters)
- Events grouped by date with dividers; each entry shows icon, source badge, description, timestamp, and relative time

### Legacy Circles (`/profiles`)
Group the people in your life into circles — Family, Friends, University, Work, or custom groups. Each circle has its own **Shared Vault** (for documents and files), **Memory Space** (for capsules), and **Members** list. Think of circles as living, breathing family albums that never get lost.

**Circle Detail (`/profiles/:id`)** shows four tabs:
- **Vault** — shared documents and files for the circle, with upload and NFT minting
- **Memories** — memory capsules linked to the circle
- **Members** — add/remove wallet addresses with role labels
- **Timeline** — full event history for the circle

### Memory Capsules (`/memory`)
Time-locked or condition-locked containers for your memories. Types:
- **Private** — only you can open it
- **Shared** — visible to everyone in a circle
- **Time-locked** — sealed until a date you set
- **Legacy** — released to beneficiaries when your legacy triggers

Each capsule holds **photos**, **voice notes**, and **letters**. Reactions (🕯️ candle, ❤️ heart, 🌸 blossom) are persistent. The masonry grid filters by type. The detail modal has four tabs (Overview / Photos / Letters / Voice) and inline editing.

### Private Safe (`/safe`)
Your personal encrypted vault, protected by a vault-lock intro animation on first access each session. Six collapsible sections:

| Section | What it holds |
|---|---|
| Crypto Keys | Seed phrases and private keys — show/hide toggle, multi-entry |
| Documents | PDFs and images — uploaded, sized, minted with a random NFT ID |
| Letters | Written messages — encrypted, timestamped, previous drafts accessible |
| Voice Notes | Simulated recordings — timed, waveform visualisation, removable |
| Photos & Videos | Visual archives — grid preview, up to 8 shown + overflow count |
| Password Vault | App/website credentials — label / username / password, reveal toggle |

All sections persist to the Zustand store via `safeData`.

### Legacy Settings (`/legacy`)
Full on-chain legacy configuration:
- **Inactivity Threshold** — 3 months / 6 months / 1 year selector
- **Alive Ping** — countdown bar, last ping date, next ping due, overdue warnings
- **Beneficiary Assignment** — multi-row table: asset / wallet / name / percentage, with running total and balance hint
- **Grace Period** — slider (7–60 days)
- **Multi-sig Toggle** — require 2 confirmations before release
- **Chainlink Automation Status** — live indicator showing keeper activity
- **Final Message** — encrypted textarea delivered to all beneficiaries on release
- **Emergency Contact** — name + phone/email, stored encrypted, called first when grace period begins

### AI Vault Assistant
Floating panel powered by Claude — vault-aware, with context about your actual data. Answers questions like:
- *"How many capsules do I have?"*
- *"When is my next ping due?"*
- *"Who are my beneficiaries?"*
- *"What's in my safe?"*

Chat history persists across sessions via `aiMessages` in the store.

### Claim Portal (`/claim`)
The beneficiary-facing side of DeadDrop. When a legacy releases, beneficiaries:
1. Enter the deceased's wallet address and verify identity
2. See a stats summary: capsule count, file count, letters and voice notes
3. Read the final message (if written)
4. Access the Memory Portrait (AI-generated narrative)
5. Browse shareable capsules and files
6. Claim crypto assets on-chain

### Organizations (`/organizations`)
Universities and companies can issue verified credentials as NFTs — degree certificates, offer letters, equity agreements. Stored permanently, verified on-chain, impossible to forge. Issued credentials are stored in `issuedCredentials` and display with on-chain verification status.

### Settings Panel
Accessible via the gear icon in the navbar:
- **Export vault** — downloads a full JSON snapshot of all persisted store data
- **Import vault backup** — accepts a `.json` export file and restores all data (handles both raw and Zustand-wrapped formats)
- **Reset vault** — 2-step confirmation wipe of all data
- **Theme toggle** — dark / light
- **Language toggle** — English / Hindi (translation layer active across all pages)
- **Disconnect wallet**

### PWA Support
DeadDrop is installable as a Progressive Web App:
- `public/manifest.json` with standalone display mode, theme color `#0B2B26`, and SVG icon
- Apple mobile web app meta tags for home-screen installation on iOS
- Open Graph meta tags for link previews

---

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | EntryPage | Landing — hero, stats, how-it-works, CTA |
| `/about` | AboutPage | Mission, problem statement, stats, team |
| `/connect` | ConnectPage | 3-step onboarding: wallet → profile → PIN |
| `/dashboard` | DashboardPage | Vault health score, checklist, stats, ping, activity |
| `/profiles` | ProfilesPage | Your legacy circles grid |
| `/profiles/:id` | ProfileDetailPage | Circle detail — vault, memories, members, timeline |
| `/memory` | MemorySpacePage | All memory capsules, filter by type |
| `/legacy` | LegacyPage | Configure threshold, beneficiaries, ping, emergency contact |
| `/safe` | PrivateSafePage | Private encrypted vault (6 sections) |
| `/claim` | ClaimPage | Beneficiary claim portal |
| `/organizations` | OrganizationsPage | B2B credential issuance |
| `/activity` | ActivityPage | Full vault activity timeline with search and filters |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite 5 |
| **Styling** | TailwindCSS 3 + custom CSS (glass morphism, shimmer, vault-input) |
| **Animations** | Framer Motion 11 (spring physics, whileInView, AnimatePresence) |
| **Canvas FX** | HTML5 Canvas 2D API — aurora ribbons, particle streams, neural sphere, data-stream, hand wireframes |
| **State** | Zustand with `persist` middleware → **localStorage** |
| **Routing** | React Router v6 |
| **Dates** | date-fns |
| **Toasts** | react-hot-toast |
| **Fonts** | Sora (headings) + Inter (body) via Google Fonts |
| **Icons** | Phosphor Icons (`@phosphor-icons/react`) |
| **PWA** | Web App Manifest + Apple meta tags |
| **Web3 (planned)** | ethers.js v6 / wagmi v2 / viem for wallet connection |
| **Storage (planned)** | IPFS via web3.storage or Pinata |
| **Automation (planned)** | Chainlink Keepers / Automation |
| **Encryption (planned)** | AES-256 via Web Crypto API + Lit Protocol for key management |

---

## Data Architecture

All data is stored in **Zustand's persisted store** (`localStorage` key: `deaddrop-store`). The `partialize` filter controls what is actually persisted.

```
deaddrop-store
├── identity
│   ├── walletAddress
│   ├── displayName
│   ├── profilePhoto
│   └── safePin
│
├── onboardingChecklistDone      ← true once user dismisses the checklist
├── emergencyContact             ← { name, contact } — stored encrypted
│
├── profiles[]                   ← user's legacy circles
│   ├── id, name, type
│   ├── description, members[]
│   └── fileCount, memoryCount
│
├── profileFiles{}               ← per-circle file vault
│   └── [profileId]: File[]
│
├── profileMembers{}             ← per-circle members
│   └── [profileId]: Member[]
│
├── profileTimeline{}            ← per-circle activity log (feeds /activity)
│   └── [profileId]: Event[]
│
├── capsules[]                   ← memory capsules
│   ├── id, title, type
│   ├── contentPreview
│   ├── photos, voice, letters (counts)
│   └── unlockDate
│
├── capsuleContent{}             ← actual capsule content (photos/letters/voice)
│   └── [capsuleId]: { photos[], letters[], voice[] }
│
├── reactions{}                  ← capsule reactions
│   └── [capsuleId]: { '🕯️': n, '❤️': n, '🌸': n, userReacted: [] }
│
├── legacySettings{}
│   ├── inactivityThreshold
│   ├── gracePeriod, multiSig
│   ├── beneficiaries[]
│   ├── finalMessage
│   ├── lastPing, nextPing
│   └── chainlinkActive
│
├── safeData{}                   ← private vault contents
│   ├── cryptoKeys[]             { label, value }
│   ├── letters[]                { content, savedAt }
│   ├── voiceNotes[]             { name, duration, date }
│   ├── passwords[]              { label, username, password }
│   ├── documents[]              { name, size, type, nftId, date }
│   └── photos[]                 { name, date }
│
├── notifications[]              ← system notifications (feeds /activity)
├── aiMessages[]                 ← persistent AI chat history
└── issuedCredentials[]          ← B2B credentials issued via /organizations
```

---

## Vault Health Score

The dashboard computes a **health score (0–100%)** from 8 checks:

| Check | Condition |
|---|---|
| Display name set | `displayName` is not null |
| Safe PIN set | `safePin` is not null |
| At least one memory capsule | `capsules.length > 0` |
| At least one legacy circle | `profiles.length > 0` |
| Something stored in the private safe | any `safeData` section has entries |
| Legacy settings saved | `legacySettings.beneficiaries.length > 0` or `finalMessage` written |
| At least one beneficiary assigned | `legacySettings.beneficiaries.length > 0` |
| Final message written | `legacySettings.finalMessage.trim().length > 0` |

Score = (checks passed / 8) × 100. Ring color: green ≥ 75%, orange ≥ 50%, red < 50%.

---

## Local Setup

```bash
# Clone the repo
git clone https://github.com/your-org/deaddrop.git
cd deaddrop

# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

The app runs entirely in the browser. No backend server is required for the current demo version. All data persists via `localStorage`.

### Environment (future)
When connecting to real blockchain infrastructure, you'll need:
```env
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
VITE_IPFS_API_KEY=your_web3storage_key
VITE_CHAINLINK_REGISTRY=0x...
```

---

## Visual Design

DeadDrop uses a **dark teal** design language — deliberately chosen to feel serious, calm, and trustworthy. Not the neon-on-black crypto aesthetic. Not the beige-and-warm fintech look. Something in between — like a vault that has been designed with care.

**Palette:**
- Background: `#051F20` (deep forest)
- Surface: `#0B2B26` (elevated glass)
- Accent: `#8EB69B` (sage green)
- Highlight: `#DAF1DE` (pale mint)
- Warning: `#D1601F` (burnt orange)

**Motion philosophy:** every interaction has a spring — pages don't cut, they breathe. Modals scale in. Cards lift on hover. The aurora in the background is alive — 8 ribbon bands drift continuously at different speeds, layered with 490 glowing particles and 6 ambient orbs. The side decorations (wireframe hand, neural sphere, data-stream binary) reinforce the idea that something intelligent and organic is watching over your vault.

**Typography:** Sora for all headings (geometric, confident), Inter for all body copy (readable, neutral). Never mixed.

---

## What Makes This Different

| Feature | DeadDrop | Traditional Will | Password Manager | Cloud Backup |
|---|---|---|---|---|
| Crypto key transfer | ✅ | ❌ | ❌ | ❌ |
| Automated release | ✅ on-chain | ❌ manual | ❌ | ❌ |
| Memory preservation | ✅ | ❌ | ❌ | Partial |
| Beneficiary assignment | ✅ | ✅ | ❌ | ❌ |
| Decentralised storage | ✅ IPFS | ❌ | ❌ | ❌ |
| No single point of failure | ✅ | ❌ | ❌ | ❌ |
| Zero-knowledge encryption | ✅ | N/A | Partial | ❌ |
| Works without lawyers | ✅ | ❌ | ✅ | ✅ |
| Emergency contact failsafe | ✅ | ❌ | ❌ | ❌ |
| Vault health monitoring | ✅ | ❌ | ❌ | ❌ |
| AI vault assistant | ✅ | ❌ | ❌ | ❌ |
| Installable (PWA) | ✅ | ❌ | Partial | ❌ |

---

## Roadmap

- [ ] Real wallet connection (MetaMask / WalletConnect)
- [ ] Actual IPFS upload via web3.storage
- [ ] AES-256 encryption in-browser via Web Crypto API
- [ ] Lit Protocol for decentralised key management (access control)
- [ ] Chainlink Automation deployment (Polygon / Ethereum)
- [ ] Multi-chain support (ETH, Polygon, BNB)
- [ ] Mobile app (React Native)
- [ ] Organisation dashboard for universities / companies
- [ ] Beneficiary mobile notification system
- [ ] AI Memory Portrait generation (Claude API)
- [ ] Hindi / regional language support (translation layer already in place)
- [ ] Push notifications for ping reminders
- [ ] Biometric unlock for Private Safe
- [ ] Sharable legacy circle invite links

---

## The Name

**DeadDrop** — in espionage, a dead drop is a method of passing information between two parties without them ever meeting directly. One person leaves something. Another person retrieves it. No contact. No intermediary. No risk.

That's exactly what this is. You leave things for the people you love. They find them. You never have to be in the room.

---

*Built with care, for the people who think about tomorrow.*
