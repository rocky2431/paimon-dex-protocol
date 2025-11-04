// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {DEXFactory} from "./DEXFactory.sol";
import {DEXPair} from "./DEXPair.sol";

/**
 * @title DEXRouter
 * @notice Router contract for DEX operations (add/remove liquidity, swaps)
 * @dev Simplified Uniswap V2 Router for Paimon DEX
 */
contract DEXRouter {
    using SafeERC20 for IERC20;

    DEXFactory public immutable factory;

    constructor(address _factory) {
        require(_factory != address(0), "Invalid factory");
        factory = DEXFactory(_factory);
    }

    /**
     * @notice Add liquidity to a pair
     * @param tokenA Address of token A
     * @param tokenB Address of token B
     * @param amountADesired Desired amount of token A
     * @param amountBDesired Desired amount of token B
     * @param amountAMin Minimum amount of token A (slippage protection)
     * @param amountBMin Minimum amount of token B (slippage protection)
     * @param to Recipient of LP tokens
     * @param deadline Transaction deadline
     * @return amountA Actual amount of token A added
     * @return amountB Actual amount of token B added
     * @return liquidity LP tokens minted
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(deadline >= block.timestamp, "Expired");

        // Get or create pair
        address pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }

        // Calculate optimal amounts
        (amountA, amountB) = _calculateOptimalAmounts(
            pair,
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        // Transfer tokens to pair
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);

        // Mint LP tokens
        liquidity = DEXPair(pair).mint(to);
    }

    /**
     * @notice Remove liquidity from a pair
     * @param tokenA Address of token A
     * @param tokenB Address of token B
     * @param liquidity Amount of LP tokens to burn
     * @param amountAMin Minimum amount of token A to receive
     * @param amountBMin Minimum amount of token B to receive
     * @param to Recipient of tokens
     * @param deadline Transaction deadline
     * @return amountA Amount of token A received
     * @return amountB Amount of token B received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        require(deadline >= block.timestamp, "Expired");

        address pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "Pair does not exist");

        // Transfer LP tokens to pair
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);

        // Burn LP tokens
        (uint256 amount0, uint256 amount1) = DEXPair(pair).burn(to);

        // Sort amounts
        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

        require(amountA >= amountAMin, "Insufficient A amount");
        require(amountB >= amountBMin, "Insufficient B amount");
    }

    /**
     * @notice Calculate optimal amounts for adding liquidity
     */
    function _calculateOptimalAmounts(
        address pair,
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        (uint112 reserve0, uint112 reserve1,) = DEXPair(pair).getReserves();

        if (reserve0 == 0 && reserve1 == 0) {
            // First liquidity provision
            return (amountADesired, amountBDesired);
        }

        // Calculate optimal amounts based on current ratio
        (address token0,) = _sortTokens(tokenA, tokenB);
        (uint112 reserveA, uint112 reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);

        uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
        if (amountBOptimal <= amountBDesired) {
            require(amountBOptimal >= amountBMin, "Insufficient B amount");
            return (amountADesired, amountBOptimal);
        } else {
            uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
            require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "Insufficient A amount");
            return (amountAOptimal, amountBDesired);
        }
    }

    /**
     * @notice Sort tokens by address
     */
    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "Identical addresses");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Zero address");
    }
}
