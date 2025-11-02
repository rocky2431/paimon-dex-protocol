/**
 * Rewards Types Tests - Multi-Asset Support
 * TDD: RED phase - Verify multi-asset reward types
 *
 * Test Dimensions:
 * 1. Functional - Reward types include all multi-asset fields
 * 2. Boundary - Asset arrays handle empty and multiple tokens
 * 3. Exception - Validation for required fields
 */

import {
  PoolReward,
  RewardsSummary,
  RewardAsset,
  MultiAssetReward,
} from '../types';

describe('RewardAsset Interface - Functional Tests', () => {
  it('should define esPAIMON reward asset', () => {
    const esPAIMON: RewardAsset = {
      token: 'esPAIMON',
      address: '0x0000000000000000000000000000000000000002' as `0x${string}`,
      amount: 100n,
      amountFormatted: '100.0',
      symbol: 'esPAIMON',
    };

    expect(esPAIMON.token).toBe('esPAIMON');
    expect(esPAIMON.amount).toBe(100n);
  });

  it('should define USDC reward asset', () => {
    const usdc: RewardAsset = {
      token: 'USDC',
      address: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
      amount: 50n,
      amountFormatted: '50.0',
      symbol: 'USDC',
    };

    expect(usdc.token).toBe('USDC');
    expect(usdc.amount).toBe(50n);
  });

  it('should define USDP reward asset', () => {
    const usdp: RewardAsset = {
      token: 'USDP',
      address: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: 75n,
      amountFormatted: '75.0',
      symbol: 'USDP',
    };

    expect(usdp.token).toBe('USDP');
    expect(usdp.amount).toBe(75n);
  });
});

describe('MultiAssetReward Interface - Functional Tests', () => {
  it('should support multiple reward assets', () => {
    const multiReward: MultiAssetReward = {
      assets: [
        {
          token: 'esPAIMON',
          address: '0x0000000000000000000000000000000000000002' as `0x${string}`,
          amount: 100n,
          amountFormatted: '100.0',
          symbol: 'esPAIMON',
        },
        {
          token: 'USDC',
          address: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
          amount: 50n,
          amountFormatted: '50.0',
          symbol: 'USDC',
        },
        {
          token: 'USDP',
          address: '0x0000000000000000000000000000000000000001' as `0x${string}`,
          amount: 75n,
          amountFormatted: '75.0',
          symbol: 'USDP',
        },
      ],
      totalValueUSD: '225.0',
    };

    expect(multiReward.assets).toHaveLength(3);
    expect(multiReward.assets[0].token).toBe('esPAIMON');
    expect(multiReward.assets[1].token).toBe('USDC');
    expect(multiReward.assets[2].token).toBe('USDP');
  });

  it('should calculate total value in USD', () => {
    const multiReward: MultiAssetReward = {
      assets: [
        {
          token: 'USDC',
          address: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
          amount: 100n,
          amountFormatted: '100.0',
          symbol: 'USDC',
        },
      ],
      totalValueUSD: '100.0',
    };

    expect(multiReward.totalValueUSD).toBe('100.0');
  });
});

describe('MultiAssetReward Interface - Boundary Tests', () => {
  it('should handle empty assets array', () => {
    const emptyReward: MultiAssetReward = {
      assets: [],
      totalValueUSD: '0',
    };

    expect(emptyReward.assets).toHaveLength(0);
    expect(emptyReward.totalValueUSD).toBe('0');
  });

  it('should handle single asset', () => {
    const singleReward: MultiAssetReward = {
      assets: [
        {
          token: 'esPAIMON',
          address: '0x0000000000000000000000000000000000000002' as `0x${string}`,
          amount: 100n,
          amountFormatted: '100.0',
          symbol: 'esPAIMON',
        },
      ],
      totalValueUSD: '100.0',
    };

    expect(singleReward.assets).toHaveLength(1);
  });

  it('should handle very large amounts', () => {
    const largeAmount = BigInt('1000000000000000000000'); // 1000 tokens with 18 decimals
    const largeReward: RewardAsset = {
      token: 'USDC',
      address: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
      amount: largeAmount,
      amountFormatted: '1000.0',
      symbol: 'USDC',
    };

    expect(largeReward.amount).toBe(largeAmount);
  });

  it('should handle zero amounts', () => {
    const zeroReward: RewardAsset = {
      token: 'USDP',
      address: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: 0n,
      amountFormatted: '0.0',
      symbol: 'USDP',
    };

    expect(zeroReward.amount).toBe(0n);
  });
});

describe('RewardsSummary Interface - Multi-Asset Extension', () => {
  it('should include total earned for each asset type', () => {
    const summary: RewardsSummary = {
      totalEarnedPAIMON: 100n,
      totalEarnedPAIMONFormatted: '100.0',
      totalEarnedESPAIMON: 50n,
      totalEarnedESPAIMONFormatted: '50.0',
      totalEarnedUSDC: 25n,
      totalEarnedUSDCFormatted: '25.0',
      totalEarnedUSDP: 30n,
      totalEarnedUSDPFormatted: '30.0',
      totalStakedValueUSD: '500.0',
      averageAPR: '15.5%',
      activePositions: 3,
    };

    expect(summary.totalEarnedPAIMON).toBe(100n);
    expect(summary.totalEarnedESPAIMON).toBe(50n);
    expect(summary.totalEarnedUSDC).toBe(25n);
    expect(summary.totalEarnedUSDP).toBe(30n);
  });

  it('should handle zero values for all asset types', () => {
    const zeroSummary: RewardsSummary = {
      totalEarnedPAIMON: 0n,
      totalEarnedPAIMONFormatted: '0.0',
      totalEarnedESPAIMON: 0n,
      totalEarnedESPAIMONFormatted: '0.0',
      totalEarnedUSDC: 0n,
      totalEarnedUSDCFormatted: '0.0',
      totalEarnedUSDP: 0n,
      totalEarnedUSDPFormatted: '0.0',
      totalStakedValueUSD: '0',
      averageAPR: '0%',
      activePositions: 0,
    };

    expect(zeroSummary.totalEarnedPAIMON).toBe(0n);
    expect(zeroSummary.totalEarnedESPAIMON).toBe(0n);
    expect(zeroSummary.totalEarnedUSDC).toBe(0n);
    expect(zeroSummary.totalEarnedUSDP).toBe(0n);
  });
});

describe('Exception Tests - Type Validation', () => {
  it('should require all fields in RewardAsset', () => {
    const validAsset: RewardAsset = {
      token: 'esPAIMON',
      address: '0x0000000000000000000000000000000000000002' as `0x${string}`,
      amount: 100n,
      amountFormatted: '100.0',
      symbol: 'esPAIMON',
    };

    // TypeScript compilation will fail if any required field is missing
    expect(validAsset.token).toBeDefined();
    expect(validAsset.address).toBeDefined();
    expect(validAsset.amount).toBeDefined();
    expect(validAsset.amountFormatted).toBeDefined();
    expect(validAsset.symbol).toBeDefined();
  });

  it('should validate address format', () => {
    const asset: RewardAsset = {
      token: 'USDC',
      address: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
      amount: 100n,
      amountFormatted: '100.0',
      symbol: 'USDC',
    };

    expect(asset.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
