# DeadDrop Vault — Solana port

A Solana/Anchor port of [`contracts/DeadDropVault.sol`](../contracts/DeadDropVault.sol), written to mirror its
state machine, multiSig epoch-based confirmation invalidation, and pull-payment withdrawal pattern exactly.

**Status: written, not yet compiled, tested, or deployed.** This was authored in an environment with no Rust,
Cargo, Solana CLI, or Anchor CLI installed — none of it has been run. Treat it as a careful first draft, not an
audited program. Do not point real funds at it before it has been built, the full test suite passes, and ideally
an independent security review has happened — a bug here (unlike the Solidity vault) is not something you can
just redeploy a fix for if real SOL is already sitting in a vault PDA under attacker-influenced logic; take the
same care upgrading/re-auditing before mainnet that you would for the Ethereum side.

## One-time setup

1. Install Rust: <https://www.rust-lang.org/tools/install>
2. Install the Solana CLI: <https://docs.solanalabs.com/cli/install>
3. Install Anchor via avm: <https://www.anchor-lang.com/docs/installation> (`cargo install --git https://github.com/coral-xyz/anchor avm --force`, then `avm install 0.30.1 && avm use 0.30.1`)
4. From this directory: `npm install` (or `yarn`)

## Build, test, deploy

```bash
anchor build
anchor keys list          # copy the generated program id
```

Then replace the placeholder program id in **three** places with the real one from `anchor keys list`:
- `Anchor.toml` (`[programs.localnet]` / `[programs.devnet]`)
- `programs/deaddrop-vault/src/lib.rs` (`declare_id!(...)`)
- rebuild once more after editing those (`anchor build`)

```bash
anchor test                # runs tests/deaddrop-vault.ts via anchor-bankrun (fast, no real validator/airdrop needed)
anchor deploy --provider.cluster devnet   # once tests pass
```

## What differs from the Solidity version, and why

- **Pull-payment funds custody**: Solana programs have no single "contract balance" the way an EVM contract
  does — only accounts hold lamports. `PendingWithdrawal` is a PDA *per beneficiary wallet* (not per vault) that
  actually receives the lamports at `claim_legacy` time; `withdraw()` then drains it to the beneficiary. This is
  the direct Solana equivalent of `pendingWithdrawals` in `DeadDropVault.sol`.
- **`confirmation_epoch` starts at 1, not 0** — same off-by-one the Solidity fix had to account for: a freshly
  created `Confirmation` PDA defaults its `epoch` field to 0, so epoch 0 would look identical to "already
  confirmed in epoch 0" for a beneficiary who's never confirmed.
- **Beneficiary list is capped at `MAX_BENEFICIARIES = 10`** and names/CIDs are capped at 32/64 chars — Solana
  account space is fixed at allocation time, unlike Solidity's dynamically-growable arrays/strings.
- **No on-chain time travel** in tests — `warpBy()` moves the bankrun clock forward directly (there's no
  `evm_increaseTime` equivalent on a real validator), so the Solidity suite's day-scale thresholds are testable
  without an actual 30-day wait.

## Not built yet

- Frontend wallet-adapter integration (`@solana/wallet-adapter-react`, Phantom/Solflare connect) — this program
  has no UI wired up to it yet.
- SPL token (memecoin) support — this first pass only handles native SOL, mirroring the Solidity vault's
  ETH-only scope. Extending to SPL tokens means adding associated-token-account transfers to `deposit`/
  `claim_legacy`/`withdraw`, which is a meaningfully larger surface (mint validation, ATA creation, decimals)
  worth its own pass once the SOL path is verified working.
