const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("DeadDropKeyRegistry", function () {
  let registry;
  let owner, alice;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DeadDropKeyRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  it("reverts on a public key that isn't 64 bytes", async function () {
    await expect(registry.connect(owner).registerPublicKey("0x1234"))
      .to.be.revertedWith("Public key must be 64 bytes");
  });

  it("registers a 64-byte identity key for the caller", async function () {
    const key = ethers.hexlify(ethers.randomBytes(64));

    await expect(registry.connect(owner).registerPublicKey(key))
      .to.emit(registry, "PublicKeyRegistered")
      .withArgs(owner.address);

    expect(await registry.hasPublicKey(owner.address)).to.be.true;
    expect(await registry.getPublicKey(owner.address)).to.equal(key);
  });

  it("does not require the key to derive to the sender's address", async function () {
    // Identity keys are deterministically derived from a signature, not the
    // wallet's native secp256k1 key — there is no address-derivation
    // relationship to enforce. Any 64-byte value the caller submits for
    // themselves is accepted.
    const key = ethers.hexlify(ethers.randomBytes(64));
    await expect(registry.connect(owner).registerPublicKey(key)).to.not.be.reverted;
  });

  it("lets a wallet overwrite its own previously registered key", async function () {
    const keyA = ethers.hexlify(ethers.randomBytes(64));
    const keyB = ethers.hexlify(ethers.randomBytes(64));

    await registry.connect(owner).registerPublicKey(keyA);
    await registry.connect(owner).registerPublicKey(keyB);

    expect(await registry.getPublicKey(owner.address)).to.equal(keyB);
  });

  it("isolates registrations per address", async function () {
    const ownerKey = ethers.hexlify(ethers.randomBytes(64));
    const aliceKey = ethers.hexlify(ethers.randomBytes(64));

    await registry.connect(owner).registerPublicKey(ownerKey);
    await registry.connect(alice).registerPublicKey(aliceKey);

    expect(await registry.getPublicKey(owner.address)).to.equal(ownerKey);
    expect(await registry.getPublicKey(alice.address)).to.equal(aliceKey);
  });

  it("hasPublicKey is false for an address that never registered", async function () {
    expect(await registry.hasPublicKey(alice.address)).to.be.false;
    expect(await registry.getPublicKey(alice.address)).to.equal("0x");
  });
});
