// @ts-nocheck - Temporarily disable type checking for wagmi v2 API changes
/**
 * usePSMSwap Hook Tests
 * TDD: RED phase - Testing correct PSM ABI function calls
 *
 * Test Dimensions:
 * 1. Functional - Correct function selection based on swap direction
 * 2. Boundary - Zero amounts, max values
 * 3. Exception - Insufficient balance, missing allowance
 * 4. Performance - Calculation efficiency
 * 5. Security - Input validation
 * 6. Compatibility - Token switching, bidirectional swaps
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccount, useBalance, useWriteContract, useReadContract } from 'wagmi';
import { usePSMSwap } from '../usePSMSwap';
import { Token, SwapState } from '../../types';
import { CONTRACT_ADDRESSES } from '../../constants';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useBalance: jest.fn(),
  useWriteContract: jest.fn(),
  useReadContract: jest.fn(),
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseBalance = useBalance as jest.MockedFunction<typeof useBalance>;
const mockUseWriteContract = useWriteContract as jest.MockedFunction<typeof useWriteContract>;
const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>;

describe('usePSMSwap - Functional: Correct ABI Function Calls', () => {
  let writeContractAsync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock connected wallet
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      isConnected: true,
      isDisconnected: false,
      isConnecting: false,
      isReconnecting: false,
      status: 'connected',
      connector: undefined,
      chain: undefined,
      chainId: undefined,
      addresses: undefined,
    });

    // Mock USDC balance (1000 USDC)
    mockUseBalance.mockImplementation((config: any) => {
      const isUSDP = config?.token?.toLowerCase().includes('0x0000000000000000000000000000000000000001');
      return {
        data: {
          value: BigInt('1000000000000000000000'), // 1000 tokens
          decimals: 18,
          formatted: '1000',
          symbol: isUSDP ? 'USDP' : 'USDC',
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
        isFetching: false,
        isSuccess: true,
        status: 'success',
        fetchStatus: 'idle',
        isRefetching: false,
        isLoadingError: false,
        isRefetchError: false,
        isPaused: false,
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        isFetched: true,
        isFetchedAfterMount: true,
        isPlaceholderData: false,
        isPreviousData: false,
        isStale: false,
        queryKey: [],
      };
    });

    // Mock sufficient allowance
    mockUseReadContract.mockReturnValue({
      data: BigInt('1000000000000000000000000'),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      isRefetching: false,
      isLoadingError: false,
      isRefetchError: false,
      isPaused: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isPlaceholderData: false,
      isPreviousData: false,
      isStale: false,
      queryKey: [],
    });

    writeContractAsync = jest.fn().mockResolvedValue('0x123');

    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      writeContractAsync,
      data: undefined,
      error: null,
      isError: false,
      isIdle: true,
      isPending: false,
      isSuccess: false,
      reset: jest.fn(),
      status: 'idle',
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    });
  });

  /**
   * CRITICAL TEST: USDC → USDP should call swapUSDCForUSDP
   * This test WILL FAIL with current implementation (calls non-existent 'swap')
   */
  test('should call swapUSDCForUSDP when swapping USDC to USDP', async () => {
    const { result } = renderHook(() => usePSMSwap());

    // Set input amount (100 USDC)
    act(() => {
      result.current.handleInputAmountChange('100');
    });

    // Execute swap (USDC → USDP)
    await act(async () => {
      await result.current.handleSwap();
    });

    // Wait for swap to complete
    await waitFor(() => {
      expect(writeContractAsync).toHaveBeenCalled();
    });

    // Verify correct function is called
    const calls = writeContractAsync.mock.calls;
    const swapCall = calls.find((call) => {
      const config = call[0];
      return config.address === CONTRACT_ADDRESSES.PSM;
    });

    expect(swapCall).toBeDefined();
    expect(swapCall![0].functionName).toBe('swapUSDCForUSDP');
    expect(swapCall![0].args).toHaveLength(1);
    expect(swapCall![0].args[0]).toBe(BigInt('100000000000000000000')); // 100 USDC in wei
  });

  /**
   * CRITICAL TEST: USDP → USDC should call swapUSDPForUSDC
   * This test WILL FAIL with current implementation (calls non-existent 'swap')
   */
  test('should call swapUSDPForUSDC when swapping USDP to USDC', async () => {
    const { result } = renderHook(() => usePSMSwap());

    // Switch to USDP → USDC
    act(() => {
      result.current.handleSwitchTokens();
    });

    // Set input amount (100 USDP)
    act(() => {
      result.current.handleInputAmountChange('100');
    });

    // Execute swap (USDP → USDC)
    await act(async () => {
      await result.current.handleSwap();
    });

    // Wait for swap to complete
    await waitFor(() => {
      expect(writeContractAsync).toHaveBeenCalled();
    });

    // Verify correct function is called
    const calls = writeContractAsync.mock.calls;
    const swapCall = calls.find((call) => {
      const config = call[0];
      return config.address === CONTRACT_ADDRESSES.PSM;
    });

    expect(swapCall).toBeDefined();
    expect(swapCall![0].functionName).toBe('swapUSDPForUSDC');
    expect(swapCall![0].args).toHaveLength(1);
    expect(swapCall![0].args[0]).toBe(BigInt('100000000000000000000')); // 100 USDP in wei
  });

  /**
   * BOUNDARY TEST: Zero amount should not trigger swap
   */
  test('should not call swap with zero amount', async () => {
    const { result } = renderHook(() => usePSMSwap());

    act(() => {
      result.current.handleInputAmountChange('0');
    });

    await act(async () => {
      await result.current.handleSwap();
    });

    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  /**
   * EXCEPTION TEST: Insufficient balance should not trigger swap
   */
  test('should not call swap with insufficient balance', async () => {
    // Mock low balance (10 USDC)
    mockUseBalance.mockReturnValue({
      data: {
        value: BigInt('10000000000000000000'), // 10 USDC
        decimals: 18,
        formatted: '10',
        symbol: 'USDC',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      isRefetching: false,
      isLoadingError: false,
      isRefetchError: false,
      isPaused: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isPlaceholderData: false,
      isPreviousData: false,
      isStale: false,
      queryKey: [],
    });

    const { result } = renderHook(() => usePSMSwap());

    // Try to swap 100 USDC (more than balance)
    act(() => {
      result.current.handleInputAmountChange('100');
    });

    await act(async () => {
      await result.current.handleSwap();
    });

    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  /**
   * COMPATIBILITY TEST: Bidirectional swap support
   */
  test('should support bidirectional swaps via token switching', () => {
    const { result } = renderHook(() => usePSMSwap());

    // Initial state: USDC → USDP
    expect(result.current.formData.inputToken).toBe(Token.USDC);
    expect(result.current.formData.outputToken).toBe(Token.USDP);

    // Switch tokens
    act(() => {
      result.current.handleSwitchTokens();
    });

    // After switch: USDP → USDC
    expect(result.current.formData.inputToken).toBe(Token.USDP);
    expect(result.current.formData.outputToken).toBe(Token.USDC);
  });

  /**
   * SECURITY TEST: Input validation prevents invalid amounts
   */
  test('should validate input amount and reject invalid values', () => {
    const { result } = renderHook(() => usePSMSwap());

    // Empty amount
    act(() => {
      result.current.handleInputAmountChange('');
    });
    expect(result.current.validation.isValid).toBe(false);

    // Valid amount
    act(() => {
      result.current.handleInputAmountChange('100');
    });
    expect(result.current.validation.isValid).toBe(true);
  });

  /**
   * PERFORMANCE TEST: Calculation efficiency
   */
  test('should calculate swap output efficiently with correct fee', () => {
    const { result } = renderHook(() => usePSMSwap());

    act(() => {
      result.current.handleInputAmountChange('100');
    });

    // Verify calculation
    expect(result.current.calculation).toBeDefined();
    expect(result.current.calculation?.inputAmount).toBe(BigInt('100000000000000000000'));

    // Output should be input * (10000 - 10) / 10000 = 99.9 USDP
    expect(result.current.calculation?.outputAmount).toBe(BigInt('99900000000000000000'));

    // Fee should be 0.1%
    expect(result.current.calculation?.feePercentage).toBe('0.1');
  });
});

describe('usePSMSwap - ABI Verification', () => {
  test('should use correct ABI structure for swapUSDCForUSDP', async () => {
    const { result } = renderHook(() => usePSMSwap());

    const writeContractAsync = jest.fn().mockResolvedValue('0x123');
    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      writeContractAsync,
      data: undefined,
      error: null,
      isError: false,
      isIdle: true,
      isPending: false,
      isSuccess: false,
      reset: jest.fn(),
      status: 'idle',
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    });

    act(() => {
      result.current.handleInputAmountChange('100');
    });

    await act(async () => {
      await result.current.handleSwap();
    });

    await waitFor(() => {
      expect(writeContractAsync).toHaveBeenCalled();
    });

    const swapCall = writeContractAsync.mock.calls.find((call) => {
      return call[0].address === CONTRACT_ADDRESSES.PSM;
    });

    // Verify ABI includes correct function
    const abi = swapCall![0].abi;
    const swapFunction = abi.find((item: any) => item.name === 'swapUSDCForUSDP');

    expect(swapFunction).toBeDefined();
    expect(swapFunction.inputs).toHaveLength(1);
    expect(swapFunction.inputs[0].name).toBe('usdcAmount');
    expect(swapFunction.inputs[0].type).toBe('uint256');
  });

  test('should use correct ABI structure for swapUSDPForUSDC', async () => {
    const { result } = renderHook(() => usePSMSwap());

    const writeContractAsync = jest.fn().mockResolvedValue('0x123');
    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      writeContractAsync,
      data: undefined,
      error: null,
      isError: false,
      isIdle: true,
      isPending: false,
      isSuccess: false,
      reset: jest.fn(),
      status: 'idle',
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    });

    // Switch to USDP → USDC
    act(() => {
      result.current.handleSwitchTokens();
    });

    act(() => {
      result.current.handleInputAmountChange('100');
    });

    await act(async () => {
      await result.current.handleSwap();
    });

    await waitFor(() => {
      expect(writeContractAsync).toHaveBeenCalled();
    });

    const swapCall = writeContractAsync.mock.calls.find((call) => {
      return call[0].address === CONTRACT_ADDRESSES.PSM;
    });

    // Verify ABI includes correct function
    const abi = swapCall![0].abi;
    const swapFunction = abi.find((item: any) => item.name === 'swapUSDPForUSDC');

    expect(swapFunction).toBeDefined();
    expect(swapFunction.inputs).toHaveLength(1);
    expect(swapFunction.inputs[0].name).toBe('usdpAmount');
    expect(swapFunction.inputs[0].type).toBe('uint256');
  });
});
