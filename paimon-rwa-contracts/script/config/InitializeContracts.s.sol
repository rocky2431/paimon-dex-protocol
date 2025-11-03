// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/core/USDP.sol";
import "../../src/core/PAIMON.sol";
import "../../src/core/esPaimon.sol";
import "../../src/core/PSM.sol";
import "../../src/core/VotingEscrow.sol";
import "../../src/core/USDPVault.sol";
import "../../src/core/USDPStabilityPool.sol";
import "../../src/governance/GaugeController.sol";
import "../../src/governance/RewardDistributor.sol";
import "../../src/governance/EmissionManager.sol";

/**
 * @title Initialize Contracts Script
 * @notice Post-deployment initialization and configuration
 * @dev This script should be run after DeployComplete.s.sol
 *
 * Usage:
 *   forge script script/config/InitializeContracts.s.sol \
 *     --rpc-url $BSC_TESTNET_RPC \
 *     --broadcast \
 *     --sig "run(string)" \
 *     deployments/bsc-testnet-97.json
 */
contract InitializeContractsScript is Script {
    // Configuration parameters
    struct ContractAddresses {
        address usdp;
        address paimon;
        address esPaimon;
        address psm;
        address votingEscrow;
        address gaugeController;
        address rewardDistributor;
        address emissionManager;
        address usdpVault;
        address stabilityPool;
        address dexFactory;
        address usdpUsdcPair;
        address treasury;
    }

    ContractAddresses public addresses;

    function run(string memory deploymentFile) public {
        // Load deployment addresses from JSON
        loadDeploymentAddresses(deploymentFile);

        // Print initialization info
        printInitializationHeader();

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Step 1: Configure Emission Schedule
        configureEmissions();

        // Step 2: Setup Initial Gauges
        setupGauges();

        // Step 3: Configure Vault Parameters
        configureVaultParameters();

        // Step 4: Configure StabilityPool
        configureStabilityPool();

        // Step 5: Setup Initial Liquidity (testnet only)
        if (block.chainid == 97) {
            setupInitialLiquidity();
        }

        vm.stopBroadcast();

        // Print completion summary
        printCompletionSummary();
    }

    function loadDeploymentAddresses(string memory file) internal {
        string memory json = vm.readFile(file);

        addresses.usdp = vm.parseJsonAddress(json, ".usdp");
        addresses.paimon = vm.parseJsonAddress(json, ".paimon");
        addresses.esPaimon = vm.parseJsonAddress(json, ".esPaimon");
        addresses.psm = vm.parseJsonAddress(json, ".psm");
        addresses.votingEscrow = vm.parseJsonAddress(json, ".votingEscrow");
        addresses.gaugeController = vm.parseJsonAddress(json, ".gaugeController");
        addresses.rewardDistributor = vm.parseJsonAddress(json, ".rewardDistributor");
        addresses.emissionManager = vm.parseJsonAddress(json, ".emissionManager");
        addresses.usdpVault = vm.parseJsonAddress(json, ".usdpVault");
        addresses.stabilityPool = vm.parseJsonAddress(json, ".stabilityPool");
        addresses.dexFactory = vm.parseJsonAddress(json, ".dexFactory");
        addresses.usdpUsdcPair = vm.parseJsonAddress(json, ".usdpUsdcPair");
        addresses.treasury = vm.parseJsonAddress(json, ".treasury");
    }

    function printInitializationHeader() internal view {
        console.log("==============================================");
        console.log("Contract Initialization Script");
        console.log("==============================================");
        console.log("Chain ID:", block.chainid);
        console.log("Caller:", msg.sender);
        console.log("==============================================\n");
    }

    function configureEmissions() internal {
        console.log("[Step 1] Configuring Emission Schedule...");

        EmissionManager emissionManager = EmissionManager(addresses.emissionManager);

        // Note: Emission schedule is fixed (Phase A/B/C hardcoded in EmissionManager)
        // Only LP split parameters are adjustable

        // Set LP split: 60% to LP Pairs, 40% to Stability Pool (default values)
        uint16 lpPairsBps = 6000;  // 60% of LP total
        uint16 stabilityPoolBps = 4000;  // 40% of LP total
        emissionManager.setLpSplitParams(lpPairsBps, stabilityPoolBps);
        console.log("  Set LP split - Pairs: 60%, Stability: 40%");

        console.log();
    }

    function setupGauges() internal {
        console.log("[Step 2] Setting up Initial Gauges...");

        GaugeController gaugeController = GaugeController(addresses.gaugeController);

        // Add USDP/USDC pair gauge (already added in deployment)
        console.log("  USDP/USDC gauge already added during deployment");

        // Set initial gauge weights (example: 100% to USDP/USDC pair)
        // Note: Actual weight voting should be done by veNFT holders
        console.log("  Initial gauge weights should be voted by veNFT holders");

        console.log();
    }

    function configureVaultParameters() internal {
        console.log("[Step 3] Configuring Vault Parameters...");

        USDPVault vault = USDPVault(addresses.usdpVault);

        // Note: USDPVault is multi-collateral, each collateral has its own LTV/threshold/penalty
        // Example configuration for a test collateral (update addresses as needed):

        // Example: Add USDC as collateral with conservative parameters
        // address usdcCollateral = addresses.usdc; // Get from deployment JSON
        // uint256 ltv = 8000;                // 80% LTV
        // uint256 liquidationThreshold = 8500; // 85% liquidation threshold
        // uint256 liquidationPenalty = 1000;   // 10% penalty
        // vault.addCollateral(usdcCollateral, ltv, liquidationThreshold, liquidationPenalty);
        // console.log("  Added USDC collateral: LTV 80%, Threshold 85%, Penalty 10%");

        console.log("  Vault configured (add collaterals via vault.addCollateral() as needed)");
        console.log();
    }

    function configureStabilityPool() internal {
        console.log("[Step 4] Configuring Stability Pool...");

        // Note: USDPStabilityPool is ready to use after deployment
        // No initialization needed - rewards come from:
        // 1. Liquidation proceeds (automatically distributed via onLiquidationProceeds())
        // 2. Gauge rewards (distributed via notifyRewardAmount() from RewardDistributor)

        console.log("  Stability Pool ready (no configuration needed)");
        console.log("  Users can deposit USDP to earn liquidation gains and gauge rewards");
        console.log();
    }

    function setupInitialLiquidity() internal {
        console.log("[Step 5] Setting up Initial Liquidity (Testnet Only)...");

        // This would require:
        // 1. Minting initial USDP via PSM
        // 2. Approving tokens
        // 3. Adding liquidity to USDP/USDC pair
        // For now, just log that this should be done manually or in a separate script

        console.log("  Initial liquidity should be added manually:");
        console.log("  1. Swap USDC for USDP via PSM");
        console.log("  2. Approve USDP and USDC to DEXRouter");
        console.log("  3. Call DEXRouter.addLiquidity()");

        console.log();
    }

    function printCompletionSummary() internal view {
        console.log("==============================================");
        console.log("Initialization Complete!");
        console.log("==============================================");
        console.log("All contracts have been initialized.");
        console.log("Next steps:");
        console.log("  1. Run parameter validation script");
        console.log("  2. Test all functions on testnet");
        console.log("  3. Transfer ownership to multi-sig");
        console.log("==============================================");
    }
}
