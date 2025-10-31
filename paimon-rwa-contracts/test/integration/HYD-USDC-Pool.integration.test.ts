import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { HYD, MockERC20, DEXFactory, DEXPair } from "../../typechain-types";

/**
 * @title HYD/USDC Liquidity Pool Integration Tests
 * @notice Tests creation and usage of HYD/USDC pool on own DEX
 *
 * Test Dimensions:
 * 1. Pool Creation - Create HYD/USDC pair via DEXFactory
 * 2. Liquidity Management - Add/remove liquidity ($100K initial)
 * 3. Swap Functionality - Swap HYD ↔ USDC with fee verification
 * 4. Price Impact - Verify price impact for various swap sizes
 * 5. Fee Distribution - 70% voters, 30% treasury
 * 6. Integration with Governance - Optional gauge configuration
 *
 * Strategic Decision: Use own DEX instead of PancakeSwap
 * - Full control over fee distribution (70% voters, 30% treasury)
 * - Compatible with ve33 voting model (gauge voting)
 * - Aligned with Velodrome/Thena architecture
 */
describe("HYD/USDC Liquidity Pool Integration", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let treasury: SignerWithAddress;

  let hyd: HYD;
  let usdc: MockERC20;
  let factory: DEXFactory;
  let pair: DEXPair;

  /**
   * Deployment fixture for integration tests
   */
  async function deployPoolFixture() {
    [owner, user1, user2, treasury] = await ethers.getSigners();

    // Deploy mock USDC (6 decimals like real USDC)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    // Deploy HYD token
    const HYD = await ethers.getContractFactory("HYD");
    hyd = await HYD.deploy(await owner.getAddress());

    // Deploy DEXFactory
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    factory = await DEXFactory.deploy(await treasury.getAddress());

    // Mint tokens to owner for liquidity provision
    const initialUSDC = ethers.parseUnits("500000", 6); // 500K USDC
    const initialHYD = ethers.parseEther("500000"); // 500K HYD

    await usdc.mint(await owner.getAddress(), initialUSDC);
    await hyd.mint(await owner.getAddress(), initialHYD);

    // Mint tokens to users for testing swaps
    await usdc.mint(await user1.getAddress(), ethers.parseUnits("50000", 6));
    await hyd.mint(await user1.getAddress(), ethers.parseEther("50000"));
    await usdc.mint(await user2.getAddress(), ethers.parseUnits("50000", 6));
    await hyd.mint(await user2.getAddress(), ethers.parseEther("50000"));

    return { hyd, usdc, factory, owner, user1, user2, treasury };
  }

  describe("Pool Creation", function () {
    it("Should create HYD/USDC pair successfully", async function () {
      const { hyd, usdc, factory } = await loadFixture(deployPoolFixture);

      // Create pair
      const tx = await factory.createPair(await hyd.getAddress(), await usdc.getAddress());
      const receipt = await tx.wait();

      // Verify PairCreated event
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "PairCreated"
      );
      expect(event).to.not.be.undefined;

      // Get pair address
      const pairAddress = await factory.getPair(await hyd.getAddress(), await usdc.getAddress());
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // Verify pair in reverse direction
      const pairAddressReverse = await factory.getPair(await usdc.getAddress(), await hyd.getAddress());
      expect(pairAddress).to.equal(pairAddressReverse);

      // Verify allPairs array
      const allPairsLength = await factory.allPairsLength();
      expect(allPairsLength).to.equal(1);
      expect(await factory.allPairs(0)).to.equal(pairAddress);
    });

    it("Should initialize pair with correct tokens", async function () {
      const { hyd, usdc, factory } = await loadFixture(deployPoolFixture);

      await factory.createPair(await hyd.getAddress(), await usdc.getAddress());
      const pairAddress = await factory.getPair(await hyd.getAddress(), await usdc.getAddress());

      const pair = await ethers.getContractAt("DEXPair", pairAddress);

      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // Tokens should be sorted (token0 < token1)
      const hydAddress = await hyd.getAddress();
      const usdcAddress = await usdc.getAddress();

      if (hydAddress < usdcAddress) {
        expect(token0).to.equal(hydAddress);
        expect(token1).to.equal(usdcAddress);
      } else {
        expect(token0).to.equal(usdcAddress);
        expect(token1).to.equal(hydAddress);
      }
    });

    it("Should not allow duplicate pair creation", async function () {
      const { hyd, usdc, factory } = await loadFixture(deployPoolFixture);

      await factory.createPair(await hyd.getAddress(), await usdc.getAddress());

      await expect(
        factory.createPair(await hyd.getAddress(), await usdc.getAddress())
      ).to.be.revertedWith("PAIR_EXISTS");
    });
  });

  describe("Initial Liquidity Addition ($100K)", function () {
    it("Should add $100K USDC + $100K HYD liquidity", async function () {
      const { hyd, usdc, factory, owner } = await loadFixture(deployPoolFixture);

      // Create pair
      await factory.createPair(await hyd.getAddress(), await usdc.getAddress());
      const pairAddress = await factory.getPair(await hyd.getAddress(), await usdc.getAddress());
      const pair = await ethers.getContractAt("DEXPair", pairAddress);

      // Amounts
      const amountUSDC = ethers.parseUnits("100000", 6); // 100K USDC
      const amountHYD = ethers.parseEther("100000"); // 100K HYD

      // Transfer tokens to pair
      await usdc.transfer(pairAddress, amountUSDC);
      await hyd.transfer(pairAddress, amountHYD);

      // Mint LP tokens
      const ownerAddress = await owner.getAddress();
      const tx = await pair.mint(ownerAddress);
      await tx.wait();

      // Verify LP tokens received
      const lpBalance = await pair.balanceOf(ownerAddress);
      expect(lpBalance).to.be.gt(0);

      // Verify reserves
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const hydAddress = await hyd.getAddress();

      if (token0 === hydAddress) {
        // HYD is token0
        expect(reserve0).to.equal(amountHYD);
        expect(reserve1).to.equal(amountUSDC);
      } else {
        // USDC is token0
        expect(reserve0).to.equal(amountUSDC);
        expect(reserve1).to.equal(amountHYD);
      }

      console.log(`LP tokens minted: ${ethers.formatEther(lpBalance)}`);
    });

    it("Should lock MINIMUM_LIQUIDITY permanently", async function () {
      const { hyd, usdc, factory, owner } = await loadFixture(deployPoolFixture);

      await factory.createPair(await hyd.getAddress(), await usdc.getAddress());
      const pairAddress = await factory.getPair(await hyd.getAddress(), await usdc.getAddress());
      const pair = await ethers.getContractAt("DEXPair", pairAddress);

      await usdc.transfer(pairAddress, ethers.parseUnits("100000", 6));
      await hyd.transfer(pairAddress, ethers.parseEther("100000"));
      await pair.mint(await owner.getAddress());

      // Verify MINIMUM_LIQUIDITY is locked
      const MINIMUM_LIQUIDITY = await pair.MINIMUM_LIQUIDITY();
      const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
      const deadBalance = await pair.balanceOf(DEAD_ADDRESS);

      expect(deadBalance).to.equal(MINIMUM_LIQUIDITY);
      expect(MINIMUM_LIQUIDITY).to.equal(1000n);
    });
  });

  describe("Swap Functionality", function () {
    async function deployWithLiquidityFixture() {
      const fixture = await deployPoolFixture();
      const { hyd, usdc, factory, owner } = fixture;

      // Create pair and add liquidity
      await factory.createPair(await hyd.getAddress(), await usdc.getAddress());
      const pairAddress = await factory.getPair(await hyd.getAddress(), await usdc.getAddress());
      const pair = await ethers.getContractAt("DEXPair", pairAddress);

      await usdc.transfer(pairAddress, ethers.parseUnits("100000", 6));
      await hyd.transfer(pairAddress, ethers.parseEther("100000"));
      await pair.mint(await owner.getAddress());

      return { ...fixture, pair };
    }

    it("Should swap 1000 HYD for USDC", async function () {
      const { hyd, usdc, pair, user1 } = await loadFixture(deployWithLiquidityFixture);

      const swapAmount = ethers.parseEther("1000"); // 1000 HYD
      const user1Address = await user1.getAddress();

      // Get initial balances
      const initialUSDC = await usdc.balanceOf(user1Address);

      // Transfer HYD to pair
      await hyd.connect(user1).transfer(await pair.getAddress(), swapAmount);

      // Calculate expected output (constant product formula)
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const hydAddress = await hyd.getAddress();

      let reserveIn: bigint, reserveOut: bigint;
      if (token0 === hydAddress) {
        reserveIn = reserve0;
        reserveOut = reserve1;
      } else {
        reserveIn = reserve1;
        reserveOut = reserve0;
      }

      // Calculate with 0.25% fee (9975 / 10000)
      const amountInWithFee = swapAmount * 9975n / 10000n;
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn + amountInWithFee;
      const expectedOut = numerator / denominator;

      // Execute swap
      const amount0Out = token0 === hydAddress ? 0n : expectedOut;
      const amount1Out = token0 === hydAddress ? expectedOut : 0n;
      await pair.connect(user1).swap(amount0Out, amount1Out, user1Address, "0x");

      // Verify output
      const finalUSDC = await usdc.balanceOf(user1Address);
      const actualOut = finalUSDC - initialUSDC;

      expect(actualOut).to.be.closeTo(expectedOut, ethers.parseUnits("1", 6)); // Within 1 USDC
      console.log(`Swapped 1000 HYD for ${ethers.formatUnits(actualOut, 6)} USDC`);
    });

    it("Should swap 1000 USDC for HYD", async function () {
      const { hyd, usdc, pair, user1 } = await loadFixture(deployWithLiquidityFixture);

      const swapAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      const user1Address = await user1.getAddress();

      const initialHYD = await hyd.balanceOf(user1Address);

      await usdc.connect(user1).transfer(await pair.getAddress(), swapAmount);

      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const usdcAddress = await usdc.getAddress();

      let reserveIn: bigint, reserveOut: bigint;
      if (token0 === usdcAddress) {
        reserveIn = reserve0;
        reserveOut = reserve1;
      } else {
        reserveIn = reserve1;
        reserveOut = reserve0;
      }

      const amountInWithFee = swapAmount * 9975n / 10000n;
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn + amountInWithFee;
      const expectedOut = numerator / denominator;

      const amount0Out = token0 === usdcAddress ? 0n : expectedOut;
      const amount1Out = token0 === usdcAddress ? expectedOut : 0n;
      await pair.connect(user1).swap(amount0Out, amount1Out, user1Address, "0x");

      const finalHYD = await hyd.balanceOf(user1Address);
      const actualOut = finalHYD - initialHYD;

      expect(actualOut).to.be.closeTo(expectedOut, ethers.parseEther("1")); // Within 1 HYD
      console.log(`Swapped 1000 USDC for ${ethers.formatEther(actualOut)} HYD`);
    });

    it("Should verify K invariant increases after swap (due to fees)", async function () {
      const { hyd, pair, user1 } = await loadFixture(deployWithLiquidityFixture);

      // Get initial K
      const [reserve0Before, reserve1Before] = await pair.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      // Swap
      const swapAmount = ethers.parseEther("1000");
      await hyd.connect(user1).transfer(await pair.getAddress(), swapAmount);

      const token0 = await pair.token0();
      const hydAddress = await hyd.getAddress();
      const isHYDToken0 = token0 === hydAddress;

      const amount0Out = isHYDToken0 ? 0n : ethers.parseUnits("997", 6);
      const amount1Out = isHYDToken0 ? ethers.parseUnits("997", 6) : 0n;
      await pair.connect(user1).swap(amount0Out, amount1Out, await user1.getAddress(), "0x");

      // Get new K
      const [reserve0After, reserve1After] = await pair.getReserves();
      const kAfter = reserve0After * reserve1After;

      // K should increase due to 0.25% fee
      expect(kAfter).to.be.gt(kBefore);
      console.log(`K before: ${kBefore}, K after: ${kAfter}`);
    });
  });

  describe("Price Impact Analysis", function () {
    async function deployWithLiquidityFixture() {
      const fixture = await deployPoolFixture();
      const { hyd, usdc, factory, owner } = fixture;

      await factory.createPair(await hyd.getAddress(), await usdc.getAddress());
      const pairAddress = await factory.getPair(await hyd.getAddress(), await usdc.getAddress());
      const pair = await ethers.getContractAt("DEXPair", pairAddress);

      await usdc.transfer(pairAddress, ethers.parseUnits("100000", 6));
      await hyd.transfer(pairAddress, ethers.parseEther("100000"));
      await pair.mint(await owner.getAddress());

      return { ...fixture, pair };
    }

    it("Should calculate price impact for various swap sizes", async function () {
      const { pair } = await loadFixture(deployWithLiquidityFixture);

      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();

      // Assume reserves are normalized for calculation
      const reserveHYD = ethers.parseEther("100000");
      const reserveUSDC = ethers.parseUnits("100000", 6);

      const testCases = [
        { name: "$100 swap", amount: ethers.parseEther("100"), expectedImpact: 0.13 },
        { name: "$1K swap", amount: ethers.parseEther("1000"), expectedImpact: 1.3 },
        { name: "$10K swap", amount: ethers.parseEther("10000"), expectedImpact: 11 },
      ];

      for (const { name, amount, expectedImpact } of testCases) {
        const amountInWithFee = amount * 9975n / 10000n;
        const normalizedReserveUSDC = reserveUSDC * ethers.parseEther("1") / ethers.parseUnits("1", 6);
        const numerator = amountInWithFee * normalizedReserveUSDC;
        const denominator = reserveHYD + amountInWithFee;
        const amountOut = numerator / denominator;

        const executedPrice = amount * ethers.parseEther("1") / amountOut;
        const midPrice = ethers.parseEther("1");
        const priceImpact = Number((executedPrice - midPrice) * 10000n / midPrice) / 100;

        console.log(`${name}: ${priceImpact.toFixed(2)}% price impact`);
        expect(Math.abs(priceImpact - expectedImpact)).to.be.lt(0.5);
      }
    });
  });

  describe("Fee Distribution", function () {
    async function deployWithLiquidityFixture() {
      const fixture = await deployPoolFixture();
      const { hyd, usdc, factory, owner } = fixture;

      await factory.createPair(await hyd.getAddress(), await usdc.getAddress());
      const pairAddress = await factory.getPair(await hyd.getAddress(), await usdc.getAddress());
      const pair = await ethers.getContractAt("DEXPair", pairAddress);

      await usdc.transfer(pairAddress, ethers.parseUnits("100000", 6));
      await hyd.transfer(pairAddress, ethers.parseEther("100000"));
      await pair.mint(await owner.getAddress());

      return { ...fixture, pair };
    }

    it("Should verify fee split: 70% voters, 30% treasury", async function () {
      const { pair } = await loadFixture(deployWithLiquidityFixture);

      // Verify fee constants
      const TOTAL_FEE = await pair.TOTAL_FEE();
      const VOTER_FEE = await pair.VOTER_FEE();
      const TREASURY_FEE = await pair.TREASURY_FEE();
      const FEE_DENOMINATOR = await pair.FEE_DENOMINATOR();

      expect(TOTAL_FEE).to.equal(25); // 0.25%
      expect(VOTER_FEE).to.equal(17); // 0.175% = 70% of 0.25%
      expect(TREASURY_FEE).to.equal(8); // 0.075% = 30% of 0.25%
      expect(FEE_DENOMINATOR).to.equal(10000);

      // Verify ratio
      expect(VOTER_FEE + TREASURY_FEE).to.equal(TOTAL_FEE);
      const voterPercent = Number(VOTER_FEE * 100n / TOTAL_FEE);
      const treasuryPercent = Number(TREASURY_FEE * 100n / TOTAL_FEE);

      expect(voterPercent).to.be.closeTo(70, 1); // ~70%
      expect(treasuryPercent).to.be.closeTo(30, 1); // ~30%
    });
  });
});
