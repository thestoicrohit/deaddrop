const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("DeadDropCapsules", function () {
  let capsules;
  let owner, alice, bob;

  const DAY = 24 * 60 * 60;
  const advance = (s) => ethers.provider.send("evm_increaseTime", [s]).then(() => ethers.provider.send("evm_mine"));

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DeadDropCapsules");
    capsules = await Factory.deploy();
    await capsules.waitForDeployment();
  });

  describe("createCapsule", function () {
    it("creates a capsule with no time lock by default", async function () {
      await expect(capsules.connect(owner).createCapsule("First Capsule", 0, "preview", 0, 0))
        .to.emit(capsules, "CapsuleCreated").withArgs(1n, owner.address, "First Capsule", 0);

      const c = await capsules.capsules(1);
      expect(c.owner).to.equal(owner.address);
      expect(c.exists).to.be.true;
      expect(await capsules.isUnlocked(1)).to.be.true;
    });

    it("reverts on empty title", async function () {
      await expect(capsules.connect(owner).createCapsule("", 0, "", 0, 0))
        .to.be.revertedWith("Title required");
    });

    it("respects a future unlockDate", async function () {
      const future = Math.floor(Date.now() / 1000) + 30 * DAY;
      await capsules.connect(owner).createCapsule("Time Locked", 2, "preview", 0, future);
      expect(await capsules.isUnlocked(1)).to.be.false;
      await advance(31 * DAY);
      expect(await capsules.isUnlocked(1)).to.be.true;
    });

    it("tracks capsules per owner", async function () {
      await capsules.connect(owner).createCapsule("A", 0, "", 0, 0);
      await capsules.connect(owner).createCapsule("B", 1, "", 0, 0);
      const mine = await capsules.getMyCapsules(owner.address);
      expect(mine.length).to.equal(2);
    });
  });

  describe("content items", function () {
    beforeEach(async function () {
      await capsules.connect(owner).createCapsule("Capsule", 0, "", 0, 0);
    });

    it("owner can add content", async function () {
      await expect(capsules.connect(owner).addContent(1, 0, "QmPhotoCid", "beach.jpg"))
        .to.emit(capsules, "ContentAdded").withArgs(1n, 0n, 0, "QmPhotoCid");
      expect(await capsules.contentCount(1)).to.equal(1n);
    });

    it("reverts if non-owner tries to add content", async function () {
      await expect(capsules.connect(alice).addContent(1, 0, "Qm1", "x"))
        .to.be.revertedWith("Not the capsule owner");
    });

    it("reverts on empty cid", async function () {
      await expect(capsules.connect(owner).addContent(1, 0, "", "x"))
        .to.be.revertedWith("CID required");
    });

    it("removes content via swap-and-pop", async function () {
      await capsules.connect(owner).addContent(1, 0, "Qm1", "a");
      await capsules.connect(owner).addContent(1, 1, "Qm2", "b");
      await capsules.connect(owner).addContent(1, 2, "Qm3", "c");

      await expect(capsules.connect(owner).removeContent(1, 0))
        .to.emit(capsules, "ContentRemoved").withArgs(1n, 0n);

      const items = await capsules.getContent(1);
      expect(items.length).to.equal(2);
      // last item ("c") should have moved into slot 0
      expect(items[0].cid).to.equal("Qm3");
    });
  });

  describe("reactions", function () {
    beforeEach(async function () {
      await capsules.connect(owner).createCapsule("Capsule", 3, "", 0, 0);
    });

    it("toggles a reaction on then off", async function () {
      await expect(capsules.connect(alice).react(1, 1)) // heart
        .to.emit(capsules, "Reacted").withArgs(1n, alice.address, 1, true);

      let counts = await capsules.getReactions(1);
      expect(counts[1]).to.equal(1n);

      await expect(capsules.connect(alice).react(1, 1))
        .to.emit(capsules, "Reacted").withArgs(1n, alice.address, 1, false);

      counts = await capsules.getReactions(1);
      expect(counts[1]).to.equal(0n);
    });

    it("tracks independent reactions per user via bitmask", async function () {
      await capsules.connect(alice).react(1, 0); // candle
      await capsules.connect(bob).react(1, 0);    // candle
      await capsules.connect(bob).react(1, 2);    // blossom

      const counts = await capsules.getReactions(1);
      expect(counts[0]).to.equal(2n); // candle from both
      expect(counts[2]).to.equal(1n); // blossom from bob only

      const bobBits = await capsules.getUserReactions(1, bob.address);
      expect(bobBits).to.equal(0b101); // bits 0 and 2 set
    });

    it("reverts on an invalid reaction index", async function () {
      await expect(capsules.connect(alice).react(1, 5)).to.be.revertedWith("Invalid reaction index");
    });
  });

  describe("updateCapsule / deleteCapsule", function () {
    it("owner can update title/preview", async function () {
      await capsules.connect(owner).createCapsule("Old", 0, "old", 0, 0);
      await capsules.connect(owner).updateCapsule(1, "New", "new preview");
      const c = await capsules.capsules(1);
      expect(c.title).to.equal("New");
    });

    it("owner can soft-delete; further access reverts as nonexistent", async function () {
      await capsules.connect(owner).createCapsule("Gone", 0, "", 0, 0);
      await capsules.connect(owner).deleteCapsule(1);
      await expect(capsules.getContent(1)).to.be.revertedWith("Capsule does not exist");
    });
  });
});
