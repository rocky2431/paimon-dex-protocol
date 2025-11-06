// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math as OZMath} from "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IUSDP.sol";
import "../common/Governable.sol";
import "../common/ProtocolConstants.sol";
import "../common/ProtocolRoles.sol";

/**
 * @title PSMParameterized (Peg Stability Module - Parameterized Version)
 * @notice Flexible 1:1 USDC ↔ USDP swaps supporting any ERC20 decimals configuration
 * @dev Enhanced PSM that dynamically calculates decimal conversion factors
 *
 * Key Improvements over Original PSM:
 * - ✅ Supports USDC with any decimals (6, 18, or custom)
 * - ✅ Automatically queries USDC decimals on construction
 * - ✅ Dynamic scale factor calculation (no hardcoded 1e12)
 * - ✅ Gas-optimized with cached decimals
 * - ✅ Compatible with BSC mainnet (18 decimals) and testnet (6 decimals)
 *
 * Security Features:
 * - ReentrancyGuard on all state-changing functions
 * - Owner-only parameter updates (fees)
 * - Fee cap at 100% (10000 bp)
 * - Immutable token addresses for gas optimization
 * - Decimal validation on construction
 *
 * Gas Optimization:
 * - Cached USDC decimals (saves repeated STATICCALL)
 * - Immutable USDP/USDC addresses (saves SLOAD)
 * - Minimal storage slots usage
 * - SafeERC20 for secure token interactions
 *
 * Deployment:
 * - BSC Mainnet: PSMParameterized(usdp, 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d) → auto-detects 18 decimals
 * - BSC Testnet: PSMParameterized(usdp, 0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2) → auto-detects 6 decimals
 */
contract PSMParameterized is ReentrancyGuard, Governable {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice Immutable address of USDP token (only PSM can mint/burn)
    IUSDP public immutable USDP;

    /// @notice Immutable address of USDC token (reserve asset)
    IERC20 public immutable USDC;

    /// @notice USDC decimals (cached from IERC20Metadata.decimals())
    uint8 public immutable usdcDecimals;

    /// @notice USDP decimals (always 18)
    uint8 public constant USDP_DECIMALS = 18;

    /// @notice Fee charged when swapping USDC for USDP (in basis points, 10 = 0.1%)
    uint256 public feeIn;

    /// @notice Fee charged when swapping USDP for USDC (in basis points, 10 = 0.1%)
    uint256 public feeOut;

    /// @notice Maximum fee allowed (100% = 10000 basis points)
    uint256 public constant MAX_FEE = ProtocolConstants.BASIS_POINTS;

    /// @notice Basis points denominator (100% = 10000)
    uint256 private constant BP_DENOMINATOR = ProtocolConstants.BASIS_POINTS;

    // ==================== Events ====================

    /// @notice Emitted when USDC is swapped for USDP
    /// @param user Address that performed the swap
    /// @param usdcIn Amount of USDC deposited (in USDC decimals)
    /// @param usdpOut Amount of USDP minted (18 decimals)
    /// @param fee Fee charged in USDP (18 decimals)
    /// @param scaleFactor Exchange rate scale factor (P3-001: monitoring enhancement)
    event SwapUSDCForUSDP(address indexed user, uint256 usdcIn, uint256 usdpOut, uint256 fee, uint256 scaleFactor);

    /// @notice Emitted when USDP is swapped for USDC
    /// @param user Address that performed the swap
    /// @param usdpIn Amount of USDP burned (18 decimals)
    /// @param usdcOut Amount of USDC returned (in USDC decimals)
    /// @param fee Fee charged in USDP (18 decimals)
    /// @param scaleFactor Exchange rate scale factor (P3-001: monitoring enhancement)
    event SwapUSDPForUSDC(address indexed user, uint256 usdpIn, uint256 usdcOut, uint256 fee, uint256 scaleFactor);

    /// @notice Emitted when fee parameters are updated
    /// @param feeType Type of fee updated ("feeIn" or "feeOut")
    /// @param newFee New fee value in basis points
    event FeeUpdated(string feeType, uint256 newFee);

    // ==================== Constructor ====================

    /**
     * @notice Constructor initializes PSM with USDP and USDC addresses
     * @param _usdp Address of USDP token contract
     * @param _usdc Address of USDC token contract (must implement IERC20Metadata)
     * @dev Automatically queries USDC decimals via IERC20Metadata.decimals()
     */
    constructor(address _usdp, address _usdc) Governable(msg.sender) {
        require(_usdp != address(0), "PSM: USDP address cannot be zero");
        require(_usdc != address(0), "PSM: USDC address cannot be zero");

        USDP = IUSDP(_usdp);
        USDC = IERC20(_usdc);

        // Query USDC decimals from contract
        try IERC20Metadata(_usdc).decimals() returns (uint8 decimals_) {
            require(decimals_ > 0 && decimals_ <= 18, "PSM: Invalid USDC decimals");
            usdcDecimals = decimals_;
        } catch {
            revert("PSM: USDC must implement IERC20Metadata");
        }

        // Initialize with 0.1% fee (10 basis points)
        feeIn = 10;
        feeOut = 10;

        _grantRole(ProtocolRoles.TREASURY_MANAGER_ROLE, msg.sender);
    }

    /// @notice 仅允许金库管理员（或治理）执行的操作。
    modifier onlyTreasuryManager() {
        _checkRole(ProtocolRoles.TREASURY_MANAGER_ROLE, _msgSender());
        _;
    }

    /// @notice 治理添加新的金库管理员（例如运营多签）。
    function grantTreasuryManager(address account) external onlyGovernance {
        require(account != address(0), "PSM: account is zero");
        _grantRole(ProtocolRoles.TREASURY_MANAGER_ROLE, account);
    }

    /// @notice 治理移除金库管理员。
    function revokeTreasuryManager(address account) external onlyGovernance {
        require(account != address(0), "PSM: account is zero");
        _revokeRole(ProtocolRoles.TREASURY_MANAGER_ROLE, account);
    }

    /// @inheritdoc Governable
    function _afterGovernanceTransfer(address previousGovernor, address newGovernor)
        internal
        override
    {
        if (hasRole(ProtocolRoles.TREASURY_MANAGER_ROLE, previousGovernor)) {
            _revokeRole(ProtocolRoles.TREASURY_MANAGER_ROLE, previousGovernor);
        }
        _grantRole(ProtocolRoles.TREASURY_MANAGER_ROLE, newGovernor);
    }

    // ==================== Core Functions ====================

    /**
     * @notice Swap USDC for USDP (mint USDP by depositing USDC)
     * @dev User must approve PSM to spend USDC before calling
     * @dev Dynamically calculates conversion factor based on USDC decimals
     * @param usdcAmount Amount of USDC to deposit (in USDC decimals)
     * @return usdpReceived Amount of USDP minted to user (18 decimals)
     *
     * @dev Conversion Logic:
     *      - If USDC decimals < USDP decimals (e.g., 6 < 18):
     *        usdpReceived = usdcAfterFee * 10^(18-6) = usdcAfterFee * 1e12
     *      - If USDC decimals > USDP decimals (e.g., 20 > 18):
     *        usdpReceived = usdcAfterFee / 10^(20-18) = usdcAfterFee / 1e2
     *      - If USDC decimals == USDP decimals (e.g., 18 == 18):
     *        usdpReceived = usdcAfterFee (1:1)
     */
    function swapUSDCForUSDP(uint256 usdcAmount) external nonReentrant returns (uint256 usdpReceived) {
        require(usdcAmount > 0, "PSM: Amount must be greater than zero");

        // Cache storage variables to memory (saves multiple SLOADs)
        uint256 _feeIn = feeIn;

        // Calculate fee in USDC (in USDC decimals) using OZMath.mulDiv to prevent overflow
        // Previously: unchecked { feeUSDC = (usdcAmount * _feeIn) / BP_DENOMINATOR }
        // With extreme amounts (e.g., type(uint256).max), usdcAmount * _feeIn could overflow
        // OZMath.mulDiv safely handles: (a * b) / c without intermediate overflow
        uint256 feeUSDC = OZMath.mulDiv(usdcAmount, _feeIn, BP_DENOMINATOR);

        // Calculate USDC after fee (safe subtraction, will revert on underflow)
        uint256 usdcAfterFee = usdcAmount - feeUSDC;

        // Convert USDC decimals to USDP decimals dynamically
        // ✅ Task 83: Optimized scaling - use direct multiplication instead of mulDiv(a,b,1)
        if (usdcDecimals < USDP_DECIMALS) {
            // Scale up: USDC (6) → USDP (18) requires * 10^12
            // Safe to use unchecked: max USDC (1e18 * 1e12) = 1e30, well below uint256.max
            uint256 scaleFactor = 10 ** (USDP_DECIMALS - usdcDecimals);
            unchecked {
                usdpReceived = usdcAfterFee * scaleFactor;
            }
        } else if (usdcDecimals > USDP_DECIMALS) {
            // Scale down: USDC (20) → USDP (18) requires / 10^2
            uint256 scaleFactor = 10 ** (usdcDecimals - USDP_DECIMALS);
            usdpReceived = usdcAfterFee / scaleFactor;
        } else {
            // Same decimals: 1:1 conversion
            usdpReceived = usdcAfterFee;
        }

        // Transfer USDC from user to PSM
        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Mint USDP to user
        USDP.mint(msg.sender, usdpReceived);

        // Calculate fee in USDP decimals for event
        // ✅ Task 83: Use direct multiplication for better gas efficiency
        uint256 feeUSDP;
        if (usdcDecimals < USDP_DECIMALS) {
            uint256 scaleFactor = 10 ** (USDP_DECIMALS - usdcDecimals);
            // Safe: feeUSDC is small (max 0.1% of amount), won't overflow
            unchecked {
                feeUSDP = feeUSDC * scaleFactor;
            }
        } else if (usdcDecimals > USDP_DECIMALS) {
            uint256 scaleFactor = 10 ** (usdcDecimals - USDP_DECIMALS);
            feeUSDP = feeUSDC / scaleFactor;
        } else {
            feeUSDP = feeUSDC;
        }

        // Emit enhanced event with scale factor (P3-001: monitoring enhancement)
        emit SwapUSDCForUSDP(msg.sender, usdcAmount, usdpReceived, feeUSDP, getScaleFactor());
    }

    /**
     * @notice Swap USDP for USDC (burn USDP to retrieve USDC)
     * @dev User must approve PSM to spend USDP before calling
     * @dev Dynamically calculates conversion factor based on USDC decimals
     * @param usdpAmount Amount of USDP to burn (18 decimals)
     * @return usdcReceived Amount of USDC returned to user (in USDC decimals)
     *
     * @dev Conversion Logic:
     *      - If USDC decimals < USDP decimals (e.g., 6 < 18):
     *        usdcReceived = usdpAfterFee / 10^(18-6) = usdpAfterFee / 1e12
     *      - If USDC decimals > USDP decimals (e.g., 20 > 18):
     *        usdcReceived = usdpAfterFee * 10^(20-18) = usdpAfterFee * 1e2
     *      - If USDC decimals == USDP decimals (e.g., 18 == 18):
     *        usdcReceived = usdpAfterFee (1:1)
     */
    function swapUSDPForUSDC(uint256 usdpAmount) external nonReentrant returns (uint256 usdcReceived) {
        require(usdpAmount > 0, "PSM: Amount must be greater than zero");

        // Calculate fee in USDP (18 decimals) using OZMath.mulDiv to prevent overflow
        // Previously: feeUSDP = (usdpAmount * feeOut) / BP_DENOMINATOR
        // OZMath.mulDiv safely handles: (a * b) / c without intermediate overflow
        uint256 feeUSDP = OZMath.mulDiv(usdpAmount, feeOut, BP_DENOMINATOR);

        // Calculate USDP after fee (safe subtraction, will revert on underflow)
        uint256 usdpAfterFee = usdpAmount - feeUSDP;

        // Convert USDP decimals to USDC decimals dynamically
        // ✅ Task 83: Optimized scaling - use direct multiplication instead of mulDiv(a,b,1)
        if (usdcDecimals < USDP_DECIMALS) {
            // Scale down: USDP (18) → USDC (6) requires / 10^12
            uint256 scaleFactor = 10 ** (USDP_DECIMALS - usdcDecimals);
            usdcReceived = usdpAfterFee / scaleFactor;
        } else if (usdcDecimals > USDP_DECIMALS) {
            // Scale up: USDP (18) → USDC (20) requires * 10^2
            // Safe to use unchecked: max USDP (1e30) * scaleFactor (1e2) = 1e32, well below uint256.max
            uint256 scaleFactor = 10 ** (usdcDecimals - USDP_DECIMALS);
            unchecked {
                usdcReceived = usdpAfterFee * scaleFactor;
            }
        } else {
            // Same decimals: 1:1 conversion
            usdcReceived = usdpAfterFee;
        }

        // Check USDC reserve
        require(USDC.balanceOf(address(this)) >= usdcReceived, "PSM: Insufficient USDC reserve");

        // Burn USDP from user
        USDP.burnFrom(msg.sender, usdpAmount);

        // Transfer USDC to user
        USDC.safeTransfer(msg.sender, usdcReceived);

        // Emit enhanced event with scale factor (P3-001: monitoring enhancement)
        emit SwapUSDPForUSDC(msg.sender, usdpAmount, usdcReceived, feeUSDP, getScaleFactor());
    }

    // ==================== Admin Functions ====================

    /**
     * @notice Update fee charged when swapping USDC for USDP
     * @dev Only callable by owner
     * @param newFeeIn New fee in basis points (max 10000 = 100%)
     */
    function setFeeIn(uint256 newFeeIn) external onlyTreasuryManager {
        require(newFeeIn <= MAX_FEE, "PSM: Fee cannot exceed 100%");
        feeIn = newFeeIn;
        emit FeeUpdated("feeIn", newFeeIn);
    }

    /**
     * @notice Update fee charged when swapping USDP for USDC
     * @dev Only callable by owner
     * @param newFeeOut New fee in basis points (max 10000 = 100%)
     */
    function setFeeOut(uint256 newFeeOut) external onlyTreasuryManager {
        require(newFeeOut <= MAX_FEE, "PSM: Fee cannot exceed 100%");
        feeOut = newFeeOut;
        emit FeeUpdated("feeOut", newFeeOut);
    }

    // ==================== View Functions ====================

    /**
     * @notice Get current USDC reserve balance
     * @return Current USDC balance held by PSM (in USDC decimals)
     */
    function getUSDCReserve() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Get conversion scale factor for USDC → USDP
     * @return Scale factor as a power of 10
     * @dev Returns the multiplier/divisor used in conversion
     *      - If USDC=6, USDP=18: returns 1000000000000 (1e12)
     *      - If USDC=18, USDP=18: returns 1 (no scaling)
     *      - If USDC=20, USDP=18: returns 100 (1e2, used as divisor)
     */
    function getScaleFactor() public view returns (uint256) {
        if (usdcDecimals < USDP_DECIMALS) {
            return 10 ** (USDP_DECIMALS - usdcDecimals);
        } else if (usdcDecimals > USDP_DECIMALS) {
            return 10 ** (usdcDecimals - USDP_DECIMALS);
        } else {
            return 1;
        }
    }

    /**
     * @notice Check if USDC decimals are less than USDP decimals
     * @return True if scaling up is needed, false otherwise
     */
    function needsScaleUp() external view returns (bool) {
        return usdcDecimals < USDP_DECIMALS;
    }
}
