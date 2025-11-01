// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/VotingEscrowPaimon.sol";
import "../../src/core/PAIMON.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title VotingEscrowPaimonTest
 * @notice Comprehensive test suite for VotingEscrowPaimon contract (6-dimensional coverage)
 * @dev Test Dimensions:
 *      1. Functional - Core logic (lock, extend, transfer, withdraw, voting power)
 *      2. Boundary - Edge cases (min/max lock duration, zero amounts, expired locks)
 *      3. Exception - Error handling (reverts, unauthorized access, invalid states)
 *      4. Performance - Gas benchmarks (<250K gas per operation)
 *      5. Security - Reentrancy, precision loss, overflow protection
 *      6. Compatibility - GaugeController integration, NFT standard compliance
 */
contract VotingEscrowPaimonTest is Test {
    VotingEscrowPaimon public vePaimon;
    PAIMON public paimon;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 1e18; // 10B PAIMON
    uint256 public constant WEEK = 7 days;
    uint256 public constant MAXTIME = 4 * 365 days; // 4 years
    uint256 public constant MINTIME = 1 weeks; // 1 week

    // Events from VotingEscrow
    event Deposit(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 value,
        uint256 indexed locktime,
        uint256 depositType
    );
    event Withdraw(address indexed provider, uint256 indexed tokenId, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function setUp() public {
        // Deploy PAIMON token
        paimon = new PAIMON(MAX_SUPPLY);

        // Deploy VotingEscrowPaimon
        vePaimon = new VotingEscrowPaimon(address(paimon));

        // Mint PAIMON to users
        paimon.mint(user1, 10000 * 1e18);
        paimon.mint(user2, 10000 * 1e18);
        paimon.mint(user3, 10000 * 1e18);

        // Users approve vePaimon contract
        vm.prank(user1);
        paimon.approve(address(vePaimon), type(uint256).max);

        vm.prank(user2);
        paimon.approve(address(vePaimon), type(uint256).max);

        vm.prank(user3);
        paimon.approve(address(vePaimon), type(uint256).max);
    }

    // ==================== 1. Functional Tests (8) ====================

    function test_Functional_CreateLock() public {
        uint256 amount = 1000 * 1e18;
        uint256 lockDuration = 365 days; // 1 year

        vm.startPrank(user1);

        uint256 expectedTokenId = 1;
        uint256 expectedUnlockTime = block.timestamp + lockDuration;

        vm.expectEmit(true, true, true, true);
        emit Deposit(user1, expectedTokenId, amount, expectedUnlockTime, 0);

        uint256 tokenId = vePaimon.createLock(amount, lockDuration);

        vm.stopPrank();

        // Verify NFT minted
        assertEq(vePaimon.ownerOf(tokenId), user1, "NFT should be owned by user1");
        assertEq(tokenId, expectedTokenId, "Token ID should be 1");

        // Verify locked balance
        (uint128 lockedAmount, uint128 lockedEnd) = vePaimon.locked(tokenId);
        assertEq(lockedAmount, amount, "Locked amount should match");
        assertEq(lockedEnd, expectedUnlockTime, "Lock end time should match");

        // Verify PAIMON transferred
        assertEq(paimon.balanceOf(address(vePaimon)), amount, "Contract should hold locked PAIMON");
        assertEq(paimon.balanceOf(user1), 9000 * 1e18, "User1 balance should decrease");
    }

    function test_Functional_IncreaseAmount() public {
        // Create initial lock
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        // Increase amount
        uint256 additionalAmount = 500 * 1e18;
        (,uint128 lockEnd) = vePaimon.locked(tokenId);

        vm.startPrank(user1);
        vm.expectEmit(true, true, true, true);
        emit Deposit(user1, tokenId, additionalAmount, lockEnd, 1);

        vePaimon.increaseAmount(tokenId, additionalAmount);
        vm.stopPrank();

        // Verify new locked amount
        (uint128 lockedAmount,) = vePaimon.locked(tokenId);
        assertEq(lockedAmount, 1500 * 1e18, "Locked amount should increase");

        // Verify PAIMON balance
        assertEq(paimon.balanceOf(address(vePaimon)), 1500 * 1e18, "Contract balance should increase");
    }

    function test_Functional_IncreaseUnlockTime() public {
        // Create initial lock (1 year)
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        (,uint128 initialEnd) = vePaimon.locked(tokenId);

        // Increase lock time to 2 years
        vm.warp(block.timestamp + 100 days);

        vm.startPrank(user1);
        uint256 newLockDuration = 2 * 365 days;
        uint256 expectedNewEnd = block.timestamp + newLockDuration;

        vm.expectEmit(true, true, true, true);
        emit Deposit(user1, tokenId, 0, expectedNewEnd, 2);

        vePaimon.increaseUnlockTime(tokenId, newLockDuration);
        vm.stopPrank();

        // Verify new unlock time
        (,uint128 newEnd) = vePaimon.locked(tokenId);
        assertGt(newEnd, initialEnd, "Unlock time should increase");
        assertEq(newEnd, expectedNewEnd, "New unlock time should match");
    }

    function test_Functional_Withdraw() public {
        // Create lock
        uint256 amount = 1000 * 1e18;
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(amount, MINTIME);

        // Warp to after lock expiry
        vm.warp(block.timestamp + MINTIME + 1);

        uint256 balanceBefore = paimon.balanceOf(user1);

        vm.startPrank(user1);
        vm.expectEmit(true, true, true, true);
        emit Withdraw(user1, tokenId, amount);

        vePaimon.withdraw(tokenId);
        vm.stopPrank();

        // Verify NFT burned
        vm.expectRevert();
        vePaimon.ownerOf(tokenId);

        // Verify PAIMON returned
        assertEq(paimon.balanceOf(user1), balanceBefore + amount, "User should receive locked PAIMON back");
        assertEq(paimon.balanceOf(address(vePaimon)), 0, "Contract balance should be zero");
    }

    function test_Functional_VotingPower() public {
        // Create 4-year lock
        uint256 amount = 1000 * 1e18;
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(amount, MAXTIME);

        // Get actual lock end time (may be epoch-aligned)
        (, uint128 lockEnd) = vePaimon.locked(tokenId);

        // Initial voting power (4 years = 100% weight)
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertApproxEqRel(votingPower, amount, 0.01e18, "4-year lock should have ~100% weight");

        // Warp to halfway point (50% remaining)
        uint256 midpoint = (block.timestamp + uint256(lockEnd)) / 2;
        vm.warp(midpoint);
        votingPower = vePaimon.balanceOfNFT(tokenId);
        assertApproxEqRel(votingPower, amount / 2, 0.02e18, "Halfway should have ~50% weight");

        // Warp to 1 day before expiry
        vm.warp(uint256(lockEnd) - 1 days);
        votingPower = vePaimon.balanceOfNFT(tokenId);
        assertLt(votingPower, amount / 100, "Near expiry should have <1% weight");
    }

    function test_Functional_NFTTransfer() public {
        // Create lock
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        // Transfer NFT
        vm.startPrank(user1);
        vm.expectEmit(true, true, true, true);
        emit Transfer(user1, user2, tokenId);

        vePaimon.transferFrom(user1, user2, tokenId);
        vm.stopPrank();

        // Verify new owner
        assertEq(vePaimon.ownerOf(tokenId), user2, "NFT should be owned by user2");

        // Verify voting power still exists
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertGt(votingPower, 0, "Voting power should remain after transfer");

        // Verify only new owner can increase amount
        vm.prank(user2);
        vePaimon.increaseAmount(tokenId, 100 * 1e18);

        (uint128 lockedAmount,) = vePaimon.locked(tokenId);
        assertEq(lockedAmount, 1100 * 1e18, "New owner should be able to increase amount");
    }

    function test_Functional_MultipleLocks() public {
        // User1 creates 2 locks with same amount but different durations
        vm.startPrank(user1);
        uint256 tokenId1 = vePaimon.createLock(1000 * 1e18, 365 days); // 1 year
        uint256 tokenId2 = vePaimon.createLock(1000 * 1e18, 2 * 365 days); // 2 years
        vm.stopPrank();

        // Verify different token IDs
        assertEq(tokenId1, 1, "First token ID should be 1");
        assertEq(tokenId2, 2, "Second token ID should be 2");

        // Verify both owned by user1
        assertEq(vePaimon.ownerOf(tokenId1), user1, "Token 1 owned by user1");
        assertEq(vePaimon.ownerOf(tokenId2), user1, "Token 2 owned by user1");

        // Verify independent voting powers
        uint256 power1 = vePaimon.balanceOfNFT(tokenId1);
        uint256 power2 = vePaimon.balanceOfNFT(tokenId2);
        assertGt(power2, power1, "2-year lock should have higher voting power");
    }

    function test_Functional_GetRemainingTime() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        // Check remaining time
        uint256 remaining = vePaimon.getRemainingTime(tokenId);
        assertApproxEqAbs(remaining, 365 days, 10, "Remaining time should be ~365 days");

        // Warp forward 100 days
        vm.warp(block.timestamp + 100 days);
        remaining = vePaimon.getRemainingTime(tokenId);
        assertApproxEqAbs(remaining, 265 days, 10, "Remaining time should be ~265 days");

        // Warp past expiry
        vm.warp(block.timestamp + 300 days);
        remaining = vePaimon.getRemainingTime(tokenId);
        assertEq(remaining, 0, "Expired lock should have 0 remaining time");
    }

    // ==================== 2. Boundary Tests (8) ====================

    function test_Boundary_MinLockDuration() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MINTIME);

        (,uint128 lockEnd) = vePaimon.locked(tokenId);
        assertEq(lockEnd, block.timestamp + MINTIME, "Min lock duration should be 1 week");
    }

    function test_Boundary_MaxLockDuration() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MAXTIME);

        (,uint128 lockEnd) = vePaimon.locked(tokenId);
        assertEq(lockEnd, block.timestamp + MAXTIME, "Max lock duration should be 4 years");
    }

    function test_Boundary_LockDurationTooShort() public {
        vm.prank(user1);
        vm.expectRevert("Lock duration too short");
        vePaimon.createLock(1000 * 1e18, MINTIME - 1);
    }

    function test_Boundary_LockDurationTooLong() public {
        vm.prank(user1);
        vm.expectRevert("Lock duration too long");
        vePaimon.createLock(1000 * 1e18, MAXTIME + 1);
    }

    function test_Boundary_ZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be > 0");
        vePaimon.createLock(0, 365 days);
    }

    function test_Boundary_MaxUint128Amount() public {
        // Test with large amount (within PAIMON max supply)
        // PAIMON max supply is 10B = 1e28, so use 5B which is within uint128 range
        uint256 largeAmount = 5_000_000_000 * 1e18; // 5 billion PAIMON
        paimon.mint(user1, largeAmount);

        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(largeAmount, 365 days);

        (uint128 lockedAmount,) = vePaimon.locked(tokenId);
        assertEq(lockedAmount, largeAmount, "Should handle large uint128 amounts");
    }

    function test_Boundary_VotingPowerAtExpiry() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MINTIME);

        // Warp to exact expiry
        vm.warp(block.timestamp + MINTIME);

        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertEq(votingPower, 0, "Voting power should be 0 at expiry");
    }

    function test_Boundary_IsExpired() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MINTIME);

        // Before expiry
        bool expired = vePaimon.isExpired(tokenId);
        assertFalse(expired, "Should not be expired before unlock time");

        // At expiry
        vm.warp(block.timestamp + MINTIME);
        expired = vePaimon.isExpired(tokenId);
        assertTrue(expired, "Should be expired at unlock time");
    }

    // ==================== 3. Exception Tests (6) ====================

    function test_Exception_CreateLockInsufficientBalance() public {
        vm.prank(user1);
        vm.expectRevert();
        vePaimon.createLock(20000 * 1e18, 365 days); // User1 only has 10000
    }

    function test_Exception_IncreaseAmountNotOwner() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        vm.prank(user2);
        vm.expectRevert("Not NFT owner");
        vePaimon.increaseAmount(tokenId, 100 * 1e18);
    }

    function test_Exception_IncreaseAmountExpiredLock() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MINTIME);

        // Warp past expiry
        vm.warp(block.timestamp + MINTIME + 1);

        vm.prank(user1);
        vm.expectRevert("Lock expired");
        vePaimon.increaseAmount(tokenId, 100 * 1e18);
    }

    function test_Exception_WithdrawNotExpired() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        vm.prank(user1);
        vm.expectRevert("Lock not expired");
        vePaimon.withdraw(tokenId);
    }

    function test_Exception_WithdrawNotOwner() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MINTIME);

        vm.warp(block.timestamp + MINTIME + 1);

        vm.prank(user2);
        vm.expectRevert("Not NFT owner");
        vePaimon.withdraw(tokenId);
    }

    function test_Exception_IncreaseUnlockTimeShorterDuration() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 2 * 365 days);

        vm.warp(block.timestamp + 100 days);

        vm.prank(user1);
        vm.expectRevert("New unlock time must be greater");
        vePaimon.increaseUnlockTime(tokenId, 365 days); // Shorter than current remaining time
    }

    // ==================== 4. Performance Tests (4) ====================

    function test_Performance_CreateLockGas() public {
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        vePaimon.createLock(1000 * 1e18, 365 days);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("CreateLock gas used", gasUsed);
        assertLt(gasUsed, 250000, "CreateLock should use <250K gas");
    }

    function test_Performance_IncreaseAmountGas() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        vm.prank(user1);
        uint256 gasBefore = gasleft();
        vePaimon.increaseAmount(tokenId, 100 * 1e18);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("IncreaseAmount gas used", gasUsed);
        assertLt(gasUsed, 150000, "IncreaseAmount should use <150K gas");
    }

    function test_Performance_WithdrawGas() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MINTIME);

        vm.warp(block.timestamp + MINTIME + 1);

        vm.prank(user1);
        uint256 gasBefore = gasleft();
        vePaimon.withdraw(tokenId);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("Withdraw gas used", gasUsed);
        assertLt(gasUsed, 100000, "Withdraw should use <100K gas");
    }

    function test_Performance_BalanceOfNFTGas() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        uint256 gasBefore = gasleft();
        vePaimon.balanceOfNFT(tokenId);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("BalanceOfNFT gas used", gasUsed);
        assertLt(gasUsed, 10000, "BalanceOfNFT should use <10K gas");
    }

    // ==================== 5. Security Tests (5) ====================

    function test_Security_PrecisionLoss() public {
        // Test small amount with long lock (precision should not cause issues)
        uint256 smallAmount = 1; // 1 wei
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(smallAmount, MAXTIME);

        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        // Even 1 wei should have some voting power for max lock
        assertGt(votingPower, 0, "Small amounts should not lose all precision");
    }

    function test_Security_OverflowProtection() public {
        // Mint near-max uint128 amount (within PAIMON cap)
        // Use 9B PAIMON to stay within 10B cap
        uint256 nearMaxAmount = 9_000_000_000 * 1e18;
        paimon.mint(user1, nearMaxAmount + 2000 * 1e18);

        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(nearMaxAmount, 365 days);

        // Try to overflow uint128 with increaseAmount
        // nearMaxAmount + 2000e18 would still be valid, so we need a different approach
        // Test that we can't create a lock that would overflow uint128
        vm.prank(user1);
        vm.expectRevert("Amount overflow");
        vePaimon.increaseAmount(tokenId, type(uint128).max); // This would overflow
    }

    function test_Security_CannotWithdrawTwice() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MINTIME);

        vm.warp(block.timestamp + MINTIME + 1);

        vm.prank(user1);
        vePaimon.withdraw(tokenId);

        // Try to withdraw again
        vm.prank(user1);
        vm.expectRevert(); // NFT burned, ownerOf reverts
        vePaimon.withdraw(tokenId);
    }

    function test_Security_VotingPowerIsolation() public {
        // Create two locks with same amount
        vm.prank(user1);
        uint256 tokenId1 = vePaimon.createLock(1000 * 1e18, 365 days);

        vm.prank(user2);
        uint256 tokenId2 = vePaimon.createLock(1000 * 1e18, 365 days);

        // Voting powers should be independent
        uint256 power1 = vePaimon.balanceOfNFT(tokenId1);
        uint256 power2 = vePaimon.balanceOfNFT(tokenId2);

        assertEq(power1, power2, "Same lock parameters should have same power");

        // Increase user1's amount
        vm.prank(user1);
        vePaimon.increaseAmount(tokenId1, 500 * 1e18);

        power1 = vePaimon.balanceOfNFT(tokenId1);
        power2 = vePaimon.balanceOfNFT(tokenId2);

        assertGt(power1, power2, "User1's power should increase, user2's should not change");
    }

    function test_Security_NoReentrancy() public {
        // Deploy malicious contract
        MaliciousReentrancy attacker = new MaliciousReentrancy(address(vePaimon), address(paimon));

        // Mint PAIMON to attacker
        paimon.mint(address(attacker), 10000 * 1e18);

        // Try reentrancy attack
        vm.expectRevert(); // Should revert due to ReentrancyGuard
        attacker.attack();
    }

    // ==================== 6. Compatibility Tests (4) ====================

    function test_Compatibility_ERC721Standard() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        // Test ERC721 standard functions
        assertEq(vePaimon.name(), "Vote-Escrowed PAIMON", "Name should be correct");
        assertEq(vePaimon.symbol(), "vePAIMON", "Symbol should be correct");
        assertEq(vePaimon.ownerOf(tokenId), user1, "OwnerOf should work");
        assertEq(vePaimon.balanceOf(user1), 1, "BalanceOf should return 1");
    }

    function test_Compatibility_SafeTransferFrom() public {
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, 365 days);

        // Deploy receiver contract
        NFTReceiver receiver = new NFTReceiver();

        // Safe transfer
        vm.prank(user1);
        vePaimon.safeTransferFrom(user1, address(receiver), tokenId);

        assertEq(vePaimon.ownerOf(tokenId), address(receiver), "NFT should be transferred");
        assertTrue(receiver.received(), "Receiver should have received callback");
    }

    function test_Compatibility_GaugeControllerIntegration() public {
        // Create lock
        vm.prank(user1);
        uint256 tokenId = vePaimon.createLock(1000 * 1e18, MAXTIME);

        // Verify VotingEscrow interface methods
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertGt(votingPower, 0, "balanceOfNFT should return voting power");

        (uint128 amount, uint128 end) = vePaimon.locked(tokenId);
        assertEq(amount, 1000 * 1e18, "locked() should return amount");
        assertGt(end, block.timestamp, "locked() should return future end time");

        // Verify owner check
        assertEq(vePaimon.ownerOf(tokenId), user1, "ownerOf should work for GaugeController");
    }

    function test_Compatibility_MultiUserScenario() public {
        // User1: 4-year lock
        vm.prank(user1);
        uint256 tokenId1 = vePaimon.createLock(1000 * 1e18, MAXTIME);

        // User2: 1-year lock
        vm.prank(user2);
        uint256 tokenId2 = vePaimon.createLock(1000 * 1e18, 365 days);

        // User3: 1-week lock
        vm.prank(user3);
        uint256 tokenId3 = vePaimon.createLock(1000 * 1e18, MINTIME);

        // Verify voting power hierarchy
        uint256 power1 = vePaimon.balanceOfNFT(tokenId1);
        uint256 power2 = vePaimon.balanceOfNFT(tokenId2);
        uint256 power3 = vePaimon.balanceOfNFT(tokenId3);

        assertGt(power1, power2, "4-year lock should have more power than 1-year");
        assertGt(power2, power3, "1-year lock should have more power than 1-week");

        // Warp forward 100 days
        vm.warp(block.timestamp + 100 days);

        // User3's lock expired, can withdraw
        vm.prank(user3);
        vePaimon.withdraw(tokenId3);

        // User1 and User2 still have voting power
        assertGt(vePaimon.balanceOfNFT(tokenId1), 0, "User1 should still have power");
        assertGt(vePaimon.balanceOfNFT(tokenId2), 0, "User2 should still have power");
    }
}

// ==================== Helper Contracts ====================

/**
 * @notice Malicious contract attempting reentrancy attack
 */
contract MaliciousReentrancy is IERC721Receiver {
    VotingEscrowPaimon public vePaimon;
    PAIMON public paimon;
    bool public attacking;

    constructor(address _vePaimon, address _paimon) {
        vePaimon = VotingEscrowPaimon(_vePaimon);
        paimon = PAIMON(_paimon);
    }

    function attack() external {
        // Approve vePaimon
        paimon.approve(address(vePaimon), type(uint256).max);

        // Create lock
        attacking = true;
        vePaimon.createLock(1000 * 1e18, 365 days);
    }

    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // Try to reenter during NFT minting
        if (attacking) {
            attacking = false;
            // Try to create another lock (should fail due to reentrancy guard)
            vePaimon.createLock(500 * 1e18, 365 days);
        }
        return this.onERC721Received.selector;
    }
}

/**
 * @notice NFT receiver for testing safeTransferFrom
 */
contract NFTReceiver is IERC721Receiver {
    bool public received;

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        received = true;
        return this.onERC721Received.selector;
    }
}
