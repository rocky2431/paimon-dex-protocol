// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PSM} from "../../../src/core/PSM.sol";
import {HYD} from "../../../src/core/HYD.sol";
import {MockERC20} from "../../../src/mocks/MockERC20.sol";

/**
 * @title PSMHandler
 * @notice Handler contract for PSM invariant testing
 * @dev Handles random operations and tracks ghost variables for invariant verification
 */
contract PSMHandler is Test {
    PSM public psm;
    HYD public hyd;
    MockERC20 public usdc;

    // Ghost variables for tracking
    uint256 public ghost_totalSwaps;
    uint256 public ghost_totalUSDCIn;
    uint256 public ghost_totalUSDCOut;
    uint256 public ghost_totalHYDMinted;
    uint256 public ghost_totalHYDBurned;

    // Bounded randomness
    uint256 constant MAX_SWAP_AMOUNT = 1_000_000 * 1e6; // 1M USDC/HYD

    constructor(PSM _psm, HYD _hyd, MockERC20 _usdc) {
        psm = _psm;
        hyd = _hyd;
        usdc = _usdc;

        // Approve PSM to spend tokens
        usdc.approve(address(psm), type(uint256).max);
        hyd.approve(address(psm), type(uint256).max);
    }

    /**
     * @notice Random swap USDC for HYD
     * @dev Bounds amount to realistic values
     */
    function swapUSDCForHYD(uint256 amount) external {
        // Bound amount to reasonable range [1, MAX_SWAP_AMOUNT]
        amount = bound(amount, 1, MAX_SWAP_AMOUNT);

        // Check if we have enough USDC
        if (usdc.balanceOf(address(this)) < amount) {
            return; // Skip if insufficient balance
        }

        // Check if swap would exceed cap
        uint256 hydAmount = (amount * (10000 - psm.feeIn())) / 10000 * 1e12;
        if (psm.totalMinted() + hydAmount > psm.maxMintedHYD()) {
            return; // Skip if would exceed cap
        }

        try psm.swapUSDCForHYD(amount) returns (uint256 hydReceived) {
            // Update ghost variables
            ghost_totalSwaps++;
            ghost_totalUSDCIn += amount;
            ghost_totalHYDMinted += hydReceived;
        } catch {
            // Ignore errors (expected behavior)
        }
    }

    /**
     * @notice Random swap HYD for USDC
     * @dev Bounds amount to realistic values
     */
    function swapHYDForUSDC(uint256 amount) external {
        // Bound amount to reasonable range [1, MAX_SWAP_AMOUNT * 1e12]
        amount = bound(amount, 1e12, MAX_SWAP_AMOUNT * 1e12);

        // Check if we have enough HYD
        if (hyd.balanceOf(address(this)) < amount) {
            return; // Skip if insufficient balance
        }

        // Check if PSM has enough USDC reserve
        uint256 usdcAmount = (amount * (10000 - psm.feeOut())) / 10000 / 1e12;
        if (usdc.balanceOf(address(psm)) < usdcAmount) {
            return; // Skip if insufficient reserve
        }

        try psm.swapHYDForUSDC(amount) returns (uint256 usdcReceived) {
            // Update ghost variables
            ghost_totalSwaps++;
            ghost_totalUSDCOut += usdcReceived;
            ghost_totalHYDBurned += amount;
        } catch {
            // Ignore errors (expected behavior)
        }
    }

    /**
     * @notice Random update maxMintedHYD
     * @dev Bounds to reasonable values
     */
    function updateMaxMintedHYD(uint256 newMax) external {
        // Bound to [current totalMinted, 100M HYD]
        newMax = bound(newMax, psm.totalMinted(), 100_000_000 ether);

        vm.prank(psm.owner());
        psm.setMaxMintedHYD(newMax);
    }

    /**
     * @notice Random update feeIn
     * @dev Bounds to [0, 100] basis points (0-1%)
     */
    function updateFeeIn(uint256 newFee) external {
        // Bound to reasonable fee range [0, 100] bp
        newFee = bound(newFee, 0, 100);

        vm.prank(psm.owner());
        psm.setFeeIn(newFee);
    }

    /**
     * @notice Random update feeOut
     * @dev Bounds to [0, 100] basis points (0-1%)
     */
    function updateFeeOut(uint256 newFee) external {
        // Bound to reasonable fee range [0, 100] bp
        newFee = bound(newFee, 0, 100);

        vm.prank(psm.owner());
        psm.setFeeOut(newFee);
    }
}
