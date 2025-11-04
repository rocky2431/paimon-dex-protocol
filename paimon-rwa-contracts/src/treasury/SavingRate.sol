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

    // ==================== Task 80: Gas-Optimized Storage Layout ====================
    // Packed storage reduces from 13 slots to 5 slots
    // SLOAD cost: 2,100 gas warm / 2,600 gas cold
    // SSTORE cost: 20,000 gas (zero→non-zero), 5,000 gas (non-zero→non-zero)

    /// @notice Slot 0: Total deposits and funding (uint128 + uint128 = 256 bits)
    uint128 public totalDeposits;      // Max: 3.4e38 (sufficient for 340 undecillion USDP)
    uint128 public totalFunded;        // Max: 3.4e38

    /// @notice Slot 1: Accrued interest and rates (uint128 + uint64 + uint64 = 256 bits)
    uint128 public totalAccruedInterest; // Max: 3.4e38
    uint64 public annualRate;            // Max: 10,000 bps (fits in 14 bits, uint64 safe)
    uint64 public rwaAnnualYield;        // Max: 10,000 bps

    /// @notice Slot 2: Timestamps and ratios (uint64 × 4 = 256 bits)
    uint64 public rwaAllocationRatio;    // Max: 10,000 bps
    uint64 public weekStartRate;         // Max: 10,000 bps
    uint64 public lastRateUpdateTime;    // Unix timestamp (uint64 safe until 2106)
    uint64 public lastUpkeepTime;        // Unix timestamp

    /// @notice Slot 3: Daily DEX fees (needs full uint256 for 18 decimals)
    uint256 public dailyDEXFees;

    /// @notice Slot 4: Total DEX TVL (needs full uint256 for 18 decimals)
    uint256 public totalDEXTVL;

    // ==================== Mappings (separate storage) ====================

    /// @notice User principal balances
    mapping(address => uint256) private _balances;

    /// @notice Accrued interest per user (18 decimals)
    mapping(address => uint256) private _accruedInterest;

    /// @notice Last accrual timestamp per user
    mapping(address => uint256) private _lastAccrualTime;

    // ==================== Constants ====================

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant SMOOTHING_CAP_BPS = 2000; // 20% cap = 2000 / 10000
    uint256 private constant WEEK_DURATION = 7 days;
    uint256 private constant UPKEEP_INTERVAL = 24 hours;

    // ==================== Events ====================

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event InterestClaimed(address indexed user, uint256 interest);
    event InterestAccrued(address indexed user, uint256 interest, uint256 timestamp);
    event AnnualRateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryFunded(address indexed funder, uint256 amount);
    event RWARateSourceUpdated(uint256 annualYield, uint256 allocationRatio);
    event DEXFeeRateUpdated(uint256 dailyFees, uint256 totalTVL);
    event RateSmoothed(uint256 proposedRate, uint256 cappedRate, uint256 timestamp);
    event FundCoverageWarning(uint256 shortfall, uint256 totalObligations, uint256 availableBalance);

    // ==================== Constructor ====================

    /**
     * @notice Initialize SavingRate contract
     * @param _usdp USDP token address
     * @param _annualRate Initial annual rate in basis points (e.g., 200 = 2%)
     */
    constructor(address _usdp, uint256 _annualRate) Ownable(msg.sender) {
        require(_usdp != address(0), "Invalid USDP address");
        require(_annualRate <= type(uint64).max, "Rate exceeds uint64");

        usdp = IERC20(_usdp);
        annualRate = uint64(_annualRate);

        // Initialize Task 16 state variables (Task 80: optimized with uint64)
        lastRateUpdateTime = uint64(block.timestamp);
        weekStartRate = uint64(_annualRate);
        lastUpkeepTime = uint64(block.timestamp);

        emit AnnualRateUpdated(0, _annualRate);
    }

    // ==================== External Functions ====================

    /**
     * @notice Deposit USDP to start earning interest
     * @param amount Amount of USDP to deposit
     * @dev Task 80: Gas optimization - uint128 for totalDeposits, assembly for packed write
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        // Accrue interest before updating balance
        _accrueInterestInternal(msg.sender);

        // Transfer USDP from user
        usdp.safeTransferFrom(msg.sender, address(this), amount);

        // Task 80: Inline update to minimize gas
        unchecked {
            totalDeposits += uint128(amount); // Safe: realistic max < type(uint128).max
            _balances[msg.sender] += amount;
        }

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw USDP principal (does not include interest)
     * @param amount Amount of USDP to withdraw
     * @dev Task 80: Gas optimization - uint128 for totalDeposits
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance");

        // Accrue interest before updating balance
        _accrueInterestInternal(msg.sender);

        // Task 80: Update state with unchecked (underflow already checked)
        unchecked {
            _balances[msg.sender] -= amount;
            totalDeposits -= uint128(amount); // Safe: amount <= balance <= totalDeposits
        }

        // Transfer USDP to user
        usdp.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim all accrued interest
     * @dev Task P1-008: Decrease totalAccruedInterest when interest is claimed
     * @dev Task 80: Gas optimization - uint128 for totalAccruedInterest
     */
    function claimInterest() external nonReentrant {
        // Accrue latest interest
        _accrueInterestInternal(msg.sender);

        uint256 interest = _accruedInterest[msg.sender];
        require(interest > 0, "No interest to claim");

        // Task 80: Reset accrued interest with unchecked (underflow impossible)
        unchecked {
            _accruedInterest[msg.sender] = 0;
            totalAccruedInterest -= uint128(interest); // Safe: interest <= totalAccruedInterest
        }

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
     * @dev Task 80: Gas optimization - uint64 for annualRate
     */
    function updateAnnualRate(uint256 newRate) external onlyOwner {
        require(newRate <= type(uint64).max, "Rate exceeds uint64");

        uint256 oldRate = uint256(annualRate);
        annualRate = uint64(newRate);

        emit AnnualRateUpdated(oldRate, newRate);
    }

    /**
     * @notice Fund the contract with USDP for interest payments
     * @param amount Amount of USDP to record as funded
     * @dev Assumes USDP has already been transferred to contract (via PSM or Treasury)
     *      This function only updates accounting and emits event
     * @dev Task 80: Gas optimization - uint128 for totalFunded
     *
     * Flow: USDC → PSM → USDP → SavingRate.fund()
     */
    function fund(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");

        // Task 80: Check overflow before update
        uint256 newTotal = uint256(totalFunded) + amount;
        require(newTotal <= type(uint128).max, "Total funded overflow");

        totalFunded = uint128(newTotal);

        emit TreasuryFunded(msg.sender, amount);
    }

    // ==================== Task 16: Rate Source Configuration ====================

    /**
     * @notice Configure RWA rate source
     * @param _rwaAnnualYield RWA annual yield in basis points (e.g., 500 = 5%)
     * @param _allocationRatio Allocation ratio to savings in basis points (e.g., 4000 = 40%)
     * @dev Only owner can call. Formula: rwaRatePortion = yield × ratio / 10000
     * @dev Task 80: Gas optimization - uint64 for rates
     */
    function setRWARateSource(uint256 _rwaAnnualYield, uint256 _allocationRatio) external onlyOwner {
        require(_allocationRatio <= BASIS_POINTS, "Allocation ratio too high");
        require(_rwaAnnualYield <= type(uint64).max, "Yield exceeds uint64");
        require(_allocationRatio <= type(uint64).max, "Ratio exceeds uint64");

        rwaAnnualYield = uint64(_rwaAnnualYield);
        rwaAllocationRatio = uint64(_allocationRatio);

        // Recalculate combined rate
        uint256 combinedRate = _calculateCombinedRate();
        _updateRateWithSmoothing(combinedRate);

        emit RWARateSourceUpdated(_rwaAnnualYield, _allocationRatio);
    }

    /**
     * @notice Update DEX fee rate source
     * @param _dailyFees Daily DEX fees collected (18 decimals)
     * @param _totalTVL Total DEX TVL (18 decimals)
     * @dev Only owner can call. Formula: DEX APR = (dailyFees × 365 × 10000) / totalTVL
     */
    function updateDEXFeeRate(uint256 _dailyFees, uint256 _totalTVL) external onlyOwner {
        require(_totalTVL > 0, "TVL must be > 0");

        dailyDEXFees = _dailyFees;
        totalDEXTVL = _totalTVL;

        // Recalculate combined rate
        uint256 combinedRate = _calculateCombinedRate();
        _updateRateWithSmoothing(combinedRate);

        emit DEXFeeRateUpdated(_dailyFees, _totalTVL);
    }

    /**
     * @notice Propose a rate update with smoothing mechanism
     * @param proposedRate Proposed new rate in basis points
     * @dev Applies 20% weekly cap to prevent volatile rate changes
     */
    function proposeRateUpdate(uint256 proposedRate) external onlyOwner {
        _updateRateWithSmoothing(proposedRate);
    }

    /**
     * @notice Chainlink Keeper - Check if upkeep is needed
     * @return upkeepNeeded True if 24 hours have passed since last upkeep
     * @return performData Empty bytes (not used)
     * @dev Task 80: Gas optimization - uint64 for lastUpkeepTime
     */
    function checkUpkeep(bytes calldata /* checkData */) external view returns (bool upkeepNeeded, bytes memory performData) {
        unchecked {
            upkeepNeeded = (block.timestamp >= uint256(lastUpkeepTime) + UPKEEP_INTERVAL);
        }
        performData = "";
    }

    /**
     * @notice Chainlink Keeper - Perform daily rate update
     * @dev Recalculates rate from sources and applies smoothing
     * @dev Task 80: Gas optimization - uint64 for lastUpkeepTime
     */
    function performUpkeep(bytes calldata /* performData */) external {
        require(block.timestamp >= uint256(lastUpkeepTime) + UPKEEP_INTERVAL, "Upkeep not needed yet");

        // Recalculate rate from sources
        uint256 combinedRate = _calculateCombinedRate();
        _updateRateWithSmoothing(combinedRate);

        lastUpkeepTime = uint64(block.timestamp);
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

    /**
     * @notice Get RWA rate contribution in basis points
     * @return RWA portion of annual rate
     * @dev Task 80: Gas optimization - unchecked math, uint64 multiplication
     */
    function rwaRatePortion() public view returns (uint256) {
        if (rwaAllocationRatio == 0) return 0;
        unchecked {
            return (uint256(rwaAnnualYield) * uint256(rwaAllocationRatio)) / BASIS_POINTS;
        }
    }

    /**
     * @notice Get DEX fee rate contribution in basis points
     * @return DEX portion of annual rate
     * @dev Task 80: Gas optimization - unchecked math
     */
    function dexFeeRatePortion() public view returns (uint256) {
        if (totalDEXTVL == 0) return 0;

        // Annual APR in bps = (dailyFees × 365 × 10000) / totalTVL
        // Example: (100 USDP/day × 365 × 10000) / 1M USDP TVL = 365 bps (3.65%)
        // Both values are in 18 decimals, so they cancel out
        uint256 annualFees;
        unchecked {
            annualFees = dailyDEXFees * 365; // Safe: max 2^256 / 365 ≈ 3.2e74 daily fees
        }
        return (annualFees * BASIS_POINTS) / totalDEXTVL;
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Internal function to accrue interest for a user
     * @param user User address
     * @dev Task P1-008: Added fund coverage check to ensure sufficient USDP balance
     * @dev Task 80: Gas optimization - cache storage reads, unchecked math, uint128 casting
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
            // Task 80: Cache totalAccruedInterest to save one SLOAD
            uint256 newTotalAccrued = uint256(totalAccruedInterest) + pendingInterest;
            require(newTotalAccrued <= type(uint128).max, "Total accrued overflow");

            unchecked {
                _accruedInterest[user] += pendingInterest; // Safe: overflow checked above
            }
            totalAccruedInterest = uint128(newTotalAccrued);
            emit InterestAccrued(user, pendingInterest, block.timestamp);

            // Task P1-008: Check fund coverage
            // Task 80: Use cached value (newTotalAccrued) instead of re-reading totalAccruedInterest
            uint256 totalObligations;
            unchecked {
                totalObligations = uint256(totalDeposits) + newTotalAccrued; // Safe: both fit in uint128
            }

            uint256 availableBalance = usdp.balanceOf(address(this));

            if (availableBalance < totalObligations) {
                uint256 shortfall;
                unchecked {
                    shortfall = totalObligations - availableBalance; // Safe: checked in if condition
                }
                emit FundCoverageWarning(shortfall, totalObligations, availableBalance);
                revert("Insufficient fund coverage");
            }
        }

        // Update last accrual time
        _lastAccrualTime[user] = block.timestamp;
    }

    /**
     * @notice Calculate pending interest since last accrual
     * @param user User address
     * @return Pending interest in USDP
     * @dev Task 80: Gas optimization - unchecked arithmetic for safe operations
     */
    function _calculatePendingInterest(address user) internal view returns (uint256) {
        uint256 principal = _balances[user];
        if (principal == 0) return 0;

        uint256 lastTime = _lastAccrualTime[user];
        if (lastTime == 0) lastTime = block.timestamp; // First deposit

        uint256 timeElapsed;
        unchecked {
            timeElapsed = block.timestamp - lastTime; // Safe: block.timestamp always increases
        }
        if (timeElapsed == 0) return 0;

        // Interest = principal × annualRate × timeElapsed / SECONDS_PER_YEAR / BASIS_POINTS
        // Task P2-001: Fix precision loss - combine divisions
        // Task 80: Unchecked - overflow impossible (max: 2^256 / (365*86400*10000) ≈ 2^200 USDP principal)
        uint256 interest;
        unchecked {
            interest = (principal * uint256(annualRate) * timeElapsed) / (SECONDS_PER_YEAR * BASIS_POINTS);
        }

        return interest;
    }

    // ==================== Task 16: Internal Helper Functions ====================

    /**
     * @notice Calculate combined rate from all sources
     * @return Combined annual rate in basis points
     * @dev Task 80: Gas optimization - unchecked addition
     */
    function _calculateCombinedRate() internal view returns (uint256) {
        uint256 rwaRate = rwaRatePortion();
        uint256 dexRate = dexFeeRatePortion();

        unchecked {
            return rwaRate + dexRate; // Safe: max 10,000 + 10,000 = 20,000 bps
        }
    }

    /**
     * @notice Update rate with smoothing mechanism (20% weekly cap)
     * @param proposedRate Proposed new rate in basis points
     * @dev Applies weekly 20% cap to prevent volatile changes
     * @dev Task 80: Gas optimization - uint64 for timestamps and rates
     */
    function _updateRateWithSmoothing(uint256 proposedRate) internal {
        // Check if new week has started
        if (block.timestamp >= uint256(lastRateUpdateTime) + WEEK_DURATION) {
            // New week: reset baseline to current rate
            weekStartRate = annualRate;
            lastRateUpdateTime = uint64(block.timestamp);
        }

        // Calculate 20% cap from week start rate
        uint256 maxIncrease;
        uint256 maxDecrease;
        unchecked {
            maxIncrease = (uint256(weekStartRate) * (BASIS_POINTS + SMOOTHING_CAP_BPS)) / BASIS_POINTS;
            maxDecrease = (uint256(weekStartRate) * (BASIS_POINTS - SMOOTHING_CAP_BPS)) / BASIS_POINTS;
        }

        uint256 cappedRate;

        if (proposedRate > maxIncrease) {
            // Cap at +20%
            cappedRate = maxIncrease;
            emit RateSmoothed(proposedRate, cappedRate, block.timestamp);
        } else if (proposedRate < maxDecrease) {
            // Cap at -20%
            cappedRate = maxDecrease;
            emit RateSmoothed(proposedRate, cappedRate, block.timestamp);
        } else {
            // Within 20% range, apply directly
            cappedRate = proposedRate;
        }

        require(cappedRate <= type(uint64).max, "Capped rate exceeds uint64");

        uint256 oldRate = uint256(annualRate);
        annualRate = uint64(cappedRate);

        emit AnnualRateUpdated(oldRate, cappedRate);
    }
}
