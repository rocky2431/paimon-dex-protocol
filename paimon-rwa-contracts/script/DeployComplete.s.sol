// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Core Contracts
import "../src/core/USDP.sol";
import "../src/core/PAIMON.sol";
import "../src/core/esPaimon.sol";
import "../src/core/HYD.sol";
import "../src/core/PSMParameterized.sol";
import "../src/core/VotingEscrow.sol";
import "../src/core/VotingEscrowPaimon.sol";
import "../src/core/USDPVault.sol";
import "../src/core/USDPStabilityPool.sol";

// Governance
import "../src/governance/GaugeController.sol";
import "../src/governance/RewardDistributor.sol";
import "../src/governance/BribeMarketplace.sol";
import "../src/governance/EmissionManager.sol";
import "../src/governance/EmissionRouter.sol";

// Incentives
import "../src/incentives/BoostStaking.sol";
import "../src/incentives/NitroPool.sol";

// DEX
import "../src/dex/DEXFactory.sol";
import "../src/dex/DEXPair.sol";
import "../src/dex/DEXRouter.sol";

// Treasury & Oracle
import "../src/treasury/Treasury.sol";
import "../src/treasury/SavingRate.sol";
import "../src/oracle/PriceOracle.sol";
import "../src/oracle/RWAPriceOracle.sol";

// Launchpad
import "../src/launchpad/ProjectRegistry.sol";
import "../src/launchpad/IssuanceController.sol";

// Presale
// TODO: Presale contracts (RWABondNFT, RemintController, SettlementRouter) have circular import issues
// They are excluded from this deployment script and should be deployed separately
// import "../src/presale/SettlementRouter.sol";

// Mocks (testnet only)
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockChainlinkAggregator.sol";
import "../src/mocks/MockPyth.sol";
import "../src/mocks/MockVRFCoordinatorV2.sol";

/**
 * @title Complete Deployment Script for Paimon.dex
 * @notice Comprehensive deployment of all contracts for BSC testnet/mainnet
 * @dev This script deploys the complete Paimon.dex protocol including:
 *      - USDP stablecoin system (PSM, Vault, StabilityPool)
 *      - PAIMON governance token (esPAIMON, VotingEscrow)
 *      - DEX (Factory, Router, Pairs)
 *      - Treasury & Oracle
 *      - Incentives (BoostStaking, NitroPool)
 *      - Launchpad & Presale
 *
 * Usage:
 *   Dry run:  forge script script/DeployComplete.s.sol --rpc-url $BSC_TESTNET_RPC
 *   Deploy:   forge script script/DeployComplete.s.sol --rpc-url $BSC_TESTNET_RPC --broadcast --verify
 *
 * Environment Variables Required:
 * - PRIVATE_KEY: Deployer private key
 * - BSC_TESTNET_RPC or BSC_MAINNET_RPC: RPC URL
 * - BSCSCAN_API_KEY: BscScan API key for verification
 * - DEPLOYER_ADDRESS: Multi-sig address for ownership transfer (optional, defaults to deployer)
 * - IS_TESTNET: "true" for testnet, "false" for mainnet (defaults to true)
 */
contract DeployCompleteScript is Script {
    // ==================== Deployment Configuration ====================

    bool public isTestnet;
    address public deployer;
    address public multiSig;

    // ==================== Core Contracts ====================

    USDP public usdp;
    PAIMON public paimon;
    esPaimon public esPaimonToken;
    HYD public hyd;
    PSMParameterized public psm;
    VotingEscrow public votingEscrow;
    VotingEscrowPaimon public votingEscrowPaimon;
    USDPVault public usdpVault;
    USDPStabilityPool public stabilityPool;

    // ==================== Governance Contracts ====================

    GaugeController public gaugeController;
    RewardDistributor public rewardDistributor;
    BribeMarketplace public bribeMarketplace;
    EmissionManager public emissionManager;
    EmissionRouter public emissionRouter;

    // ==================== Incentive Contracts ====================

    BoostStaking public boostStaking;
    NitroPool public nitroPool;

    // ==================== DEX Contracts ====================

    DEXFactory public dexFactory;
    DEXRouter public dexRouter;
    DEXPair public usdpUsdcPair;

    // ==================== Treasury & Oracle ====================

    Treasury public treasury;
    SavingRate public savingRate;
    PriceOracle public priceOracle;
    RWAPriceOracle public rwaPriceOracle;

    // ==================== Launchpad ====================

    ProjectRegistry public projectRegistry;
    IssuanceController public issuanceController;

    // ==================== Presale ====================
    // TODO: Presale contracts excluded due to circular import issues
    // RWABondNFT public rwaBondNFT;
    // RemintController public remintController;
    // SettlementRouter public settlementRouter;

    // ==================== Mock Contracts (Testnet Only) ====================

    MockERC20 public usdc;
    MockChainlinkAggregator public mockChainlinkAggregator;
    MockPyth public mockPyth;
    MockVRFCoordinatorV2 public mockVRFCoordinator;

    // ==================== Constants ====================

    uint256 public constant PAIMON_MAX_SUPPLY = 10_000_000_000 * 1e18; // 10B
    uint256 public constant INITIAL_USDC_RESERVE = 1_000_000 * 1e6; // 1M USDC
    uint256 public constant PSM_FEE_IN = 10; // 0.1% (10 bp)
    uint256 public constant PSM_FEE_OUT = 10; // 0.1% (10 bp)

    // VRF Configuration
    uint64 public constant VRF_SUBSCRIPTION_ID = 0; // Will be created
    bytes32 public constant VRF_KEY_HASH = 0x0; // BSC testnet key hash
    uint32 public constant VRF_CALLBACK_GAS_LIMIT = 500000;
    uint16 public constant VRF_REQUEST_CONFIRMATIONS = 3;

    // ==================== Main Deployment Function ====================

    function run() public {
        // Load configuration
        loadConfiguration();

        // Print deployment info
        printDeploymentHeader();

        // Start broadcast with deployer account (private key provided via --private-key flag)
        vm.startBroadcast(deployer);

        // Phase 1: Deploy Mock Contracts (testnet only)
        if (isTestnet) {
            deployMockContracts();
        }

        // Phase 2: Deploy Core Tokens
        deployCoreTokens();

        // Phase 3: Deploy PSM
        deployPSM();

        // Phase 4: Deploy Governance
        deployGovernance();

        // Phase 5: Deploy Incentives
        deployIncentives();

        // Phase 6: Deploy DEX
        deployDEX();

        // Phase 7: Deploy Treasury & Oracle
        deployTreasuryAndOracle();

        // Phase 8: Deploy Vault & StabilityPool
        deployVaultAndStabilityPool();

        // Phase 9: Deploy Launchpad
        deployLaunchpad();

        // Phase 10: Deploy Presale
        // TODO: Presale deployment excluded due to circular import issues
        // deployPresale();

        // Phase 11: Initialize Contracts
        initializeContracts();

        // Phase 12: Configure Permissions
        configurePermissions();

        // Phase 13: Transfer Ownership
        transferOwnership();

        vm.stopBroadcast();

        // Phase 14: Save Deployment Addresses
        saveDeploymentAddresses();

        // Phase 15: Print Summary
        printDeploymentSummary();
    }

    // ==================== Configuration ====================

    function loadConfiguration() internal {
        // Get deployer address from environment (must match the private key used)
        deployer = vm.envAddress("DEPLOYER_ADDRESS");
        // Use deployer as multisig if MULTISIG_ADDRESS not provided
        multiSig = vm.envOr("MULTISIG_ADDRESS", deployer);
        isTestnet = vm.envOr("IS_TESTNET", true);
    }

    function printDeploymentHeader() internal view {
        console.log("==============================================");
        console.log("Paimon.dex Complete Deployment Script");
        console.log("==============================================");
        console.log("Network:", isTestnet ? "BSC Testnet" : "BSC Mainnet");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Multi-sig:", multiSig);
        console.log("==============================================\n");
    }

    // ==================== Phase 1: Mock Contracts ====================

    function deployMockContracts() internal {
        console.log("[Phase 1] Deploying Mock Contracts (Testnet Only)...");

        // Deploy Mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);
        console.log("  MockUSDC deployed:", address(usdc));

        // Mint initial USDC supply
        usdc.mint(deployer, 100_000_000 * 1e6); // 100M USDC
        console.log("  Minted 100M USDC to deployer");

        // Deploy Mock Chainlink Aggregator
        mockChainlinkAggregator = new MockChainlinkAggregator(8, "USDC / USD"); // 8 decimals
        console.log("  MockChainlinkAggregator deployed:", address(mockChainlinkAggregator));

        // Deploy Mock Pyth
        mockPyth = new MockPyth();
        console.log("  MockPyth deployed:", address(mockPyth));

        // Deploy Mock VRF Coordinator
        mockVRFCoordinator = new MockVRFCoordinatorV2();
        console.log("  MockVRFCoordinator deployed:", address(mockVRFCoordinator));

        console.log();
    }

    // ==================== Phase 2: Core Tokens ====================

    function deployCoreTokens() internal {
        console.log("[Phase 2] Deploying Core Tokens...");

        // Deploy USDP (stablecoin)
        usdp = new USDP();
        console.log("  USDP deployed:", address(usdp));

        // Deploy PAIMON (governance token)
        paimon = new PAIMON(PAIMON_MAX_SUPPLY);
        console.log("  PAIMON deployed:", address(paimon));

        // Deploy esPAIMON (escrowed PAIMON)
        esPaimonToken = new esPaimon(address(paimon));
        console.log("  esPAIMON deployed:", address(esPaimonToken));

        // Deploy HYD (RWA asset token)
        hyd = new HYD();
        console.log("  HYD deployed:", address(hyd));

        console.log();
    }

    // ==================== Phase 3: PSM ====================

    function deployPSM() internal {
        console.log("[Phase 3] Deploying PSM (Peg Stability Module)...");

        // Deploy PSM
        address usdcAddress = isTestnet ? address(usdc) : getMainnetUSDCAddress();
        psm = new PSMParameterized(address(usdp), usdcAddress);
        console.log("  PSMParameterized deployed:", address(psm));
        console.log("  USDC decimals detected:", psm.usdcDecimals());

        // Grant minter role to PSM
        usdp.setAuthorizedMinter(address(psm), true);
        console.log("  Granted USDP minter role to PSM");

        // Set PSM fees
        psm.setFeeIn(PSM_FEE_IN);
        psm.setFeeOut(PSM_FEE_OUT);
        console.log("  Set PSM fees: in=0.1%, out=0.1%");

        // Fund PSM with initial USDC reserve (testnet only)
        if (isTestnet) {
            usdc.transfer(address(psm), INITIAL_USDC_RESERVE);
            console.log("  Funded PSM with 1M USDC reserve");
        }

        console.log();
    }

    // ==================== Phase 4: Governance ====================

    function deployGovernance() internal {
        console.log("[Phase 4] Deploying Governance Contracts...");

        // Deploy VotingEscrow for USDP
        votingEscrow = new VotingEscrow(address(usdp));
        console.log("  VotingEscrow (USDP) deployed:", address(votingEscrow));

        // Deploy VotingEscrowPaimon
        votingEscrowPaimon = new VotingEscrowPaimon(address(paimon));
        console.log("  VotingEscrowPaimon deployed:", address(votingEscrowPaimon));

        // Deploy GaugeController
        gaugeController = new GaugeController(address(votingEscrow));
        console.log("  GaugeController deployed:", address(gaugeController));

        // Deploy EmissionManager (needs to be deployed before RewardDistributor)
        emissionManager = new EmissionManager(); // No parameters - emission schedule is hardcoded
        console.log("  EmissionManager deployed:", address(emissionManager));

        emissionRouter = new EmissionRouter(address(emissionManager), address(paimon));
        console.log("  EmissionRouter deployed:", address(emissionRouter));

        // Deploy BribeMarketplace
        bribeMarketplace = new BribeMarketplace(address(gaugeController), deployer);
        console.log("  BribeMarketplace deployed:", address(bribeMarketplace));

        console.log();
    }

    // ==================== Phase 5: Incentives ====================

    function deployIncentives() internal {
        console.log("[Phase 5] Deploying Incentive Contracts...");

        // Deploy BoostStaking
        boostStaking = new BoostStaking(address(paimon));
        console.log("  BoostStaking deployed:", address(boostStaking));

        // Deploy NitroPool
        uint256 platformFeeBps = 500; // 5% platform fee
        nitroPool = new NitroPool(address(votingEscrow), address(treasury), platformFeeBps);
        console.log("  NitroPool deployed:", address(nitroPool));

        // Deploy RewardDistributor (after BoostStaking)
        rewardDistributor = new RewardDistributor(
            address(votingEscrow),
            address(boostStaking),
            deployer // Treasury address (temporary)
        );
        console.log("  RewardDistributor deployed:", address(rewardDistributor));

        console.log();
    }

    // ==================== Phase 6: DEX ====================

    function deployDEX() internal {
        console.log("[Phase 6] Deploying DEX Contracts...");

        // Deploy DEXFactory (needs treasury - will use deployer temporarily)
        dexFactory = new DEXFactory(deployer);
        console.log("  DEXFactory deployed:", address(dexFactory));

        // Deploy DEXRouter
        dexRouter = new DEXRouter(address(dexFactory));
        console.log("  DEXRouter deployed:", address(dexRouter));

        // Create USDP/USDC pair
        address usdcAddress = isTestnet ? address(usdc) : getMainnetUSDCAddress();
        dexFactory.createPair(address(usdp), usdcAddress);
        address pairAddress = dexFactory.getPair(address(usdp), usdcAddress);
        usdpUsdcPair = DEXPair(pairAddress);
        console.log("  USDP/USDC Pair created:", pairAddress);

        console.log();
    }

    // ==================== Phase 7: Treasury & Oracle ====================

    function deployTreasuryAndOracle() internal {
        console.log("[Phase 7] Deploying Treasury & Oracle...");

        // Deploy Treasury
        address usdcAddress = isTestnet ? address(usdc) : getMainnetUSDCAddress();
        treasury = new Treasury(deployer, usdcAddress);
        console.log("  Treasury deployed:", address(treasury));

        // Deploy SavingRate
        uint256 initialAnnualRate = 500; // 5% annual rate (500 bp)
        savingRate = new SavingRate(address(usdp), initialAnnualRate);
        console.log("  SavingRate deployed:", address(savingRate));

        // Deploy PriceOracle
        address pythAddress = isTestnet ? address(mockPyth) : getMainnetPythAddress();
        priceOracle = new PriceOracle(pythAddress, 500, 3600); // 5% deviation, 1h staleness
        console.log("  PriceOracle deployed:", address(priceOracle));

        // Deploy RWAPriceOracle
        address chainlinkAddress = isTestnet ? address(mockChainlinkAggregator) : address(0);
        address sequencerUptimeFeed = address(0); // Not needed for testnet, use real address for mainnet
        rwaPriceOracle = new RWAPriceOracle(chainlinkAddress, sequencerUptimeFeed, deployer);
        console.log("  RWAPriceOracle deployed:", address(rwaPriceOracle));

        // Update DEXFactory treasury
        dexFactory.setTreasury(address(treasury));
        console.log("  Updated DEXFactory treasury address");

        console.log();
    }

    // ==================== Phase 8: Vault & StabilityPool ====================

    function deployVaultAndStabilityPool() internal {
        console.log("[Phase 8] Deploying USDPVault & StabilityPool...");

        // Deploy USDPVault
        usdpVault = new USDPVault(
            address(usdp),
            address(priceOracle),
            address(treasury)
        );
        console.log("  USDPVault deployed:", address(usdpVault));

        // Deploy USDPStabilityPool
        stabilityPool = new USDPStabilityPool(
            address(usdp),
            address(usdpVault)
        );
        console.log("  USDPStabilityPool deployed:", address(stabilityPool));

        // Grant minter role to Vault
        usdp.setAuthorizedMinter(address(usdpVault), true);
        console.log("  Granted USDP minter role to Vault");

        console.log();
    }

    // ==================== Phase 9: Launchpad ====================

    function deployLaunchpad() internal {
        console.log("[Phase 9] Deploying Launchpad...");

        // Deploy ProjectRegistry
        projectRegistry = new ProjectRegistry(address(votingEscrow));
        console.log("  ProjectRegistry deployed:", address(projectRegistry));

        // Deploy IssuanceController
        address usdcAddress = isTestnet ? address(usdc) : getMainnetUSDCAddress();
        issuanceController = new IssuanceController(
            address(projectRegistry),
            usdcAddress,
            address(treasury),
            address(votingEscrow)
        );
        console.log("  IssuanceController deployed:", address(issuanceController));

        console.log();
    }

    // ==================== Phase 10: Presale ====================

    // TODO: Presale deployment excluded due to circular import issues
    // function deployPresale() internal {
    //     console.log("[Phase 10] Deploying Presale Contracts...");
    //
    //     // Deploy RWABondNFT (needs VRF coordinator)
    //     address vrfCoordinator = isTestnet ? address(mockVRFCoordinator) : getMainnetVRFCoordinator();
    //     rwaBondNFT = new RWABondNFT(
    //         vrfCoordinator,
    //         VRF_SUBSCRIPTION_ID,
    //         VRF_KEY_HASH,
    //         VRF_CALLBACK_GAS_LIMIT,
    //         VRF_REQUEST_CONFIRMATIONS
    //     );
    //     console.log("  RWABondNFT deployed:", address(rwaBondNFT));
    //
    //     // Deploy RemintController
    //     remintController = new RemintController(
    //         address(rwaBondNFT),
    //         address(vrfCoordinator)
    //     );
    //     console.log("  RemintController deployed:", address(remintController));
    //
    //     // Deploy SettlementRouter
    //     settlementRouter = new SettlementRouter(
    //         address(rwaBondNFT),
    //         address(treasury)
    //     );
    //     console.log("  SettlementRouter deployed:", address(settlementRouter));
    //
    //     console.log();
    // }

    // ==================== Phase 11: Initialize Contracts ====================

    function initializeContracts() internal {
        console.log("[Phase 11] Initializing Contracts...");

        // Add initial gauge for USDP/USDC pair
        gaugeController.addGauge(address(usdpUsdcPair));
        console.log("  Added USDP/USDC gauge");

        // Whitelist tokens in BribeMarketplace
        address usdcAddress = isTestnet ? address(usdc) : getMainnetUSDCAddress();
        bribeMarketplace.whitelistToken(usdcAddress, true);
        bribeMarketplace.whitelistToken(address(usdp), true);
        bribeMarketplace.whitelistToken(address(paimon), true);
        console.log("  Whitelisted tokens in BribeMarketplace");

        // Set StabilityPool in Vault
        usdpVault.setStabilityPool(address(stabilityPool));
        console.log("  Set StabilityPool in Vault");

        // Note: Treasury is ONLY for protocol fee collection
        // User RWA collateral/lending is handled by USDPVault
        // Therefore, Treasury does NOT need USDP minter authorization

        console.log();
    }

    // ==================== Phase 12: Configure Permissions ====================

    function configurePermissions() internal {
        console.log("[Phase 12] Configuring Permissions...");

        // Grant MINTER_ROLE to RewardDistributor, EmissionManager, EmissionRouter
        bytes32 MINTER_ROLE = paimon.MINTER_ROLE();
        paimon.grantRole(MINTER_ROLE, address(rewardDistributor));
        console.log("  Granted PAIMON MINTER_ROLE to RewardDistributor");
        paimon.grantRole(MINTER_ROLE, address(emissionManager));
        console.log("  Granted PAIMON MINTER_ROLE to EmissionManager");
        paimon.grantRole(MINTER_ROLE, address(emissionRouter));
        console.log("  Granted PAIMON MINTER_ROLE to EmissionRouter");

        // Allow router to act as emission policy operator
        emissionManager.grantEmissionPolicy(address(emissionRouter));
        console.log("  Granted EmissionManager policy role to EmissionRouter");

        // Configure default sinks: debt & eco -> Treasury, LP/Stability -> RewardDistributor
        emissionRouter.setSinks(
            address(treasury),
            address(rewardDistributor),
            address(rewardDistributor),
            address(treasury)
        );
        console.log("  Configured EmissionRouter sinks");

        // Note: RewardDistributor and GaugeController work independently
        // No explicit linking needed as they both reference VotingEscrow

        console.log();
    }

    // ==================== Phase 13: Transfer Ownership ====================

    function transferOwnership() internal {
        if (multiSig == deployer) {
            console.log("[Phase 13] Skipping ownership transfer (deployer == multi-sig)\n");
            return;
        }

        console.log("[Phase 13] Transferring Ownership to Multi-sig...");

        // Transfer Emission stack governance
        emissionManager.transferOwnership(multiSig);
        console.log("  EmissionManager governance transferred");

        emissionRouter.transferOwnership(multiSig);
        console.log("  EmissionRouter governance transferred");

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

        // Transfer PAIMON admin role
        bytes32 DEFAULT_ADMIN_ROLE = paimon.DEFAULT_ADMIN_ROLE();
        paimon.grantRole(DEFAULT_ADMIN_ROLE, multiSig);
        paimon.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        console.log("  PAIMON admin role transferred");

        // Transfer USDP admin role
        usdp.transferOwnership(multiSig);
        console.log("  USDP ownership transferred");

        console.log("  Multi-sig address:", multiSig);
        console.log();
    }

    // ==================== Phase 14: Save Addresses ====================

    function saveDeploymentAddresses() internal {
        console.log("[Phase 14] Saving Deployment Addresses...");

        string memory json = "deployment";

        // Core Tokens
        vm.serializeAddress(json, "usdp", address(usdp));
        vm.serializeAddress(json, "paimon", address(paimon));
        vm.serializeAddress(json, "esPaimon", address(esPaimonToken));
        vm.serializeAddress(json, "hyd", address(hyd));
        vm.serializeAddress(json, "psm", address(psm));

        // Governance
        vm.serializeAddress(json, "votingEscrow", address(votingEscrow));
        vm.serializeAddress(json, "votingEscrowPaimon", address(votingEscrowPaimon));
        vm.serializeAddress(json, "gaugeController", address(gaugeController));
        vm.serializeAddress(json, "rewardDistributor", address(rewardDistributor));
        vm.serializeAddress(json, "bribeMarketplace", address(bribeMarketplace));
        vm.serializeAddress(json, "emissionManager", address(emissionManager));
        vm.serializeAddress(json, "emissionRouter", address(emissionRouter));

        // Incentives
        vm.serializeAddress(json, "boostStaking", address(boostStaking));
        vm.serializeAddress(json, "nitroPool", address(nitroPool));

        // DEX
        vm.serializeAddress(json, "dexFactory", address(dexFactory));
        vm.serializeAddress(json, "dexRouter", address(dexRouter));
        vm.serializeAddress(json, "usdpUsdcPair", address(usdpUsdcPair));

        // Treasury & Oracle
        vm.serializeAddress(json, "treasury", address(treasury));
        vm.serializeAddress(json, "savingRate", address(savingRate));
        vm.serializeAddress(json, "priceOracle", address(priceOracle));
        vm.serializeAddress(json, "rwaPriceOracle", address(rwaPriceOracle));

        // Vault & StabilityPool
        vm.serializeAddress(json, "usdpVault", address(usdpVault));
        vm.serializeAddress(json, "stabilityPool", address(stabilityPool));

        // Launchpad
        vm.serializeAddress(json, "projectRegistry", address(projectRegistry));
        vm.serializeAddress(json, "issuanceController", address(issuanceController));

        // Presale
        // TODO: Presale contracts excluded
        // vm.serializeAddress(json, "rwaBondNFT", address(rwaBondNFT));
        // vm.serializeAddress(json, "remintController", address(remintController));
        // vm.serializeAddress(json, "settlementRouter", address(settlementRouter));

        // Test tokens (if testnet)
        if (isTestnet) {
            vm.serializeAddress(json, "usdc", address(usdc));
            vm.serializeAddress(json, "mockChainlinkAggregator", address(mockChainlinkAggregator));
            vm.serializeAddress(json, "mockPyth", address(mockPyth));
            vm.serializeAddress(json, "mockVRFCoordinator", address(mockVRFCoordinator));
        }

        string memory output = vm.serializeAddress(json, "deployer", deployer);

        // Write to file
        string memory network = isTestnet ? "testnet" : "mainnet";
        string memory filename = string.concat(
            "deployments/bsc-",
            network,
            "-",
            vm.toString(block.chainid),
            ".json"
        );
        vm.writeJson(output, filename);

        console.log("  Deployment addresses saved to:", filename);
        console.log();
    }

    // ==================== Phase 15: Print Summary ====================

    function printDeploymentSummary() internal view {
        console.log("==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("Core Tokens:");
        console.log("  USDP:             ", address(usdp));
        console.log("  PAIMON:           ", address(paimon));
        console.log("  esPAIMON:         ", address(esPaimonToken));
        console.log("  PSM:              ", address(psm));
        console.log("");
        console.log("Governance:");
        console.log("  VotingEscrow:     ", address(votingEscrow));
        console.log("  VotingEscrowPAIMON:", address(votingEscrowPaimon));
        console.log("  GaugeController:  ", address(gaugeController));
        console.log("  RewardDistributor:", address(rewardDistributor));
        console.log("  BribeMarketplace: ", address(bribeMarketplace));
        console.log("  EmissionManager:  ", address(emissionManager));
        console.log("  EmissionRouter:   ", address(emissionRouter));
        console.log("");
        console.log("Incentives:");
        console.log("  BoostStaking:     ", address(boostStaking));
        console.log("  NitroPool:        ", address(nitroPool));
        console.log("");
        console.log("DEX:");
        console.log("  DEXFactory:       ", address(dexFactory));
        console.log("  DEXRouter:        ", address(dexRouter));
        console.log("  USDP/USDC Pair:   ", address(usdpUsdcPair));
        console.log("");
        console.log("Treasury & Oracle:");
        console.log("  Treasury:         ", address(treasury));
        console.log("  SavingRate:       ", address(savingRate));
        console.log("  PriceOracle:      ", address(priceOracle));
        console.log("  RWAPriceOracle:   ", address(rwaPriceOracle));
        console.log("");
        console.log("Vault & StabilityPool:");
        console.log("  USDPVault:        ", address(usdpVault));
        console.log("  StabilityPool:    ", address(stabilityPool));
        console.log("");
        console.log("Launchpad:");
        console.log("  ProjectRegistry:  ", address(projectRegistry));
        console.log("  IssuanceController:", address(issuanceController));
        console.log("");
        // TODO: Presale contracts excluded
        // console.log("Presale:");
        // console.log("  RWABondNFT:       ", address(rwaBondNFT));
        // console.log("  RemintController: ", address(remintController));
        // console.log("  SettlementRouter: ", address(settlementRouter));
        console.log("==============================================");
        console.log("Deployment completed successfully!");
        console.log("==============================================");
    }

    // ==================== Helper Functions ====================

    function getMainnetUSDCAddress() internal pure returns (address) {
        // BSC Mainnet USDC address
        return 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
    }

    function getMainnetPythAddress() internal pure returns (address) {
        // BSC Mainnet Pyth address
        return 0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594;
    }

    function getMainnetVRFCoordinator() internal pure returns (address) {
        // BSC Mainnet VRF Coordinator (Chainlink VRF v2)
        return 0xc587d9053cd1118f25F645F9E08BB98c9712A4EE;
    }
}
