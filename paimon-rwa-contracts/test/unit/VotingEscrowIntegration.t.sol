// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/VotingEscrow.sol";
import "../../src/treasury/Treasury.sol";
import "../../src/presale/RWABondNFT.sol";
import "../../src/core/HYD.sol";
import "../../src/core/PSMParameterized.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title VotingEscrow Integration Test Suite (PRESALE-008)
 * @notice TDD RED phase tests for createLockFromBondNFT() and Treasury integration
 * @dev Tests for:
 *      - VotingEscrow.createLockFromBondNFT() (only callable by authorized contracts)
 *      - Treasury.receiveBondSales() (track USDC from NFT minting)
 *      - Treasury.fulfillRedemption() (pay cash redemptions at maturity)
 *      - Access control: only whitelisted contracts can call
 *      - Integration: Bond NFT → veNFT conversion end-to-end
 */
contract VotingEscrowIntegrationTest is Test {
    // ==================== Contracts ====================

    VotingEscrow public votingEscrow;
    Treasury public treasury;
    RWABondNFT public bondNFT;
    HYD public hyd;
    PSMParameterized public psm;
    MockERC20 public usdc;

    // ==================== Test Accounts ====================

    address public owner = address(0x1);
    address public settlementRouter = address(0x2); // Mock SettlementRouter
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    address public unauthorizedContract = address(0x5);

    // ==================== Constants ====================

    uint256 public constant INITIAL_HYD_SUPPLY = 10_000_000 * 1e18;
    uint256 public constant INITIAL_USDC_SUPPLY = 10_000_000 * 1e6;
    uint256 public constant BOND_SALE_AMOUNT = 500_000 * 1e6; // 500K USDC from 5,000 NFTs @ 100 USDC

    // ==================== Setup ====================

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdc.mint(owner, INITIAL_USDC_SUPPLY);

        // Deploy HYD with temporary PSM address
        //hyd = new HYD(address(this));
        hyd=new HYD();
        hyd.initTempPsm(address(owner));

        // Deploy PSM
        psm = new PSMParameterized(address(hyd), address(usdc));

        // Redeploy HYD with correct PSM address
        //hyd = new HYD(address(psm));
           hyd=new HYD();
        hyd.initTempPsm(address(psm));

        // Redeploy PSM with final HYD address
        psm = new PSMParameterized(address(hyd), address(usdc));

        // Final HYD deployment
        //hyd = new HYD(address(psm));
           hyd=new HYD();
        hyd.initTempPsm(address(psm));

        // Deploy VotingEscrow
        votingEscrow = new VotingEscrow(address(hyd));

        // Deploy Treasury with USDC token address
        treasury = new Treasury(owner, address(usdc));

        // Fund treasury with USDC for redemptions (540K total)
        vm.prank(owner);
        usdc.transfer(address(treasury), 540_000 * 1e6);
    }

    // ==================== VotingEscrow.createLockFromBondNFT Tests ====================

    /**
     * @notice [Functional] Should create veNFT lock from Bond NFT settlement
     */
    function test_Functional_CreateLockFromBondNFT_Success() public {
        // First authorize settlementRouter
        votingEscrow.authorizeContract(settlementRouter);

        // Mint HYD to VotingEscrow for lock creation
        vm.prank(address(psm));
        hyd.mint(address(votingEscrow), 100 * 1e18);

        // SettlementRouter creates lock for user1
        vm.prank(settlementRouter);
        uint256 tokenId = votingEscrow.createLockFromBondNFT(user1, 100 * 1e18, 365 days);

        // Verify veNFT was minted to user1
        assertEq(votingEscrow.ownerOf(tokenId), user1, "User should own veNFT");

        // Verify lock amount
        VotingEscrow.LockedBalance memory lock = votingEscrow.getLockedBalance(tokenId);
        assertEq(lock.amount, 100 * 1e18, "Lock amount should be 100 HYD");

        // Verify lock duration is ~365 days (within 1 day tolerance)
        uint256 lockDuration = lock.end - block.timestamp;
        assertApproxEqAbs(lockDuration, 365 days, 1 days, "Lock duration should be ~365 days");
    }

    /**
     * @notice [Exception] Should revert when unauthorized contract calls createLockFromBondNFT
     */
    function test_Exception_CreateLockFromBondNFT_RevertWhen_UnauthorizedCaller() public {
        // This test will FAIL initially (RED phase)

        vm.prank(unauthorizedContract);
        vm.expectRevert(); // Expect "VotingEscrow: caller is not authorized"
        votingEscrow.createLockFromBondNFT(user1, 100 * 1e18, 365 days);
    }

    /**
     * @notice [Boundary] Should reject lock duration < 3 months (90 days)
     */
    function test_Boundary_CreateLockFromBondNFT_RevertWhen_DurationTooShort() public {
        vm.prank(owner);
        votingEscrow.authorizeContract(settlementRouter);

        vm.prank(settlementRouter);
        vm.expectRevert(); // Expect "VotingEscrow: lock duration too short"
        votingEscrow.createLockFromBondNFT(user1, 100 * 1e18, 89 days);
    }

    /**
     * @notice [Boundary] Should reject lock duration > 48 months (1460 days)
     */
    function test_Boundary_CreateLockFromBondNFT_RevertWhen_DurationTooLong() public {
        vm.prank(owner);
        votingEscrow.authorizeContract(settlementRouter);

        vm.prank(settlementRouter);
        vm.expectRevert(); // Expect "VotingEscrow: lock duration too long"
        votingEscrow.createLockFromBondNFT(user1, 100 * 1e18, 1461 days);
    }

    /**
     * @notice [Boundary] Should accept lock duration exactly 3 months (90 days)
     */
    function test_Boundary_CreateLockFromBondNFT_MinDuration() public {
        vm.prank(owner);
        votingEscrow.authorizeContract(settlementRouter);

        vm.prank(address(psm));
        hyd.mint(address(votingEscrow), 100 * 1e18);

        vm.prank(settlementRouter);
        uint256 tokenId = votingEscrow.createLockFromBondNFT(user1, 100 * 1e18, 90 days);

        assertEq(votingEscrow.ownerOf(tokenId), user1, "Should create lock at min duration");
    }

    /**
     * @notice [Boundary] Should accept lock duration exactly 48 months (1460 days)
     */
    function test_Boundary_CreateLockFromBondNFT_MaxDuration() public {
        vm.prank(owner);
        votingEscrow.authorizeContract(settlementRouter);

        vm.prank(address(psm));
        hyd.mint(address(votingEscrow), 100 * 1e18);

        vm.prank(settlementRouter);
        uint256 tokenId = votingEscrow.createLockFromBondNFT(user1, 100 * 1e18, 1460 days);

        assertEq(votingEscrow.ownerOf(tokenId), user1, "Should create lock at max duration");
    }

    /**
     * @notice [Security] Should prevent reentrancy attacks
     */
    function test_Security_CreateLockFromBondNFT_ReentrancyProtection() public {
        // Test will verify ReentrancyGuard is applied
        // Implementation will be verified during GREEN phase
    }

    // ==================== Treasury.receiveBondSales Tests ====================

    /**
     * @notice [Functional] Should track USDC from Bond NFT sales
     */
    function test_Functional_ReceiveBondSales_Success() public {
        // This test will FAIL initially (RED phase)
        // Expected: Treasury tracks totalBondSales when RWABondNFT calls receiveBondSales()

        // Authorize bondNFT contract (mock address for now)
        address mockBondNFT = address(0x99);
        vm.prank(owner);
        treasury.authorizeBondNFTContract(mockBondNFT);

        // BondNFT mints 5,000 NFTs @ 100 USDC = 500K USDC
        vm.prank(mockBondNFT);
        treasury.receiveBondSales(BOND_SALE_AMOUNT);

        // Verify totalBondSales tracked
        uint256 totalSales = treasury.totalBondSales();
        assertEq(totalSales, BOND_SALE_AMOUNT, "Should track 500K USDC from bond sales");
    }

    /**
     * @notice [Exception] Should revert when unauthorized contract calls receiveBondSales
     */
    function test_Exception_ReceiveBondSales_RevertWhen_UnauthorizedCaller() public {
        vm.prank(unauthorizedContract);
        vm.expectRevert(); // Expect "Treasury: caller is not authorized bond NFT contract"
        treasury.receiveBondSales(100_000 * 1e6);
    }

    /**
     * @notice [Boundary] Should handle zero amount gracefully
     */
    function test_Boundary_ReceiveBondSales_ZeroAmount() public {
        address mockBondNFT = address(0x99);
        vm.prank(owner);
        treasury.authorizeBondNFTContract(mockBondNFT);

        vm.prank(mockBondNFT);
        vm.expectRevert(); // Expect "Treasury: amount must be > 0"
        treasury.receiveBondSales(0);
    }

    /**
     * @notice [Functional] Should accumulate multiple bond sales
     */
    function test_Functional_ReceiveBondSales_Accumulation() public {
        address mockBondNFT = address(0x99);
        vm.prank(owner);
        treasury.authorizeBondNFTContract(mockBondNFT);

        // First batch: 1000 NFTs @ 100 USDC = 100K
        vm.prank(mockBondNFT);
        treasury.receiveBondSales(100_000 * 1e6);

        // Second batch: 2000 NFTs @ 100 USDC = 200K
        vm.prank(mockBondNFT);
        treasury.receiveBondSales(200_000 * 1e6);

        // Verify total accumulated
        uint256 totalSales = treasury.totalBondSales();
        assertEq(totalSales, 300_000 * 1e6, "Should accumulate bond sales");
    }

    // ==================== Treasury.fulfillRedemption Tests ====================

    /**
     * @notice [Functional] Should pay USDC redemption at bond maturity
     */
    function test_Functional_FulfillRedemption_Success() public {
        // This test will FAIL initially (RED phase)
        // Expected: SettlementRouter calls fulfillRedemption(user1, 105 * 1e6) to pay 105 USDC

        // Authorize settlementRouter
        vm.prank(owner);
        treasury.authorizeSettlementRouter(settlementRouter);

        uint256 redemptionAmount = 105 * 1e6; // 100 USDC + 5 USDC yield
        uint256 user1BalanceBefore = usdc.balanceOf(user1);

        // SettlementRouter fulfills redemption
        vm.prank(settlementRouter);
        treasury.fulfillRedemption(user1, redemptionAmount);

        // Verify user1 received USDC
        assertEq(usdc.balanceOf(user1), user1BalanceBefore + redemptionAmount, "User should receive redemption");

        // Verify RedemptionFulfilled event emitted
        // vm.expectEmit(true, true, true, true);
        // emit RedemptionFulfilled(user1, redemptionAmount);
    }

    /**
     * @notice [Exception] Should revert when unauthorized contract calls fulfillRedemption
     */
    function test_Exception_FulfillRedemption_RevertWhen_UnauthorizedCaller() public {
        vm.prank(unauthorizedContract);
        vm.expectRevert(); // Expect "Treasury: caller is not authorized settlement router"
        treasury.fulfillRedemption(user1, 105 * 1e6);
    }

    /**
     * @notice [Exception] Should revert when insufficient USDC balance
     */
    function test_Exception_FulfillRedemption_RevertWhen_InsufficientBalance() public {
        vm.prank(owner);
        treasury.authorizeSettlementRouter(settlementRouter);

        // Try to redeem more than treasury balance
        vm.prank(settlementRouter);
        vm.expectRevert(); // Expect "Treasury: insufficient USDC balance"
        treasury.fulfillRedemption(user1, 1_000_000 * 1e6); // 1M USDC (more than 540K available)
    }

    /**
     * @notice [Boundary] Should handle redemption with zero amount
     */
    function test_Boundary_FulfillRedemption_ZeroAmount() public {
        vm.prank(owner);
        treasury.authorizeSettlementRouter(settlementRouter);

        vm.prank(settlementRouter);
        vm.expectRevert(); // Expect "Treasury: amount must be > 0"
        treasury.fulfillRedemption(user1, 0);
    }

    /**
     * @notice [Security] Should prevent reentrancy attacks
     */
    function test_Security_FulfillRedemption_ReentrancyProtection() public {
        // Test will verify ReentrancyGuard is applied
        // Implementation will be verified during GREEN phase
    }

    // ==================== Integration Tests ====================

    /**
     * @notice [Integration] End-to-end: Bond NFT → veNFT conversion
     */
    function test_Integration_BondNFTToVeNFTConversion() public {
        // This test will FAIL initially (RED phase)
        // Expected flow:
        // 1. User mints Bond NFT (100 USDC)
        // 2. Treasury.receiveBondSales(100 * 1e6) tracks sale
        // 3. After 90 days, user settles bond
        // 4. SettlementRouter calls VotingEscrow.createLockFromBondNFT(user, 100 HYD, 365 days)
        // 5. User receives veNFT with 100 HYD locked for 1 year

        // Step 1: Mock bond NFT sale
        address mockBondNFT = address(0x99);
        vm.prank(owner);
        treasury.authorizeBondNFTContract(mockBondNFT);

        vm.prank(mockBondNFT);
        treasury.receiveBondSales(100 * 1e6);

        // Step 2: Fast forward 90 days
        vm.warp(block.timestamp + 90 days);

        // Step 3: Authorize settlementRouter
        vm.prank(owner);
        votingEscrow.authorizeContract(settlementRouter);

        // Step 4: Mint HYD to VotingEscrow
        vm.prank(address(psm));
        hyd.mint(address(votingEscrow), 100 * 1e18);

        // Step 5: SettlementRouter creates veNFT lock
        vm.prank(settlementRouter);
        uint256 veNFTTokenId = votingEscrow.createLockFromBondNFT(user1, 100 * 1e18, 365 days);

        // Verify veNFT ownership and lock
        assertEq(votingEscrow.ownerOf(veNFTTokenId), user1, "User should own veNFT");
        VotingEscrow.LockedBalance memory lock = votingEscrow.getLockedBalance(veNFTTokenId);
        assertEq(lock.amount, 100 * 1e18, "veNFT should have 100 HYD locked");
    }

    /**
     * @notice [Integration] End-to-end: Bond maturity → cash redemption
     */
    function test_Integration_BondMaturityRedemption() public {
        // Expected flow:
        // 1. User mints Bond NFT (100 USDC)
        // 2. Treasury.receiveBondSales(100 * 1e6)
        // 3. After 90 days, user chooses cash redemption
        // 4. SettlementRouter calls Treasury.fulfillRedemption(user, 105 USDC)
        // 5. User receives 105 USDC (100 principal + 5 yield)

        // Step 1-2: Mock bond sale
        address mockBondNFT = address(0x99);
        vm.prank(owner);
        treasury.authorizeBondNFTContract(mockBondNFT);

        vm.prank(mockBondNFT);
        treasury.receiveBondSales(100 * 1e6);

        // Step 3: Fast forward 90 days
        vm.warp(block.timestamp + 90 days);

        // Step 4: Authorize settlementRouter
        vm.prank(owner);
        treasury.authorizeSettlementRouter(settlementRouter);

        // Step 5: Fulfill redemption
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        vm.prank(settlementRouter);
        treasury.fulfillRedemption(user1, 105 * 1e6);

        // Verify user received USDC
        assertEq(usdc.balanceOf(user1), user1BalanceBefore + 105 * 1e6, "User should receive 105 USDC");
    }

    /**
     * @notice [Compatibility] Should not break existing VotingEscrow functionality
     */
    function test_Compatibility_ExistingCreateLockStillWorks() public {
        // Verify existing createLock() function still works after adding createLockFromBondNFT()

        uint256 lockAmount = 1000 * 1e18;
        uint256 lockDuration = 365 days;

        // Mint HYD to user1
        vm.prank(address(psm));
        hyd.mint(user1, lockAmount);

        // User1 creates lock using existing function
        vm.startPrank(user1);
        hyd.approve(address(votingEscrow), lockAmount);
        uint256 tokenId = votingEscrow.createLock(lockAmount, lockDuration);
        vm.stopPrank();

        // Verify lock created successfully
        assertEq(votingEscrow.ownerOf(tokenId), user1, "User should own veNFT");
        VotingEscrow.LockedBalance memory lock = votingEscrow.getLockedBalance(tokenId);
        assertEq(lock.amount, lockAmount, "Lock amount should match");
    }

    /**
     * @notice [Compatibility] Should not break existing Treasury withdrawal functionality
     */
    function test_Compatibility_ExistingTreasuryWithdrawStillWorks() public {
        // Verify existing withdraw() function still works after adding new functions

        uint256 withdrawAmount = 10_000 * 1e6;
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);

        vm.prank(owner);
        treasury.withdraw(address(usdc), owner, withdrawAmount);

        assertEq(usdc.balanceOf(owner), ownerBalanceBefore + withdrawAmount, "Owner should receive USDC");
    }
}
