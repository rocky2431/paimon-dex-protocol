// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./USDP.sol";
import "./USDPStabilityPool.sol";
import "../oracle/RWAPriceOracle.sol";
import "../treasury/SavingRate.sol";

/**
 * @title USDPVault
 * @notice Collateralized debt position (CDP) vault for minting USDP against RWA collateral
 * @dev Implements deposit/withdraw/borrow/repay/liquidate with LTV-based borrowing limits
 *
 * Key Features:
 * - Multi-collateral support with configurable LTV ratios
 * - Health factor-based liquidation mechanism
 * - Integration with RWAPriceOracle for dual-source pricing
 * - Pausable for emergency stops
 * - Reentrancy protection on all state-changing functions
 *
 * Collateralization Tiers:
 * - T1 (US Treasuries): 80% LTV
 * - T2 (Investment-grade credit): 65% LTV
 * - T3 (RWA revenue pools): 50% LTV
 *
 * Health Factor Calculation:
 * HF = (collateralUSD * liquidationThreshold) / debtUSD
 * - HF >= 1.0: Position is healthy
 * - HF < 1.0: Position can be liquidated
 *
 * Task: 38 - USDPVault.sol Implementation
 */
contract USDPVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice USDP stablecoin contract
    USDP public immutable usdp;

    /// @notice RWA price oracle for collateral valuation
    RWAPriceOracle public immutable oracle;

    /// @notice Saving rate contract for yield distribution
    SavingRate public immutable savingRate;

    /// @notice Stability pool for liquidation proceeds
    USDPStabilityPool public stabilityPool;

    /// @notice User collateral balances: user => collateral => amount
    mapping(address => mapping(address => uint256)) private _collateralBalances;

    /// @notice User debt balances: user => debt amount in USDP
    mapping(address => uint256) private _debts;

    /// @notice Total debt across all users
    uint256 private _totalDebt;

    /// @notice Collateral configuration
    struct CollateralConfig {
        uint256 ltv; // Loan-to-value ratio (basis points, e.g., 8000 = 80%)
        uint256 liquidationThreshold; // Threshold for liquidation (basis points)
        uint256 liquidationPenalty; // Penalty for liquidator (basis points)
        bool isActive; // Whether this collateral is currently accepted
    }

    /// @notice Mapping of collateral address to configuration
    mapping(address => CollateralConfig) public collateralConfigs;

    /// @notice List of supported collateral addresses
    address[] public supportedCollaterals;

    // ==================== Constants ====================

    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant PRICE_PRECISION = 1e18; // Price oracle precision

    // ==================== Events ====================

    event Deposit(address indexed user, address indexed collateral, uint256 amount);
    event Withdraw(address indexed user, address indexed collateral, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Liquidated(
        address indexed user,
        address indexed liquidator,
        uint256 debtRepaid,
        address collateral,
        uint256 collateralSeized
    );
    event CollateralAdded(address indexed collateral, uint256 ltv, uint256 threshold, uint256 penalty);
    event CollateralUpdated(address indexed collateral, uint256 ltv, uint256 threshold, uint256 penalty);
    event StabilityPoolSet(address indexed stabilityPool);

    // ==================== Constructor ====================

    /**
     * @notice Initialize USDPVault
     * @param _usdp USDP stablecoin address
     * @param _oracle RWAPriceOracle address
     * @param _savingRate SavingRate contract address
     */
    constructor(address _usdp, address _oracle, address _savingRate) Ownable(msg.sender) {
        require(_usdp != address(0), "Invalid USDP address");
        require(_oracle != address(0), "Invalid oracle address");
        require(_savingRate != address(0), "Invalid savingRate address");

        usdp = USDP(_usdp);
        oracle = RWAPriceOracle(_oracle);
        savingRate = SavingRate(_savingRate);
    }

    // ==================== Core Functions ====================

    /**
     * @notice Deposit collateral into vault
     * @param collateral Collateral token address
     * @param amount Amount to deposit
     */
    function deposit(address collateral, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(collateralConfigs[collateral].isActive, "Collateral not supported");

        // Transfer collateral from user
        IERC20(collateral).safeTransferFrom(msg.sender, address(this), amount);

        // Update user balance
        _collateralBalances[msg.sender][collateral] += amount;

        emit Deposit(msg.sender, collateral, amount);
    }

    /**
     * @notice Withdraw collateral from vault
     * @param collateral Collateral token address
     * @param amount Amount to withdraw
     */
    function withdraw(address collateral, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(_collateralBalances[msg.sender][collateral] >= amount, "Insufficient collateral");

        // Update user balance first (CEI pattern)
        _collateralBalances[msg.sender][collateral] -= amount;

        // Check if position remains healthy after withdrawal
        if (_debts[msg.sender] > 0) {
            require(healthFactor(msg.sender) >= PRICE_PRECISION, "Withdraw would make position unhealthy");
        }

        // Transfer collateral to user
        IERC20(collateral).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, collateral, amount);
    }

    /**
     * @notice Borrow USDP against collateral
     * @param amount Amount of USDP to borrow
     * @dev Task P1-005: Multi-collateral positions must be rejected
     */
    function borrow(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");

        // P1-005: Reject multi-collateral positions (same as healthFactor check)
        require(_countUserCollaterals(msg.sender) <= 1, "Multi-collateral not supported");

        // Calculate max borrowable amount
        uint256 maxBorrow = _calculateMaxBorrow(msg.sender);
        uint256 currentDebt = _debts[msg.sender];

        require(maxBorrow > currentDebt, "Insufficient collateral");
        require(currentDebt + amount <= maxBorrow, "Borrow would exceed max LTV");

        // Update debt
        _debts[msg.sender] += amount;
        _totalDebt += amount;

        // Mint USDP to user
        usdp.mint(msg.sender, amount);

        // TODO: Integrate with SavingRate for yield distribution
        // This requires proper access control setup
        // savingRate.fund(amount / 100);

        emit Borrow(msg.sender, amount);
    }

    /**
     * @notice Repay USDP debt
     * @param amount Amount of USDP to repay
     */
    function repay(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        uint256 currentDebt = _debts[msg.sender];
        require(amount <= currentDebt, "Repay exceeds debt");

        // Burn USDP from user
        usdp.burnFrom(msg.sender, amount);

        // Update debt
        _debts[msg.sender] -= amount;
        _totalDebt -= amount;

        emit Repay(msg.sender, amount);
    }

    /**
     * @notice Liquidate unhealthy position
     * @param user User to liquidate
     * @param debtAmount Amount of debt to repay
     * @dev Collateral is transferred to StabilityPool for distribution to depositors
     */
    function liquidate(address user, uint256 debtAmount) external nonReentrant {
        require(debtAmount > 0, "Amount must be greater than 0");
        require(_debts[user] > 0, "No debt to liquidate");
        require(healthFactor(user) < PRICE_PRECISION, "Position is healthy");
        require(address(stabilityPool) != address(0), "StabilityPool not set");

        uint256 maxRepay = _debts[user] / 2; // Max 50% of debt in single liquidation
        require(debtAmount <= maxRepay, "Exceeds max liquidation amount");

        // Check stability pool has sufficient liquidity
        require(stabilityPool.totalDeposits() >= debtAmount, "Insufficient liquidity in pool");

        // Burn USDP from stability pool (FIX: P0-003 accounting mismatch)
        // This ensures balanceOf(pool) and _totalDeposits decrease together
        usdp.burnFrom(address(stabilityPool), debtAmount);

        // Update debt
        _debts[user] -= debtAmount;
        _totalDebt -= debtAmount;

        // Calculate collateral to seize (with liquidation penalty)
        // TODO: Implement multi-collateral liquidation logic
        address collateral = supportedCollaterals[0]; // Simplified: use first collateral
        uint256 collateralPrice = oracle.getPrice();
        uint256 collateralAmount = (debtAmount * PRICE_PRECISION) / collateralPrice;

        // Add liquidation penalty
        CollateralConfig memory config = collateralConfigs[collateral];
        uint256 penalty = (collateralAmount * config.liquidationPenalty) / BASIS_POINTS;
        uint256 totalSeized = collateralAmount + penalty;

        // Reduce user's collateral balance
        _collateralBalances[user][collateral] -= totalSeized;

        // Transfer collateral to StabilityPool
        IERC20(collateral).safeTransfer(address(stabilityPool), totalSeized);

        // Notify StabilityPool of liquidation proceeds
        stabilityPool.onLiquidationProceeds(debtAmount, collateral, totalSeized);

        emit Liquidated(user, msg.sender, debtAmount, collateral, totalSeized);
    }

    // ==================== View Functions ====================

    /**
     * @notice Get user's debt balance
     * @param user User address
     * @return Debt amount in USDP
     */
    function debtOf(address user) external view returns (uint256) {
        return _debts[user];
    }

    /**
     * @notice Get total debt across all users
     * @return Total debt in USDP
     */
    function totalDebt() external view returns (uint256) {
        return _totalDebt;
    }

    /**
     * @notice Get user's collateral balance
     * @param user User address
     * @param collateral Collateral token address
     * @return Collateral amount
     */
    function getCollateralBalance(address user, address collateral) external view returns (uint256) {
        return _collateralBalances[user][collateral];
    }

    /**
     * @notice Get total collateral value in USD for a user
     * @param user User address
     * @return Total collateral value in USD (18 decimals)
     */
    function getCollateralValueUSD(address user) public view returns (uint256) {
        uint256 totalValue = 0;
        uint256 price = oracle.getPrice();

        for (uint256 i = 0; i < supportedCollaterals.length; i++) {
            address collateral = supportedCollaterals[i];
            uint256 balance = _collateralBalances[user][collateral];

            if (balance > 0) {
                totalValue += (balance * price) / PRICE_PRECISION;
            }
        }

        return totalValue;
    }

    /**
     * @notice Calculate health factor for a user
     * @param user User address
     * @return Health factor (18 decimals, 1.0 = 1e18)
     * @dev Task P1-005: Multi-collateral positions revert until weighted health factor is implemented
     */
    function healthFactor(address user) public view returns (uint256) {
        // P1-005: Short-term fix - reject multi-collateral positions
        // Check this FIRST to ensure consistent behavior regardless of debt status
        // Long-term: implement weighted average liquidation threshold (P2 task)
        require(_countUserCollaterals(user) <= 1, "Multi-collateral not supported");

        uint256 debt = _debts[user];
        if (debt == 0) {
            return type(uint256).max;
        }

        uint256 collateralValue = getCollateralValueUSD(user);

        // TODO: Use weighted average liquidation threshold across collaterals
        // Simplified: use first collateral's threshold
        uint256 threshold = collateralConfigs[supportedCollaterals[0]].liquidationThreshold;

        uint256 adjustedCollateralValue = (collateralValue * threshold) / BASIS_POINTS;
        return (adjustedCollateralValue * PRICE_PRECISION) / debt;
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Count how many different collateral types a user has deposited
     * @param user User address
     * @return Number of collateral types with non-zero balance
     * @dev Task P1-005: Helper function for multi-collateral detection
     */
    function _countUserCollaterals(address user) private view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < supportedCollaterals.length; i++) {
            if (_collateralBalances[user][supportedCollaterals[i]] > 0) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Calculate maximum borrowable amount for a user
     * @param user User address
     * @return Max borrowable amount in USDP
     */
    function _calculateMaxBorrow(address user) internal view returns (uint256) {
        uint256 totalBorrowPower = 0;
        uint256 price = oracle.getPrice();

        for (uint256 i = 0; i < supportedCollaterals.length; i++) {
            address collateral = supportedCollaterals[i];
            uint256 balance = _collateralBalances[user][collateral];

            if (balance > 0) {
                CollateralConfig memory config = collateralConfigs[collateral];
                uint256 collateralValue = (balance * price) / PRICE_PRECISION;
                totalBorrowPower += (collateralValue * config.ltv) / BASIS_POINTS;
            }
        }

        return totalBorrowPower;
    }

    // ==================== Admin Functions ====================

    /**
     * @notice Add new collateral type
     * @param collateral Collateral token address
     * @param ltv Loan-to-value ratio (basis points)
     * @param liquidationThreshold Liquidation threshold (basis points)
     * @param liquidationPenalty Liquidation penalty (basis points)
     */
    function addCollateral(
        address collateral,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationPenalty
    ) external onlyOwner {
        require(collateral != address(0), "Invalid collateral address");
        require(!collateralConfigs[collateral].isActive, "Collateral already exists");
        require(ltv <= BASIS_POINTS, "LTV exceeds 100%");
        require(liquidationThreshold <= BASIS_POINTS, "Threshold exceeds 100%");
        require(liquidationPenalty <= BASIS_POINTS, "Penalty exceeds 100%");

        collateralConfigs[collateral] = CollateralConfig({
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationPenalty: liquidationPenalty,
            isActive: true
        });

        supportedCollaterals.push(collateral);

        emit CollateralAdded(collateral, ltv, liquidationThreshold, liquidationPenalty);
    }

    /**
     * @notice Update collateral parameters
     * @param collateral Collateral token address
     * @param ltv New LTV ratio
     * @param liquidationThreshold New liquidation threshold
     * @param liquidationPenalty New liquidation penalty
     */
    function updateCollateral(
        address collateral,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationPenalty
    ) external onlyOwner {
        require(collateralConfigs[collateral].isActive, "Collateral not found");
        require(ltv <= BASIS_POINTS, "LTV exceeds 100%");
        require(liquidationThreshold <= BASIS_POINTS, "Threshold exceeds 100%");
        require(liquidationPenalty <= BASIS_POINTS, "Penalty exceeds 100%");

        collateralConfigs[collateral].ltv = ltv;
        collateralConfigs[collateral].liquidationThreshold = liquidationThreshold;
        collateralConfigs[collateral].liquidationPenalty = liquidationPenalty;

        emit CollateralUpdated(collateral, ltv, liquidationThreshold, liquidationPenalty);
    }

    /**
     * @notice Set stability pool address
     * @param _stabilityPool Address of the stability pool contract
     */
    function setStabilityPool(address _stabilityPool) external onlyOwner {
        require(_stabilityPool != address(0), "Invalid stability pool address");
        stabilityPool = USDPStabilityPool(_stabilityPool);
        emit StabilityPoolSet(_stabilityPool);
    }

    /**
     * @notice Pause vault operations (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause vault operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
