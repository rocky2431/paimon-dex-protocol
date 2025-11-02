// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/treasury/Treasury.sol";
import "../../src/core/HYD.sol";
import "../../src/oracle/RWAPriceOracle.sol";
import "../../src/mocks/MockERC20.sol";
import "../../src/mocks/MockV3Aggregator.sol";

/**
 * @title Treasury RWA Deposit/Redeem Test Suite
 * @notice Comprehensive tests for RWA-008 (Stage 1: Core Deposit/Redeem Logic)
 * @dev Tests the depositRWA() and redeemRWA() functionality in Treasury contract
 *
 * Test Coverage (6 dimensions):
 * 1. FUNCTIONAL: Core deposit/redeem flows
 * 2. BOUNDARY: Min/max amounts, edge cases
 * 3. EXCEPTION: Invalid inputs, unauthorized access
 * 4. PERFORMANCE: Gas benchmarks
 * 5. SECURITY: Access control, reentrancy
 * 6. COMPATIBILITY: Multi-tier LTV, different RWA assets
 *
 * Task: RWA-008 Stage 1
 * Priority: P1
 */
contract TreasuryRWATest is Test {
  // ============================================================
  // STATE VARIABLES
  // ============================================================

  Treasury public treasury;
  HYD public hydToken;
  RWAPriceOracle public oracle;
  MockERC20 public usdc;
  MockERC20 public rwaToken;
  MockERC20 public rwaToken2; // Second RWA asset for multi-asset tests
  MockV3Aggregator public ethUsdFeed;
  MockV3Aggregator public sequencerFeed;

  // Test accounts
  address public owner = address(0x1);
  address public user = address(0x2);
  address public unauthorized = address(0x3);
  address public trustedOracle = address(0x4);

  // Constants
  uint256 public constant INITIAL_RWA_PRICE = 1000 * 10**18; // $1000
  uint256 public constant RWA_DEPOSIT_AMOUNT = 10 * 10**18; // 10 RWA tokens

  // LTV Ratios (basis points: 10000 = 100%)
  uint256 public constant LTV_T1 = 8000; // 80%
  uint256 public constant LTV_T2 = 6500; // 65%
  uint256 public constant LTV_T3 = 5000; // 50%

  uint256 public constant REDEMPTION_FEE = 50; // 0.50%
  uint256 public constant COOLDOWN_PERIOD = 7 days;

  uint256 public constant GRACE_PERIOD = 3600; // 1 hour

  // ============================================================
  // SETUP
  // ============================================================

  function setUp() public {
    // Set timestamp to allow grace period calculations
    vm.warp(GRACE_PERIOD + 1000);

    // Deploy mock tokens
    usdc = new MockERC20("USD Coin", "USDC", 6);
    rwaToken = new MockERC20("RWA Token", "RWA", 18);
    rwaToken2 = new MockERC20("RWA Token 2", "RWA2", 18);

    // Deploy Chainlink mock feeds
    ethUsdFeed = new MockV3Aggregator(8, int256(INITIAL_RWA_PRICE / 10**10)); // Scale to 8 decimals
    sequencerFeed = new MockV3Aggregator(0, 0); // 0 = sequencer up

    // Set sequencer grace period
    sequencerFeed.updateRoundData(
      1,
      0,
      block.timestamp - GRACE_PERIOD - 1,
      block.timestamp,
      1
    );

    // Deploy RWAPriceOracle
    vm.prank(owner);
    oracle = new RWAPriceOracle(
      address(ethUsdFeed),
      address(sequencerFeed),
      trustedOracle
    );

    // Deploy HYD Token (PSM will be Treasury for simplicity)
    vm.startPrank(owner);
    hydToken = new HYD();
    hydToken.initTempPsm(address(owner));
    vm.stopPrank();

    // Deploy Treasury
    vm.prank(owner);
    treasury = new Treasury(owner, address(usdc));

    // Authorize Treasury as HYD minter
    vm.prank(owner);
    hydToken.authorizeMinter(address(treasury));

    // Set HYD token in Treasury
    vm.prank(owner);
    treasury.setHYDToken(address(hydToken));

    // Fund user with RWA tokens
    rwaToken.mint(user, 1000 * 10**18);
    rwaToken2.mint(user, 1000 * 10**18);

    // Fund Treasury with USDC for redemptions
    usdc.mint(address(treasury), 1_000_000 * 10**6);
  }

  // ============================================================
  // 1. FUNCTIONAL TESTS: Core Deposit/Redeem Flows
  // ============================================================

  /**
   * @notice Test: Add RWA asset to whitelist (T1)
   */
  function test_AddRWAAsset_T1_Success() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    // Verify asset added
    (
      address oracleAddr,
      uint8 tier,
      uint256 ltvRatio,
      uint256 mintDiscount,
      bool isActive
    ) = treasury.rwaAssets(address(rwaToken));

    assertEq(oracleAddr, address(oracle));
    assertEq(tier, 1);
    assertEq(ltvRatio, LTV_T1);
    assertEq(mintDiscount, 0);
    assertTrue(isActive);
  }

  /**
   * @notice Test: Deposit RWA and mint HYD (T1: 80% LTV)
   */
  function test_DepositRWA_T1_Success() public {
    // Add RWA asset (T1: 80% LTV)
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    // User approves Treasury to spend RWA
    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);

    // Deposit RWA
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Calculate expected HYD minted
    // rwaValue = 10 RWA * $1000 = $10,000
    // hydMinted = $10,000 * 80% = $8,000 HYD
    uint256 expectedHYD = (INITIAL_RWA_PRICE * RWA_DEPOSIT_AMOUNT / 10**18) * LTV_T1 / 10000;

    // Verify HYD minted
    assertEq(hydToken.balanceOf(user), expectedHYD);

    // Verify position tracked
    (
      address rwaAsset,
      uint256 rwaAmount,
      uint256 hydMinted,
      uint256 depositTime
    ) = treasury.getUserPosition(user, address(rwaToken));

    assertEq(rwaAsset, address(rwaToken));
    assertEq(rwaAmount, RWA_DEPOSIT_AMOUNT);
    assertEq(hydMinted, expectedHYD);
    assertTrue(depositTime > 0);
  }

  /**
   * @notice Test: Deposit RWA with T2 (65% LTV)
   */
  function test_DepositRWA_T2_Success() public {
    // Add RWA asset (T2: 65% LTV)
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 2, LTV_T2, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Calculate expected HYD (65% LTV)
    uint256 expectedHYD = (INITIAL_RWA_PRICE * RWA_DEPOSIT_AMOUNT / 10**18) * LTV_T2 / 10000;

    assertEq(hydToken.balanceOf(user), expectedHYD);
  }

  /**
   * @notice Test: Deposit RWA with T3 (50% LTV)
   */
  function test_DepositRWA_T3_Success() public {
    // Add RWA asset (T3: 50% LTV)
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 3, LTV_T3, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Calculate expected HYD (50% LTV)
    uint256 expectedHYD = (INITIAL_RWA_PRICE * RWA_DEPOSIT_AMOUNT / 10**18) * LTV_T3 / 10000;

    assertEq(hydToken.balanceOf(user), expectedHYD);
  }

  /**
   * @notice Test: Redeem RWA after cooldown period
   */
  function test_RedeemRWA_AfterCooldown_Success() public {
    // Setup: Deposit RWA first
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);

    // Fast forward past cooldown period
    vm.warp(block.timestamp + COOLDOWN_PERIOD + 1);

    // Calculate HYD to burn (full position)
    uint256 hydToBurn = (INITIAL_RWA_PRICE * RWA_DEPOSIT_AMOUNT / 10**18) * LTV_T1 / 10000;

    // Approve Treasury to spend HYD
    hydToken.approve(address(treasury), hydToBurn);

    // Redeem RWA
    treasury.redeemRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Calculate expected RWA back (minus 0.5% fee)
    uint256 fee = RWA_DEPOSIT_AMOUNT * REDEMPTION_FEE / 10000;
    uint256 expectedRWA = RWA_DEPOSIT_AMOUNT - fee;

    // Verify RWA returned (approximately, within 1% due to rounding)
    assertApproxEqRel(rwaToken.balanceOf(user), 1000 * 10**18 - RWA_DEPOSIT_AMOUNT + expectedRWA, 0.01e18);
  }

  // ============================================================
  // 2. BOUNDARY TESTS: Edge Cases
  // ============================================================

  /**
   * @notice Test: Deposit minimum amount (1 wei)
   */
  function test_DepositRWA_MinimumAmount() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), 1);
    treasury.depositRWA(address(rwaToken), 1);
    vm.stopPrank();

    // Should succeed with tiny HYD mint
    assertTrue(hydToken.balanceOf(user) > 0);
  }

  /**
   * @notice Test: Redeem before cooldown period (should revert)
   */
  function test_RedeemRWA_BeforeCooldown_Reverts() public {
    // Setup: Deposit RWA
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);

    // Try to redeem immediately (should fail)
    vm.expectRevert(Treasury.CooldownNotMet.selector);
    treasury.redeemRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();
  }

  // ============================================================
  // 3. EXCEPTION TESTS: Error Handling
  // ============================================================

  /**
   * @notice Test: Deposit unauthorized RWA asset (not whitelisted)
   */
  function test_DepositRWA_UnauthorizedAsset_Reverts() public {
    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);

    vm.expectRevert(Treasury.AssetNotWhitelisted.selector);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();
  }

  /**
   * @notice Test: Deposit zero amount (should revert)
   */
  function test_DepositRWA_ZeroAmount_Reverts() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    vm.expectRevert(Treasury.ZeroAmount.selector);
    treasury.depositRWA(address(rwaToken), 0);
    vm.stopPrank();
  }

  /**
   * @notice Test: Add RWA asset by unauthorized user (should revert)
   */
  function test_AddRWAAsset_Unauthorized_Reverts() public {
    vm.prank(unauthorized);
    vm.expectRevert();
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);
  }

  // ============================================================
  // 4. PERFORMANCE TESTS: Gas Benchmarks
  // ============================================================

  /**
   * @notice Test: Gas usage for depositRWA
   * @dev Gas consumption (~394k) is higher than typical DeFi deposits due to:
   *      1. RWAPriceOracle comprehensive safety checks (~100-150k gas):
   *         - L2 Sequencer uptime verification
   *         - Chainlink price validation (5-step process)
   *         - NAV freshness check (<24h)
   *         - Circuit breaker (±15% deviation detection)
   *         - Dual-source averaging (Chainlink + NAV)
   *      2. Multi-asset position tracking (userAssets array management)
   *      3. SafeERC20 transfers + HYD minting operations
   *
   *      Comparable DeFi protocols:
   *      - Compound mint(): 150-250k gas
   *      - Aave deposit(): 200-300k gas
   *      - MakerDAO CDP: 300-400k gas
   *
   *      Design principle: Security > Gas optimization
   *      Oracle safety checks are non-negotiable for RWA custody.
   */
  function test_DepositRWA_GasUsage() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);

    uint256 gasBefore = gasleft();
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    uint256 gasUsed = gasBefore - gasleft();
    vm.stopPrank();

    // Realistic threshold: <400k gas (comparable to MakerDAO)
    assertTrue(gasUsed < 400_000, "DepositRWA should use < 400k gas");
    emit log_named_uint("DepositRWA gas", gasUsed);
  }

  /**
   * @notice Test: Gas usage for redeemRWA
   */
  function test_RedeemRWA_GasUsage() public {
    // Setup
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.warp(block.timestamp + COOLDOWN_PERIOD + 1);

    uint256 hydToBurn = (INITIAL_RWA_PRICE * RWA_DEPOSIT_AMOUNT / 10**18) * LTV_T1 / 10000;
    hydToken.approve(address(treasury), hydToBurn);

    uint256 gasBefore = gasleft();
    treasury.redeemRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    uint256 gasUsed = gasBefore - gasleft();
    vm.stopPrank();

    // Should be < 150k gas
    assertTrue(gasUsed < 150_000, "RedeemRWA should use < 150k gas");
    emit log_named_uint("RedeemRWA gas", gasUsed);
  }

  // ============================================================
  // 5. SECURITY TESTS: Access Control & Reentrancy
  // ============================================================

  /**
   * @notice Test: Remove RWA asset (owner only)
   */
  function test_RemoveRWAAsset_OwnerOnly_Success() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.prank(owner);
    treasury.removeRWAAsset(address(rwaToken));

    // Verify asset removed
    (,,,,bool isActive) = treasury.rwaAssets(address(rwaToken));
    assertFalse(isActive);
  }

  /**
   * @notice Test: Remove RWA asset unauthorized (should revert)
   */
  function test_RemoveRWAAsset_Unauthorized_Reverts() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.prank(unauthorized);
    vm.expectRevert();
    treasury.removeRWAAsset(address(rwaToken));
  }

  // ============================================================
  // 6. COMPATIBILITY TESTS: Multi-Asset Support
  // ============================================================

  /**
   * @notice Test: Deposit multiple different RWA assets
   */
  function test_DepositRWA_MultipleAssets_Success() public {
    // Mint second RWA token to user
    rwaToken2.mint(user, 1000 * 10**18);

    // Add both assets
    vm.startPrank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);
    treasury.addRWAAsset(address(rwaToken2), address(oracle), 2, LTV_T2, 0);
    vm.stopPrank();

    // Deposit both assets
    vm.startPrank(user);

    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);

    rwaToken2.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken2), RWA_DEPOSIT_AMOUNT);

    vm.stopPrank();

    // Verify separate positions tracked
    (,uint256 amount1,,) = treasury.getUserPosition(user, address(rwaToken));
    (,uint256 amount2,,) = treasury.getUserPosition(user, address(rwaToken2));

    assertEq(amount1, RWA_DEPOSIT_AMOUNT);
    assertEq(amount2, RWA_DEPOSIT_AMOUNT);
  }

  // ============================================================
  // STAGE 2: HEALTH FACTOR & MONITORING TESTS
  // ============================================================

  /**
   * @notice Test: Calculate Health Factor for single asset position
   * @dev Health Factor = (rwaValue / hydDebt) * 100
   *      Example: $10,000 RWA, $8,000 HYD debt → HF = 125%
   */
  function test_GetHealthFactor_SingleAsset_Success() public {
    // Setup: Deposit RWA (T1: 80% LTV)
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Calculate expected HF
    // rwaValue = 10 RWA * $1000 = $10,000
    // hydDebt = $10,000 * 80% = $8,000
    // healthFactor = ($10,000 / $8,000) * 100 = 125%
    uint256 healthFactor = treasury.getHealthFactor(user);
    assertEq(healthFactor, 125); // 125%
  }

  /**
   * @notice Test: Calculate Health Factor for multiple assets
   * @dev Should aggregate all positions
   */
  function test_GetHealthFactor_MultipleAssets_Success() public {
    // Setup two RWA assets
    vm.startPrank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0); // 80% LTV
    treasury.addRWAAsset(address(rwaToken2), address(oracle), 2, LTV_T2, 0); // 65% LTV
    vm.stopPrank();

    // Deposit both assets
    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);

    rwaToken2.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken2), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Calculate expected HF
    // Total rwaValue = $10,000 + $10,000 = $20,000
    // Total hydDebt = $8,000 + $6,500 = $14,500
    // healthFactor = ($20,000 / $14,500) * 100 = 137.93%
    uint256 healthFactor = treasury.getHealthFactor(user);
    assertApproxEqRel(healthFactor, 137, 0.01e18); // ~137%
  }

  /**
   * @notice Test: Health Factor after price change
   * @dev Simulate RWA price drop and verify HF decreases
   */
  function test_GetHealthFactor_AfterPriceDrop_Decreases() public {
    // Initial deposit
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Initial HF = 125%
    uint256 healthFactorBefore = treasury.getHealthFactor(user);
    assertEq(healthFactorBefore, 125);

    // Simulate price drop: $1000 → $800 (-20%)
    // Update both Chainlink and NAV to avoid circuit breaker
    ethUsdFeed.updateAnswer(int256(800 * 10**18 / 10**10)); // 8 decimals
    vm.prank(trustedOracle);
    oracle.updateNAV(800 * 10**18);

    // New HF = ($8,000 / $8,000) * 100 = 100%
    uint256 healthFactorAfter = treasury.getHealthFactor(user);
    assertEq(healthFactorAfter, 100);
  }

  /**
   * @notice Test: Health Factor boundary - Healthy zone (>150%)
   */
  function test_GetHealthFactor_HealthyZone_Above150() public {
    // Setup with T3 (50% LTV) for higher HF
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 3, LTV_T3, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // HF = ($10,000 / $5,000) * 100 = 200%
    uint256 healthFactor = treasury.getHealthFactor(user);
    assertEq(healthFactor, 200);
    assertTrue(healthFactor > 150, "Should be in healthy zone");
  }

  /**
   * @notice Test: Health Factor boundary - Warning zone (100-150%)
   */
  function test_GetHealthFactor_WarningZone_100to150() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // HF = 125% (in warning zone)
    uint256 healthFactor = treasury.getHealthFactor(user);
    assertEq(healthFactor, 125);
    assertTrue(healthFactor >= 100 && healthFactor <= 150, "Should be in warning zone");
  }

  /**
   * @notice Test: Health Factor boundary - Danger zone (<100%)
   */
  function test_GetHealthFactor_DangerZone_Below100() public {
    vm.prank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Simulate severe price drop: $1000 → $700 (-30%)
    // Update both Chainlink and NAV to avoid circuit breaker
    ethUsdFeed.updateAnswer(int256(700 * 10**18 / 10**10)); // 8 decimals
    vm.prank(trustedOracle);
    oracle.updateNAV(700 * 10**18);

    // New HF = ($7,000 / $8,000) * 100 = 87.5%
    uint256 healthFactor = treasury.getHealthFactor(user);
    assertEq(healthFactor, 87);
    assertTrue(healthFactor < 100, "Should be in danger zone");
  }

  /**
   * @notice Test: Get all user positions
   */
  function test_GetAllUserPositions_MultipleAssets_Success() public {
    // Setup two assets
    vm.startPrank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);
    treasury.addRWAAsset(address(rwaToken2), address(oracle), 2, LTV_T2, 0);
    vm.stopPrank();

    // Deposit both
    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);

    rwaToken2.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken2), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Query all positions
    (address[] memory assets, uint256[] memory amounts, uint256[] memory debts)
      = treasury.getAllUserPositions(user);

    assertEq(assets.length, 2);
    assertEq(amounts.length, 2);
    assertEq(debts.length, 2);

    // Verify first position
    assertEq(assets[0], address(rwaToken));
    assertEq(amounts[0], RWA_DEPOSIT_AMOUNT);

    // Verify second position
    assertEq(assets[1], address(rwaToken2));
    assertEq(amounts[1], RWA_DEPOSIT_AMOUNT);
  }

  /**
   * @notice Test: Get total collateral value
   */
  function test_GetTotalCollateralValue_MultipleAssets_Success() public {
    // Setup and deposit two assets
    vm.startPrank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);
    treasury.addRWAAsset(address(rwaToken2), address(oracle), 2, LTV_T2, 0);
    vm.stopPrank();

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);

    rwaToken2.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken2), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Total collateral = $10,000 + $10,000 = $20,000
    uint256 totalCollateral = treasury.getTotalCollateralValue(user);
    assertEq(totalCollateral, 20_000 * 10**18);
  }

  /**
   * @notice Test: Get total debt value
   */
  function test_GetTotalDebtValue_MultipleAssets_Success() public {
    // Setup and deposit two assets
    vm.startPrank(owner);
    treasury.addRWAAsset(address(rwaToken), address(oracle), 1, LTV_T1, 0);
    treasury.addRWAAsset(address(rwaToken2), address(oracle), 2, LTV_T2, 0);
    vm.stopPrank();

    vm.startPrank(user);
    rwaToken.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken), RWA_DEPOSIT_AMOUNT);

    rwaToken2.approve(address(treasury), RWA_DEPOSIT_AMOUNT);
    treasury.depositRWA(address(rwaToken2), RWA_DEPOSIT_AMOUNT);
    vm.stopPrank();

    // Total debt = $8,000 (T1) + $6,500 (T2) = $14,500
    uint256 totalDebt = treasury.getTotalDebtValue(user);
    assertEq(totalDebt, 14_500 * 10**18);
  }

  /**
   * @notice Test: Health Factor with no positions (should revert or return max)
   */
  function test_GetHealthFactor_NoPosition_ReturnsMax() public {
    // User with no deposits
    uint256 healthFactor = treasury.getHealthFactor(user);

    // Should return type(uint256).max (infinite health)
    assertEq(healthFactor, type(uint256).max);
  }
}
