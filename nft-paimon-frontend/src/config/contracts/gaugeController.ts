/**
 * GaugeController Contract Configuration (gap-3.1.2)
 *
 * ABI and address for GaugeController contract that manages liquidity pool
 * gauges with batch voting and epoch-based weight allocation.
 *
 * @module config/contracts/gaugeController
 */

import type { Address } from 'viem';
import { TESTNET_ADDRESSES } from '../chains/generated/testnet';

/**
 * GaugeController contract address on BSC Testnet
 */
export const GAUGE_CONTROLLER_ADDRESS: Address =
  TESTNET_ADDRESSES.governance.gaugeController;

/**
 * GaugeController ABI
 *
 * Extracted functions:
 * - currentEpoch() - Get current epoch number
 * - gaugeCount() - Get total number of gauges
 * - gauges(uint256) - Get gauge info by ID
 * - gaugeWeights(uint256 epoch, uint256 gaugeId) - Get gauge weight for epoch
 * - userVotes(uint256 tokenId, uint256 epoch, uint256 gaugeId) - Get user vote
 * - getGaugeIdByAddress(address) - Get gauge ID by address
 * - getUserVote(uint256 tokenId) - Get user's current vote
 * - getGaugeWeightByAddress(uint256 epoch, address) - Get gauge weight by address
 * - getCurrentEpoch() - Get current epoch number (alternative)
 * - vote(uint256 tokenId, uint256 gaugeId, uint256 weight) - Vote for single gauge
 * - batchVote(uint256 tokenId, uint256[] gaugeIds, uint256[] weights) - Batch vote
 */
export const GAUGE_CONTROLLER_ABI = [
  {
    type: 'function',
    name: 'currentEpoch',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gaugeCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gaugeWeights',
    inputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gauges',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'gaugeAddress', type: 'address', internalType: 'address' },
      { name: 'isActive', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentEpoch',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getGaugeIdByAddress',
    inputs: [{ name: '_gaugeAddress', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getGaugeWeightByAddress',
    inputs: [
      { name: '_epoch', type: 'uint256', internalType: 'uint256' },
      { name: '_gaugeAddress', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserVote',
    inputs: [{ name: '_tokenId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'votedGauge', type: 'address', internalType: 'address' },
      { name: 'voteWeight', type: 'uint256', internalType: 'uint256' },
      { name: 'epoch', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'userVotes',
    inputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'vote',
    inputs: [
      { name: '_tokenId', type: 'uint256', internalType: 'uint256' },
      { name: '_gaugeId', type: 'uint256', internalType: 'uint256' },
      { name: '_weight', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'batchVote',
    inputs: [
      { name: '_tokenId', type: 'uint256', internalType: 'uint256' },
      { name: '_gaugeIds', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '_weights', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
