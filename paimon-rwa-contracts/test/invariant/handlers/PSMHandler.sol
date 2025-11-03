// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PSMParameterized} from "../../../src/core/PSMParameterized.sol";
import {USDP} from "../../../src/core/USDP.sol";
import {MockERC20} from "../../../src/mocks/MockERC20.sol";

/**
 * @title PSMHandler (USDP Version)
 * @notice Handler contract for PSM invariant testing
 * @dev Handles random operations and tracks ghost variables for invariant verification
 */
contract PSMHandler is Test {
    PSMParameterized public psm;
    USDP public usdp;
    MockERC20 public usdc;

    // Ghost variables for tracking
    uint256 public ghost_totalSwaps;
    uint256 public ghost_totalUSDCIn;
    uint256 public ghost_totalUSDCOut;
    uint256 public ghost_totalUSDPMinted;
    uint256 public ghost_totalUSDPBurned;

    // Bounded randomness
    uint256 constant MAX_SWAP_AMOUNT = 1_000_000 * 1e6; // 1M USDC/USDP

    constructor(PSMParameterized _psm, USDP _usdp, MockERC20 _usdc) {
        psm = _psm;
        usdp = _usdp;
        usdc = _usdc;

        // Approve PSM to spend tokens
        usdc.approve(address(psm), type(uint256).max);
        usdp.approve(address(psm), type(uint256).max);
    }

    /**
     * @notice Random swap USDC for USDP
     * @dev Bounds amount to realistic values
     */
    function swapUSDCForUSDP(uint256 amount) external {
        // Bound amount to reasonable range [1, MAX_SWAP_AMOUNT]
        amount = bound(amount, 1, MAX_SWAP_AMOUNT);

        // Check if we have enough USDC
        if (usdc.balanceOf(address(this)) < amount) {
            return; // Skip if insufficient balance
        }

        // Note: No mint cap check in USDP version of PSM

        try psm.swapUSDCForUSDP(amount) returns (uint256 usdpReceived) {
            // Update ghost variables
            ghost_totalSwaps++;
            ghost_totalUSDCIn += amount;
            ghost_totalUSDPMinted += usdpReceived;
        } catch {
            // Ignore errors (expected behavior)
        }
    }

    /**
     * @notice Random swap USDP for USDC
     * @dev Bounds amount to realistic values
     */
    function swapUSDPForUSDC(uint256 amount) external {
        // Bound amount to reasonable range [1, MAX_SWAP_AMOUNT * 1e12]
        amount = bound(amount, 1e12, MAX_SWAP_AMOUNT * 1e12);

        // Check if we have enough USDP
        if (usdp.balanceOf(address(this)) < amount) {
            return; // Skip if insufficient balance
        }

        // Check if PSM has enough USDC reserve
        uint256 usdcAmount = (amount * (10000 - psm.feeOut())) / 10000 / 1e12;
        if (usdc.balanceOf(address(psm)) < usdcAmount) {
            return; // Skip if insufficient reserve
        }

        try psm.swapUSDPForUSDC(amount) returns (uint256 usdcReceived) {
            // Update ghost variables
            ghost_totalSwaps++;
            ghost_totalUSDCOut += usdcReceived;
            ghost_totalUSDPBurned += amount;
        } catch {
            // Ignore errors (expected behavior)
        }
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
