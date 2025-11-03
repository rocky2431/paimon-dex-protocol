// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EmissionManager
 * @notice Manages weekly PAIMON token emission budget across 3 phases and 4 distribution channels
 * @dev Implements deterministic emission schedule for 352 weeks with governance-adjustable LP split
 *
 * Key Features:
 * - Three-phase emission model: Fixed → Exponential Decay → Fixed
 * - Four-channel budget allocation: Debt, LP Pairs, Stability Pool, Eco
 * - Governance-adjustable LP secondary split (lpPairs vs stabilityPool)
 * - Gas-optimized: Formula-based calculation instead of large storage arrays
 * - Deterministic: Same inputs always produce same outputs
 *
 * Emission Schedule:
 * - Phase A (Week 1-12): Fixed 37.5M PAIMON/week
 * - Phase B (Week 13-248): Exponential decay from 37.5M to 4.327M
 * - Phase C (Week 249-352): Fixed 4.327M PAIMON/week
 * - Total emissions: ~10B PAIMON over 352 weeks (6.77 years)
 *
 * Budget Allocation:
 * - Debt channel: 10% (liquidation incentives)
 * - LP total: 70% (liquidity mining)
 *   - LP Pairs: Governance-adjustable (default 60% of LP)
 *   - Stability Pool: Governance-adjustable (default 40% of LP)
 * - Eco channel: 20% (ecosystem development, grants, partnerships)
 *
 * Security:
 * - Ownable: Only owner can adjust LP split parameters
 * - Parameter validation: LP split must sum to exactly 100%
 * - Range validation: Week number must be in [1, 352]
 * - Immutable phases: Emission schedule cannot be changed after deployment
 *
 * Gas Optimization:
 * - No large storage arrays (Phase B calculated on-the-fly)
 * - Immutable constants for fixed values
 * - View functions only (no state changes on budget queries)
 * - Efficient power calculation using logarithms
 *
 * Integration:
 * - GaugeController: Calls getWeeklyBudget to distribute LP rewards
 * - RewardDistributor: Calls getWeeklyBudget for veNFT holder rewards
 * - Treasury: Calls getWeeklyBudget for eco fund allocation
 * - LiquidationManager: Calls getWeeklyBudget for liquidation incentives
 */
contract EmissionManager is Ownable {
    // ==================== Constants ====================

    /// @notice Phase A fixed weekly emission (Week 1-12)
    /// @dev Per whitepaper specification
    ///      Maintains original ratio: Phase A / Phase C ≈ 8.67
    uint256 public constant PHASE_A_WEEKLY = 37_500_000 * 1e18; // 37.5M PAIMON

    /// @notice Phase C fixed weekly emission (Week 249-352)
    /// @dev Per whitepaper specification
    uint256 public constant PHASE_C_WEEKLY = 4_326_923 * 1e18; // 4.327M PAIMON

    /// @notice Last week of Phase A
    uint256 public constant PHASE_A_END = 12;

    /// @notice Last week of Phase B
    uint256 public constant PHASE_B_END = 248;

    /// @notice Last week of Phase C (final week of emission)
    uint256 public constant PHASE_C_END = 352;

    /// @notice Basis points denominator (100% = 10000 bps)
    uint256 public constant BASIS_POINTS = 10000;

    /// @notice Exponential decay rate for Phase-B (0.985 = 98.5%)
    uint256 public constant DECAY_RATE_BPS = 9850; // 0.985 in basis points

    // Phase-A channel allocation (Week 1-12): 30% debt, 60% LP, 10% eco
    uint256 private constant PHASE_A_DEBT_BPS = 3000; // 30%
    uint256 private constant PHASE_A_LP_BPS = 6000; // 60%
    uint256 private constant PHASE_A_ECO_BPS = 1000; // 10%

    // Phase-B channel allocation (Week 13-248): 50% debt, 37.5% LP, 12.5% eco
    uint256 private constant PHASE_B_DEBT_BPS = 5000; // 50%
    uint256 private constant PHASE_B_LP_BPS = 3750; // 37.5%
    uint256 private constant PHASE_B_ECO_BPS = 1250; // 12.5%

    // Phase-C channel allocation (Week 249-352): 55% debt, 35% LP, 10% eco
    uint256 private constant PHASE_C_DEBT_BPS = 5500; // 55%
    uint256 private constant PHASE_C_LP_BPS = 3500; // 35%
    uint256 private constant PHASE_C_ECO_BPS = 1000; // 10%

    /// @notice Precision multiplier for decay calculations (to avoid floating point)
    uint256 private constant PRECISION = 1e18;

    // ==================== State Variables ====================

    /// @notice LP Pairs allocation within LP total (basis points)
    /// @dev Default: 6000 bps = 60% of LP total = 42% of total budget
    uint16 public lpPairsBps = 6000;

    /// @notice Stability Pool allocation within LP total (basis points)
    /// @dev Default: 4000 bps = 40% of LP total = 28% of total budget
    uint16 public stabilityPoolBps = 4000;

    // ==================== Events ====================

    /// @notice Emitted when LP split parameters are updated
    event LpSplitParamsUpdated(uint16 lpPairsBps, uint16 stabilityPoolBps);

    // ==================== Constructor ====================

    constructor() Ownable(msg.sender) {}

    // ==================== Core Functions ====================

    /**
     * @notice Get weekly emission budget for a specific week
     * @param week Week number (1-indexed, must be in [1, 352])
     * @return debt Debt channel budget (liquidation incentives)
     * @return lpPairs LP Pairs channel budget (liquidity mining)
     * @return stabilityPool Stability Pool channel budget
     * @return eco Eco channel budget (ecosystem development)
     * @dev Gas cost:
     *      - Phase A/C: ~5-10K gas (constant lookup)
     *      - Phase B: ~15-20K gas (exponential calculation)
     */
    function getWeeklyBudget(uint256 week)
        external
        view
        returns (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco)
    {
        require(week >= 1 && week <= PHASE_C_END, "Week out of range [1, 352]");

        uint256 totalBudget;

        // Phase A: Fixed 37.5M per week (Week 1-12)
        if (week <= PHASE_A_END) {
            totalBudget = PHASE_A_WEEKLY;
        }
        // Phase B: Exponential decay (Week 13-248)
        else if (week <= PHASE_B_END) {
            totalBudget = _calculatePhaseBEmission(week);
        }
        // Phase C: Fixed 4.327M per week (Week 249-352)
        else {
            totalBudget = PHASE_C_WEEKLY;
        }

        // Allocate to four channels with phase-specific ratios
        (debt, lpPairs, stabilityPool, eco) = _allocateBudget(totalBudget, week);
    }

    /**
     * @notice Calculate total PAIMON emission across all 352 weeks
     * @return totalEmission Total emission amount (~3.29B PAIMON)
     * @dev Computes sum of all weekly budgets from Week 1 to Week 352.
     *      Result depends on current lpPairsBps and stabilityPoolBps settings.
     *      Expected total: ~3,292,945,267 PAIMON (with exponential decay r=0.985)
     *
     *      Gas cost: ~1.2M gas (calls getWeeklyBudget 352 times)
     *      Use this function for validation and monitoring, not for frequent queries.
     */
    function getTotalEmission() external view returns (uint256 totalEmission) {
        for (uint256 week = 1; week <= PHASE_C_END; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = this.getWeeklyBudget(week);
            totalEmission += (debt + lpPairs + stabilityPool + eco);
        }
    }

    /**
     * @notice Set LP secondary split parameters (governance function)
     * @param _lpPairsBps LP Pairs allocation in basis points (0-10000)
     * @param _stabilityPoolBps Stability Pool allocation in basis points (0-10000)
     * @dev Requirements:
     *      - Only callable by owner (Timelock in production)
     *      - Sum must equal exactly 10000 bps (100%)
     *      - Changes apply immediately to all future getWeeklyBudget calls
     */
    function setLpSplitParams(uint16 _lpPairsBps, uint16 _stabilityPoolBps) external onlyOwner {
        require(_lpPairsBps + _stabilityPoolBps == BASIS_POINTS, "LP split must sum to 100%");

        lpPairsBps = _lpPairsBps;
        stabilityPoolBps = _stabilityPoolBps;

        emit LpSplitParamsUpdated(_lpPairsBps, _stabilityPoolBps);
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Calculate Phase B emission using exponential decay formula
     * @param week Week number (must be in [13, 248])
     * @return emission Weekly emission amount
     * @dev Formula: E(w) = E_A * (0.985)^(w - 12)
     *      Uses fast exponentiation (exponentiation by squaring) for efficiency and precision.
     *
     * Implementation notes:
     * - Decay rate: 0.985 = 9850 / 10000
     * - Exponent: n = week - 12 (ranges from 1 to 236)
     * - Uses fixed-point arithmetic with 1e18 precision
     * - Fast exponentiation reduces computation from O(n) to O(log n)
     */
    function _calculatePhaseBEmission(uint256 week) private pure returns (uint256) {
        require(week > PHASE_A_END && week <= PHASE_B_END, "Week not in Phase B");

        // Number of decay periods elapsed (1 to 236)
        uint256 exponent = week - PHASE_A_END;

        // Calculate (0.985)^exponent using fast exponentiation
        // decay_rate = 9850 / 10000 = 0.985
        uint256 decayPower = _fastPower(DECAY_RATE_BPS, BASIS_POINTS, exponent);

        // E(w) = PHASE_A_WEEKLY * decayPower / PRECISION
        uint256 emission = (PHASE_A_WEEKLY * decayPower) / PRECISION;

        return emission;
    }

    /**
     * @notice Fast exponentiation (exponentiation by squaring)
     * @param base Base value in basis points (e.g., 9850 for 0.985)
     * @param denominator Denominator for fixed-point (e.g., 10000 for basis points)
     * @param exponent Exponent value
     * @return result (base/denominator)^exponent scaled by PRECISION (1e18)
     * @dev Computes (base/denominator)^exponent with fixed-point precision.
     *      Uses binary exponentiation for O(log n) complexity.
     *      Example: _fastPower(9850, 10000, 5) returns 0.985^5 * 1e18 ≈ 0.927 * 1e18
     */
    function _fastPower(uint256 base, uint256 denominator, uint256 exponent) private pure returns (uint256) {
        if (exponent == 0) {
            return PRECISION; // x^0 = 1
        }

        uint256 result = PRECISION; // Start with 1.0 in fixed-point
        uint256 currentBase = (base * PRECISION) / denominator; // Convert base to fixed-point

        while (exponent > 0) {
            if (exponent % 2 == 1) {
                // If exponent is odd, multiply result by current base
                result = (result * currentBase) / PRECISION;
            }
            // Square the base
            currentBase = (currentBase * currentBase) / PRECISION;
            // Halve the exponent
            exponent /= 2;
        }

        return result;
    }

    /**
     * @notice Allocate total budget to four channels with phase-specific ratios
     * @param totalBudget Total weekly budget to allocate
     * @param week Week number to determine phase-specific allocation
     * @return debt Debt channel allocation (phase-dependent: 30%/50%/55%)
     * @return lpPairs LP Pairs channel allocation (governance-adjustable split)
     * @return stabilityPool Stability Pool channel allocation (governance-adjustable split)
     * @return eco Eco channel allocation (phase-dependent: 10%/12.5%/10%)
     * @dev Phase-specific allocation:
     *      Phase-A (Week 1-12): 30% debt, 60% LP, 10% eco
     *      Phase-B (Week 13-248): 50% debt, 37.5% LP, 12.5% eco
     *      Phase-C (Week 249-352): 55% debt, 35% LP, 10% eco
     *
     *      LP total is further split between lpPairs and stabilityPool using governance-adjustable parameters.
     *      Dust collection: Any rounding error is added to debt channel to ensure exact conservation.
     */
    function _allocateBudget(uint256 totalBudget, uint256 week)
        private
        view
        returns (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco)
    {
        uint256 debtBps;
        uint256 lpBps;
        uint256 ecoBps;

        // Determine phase-specific allocation ratios
        if (week <= PHASE_A_END) {
            // Phase-A: 30% debt, 60% LP, 10% eco
            debtBps = PHASE_A_DEBT_BPS;
            lpBps = PHASE_A_LP_BPS;
            ecoBps = PHASE_A_ECO_BPS;
        } else if (week <= PHASE_B_END) {
            // Phase-B: 50% debt, 37.5% LP, 12.5% eco
            debtBps = PHASE_B_DEBT_BPS;
            lpBps = PHASE_B_LP_BPS;
            ecoBps = PHASE_B_ECO_BPS;
        } else {
            // Phase-C: 55% debt, 35% LP, 10% eco
            debtBps = PHASE_C_DEBT_BPS;
            lpBps = PHASE_C_LP_BPS;
            ecoBps = PHASE_C_ECO_BPS;
        }

        // Calculate channel allocations
        debt = (totalBudget * debtBps) / BASIS_POINTS;
        eco = (totalBudget * ecoBps) / BASIS_POINTS;

        // LP total with phase-specific ratio
        uint256 lpTotal = (totalBudget * lpBps) / BASIS_POINTS;

        // LP secondary split (governance-adjustable)
        lpPairs = (lpTotal * lpPairsBps) / BASIS_POINTS;
        stabilityPool = (lpTotal * stabilityPoolBps) / BASIS_POINTS;

        // Dust collection: Add any rounding error to debt channel
        uint256 allocated = debt + lpPairs + stabilityPool + eco;
        if (allocated < totalBudget) {
            debt += (totalBudget - allocated);
        }
    }
}
