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

    // ====================
    // SWAP FUNCTIONS
    // ====================

    /**
     * @notice Swap exact tokens for tokens
     * @param amountIn Exact amount of input tokens
     * @param amountOutMin Minimum amount of output tokens (slippage protection)
     * @param path Array of token addresses (route)
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @return amounts Array of amounts for each step in the path
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");

        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output amount");

        // Transfer input tokens to first pair
        address firstPair = _pairFor(path[0], path[1]);
        IERC20(path[0]).safeTransferFrom(msg.sender, firstPair, amounts[0]);

        // Execute swaps
        _swap(amounts, path, to);
    }

    /**
     * @notice Swap tokens for exact tokens
     * @param amountOut Exact amount of output tokens desired
     * @param amountInMax Maximum amount of input tokens (slippage protection)
     * @param path Array of token addresses (route)
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @return amounts Array of amounts for each step in the path
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");

        amounts = getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, "Excessive input amount");

        // Transfer input tokens to first pair
        address firstPair = _pairFor(path[0], path[1]);
        IERC20(path[0]).safeTransferFrom(msg.sender, firstPair, amounts[0]);

        // Execute swaps
        _swap(amounts, path, to);
    }

    /**
     * @notice Execute swaps along the path
     */
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];

            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));

            address to = i < path.length - 2 ? _pairFor(output, path[i + 2]) : _to;
            DEXPair(_pairFor(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    /**
     * @notice Get pair address for two tokens
     */
    function _pairFor(address tokenA, address tokenB) internal view returns (address pair) {
        pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "Pair does not exist");
    }

    // ====================
    // QUOTE FUNCTIONS
    // ====================

    /**
     * @notice Calculate output amounts for given input amount
     * @param amountIn Input amount
     * @param path Array of token addresses (route)
     * @return amounts Array of output amounts for each step
     */
    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            address pair = factory.getPair(path[i], path[i + 1]);
            require(pair != address(0), "Pair does not exist");

            (uint112 reserve0, uint112 reserve1,) = DEXPair(pair).getReserves();
            (address token0,) = _sortTokens(path[i], path[i + 1]);
            (uint112 reserveIn, uint112 reserveOut) = path[i] == token0
                ? (reserve0, reserve1)
                : (reserve1, reserve0);

            amounts[i + 1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /**
     * @notice Calculate input amounts for given output amount
     * @param amountOut Output amount
     * @param path Array of token addresses (route)
     * @return amounts Array of input amounts for each step
     */
    function getAmountsIn(uint256 amountOut, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;

        for (uint256 i = path.length - 1; i > 0; i--) {
            address pair = factory.getPair(path[i - 1], path[i]);
            require(pair != address(0), "Pair does not exist");

            (uint112 reserve0, uint112 reserve1,) = DEXPair(pair).getReserves();
            (address token0,) = _sortTokens(path[i - 1], path[i]);
            (uint112 reserveIn, uint112 reserveOut) = path[i - 1] == token0
                ? (reserve0, reserve1)
                : (reserve1, reserve0);

            amounts[i - 1] = _getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    /**
     * @notice Calculate output amount given input amount and reserves
     * @param amountIn Input amount
     * @param reserveIn Input token reserve
     * @param reserveOut Output token reserve
     * @return amountOut Output amount
     */
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        // AMM formula: (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
        // 0.3% fee = 997/1000
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @notice Calculate input amount given output amount and reserves
     * @param amountOut Output amount
     * @param reserveIn Input token reserve
     * @param reserveOut Output token reserve
     * @return amountIn Input amount
     */
    function _getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, "Insufficient output amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        // AMM formula: (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997) + 1
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }
}
