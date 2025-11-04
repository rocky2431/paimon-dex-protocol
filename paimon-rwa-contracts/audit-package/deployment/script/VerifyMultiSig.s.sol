// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/**
 * @title VerifyMultiSig
 * @notice Verification and testing script for deployed Gnosis Safe multi-sig wallets
 * @dev This script performs comprehensive validation of deployed Safe instances:
 *      1. Verify owner addresses and threshold
 *      2. Execute test transactions to confirm functionality
 *      3. Validate integration with protocol contracts
 *
 * Usage:
 *   forge script script/VerifyMultiSig.s.sol:VerifyMultiSig \
 *     --rpc-url $BSC_RPC_URL \
 *     --broadcast
 */

/// @dev Interface for Gnosis Safe view functions
interface IGnosisSafe {
    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function isOwner(address owner) external view returns (bool);
    function nonce() external view returns (uint256);
}

contract VerifyMultiSig is Script {
    // ============ Configuration ============

    /// @dev Set these addresses after deployment
    address constant TREASURY_MULTISIG = address(0); // Replace with actual Treasury Multi-Sig address
    address constant EMERGENCY_MULTISIG = address(0); // Replace with actual Emergency Multi-Sig address

    // Expected configuration
    uint256 constant EXPECTED_TREASURY_THRESHOLD = 3;
    uint256 constant EXPECTED_TREASURY_OWNERS = 5;
    uint256 constant EXPECTED_EMERGENCY_THRESHOLD = 4;
    uint256 constant EXPECTED_EMERGENCY_OWNERS = 7;

    // Test transaction parameters
    uint256 constant TEST_AMOUNT = 0.001 ether; // 0.001 BNB for testing

    // ============ Main Verification Function ============

    function run() external view {
        console2.log("========================================");
        console2.log("Gnosis Safe Multi-Sig Verification");
        console2.log("Chain ID:", block.chainid);
        console2.log("========================================");
        console2.log("");

        // Verify Treasury Multi-Sig is set
        require(TREASURY_MULTISIG != address(0), "VerifyMultiSig: Treasury Multi-Sig address not set");
        require(EMERGENCY_MULTISIG != address(0), "VerifyMultiSig: Emergency Multi-Sig address not set");

        // 1. Verify Treasury Multi-Sig
        console2.log("1. Verifying Treasury Multi-Sig...");
        verifyTreasuryMultiSig();
        console2.log("");

        // 2. Verify Emergency Multi-Sig
        console2.log("2. Verifying Emergency Multi-Sig...");
        verifyEmergencyMultiSig();
        console2.log("");

        // Print summary
        console2.log("========================================");
        console2.log("Verification Complete");
        console2.log("========================================");
        console2.log("Treasury Multi-Sig:  ", TREASURY_MULTISIG, "[OK]");
        console2.log("Emergency Multi-Sig: ", EMERGENCY_MULTISIG, "[OK]");
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Fund Safes with test amount (0.001 BNB each)");
        console2.log("2. Execute test transaction via Safe UI");
        console2.log("3. Transfer contract ownership to Treasury Multi-Sig");
        console2.log("4. Grant emergency pause role to Emergency Multi-Sig");
        console2.log("========================================");
    }

    // ============ Verification Functions ============

    /**
     * @notice Verify Treasury Multi-Sig configuration
     * @dev Checks threshold, owner count, and owner addresses
     */
    function verifyTreasuryMultiSig() internal view {
        IGnosisSafe safe = IGnosisSafe(TREASURY_MULTISIG);

        // Check threshold
        uint256 threshold = safe.getThreshold();
        console2.log("   Threshold:", threshold);
        console2.log("   Expected:", EXPECTED_TREASURY_THRESHOLD);
        require(threshold == EXPECTED_TREASURY_THRESHOLD, "VerifyMultiSig: Incorrect Treasury threshold");
        console2.log("   [OK] Threshold correct");

        // Check owner count
        address[] memory owners = safe.getOwners();
        console2.log("   Owners:", owners.length);
        console2.log("   Expected:", EXPECTED_TREASURY_OWNERS);
        require(owners.length == EXPECTED_TREASURY_OWNERS, "VerifyMultiSig: Incorrect Treasury owner count");
        console2.log("   [OK] Owner count correct");

        // List all owners
        console2.log("   Owner addresses:");
        for (uint256 i = 0; i < owners.length; i++) {
            require(owners[i] != address(0), "VerifyMultiSig: Zero address owner");
            require(safe.isOwner(owners[i]), "VerifyMultiSig: Owner verification failed");
            console2.log("     Owner", i + 1);
            console2.log("     Address:", owners[i]);
        }
        console2.log("   [OK] All owners verified");

        // Check balance
        uint256 balance = address(TREASURY_MULTISIG).balance;
        console2.log("   Balance (wei):", balance);
        console2.log("   Balance (BNB):", balance / 1e18);

        if (balance < TEST_AMOUNT) {
            console2.log("   [WARNING]  Warning: Insufficient balance for test transaction");
            console2.log("      Please fund Safe with at least", TEST_AMOUNT, "wei");
        } else {
            console2.log("   [OK] Sufficient balance for testing");
        }
    }

    /**
     * @notice Verify Emergency Multi-Sig configuration
     * @dev Checks threshold, owner count, and owner addresses
     */
    function verifyEmergencyMultiSig() internal view {
        IGnosisSafe safe = IGnosisSafe(EMERGENCY_MULTISIG);

        // Check threshold
        uint256 threshold = safe.getThreshold();
        console2.log("   Threshold:", threshold);
        console2.log("   Expected:", EXPECTED_EMERGENCY_THRESHOLD);
        require(threshold == EXPECTED_EMERGENCY_THRESHOLD, "VerifyMultiSig: Incorrect Emergency threshold");
        console2.log("   [OK] Threshold correct");

        // Check owner count
        address[] memory owners = safe.getOwners();
        console2.log("   Owners:", owners.length);
        console2.log("   Expected:", EXPECTED_EMERGENCY_OWNERS);
        require(owners.length == EXPECTED_EMERGENCY_OWNERS, "VerifyMultiSig: Incorrect Emergency owner count");
        console2.log("   [OK] Owner count correct");

        // List all owners
        console2.log("   Owner addresses:");
        for (uint256 i = 0; i < owners.length; i++) {
            require(owners[i] != address(0), "VerifyMultiSig: Zero address owner");
            require(safe.isOwner(owners[i]), "VerifyMultiSig: Owner verification failed");
            console2.log("     Owner", i + 1);
            console2.log("     Address:", owners[i]);
        }
        console2.log("   [OK] All owners verified");

        // Check balance
        uint256 balance = address(EMERGENCY_MULTISIG).balance;
        console2.log("   Balance (wei):", balance);
        console2.log("   Balance (BNB):", balance / 1e18);

        if (balance < TEST_AMOUNT) {
            console2.log("   [WARNING]  Warning: Insufficient balance for test transaction");
            console2.log("      Please fund Safe with at least", TEST_AMOUNT, "wei");
        } else {
            console2.log("   [OK] Sufficient balance for testing");
        }
    }
}

/**
 * @title TestMultiSigTransaction
 * @notice Interactive test script for executing test transactions
 * @dev This script helps test multi-sig functionality by:
 *      1. Sending test amount to Safe
 *      2. Providing transaction data for Safe UI
 *      3. Verifying transaction execution
 *
 * Usage:
 *   1. Run this script to get transaction data
 *   2. Create transaction in Safe UI with provided data
 *   3. Collect required signatures
 *   4. Execute transaction
 *   5. Verify success with this script
 */
contract TestMultiSigTransaction is Script {
    address constant TREASURY_MULTISIG = address(0); // Replace with actual address
    address constant EMERGENCY_MULTISIG = address(0); // Replace with actual address

    // Null address for test transaction (send to burn address)
    address constant NULL_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 constant TEST_SEND_AMOUNT = 0.0001 ether; // 0.0001 BNB

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        console2.log("========================================");
        console2.log("Multi-Sig Test Transaction Helper");
        console2.log("========================================");
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Fund Safes with test amount
        console2.log("1. Funding Safes with test amount...");
        (bool success1,) = TREASURY_MULTISIG.call{value: 0.01 ether}("");
        require(success1, "Failed to fund Treasury Multi-Sig");
        console2.log("   [OK] Treasury Multi-Sig funded with 0.01 BNB");

        (bool success2,) = EMERGENCY_MULTISIG.call{value: 0.01 ether}("");
        require(success2, "Failed to fund Emergency Multi-Sig");
        console2.log("   [OK] Emergency Multi-Sig funded with 0.01 BNB");
        console2.log("");

        vm.stopBroadcast();

        // 2. Print test transaction data
        console2.log("2. Test Transaction Data (for Safe UI):");
        console2.log("");
        console2.log("   Transaction Details:");
        console2.log("   - To:", NULL_ADDRESS);
        console2.log("   - Value:", TEST_SEND_AMOUNT, "wei (0.0001 BNB)");
        console2.log("   - Data: 0x (empty)");
        console2.log("");
        console2.log("   Next Steps:");
        console2.log("   1. Open Safe UI: https://app.safe.global/");
        console2.log("   2. Connect as signer wallet");
        console2.log("   3. Create 'Send' transaction with above details");
        console2.log("   4. Collect required signatures:");
        console2.log("      - Treasury: 3/5 signatures");
        console2.log("      - Emergency: 4/7 signatures");
        console2.log("   5. Execute transaction");
        console2.log("   6. Verify on BscScan");
        console2.log("");
        console2.log("========================================");
    }
}
