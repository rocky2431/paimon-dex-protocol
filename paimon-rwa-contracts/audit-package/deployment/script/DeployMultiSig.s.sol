// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/**
 * @title DeployMultiSig
 * @notice Deploy Gnosis Safe multi-signature wallets on BSC for Paimon.dex protocol
 * @dev This script deploys two Safe instances:
 *      1. Treasury Multi-Sig (3-of-5) - For financial operations
 *      2. Emergency Multi-Sig (4-of-7) - For emergency pause functionality
 *
 * Usage:
 *   forge script script/DeployMultiSig.s.sol:DeployMultiSig \
 *     --rpc-url $BSC_RPC_URL \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $BSCSCAN_API_KEY
 */

/// @dev Interface for Gnosis Safe ProxyFactory
interface IGnosisSafeProxyFactory {
    function createProxyWithNonce(
        address _singleton,
        bytes memory initializer,
        uint256 saltNonce
    ) external returns (address proxy);
}

/// @dev Interface for Gnosis Safe setup
interface IGnosisSafe {
    function setup(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external;
}

contract DeployMultiSig is Script {
    // ============ BSC Mainnet Constants (Chain ID: 56) ============

    /// @notice GnosisSafe L2 Singleton (optimized for L2 networks like BSC)
    address constant SAFE_SINGLETON_L2 = 0x3E5c63644E683549055b9Be8653de26E0B4CD36E;

    /// @notice GnosisSafeProxyFactory for creating Safe instances
    address constant PROXY_FACTORY = 0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2;

    /// @notice CompatibilityFallbackHandler for Safe compatibility
    /// @dev This address needs to be verified for BSC mainnet
    address constant FALLBACK_HANDLER = 0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4;

    // ============ Treasury Multi-Sig Signers (3-of-5) ============

    /// @dev IMPORTANT: Replace these placeholder addresses with actual signer addresses
    /// All signers MUST use hardware wallets (Ledger/Trezor)
    address constant TREASURY_SIGNER_1 = 0x0000000000000000000000000000000000000001; // Core Team Member 1
    address constant TREASURY_SIGNER_2 = 0x0000000000000000000000000000000000000002; // Core Team Member 2
    address constant TREASURY_SIGNER_3 = 0x0000000000000000000000000000000000000003; // Core Team Member 3
    address constant TREASURY_SIGNER_4 = 0x0000000000000000000000000000000000000004; // Advisor
    address constant TREASURY_SIGNER_5 = 0x0000000000000000000000000000000000000005; // Community Representative

    // ============ Emergency Multi-Sig Signers (4-of-7) ============

    /// @dev IMPORTANT: Replace these placeholder addresses with actual signer addresses
    address constant EMERGENCY_SIGNER_1 = 0x0000000000000000000000000000000000000011; // Core Team Member 1
    address constant EMERGENCY_SIGNER_2 = 0x0000000000000000000000000000000000000012; // Core Team Member 2
    address constant EMERGENCY_SIGNER_3 = 0x0000000000000000000000000000000000000013; // Core Team Member 3
    address constant EMERGENCY_SIGNER_4 = 0x0000000000000000000000000000000000000014; // Security Engineer 1
    address constant EMERGENCY_SIGNER_5 = 0x0000000000000000000000000000000000000015; // Security Engineer 2
    address constant EMERGENCY_SIGNER_6 = 0x0000000000000000000000000000000000000016; // External Validator 1
    address constant EMERGENCY_SIGNER_7 = 0x0000000000000000000000000000000000000017; // External Validator 2

    // ============ Main Deployment Function ============

    function run() external {
        // Load deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        // Verify we're on BSC mainnet (chain ID 56)
        require(block.chainid == 56, "DeployMultiSig: Must deploy on BSC mainnet (chain ID 56)");

        console2.log("========================================");
        console2.log("Deploying Gnosis Safe Multi-Sig Wallets");
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", vm.addr(deployerPrivateKey));
        console2.log("========================================");
        console2.log("");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Treasury Multi-Sig (3-of-5)
        console2.log("1. Deploying Treasury Multi-Sig (3-of-5)...");
        address treasurySafe = deployTreasuryMultiSig();
        console2.log("   Treasury Multi-Sig deployed at:", treasurySafe);
        console2.log("");

        // 2. Deploy Emergency Multi-Sig (4-of-7)
        console2.log("2. Deploying Emergency Multi-Sig (4-of-7)...");
        address emergencySafe = deployEmergencyMultiSig();
        console2.log("   Emergency Multi-Sig deployed at:", emergencySafe);
        console2.log("");

        vm.stopBroadcast();

        // Print summary
        console2.log("========================================");
        console2.log("Deployment Summary");
        console2.log("========================================");
        console2.log("Treasury Multi-Sig:  ", treasurySafe);
        console2.log("Emergency Multi-Sig: ", emergencySafe);
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Verify Safe UI access: https://app.safe.global/");
        console2.log("2. Add Safe addresses to .env file");
        console2.log("3. Run test transaction script (VerifyMultiSig.s.sol)");
        console2.log("4. Update Treasury.sol and other contracts with Safe addresses");
        console2.log("========================================");
    }

    // ============ Internal Deployment Functions ============

    /**
     * @notice Deploy Treasury Multi-Sig with 3-of-5 threshold
     * @dev Uses canonical Safe deployment for consistency
     * @return treasurySafe Address of deployed Treasury Multi-Sig
     */
    function deployTreasuryMultiSig() internal returns (address treasurySafe) {
        // Assemble owners array
        address[] memory owners = new address[](5);
        owners[0] = TREASURY_SIGNER_1;
        owners[1] = TREASURY_SIGNER_2;
        owners[2] = TREASURY_SIGNER_3;
        owners[3] = TREASURY_SIGNER_4;
        owners[4] = TREASURY_SIGNER_5;

        // Validate signers (no zero addresses, no duplicates)
        _validateOwners(owners);

        uint256 threshold = 3;
        uint256 saltNonce = 1; // Unique nonce for deterministic address

        // Deploy Safe
        treasurySafe = deploySafe(owners, threshold, saltNonce);

        // Log signer details
        console2.log("   Threshold: 3/5");
        console2.log("   Signers:");
        for (uint256 i = 0; i < owners.length; i++) {
            console2.log("     -", owners[i]);
        }

        return treasurySafe;
    }

    /**
     * @notice Deploy Emergency Multi-Sig with 4-of-7 threshold
     * @dev Uses canonical Safe deployment for consistency
     * @return emergencySafe Address of deployed Emergency Multi-Sig
     */
    function deployEmergencyMultiSig() internal returns (address emergencySafe) {
        // Assemble owners array
        address[] memory owners = new address[](7);
        owners[0] = EMERGENCY_SIGNER_1;
        owners[1] = EMERGENCY_SIGNER_2;
        owners[2] = EMERGENCY_SIGNER_3;
        owners[3] = EMERGENCY_SIGNER_4;
        owners[4] = EMERGENCY_SIGNER_5;
        owners[5] = EMERGENCY_SIGNER_6;
        owners[6] = EMERGENCY_SIGNER_7;

        // Validate signers (no zero addresses, no duplicates)
        _validateOwners(owners);

        uint256 threshold = 4;
        uint256 saltNonce = 2; // Unique nonce for deterministic address

        // Deploy Safe
        emergencySafe = deploySafe(owners, threshold, saltNonce);

        // Log signer details
        console2.log("   Threshold: 4/7");
        console2.log("   Signers:");
        for (uint256 i = 0; i < owners.length; i++) {
            console2.log("     -", owners[i]);
        }

        return emergencySafe;
    }

    /**
     * @notice Core Safe deployment function
     * @dev Creates Safe proxy via ProxyFactory with deterministic address
     * @param owners Array of signer addresses
     * @param threshold Number of signatures required
     * @param saltNonce Unique nonce for deterministic address generation
     * @return proxy Address of deployed Safe proxy
     */
    function deploySafe(
        address[] memory owners,
        uint256 threshold,
        uint256 saltNonce
    ) internal returns (address proxy) {
        // Validate inputs
        require(owners.length >= threshold, "DeployMultiSig: Invalid threshold");
        require(threshold > 0, "DeployMultiSig: Threshold must be > 0");

        // Encode Safe setup call
        bytes memory initializer = abi.encodeWithSelector(
            IGnosisSafe.setup.selector,
            owners,
            threshold,
            address(0), // to (no module setup)
            "", // data (no module setup)
            FALLBACK_HANDLER,
            address(0), // paymentToken (no payment)
            0, // payment (no payment)
            payable(address(0)) // paymentReceiver (no payment)
        );

        // Deploy Safe via ProxyFactory
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(PROXY_FACTORY);
        proxy = factory.createProxyWithNonce(
            SAFE_SINGLETON_L2, // Use L2-optimized singleton for BSC
            initializer,
            saltNonce
        );

        require(proxy != address(0), "DeployMultiSig: Safe deployment failed");

        return proxy;
    }

    /**
     * @notice Validate owner addresses
     * @dev Checks for zero addresses and duplicates
     * @param owners Array of owner addresses to validate
     */
    function _validateOwners(address[] memory owners) internal pure {
        require(owners.length > 0, "DeployMultiSig: No owners provided");

        // Check for zero addresses and duplicates
        for (uint256 i = 0; i < owners.length; i++) {
            require(owners[i] != address(0), "DeployMultiSig: Zero address signer");

            // Check for duplicates
            for (uint256 j = i + 1; j < owners.length; j++) {
                require(owners[i] != owners[j], "DeployMultiSig: Duplicate signer");
            }
        }
    }
}
