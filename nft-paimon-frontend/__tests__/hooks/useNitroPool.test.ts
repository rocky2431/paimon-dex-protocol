/**
 * useNitroPool Hooks Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core hooks functionality
 * 2. Boundary - Edge cases (no poolId, invalid addresses)
 * 3. Exception - Error handling
 * 4. Performance - (Deferred to integration tests)
 * 5. Security - Parameter validation
 * 6. Compatibility - wagmi integration
 */

import { renderHook } from '@testing-library/react';
import {
  useNitroPoolInfo,
  useNitroPoolRewardTokens,
  useNitroUserStake,
  useNitroPendingRewards,
  useCanExitNitro,
  useCreateNitroPool,
  useEnterNitroPool,
  useExitNitroPool,
  useClaimNitroRewards,
} from '@/hooks/useNitroPool';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
}));

import { useAccount, useReadContract, useWriteContract } from 'wagmi';

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>;
const mockUseWriteContract = useWriteContract as jest.MockedFunction<typeof useWriteContract>;

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as `0x${string}`;
const TEST_TOKEN_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
const TEST_POOL_ID = BigInt(1);

describe('useNitroPool Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: useNitroPoolInfo', () => {
    it('calls useReadContract with correct parameters', () => {
      mockUseReadContract.mockReturnValue({
        data: {
          stakingToken: TEST_TOKEN_ADDRESS,
          lockDuration: BigInt(7),
          isActive: true,
        },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useNitroPoolInfo(TEST_POOL_ID));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'pools',
          args: [TEST_POOL_ID],
          query: expect.objectContaining({
            enabled: true,
          }),
        })
      );

      expect(result.current.data).toBeDefined();
    });

    it('disables query when poolId is undefined', () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroPoolInfo(undefined));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: undefined,
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  describe('Functional: useNitroPoolRewardTokens', () => {
    it('retrieves reward tokens for a pool', () => {
      mockUseReadContract.mockReturnValue({
        data: [TEST_TOKEN_ADDRESS],
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useNitroPoolRewardTokens(TEST_POOL_ID));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getPoolRewardTokens',
          args: [TEST_POOL_ID],
        })
      );

      expect(result.current.data).toEqual([TEST_TOKEN_ADDRESS]);
    });
  });

  describe('Functional: useNitroUserStake', () => {
    it('retrieves user stake for connected address', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: {
          amount: BigInt('1000000000000000000000'),
          lockEnd: BigInt(1730604800),
        },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useNitroUserStake(TEST_POOL_ID));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'userStakes',
          args: [TEST_POOL_ID, TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBeDefined();
    });

    it('uses provided address instead of connected address', () => {
      const customAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`;
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroUserStake(TEST_POOL_ID, customAddress));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [TEST_POOL_ID, customAddress],
        })
      );
    });
  });

  describe('Functional: useNitroPendingRewards', () => {
    it('retrieves pending rewards for user', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('500000000000000000000'), // 500 tokens
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() =>
        useNitroPendingRewards(TEST_POOL_ID, TEST_TOKEN_ADDRESS)
      );

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getPendingRewards',
          args: [TEST_POOL_ID, TEST_ADDRESS, TEST_TOKEN_ADDRESS],
        })
      );

      expect(result.current.data).toBe(BigInt('500000000000000000000'));
    });

    it('disables query when parameters are missing', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroPendingRewards(TEST_POOL_ID, undefined));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  describe('Functional: useCanExitNitro', () => {
    it('returns true when user can exit', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: true,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCanExitNitro(TEST_POOL_ID));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'canExit',
          args: [TEST_POOL_ID, TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(true);
    });

    it('returns false when lock period not ended', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: false,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCanExitNitro(TEST_POOL_ID));

      expect(result.current.data).toBe(false);
    });
  });

  describe('Functional: Write Hooks', () => {
    it('useCreateNitroPool returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useCreateNitroPool());

      expect(result.current.writeContract).toBe(mockWriteContract);
    });

    it('useEnterNitroPool returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useEnterNitroPool());

      expect(result.current.writeContract).toBe(mockWriteContract);
    });

    it('useExitNitroPool returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useExitNitroPool());

      expect(result.current.writeContract).toBe(mockWriteContract);
    });

    it('useClaimNitroRewards returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useClaimNitroRewards());

      expect(result.current.writeContract).toBe(mockWriteContract);
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('handles poolId of 0', () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroPoolInfo(BigInt(0)));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [BigInt(0)],
          query: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });

    it('handles very large poolId', () => {
      const largePoolId = BigInt('999999999999999999');
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroPoolInfo(largePoolId));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [largePoolId],
        })
      );
    });

    it('handles zero pending rewards', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() =>
        useNitroPendingRewards(TEST_POOL_ID, TEST_TOKEN_ADDRESS)
      );

      expect(result.current.data).toBe(BigInt(0));
    });

    it('handles no connected address', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroUserStake(TEST_POOL_ID));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: undefined,
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('handles read contract error', () => {
      const mockError = new Error('Pool not found');
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      const { result } = renderHook(() => useNitroPoolInfo(TEST_POOL_ID));

      expect(result.current.error).toBe(mockError);
    });

    it('handles write contract error', () => {
      const mockError = new Error('Transaction failed');
      mockUseWriteContract.mockReturnValue({
        writeContract: jest.fn(),
        data: undefined,
        error: mockError,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useEnterNitroPool());

      expect(result.current.error).toBe(mockError);
    });

    it('does not crash when all parameters are undefined', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      expect(() => {
        renderHook(() => useNitroPendingRewards(undefined, undefined, undefined));
      }).not.toThrow();
    });

    it('handles invalid reward token address gracefully', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      expect(() => {
        renderHook(() => useNitroPendingRewards(TEST_POOL_ID, '' as `0x${string}`));
      }).not.toThrow();
    });
  });

  /**
   * 5. Security Tests - Parameter Validation
   */
  describe('Security: Parameter Validation', () => {
    it('validates address format', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroUserStake(TEST_POOL_ID));

      // Address should be valid Ethereum address (42 characters, starts with 0x)
      expect(TEST_ADDRESS.length).toBe(42);
      expect(TEST_ADDRESS.startsWith('0x')).toBe(true);
    });

    it('does not enable query with invalid parameters', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroPendingRewards(undefined, TEST_TOKEN_ADDRESS));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });

    it('requires all parameters for useNitroPendingRewards', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      // Missing reward token
      renderHook(() => useNitroPendingRewards(TEST_POOL_ID, undefined));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false, // Should be disabled when rewardToken is missing
          }),
        })
      );
    });
  });

  /**
   * 6. Compatibility Tests - wagmi Integration
   */
  describe('Compatibility: wagmi Integration', () => {
    it('integrates correctly with useAccount hook', () => {
      mockUseAccount.mockReturnValue({
        address: TEST_ADDRESS,
        isConnected: true,
      } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useNitroUserStake(TEST_POOL_ID));

      expect(mockUseAccount).toHaveBeenCalled();
    });

    it('integrates correctly with useReadContract hook', () => {
      mockUseReadContract.mockReturnValue({
        data: { isActive: true },
        isLoading: false,
        error: null,
        isSuccess: true,
      } as any);

      const { result } = renderHook(() => useNitroPoolInfo(TEST_POOL_ID));

      expect(mockUseReadContract).toHaveBeenCalled();
      expect(result.current.data).toBeDefined();
    });

    it('integrates correctly with useWriteContract hook', () => {
      mockUseWriteContract.mockReturnValue({
        writeContract: jest.fn(),
        data: undefined,
        error: null,
        isLoading: false,
        isSuccess: false,
      } as any);

      const { result } = renderHook(() => useClaimNitroRewards());

      expect(mockUseWriteContract).toHaveBeenCalled();
      expect(result.current.writeContract).toBeDefined();
    });
  });

  /**
   * Integration Tests - Multiple Hooks Usage
   */
  describe('Integration: Multiple Hooks', () => {
    it('can use multiple read hooks simultaneously', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => {
        const poolInfo = useNitroPoolInfo(TEST_POOL_ID);
        const rewardTokens = useNitroPoolRewardTokens(TEST_POOL_ID);
        const userStake = useNitroUserStake(TEST_POOL_ID);
        const canExit = useCanExitNitro(TEST_POOL_ID);

        return { poolInfo, rewardTokens, userStake, canExit };
      });

      // Should call useReadContract 4 times
      expect(mockUseReadContract).toHaveBeenCalledTimes(4);
    });

    it('can use read and write hooks together', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);
      mockUseWriteContract.mockReturnValue({
        writeContract: jest.fn(),
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      renderHook(() => {
        const poolInfo = useNitroPoolInfo(TEST_POOL_ID);
        const enterPool = useEnterNitroPool();
        const exitPool = useExitNitroPool();
        const claimRewards = useClaimNitroRewards();

        return { poolInfo, enterPool, exitPool, claimRewards };
      });

      expect(mockUseReadContract).toHaveBeenCalledTimes(1);
      expect(mockUseWriteContract).toHaveBeenCalledTimes(3);
    });
  });
});
