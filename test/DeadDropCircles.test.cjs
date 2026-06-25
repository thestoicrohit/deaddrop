const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("DeadDropCircles", function () {
  let circles;
  let owner, alice, bob, stranger;

  beforeEach(async function () {
    [owner, alice, bob, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DeadDropCircles");
    circles = await Factory.deploy();
    await circles.waitForDeployment();
  });

  describe("createCircle", function () {
    it("creates a circle and makes the creator its first Admin", async function () {
      const tx = await circles.connect(owner).createCircle("Sharma Family", "Family", "Our family circle", "Rohit");
      await expect(tx).to.emit(circles, "CircleCreated").withArgs(1n, owner.address, "Sharma Family", "Family");

      const c = await circles.circles(1);
      expect(c.name).to.equal("Sharma Family");
      expect(c.creator).to.equal(owner.address);
      expect(c.exists).to.be.true;

      const members = await circles.getMembers(1);
      expect(members.length).to.equal(1);
      expect(members[0].wallet).to.equal(owner.address);
      expect(members[0].role).to.equal(1); // Admin
    });

    it("increments circleCount across multiple circles", async function () {
      await circles.connect(owner).createCircle("A", "Family", "", "Owner");
      await circles.connect(alice).createCircle("B", "Work", "", "Alice");
      expect(await circles.circleCount()).to.equal(2n);
    });

    it("reverts on an empty name", async function () {
      await expect(circles.connect(owner).createCircle("", "Family", "", "Owner"))
        .to.be.revertedWith("Name required");
    });
  });

  describe("membership", function () {
    beforeEach(async function () {
      await circles.connect(owner).createCircle("Founding Team", "Work", "desc", "Owner");
    });

    it("admin can add a member directly", async function () {
      await expect(circles.connect(owner).addMember(1, alice.address, "Alice", 0))
        .to.emit(circles, "MemberAdded").withArgs(1n, alice.address, "Alice", 0);
      expect(await circles.isMemberOf(1, alice.address)).to.be.true;
      expect(await circles.memberCount(1)).to.equal(2n);
    });

    it("reverts if a non-admin tries to add a member", async function () {
      await circles.connect(owner).addMember(1, alice.address, "Alice", 0); // Member role
      await expect(circles.connect(alice).addMember(1, bob.address, "Bob", 0))
        .to.be.revertedWith("Admin role required");
    });

    it("anyone can self-join via joinCircle", async function () {
      await circles.connect(bob).joinCircle(1, "Bob");
      expect(await circles.isMemberOf(1, bob.address)).to.be.true;
    });

    it("reverts joining twice", async function () {
      await circles.connect(bob).joinCircle(1, "Bob");
      await expect(circles.connect(bob).joinCircle(1, "Bob"))
        .to.be.revertedWith("Already a member");
    });

    it("admin can remove a member (swap-and-pop)", async function () {
      await circles.connect(owner).addMember(1, alice.address, "Alice", 0);
      await circles.connect(owner).addMember(1, bob.address, "Bob", 0);
      expect(await circles.memberCount(1)).to.equal(3n);

      await expect(circles.connect(owner).removeMember(1, alice.address))
        .to.emit(circles, "MemberRemoved").withArgs(1n, alice.address);

      expect(await circles.isMemberOf(1, alice.address)).to.be.false;
      expect(await circles.memberCount(1)).to.equal(2n);
      expect(await circles.isMemberOf(1, bob.address)).to.be.true; // survives swap
    });

    it("admin cannot remove themselves via removeMember", async function () {
      await expect(circles.connect(owner).removeMember(1, owner.address))
        .to.be.revertedWith("Use leaveCircle to remove yourself");
    });

    it("getMyCircles returns circles a wallet belongs to", async function () {
      await circles.connect(bob).joinCircle(1, "Bob");
      const mine = await circles.getMyCircles(bob.address);
      expect(mine.length).to.equal(1);
      expect(mine[0]).to.equal(1n);
    });
  });

  describe("files", function () {
    beforeEach(async function () {
      await circles.connect(owner).createCircle("Circle", "Custom", "", "Owner");
      await circles.connect(alice).joinCircle(1, "Alice");
    });

    it("a member can upload a file", async function () {
      await expect(
        circles.connect(alice).uploadFile(1, "letter.pdf", "QmCidHere", "pdf", 1024)
      ).to.emit(circles, "FileUploaded").withArgs(1n, 0n, alice.address, "letter.pdf", "QmCidHere");

      const files = await circles.getFiles(1);
      expect(files.length).to.equal(1);
      expect(files[0].cid).to.equal("QmCidHere");
    });

    it("reverts upload from a non-member", async function () {
      await expect(
        circles.connect(stranger).uploadFile(1, "x.pdf", "Qm1", "pdf", 10)
      ).to.be.revertedWith("Not a member of this circle");
    });

    it("uploader can remove their own file", async function () {
      await circles.connect(alice).uploadFile(1, "a.pdf", "Qm1", "pdf", 10);
      await expect(circles.connect(alice).removeFile(1, 0))
        .to.emit(circles, "FileRemoved").withArgs(1n, 0n);
      expect(await circles.fileCount(1)).to.equal(0n);
    });

    it("admin can remove someone else's file; other members cannot", async function () {
      await circles.connect(alice).uploadFile(1, "a.pdf", "Qm1", "pdf", 10);
      await circles.connect(bob).joinCircle(1, "Bob");

      await expect(circles.connect(bob).removeFile(1, 0))
        .to.be.revertedWith("Not authorized to remove this file");

      await expect(circles.connect(owner).removeFile(1, 0))
        .to.emit(circles, "FileRemoved");
    });
  });

  describe("updateCircle", function () {
    it("admin can update circle metadata", async function () {
      await circles.connect(owner).createCircle("Old", "Family", "old desc", "Owner");
      await expect(circles.connect(owner).updateCircle(1, "New", "Custom", "new desc"))
        .to.emit(circles, "CircleUpdated").withArgs(1n);

      const c = await circles.circles(1);
      expect(c.name).to.equal("New");
      expect(c.circleType).to.equal("Custom");
    });

    it("reverts updating a nonexistent circle", async function () {
      await expect(circles.connect(owner).updateCircle(99, "X", "Y", "Z"))
        .to.be.revertedWith("Circle does not exist");
    });
  });
});
