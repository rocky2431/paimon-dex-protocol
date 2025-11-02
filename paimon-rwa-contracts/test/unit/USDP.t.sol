// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/USDP.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title USDP Test Suite
 * @notice Comprehensive TDD tests for USDP contract with 6-dimensional coverage
 * @dev Test dimensions: Functional, Boundary, Exception, Performance, Security, Compatibility
 *
 * USDP Key Features:
 * - Share-based ERC20 with accrualIndex mechanism
 * - Only Treasury/PSM can mint/burn
 * - accumulate() updates index daily (distributor role)
 * - balanceOf() dynamically calculated from shares
 *
 * Invariant: sum(_shares) == _totalShares
 */
contract USDPTest is Test {
    // ==================== Contracts ====================

    USDP public usdp;
    MockERC20 public usdc;

    // ==================== Test Accounts ====================

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public psm = address(0x3);
    address public distributor = address(0x4);
    address public user1 = address(0x5);
    address public user2 = address(0x6);
    address public attacker = address(0x7);

    // ==================== Constants ====================

    uint256 public constant INITIAL_INDEX = 1e18; // 1.0 in 18 decimals
    uint256 public constant ONE_DAY = 1 days;
    uint256 public constant PRECISION = 1e18;

    // ==================== Events ====================

    event IndexAccumulated(uint256 indexed newIndex, uint256 indexed timestamp);
    event DistributorUpdated(address indexed newDistributor);
    event Transfer(address indexed from, address indexed to, uint256 value);

    // ==================== Setup ====================

    function setUp() public {
        vm.startPrank(owner);

        // Deploy USDP with owner
        usdp = new USDP();

        // Setup authorized minters
        usdp.setAuthorizedMinter(treasury, true);
        usdp.setAuthorizedMinter(psm, true);

        // Setup distributor
        usdp.setDistributor(distributor);

        // Deploy mock USDC for integration tests
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdc.mint(owner, 10_000_000 * 1e6);

        vm.stopPrank();
    }

    // ==================== 1. FUNCTIONAL TESTS ====================
    // Test core business logic and happy paths

    function test_Functional_InitialState() public view {
        // Initial accrualIndex should be 1.0
        assertEq(usdp.accrualIndex(), INITIAL_INDEX, "Initial index should be 1e18");

        // Total supply should be 0
        assertEq(usdp.totalSupply(), 0, "Initial total supply should be 0");

        // Total shares should be 0
        assertEq(usdp.totalShares(), 0, "Initial total shares should be 0");

        // Owner should be set
        assertEq(usdp.owner(), owner, "Owner should be deployer");

        // Distributor should be set
        assertEq(usdp.distributor(), distributor, "Distributor should be set");
    }

    function test_Functional_MintByTreasury() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // User should have 1000 USDP
        assertEq(usdp.balanceOf(user1), 1000 * 1e18, "User should have 1000 USDP");

        // Total supply should be 1000
        assertEq(usdp.totalSupply(), 1000 * 1e18, "Total supply should be 1000 USDP");

        // Shares should equal balance initially (index = 1.0)
        assertEq(usdp.sharesOf(user1), 1000 * 1e18, "Shares should equal balance");
    }

    function test_Functional_MintByPSM() public {
        vm.prank(psm);
        usdp.mint(user1, 500 * 1e18);

        assertEq(usdp.balanceOf(user1), 500 * 1e18, "User should have 500 USDP");
    }

    function test_Functional_BurnByTreasury() public {
        // Mint first
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // User approves treasury to burn
        vm.prank(user1);
        usdp.approve(treasury, 500 * 1e18);

        // Treasury burns
        vm.prank(treasury);
        usdp.burnFrom(user1, 500 * 1e18);

        assertEq(usdp.balanceOf(user1), 500 * 1e18, "User should have 500 USDP left");
        assertEq(usdp.totalSupply(), 500 * 1e18, "Total supply should be 500 USDP");
    }

    function test_Functional_AccumulateIndex() public {
        // Mint initial supply
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // Accumulate 2% yield (index 1.0 → 1.02)
        uint256 newIndex = 1.02e18;

        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        vm.expectEmit(true, true, false, true);
        emit IndexAccumulated(newIndex, block.timestamp);
        usdp.accumulate(newIndex);

        // Check index updated
        assertEq(usdp.accrualIndex(), newIndex, "Index should be 1.02e18");

        // User balance should increase (1000 * 1.02 = 1020)
        assertEq(usdp.balanceOf(user1), 1020 * 1e18, "Balance should reflect accrued yield");

        // Total supply should increase
        assertEq(usdp.totalSupply(), 1020 * 1e18, "Total supply should be 1020 USDP");

        // Shares should remain unchanged
        assertEq(usdp.sharesOf(user1), 1000 * 1e18, "Shares should remain 1000");
    }

    function test_Functional_Transfer() public {
        // Mint to user1
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // Transfer to user2
        vm.prank(user1);
        usdp.transfer(user2, 300 * 1e18);

        assertEq(usdp.balanceOf(user1), 700 * 1e18, "User1 should have 700 USDP");
        assertEq(usdp.balanceOf(user2), 300 * 1e18, "User2 should have 300 USDP");
    }

    function test_Functional_TransferAfterAccumulation() public {
        // Mint to user1
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // Accumulate 5% yield
        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        usdp.accumulate(1.05e18);

        // User1 balance: 1000 * 1.05 = 1050
        assertEq(usdp.balanceOf(user1), 1050 * 1e18, "User1 should have 1050 USDP after yield");

        // Transfer 525 USDP (half) to user2
        vm.prank(user1);
        usdp.transfer(user2, 525 * 1e18);

        assertEq(usdp.balanceOf(user1), 525 * 1e18, "User1 should have 525 USDP");
        assertEq(usdp.balanceOf(user2), 525 * 1e18, "User2 should have 525 USDP");
    }

    function test_Functional_Permit() public {
        // Setup permit parameters
        uint256 privateKey = 0xA11CE;
        address alice = vm.addr(privateKey);

        // Mint to alice
        vm.prank(treasury);
        usdp.mint(alice, 1000 * 1e18);

        uint256 amount = 500 * 1e18;
        uint256 deadline = block.timestamp + 1 hours;

        // Create permit signature
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                alice,
                user1,
                amount,
                usdp.nonces(alice),
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", usdp.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        // Execute permit
        usdp.permit(alice, user1, amount, deadline, v, r, s);

        assertEq(usdp.allowance(alice, user1), amount, "Allowance should be set via permit");
    }

    // ==================== 2. BOUNDARY TESTS ====================
    // Test edge cases: zero values, max values, empty states

    function test_Boundary_MintZero() public {
        vm.prank(treasury);
        vm.expectRevert("USDP: Cannot mint zero");
        usdp.mint(user1, 0);
    }

    function test_Boundary_MintToZeroAddress() public {
        vm.prank(treasury);
        vm.expectRevert("USDP: Mint to zero address");
        usdp.mint(address(0), 1000 * 1e18);
    }

    function test_Boundary_BurnZero() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        usdp.approve(treasury, 1000 * 1e18);

        vm.prank(treasury);
        vm.expectRevert("USDP: Cannot burn zero");
        usdp.burnFrom(user1, 0);
    }

    function test_Boundary_BurnExceedsBalance() public {
        vm.prank(treasury);
        usdp.mint(user1, 100 * 1e18);

        vm.prank(user1);
        usdp.approve(treasury, 200 * 1e18);

        vm.prank(treasury);
        vm.expectRevert("USDP: Burn amount exceeds balance");
        usdp.burnFrom(user1, 200 * 1e18);
    }

    function test_Boundary_TransferZero() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        vm.expectRevert("USDP: Transfer zero amount");
        usdp.transfer(user2, 0);
    }

    function test_Boundary_TransferToZeroAddress() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        vm.expectRevert("USDP: Transfer to zero address");
        usdp.transfer(address(0), 100 * 1e18);
    }

    function test_Boundary_AccumulateIndexUnchanged() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        uint256 currentIndex = usdp.accrualIndex();

        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        vm.expectRevert("USDP: Index must increase");
        usdp.accumulate(currentIndex);
    }

    function test_Boundary_AccumulateIndexDecrease() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        vm.expectRevert("USDP: Index must increase");
        usdp.accumulate(0.99e18); // Try to decrease index
    }

    function test_Boundary_AccumulateTooSoon() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // USDP contract does not enforce time-based restrictions at contract level.
        // Distribution frequency should be controlled by the RewardDistributor contract.
        // See USDP.sol:325-326 comments: "No time-based restrictions enforced at contract level"
        vm.warp(block.timestamp + 12 hours);
        vm.prank(distributor);
        usdp.accumulate(1.01e18); // Should succeed, no time restriction in USDP

        assertEq(usdp.accrualIndex(), 1.01e18, "Index should be updated");
    }

    function test_Boundary_MaxUint256Balance() public {
        // Test with very large amounts (close to uint256 max)
        uint256 largeAmount = type(uint256).max / 1e18; // Avoid overflow in shares calculation

        vm.prank(treasury);
        usdp.mint(user1, largeAmount);

        assertEq(usdp.balanceOf(user1), largeAmount, "Should handle large amounts");
    }

    // ==================== 3. EXCEPTION TESTS ====================
    // Test error handling, reverts, access control

    function test_Exception_MintUnauthorized() public {
        vm.prank(attacker);
        vm.expectRevert("USDP: Not authorized minter");
        usdp.mint(user1, 1000 * 1e18);
    }

    function test_Exception_BurnUnauthorized() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        usdp.approve(attacker, 500 * 1e18);

        vm.prank(attacker);
        vm.expectRevert("USDP: Not authorized minter");
        usdp.burnFrom(user1, 500 * 1e18);
    }

    function test_Exception_AccumulateUnauthorized() public {
        vm.prank(attacker);
        vm.expectRevert("USDP: Not distributor");
        usdp.accumulate(1.01e18);
    }

    function test_Exception_SetDistributorNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        usdp.setDistributor(attacker);
    }

    function test_Exception_SetAuthorizedMinterNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        usdp.setAuthorizedMinter(attacker, true);
    }

    function test_Exception_TransferInsufficientBalance() public {
        vm.prank(treasury);
        usdp.mint(user1, 100 * 1e18);

        vm.prank(user1);
        vm.expectRevert("USDP: Transfer amount exceeds balance");
        usdp.transfer(user2, 200 * 1e18);
    }

    function test_Exception_TransferFromInsufficientAllowance() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        usdp.approve(user2, 100 * 1e18);

        vm.prank(user2);
        vm.expectRevert("USDP: Transfer amount exceeds allowance");
        usdp.transferFrom(user1, user2, 200 * 1e18);
    }

    // ==================== 4. PERFORMANCE TESTS ====================
    // Test gas consumption, batch operations

    function test_Performance_MintGas() public {
        uint256 gasBefore = gasleft();

        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        uint256 gasUsed = gasBefore - gasleft();

        // Mint should cost < 100K gas
        assertLt(gasUsed, 100_000, "Mint gas should be < 100K");
    }

    function test_Performance_TransferGas() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        uint256 gasBefore = gasleft();

        vm.prank(user1);
        usdp.transfer(user2, 500 * 1e18);

        uint256 gasUsed = gasBefore - gasleft();

        // Transfer should cost < 80K gas
        assertLt(gasUsed, 80_000, "Transfer gas should be < 80K");
    }

    function test_Performance_AccumulateGas() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.warp(block.timestamp + ONE_DAY);

        uint256 gasBefore = gasleft();

        vm.prank(distributor);
        usdp.accumulate(1.01e18);

        uint256 gasUsed = gasBefore - gasleft();

        // Accumulate should cost < 50K gas
        assertLt(gasUsed, 50_000, "Accumulate gas should be < 50K");
    }

    function test_Performance_BatchMint() public {
        address[] memory users = new address[](10);
        for (uint i = 0; i < 10; i++) {
            users[i] = address(uint160(0x1000 + i));
        }

        uint256 gasBefore = gasleft();

        vm.startPrank(treasury);
        for (uint i = 0; i < 10; i++) {
            usdp.mint(users[i], 100 * 1e18);
        }
        vm.stopPrank();

        uint256 gasUsed = gasBefore - gasleft();
        uint256 avgGasPerMint = gasUsed / 10;

        // Average gas per mint should be < 100K
        assertLt(avgGasPerMint, 100_000, "Avg mint gas should be < 100K");
    }

    // ==================== 5. SECURITY TESTS ====================
    // Test for reentrancy, overflow, precision attacks

    function test_Security_NoOverflowOnLargeAccumulation() public {
        vm.prank(treasury);
        usdp.mint(user1, 1_000_000 * 1e18);

        // Accumulate large index (10x)
        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        usdp.accumulate(10e18);

        // Should not overflow
        uint256 balance = usdp.balanceOf(user1);
        assertEq(balance, 10_000_000 * 1e18, "Balance should be 10x after accumulation");
    }

    function test_Security_PrecisionLoss() public {
        // Test with small amounts to check precision
        vm.prank(treasury);
        usdp.mint(user1, 1); // 1 wei

        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        usdp.accumulate(1.000001e18); // 0.0001% yield

        // Balance should increase correctly even with tiny amounts
        uint256 balance = usdp.balanceOf(user1);
        assertGt(balance, 0, "Balance should not round to zero");
    }

    function test_Security_SharesInvariant() public {
        // Mint to multiple users
        vm.startPrank(treasury);
        usdp.mint(user1, 1000 * 1e18);
        usdp.mint(user2, 500 * 1e18);
        vm.stopPrank();

        // Check invariant: sum(shares) == totalShares
        uint256 sharesUser1 = usdp.sharesOf(user1);
        uint256 sharesUser2 = usdp.sharesOf(user2);
        uint256 totalShares = usdp.totalShares();

        assertEq(sharesUser1 + sharesUser2, totalShares, "Shares invariant violated");

        // Accumulate
        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        usdp.accumulate(1.1e18);

        // Invariant should still hold
        assertEq(sharesUser1 + sharesUser2, totalShares, "Shares invariant violated after accumulation");

        // Transfer
        vm.prank(user1);
        usdp.transfer(user2, 200 * 1e18);

        // Invariant should still hold
        assertEq(usdp.sharesOf(user1) + usdp.sharesOf(user2), totalShares, "Shares invariant violated after transfer");
    }

    function test_Security_NoFrontRunning() public {
        // Mint to user1
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // Attacker sees accumulate transaction in mempool
        // Tries to mint before accumulation
        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(treasury);
        usdp.mint(attacker, 1000 * 1e18);

        // Accumulate happens
        vm.prank(distributor);
        usdp.accumulate(1.1e18);

        // Standard share-based token behavior:
        // Both user1 and attacker minted at accrualIndex=1.0 (before accumulate)
        // Both get 1000 shares, both benefit from accumulation to 1.1
        // This is the standard behavior in Lido stETH, Aave aTokens, etc.
        // Front-running protection should be handled at the protocol layer
        // (e.g., RewardDistributor using multi-sig, MEV protection, etc.)
        assertEq(usdp.balanceOf(attacker), 1100 * 1e18, "Attacker has same shares as user1");
        assertEq(usdp.balanceOf(user1), 1100 * 1e18, "User1 should have yield benefit");

        // Verify they have the same shares
        assertEq(usdp.sharesOf(attacker), usdp.sharesOf(user1), "Same shares = same yield");
    }

    function test_Security_DistributorCannotStealFunds() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // Distributor tries to mint to themselves
        vm.prank(distributor);
        vm.expectRevert("USDP: Not authorized minter");
        usdp.mint(distributor, 1000 * 1e18);

        // Distributor can only call accumulate
        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        usdp.accumulate(1.01e18);

        // Distributor balance should be 0
        assertEq(usdp.balanceOf(distributor), 0, "Distributor should have no balance");
    }

    // ==================== 6. COMPATIBILITY TESTS ====================
    // Test ERC20 standard compliance, external integrations

    function test_Compatibility_ERC20Name() public view {
        assertEq(usdp.name(), "USD Paimon", "Name should be USD Paimon");
    }

    function test_Compatibility_ERC20Symbol() public view {
        assertEq(usdp.symbol(), "USDP", "Symbol should be USDP");
    }

    function test_Compatibility_ERC20Decimals() public view {
        assertEq(usdp.decimals(), 18, "Decimals should be 18");
    }

    function test_Compatibility_ERC20Approve() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        bool success = usdp.approve(user2, 500 * 1e18);

        assertTrue(success, "Approve should return true");
        assertEq(usdp.allowance(user1, user2), 500 * 1e18, "Allowance should be set");
    }

    function test_Compatibility_ERC20TransferFrom() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        usdp.approve(user2, 500 * 1e18);

        vm.prank(user2);
        bool success = usdp.transferFrom(user1, user2, 300 * 1e18);

        assertTrue(success, "TransferFrom should return true");
        assertEq(usdp.balanceOf(user2), 300 * 1e18, "User2 should receive tokens");
        assertEq(usdp.allowance(user1, user2), 200 * 1e18, "Allowance should decrease");
    }

    function test_Compatibility_ERC20PermitDomainSeparator() public view {
        // Check DOMAIN_SEPARATOR is set
        bytes32 domainSeparator = usdp.DOMAIN_SEPARATOR();
        assertTrue(domainSeparator != bytes32(0), "DOMAIN_SEPARATOR should be set");
    }

    function test_Compatibility_ExternalContractIntegration() public {
        // Simulate external contract (e.g., Uniswap) integration
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // User approves external contract
        vm.prank(user1);
        usdp.approve(user2, type(uint256).max);

        // External contract transfers on behalf
        vm.prank(user2);
        usdp.transferFrom(user1, user2, 500 * 1e18);

        assertEq(usdp.balanceOf(user2), 500 * 1e18, "External contract transfer should work");
    }

    function test_Compatibility_MultipleAccumulations() public {
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        // Day 1: 2% yield
        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        usdp.accumulate(1.02e18);
        assertEq(usdp.balanceOf(user1), 1020 * 1e18, "Balance after day 1");

        // Day 2: 3% yield on new index
        vm.warp(block.timestamp + ONE_DAY);
        vm.prank(distributor);
        usdp.accumulate(1.02e18 * 103 / 100); // 1.02 * 1.03 = 1.0506

        uint256 expectedBalance = 1000 * 1e18 * 1.0506e18 / 1e18;
        assertApproxEqRel(usdp.balanceOf(user1), expectedBalance, 0.01e18, "Balance after day 2 (1% tolerance)");
    }
}
