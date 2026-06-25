const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("DeadDropSafe", function () {
  let safe;
  let owner, alice;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DeadDropSafe");
    safe = await Factory.deploy();
    await safe.waitForDeployment();
  });

  it("adds an entry to the caller's own safe", async function () {
    await expect(safe.connect(owner).addEntry(3, "encLabel", "encCid")) // Password
      .to.emit(safe, "SafeEntryAdded").withArgs(owner.address, 0n, 3);
    expect(await safe.entryCount(owner.address)).to.equal(1n);
  });

  it("isolates entries per address", async function () {
    await safe.connect(owner).addEntry(0, "a", "b");
    await safe.connect(alice).addEntry(1, "c", "d");
    expect(await safe.entryCount(owner.address)).to.equal(1n);
    expect(await safe.entryCount(alice.address)).to.equal(1n);
  });

  it("filters getEntries by category, excluding deleted entries", async function () {
    await safe.connect(owner).addEntry(0, "key1", "cid1");   // CryptoKey
    await safe.connect(owner).addEntry(0, "key2", "cid2");   // CryptoKey
    await safe.connect(owner).addEntry(3, "pw1", "cid3");    // Password
    await safe.connect(owner).removeEntry(0);                // soft-delete key1

    const keys = await safe.getEntries(owner.address, 0);
    expect(keys.length).to.equal(1);
    expect(keys[0].label).to.equal("key2");

    const pwds = await safe.getEntries(owner.address, 3);
    expect(pwds.length).to.equal(1);
  });

  it("getAllEntries returns every non-deleted entry across categories", async function () {
    await safe.connect(owner).addEntry(0, "a", "b");
    await safe.connect(owner).addEntry(4, "c", "d"); // Document
    const all = await safe.getAllEntries(owner.address);
    expect(all.length).to.equal(2);
  });

  it("updateEntry overwrites label/cid and emits SafeEntryUpdated", async function () {
    await safe.connect(owner).addEntry(3, "oldPw", "oldCid");
    await expect(safe.connect(owner).updateEntry(0, "newPw", "newCid"))
      .to.emit(safe, "SafeEntryUpdated").withArgs(owner.address, 0n);

    const all = await safe.getAllEntries(owner.address);
    expect(all[0].label).to.equal("newPw");
    expect(all[0].cid).to.equal("newCid");
  });

  it("reverts updating/removing a deleted entry or invalid id", async function () {
    await safe.connect(owner).addEntry(0, "a", "b");
    await safe.connect(owner).removeEntry(0);
    await expect(safe.connect(owner).updateEntry(0, "x", "y"))
      .to.be.revertedWith("Entry was deleted");
    await expect(safe.connect(owner).updateEntry(5, "x", "y"))
      .to.be.revertedWith("Invalid entry id");
  });

  it("anyone can call getEntries for any address (public ledger, opaque ciphertext)", async function () {
    await safe.connect(owner).addEntry(0, "ciphertextLabel", "ciphertextCid");
    const viewedByAlice = await safe.connect(alice).getEntries(owner.address, 0);
    expect(viewedByAlice.length).to.equal(1);
  });
});
