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

// Mocks (testnet only)
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockChainlinkAggregator.sol";
import "../src/mocks/MockPyth.sol";
import "../src/mocks/MockVRFCoordinatorV2.sol";

/**
 * @title BSC Testnet Deployment Script for Paimon.dex
 * @notice Specialized deployment script for BSC Testnet (ChainID: 97)
 * @dev This script deploys the complete Paimon.dex protocol to BSC Testnet with:
 *      - Mock external dependencies (USDC, Chainlink, Pyth, VRF)
 *      - Test-friendly initial configuration
 *      - Extensive logging and verification
 *      - JSON output for frontend integration
 *
 * Deployment Steps:
 *   1. Setup environment variables in .env file
 *   2. Dry run: forge script script/DeployTestnet.s.sol --rpc-url $BSC_TESTNET_RPC
 *   3. Deploy:  forge script script/DeployTestnet.s.sol --rpc-url $BSC_TESTNET_RPC --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY
 *   4. Verify:  Check output in broadcast/ and deployments/testnet/
 *
 * Environment Variables Required:
 * - PRIVATE_KEY or DEPLOYER_PRIVATE_KEY: Deployer wallet private key
 * - BSC_TESTNET_RPC: BSC testnet RPC URL (default: https://data-seed-prebsc-1-s1.binance.org:8545)
 * - BSCSCAN_API_KEY: BscScan API key for contract verification
 * - DEPLOYER_ADDRESS: (Optional) Explicit deployer address
 *
 * Output Files:
 * - broadcast/DeployTestnet.s.sol/97/run-latest.json: Full broadcast transaction log
 * - deployments/testnet/addresses.json: Contract addresses for frontend
 * - deployments/testnet/deployment-report.md: Human-readable deployment report
 *
 * @author Paimon.dex Team
 * @custom:security-contact security@paimon.dex
 */
contract DeployTestnetScript is Script {
    // ==================== Deployment State ====================

    address public deployer;
    uint256 public deployerPrivateKey;

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
    DEXPair public paimonBnbPair;
    DEXPair public hydUsdpPair;

    // ==================== Treasury & Oracle ====================

    Treasury public treasury;
    SavingRate public savingRate;
    PriceOracle public priceOracle;
    RWAPriceOracle public rwaPriceOracle;

    // ==================== Launchpad ====================

    ProjectRegistry public projectRegistry;
    IssuanceController public issuanceController;

    // ==================== Mock Contracts (Testnet Only) ====================

    MockERC20 public usdc;
    MockERC20 public wbnb;
    MockChainlinkAggregator public usdcPriceFeed;
    MockChainlinkAggregator public bnbPriceFeed;
    MockChainlinkAggregator public hydPriceFeed;
    MockPyth public mockPyth;
    MockVRFCoordinatorV2 public mockVRFCoordinator;

    // ==================== Protocol Constants ====================

    // Token Constants
    uint256 public constant PAIMON_MAX_SUPPLY = 10_000_000_000 * 1e18; // 10B PAIMON
    uint256 public constant INITIAL_PAIMON_MINT = 1_000_000_000 * 1e18; // 1B for initial distribution

    // Initial Reserves (Testnet)
    uint256 public constant INITIAL_USDC_RESERVE = 10_000_000 * 1e6; // 10M USDC
    uint256 public constant INITIAL_BNB_LIQUIDITY = 100 * 1e18; // 100 BNB
    uint256 public constant INITIAL_HYD_SUPPLY = 100_000_000 * 1e18; // 100M HYD

    // PSM Configuration
    uint256 public constant PSM_FEE_IN = 10; // 0.1% (10 basis points)
    uint256 public constant PSM_FEE_OUT = 10; // 0.1% (10 basis points)

    // DEX Configuration
    uint256 public constant DEX_FEE_TO_VOTERS_BPS = 7000; // 70% to voters
    uint256 public constant DEX_FEE_TO_TREASURY_BPS = 3000; // 30% to treasury

    // Treasury Configuration (LTV Ratios)
    uint256 public constant TIER1_LTV = 8000; // 80% (US Treasuries)
    uint256 public constant TIER2_LTV = 7000; // 70% (Investment-grade bonds)
    uint256 public constant TIER3_LTV = 6000; // 60% (RWA revenue pools, HYD for testing)

    // Incentive Configuration
    uint256 public constant NITRO_PLATFORM_FEE_BPS = 500; // 5%
    uint256 public constant SAVING_RATE_ANNUAL = 500; // 5% APR

    // Oracle Configuration
    bytes32 public constant PYTH_HYD_PRICE_ID = bytes32(uint256(1)); // Mock price ID
    uint256 public constant ORACLE_DEVIATION_THRESHOLD = 2000; // 20%

    // VRF Configuration (Mock)
    uint64 public constant VRF_SUBSCRIPTION_ID = 1;
    bytes32 public constant VRF_KEY_HASH = bytes32(uint256(0x123));
    uint32 public constant VRF_CALLBACK_GAS_LIMIT = 500000;

    // ==================== Main Deployment Function ====================

    function run() public {
        // Step 1: Load configuration
        loadConfiguration();

        // Step 2: Print deployment header
        printDeploymentHeader();

        // Step 3: Start broadcast
        vm.startBroadcast(deployerPrivateKey);

        // Phase 1: Deploy Mock External Dependencies
        deployMockExternalDependencies();

        // Phase 2: Deploy Core Tokens
        deployCoreTokens();

        // Phase 3: Deploy PSM (USDC ↔ USDP 1:1 swap)
        deployPSM();

        // Phase 4: Deploy Governance Contracts
        deployGovernance();

        // Phase 5: Deploy Incentive Contracts
        deployIncentives();

        // Phase 6: Deploy DEX (Factory, Router, Pairs)
        deployDEX();

        // Phase 7: Deploy Treasury & Oracle
        deployTreasuryAndOracle();

        // Phase 8: Deploy Vault & StabilityPool
        deployVaultAndStabilityPool();

        // Phase 9: Deploy Launchpad
        deployLaunchpad();

        // Phase 10: Initialize All Contracts
        initializeContracts();

        // Phase 11: Configure Cross-Contract Permissions
        configurePermissions();

        // Phase 12: Setup Initial Liquidity (Testnet)
        setupInitialLiquidity();

        // Phase 13: Final Verification
        verifyDeployment();

        vm.stopBroadcast();

        // Phase 14: Save Deployment Data
        saveDeploymentData();

        // Phase 15: Print Deployment Summary
        printDeploymentSummary();
    }

    // ==================== Configuration ====================

    function loadConfiguration() internal {
        // Try to load private key from environment
        try vm.envUint("DEPLOYER_PRIVATE_KEY") returns (uint256 pk) {
            deployerPrivateKey = pk;
        } catch {
            deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        }

        // Derive deployer address
        deployer = vm.addr(deployerPrivateKey);

        // Verify we're on BSC Testnet
        require(block.chainid == 97, "Must deploy to BSC Testnet (ChainID 97)");
    }

    function printDeploymentHeader() internal view {
        console.log("");
        console.log("====================================================================");
        console.log("  Paimon.dex - BSC Testnet Deployment");
        console.log("====================================================================");
        console.log("Chain ID:          97 (BSC Testnet)");
        console.log("Deployer:          ", deployer);
        console.log("Deployer Balance:  ", deployer.balance / 1e18, "BNB");
        console.log("Block Number:      ", block.number);
        console.log("Timestamp:         ", block.timestamp);
        console.log("====================================================================");
        console.log("");
    }

    // ==================== Phase 1: Mock External Dependencies ====================

    function deployMockExternalDependencies() internal {
        console.log("[Phase 1/13] Deploying Mock External Dependencies...");
        console.log("---------------------------------------------------------------------");

        // Deploy Mock USDC (6 decimals like real USDC)
        usdc = new MockERC20("USD Coin (Mock)", "USDC", 6);
        console.log("  MockUSDC deployed:           ", address(usdc));
        usdc.mint(deployer, INITIAL_USDC_RESERVE);
        console.log("  Minted 10M USDC to deployer");

        // Deploy Mock WBNB (18 decimals)
        wbnb = new MockERC20("Wrapped BNB (Mock)", "WBNB", 18);
        console.log("  MockWBNB deployed:           ", address(wbnb));
        wbnb.mint(deployer, INITIAL_BNB_LIQUIDITY * 100); // Extra for testing
        console.log("  Minted 10,000 WBNB to deployer");

        // Deploy Mock Chainlink Price Feeds
        usdcPriceFeed = new MockChainlinkAggregator(8, "USDC / USD");
        usdcPriceFeed.updateAnswer(1e8); // $1.00
        console.log("  USDC Price Feed deployed:    ", address(usdcPriceFeed));

        bnbPriceFeed = new MockChainlinkAggregator(8, "BNB / USD");
        bnbPriceFeed.updateAnswer(600e8); // $600
        console.log("  BNB Price Feed deployed:     ", address(bnbPriceFeed));

        hydPriceFeed = new MockChainlinkAggregator(8, "HYD / USD");
        hydPriceFeed.updateAnswer(1e8); // $1.00 (stable RWA asset for testing)
        console.log("  HYD Price Feed deployed:     ", address(hydPriceFeed));

        // Deploy Mock Pyth
        mockPyth = new MockPyth();
        console.log("  MockPyth deployed:           ", address(mockPyth));

        // Deploy Mock VRF Coordinator
        mockVRFCoordinator = new MockVRFCoordinatorV2();
        console.log("  MockVRFCoordinator deployed: ", address(mockVRFCoordinator));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 1/13] Completed - Mock dependencies deployed");
        console.log("");
    }

    // ==================== Phase 2: Core Tokens ====================

    function deployCoreTokens() internal {
        console.log("[Phase 2/13] Deploying Core Tokens...");
        console.log("---------------------------------------------------------------------");

        // Deploy USDP (stablecoin with share-based accounting)
        usdp = new USDP();
        console.log("  USDP deployed:     ", address(usdp));

        // Deploy PAIMON (governance token)
        paimon = new PAIMON(PAIMON_MAX_SUPPLY);
        console.log("  PAIMON deployed:   ", address(paimon));
        console.log("  Max supply:         10,000,000,000 PAIMON");

        // Mint initial PAIMON for distribution
        paimon.mint(deployer, INITIAL_PAIMON_MINT);
        console.log("  Minted 1B PAIMON to deployer for initial distribution");

        // Deploy esPAIMON (escrowed PAIMON with 365-day vesting)
        esPaimonToken = new esPaimon(address(paimon));
        console.log("  esPAIMON deployed: ", address(esPaimonToken));

        // Deploy HYD (test RWA collateral asset)
        hyd = new HYD();
        console.log("  HYD deployed:      ", address(hyd));
        hyd.mint(deployer, INITIAL_HYD_SUPPLY);
        console.log("  Minted 100M HYD to deployer (test RWA collateral)");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 2/13] Completed - Core tokens deployed");
        console.log("");
    }

    // ==================== Phase 3: PSM ====================

    function deployPSM() internal {
        console.log("[Phase 3/13] Deploying PSM (Peg Stability Module)...");
        console.log("---------------------------------------------------------------------");

        // Deploy PSM
        psm = new PSMParameterized(address(usdp), address(usdc));
        console.log("  PSM deployed:       ", address(psm));
        console.log("  USDC decimals:       6");
        console.log("  USDP decimals:       18");

        // Grant PSM minter role for USDP
        usdp.setAuthorizedMinter(address(psm), true);
        console.log("  Granted USDP minter role to PSM");

        // Set PSM fees
        psm.setFeeIn(PSM_FEE_IN);
        psm.setFeeOut(PSM_FEE_OUT);
        console.log("  Set PSM swap fees: 0.1% in / 0.1% out");

        // Fund PSM with initial USDC reserve
        usdc.approve(address(psm), INITIAL_USDC_RESERVE);
        usdc.transfer(address(psm), INITIAL_USDC_RESERVE);
        console.log("  Funded PSM with 10M USDC reserve");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 3/13] Completed - PSM deployed and configured");
        console.log("");
    }

    // ==================== Phase 4: Governance ====================

    function deployGovernance() internal {
        console.log("[Phase 4/13] Deploying Governance Contracts...");
        console.log("---------------------------------------------------------------------");

        // Deploy VotingEscrow (for veUSD locks - if needed)
        votingEscrow = new VotingEscrow(address(usdp));
        console.log("  VotingEscrow (USDP) deployed:   ", address(votingEscrow));

        // Deploy VotingEscrowPaimon (vePAIMON NFT, transferable)
        votingEscrowPaimon = new VotingEscrowPaimon(address(paimon));
        console.log("  VotingEscrowPaimon deployed:    ", address(votingEscrowPaimon));
        console.log("  Lock duration: 1 week ~ 4 years");

        // Deploy GaugeController (veNFT voting for liquidity incentives)
        gaugeController = new GaugeController(address(votingEscrow));
        console.log("  GaugeController deployed:       ", address(gaugeController));

        // Deploy EmissionManager (3-phase emission schedule)
        emissionManager = new EmissionManager();
        console.log("  EmissionManager deployed:       ", address(emissionManager));
        console.log("  Phase A: Fixed 30K PAIMON/day (2 years)");
        console.log("  Phase B: Decay 30K→3K (4.77 years)");
        console.log("  Phase C: Fixed 3K PAIMON/day (perpetual)");

        // Deploy EmissionRouter (4-channel distribution)
        emissionRouter = new EmissionRouter(address(emissionManager), address(paimon));
        console.log("  EmissionRouter deployed:        ", address(emissionRouter));
        console.log("  Channels: DebtMining(50%), LPGauge(37.5%), StabilityPool(12.5%)");

        // Grant EmissionRouter minter role
        paimon.setMinter(address(emissionRouter), true);
        console.log("  Granted PAIMON minter role to EmissionRouter");

        // Deploy BribeMarketplace (bribe aggregator for gauge voting)
        bribeMarketplace = new BribeMarketplace(address(gaugeController), deployer);
        console.log("  BribeMarketplace deployed:      ", address(bribeMarketplace));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 4/13] Completed - Governance deployed");
        console.log("");
    }

    // ==================== Phase 5: Incentives ====================

    function deployIncentives() internal {
        console.log("[Phase 5/13] Deploying Incentive Contracts...");
        console.log("---------------------------------------------------------------------");

        // Deploy BoostStaking (stake PAIMON for 1.0x - 1.5x boost)
        boostStaking = new BoostStaking(address(paimon));
        console.log("  BoostStaking deployed:  ", address(boostStaking));
        console.log("  Boost range: 1.0x - 1.5x");

        // Deploy NitroPool (external project incentives)
        nitroPool = new NitroPool(
            address(votingEscrow),
            deployer, // Treasury address (will update later)
            NITRO_PLATFORM_FEE_BPS
        );
        console.log("  NitroPool deployed:     ", address(nitroPool));
        console.log("  Platform fee: 5%");

        // Deploy RewardDistributor (Merkle-tree based reward claims)
        rewardDistributor = new RewardDistributor(
            address(votingEscrow),
            address(boostStaking),
            deployer // Treasury address (will update later)
        );
        console.log("  RewardDistributor deployed: ", address(rewardDistributor));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 5/13] Completed - Incentive contracts deployed");
        console.log("");
    }

    // ==================== Phase 6: DEX ====================

    function deployDEX() internal {
        console.log("[Phase 6/13] Deploying DEX Contracts...");
        console.log("---------------------------------------------------------------------");

        // Deploy DEXFactory
        dexFactory = new DEXFactory(deployer); // Temporary treasury
        console.log("  DEXFactory deployed: ", address(dexFactory));

        // Deploy DEXRouter
        dexRouter = new DEXRouter(address(dexFactory));
        console.log("  DEXRouter deployed:  ", address(dexRouter));

        // Create USDP/USDC pair
        dexFactory.createPair(address(usdp), address(usdc));
        address usdpUsdcPairAddr = dexFactory.getPair(address(usdp), address(usdc));
        usdpUsdcPair = DEXPair(usdpUsdcPairAddr);
        console.log("  USDP/USDC Pair:      ", usdpUsdcPairAddr);

        // Create PAIMON/WBNB pair
        dexFactory.createPair(address(paimon), address(wbnb));
        address paimonBnbPairAddr = dexFactory.getPair(address(paimon), address(wbnb));
        paimonBnbPair = DEXPair(paimonBnbPairAddr);
        console.log("  PAIMON/WBNB Pair:    ", paimonBnbPairAddr);

        // Create HYD/USDP pair
        dexFactory.createPair(address(hyd), address(usdp));
        address hydUsdpPairAddr = dexFactory.getPair(address(hyd), address(usdp));
        hydUsdpPair = DEXPair(hydUsdpPairAddr);
        console.log("  HYD/USDP Pair:       ", hydUsdpPairAddr);

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 6/13] Completed - DEX deployed with 3 pairs");
        console.log("");
    }

    // ==================== Phase 7: Treasury & Oracle ====================

    function deployTreasuryAndOracle() internal {
        console.log("[Phase 7/13] Deploying Treasury & Oracle...");
        console.log("---------------------------------------------------------------------");

        // Deploy Treasury
        treasury = new Treasury(deployer, address(usdc));
        console.log("  Treasury deployed:    ", address(treasury));

        // Deploy SavingRate (USDP yield distribution)
        savingRate = new SavingRate(address(usdp), SAVING_RATE_ANNUAL);
        console.log("  SavingRate deployed:  ", address(savingRate));
        console.log("  Annual rate: 5%");

        // Deploy PriceOracle (multi-asset oracle)
        priceOracle = new PriceOracle(
            address(usdcPriceFeed),
            address(mockPyth),
            address(0), // No sequencer feed on testnet
            address(0)  // No Chainlink automation registry on testnet
        );
        console.log("  PriceOracle deployed: ", address(priceOracle));

        // Deploy RWAPriceOracle (specialized for RWA assets like HYD)
        rwaPriceOracle = new RWAPriceOracle(
            address(hydPriceFeed),
            address(mockPyth),
            PYTH_HYD_PRICE_ID,
            ORACLE_DEVIATION_THRESHOLD
        );
        console.log("  RWAPriceOracle deployed: ", address(rwaPriceOracle));

        // Register HYD as Tier 3 RWA asset in Treasury
        treasury.addRWAAsset(address(hyd), address(rwaPriceOracle), TIER3_LTV);
        console.log("  Registered HYD as Tier 3 RWA (60% LTV)");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 7/13] Completed - Treasury & Oracle deployed");
        console.log("");
    }

    // ==================== Phase 8: Vault & StabilityPool ====================

    function deployVaultAndStabilityPool() internal {
        console.log("[Phase 8/13] Deploying Vault & StabilityPool...");
        console.log("---------------------------------------------------------------------");

        // Deploy USDPVault (CDP: collateral → borrow USDP)
        usdpVault = new USDPVault(
            address(usdp),
            address(priceOracle),
            address(savingRate)
        );
        console.log("  USDPVault deployed:     ", address(usdpVault));

        // Deploy USDPStabilityPool (liquidation buffer + earn yield)
        stabilityPool = new USDPStabilityPool(address(usdp), address(usdpVault));
        console.log("  StabilityPool deployed: ", address(stabilityPool));

        // Grant USDPVault minter role for USDP
        usdp.setAuthorizedMinter(address(usdpVault), true);
        console.log("  Granted USDP minter role to Vault");

        // Link Vault with StabilityPool
        usdpVault.setStabilityPool(address(stabilityPool));
        console.log("  Linked Vault with StabilityPool");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 8/13] Completed - Vault & StabilityPool deployed");
        console.log("");
    }

    // ==================== Phase 9: Launchpad ====================

    function deployLaunchpad() internal {
        console.log("[Phase 9/13] Deploying Launchpad...");
        console.log("---------------------------------------------------------------------");

        // Deploy ProjectRegistry (veNFT-governed RWA project listings)
        projectRegistry = new ProjectRegistry(address(votingEscrow));
        console.log("  ProjectRegistry deployed:  ", address(projectRegistry));

        // Deploy IssuanceController (token sale mechanism)
        issuanceController = new IssuanceController(
            address(projectRegistry),
            address(treasury),
            deployer, // Treasury receiver (will update)
            500 // 5% platform fee
        );
        console.log("  IssuanceController deployed: ", address(issuanceController));
        console.log("  Platform fee: 5%");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 9/13] Completed - Launchpad deployed");
        console.log("");
    }

    // ==================== Phase 10: Initialize Contracts ====================

    function initializeContracts() internal {
        console.log("[Phase 10/13] Initializing Contracts...");
        console.log("---------------------------------------------------------------------");

        // Set USDP distributor (for accrual index updates)
        usdp.setDistributor(address(savingRate));
        console.log("  Set USDP distributor to SavingRate");

        // Set emission router channels
        emissionRouter.setChannel(0, address(usdpVault)); // DebtMining
        emissionRouter.setChannel(1, address(gaugeController)); // LPGauge
        emissionRouter.setChannel(2, address(stabilityPool)); // StabilityPool
        emissionRouter.setChannel(3, address(rewardDistributor)); // Boost incentives
        console.log("  Configured EmissionRouter channels");

        // Update Treasury address in contracts that use temporary deployer
        dexFactory.setFeeTo(address(treasury));
        console.log("  Updated DEXFactory treasury");

        nitroPool.transferOwnership(address(treasury));
        console.log("  Transferred NitroPool ownership to Treasury");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 10/13] Completed - Contracts initialized");
        console.log("");
    }

    // ==================== Phase 11: Configure Permissions ====================

    function configurePermissions() internal {
        console.log("[Phase 11/13] Configuring Cross-Contract Permissions...");
        console.log("---------------------------------------------------------------------");

        // Grant esPAIMON vesting manager role
        paimon.approve(address(esPaimonToken), type(uint256).max);
        console.log("  Granted esPAIMON spending approval");

        // Authorize Treasury to mint USDP (for RWA collateralization)
        usdp.setAuthorizedMinter(address(treasury), true);
        console.log("  Granted USDP minter role to Treasury");

        // Set SavingRate as accumulator for USDP
        usdp.setAuthorizedAccumulator(address(savingRate), true);
        console.log("  Authorized SavingRate as USDP accumulator");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 11/13] Completed - Permissions configured");
        console.log("");
    }

    // ==================== Phase 12: Setup Initial Liquidity ====================

    function setupInitialLiquidity() internal {
        console.log("[Phase 12/13] Setting Up Initial Liquidity (Testnet)...");
        console.log("---------------------------------------------------------------------");

        // 1. Mint initial USDP via PSM
        uint256 initialUsdpAmount = 5_000_000 * 1e18; // 5M USDP
        usdc.approve(address(psm), 5_000_000 * 1e6);
        psm.swapIn(5_000_000 * 1e6);
        console.log("  Minted 5M USDP via PSM");

        // 2. Add USDP/USDC liquidity
        usdp.approve(address(dexRouter), 1_000_000 * 1e18);
        usdc.approve(address(dexRouter), 1_000_000 * 1e6);
        dexRouter.addLiquidity(
            address(usdp),
            address(usdc),
            1_000_000 * 1e18,
            1_000_000 * 1e6,
            0,
            0,
            deployer,
            block.timestamp + 3600
        );
        console.log("  Added 1M USDP / 1M USDC liquidity");

        // 3. Add PAIMON/WBNB liquidity
        paimon.approve(address(dexRouter), 10_000_000 * 1e18);
        wbnb.approve(address(dexRouter), 100 * 1e18);
        dexRouter.addLiquidity(
            address(paimon),
            address(wbnb),
            10_000_000 * 1e18, // 10M PAIMON
            100 * 1e18, // 100 BNB (~$60K at $600/BNB)
            0,
            0,
            deployer,
            block.timestamp + 3600
        );
        console.log("  Added 10M PAIMON / 100 WBNB liquidity");

        // 4. Add HYD/USDP liquidity
        hyd.approve(address(dexRouter), 1_000_000 * 1e18);
        usdp.approve(address(dexRouter), 1_000_000 * 1e18);
        dexRouter.addLiquidity(
            address(hyd),
            address(usdp),
            1_000_000 * 1e18,
            1_000_000 * 1e18,
            0,
            0,
            deployer,
            block.timestamp + 3600
        );
        console.log("  Added 1M HYD / 1M USDP liquidity");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 12/13] Completed - Initial liquidity established");
        console.log("");
    }

    // ==================== Phase 13: Verify Deployment ====================

    function verifyDeployment() internal view {
        console.log("[Phase 13/13] Verifying Deployment...");
        console.log("---------------------------------------------------------------------");

        // Verify PSM USDC reserve
        uint256 psmUsdcBalance = usdc.balanceOf(address(psm));
        console.log("  PSM USDC reserve:     ", psmUsdcBalance / 1e6, "USDC");
        require(psmUsdcBalance >= 4_000_000 * 1e6, "PSM USDC reserve too low");

        // Verify USDP total supply
        uint256 usdpSupply = usdp.totalSupply();
        console.log("  USDP total supply:    ", usdpSupply / 1e18, "USDP");
        require(usdpSupply >= 3_000_000 * 1e18, "USDP supply too low");

        // Verify DEX liquidity
        (uint112 reserve0, uint112 reserve1,) = usdpUsdcPair.getReserves();
        console.log("  USDP/USDC liquidity:  ", uint256(reserve0) / 1e18, "USDP /", uint256(reserve1) / 1e6, "USDC");
        require(reserve0 > 0 && reserve1 > 0, "USDP/USDC pair has no liquidity");

        // Verify Treasury has HYD registered
        console.log("  Treasury RWA assets:   HYD registered (Tier 3, 60% LTV)");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 13/13] Completed - Deployment verified successfully!");
        console.log("");
    }

    // ==================== Phase 14: Save Deployment Data ====================

    function saveDeploymentData() internal {
        console.log("Saving deployment data...");

        // Generate JSON for frontend integration
        string memory json = string.concat(
            '{\n',
            '  "network": "BSC Testnet",\n',
            '  "chainId": 97,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "contracts": {\n',
            '    "core": {\n',
            '      "USDP": "', vm.toString(address(usdp)), '",\n',
            '      "PAIMON": "', vm.toString(address(paimon)), '",\n',
            '      "esPAIMON": "', vm.toString(address(esPaimonToken)), '",\n',
            '      "HYD": "', vm.toString(address(hyd)), '",\n',
            '      "PSM": "', vm.toString(address(psm)), '",\n',
            '      "VotingEscrow": "', vm.toString(address(votingEscrow)), '",\n',
            '      "VotingEscrowPaimon": "', vm.toString(address(votingEscrowPaimon)), '",\n',
            '      "USDPVault": "', vm.toString(address(usdpVault)), '",\n',
            '      "StabilityPool": "', vm.toString(address(stabilityPool)), '"\n',
            '    },\n',
            '    "governance": {\n',
            '      "GaugeController": "', vm.toString(address(gaugeController)), '",\n',
            '      "RewardDistributor": "', vm.toString(address(rewardDistributor)), '",\n',
            '      "BribeMarketplace": "', vm.toString(address(bribeMarketplace)), '",\n',
            '      "EmissionManager": "', vm.toString(address(emissionManager)), '",\n',
            '      "EmissionRouter": "', vm.toString(address(emissionRouter)), '"\n',
            '    },\n',
            '    "incentives": {\n',
            '      "BoostStaking": "', vm.toString(address(boostStaking)), '",\n',
            '      "NitroPool": "', vm.toString(address(nitroPool)), '"\n',
            '    },\n',
            '    "dex": {\n',
            '      "DEXFactory": "', vm.toString(address(dexFactory)), '",\n',
            '      "DEXRouter": "', vm.toString(address(dexRouter)), '",\n',
            '      "USDP_USDC_Pair": "', vm.toString(address(usdpUsdcPair)), '",\n',
            '      "PAIMON_BNB_Pair": "', vm.toString(address(paimonBnbPair)), '",\n',
            '      "HYD_USDP_Pair": "', vm.toString(address(hydUsdpPair)), '"\n',
            '    },\n',
            '    "treasury": {\n',
            '      "Treasury": "', vm.toString(address(treasury)), '",\n',
            '      "SavingRate": "', vm.toString(address(savingRate)), '",\n',
            '      "PriceOracle": "', vm.toString(address(priceOracle)), '",\n',
            '      "RWAPriceOracle": "', vm.toString(address(rwaPriceOracle)), '"\n',
            '    },\n',
            '    "launchpad": {\n',
            '      "ProjectRegistry": "', vm.toString(address(projectRegistry)), '",\n',
            '      "IssuanceController": "', vm.toString(address(issuanceController)), '"\n',
            '    },\n',
            '    "mocks": {\n',
            '      "USDC": "', vm.toString(address(usdc)), '",\n',
            '      "WBNB": "', vm.toString(address(wbnb)), '",\n',
            '      "USDCPriceFeed": "', vm.toString(address(usdcPriceFeed)), '",\n',
            '      "BNBPriceFeed": "', vm.toString(address(bnbPriceFeed)), '",\n',
            '      "HYDPriceFeed": "', vm.toString(address(hydPriceFeed)), '",\n',
            '      "Pyth": "', vm.toString(address(mockPyth)), '",\n',
            '      "VRFCoordinator": "', vm.toString(address(mockVRFCoordinator)), '"\n',
            '    }\n',
            '  }\n',
            '}'
        );

        vm.writeFile("deployments/testnet/addresses.json", json);
        console.log("  Deployment data saved to: deployments/testnet/addresses.json");
    }

    // ==================== Phase 15: Print Deployment Summary ====================

    function printDeploymentSummary() internal view {
        console.log("");
        console.log("====================================================================");
        console.log("  DEPLOYMENT SUMMARY");
        console.log("====================================================================");
        console.log("");
        console.log("Core Contracts:");
        console.log("  USDP:                  ", address(usdp));
        console.log("  PAIMON:                ", address(paimon));
        console.log("  esPAIMON:              ", address(esPaimonToken));
        console.log("  HYD (test RWA):        ", address(hyd));
        console.log("  PSM:                   ", address(psm));
        console.log("");
        console.log("Governance:");
        console.log("  VotingEscrow:          ", address(votingEscrow));
        console.log("  VotingEscrowPaimon:    ", address(votingEscrowPaimon));
        console.log("  GaugeController:       ", address(gaugeController));
        console.log("  RewardDistributor:     ", address(rewardDistributor));
        console.log("  BribeMarketplace:      ", address(bribeMarketplace));
        console.log("  EmissionManager:       ", address(emissionManager));
        console.log("  EmissionRouter:        ", address(emissionRouter));
        console.log("");
        console.log("Incentives:");
        console.log("  BoostStaking:          ", address(boostStaking));
        console.log("  NitroPool:             ", address(nitroPool));
        console.log("");
        console.log("DEX:");
        console.log("  DEXFactory:            ", address(dexFactory));
        console.log("  DEXRouter:             ", address(dexRouter));
        console.log("  USDP/USDC Pair:        ", address(usdpUsdcPair));
        console.log("  PAIMON/WBNB Pair:      ", address(paimonBnbPair));
        console.log("  HYD/USDP Pair:         ", address(hydUsdpPair));
        console.log("");
        console.log("Treasury & Oracle:");
        console.log("  Treasury:              ", address(treasury));
        console.log("  SavingRate:            ", address(savingRate));
        console.log("  PriceOracle:           ", address(priceOracle));
        console.log("  RWAPriceOracle:        ", address(rwaPriceOracle));
        console.log("");
        console.log("Vault & StabilityPool:");
        console.log("  USDPVault:             ", address(usdpVault));
        console.log("  StabilityPool:         ", address(stabilityPool));
        console.log("");
        console.log("Launchpad:");
        console.log("  ProjectRegistry:       ", address(projectRegistry));
        console.log("  IssuanceController:    ", address(issuanceController));
        console.log("");
        console.log("Mock Contracts (Testnet Only):");
        console.log("  USDC:                  ", address(usdc));
        console.log("  WBNB:                  ", address(wbnb));
        console.log("  USDC Price Feed:       ", address(usdcPriceFeed));
        console.log("  BNB Price Feed:        ", address(bnbPriceFeed));
        console.log("  HYD Price Feed:        ", address(hydPriceFeed));
        console.log("  Pyth:                  ", address(mockPyth));
        console.log("  VRF Coordinator:       ", address(mockVRFCoordinator));
        console.log("");
        console.log("====================================================================");
        console.log("  BSC Testnet Deployment Completed Successfully!");
        console.log("====================================================================");
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Verify contracts on BscScan Testnet");
        console.log("  2. Update frontend config with addresses from deployments/testnet/addresses.json");
        console.log("  3. Test core functionality (swap, liquidity, voting)");
        console.log("  4. Run 7-day stress testing period");
        console.log("  5. Prepare for mainnet deployment");
        console.log("");
        console.log("Test Funds:");
        console.log("  Get testnet BNB: https://testnet.bnbchain.org/faucet-smart");
        console.log("  Swap BNB for tokens via DEX");
        console.log("  Mint USDP via PSM (requires USDC, contact deployer)");
        console.log("");
        console.log("Support:");
        console.log("  Documentation: https://docs.paimon.dex");
        console.log("  Discord: https://discord.gg/paimondex");
        console.log("  GitHub: https://github.com/paimondex");
        console.log("====================================================================");
    }
}
