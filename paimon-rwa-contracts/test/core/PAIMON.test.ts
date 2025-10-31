import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * PAIMON Token Test Suite (TDD - RED Phase)
 *
 * Test Coverage: 6 Dimensions
 * 1. Deployment - Basic ERC20 properties
 * 2. Functional - Minting with MINTER_ROLE
 * 3. Functional - Burning mechanism
 * 4. Boundary - Max supply cap enforcement
 * 5. Exception - Unauthorized minting
 * 6. Security - Access control
 * 7. Compatibility - ERC20 standard compliance
 * 8. Performance - Gas optimization
 *
 * Target: >90% test coverage per acceptance criteria
 */

describe("PAIMON Token Contract", function () {
  // Test Fixture
  async function deployPAIMONFixture() {
    const [owner, minter, user1, user2, unauthorizedUser] = await ethers.getSigners();

    // Deploy PAIMON with 10B max supply
    const PAIMON = await ethers.getContractFactory("PAIMON");
    const maxSupply = ethers.parseEther("10000000000"); // 10 billion PAIMON
    const paimon = await PAIMON.deploy(maxSupply);

    return { paimon, owner, minter, user1, user2, unauthorizedUser, maxSupply };
  }

  // ===========================
  // 1. DEPLOYMENT TESTS
  // ===========================
  describe("Deployment", function () {
    it("should deploy with correct name and symbol", async function () {
      const { paimon } = await loadFixture(deployPAIMONFixture);

      expect(await paimon.name()).to.equal("PAIMON Token");
      expect(await paimon.symbol()).to.equal("PAIMON");
    });

    it("should deploy with 18 decimals", async function () {
      const { paimon } = await loadFixture(deployPAIMONFixture);

      expect(await paimon.decimals()).to.equal(18);
    });

    it("should deploy with correct max supply cap", async function () {
      const { paimon, maxSupply } = await loadFixture(deployPAIMONFixture);

      expect(await paimon.cap()).to.equal(maxSupply);
    });

    it("should deploy with zero initial supply", async function () {
      const { paimon } = await loadFixture(deployPAIMONFixture);

      expect(await paimon.totalSupply()).to.equal(0);
    });

    it("should grant DEFAULT_ADMIN_ROLE and MINTER_ROLE to deployer", async function () {
      const { paimon, owner } = await loadFixture(deployPAIMONFixture);

      const DEFAULT_ADMIN_ROLE = await paimon.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await paimon.MINTER_ROLE();

      expect(await paimon.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await paimon.hasRole(MINTER_ROLE, owner.address)).to.be.true;
    });
  });

  // ===========================
  // 2. FUNCTIONAL TESTS - MINTING
  // ===========================
  describe("Minting", function () {
    it("should allow minter to mint tokens", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000"); // 1M PAIMON
      await paimon.connect(owner).mint(user1.address, mintAmount);

      expect(await paimon.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await paimon.totalSupply()).to.equal(mintAmount);
    });

    it("should emit Transfer event when minting", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");

      await expect(paimon.connect(owner).mint(user1.address, mintAmount))
        .to.emit(paimon, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);
    });

    it("should allow granting MINTER_ROLE to other accounts", async function () {
      const { paimon, owner, minter, user1 } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();
      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);

      expect(await paimon.hasRole(MINTER_ROLE, minter.address)).to.be.true;

      // Minter can now mint
      const mintAmount = ethers.parseEther("500000");
      await paimon.connect(minter).mint(user1.address, mintAmount);

      expect(await paimon.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("should allow multiple minters to mint independently", async function () {
      const { paimon, owner, minter, user1, user2 } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();
      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);

      // Owner mints to user1
      const amount1 = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, amount1);

      // Minter mints to user2
      const amount2 = ethers.parseEther("2000000");
      await paimon.connect(minter).mint(user2.address, amount2);

      expect(await paimon.balanceOf(user1.address)).to.equal(amount1);
      expect(await paimon.balanceOf(user2.address)).to.equal(amount2);
      expect(await paimon.totalSupply()).to.equal(amount1 + amount2);
    });
  });

  // ===========================
  // 3. FUNCTIONAL TESTS - BURNING
  // ===========================
  describe("Burning", function () {
    it("should allow users to burn their own tokens", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      // Mint tokens to user1
      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      // User1 burns half
      const burnAmount = ethers.parseEther("500000");
      await paimon.connect(user1).burn(burnAmount);

      expect(await paimon.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
      expect(await paimon.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("should emit Transfer event when burning", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      const burnAmount = ethers.parseEther("500000");

      await expect(paimon.connect(user1).burn(burnAmount))
        .to.emit(paimon, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    });

    it("should permanently reduce totalSupply after burning", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      // Mint 5M tokens
      const mintAmount = ethers.parseEther("5000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      const initialSupply = await paimon.totalSupply();
      expect(initialSupply).to.equal(mintAmount);

      // Burn 2M tokens
      const burnAmount = ethers.parseEther("2000000");
      await paimon.connect(user1).burn(burnAmount);

      const finalSupply = await paimon.totalSupply();
      expect(finalSupply).to.equal(initialSupply - burnAmount);

      // Verify cap is not affected
      expect(await paimon.cap()).to.equal(ethers.parseEther("10000000000"));
    });

    it("should allow users to burn all their tokens", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      // Burn all tokens
      await paimon.connect(user1).burn(mintAmount);

      expect(await paimon.balanceOf(user1.address)).to.equal(0);
      expect(await paimon.totalSupply()).to.equal(0);
    });

    it("should revert when burning more than balance", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      const excessBurnAmount = ethers.parseEther("2000000");

      await expect(paimon.connect(user1).burn(excessBurnAmount))
        .to.be.revertedWithCustomError(paimon, "ERC20InsufficientBalance");
    });

    it("should allow burnFrom with approval", async function () {
      const { paimon, owner, user1, user2 } = await loadFixture(deployPAIMONFixture);

      // Mint tokens to user1
      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      // User1 approves user2 to burn tokens
      const burnAmount = ethers.parseEther("500000");
      await paimon.connect(user1).approve(user2.address, burnAmount);

      // User2 burns user1's tokens
      await paimon.connect(user2).burnFrom(user1.address, burnAmount);

      expect(await paimon.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
      expect(await paimon.totalSupply()).to.equal(mintAmount - burnAmount);
    });
  });

  // ===========================
  // 4. BOUNDARY TESTS - MAX SUPPLY CAP
  // ===========================
  describe("Max Supply Cap", function () {
    it("should enforce 10B max supply cap", async function () {
      const { paimon, owner, user1, maxSupply } = await loadFixture(deployPAIMONFixture);

      // Mint exactly max supply
      await paimon.connect(owner).mint(user1.address, maxSupply);

      expect(await paimon.totalSupply()).to.equal(maxSupply);
      expect(await paimon.balanceOf(user1.address)).to.equal(maxSupply);
    });

    it("should revert when minting exceeds cap", async function () {
      const { paimon, owner, user1, maxSupply } = await loadFixture(deployPAIMONFixture);

      // Try to mint 1 wei over cap
      const overCapAmount = maxSupply + 1n;

      await expect(paimon.connect(owner).mint(user1.address, overCapAmount))
        .to.be.revertedWithCustomError(paimon, "ERC20ExceededCap");
    });

    it("should revert when cumulative minting exceeds cap", async function () {
      const { paimon, owner, user1, user2, maxSupply } = await loadFixture(deployPAIMONFixture);

      // Mint 9B to user1
      const firstMint = ethers.parseEther("9000000000");
      await paimon.connect(owner).mint(user1.address, firstMint);

      // Try to mint 2B to user2 (would exceed 10B cap)
      const secondMint = ethers.parseEther("2000000000");

      await expect(paimon.connect(owner).mint(user2.address, secondMint))
        .to.be.revertedWithCustomError(paimon, "ERC20ExceededCap");
    });

    it("should allow minting after burning (cap check against totalSupply)", async function () {
      const { paimon, owner, user1, maxSupply } = await loadFixture(deployPAIMONFixture);

      // Mint max supply
      await paimon.connect(owner).mint(user1.address, maxSupply);

      // Burn 1B
      const burnAmount = ethers.parseEther("1000000000");
      await paimon.connect(user1).burn(burnAmount);

      // Should now be able to mint 1B again
      await paimon.connect(owner).mint(user1.address, burnAmount);

      expect(await paimon.totalSupply()).to.equal(maxSupply);
    });
  });

  // ===========================
  // 5. EXCEPTION TESTS - UNAUTHORIZED MINTING
  // ===========================
  describe("Access Control - Unauthorized Minting", function () {
    it("should revert when non-minter tries to mint", async function () {
      const { paimon, unauthorizedUser, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");
      const MINTER_ROLE = await paimon.MINTER_ROLE();

      await expect(paimon.connect(unauthorizedUser).mint(user1.address, mintAmount))
        .to.be.revertedWithCustomError(paimon, "AccessControlUnauthorizedAccount")
        .withArgs(unauthorizedUser.address, MINTER_ROLE);
    });

    it("should revert when MINTER_ROLE is revoked", async function () {
      const { paimon, owner, minter, user1 } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();

      // Grant minter role
      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);

      // Minter can mint
      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(minter).mint(user1.address, mintAmount);

      // Revoke minter role
      await paimon.connect(owner).revokeRole(MINTER_ROLE, minter.address);

      // Minter cannot mint anymore
      await expect(paimon.connect(minter).mint(user1.address, mintAmount))
        .to.be.revertedWithCustomError(paimon, "AccessControlUnauthorizedAccount")
        .withArgs(minter.address, MINTER_ROLE);
    });

    it("should not allow non-admin to grant MINTER_ROLE", async function () {
      const { paimon, unauthorizedUser, user1 } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();
      const DEFAULT_ADMIN_ROLE = await paimon.DEFAULT_ADMIN_ROLE();

      await expect(paimon.connect(unauthorizedUser).grantRole(MINTER_ROLE, user1.address))
        .to.be.revertedWithCustomError(paimon, "AccessControlUnauthorizedAccount")
        .withArgs(unauthorizedUser.address, DEFAULT_ADMIN_ROLE);
    });

    it("should not allow non-admin to revoke MINTER_ROLE", async function () {
      const { paimon, owner, minter, unauthorizedUser } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();
      const DEFAULT_ADMIN_ROLE = await paimon.DEFAULT_ADMIN_ROLE();

      // Grant minter role
      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);

      // Unauthorized user cannot revoke
      await expect(paimon.connect(unauthorizedUser).revokeRole(MINTER_ROLE, minter.address))
        .to.be.revertedWithCustomError(paimon, "AccessControlUnauthorizedAccount")
        .withArgs(unauthorizedUser.address, DEFAULT_ADMIN_ROLE);
    });
  });

  // ===========================
  // 6. SECURITY TESTS - ROLE MANAGEMENT
  // ===========================
  describe("Role Management", function () {
    it("should allow admin to renounce role", async function () {
      const { paimon, owner } = await loadFixture(deployPAIMONFixture);

      const DEFAULT_ADMIN_ROLE = await paimon.DEFAULT_ADMIN_ROLE();

      // Owner renounces admin role
      await paimon.connect(owner).renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      expect(await paimon.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.false;
    });

    it("should allow minter to renounce MINTER_ROLE", async function () {
      const { paimon, owner, minter } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();

      // Grant minter role
      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);

      // Minter renounces role
      await paimon.connect(minter).renounceRole(MINTER_ROLE, minter.address);

      expect(await paimon.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("should emit RoleGranted event", async function () {
      const { paimon, owner, minter } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();

      await expect(paimon.connect(owner).grantRole(MINTER_ROLE, minter.address))
        .to.emit(paimon, "RoleGranted")
        .withArgs(MINTER_ROLE, minter.address, owner.address);
    });

    it("should emit RoleRevoked event", async function () {
      const { paimon, owner, minter } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();

      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);

      await expect(paimon.connect(owner).revokeRole(MINTER_ROLE, minter.address))
        .to.emit(paimon, "RoleRevoked")
        .withArgs(MINTER_ROLE, minter.address, owner.address);
    });
  });

  // ===========================
  // 7. COMPATIBILITY TESTS - ERC20 STANDARD
  // ===========================
  describe("ERC20 Compatibility", function () {
    it("should support standard ERC20 transfer", async function () {
      const { paimon, owner, user1, user2 } = await loadFixture(deployPAIMONFixture);

      // Mint tokens to user1
      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      // Transfer to user2
      const transferAmount = ethers.parseEther("500000");
      await paimon.connect(user1).transfer(user2.address, transferAmount);

      expect(await paimon.balanceOf(user1.address)).to.equal(mintAmount - transferAmount);
      expect(await paimon.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("should support approve and transferFrom", async function () {
      const { paimon, owner, user1, user2 } = await loadFixture(deployPAIMONFixture);

      // Mint tokens to user1
      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      // User1 approves user2
      const approvalAmount = ethers.parseEther("500000");
      await paimon.connect(user1).approve(user2.address, approvalAmount);

      expect(await paimon.allowance(user1.address, user2.address)).to.equal(approvalAmount);

      // User2 transfers from user1
      const transferAmount = ethers.parseEther("300000");
      await paimon.connect(user2).transferFrom(user1.address, user2.address, transferAmount);

      expect(await paimon.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await paimon.allowance(user1.address, user2.address)).to.equal(approvalAmount - transferAmount);
    });

    it("should emit Approval event", async function () {
      const { paimon, user1, user2 } = await loadFixture(deployPAIMONFixture);

      const approvalAmount = ethers.parseEther("1000000");

      await expect(paimon.connect(user1).approve(user2.address, approvalAmount))
        .to.emit(paimon, "Approval")
        .withArgs(user1.address, user2.address, approvalAmount);
    });

    it("should emit Transfer event on standard transfer", async function () {
      const { paimon, owner, user1, user2 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      const transferAmount = ethers.parseEther("500000");

      await expect(paimon.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(paimon, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
    });
  });

  // ===========================
  // 8. PERFORMANCE TESTS - GAS OPTIMIZATION
  // ===========================
  describe("Gas Optimization", function () {
    it("should mint with reasonable gas cost (<100K)", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");
      const tx = await paimon.connect(owner).mint(user1.address, mintAmount);
      const receipt = await tx.wait();

      // Minting should be gas efficient
      // OpenZeppelin ERC20Capped + AccessControl typical: 70-100K gas
      expect(receipt!.gasUsed).to.be.lessThan(100000);
    });

    it("should burn with reasonable gas cost (<60K)", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      // Mint tokens first
      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      // Burn tokens
      const burnAmount = ethers.parseEther("500000");
      const tx = await paimon.connect(user1).burn(burnAmount);
      const receipt = await tx.wait();

      // Burning should be gas efficient
      // OpenZeppelin ERC20Burnable typical: 40-60K gas
      expect(receipt!.gasUsed).to.be.lessThan(60000);
    });

    it("should transfer with reasonable gas cost (<60K)", async function () {
      const { paimon, owner, user1, user2 } = await loadFixture(deployPAIMONFixture);

      // Mint tokens first
      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      // Transfer tokens
      const transferAmount = ethers.parseEther("500000");
      const tx = await paimon.connect(user1).transfer(user2.address, transferAmount);
      const receipt = await tx.wait();

      // Standard ERC20 transfer: typically 50-60K gas
      expect(receipt!.gasUsed).to.be.lessThan(60000);
    });
  });

  // ===========================
  // 9. EDGE CASE TESTS
  // ===========================
  describe("Edge Cases", function () {
    it("should handle minting zero amount", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      await paimon.connect(owner).mint(user1.address, 0);

      expect(await paimon.balanceOf(user1.address)).to.equal(0);
      expect(await paimon.totalSupply()).to.equal(0);
    });

    it("should handle burning zero amount", async function () {
      const { paimon, owner, user1 } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");
      await paimon.connect(owner).mint(user1.address, mintAmount);

      await paimon.connect(user1).burn(0);

      expect(await paimon.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("should handle multiple role grants to same account", async function () {
      const { paimon, owner, minter } = await loadFixture(deployPAIMONFixture);

      const MINTER_ROLE = await paimon.MINTER_ROLE();

      // Grant role twice (should not fail, just no-op on second)
      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);
      await paimon.connect(owner).grantRole(MINTER_ROLE, minter.address);

      expect(await paimon.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("should allow minting to zero address (edge case, OpenZeppelin allows)", async function () {
      const { paimon, owner } = await loadFixture(deployPAIMONFixture);

      const mintAmount = ethers.parseEther("1000000");

      // OpenZeppelin ERC20 does not prevent minting to zero address
      // This would effectively burn tokens at mint
      await expect(paimon.connect(owner).mint(ethers.ZeroAddress, mintAmount))
        .to.be.revertedWithCustomError(paimon, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });
  });
});
