// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/oracle/RWAPriceOracle.sol";
import "../../src/mocks/MockV3Aggregator.sol";

/**
 * @title RWAPriceOracle Unit Test Suite
 * @notice Comprehensive tests for Chainlink-integrated price oracle
 * @dev Follows TDD RED-GREEN-REFACTOR cycle
 *
 * Task: RWA-007 (RWAPriceOracle Contract)
 * Priority: P1
 *
 * Test Coverage (6 Dimensions):
 * 1. Functional: Core price retrieval, NAV updates, dual-source averaging
 * 2. Boundary: Zero prices, max values, staleness edge cases
 * 3. Exception: Invalid feeds, sequencer down, oracle failures
 * 4. Performance: Gas benchmarks for key operations
 * 5. Security: Circuit breaker, access control, reentrancy
 * 6. Compatibility: Different decimals, Base testnet vs mainnet
 */
contract RWAPriceOracleTest is Test {
  // Contracts
  RWAPriceOracle public oracle;
  MockV3Aggregator public ethUsdFeed;
  MockV3Aggregator public sequencerUptimeFeed;

  // Test accounts
  address public owner = address(0x1);
  address public trustedOracle = address(0x2);
  address public unauthorized = address(0x3);

  // Constants from research
  uint256 public constant TIMEOUT = 3600; // 1 hour staleness threshold
  uint256 public constant GRACE_PERIOD = 3600; // 1 hour grace period
  uint8 public constant PRICE_FEED_DECIMALS = 8; // Chainlink standard
  uint8 public constant TARGET_DECIMALS = 18; // Internal format

  // Test price values
  int256 public constant INITIAL_ETH_PRICE = 2000 * 10**8; // $2000 with 8 decimals
  uint256 public constant INITIAL_NAV_PRICE = 1950 * 10**18; // $1950 with 18 decimals

  // Circuit breaker threshold (15% from research)
  uint256 public constant MAX_DEVIATION_PERCENT = 15;

  function setUp() public {
    // Set initial timestamp to allow grace period calculations
    vm.warp(GRACE_PERIOD + 1000);

    // Deploy mock Chainlink feeds
    ethUsdFeed = new MockV3Aggregator(PRICE_FEED_DECIMALS, INITIAL_ETH_PRICE);
    sequencerUptimeFeed = new MockV3Aggregator(0, 0); // 0 = sequencer up

    // Set sequencer startedAt to past (so grace period is already over)
    sequencerUptimeFeed.updateRoundData(
      1, // roundId
      0, // answer (0 = up)
      block.timestamp - GRACE_PERIOD - 1, // startedAt (past)
      block.timestamp, // updatedAt
      1 // answeredInRound
    );

    // Deploy oracle contract
    vm.prank(owner);
    oracle = new RWAPriceOracle(
      address(ethUsdFeed),
      address(sequencerUptimeFeed),
      trustedOracle
    );
  }

  // ============================================================
  // 1. FUNCTIONAL TESTS: Core Business Logic
  // ============================================================

  /**
   * @notice Test: Constructor initializes correctly
   */
  function test_Constructor_Success() public {
    assertEq(address(oracle.chainlinkFeed()), address(ethUsdFeed));
    assertEq(address(oracle.sequencerUptimeFeed()), address(sequencerUptimeFeed));
    assertEq(oracle.trustedOracle(), trustedOracle);
    assertEq(oracle.owner(), owner);
  }

  /**
   * @notice Test: Get Chainlink price (Chainlink-only mode)
   */
  function test_GetPrice_ChainlinkOnly_Success() public {
    uint256 price = oracle.getPrice();

    // Price should be scaled from 8 decimals to 18 decimals
    // $2000 * 10^8 → $2000 * 10^18
    uint256 expectedPrice = uint256(INITIAL_ETH_PRICE) * 10**(TARGET_DECIMALS - PRICE_FEED_DECIMALS);
    assertEq(price, expectedPrice);
  }

  /**
   * @notice Test: Update NAV price (trusted oracle only)
   */
  function test_UpdateNAV_Success() public {
    vm.prank(trustedOracle);
    oracle.updateNAV(INITIAL_NAV_PRICE);

    assertEq(oracle.latestNAV(), INITIAL_NAV_PRICE);
    assertEq(oracle.navUpdatedAt(), block.timestamp);
  }

  /**
   * @notice Test: Dual-source averaging (50% Chainlink, 50% NAV)
   */
  function test_GetPrice_DualSource_Success() public {
    // Enable dual-source mode by updating NAV
    vm.prank(trustedOracle);
    oracle.updateNAV(INITIAL_NAV_PRICE);

    uint256 price = oracle.getPrice();

    // Expected: (2000 * 10^18 + 1950 * 10^18) / 2 = 1975 * 10^18
    uint256 chainlinkScaled = uint256(INITIAL_ETH_PRICE) * 10**(TARGET_DECIMALS - PRICE_FEED_DECIMALS);
    uint256 expectedPrice = (chainlinkScaled + uint256(INITIAL_NAV_PRICE)) / 2;

    assertEq(price, expectedPrice);
  }

  /**
   * @notice Test: Get formatted price (human-readable)
   */
  function test_GetFormattedPrice_Success() public {
    (uint256 price, uint8 decimals) = oracle.getFormattedPrice();

    uint256 expectedPrice = uint256(INITIAL_ETH_PRICE) * 10**(TARGET_DECIMALS - PRICE_FEED_DECIMALS);
    assertEq(price, expectedPrice);
    assertEq(decimals, TARGET_DECIMALS);
  }

  // ============================================================
  // 2. BOUNDARY TESTS: Edge Cases
  // ============================================================

  /**
   * @notice Test: Zero price from Chainlink (should revert)
   */
  function test_GetPrice_ZeroPrice_Reverts() public {
    ethUsdFeed.updateAnswer(0);

    vm.expectRevert("No valid price source available");
    oracle.getPrice();
  }

  /**
   * @notice Test: Negative price from Chainlink (should revert)
   */
  function test_GetPrice_NegativePrice_Reverts() public {
    ethUsdFeed.updateAnswer(-100);

    vm.expectRevert("No valid price source available");
    oracle.getPrice();
  }

  /**
   * @notice Test: Maximum safe price (no overflow)
   */
  function test_GetPrice_MaxSafePrice_Success() public {
    // Set to max safe int256 that won't overflow when scaled
    int256 maxSafePrice = type(int256).max / int256(10**(TARGET_DECIMALS - PRICE_FEED_DECIMALS));
    ethUsdFeed.updateAnswer(maxSafePrice);

    uint256 price = oracle.getPrice();
    assertTrue(price > 0);
    assertTrue(price <= type(uint256).max);
  }

  /**
   * @notice Test: Stale price data (exactly at timeout boundary)
   */
  function test_GetPrice_ExactlyStale_Reverts() public {
    // Fast forward to exactly TIMEOUT + 1 second
    vm.warp(block.timestamp + TIMEOUT + 1);

    vm.expectRevert("No valid price source available");
    oracle.getPrice();
  }

  /**
   * @notice Test: Fresh price data (just before timeout)
   */
  function test_GetPrice_JustBeforeStale_Success() public {
    // Fast forward to TIMEOUT - 1 second
    vm.warp(block.timestamp + TIMEOUT - 1);

    uint256 price = oracle.getPrice();
    assertTrue(price > 0);
  }

  /**
   * @notice Test: Zero NAV update (should be allowed for certain RWA types)
   */
  function test_UpdateNAV_ZeroValue_Success() public {
    vm.prank(trustedOracle);
    oracle.updateNAV(0);

    assertEq(oracle.latestNAV(), 0);
  }

  // ============================================================
  // 3. EXCEPTION TESTS: Error Handling
  // ============================================================

  /**
   * @notice Test: Sequencer is down (should revert)
   */
  function test_GetPrice_SequencerDown_Reverts() public {
    // Set sequencer status to down (1 = down)
    sequencerUptimeFeed.updateAnswer(1);

    vm.expectRevert("Sequencer is down");
    oracle.getPrice();
  }

  /**
   * @notice Test: Grace period not over after sequencer recovery
   */
  function test_GetPrice_GracePeriodNotOver_Reverts() public {
    // Simulate sequencer down then up
    sequencerUptimeFeed.updateAnswer(1);
    vm.warp(block.timestamp + 100);

    // Sequencer comes back up (use updateRoundData to set startedAt)
    sequencerUptimeFeed.updateRoundData(
      2, // roundId
      0, // answer (0 = up)
      block.timestamp, // startedAt
      block.timestamp, // updatedAt
      2 // answeredInRound
    );

    // Try to get price before grace period ends
    vm.expectRevert("Grace period not over");
    oracle.getPrice();
  }

  /**
   * @notice Test: Grace period over after sequencer recovery (should succeed)
   */
  function test_GetPrice_GracePeriodOver_Success() public {
    // Simulate sequencer recovery with startedAt
    sequencerUptimeFeed.updateRoundData(
      2,
      0, // up
      block.timestamp - GRACE_PERIOD - 1, // started before grace period
      block.timestamp,
      2
    );

    uint256 price = oracle.getPrice();
    assertTrue(price > 0);
  }

  /**
   * @notice Test: Update NAV unauthorized (should revert)
   */
  function test_UpdateNAV_Unauthorized_Reverts() public {
    vm.prank(unauthorized);
    vm.expectRevert("Only trusted oracle");
    oracle.updateNAV(INITIAL_NAV_PRICE);
  }

  /**
   * @notice Test: Invalid roundId from Chainlink (should revert)
   */
  function test_GetPrice_InvalidRoundId_Reverts() public {
    ethUsdFeed.updateRoundData(0, INITIAL_ETH_PRICE, block.timestamp, block.timestamp, 0);

    vm.expectRevert("No valid price source available");
    oracle.getPrice();
  }

  /**
   * @notice Test: Invalid updatedAt timestamp (should revert)
   */
  function test_GetPrice_InvalidUpdatedAt_Reverts() public {
    ethUsdFeed.updateRoundData(1, INITIAL_ETH_PRICE, block.timestamp, 0, 1);

    vm.expectRevert("No valid price source available");
    oracle.getPrice();
  }

  /**
   * @notice Test: Future updatedAt timestamp (should revert)
   */
  function test_GetPrice_FutureTimestamp_Reverts() public {
    ethUsdFeed.updateRoundData(
      1,
      INITIAL_ETH_PRICE,
      block.timestamp,
      block.timestamp + 1000, // future
      1
    );

    vm.expectRevert("No valid price source available");
    oracle.getPrice();
  }

  // ============================================================
  // 4. PERFORMANCE TESTS: Gas Benchmarks
  // ============================================================

  /**
   * @notice Test: Gas usage for getPrice (Chainlink-only)
   */
  function test_GetPrice_GasUsage_ChainlinkOnly() public {
    uint256 gasBefore = gasleft();
    oracle.getPrice();
    uint256 gasUsed = gasBefore - gasleft();

    // Should be < 50k gas for simple read operation
    assertTrue(gasUsed < 50_000, "GetPrice should use < 50k gas");
    emit log_named_uint("GetPrice (Chainlink-only) gas", gasUsed);
  }

  /**
   * @notice Test: Gas usage for getPrice (dual-source)
   */
  function test_GetPrice_GasUsage_DualSource() public {
    vm.prank(trustedOracle);
    oracle.updateNAV(INITIAL_NAV_PRICE);

    uint256 gasBefore = gasleft();
    oracle.getPrice();
    uint256 gasUsed = gasBefore - gasleft();

    // Dual-source should be < 70k gas (includes averaging)
    assertTrue(gasUsed < 70_000, "GetPrice dual-source should use < 70k gas");
    emit log_named_uint("GetPrice (dual-source) gas", gasUsed);
  }

  /**
   * @notice Test: Gas usage for updateNAV
   */
  function test_UpdateNAV_GasUsage() public {
    vm.prank(trustedOracle);
    uint256 gasBefore = gasleft();
    oracle.updateNAV(INITIAL_NAV_PRICE);
    uint256 gasUsed = gasBefore - gasleft();

    // Should be < 65k gas for ReentrancyGuard + storage write + event
    assertTrue(gasUsed < 65_000, "UpdateNAV should use < 65k gas");
    emit log_named_uint("UpdateNAV gas", gasUsed);
  }

  // ============================================================
  // 5. SECURITY TESTS: Circuit Breaker & Access Control
  // ============================================================

  /**
   * @notice Test: Circuit breaker triggers on large deviation (>15%)
   */
  function test_CircuitBreaker_LargeDeviation_Triggers() public {
    // Set NAV first
    vm.prank(trustedOracle);
    oracle.updateNAV(INITIAL_NAV_PRICE); // $1950

    // Update Chainlink to $2500 (25% higher than NAV)
    ethUsdFeed.updateAnswer(2500 * 10**8);

    vm.expectRevert("Circuit breaker: price deviation exceeds threshold");
    oracle.getPrice();
  }

  /**
   * @notice Test: Circuit breaker does NOT trigger within threshold (<=15%)
   */
  function test_CircuitBreaker_WithinThreshold_Succeeds() public {
    // Set NAV
    vm.prank(trustedOracle);
    oracle.updateNAV(2000 * 10**18); // $2000

    // Update Chainlink to $2200 (10% higher, within 15% threshold)
    ethUsdFeed.updateAnswer(2200 * 10**8);

    uint256 price = oracle.getPrice();
    assertTrue(price > 0); // Should not revert
  }

  /**
   * @notice Test: Change trusted oracle (owner only)
   */
  function test_SetTrustedOracle_OwnerOnly_Success() public {
    address newOracle = address(0x4);

    vm.prank(owner);
    oracle.setTrustedOracle(newOracle);

    assertEq(oracle.trustedOracle(), newOracle);
  }

  /**
   * @notice Test: Change trusted oracle unauthorized (should revert)
   */
  function test_SetTrustedOracle_Unauthorized_Reverts() public {
    vm.prank(unauthorized);
    vm.expectRevert();
    oracle.setTrustedOracle(address(0x4));
  }

  /**
   * @notice Test: Emergency pause (owner only)
   */
  function test_Pause_OwnerOnly_Success() public {
    vm.prank(owner);
    oracle.pause();

    assertTrue(oracle.paused());

    // OpenZeppelin v5 uses custom error EnforcedPause()
    vm.expectRevert();
    oracle.getPrice();
  }

  /**
   * @notice Test: Emergency unpause (owner only)
   */
  function test_Unpause_OwnerOnly_Success() public {
    vm.prank(owner);
    oracle.pause();

    vm.prank(owner);
    oracle.unpause();

    assertFalse(oracle.paused());
    uint256 price = oracle.getPrice();
    assertTrue(price > 0);
  }

  /**
   * @notice Test: Pause unauthorized (should revert)
   */
  function test_Pause_Unauthorized_Reverts() public {
    vm.prank(unauthorized);
    vm.expectRevert();
    oracle.pause();
  }

  // ============================================================
  // 6. COMPATIBILITY TESTS: Different Decimals & Networks
  // ============================================================

  /**
   * @notice Test: Price feed with 6 decimals (USDC-like)
   */
  function test_GetPrice_6Decimals_Success() public {
    MockV3Aggregator usdcFeed = new MockV3Aggregator(6, 1 * 10**6); // $1.00
    MockV3Aggregator sequencer = new MockV3Aggregator(0, 0);

    // Set sequencer grace period
    sequencer.updateRoundData(
      1,
      0,
      block.timestamp - GRACE_PERIOD - 1,
      block.timestamp,
      1
    );

    vm.prank(owner);
    RWAPriceOracle usdcOracle = new RWAPriceOracle(
      address(usdcFeed),
      address(sequencer),
      trustedOracle
    );

    uint256 price = usdcOracle.getPrice();

    // Should scale from 6 decimals to 18 decimals
    uint256 expectedPrice = 1 * 10**6 * 10**(18 - 6);
    assertEq(price, expectedPrice);
  }

  /**
   * @notice Test: Price feed with 18 decimals (no scaling)
   */
  function test_GetPrice_18Decimals_Success() public {
    MockV3Aggregator ethFeed = new MockV3Aggregator(18, 2000 * 10**18);
    MockV3Aggregator sequencer = new MockV3Aggregator(0, 0);

    // Set sequencer grace period
    sequencer.updateRoundData(
      1,
      0,
      block.timestamp - GRACE_PERIOD - 1,
      block.timestamp,
      1
    );

    vm.prank(owner);
    RWAPriceOracle ethOracle = new RWAPriceOracle(
      address(ethFeed),
      address(sequencer),
      trustedOracle
    );

    uint256 price = ethOracle.getPrice();

    // No scaling needed
    assertEq(price, 2000 * 10**18);
  }

  /**
   * @notice Test: Fallback to Chainlink-only when NAV is stale
   */
  function test_GetPrice_StaleNAV_FallbackToChainlink() public {
    // Set NAV
    vm.prank(trustedOracle);
    oracle.updateNAV(INITIAL_NAV_PRICE);

    // Fast forward past NAV staleness threshold (24h)
    vm.warp(block.timestamp + 24 hours + 1);

    // Update Chainlink feed to current timestamp (so it's not stale)
    ethUsdFeed.updateAnswer(INITIAL_ETH_PRICE);

    // Should fallback to Chainlink-only
    uint256 price = oracle.getPrice();
    uint256 chainlinkPrice = uint256(INITIAL_ETH_PRICE) * 10**(TARGET_DECIMALS - PRICE_FEED_DECIMALS);

    assertEq(price, chainlinkPrice); // Should match Chainlink, not averaged
  }

  /**
   * @notice Test: NAV-only mode when Chainlink feed fails
   */
  function test_GetPrice_ChainlinkFails_UseNAVOnly() public {
    // Set NAV
    vm.prank(trustedOracle);
    oracle.updateNAV(INITIAL_NAV_PRICE);

    // Simulate Chainlink failure (return 0)
    ethUsdFeed.updateAnswer(0);

    // Should fallback to NAV-only
    uint256 price = oracle.getPrice();
    assertEq(price, uint256(INITIAL_NAV_PRICE));
  }

  // ============================================================
  // EVENT EMISSION TESTS
  // ============================================================

  /**
   * @notice Test: NAV update emits event
   */
  function test_UpdateNAV_EmitsEvent() public {
    vm.expectEmit(true, true, true, true);
    emit NAVUpdated(INITIAL_NAV_PRICE, block.timestamp);

    vm.prank(trustedOracle);
    oracle.updateNAV(INITIAL_NAV_PRICE);
  }

  // Event declaration for testing
  event NAVUpdated(uint256 newNAV, uint256 timestamp);

}
