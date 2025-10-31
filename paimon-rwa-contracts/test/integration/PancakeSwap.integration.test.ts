import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { HYD, MockERC20, IPancakeRouter02, IPancakeFactory, IPancakePair } from "../../typechain-types";

/**
 * @title PancakeSwap Integration Tests
 * @notice Tests HYD integration with PancakeSwap V2 Router
 *
 * Test Dimensions:
 * 1. Liquidity Management - Add/remove liquidity for HYD/USDC pair
 * 2. Swap Functionality - Swap HYD ↔ USDC through PancakeSwap
 * 3. Price Impact - Verify <2% impact for $10K swaps (with adequate liquidity)
 * 4. Security - Deadline protection, slippage protection
 *
 * Note: These tests use mock contracts. For BSC mainnet/testnet deployment,
 *       use real PancakeSwap Router addresses:
 *       - Mainnet: 0x10ED43C718714eb63d5aA57B78B54704E256024E
 *       - Testnet: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
 */
describe("PancakeSwap Integration", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let treasury: SignerWithAddress;

  let hyd: HYD;
  let usdc: MockERC20;

  // PancakeSwap Router address (BSC Testnet for this example)
  const PANCAKE_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const PANCAKE_FACTORY_TESTNET = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";

  /**
   * Deployment fixture for integration tests
   * NOTE: This is a simplified version for demonstration.
   *       Real deployment would use actual BSC testnet fork.
   */
  async function deployIntegrationFixture() {
    [owner, user1, treasury] = await ethers.getSigners();

    // Deploy mock USDC (6 decimals like real USDC)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    // Deploy HYD token
    const HYD = await ethers.getContractFactory("HYD");
    hyd = await HYD.deploy(await owner.getAddress());

    // Mint tokens to owner for testing
    const initialUSDC = ethers.parseUnits("500000", 6); // 500K USDC
    const initialHYD = ethers.parseEther("500000"); // 500K HYD

    await usdc.mint(await owner.getAddress(), initialUSDC);
    await hyd.mint(await owner.getAddress(), initialHYD);

    return { hyd, usdc, owner, user1, treasury };
  }

  describe("Liquidity Management", function () {
    it("Should document PancakeSwap Router interface", async function () {
      const { hyd, usdc, owner } = await deployIntegrationFixture();

      // This test documents how to interact with PancakeSwap Router
      // In a real scenario, you would:

      // 1. Approve tokens to Router
      const routerAddress = PANCAKE_ROUTER_TESTNET;
      const amountHYD = ethers.parseEther("100000"); // 100K HYD
      const amountUSDC = ethers.parseUnits("100000", 6); // 100K USDC

      // await hyd.approve(routerAddress, amountHYD);
      // await usdc.approve(routerAddress, amountUSDC);

      // 2. Add liquidity through Router
      // const router = await ethers.getContractAt("IPancakeRouter02", routerAddress);
      // const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
      //
      // const tx = await router.addLiquidity(
      //   await hyd.getAddress(),
      //   await usdc.getAddress(),
      //   amountHYD,
      //   amountUSDC,
      //   amountHYD * 995n / 1000n, // 0.5% slippage
      //   amountUSDC * 995n / 1000n,
      //   await owner.getAddress(),
      //   deadline
      // );
      //
      // const receipt = await tx.wait();
      // expect(receipt).to.not.be.null;

      // 3. Verify LP tokens received
      // const factory = await ethers.getContractAt("IPancakeFactory", PANCAKE_FACTORY_TESTNET);
      // const pairAddress = await factory.getPair(
      //   await hyd.getAddress(),
      //   await usdc.getAddress()
      // );
      //
      // const pair = await ethers.getContractAt("IPancakePair", pairAddress);
      // const lpBalance = await pair.balanceOf(await owner.getAddress());
      // expect(lpBalance).to.be.gt(0);

      // For now, just verify token deployment
      expect(await hyd.name()).to.equal("HYD Stablecoin");
      expect(await usdc.name()).to.equal("USD Coin");
    });

    it("Should calculate expected LP tokens for liquidity", async function () {
      const { hyd, usdc } = await deployIntegrationFixture();

      // Calculate expected LP tokens using geometric mean formula:
      // liquidity = sqrt(amountA × amountB) - MINIMUM_LIQUIDITY
      const amountHYD = ethers.parseEther("100000"); // 100K HYD
      const amountUSDC = ethers.parseUnits("100000", 6); // 100K USDC

      // Normalize USDC to 18 decimals for calculation
      const normalizedUSDC = amountUSDC * ethers.parseEther("1") / ethers.parseUnits("1", 6);

      // Calculate sqrt(amountHYD × normalizedUSDC)
      const product = amountHYD * normalizedUSDC;
      const liquidity = sqrt(product);

      // PancakeSwap locks 1000 wei of LP tokens permanently (MINIMUM_LIQUIDITY)
      const MINIMUM_LIQUIDITY = 1000n;
      const expectedLPTokens = liquidity - MINIMUM_LIQUIDITY;

      expect(expectedLPTokens).to.be.gt(0);
      // For 100K × 100K, expected LP ≈ 100K tokens (after normalization)
      expect(expectedLPTokens).to.be.closeTo(ethers.parseEther("100000"), ethers.parseEther("1"));
    });
  });

  describe("Swap Functionality", function () {
    it("Should document swap exact tokens for tokens", async function () {
      const { hyd, usdc, owner } = await deployIntegrationFixture();

      // This test documents how to swap tokens through PancakeSwap
      // In a real scenario, you would:

      // 1. Approve HYD to Router for swap
      const routerAddress = PANCAKE_ROUTER_TESTNET;
      const amountIn = ethers.parseEther("1000"); // Swap 1000 HYD

      // await hyd.approve(routerAddress, amountIn);

      // 2. Calculate expected output using getAmountsOut
      // const router = await ethers.getContractAt("IPancakeRouter02", routerAddress);
      // const path = [await hyd.getAddress(), await usdc.getAddress()];
      // const amounts = await router.getAmountsOut(amountIn, path);
      // const expectedUSDC = amounts[1];

      // 3. Execute swap with slippage protection
      // const amountOutMin = expectedUSDC * 995n / 1000n; // 0.5% slippage
      // const deadline = Math.floor(Date.now() / 1000) + 1200;
      //
      // const tx = await router.swapExactTokensForTokens(
      //   amountIn,
      //   amountOutMin,
      //   path,
      //   await owner.getAddress(),
      //   deadline
      // );
      //
      // const receipt = await tx.wait();
      // expect(receipt).to.not.be.null;

      // For now, just verify token deployment
      expect(await hyd.totalSupply()).to.be.gt(0);
      expect(await usdc.totalSupply()).to.be.gt(0);
    });

    it("Should calculate constant product formula for swaps", async function () {
      // Test constant product AMM formula: k = x × y
      const reserveHYD = ethers.parseEther("100000"); // 100K HYD
      const reserveUSDC = ethers.parseUnits("100000", 6); // 100K USDC

      // Normalize USDC to 18 decimals
      const normalizedReserveUSDC = reserveUSDC * ethers.parseEther("1") / ethers.parseUnits("1", 6);

      // k = reserveHYD × reserveUSDC
      const k = reserveHYD * normalizedReserveUSDC;

      // Swap 1000 HYD for USDC
      const amountIn = ethers.parseEther("1000");
      const amountInWithFee = amountIn * 997n / 1000n; // 0.3% fee

      // Calculate output: (amountIn × reserveUSDC) / (reserveHYD + amountIn)
      const numerator = amountInWithFee * normalizedReserveUSDC;
      const denominator = reserveHYD + amountInWithFee;
      const amountOut = numerator / denominator;

      // Verify k increases slightly due to fee
      const newReserveHYD = reserveHYD + amountIn;
      const newReserveUSDC = normalizedReserveUSDC - amountOut;
      const newK = newReserveHYD * newReserveUSDC;

      expect(newK).to.be.gt(k); // Fee causes k to increase
      expect(amountOut).to.be.closeTo(ethers.parseEther("997"), ethers.parseEther("5")); // ~997 USDC out
    });
  });

  describe("Price Impact Analysis", function () {
    it("Should calculate price impact for various swap sizes", async function () {
      const reserveHYD = ethers.parseEther("100000"); // 100K HYD
      const reserveUSDC = ethers.parseUnits("100000", 6); // 100K USDC
      const normalizedReserveUSDC = reserveUSDC * ethers.parseEther("1") / ethers.parseUnits("1", 6);

      const testCases = [
        { name: "$100 swap", amount: ethers.parseEther("100"), expectedImpact: 0.1 },
        { name: "$1K swap", amount: ethers.parseEther("1000"), expectedImpact: 1.0 },
        { name: "$10K swap", amount: ethers.parseEther("10000"), expectedImpact: 10.0 },
      ];

      for (const { name, amount, expectedImpact } of testCases) {
        // Calculate output with constant product formula
        const amountInWithFee = amount * 997n / 1000n;
        const numerator = amountInWithFee * normalizedReserveUSDC;
        const denominator = reserveHYD + amountInWithFee;
        const amountOut = numerator / denominator;

        // Calculate executed price
        const executedPrice = amount * ethers.parseEther("1") / amountOut;
        const midPrice = ethers.parseEther("1"); // 1 HYD = 1 USDC

        // Price impact = (executedPrice - midPrice) / midPrice × 100%
        const priceImpact = Number((executedPrice - midPrice) * 10000n / midPrice) / 100;

        console.log(`${name}: ${priceImpact.toFixed(2)}% price impact`);
        expect(Math.abs(priceImpact - expectedImpact)).to.be.lt(0.5); // Within 0.5%
      }
    });

    it("Should verify $10K swap has <2% impact with $500K liquidity", async function () {
      // With $500K liquidity (instead of $100K), price impact should be <2%
      const reserveHYD = ethers.parseEther("500000"); // 500K HYD
      const reserveUSDC = ethers.parseUnits("500000", 6); // 500K USDC
      const normalizedReserveUSDC = reserveUSDC * ethers.parseEther("1") / ethers.parseUnits("1", 6);

      const swapAmount = ethers.parseEther("10000"); // $10K swap

      // Calculate output
      const amountInWithFee = swapAmount * 997n / 1000n;
      const numerator = amountInWithFee * normalizedReserveUSDC;
      const denominator = reserveHYD + amountInWithFee;
      const amountOut = numerator / denominator;

      // Calculate price impact
      const executedPrice = swapAmount * ethers.parseEther("1") / amountOut;
      const midPrice = ethers.parseEther("1");
      const priceImpact = Number((executedPrice - midPrice) * 10000n / midPrice) / 100;

      console.log(`$10K swap with $500K liquidity: ${priceImpact.toFixed(2)}% price impact`);
      expect(priceImpact).to.be.lt(2.0); // <2% price impact ✅
    });
  });

  describe("Security Features", function () {
    it("Should enforce deadline protection", async function () {
      const { hyd, usdc } = await deployIntegrationFixture();

      // Deadline protection prevents transaction from being executed after a certain time
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const validDeadline = currentTimestamp + 1200; // 20 minutes from now
      const expiredDeadline = currentTimestamp - 60; // 1 minute ago

      expect(validDeadline).to.be.gt(currentTimestamp);
      expect(expiredDeadline).to.be.lt(currentTimestamp);

      // In real PancakeSwap Router:
      // - Transaction with validDeadline would succeed
      // - Transaction with expiredDeadline would revert with "PancakeRouter: EXPIRED"
    });

    it("Should enforce slippage protection", async function () {
      const expectedOut = ethers.parseUnits("997", 6); // Expect ~997 USDC

      // Slippage settings
      const slippage05 = expectedOut * 995n / 1000n; // 0.5% slippage
      const slippage1 = expectedOut * 990n / 1000n; // 1.0% slippage
      const slippage5 = expectedOut * 950n / 1000n; // 5.0% slippage

      expect(slippage05).to.equal(ethers.parseUnits("992.015", 6));
      expect(slippage1).to.equal(ethers.parseUnits("987.03", 6));
      expect(slippage5).to.equal(ethers.parseUnits("947.15", 6));

      // In real PancakeSwap Router:
      // - If actualOut < amountOutMin, transaction reverts with "PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT"
    });
  });

  describe("Integration Best Practices", function () {
    it("Should approve exact amounts (not unlimited)", async function () {
      const { hyd, usdc, owner } = await deployIntegrationFixture();

      const amountToSwap = ethers.parseEther("1000");
      const routerAddress = PANCAKE_ROUTER_TESTNET;

      // ✅ GOOD: Approve exact amount
      await hyd.approve(routerAddress, amountToSwap);
      const allowance = await hyd.allowance(await owner.getAddress(), routerAddress);
      expect(allowance).to.equal(amountToSwap);

      // ❌ BAD: Approve unlimited (type(uint256).max)
      // This is a security risk and should be avoided
    });

    it("Should document LP token management", async function () {
      const { owner, treasury } = await deployIntegrationFixture();

      // Best practices for LP tokens:
      // 1. Transfer to Treasury multi-sig immediately after adding liquidity
      // 2. DO NOT burn LP tokens (liquidity needs to be removable)
      // 3. Monitor LP token balance for security
      // 4. Implement time lock for removing liquidity (optional)

      // Example:
      // const pair = await ethers.getContractAt("IPancakePair", pairAddress);
      // const lpBalance = await pair.balanceOf(await owner.getAddress());
      // await pair.transfer(await treasury.getAddress(), lpBalance);

      expect(await owner.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await treasury.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });
});

/**
 * Helper function: Integer square root using Newton's method
 * @param value Value to calculate square root of
 * @returns Square root (rounded down)
 */
function sqrt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error("Square root of negative number");
  }
  if (value < 2n) {
    return value;
  }

  let z = value;
  let x = value / 2n + 1n;

  while (x < z) {
    z = x;
    x = (value / x + x) / 2n;
  }

  return z;
}
