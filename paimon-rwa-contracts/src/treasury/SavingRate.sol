// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SavingRate - USDP Savings Contract with Daily Interest Accrual
 * @notice Users deposit USDP to earn interest funded by Treasury (RWA yields)
 * @dev Interest calculation: daily_interest = principal × annualRate / 365 / 10000
 *
 * Key Features:
 * - Annual rate: 200 bps (2% APR) by default
 * - Interest accrues daily based on time elapsed
 * - Users can deposit/withdraw principal anytime
 * - Users can claim accrued interest separately
 * - Owner can update annual rate
 *
 * Interest Calculation Example:
 * - Principal: 1000 USDP
 * - Annual rate: 200 bps (2%)
 * - Daily interest: 1000 × 200 / 365 / 10000 = 0.0547945 USDP/day
 * - After 30 days: 30 × 0.0547945 = 1.6438 USDP
 *
 * Precision Optimization:
 * - Multiply before divide to minimize precision loss
 * - Use seconds for precise time tracking
 * - Interest stored with 18 decimals
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 * - Owner-only rate updates
 */
contract SavingRate is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice USDP token contract
    IERC20 public immutable usdp;

    /// @notice Annual interest rate in basis points (200 = 2%)
    uint256 public annualRate;

    /// @notice Total USDP deposits across all users
    uint256 public totalDeposits;

    /// @notice User principal balances
    mapping(address => uint256) private _balances;

    /// @notice Accrued interest per user (18 decimals)
    mapping(address => uint256) private _accruedInterest;

    /// @notice Last accrual timestamp per user
    mapping(address => uint256) private _lastAccrualTime;

    // ==================== Constants ====================

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    // ==================== Events ====================

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event InterestClaimed(address indexed user, uint256 interest);
    event InterestAccrued(address indexed user, uint256 interest, uint256 timestamp);
    event AnnualRateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryFunded(address indexed funder, uint256 amount);

    // ==================== Constructor ====================

    /**
     * @notice Initialize SavingRate contract
     * @param _usdp USDP token address
     * @param _annualRate Initial annual rate in basis points (e.g., 200 = 2%)
     */
    constructor(address _usdp, uint256 _annualRate) Ownable(msg.sender) {
        require(_usdp != address(0), "Invalid USDP address");
        usdp = IERC20(_usdp);
        annualRate = _annualRate;

        emit AnnualRateUpdated(0, _annualRate);
    }

    // ==================== External Functions ====================

    /**
     * @notice Deposit USDP to start earning interest
     * @param amount Amount of USDP to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        // Accrue interest before updating balance
        _accrueInterestInternal(msg.sender);

        // Transfer USDP from user
        usdp.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        _balances[msg.sender] += amount;
        totalDeposits += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw USDP principal (does not include interest)
     * @param amount Amount of USDP to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance");

        // Accrue interest before updating balance
        _accrueInterestInternal(msg.sender);

        // Update state
        _balances[msg.sender] -= amount;
        totalDeposits -= amount;

        // Transfer USDP to user
        usdp.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim all accrued interest
     */
    function claimInterest() external nonReentrant {
        // Accrue latest interest
        _accrueInterestInternal(msg.sender);

        uint256 interest = _accruedInterest[msg.sender];
        require(interest > 0, "No interest to claim");

        // Reset accrued interest
        _accruedInterest[msg.sender] = 0;

        // Transfer interest to user
        usdp.safeTransfer(msg.sender, interest);

        emit InterestClaimed(msg.sender, interest);
    }

    /**
     * @notice Manually trigger interest accrual for a user
     * @param user User address to accrue interest for
     * @dev Can be called by anyone for any user (public utility function)
     */
    function accrueInterest(address user) external {
        _accrueInterestInternal(user);
    }

    /**
     * @notice Update annual interest rate (owner only)
     * @param newRate New annual rate in basis points
     */
    function updateAnnualRate(uint256 newRate) external onlyOwner {
        uint256 oldRate = annualRate;
        annualRate = newRate;

        emit AnnualRateUpdated(oldRate, newRate);
    }

    // ==================== View Functions ====================

    /**
     * @notice Get user's principal balance
     * @param user User address
     * @return Principal balance in USDP
     */
    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    /**
     * @notice Get user's accrued interest (includes pending since last accrual)
     * @param user User address
     * @return Accrued interest in USDP
     */
    function accruedInterestOf(address user) external view returns (uint256) {
        return _accruedInterest[user] + _calculatePendingInterest(user);
    }

    /**
     * @notice Get user's last accrual timestamp
     * @param user User address
     * @return Last accrual timestamp
     */
    function lastAccrualTimeOf(address user) external view returns (uint256) {
        return _lastAccrualTime[user];
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Internal function to accrue interest for a user
     * @param user User address
     */
    function _accrueInterestInternal(address user) internal {
        uint256 principal = _balances[user];
        if (principal == 0) {
            // No principal, update timestamp and return
            _lastAccrualTime[user] = block.timestamp;
            return;
        }

        uint256 pendingInterest = _calculatePendingInterest(user);

        if (pendingInterest > 0) {
            _accruedInterest[user] += pendingInterest;
            emit InterestAccrued(user, pendingInterest, block.timestamp);
        }

        // Update last accrual time
        _lastAccrualTime[user] = block.timestamp;
    }

    /**
     * @notice Calculate pending interest since last accrual
     * @param user User address
     * @return Pending interest in USDP
     */
    function _calculatePendingInterest(address user) internal view returns (uint256) {
        uint256 principal = _balances[user];
        if (principal == 0) return 0;

        uint256 lastTime = _lastAccrualTime[user];
        if (lastTime == 0) lastTime = block.timestamp; // First deposit

        uint256 timeElapsed = block.timestamp - lastTime;
        if (timeElapsed == 0) return 0;

        // Interest = principal × annualRate × timeElapsed / SECONDS_PER_YEAR / BASIS_POINTS
        // Multiply before divide to preserve precision
        uint256 interest = (principal * annualRate * timeElapsed) / SECONDS_PER_YEAR / BASIS_POINTS;

        return interest;
    }
}
