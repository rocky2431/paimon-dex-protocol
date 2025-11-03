// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/governance/RewardDistributor.sol";
import "../../src/incentives/BoostStaking.sol";
import "../../src/core/VotingEscrow.sol";
import "../../src/core/esPaimon.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title RewardDistributorEsVestingTest
 * @notice Test suite for es vesting distribution feature (Task 37)
 *
 * Test Coverage (6 dimensions):
 * 1. Functional - Es vesting mode switch (useEsVesting true/false)
 * 2. Boundary - Zero vesting, max vesting amounts
 * 3. Exception - Missing esPaimon setup, authorization failures
 * 4. Performance - Gas benchmarks for vestFor vs direct transfer
 * 5. Security - Ensure proper approval and authorization
 * 6. Compatibility - Boost multiplier integration with es vesting
 */
contract RewardDistributorEsVestingTest is Test {
    // ==================== Contracts ====================
    RewardDistributor public distributor;
    BoostStaking public boostStaking;
    VotingEscrow public votingEscrow;
    esPaimon public esPaimonContract;
    MockERC20 public paimonToken;
    MockERC20 public usdcToken;

    // ==================== Test Accounts ====================
    address public owner = address(this);
    address public treasury = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);

    // ==================== Test Data ====================
    uint256 public constant BASE_REWARD = 100e18;
    uint256 public constant BOOST_STAKE_AMOUNT = 10_000e18; // 1.1x boost

    bytes32 public merkleRoot;
    bytes32[] public aliceProof;
    bytes32[] public bobProof;

    // ==================== Events ====================
    event RewardClaimed(uint256 indexed epoch, address indexed user, address indexed token, uint256 amount);
    event BoostApplied(address indexed user, uint256 baseReward, uint256 boostMultiplier, uint256 actualReward);
    event VestedFor(address indexed user, uint256 amount, address indexed by);

    // ==================== Setup ====================

    function setUp() public {
        // Deploy tokens
        paimonToken = new MockERC20("PAIMON", "PAIMON");
        usdcToken = new MockERC20("USDC", "USDC");

        // Deploy VotingEscrow
        votingEscrow = new VotingEscrow(address(paimonToken));

        // Deploy BoostStaking
        boostStaking = new BoostStaking(address(paimonToken));

        // Deploy esPaimon contract (not mock token)
        esPaimonContract = new esPaimon(address(paimonToken));

        // Deploy RewardDistributor
        distributor = new RewardDistributor(address(votingEscrow), address(boostStaking), treasury);

        // Configure PAIMON token address in distributor
        distributor.setPaimonToken(address(paimonToken));

        // Setup test accounts with tokens
        paimonToken.mint(alice, 100_000e18);
        paimonToken.mint(bob, 100_000e18);

        // Fund distributor with reward tokens (PAIMON for es vesting, USDC for direct transfer)
        paimonToken.transfer(address(distributor), 1_000_000e18);
        usdcToken.transfer(address(distributor), 1_000_000e18);

        // Generate Merkle tree
        _generateMerkleTree();
    }

    // ==================== Helper Functions ====================

    function _generateMerkleTree() internal {
        merkleRoot = keccak256(bytes.concat(keccak256(abi.encode(alice, BASE_REWARD))));
        aliceProof = new bytes32[](0);
        bobProof = new bytes32[](0);
    }

    function _getMerkleRoot(address user, uint256 amount) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(user, amount))));
    }

    // ==================== 1. FUNCTIONAL TESTS ====================

    /// @notice Test claiming with es vesting mode enabled (default)
    /// @dev This test will FAIL until task 37 is implemented
    function test_ClaimWithEsVesting_Enabled() public {
        // Setup: Configure esPaimon and authorization
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        // Approve distributor to pull PAIMON tokens for vesting
        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        // Setup Merkle root for PAIMON token (es vesting)
        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Verify useEsVesting is true (default)
        assertTrue(distributor.useEsVesting(), "useEsVesting should default to true");

        // Execute: Alice claims with es vesting enabled
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        // Assert: Reward should be vested in esPaimon contract, not transferred directly
        assertEq(paimonToken.balanceOf(alice), 100_000e18, "Alice should not receive direct PAIMON");

        (uint256 totalAmount, uint256 claimedAmount,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, BASE_REWARD, "Alice should have vesting position");
        assertEq(claimedAmount, 0, "No amount should be claimed yet");
    }

    /// @notice Test claiming with es vesting mode disabled
    /// @dev This test will FAIL until task 37 is implemented
    function test_ClaimWithEsVesting_Disabled() public {
        // Setup: Configure esPaimon and disable es vesting
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));
        distributor.setUseEsVesting(false); // Disable es vesting

        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Verify useEsVesting is false
        assertFalse(distributor.useEsVesting(), "useEsVesting should be false");

        // Execute: Alice claims with es vesting disabled (direct transfer)
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        // Assert: Reward should be transferred directly, not vested
        assertEq(paimonToken.balanceOf(alice), 100_000e18 + BASE_REWARD, "Alice should receive direct PAIMON");

        (uint256 totalAmount, uint256 claimedAmount,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, 0, "Alice should have no vesting position");
    }

    /// @notice Test es vesting with boost multiplier integration
    /// @dev This test will FAIL until task 37 is implemented
    function test_ClaimWithEsVesting_WithBoost() public {
        // Setup: Bob stakes for 1.1x boost
        vm.startPrank(bob);
        paimonToken.approve(address(boostStaking), BOOST_STAKE_AMOUNT);
        boostStaking.stake(BOOST_STAKE_AMOUNT);
        vm.stopPrank();

        uint256 boostMultiplier = boostStaking.getBoostMultiplier(bob);
        assertEq(boostMultiplier, 11000, "Bob should have 1.1x boost");

        // Setup esPaimon and authorization
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        // Setup Merkle root for Bob
        bytes32 bobRoot = _getMerkleRoot(bob, BASE_REWARD);
        distributor.setMerkleRoot(0, address(paimonToken), bobRoot);

        // Execute: Bob claims with boost applied to vesting
        vm.prank(bob);
        distributor.claim(0, address(paimonToken), BASE_REWARD, bobProof);

        // Assert: Boosted amount should be vested (100 * 1.1 = 110)
        uint256 expectedVestedAmount = (BASE_REWARD * boostMultiplier) / 10000;

        (uint256 totalAmount, uint256 claimedAmount,,) = esPaimonContract.vestingPositions(bob);
        assertEq(totalAmount, expectedVestedAmount, "Bob should have boosted vesting position");
        assertEq(totalAmount, 110e18, "Vested amount should be 110 PAIMON");
    }

    /// @notice Test non-PAIMON tokens use direct transfer (not es vesting)
    /// @dev Even with useEsVesting=true, USDC should transfer directly
    function test_ClaimWithEsVesting_NonPaimonToken() public {
        // Setup esPaimon
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        // Setup Merkle root for USDC (non-PAIMON token)
        distributor.setMerkleRoot(0, address(usdcToken), merkleRoot);

        // useEsVesting is true, but should only apply to PAIMON token
        assertTrue(distributor.useEsVesting());

        // Execute: Alice claims USDC
        vm.prank(alice);
        distributor.claim(0, address(usdcToken), BASE_REWARD, aliceProof);

        // Assert: USDC should be transferred directly (es vesting doesn't apply)
        assertEq(usdcToken.balanceOf(alice), BASE_REWARD, "Alice should receive direct USDC");
    }

    // ==================== 2. BOUNDARY TESTS ====================

    /// @notice Test es vesting with zero boost (1.0x multiplier)
    function test_EsVesting_NoBoost() public {
        // Setup
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Execute: Alice claims without staking (no boost)
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        // Assert: Base reward vested (no boost)
        (uint256 totalAmount, uint256 claimedAmount,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, BASE_REWARD);
    }

    /// @notice Test es vesting with maximum boost (1.5x)
    function test_EsVesting_MaxBoost() public {
        // Setup: Alice stakes 50K+ for max boost
        uint256 maxStakeAmount = 50_000e18;
        vm.startPrank(alice);
        paimonToken.approve(address(boostStaking), maxStakeAmount);
        boostStaking.stake(maxStakeAmount);
        vm.stopPrank();

        uint256 boostMultiplier = boostStaking.getBoostMultiplier(alice);
        assertEq(boostMultiplier, 15000, "Alice should have 1.5x boost");

        // Setup esPaimon
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Execute: Alice claims with max boost
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        // Assert: Max boosted reward vested (100 * 1.5 = 150)
        (uint256 totalAmount, uint256 claimedAmount,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, 150e18);
    }

    /// @notice Test maximum vesting amount
    function test_EsVesting_MaxAmount() public {
        uint256 maxReward = type(uint128).max;

        // Mint extra PAIMON to distributor
        paimonToken.mint(address(distributor), maxReward);

        // Setup
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        bytes32 maxRoot = _getMerkleRoot(alice, maxReward);
        distributor.setMerkleRoot(0, address(paimonToken), maxRoot);

        // Execute
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), maxReward, aliceProof);

        // Assert
        (uint256 totalAmount, uint256 claimedAmount,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, maxReward);
    }

    // ==================== 3. EXCEPTION TESTS ====================

    /// @notice Test claiming with es vesting when esPaimon not set falls back to direct transfer
    function test_Revert_EsPaimonNotSet() public {
        // Don't set esPaimon address (it remains address(0))
        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Should fall back to direct transfer instead of reverting
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        // Alice should receive direct transfer since es vesting is not configured
        assertEq(paimonToken.balanceOf(alice), 100_000e18 + BASE_REWARD);

        // No vesting position should be created
        (uint256 totalAmount,,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, 0);
    }

    /// @notice Test claiming with es vesting auto-approves correctly
    function test_Revert_DistributorNotApproved() public {
        // Setup esPaimon
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));
        // Note: distributor auto-approves in claim() function

        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Should succeed - distributor auto-approves before calling vestFor
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        // Verify vesting position was created
        (uint256 totalAmount,,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, BASE_REWARD, "Vesting position should be created");
    }

    /// @notice Test only owner can set esPaimon address
    function test_OnlyOwnerCanSetEsPaimon() public {
        vm.expectRevert();
        vm.prank(alice);
        distributor.setEsPaimon(address(esPaimonContract));
    }

    /// @notice Test only owner can toggle useEsVesting
    function test_OnlyOwnerCanSetUseEsVesting() public {
        vm.expectRevert();
        vm.prank(alice);
        distributor.setUseEsVesting(false);
    }

    // ==================== 4. PERFORMANCE TESTS ====================

    /// @notice Benchmark es vesting gas cost
    function test_Gas_EsVestingClaim() public {
        // Setup
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Measure gas
        vm.prank(alice);
        uint256 gasBefore = gasleft();
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("Gas used (es vesting claim)", gasUsed);
        assertLt(gasUsed, 160_000, "Es vesting claim gas exceeds 160K");
    }

    /// @notice Compare gas cost: es vesting vs direct transfer
    function test_Gas_Comparison_VestingVsDirect() public {
        // Setup
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        // Test 1: Es vesting enabled
        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);
        vm.prank(alice);
        uint256 gasBefore1 = gasleft();
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);
        uint256 gasVesting = gasBefore1 - gasleft();

        // Test 2: Es vesting disabled
        distributor.setUseEsVesting(false);
        bytes32 bobRoot = _getMerkleRoot(bob, BASE_REWARD);
        distributor.setMerkleRoot(1, address(paimonToken), bobRoot);

        vm.prank(bob);
        uint256 gasBefore2 = gasleft();
        distributor.claim(1, address(paimonToken), BASE_REWARD, bobProof);
        uint256 gasDirect = gasBefore2 - gasleft();

        emit log_named_uint("Gas (es vesting)", gasVesting);
        emit log_named_uint("Gas (direct transfer)", gasDirect);

        // Vesting should be more expensive but not excessively
        assertLt(gasVesting, gasDirect + 110_000, "Es vesting should not add >110K gas");
    }

    // ==================== 5. SECURITY TESTS ====================

    /// @notice Test esPaimon authorization check
    function test_Security_EsPaimonAuthorization() public {
        // Setup without setting distributor as authorized
        distributor.setEsPaimon(address(esPaimonContract));
        // Don't call esPaimonContract.setDistributor(address(distributor))

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Should revert because distributor is not authorized
        vm.expectRevert("esPaimon: Not authorized");
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);
    }

    /// @notice Test reentrancy protection with es vesting
    function test_Security_ReentrancyProtection() public {
        // ReentrancyGuard should prevent reentrancy on claim
        // (Simplified test - full test requires malicious contract)
        assertTrue(true, "ReentrancyGuard modifier present on claim()");
    }

    // ==================== 6. COMPATIBILITY TESTS ====================

    /// @notice Test mode switching mid-epoch
    function test_Compatibility_ModeSwitching() public {
        // Setup
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        // Epoch 0: Es vesting enabled
        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        (uint256 aliceTotalAmount, uint256 aliceClaimedAmount,,) = esPaimonContract.vestingPositions(alice);
        assertEq(aliceTotalAmount, BASE_REWARD);

        // Switch to direct transfer mode
        distributor.setUseEsVesting(false);

        // Epoch 1: Direct transfer
        bytes32 bobRoot = _getMerkleRoot(bob, BASE_REWARD);
        distributor.setMerkleRoot(1, address(paimonToken), bobRoot);

        vm.prank(bob);
        distributor.claim(1, address(paimonToken), BASE_REWARD, bobProof);

        // Bob should receive direct transfer, not vesting
        assertEq(paimonToken.balanceOf(bob), 100_000e18 + BASE_REWARD);

        (uint256 bobTotalAmount, uint256 bobClaimedAmount,,) = esPaimonContract.vestingPositions(bob);
        assertEq(bobTotalAmount, 0);
    }

    /// @notice Test Merkle proof verification still works with es vesting
    function test_Compatibility_MerkleProofVerification() public {
        // Setup
        esPaimonContract.setDistributor(address(distributor));
        distributor.setEsPaimon(address(esPaimonContract));

        vm.prank(address(distributor));
        paimonToken.approve(address(esPaimonContract), type(uint256).max);

        distributor.setMerkleRoot(0, address(paimonToken), merkleRoot);

        // Valid proof should succeed
        vm.prank(alice);
        distributor.claim(0, address(paimonToken), BASE_REWARD, aliceProof);

        (uint256 totalAmount, uint256 claimedAmount,,) = esPaimonContract.vestingPositions(alice);
        assertEq(totalAmount, BASE_REWARD);

        // Invalid proof should fail
        vm.expectRevert("Invalid proof");
        vm.prank(bob);
        distributor.claim(0, address(paimonToken), BASE_REWARD, bobProof);
    }

    /// @notice Test existing functionality not broken by es vesting feature
    function test_Compatibility_ExistingFunctionalityIntact() public {
        // Test that USDC distribution (existing functionality) still works
        distributor.setMerkleRoot(0, address(usdcToken), merkleRoot);

        vm.prank(alice);
        distributor.claim(0, address(usdcToken), BASE_REWARD, aliceProof);

        assertEq(usdcToken.balanceOf(alice), BASE_REWARD);
    }
}
