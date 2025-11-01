// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/core/HYD.sol";
import "../src/core/PAIMON.sol";
import "../src/core/PSM.sol";
import "../src/core/VotingEscrow.sol";
import "../src/governance/GaugeController.sol";
import "../src/governance/RewardDistributor.sol";
import "../src/governance/BribeMarketplace.sol";
import "../src/incentives/BoostStaking.sol";
import "../src/dex/DEXFactory.sol";
import "../src/dex/DEXPair.sol";
import "../src/oracle/PriceOracle.sol";
import "../src/treasury/Treasury.sol";
import "../src/mocks/MockERC20.sol";

/**
 * @title Deploy Script
 * @notice Comprehensive deployment script for all Paimon.dex contracts on BSC testnet
 * @dev Usage:
 *   Dry run: forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC
 *   Deploy:  forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC --broadcast --verify
 *
 * Environment Variables Required:
 * - PRIVATE_KEY: Deployer private key
 * - BSC_TESTNET_RPC: BSC testnet RPC URL
 * - BSCSCAN_API_KEY: BscScan API key for verification
 * - DEPLOYER_ADDRESS: Multi-sig address for ownership transfer
 */
contract DeployScript is Script {
    // ==================== Deployment Addresses ====================

    // Core Contracts
    HYD public hyd;
    PAIMON public paimon;
    PSM public psm;

    // Governance Contracts
    VotingEscrow public votingEscrow;
    GaugeController public gaugeController;
    RewardDistributor public rewardDistributor;
    BribeMarketplace public bribeMarketplace;
    BoostStaking public boostStaking;

    // DEX Contracts
    DEXFactory public dexFactory;
    DEXPair public hydUsdcPair;

    // DeFi Integration
    PriceOracle public priceOracle;
    Treasury public treasury;

    // Mock Tokens (testnet only)
    MockERC20 public usdc;

    // Configuration
    address public deployer;
    address public multiSig; // Will be set from env or deployer

    // ==================== Main Deployment Function ====================

    function run() public {
        // Load deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);

        // Load multi-sig address (default to deployer for testnet)
        multiSig = vm.envOr("DEPLOYER_ADDRESS", deployer);

        console.log("==============================================");
        console.log("Paimon.dex Deployment Script");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Multi-sig:", multiSig);
        console.log("Chain ID:", block.chainid);
        console.log("==============================================");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy Mock Tokens (testnet only)
        deployMockTokens();

        // Step 2: Deploy Core Tokens
        deployCoreTokens();

        // Step 3: Deploy PSM
        deployPSM();

        // Step 4: Deploy Governance Contracts
        deployGovernance();

        // Step 5: Deploy DEX Contracts
        deployDEX();

        // Step 6: Deploy Oracle
        deployOracle();

        // Step 7: Deploy Treasury
        deployTreasury();

        // Step 8: Configure Contracts
        configureContracts();

        // Step 9: Transfer Ownership
        transferOwnership();

        vm.stopBroadcast();

        // Step 10: Save Deployment Addresses
        saveDeploymentAddresses();

        // Step 11: Print Summary
        printDeploymentSummary();
    }

    // ==================== Deployment Steps ====================

    /**
     * @notice Deploy mock USDC for testing (testnet only)
     */
    function deployMockTokens() internal {
        console.log("\n[Step 1] Deploying Mock Tokens...");

        usdc = new MockERC20("USD Coin", "USDC", 6);
        console.log("  USDC deployed:", address(usdc));

        // Mint initial supply for testing
        usdc.mint(deployer, 10_000_000 * 1e6); // 10M USDC
        console.log("  Minted 10M USDC to deployer");
    }

    /**
     * @notice Deploy HYD and PAIMON tokens
     */
    function deployCoreTokens() internal {
        console.log("\n[Step 2] Deploying Core Tokens...");

        // Deploy HYD (needs PSM address - will use temp and redeploy)
        // First deployment with temp address
        hyd = new HYD();
        hyd.initTempPsm(address(deployer));
        console.log("  HYD (temp) deployed:", address(hyd));

        // Deploy PAIMON (10B max supply)
        paimon = new PAIMON(10_000_000_000 * 1e18);
        console.log("  PAIMON deployed:", address(paimon));
    }

    /**
     * @notice Deploy PSM (Peg Stability Module)
     */
    function deployPSM() internal {
        console.log("\n[Step 3] Deploying PSM...");

        // Deploy PSM with temp HYD
        psm = new PSM(address(hyd), address(usdc));
        console.log("  PSM (temp) deployed:", address(psm));

        // Redeploy HYD with correct PSM address
        hyd = new HYD();
        hyd.initTempPsm(address(deployer));
        hyd.authorizeMinter(address(psm));
        console.log("  HYD (final) deployed:", address(hyd));

        // Redeploy PSM with correct HYD address
        psm = new PSM(address(hyd), address(usdc));
        console.log("  PSM (final) deployed:", address(psm));

        // Fund PSM with initial USDC reserve (1M USDC for testnet)
        usdc.transfer(address(psm), 1_000_000 * 1e6);
        console.log("  Funded PSM with 1M USDC reserve");
    }

    /**
     * @notice Deploy Governance contracts
     */
    function deployGovernance() internal {
        console.log("\n[Step 4] Deploying Governance Contracts...");

        // Deploy VotingEscrow (veNFT)
        votingEscrow = new VotingEscrow(address(hyd));
        console.log("  VotingEscrow deployed:", address(votingEscrow));

        // Deploy GaugeController
        gaugeController = new GaugeController(address(votingEscrow));
        console.log("  GaugeController deployed:", address(gaugeController));

        // Deploy BoostStaking (requires PAIMON token)
        boostStaking = new BoostStaking(address(paimon));
        console.log("  BoostStaking deployed:", address(boostStaking));

        // Deploy RewardDistributor (with BoostStaking integration)
        // Note: Using deployer as temporary treasury address (will transfer ownership later)
        rewardDistributor = new RewardDistributor(address(votingEscrow), address(boostStaking), deployer);
        console.log("  RewardDistributor deployed:", address(rewardDistributor));

        // Deploy BribeMarketplace (needs treasury first)
        // Treasury will be deployed in next step, use deployer temporarily
        bribeMarketplace = new BribeMarketplace(address(gaugeController), deployer);
        console.log("  BribeMarketplace deployed:", address(bribeMarketplace));
    }

    /**
     * @notice Deploy DEX contracts
     */
    function deployDEX() internal {
        console.log("\n[Step 5] Deploying DEX Contracts...");

        // Deploy Treasury first (needed for DEXFactory)
        treasury = new Treasury(deployer, address(usdc));
        console.log("  Treasury (temp) deployed:", address(treasury));

        // Deploy DEXFactory
        dexFactory = new DEXFactory(address(treasury));
        console.log("  DEXFactory deployed:", address(dexFactory));

        // Create HYD/USDC pair
        dexFactory.createPair(address(hyd), address(usdc));
        address pairAddress = dexFactory.getPair(address(hyd), address(usdc));
        hydUsdcPair = DEXPair(pairAddress);
        console.log("  HYD/USDC Pair created:", pairAddress);
    }

    /**
     * @notice Deploy PriceOracle
     */
    function deployOracle() internal {
        console.log("\n[Step 6] Deploying Price Oracle...");

        // For testnet, we don't have real Pyth feed
        // Deploy with placeholder address and default parameters
        address mockPyth = address(0x1); // Placeholder
        uint256 deviationThreshold = 500; // 5% deviation threshold (500/10000)
        uint256 stalenessThreshold = 3600; // 1 hour staleness threshold

        priceOracle = new PriceOracle(mockPyth, deviationThreshold, stalenessThreshold);
        console.log("  PriceOracle deployed:", address(priceOracle));
        console.log("  WARNING: Using mock Pyth address - configure before mainnet!");
    }

    /**
     * @notice Deploy Treasury (already deployed in deployDEX, just log)
     */
    function deployTreasury() internal {
        console.log("\n[Step 7] Treasury Configuration...");
        console.log("  Treasury address:", address(treasury));
        console.log("  Treasury owner:", treasury.owner());
    }

    /**
     * @notice Configure contracts after deployment
     */
    function configureContracts() internal {
        console.log("\n[Step 8] Configuring Contracts...");

        // Grant MINTER_ROLE to RewardDistributor for PAIMON
        bytes32 MINTER_ROLE = paimon.MINTER_ROLE();
        paimon.grantRole(MINTER_ROLE, address(rewardDistributor));
        console.log("  Granted MINTER_ROLE to RewardDistributor");

        // Add initial gauge for HYD/USDC pair
        gaugeController.addGauge(address(hydUsdcPair));
        console.log("  Added HYD/USDC gauge");

        // Whitelist USDC in BribeMarketplace
        bribeMarketplace.whitelistToken(address(usdc), true);
        console.log("  Whitelisted USDC in BribeMarketplace");

        // Whitelist HYD in BribeMarketplace
        bribeMarketplace.whitelistToken(address(hyd), true);
        console.log("  Whitelisted HYD in BribeMarketplace");
    }

    /**
     * @notice Transfer ownership to multi-sig
     */
    function transferOwnership() internal {
        if (multiSig == deployer) {
            console.log("\n[Step 9] Skipping ownership transfer (deployer == multi-sig)");
            return;
        }

        console.log("\n[Step 9] Transferring Ownership to Multi-sig...");

        // Transfer PSM ownership
        psm.transferOwnership(multiSig);
        console.log("  PSM ownership transferred");

        // Transfer GaugeController ownership
        gaugeController.transferOwnership(multiSig);
        console.log("  GaugeController ownership transferred");

        // Transfer BribeMarketplace ownership
        bribeMarketplace.transferOwnership(multiSig);
        console.log("  BribeMarketplace ownership transferred");

        // Transfer Treasury ownership
        treasury.transferOwnership(multiSig);
        console.log("  Treasury ownership transferred");

        // Transfer DEXFactory treasury control
        dexFactory.setTreasury(address(treasury));
        console.log("  DEXFactory treasury set");

        // Transfer PAIMON DEFAULT_ADMIN_ROLE
        bytes32 DEFAULT_ADMIN_ROLE = paimon.DEFAULT_ADMIN_ROLE();
        paimon.grantRole(DEFAULT_ADMIN_ROLE, multiSig);
        paimon.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        console.log("  PAIMON admin role transferred");

        console.log("  Multi-sig address:", multiSig);
    }

    /**
     * @notice Save deployment addresses to JSON file
     */
    function saveDeploymentAddresses() internal {
        console.log("\n[Step 10] Saving Deployment Addresses...");

        string memory json = "deployment";

        // Core Contracts
        vm.serializeAddress(json, "hyd", address(hyd));
        vm.serializeAddress(json, "paimon", address(paimon));
        vm.serializeAddress(json, "psm", address(psm));

        // Governance
        vm.serializeAddress(json, "votingEscrow", address(votingEscrow));
        vm.serializeAddress(json, "gaugeController", address(gaugeController));
        vm.serializeAddress(json, "rewardDistributor", address(rewardDistributor));
        vm.serializeAddress(json, "bribeMarketplace", address(bribeMarketplace));

        // DEX
        vm.serializeAddress(json, "dexFactory", address(dexFactory));
        vm.serializeAddress(json, "hydUsdcPair", address(hydUsdcPair));

        // DeFi
        vm.serializeAddress(json, "priceOracle", address(priceOracle));
        vm.serializeAddress(json, "treasury", address(treasury));

        // Test tokens
        string memory output = vm.serializeAddress(json, "usdc", address(usdc));

        // Write to file
        string memory filename = string.concat(
            "deployments/bsc-testnet-",
            vm.toString(block.chainid),
            ".json"
        );
        vm.writeJson(output, filename);

        console.log("  Deployment addresses saved to:", filename);
    }

    /**
     * @notice Print deployment summary
     */
    function printDeploymentSummary() internal view {
        console.log("\n==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("Core Contracts:");
        console.log("  HYD:              ", address(hyd));
        console.log("  PAIMON:           ", address(paimon));
        console.log("  PSM:              ", address(psm));
        console.log("");
        console.log("Governance:");
        console.log("  VotingEscrow:     ", address(votingEscrow));
        console.log("  GaugeController:  ", address(gaugeController));
        console.log("  RewardDistributor:", address(rewardDistributor));
        console.log("  BribeMarketplace: ", address(bribeMarketplace));
        console.log("");
        console.log("DEX:");
        console.log("  DEXFactory:       ", address(dexFactory));
        console.log("  HYD/USDC Pair:    ", address(hydUsdcPair));
        console.log("");
        console.log("DeFi Integration:");
        console.log("  PriceOracle:      ", address(priceOracle));
        console.log("  Treasury:         ", address(treasury));
        console.log("");
        console.log("Test Tokens:");
        console.log("  USDC:             ", address(usdc));
        console.log("==============================================");
        console.log("Deployment completed successfully!");
        console.log("==============================================");
    }
}
