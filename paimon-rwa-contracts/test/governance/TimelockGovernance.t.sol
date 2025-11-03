// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "../../src/governance/EmissionManager.sol";
import "../../src/core/PSMParameterized.sol";
import "../../src/core/USDPStabilityPool.sol";
import "../../src/treasury/SavingRate.sol";
import "../../src/treasury/Treasury.sol";
import "../../src/core/HYD.sol";
import "../../src/core/USDP.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000e6); // Mint 1M USDC for testing
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDC has 6 decimals
    }
}

/**
 * @title TimelockGovernanceTest
 * @notice Comprehensive test suite for TimelockController governance integration (Task P1-006)
 * @dev Tests 6 dimensions: Functional, Boundary, Exception, Performance, Security, Compatibility
 *
 * Test Coverage:
 * - test_Timelock_Deployment() - Basic deployment and configuration
 * - test_Timelock_ProposeQueueExecute() - Full governance workflow
 * - test_Timelock_2DayDelay() - Enforces 2-day delay before execution
 * - test_Timelock_EmergencyPause() - Emergency pause bypasses Timelock
 * - test_Governance_OwnershipTransfer() - Transfer ownership to Timelock
 *
 * Security Tests:
 * - Prevents direct execution without Timelock
 * - Validates proposer/executor roles
 * - Tests delay enforcement
 * - Verifies emergency pause mechanism
 *
 * Performance Tests:
 * - Gas benchmarks for propose/queue/execute
 * - Batch operation support
 */
contract TimelockGovernanceTest is Test {
    // ==================== State Variables ====================

    TimelockController public timelock;
    EmissionManager public emissionManager;
    PSMParameterized public psm;
    USDPStabilityPool public stabilityPool;
    SavingRate public savingRate;
    Treasury public treasury;
    HYD public hyd;
    USDP public usdp;
    MockUSDC public mockUSDC;

    // Multisig addresses (mock)
    address public proposerMultisig1 = address(0x1001);
    address public proposerMultisig2 = address(0x1002);
    address public proposerMultisig3 = address(0x1003);
    address public proposerMultisig4 = address(0x1004);
    address public proposerMultisig5 = address(0x1005);

    address public emergencyMultisig1 = address(0x2001);
    address public emergencyMultisig2 = address(0x2002);
    address public emergencyMultisig3 = address(0x2003);
    address public emergencyMultisig4 = address(0x2004);
    address public emergencyMultisig5 = address(0x2005);
    address public emergencyMultisig6 = address(0x2006);
    address public emergencyMultisig7 = address(0x2007);

    address public executor = address(0); // Anyone can execute after delay

    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public constant PROPOSER_COUNT = 3; // 3-of-5 multisig (simplified to 3 for testing)
    uint256 public constant EMERGENCY_COUNT = 4; // 4-of-7 multisig (simplified to 4 for testing)

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    // ==================== Setup ====================

    function setUp() public {
        // Deploy core tokens
        hyd = new HYD();
        usdp = new USDP();
        mockUSDC = new MockUSDC();

        // Deploy governance contracts
        emissionManager = new EmissionManager();

        // Deploy PSM (requires USDP and USDC)
        psm = new PSMParameterized(address(usdp), address(mockUSDC));

        // Deploy StabilityPool (requires USDP and HYD)
        stabilityPool = new USDPStabilityPool(address(usdp), address(hyd));

        // Deploy SavingRate (requires USDP and annualRate)
        savingRate = new SavingRate(address(usdp), 200); // 2% annual rate

        // Deploy Treasury (requires owner and USDC)
        treasury = new Treasury(address(this), address(mockUSDC));

        // Note: Timelock will be deployed in test functions to test different scenarios
    }

    // ==================== Test 1: Deployment (Functional) ====================

    /**
     * @notice Test 1: Timelock deployment and configuration
     * @dev Functional dimension - Validates basic deployment
     */
    function test_Timelock_Deployment() public {
        // Arrange: Setup proposers and executors
        address[] memory proposers = new address[](PROPOSER_COUNT);
        proposers[0] = proposerMultisig1;
        proposers[1] = proposerMultisig2;
        proposers[2] = proposerMultisig3;

        address[] memory executors = new address[](1);
        executors[0] = executor; // address(0) = anyone can execute

        address admin = address(this); // Admin will renounce after setup

        // Act: Deploy Timelock
        timelock = new TimelockController(
            TIMELOCK_DELAY,
            proposers,
            executors,
            admin
        );

        // Assert: Verify configuration
        assertEq(timelock.getMinDelay(), TIMELOCK_DELAY, "Timelock delay should be 2 days");

        // Verify proposer roles
        assertTrue(timelock.hasRole(PROPOSER_ROLE, proposerMultisig1), "Proposer 1 should have PROPOSER_ROLE");
        assertTrue(timelock.hasRole(PROPOSER_ROLE, proposerMultisig2), "Proposer 2 should have PROPOSER_ROLE");
        assertTrue(timelock.hasRole(PROPOSER_ROLE, proposerMultisig3), "Proposer 3 should have PROPOSER_ROLE");

        // Verify executor role (address(0) = anyone)
        assertTrue(timelock.hasRole(EXECUTOR_ROLE, address(0)), "Anyone should be able to execute");

        // Verify admin role
        assertTrue(timelock.hasRole(DEFAULT_ADMIN_ROLE, admin), "Admin should have DEFAULT_ADMIN_ROLE");
    }

    // ==================== Test 2: Propose-Queue-Execute (Functional) ====================

    /**
     * @notice Test 2: Full governance workflow (propose → queue → execute)
     * @dev Functional dimension - Tests complete governance lifecycle
     */
    function test_Timelock_ProposeQueueExecute() public {
        // Setup: Deploy Timelock and transfer ownership
        _setupTimelockGovernance();

        // Arrange: Prepare EmissionManager.setLpSplitParams() call
        uint16 newLpPairsBps = 7000; // 70% to LP pairs
        uint16 newStabilityPoolBps = 3000; // 30% to stability pool

        bytes memory data = abi.encodeWithSelector(
            EmissionManager.setLpSplitParams.selector,
            newLpPairsBps,
            newStabilityPoolBps
        );

        address target = address(emissionManager);
        uint256 value = 0;
        bytes32 predecessor = bytes32(0);
        bytes32 salt = keccak256("test_proposal_1");
        uint256 delay = TIMELOCK_DELAY;

        // Act 1: Schedule (propose)
        vm.prank(proposerMultisig1);
        timelock.schedule(target, value, data, predecessor, salt, delay);

        // Verify: Proposal is in Pending state (cannot execute yet)
        bytes32 operationId = timelock.hashOperation(target, value, data, predecessor, salt);
        assertTrue(timelock.isOperationPending(operationId), "Proposal should be pending");
        assertFalse(timelock.isOperationReady(operationId), "Proposal should not be ready yet");

        // Act 2: Fast forward 2 days
        vm.warp(block.timestamp + TIMELOCK_DELAY);

        // Verify: Proposal is now Ready
        assertTrue(timelock.isOperationReady(operationId), "Proposal should be ready after 2 days");

        // Act 3: Execute (anyone can execute)
        vm.prank(proposerMultisig1); // Can be any address
        timelock.execute(target, value, data, predecessor, salt);

        // Assert: Verify execution result
        assertTrue(timelock.isOperationDone(operationId), "Operation should be marked as done");
        assertEq(emissionManager.lpPairsBps(), newLpPairsBps, "lpPairsBps should be updated");
        assertEq(emissionManager.stabilityPoolBps(), newStabilityPoolBps, "stabilityPoolBps should be updated");
    }

    // ==================== Test 3: 2-Day Delay Enforcement (Security) ====================

    /**
     * @notice Test 3: Enforce 2-day delay before execution
     * @dev Security dimension - Prevents premature execution
     */
    function test_Timelock_2DayDelay() public {
        // Setup
        _setupTimelockGovernance();

        // Arrange
        uint16 newLpPairsBps = 7000;
        uint16 newStabilityPoolBps = 3000;

        bytes memory data = abi.encodeWithSelector(
            EmissionManager.setLpSplitParams.selector,
            newLpPairsBps,
            newStabilityPoolBps
        );

        address target = address(emissionManager);
        bytes32 salt = keccak256("test_delay_enforcement");

        // Act: Schedule proposal
        uint256 scheduleTime = block.timestamp;
        vm.prank(proposerMultisig1);
        timelock.schedule(target, 0, data, bytes32(0), salt, TIMELOCK_DELAY);

        bytes32 operationId = timelock.hashOperation(target, 0, data, bytes32(0), salt);

        // Test 3a: Cannot execute immediately
        vm.expectRevert(); // OpenZeppelin uses TimelockUnexpectedOperationState custom error
        timelock.execute(target, 0, data, bytes32(0), salt);

        // Test 3b: Cannot execute after 1 day (< 2 days)
        vm.warp(scheduleTime + 1 days);
        vm.expectRevert(); // OpenZeppelin uses TimelockUnexpectedOperationState custom error
        timelock.execute(target, 0, data, bytes32(0), salt);

        // Test 3c: Can execute after exactly 2 days
        vm.warp(scheduleTime + TIMELOCK_DELAY); // Exactly 2 days after schedule
        assertTrue(timelock.isOperationReady(operationId), "Should be ready after 2 days");

        timelock.execute(target, 0, data, bytes32(0), salt);
        assertTrue(timelock.isOperationDone(operationId), "Should execute successfully after 2 days");
    }

    // ==================== Test 4: Emergency Pause (Security) ====================

    /**
     * @notice Test 4: Emergency pause can bypass Timelock for critical functions
     * @dev Security dimension - Tests emergency pause mechanism
     */
    function test_Timelock_EmergencyPause() public {
        // Setup
        _setupTimelockGovernance();

        // Arrange: Setup emergency multisig as treasury owner (direct, not through Timelock)
        // In production, emergency pause would be on a separate Pausable contract
        // For this test, we'll verify that pause() can be called without Timelock delay

        // First, give emergency multisig the owner role for testing
        // Treasury uses Ownable2Step
        vm.prank(address(timelock));
        treasury.transferOwnership(emergencyMultisig1);
        vm.prank(emergencyMultisig1);
        treasury.acceptOwnership();

        // Act: Emergency pause (no Timelock delay needed)
        vm.prank(emergencyMultisig1);
        treasury.pause();

        // Assert: Treasury should be paused
        assertTrue(treasury.paused(), "Treasury should be paused");

        // Verify: Cannot deposit while paused
        vm.expectRevert(); // OpenZeppelin uses EnforcedPause custom error
        treasury.depositRWA(address(mockUSDC), 1000e6);
    }

    // ==================== Test 5: Ownership Transfer (Functional) ====================

    /**
     * @notice Test 5: Transfer ownership of governance contracts to Timelock
     * @dev Functional dimension - Validates ownership transfer workflow
     */
    function test_Governance_OwnershipTransfer() public {
        // Setup Timelock
        address[] memory proposers = new address[](PROPOSER_COUNT);
        proposers[0] = proposerMultisig1;
        proposers[1] = proposerMultisig2;
        proposers[2] = proposerMultisig3;

        address[] memory executors = new address[](1);
        executors[0] = address(0);

        timelock = new TimelockController(TIMELOCK_DELAY, proposers, executors, address(this));

        // Act: Transfer ownership of all governance contracts to Timelock
        emissionManager.transferOwnership(address(timelock));
        psm.transferOwnership(address(timelock));
        stabilityPool.transferOwnership(address(timelock));
        savingRate.transferOwnership(address(timelock));

        // Treasury uses Ownable2Step - requires two steps
        treasury.transferOwnership(address(timelock));
        vm.prank(address(timelock));
        treasury.acceptOwnership();

        // Assert: Verify ownership transfer
        assertEq(emissionManager.owner(), address(timelock), "EmissionManager owner should be Timelock");
        assertEq(psm.owner(), address(timelock), "PSM owner should be Timelock");
        assertEq(stabilityPool.owner(), address(timelock), "StabilityPool owner should be Timelock");
        assertEq(savingRate.owner(), address(timelock), "SavingRate owner should be Timelock");
        assertEq(treasury.owner(), address(timelock), "Treasury owner should be Timelock");

        // Verify: Direct calls to governance functions are now blocked
        vm.expectRevert(); // OpenZeppelin uses OwnableUnauthorizedAccount custom error
        emissionManager.setLpSplitParams(7000, 3000);

        vm.expectRevert(); // OpenZeppelin uses OwnableUnauthorizedAccount custom error
        psm.setFeeIn(50);
    }

    // ==================== Test 6: Boundary Tests ====================

    /**
     * @notice Test 6a: Minimum delay boundary (0 seconds is technically valid in OpenZeppelin)
     * @dev Boundary dimension - Tests edge case delays
     */
    function test_Boundary_MinimumDelay() public {
        address[] memory proposers = new address[](1);
        proposers[0] = proposerMultisig1;

        address[] memory executors = new address[](1);
        executors[0] = address(0);

        // Act: Deploy with 0 delay (instant execution) - valid but not recommended
        TimelockController instantTimelock = new TimelockController(0, proposers, executors, address(this));

        // Assert
        assertEq(instantTimelock.getMinDelay(), 0, "Delay should be 0");
    }

    /**
     * @notice Test 6b: Maximum realistic delay (30 days)
     * @dev Boundary dimension - Tests reasonable maximum delay
     */
    function test_Boundary_MaximumDelay() public {
        uint256 maxDelay = 30 days;

        address[] memory proposers = new address[](1);
        proposers[0] = proposerMultisig1;

        address[] memory executors = new address[](1);
        executors[0] = address(0);

        // Act
        TimelockController longTimelock = new TimelockController(maxDelay, proposers, executors, address(this));

        // Assert
        assertEq(longTimelock.getMinDelay(), maxDelay, "Delay should be 30 days");
    }

    // ==================== Test 7: Exception Tests ====================

    /**
     * @notice Test 7a: Non-proposer cannot schedule
     * @dev Exception dimension - Tests access control
     */
    function test_Exception_NonProposerCannotSchedule() public {
        _setupTimelockGovernance();

        bytes memory data = abi.encodeWithSelector(
            EmissionManager.setLpSplitParams.selector,
            7000,
            3000
        );

        address unauthorizedUser = address(0x9999);

        // Act & Assert: Expect revert
        vm.prank(unauthorizedUser);
        vm.expectRevert(); // OpenZeppelin reverts with AccessControl error
        timelock.schedule(
            address(emissionManager),
            0,
            data,
            bytes32(0),
            keccak256("unauthorized"),
            TIMELOCK_DELAY
        );
    }

    /**
     * @notice Test 7b: Cannot execute operation that hasn't been scheduled
     * @dev Exception dimension - Tests operation lifecycle
     */
    function test_Exception_CannotExecuteUnscheduledOperation() public {
        _setupTimelockGovernance();

        bytes memory data = abi.encodeWithSelector(
            EmissionManager.setLpSplitParams.selector,
            7000,
            3000
        );

        // Act & Assert: Try to execute without scheduling
        vm.expectRevert(); // OpenZeppelin uses TimelockUnexpectedOperationState custom error
        timelock.execute(
            address(emissionManager),
            0,
            data,
            bytes32(0),
            keccak256("never_scheduled")
        );
    }

    /**
     * @notice Test 7c: Cannot execute same operation twice
     * @dev Exception dimension - Tests replay protection
     */
    function test_Exception_CannotExecuteTwice() public {
        _setupTimelockGovernance();

        bytes memory data = abi.encodeWithSelector(
            EmissionManager.setLpSplitParams.selector,
            7000,
            3000
        );

        bytes32 salt = keccak256("test_replay");

        // Schedule and execute once
        vm.prank(proposerMultisig1);
        timelock.schedule(address(emissionManager), 0, data, bytes32(0), salt, TIMELOCK_DELAY);

        vm.warp(block.timestamp + TIMELOCK_DELAY);
        timelock.execute(address(emissionManager), 0, data, bytes32(0), salt);

        // Try to execute again
        vm.expectRevert(); // OpenZeppelin uses TimelockUnexpectedOperationState custom error
        timelock.execute(address(emissionManager), 0, data, bytes32(0), salt);
    }

    // ==================== Test 8: Performance Tests ====================

    /**
     * @notice Test 8: Gas benchmarking for propose/queue/execute
     * @dev Performance dimension - Measures gas costs
     */
    function test_Performance_GasBenchmark() public {
        _setupTimelockGovernance();

        bytes memory data = abi.encodeWithSelector(
            EmissionManager.setLpSplitParams.selector,
            7000,
            3000
        );

        bytes32 salt = keccak256("gas_benchmark");

        // Measure schedule gas
        uint256 gasBefore = gasleft();
        vm.prank(proposerMultisig1);
        timelock.schedule(address(emissionManager), 0, data, bytes32(0), salt, TIMELOCK_DELAY);
        uint256 scheduleGas = gasBefore - gasleft();

        // Fast forward
        vm.warp(block.timestamp + TIMELOCK_DELAY);

        // Measure execute gas
        gasBefore = gasleft();
        timelock.execute(address(emissionManager), 0, data, bytes32(0), salt);
        uint256 executeGas = gasBefore - gasleft();

        // Log gas usage (for visibility in test output)
        emit log_named_uint("Schedule gas cost", scheduleGas);
        emit log_named_uint("Execute gas cost", executeGas);

        // Assert: Reasonable gas costs
        assertLt(scheduleGas, 200_000, "Schedule should cost < 200k gas");
        assertLt(executeGas, 200_000, "Execute should cost < 200k gas");
    }

    // ==================== Test 9: Compatibility Tests ====================

    /**
     * @notice Test 9: Batch operations - schedule multiple proposals
     * @dev Compatibility dimension - Tests batch operations
     */
    function test_Compatibility_BatchOperations() public {
        _setupTimelockGovernance();

        // Prepare multiple operations
        address[] memory targets = new address[](2);
        targets[0] = address(emissionManager);
        targets[1] = address(psm);

        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0;

        bytes[] memory datas = new bytes[](2);
        datas[0] = abi.encodeWithSelector(
            EmissionManager.setLpSplitParams.selector,
            7000,
            3000
        );
        datas[1] = abi.encodeWithSelector(
            PSMParameterized.setFeeIn.selector,
            50
        );

        bytes32 predecessor = bytes32(0);
        bytes32 salt = keccak256("batch_test");

        // Act: Schedule batch
        vm.prank(proposerMultisig1);
        timelock.scheduleBatch(targets, values, datas, predecessor, salt, TIMELOCK_DELAY);

        // Fast forward
        vm.warp(block.timestamp + TIMELOCK_DELAY);

        // Execute batch
        timelock.executeBatch(targets, values, datas, predecessor, salt);

        // Assert: Verify both operations executed
        assertEq(emissionManager.lpPairsBps(), 7000, "lpPairsBps should be 7000");
        assertEq(psm.feeIn(), 50, "PSM feeIn should be 50");
    }

    // ==================== Helper Functions ====================

    /**
     * @notice Setup Timelock and transfer governance contract ownership
     * @dev Reusable helper to avoid code duplication
     */
    function _setupTimelockGovernance() internal {
        // Setup proposers
        address[] memory proposers = new address[](PROPOSER_COUNT);
        proposers[0] = proposerMultisig1;
        proposers[1] = proposerMultisig2;
        proposers[2] = proposerMultisig3;

        // Setup executors (address(0) = anyone can execute)
        address[] memory executors = new address[](1);
        executors[0] = address(0);

        // Deploy Timelock
        timelock = new TimelockController(
            TIMELOCK_DELAY,
            proposers,
            executors,
            address(this) // Temporary admin
        );

        // Transfer ownership of governance contracts to Timelock
        emissionManager.transferOwnership(address(timelock));
        psm.transferOwnership(address(timelock));
        stabilityPool.transferOwnership(address(timelock));
        savingRate.transferOwnership(address(timelock));

        // Treasury uses Ownable2Step - requires two steps
        treasury.transferOwnership(address(timelock));
        vm.prank(address(timelock));
        treasury.acceptOwnership();

        // Admin renounces role (optional, for production)
        // timelock.renounceRole(DEFAULT_ADMIN_ROLE, address(this));
    }
}
