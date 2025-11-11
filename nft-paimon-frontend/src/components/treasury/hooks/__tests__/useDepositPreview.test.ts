/**
 * useDepositPreview Hook Tests
 *
 * Tests for deposit preview calculations with correct health factor logic
 *
 * Task: gap-2.1.3
 * Issue: Health factor calculation incorrect (missing LTV multiplier)
 * Fix: Apply LTV ratio to collateral value before dividing by debt
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useDepositPreview } from '../useDepositPreview';
import { TESTNET_ADDRESSES } from '@/config/chains/generated/testnet';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(),
  useAccount: jest.fn(),
}));

// Mock useRWAPrice
jest.mock('../useRWAPrice', () => ({
  useRWAPrice: jest.fn(),
}));

// Mock config
jest.mock('@/config', () => ({
  config: {
    tokens: {
      treasury: '0x8CA5Cd0293b9d3C8BC796083E806bc5bC381772A',
    },
  },
}));

const HYD_TOKEN_ADDRESS = TESTNET_ADDRESSES.core.hyd;
const ORACLE_ADDRESS = TESTNET_ADDRESSES.treasury.rwaPriceOracle;
const USER_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('useDepositPreview - Deposit Preview Logic (gap-2.1.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TEST 1: Functional - Calculate RWA value correctly
   *
   * BEFORE: Price calculation may have precision issues
   * AFTER: Price calculation is precise
   */
  it('[TEST 1] should calculate RWA value correctly', () => {
    const mockPrice = 2.5; // $2.5 per HYD token
    const amount = '100'; // 100 HYD tokens

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          // [oracle, tier, ltvRatio, mintDiscount, isActive]
          return { data: [ORACLE_ADDRESS, 1, 6000n, 0n, true] }; // 60% LTV
        }
        if (functionName === 'getUserPosition') {
          return { data: [HYD_TOKEN_ADDRESS, 0n, 0n, 0n] }; // No existing position
        }
        return { data: undefined };
      }
    );

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    // RWA value = 100 * $2.5 = $250
    // Expected: 250000000000000000000n (250 with 18 decimals)
    expect(result.current.preview).not.toBeNull();
    if (result.current.preview) {
      const expectedRwaValue = 250n * 10n ** 18n;
      expect(result.current.preview.rwaValue).toBe(expectedRwaValue);
    }
  });

  /**
   * TEST 2: Functional - Calculate USDP mint amount correctly with LTV
   *
   * BEFORE: USDP mint amount calculated correctly
   * AFTER: USDP mint amount = rwaValue * ltvRatio (no change expected)
   */
  it('[TEST 2] should calculate USDP mint amount with LTV ratio', () => {
    const mockPrice = 1.0; // $1.0 per token
    const amount = '1000'; // 1000 tokens

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          return { data: [ORACLE_ADDRESS, 1, 6000n, 0n, true] }; // 60% LTV
        }
        if (functionName === 'getUserPosition') {
          return { data: [HYD_TOKEN_ADDRESS, 0n, 0n, 0n] };
        }
        return { data: undefined };
      }
    );

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    // RWA value = 1000 * $1.0 = $1000
    // USDP mint = $1000 * 60% = $600
    expect(result.current.preview).not.toBeNull();
    if (result.current.preview) {
      const expectedUsdpMint = 600n * 10n ** 18n;
      expect(result.current.preview.usdpMintAmount).toBe(expectedUsdpMint);
    }
  });

  /**
   * TEST 3: Functional - Calculate health factor correctly with LTV
   *
   * BEFORE: healthFactor = totalRwaValue / totalDebt (WRONG)
   * AFTER: healthFactor = (totalRwaValue * ltvRatio / 100) / totalDebt (CORRECT)
   */
  it('[TEST 3] should calculate health factor with LTV ratio applied', () => {
    const mockPrice = 1.0;
    const amount = '1000'; // Deposit 1000 tokens

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          return { data: [ORACLE_ADDRESS, 1, 6000n, 0n, true] }; // 60% LTV
        }
        if (functionName === 'getUserPosition') {
          return { data: [HYD_TOKEN_ADDRESS, 0n, 0n, 0n] };
        }
        return { data: undefined };
      }
    );

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    /**
     * Calculation:
     * - RWA value = 1000 * $1.0 = $1000
     * - USDP mint = $1000 * 60% = $600
     * - Health Factor = ($1000 * 60%) / $600 = $600 / $600 = 1.0
     *
     * WRONG calculation (current): HF = $1000 / $600 = 1.67
     * CORRECT calculation: HF = ($1000 * 0.6) / $600 = 1.0
     */
    expect(result.current.preview).not.toBeNull();
    if (result.current.preview) {
      // Expected health factor = 1.0 (at maximum LTV, HF should be exactly 1.0)
      expect(result.current.preview.healthFactor).toBeCloseTo(1.0, 2);
    }
  });

  /**
   * TEST 4: Boundary - Health factor at liquidation threshold
   *
   * Verify health factor correctly reflects liquidation risk
   */
  it('[TEST 4] should show health factor < 1.15 as risky', () => {
    const mockPrice = 1.0;
    const amount = '100';

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          return { data: [ORACLE_ADDRESS, 1, 6000n, 0n, true] }; // 60% LTV
        }
        if (functionName === 'getUserPosition') {
          // Existing position: 100 tokens deposited, 65 USDP minted
          // Existing collateral value = 100 * $1 * 60% = $60
          // Health factor = $60 / $65 = 0.923 < 1.15 (risky!)
          const existingRwaAmount = 100n * 10n ** 18n;
          const existingUsdpMinted = 65n * 10n ** 18n;
          return {
            data: [HYD_TOKEN_ADDRESS, existingRwaAmount, existingUsdpMinted, 0n],
          };
        }
        return { data: undefined };
      }
    );

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    /**
     * After deposit:
     * - Total RWA = 200 tokens * $1 = $200
     * - Total USDP minted = 65 + 60 = $125
     * - Health Factor = ($200 * 60%) / $125 = $120 / $125 = 0.96
     *
     * HF < 1.15 indicates liquidation risk
     */
    expect(result.current.preview).not.toBeNull();
    if (result.current.preview) {
      expect(result.current.preview.healthFactor).toBeLessThan(1.15);
    }
  });

  /**
   * TEST 5: Exception - Handle zero amount
   *
   * Should return null for invalid input
   */
  it('[TEST 5] should return null for zero amount', () => {
    const mockPrice = 1.0;
    const amount = '0';

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    expect(result.current.preview).toBeNull();
  });

  /**
   * TEST 6: Exception - Handle zero price
   *
   * Should return null when price is unavailable
   */
  it('[TEST 6] should return null when price is zero', () => {
    const mockPrice = 0;
    const amount = '100';

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    expect(result.current.preview).toBeNull();
  });

  /**
   * TEST 7: Security - LTV ratio bounds check
   *
   * Ensure LTV ratio is within valid range (0-100%)
   */
  it('[TEST 7] should handle valid LTV ratios', () => {
    const mockPrice = 1.0;
    const amount = '100';

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          return { data: [ORACLE_ADDRESS, 1, 8000n, 0n, true] }; // 80% LTV
        }
        if (functionName === 'getUserPosition') {
          return { data: [HYD_TOKEN_ADDRESS, 0n, 0n, 0n] };
        }
        return { data: undefined };
      }
    );

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 80,
      })
    );

    expect(result.current.preview).not.toBeNull();
    if (result.current.preview) {
      expect(result.current.preview.ltvRatio).toBe(80);
      expect(result.current.preview.ltvRatio).toBeGreaterThan(0);
      expect(result.current.preview.ltvRatio).toBeLessThanOrEqual(100);
    }
  });

  /**
   * TEST 8: Performance - Calculation completes quickly
   *
   * Ensure preview calculation is fast
   */
  it('[TEST 8] should calculate preview quickly', () => {
    const mockPrice = 1.0;
    const amount = '1000';

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          return { data: [ORACLE_ADDRESS, 1, 6000n, 0n, true] };
        }
        if (functionName === 'getUserPosition') {
          return { data: [HYD_TOKEN_ADDRESS, 0n, 0n, 0n] };
        }
        return { data: undefined };
      }
    );

    const start = Date.now();

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    const duration = Date.now() - start;

    expect(result.current.preview).not.toBeNull();
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  /**
   * TEST 9: Compatibility - Handle existing positions
   *
   * Correctly merge new deposit with existing position
   */
  it('[TEST 9] should correctly merge with existing position', () => {
    const mockPrice = 1.0;
    const amount = '500'; // New deposit

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          return { data: [ORACLE_ADDRESS, 1, 6000n, 0n, true] }; // 60% LTV
        }
        if (functionName === 'getUserPosition') {
          // Existing: 500 tokens, 300 USDP minted
          const existingRwaAmount = 500n * 10n ** 18n;
          const existingUsdpMinted = 300n * 10n ** 18n;
          return {
            data: [HYD_TOKEN_ADDRESS, existingRwaAmount, existingUsdpMinted, 0n],
          };
        }
        return { data: undefined };
      }
    );

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    /**
     * After deposit:
     * - Total RWA = (500 + 500) * $1 = $1000
     * - New USDP mint = 300 USDP (from new deposit)
     * - Total USDP = 300 (existing) + 300 (new) = $600
     * - Health Factor = ($1000 * 60%) / $600 = 1.0
     */
    expect(result.current.preview).not.toBeNull();
    if (result.current.preview) {
      // New mint amount should be 300 USDP
      const expectedNewMint = 300n * 10n ** 18n;
      expect(result.current.preview.usdpMintAmount).toBe(expectedNewMint);

      // Health factor should be 1.0 (at maximum LTV)
      expect(result.current.preview.healthFactor).toBeCloseTo(1.0, 1);
    }
  });

  /**
   * TEST 10: Functional - Mint discount applied correctly
   *
   * Verify mint discount reduces USDP mint amount
   */
  it('[TEST 10] should apply mint discount correctly', () => {
    const mockPrice = 1.0;
    const amount = '1000';

    (require('../useRWAPrice').useRWAPrice as jest.Mock).mockReturnValue({
      price: mockPrice,
      isLoading: false,
    });

    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: USER_ADDRESS,
    });

    (require('wagmi').useReadContract as jest.Mock).mockImplementation(
      ({ functionName }) => {
        if (functionName === 'BPS_DENOMINATOR') {
          return { data: 10000n };
        }
        if (functionName === 'rwaAssets') {
          // LTV 60%, mint discount 10%
          return { data: [ORACLE_ADDRESS, 1, 6000n, 1000n, true] };
        }
        if (functionName === 'getUserPosition') {
          return { data: [HYD_TOKEN_ADDRESS, 0n, 0n, 0n] };
        }
        return { data: undefined };
      }
    );

    const { result } = renderHook(() =>
      useDepositPreview({
        assetAddress: HYD_TOKEN_ADDRESS,
        amount,
        oracleAddress: ORACLE_ADDRESS,
        ltvRatio: 60,
      })
    );

    /**
     * Calculation:
     * - RWA value = 1000 * $1 = $1000
     * - USDP before discount = $1000 * 60% = $600
     * - USDP after 10% discount = $600 * 90% = $540
     */
    expect(result.current.preview).not.toBeNull();
    if (result.current.preview) {
      const expectedUsdpMint = 540n * 10n ** 18n;
      expect(result.current.preview.usdpMintAmount).toBe(expectedUsdpMint);
      expect(result.current.preview.mintDiscount).toBe(10);
    }
  });
});
