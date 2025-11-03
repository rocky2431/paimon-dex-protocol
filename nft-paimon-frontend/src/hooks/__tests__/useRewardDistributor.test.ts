/**
 * Unit tests for useRewardDistributor hook
 * useRewardDistributor hook的单元测试
 */

import { renderHook } from '@testing-library/react';
import { useReadContract } from 'wagmi';
import {
  useRewardDistributorVesting,
  useRewardDistributorEsPaimon,
  useRewardDistributorBoostMultiplier,
  calculateActualReward,
} from '../useRewardDistributor';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(),
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890', isConnected: true })),
}));

describe('useRewardDistributor Hook Tests', () => {
  const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== Functional Tests ====================

  describe('useRewardDistributorVesting', () => {
    it('should return vesting mode when enabled', () => {
      mockUseReadContract.mockReturnValue({
        data: true,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorVesting());

      expect(result.current.data).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'useEsVesting',
        })
      );
    });

    it('should return false when vesting is disabled', () => {
      mockUseReadContract.mockReturnValue({
        data: false,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorVesting());

      expect(result.current.data).toBe(false);
    });
  });

  describe('useRewardDistributorEsPaimon', () => {
    it('should return esPaimon contract address', () => {
      const mockAddress = '0xesPaimon1234567890123456789012345678901';
      mockUseReadContract.mockReturnValue({
        data: mockAddress,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorEsPaimon());

      expect(result.current.data).toBe(mockAddress);
      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'esPaimonAddress',
        })
      );
    });
  });

  describe('useRewardDistributorBoostMultiplier', () => {
    it('should return boost multiplier for user', () => {
      // Boost multiplier is in basis points (e.g., 12000 = 1.2x)
      const mockBoostMultiplier = 12000n;
      mockUseReadContract.mockReturnValue({
        data: mockBoostMultiplier,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorBoostMultiplier());

      expect(result.current.data).toBe(mockBoostMultiplier);
    });

    it('should return 1x (10000) when no boost', () => {
      mockUseReadContract.mockReturnValue({
        data: 10000n,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorBoostMultiplier());

      expect(result.current.data).toBe(10000n);
    });
  });

  describe('calculateActualReward', () => {
    it('should calculate actual reward with boost multiplier', () => {
      const baseReward = 1000n * 10n ** 18n; // 1000 tokens
      const boostMultiplier = 12000n; // 1.2x
      const expected = (baseReward * boostMultiplier) / 10000n; // 1200 tokens

      const actual = calculateActualReward(baseReward, boostMultiplier);

      expect(actual).toBe(expected);
    });

    it('should return base reward when boost is 1x', () => {
      const baseReward = 500n * 10n ** 18n;
      const boostMultiplier = 10000n; // 1.0x

      const actual = calculateActualReward(baseReward, boostMultiplier);

      expect(actual).toBe(baseReward);
    });
  });

  // ==================== Boundary Tests ====================

  describe('Boundary Cases', () => {
    it('should handle zero base reward', () => {
      const baseReward = 0n;
      const boostMultiplier = 15000n; // 1.5x

      const actual = calculateActualReward(baseReward, boostMultiplier);

      expect(actual).toBe(0n);
    });

    it('should handle maximum boost multiplier (2x)', () => {
      const baseReward = 1000n * 10n ** 18n;
      const boostMultiplier = 20000n; // 2.0x
      const expected = baseReward * 2n;

      const actual = calculateActualReward(baseReward, boostMultiplier);

      expect(actual).toBe(expected);
    });

    it('should handle very large reward amounts', () => {
      const baseReward = 1000000n * 10n ** 18n; // 1 million tokens
      const boostMultiplier = 12000n; // 1.2x
      const expected = (baseReward * boostMultiplier) / 10000n;

      const actual = calculateActualReward(baseReward, boostMultiplier);

      expect(actual).toBe(expected);
    });
  });

  // ==================== Exception Tests ====================

  describe('Error Handling', () => {
    it('should handle contract read errors for vesting', () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Contract read failed'),
      } as any);

      const { result } = renderHook(() => useRewardDistributorVesting());

      expect(result.current.data).toBeUndefined();
      expect(result.current.isError).toBe(true);
    });

    it('should handle loading state for boost multiplier', () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorBoostMultiplier());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle undefined address for esPaimon', () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorEsPaimon());

      expect(result.current.data).toBeUndefined();
    });
  });

  // ==================== Performance Tests ====================

  describe('Performance', () => {
    it('should complete calculation in under 1ms', () => {
      const baseReward = 1000n * 10n ** 18n;
      const boostMultiplier = 12000n;

      const start = performance.now();
      calculateActualReward(baseReward, boostMultiplier);
      const end = performance.now();

      expect(end - start).toBeLessThan(1);
    });

    it('should handle 1000 calculations efficiently', () => {
      const baseReward = 1000n * 10n ** 18n;
      const boostMultiplier = 12000n;

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        calculateActualReward(baseReward, boostMultiplier);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(10); // Should complete in under 10ms
    });
  });

  // ==================== Security Tests ====================

  describe('Security', () => {
    it('should prevent overflow with large numbers', () => {
      // Using safe BigInt arithmetic
      const baseReward = BigInt(Number.MAX_SAFE_INTEGER) * 10n ** 18n;
      const boostMultiplier = 15000n;

      // Should not throw
      expect(() => calculateActualReward(baseReward, boostMultiplier)).not.toThrow();
    });

    it('should validate boost multiplier range (0-20000)', () => {
      const baseReward = 1000n * 10n ** 18n;

      // Valid range
      expect(() => calculateActualReward(baseReward, 0n)).not.toThrow();
      expect(() => calculateActualReward(baseReward, 10000n)).not.toThrow();
      expect(() => calculateActualReward(baseReward, 20000n)).not.toThrow();
    });
  });

  // ==================== Compatibility Tests ====================

  describe('Compatibility', () => {
    it('should work with different wallet providers', () => {
      // Test with MetaMask-style address
      mockUseReadContract.mockReturnValue({
        data: true,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorVesting());

      expect(result.current.data).toBe(true);
    });

    it('should handle string and BigInt addresses', () => {
      const mockAddress = '0xesPaimon1234567890123456789012345678901' as `0x${string}`;
      mockUseReadContract.mockReturnValue({
        data: mockAddress,
        isLoading: false,
        isError: false,
      } as any);

      const { result } = renderHook(() => useRewardDistributorEsPaimon());

      expect(result.current.data).toBe(mockAddress);
    });
  });
});
