/**
 * RWAPriceOracle Contract Configuration
 * Contract ABI for RWA Price Oracle
 */

// Minimal ABI for RWAPriceOracle (only functions we need)
export const RWA_PRICE_ORACLE_ABI = [
  {
    type: 'function',
    name: 'getPrice',
    inputs: [],
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getFormattedPrice',
    inputs: [],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'decimals', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'TARGET_DECIMALS',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;
