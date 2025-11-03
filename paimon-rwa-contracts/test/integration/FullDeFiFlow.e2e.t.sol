// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

// Core contracts
import {USDP} from "../../src/core/USDP.sol";
import {esPaimon} from "../../src/core/esPaimon.sol";
import {VotingEscrowPaimon} from "../../src/core/VotingEscrowPaimon.sol";
import {PSM} from "../../src/core/PSM.sol";
import {USDPVault} from "../../src/core/USDPVault.sol";

// Treasury & Incentives
import {SavingRate} from "../../src/treasury/SavingRate.sol";
import {BoostStaking} from "../../src/incentives/BoostStaking.sol";
import {EmissionManager} from "../../src/governance/EmissionManager.sol";
import {RewardDistributor} from "../../src/governance/RewardDistributor.sol";

// Mocks
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {MockRWAToken} from "../../src/mocks/MockRWAToken.sol";

/**
 * @title FullDeFiFlow E2E Test
 * @notice Comprehensive end-to-end test for Task 27
 * @dev Tests complete user journey: RWA deposit → USDP mint → vePaimon lock →
 *      LP farming → Boost rewards → Savings → all integrated scenarios
 */
contract FullDeFiFlowE2ETest is Test {
    // ==================== Contracts ====================

    USDP public usdp;
    MockERC20 public paimon;
    MockERC20 public usdc;
    esPaimon public esPaimonToken;
    VotingEscrowPaimon public vePaimon;
    PSM public psm;
    USDPVault public vault;
    SavingRate public savingRate;
    BoostStaking public boostStaking;
    EmissionManager public emissionManager;
    RewardDistributor public rewardDistributor;
    MockRWAToken public rwaToken;

    // ==================== Test Accounts ====================

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    address public treasury = address(0xFEE);

    // ==================== Constants ====================

    uint8 public constant USDC_DECIMALS = 6;
    uint256 public constant INITIAL_BALANCE = 1_000_000 ether;
    uint256 public constant WEEKLY_EMISSION = 10_000 ether; // 10K PAIMON/week

    function setUp() public {
        console.log("\n========================================");
        console.log("Task 27: Full DeFi Flow E2E Test Setup");
        console.log("========================================\n");

        // Deploy tokens
        usdc = new MockERC20("USD Coin", "USDC", USDC_DECIMALS);
        paimon = new MockERC20("Paimon", "PAIMON", 18);
        rwaToken = new MockRWAToken("RWA Token", "RWA", 18);

        // Deploy core
        usdp = new USDP();
        esPaimonToken = new esPaimon(address(paimon));
        vePaimon = new VotingEscrowPaimon(address(paimon));
        psm = new PSM(address(usdp), address(usdc));
        vault = new USDPVault(address(usdp));
        savingRate = new SavingRate(address(usdp), 200); // 2% APR
        boostStaking = new BoostStaking(address(paimon));

        // Deploy governance & rewards
        emissionManager = new EmissionManager(address(paimon), WEEKLY_EMISSION);
        rewardDistributor = new RewardDistributor(address(paimon));

        // Configure
        usdp.setAuthorizedMinter(address(psm), true);
        usdp.setAuthorizedMinter(address(vault), true);
        vault.addCollateral(address(rwaToken), 8000); // 80% LTV

        // Fund accounts
        usdc.mint(alice, INITIAL_BALANCE / (10 ** (18 - USDC_DECIMALS)));
        usdc.mint(bob, INITIAL_BALANCE / (10 ** (18 - USDC_DECIMALS)));
        paimon.mint(alice, INITIAL_BALANCE);
        paimon.mint(bob, INITIAL_BALANCE);
        paimon.mint(address(emissionManager), INITIAL_BALANCE);
        rwaToken.mint(alice, INITIAL_BALANCE);
        rwaToken.mint(bob, INITIAL_BALANCE);

        // Labels
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(charlie, "Charlie");
        vm.label(treasury, "Treasury");

        console.log("Setup complete!");
        console.log("- USDC balance (Alice):", usdc.balanceOf(alice) / (10 ** USDC_DECIMALS));
        console.log("- PAIMON balance (Alice):", paimon.balanceOf(alice) / 1 ether);
        console.log("- RWA balance (Alice):", rwaToken.balanceOf(alice) / 1 ether);
        console.log("\n");
    }

    // ==================================================================
    // TEST 1: Complete DeFi Flow - RWA → USDP → vePaimon → Boost → Savings
    // ==================================================================

    function test_E2E_CompleteDeFiFlow() public {
        console.log("\n========================================");
        console.log("TEST 1: Complete DeFi Flow Journey");
        console.log("========================================\n");

        // ===== STEP 1: Alice deposits RWA and mints USDP =====
        console.log("STEP 1: Alice deposits 10,000 RWA and mints USDP");
        console.log("--------------------------------------------------");

        uint256 rwaAmount = 10_000 ether;
        vm.startPrank(alice);
        rwaToken.approve(address(vault), rwaAmount);
        vault.depositCollateral(address(rwaToken), rwaAmount);

        // Mint USDP (80% LTV)
        uint256 usdpToMint = (rwaAmount * 8000) / 10000; // 8,000 USDP
        vault.borrow(usdpToMint);
        vm.stopPrank();

        uint256 aliceUSDP = usdp.balanceOf(alice);
        console.log("  Alice USDP balance:", aliceUSDP / 1 ether);
        assertGt(aliceUSDP, 0);
        assertEq(vault.debtOf(alice), usdpToMint);
        console.log("  Alice debt:", vault.debtOf(alice) / 1 ether);
        console.log("  ✅ Step 1 Complete\n");

        // ===== STEP 2: Alice locks PAIMON for vePaimon =====
        console.log("STEP 2: Alice locks 5,000 PAIMON for 1 year");
        console.log("--------------------------------------------------");

        uint256 lockAmount = 5_000 ether;
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), lockAmount);
        uint256 tokenId = vePaimon.createLock(lockAmount, 365 days);
        vm.stopPrank();

        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        console.log("  Token ID:", tokenId);
        console.log("  Voting Power:", votingPower);
        assertGt(votingPower, 0);
        console.log("  ✅ Step 2 Complete\n");

        // ===== STEP 3: Alice stakes for Boost multiplier =====
        console.log("STEP 3: Alice stakes 3,000 PAIMON for Boost");
        console.log("--------------------------------------------------");

        uint256 stakeAmount = 3_000 ether;
        vm.startPrank(alice);
        paimon.approve(address(boostStaking), stakeAmount);
        boostStaking.stake(stakeAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 1); // Wait minimum duration
        uint256 boostMultiplier = boostStaking.getBoostMultiplier(alice);
        console.log("  Staked:", stakeAmount / 1 ether, "PAIMON");
        console.log("  Boost Multiplier:", boostMultiplier, "/ 10000");
        assertGe(boostMultiplier, 10000); // >= 1.0x
        console.log("  ✅ Step 3 Complete\n");

        // ===== STEP 4: Alice deposits into Savings =====
        console.log("STEP 4: Alice deposits 3,000 USDP into Savings");
        console.log("--------------------------------------------------");

        uint256 savingsDeposit = 3_000 ether;
        vm.startPrank(alice);
        usdp.approve(address(savingRate), savingsDeposit);
        savingRate.deposit(savingsDeposit);
        vm.stopPrank();

        assertEq(savingRate.balanceOf(alice), savingsDeposit);
        console.log("  Deposited:", savingsDeposit / 1 ether, "USDP");
        console.log("  ✅ Step 4 Complete\n");

        // ===== STEP 5: Wait 30 days and check interest =====
        console.log("STEP 5: Wait 30 days and verify interest accrual");
        console.log("--------------------------------------------------");

        vm.warp(block.timestamp + 30 days);
        uint256 interest = savingRate.accruedInterestOf(alice);

        // Expected: 3000 * 200 bps * 30 / 365 / 10000 ≈ 0.493 USDP
        uint256 expectedInterest = (savingsDeposit * 200 * 30 days) / (365 days * 10000);

        console.log("  Accrued Interest:", interest);
        console.log("  Expected Interest:", expectedInterest);
        assertApproxEqRel(interest, expectedInterest, 0.01e18); // 1% tolerance
        console.log("  ✅ Step 5 Complete\n");

        // ===== FINAL SUMMARY =====
        console.log("========================================");
        console.log("FINAL STATE SUMMARY");
        console.log("========================================");
        console.log("Alice positions:");
        console.log("  - RWA Collateral:", rwaAmount / 1 ether);
        console.log("  - USDP Debt:", vault.debtOf(alice) / 1 ether);
        console.log("  - vePaimon Voting Power:", votingPower);
        console.log("  - Boost Multiplier:", boostMultiplier, "/ 10000");
        console.log("  - Savings Balance:", savingRate.balanceOf(alice) / 1 ether);
        console.log("  - Accrued Interest:", interest);
        console.log("\n✅ TEST 1 PASSED: Complete DeFi Flow\n");
    }

    // ==================================================================
    // TEST 2: PSM Arbitrage Scenario
    // ==================================================================

    function test_E2E_PSMArbitrage() public {
        console.log("\n========================================");
        console.log("TEST 2: PSM Arbitrage Scenario");
        console.log("========================================\n");

        console.log("Scenario: USDP price = $0.98, arbitrageur profits by:");
        console.log("1. Buy USDP at $0.98 from market");
        console.log("2. Redeem for USDC at $1.00 via PSM");
        console.log("3. Net profit: $0.02 per USDP\n");

        // Simulate arbitrage
        uint256 usdcAmount = 100_000 * (10 ** USDC_DECIMALS); // 100K USDC

        console.log("STEP 1: Arbitrageur swaps USDC → USDP");
        vm.startPrank(alice);
        usdc.approve(address(psm), usdcAmount);
        psm.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();

        uint256 usdpReceived = usdp.balanceOf(alice);
        console.log("  USDC spent:", usdcAmount / (10 ** USDC_DECIMALS));
        console.log("  USDP received:", usdpReceived / 1 ether);

        // PSM charges 0.1% fee, so should receive ~99,900 USDP
        uint256 expectedUSDP = (usdcAmount * (10 ** (18 - USDC_DECIMALS)) * 999) / 1000;
        assertApproxEqRel(usdpReceived, expectedUSDP, 0.01e18);

        console.log("\nSTEP 2: Arbitrageur swaps USDP → USDC");
        vm.startPrank(alice);
        usdp.approve(address(psm), usdpReceived);
        psm.swapUSDPForUSDC(usdpReceived);
        vm.stopPrank();

        uint256 usdcRedeemed = usdc.balanceOf(alice);
        console.log("  USDP spent:", usdpReceived / 1 ether);
        console.log("  USDC received:", usdcRedeemed / (10 ** USDC_DECIMALS));

        // Should receive ~99,800 USDC (2 fees: 0.1% each way)
        assertGt(usdcRedeemed, usdcAmount * 998 / 1000);

        console.log("\n✅ TEST 2 PASSED: PSM Arbitrage verified\n");
    }

    // ==================================================================
    // TEST 3: Boost Multiplier Scaling
    // ==================================================================

    function test_E2E_BoostMultiplierScaling() public {
        console.log("\n========================================");
        console.log("TEST 3: Boost Multiplier Scaling");
        console.log("========================================\n");

        console.log("Testing boost multipliers for different stake amounts:\n");

        // Test different stake amounts
        address[3] memory users = [alice, bob, charlie];
        uint256[3] memory stakes = [uint256(1_000 ether), uint256(5_000 ether), uint256(10_000 ether)];

        paimon.mint(charlie, INITIAL_BALANCE);

        for (uint256 i = 0; i < 3; i++) {
            address user = users[i];
            uint256 stakeAmount = stakes[i];

            vm.startPrank(user);
            paimon.approve(address(boostStaking), stakeAmount);
            boostStaking.stake(stakeAmount);
            vm.stopPrank();

            vm.warp(block.timestamp + 7 days + 1);

            uint256 multiplier = boostStaking.getBoostMultiplier(user);
            console.log("  Stake:", stakeAmount / 1 ether, "PAIMON");
            console.log("    Multiplier:", multiplier, "/ 10000");
            console.log("    Effective:", (multiplier * 100) / 10000, "% boost\n");

            assertGe(multiplier, 10000);
            assertLe(multiplier, 25000); // Max 2.5x

            if (i > 0) {
                uint256 prevMultiplier = boostStaking.getBoostMultiplier(users[i-1]);
                assertGe(multiplier, prevMultiplier, "Higher stake should have higher boost");
            }
        }

        console.log("✅ TEST 3 PASSED: Boost scaling verified\n");
    }

    // ==================================================================
    // TEST 4: Gas Benchmarks for Key Operations
    // ==================================================================

    function test_E2E_GasBenchmarks() public {
        console.log("\n========================================");
        console.log("TEST 4: Gas Benchmarks");
        console.log("========================================\n");

        uint256 gasBefore;
        uint256 gasAfter;

        // Benchmark 1: RWA Deposit
        vm.startPrank(alice);
        rwaToken.approve(address(vault), 1_000 ether);
        gasBefore = gasleft();
        vault.depositCollateral(address(rwaToken), 1_000 ether);
        gasAfter = gasleft();
        console.log("  RWA Deposit gas:", gasBefore - gasAfter);
        vm.stopPrank();

        // Benchmark 2: USDP Borrow
        vm.startPrank(alice);
        gasBefore = gasleft();
        vault.borrow(800 ether);
        gasAfter = gasleft();
        console.log("  USDP Borrow gas:", gasBefore - gasAfter);
        vm.stopPrank();

        // Benchmark 3: vePaimon Lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 1_000 ether);
        gasBefore = gasleft();
        vePaimon.createLock(1_000 ether, 365 days);
        gasAfter = gasleft();
        console.log("  vePaimon Lock gas:", gasBefore - gasAfter);
        vm.stopPrank();

        // Benchmark 4: Boost Stake
        vm.startPrank(alice);
        paimon.approve(address(boostStaking), 1_000 ether);
        gasBefore = gasleft();
        boostStaking.stake(1_000 ether);
        gasAfter = gasleft();
        console.log("  Boost Stake gas:", gasBefore - gasAfter);
        vm.stopPrank();

        // Benchmark 5: Savings Deposit
        vm.startPrank(alice);
        usdp.approve(address(savingRate), 1_000 ether);
        gasBefore = gasleft();
        savingRate.deposit(1_000 ether);
        gasAfter = gasleft();
        console.log("  Savings Deposit gas:", gasBefore - gasAfter);
        vm.stopPrank();

        console.log("\n✅ TEST 4 PASSED: Gas benchmarks recorded\n");
    }
}
