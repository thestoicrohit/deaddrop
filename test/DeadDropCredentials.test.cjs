const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("DeadDropCredentials", function () {
  let creds;
  let admin, issuer, recipient, stranger;

  beforeEach(async function () {
    [admin, issuer, recipient, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DeadDropCredentials");
    creds = await Factory.deploy();
    await creds.waitForDeployment();
  });

  it("sets the deployer as admin and first verified issuer", async function () {
    expect(await creds.admin()).to.equal(admin.address);
    expect(await creds.verifiedIssuers(admin.address)).to.be.true;
  });

  describe("issuer management", function () {
    it("admin can verify a new issuer", async function () {
      await expect(creds.connect(admin).setIssuer(issuer.address, true))
        .to.emit(creds, "IssuerStatusChanged").withArgs(issuer.address, true);
      expect(await creds.verifiedIssuers(issuer.address)).to.be.true;
    });

    it("reverts if a non-admin tries to set an issuer", async function () {
      await expect(creds.connect(issuer).setIssuer(stranger.address, true))
        .to.be.revertedWith("Not admin");
    });

    it("admin can transfer adminship", async function () {
      await creds.connect(admin).transferAdmin(issuer.address);
      expect(await creds.admin()).to.equal(issuer.address);
    });
  });

  describe("issueCredential", function () {
    beforeEach(async function () {
      await creds.connect(admin).setIssuer(issuer.address, true);
    });

    it("mints a credential NFT to the recipient", async function () {
      await expect(
        creds.connect(issuer).issueCredential(recipient.address, "Degree", "B.Tech CS", "QmMetaCid")
      ).to.emit(creds, "Transfer").withArgs(ethers.ZeroAddress, recipient.address, 1n)
       .and.to.emit(creds, "CredentialIssued").withArgs(1n, issuer.address, recipient.address, "Degree");

      expect(await creds.ownerOf(1)).to.equal(recipient.address);
      expect(await creds.balanceOf(recipient.address)).to.equal(1n);
      expect(await creds.tokenURI(1)).to.equal("ipfs://QmMetaCid");
    });

    it("reverts if the caller is not a verified issuer", async function () {
      await expect(
        creds.connect(stranger).issueCredential(recipient.address, "Degree", "x", "Qm1")
      ).to.be.revertedWith("Not a verified issuer");
    });

    it("tracks credentials per recipient", async function () {
      await creds.connect(issuer).issueCredential(recipient.address, "Degree", "x", "Qm1");
      await creds.connect(issuer).issueCredential(recipient.address, "Equity", "y", "Qm2");
      const tokens = await creds.getCredentialsOf(recipient.address);
      expect(tokens.length).to.equal(2);
    });
  });

  describe("revokeCredential", function () {
    beforeEach(async function () {
      await creds.connect(admin).setIssuer(issuer.address, true);
      await creds.connect(issuer).issueCredential(recipient.address, "Degree", "x", "Qm1");
    });

    it("the issuer can revoke without burning the token", async function () {
      await expect(creds.connect(issuer).revokeCredential(1))
        .to.emit(creds, "CredentialRevoked").withArgs(1n);

      const c = await creds.credentials(1);
      expect(c.revoked).to.be.true;
      expect(await creds.ownerOf(1)).to.equal(recipient.address); // still held
    });

    it("reverts if someone other than the issuer tries to revoke", async function () {
      await expect(creds.connect(admin).revokeCredential(1))
        .to.be.revertedWith("Only the issuer can revoke");
    });
  });

  describe("ERC-721 transfer mechanics", function () {
    beforeEach(async function () {
      await creds.connect(admin).setIssuer(issuer.address, true);
      await creds.connect(issuer).issueCredential(recipient.address, "Degree", "x", "Qm1");
    });

    it("owner can transfer their token", async function () {
      await creds.connect(recipient).transferFrom(recipient.address, stranger.address, 1);
      expect(await creds.ownerOf(1)).to.equal(stranger.address);
      expect(await creds.balanceOf(recipient.address)).to.equal(0n);
    });

    it("approved address can transfer on behalf of the owner", async function () {
      await creds.connect(recipient).approve(issuer.address, 1);
      expect(await creds.getApproved(1)).to.equal(issuer.address);
      await creds.connect(issuer).transferFrom(recipient.address, stranger.address, 1);
      expect(await creds.ownerOf(1)).to.equal(stranger.address);
    });

    it("reverts an unauthorized transfer", async function () {
      await expect(
        creds.connect(stranger).transferFrom(recipient.address, stranger.address, 1)
      ).to.be.revertedWith("Not authorized to transfer");
    });

    it("supportsInterface reports ERC721 / ERC721Metadata / ERC165", async function () {
      expect(await creds.supportsInterface("0x80ac58cd")).to.be.true;
      expect(await creds.supportsInterface("0x5b5e139f")).to.be.true;
      expect(await creds.supportsInterface("0x01ffc9a7")).to.be.true;
      expect(await creds.supportsInterface("0xffffffff")).to.be.false;
    });
  });
});
