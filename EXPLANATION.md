# DeadDrop — Project Explanation

## What Is It?

DeadDrop is a **blockchain-based digital legacy vault** built on Ethereum. It solves one specific problem: when someone dies or goes missing, everything they owned digitally — crypto, passwords, documents, memories — becomes permanently inaccessible. DeadDrop automates the inheritance of all of it, trustlessly, using smart contracts.

No lawyers. No banks. No company that can shut down. Just code.

---

## The Problem

Every year, **$50 billion+** in cryptocurrency sits permanently locked because owners died without leaving access to their wallets. Over **2 billion photos** are deleted when cloud subscriptions lapse after death. Families are left with no passwords, no seed phrases, no documents — nothing.

Traditional solutions don't work:
- **Wills** don't cover digital assets or crypto
- **Password managers** require someone to already know the master password
- **Cloud backups** depend on a company staying alive forever
- **Telling someone** requires trusting a human not to act early

All of these have a single point of failure — a person or a company. DeadDrop replaces both with a smart contract.

---

## The Core Idea

You store your digital life encrypted on IPFS. A smart contract on Ethereum watches your activity. If you go silent past a threshold you set, it automatically triggers a grace period. If you don't come back, your beneficiaries can claim everything you left them.

You stay "alive" in the system by logging in and clicking **Ping — I'm here** once every few months. That single action resets the clock.

---

## What You Can Store

DeadDrop is not just a crypto wallet handover. It's your entire digital life:

- **Crypto keys** — seed phrases, private keys, wallet addresses
- **Memory capsules** — photos, voice recordings, letters sealed until a date or until you're gone
- **Legacy circles** — groups of people (family, friends, colleagues) each with their own shared file vault
- **Documents** — property deeds, contracts, passports, wills
- **Passwords** — every account you own
- **Final messages** — letters that only open when your legacy releases
- **Credentials** — degree certificates and offer letters issued as permanent NFTs

Everything is encrypted in the browser with AES-256 before it ever leaves your device. The blockchain only stores CIDs pointing to encrypted blobs on IPFS. Even if someone reads the contract state directly, they see nothing useful.

---

## How the Release Works

```
You create a vault → set an inactivity threshold (3 / 6 / 12 months)
                   → set a grace period (7–60 days)
                   → add beneficiaries with percentage splits
                   → lock ETH if you want crypto inherited

You ping regularly → one click resets the clock

You stop pinging  → Chainlink Automation detects it automatically
                  → grace period starts on-chain

Grace period ends → beneficiaries call claim
                  → ETH splits and transfers automatically
                  → encrypted files become accessible
```

The owner can cancel the grace period at any time by pinging — it's not irreversible until the grace period fully expires. This protects against false triggers.

---

## Chainlink Automation

One of the biggest challenges in this kind of system is: **who decides when you're truly gone?**

In DeadDrop, the answer is no one — it's automated. The vault contract implements Chainlink Automation, which means Chainlink nodes check every block whether any vault has exceeded its inactivity threshold. When one has, they call the contract to trigger the grace period automatically, on-chain, without any human involved.

This is what makes DeadDrop truly trustless. There's no admin who can trigger early. There's no company who can delay. The rules are written in code and execute automatically.

---

## Legacy Circles

Circles are how you organise the people in your life on-chain. You create groups — Family, Friends, Work, University — and each circle has its own shared file vault and memory space. Members can be added with different roles (Member or Admin).

This means when you're gone, your family circle sees your family photos and documents. Your work circle sees your professional handover. Each group only gets what was meant for them.

---

## Memory Capsules

Capsules are time-locked or condition-locked containers for memories. You can seal a capsule until a specific date — a letter for your child to open at 18, a voice note for your anniversary five years from now. Or seal it as a Legacy capsule that only opens when your vault releases.

Each capsule can hold photos, letters, and voice recordings — all encrypted, all stored on IPFS, all permanent.

---

## Private Safe

The most sensitive part of the vault. Six categories: crypto keys, letters, voice notes, passwords, documents, photos. Everything stored here is ciphertext — the contract never sees plaintext. Even the labels are encrypted. Only someone with your wallet can decrypt anything.

---

## Verifiable Credentials

Universities and companies can issue degree certificates, offer letters, and equity agreements as ERC-721 NFTs directly to a recipient's wallet. These credentials are permanent, publicly verifiable, and impossible to forge or lose. Recipients carry them in their wallet forever.

---

## Encryption — The Key Insight

The encryption key is **never stored anywhere**. It is derived fresh every session from a signature your wallet produces — the same wallet always produces the same key, but the key itself never touches a server, a database, or localStorage.

This means:
- If you lose your wallet, you lose your keys — intentionally, same as crypto
- No company can be hacked to expose your data
- No subpoena can extract your keys from a server that doesn't have them

---

## Why Blockchain Specifically?

Because the core promise — *your legacy will be released to the right people at the right time* — requires a system that:

1. **Cannot be shut down** — Ethereum runs as long as there are nodes
2. **Cannot be tampered with** — the beneficiary list is immutable once set
3. **Executes without trust** — no person needs to press a button
4. **Is publicly verifiable** — anyone can read the contract and confirm it does what it claims
5. **Is globally accessible** — a beneficiary in any country can claim without a bank account

A centralised database with a web app gives you none of those guarantees.

---

## What Makes It Different

| | DeadDrop | Traditional Will | Password Manager | Cloud Backup |
|---|---|---|---|---|
| Handles crypto | ✅ | ❌ | ❌ | ❌ |
| Fully automated | ✅ | ❌ | ❌ | ❌ |
| No single point of failure | ✅ | ❌ | ❌ | ❌ |
| Permanent storage | ✅ IPFS | ❌ | ❌ | ❌ |
| Zero-knowledge encryption | ✅ | N/A | Partial | ❌ |
| Works without lawyers | ✅ | ❌ | ✅ | ✅ |
| Verifiable credentials | ✅ | ❌ | ❌ | ❌ |

---

## The Name

**DeadDrop** — in espionage, a dead drop is a method of passing information between two people without them ever meeting. One person leaves something. The other retrieves it later. No contact. No intermediary. No risk.

That's exactly what this is. You leave things for the people you love. They find them when the time comes. You never have to be in the room.

---

*Built for the people who think about tomorrow.*
