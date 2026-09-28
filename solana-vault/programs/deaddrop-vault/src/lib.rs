//! DeadDropVault — Solana port of contracts/DeadDropVault.sol
//!
//! Mirrors the Solidity vault's exact mechanics (state machine, multiSig
//! epoch-based confirmation invalidation, pull-payment withdrawals, and the
//! Active-only guards on updateSettings/setBeneficiaries/withdrawDeposit)
//! so the two chains behave identically from a beneficiary's point of view.
//! See DeadDropVault.sol for the reference behavior and its test suite for
//! the scenarios this program's tests mirror.
//!
//! NOT YET COMPILED OR DEPLOYED — this environment has no Rust/Solana/Anchor
//! toolchain installed. Run `anchor build && anchor test` locally before
//! trusting this with real funds; treat it as a careful first draft, not an
//! audited program.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"); // placeholder — replace with `anchor keys list` output after first build

pub const MAX_BENEFICIARIES: usize = 10;
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_CID_LEN: usize = 64;
pub const MIN_THRESHOLD_DAYS: i64 = 30;
pub const MIN_GRACE_DAYS: i64 = 7;
pub const SECONDS_PER_DAY: i64 = 86_400;
pub const BPS_DENOMINATOR: u32 = 10_000;

#[program]
pub mod deaddrop_vault {
    use super::*;

    /// Register a new vault. Called once per owner (PDA seeds = ["vault", owner]).
    pub fn create_vault(ctx: Context<CreateVault>, threshold_days: i64, grace_days: i64) -> Result<()> {
        require!(threshold_days >= MIN_THRESHOLD_DAYS, VaultError::ThresholdTooShort);
        require!(grace_days >= MIN_GRACE_DAYS, VaultError::GracePeriodTooShort);

        let v = &mut ctx.accounts.vault;
        let now = Clock::get()?.unix_timestamp;

        v.owner                  = ctx.accounts.owner.key();
        v.state                  = VaultState::Active;
        v.last_ping              = now;
        v.inactivity_threshold_s = threshold_days * SECONDS_PER_DAY;
        v.grace_period_s         = grace_days * SECONDS_PER_DAY;
        v.multi_sig              = false;
        v.grace_period_start     = 0;
        v.deposited_lamports     = 0;
        v.beneficiaries          = Vec::new();
        v.metadata_cid           = String::new();
        v.final_message_cid      = String::new();
        v.confirmation_count     = 0;
        // Start at 1, not 0 — a Confirmation account defaults to epoch 0 when
        // freshly created, so epoch 0 would look identical to "already
        // confirmed in epoch 0" for a beneficiary who never confirmed
        // (same off-by-one this program's Solidity twin had to fix).
        v.confirmation_epoch     = 1;
        v.bump                   = ctx.bumps.vault;

        emit!(VaultCreated { owner: v.owner, threshold_days, grace_days });
        Ok(())
    }

    /// Record an alive ping. Cancels an in-progress grace period and bumps
    /// confirmation_epoch, invalidating every prior multiSig confirmation —
    /// the exact fix for the bug where a beneficiary who'd already confirmed
    /// could never confirm again after the owner proved they were still alive.
    pub fn ping(ctx: Context<OwnerOnly>) -> Result<()> {
        let v = &mut ctx.accounts.vault;
        require!(v.state != VaultState::Released, VaultError::AlreadyReleased);

        if v.state == VaultState::GracePeriod {
            v.state = VaultState::Active;
            v.confirmation_count = 0;
            v.confirmation_epoch += 1;
            emit!(GracePeriodCancelled { owner: v.owner });
        }

        v.last_ping = Clock::get()?.unix_timestamp;
        emit!(PingRecorded { owner: v.owner, timestamp: v.last_ping });
        Ok(())
    }

    /// Update configuration. Active-only — locked once a grace period starts
    /// so gracePeriodDuration can't be stretched out from under beneficiaries
    /// already waiting on a release.
    pub fn update_settings(
        ctx: Context<OwnerOnly>,
        threshold_days: i64,
        grace_days: i64,
        multi_sig: bool,
        metadata_cid: String,
        final_message_cid: String,
    ) -> Result<()> {
        require!(threshold_days >= MIN_THRESHOLD_DAYS, VaultError::ThresholdTooShort);
        require!(grace_days >= MIN_GRACE_DAYS, VaultError::GracePeriodTooShort);
        require!(metadata_cid.len() <= MAX_CID_LEN, VaultError::CidTooLong);
        require!(final_message_cid.len() <= MAX_CID_LEN, VaultError::CidTooLong);

        let v = &mut ctx.accounts.vault;
        require!(v.state == VaultState::Active, VaultError::MustBeActive);

        v.inactivity_threshold_s = threshold_days * SECONDS_PER_DAY;
        v.grace_period_s         = grace_days * SECONDS_PER_DAY;
        v.multi_sig              = multi_sig;
        v.metadata_cid           = metadata_cid;
        v.final_message_cid      = final_message_cid;

        emit!(SettingsUpdated { owner: v.owner });
        Ok(())
    }

    /// Replace the beneficiary list. Active-only, same reasoning as
    /// update_settings — also resets confirmation state defensively even
    /// though the Active guard already rules out a mid-grace-period swap.
    pub fn set_beneficiaries(
        ctx: Context<OwnerOnly>,
        wallets: Vec<Pubkey>,
        shares_bps: Vec<u16>,
        names: Vec<String>,
    ) -> Result<()> {
        require!(!wallets.is_empty(), VaultError::NoBeneficiaries);
        require!(wallets.len() <= MAX_BENEFICIARIES, VaultError::TooManyBeneficiaries);
        require!(wallets.len() == shares_bps.len() && wallets.len() == names.len(), VaultError::LengthMismatch);

        let mut total: u32 = 0;
        for (w, n) in wallets.iter().zip(names.iter()) {
            require!(*w != Pubkey::default(), VaultError::ZeroAddress);
            require!(n.len() <= MAX_NAME_LEN, VaultError::NameTooLong);
        }
        for s in &shares_bps {
            total += *s as u32;
        }
        require!(total == BPS_DENOMINATOR, VaultError::SharesMustSumTo10000);

        let v = &mut ctx.accounts.vault;
        require!(v.state == VaultState::Active, VaultError::MustBeActive);

        v.confirmation_count  = 0;
        v.confirmation_epoch += 1;

        v.beneficiaries = wallets
            .iter()
            .zip(shares_bps.iter())
            .zip(names.iter())
            .map(|((w, s), n)| Beneficiary { wallet: *w, share_bps: *s, name: n.clone() })
            .collect();

        emit!(BeneficiariesSet { owner: v.owner, count: v.beneficiaries.len() as u32 });
        Ok(())
    }

    /// Deposit SOL into the vault. Requires beneficiaries to already be set
    /// — otherwise a released legacy would have no one able to claim it.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::MustSendSol);
        require!(!ctx.accounts.vault.beneficiaries.is_empty(), VaultError::SetBeneficiariesFirst);

        let ix = system_instruction::transfer(&ctx.accounts.owner.key(), &ctx.accounts.vault.key(), amount);
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let v = &mut ctx.accounts.vault;
        v.deposited_lamports += amount;
        emit!(SolDeposited { owner: v.owner, amount });
        Ok(())
    }

    /// Owner-side escape hatch: withdraw deposited SOL back out, any time
    /// the vault is still Active.
    pub fn withdraw_deposit(ctx: Context<OwnerWithdraw>, amount: u64) -> Result<()> {
        let v = &mut ctx.accounts.vault;
        require!(v.state == VaultState::Active, VaultError::MustBeActive);
        require!(amount > 0 && amount <= v.deposited_lamports, VaultError::InvalidAmount);

        v.deposited_lamports -= amount;
        let owner_key = v.owner; // last use of `v` — its mutable borrow must
                                  // end here, before to_account_info() below
                                  // takes another borrow of the same account.

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += amount;

        emit!(OwnerWithdrew { owner: owner_key, amount });
        Ok(())
    }

    /// Anyone can call this once the owner's inactivity threshold has passed.
    pub fn trigger_grace_period(ctx: Context<TriggerGracePeriod>) -> Result<()> {
        let v = &mut ctx.accounts.vault;
        require!(v.state == VaultState::Active, VaultError::MustBeActive);

        let now = Clock::get()?.unix_timestamp;
        require!(now >= v.last_ping + v.inactivity_threshold_s, VaultError::StillWithinActivityWindow);

        v.state              = VaultState::GracePeriod;
        v.grace_period_start = now;

        emit!(GracePeriodStarted { owner: v.owner, end_time: now + v.grace_period_s });
        Ok(())
    }

    /// Beneficiary calls this once the grace period has fully expired.
    /// Pull-payment pattern: shares are credited into each beneficiary's own
    /// PendingWithdrawal PDA (lamports actually move there), not pushed
    /// directly to their wallet — so one uncooperative/closed account can
    /// never block the others' release.
    pub fn claim_legacy(ctx: Context<ClaimLegacy>) -> Result<()> {
        let vault_key = ctx.accounts.vault.key();
        let now = Clock::get()?.unix_timestamp;

        {
            let v = &ctx.accounts.vault;
            require!(v.state == VaultState::GracePeriod, VaultError::MustBeGracePeriod);
            require!(now >= v.grace_period_start + v.grace_period_s, VaultError::GracePeriodNotOver);
            require!(
                v.beneficiaries.iter().any(|b| b.wallet == ctx.accounts.claimant.key()),
                VaultError::NotABeneficiary
            );
        }

        if ctx.accounts.vault.multi_sig {
            let confirmation = &mut ctx.accounts.confirmation;
            let current_epoch = ctx.accounts.vault.confirmation_epoch;
            require!(confirmation.epoch != current_epoch, VaultError::AlreadyConfirmed);
            confirmation.epoch = current_epoch;
            confirmation.bump  = ctx.bumps.confirmation;

            let v = &mut ctx.accounts.vault;
            v.confirmation_count += 1;
            emit!(MultiSigConfirmed { owner: v.owner, confirmer: ctx.accounts.claimant.key(), count: v.confirmation_count });

            let required = std::cmp::min(v.beneficiaries.len() as u64, 2);
            if v.confirmation_count < required {
                return Ok(()); // waiting on the next confirmation
            }
        }

        // ── Release ──────────────────────────────────────────────────────
        let v = &mut ctx.accounts.vault;
        v.state = VaultState::Released;
        let total = v.deposited_lamports;
        v.deposited_lamports = 0;

        // remaining_accounts must be exactly [beneficiary_wallet_0,
        // pending_pda_0, beneficiary_wallet_1, pending_pda_1, ...] in the
        // same order as vault.beneficiaries, each pending PDA already
        // created client-side (seeds = ["pending", beneficiary_wallet]).
        let beneficiaries = v.beneficiaries.clone();
        let remaining = ctx.remaining_accounts;
        require!(remaining.len() == beneficiaries.len() * 2, VaultError::BadRemainingAccounts);

        for (i, b) in beneficiaries.iter().enumerate() {
            let wallet_info  = &remaining[i * 2];
            let pending_info = &remaining[i * 2 + 1];
            require!(wallet_info.key() == b.wallet, VaultError::BadRemainingAccounts);

            let (expected_pending, _) = Pubkey::find_program_address(
                &[b"pending", b.wallet.as_ref()],
                ctx.program_id,
            );
            require!(pending_info.key() == expected_pending, VaultError::BadRemainingAccounts);
            // Must already be created via init_pending_withdrawal — crediting
            // lamports into a raw, never-initialized address would leave it
            // owned by the System Program with no Anchor discriminator, so
            // withdraw()'s `Account<PendingWithdrawal>` deserialization would
            // fail on it afterward.
            require!(pending_info.owner == ctx.program_id, VaultError::PendingNotInitialized);

            let share = (total as u128 * b.share_bps as u128 / BPS_DENOMINATOR as u128) as u64;
            if share == 0 { continue; }

            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= share;
            **pending_info.try_borrow_mut_lamports()? += share;

            emit!(ShareCredited { owner: vault_key, beneficiary: b.wallet, amount: share });
        }

        emit!(LegacyReleased { owner: vault_key, total_lamports: total });
        Ok(())
    }

    /// Lazily create a beneficiary's PendingWithdrawal PDA. Permissionless
    /// and idempotent (init_if_needed) — anyone can pre-create it for a
    /// beneficiary, the same way an Associated Token Account is often
    /// created by whoever is about to send to it. claim_legacy requires
    /// each beneficiary's PendingWithdrawal to already exist (see its
    /// remaining_accounts validation) since crediting lamports into a raw,
    /// never-initialized address would leave `withdraw()` unable to
    /// deserialize it afterward.
    pub fn init_pending_withdrawal(ctx: Context<InitPendingWithdrawal>) -> Result<()> {
        let p = &mut ctx.accounts.pending;
        p.beneficiary = ctx.accounts.beneficiary.key();
        p.bump = ctx.bumps.pending;
        Ok(())
    }

    /// Pull the caller's own credited share out of their PendingWithdrawal PDA.
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let pending_info = ctx.accounts.pending.to_account_info();
        let rent_exempt_min = Rent::get()?.minimum_balance(pending_info.data_len());
        let balance = pending_info.lamports();
        require!(balance > rent_exempt_min, VaultError::NothingToWithdraw);

        let amount = balance - rent_exempt_min;
        **pending_info.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.beneficiary.to_account_info().try_borrow_mut_lamports()? += amount;

        emit!(Withdrawn { beneficiary: ctx.accounts.beneficiary.key(), amount });
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub state: VaultState,
    pub last_ping: i64,
    pub inactivity_threshold_s: i64,
    pub grace_period_s: i64,
    pub multi_sig: bool,
    pub grace_period_start: i64,
    pub deposited_lamports: u64,
    pub beneficiaries: Vec<Beneficiary>,
    pub metadata_cid: String,
    pub final_message_cid: String,
    pub confirmation_count: u64,
    pub confirmation_epoch: u64,
    pub bump: u8,
}

impl Vault {
    // 8 (discriminator) + fixed fields + Vec<Beneficiary> (4-byte len prefix
    // + MAX_BENEFICIARIES * per-item max size) + two capped CID strings.
    pub const MAX_SIZE: usize = 8
        + 32   // owner
        + 1    // state
        + 8    // last_ping
        + 8    // inactivity_threshold_s
        + 8    // grace_period_s
        + 1    // multi_sig
        + 8    // grace_period_start
        + 8    // deposited_lamports
        + 4 + MAX_BENEFICIARIES * Beneficiary::MAX_SIZE
        + 4 + MAX_CID_LEN
        + 4 + MAX_CID_LEN
        + 8    // confirmation_count
        + 8    // confirmation_epoch
        + 1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct Beneficiary {
    pub wallet: Pubkey,
    pub share_bps: u16,
    pub name: String,
}

impl Beneficiary {
    pub const MAX_SIZE: usize = 32 + 2 + (4 + MAX_NAME_LEN);
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum VaultState {
    Active,
    GracePeriod,
    Released,
}

/// One per (vault, beneficiary) — tracks which confirmation_epoch this
/// beneficiary last confirmed in, mirroring multiSigConfirmedEpoch in
/// DeadDropVault.sol. Only relevant while multi_sig is enabled.
#[account]
pub struct Confirmation {
    pub epoch: u64,
    pub bump: u8,
}
impl Confirmation {
    pub const MAX_SIZE: usize = 8 + 8 + 1;
}

/// One per beneficiary wallet, global (not per-vault) — actually holds the
/// credited lamports, since Solana programs have no single "contract
/// balance" the way an EVM contract does. Mirrors pendingWithdrawals.
#[account]
pub struct PendingWithdrawal {
    pub beneficiary: Pubkey,
    pub bump: u8,
}
impl PendingWithdrawal {
    pub const MAX_SIZE: usize = 8 + 32 + 1;
}

// ─────────────────────────────────────────────────────────────────────────
// ACCOUNTS CONTEXTS
// ─────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = owner,
        space = Vault::MAX_SIZE,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OwnerOnly<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::NotVaultOwner
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::NotVaultOwner
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OwnerWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::NotVaultOwner
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct TriggerGracePeriod<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    /// Anyone may call — mirrors triggerGracePeriod's lack of an owner check.
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimLegacy<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(
        init_if_needed,
        payer = claimant,
        space = Confirmation::MAX_SIZE,
        seeds = [b"confirm", vault.key().as_ref(), claimant.key().as_ref()],
        bump
    )]
    pub confirmation: Account<'info, Confirmation>,
    pub system_program: Program<'info, System>,
    // remaining_accounts: [beneficiary_wallet, pending_pda] pairs, one per
    // vault.beneficiaries entry, in the same order — see claim_legacy's body.
}

#[derive(Accounts)]
pub struct InitPendingWithdrawal<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = PendingWithdrawal::MAX_SIZE,
        seeds = [b"pending", beneficiary.key().as_ref()],
        bump
    )]
    pub pending: Account<'info, PendingWithdrawal>,
    /// CHECK: only used to derive the PDA seed and record which wallet this
    /// belongs to — doesn't need to sign, anyone may pre-create a
    /// beneficiary's PendingWithdrawal account for them (same idea as
    /// permissionless Associated Token Account creation).
    pub beneficiary: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    #[account(
        mut,
        seeds = [b"pending", beneficiary.key().as_ref()],
        bump = pending.bump
    )]
    pub pending: Account<'info, PendingWithdrawal>,
}

// ─────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────

#[event] pub struct VaultCreated        { pub owner: Pubkey, pub threshold_days: i64, pub grace_days: i64 }
#[event] pub struct PingRecorded        { pub owner: Pubkey, pub timestamp: i64 }
#[event] pub struct SettingsUpdated     { pub owner: Pubkey }
#[event] pub struct BeneficiariesSet    { pub owner: Pubkey, pub count: u32 }
#[event] pub struct SolDeposited        { pub owner: Pubkey, pub amount: u64 }
#[event] pub struct OwnerWithdrew       { pub owner: Pubkey, pub amount: u64 }
#[event] pub struct GracePeriodStarted  { pub owner: Pubkey, pub end_time: i64 }
#[event] pub struct GracePeriodCancelled{ pub owner: Pubkey }
#[event] pub struct MultiSigConfirmed   { pub owner: Pubkey, pub confirmer: Pubkey, pub count: u64 }
#[event] pub struct LegacyReleased      { pub owner: Pubkey, pub total_lamports: u64 }
#[event] pub struct ShareCredited       { pub owner: Pubkey, pub beneficiary: Pubkey, pub amount: u64 }
#[event] pub struct Withdrawn           { pub beneficiary: Pubkey, pub amount: u64 }

// ─────────────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum VaultError {
    #[msg("Threshold must be >= 30 days")]            ThresholdTooShort,
    #[msg("Grace period must be >= 7 days")]           GracePeriodTooShort,
    #[msg("Vault must be Active for this action")]     MustBeActive,
    #[msg("Legacy already released")]                  AlreadyReleased,
    #[msg("At least one beneficiary required")]        NoBeneficiaries,
    #[msg("Too many beneficiaries (max 10)")]           TooManyBeneficiaries,
    #[msg("Wallets/shares/names length mismatch")]      LengthMismatch,
    #[msg("Zero address not allowed")]                  ZeroAddress,
    #[msg("Name too long (max 32 chars)")]              NameTooLong,
    #[msg("CID too long (max 64 chars)")]               CidTooLong,
    #[msg("Shares must sum to 10000 (100%)")]           SharesMustSumTo10000,
    #[msg("Must send SOL")]                             MustSendSol,
    #[msg("Set beneficiaries before depositing")]       SetBeneficiariesFirst,
    #[msg("Invalid amount")]                            InvalidAmount,
    #[msg("Owner is still within the activity window")] StillWithinActivityWindow,
    #[msg("Vault must be in GracePeriod state")]        MustBeGracePeriod,
    #[msg("Grace period has not ended yet")]            GracePeriodNotOver,
    #[msg("Caller is not a registered beneficiary")]    NotABeneficiary,
    #[msg("Already confirmed by this address")]         AlreadyConfirmed,
    #[msg("Nothing to withdraw")]                       NothingToWithdraw,
    #[msg("Beneficiary's PendingWithdrawal account must be created first via init_pending_withdrawal")]
    PendingNotInitialized,
    #[msg("Signer is not this vault's owner")]          NotVaultOwner,
    #[msg("remaining_accounts must be [wallet, pending_pda] pairs matching beneficiaries, in order")]
    BadRemainingAccounts,
}
