const { expect }  = require("chai");
const { ethers }  = require("hardhat");

describe("DeadDropVault", function () {
  let vault;
  let owner, alice, bob, stranger;

  beforeEach(async function () {
    [owner, alice, bob, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DeadDropVault");
    vault = await Factory.deploy();
    await vault.waitForDeployment();
  });

  // ── helpers ─────────────────────────────────────────────────────────────────
  const DAY = 24 * 60 * 60;
  const advance = (s) => ethers.provider.send("evm_increaseTime", [s]).then(() => ethers.provider.send("evm_mine"));

  // ── createVault ─────────────────────────────────────────────────────────────
  describe("createVault", function () {
    it("creates a vault with correct defaults", async function () {
      await vault.connect(owner).createVault(90, 30);
      expect(await vault.hasVault(owner.address)).to.be.true;

      const info = await vault.getVaultInfo(owner.address);
      expect(info.state).to.equal(0);                                   // Active
      expect(info.inactivityThreshold).to.equal(BigInt(90 * DAY));
      expect(info.gracePeriodDuration ).to.equal(BigInt(30 * DAY));
      expect(info.depositedETH        ).to.equal(0n);
      expect(info.multiSig            ).to.be.false;
    });

    it("reverts if threshold < 30 days", async function () {
      await expect(vault.connect(owner).createVault(29, 7))
        .to.be.revertedWith("Threshold must be >= 30 days");
    });

    it("reverts if grace period < 7 days", async function () {
      await expect(vault.connect(owner).createVault(30, 6))
        .to.be.revertedWith("Grace period must be >= 7 days");
    });

    it("reverts on duplicate creation", async function () {
      await vault.connect(owner).createVault(90, 30);
      await expect(vault.connect(owner).createVault(90, 30))
        .to.be.revertedWith("Vault already exists for this address");
    });

    it("increments vaultOwners array", async function () {
      await vault.connect(owner).createVault(90, 30);
      await vault.connect(alice).createVault(90, 30);
      expect(await vault.getVaultCount()).to.equal(2n);
    });
  });

  // ── ping ────────────────────────────────────────────────────────────────────
  describe("ping", function () {
    beforeEach(async () => { await vault.connect(owner).createVault(90, 30); });

    it("updates lastPing and emits PingRecorded", async function () {
      const tx  = await vault.connect(owner).ping();
      const rec = await tx.wait();
      const blk = await ethers.provider.getBlock(rec.blockNumber);
      const info = await vault.getVaultInfo(owner.address);
      expect(info.lastPing).to.equal(BigInt(blk.timestamp));
    });

    it("cancels an active grace period when owner pings back", async function () {
      await vault.connect(owner).setBeneficiaries(
        [alice.address], [10000], ["Alice"]
      );
      await advance(91 * DAY);
      await vault.triggerGracePeriod(owner.address);
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(1); // GracePeriod

      await vault.connect(owner).ping();
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(0); // Active again
    });
  });

  // ── setBeneficiaries ────────────────────────────────────────────────────────
  describe("setBeneficiaries", function () {
    beforeEach(async () => { await vault.connect(owner).createVault(90, 30); });

    it("sets beneficiaries and reads them back", async function () {
      await vault.connect(owner).setBeneficiaries(
        [alice.address, bob.address],
        [6000, 4000],
        ["Alice", "Bob"]
      );
      const bens = await vault.getBeneficiaries(owner.address);
      expect(bens.wallets[0]).to.equal(alice.address);
      expect(bens.shares[0] ).to.equal(6000n);
      expect(bens.names[0]  ).to.equal("Alice");
      expect(bens.wallets[1]).to.equal(bob.address);
      expect(bens.shares[1] ).to.equal(4000n);
    });

    it("reverts when shares do not sum to 10000", async function () {
      await expect(
        vault.connect(owner).setBeneficiaries([alice.address], [9000], ["Alice"])
      ).to.be.revertedWith("Shares must sum to 10000 (100%)");
    });

    it("replaces previous beneficiaries on second call", async function () {
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await vault.connect(owner).setBeneficiaries([bob.address],   [10000], ["Bob"]);
      const bens = await vault.getBeneficiaries(owner.address);
      expect(bens.wallets.length).to.equal(1);
      expect(bens.wallets[0]).to.equal(bob.address);
    });
  });

  // ── depositETH ──────────────────────────────────────────────────────────────
  describe("depositETH", function () {
    beforeEach(async () => {
      await vault.connect(owner).createVault(90, 30);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
    });

    it("reverts if beneficiaries have not been set yet", async function () {
      await vault.connect(bob).createVault(90, 30);
      await expect(
        vault.connect(bob).depositETH({ value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Set beneficiaries before depositing");
    });

    it("accepts ETH and records the balance", async function () {
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });
      const info = await vault.getVaultInfo(owner.address);
      expect(info.depositedETH).to.equal(ethers.parseEther("1.0"));
    });

    it("accumulates multiple deposits", async function () {
      await vault.connect(owner).depositETH({ value: ethers.parseEther("0.5") });
      await vault.connect(owner).depositETH({ value: ethers.parseEther("0.5") });
      const info = await vault.getVaultInfo(owner.address);
      expect(info.depositedETH).to.equal(ethers.parseEther("1.0"));
    });
  });

  // ── triggerGracePeriod ──────────────────────────────────────────────────────
  describe("triggerGracePeriod", function () {
    beforeEach(async () => {
      await vault.connect(owner).createVault(90, 30);
    });

    it("transitions to GracePeriod after threshold", async function () {
      await advance(91 * DAY);
      await vault.triggerGracePeriod(owner.address);
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(1);
    });

    it("reverts if owner is still active", async function () {
      await expect(vault.triggerGracePeriod(owner.address))
        .to.be.revertedWith("Owner is still within the activity window");
    });
  });

  // ── claimLegacy (full flow) ─────────────────────────────────────────────────
  describe("claimLegacy — full release flow", function () {
    it("credits each beneficiary's share proportionally (pull-payment)", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries(
        [alice.address, bob.address],
        [7000, 3000],
        ["Alice", "Bob"]
      );
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      // Simulate inactivity
      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);

      // Grace period expires
      await advance(8 * DAY);

      // Releasing only *credits* the ledger — no ETH moves to beneficiaries yet.
      await vault.connect(alice).claimLegacy(owner.address);

      expect(await vault.pendingWithdrawals(alice.address)).to.equal(ethers.parseEther("0.7"));
      expect(await vault.pendingWithdrawals(bob.address  )).to.equal(ethers.parseEther("0.3"));
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(2); // Released
    });

    it("lets each beneficiary withdraw their own credited share", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries(
        [alice.address, bob.address],
        [7000, 3000],
        ["Alice", "Bob"]
      );
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);
      await vault.connect(alice).claimLegacy(owner.address);

      const bobBefore = await ethers.provider.getBalance(bob.address);
      await vault.connect(bob).withdraw();
      const bobAfter = await ethers.provider.getBalance(bob.address);

      expect(bobAfter - bobBefore).to.be.closeTo(
        ethers.parseEther("0.3"), ethers.parseEther("0.01") // minus gas
      );
      // Ledger is zeroed; a second withdraw reverts.
      expect(await vault.pendingWithdrawals(bob.address)).to.equal(0n);
      await expect(vault.connect(bob).withdraw()).to.be.revertedWith("Nothing to withdraw");
    });

    it("a beneficiary that rejects ETH cannot block the others (DoS resistance)", async function () {
      // Deploy a contract that reverts on receiving ETH, and make it a beneficiary.
      const Reject = await ethers.getContractFactory("RejectETH");
      const rejecter = await Reject.deploy();
      await rejecter.waitForDeployment();
      const rejecterAddr = await rejecter.getAddress();

      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries(
        [rejecterAddr, bob.address],
        [5000, 5000],
        ["Rejecter", "Bob"]
      );
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);

      // Release succeeds even though one beneficiary rejects ETH...
      await vault.connect(bob).claimLegacy(owner.address);
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(2); // Released

      // ...and Bob can pull his share regardless of the rejecter.
      const bobBefore = await ethers.provider.getBalance(bob.address);
      await vault.connect(bob).withdraw();
      const bobAfter = await ethers.provider.getBalance(bob.address);
      expect(bobAfter - bobBefore).to.be.closeTo(
        ethers.parseEther("0.5"), ethers.parseEther("0.01")
      );

      // The rejecter still has a credited balance it simply can't pull.
      expect(await vault.pendingWithdrawals(rejecterAddr)).to.equal(ethers.parseEther("0.5"));
      await expect(rejecter.withdrawFrom(await vault.getAddress()))
        .to.be.revertedWith("withdraw failed");
    });

    it("reverts if caller is not a beneficiary", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);

      await expect(vault.connect(stranger).claimLegacy(owner.address))
        .to.be.revertedWith("Caller is not a registered beneficiary");
    });

    it("reverts if grace period has not expired yet", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);

      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      // Grace period is 7 days — only advance 3 days
      await advance(3 * DAY);

      await expect(vault.connect(alice).claimLegacy(owner.address))
        .to.be.revertedWith("Grace period has not ended yet");
    });

    it("reverts if the vault is still Active (grace period never triggered)", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await expect(vault.connect(alice).claimLegacy(owner.address))
        .to.be.revertedWith("Vault must be in GracePeriod state");
    });
  });

  // ── onlyVaultOwner access-control-denial ────────────────────────────────────
  describe("onlyVaultOwner guard", function () {
    it("reverts ping/updateSettings/setBeneficiaries/depositETH/withdrawDeposit for an address with no vault", async function () {
      const revert = "No vault for this address. Call createVault first";
      await expect(vault.connect(stranger).ping()).to.be.revertedWith(revert);
      await expect(vault.connect(stranger).updateSettings(30, 7, false, "", "")).to.be.revertedWith(revert);
      await expect(vault.connect(stranger).setBeneficiaries([alice.address], [10000], ["Alice"])).to.be.revertedWith(revert);
      await expect(vault.connect(stranger).depositETH({ value: 1 })).to.be.revertedWith(revert);
      await expect(vault.connect(stranger).withdrawDeposit(1)).to.be.revertedWith(revert);
    });
  });

  // ── multiSig ────────────────────────────────────────────────────────────────
  describe("multiSig claim", function () {
    it("requires 2 confirmations when multiSig is enabled", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).updateSettings(30, 7, true, "", "");
      await vault.connect(owner).setBeneficiaries(
        [alice.address, bob.address],
        [5000, 5000],
        ["Alice", "Bob"]
      );
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);

      // First confirmation — should NOT release yet
      await vault.connect(alice).claimLegacy(owner.address);
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(1); // Still GracePeriod

      // Second confirmation — should release
      await vault.connect(bob).claimLegacy(owner.address);
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(2); // Released
    });

    it("does not deadlock a single-beneficiary vault when multiSig is on", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).updateSettings(30, 7, true, "", "");
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);

      // With only one beneficiary, the requirement caps at 1 — a single
      // confirmation releases instead of waiting forever for a second.
      await vault.connect(alice).claimLegacy(owner.address);
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(2); // Released
      expect(await vault.pendingWithdrawals(alice.address)).to.equal(ethers.parseEther("1.0"));
    });

    it("reverts a second confirmation from the same beneficiary in the same grace period", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).updateSettings(30, 7, true, "", "");
      await vault.connect(owner).setBeneficiaries(
        [alice.address, bob.address],
        [5000, 5000],
        ["Alice", "Bob"]
      );
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);

      await vault.connect(alice).claimLegacy(owner.address);
      await expect(vault.connect(alice).claimLegacy(owner.address))
        .to.be.revertedWith("Already confirmed by this address");
    });

    it("lets a beneficiary confirm again after the owner pings and a later grace period starts", async function () {
      // Regression test for the bug where ping() reset confirmationCount but
      // left the per-beneficiary "already confirmed" flag set forever,
      // permanently locking that beneficiary out of ever confirming again.
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).updateSettings(30, 7, true, "", "");
      await vault.connect(owner).setBeneficiaries(
        [alice.address, bob.address],
        [5000, 5000],
        ["Alice", "Bob"]
      );
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      // First grace period: Alice confirms, then the owner pings and cancels it.
      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);
      await vault.connect(alice).claimLegacy(owner.address);
      await vault.connect(owner).ping();
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(0); // back to Active

      // Second grace period: Alice must be able to confirm again.
      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);
      await advance(8 * DAY);
      await expect(vault.connect(alice).claimLegacy(owner.address)).to.not.be.reverted;
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(1); // waiting on Bob

      await vault.connect(bob).claimLegacy(owner.address);
      expect((await vault.getVaultInfo(owner.address)).state).to.equal(2); // Released
    });
  });

  // ── updateSettings ──────────────────────────────────────────────────────────
  describe("updateSettings", function () {
    it("updates threshold and grace period", async function () {
      await vault.connect(owner).createVault(90, 30);
      await vault.connect(owner).updateSettings(180, 60, true, "QmABC123", "QmXYZ456");

      const info = await vault.getVaultInfo(owner.address);
      expect(info.inactivityThreshold).to.equal(BigInt(180 * DAY));
      expect(info.gracePeriodDuration ).to.equal(BigInt(60  * DAY));
      expect(info.multiSig            ).to.be.true;
    });

    it("reverts once a grace period has started, so the wait can't be stretched out mid-flight", async function () {
      await vault.connect(owner).createVault(30, 7);
      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);

      await expect(vault.connect(owner).updateSettings(30, 3650, false, "", ""))
        .to.be.revertedWith("Vault must be Active to update settings");
    });
  });

  // ── setBeneficiaries state guard ────────────────────────────────────────────
  describe("setBeneficiaries state guard", function () {
    it("reverts once a grace period has started, so the beneficiary set can't shift under a pending release", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);

      await expect(
        vault.connect(owner).setBeneficiaries([bob.address], [10000], ["Bob"])
      ).to.be.revertedWith("Vault must be Active to change beneficiaries");
    });
  });

  // ── withdrawDeposit ──────────────────────────────────────────────────────────
  describe("withdrawDeposit", function () {
    it("lets the owner recover deposited ETH while Active", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await expect(
        vault.connect(owner).withdrawDeposit(ethers.parseEther("0.4"))
      ).to.changeEtherBalance(owner, ethers.parseEther("0.4"));

      const info = await vault.getVaultInfo(owner.address);
      expect(info.depositedETH).to.equal(ethers.parseEther("0.6"));
    });

    it("reverts once a grace period has started", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });
      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);

      await expect(vault.connect(owner).withdrawDeposit(ethers.parseEther("0.1")))
        .to.be.revertedWith("Can only withdraw while Active");
    });

    it("reverts withdrawing more than the current deposit", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await vault.connect(owner).depositETH({ value: ethers.parseEther("1.0") });

      await expect(vault.connect(owner).withdrawDeposit(ethers.parseEther("1.1")))
        .to.be.revertedWith("Invalid amount");
    });
  });

  // ── getVaultCIDs ────────────────────────────────────────────────────────────
  describe("getVaultCIDs", function () {
    it("returns empty strings before any CID has been set", async function () {
      await vault.connect(owner).createVault(90, 30);
      const cids = await vault.getVaultCIDs(owner.address);
      expect(cids.metadataCID).to.equal("");
      expect(cids.finalMessageCID).to.equal("");
    });

    it("reads back the CIDs set via updateSettings", async function () {
      await vault.connect(owner).createVault(90, 30);
      await vault.connect(owner).updateSettings(180, 60, true, "QmABC123", "QmXYZ456");

      const cids = await vault.getVaultCIDs(owner.address);
      expect(cids.metadataCID    ).to.equal("QmABC123");
      expect(cids.finalMessageCID).to.equal("QmXYZ456");
    });

    it("reverts for an address with no vault", async function () {
      await expect(vault.getVaultCIDs(stranger.address))
        .to.be.revertedWith("Vault does not exist");
    });
  });

  // ── Chainlink Automation ─────────────────────────────────────────────────────
  describe("Chainlink Automation (checkUpkeep / performUpkeep)", function () {
    it("checkUpkeep returns false when no vaults are overdue", async function () {
      await vault.connect(owner).createVault(90, 30);
      const [needed] = await vault.checkUpkeep("0x");
      expect(needed).to.be.false;
    });

    it("checkUpkeep returns true and encodes owner when vault is overdue", async function () {
      await vault.connect(owner).createVault(30, 7);
      await advance(31 * DAY);

      const [needed, performData] = await vault.checkUpkeep("0x");
      expect(needed).to.be.true;

      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["address"], performData);
      expect(decoded[0].toLowerCase()).to.equal(owner.address.toLowerCase());
    });

    it("performUpkeep transitions vault to GracePeriod and emits event", async function () {
      await vault.connect(owner).createVault(30, 7);
      await advance(31 * DAY);

      const [, performData] = await vault.checkUpkeep("0x");
      await expect(vault.performUpkeep(performData))
        .to.emit(vault, "GracePeriodStarted")
        .withArgs(owner.address, await ethers.provider.getBlock("latest").then(b => BigInt(b.timestamp + 1 + 7 * DAY)));

      const info = await vault.getVaultInfo(owner.address);
      expect(info.state).to.equal(1); // GracePeriod
    });

    it("performUpkeep reverts if vault is no longer Active (double-trigger guard)", async function () {
      await vault.connect(owner).createVault(30, 7);
      await advance(31 * DAY);

      const [, performData] = await vault.checkUpkeep("0x");
      await vault.performUpkeep(performData);

      // Second call should revert because state is now GracePeriod
      await expect(vault.performUpkeep(performData))
        .to.be.revertedWith("Vault not Active");
    });

    it("checkUpkeep returns false after performUpkeep fires (vault no longer Active)", async function () {
      await vault.connect(owner).createVault(30, 7);
      await advance(31 * DAY);

      const [, performData] = await vault.checkUpkeep("0x");
      await vault.performUpkeep(performData);

      const [needed] = await vault.checkUpkeep("0x");
      expect(needed).to.be.false;
    });

    it("performUpkeep reverts if owner is still within activity window", async function () {
      await vault.connect(owner).createVault(90, 30);
      const [, performData] = await vault.checkUpkeep("0x");
      // encode owner manually — vault is Active but not yet overdue
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [owner.address]);
      await expect(vault.performUpkeep(encoded))
        .to.be.revertedWith("Still within activity window");
    });

    it("checkUpkeep picks up a second vault if the first is already in GracePeriod", async function () {
      const [,, charlie] = await ethers.getSigners();
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(charlie).createVault(30, 7);

      await advance(31 * DAY);
      // Trigger owner's vault manually so it leaves Active
      await vault.triggerGracePeriod(owner.address);

      // checkUpkeep should now point at charlie
      const [needed, performData] = await vault.checkUpkeep("0x");
      expect(needed).to.be.true;
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["address"], performData);
      expect(decoded[0].toLowerCase()).to.equal(charlie.address.toLowerCase());
    });

    it("checkUpkeep honours a (start,end) index window in checkData", async function () {
      const [,, charlie] = await ethers.getSigners();
      // Index 0 = owner (kept active), index 1 = charlie (goes overdue).
      await vault.connect(owner).createVault(90, 30);   // stays active
      await vault.connect(charlie).createVault(30, 7);  // will go overdue
      await advance(31 * DAY);

      // Window [0,1) covers only the still-active owner → no upkeep needed.
      const windowFirst = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [0, 1]);
      const [neededFirst] = await vault.checkUpkeep(windowFirst);
      expect(neededFirst).to.be.false;

      // Window [1,2) covers the overdue charlie → upkeep needed, points at charlie.
      const windowSecond = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [1, 2]);
      const [neededSecond, performData] = await vault.checkUpkeep(windowSecond);
      expect(neededSecond).to.be.true;
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["address"], performData);
      expect(decoded[0].toLowerCase()).to.equal(charlie.address.toLowerCase());
    });

    it("checkUpkeep clamps an end index beyond the array length", async function () {
      await vault.connect(owner).createVault(30, 7);
      await advance(31 * DAY);
      // end = 999 is clamped to vaultOwners.length, so the overdue vault is found.
      const window = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [0, 999]);
      const [needed] = await vault.checkUpkeep(window);
      expect(needed).to.be.true;
    });
  });

  // ── view helpers ────────────────────────────────────────────────────────────
  describe("view helpers", function () {
    it("getNextPingDeadline returns lastPing + threshold", async function () {
      await vault.connect(owner).createVault(90, 30);
      const info     = await vault.getVaultInfo(owner.address);
      const deadline = await vault.getNextPingDeadline(owner.address);
      expect(deadline).to.equal(info.lastPing + info.inactivityThreshold);
    });

    it("isGracePeriodOver returns false before expiry and true after", async function () {
      await vault.connect(owner).createVault(30, 7);
      await vault.connect(owner).setBeneficiaries([alice.address], [10000], ["Alice"]);
      await advance(31 * DAY);
      await vault.triggerGracePeriod(owner.address);

      expect(await vault.isGracePeriodOver(owner.address)).to.be.false;
      await advance(8 * DAY);
      expect(await vault.isGracePeriodOver(owner.address)).to.be.true;
    });
  });
});
