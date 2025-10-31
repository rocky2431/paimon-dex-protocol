// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Interface for HYD token with mint/burn capabilities
interface IHYD is IERC20 {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
}

/**
 * @title PSM (Peg Stability Module)
 * @notice Facilitates 1:1 USDC ↔ HYD swaps with 0.1% fee for maintaining HYD peg
 * @dev Implements MakerDAO/Venus-style PSM mechanism:
 *      - Users can mint HYD by depositing USDC (swapUSDCForHYD)
 *      - Users can burn HYD to retrieve USDC (swapHYDForUSDC)
 *      - 0.1% fee on both directions (10 basis points)
 *      - maxMintedHYD cap enforced (initially 1M HYD)
 *      - USDC reserve must cover all burn operations
 *
 * Security Features:
 * - ReentrancyGuard on all state-changing functions
 * - Owner-only parameter updates (fees, cap)
 * - Fee cap at 100% (10000 bp)
 * - Immutable token addresses for gas optimization
 *
 * Gas Optimization:
 * - Immutable HYD/USDC addresses (saves SLOAD)
 * - Minimal storage slots usage
 * - SafeERC20 for secure token interactions
 */
contract PSM is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Immutable address of HYD token (only PSM can mint/burn)
    IHYD public immutable HYD;

    /// @notice Immutable address of USDC token (reserve asset)
    IERC20 public immutable USDC;

    /// @notice Fee charged when swapping USDC for HYD (in basis points, 10 = 0.1%)
    uint256 public feeIn;

    /// @notice Fee charged when swapping HYD for USDC (in basis points, 10 = 0.1%)
    uint256 public feeOut;

    /// @notice Maximum amount of HYD that can be minted through PSM
    uint256 public maxMintedHYD;

    /// @notice Current amount of HYD minted through PSM (not yet burned back)
    uint256 public totalMinted;

    /// @notice Maximum fee allowed (100% = 10000 basis points)
    uint256 public constant MAX_FEE = 10000;

    /// @notice Basis points denominator (100% = 10000)
    uint256 private constant BP_DENOMINATOR = 10000;

    /// @notice Emitted when USDC is swapped for HYD
    /// @param user Address that performed the swap
    /// @param usdcIn Amount of USDC deposited
    /// @param hydOut Amount of HYD minted
    /// @param fee Fee charged in HYD
    event SwapUSDCForHYD(address indexed user, uint256 usdcIn, uint256 hydOut, uint256 fee);

    /// @notice Emitted when HYD is swapped for USDC
    /// @param user Address that performed the swap
    /// @param hydIn Amount of HYD burned
    /// @param usdcOut Amount of USDC returned
    /// @param fee Fee charged in USDC
    event SwapHYDForUSDC(address indexed user, uint256 hydIn, uint256 usdcOut, uint256 fee);

    /// @notice Emitted when fee parameters are updated
    /// @param feeType Type of fee updated ("feeIn" or "feeOut")
    /// @param newFee New fee value in basis points
    event FeeUpdated(string feeType, uint256 newFee);

    /// @notice Emitted when maxMintedHYD cap is updated
    /// @param newCap New maximum mintable HYD amount
    event CapUpdated(uint256 newCap);

    /**
     * @notice Constructor initializes PSM with HYD and USDC addresses
     * @param _hyd Address of HYD token contract
     * @param _usdc Address of USDC token contract
     */
    constructor(address _hyd, address _usdc) Ownable(msg.sender) {
        require(_hyd != address(0), "PSM: HYD address cannot be zero");
        require(_usdc != address(0), "PSM: USDC address cannot be zero");

        HYD = IHYD(_hyd);
        USDC = IERC20(_usdc);

        // Initialize with 0.1% fee (10 basis points)
        feeIn = 10;
        feeOut = 10;

        // Initialize with 1M HYD cap
        maxMintedHYD = 1_000_000 ether;
    }

    /**
     * @notice Swap USDC for HYD (mint HYD by depositing USDC)
     * @dev User must approve PSM to spend USDC before calling
     * @dev Slither reentrancy warning is false positive - function protected by nonReentrant modifier
     * @param usdcAmount Amount of USDC to deposit (6 decimals)
     * @return hydReceived Amount of HYD minted to user (18 decimals)
     */
    function swapUSDCForHYD(uint256 usdcAmount) external nonReentrant returns (uint256 hydReceived) {
        require(usdcAmount > 0, "PSM: Amount must be greater than zero");

        // Cache storage variables to memory (saves multiple SLOADs)
        uint256 _feeIn = feeIn;
        uint256 _maxMintedHYD = maxMintedHYD;
        uint256 _totalMinted = totalMinted;

        // Calculate fee in USDC (6 decimals)
        uint256 feeUSDC;
        unchecked {
            feeUSDC = (usdcAmount * _feeIn) / BP_DENOMINATOR;
        }

        // Calculate HYD to mint (convert USDC 6 decimals to HYD 18 decimals)
        uint256 usdcAfterFee;
        unchecked {
            usdcAfterFee = usdcAmount - feeUSDC;
            hydReceived = usdcAfterFee * 1e12; // 1e12 = 10^(18-6) to convert decimals
        }

        // Check mint cap
        unchecked {
            require(_totalMinted + hydReceived <= _maxMintedHYD, "PSM: Exceeds mint cap");
        }

        // Transfer USDC from user to PSM
        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Mint HYD to user
        HYD.mint(msg.sender, hydReceived);

        // Update totalMinted
        unchecked {
            totalMinted = _totalMinted + hydReceived;
        }

        // Emit event (fee in HYD decimals for consistency)
        // @audit-fix: Avoid divide-before-multiply precision loss
        unchecked {
            emit SwapUSDCForHYD(msg.sender, usdcAmount, hydReceived, (usdcAmount * _feeIn * 1e12) / BP_DENOMINATOR);
        }
    }

    /**
     * @notice Swap HYD for USDC (burn HYD to retrieve USDC)
     * @dev User must approve PSM to spend HYD before calling
     * @param hydAmount Amount of HYD to burn (18 decimals)
     * @return usdcReceived Amount of USDC returned to user (6 decimals)
     */
    function swapHYDForUSDC(uint256 hydAmount) external nonReentrant returns (uint256 usdcReceived) {
        require(hydAmount > 0, "PSM: Amount must be greater than zero");

        // Calculate fee in HYD (18 decimals)
        uint256 feeHYD = (hydAmount * feeOut) / BP_DENOMINATOR;

        // Calculate USDC to return (convert HYD 18 decimals to USDC 6 decimals)
        uint256 hydAfterFee = hydAmount - feeHYD;
        usdcReceived = hydAfterFee / 1e12; // 1e12 = 10^(18-6) to convert decimals

        // Check USDC reserve
        require(USDC.balanceOf(address(this)) >= usdcReceived, "PSM: Insufficient USDC reserve");

        // Burn HYD from user
        HYD.burnFrom(msg.sender, hydAmount);

        // Transfer USDC to user
        USDC.safeTransfer(msg.sender, usdcReceived);

        // Update totalMinted
        totalMinted -= hydAmount;

        // Emit event
        emit SwapHYDForUSDC(msg.sender, hydAmount, usdcReceived, feeHYD);
    }

    /**
     * @notice Update fee charged when swapping USDC for HYD
     * @dev Only callable by owner
     * @param newFeeIn New fee in basis points (max 10000 = 100%)
     */
    function setFeeIn(uint256 newFeeIn) external onlyOwner {
        require(newFeeIn <= MAX_FEE, "PSM: Fee cannot exceed 100%");
        feeIn = newFeeIn;
        emit FeeUpdated("feeIn", newFeeIn);
    }

    /**
     * @notice Update fee charged when swapping HYD for USDC
     * @dev Only callable by owner
     * @param newFeeOut New fee in basis points (max 10000 = 100%)
     */
    function setFeeOut(uint256 newFeeOut) external onlyOwner {
        require(newFeeOut <= MAX_FEE, "PSM: Fee cannot exceed 100%");
        feeOut = newFeeOut;
        emit FeeUpdated("feeOut", newFeeOut);
    }

    /**
     * @notice Update maximum amount of HYD that can be minted
     * @dev Only callable by owner
     * @param newCap New maximum mintable HYD amount
     */
    function setMaxMintedHYD(uint256 newCap) external onlyOwner {
        maxMintedHYD = newCap;
        emit CapUpdated(newCap);
    }

    /**
     * @notice Get current USDC reserve balance
     * @return Current USDC balance held by PSM
     */
    function getUSDCReserve() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Get available minting capacity
     * @return Remaining HYD that can be minted before hitting cap
     */
    function getAvailableCapacity() external view returns (uint256) {
        if (totalMinted >= maxMintedHYD) {
            return 0;
        }
        return maxMintedHYD - totalMinted;
    }
}
