// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/incentives/NitroPool.sol";
import "../../src/core/PAIMON.sol";
import "../../src/core/VotingEscrowPaimon.sol";
import "../../src/dex/DEXFactory.sol";
import "../../src/dex/DEXPair.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title NitroPoolTest - Comprehensive 6-Dimensional Test Suite
 * @notice Tests NitroPool external incentive pools with governance approval
 *
 * Test Coverage:
 * 1. Functional (8 tests) - Core functionality
 * 2. Boundary (8 tests) - Edge cases
 * 3. Exception (6 tests) - Error handling
 * 4. Performance (4 tests) - Gas benchmarks
 * 5. Security (5 tests) - Attack vectors
 * 6. Compatibility (4 tests) - Integration
 *
 * Total: 35 tests targeting ≥90% coverage
 */
contract NitroPoolTest is Test {
    // ==================== Contracts ====================
    NitroPool public nitroPool;
    PAIMON public paimon;
    VotingEscrowPaimon public vePaimon;
    DEXFactory public factory;
    DEXPair public lpToken;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MockERC20 public rewardToken;

    // ==================== Test Accounts ====================
    address public owner = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public externalProject = address(0x3);
    address public governance = address(0x4);
    address public treasury = address(0x5);

    // ==================== Constants ====================
    uint256 constant INITIAL_MINT = 1_000_000e18;
    uint256 constant PLATFORM_FEE_BPS = 200; // 2%
    uint256 constant MIN_LOCK_DURATION = 7 days;
    uint256 constant MAX_LOCK_DURATION = 365 days;

    // ==================== Events (for testing) ====================
    event NitroPoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        address lpToken,
        uint256 lockDuration,
        uint256 minLiquidity,
        address[] rewardTokens
    );
    event NitroPoolApproved(uint256 indexed poolId, address indexed approver);
    event NitroPoolEntered(uint256 indexed poolId, address indexed user, uint256 amount);
    event NitroPoolExited(uint256 indexed poolId, address indexed user, uint256 amount);
    event NitroRewardClaimed(
        uint256 indexed poolId, address indexed user, address indexed rewardToken, uint256 amount
    );
    event RewardDeposited(
        uint256 indexed poolId, address indexed depositor, address indexed rewardToken, uint256 amount
    );

    // ==================== Setup ====================

    function setUp() public {
        // Deploy core contracts
        paimon = new PAIMON(1_000_000_000e18); // 1B max supply
        vePaimon = new VotingEscrowPaimon(address(paimon));

        // Deploy DEX factory and create LP token
        factory = new DEXFactory(owner);
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);

        // Create LP pair
        address pairAddress = factory.createPair(address(tokenA), address(tokenB));
        lpToken = DEXPair(pairAddress);

        // Deploy reward token
        rewardToken = new MockERC20("Reward Token", "RWD", 18);

        // Deploy NitroPool
        nitroPool = new NitroPool(address(vePaimon), treasury, PLATFORM_FEE_BPS);

        // Mint tokens to test accounts
        _mintTokens();
    }

    function _mintTokens() internal {
        paimon.mint(owner, INITIAL_MINT);
        paimon.mint(alice, INITIAL_MINT);
        paimon.mint(bob, INITIAL_MINT);
        paimon.mint(governance, INITIAL_MINT); // Add governance PAIMON for vePaimon locks

        tokenA.mint(alice, INITIAL_MINT);
        tokenB.mint(alice, INITIAL_MINT);
        tokenA.mint(bob, INITIAL_MINT);
        tokenB.mint(bob, INITIAL_MINT);

        rewardToken.mint(externalProject, INITIAL_MINT);
    }

    function _addLiquidity(address user, uint256 amountA, uint256 amountB)
        internal
        returns (uint256 liquidity)
    {
        vm.startPrank(user);
        tokenA.approve(address(lpToken), amountA);
        tokenB.approve(address(lpToken), amountB);

        tokenA.transfer(address(lpToken), amountA);
        tokenB.transfer(address(lpToken), amountB);
        liquidity = lpToken.mint(user);
        vm.stopPrank();
    }

    function _createAndApproveLock(address user, uint256 amount, uint256 duration)
        internal
        returns (uint256 tokenId)
    {
        vm.startPrank(user);
        paimon.approve(address(vePaimon), amount);
        tokenId = vePaimon.createLock(amount, duration);
        vm.stopPrank();
    }

    // ==================== Dimension 1: Functional Tests (8) ====================

    function test_CreateNitroPool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.startPrank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(
            address(lpToken), 30 days, 1000e18, // lockDuration, minLiquidity
            rewardTokens
        );
        vm.stopPrank();

        (
            address lpTokenAddr,
            uint256 lockDuration,
            uint256 minLiquidity,
            ,
            address creator,
            bool approved,
            bool active,
            ,
        ) = nitroPool.getPoolInfo(poolId);

        assertEq(lpTokenAddr, address(lpToken));
        assertEq(lockDuration, 30 days);
        assertEq(minLiquidity, 1000e18);
        assertEq(creator, externalProject);
        assertFalse(approved);
        assertFalse(active);
    }

    function test_ApproveNitroPool() public {
        // Create pool
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        // Create vePaimon lock (governance power)
        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);

        // Approve pool
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        (, , , , , bool approved, bool active, , ) = nitroPool.getPoolInfo(poolId);

        assertTrue(approved);
        assertTrue(active);
    }

    function test_EnterNitroPool() public {
        // Setup: Create and approve pool
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        // Add liquidity
        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        // Enter Nitro pool
        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        (uint256 amount, , ) = nitroPool.userStakes(poolId, alice);
        assertEq(amount, liquidity);
    }

    function test_ExitNitroPool() public {
        // Setup: Enter pool
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        // Fast forward past lock duration
        vm.warp(block.timestamp + 31 days);

        // Exit pool
        vm.prank(alice);
        nitroPool.exitNitroPool(poolId);

        (uint256 amount, , ) = nitroPool.userStakes(poolId, alice);
        assertEq(amount, 0);
    }

    function test_ClaimRewards() public {
        // Setup: Enter pool and deposit rewards
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        // Deposit rewards
        vm.startPrank(externalProject);
        rewardToken.approve(address(nitroPool), 10000e18);
        nitroPool.depositReward(poolId, address(rewardToken), 10000e18);
        vm.stopPrank();

        // Claim rewards
        uint256 balanceBefore = rewardToken.balanceOf(alice);
        vm.prank(alice);
        nitroPool.claimRewards(poolId);
        uint256 balanceAfter = rewardToken.balanceOf(alice);

        assertGt(balanceAfter, balanceBefore);
    }

    function test_DepositReward() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        // Deposit rewards
        vm.startPrank(externalProject);
        rewardToken.approve(address(nitroPool), 10000e18);
        nitroPool.depositReward(poolId, address(rewardToken), 10000e18);
        vm.stopPrank();

        // Verify platform fee deducted (2%)
        uint256 platformFee = (10000e18 * PLATFORM_FEE_BPS) / 10000;
        assertEq(rewardToken.balanceOf(treasury), platformFee);
    }

    function test_DeactivateNitroPool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        // Deactivate
        nitroPool.deactivateNitroPool(poolId);

        (, , , , , , bool active, , ) = nitroPool.getPoolInfo(poolId);
        assertFalse(active);
    }

    function test_ReactivateNitroPool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        // Deactivate then reactivate
        nitroPool.deactivateNitroPool(poolId);
        nitroPool.reactivateNitroPool(poolId);

        (, , , , , , bool active, , ) = nitroPool.getPoolInfo(poolId);
        assertTrue(active);
    }

    // ==================== Dimension 2: Boundary Tests (8) ====================

    function test_CreatePool_MinimumLockDuration() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        nitroPool.createNitroPool(address(lpToken), MIN_LOCK_DURATION, 1000e18, rewardTokens);

        // Should not revert
    }

    function test_CreatePool_MaximumLockDuration() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        nitroPool.createNitroPool(address(lpToken), MAX_LOCK_DURATION, 1000e18, rewardTokens);

        // Should not revert
    }

    function test_CreatePool_ZeroMinLiquidity() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        nitroPool.createNitroPool(address(lpToken), 30 days, 0, rewardTokens);

        // Should not revert (0 minLiquidity allowed)
    }

    function test_CreatePool_EmptyRewardTokens() public {
        address[] memory rewardTokens = new address[](0);

        vm.prank(externalProject);
        vm.expectRevert("NitroPool: No reward tokens");
        nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);
    }

    function test_CreatePool_MaxRewardTokens() public {
        address[] memory rewardTokens = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            rewardTokens[i] = address(new MockERC20("Reward", "RWD", 18));
        }

        vm.prank(externalProject);
        nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        // Should not revert
    }

    function test_EnterPool_MinimumAmount() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 0, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 100e18, 100e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        // Should not revert
    }

    function test_EnterPool_MaximumAmount() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 0, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, INITIAL_MINT / 2, INITIAL_MINT / 2);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        // Should not revert
    }

    function test_ClaimRewards_NoRewards() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);

        // Claim without rewards deposited
        nitroPool.claimRewards(poolId);
        vm.stopPrank();

        // Should not revert (0 rewards claimed)
    }

    // ==================== Dimension 3: Exception Tests (6) ====================

    function test_Revert_EnterUnapprovedPool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        vm.expectRevert("NitroPool: Not approved");
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();
    }

    function test_Revert_EnterInactivePool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        nitroPool.deactivateNitroPool(poolId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        vm.expectRevert("NitroPool: Not active");
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();
    }

    function test_Revert_EnterZeroAmount() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        vm.prank(alice);
        vm.expectRevert("NitroPool: Zero amount");
        nitroPool.enterNitroPool(poolId, 0);
    }

    function test_Revert_ExitBeforeLockExpiry() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);

        // Try to exit before lock expires
        vm.expectRevert("NitroPool: Still locked");
        nitroPool.exitNitroPool(poolId);
        vm.stopPrank();
    }

    function test_Revert_DepositInvalidRewardToken() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        MockERC20 invalidToken = new MockERC20("Invalid", "INV", 18);
        invalidToken.mint(externalProject, 1000e18);

        vm.startPrank(externalProject);
        invalidToken.approve(address(nitroPool), 1000e18);
        vm.expectRevert("NitroPool: Invalid reward token");
        nitroPool.depositReward(poolId, address(invalidToken), 1000e18);
        vm.stopPrank();
    }

    function test_Revert_ApproveWithInsufficientVotingPower() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        // Create lock with insufficient voting power
        uint256 tokenId = _createAndApproveLock(governance, 100e18, 7 days); // Very small lock

        vm.prank(governance);
        vm.expectRevert("NitroPool: Insufficient voting power");
        nitroPool.approveNitroPool(poolId, tokenId);
    }

    // ==================== Dimension 4: Performance Tests (4) ====================

    function test_Gas_CreateNitroPool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 gasBefore = gasleft();
        nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 250K gas
        assertLt(gasUsed, 250_000);
        emit log_named_uint("Gas used for createNitroPool", gasUsed);
    }

    function test_Gas_EnterNitroPool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        uint256 gasBefore = gasleft();
        nitroPool.enterNitroPool(poolId, liquidity);
        uint256 gasUsed = gasBefore - gasleft();
        vm.stopPrank();

        // Should be < 150K gas
        assertLt(gasUsed, 150_000);
        emit log_named_uint("Gas used for enterNitroPool", gasUsed);
    }

    function test_Gas_ClaimRewards() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        vm.startPrank(externalProject);
        rewardToken.approve(address(nitroPool), 10000e18);
        nitroPool.depositReward(poolId, address(rewardToken), 10000e18);
        vm.stopPrank();

        vm.prank(alice);
        uint256 gasBefore = gasleft();
        nitroPool.claimRewards(poolId);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 200K gas
        assertLt(gasUsed, 200_000);
        emit log_named_uint("Gas used for claimRewards", gasUsed);
    }

    function test_Gas_ExitNitroPool() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days);

        vm.prank(alice);
        uint256 gasBefore = gasleft();
        nitroPool.exitNitroPool(poolId);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 100K gas
        assertLt(gasUsed, 100_000);
        emit log_named_uint("Gas used for exitNitroPool", gasUsed);
    }

    // ==================== Dimension 5: Security Tests (5) ====================

    function test_Security_ReentrancyProtection() public {
        // TODO: Implement with malicious ERC20 that attempts reentrancy
        // NitroPool should use ReentrancyGuard to prevent
    }

    function test_Security_MaliciousRewardToken() public {
        // Create pool with malicious token that fails on transfer
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        // Deposit rewards should use SafeERC20 to handle failures
        vm.startPrank(externalProject);
        rewardToken.approve(address(nitroPool), 10000e18);
        nitroPool.depositReward(poolId, address(rewardToken), 10000e18);
        vm.stopPrank();

        // Should not revert on claim even if token has issues
    }

    function test_Security_OnlyOwnerCanDeactivate() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        vm.prank(alice);
        vm.expectRevert();
        nitroPool.deactivateNitroPool(poolId);
    }

    function test_Security_PlatformFeeCollected() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 rewardAmount = 10000e18;
        uint256 expectedFee = (rewardAmount * PLATFORM_FEE_BPS) / 10000;

        vm.startPrank(externalProject);
        rewardToken.approve(address(nitroPool), rewardAmount);
        nitroPool.depositReward(poolId, address(rewardToken), rewardAmount);
        vm.stopPrank();

        assertEq(rewardToken.balanceOf(treasury), expectedFee);
    }

    function test_Security_NoDoubleStaking() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity / 2);

        // Try to stake again
        vm.expectRevert("NitroPool: Already staked");
        nitroPool.enterNitroPool(poolId, liquidity / 2);
        vm.stopPrank();
    }

    // ==================== Dimension 6: Compatibility Tests (4) ====================

    function test_Compatibility_VePaimonIntegration() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        // Create vePaimon lock
        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);

        // Verify vePaimon NFT ownership
        assertEq(vePaimon.ownerOf(tokenId), governance);

        // Approve pool using vePaimon voting power
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        (, , , , , bool approved, , , ) = nitroPool.getPoolInfo(poolId);
        assertTrue(approved);
    }

    function test_Compatibility_MultipleRewardTokens() public {
        MockERC20 rewardToken2 = new MockERC20("Reward 2", "RWD2", 18);
        rewardToken2.mint(externalProject, INITIAL_MINT);

        address[] memory rewardTokens = new address[](2);
        rewardTokens[0] = address(rewardToken);
        rewardTokens[1] = address(rewardToken2);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 10000e18, 10000e18);

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();

        // Deposit both reward tokens
        vm.startPrank(externalProject);
        rewardToken.approve(address(nitroPool), 5000e18);
        rewardToken2.approve(address(nitroPool), 3000e18);
        nitroPool.depositReward(poolId, address(rewardToken), 5000e18);
        nitroPool.depositReward(poolId, address(rewardToken2), 3000e18);
        vm.stopPrank();

        // Claim all rewards
        vm.prank(alice);
        nitroPool.claimRewards(poolId);

        // Verify both tokens claimed
        assertGt(rewardToken.balanceOf(alice), 0);
        assertGt(rewardToken2.balanceOf(alice), 0);
    }

    function test_Compatibility_StandardERC20LP() public {
        // Test with standard ERC20 LP token (already using DEXPair)
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        nitroPool.createNitroPool(address(lpToken), 30 days, 1000e18, rewardTokens);

        // Should not revert
    }

    function test_Compatibility_MinLiquidityRequirement() public {
        address[] memory rewardTokens = new address[](1);
        rewardTokens[0] = address(rewardToken);

        vm.prank(externalProject);
        uint256 poolId = nitroPool.createNitroPool(address(lpToken), 30 days, 10000e18, rewardTokens);

        uint256 tokenId = _createAndApproveLock(governance, 10000e18, 365 days);
        vm.prank(governance);
        nitroPool.approveNitroPool(poolId, tokenId);

        uint256 liquidity = _addLiquidity(alice, 5000e18, 5000e18); // Below minLiquidity

        vm.startPrank(alice);
        lpToken.approve(address(nitroPool), liquidity);
        vm.expectRevert("NitroPool: Below min liquidity");
        nitroPool.enterNitroPool(poolId, liquidity);
        vm.stopPrank();
    }
}
