import { expect } from "chai";
import { ethers } from "hardhat";
import { HYD } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("HYD Token", function () {
  // Fixture for deploying HYD token
  async function deployHYDFixture() {
    const [owner, psm, user1, user2, blacklisted] = await ethers.getSigners();

    const HYD = await ethers.getContractFactory("HYD");
    const hyd = await HYD.deploy(psm.address);

    return { hyd, owner, psm, user1, user2, blacklisted };
  }

  describe("Deployment", function () {
    it("should have correct name and symbol", async function () {
      const { hyd } = await loadFixture(deployHYDFixture);

      expect(await hyd.name()).to.equal("Hydra");
      expect(await hyd.symbol()).to.equal("HYD");
    });

    it("should have 18 decimals", async function () {
      const { hyd } = await loadFixture(deployHYDFixture);

      expect(await hyd.decimals()).to.equal(18);
    });

    it("should start with zero total supply", async function () {
      const { hyd } = await loadFixture(deployHYDFixture);

      expect(await hyd.totalSupply()).to.equal(0);
    });

    it("should set PSM address correctly", async function () {
      const { hyd, psm } = await loadFixture(deployHYDFixture);

      expect(await hyd.PSM()).to.equal(psm.address);
    });

    it("should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const { hyd, owner } = await loadFixture(deployHYDFixture);

      const DEFAULT_ADMIN_ROLE = await hyd.DEFAULT_ADMIN_ROLE();
      expect(await hyd.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("should grant PAUSER_ROLE to deployer", async function () {
      const { hyd, owner } = await loadFixture(deployHYDFixture);

      const PAUSER_ROLE = await hyd.PAUSER_ROLE();
      expect(await hyd.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("should grant BLACKLISTER_ROLE to deployer", async function () {
      const { hyd, owner } = await loadFixture(deployHYDFixture);

      const BLACKLISTER_ROLE = await hyd.BLACKLISTER_ROLE();
      expect(await hyd.hasRole(BLACKLISTER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Functional Tests - Mint/Burn", function () {
    it("should allow PSM to mint tokens", async function () {
      const { hyd, psm, user1 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      expect(await hyd.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await hyd.totalSupply()).to.equal(mintAmount);
    });

    it("should allow PSM to burn tokens", async function () {
      const { hyd, psm, user1 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const burnAmount = ethers.parseEther("400");
      await hyd.connect(user1).approve(psm.address, burnAmount);
      await hyd.connect(psm).burnFrom(user1.address, burnAmount);

      expect(await hyd.balanceOf(user1.address)).to.equal(ethers.parseEther("600"));
      expect(await hyd.totalSupply()).to.equal(ethers.parseEther("600"));
    });

    it("should NOT allow non-PSM to mint tokens", async function () {
      const { hyd, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");

      await expect(
        hyd.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWith("HYD: Only PSM can mint");
    });

    it("should NOT allow non-PSM to burn tokens", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      // Mint some tokens first
      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      // Try to burn from non-PSM account
      const burnAmount = ethers.parseEther("400");
      await hyd.connect(user1).approve(user2.address, burnAmount);

      await expect(
        hyd.connect(user2).burnFrom(user1.address, burnAmount)
      ).to.be.revertedWith("HYD: Only PSM can burn");
    });
  });

  describe("Functional Tests - Transfers", function () {
    it("should allow transfers between users", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const transferAmount = ethers.parseEther("300");
      await hyd.connect(user1).transfer(user2.address, transferAmount);

      expect(await hyd.balanceOf(user1.address)).to.equal(ethers.parseEther("700"));
      expect(await hyd.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("should emit Transfer event on transfer", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const transferAmount = ethers.parseEther("300");

      await expect(hyd.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(hyd, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
    });
  });

  describe("Boundary Tests", function () {
    it("should handle zero amount mints", async function () {
      const { hyd, psm, user1 } = await loadFixture(deployHYDFixture);

      await hyd.connect(psm).mint(user1.address, 0);

      expect(await hyd.balanceOf(user1.address)).to.equal(0);
    });

    it("should handle max uint256 balance", async function () {
      const { hyd, psm, user1 } = await loadFixture(deployHYDFixture);

      const maxUint256 = ethers.MaxUint256;
      await hyd.connect(psm).mint(user1.address, maxUint256);

      expect(await hyd.balanceOf(user1.address)).to.equal(maxUint256);
    });

    it("should revert on transfer exceeding balance", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("100");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const excessiveAmount = ethers.parseEther("200");

      await expect(
        hyd.connect(user1).transfer(user2.address, excessiveAmount)
      ).to.be.revertedWithCustomError(hyd, "ERC20InsufficientBalance");
    });
  });

  describe("Exception Tests", function () {
    it("should revert when minting to zero address", async function () {
      const { hyd, psm } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");

      await expect(
        hyd.connect(psm).mint(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWithCustomError(hyd, "ERC20InvalidReceiver");
    });

    it("should revert when transferring to zero address", async function () {
      const { hyd, psm, user1 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      await expect(
        hyd.connect(user1).transfer(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWithCustomError(hyd, "ERC20InvalidReceiver");
    });

    it("should revert when burning more than balance", async function () {
      const { hyd, psm, user1 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("100");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const excessiveBurn = ethers.parseEther("200");
      await hyd.connect(user1).approve(psm.address, excessiveBurn);

      await expect(
        hyd.connect(psm).burnFrom(user1.address, excessiveBurn)
      ).to.be.revertedWithCustomError(hyd, "ERC20InsufficientBalance");
    });
  });

  describe("Pausable Tests", function () {
    it("should allow admin to pause contract", async function () {
      const { hyd, owner } = await loadFixture(deployHYDFixture);

      await hyd.connect(owner).pause();

      expect(await hyd.paused()).to.be.true;
    });

    it("should allow admin to unpause contract", async function () {
      const { hyd, owner } = await loadFixture(deployHYDFixture);

      await hyd.connect(owner).pause();
      await hyd.connect(owner).unpause();

      expect(await hyd.paused()).to.be.false;
    });

    it("should NOT allow non-pauser to pause", async function () {
      const { hyd, user1 } = await loadFixture(deployHYDFixture);

      await expect(
        hyd.connect(user1).pause()
      ).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("should ALLOW transfers when paused (pause only affects mint/burn)", async function () {
      const { hyd, psm, owner, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      await hyd.connect(owner).pause();

      // Transfers should still work when paused (gas optimization design choice)
      const transferAmount = ethers.parseEther("100");
      await expect(
        hyd.connect(user1).transfer(user2.address, transferAmount)
      ).to.not.be.reverted;

      expect(await hyd.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("should block minting when paused", async function () {
      const { hyd, psm, owner, user1 } = await loadFixture(deployHYDFixture);

      await hyd.connect(owner).pause();

      await expect(
        hyd.connect(psm).mint(user1.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(hyd, "EnforcedPause");
    });
  });

  describe("Blacklist Tests", function () {
    it("should allow admin to blacklist address", async function () {
      const { hyd, owner, blacklisted } = await loadFixture(deployHYDFixture);

      await hyd.connect(owner).blacklist(blacklisted.address);

      expect(await hyd.isBlacklisted(blacklisted.address)).to.be.true;
    });

    it("should allow admin to unblacklist address", async function () {
      const { hyd, owner, blacklisted } = await loadFixture(deployHYDFixture);

      await hyd.connect(owner).blacklist(blacklisted.address);
      await hyd.connect(owner).unblacklist(blacklisted.address);

      expect(await hyd.isBlacklisted(blacklisted.address)).to.be.false;
    });

    it("should NOT allow non-blacklister to blacklist", async function () {
      const { hyd, user1, blacklisted } = await loadFixture(deployHYDFixture);

      await expect(
        hyd.connect(user1).blacklist(blacklisted.address)
      ).to.be.revertedWith("AccessControl: account is missing role");
    });

    it("should block transfers from blacklisted address", async function () {
      const { hyd, psm, owner, blacklisted, user1 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(blacklisted.address, mintAmount);

      await hyd.connect(owner).blacklist(blacklisted.address);

      await expect(
        hyd.connect(blacklisted).transfer(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("HYD: Sender is blacklisted");
    });

    it("should block transfers to blacklisted address", async function () {
      const { hyd, psm, owner, user1, blacklisted } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      await hyd.connect(owner).blacklist(blacklisted.address);

      await expect(
        hyd.connect(user1).transfer(blacklisted.address, ethers.parseEther("100"))
      ).to.be.revertedWith("HYD: Recipient is blacklisted");
    });

    it("should emit Blacklisted event", async function () {
      const { hyd, owner, blacklisted } = await loadFixture(deployHYDFixture);

      await expect(hyd.connect(owner).blacklist(blacklisted.address))
        .to.emit(hyd, "Blacklisted")
        .withArgs(blacklisted.address);
    });

    it("should emit Unblacklisted event", async function () {
      const { hyd, owner, blacklisted } = await loadFixture(deployHYDFixture);

      await hyd.connect(owner).blacklist(blacklisted.address);

      await expect(hyd.connect(owner).unblacklist(blacklisted.address))
        .to.emit(hyd, "Unblacklisted")
        .withArgs(blacklisted.address);
    });
  });

  describe("Performance Tests - Gas Optimization", function () {
    it("should transfer with less than 57K gas (industry-standard for tokens with blacklist)", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const tx = await hyd.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      const receipt = await tx.wait();

      // Industry comparison:
      // - Basic ERC20: ~21K
      // - USDC (blacklist): ~52-55K
      // - USDT (complex): ~60K
      // - HYD target: <57K (USDC-level performance)
      expect(receipt!.gasUsed).to.be.lessThan(57000);
    });
  });

  describe("Security Tests - Access Control", function () {
    it("should enforce PSM-only minting", async function () {
      const { hyd, owner, user1 } = await loadFixture(deployHYDFixture);

      // Even admin cannot mint if not PSM
      await expect(
        hyd.connect(owner).mint(user1.address, ethers.parseEther("1000"))
      ).to.be.revertedWith("HYD: Only PSM can mint");
    });

    it("should enforce PSM-only burning", async function () {
      const { hyd, psm, owner, user1 } = await loadFixture(deployHYDFixture);

      // Mint first
      await hyd.connect(psm).mint(user1.address, ethers.parseEther("1000"));
      await hyd.connect(user1).approve(owner.address, ethers.parseEther("1000"));

      // Even admin cannot burn if not PSM
      await expect(
        hyd.connect(owner).burnFrom(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("HYD: Only PSM can burn");
    });

    it("should allow role management by admin", async function () {
      const { hyd, owner, user1 } = await loadFixture(deployHYDFixture);

      const PAUSER_ROLE = await hyd.PAUSER_ROLE();

      await hyd.connect(owner).grantRole(PAUSER_ROLE, user1.address);

      expect(await hyd.hasRole(PAUSER_ROLE, user1.address)).to.be.true;

      // user1 should now be able to pause
      await expect(hyd.connect(user1).pause()).to.not.be.reverted;
    });
  });

  describe("Compatibility Tests - ERC20 Standard", function () {
    it("should support approve and allowance", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const approveAmount = ethers.parseEther("500");
      await hyd.connect(user1).approve(user2.address, approveAmount);

      expect(await hyd.allowance(user1.address, user2.address)).to.equal(approveAmount);
    });

    it("should support transferFrom", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const approveAmount = ethers.parseEther("500");
      await hyd.connect(user1).approve(user2.address, approveAmount);

      const transferAmount = ethers.parseEther("300");
      await hyd.connect(user2).transferFrom(user1.address, user2.address, transferAmount);

      expect(await hyd.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await hyd.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("200"));
    });

    it("should emit Approval event", async function () {
      const { hyd, psm, user1, user2 } = await loadFixture(deployHYDFixture);

      const mintAmount = ethers.parseEther("1000");
      await hyd.connect(psm).mint(user1.address, mintAmount);

      const approveAmount = ethers.parseEther("500");

      await expect(hyd.connect(user1).approve(user2.address, approveAmount))
        .to.emit(hyd, "Approval")
        .withArgs(user1.address, user2.address, approveAmount);
    });
  });
});
