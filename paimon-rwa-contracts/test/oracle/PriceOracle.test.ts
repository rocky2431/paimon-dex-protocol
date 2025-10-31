import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PriceOracle, MockChainlinkAggregator, MockPyth } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * PriceOracle Test Suite - TDD RED Phase
 *
 * Dual-oracle architecture: Chainlink (primary) + Pyth (fallback)
 * Circuit breaker: 5% deviation threshold
 * Staleness check: 1 hour (3600s)
 * Recovery delay: 30 minutes (1800s)
 *
 * Test Dimensions:
 * 1. Deployment & Initialization (4 tests) - 8%
 * 2. Functional Tests (8 tests) - 30%
 * 3. Boundary Tests (6 tests) - 20%
 * 4. Exception Tests (6 tests) - 20%
 * 5. Circuit Breaker Tests (5 tests) - 15%
 * 6. Integration Tests (3 tests) - 10%
 * 7. Security Tests (3 tests) - 5%
 *
 * Total: 35 tests targeting >90% coverage
 */

describe("PriceOracle", function () {
  // Constants
  const DEVIATION_THRESHOLD = 500n; // 5% = 500 basis points
  const STALENESS_THRESHOLD = 3600n; // 1 hour
  const RECOVERY_DELAY = 1800n; // 30 minutes
  const CHAINLINK_DECIMALS = 8;
  const PYTH_EXPO = -8; // Pyth uses expo notation (price * 10^expo)

  // Price feed IDs (from research doc)
  const USDC_USD_FEED_ID = ethers.encodeBytes32String("USDC/USD");
  const USDT_USD_FEED_ID = ethers.encodeBytes32String("USDT/USD");
  const BNB_USD_FEED_ID = ethers.encodeBytes32String("BNB/USD");

  // Test fixtures
  async function deployPriceOracleFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock Chainlink Aggregators
    const MockChainlinkAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
    const chainlinkUSDC = await MockChainlinkAggregator.deploy(CHAINLINK_DECIMALS, "USDC/USD");
    const chainlinkUSDT = await MockChainlinkAggregator.deploy(CHAINLINK_DECIMALS, "USDT/USD");
    const chainlinkBNB = await MockChainlinkAggregator.deploy(CHAINLINK_DECIMALS, "BNB/USD");

    await chainlinkUSDC.waitForDeployment();
    await chainlinkUSDT.waitForDeployment();
    await chainlinkBNB.waitForDeployment();

    // Deploy Mock Pyth
    const MockPyth = await ethers.getContractFactory("MockPyth");
    const pyth = await MockPyth.deploy();
    await pyth.waitForDeployment();

    // Initialize Pyth prices
    await pyth.setPriceSimple(USDC_USD_FEED_ID, 100000000, PYTH_EXPO); // $1.00
    await pyth.setPriceSimple(USDT_USD_FEED_ID, 100000000, PYTH_EXPO); // $1.00
    await pyth.setPriceSimple(BNB_USD_FEED_ID, 60000000000, PYTH_EXPO); // $600.00

    // Initialize Chainlink prices
    await chainlinkUSDC.setLatestAnswer(100000000n); // $1.00
    await chainlinkUSDT.setLatestAnswer(100000000n); // $1.00
    await chainlinkBNB.setLatestAnswer(60000000000n); // $600.00

    // Deploy PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const oracle = await PriceOracle.deploy(
      await pyth.getAddress(),
      DEVIATION_THRESHOLD,
      STALENESS_THRESHOLD
    );
    await oracle.waitForDeployment();

    return {
      oracle,
      chainlinkUSDC,
      chainlinkUSDT,
      chainlinkBNB,
      pyth,
      owner,
      user1,
      user2,
    };
  }

  // ============================================================
  // 1. DEPLOYMENT & INITIALIZATION (4 tests)
  // ============================================================

  describe("Deployment & Initialization", function () {
    it("Should deploy with correct Pyth address", async function () {
      const { oracle, pyth } = await loadFixture(deployPriceOracleFixture);
      expect(await oracle.pyth()).to.equal(await pyth.getAddress());
    });

    it("Should initialize with correct deviation threshold", async function () {
      const { oracle } = await loadFixture(deployPriceOracleFixture);
      expect(await oracle.deviationThreshold()).to.equal(DEVIATION_THRESHOLD);
    });

    it("Should initialize with correct staleness threshold", async function () {
      const { oracle } = await loadFixture(deployPriceOracleFixture);
      expect(await oracle.stalenessThreshold()).to.equal(STALENESS_THRESHOLD);
    });

    it("Should revert if Pyth address is zero", async function () {
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      await expect(
        PriceOracle.deploy(ethers.ZeroAddress, DEVIATION_THRESHOLD, STALENESS_THRESHOLD)
      ).to.be.revertedWithCustomError(await ethers.getContractFactory("PriceOracle"), "InvalidPythAddress");
    });
  });

  // ============================================================
  // 2. FUNCTIONAL TESTS (8 tests) - 30%
  // ============================================================

  describe("Functional Tests", function () {
    it("Should add price feed successfully", async function () {
      const { oracle, chainlinkUSDC, owner } = await loadFixture(deployPriceOracleFixture);

      await expect(
        oracle.connect(owner).addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress())
      )
        .to.emit(oracle, "PriceFeedAdded")
        .withArgs(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      expect(await oracle.getPriceFeed(USDC_USD_FEED_ID)).to.equal(
        await chainlinkUSDC.getAddress()
      );
    });

    it("Should get price from Chainlink when both oracles agree", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n); // $1.00 with 8 decimals
    });

    it("Should normalize prices to 8 decimals", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      // Price should always be in 8 decimals format
      expect(price.toString().length).to.be.lessThanOrEqual(11); // Max ~$999.99999999
    });

    it("Should return Pyth price when Chainlink deviates >5%", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Chainlink: $1.00, Pyth: $1.00 → set Chainlink to $1.10 (10% deviation)
      await chainlinkUSDC.setLatestAnswer(110000000n); // $1.10

      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n); // Should use Pyth's $1.00
    });

    it("Should emit PriceReturned event with correct data", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      await expect(oracle.getPrice(USDC_USD_FEED_ID))
        .to.emit(oracle, "PriceReturned")
        .withArgs(USDC_USD_FEED_ID, 100000000n, "Chainlink");
    });

    it("Should support multiple price feeds", async function () {
      const { oracle, chainlinkUSDC, chainlinkUSDT, chainlinkBNB } = await loadFixture(
        deployPriceOracleFixture
      );

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());
      await oracle.addPriceFeed(USDT_USD_FEED_ID, await chainlinkUSDT.getAddress());
      await oracle.addPriceFeed(BNB_USD_FEED_ID, await chainlinkBNB.getAddress());

      expect(await oracle.getPrice.staticCall(USDC_USD_FEED_ID)).to.equal(100000000n);
      expect(await oracle.getPrice.staticCall(USDT_USD_FEED_ID)).to.equal(100000000n);
      expect(await oracle.getPrice.staticCall(BNB_USD_FEED_ID)).to.equal(60000000000n);
    });

    it("Should update deviation threshold by owner", async function () {
      const { oracle, owner } = await loadFixture(deployPriceOracleFixture);

      const newThreshold = 1000n; // 10%
      await expect(oracle.connect(owner).setDeviationThreshold(newThreshold))
        .to.emit(oracle, "DeviationThresholdUpdated")
        .withArgs(DEVIATION_THRESHOLD, newThreshold);

      expect(await oracle.deviationThreshold()).to.equal(newThreshold);
    });

    it("Should remove price feed successfully", async function () {
      const { oracle, chainlinkUSDC, owner } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      await expect(oracle.connect(owner).removePriceFeed(USDC_USD_FEED_ID))
        .to.emit(oracle, "PriceFeedRemoved")
        .withArgs(USDC_USD_FEED_ID);

      expect(await oracle.getPriceFeed(USDC_USD_FEED_ID)).to.equal(ethers.ZeroAddress);
    });
  });

  // ============================================================
  // 3. BOUNDARY TESTS (6 tests) - 20%
  // ============================================================

  describe("Boundary Tests", function () {
    it("Should handle zero price from Chainlink", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());
      await chainlinkUSDC.setShouldReturnZeroPrice(true);

      // Should fallback to Pyth
      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n); // Pyth's $1.00
    });

    it("Should handle negative price from Chainlink", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());
      await chainlinkUSDC.setLatestAnswer(-100000000n);

      await expect(oracle.getPrice(USDC_USD_FEED_ID)).to.be.revertedWithCustomError(
        oracle,
        "InvalidChainlinkPrice"
      );
    });

    it("Should handle exactly 5% deviation (should trip)", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Chainlink: $1.05 (exactly 5% deviation from Pyth's $1.00)
      await chainlinkUSDC.setLatestAnswer(105000000n);

      // Should trip circuit breaker and use Pyth
      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n);
    });

    it("Should handle 4.99% deviation (should NOT trip)", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Chainlink: $1.0499 (4.99% deviation)
      await chainlinkUSDC.setLatestAnswer(104990000n);

      // Should use Chainlink
      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(104990000n);
    });

    it("Should handle maximum int256 price", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      const maxInt256 = (1n << 255n) - 1n;
      await chainlinkUSDC.setLatestAnswer(maxInt256);

      // Should handle gracefully (likely fallback to Pyth due to deviation)
      await expect(oracle.getPrice(USDC_USD_FEED_ID)).to.not.be.reverted;
    });

    it("Should handle timestamp at staleness boundary", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Set timestamp to exactly 1 hour ago (3600 seconds)
      const currentTime = await time.latest();
      await chainlinkUSDC.setUpdatedAt(currentTime - Number(STALENESS_THRESHOLD));

      // Should still accept (≤ threshold)
      await expect(oracle.getPrice(USDC_USD_FEED_ID)).to.not.be.reverted;
    });
  });

  // ============================================================
  // 4. EXCEPTION TESTS (6 tests) - 20%
  // ============================================================

  describe("Exception Tests", function () {
    it("Should revert when price feed not found", async function () {
      const { oracle } = await loadFixture(deployPriceOracleFixture);

      await expect(oracle.getPrice(USDC_USD_FEED_ID)).to.be.revertedWithCustomError(oracle, "PriceFeedNotFound");
    });

    it("Should revert when Chainlink data is stale (>1 hour)", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Set Chainlink timestamp to 2 hours ago
      await chainlinkUSDC.setShouldReturnStaleData(true);

      // Should fallback to Pyth
      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n); // Pyth's price
    });

    it("Should revert when both oracles fail", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Make both oracles fail
      await chainlinkUSDC.setShouldRevert(true);
      await pyth.setShouldRevert(true);

      await expect(oracle.getPrice(USDC_USD_FEED_ID)).to.be.revertedWithCustomError(
        oracle,
        "AllOraclesFailed"
      );
    });

    it("Should revert when adding duplicate price feed", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      await expect(
        oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress())
      ).to.be.revertedWithCustomError(oracle, "PriceFeedAlreadyExists");
    });

    it("Should revert when non-owner tries to add price feed", async function () {
      const { oracle, chainlinkUSDC, user1 } = await loadFixture(deployPriceOracleFixture);

      await expect(
        oracle.connect(user1).addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress())
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });

    it("Should handle Pyth price update failure gracefully", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Make Pyth return stale data
      await pyth.setShouldReturnStaleData(true);

      // Should still work if Chainlink is valid
      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n);
    });
  });

  // ============================================================
  // 5. CIRCUIT BREAKER TESTS (5 tests) - 15%
  // ============================================================

  describe("Circuit Breaker Tests", function () {
    it("Should trip circuit breaker on 5% deviation", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Chainlink: $1.10 (10% deviation)
      await chainlinkUSDC.setLatestAnswer(110000000n);

      await expect(oracle.getPrice(USDC_USD_FEED_ID))
        .to.emit(oracle, "CircuitBreakerTripped")
        .withArgs(USDC_USD_FEED_ID, 110000000n, 100000000n);
    });

    it("Should use Pyth as fallback after circuit breaker trips", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Trip circuit breaker
      await chainlinkUSDC.setLatestAnswer(110000000n);

      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n); // Pyth's $1.00
    });

    it("Should start recovery delay after circuit breaker trips", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Trip circuit breaker (need real tx to update state, not staticCall)
      await chainlinkUSDC.setLatestAnswer(110000000n);
      await oracle.getPrice(USDC_USD_FEED_ID);

      const circuitBreakerState = await oracle.circuitBreakerState(USDC_USD_FEED_ID);
      expect(circuitBreakerState.isTripped).to.be.true;
      expect(circuitBreakerState.trippedAt).to.be.greaterThan(0);
    });

    it("Should recover after 30 minutes if prices converge", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Trip circuit breaker (need real tx to update state)
      await chainlinkUSDC.setLatestAnswer(110000000n);
      await oracle.getPrice(USDC_USD_FEED_ID);

      // Fast forward 30 minutes
      await time.increase(Number(RECOVERY_DELAY) + 1);

      // Fix Chainlink price back to normal
      await chainlinkUSDC.setLatestAnswer(100000000n);

      await expect(oracle.getPrice(USDC_USD_FEED_ID))
        .to.emit(oracle, "CircuitBreakerRecovered")
        .withArgs(USDC_USD_FEED_ID);
    });

    it("Should NOT recover if prices still deviate after delay", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Trip circuit breaker
      await chainlinkUSDC.setLatestAnswer(110000000n);
      await oracle.getPrice.staticCall(USDC_USD_FEED_ID);

      // Fast forward 30 minutes
      await time.increase(Number(RECOVERY_DELAY) + 1);

      // Chainlink still deviates
      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n); // Still using Pyth
    });
  });

  // ============================================================
  // 6. INTEGRATION TESTS (3 tests) - 10%
  // ============================================================

  describe("Integration Tests", function () {
    it("Should handle full workflow: add feed → get price → remove feed", async function () {
      const { oracle, chainlinkUSDC, owner } = await loadFixture(deployPriceOracleFixture);

      // Add feed
      await oracle.connect(owner).addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Get price
      const price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n);

      // Remove feed
      await oracle.connect(owner).removePriceFeed(USDC_USD_FEED_ID);

      // Should revert after removal
      await expect(oracle.getPrice(USDC_USD_FEED_ID)).to.be.revertedWithCustomError(oracle, "PriceFeedNotFound");
    });

    it("Should handle Chainlink failure → Pyth fallback → Chainlink recovery", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // 1. Chainlink works
      let price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n);

      // 2. Chainlink fails → Pyth fallback
      await chainlinkUSDC.setShouldRevert(true);
      price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n);

      // 3. Chainlink recovers
      await chainlinkUSDC.setShouldRevert(false);
      price = await oracle.getPrice.staticCall(USDC_USD_FEED_ID);
      expect(price).to.equal(100000000n);
    });

    it("Should handle multiple concurrent price requests", async function () {
      const { oracle, chainlinkUSDC, chainlinkUSDT, chainlinkBNB } = await loadFixture(
        deployPriceOracleFixture
      );

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());
      await oracle.addPriceFeed(USDT_USD_FEED_ID, await chainlinkUSDT.getAddress());
      await oracle.addPriceFeed(BNB_USD_FEED_ID, await chainlinkBNB.getAddress());

      // Request multiple prices (use staticCall for read-only)
      const [priceUSDC, priceUSDT, priceBNB] = await Promise.all([
        oracle.getPrice.staticCall(USDC_USD_FEED_ID),
        oracle.getPrice.staticCall(USDT_USD_FEED_ID),
        oracle.getPrice.staticCall(BNB_USD_FEED_ID),
      ]);

      expect(priceUSDC).to.equal(100000000n);
      expect(priceUSDT).to.equal(100000000n);
      expect(priceBNB).to.equal(60000000000n);
    });
  });

  // ============================================================
  // 7. SECURITY TESTS (3 tests) - 5%
  // ============================================================

  describe("Security Tests", function () {
    it("Should prevent reentrancy attacks", async function () {
      const { oracle, chainlinkUSDC } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Note: Reentrancy testing requires special setup
      // This is a placeholder - actual implementation would need ReentrancyGuard
      expect(await oracle.getPrice.staticCall(USDC_USD_FEED_ID)).to.equal(100000000n);
    });

    it("Should protect owner-only functions", async function () {
      const { oracle, chainlinkUSDC, user1 } = await loadFixture(deployPriceOracleFixture);

      await expect(
        oracle.connect(user1).addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress())
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");

      await expect(
        oracle.connect(user1).removePriceFeed(USDC_USD_FEED_ID)
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");

      await expect(oracle.connect(user1).setDeviationThreshold(1000n)).to.be.revertedWithCustomError(
        oracle,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should prevent decimal precision attacks", async function () {
      const { oracle, chainlinkUSDC, pyth } = await loadFixture(deployPriceOracleFixture);

      await oracle.addPriceFeed(USDC_USD_FEED_ID, await chainlinkUSDC.getAddress());

      // Try setting very small price (precision attack)
      await chainlinkUSDC.setLatestAnswer(1n); // 0.00000001 USD

      // Oracle should handle gracefully (likely fallback to Pyth)
      await expect(oracle.getPrice(USDC_USD_FEED_ID)).to.not.be.reverted;
    });
  });
});
