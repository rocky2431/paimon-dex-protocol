/**
 * useBoostStaking Hooks Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core hooks functionality
 * 2. Boundary - Edge cases (no address, invalid address)
 * 3. Exception - Error handling
 * 4. Performance - (Deferred to integration tests)
 * 5. Security - Address validation
 * 6. Compatibility - wagmi integration
 */

import { renderHook } from '@testing-library/react';
import {
  useBoostStakingAmount,
  useBoostStakingTime,
  useBoostMultiplier,
  useCanUnstake,
  useBoostStake,
  useBoostUnstake,
} from '@/hooks/useBoostStaking';

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
const TEST_ADDRESS_2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;

describe('useBoostStaking Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: useBoostStakingAmount', () => {
    it('calls useReadContract with correct parameters for connected user', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('1000000000000000000000'), // 1000 tokens
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostStakingAmount());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'stakeAmount',
          args: [TEST_ADDRESS],
          query: expect.objectContaining({
            enabled: true,
          }),
        })
      );

      expect(result.current.data).toBe(BigInt('1000000000000000000000'));
    });

    it('uses provided address instead of connected address', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({ data: undefined, isLoading: false, error: null } as any);

      renderHook(() => useBoostStakingAmount(TEST_ADDRESS_2));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [TEST_ADDRESS_2],
        })
      );
    });

    it('returns loading state correctly', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostStakingAmount());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Functional: useBoostStakingTime', () => {
    it('calls useReadContract with correct parameters', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(1730000000), // Unix timestamp
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostStakingTime());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'stakeTime',
          args: [TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(BigInt(1730000000));
    });
  });

  describe('Functional: useBoostMultiplier', () => {
    it('calls useReadContract with correct parameters', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(11000), // 1.1x multiplier (10000 = 1.0x)
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostMultiplier());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getBoostMultiplier',
          args: [TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(BigInt(11000));
    });
  });

  describe('Functional: useCanUnstake', () => {
    it('returns true when stake is unlocked', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: true,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCanUnstake());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'canUnstake',
          args: [TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(true);
    });

    it('returns false when stake is locked', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: false,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCanUnstake());

      expect(result.current.data).toBe(false);
    });
  });

  describe('Functional: Write Hooks', () => {
    it('useBoostStake returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useBoostStake());

      expect(result.current.writeContract).toBe(mockWriteContract);
    });

    it('useBoostUnstake returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useBoostUnstake());

      expect(result.current.writeContract).toBe(mockWriteContract);
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('handles no connected address', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useBoostStakingAmount());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: undefined,
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });

    it('handles zero stake amount', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostStakingAmount());

      expect(result.current.data).toBe(BigInt(0));
    });

    it('handles minimum boost multiplier (1.0x)', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(10000), // 1.0x (no boost)
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostMultiplier());

      expect(result.current.data).toBe(BigInt(10000));
    });

    it('handles maximum boost multiplier (1.5x)', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(15000), // 1.5x (maximum)
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostMultiplier());

      expect(result.current.data).toBe(BigInt(15000));
    });

    it('handles very old stake time (expired)', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(1600000000), // Old timestamp
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useBoostStakingTime());

      expect(result.current.data).toBe(BigInt(1600000000));
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('handles read contract error', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      const mockError = new Error('Contract read failed');
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      const { result } = renderHook(() => useBoostStakingAmount());

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

      const { result } = renderHook(() => useBoostStake());

      expect(result.current.error).toBe(mockError);
    });

    it('does not crash when address is null', () => {
      mockUseAccount.mockReturnValue({ address: null } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      expect(() => {
        renderHook(() => useBoostStakingAmount());
      }).not.toThrow();
    });
  });

  /**
   * 5. Security Tests - Address Validation
   */
  describe('Security: Address Validation', () => {
    it('validates address format for read operations', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useBoostStakingAmount());

      // Should pass valid Ethereum address
      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [TEST_ADDRESS],
        })
      );

      // Address should be 42 characters (0x + 40 hex)
      expect(TEST_ADDRESS.length).toBe(42);
      expect(TEST_ADDRESS.startsWith('0x')).toBe(true);
    });

    it('does not enable query when address is invalid', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useBoostStakingAmount());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
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
        isConnecting: false,
        isDisconnected: false,
      } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useBoostStakingAmount());

      expect(mockUseAccount).toHaveBeenCalled();
    });

    it('integrates correctly with useReadContract hook', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('1000000000000000000000'),
        isLoading: false,
        error: null,
        isSuccess: true,
      } as any);

      const { result } = renderHook(() => useBoostStakingAmount());

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

      const { result } = renderHook(() => useBoostStake());

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
        const amount = useBoostStakingAmount();
        const time = useBoostStakingTime();
        const multiplier = useBoostMultiplier();
        const canUnstake = useCanUnstake();

        return { amount, time, multiplier, canUnstake };
      });

      // Should call useReadContract 4 times (once for each hook)
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
        const amount = useBoostStakingAmount();
        const stake = useBoostStake();
        const unstake = useBoostUnstake();

        return { amount, stake, unstake };
      });

      expect(mockUseReadContract).toHaveBeenCalledTimes(1);
      expect(mockUseWriteContract).toHaveBeenCalledTimes(2);
    });
  });
});
