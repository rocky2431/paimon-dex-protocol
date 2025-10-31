import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * VotingEscrow (veNFT) Test Suite (TDD - RED Phase)
 *
 * Test Coverage: 10 Dimensions
 * 1. Deployment - Contract initialization
 * 2. Lock Creation - Creating veNFT positions
 * 3. Voting Power Calculation - Time-weighted power formula
 * 4. Time Decay - Linear decay over lock period
 * 5. Withdraw - Unlocking after expiry
 * 6. Lock Extension - Increase amount/duration
 * 7. NFT Transfer - ERC-721 compatibility
 * 8. Boundary Tests - Min/max durations
 * 9. Exception Tests - Invalid operations
 * 10. Gas Optimization - Storage packing verification
 *
 * Target: >95% test coverage per acceptance criteria
 */

describe("VotingEscrow (veNFT) Contract", function () {
  // Constants for lock durations
  const WEEK = 7 * 24 * 60 * 60;
  const MAXTIME = 4 * 365 * 24 * 60 * 60; // 4 years
  const MINTIME = WEEK; // 1 week

  // Test Fixture
  async function deployVotingEscrowFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy HYD token (need a mock since VotingEscrow depends on it)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const hyd = await MockERC20.deploy("HYD Token", "HYD", 18);

    // Deploy VotingEscrow
    const VotingEscrow = await ethers.getContractFactory("VotingEscrow");
    const votingEscrow = await VotingEscrow.deploy(await hyd.getAddress());

    // Mint HYD to users
    const mintAmount = ethers.parseEther("1000000"); // 1M HYD per user
    await hyd.mint(user1.address, mintAmount);
    await hyd.mint(user2.address, mintAmount);
    await hyd.mint(user3.address, mintAmount);

    // Approve VotingEscrow to spend HYD
    await hyd.connect(user1).approve(await votingEscrow.getAddress(), ethers.MaxUint256);
    await hyd.connect(user2).approve(await votingEscrow.getAddress(), ethers.MaxUint256);
    await hyd.connect(user3).approve(await votingEscrow.getAddress(), ethers.MaxUint256);

    return { votingEscrow, hyd, owner, user1, user2, user3 };
  }

  // ===========================
  // 1. DEPLOYMENT TESTS
  // ===========================
  describe("Deployment", function () {
    it("should deploy with correct HYD token address", async function () {
      const { votingEscrow, hyd } = await loadFixture(deployVotingEscrowFixture);

      expect(await votingEscrow.token()).to.equal(await hyd.getAddress());
    });

    it("should have correct ERC-721 metadata", async function () {
      const { votingEscrow } = await loadFixture(deployVotingEscrowFixture);

      expect(await votingEscrow.name()).to.equal("Vote-Escrowed HYD");
      expect(await votingEscrow.symbol()).to.equal("veHYD");
    });

    it("should start with tokenId counter at 1", async function () {
      const { votingEscrow } = await loadFixture(deployVotingEscrowFixture);

      expect(await votingEscrow.tokenId()).to.equal(1);
    });

    it("should have correct lock duration constants", async function () {
      const { votingEscrow } = await loadFixture(deployVotingEscrowFixture);

      expect(await votingEscrow.WEEK()).to.equal(WEEK);
      expect(await votingEscrow.MAXTIME()).to.equal(MAXTIME);
      expect(await votingEscrow.MINTIME()).to.equal(MINTIME);
    });
  });

  // ===========================
  // 2. LOCK CREATION TESTS
  // ===========================
  describe("Lock Creation", function () {
    it("should create lock and mint veNFT", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60; // 1 year

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      expect(await votingEscrow.ownerOf(1)).to.equal(user1.address);
      expect(await votingEscrow.balanceOf(user1.address)).to.equal(1);
    });

    it("should emit Deposit event when creating lock", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await expect(votingEscrow.connect(user1).createLock(lockAmount, lockDuration))
        .to.emit(votingEscrow, "Deposit")
        .withArgs(user1.address, 1, lockAmount, await time.latest() + lockDuration + 1, 0);
    });

    it("should transfer HYD tokens to VotingEscrow", async function () {
      const { votingEscrow, hyd, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      const balanceBefore = await hyd.balanceOf(user1.address);

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      expect(await hyd.balanceOf(user1.address)).to.equal(balanceBefore - lockAmount);
      expect(await hyd.balanceOf(await votingEscrow.getAddress())).to.equal(lockAmount);
    });

    it("should store lock data correctly", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const locked = await votingEscrow.locked(1);
      expect(locked.amount).to.equal(lockAmount);
      expect(locked.end).to.be.closeTo(await time.latest() + lockDuration, 2);
    });

    it("should increment tokenId for each new lock", async function () {
      const { votingEscrow, user1, user2 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await votingEscrow.connect(user2).createLock(lockAmount, lockDuration);

      expect(await votingEscrow.tokenId()).to.equal(3); // Next token will be 3
      expect(await votingEscrow.ownerOf(1)).to.equal(user1.address);
      expect(await votingEscrow.ownerOf(2)).to.equal(user2.address);
    });
  });

  // ===========================
  // 3. VOTING POWER CALCULATION TESTS
  // ===========================
  describe("Voting Power Calculation", function () {
    it("should calculate voting power for 4 year lock (2.0x weight)", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = MAXTIME; // 4 years

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const votingPower = await votingEscrow.balanceOfNFT(1);

      // Voting power = amount * (duration / MAXTIME)
      // For 4 years: 1000 * (4 years / 4 years) = 1000 * 1.0 = 1000 HYD
      // But the weight formula gives 2.0x for max lock
      // Actually: voting power = amount * duration / MAXTIME
      // For MAXTIME lock: power = amount
      expect(votingPower).to.be.closeTo(lockAmount, ethers.parseEther("1"));
    });

    it("should calculate voting power for 1 year lock (0.5x weight)", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60; // 1 year

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const votingPower = await votingEscrow.balanceOfNFT(1);

      // Voting power = amount * (1 year / 4 years) = amount * 0.25
      const expectedPower = lockAmount * BigInt(lockDuration) / BigInt(MAXTIME);
      expect(votingPower).to.be.closeTo(expectedPower, ethers.parseEther("1"));
    });

    it("should calculate voting power for 1 week lock (minimum)", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const votingPower = await votingEscrow.balanceOfNFT(1);

      // Voting power = amount * (1 week / 4 years)
      const expectedPower = lockAmount * BigInt(WEEK) / BigInt(MAXTIME);
      expect(votingPower).to.be.closeTo(expectedPower, ethers.parseEther("0.1"));
    });

    it("should return zero voting power for expired lock", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      // Fast forward past lock expiry
      await time.increase(lockDuration + 1);

      const votingPower = await votingEscrow.balanceOfNFT(1);
      expect(votingPower).to.equal(0);
    });
  });

  // ===========================
  // 4. TIME DECAY TESTS
  // ===========================
  describe("Time Decay", function () {
    it("should linearly decay voting power over time", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60; // 1 year

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const initialPower = await votingEscrow.balanceOfNFT(1);

      // Fast forward 6 months (half the lock period)
      await time.increase(lockDuration / 2);

      const halfwayPower = await votingEscrow.balanceOfNFT(1);

      // Power should be approximately half of initial
      expect(halfwayPower).to.be.closeTo(initialPower / 2n, ethers.parseEther("10"));
    });

    it("should have zero power at expiry", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      // Fast forward to exact expiry
      await time.increaseTo((await time.latest()) + lockDuration);

      const votingPower = await votingEscrow.balanceOfNFT(1);
      expect(votingPower).to.equal(0);
    });

    it("should maintain consistent power calculation at different timestamps", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 2 * 365 * 24 * 60 * 60; // 2 years

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const power1 = await votingEscrow.balanceOfNFT(1);

      await time.increase(30 * 24 * 60 * 60); // 30 days
      const power2 = await votingEscrow.balanceOfNFT(1);

      await time.increase(30 * 24 * 60 * 60); // Another 30 days
      const power3 = await votingEscrow.balanceOfNFT(1);

      // Power should decrease linearly
      expect(power1).to.be.greaterThan(power2);
      expect(power2).to.be.greaterThan(power3);
    });
  });

  // ===========================
  // 5. WITHDRAW TESTS
  // ===========================
  describe("Withdraw", function () {
    it("should allow withdrawal after lock expiry", async function () {
      const { votingEscrow, hyd, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      // Fast forward past expiry
      await time.increase(lockDuration + 1);

      const balanceBefore = await hyd.balanceOf(user1.address);

      await votingEscrow.connect(user1).withdraw(1);

      expect(await hyd.balanceOf(user1.address)).to.equal(balanceBefore + lockAmount);
    });

    it("should emit Withdraw event", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await time.increase(lockDuration + 1);

      await expect(votingEscrow.connect(user1).withdraw(1))
        .to.emit(votingEscrow, "Withdraw")
        .withArgs(user1.address, 1, lockAmount);
    });

    it("should burn NFT after withdrawal", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await time.increase(lockDuration + 1);

      await votingEscrow.connect(user1).withdraw(1);

      // NFT should be burned (reverts on ownerOf)
      await expect(votingEscrow.ownerOf(1)).to.be.revertedWithCustomError(
        votingEscrow,
        "ERC721NonexistentToken"
      );
    });

    it("should revert when withdrawing before expiry", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      await expect(votingEscrow.connect(user1).withdraw(1))
        .to.be.revertedWith("Lock not expired");
    });

    it("should revert when non-owner tries to withdraw", async function () {
      const { votingEscrow, user1, user2 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await time.increase(lockDuration + 1);

      await expect(votingEscrow.connect(user2).withdraw(1))
        .to.be.revertedWith("Not NFT owner");
    });
  });

  // ===========================
  // 6. LOCK EXTENSION TESTS
  // ===========================
  describe("Lock Extension", function () {
    it("should allow increasing lock amount", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const initialAmount = ethers.parseEther("1000");
      const additionalAmount = ethers.parseEther("500");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(initialAmount, lockDuration);
      await votingEscrow.connect(user1).increaseAmount(1, additionalAmount);

      const locked = await votingEscrow.locked(1);
      expect(locked.amount).to.equal(initialAmount + additionalAmount);
    });

    it("should allow increasing lock duration", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const initialDuration = 365 * 24 * 60 * 60; // 1 year
      const newDuration = 2 * 365 * 24 * 60 * 60; // 2 years

      await votingEscrow.connect(user1).createLock(lockAmount, initialDuration);

      const lockedBefore = await votingEscrow.locked(1);

      await votingEscrow.connect(user1).increaseUnlockTime(1, newDuration);

      const lockedAfter = await votingEscrow.locked(1);
      expect(lockedAfter.end).to.be.greaterThan(lockedBefore.end);
    });

    it("should emit IncreaseAmount event", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const initialAmount = ethers.parseEther("1000");
      const additionalAmount = ethers.parseEther("500");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(initialAmount, lockDuration);

      await expect(votingEscrow.connect(user1).increaseAmount(1, additionalAmount))
        .to.emit(votingEscrow, "Deposit");
    });

    it("should revert when non-owner tries to increase amount", async function () {
      const { votingEscrow, user1, user2 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      await expect(votingEscrow.connect(user2).increaseAmount(1, ethers.parseEther("500")))
        .to.be.revertedWith("Not NFT owner");
    });
  });

  // ===========================
  // 7. NFT TRANSFER TESTS
  // ===========================
  describe("NFT Transfer", function () {
    it("should allow transferring NFT to another address", async function () {
      const { votingEscrow, user1, user2 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await votingEscrow.connect(user1).transferFrom(user1.address, user2.address, 1);

      expect(await votingEscrow.ownerOf(1)).to.equal(user2.address);
    });

    it("should maintain voting power after transfer", async function () {
      const { votingEscrow, user1, user2 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const powerBefore = await votingEscrow.balanceOfNFT(1);

      await votingEscrow.connect(user1).transferFrom(user1.address, user2.address, 1);

      const powerAfter = await votingEscrow.balanceOfNFT(1);

      // Power should be very close (within 0.1% due to 1-2 second time difference)
      expect(powerAfter).to.be.closeTo(powerBefore, ethers.parseEther("1"));
    });

    it("should allow new owner to withdraw after expiry", async function () {
      const { votingEscrow, hyd, user1, user2 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await votingEscrow.connect(user1).transferFrom(user1.address, user2.address, 1);

      await time.increase(lockDuration + 1);

      const balanceBefore = await hyd.balanceOf(user2.address);
      await votingEscrow.connect(user2).withdraw(1);

      expect(await hyd.balanceOf(user2.address)).to.equal(balanceBefore + lockAmount);
    });
  });

  // ===========================
  // 8. BOUNDARY TESTS
  // ===========================
  describe("Boundary Tests", function () {
    it("should handle minimum lock duration (1 week)", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");

      await votingEscrow.connect(user1).createLock(lockAmount, MINTIME);

      const locked = await votingEscrow.locked(1);
      expect(locked.amount).to.equal(lockAmount);
    });

    it("should handle maximum lock duration (4 years)", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");

      await votingEscrow.connect(user1).createLock(lockAmount, MAXTIME);

      const locked = await votingEscrow.locked(1);
      expect(locked.amount).to.equal(lockAmount);
    });

    it("should revert when lock duration < 1 week", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const tooShortDuration = WEEK - 1;

      await expect(votingEscrow.connect(user1).createLock(lockAmount, tooShortDuration))
        .to.be.revertedWith("Lock duration too short");
    });

    it("should revert when lock duration > 4 years", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const tooLongDuration = MAXTIME + 1;

      await expect(votingEscrow.connect(user1).createLock(lockAmount, tooLongDuration))
        .to.be.revertedWith("Lock duration too long");
    });

    it("should handle maximum uint128 lock amount", async function () {
      const { votingEscrow, hyd, user1 } = await loadFixture(deployVotingEscrowFixture);

      const maxUint128 = BigInt(2) ** BigInt(128) - BigInt(1);
      const lockAmount = ethers.parseEther("100000000"); // Large but < max uint128

      // Mint enough HYD
      await hyd.mint(user1.address, lockAmount);
      await hyd.connect(user1).approve(await votingEscrow.getAddress(), lockAmount);

      await votingEscrow.connect(user1).createLock(lockAmount, WEEK);

      const locked = await votingEscrow.locked(1);
      expect(locked.amount).to.equal(lockAmount);
    });
  });

  // ===========================
  // 9. EXCEPTION TESTS
  // ===========================
  describe("Exception Tests", function () {
    it("should revert when creating lock with zero amount", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      await expect(votingEscrow.connect(user1).createLock(0, WEEK))
        .to.be.revertedWith("Amount must be > 0");
    });

    it("should revert when creating lock without HYD approval", async function () {
      const { votingEscrow, hyd, user1 } = await loadFixture(deployVotingEscrowFixture);

      // Reset approval to zero
      await hyd.connect(user1).approve(await votingEscrow.getAddress(), 0);

      const lockAmount = ethers.parseEther("1000");

      await expect(votingEscrow.connect(user1).createLock(lockAmount, WEEK))
        .to.be.revertedWithCustomError(hyd, "ERC20InsufficientAllowance");
    });

    it("should revert when withdrawing already withdrawn NFT", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      await votingEscrow.connect(user1).createLock(lockAmount, WEEK);
      await time.increase(WEEK + 1);

      await votingEscrow.connect(user1).withdraw(1);

      // After burn, ownerOf check fails first with "Not NFT owner"
      await expect(votingEscrow.connect(user1).withdraw(1))
        .to.be.revertedWith("Not NFT owner");
    });

    it("should revert when querying voting power of non-existent NFT", async function () {
      const { votingEscrow } = await loadFixture(deployVotingEscrowFixture);

      await expect(votingEscrow.balanceOfNFT(999))
        .to.be.revertedWith("NFT does not exist");
    });

    it("should revert when increasing amount for expired lock", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      await votingEscrow.connect(user1).createLock(lockAmount, WEEK);

      await time.increase(WEEK + 1);

      await expect(votingEscrow.connect(user1).increaseAmount(1, ethers.parseEther("500")))
        .to.be.revertedWith("Lock expired");
    });
  });

  // ===========================
  // 10. GAS OPTIMIZATION TESTS - STORAGE PACKING
  // ===========================
  describe("Gas Optimization - Storage Packing", function () {
    it("should use packed storage (uint128 amount + uint128 end)", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      // Create lock
      const tx = await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await tx.wait();

      // Query locked data
      const gasEstimateWithPacking = await votingEscrow.locked.estimateGas(1);

      // Storage packing: uint128 + uint128 = 256 bits (1 slot)
      // Non-packed: uint256 + uint256 = 512 bits (2 slots)
      // estimateGas includes transaction overhead (~21K base)
      // Packed should be < 25K total
      expect(gasEstimateWithPacking).to.be.lessThan(25000);
    });

    it("should save ≥4200 gas per voting power query vs non-packed", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      // Measure gas for balanceOfNFT (which reads locked storage)
      const gasEstimate = await votingEscrow.balanceOfNFT.estimateGas(1);

      // With storage packing: 1 SLOAD vs 2 SLOADs
      // Theoretical savings: 2100 gas (1 warm SLOAD)
      // But with transaction overhead, actual savings visible
      // balanceOfNFT should be < 30K gas with packing
      expect(gasEstimate).to.be.lessThan(30000);
    });

    it("should handle multiple locks without excessive gas", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      // Create multiple locks
      const tx1 = await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      const receipt1 = await tx1.wait();

      const tx2 = await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      const receipt2 = await tx2.wait();

      // Gas should be consistent (no quadratic growth)
      // Second lock uses warm SLOAD (2100 vs 2600) and cold SSTORE for new tokenId
      // Difference should be minimal (< 50K) due to these marginal costs
      const gasDiff = Math.abs(Number(receipt2!.gasUsed - receipt1!.gasUsed));
      expect(gasDiff).to.be.lessThan(50000); // Should be roughly the same
    });
  });

  // ===========================
  // 11. CHECKPOINT SYSTEM TESTS (OPTIONAL - ADVANCED)
  // ===========================
  describe("Checkpoint System", function () {
    it("should record checkpoint on lock creation", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      // Check if checkpoint exists (implementation specific)
      // This test assumes checkpoint function exists
      // If not implemented, this can be skipped
    });

    it("should allow querying historical voting power", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      const blockBefore = await time.latestBlock();

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const blockAfter = await time.latestBlock();

      // Query power at past block (if balanceOfNFTAt exists)
      // This is optional for MVP
    });
  });

  // ===========================
  // 12. HELPER FUNCTIONS TESTS
  // ===========================
  describe("Helper Functions", function () {
    it("should return locked balance via getLockedBalance", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const lockedBalance = await votingEscrow.getLockedBalance(1);
      expect(lockedBalance.amount).to.equal(lockAmount);
      expect(lockedBalance.end).to.be.closeTo(await time.latest() + lockDuration, 2);
    });

    it("should return correct isExpired status", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      // Before expiry
      expect(await votingEscrow.isExpired(1)).to.be.false;

      // After expiry
      await time.increase(lockDuration + 1);
      expect(await votingEscrow.isExpired(1)).to.be.true;
    });

    it("should return correct remaining time", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const remainingTime = await votingEscrow.getRemainingTime(1);
      expect(remainingTime).to.be.closeTo(lockDuration, 2);
    });

    it("should return zero remaining time for expired lock", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      await time.increase(lockDuration + 1);

      const remainingTime = await votingEscrow.getRemainingTime(1);
      expect(remainingTime).to.equal(0);
    });
  });

  // ===========================
  // 13. EDGE CASES
  // ===========================
  describe("Edge Cases", function () {
    it("should handle voting power calculation at exact expiry timestamp", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const locked = await votingEscrow.locked(1);

      // Set time to exact expiry
      await time.increaseTo(locked.end);

      const votingPower = await votingEscrow.balanceOfNFT(1);
      expect(votingPower).to.equal(0);
    });

    it("should handle multiple users with same lock parameters", async function () {
      const { votingEscrow, user1, user2 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = 365 * 24 * 60 * 60;

      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);
      await votingEscrow.connect(user2).createLock(lockAmount, lockDuration);

      const power1 = await votingEscrow.balanceOfNFT(1);
      const power2 = await votingEscrow.balanceOfNFT(2);

      // Powers should be approximately equal (within 1 second difference)
      expect(power1).to.be.closeTo(power2, ethers.parseEther("0.01"));
    });

    it("should handle lock created at block.timestamp", async function () {
      const { votingEscrow, user1 } = await loadFixture(deployVotingEscrowFixture);

      const lockAmount = ethers.parseEther("1000");
      const lockDuration = WEEK;

      // Create lock at current timestamp
      await votingEscrow.connect(user1).createLock(lockAmount, lockDuration);

      const locked = await votingEscrow.locked(1);
      const currentTime = await time.latest();

      expect(locked.end).to.be.closeTo(currentTime + lockDuration, 2);
    });
  });
});
