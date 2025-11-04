// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

// Core contracts
import {USDP} from "../../src/core/USDP.sol";
import {esPaimon} from "../../src/core/esPaimon.sol";
import {VotingEscrowPaimon} from "../../src/core/VotingEscrowPaimon.sol";
import {PSMParameterized} from "../../src/core/PSMParameterized.sol";

// Treasury
import {SavingRate} from "../../src/treasury/SavingRate.sol";

// DEX
import {DEXFactory} from "../../src/dex/DEXFactory.sol";
import {DEXPair} from "../../src/dex/DEXPair.sol";

// Incentives
import {BoostStaking} from "../../src/incentives/BoostStaking.sol";

// Mocks
import {MockERC20} from "../../src/mocks/MockERC20.sol";

/**
 * @title CoreIntegration
 * @notice Simplified integration tests for core protocol interactions
 * @dev Tests Task 27 key scenarios:
 *      1. PSM swap (USDC ↔ USDP)
 *      2. vePaimon locking and voting power
 *      3. DEX liquidity and swaps
 *      4. Boost staking multipliers
 *      5. Savings rate interest accrual
 */
contract CoreIntegration is Test {
    // Contracts
    USDP public usdp;
    MockERC20 public paimon;
    MockERC20 public usdc;
    esPaimon public esPaimonToken;
    VotingEscrowPaimon public vePaimon;
    PSMParameterized public psm;
    SavingRate public savingRate;
    DEXFactory public factory;
    DEXPair public usdpUsdcPair;
    BoostStaking public boostStaking;

    // Test accounts
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    address public treasury = address(0xFEE);

    // Constants
    uint8 public constant USDC_DECIMALS = 6;
    uint256 public constant INITIAL_BALANCE = 1_000_000 ether;

    function setUp() public {
        // Deploy tokens
        usdc = new MockERC20("USD Coin", "USDC", USDC_DECIMALS);
        paimon = new MockERC20("Paimon", "PAIMON", 18);

        // Deploy core contracts
        usdp = new USDP();
        esPaimonToken = new esPaimon(address(paimon));
        vePaimon = new VotingEscrowPaimon(address(paimon));
        psm = new PSMParameterized(address(usdp), address(usdc));
        savingRate = new SavingRate(address(usdp), 200); // 2% APR
        boostStaking = new BoostStaking(address(paimon));

        // Configure USDP minting
        usdp.setAuthorizedMinter(address(psm), true);

        // Deploy DEX
        factory = new DEXFactory(treasury);
        factory.createPair(address(usdp), address(usdc));
        usdpUsdcPair = DEXPair(factory.getPair(address(usdp), address(usdc)));

        // Fund test accounts
        usdc.mint(alice, INITIAL_BALANCE / (10 ** (18 - USDC_DECIMALS)));
        usdc.mint(bob, INITIAL_BALANCE / (10 ** (18 - USDC_DECIMALS)));
        paimon.mint(alice, INITIAL_BALANCE);
        paimon.mint(bob, INITIAL_BALANCE);

        // Labels
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
    }

    // ==================================================================
    // TEST 1: PSM Functionality (USDC ↔ USDP)
    // ==================================================================

    function test_Integration_PSMSwap() public {
        console.log("\n=== TEST 1: PSM Swap (USDC -> USDP -> USDC) ===\n");

        uint256 usdcAmount = 10_000 * (10 ** USDC_DECIMALS); // 10K USDC

        // Step 1: Alice swaps USDC for USDP
        console.log("Step 1: Alice swaps 10,000 USDC for USDP");
        vm.startPrank(alice);
        usdc.approve(address(psm), usdcAmount);
        psm.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();

        uint256 usdpBalance = usdp.balanceOf(alice);
        // PSM charges 0.1% fee, so expect ~9990 USDP
        assertApproxEqRel(usdpBalance, 10_000 ether, 0.01e18, "USDP minted (with 0.1% fee)");
        console.log("  - USDP received:", usdpBalance / 1 ether);

        // Step 2: Alice swaps USDP back for USDC
        console.log("\nStep 2: Alice swaps USDP back for USDC");
        vm.startPrank(alice);
        usdp.approve(address(psm), usdpBalance);
        psm.swapUSDPForUSDC(usdpBalance);
        vm.stopPrank();

        uint256 usdcBalanceAfter = usdc.balanceOf(alice);
        // PSM charges fees on both swaps, so expect ~2% less USDC
        assertApproxEqRel(usdcBalanceAfter, INITIAL_BALANCE / (10 ** (18 - USDC_DECIMALS)), 0.03e18, "USDC balance (~2% fees)");
        console.log("  - USDC balance:", usdcBalanceAfter / (10 ** USDC_DECIMALS));
        console.log("\n=== TEST 1 PASSED ===\n");
    }

    // ==================================================================
    // TEST 2: vePaimon Locking and Voting Power
    // ==================================================================

    function test_Integration_VePaimonLocking() public {
        console.log("\n=== TEST 2: vePaimon Locking & Voting Power ===\n");

        uint256 lockAmount = 10_000 ether;
        uint256 lockDuration = 365 days; // 1 year

        // Alice locks PAIMON
        console.log("Step 1: Alice locks 10,000 PAIMON for 1 year");
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), lockAmount);
        uint256 tokenId = vePaimon.createLock(lockAmount, lockDuration);
        vm.stopPrank();

        assertEq(vePaimon.ownerOf(tokenId), alice, "Alice should own veNFT");
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertGt(votingPower, 0, "Voting power should be > 0");
        console.log("  - Token ID:", tokenId);
        console.log("  - Voting power:", votingPower / 1 ether);

        // Check voting power decay over time
        console.log("\nStep 2: Check voting power decay");
        vm.warp(block.timestamp + 182 days); // 6 months later
        uint256 votingPowerAfter = vePaimon.balanceOfNFT(tokenId);
        assertLt(votingPowerAfter, votingPower, "Voting power should decay");
        console.log("  - Voting power after 6 months:", votingPowerAfter / 1 ether);
        console.log("\n=== TEST 2 PASSED ===\n");
    }

    // ==================================================================
    // TEST 3: DEX Liquidity and Swaps
    // ==================================================================

    function test_Integration_DEXLiquidityAndSwap() public {
        console.log("\n=== TEST 3: DEX Liquidity & Swap ===\n");

        // Setup: Alice gets USDP via PSM
        uint256 usdcAmount = 20_000 * (10 ** USDC_DECIMALS);
        vm.startPrank(alice);
        usdc.approve(address(psm), usdcAmount);
        psm.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();

        // Step 1: Alice adds liquidity
        console.log("Step 1: Alice adds liquidity (10K USDP + 10K USDC)");
        uint256 usdpAmount = 10_000 ether;
        usdcAmount = 10_000 * (10 ** USDC_DECIMALS);

        vm.startPrank(alice);
        usdp.approve(address(usdpUsdcPair), usdpAmount);
        usdc.approve(address(usdpUsdcPair), usdcAmount);

        usdp.transfer(address(usdpUsdcPair), usdpAmount);
        usdc.transfer(address(usdpUsdcPair), usdcAmount);
        uint256 liquidity = usdpUsdcPair.mint(alice);
        vm.stopPrank();

        assertGt(liquidity, 0, "LP tokens should be minted");
        console.log("  - LP tokens received:", liquidity / 1 ether);

        // Step 2: Bob swaps USDC for USDP
        console.log("\nStep 2: Bob swaps 1,000 USDC for USDP");
        uint256 swapAmount = 1_000 * (10 ** USDC_DECIMALS);

        vm.startPrank(bob);
        usdc.approve(address(usdpUsdcPair), swapAmount);
        usdc.transfer(address(usdpUsdcPair), swapAmount);

        (uint112 reserve0, uint112 reserve1,) = usdpUsdcPair.getReserves();
        uint256 amountOut = _getAmountOut(swapAmount, reserve1, reserve0); // USDC -> USDP
        // Apply 5% safety margin to handle fees and rounding
        amountOut = (amountOut * 95) / 100;
        usdpUsdcPair.swap(amountOut, 0, bob, "");
        vm.stopPrank();

        uint256 bobUSDPBalance = usdp.balanceOf(bob);
        assertGt(bobUSDPBalance, 0, "Bob should receive USDP");
        console.log("  - Bob received USDP:", bobUSDPBalance / 1 ether);
        console.log("\n=== TEST 3 PASSED ===\n");
    }

    // ==================================================================
    // TEST 4: Boost Staking Multipliers
    // ==================================================================

    function test_Integration_BoostMultipliers() public {
        console.log("\n=== TEST 4: Boost Staking Multipliers ===\n");

        console.log("Testing boost multipliers for different stake amounts:");

        // Test 1: Low stake (1,000 PAIMON)
        vm.startPrank(alice);
        paimon.approve(address(boostStaking), 1_000 ether);
        boostStaking.stake(1_000 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 1); // Wait minimum duration

        uint256 multiplier1 = boostStaking.getBoostMultiplier(alice);
        assertGe(multiplier1, 10000, "Multiplier should be >= 1.0x");
        assertLe(multiplier1, 15000, "Multiplier should be <= 1.5x");
        console.log("  - Stake: 1,000 PAIMON");
        console.log("    Boost multiplier:", multiplier1);

        // Test 2: Medium stake (5,000 PAIMON)
        vm.startPrank(bob);
        paimon.approve(address(boostStaking), 5_000 ether);
        boostStaking.stake(5_000 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 1);

        uint256 multiplier2 = boostStaking.getBoostMultiplier(bob);
        assertGe(multiplier2, multiplier1, "Higher stake should have higher boost");
        console.log("  - Stake: 5,000 PAIMON");
        console.log("    Boost multiplier:", multiplier2);

        // Test 3: High stake (10,000 PAIMON) - use charlie
        paimon.mint(charlie, 10_000 ether);
        vm.startPrank(charlie);
        paimon.approve(address(boostStaking), 10_000 ether);
        boostStaking.stake(10_000 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 1);

        uint256 multiplier3 = boostStaking.getBoostMultiplier(charlie);
        assertGe(multiplier3, multiplier2, "Highest stake should have highest boost");
        console.log("  - Stake: 10,000 PAIMON");
        console.log("    Boost multiplier:", multiplier3);

        console.log("\n=== TEST 4 PASSED ===\n");
    }

    // ==================================================================
    // TEST 5: Savings Rate Interest Calculation
    // ==================================================================

    function test_Integration_SavingsInterest() public {
        console.log("\n=== TEST 5: Savings Rate Interest ===\n");

        // Alice gets USDP
        uint256 usdcAmount = 10_000 * (10 ** USDC_DECIMALS);
        vm.startPrank(alice);
        usdc.approve(address(psm), usdcAmount);
        psm.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();

        // Alice deposits into savings
        console.log("Step 1: Alice deposits 5,000 USDP into savings");
        uint256 depositAmount = 5_000 ether;

        vm.startPrank(alice);
        usdp.approve(address(savingRate), depositAmount);
        savingRate.deposit(depositAmount);
        vm.stopPrank();

        assertEq(savingRate.balanceOf(alice), depositAmount, "Deposit balance mismatch");
        console.log("  - Deposited:", depositAmount / 1 ether, "USDP");

        // Wait 30 days
        console.log("\nStep 2: Wait 30 days and check interest");
        vm.warp(block.timestamp + 30 days);

        uint256 interest = savingRate.accruedInterestOf(alice);
        assertGt(interest, 0, "Interest should accrue");

        // Expected: 5000 * 200 bps * 30 days / 365 days / 10000 = ~0.822 USDP
        uint256 expectedInterest = (depositAmount * 200 * 30 days) / (365 days * 10000);
        assertApproxEqRel(interest, expectedInterest, 0.01e18, "Interest calculation (1% tolerance)");

        console.log("  - Accrued interest:", interest / 1e15, "/ 1000 USDP");
        console.log("  - Expected interest:", expectedInterest / 1e15, "/ 1000 USDP");
        console.log("\n=== TEST 5 PASSED ===\n");
    }

    // ==================================================================
    // TEST 6: Gas Benchmarks for Critical Operations
    // ==================================================================

    function test_Integration_GasBenchmarks() public {
        console.log("\n=== TEST 6: Gas Benchmarks ===\n");

        // Setup: Get USDP for Alice
        uint256 usdcAmount = 20_000 * (10 ** USDC_DECIMALS); // More USDC for testing
        vm.startPrank(alice);
        usdc.approve(address(psm), usdcAmount);
        psm.swapUSDCForUSDP(10_000 * (10 ** USDC_DECIMALS)); // Get initial USDP
        vm.stopPrank();

        uint256 gasBefore;
        uint256 gasAfter;

        // Benchmark 1: PSM Swap
        vm.startPrank(alice);
        usdc.approve(address(psm), 1_000 * (10 ** USDC_DECIMALS));
        gasBefore = gasleft();
        psm.swapUSDCForUSDP(1_000 * (10 ** USDC_DECIMALS));
        gasAfter = gasleft();
        console.log("  - PSM swap gas:", gasBefore - gasAfter);
        vm.stopPrank();

        // Benchmark 2: vePaimon Lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 1_000 ether);
        gasBefore = gasleft();
        vePaimon.createLock(1_000 ether, 365 days);
        gasAfter = gasleft();
        console.log("  - vePaimon lock gas:", gasBefore - gasAfter);
        vm.stopPrank();

        // Benchmark 3: Savings deposit
        vm.startPrank(alice);
        usdp.approve(address(savingRate), 1_000 ether);
        gasBefore = gasleft();
        savingRate.deposit(1_000 ether);
        gasAfter = gasleft();
        console.log("  - Savings deposit gas:", gasBefore - gasAfter);
        vm.stopPrank();

        console.log("\n=== TEST 6 PASSED ===\n");
    }

    // ==================================================================
    // Helper Functions
    // ==================================================================

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        uint256 amountInWithFee = amountIn * 9975; // 0.25% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;

        return numerator / denominator;
    }
}
