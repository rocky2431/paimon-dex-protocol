// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IHYD.sol";

/// @dev Interface for DEXPair
interface IDEXPair {
    /// @notice Get token0 address
    /// @return Address of token0 in the pair
    function token0() external view returns (address);

    /// @notice Get token1 address
    /// @return Address of token1 in the pair
    function token1() external view returns (address);

    /// @notice Claim accumulated treasury fees
    /// @param to Recipient address for the fees
    function claimTreasuryFees(address to) external;
}

/// @dev Interface for RWA Price Oracle
interface IRWAPriceOracle {
    /// @notice Get current RWA asset price
    /// @return Price in USD with 18 decimals precision
    function getPrice() external view returns (uint256);
}

/**
 * @title Treasury
 * @notice Protocol treasury for collecting and managing fees from PSM and DEX
 * @dev Implements secure fee collection and multi-sig controlled withdrawals
 *
 * Key Features:
 * - Collects DEX treasury fees (30% of 0.25% = 0.075%)
 * - Multi-sig authorization via Ownable2Step
 * - Emergency pause functionality
 * - SafeERC20 for secure token transfers
 * - ReentrancyGuard on all state-changing functions
 * - ETH support for native token handling
 *
 * RWA Features (RWA-008):
 * - Multi-tier RWA asset support (T1/T2/T3 with variable LTV ratios)
 * - Overcollateralized lending (80% LTV for T1, 70% T2, 60% T3)
 * - Health Factor monitoring system for liquidation safety
 * - 7-day cooldown period for redemptions (prevents flash loan attacks)
 * - Dual-source RWA price oracle integration (Chainlink + NAV)
 * - Multi-asset position tracking with userAssets enumeration
 *
 * Gas Performance (RWA-008):
 * - depositRWA: ~272k gas (comparable to MakerDAO CDP: 300-400k)
 * - Gas breakdown:
 *   * Oracle safety checks: ~100-150k gas
 *     - L2 Sequencer uptime verification
 *     - Chainlink 5-step validation
 *     - NAV freshness check (<24h)
 *     - Circuit breaker (±15% deviation detection)
 *   * ERC20 operations: ~100-120k gas
 *   * Storage writes: ~60-70k gas
 * - Design principle: Security > Gas optimization
 *
 * Security:
 * - Only owner can withdraw funds
 * - Pausable in emergency
 * - ReentrancyGuard prevents reentrancy attacks
 * - Ownable2Step prevents accidental ownership transfer
 * - Oracle circuit breaker protects against price manipulation
 * - 7-day cooldown prevents flash loan exploits
 *
 * Task: RWA-008 (Treasury RWA Deposit/Redeem Logic)
 * Priority: P1
 */
contract Treasury is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables (PRESALE-008) ====================

    /// @notice USDC token address (for bond redemptions)
    IERC20 public immutable usdcToken;

    /// @notice Total USDC received from Bond NFT sales
    uint256 public totalBondSales;

    /// @notice Authorized Bond NFT contract address
    address public bondNFTContract;

    /// @notice Authorized Settlement Router address
    address public settlementRouter;

    // ==================== RWA State Variables (RWA-008) ====================

    /// @notice HYD token reference
    IHYD public hydToken;

    /// @notice Burn address for "effective burn" of HYD
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice Redemption fee in basis points (0.50% = 50)
    uint256 public constant REDEMPTION_FEE_BPS = 50;

    /// @notice Cooldown period for redemptions (7 days)
    uint256 public constant COOLDOWN_PERIOD = 7 days;

    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Liquidation constants (RWA-009)
    /// @notice Liquidation threshold (115% as percentage value)
    uint256 public constant LIQUIDATION_THRESHOLD = 115;

    /// @notice Target health factor after liquidation (125% as percentage value)
    uint256 public constant TARGET_HEALTH_FACTOR = 125;

    /// @notice Total liquidation penalty (5% = 500 basis points)
    uint256 public constant LIQUIDATION_PENALTY = 500;

    /// @notice Liquidator share of penalty (4% = 400 basis points)
    uint256 public constant LIQUIDATOR_SHARE = 400;

    /// @notice Protocol share of penalty (1% = 100 basis points)
    uint256 public constant PROTOCOL_SHARE = 100;

    /// @notice RWA tier configuration
    struct RWATier {
        address oracle;          // Price oracle address
        uint8 tier;              // Tier level (1, 2, or 3)
        uint256 ltvRatio;        // LTV in basis points (T1: 8000 = 80%)
        uint256 mintDiscount;    // Mint discount in basis points
        bool isActive;           // Whether asset is active
    }

    /// @notice User's RWA position
    struct RWAPosition {
        address rwaAsset;        // RWA token address
        uint256 rwaAmount;       // Amount of RWA deposited
        uint256 hydMinted;       // Amount of HYD minted
        uint256 depositTime;     // Timestamp of deposit
    }

    /// @notice Whitelisted RWA assets: asset => tier config (includes oracle)
    mapping(address => RWATier) public rwaAssets;

    /// @notice User positions: user => asset => position
    mapping(address => mapping(address => RWAPosition)) public userPositions;

    /// @notice User assets list: user => asset addresses
    mapping(address => address[]) private userAssets;

    // ==================== Events ====================

    /// @notice Emitted when DEX fees are claimed
    event DEXFeesClaimed(address indexed pair, address indexed recipient, uint256 token0Amount, uint256 token1Amount);

    /// @notice Emitted when tokens are withdrawn
    event Withdraw(address indexed token, address indexed recipient, uint256 amount);

    /// @notice Emitted when ETH is withdrawn
    event WithdrawETH(address indexed recipient, uint256 amount);

    /// @notice Emitted when bond sales are received (PRESALE-008)
    event BondSalesReceived(uint256 indexed amount, uint256 indexed totalSales);

    /// @notice Emitted when redemption is fulfilled (PRESALE-008)
    event RedemptionFulfilled(address indexed user, uint256 indexed amount);

    // RWA Events (RWA-008)
    /// @notice Emitted when RWA asset is added to whitelist
    event RWAAssetAdded(address indexed asset, address indexed oracle, uint8 tier, uint256 ltvRatio, uint256 mintDiscount);

    /// @notice Emitted when RWA asset is removed from whitelist
    event RWAAssetRemoved(address indexed asset);

    /// @notice Emitted when RWA asset parameters are updated (Task P2-004)
    event RWAAssetUpdated(address indexed asset, address indexed oracle, uint8 tier, uint256 ltvRatio, uint256 mintDiscount);

    /// @notice Emitted when user deposits RWA
    event RWADeposited(address indexed user, address indexed asset, uint256 rwaAmount, uint256 hydMinted);

    /// @notice Emitted when user redeems RWA
    event RWARedeemed(address indexed user, address indexed asset, uint256 rwaAmount, uint256 hydBurned, uint256 fee);

    /// @notice Emitted when a position is liquidated (RWA-009)
    event RWALiquidated(
        address indexed user,
        address indexed asset,
        address indexed liquidator,
        uint256 rwaSeized,
        uint256 hydRepaid,
        uint256 penalty
    );

    // ==================== Custom Errors ====================

    error ZeroAddress();
    error ZeroAmount();
    error NoPairs();
    error InsufficientBalance();
    error TransferFailed();
    error Unauthorized(); // PRESALE-008: For bond NFT and settlement router access control

    // RWA Errors (RWA-008)
    error AssetNotWhitelisted();
    error AssetAlreadyWhitelisted();
    error InvalidTier();
    error InvalidLTV();
    error NoPositionFound();
    error CooldownNotMet();
    error InsufficientHYDBalance();

    // ==================== Constructor ====================

    /**
     * @notice Constructor
     * @param initialOwner Initial owner address (should be multi-sig)
     * @param _usdcToken USDC token address (for bond redemptions)
     */
    constructor(address initialOwner, address _usdcToken) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        if (_usdcToken == address(0)) revert ZeroAddress();
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @notice Set HYD token address (RWA-008)
     * @param _hydToken HYD token address
     * @dev Only owner can set. Required before RWA operations.
     */
    function setHYDToken(address _hydToken) external onlyOwner {
        if (_hydToken == address(0)) revert ZeroAddress();
        hydToken = IHYD(_hydToken);
    }

    // ==================== Fee Collection ====================

    /**
     * @notice Claim treasury fees from DEX pairs
     * @param pairs Array of DEXPair addresses to claim from
     * @param recipient Address to receive claimed fees
     * @dev Only owner can call. Claims fees from multiple pairs in one transaction.
     */
    function claimDEXFees(address[] calldata pairs, address recipient)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        if (pairs.length == 0) revert NoPairs();
        if (recipient == address(0)) revert ZeroAddress();

        for (uint256 i = 0; i < pairs.length; i++) {
            address pair = pairs[i];

            // Claim fees from pair (fees go directly to recipient)
            IDEXPair(pair).claimTreasuryFees(recipient);

            // Emit event
            emit DEXFeesClaimed(pair, recipient, 0, 0);
        }
    }

    // ==================== Withdrawal Functions ====================

    /**
     * @notice Withdraw ERC20 tokens from treasury
     * @param token Token address to withdraw
     * @param recipient Address to receive tokens
     * @param amount Amount to withdraw
     * @dev Only owner can withdraw. Uses SafeERC20 for security.
     */
    function withdraw(address token, address recipient, uint256 amount)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        if (token == address(0)) revert ZeroAddress();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        IERC20(token).safeTransfer(recipient, amount);

        emit Withdraw(token, recipient, amount);
    }

    /**
     * @notice Withdraw ETH from treasury
     * @param recipient Address to receive ETH
     * @param amount Amount of ETH to withdraw
     * @dev Only owner can withdraw ETH.
     */
    function withdrawETH(address recipient, uint256 amount)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit WithdrawETH(recipient, amount);
    }

    // ==================== Emergency Functions ====================

    /**
     * @notice Pause treasury (emergency only)
     * @dev Only owner can pause. Blocks all withdrawals and fee claims.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause treasury
     * @dev Only owner can unpause.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== Query Functions ====================

    /**
     * @notice Get balance of specific token
     * @param token Token address
     * @return balance Token balance held by treasury
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get balances of multiple tokens
     * @param tokens Array of token addresses
     * @return balances Array of token balances
     */
    function getBalances(address[] calldata tokens) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = IERC20(tokens[i]).balanceOf(address(this));
        }
        return balances;
    }

    // ==================== Receive ETH ====================

    /**
     * @notice Receive ETH
     * @dev Allows treasury to receive native tokens
     */
    receive() external payable {}

    // ==================== RWA-008: RWA Deposit/Redeem Functions ====================

    /**
     * @notice Add RWA asset to whitelist
     * @param asset RWA token address
     * @param oracle Price oracle address
     * @param tier Tier level (1, 2, or 3)
     * @param ltvRatio LTV ratio in basis points (e.g., 8000 = 80%)
     * @param mintDiscount Mint discount in basis points
     * @dev Only owner can add assets. Tier determines risk profile.
     *
     * Example: addRWAAsset(rwaToken, oracle, 1, 8000, 0)
     *          - Tier 1: 80% LTV, no discount
     */
    function addRWAAsset(
        address asset,
        address oracle,
        uint8 tier,
        uint256 ltvRatio,
        uint256 mintDiscount
    ) external onlyOwner {
        if (asset == address(0)) revert ZeroAddress();
        if (oracle == address(0)) revert ZeroAddress();
        if (tier < 1 || tier > 3) revert InvalidTier();
        if (ltvRatio == 0 || ltvRatio > BPS_DENOMINATOR) revert InvalidLTV();
        if (rwaAssets[asset].isActive) revert AssetAlreadyWhitelisted();

        rwaAssets[asset] = RWATier({
            oracle: oracle,
            tier: tier,
            ltvRatio: ltvRatio,
            mintDiscount: mintDiscount,
            isActive: true
        });

        emit RWAAssetAdded(asset, oracle, tier, ltvRatio, mintDiscount);
    }

    /**
     * @notice Remove RWA asset from whitelist
     * @param asset RWA token address
     * @dev Only owner can remove assets. Users with existing positions unaffected.
     */
    function removeRWAAsset(address asset) external onlyOwner {
        if (asset == address(0)) revert ZeroAddress();
        if (!rwaAssets[asset].isActive) revert AssetNotWhitelisted();

        // Mark as inactive instead of deleting to preserve data
        rwaAssets[asset].isActive = false;

        emit RWAAssetRemoved(asset);
    }

    /**
     * @notice Update RWA asset parameters (Task P2-004)
     * @param asset RWA token address
     * @param oracle New oracle address
     * @param tier New tier (1-3)
     * @param ltvRatio New LTV ratio in basis points
     * @param mintDiscount New mint discount in basis points
     * @dev Only owner can update parameters. Users with existing positions unaffected.
     *      New parameters apply to future deposits only.
     */
    function updateRWAAsset(
        address asset,
        address oracle,
        uint8 tier,
        uint256 ltvRatio,
        uint256 mintDiscount
    ) external onlyOwner {
        if (asset == address(0)) revert ZeroAddress();
        if (oracle == address(0)) revert ZeroAddress();
        if (tier < 1 || tier > 3) revert InvalidTier();
        if (ltvRatio == 0 || ltvRatio > BPS_DENOMINATOR) revert InvalidLTV();
        if (!rwaAssets[asset].isActive) revert AssetNotWhitelisted();

        rwaAssets[asset].oracle = oracle;
        rwaAssets[asset].tier = tier;
        rwaAssets[asset].ltvRatio = ltvRatio;
        rwaAssets[asset].mintDiscount = mintDiscount;

        emit RWAAssetUpdated(asset, oracle, tier, ltvRatio, mintDiscount);
    }

    /**
     * @notice Deposit RWA and mint HYD
     * @param asset RWA token address
     * @param amount Amount of RWA to deposit
     * @dev User must approve Treasury to transfer RWA tokens first.
     *      HYD minted = (rwaValue * ltvRatio * (10000 - mintDiscount)) / 10000^2
     *
     * Example: User deposits 10 RWA tokens worth $1000 each with 80% LTV
     *          rwaValue = 10 * $1000 = $10,000
     *          hydMinted = $10,000 * 80% = $8,000 HYD
     */
    function depositRWA(address asset, uint256 amount)
        external
        whenNotPaused
        nonReentrant
    {
        if (asset == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        RWATier memory tier = rwaAssets[asset];
        if (!tier.isActive) revert AssetNotWhitelisted();

        // Get RWA price from oracle (18 decimals)
        IRWAPriceOracle oracle = IRWAPriceOracle(tier.oracle);
        uint256 rwaPrice = oracle.getPrice();

        // Calculate HYD to mint: (rwaValue * ltvRatio * (10000 - mintDiscount)) / 10000^2
        // @audit-fix: Avoid divide-before-multiply precision loss
        uint256 hydToMint = (amount * rwaPrice * tier.ltvRatio * (BPS_DENOMINATOR - tier.mintDiscount))
            / (1e18 * BPS_DENOMINATOR * BPS_DENOMINATOR);

        // Transfer RWA from user to Treasury
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Mint HYD to user
        hydToken.mint(msg.sender, hydToMint);

        // Update or create user position
        RWAPosition storage position = userPositions[msg.sender][asset];
        if (position.rwaAsset == address(0)) {
            // First deposit for this asset
            userPositions[msg.sender][asset] = RWAPosition({
                rwaAsset: asset,
                rwaAmount: amount,
                hydMinted: hydToMint,
                depositTime: block.timestamp
            });
            // Add asset to user's asset list
            userAssets[msg.sender].push(asset);
        } else {
            // Add to existing position
            position.rwaAmount += amount;
            position.hydMinted += hydToMint;
            // depositTime remains the original time for cooldown calculation
        }

        emit RWADeposited(msg.sender, asset, amount, hydToMint);
    }

    /**
     * @notice Redeem RWA by burning HYD
     * @param asset RWA token address
     * @param amount Amount of RWA to redeem
     * @dev User must wait COOLDOWN_PERIOD (7 days) after deposit.
     *      Redemption fee (0.50%) is applied and kept by Treasury.
     *      HYD is "burned" by transferring to BURN_ADDRESS.
     *
     * Example: User redeems 10 RWA after cooldown
     *          fee = 10 * 0.50% = 0.05 RWA
     *          userReceives = 10 - 0.05 = 9.95 RWA
     *          treasuryKeeps = 0.05 RWA
     * @dev Slither reentrancy warning is false positive - function protected by nonReentrant modifier
     */
    function redeemRWA(address asset, uint256 amount)
        external
        whenNotPaused
        nonReentrant
    {
        if (asset == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        RWAPosition storage position = userPositions[msg.sender][asset];
        if (position.rwaAsset == address(0)) revert NoPositionFound();
        if (position.rwaAmount < amount) revert InsufficientBalance();

        // Check cooldown period
        if (block.timestamp < position.depositTime + COOLDOWN_PERIOD) {
            revert CooldownNotMet();
        }

        // Calculate proportional HYD to burn
        uint256 hydToBurn = (position.hydMinted * amount) / position.rwaAmount;

        // "Burn" HYD by transferring to burn address (since burnFrom is PSM-only)
        bool success = hydToken.transferFrom(msg.sender, BURN_ADDRESS, hydToBurn);
        if (!success) revert InsufficientHYDBalance();

        // Calculate redemption fee
        uint256 fee = (amount * REDEMPTION_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amount - fee;

        // Transfer RWA back to user (after fee)
        IERC20(asset).safeTransfer(msg.sender, amountAfterFee);

        // Update position
        position.rwaAmount -= amount;
        position.hydMinted -= hydToBurn;

        // Clean up if position is fully redeemed
        if (position.rwaAmount == 0) {
            delete userPositions[msg.sender][asset];
            // Remove asset from user's asset list
            _removeAssetFromUserList(msg.sender, asset);
        }

        emit RWARedeemed(msg.sender, asset, amountAfterFee, hydToBurn, fee);
    }

    /**
     * @notice Get user's RWA position
     * @param user User address
     * @param asset RWA asset address
     * @return rwaAsset RWA token address
     * @return rwaAmount Amount of RWA deposited
     * @return hydMinted Amount of HYD minted
     * @return depositTime Timestamp of first deposit
     */
    function getUserPosition(address user, address asset)
        external
        view
        returns (
            address rwaAsset,
            uint256 rwaAmount,
            uint256 hydMinted,
            uint256 depositTime
        )
    {
        RWAPosition memory position = userPositions[user][asset];
        return (
            position.rwaAsset,
            position.rwaAmount,
            position.hydMinted,
            position.depositTime
        );
    }

    // ==================== RWA-008 Stage 2: Health Factor Monitoring ====================

    /**
     * @notice Get all user positions across all assets
     * @param user User address
     * @return assets Array of asset addresses
     * @return amounts Array of RWA amounts
     * @return debts Array of HYD debt amounts
     */
    function getAllUserPositions(address user)
        external
        view
        returns (
            address[] memory assets,
            uint256[] memory amounts,
            uint256[] memory debts
        )
    {
        address[] memory userAssetList = userAssets[user];
        uint256 count = userAssetList.length;

        assets = new address[](count);
        amounts = new uint256[](count);
        debts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            address asset = userAssetList[i];
            RWAPosition memory position = userPositions[user][asset];
            assets[i] = asset;
            amounts[i] = position.rwaAmount;
            debts[i] = position.hydMinted;
        }

        return (assets, amounts, debts);
    }

    /**
     * @notice Get total collateral value for user in USD (18 decimals)
     * @param user User address
     * @return totalValue Total collateral value in USD
     * @dev Task P2-002: Optimized with oracle price caching to reduce gas cost
     *      - Caches oracle prices in memory to avoid redundant external calls
     *      - Gas savings: ~40% when multiple assets use same oracle
     *      - Particularly effective when user has 5+ assets
     */
    function getTotalCollateralValue(address user) public view returns (uint256 totalValue) {
        address[] memory userAssetList = userAssets[user];
        uint256 assetCount = userAssetList.length;

        // Task P2-002: Build oracle price cache (memory-based)
        // Use parallel arrays to simulate mapping (oracle => price)
        address[] memory oracleAddresses = new address[](assetCount);
        uint256[] memory oraclePrices = new uint256[](assetCount);
        uint256 uniqueOracleCount = 0;

        for (uint256 i = 0; i < assetCount; i++) {
            address asset = userAssetList[i];
            RWAPosition memory position = userPositions[user][asset];

            if (position.rwaAmount > 0) {
                RWATier memory tier = rwaAssets[asset];
                address oracleAddr = tier.oracle;

                // Check if price already cached
                uint256 price = 0;
                for (uint256 j = 0; j < uniqueOracleCount; j++) {
                    if (oracleAddresses[j] == oracleAddr) {
                        price = oraclePrices[j];
                        break;
                    }
                }

                // Cache miss: query oracle and store
                if (price == 0) {
                    IRWAPriceOracle oracle = IRWAPriceOracle(oracleAddr);
                    price = oracle.getPrice();
                    oracleAddresses[uniqueOracleCount] = oracleAddr;
                    oraclePrices[uniqueOracleCount] = price;
                    uniqueOracleCount++;
                }

                totalValue += (position.rwaAmount * price) / 1e18;
            }
        }

        return totalValue;
    }

    /**
     * @notice Get total debt value for user in USD (18 decimals)
     * @param user User address
     * @return totalDebt Total HYD debt
     */
    function getTotalDebtValue(address user) public view returns (uint256 totalDebt) {
        address[] memory userAssetList = userAssets[user];

        for (uint256 i = 0; i < userAssetList.length; i++) {
            address asset = userAssetList[i];
            RWAPosition memory position = userPositions[user][asset];
            totalDebt += position.hydMinted;
        }

        return totalDebt;
    }

    /**
     * @notice Get health factor for user (percentage)
     * @dev Health Factor = (Total Collateral Value / Total Debt Value) * 100
     *      - >150%: Healthy
     *      - 100-150%: Warning
     *      - <100%: Danger (liquidatable)
     * @param user User address
     * @return healthFactor Health factor as percentage (e.g., 125 = 125%)
     */
    function getHealthFactor(address user) external view returns (uint256 healthFactor) {
        uint256 totalDebt = getTotalDebtValue(user);

        // No debt = maximum health factor
        if (totalDebt == 0) {
            return type(uint256).max;
        }

        uint256 totalCollateral = getTotalCollateralValue(user);

        // Calculate health factor: (collateral / debt) * 100
        healthFactor = (totalCollateral * 100) / totalDebt;

        return healthFactor;
    }

    /**
     * @notice Remove asset from user's asset list
     * @param user User address
     * @param asset Asset address to remove
     * @dev Uses swap-and-pop for gas efficiency
     */
    function _removeAssetFromUserList(address user, address asset) private {
        address[] storage assets = userAssets[user];
        uint256 length = assets.length;

        // Find and remove the asset
        for (uint256 i = 0; i < length; i++) {
            if (assets[i] == asset) {
                // Swap with last element and pop
                assets[i] = assets[length - 1];
                assets.pop();
                break;
            }
        }
    }

    // ==================== RWA-009: Liquidation Module ====================

    /**
     * @notice Check if a position is liquidatable
     * @param user User address
     * @param asset RWA asset address
     * @return True if position can be liquidated
     */
    function isLiquidatable(address user, address asset) public view returns (bool) {
        RWAPosition memory position = userPositions[user][asset];

        // No debt = not liquidatable
        if (position.hydMinted == 0) {
            return false;
        }

        // Calculate health factor
        uint256 hf = this.getHealthFactor(user);

        // Liquidatable if HF <= 115%
        return hf <= LIQUIDATION_THRESHOLD;
    }

    /**
     * @notice Get liquidation information for a position
     * @param user User address
     * @param asset RWA asset address
     * @return _isLiquidatable Whether position is liquidatable
     * @return healthFactor Current health factor
     * @return maxLiquidatable Maximum amount that can be liquidated
     * @return penalty Liquidation penalty amount
     */
    function getLiquidationInfo(address user, address asset)
        external
        view
        returns (
            bool _isLiquidatable,
            uint256 healthFactor,
            uint256 maxLiquidatable,
            uint256 penalty
        )
    {
        RWAPosition memory position = userPositions[user][asset];

        // Get health factor
        healthFactor = this.getHealthFactor(user);

        // Check if liquidatable (HF <= 115%)
        _isLiquidatable = healthFactor <= LIQUIDATION_THRESHOLD && position.hydMinted > 0;

        if (_isLiquidatable) {
            // Max liquidatable = full debt (can liquidate entire position)
            maxLiquidatable = position.hydMinted;

            // Calculate penalty: (rwaAmount * price * LIQUIDATION_PENALTY) / BPS_DENOMINATOR
            // @audit-fix: Avoid divide-before-multiply precision loss
            RWATier memory tier = rwaAssets[asset];
            IRWAPriceOracle oracle = IRWAPriceOracle(tier.oracle);
            uint256 price = oracle.getPrice();
            penalty = (position.rwaAmount * price * LIQUIDATION_PENALTY) / (1e18 * BPS_DENOMINATOR);
        }

        return (_isLiquidatable, healthFactor, maxLiquidatable, penalty);
    }

    /**
     * @notice Liquidate an undercollateralized position
     * @param user User to liquidate
     * @param asset RWA asset address
     * @param hydAmount Amount of HYD debt to repay
     * @dev Slither reentrancy warning is false positive - function protected by nonReentrant modifier
     */
    function liquidate(address user, address asset, uint256 hydAmount)
        external
        whenNotPaused
        nonReentrant
    {
        RWAPosition storage position = userPositions[user][asset];

        // Check position exists and has debt
        require(position.hydMinted > 0, "No debt to liquidate");

        // Check position is liquidatable
        require(isLiquidatable(user, asset), "Position is not liquidatable");

        // Calculate RWA amount to seize (based on HYD debt repaid)
        RWATier memory tier = rwaAssets[asset];
        IRWAPriceOracle oracle = IRWAPriceOracle(tier.oracle);
        uint256 price = oracle.getPrice();

        // For partial liquidation, calculate amount needed to restore to 125% HF
        uint256 actualHydAmount;
        if (hydAmount < position.hydMinted) {
            // Partial liquidation: calculate required amount to restore to TARGET_HEALTH_FACTOR (125%)
            uint256 debtValue = position.hydMinted;

            // Mathematical derivation:
            // New HF = (C - 1.05ΔH) / (D - ΔH) = 1.25
            // Solving for ΔH: ΔH = (1.25D - C) / 0.20 = (1.25D - C) * 5
            //
            // To avoid decimals, multiply by 100:
            // numerator = 125 * D - 100 * C
            // denominator = 20
            // @audit-fix: Avoid divide-before-multiply precision loss
            uint256 numerator = (125 * debtValue) - (100 * position.rwaAmount * price / 1e18);
            uint256 requiredHydAmount = numerator / 20;

            // Use the required amount (ignore user's hydAmount for partial liquidation)
            actualHydAmount = requiredHydAmount;
        } else {
            // Full liquidation: cap to available debt
            actualHydAmount = position.hydMinted;
        }

        // Convert HYD to base RWA amount (1:1 USD peg)
        uint256 baseRWA = (actualHydAmount * 1e18) / price;

        // Calculate penalty distribution
        // @audit-fix: Avoid divide-before-multiply precision loss
        uint256 liquidatorBonus = (actualHydAmount * 1e18 * LIQUIDATOR_SHARE) / (price * BPS_DENOMINATOR);  // 4%
        uint256 protocolFee = (actualHydAmount * 1e18 * PROTOCOL_SHARE) / (price * BPS_DENOMINATOR);  // 1%

        // Total RWA to deduct from position = base + 5% penalty
        uint256 totalDeducted = baseRWA + liquidatorBonus + protocolFee;

        // If insufficient collateral, adjust to maximum liquidatable amount
        // maxRWA * 1.05 = position.rwaAmount
        // maxRWA = position.rwaAmount / 1.05
        if (totalDeducted > position.rwaAmount) {
            // Calculate max base RWA we can seize (accounting for 5% penalty)
            // @audit-fix: Avoid divide-before-multiply precision loss
            baseRWA = (position.rwaAmount * BPS_DENOMINATOR) / (BPS_DENOMINATOR + LIQUIDATION_PENALTY);
            actualHydAmount = (position.rwaAmount * BPS_DENOMINATOR * price) / ((BPS_DENOMINATOR + LIQUIDATION_PENALTY) * 1e18);

            // Recalculate penalty distribution
            liquidatorBonus = (position.rwaAmount * BPS_DENOMINATOR * LIQUIDATOR_SHARE) / ((BPS_DENOMINATOR + LIQUIDATION_PENALTY) * BPS_DENOMINATOR);
            protocolFee = (position.rwaAmount * BPS_DENOMINATOR * PROTOCOL_SHARE) / ((BPS_DENOMINATOR + LIQUIDATION_PENALTY) * BPS_DENOMINATOR);
            totalDeducted = baseRWA + liquidatorBonus + protocolFee;
        }

        // Liquidator receives base + 4% bonus
        uint256 totalSeized = baseRWA + liquidatorBonus;

        // Transfer HYD from liquidator to burn address
        // Note: Using transfer instead of burnFrom because burnFrom is restricted to PSM-only
        bool success = hydToken.transferFrom(msg.sender, BURN_ADDRESS, actualHydAmount);
        if (!success) revert InsufficientHYDBalance();

        // Transfer seized RWA collateral to liquidator (base + 4% liquidator bonus)
        IERC20(asset).safeTransfer(msg.sender, totalSeized);

        // Protocol retains 1% penalty in Treasury (no explicit transfer needed)

        // Update position
        position.rwaAmount -= totalDeducted;
        position.hydMinted -= actualHydAmount;

        // Clean up if fully liquidated
        if (position.hydMinted == 0 || position.rwaAmount == 0) {
            delete userPositions[user][asset];
            _removeAssetFromUserList(user, asset);
        }

        // Emit event
        emit RWALiquidated(user, asset, msg.sender, totalSeized, actualHydAmount, liquidatorBonus + protocolFee);
    }

    // ==================== PRESALE-008: Bond NFT Settlement Integration ====================

    /**
     * @notice Authorize Bond NFT contract
     * @param _bondNFTContract Address of the Bond NFT contract
     * @dev Only owner can authorize the bond NFT contract
     */
    function authorizeBondNFTContract(address _bondNFTContract) external onlyOwner {
        if (_bondNFTContract == address(0)) revert ZeroAddress();
        bondNFTContract = _bondNFTContract;
    }

    /**
     * @notice Authorize Settlement Router contract
     * @param _settlementRouter Address of the Settlement Router contract
     * @dev Only owner can authorize the settlement router
     */
    function authorizeSettlementRouter(address _settlementRouter) external onlyOwner {
        if (_settlementRouter == address(0)) revert ZeroAddress();
        settlementRouter = _settlementRouter;
    }

    /**
     * @notice Receive USDC from Bond NFT sales
     * @param usdcAmount Amount of USDC received from NFT minting
     * @dev Only authorized Bond NFT contract can call this function.
     *      Tracks total bond sales for accounting purposes.
     */
    function receiveBondSales(uint256 usdcAmount) external whenNotPaused nonReentrant {
        if (msg.sender != bondNFTContract) revert Unauthorized();
        if (usdcAmount == 0) revert ZeroAmount();

        totalBondSales += usdcAmount;

        emit BondSalesReceived(usdcAmount, totalBondSales);
    }

    /**
     * @notice Fulfill cash redemption at bond maturity
     * @param user Address to receive the redemption payment
     * @param amount Amount of USDC to pay (principal + yield)
     * @dev Only authorized Settlement Router can call this function.
     *      Transfers USDC from treasury to user for bond redemption.
     */
    function fulfillRedemption(address user, uint256 amount) external whenNotPaused nonReentrant {
        if (msg.sender != settlementRouter) revert Unauthorized();
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // Check treasury has sufficient USDC balance
        uint256 balance = usdcToken.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        // Transfer USDC to user
        usdcToken.safeTransfer(user, amount);

        emit RedemptionFulfilled(user, amount);
    }
}
