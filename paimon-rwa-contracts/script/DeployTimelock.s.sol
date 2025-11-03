// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "../src/governance/EmissionManager.sol";
import "../src/core/PSMParameterized.sol";
import "../src/core/USDPStabilityPool.sol";
import "../src/treasury/SavingRate.sol";
import "../src/treasury/Treasury.sol";

/**
 * @title DeployTimelock
 * @notice Deployment script for TimelockController governance (Task P1-006)
 * @dev Deploys Timelock and transfers ownership of governance contracts
 *
 * Deployment Steps:
 * 1. Deploy TimelockController with 2-day delay
 * 2. Configure proposers (3-of-5 multisig addresses)
 * 3. Configure executors (anyone can execute after delay)
 * 4. Transfer ownership of governance contracts to Timelock
 * 5. Verify configuration
 *
 * Usage:
 *   forge script script/DeployTimelock.s.sol --rpc-url $BSC_TESTNET_RPC_URL --broadcast
 *
 * Environment Variables Required:
 *   - BSC_TESTNET_RPC_URL: RPC endpoint for BSC testnet
 *   - PROPOSER_1 through PROPOSER_5: Multisig proposer addresses
 *   - EMERGENCY_1 through EMERGENCY_7: Emergency multisig addresses
 *   - EMISSION_MANAGER_ADDRESS: Deployed EmissionManager address
 *   - PSM_ADDRESS: Deployed PSM address
 *   - STABILITY_POOL_ADDRESS: Deployed StabilityPool address
 *   - SAVING_RATE_ADDRESS: Deployed SavingRate address
 *   - TREASURY_ADDRESS: Deployed Treasury address
 */
contract DeployTimelock is Script {
    // ==================== Configuration ====================

    uint256 public constant TIMELOCK_DELAY = 2 days;

    // Multisig addresses (will be loaded from environment variables in production)
    address public proposer1;
    address public proposer2;
    address public proposer3;
    address public proposer4;
    address public proposer5;

    address public emergency1;
    address public emergency2;
    address public emergency3;
    address public emergency4;
    address public emergency5;
    address public emergency6;
    address public emergency7;

    // Deployed contract addresses (will be loaded from environment variables)
    address public emissionManagerAddress;
    address public psmAddress;
    address public stabilityPoolAddress;
    address public savingRateAddress;
    address public treasuryAddress;

    // Deployed Timelock
    TimelockController public timelock;

    // ==================== Setup ====================

    function setUp() public {
        // Load proposer addresses from environment
        proposer1 = vm.envOr("PROPOSER_1", address(0x1001));
        proposer2 = vm.envOr("PROPOSER_2", address(0x1002));
        proposer3 = vm.envOr("PROPOSER_3", address(0x1003));
        proposer4 = vm.envOr("PROPOSER_4", address(0x1004));
        proposer5 = vm.envOr("PROPOSER_5", address(0x1005));

        // Load emergency multisig addresses
        emergency1 = vm.envOr("EMERGENCY_1", address(0x2001));
        emergency2 = vm.envOr("EMERGENCY_2", address(0x2002));
        emergency3 = vm.envOr("EMERGENCY_3", address(0x2003));
        emergency4 = vm.envOr("EMERGENCY_4", address(0x2004));
        emergency5 = vm.envOr("EMERGENCY_5", address(0x2005));
        emergency6 = vm.envOr("EMERGENCY_6", address(0x2006));
        emergency7 = vm.envOr("EMERGENCY_7", address(0x2007));

        // Load governance contract addresses
        emissionManagerAddress = vm.envOr("EMISSION_MANAGER_ADDRESS", address(0));
        psmAddress = vm.envOr("PSM_ADDRESS", address(0));
        stabilityPoolAddress = vm.envOr("STABILITY_POOL_ADDRESS", address(0));
        savingRateAddress = vm.envOr("SAVING_RATE_ADDRESS", address(0));
        treasuryAddress = vm.envOr("TREASURY_ADDRESS", address(0));

        // Validate addresses
        require(proposer1 != address(0), "PROPOSER_1 not set");
        require(proposer2 != address(0), "PROPOSER_2 not set");
        require(proposer3 != address(0), "PROPOSER_3 not set");
        require(emergency1 != address(0), "EMERGENCY_1 not set");
        require(emissionManagerAddress != address(0), "EMISSION_MANAGER_ADDRESS not set");
        require(psmAddress != address(0), "PSM_ADDRESS not set");
        require(stabilityPoolAddress != address(0), "STABILITY_POOL_ADDRESS not set");
        require(savingRateAddress != address(0), "SAVING_RATE_ADDRESS not set");
        require(treasuryAddress != address(0), "TREASURY_ADDRESS not set");
    }

    // ==================== Deployment ====================

    function run() public {
        vm.startBroadcast();

        // Step 1: Setup proposers and executors
        address[] memory proposers = new address[](5);
        proposers[0] = proposer1;
        proposers[1] = proposer2;
        proposers[2] = proposer3;
        proposers[3] = proposer4;
        proposers[4] = proposer5;

        address[] memory executors = new address[](1);
        executors[0] = address(0); // Anyone can execute after delay

        address admin = msg.sender; // Deployer will be temporary admin

        // Step 2: Deploy TimelockController
        console.log("Deploying TimelockController...");
        timelock = new TimelockController(
            TIMELOCK_DELAY,
            proposers,
            executors,
            admin
        );

        console.log("TimelockController deployed at:", address(timelock));
        console.log("Minimum delay:", timelock.getMinDelay(), "seconds (2 days)");

        // Step 3: Verify proposer roles
        bytes32 PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
        bytes32 EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

        console.log("\nProposer roles granted to:");
        for (uint256 i = 0; i < proposers.length; i++) {
            require(timelock.hasRole(PROPOSER_ROLE, proposers[i]), "Proposer role not granted");
            console.log("  -", proposers[i]);
        }

        console.log("\nExecutor role:");
        require(timelock.hasRole(EXECUTOR_ROLE, address(0)), "Executor role not granted");
        console.log("  - address(0) - Anyone can execute after delay");

        // Step 4: Transfer ownership of governance contracts to Timelock
        console.log("\nTransferring ownership of governance contracts to Timelock...");

        // EmissionManager
        EmissionManager emissionManager = EmissionManager(emissionManagerAddress);
        emissionManager.transferOwnership(address(timelock));
        console.log("  - EmissionManager ownership transferred");

        // PSM
        PSMParameterized psm = PSMParameterized(psmAddress);
        psm.transferOwnership(address(timelock));
        console.log("  - PSM ownership transferred");

        // StabilityPool
        USDPStabilityPool stabilityPool = USDPStabilityPool(stabilityPoolAddress);
        stabilityPool.transferOwnership(address(timelock));
        console.log("  - StabilityPool ownership transferred");

        // SavingRate
        SavingRate savingRate = SavingRate(savingRateAddress);
        savingRate.transferOwnership(address(timelock));
        console.log("  - SavingRate ownership transferred");

        // Treasury (uses Ownable2Step - requires acceptOwnership from Timelock)
        Treasury treasury = Treasury(payable(treasuryAddress));
        treasury.transferOwnership(address(timelock));
        console.log("  - Treasury ownership transfer initiated (requires acceptOwnership call via Timelock)");

        // Step 5: Schedule and execute acceptOwnership for Treasury via Timelock
        // acceptOwnership is from Ownable2Step, we need to use low-level call
        bytes memory data = abi.encodeWithSignature("acceptOwnership()");

        bytes32 salt = keccak256("accept_treasury_ownership");

        // Schedule the operation
        timelock.schedule(
            treasuryAddress,
            0,
            data,
            bytes32(0),
            salt,
            TIMELOCK_DELAY
        );

        console.log("\nScheduled Treasury.acceptOwnership() via Timelock");
        console.log("  - Operation will be ready in 2 days");
        console.log("  - Anyone can execute after delay using:");
        console.log("    timelock.execute(", treasuryAddress, ", 0, <data>, 0x0, <salt>)");

        // Step 6: Admin renounces role (IMPORTANT for production)
        bytes32 DEFAULT_ADMIN_ROLE = 0x00;
        console.log("\nRenouncing admin role (recommended for production)...");
        // Uncomment in production after verifying everything is correct:
        // timelock.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        // console.log("  - Admin role renounced");

        console.log("\n[!] IMPORTANT: Admin role NOT renounced in this script");
        console.log("  Call timelock.renounceRole(0x00, deployer_address) after verification");

        // Step 7: Verify ownership transfer
        console.log("\nVerifying ownership transfer...");
        require(emissionManager.owner() == address(timelock), "EmissionManager ownership not transferred");
        require(psm.owner() == address(timelock), "PSM ownership not transferred");
        require(stabilityPool.owner() == address(timelock), "StabilityPool ownership not transferred");
        require(savingRate.owner() == address(timelock), "SavingRate ownership not transferred");
        // Treasury ownership will be verified after acceptOwnership is executed

        console.log("  [OK] All ownership transfers verified (except Treasury - pending acceptOwnership)");

        // Step 8: Print deployment summary
        console.log("\n==================== Deployment Summary ====================");
        console.log("TimelockController:", address(timelock));
        console.log("Delay: 2 days (172800 seconds)");
        console.log("Proposers: 5 multisig addresses");
        console.log("Executors: Anyone (address(0))");
        console.log("\nGoverned Contracts:");
        console.log("  - EmissionManager:", emissionManagerAddress);
        console.log("  - PSM:", psmAddress);
        console.log("  - StabilityPool:", stabilityPoolAddress);
        console.log("  - SavingRate:", savingRateAddress);
        console.log("  - Treasury:", treasuryAddress, "(pending acceptOwnership)");
        console.log("\nEmergency Pause Multisig (4-of-7):");
        console.log("  - Not yet implemented (future enhancement)");
        console.log("============================================================\n");

        vm.stopBroadcast();
    }

    // ==================== Helper Functions ====================

    /**
     * @notice Helper function to encode acceptOwnership call for Treasury
     * @return data Encoded function call
     */
    function encodeAcceptOwnership() public pure returns (bytes memory) {
        return abi.encodeWithSignature("acceptOwnership()");
    }

    /**
     * @notice Helper function to get operation ID for scheduled Treasury.acceptOwnership
     * @return operationId The operation ID for tracking
     */
    function getAcceptOwnershipOperationId() public view returns (bytes32) {
        bytes memory data = encodeAcceptOwnership();
        bytes32 salt = keccak256("accept_treasury_ownership");
        return timelock.hashOperation(treasuryAddress, 0, data, bytes32(0), salt);
    }
}
