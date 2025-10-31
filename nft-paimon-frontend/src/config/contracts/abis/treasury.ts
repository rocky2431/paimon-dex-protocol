/**
 * Treasury Contract ABI
 * RWA Treasury contract interface
 */

export const TREASURY_ABI = [
  // Read Functions
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'rwaAssets',
    outputs: [
      { name: 'oracle', type: 'address' },
      { name: 'tier', type: 'uint8' },
      { name: 'ltvRatio', type: 'uint256' },
      { name: 'mintDiscount', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'asset', type: 'address' },
    ],
    name: 'getUserPosition',
    outputs: [
      { name: 'rwaAsset', type: 'address' },
      { name: 'rwaAmount', type: 'uint256' },
      { name: 'hydMinted', type: 'uint256' },
      { name: 'depositTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getHealthFactor',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BPS_DENOMINATOR',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'REDEMPTION_COOLDOWN',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserCollateralValue',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserDebtValue',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Write Functions
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'depositRWA',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'redeemRWA',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'addCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'removeCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collateralAsset', type: 'address' },
      { name: 'collateralAmount', type: 'uint256' },
      { name: 'debtAsset', type: 'address' },
      { name: 'debtAmount', type: 'uint256' },
    ],
    name: 'liquidatePosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'hydMinted', type: 'uint256' },
    ],
    name: 'RWADeposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'hydBurned', type: 'uint256' },
    ],
    name: 'RWARedeemed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'collateralAsset', type: 'address' },
      { indexed: true, name: 'debtAsset', type: 'address' },
      { indexed: false, name: 'collateralAmount', type: 'uint256' },
      { indexed: false, name: 'debtAmount', type: 'uint256' },
    ],
    name: 'PositionLiquidated',
    type: 'event',
  },
] as const;