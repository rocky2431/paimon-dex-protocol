// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPancakeRouter02
 * @notice Interface for PancakeSwap V2 Router
 * @dev Based on Uniswap V2 Router02 interface
 *
 * PancakeSwap V2 Router Addresses:
 * - BSC Mainnet: 0x10ED43C718714eb63d5aA57B78B54704E256024E
 * - BSC Testnet: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
 *
 * References:
 * - https://docs.pancakeswap.finance/
 * - https://developer.pancakeswap.finance/contracts/v2/addresses
 */
interface IPancakeRouter02 {
    // ============================================================
    // FACTORY & WETH GETTERS
    // ============================================================

    /**
     * @notice Returns the factory address
     * @return Address of PancakeFactory
     */
    function factory() external pure returns (address);

    /**
     * @notice Returns the WBNB address
     * @return Address of Wrapped BNB (WETH on BSC is WBNB)
     */
    function WETH() external pure returns (address);

    // ============================================================
    // ADD LIQUIDITY
    // ============================================================

    /**
     * @notice Adds liquidity to a token pair pool
     * @param tokenA Address of token A
     * @param tokenB Address of token B
     * @param amountADesired Desired amount of token A to add
     * @param amountBDesired Desired amount of token B to add
     * @param amountAMin Minimum amount of token A (slippage protection)
     * @param amountBMin Minimum amount of token B (slippage protection)
     * @param to Address to receive LP tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountA Actual amount of token A added
     * @return amountB Actual amount of token B added
     * @return liquidity Amount of LP tokens minted
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    /**
     * @notice Adds liquidity to a token/WBNB pool
     * @param token Address of the token
     * @param amountTokenDesired Desired amount of token to add
     * @param amountTokenMin Minimum amount of token (slippage protection)
     * @param amountETHMin Minimum amount of BNB (slippage protection)
     * @param to Address to receive LP tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountToken Actual amount of token added
     * @return amountETH Actual amount of BNB added
     * @return liquidity Amount of LP tokens minted
     */
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    // ============================================================
    // REMOVE LIQUIDITY
    // ============================================================

    /**
     * @notice Removes liquidity from a token pair pool
     * @param tokenA Address of token A
     * @param tokenB Address of token B
     * @param liquidity Amount of LP tokens to burn
     * @param amountAMin Minimum amount of token A to receive
     * @param amountBMin Minimum amount of token B to receive
     * @param to Address to receive tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountA Amount of token A received
     * @return amountB Amount of token B received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);

    /**
     * @notice Removes liquidity from a token/WBNB pool
     * @param token Address of the token
     * @param liquidity Amount of LP tokens to burn
     * @param amountTokenMin Minimum amount of token to receive
     * @param amountETHMin Minimum amount of BNB to receive
     * @param to Address to receive tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountToken Amount of token received
     * @return amountETH Amount of BNB received
     */
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);

    // ============================================================
    // SWAP FUNCTIONS
    // ============================================================

    /**
     * @notice Swaps an exact amount of input tokens for as many output tokens as possible
     * @param amountIn Amount of input tokens to send
     * @param amountOutMin Minimum amount of output tokens to receive (slippage protection)
     * @param path Array of token addresses (path[0] = input, path[n] = output)
     * @param to Address to receive output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts Array of input/output amounts for each swap in the path
     */
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    /**
     * @notice Swaps as few input tokens as possible for an exact amount of output tokens
     * @param amountOut Exact amount of output tokens to receive
     * @param amountInMax Maximum amount of input tokens to send
     * @param path Array of token addresses (path[0] = input, path[n] = output)
     * @param to Address to receive output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts Array of input/output amounts for each swap in the path
     */
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    /**
     * @notice Swaps an exact amount of BNB for as many tokens as possible
     * @param amountOutMin Minimum amount of output tokens to receive
     * @param path Array of token addresses (path[0] = WBNB, path[n] = output token)
     * @param to Address to receive output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts Array of input/output amounts for each swap in the path
     */
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);

    /**
     * @notice Swaps an exact amount of tokens for as much BNB as possible
     * @param amountIn Amount of input tokens to send
     * @param amountOutMin Minimum amount of BNB to receive
     * @param path Array of token addresses (path[0] = input token, path[n] = WBNB)
     * @param to Address to receive BNB
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts Array of input/output amounts for each swap in the path
     */
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    /**
     * @notice Given an input amount and pair reserves, returns the maximum output amount
     * @param amountIn Amount of input token
     * @param reserveIn Reserve of input token in the pair
     * @param reserveOut Reserve of output token in the pair
     * @return amountOut Maximum amount of output token
     */
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)
        external pure returns (uint amountOut);

    /**
     * @notice Given an output amount and pair reserves, returns the required input amount
     * @param amountOut Desired amount of output token
     * @param reserveIn Reserve of input token in the pair
     * @param reserveOut Reserve of output token in the pair
     * @return amountIn Required amount of input token
     */
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
        external pure returns (uint amountIn);

    /**
     * @notice Given an input amount and path, returns the maximum output amounts for each hop
     * @param amountIn Amount of input token
     * @param path Array of token addresses representing the swap path
     * @return amounts Array of maximum output amounts for each hop
     */
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    /**
     * @notice Given an output amount and path, returns the required input amounts for each hop
     * @param amountOut Desired amount of output token
     * @param path Array of token addresses representing the swap path
     * @return amounts Array of required input amounts for each hop
     */
    function getAmountsIn(uint amountOut, address[] calldata path)
        external view returns (uint[] memory amounts);

    /**
     * @notice Calculates equivalent amount of B given amount of A and reserves
     * @dev Helper function for price calculation: amountB = amountA × (reserveB / reserveA)
     * @param amountA Amount of token A
     * @param reserveA Reserve of token A in the pair
     * @param reserveB Reserve of token B in the pair
     * @return amountB Equivalent amount of token B
     */
    function quote(uint amountA, uint reserveA, uint reserveB)
        external pure returns (uint amountB);
}
