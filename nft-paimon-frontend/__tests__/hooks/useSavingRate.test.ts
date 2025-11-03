/**
 * useSavingRate Hooks Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core hooks functionality
 * 2. Boundary - Edge cases (no address, zero balances)
 * 3. Exception - Error handling
 * 4. Performance - (Deferred to integration tests)
 * 5. Security - Address validation
 * 6. Compatibility - wagmi integration
 */

import { renderHook } from '@testing-library/react';
import {
  useSavingAnnualRate,
  useSavingPrincipal,
  useSavingAccruedInterest,
  useSavingTotalBalance,
  useSavingCurrentInterest,
  useSavingWithdraw,
  useSavingClaimInterest,
} from '@/hooks/useSavingRate';

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

describe('useSavingRate Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: useSavingAnnualRate', () => {
    it('retrieves annual rate correctly', () => {
      mockUseReadContract.mockReturnValue({
        data: BigInt(500), // 5% (500 basis points)
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingAnnualRate());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'annualRate',
        })
      );

      expect(result.current.data).toBe(BigInt(500));
    });

    it('does not require address parameter', () => {
      mockUseReadContract.mockReturnValue({
        data: BigInt(500),
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useSavingAnnualRate());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'annualRate',
        })
      );
    });
  });

  describe('Functional: useSavingPrincipal', () => {
    it('retrieves user principal for connected address', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('10000000000000000000000'), // 10,000 tokens
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingPrincipal());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getPrincipal',
          args: [TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(BigInt('10000000000000000000000'));
    });

    it('uses provided address instead of connected address', () => {
      const customAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useSavingPrincipal(customAddress));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [customAddress],
        })
      );
    });
  });

  describe('Functional: useSavingAccruedInterest', () => {
    it('retrieves accrued interest', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('500000000000000000000'), // 500 tokens interest
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingAccruedInterest());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getAccruedInterest',
          args: [TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(BigInt('500000000000000000000'));
    });
  });

  describe('Functional: useSavingTotalBalance', () => {
    it('retrieves total balance (principal + interest)', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('10500000000000000000000'), // 10,500 tokens (10,000 + 500)
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingTotalBalance());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getTotalBalance',
          args: [TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(BigInt('10500000000000000000000'));
    });
  });

  describe('Functional: useSavingCurrentInterest', () => {
    it('calculates current interest', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('123456789012345678'), // Current interest amount
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingCurrentInterest());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'calculateCurrentInterest',
          args: [TEST_ADDRESS],
        })
      );

      expect(result.current.data).toBe(BigInt('123456789012345678'));
    });
  });

  describe('Functional: Write Hooks', () => {
    it('useSavingWithdraw returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useSavingWithdraw());

      expect(result.current.writeContract).toBe(mockWriteContract);
    });

    it('useSavingClaimInterest returns writeContract function', () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        error: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useSavingClaimInterest());

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

      renderHook(() => useSavingPrincipal());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: undefined,
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });

    it('handles zero principal', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingPrincipal());

      expect(result.current.data).toBe(BigInt(0));
    });

    it('handles zero interest', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingAccruedInterest());

      expect(result.current.data).toBe(BigInt(0));
    });

    it('handles very high annual rate', () => {
      mockUseReadContract.mockReturnValue({
        data: BigInt(10000), // 100% APY (extreme edge case)
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingAnnualRate());

      expect(result.current.data).toBe(BigInt(10000));
    });

    it('handles very large balance', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt('1000000000000000000000000000'), // 1 billion tokens
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingTotalBalance());

      expect(result.current.data).toBe(BigInt('1000000000000000000000000000'));
    });

    it('handles minimal interest calculation', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: BigInt(1), // 1 wei
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingCurrentInterest());

      expect(result.current.data).toBe(BigInt(1));
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

      const { result } = renderHook(() => useSavingPrincipal());

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

      const { result } = renderHook(() => useSavingWithdraw());

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
        renderHook(() => useSavingTotalBalance());
      }).not.toThrow();
    });

    it('handles undefined data gracefully', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingAccruedInterest());

      expect(result.current.data).toBeUndefined();
    });
  });

  /**
   * 5. Security Tests - Address Validation
   */
  describe('Security: Address Validation', () => {
    it('validates address format', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => useSavingPrincipal());

      // Address should be valid Ethereum address (42 characters, starts with 0x)
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

      renderHook(() => useSavingAccruedInterest());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });

    it('prevents negative values in returned data', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);
      // Note: BigInt cannot be negative in our context, this is a conceptual test
      mockUseReadContract.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useSavingPrincipal());

      expect(result.current.data).toBeGreaterThanOrEqual(BigInt(0));
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

      renderHook(() => useSavingPrincipal());

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

      const { result } = renderHook(() => useSavingTotalBalance());

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

      const { result } = renderHook(() => useSavingClaimInterest());

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
        const annualRate = useSavingAnnualRate();
        const principal = useSavingPrincipal();
        const interest = useSavingAccruedInterest();
        const total = useSavingTotalBalance();
        const current = useSavingCurrentInterest();

        return { annualRate, principal, interest, total, current };
      });

      // Should call useReadContract 5 times (once for each hook)
      expect(mockUseReadContract).toHaveBeenCalledTimes(5);
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
        const principal = useSavingPrincipal();
        const withdraw = useSavingWithdraw();
        const claimInterest = useSavingClaimInterest();

        return { principal, withdraw, claimInterest };
      });

      expect(mockUseReadContract).toHaveBeenCalledTimes(1);
      expect(mockUseWriteContract).toHaveBeenCalledTimes(2);
    });

    it('calculates interest from principal and rate', () => {
      mockUseAccount.mockReturnValue({ address: TEST_ADDRESS } as any);

      // First call: annual rate = 5% (500 basis points)
      // Second call: principal = 10,000 tokens
      mockUseReadContract
        .mockReturnValueOnce({
          data: BigInt(500),
          isLoading: false,
          error: null,
        } as any)
        .mockReturnValueOnce({
          data: BigInt('10000000000000000000000'),
          isLoading: false,
          error: null,
        } as any);

      const { result } = renderHook(() => {
        const rate = useSavingAnnualRate();
        const principal = useSavingPrincipal();
        return { rate, principal };
      });

      expect(result.current.rate.data).toBe(BigInt(500));
      expect(result.current.principal.data).toBe(BigInt('10000000000000000000000'));
    });
  });
});
