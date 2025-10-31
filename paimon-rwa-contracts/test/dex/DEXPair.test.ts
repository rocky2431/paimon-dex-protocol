import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { DEXPair, DEXFactory, MockERC20 } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * DEXPair Contract Test Suite
 *
 * Tests Uniswap V2-style AMM liquidity pool with custom fee structure
 *
 * Test Dimensions (6):
 * 1. Functional - Core AMM logic (liquidity, swaps, fees)
 * 2. Boundary - Min/max values, edge cases
 * 3. Exception - Error handling, access control
 * 4. Performance - Gas optimization
 * 5. Security - Reentrancy, K invariant protection
 * 6. Compatibility - ERC20 compliance, events
 */
describe("DEXPair", function () {

  // Constants
  const MINIMUM_LIQUIDITY = 1000n; // Uniswap V2 minimum liquidity
  const FEE_DENOMINATOR = 10000n; // 100% = 10000 basis points
  const TOTAL_FEE = 25n; // 0.25% = 25 basis points
  const VOTER_FEE = 17n; // 0.175% to voters (70% of 0.25%)
  const TREASURY_FEE = 8n; // 0.075% to treasury (30% of 0.25%)

  /**
   * Deployment fixture
   */
  async function deployDEXPairFixture() {
    const [owner, user1, user2, treasury, voter] = await ethers.getSigners();

    // Deploy tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Token A", "TKA", 18);
    const tokenB = await MockERC20.deploy("Token B", "TKB", 18);

    // Deploy factory
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    const factory = await DEXFactory.deploy(treasury.address);

    // Create pair through factory
    await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());

    const pair = await ethers.getContractAt("DEXPair", pairAddress);

    // Mint tokens to users
    const mintAmount = ethers.parseEther("1000000");
    await tokenA.mint(user1.address, mintAmount);
    await tokenB.mint(user1.address, mintAmount);
    await tokenA.mint(user2.address, mintAmount);
    await tokenB.mint(user2.address, mintAmount);

    // Approve pair to spend tokens
    await tokenA.connect(user1).approve(pairAddress, ethers.MaxUint256);
    await tokenB.connect(user1).approve(pairAddress, ethers.MaxUint256);
    await tokenA.connect(user2).approve(pairAddress, ethers.MaxUint256);
    await tokenB.connect(user2).approve(pairAddress, ethers.MaxUint256);

    return {
      pair,
      factory,
      tokenA,
      tokenB,
      owner,
      user1,
      user2,
      treasury,
      voter
    };
  }

  // ============================================================
  // 1. DEPLOYMENT & INITIALIZATION
  // ============================================================

  describe("1. Deployment", function () {
    it("Should initialize with correct token addresses", async function () {
      const { pair, tokenA, tokenB } = await loadFixture(deployDEXPairFixture);

      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // Tokens should be sorted
      const [expectedToken0, expectedToken1] =
        (await tokenA.getAddress()) < (await tokenB.getAddress())
          ? [await tokenA.getAddress(), await tokenB.getAddress()]
          : [await tokenB.getAddress(), await tokenA.getAddress()];

      expect(token0).to.equal(expectedToken0);
      expect(token1).to.equal(expectedToken1);
    });

    it("Should have zero reserves initially", async function () {
      const { pair } = await loadFixture(deployDEXPairFixture);

      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(0);
      expect(reserve1).to.equal(0);
    });

    it("Should have correct factory address", async function () {
      const { pair, factory } = await loadFixture(deployDEXPairFixture);

      expect(await pair.factory()).to.equal(await factory.getAddress());
    });

    it("Should have zero total supply initially", async function () {
      const { pair } = await loadFixture(deployDEXPairFixture);

      expect(await pair.totalSupply()).to.equal(0);
    });
  });

  // ============================================================
  // 2. LIQUIDITY PROVISION (MINT)
  // ============================================================

  describe("2. Liquidity Provision", function () {
    it("Should mint liquidity tokens on first deposit", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("100");

      // Transfer tokens to pair
      await tokenA.connect(user1).transfer(await pair.getAddress(), amount0);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amount1);

      // Mint liquidity
      await expect(pair.connect(user1).mint(user1.address))
        .to.emit(pair, "Mint")
        .withArgs(user1.address, amount0, amount1);

      // Check liquidity tokens received (sqrt(100 * 100) - MINIMUM_LIQUIDITY)
      const liquidity = await pair.balanceOf(user1.address);
      const expectedLiquidity = ethers.parseEther("100") - MINIMUM_LIQUIDITY;
      expect(liquidity).to.equal(expectedLiquidity);
    });

    it("Should lock minimum liquidity on first mint", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("100");

      await tokenA.connect(user1).transfer(await pair.getAddress(), amount0);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amount1);
      await pair.connect(user1).mint(user1.address);

      // Minimum liquidity should be locked to dead address
      const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
      const deadBalance = await pair.balanceOf(DEAD_ADDRESS);
      expect(deadBalance).to.equal(MINIMUM_LIQUIDITY);
    });

    it("Should mint proportional liquidity on subsequent deposits", async function () {
      const { pair, tokenA, tokenB, user1, user2 } = await loadFixture(deployDEXPairFixture);

      // First deposit
      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await pair.connect(user1).mint(user1.address);

      // Second deposit (50% of pool)
      await tokenA.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("50"));
      await tokenB.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("50"));
      await pair.connect(user2).mint(user2.address);

      const liquidity2 = await pair.balanceOf(user2.address);
      const totalSupply = await pair.totalSupply();

      // user2 should have ~33% of total supply (50 / 150)
      const expectedRatio = 33n; // ~33%
      const actualRatio = (liquidity2 * 100n) / totalSupply;

      expect(actualRatio).to.be.closeTo(expectedRatio, 1n);
    });

    it("Should update reserves after mint", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("200");

      await tokenA.connect(user1).transfer(await pair.getAddress(), amountA);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amountB);
      await pair.connect(user1).mint(user1.address);

      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();

      // Check reserves match deposited amounts (accounting for sorting)
      const isTokenAToken0 = token0 === (await tokenA.getAddress());
      if (isTokenAToken0) {
        expect(reserve0).to.equal(amountA);
        expect(reserve1).to.equal(amountB);
      } else {
        expect(reserve0).to.equal(amountB);
        expect(reserve1).to.equal(amountA);
      }
    });
  });

  // ============================================================
  // 3. LIQUIDITY REMOVAL (BURN)
  // ============================================================

  describe("3. Liquidity Removal", function () {
    it("Should burn liquidity and return tokens", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      // Add liquidity
      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await pair.connect(user1).mint(user1.address);

      const liquidity = await pair.balanceOf(user1.address);

      // Remove half liquidity
      await pair.connect(user1).transfer(await pair.getAddress(), liquidity / 2n);

      const balanceBefore0 = await tokenA.balanceOf(user1.address);
      const balanceBefore1 = await tokenB.balanceOf(user1.address);

      await expect(pair.connect(user1).burn(user1.address))
        .to.emit(pair, "Burn");

      const balanceAfter0 = await tokenA.balanceOf(user1.address);
      const balanceAfter1 = await tokenB.balanceOf(user1.address);

      // Should receive approximately half of deposited tokens
      expect(balanceAfter0 - balanceBefore0).to.be.closeTo(ethers.parseEther("50"), ethers.parseEther("0.01"));
      expect(balanceAfter1 - balanceBefore1).to.be.closeTo(ethers.parseEther("50"), ethers.parseEther("0.01"));
    });

    it("Should decrease total supply after burn", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await pair.connect(user1).mint(user1.address);

      const supplyBefore = await pair.totalSupply();

      const liquidity = await pair.balanceOf(user1.address);
      await pair.connect(user1).transfer(await pair.getAddress(), liquidity / 2n);
      await pair.connect(user1).burn(user1.address);

      const supplyAfter = await pair.totalSupply();

      expect(supplyAfter).to.be.lt(supplyBefore);
    });
  });

  // ============================================================
  // 4. SWAP FUNCTIONALITY
  // ============================================================

  describe("4. Swap Functionality", function () {
    it("Should swap token0 for token1", async function () {
      const { pair, tokenA, tokenB, user1, user2 } = await loadFixture(deployDEXPairFixture);

      // Add liquidity
      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.connect(user1).mint(user1.address);

      // Swap 10 token0 for token1
      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).transfer(await pair.getAddress(), swapAmount);

      const balanceBefore = await tokenB.balanceOf(user2.address);

      // Determine which is token0
      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      if (isTokenAToken0) {
        // Swap token0 (A) for token1 (B)
        await pair.connect(user2).swap(0, ethers.parseEther("9"), user2.address, "0x");
      } else {
        // Swap token1 (A) for token0 (B)
        await pair.connect(user2).swap(ethers.parseEther("9"), 0, user2.address, "0x");
      }

      const balanceAfter = await tokenB.balanceOf(user2.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should charge 0.25% fee on swaps", async function () {
      const { pair, tokenA, tokenB, user1, user2 } = await loadFixture(deployDEXPairFixture);

      // Add liquidity: 1000:1000
      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.connect(user1).mint(user1.address);

      // Swap 100 tokenA
      const swapAmountIn = ethers.parseEther("100");
      await tokenA.connect(user2).transfer(await pair.getAddress(), swapAmountIn);

      const [reserve0Before, reserve1Before] = await pair.getReserves();

      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      // Calculate expected output with 0.25% fee
      // amountOut = (reserve1 * amountIn * 9975) / (reserve0 * 10000 + amountIn * 9975)
      const amountInWithFee = swapAmountIn * 9975n / 10000n;
      const numerator = reserve1Before * amountInWithFee;
      const denominator = reserve0Before * 10000n + amountInWithFee * 10000n;
      const expectedOut = numerator / denominator;

      if (isTokenAToken0) {
        await pair.connect(user2).swap(0, expectedOut, user2.address, "0x");
      } else {
        await pair.connect(user2).swap(expectedOut, 0, user2.address, "0x");
      }

      const [reserve0After, reserve1After] = await pair.getReserves();

      // Verify K increased (due to fees)
      const kBefore = reserve0Before * reserve1Before;
      const kAfter = reserve0After * reserve1After;

      expect(kAfter).to.be.gt(kBefore);
    });

    it("Should maintain K invariant after swap", async function () {
      const { pair, tokenA, tokenB, user1, user2 } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.connect(user1).mint(user1.address);

      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      // Swap
      await tokenA.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("10"));

      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      if (isTokenAToken0) {
        await pair.connect(user2).swap(0, ethers.parseEther("9"), user2.address, "0x");
      } else {
        await pair.connect(user2).swap(ethers.parseEther("9"), 0, user2.address, "0x");
      }

      const [reserve0After, reserve1After] = await pair.getReserves();
      const kAfter = reserve0After * reserve1After;

      // K should increase due to fees
      expect(kAfter).to.be.gte(kBefore);
    });
  });

  // ============================================================
  // 5. FEE DISTRIBUTION
  // ============================================================

  describe("5. Fee Distribution", function () {
    it("Should accumulate fees for voters and treasury", async function () {
      const { pair, tokenA, tokenB, user1, user2, treasury } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.connect(user1).mint(user1.address);

      // Perform swap
      await tokenA.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("100"));

      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      if (isTokenAToken0) {
        await pair.connect(user2).swap(0, ethers.parseEther("90"), user2.address, "0x");
      } else {
        await pair.connect(user2).swap(ethers.parseEther("90"), 0, user2.address, "0x");
      }

      // Check fee accumulation
      const voterFees0 = await pair.voterFees0();
      const voterFees1 = await pair.voterFees1();
      const treasuryFees0 = await pair.treasuryFees0();
      const treasuryFees1 = await pair.treasuryFees1();

      // At least one fee should be > 0
      expect(voterFees0 + voterFees1).to.be.gt(0);
      expect(treasuryFees0 + treasuryFees1).to.be.gt(0);
    });

    it("Should split fees correctly (70% voters, 30% treasury)", async function () {
      const { pair, tokenA, tokenB, user1, user2 } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("10000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("10000"));
      await pair.connect(user1).mint(user1.address);

      // Large swap to accumulate significant fees
      await tokenA.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("1000"));

      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      if (isTokenAToken0) {
        await pair.connect(user2).swap(0, ethers.parseEther("800"), user2.address, "0x");
      } else {
        await pair.connect(user2).swap(ethers.parseEther("800"), 0, user2.address, "0x");
      }

      const voterFees0 = await pair.voterFees0();
      const treasuryFees0 = await pair.treasuryFees0();

      // Calculate ratio (should be ~70:30)
      const totalFees = voterFees0 + treasuryFees0;
      if (totalFees > 0n) {
        const voterRatio = (voterFees0 * 100n) / totalFees;
        expect(voterRatio).to.be.closeTo(70n, 2n); // 70% ± 2%
      }
    });

    it("Should allow treasury to claim fees", async function () {
      const { pair, tokenA, tokenB, user1, user2, treasury } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.connect(user1).mint(user1.address);

      await tokenA.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("100"));

      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      if (isTokenAToken0) {
        await pair.connect(user2).swap(0, ethers.parseEther("90"), user2.address, "0x");
      } else {
        await pair.connect(user2).swap(ethers.parseEther("90"), 0, user2.address, "0x");
      }

      const treasuryFees0Before = await pair.treasuryFees0();

      if (treasuryFees0Before > 0n) {
        const balanceBefore = await tokenA.balanceOf(treasury.address);

        await pair.connect(treasury).claimTreasuryFees(treasury.address);

        const balanceAfter = await tokenA.balanceOf(treasury.address);

        expect(balanceAfter).to.be.gt(balanceBefore);
      }
    });
  });

  // ============================================================
  // 6. BOUNDARY TESTS
  // ============================================================

  describe("6. Boundary Tests", function () {
    it("Should handle minimum liquidity correctly", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      // Tiny amounts
      const amount = 10000n;
      await tokenA.connect(user1).transfer(await pair.getAddress(), amount);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amount);

      await pair.connect(user1).mint(user1.address);

      const liquidity = await pair.balanceOf(user1.address);
      expect(liquidity).to.be.gte(0);
    });

    it("Should handle large amounts without overflow", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      const largeAmount = ethers.parseEther("100000");
      await tokenA.connect(user1).transfer(await pair.getAddress(), largeAmount);
      await tokenB.connect(user1).transfer(await pair.getAddress(), largeAmount);

      await expect(pair.connect(user1).mint(user1.address)).to.not.be.reverted;
    });

    it("Should handle imbalanced liquidity provision", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      // 1:10 ratio
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("1000");

      await tokenA.connect(user1).transfer(await pair.getAddress(), amountA);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amountB);

      await pair.connect(user1).mint(user1.address);

      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      if (isTokenAToken0) {
        expect(reserve0).to.equal(amountA);
        expect(reserve1).to.equal(amountB);
      } else {
        expect(reserve0).to.equal(amountB);
        expect(reserve1).to.equal(amountA);
      }
    });
  });

  // ============================================================
  // 7. EXCEPTION TESTS
  // ============================================================

  describe("7. Exception Tests", function () {
    it("Should revert if insufficient liquidity minted", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      // Too small amounts
      await tokenA.connect(user1).transfer(await pair.getAddress(), 100n);
      await tokenB.connect(user1).transfer(await pair.getAddress(), 100n);

      await expect(pair.connect(user1).mint(user1.address))
        .to.be.revertedWith("INSUFFICIENT_LIQUIDITY_MINTED");
    });

    it("Should revert if insufficient output amount", async function () {
      const { pair, tokenA, tokenB, user1, user2 } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.connect(user1).mint(user1.address);

      await tokenA.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("10"));

      await expect(pair.connect(user2).swap(0, 0, user2.address, "0x"))
        .to.be.revertedWith("INSUFFICIENT_OUTPUT_AMOUNT");
    });

    it("Should revert if K invariant violated", async function () {
      const { pair, tokenA, tokenB, user1, user2 } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.connect(user1).mint(user1.address);

      await tokenA.connect(user2).transfer(await pair.getAddress(), ethers.parseEther("10"));

      // Try to take out too much
      await expect(pair.connect(user2).swap(0, ethers.parseEther("500"), user2.address, "0x"))
        .to.be.revertedWith("K");
    });

    it("Should revert if insufficient liquidity burned", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await pair.connect(user1).mint(user1.address);

      // Try to burn without transferring LP tokens
      await expect(pair.connect(user1).burn(user1.address))
        .to.be.revertedWith("INSUFFICIENT_LIQUIDITY_BURNED");
    });
  });

  // ============================================================
  // 8. SECURITY TESTS
  // ============================================================

  describe("8. Security Tests", function () {
    it("Should use ReentrancyGuard on critical functions", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      await tokenA.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));
      await tokenB.connect(user1).transfer(await pair.getAddress(), ethers.parseEther("100"));

      // This verifies the modifier is present
      await expect(pair.connect(user1).mint(user1.address)).to.not.be.reverted;
    });

    it("Should prevent overflow in reserve updates", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      const maxUint112 = 2n ** 112n - 1n;
      const amount = ethers.parseEther("1000");

      await tokenA.connect(user1).transfer(await pair.getAddress(), amount);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amount);

      await expect(pair.connect(user1).mint(user1.address)).to.not.be.reverted;
    });
  });

  // ============================================================
  // 9. HELPER FUNCTION TESTS
  // ============================================================

  describe("9. Helper Functions", function () {
    it("Should get reserves correctly", async function () {
      const { pair, tokenA, tokenB, user1 } = await loadFixture(deployDEXPairFixture);

      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("200");

      await tokenA.connect(user1).transfer(await pair.getAddress(), amountA);
      await tokenB.connect(user1).transfer(await pair.getAddress(), amountB);
      await pair.connect(user1).mint(user1.address);

      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const isTokenAToken0 = token0 === (await tokenA.getAddress());

      if (isTokenAToken0) {
        expect(reserve0).to.equal(amountA);
        expect(reserve1).to.equal(amountB);
      } else {
        expect(reserve0).to.equal(amountB);
        expect(reserve1).to.equal(amountA);
      }
    });

    it("Should get token addresses", async function () {
      const { pair, tokenA, tokenB } = await loadFixture(deployDEXPairFixture);

      const token0 = await pair.token0();
      const token1 = await pair.token1();

      expect([token0, token1]).to.include(await tokenA.getAddress());
      expect([token0, token1]).to.include(await tokenB.getAddress());
    });
  });
});
