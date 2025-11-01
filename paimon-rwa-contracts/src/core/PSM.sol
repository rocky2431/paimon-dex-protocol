// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IUSDP.sol";

/**
 * @title PSM (Peg Stability Module)
 * @notice Facilitates 1:1 USDC ↔ USDP swaps with 0.1% fee for maintaining USDP peg
 * @dev Implements MakerDAO/Venus-style PSM mechanism:
 *      - Users can mint USDP by depositing USDC (swapUSDCForUSDP)
 *      - Users can burn USDP to retrieve USDC (swapUSDPForUSDC)
 *      - 0.1% fee on both directions (10 basis points)
 *      - No mint cap tracking (removed for USDP version)
 *      - USDC reserve must cover all burn operations
 *
 * Security Features:
 * - ReentrancyGuard on all state-changing functions
 * - Owner-only parameter updates (fees)
 * - Fee cap at 100% (10000 bp)
 * - Immutable token addresses for gas optimization
 *
 * Gas Optimization:
 * - Immutable USDP/USDC addresses (saves SLOAD)
 * - Minimal storage slots usage
 * - SafeERC20 for secure token interactions
 */
contract PSM is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Immutable address of USDP token (only PSM can mint/burn)
    IUSDP public immutable USDP;

    /// @notice Immutable address of USDC token (reserve asset)
    IERC20 public immutable USDC;

    /// @notice Fee charged when swapping USDC for USDP (in basis points, 10 = 0.1%)
    uint256 public feeIn;

    /// @notice Fee charged when swapping USDP for USDC (in basis points, 10 = 0.1%)
    uint256 public feeOut;

    /// @notice Maximum fee allowed (100% = 10000 basis points)
    uint256 public constant MAX_FEE = 10000;

    /// @notice Basis points denominator (100% = 10000)
    uint256 private constant BP_DENOMINATOR = 10000;

    /// @notice Emitted when USDC is swapped for USDP
    /// @param user Address that performed the swap
    /// @param usdcIn Amount of USDC deposited
    /// @param usdpOut Amount of USDP minted
    /// @param fee Fee charged in USDP
    event SwapUSDCForUSDP(address indexed user, uint256 usdcIn, uint256 usdpOut, uint256 fee);

    /// @notice Emitted when USDP is swapped for USDC
    /// @param user Address that performed the swap
    /// @param usdpIn Amount of USDP burned
    /// @param usdcOut Amount of USDC returned
    /// @param fee Fee charged in USDC
    event SwapUSDPForUSDC(address indexed user, uint256 usdpIn, uint256 usdcOut, uint256 fee);

    /// @notice Emitted when fee parameters are updated
    /// @param feeType Type of fee updated ("feeIn" or "feeOut")
    /// @param newFee New fee value in basis points
    event FeeUpdated(string feeType, uint256 newFee);

    /**
     * @notice Constructor initializes PSM with USDP and USDC addresses
     * @param _usdp Address of USDP token contract
     * @param _usdc Address of USDC token contract
     */
    constructor(address _usdp, address _usdc) Ownable(msg.sender) {
        require(_usdp != address(0), "PSM: USDP address cannot be zero");
        require(_usdc != address(0), "PSM: USDC address cannot be zero");

        USDP = IUSDP(_usdp);
        USDC = IERC20(_usdc);

        // Initialize with 0.1% fee (10 basis points)
        feeIn = 10;
        feeOut = 10;
    }

    /**
     * @notice Swap USDC for USDP (mint USDP by depositing USDC)
     * @dev User must approve PSM to spend USDC before calling
     * @dev Slither reentrancy warning is false positive - function protected by nonReentrant modifier
     * @param usdcAmount Amount of USDC to deposit (6 decimals)
     * @return usdpReceived Amount of USDP minted to user (18 decimals)
     */
    function swapUSDCForUSDP(uint256 usdcAmount) external nonReentrant returns (uint256 usdpReceived) {
        require(usdcAmount > 0, "PSM: Amount must be greater than zero");

        // Cache storage variables to memory (saves multiple SLOADs)
        uint256 _feeIn = feeIn;

        // Calculate fee in USDC (6 decimals)
        uint256 feeUSDC;
        unchecked {
            feeUSDC = (usdcAmount * _feeIn) / BP_DENOMINATOR;
        }

        // Calculate USDP to mint (convert USDC 6 decimals to USDP 18 decimals)
        uint256 usdcAfterFee;
        unchecked {
            usdcAfterFee = usdcAmount - feeUSDC;
            usdpReceived = usdcAfterFee * 1e12; // 1e12 = 10^(18-6) to convert decimals
        }

        // Transfer USDC from user to PSM
        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Mint USDP to user
        USDP.mint(msg.sender, usdpReceived);

        // Emit event (fee in USDP decimals for consistency)
        // @audit-fix: Avoid divide-before-multiply precision loss
        unchecked {
            emit SwapUSDCForUSDP(msg.sender, usdcAmount, usdpReceived, (usdcAmount * _feeIn * 1e12) / BP_DENOMINATOR);
        }
    }

    /**
     * @notice Swap USDP for USDC (burn USDP to retrieve USDC)
     * @dev User must approve PSM to spend USDP before calling
     * @param usdpAmount Amount of USDP to burn (18 decimals)
     * @return usdcReceived Amount of USDC returned to user (6 decimals)
     */
    function swapUSDPForUSDC(uint256 usdpAmount) external nonReentrant returns (uint256 usdcReceived) {
        require(usdpAmount > 0, "PSM: Amount must be greater than zero");

        // Calculate fee in USDP (18 decimals)
        uint256 feeUSDP = (usdpAmount * feeOut) / BP_DENOMINATOR;

        // Calculate USDC to return (convert USDP 18 decimals to USDC 6 decimals)
        uint256 usdpAfterFee = usdpAmount - feeUSDP;
        usdcReceived = usdpAfterFee / 1e12; // 1e12 = 10^(18-6) to convert decimals

        // Check USDC reserve
        require(USDC.balanceOf(address(this)) >= usdcReceived, "PSM: Insufficient USDC reserve");

        // Burn USDP from user
        USDP.burnFrom(msg.sender, usdpAmount);

        // Transfer USDC to user
        USDC.safeTransfer(msg.sender, usdcReceived);

        // Emit event
        emit SwapUSDPForUSDC(msg.sender, usdpAmount, usdcReceived, feeUSDP);
    }

    /**
     * @notice Update fee charged when swapping USDC for USDP
     * @dev Only callable by owner
     * @param newFeeIn New fee in basis points (max 10000 = 100%)
     */
    function setFeeIn(uint256 newFeeIn) external onlyOwner {
        require(newFeeIn <= MAX_FEE, "PSM: Fee cannot exceed 100%");
        feeIn = newFeeIn;
        emit FeeUpdated("feeIn", newFeeIn);
    }

    /**
     * @notice Update fee charged when swapping USDP for USDC
     * @dev Only callable by owner
     * @param newFeeOut New fee in basis points (max 10000 = 100%)
     */
    function setFeeOut(uint256 newFeeOut) external onlyOwner {
        require(newFeeOut <= MAX_FEE, "PSM: Fee cannot exceed 100%");
        feeOut = newFeeOut;
        emit FeeUpdated("feeOut", newFeeOut);
    }

    /**
     * @notice Get current USDC reserve balance
     * @return Current USDC balance held by PSM
     */
    function getUSDCReserve() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }
}
