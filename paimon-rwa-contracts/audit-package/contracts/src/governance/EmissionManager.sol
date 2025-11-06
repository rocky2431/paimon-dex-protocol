// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../common/Governable.sol";
import "../common/ProtocolConstants.sol";
import "../common/ProtocolRoles.sol";

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
 *
 * Monitoring (P3-001):
 * - EmissionManager is a pure calculation contract with no state-changing functions
 * - Actual emission allocation tracking is delegated to consuming contracts:
 *   • GaugeController emits distribution events for LP rewards
 *   • RewardDistributor emits distribution events for veNFT rewards
 *   • Treasury emits deposit/withdrawal events for eco fund
 *   • LiquidationManager emits liquidation events with reward amounts
 * - This design avoids redundant event emissions and ensures accountability
 *   at the point of actual token distribution, not budget calculation
 */
contract EmissionManager is Governable {
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

    /// @notice Phase-B 初始排放（沿用 Phase-A 水平，随后按衰减率递减）。
    uint256 private constant PHASE_B_INITIAL = PHASE_A_WEEKLY;

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

    /// @notice Initializes governance + emission策略角色。
    constructor() Governable(msg.sender) {
        _grantRole(ProtocolRoles.EMISSION_POLICY_ROLE, msg.sender);
    }

    /// @notice 仅允许排放策略管理员操作。
    modifier onlyEmissionPolicy() {
        _checkRole(ProtocolRoles.EMISSION_POLICY_ROLE, _msgSender());
        _;
    }

    /// @notice 治理赐予额外的排放策略管理员（例如执行多签）。
    function grantEmissionPolicy(address account) external onlyGovernance {
        require(account != address(0), "EmissionManager: account is zero");
        _grantRole(ProtocolRoles.EMISSION_POLICY_ROLE, account);
    }

    /// @notice 治理移除排放策略管理员。
    function revokeEmissionPolicy(address account) external onlyGovernance {
        require(account != address(0), "EmissionManager: account is zero");
        _revokeRole(ProtocolRoles.EMISSION_POLICY_ROLE, account);
    }

    /// @inheritdoc Governable
    function _afterGovernanceTransfer(address previousGovernor, address newGovernor)
        internal
        override
    {
        if (hasRole(ProtocolRoles.EMISSION_POLICY_ROLE, previousGovernor)) {
            _revokeRole(ProtocolRoles.EMISSION_POLICY_ROLE, previousGovernor);
        }
        _grantRole(ProtocolRoles.EMISSION_POLICY_ROLE, newGovernor);
    }

    // ==================== Core Functions ====================

    /**
     * @notice Get weekly emission budget for a specific week
     * @param week Week number (1-indexed, must be in [1, 352])
     * @return debt Debt channel budget (liquidation incentives)
     * @return lpPairs LP Pairs channel budget (liquidity mining)
     * @return stabilityPool Stability Pool channel budget
     * @return eco Eco channel budget (ecosystem development)
     * @dev Gas cost:
     *      - Phase A/C: ~5-10K gas（常数计算）
     *      - Phase B: ~15-20K gas（指数衰减运算）
     */
    function getWeeklyBudget(uint256 week)
        external
        view
        returns (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco)
    {
        require(week >= 1 && week <= PHASE_C_END, "Week out of range [1, 352]");

        (uint256 totalBudget, uint256 debtBps, uint256 lpBps, uint256 ecoBps) = _phaseParameters(week);

        // Allocate to four channels with phase-specific ratios
        (debt, lpPairs, stabilityPool, eco) = _allocateBudget(totalBudget, debtBps, lpBps, ecoBps);
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
     * @notice Get rounding dust for a specific week (Task P1-002)
     * @param week Week number (1-indexed, must be in [1, 352])
     * @return dust Rounding dust amount collected in debt channel
     * @dev Dust is the difference between totalBudget and sum of theoretical channel allocations.
     *      This function makes dust traceable for auditing and verification.
     *
     *      Calculation:
     *      1. Get actual allocations from getWeeklyBudget (includes collected dust)
     *      2. Calculate theoretical allocations without dust collection
     *      3. dust = totalBudget - theoretical_allocated
     *
     *      The debt channel receives this dust to ensure perfect conservation.
     *
     *      Gas cost: ~10-20K gas (similar to getWeeklyBudget)
     */
    function getWeeklyDust(uint256 week) external view returns (uint256 dust) {
        require(week >= 1 && week <= PHASE_C_END, "Week out of range [1, 352]");

        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = this.getWeeklyBudget(week);
        (uint256 phaseBudget, uint256 debtBps, uint256 lpBps, uint256 ecoBps) = _phaseParameters(week);

        // Calculate theoretical allocations (before dust collection)
        uint256 theoreticalDebt = (phaseBudget * debtBps) / ProtocolConstants.BASIS_POINTS;
        uint256 theoreticalEco = (phaseBudget * ecoBps) / ProtocolConstants.BASIS_POINTS;
        uint256 theoreticalLpTotal = (phaseBudget * lpBps) / ProtocolConstants.BASIS_POINTS;
        uint256 theoreticalLpPairs = (theoreticalLpTotal * lpPairsBps) / ProtocolConstants.BASIS_POINTS;
        uint256 theoreticalStabilityPool = (theoreticalLpTotal * stabilityPoolBps) / ProtocolConstants.BASIS_POINTS;

        uint256 theoreticalAllocated =
            theoreticalDebt + theoreticalLpPairs + theoreticalStabilityPool + theoreticalEco;

        // Dust is the difference (rounding error)
        uint256 actualTotal = debt + lpPairs + stabilityPool + eco;
        dust = actualTotal - theoreticalAllocated;
    }

    /**
     * @notice Calculate total dust across all 352 weeks (Task P1-002)
     * @return totalDust Total rounding dust amount (~<1000 PAIMON)
     * @dev Sums up dust from all weeks to verify cumulative rounding error is minimal.
     *
     *      Expected total dust: <1000 PAIMON (<0.00003% of total emissions)
     *
     *      This function is useful for:
     *      - Audit verification
     *      - Quality assurance testing
     *      - Economic model validation
     *
     *      Gas cost: ~1.5M gas (calls getWeeklyDust 352 times)
     *      Use this function for validation and monitoring, not for frequent queries.
     */
    function getTotalDust() external view returns (uint256 totalDust) {
        for (uint256 week = 1; week <= PHASE_C_END; week++) {
            totalDust += this.getWeeklyDust(week);
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
    function setLpSplitParams(uint16 _lpPairsBps, uint16 _stabilityPoolBps) external onlyEmissionPolicy {
        require(
            _lpPairsBps + _stabilityPoolBps == ProtocolConstants.BASIS_POINTS,
            "LP split must sum to 100%"
        );

        lpPairsBps = _lpPairsBps;
        stabilityPoolBps = _stabilityPoolBps;

        emit LpSplitParamsUpdated(_lpPairsBps, _stabilityPoolBps);
    }

    // ==================== Internal Functions ====================

    /**
     * @notice 计算 Phase-B 周排放：E(w) = 37.5M × 0.985^(w-12)
     * @param week Week number (must be in [13, 248])
     * @return emission Weekly emission amount
     * @dev 采用二分幂算法按需求值，避免维护庞大查表常量。
     */
    function _calculatePhaseBEmission(uint256 week) private pure returns (uint256) {
        require(week > PHASE_A_END && week <= PHASE_B_END, "Week not in Phase B");

        uint256 exponent = week - PHASE_A_END;
        uint256 decayFactor = _fastPower(DECAY_RATE_BPS, ProtocolConstants.BASIS_POINTS, exponent);
        return (PHASE_B_INITIAL * decayFactor) / PRECISION;
    }

    function _phaseParameters(uint256 week)
        private
        pure
        returns (uint256 totalBudget, uint256 debtBps, uint256 lpBps, uint256 ecoBps)
    {
        if (week <= PHASE_A_END) {
            totalBudget = PHASE_A_WEEKLY;
            debtBps = PHASE_A_DEBT_BPS;
            lpBps = PHASE_A_LP_BPS;
            ecoBps = PHASE_A_ECO_BPS;
        } else if (week <= PHASE_B_END) {
            totalBudget = _calculatePhaseBEmission(week);
            debtBps = PHASE_B_DEBT_BPS;
            lpBps = PHASE_B_LP_BPS;
            ecoBps = PHASE_B_ECO_BPS;
        } else {
            totalBudget = PHASE_C_WEEKLY;
            debtBps = PHASE_C_DEBT_BPS;
            lpBps = PHASE_C_LP_BPS;
            ecoBps = PHASE_C_ECO_BPS;
        }
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
    function _allocateBudget(uint256 totalBudget, uint256 debtBps, uint256 lpBps, uint256 ecoBps)
        private
        view
        returns (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco)
    {
        // Calculate channel allocations
        debt = (totalBudget * debtBps) / ProtocolConstants.BASIS_POINTS;
        eco = (totalBudget * ecoBps) / ProtocolConstants.BASIS_POINTS;

        // LP secondary split (governance-adjustable)
        // Task P2-001: Fix precision loss - combine multiplications before division
        lpPairs = (totalBudget * lpBps * lpPairsBps)
            / (ProtocolConstants.BASIS_POINTS * ProtocolConstants.BASIS_POINTS);
        stabilityPool = (totalBudget * lpBps * stabilityPoolBps)
            / (ProtocolConstants.BASIS_POINTS * ProtocolConstants.BASIS_POINTS);

        // Dust collection: Add any rounding error to debt channel
        uint256 allocated = debt + lpPairs + stabilityPool + eco;
        if (allocated < totalBudget) {
            debt += (totalBudget - allocated);
        }
    }
}
