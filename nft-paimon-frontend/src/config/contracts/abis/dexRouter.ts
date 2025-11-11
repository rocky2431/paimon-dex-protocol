/**
 * DEXRouter ABI Configuration
 * Paimon custom DEX Router contract (Uniswap V2-compatible)
 *
 * Core Functions:
 * - swapExactTokensForTokens: Exact input swap
 * - swapTokensForExactTokens: Exact output swap
 * - addLiquidity: Add liquidity to pair
 * - removeLiquidity: Remove liquidity from pair
 * - getAmountsOut: Calculate output amounts for given input
 * - getAmountsIn: Calculate input amounts for desired output
 */

export const DEX_ROUTER_ABI = [
  // ====================
  // SWAP FUNCTIONS
  // ====================

  /**
   * Swap exact tokens for tokens
   * Given an input amount, returns the maximum output amount for the other token
   * @param amountIn - Exact amount of input tokens
   * @param amountOutMin - Minimum amount of output tokens (slippage protection)
   * @param path - Array of token addresses (route)
   * @param to - Recipient address
   * @param deadline - Unix timestamp after which transaction reverts
   * @returns amounts - Array of amounts for each step in the path
   */
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  /**
   * Swap tokens for exact tokens
   * Given an output amount, returns the maximum input amount required
   * @param amountOut - Exact amount of output tokens desired
   * @param amountInMax - Maximum amount of input tokens (slippage protection)
   * @param path - Array of token addresses (route)
   * @param to - Recipient address
   * @param deadline - Unix timestamp after which transaction reverts
   * @returns amounts - Array of amounts for each step in the path
   */
  {
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'amountInMax', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapTokensForExactTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ====================
  // LIQUIDITY FUNCTIONS
  // ====================

  /**
   * Add liquidity to a token pair
   * @param tokenA - Address of token A
   * @param tokenB - Address of token B
   * @param amountADesired - Desired amount of token A to add
   * @param amountBDesired - Desired amount of token B to add
   * @param amountAMin - Minimum amount of token A (slippage protection)
   * @param amountBMin - Minimum amount of token B (slippage protection)
   * @param to - Recipient of LP tokens
   * @param deadline - Unix timestamp after which transaction reverts
   * @returns amountA - Actual amount of token A added
   * @returns amountB - Actual amount of token B added
   * @returns liquidity - Amount of LP tokens minted
   */
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'addLiquidity',
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  /**
   * Remove liquidity from a token pair
   * @param tokenA - Address of token A
   * @param tokenB - Address of token B
   * @param liquidity - Amount of LP tokens to burn
   * @param amountAMin - Minimum amount of token A to receive
   * @param amountBMin - Minimum amount of token B to receive
   * @param to - Recipient of underlying tokens
   * @param deadline - Unix timestamp after which transaction reverts
   * @returns amountA - Amount of token A received
   * @returns amountB - Amount of token B received
   */
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'removeLiquidity',
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ====================
  // QUOTE FUNCTIONS (View/Pure)
  // ====================

  /**
   * Calculate output amounts for a given input amount
   * Returns the output amounts for each step in the path
   * @param amountIn - Input amount for first token in path
   * @param path - Array of token addresses forming the route
   * @returns amounts - Array of output amounts for each step
   *
   * Example:
   * path = [HYD, WBNB, USDC]
   * amounts[0] = input HYD amount
   * amounts[1] = output WBNB amount (intermediate)
   * amounts[2] = final output USDC amount
   */
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },

  /**
   * Calculate required input amount for a desired output amount
   * Returns the input amounts needed for each step in the path
   * @param amountOut - Desired output amount for last token in path
   * @param path - Array of token addresses forming the route
   * @returns amounts - Array of required input amounts for each step
   *
   * Example:
   * path = [HYD, WBNB, USDC]
   * amounts[0] = required HYD input
   * amounts[1] = intermediate WBNB amount
   * amounts[2] = desired USDC output
   */
  {
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsIn',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ====================
  // UTILITY FUNCTIONS
  // ====================

  /**
   * Returns the factory address
   */
  {
    inputs: [],
    name: 'factory',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  /**
   * Calculate quote for token A amount given reserves
   * @param amountA - Amount of token A
   * @param reserveA - Reserve of token A in pair
   * @param reserveB - Reserve of token B in pair
   * @returns amountB - Equivalent amount of token B
   */
  {
    inputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'reserveA', type: 'uint256' },
      { name: 'reserveB', type: 'uint256' },
    ],
    name: 'quote',
    outputs: [{ name: 'amountB', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },

  /**
   * Get amount out for a given amount in (single pair)
   * @param amountIn - Input amount
   * @param reserveIn - Reserve of input token
   * @param reserveOut - Reserve of output token
   * @returns amountOut - Output amount (after 0.3% fee)
   */
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'reserveIn', type: 'uint256' },
      { name: 'reserveOut', type: 'uint256' },
    ],
    name: 'getAmountOut',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },

  /**
   * Get amount in required for a desired amount out (single pair)
   * @param amountOut - Desired output amount
   * @param reserveIn - Reserve of input token
   * @param reserveOut - Reserve of output token
   * @returns amountIn - Required input amount (including 0.3% fee)
   */
  {
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'reserveIn', type: 'uint256' },
      { name: 'reserveOut', type: 'uint256' },
    ],
    name: 'getAmountIn',
    outputs: [{ name: 'amountIn', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const;

/**
 * Type-safe DEXRouter ABI
 * Use with wagmi's useReadContract and useWriteContract hooks
 *
 * Usage Example:
 * ```typescript
 * import { useReadContract } from 'wagmi';
 * import { DEX_ROUTER_ABI } from '@/config/contracts/abis/dexRouter';
 * import { DEX_ROUTER_ADDRESS } from '@/config/contracts';
 *
 * const { data: amounts } = useReadContract({
 *   address: DEX_ROUTER_ADDRESS,
 *   abi: DEX_ROUTER_ABI,
 *   functionName: 'getAmountsOut',
 *   args: [parseUnits('100', 18), [HYD_ADDRESS, USDC_ADDRESS]],
 * });
 * ```
 */
