// Mirrors test/DeadDropVault.test.cjs (the Solidity suite) scenario-for-
// scenario so the two chains are verified against the same behavior.
//
// Uses anchor-bankrun (solana-bankrun under the hood) instead of a real
// `solana-test-validator`, specifically so the clock can be warped forward
// the same way the Solidity suite uses `evm_increaseTime` — there is no
// other practical way to test a 30-day inactivity threshold / 7-day grace
// period without waiting 30 real days.
//
// NOT YET RUN — no Solana/Anchor toolchain is available in the environment
// this was written in. Sanity-check against whatever anchor-bankrun/
// solana-bankrun API version `npm install` actually resolves before trusting
// this suite; the Clock-warping calls in particular are the most likely spot
// for an API-shape mismatch.

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { startAnchor, BankrunProvider, Clock } from "anchor-bankrun";
import { expect } from "chai";
import IDL from "../target/idl/deaddrop_vault.json";
import type { DeaddropVault } from "../target/types/deaddrop_vault";

const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
const DAY = 86_400;

describe("deaddrop-vault (Solana)", () => {
  let context: Awaited<ReturnType<typeof startAnchor>>;
  let provider: BankrunProvider;
  let program: Program<DeaddropVault>;

  let owner: Keypair, alice: Keypair, bob: Keypair, stranger: Keypair;

  async function airdrop(pubkey: PublicKey, sol = 10) {
    // bankrun seeds accounts via genesis funding rather than a real airdrop
    // RPC — adjust this helper to whatever the installed anchor-bankrun
    // version exposes (`context.setAccount` is the usual escape hatch).
    context.setAccount(pubkey, {
      lamports: sol * LAMPORTS_PER_SOL,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
      rentEpoch: 0,
    } as any);
  }

  async function warpBy(seconds: number) {
    const clock = await context.banksClient.getClock();
    context.setClock(
      new Clock(
        clock.slot,
        clock.epochStartTimestamp,
        clock.epoch,
        clock.leaderScheduleEpoch,
        clock.unixTimestamp + BigInt(seconds)
      )
    );
  }

  function vaultPda(owner: PublicKey) {
    return PublicKey.findProgramAddressSync([Buffer.from("vault"), owner.toBuffer()], PROGRAM_ID)[0];
  }
  function pendingPda(beneficiary: PublicKey) {
    return PublicKey.findProgramAddressSync([Buffer.from("pending"), beneficiary.toBuffer()], PROGRAM_ID)[0];
  }
  function confirmPda(vault: PublicKey, beneficiary: PublicKey) {
    return PublicKey.findProgramAddressSync([Buffer.from("confirm"), vault.toBuffer(), beneficiary.toBuffer()], PROGRAM_ID)[0];
  }

  beforeEach(async () => {
    owner = Keypair.generate();
    alice = Keypair.generate();
    bob = Keypair.generate();
    stranger = Keypair.generate();

    context = await startAnchor("", [], []);
    provider = new BankrunProvider(context);
    program = new anchor.Program(IDL as any, PROGRAM_ID, provider);

    for (const kp of [owner, alice, bob, stranger]) await airdrop(kp.publicKey);
  });

  it("creates a vault with correct defaults", async () => {
    await program.methods
      .createVault(new anchor.BN(90), new anchor.BN(30))
      .accounts({ owner: owner.publicKey })
      .signers([owner])
      .rpc();

    const v = await program.account.vault.fetch(vaultPda(owner.publicKey));
    expect(v.state).to.deep.equal({ active: {} });
    expect(v.inactivityThresholdS.toNumber()).to.equal(90 * DAY);
    expect(v.gracePeriodS.toNumber()).to.equal(30 * DAY);
    expect(v.depositedLamports.toNumber()).to.equal(0);
    expect(v.multiSig).to.equal(false);
  });

  it("reverts if threshold < 30 days", async () => {
    let threw = false;
    try {
      await program.methods.createVault(new anchor.BN(29), new anchor.BN(7))
        .accounts({ owner: owner.publicKey }).signers([owner]).rpc();
    } catch { threw = true; }
    expect(threw).to.equal(true);
  });

  async function createAndFund(o: Keypair, thresholdDays: number, graceDays: number, sol: number) {
    await program.methods.createVault(new anchor.BN(thresholdDays), new anchor.BN(graceDays))
      .accounts({ owner: o.publicKey }).signers([o]).rpc();
  }

  it("reverts depositing before beneficiaries are set", async () => {
    await createAndFund(owner, 30, 7, 0);
    let threw = false;
    try {
      await program.methods.deposit(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({ owner: owner.publicKey }).signers([owner]).rpc();
    } catch { threw = true; }
    expect(threw).to.equal(true);
  });

  it("full single-beneficiary release + withdraw", async () => {
    await createAndFund(owner, 30, 7, 0);
    await program.methods.setBeneficiaries([alice.publicKey], [10000], ["Alice"])
      .accounts({ owner: owner.publicKey }).signers([owner]).rpc();
    await program.methods.deposit(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({ owner: owner.publicKey }).signers([owner]).rpc();

    await warpBy(31 * DAY);
    await program.methods.triggerGracePeriod()
      .accounts({ vault: vaultPda(owner.publicKey), caller: stranger.publicKey })
      .signers([stranger]).rpc();

    await warpBy(8 * DAY);

    const pending = pendingPda(alice.publicKey);
    await program.methods.initPendingWithdrawal()
      .accounts({ pending, beneficiary: alice.publicKey, payer: alice.publicKey })
      .signers([alice]).rpc();

    await program.methods.claimLegacy()
      .accounts({
        vault: vaultPda(owner.publicKey),
        claimant: alice.publicKey,
        confirmation: confirmPda(vaultPda(owner.publicKey), alice.publicKey),
      })
      .remainingAccounts([
        { pubkey: alice.publicKey, isWritable: false, isSigner: false },
        { pubkey: pending, isWritable: true, isSigner: false },
      ])
      .signers([alice])
      .rpc();

    const v = await program.account.vault.fetch(vaultPda(owner.publicKey));
    expect(v.state).to.deep.equal({ released: {} });

    await program.methods.withdraw()
      .accounts({ beneficiary: alice.publicKey, pending })
      .signers([alice]).rpc();
  });

  it("multiSig: lets a beneficiary re-confirm after the owner pings and a later grace period starts", async () => {
    // Regression test for the exact bug fixed on the Solidity side: ping()
    // must invalidate a prior confirmation, not just reset the counter.
    await createAndFund(owner, 30, 7, 0);
    await program.methods.setBeneficiaries(
      [alice.publicKey, bob.publicKey], [5000, 5000], ["Alice", "Bob"]
    ).accounts({ owner: owner.publicKey }).signers([owner]).rpc();
    await program.methods.updateSettings(new anchor.BN(30), new anchor.BN(7), true, "", "")
      .accounts({ owner: owner.publicKey }).signers([owner]).rpc();
    await program.methods.deposit(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({ owner: owner.publicKey }).signers([owner]).rpc();

    const vault = vaultPda(owner.publicKey);

    // First grace period: Alice confirms, then owner pings to cancel it.
    await warpBy(31 * DAY);
    await program.methods.triggerGracePeriod()
      .accounts({ vault, caller: stranger.publicKey }).signers([stranger]).rpc();
    await warpBy(8 * DAY);

    for (const b of [alice, bob]) {
      await program.methods.initPendingWithdrawal()
        .accounts({ pending: pendingPda(b.publicKey), beneficiary: b.publicKey, payer: b.publicKey })
        .signers([b]).rpc();
    }

    await program.methods.claimLegacy()
      .accounts({ vault, claimant: alice.publicKey, confirmation: confirmPda(vault, alice.publicKey) })
      .remainingAccounts([
        { pubkey: alice.publicKey, isWritable: false, isSigner: false },
        { pubkey: pendingPda(alice.publicKey), isWritable: true, isSigner: false },
        { pubkey: bob.publicKey, isWritable: false, isSigner: false },
        { pubkey: pendingPda(bob.publicKey), isWritable: true, isSigner: false },
      ])
      .signers([alice]).rpc();
    await program.methods.ping().accounts({ owner: owner.publicKey }).signers([owner]).rpc();

    // Second grace period: Alice must be able to confirm again.
    await warpBy(31 * DAY);
    await program.methods.triggerGracePeriod()
      .accounts({ vault, caller: stranger.publicKey }).signers([stranger]).rpc();
    await warpBy(8 * DAY);

    let threw = false;
    try {
      await program.methods.claimLegacy()
        .accounts({ vault, claimant: alice.publicKey, confirmation: confirmPda(vault, alice.publicKey) })
        .remainingAccounts([
          { pubkey: alice.publicKey, isWritable: false, isSigner: false },
          { pubkey: pendingPda(alice.publicKey), isWritable: true, isSigner: false },
          { pubkey: bob.publicKey, isWritable: false, isSigner: false },
          { pubkey: pendingPda(bob.publicKey), isWritable: true, isSigner: false },
        ])
        .signers([alice]).rpc();
    } catch { threw = true; }
    expect(threw).to.equal(false); // must NOT revert — this is the regression check
  });

  it("updateSettings reverts once a grace period has started", async () => {
    await createAndFund(owner, 30, 7, 0);
    await warpBy(31 * DAY);
    await program.methods.triggerGracePeriod()
      .accounts({ vault: vaultPda(owner.publicKey), caller: stranger.publicKey }).signers([stranger]).rpc();

    let threw = false;
    try {
      await program.methods.updateSettings(new anchor.BN(30), new anchor.BN(3650), false, "", "")
        .accounts({ owner: owner.publicKey }).signers([owner]).rpc();
    } catch { threw = true; }
    expect(threw).to.equal(true);
  });
});
