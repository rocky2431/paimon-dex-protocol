// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DEXPair} from "../../../src/dex/DEXPair.sol";
import {MockERC20} from "../../../src/mocks/MockERC20.sol";

/**
 * @title DEXPairHandler
 * @notice Handler contract for DEXPair invariant testing
 * @dev Manages liquidity and swap operations, tracks ghost variables
 */
contract DEXPairHandler is Test {
    DEXPair public pair;
    MockERC20 public token0;
    MockERC20 public token1;

    // Ghost variables for tracking
    uint256 public ghost_totalAddLiquidity;
    uint256 public ghost_totalRemoveLiquidity;
    uint256 public ghost_totalSwaps;
    uint256 public ghost_totalVolumeToken0;
    uint256 public ghost_totalVolumeToken1;
    uint256 public ghost_totalFeesCollected0;
    uint256 public ghost_totalFeesCollected1;

    // Initial K value (reserve0 * reserve1)
    uint256 public initialK;

    // Bounded randomness
    uint256 constant MAX_LIQUIDITY = 10_000_000 ether;
    uint256 constant MAX_SWAP = 100_000 ether;

    constructor(DEXPair _pair, MockERC20 _token0, MockERC20 _token1) {
        pair = _pair;
        token0 = _token0;
        token1 = _token1;

        // Approve pair
        token0.approve(address(pair), type(uint256).max);
        token1.approve(address(pair), type(uint256).max);

        // Add initial liquidity to establish K
        _addInitialLiquidity();
    }

    /**
     * @notice Add initial liquidity to establish K invariant
     * @dev This sets the baseline for K invariant testing
     */
    function _addInitialLiquidity() internal {
        uint256 amount0 = 1000 ether;
        uint256 amount1 = 1000 ether;

        // Mint tokens
        token0.mint(address(this), amount0);
        token1.mint(address(this), amount1);

        // Transfer to pair
        token0.transfer(address(pair), amount0);
        token1.transfer(address(pair), amount1);

        // Mint LP tokens
        pair.mint(address(this));

        // Record initial K
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        initialK = uint256(reserve0) * uint256(reserve1);
    }

    /**
     * @notice Random add liquidity
     * @dev Maintains proportional amounts based on current reserves
     */
    function addLiquidity(uint256 amount0, uint256 amount1) external {
        // Bound amounts
        amount0 = bound(amount0, 1 ether, MAX_LIQUIDITY);
        amount1 = bound(amount1, 1 ether, MAX_LIQUIDITY);

        // Get current reserves to maintain ratio
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        if (reserve0 > 0 && reserve1 > 0) {
            // Adjust amounts to maintain ratio
            if (amount0 * reserve1 > amount1 * reserve0) {
                amount0 = (amount1 * reserve0) / reserve1;
            } else {
                amount1 = (amount0 * reserve1) / reserve0;
            }
        }

        // Mint tokens
        token0.mint(address(this), amount0);
        token1.mint(address(this), amount1);

        // Transfer to pair
        token0.transfer(address(pair), amount0);
        token1.transfer(address(pair), amount1);

        try pair.mint(address(this)) returns (uint256 liquidity) {
            if (liquidity > 0) {
                ghost_totalAddLiquidity++;
            }
        } catch {
            // Ignore errors
        }
    }

    /**
     * @notice Random remove liquidity
     * @dev Burns random amount of LP tokens
     */
    function removeLiquidity(uint256 lpAmount) external {
        uint256 balance = pair.balanceOf(address(this));

        if (balance == 0) {
            return; // No liquidity to remove
        }

        // Bound to available balance
        lpAmount = bound(lpAmount, 1, balance);

        // Transfer LP tokens to pair
        pair.transfer(address(pair), lpAmount);

        try pair.burn(address(this)) returns (uint256 amount0, uint256 amount1) {
            if (amount0 > 0 && amount1 > 0) {
                ghost_totalRemoveLiquidity++;
            }
        } catch {
            // Ignore errors
        }
    }

    /**
     * @notice Random swap (token0 for token1)
     * @dev Calculates output amount using constant product formula
     */
    function swapToken0ForToken1(uint256 amountIn) external {
        // Bound amount
        amountIn = bound(amountIn, 0.01 ether, MAX_SWAP);

        // Get reserves
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        if (reserve0 == 0 || reserve1 == 0) {
            return; // No liquidity
        }

        // Calculate output amount (with fee)
        // amountOut = (amountIn * 997 * reserve1) / (reserve0 * 1000 + amountIn * 997)
        uint256 amountInWithFee = amountIn * 9975; // 0.25% fee = 99.75%
        uint256 numerator = amountInWithFee * reserve1;
        uint256 denominator = (reserve0 * 10000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        if (amountOut == 0 || amountOut >= reserve1) {
            return; // Invalid swap
        }

        // Mint and transfer token0
        token0.mint(address(this), amountIn);
        token0.transfer(address(pair), amountIn);

        try pair.swap(0, amountOut, address(this), "") {
            ghost_totalSwaps++;
            ghost_totalVolumeToken0 += amountIn;

            // Calculate fees
            uint256 fee = (amountIn * 25) / 10000; // 0.25%
            ghost_totalFeesCollected0 += fee;
        } catch {
            // Ignore errors
        }
    }

    /**
     * @notice Random swap (token1 for token0)
     * @dev Calculates output amount using constant product formula
     */
    function swapToken1ForToken0(uint256 amountIn) external {
        // Bound amount
        amountIn = bound(amountIn, 0.01 ether, MAX_SWAP);

        // Get reserves
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        if (reserve0 == 0 || reserve1 == 0) {
            return; // No liquidity
        }

        // Calculate output amount (with fee)
        uint256 amountInWithFee = amountIn * 9975; // 0.25% fee
        uint256 numerator = amountInWithFee * reserve0;
        uint256 denominator = (reserve1 * 10000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        if (amountOut == 0 || amountOut >= reserve0) {
            return; // Invalid swap
        }

        // Mint and transfer token1
        token1.mint(address(this), amountIn);
        token1.transfer(address(pair), amountIn);

        try pair.swap(amountOut, 0, address(this), "") {
            ghost_totalSwaps++;
            ghost_totalVolumeToken1 += amountIn;

            // Calculate fees
            uint256 fee = (amountIn * 25) / 10000; // 0.25%
            ghost_totalFeesCollected1 += fee;
        } catch {
            // Ignore errors
        }
    }

    /**
     * @notice Get current K value
     */
    function getCurrentK() external view returns (uint256) {
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        return uint256(reserve0) * uint256(reserve1);
    }
}
