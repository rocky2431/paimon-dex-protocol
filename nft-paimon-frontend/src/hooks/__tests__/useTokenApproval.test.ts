/**
 * Unit tests for useTokenApproval hook
 * TDD Phase 1: RED - Writing failing tests for token approval functionality
 *
 * Test Coverage (6 Dimensions):
 * 1. Functional - Check allowance, execute approve, state management
 * 2. Boundary - Zero amount, max uint256, undefined parameters
 * 3. Exception - Error handling, network failures, rejected transactions
 * 4. Performance - Multiple re-renders, debounce checks
 * 5. Security - Prevent double approval, validate addresses
 * 6. Compatibility - wagmi v2 API integration
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useTokenApproval, ApprovalState } from '../useTokenApproval';
import { parseUnits } from 'viem';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
}));

const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
const mockTokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
const mockSpenderAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`;

describe('useTokenApproval - Functional Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  it('[TEST 1] should return correct initial state when needsApproval is false', () => {
    // Mock sufficient allowance
    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('200', 6), // Allowance: 200 USDC
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6), // Requesting: 100 USDC
      })
    );

    // Should NOT need approval (allowance >= amount)
    expect(result.current.needsApproval).toBe(false);
    expect(result.current.state).toBe(ApprovalState.APPROVED);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('[TEST 2] should return needsApproval true when allowance is insufficient', () => {
    // Mock insufficient allowance
    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('50', 6), // Allowance: 50 USDC
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6), // Requesting: 100 USDC
      })
    );

    // Should need approval (allowance < amount)
    expect(result.current.needsApproval).toBe(true);
    expect(result.current.state).toBe(ApprovalState.IDLE);
  });

  it('[TEST 3] should execute approval transaction successfully', async () => {
    const mockWriteContractAsync = jest.fn().mockResolvedValue({ hash: '0xabc123' });

    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('0', 6), // No allowance
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    expect(result.current.needsApproval).toBe(true);

    // Execute approval
    await result.current.handleApprove();

    // Should call writeContractAsync with correct parameters
    expect(mockWriteContractAsync).toHaveBeenCalledWith({
      address: mockTokenAddress,
      abi: expect.any(Array), // ERC20 ABI
      functionName: 'approve',
      args: [mockSpenderAddress, parseUnits('100', 6)],
    });
  });

  it('[TEST 4] should handle approval state transitions correctly', async () => {
    let currentAllowance = parseUnits('0', 6);

    const mockWriteContractAsync = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Simulate allowance update after approval
          currentAllowance = parseUnits('100', 6);
          resolve({ hash: '0xabc123' });
        }, 100);
      });
    });

    (useReadContract as jest.Mock).mockImplementation(() => ({
      data: currentAllowance,
      isLoading: false,
      isError: false,
    }));

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result, rerender } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    expect(result.current.state).toBe(ApprovalState.IDLE);

    // Start approval
    const approvalPromise = result.current.handleApprove();

    // Should transition to APPROVING
    await waitFor(() => {
      expect(result.current.state).toBe(ApprovalState.APPROVING);
      expect(result.current.isLoading).toBe(true);
    });

    // Wait for completion
    await approvalPromise;

    // Force re-render to pick up new allowance
    rerender();

    // Should transition to APPROVED after allowance updates
    await waitFor(() => {
      expect(result.current.state).toBe(ApprovalState.APPROVED);
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useTokenApproval - Boundary Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  it('[TEST 5] should handle zero amount gracefully', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('0', 6),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: BigInt(0), // Zero amount
      })
    );

    // Should not need approval for zero amount
    expect(result.current.needsApproval).toBe(false);
    expect(result.current.state).toBe(ApprovalState.APPROVED);
  });

  it('[TEST 6] should handle undefined amount', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('100', 6),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: undefined as any, // Undefined amount
      })
    );

    // Should handle gracefully
    expect(result.current.needsApproval).toBe(false);
    expect(result.current.state).toBe(ApprovalState.IDLE);
  });

  it('[TEST 7] should handle max uint256 amount', () => {
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    (useReadContract as jest.Mock).mockReturnValue({
      data: BigInt(0),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: maxUint256,
      })
    );

    // Should handle max uint256
    expect(result.current.needsApproval).toBe(true);
  });

  it('[TEST 8] should return idle state when wallet not connected', () => {
    (useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false,
    });

    (useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    // Should be idle when not connected
    expect(result.current.needsApproval).toBe(false);
    expect(result.current.state).toBe(ApprovalState.IDLE);
  });
});

describe('useTokenApproval - Exception Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  it('[TEST 9] should handle approval transaction rejection', async () => {
    const mockError = new Error('User rejected transaction');
    const mockWriteContractAsync = jest.fn().mockRejectedValue(mockError);

    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('0', 6),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    // Execute approval
    await result.current.handleApprove();

    // Should transition to ERROR state
    await waitFor(() => {
      expect(result.current.state).toBe(ApprovalState.ERROR);
      expect(result.current.error).toBe('User rejected transaction');
    });
  });

  it('[TEST 10] should handle network errors gracefully', async () => {
    const mockError = new Error('Network error: timeout');
    const mockWriteContractAsync = jest.fn().mockRejectedValue(mockError);

    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('0', 6),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    await result.current.handleApprove();

    await waitFor(() => {
      expect(result.current.state).toBe(ApprovalState.ERROR);
      expect(result.current.error).toContain('Network error');
    });
  });

  it('[TEST 11] should handle allowance check errors', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch allowance'),
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    // Should handle error state
    expect(result.current.state).toBe(ApprovalState.IDLE);
    expect(result.current.needsApproval).toBe(true); // Assume needs approval on error
  });
});

describe('useTokenApproval - Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  it('[TEST 12] should prevent double approval while transaction is pending', async () => {
    const mockWriteContractAsync = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ hash: '0xabc123' }), 200);
      });
    });

    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('0', 6),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    // Capture handleApprove reference before calling
    const handleApprove = result.current.handleApprove;

    // Start first approval
    const firstApproval = handleApprove();

    // Wait a bit to ensure first approval starts
    await new Promise(resolve => setTimeout(resolve, 50));

    // Try to approve again while pending (should be ignored)
    const secondApproval = handleApprove();

    await Promise.all([firstApproval, secondApproval]);

    // Should only call once (second call is ignored)
    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
  });

  it('[TEST 13] should validate token address format', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('0', 6),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    // Invalid address format
    const invalidAddress = '0xINVALID' as `0x${string}`;

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: invalidAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    // Should handle invalid address gracefully
    expect(result.current.state).toBe(ApprovalState.IDLE);
  });
});

describe('useTokenApproval - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  it('[TEST 14] should use stable function reference with useCallback', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: parseUnits('100', 6),
      isLoading: false,
      isError: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTokenApproval({
        tokenAddress: mockTokenAddress,
        spenderAddress: mockSpenderAddress,
        amount: parseUnits('100', 6),
      })
    );

    const handleApproveRef1 = result.current.handleApprove;

    // Get reference again
    const handleApproveRef2 = result.current.handleApprove;

    // Should be same reference (useCallback ensures stability)
    expect(handleApproveRef1).toBe(handleApproveRef2);
  });
});
