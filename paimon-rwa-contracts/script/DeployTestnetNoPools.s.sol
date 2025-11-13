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
import "../src/dex/DEXRouter.sol";

// Treasury & Oracle
import "../src/treasury/Treasury.sol";
import "../src/treasury/SavingRate.sol";
import "../src/oracle/PriceOracle.sol";
import "../src/oracle/RWAPriceOracle.sol";

// Launchpad
import "../src/launchpad/ProjectRegistry.sol";
import "../src/launchpad/IssuanceController.sol";

// Mocks (testnet only - NO WBNB!)
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockChainlinkAggregator.sol";
import "../src/mocks/MockPyth.sol";
import "../src/mocks/MockVRFCoordinatorV2.sol";

/**
 * @title BSC Testnet Deployment Script (No Pools Version)
 * @notice Simplified deployment WITHOUT pre-deployed liquidity pools
 * @dev Key differences from full deployment:
 *      - NO MockWBNB deployment
 *      - NO liquidity pairs pre-created (USDP/USDC, PAIMON/WBNB, HYD/USDP)
 *      - DEXRouter uses address(0) for WBNB parameter
 *      - Users create pools dynamically via frontend
 *
 * Usage:
 *   forge script script/DeployTestnetNoPools.s.sol --rpc-url $BSC_TESTNET_RPC --broadcast --legacy
 */
contract DeployTestnetNoPoolsScript is Script {
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

    // ==================== DEX Contracts (NO POOLS) ====================

    DEXFactory public dexFactory;
    DEXRouter public dexRouter;

    // ==================== Treasury & Oracle ====================

    Treasury public treasury;
    SavingRate public savingRate;
    PriceOracle public priceOracle;
    RWAPriceOracle public rwaPriceOracle;

    // ==================== Launchpad ====================

    ProjectRegistry public projectRegistry;
    IssuanceController public issuanceController;

    // ==================== Mock Contracts (NO WBNB) ====================

    MockERC20 public usdc;
    MockChainlinkAggregator public usdcPriceFeed;
    MockChainlinkAggregator public hydPriceFeed;
    MockPyth public mockPyth;
    MockVRFCoordinatorV2 public mockVRFCoordinator;

    // ==================== Protocol Constants ====================

    uint256 public constant PAIMON_MAX_SUPPLY = 10_000_000_000 * 1e18; // 10B PAIMON
    uint256 public constant INITIAL_PAIMON_MINT = 1_000_000_000 * 1e18; // 1B for initial distribution
    uint256 public constant INITIAL_USDC_RESERVE = 1_000_000_000 * 1e6; // 1B USDC
    uint256 public constant INITIAL_HYD_SUPPLY = 10_000_000 * 1e18; // 10M HYD
    uint256 public constant PSM_FEE_IN = 10; // 0.1%
    uint256 public constant PSM_FEE_OUT = 10; // 0.1%
    uint256 public constant SAVING_RATE_ANNUAL = 500; // 5% APR
    uint256 public constant TIER3_LTV = 6000; // 60% for HYD

    // ==================== Main Deployment Function ====================

    function run() public {
        loadConfiguration();
        printDeploymentHeader();

        vm.startBroadcast(deployerPrivateKey);

        // Phase 1: Deploy Mock External Dependencies (NO WBNB)
        deployMockExternalDependencies();

        // Phase 2: Deploy Core Tokens
        deployCoreTokens();

        // Phase 3: Deploy PSM
        deployPSM();

        // Phase 4: Deploy Governance
        deployGovernance();

        // Phase 5: Deploy Incentives
        deployIncentives();

        // Phase 6: Deploy DEX (Factory + Router ONLY, NO POOLS)
        deployDEX();

        // Phase 7: Deploy Treasury & Oracle
        deployTreasuryAndOracle();

        // Phase 8: Deploy Vault & StabilityPool
        deployVaultAndStabilityPool();

        // Phase 9: Deploy Launchpad
        deployLaunchpad();

        // Phase 10: Initialize Contracts
        initializeContracts();

        // Phase 11: Configure Permissions
        configurePermissions();

        // Phase 12: Final Verification
        verifyDeployment();

        vm.stopBroadcast();

        // Save deployment data
        saveDeploymentData();

        printDeploymentSummary();
    }

    // ==================== Configuration ====================

    function loadConfiguration() internal {
        deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);
    }

    function printDeploymentHeader() internal view {
        console.log("");
        console.log("====================================================================");
        console.log("  Paimon.dex - BSC Testnet Deployment (NO POOLS)");
        console.log("====================================================================");
        console.log("Chain ID:         ", block.chainid);
        console.log("Deployer:         ", deployer);
        console.log("Block Number:     ", block.number);
        console.log("====================================================================");
        console.log("");
    }

    // ==================== Phase 1: Mock External Dependencies (NO WBNB) ====================

    function deployMockExternalDependencies() internal {
        console.log("[Phase 1/12] Deploying Mock External Dependencies (NO WBNB)...");
        console.log("---------------------------------------------------------------------");

        // Deploy Mock USDC
        usdc = new MockERC20("Mock USDC", "USDC", 6);
        usdc.mint(deployer, INITIAL_USDC_RESERVE);
        console.log("  MockUSDC deployed:            ", address(usdc));

        // Deploy Mock Chainlink Price Feeds
        usdcPriceFeed = new MockChainlinkAggregator(8, "USDC / USD");
        usdcPriceFeed.setLatestAnswer(1e8); // $1.00
        console.log("  USDC Price Feed deployed:     ", address(usdcPriceFeed));

        hydPriceFeed = new MockChainlinkAggregator(8, "HYD / USD");
        hydPriceFeed.setLatestAnswer(1e8); // $1.00
        console.log("  HYD Price Feed deployed:      ", address(hydPriceFeed));

        // Deploy Mock Pyth
        mockPyth = new MockPyth();
        console.log("  MockPyth deployed:            ", address(mockPyth));

        // Deploy Mock VRF Coordinator
        mockVRFCoordinator = new MockVRFCoordinatorV2();
        console.log("  MockVRFCoordinator deployed:  ", address(mockVRFCoordinator));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 1/12] Completed - Mock dependencies deployed (NO WBNB)");
        console.log("");
    }

    // ==================== Phase 2: Core Tokens ====================

    function deployCoreTokens() internal {
        console.log("[Phase 2/12] Deploying Core Tokens...");
        console.log("---------------------------------------------------------------------");

        // Deploy USDP
        usdp = new USDP();
        console.log("  USDP deployed:      ", address(usdp));

        // Deploy PAIMON
        paimon = new PAIMON(PAIMON_MAX_SUPPLY);
        paimon.mint(deployer, INITIAL_PAIMON_MINT);
        console.log("  PAIMON deployed:    ", address(paimon));

        // Deploy esPAIMON
        esPaimonToken = new esPaimon(address(paimon));
        console.log("  esPAIMON deployed:  ", address(esPaimonToken));

        // Deploy HYD
        hyd = new HYD();
        hyd.initTempPsm(deployer);
        hyd.mint(deployer, INITIAL_HYD_SUPPLY);
        console.log("  HYD deployed:       ", address(hyd));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 2/12] Completed - Core tokens deployed");
        console.log("");
    }

    // ==================== Phase 3: PSM ====================

    function deployPSM() internal {
        console.log("[Phase 3/12] Deploying PSM...");
        console.log("---------------------------------------------------------------------");

        psm = new PSMParameterized(address(usdp), address(usdc));
        usdp.setAuthorizedMinter(address(psm), true);
        psm.setFeeIn(PSM_FEE_IN);
        psm.setFeeOut(PSM_FEE_OUT);

        uint256 psmReserve = 10_000_000 * 1e6; // 10M USDC
        usdc.approve(address(psm), psmReserve);
        usdc.transfer(address(psm), psmReserve);

        console.log("  PSM deployed:        ", address(psm));
        console.log("  Funded with 10M USDC reserve");
        console.log("---------------------------------------------------------------------");
        console.log("[Phase 3/12] Completed - PSM deployed");
        console.log("");
    }

    // ==================== Phase 4: Governance ====================

    function deployGovernance() internal {
        console.log("[Phase 4/12] Deploying Governance...");
        console.log("---------------------------------------------------------------------");

        votingEscrow = new VotingEscrow(address(usdp));
        console.log("  VotingEscrow deployed:        ", address(votingEscrow));

        votingEscrowPaimon = new VotingEscrowPaimon(address(paimon));
        console.log("  VotingEscrowPaimon deployed:  ", address(votingEscrowPaimon));

        gaugeController = new GaugeController(address(votingEscrow));
        console.log("  GaugeController deployed:     ", address(gaugeController));

        emissionManager = new EmissionManager();
        console.log("  EmissionManager deployed:     ", address(emissionManager));

        emissionRouter = new EmissionRouter(address(emissionManager), address(paimon));
        paimon.grantRole(paimon.MINTER_ROLE(), address(emissionRouter));
        console.log("  EmissionRouter deployed:      ", address(emissionRouter));

        bribeMarketplace = new BribeMarketplace(address(gaugeController), deployer);
        console.log("  BribeMarketplace deployed:    ", address(bribeMarketplace));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 4/12] Completed - Governance deployed");
        console.log("");
    }

    // ==================== Phase 5: Incentives ====================

    function deployIncentives() internal {
        console.log("[Phase 5/12] Deploying Incentives...");
        console.log("---------------------------------------------------------------------");

        boostStaking = new BoostStaking(address(paimon));
        console.log("  BoostStaking deployed:   ", address(boostStaking));

        nitroPool = new NitroPool(address(votingEscrow), deployer, 500);
        console.log("  NitroPool deployed:      ", address(nitroPool));

        rewardDistributor = new RewardDistributor(address(esPaimonToken), address(paimon), address(boostStaking));
        console.log("  RewardDistributor deployed: ", address(rewardDistributor));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 5/12] Completed - Incentives deployed");
        console.log("");
    }

    // ==================== Phase 6: DEX (NO POOLS) ====================

    function deployDEX() internal {
        console.log("[Phase 6/12] Deploying DEX (Factory + Router ONLY, NO POOLS)...");
        console.log("---------------------------------------------------------------------");

        // Deploy DEXFactory
        dexFactory = new DEXFactory(deployer);
        console.log("  DEXFactory deployed:  ", address(dexFactory));

        // Deploy DEXRouter with address(0) for WBNB (supports pure ERC20 pairs)
        dexRouter = new DEXRouter(address(dexFactory));
        console.log("  DEXRouter deployed:   ", address(dexRouter));
        console.log("  WARNING: NO pools pre-deployed!");
        console.log("  NOTE: Router works with pure ERC20 pairs (no native BNB wrapping)");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 6/12] Completed - DEX deployed (NO POOLS)");
        console.log("");
    }

    // ==================== Phase 7: Treasury & Oracle ====================

    function deployTreasuryAndOracle() internal {
        console.log("[Phase 7/12] Deploying Treasury & Oracle...");
        console.log("---------------------------------------------------------------------");

        treasury = new Treasury(deployer, address(usdc));
        console.log("  Treasury deployed:        ", address(treasury));

        savingRate = new SavingRate(address(usdp), SAVING_RATE_ANNUAL);
        console.log("  SavingRate deployed:      ", address(savingRate));

        priceOracle = new PriceOracle(address(mockPyth), 500, 3600);
        console.log("  PriceOracle deployed:     ", address(priceOracle));

        rwaPriceOracle = new RWAPriceOracle(address(hydPriceFeed), address(0), deployer);
        console.log("  RWAPriceOracle deployed:  ", address(rwaPriceOracle));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 7/12] Completed - Treasury & Oracle deployed");
        console.log("");
    }

    // ==================== Phase 8: Vault & StabilityPool ====================

    function deployVaultAndStabilityPool() internal {
        console.log("[Phase 8/12] Deploying Vault & StabilityPool...");
        console.log("---------------------------------------------------------------------");

        usdpVault = new USDPVault(address(usdp), address(priceOracle), address(savingRate));
        console.log("  USDPVault deployed:       ", address(usdpVault));

        stabilityPool = new USDPStabilityPool(address(usdp), address(usdpVault));
        console.log("  StabilityPool deployed:   ", address(stabilityPool));

        usdp.setAuthorizedMinter(address(usdpVault), true);
        usdpVault.setStabilityPool(address(stabilityPool));

        // Add HYD as collateral
        usdpVault.addCollateral(address(hyd), TIER3_LTV, 7500, 500);
        console.log("  Added HYD as collateral (60% LTV)");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 8/12] Completed - Vault & StabilityPool deployed");
        console.log("");
    }

    // ==================== Phase 9: Launchpad ====================

    function deployLaunchpad() internal {
        console.log("[Phase 9/12] Deploying Launchpad...");
        console.log("---------------------------------------------------------------------");

        projectRegistry = new ProjectRegistry(deployer);
        console.log("  ProjectRegistry deployed:      ", address(projectRegistry));

        issuanceController = new IssuanceController(
            address(projectRegistry),
            address(usdc),
            address(treasury),
            address(votingEscrow)
        );
        console.log("  IssuanceController deployed:   ", address(issuanceController));

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 9/12] Completed - Launchpad deployed");
        console.log("");
    }

    // ==================== Phase 10: Initialize Contracts ====================

    function initializeContracts() internal {
        console.log("[Phase 10/12] Initializing Contracts...");
        console.log("---------------------------------------------------------------------");

        usdp.setDistributor(address(savingRate));
        console.log("  Set USDP distributor to SavingRate");

        dexFactory.setTreasury(address(treasury));
        console.log("  Set DEXFactory fee recipient to Treasury");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 10/12] Completed - Contracts initialized");
        console.log("");
    }

    // ==================== Phase 11: Configure Permissions ====================

    function configurePermissions() internal {
        console.log("[Phase 11/12] Configuring Permissions...");
        console.log("---------------------------------------------------------------------");

        usdp.setAuthorizedMinter(address(treasury), true);
        console.log("  Granted USDP minter role to Treasury");

        usdp.setAuthorizedMinter(address(savingRate), true);
        console.log("  Granted USDP minter role to SavingRate");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 11/12] Completed - Permissions configured");
        console.log("");
    }

    // ==================== Phase 12: Verification ====================

    function verifyDeployment() internal view {
        console.log("[Phase 12/12] Verifying Deployment...");
        console.log("---------------------------------------------------------------------");

        uint256 psmUsdcBalance = usdc.balanceOf(address(psm));
        console.log("  PSM USDC reserve:     ", psmUsdcBalance / 1e6, "USDC");

        uint256 usdpSupply = usdp.totalSupply();
        console.log("  USDP total supply:    ", usdpSupply / 1e18, "USDP");

        console.log("---------------------------------------------------------------------");
        console.log("[Phase 12/12] Completed - Deployment verified");
        console.log("");
    }

    // ==================== Save Deployment Data ====================

    function saveDeploymentData() internal {
        string memory json = string.concat(
            '{\n',
            '  "network": "BSC Testnet",\n',
            '  "chainId": 97,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "core": {\n',
            '    "usdp": "', vm.toString(address(usdp)), '",\n',
            '    "paimon": "', vm.toString(address(paimon)), '",\n',
            '    "esPaimon": "', vm.toString(address(esPaimonToken)), '",\n',
            '    "hyd": "', vm.toString(address(hyd)), '",\n',
            '    "psm": "', vm.toString(address(psm)), '",\n',
            '    "votingEscrow": "', vm.toString(address(votingEscrow)), '",\n',
            '    "votingEscrowPaimon": "', vm.toString(address(votingEscrowPaimon)), '",\n',
            '    "usdpVault": "', vm.toString(address(usdpVault)), '",\n',
            '    "stabilityPool": "', vm.toString(address(stabilityPool)), '"\n',
            '  },\n',
            '  "governance": {\n',
            '    "gaugeController": "', vm.toString(address(gaugeController)), '",\n',
            '    "rewardDistributor": "', vm.toString(address(rewardDistributor)), '",\n',
            '    "bribeMarketplace": "', vm.toString(address(bribeMarketplace)), '",\n',
            '    "emissionManager": "', vm.toString(address(emissionManager)), '",\n',
            '    "emissionRouter": "', vm.toString(address(emissionRouter)), '"\n',
            '  },\n',
            '  "incentives": {\n',
            '    "boostStaking": "', vm.toString(address(boostStaking)), '",\n',
            '    "nitroPool": "', vm.toString(address(nitroPool)), '"\n',
            '  },\n',
            '  "dex": {\n',
            '    "factory": "', vm.toString(address(dexFactory)), '",\n',
            '    "router": "', vm.toString(address(dexRouter)), '",\n',
            '    "pairs": {}\n',
            '  },\n',
            '  "treasury": {\n',
            '    "treasury": "', vm.toString(address(treasury)), '",\n',
            '    "savingRate": "', vm.toString(address(savingRate)), '",\n',
            '    "priceOracle": "', vm.toString(address(priceOracle)), '",\n',
            '    "rwaPriceOracle": "', vm.toString(address(rwaPriceOracle)), '"\n',
            '  },\n',
            '  "launchpad": {\n',
            '    "projectRegistry": "', vm.toString(address(projectRegistry)), '",\n',
            '    "issuanceController": "', vm.toString(address(issuanceController)), '"\n',
            '  },\n',
            '  "mocks": {\n',
            '    "usdc": "', vm.toString(address(usdc)), '",\n',
            '    "usdcPriceFeed": "', vm.toString(address(usdcPriceFeed)), '",\n',
            '    "hydPriceFeed": "', vm.toString(address(hydPriceFeed)), '",\n',
            '    "pyth": "', vm.toString(address(mockPyth)), '",\n',
            '    "vrfCoordinator": "', vm.toString(address(mockVRFCoordinator)), '"\n',
            '  }\n',
            '}'
        );

        vm.writeFile("deployments/testnet-nopools/addresses.json", json);
        console.log("Deployment data saved to: deployments/testnet-nopools/addresses.json");
        console.log("");
    }

    // ==================== Print Summary ====================

    function printDeploymentSummary() internal view {
        console.log("====================================================================");
        console.log("  DEPLOYMENT SUMMARY (NO POOLS VERSION)");
        console.log("====================================================================");
        console.log("");
        console.log("Core Contracts:");
        console.log("  USDP:                  ", address(usdp));
        console.log("  PAIMON:                ", address(paimon));
        console.log("  esPAIMON:              ", address(esPaimonToken));
        console.log("  HYD:                   ", address(hyd));
        console.log("  PSM:                   ", address(psm));
        console.log("");
        console.log("DEX (NO POOLS):");
        console.log("  DEXFactory:            ", address(dexFactory));
        console.log("  DEXRouter:             ", address(dexRouter));
        console.log("  WARNING: Pools must be created dynamically via frontend!");
        console.log("");
        console.log("====================================================================");
        console.log("  BSC Testnet Deployment Completed (NO POOLS)!");
        console.log("====================================================================");
        console.log("");
    }
}
