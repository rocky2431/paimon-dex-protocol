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

        // Set initial weekly emission (example: 1M PAIMON per week)
        uint256 weeklyEmission = 1_000_000 * 1e18;
        emissionManager.setWeeklyEmission(weeklyEmission);
        console.log("  Set weekly emission:", weeklyEmission / 1e18, "PAIMON");

        // Set emission decay rate (example: 1% per week = 100 bp)
        uint256 decayRate = 100;
        emissionManager.setDecayRate(decayRate);
        console.log("  Set decay rate:", decayRate, "bp (1% per week)");

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

        // Set collateralization ratio (example: 150% = 15000 bp)
        uint256 collateralRatio = 15000;
        vault.setMinCollateralRatio(collateralRatio);
        console.log("  Set min collateral ratio:", collateralRatio / 100, "%");

        // Set liquidation threshold (example: 120% = 12000 bp)
        uint256 liquidationThreshold = 12000;
        vault.setLiquidationThreshold(liquidationThreshold);
        console.log("  Set liquidation threshold:", liquidationThreshold / 100, "%");

        // Set borrow fee (example: 0.5% = 50 bp)
        uint256 borrowFee = 50;
        vault.setBorrowFee(borrowFee);
        console.log("  Set borrow fee:", borrowFee, "bp (0.5%)");

        console.log();
    }

    function configureStabilityPool() internal {
        console.log("[Step 4] Configuring Stability Pool...");

        USDPStabilityPool stabilityPool = USDPStabilityPool(addresses.stabilityPool);

        // Set reward rate (example: 10% APY = 1000 bp)
        uint256 rewardRate = 1000;
        stabilityPool.setRewardRate(rewardRate);
        console.log("  Set reward rate:", rewardRate / 100, "% APY");

        // Enable Stability Pool
        stabilityPool.setActive(true);
        console.log("  Enabled Stability Pool");

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
