// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/oracle/RWAPriceOracle.sol";
import "../../src/treasury/Treasury.sol";
import "../../src/core/HYD.sol";
import "../../src/mocks/MockV3Aggregator.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title OracleGasOptimizationTest
 * @notice Test gas optimization for repeated oracle queries (Task P2-002)
 *
 * Expected gas savings:
 * - Single asset: ~50K gas (baseline, unchanged)
 * - 10 assets: from ~500K to ~300K (40% reduction via block-level caching)
 */
contract OracleGasOptimizationTest is Test {
    HYD public hyd;
    Treasury public treasury;
    RWAPriceOracle public oracle;

    address public user = address(0x1234);
    address public mockAsset;

    function setUp() public {
        // Set timestamp to avoid underflow
        vm.warp(10000);

        // Deploy HYD (no constructor parameters)
        hyd = new HYD();

        // Deploy mock Chainlink price feed (18 decimals for USD price)
        MockV3Aggregator priceFeed = new MockV3Aggregator(18, 100 * 1e18);
        // Set round data to pass validation checks
        priceFeed.updateRoundData(
            1, // roundId
            100 * 1e18, // answer ($100 per token, 18 decimals)
            block.timestamp - 3600, // startedAt (1 hour ago, within CHAINLINK_TIMEOUT)
            block.timestamp, // updatedAt (current time)
            1 // answeredInRound
        );

        // Deploy mock sequencer feed (required for L2 networks)
        // sequencer answer: 0 = up, 1 = down
        MockV3Aggregator sequencerFeed = new MockV3Aggregator(0, 0);
        // Set startedAt to ensure grace period check passes (GRACE_PERIOD = 3600 seconds = 1 hour)
        sequencerFeed.updateRoundData(
            1, // roundId
            0, // answer (0 = sequencer up)
            block.timestamp - 7200, // startedAt (2 hours ago, > GRACE_PERIOD)
            block.timestamp, // updatedAt
            1 // answeredInRound
        );

        // Deploy Oracle with correct constructor (chainlinkFeed, sequencerFeed, trustedOracle)
        // Note: Foundry testnet (chainId 31337) is treated as L2, so sequencer feed is required
        oracle = new RWAPriceOracle(
            address(priceFeed), // Mock Chainlink price feed
            address(sequencerFeed), // Mock sequencer feed
            address(this) // Trusted oracle (custodian)
        );

        // Set mock NAV price
        oracle.updateNAV(100 * 1e18); // $100 per token

        // Create mock USDC for Treasury
        address mockUSDC = address(new MockERC20("Mock USDC", "USDC"));

        // Deploy Treasury (initialOwner, usdcToken)
        treasury = new Treasury(address(this), mockUSDC);

        // Connect HYD to Treasury and authorize minting
        treasury.setHYDToken(address(hyd));
        hyd.authorizeMinter(address(treasury));

        // Create mock RWA asset
        mockAsset = address(new MockERC20("Mock RWA", "mRWA"));

        // Whitelist asset in Treasury
        treasury.addRWAAsset(mockAsset, address(oracle), 1, 8000, 0);

        // Fund user with mock assets
        deal(mockAsset, user, 1000 * 1e18);
    }

    /**
     * @notice Test P2-002: Measure gas for single oracle query (baseline)
     * Acceptance: Gas should remain ~50K (unchanged from current)
     */
    function test_GasCost_SingleAssetQuery() public {
        vm.startPrank(user);

        // Approve and deposit
        IERC20(mockAsset).approve(address(treasury), 100 * 1e18);
        treasury.depositRWA(mockAsset, 100 * 1e18);

        // Measure gas for getTotalCollateralValue (1 asset, 1 oracle call)
        uint256 gasBefore = gasleft();
        treasury.getTotalCollateralValue(user);
        uint256 gasUsed = gasBefore - gasleft();

        vm.stopPrank();

        // Log gas usage
        emit log_named_uint("Gas for 1 asset (baseline)", gasUsed);

        // Acceptance: Should be < 60K gas
        assertLt(gasUsed, 60_000, "Single asset query should use < 60K gas");
    }

    /**
     * @notice Test P2-002: Measure gas for 10 oracle queries
     * Acceptance: Gas should reduce from ~500K to ~300K (40% reduction)
     *
     * Optimization strategy: Block-level caching in Oracle
     * - First call: compute and cache (full cost)
     * - Subsequent calls in same block: return cache (minimal cost)
     */
    function test_GasCost_TenAssetsQuery() public {
        vm.startPrank(user);

        // Create and deposit 10 different assets (all using same Oracle for simplicity)
        for (uint256 i = 0; i < 10; i++) {
            address asset = address(new MockERC20(
                string(abi.encodePacked("Mock RWA ", vm.toString(i))),
                string(abi.encodePacked("mRWA", vm.toString(i)))
            ));

            // Whitelist asset
            vm.stopPrank();
            treasury.addRWAAsset(asset, address(oracle), 1, 8000, 0);
            vm.startPrank(user);

            // Fund and deposit
            deal(asset, user, 100 * 1e18);
            IERC20(asset).approve(address(treasury), 100 * 1e18);
            treasury.depositRWA(asset, 100 * 1e18);
        }

        // Measure gas for getTotalCollateralValue (10 assets, 10 oracle calls)
        uint256 gasBefore = gasleft();
        treasury.getTotalCollateralValue(user);
        uint256 gasUsed = gasBefore - gasleft();

        vm.stopPrank();

        // Log gas usage
        emit log_named_uint("Gas for 10 assets (optimized)", gasUsed);

        // Acceptance: Should be < 350K gas (30-40% reduction from 500K baseline)
        // Note: Without optimization, this would be ~500K gas
        assertLt(gasUsed, 350_000, "10 asset query should use < 350K gas (optimized)");
    }

    /**
     * @notice Test P2-002: Verify result consistency
     * Acceptance: Optimized results must match original results 100%
     */
    function test_ResultConsistency_MultipleQueriesSameBlock() public {
        vm.startPrank(user);

        // Deposit assets
        IERC20(mockAsset).approve(address(treasury), 100 * 1e18);
        treasury.depositRWA(mockAsset, 100 * 1e18);

        // Query multiple times in same block
        uint256 result1 = treasury.getTotalCollateralValue(user);
        uint256 result2 = treasury.getTotalCollateralValue(user);
        uint256 result3 = treasury.getTotalCollateralValue(user);

        vm.stopPrank();

        // All results must be identical
        assertEq(result1, result2, "Results must be consistent (query 1 vs 2)");
        assertEq(result2, result3, "Results must be consistent (query 2 vs 3)");
    }
}

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 1e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
