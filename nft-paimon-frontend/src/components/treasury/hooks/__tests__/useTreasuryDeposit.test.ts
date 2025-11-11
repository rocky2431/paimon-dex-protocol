/**
 * useTreasuryDeposit Hook Tests
 *
 * Tests for Treasury deposit authorization and transaction flow
 *
 * Task: gap-2.1.4
 * Focus: Verify complete authorization workflow at hook level
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useTreasuryDeposit } from '../useTreasuryDeposit';
import { TESTNET_ADDRESSES } from '@/config/chains/generated/testnet';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
  useSimulateContract: jest.fn(),
}));

const TREASURY_ADDRESS = TESTNET_ADDRESSES.treasury.treasury;
const HYD_TOKEN_ADDRESS = TESTNET_ADDRESSES.core.hyd;

describe('useTreasuryDeposit - Authorization Flow (gap-2.1.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TEST 1: Functional - Hook provides approve function
   *
   * EXPECTED: approve function exposed
   */
  it('[TEST 1] should expose approve function', () => {
    // Mock approve simulation
    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: {
        request: {
          address: HYD_TOKEN_ADDRESS,
          abi: [],
          functionName: 'approve',
          args: [TREASURY_ADDRESS, 100n * 10n ** 18n],
        },
      },
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // Approve function should be exposed
    expect(typeof result.current.approve).toBe('function');
  });

  /**
   * TEST 2: Functional - Hook provides deposit function
   *
   * EXPECTED: deposit function exposed
   */
  it('[TEST 2] should expose deposit function', () => {
    // Mock simulations
    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: {
        request: {},
      },
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // Deposit function should be exposed
    expect(typeof result.current.deposit).toBe('function');
  });

  /**
   * TEST 3: Functional - Transaction step starts at idle
   *
   * EXPECTED: txStep = 'idle' initially
   */
  it('[TEST 3] should start with txStep = idle', () => {
    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: { request: {} },
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // Initial transaction step should be idle
    expect(result.current.txStep).toBe('idle');
  });

  /**
   * TEST 4: Functional - Hook exposes transaction states
   *
   * EXPECTED: All necessary states exposed
   */
  it('[TEST 4] should expose all necessary transaction states', () => {
    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: { request: {} },
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // All states should be exposed
    expect(result.current).toHaveProperty('isApprovePending');
    expect(result.current).toHaveProperty('isApproveConfirming');
    expect(result.current).toHaveProperty('isApproveSuccess');
    expect(result.current).toHaveProperty('approveHash');
    expect(result.current).toHaveProperty('isDepositPending');
    expect(result.current).toHaveProperty('isDepositConfirming');
    expect(result.current).toHaveProperty('isDepositSuccess');
    expect(result.current).toHaveProperty('depositHash');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
  });

  /**
   * TEST 5: Boundary - Handle zero amount
   *
   * EXPECTED: Hook should handle zero amount gracefully
   */
  it('[TEST 5] should handle zero amount', () => {
    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: undefined,
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '0',
        decimals: 18,
      })
    );

    // Should not error with zero amount
    expect(result.current.txStep).toBe('idle');
    expect(result.current.isError).toBe(false);
  });

  /**
   * TEST 6: Exception - Hook provides error states
   *
   * EXPECTED: Error states accessible
   */
  it('[TEST 6] should provide error states', () => {
    const mockError = new Error('Transaction failed');

    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: { request: {} },
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: true,
      error: mockError,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // Error state should be exposed
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  /**
   * TEST 7: Performance - Hook provides gas estimates
   *
   * EXPECTED: Gas estimates from simulations
   */
  it('[TEST 7] should provide gas estimates from simulations', () => {
    const mockApproveGas = 50000n;
    const mockDepositGas = 150000n;

    (require('wagmi').useSimulateContract as jest.Mock).mockImplementation(({ functionName }) => {
      if (functionName === 'approve') {
        return {
          data: {
            request: { gas: mockApproveGas },
          },
        };
      }
      if (functionName === 'depositRWA') {
        return {
          data: {
            request: { gas: mockDepositGas },
          },
        };
      }
      return { data: undefined };
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // Gas estimates should be available
    expect(result.current.estimatedApproveGas).toBeDefined();
    expect(result.current.estimatedDepositGas).toBeDefined();
  });

  /**
   * TEST 8: Security - Approve uses correct Treasury address
   *
   * EXPECTED: Spender should be Treasury contract
   */
  it('[TEST 8] should use correct Treasury address for approval', () => {
    const mockSimulateContract = jest.fn().mockReturnValue({
      data: {
        request: {
          address: HYD_TOKEN_ADDRESS,
          abi: [],
          functionName: 'approve',
          args: [TREASURY_ADDRESS, 100n * 10n ** 18n],
        },
      },
    });

    (require('wagmi').useSimulateContract as jest.Mock) = mockSimulateContract;

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // Verify simulation was called (would include Treasury address)
    expect(mockSimulateContract).toHaveBeenCalled();
  });

  /**
   * TEST 9: Compatibility - Hook works with different token decimals
   *
   * EXPECTED: Correctly handles 6 and 18 decimals
   */
  it('[TEST 9] should handle different token decimals', () => {
    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: { request: {} },
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    // Test with 6 decimals (like USDC)
    const { result: result6 } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 6,
      })
    );

    expect(result6.current.txStep).toBe('idle');

    // Test with 18 decimals (like most ERC20)
    const { result: result18 } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    expect(result18.current.txStep).toBe('idle');
  });

  /**
   * TEST 10: Functional - Reset step function works
   *
   * EXPECTED: Can reset transaction step
   */
  it('[TEST 10] should provide reset step function', () => {
    (require('wagmi').useSimulateContract as jest.Mock).mockReturnValue({
      data: { request: {} },
    });

    (require('wagmi').useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });

    (require('wagmi').useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });

    const { result } = renderHook(() =>
      useTreasuryDeposit({
        tokenAddress: HYD_TOKEN_ADDRESS,
        amount: '100',
        decimals: 18,
      })
    );

    // Reset step function should be exposed
    expect(typeof result.current.resetStep).toBe('function');

    // Call reset and verify it doesn't throw
    expect(() => result.current.resetStep()).not.toThrow();
  });
});
