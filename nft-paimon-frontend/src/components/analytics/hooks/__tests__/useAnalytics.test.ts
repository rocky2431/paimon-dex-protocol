/**
 * useAnalytics Hook Tests
 * TDD: RED phase - Testing correct USDP.totalSupply() integration
 *
 * Test Dimensions:
 * 1. Functional - Correct USDP contract address and totalSupply call
 * 2. Boundary - Zero supply, max values
 * 3. Exception - Contract read errors
 * 4. Performance - Data refresh intervals
 * 5. Security - Address validation
 * 6. Compatibility - Config integration, TVL calculation
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useReadContract } from 'wagmi';
import { useAnalytics } from '../useAnalytics';
import { AnalyticsDashboardState } from '../../types';
import { config } from '@/config';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(),
}));

// Mock config
jest.mock('@/config', () => ({
  config: {
    tokenConfig: {
      usdp: {
        address: '0x0000000000000000000000000000000000000001',
        decimals: 18,
        name: 'USDP',
        symbol: 'USDP',
        icon: '/tokens/usdp.svg',
      },
    },
  },
}));

const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>;

describe('useAnalytics - Functional: USDP.totalSupply() Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * CRITICAL TEST: Should use USDP contract address from config
   * This test WILL FAIL with current implementation (uses hardcoded PSM address)
   */
  test('should query USDP contract at correct address from config', () => {
    // Mock totalSupply call
    mockUseReadContract.mockImplementation((params: any) => {
      if (params?.functionName === 'totalSupply') {
        return {
          data: BigInt('1000000000000000000000'), // 1000 USDP
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
      }
      // Mock price oracle call
      return {
        data: BigInt('100000000'), // $1.00 (8 decimals)
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

    renderHook(() => useAnalytics());

    // Verify USDP.totalSupply() was called
    const calls = mockUseReadContract.mock.calls;
    const totalSupplyCall = calls.find((call) => {
      const params = call[0];
      return params.functionName === 'totalSupply';
    });

    expect(totalSupplyCall).toBeDefined();
    expect(totalSupplyCall![0].address).toBe(config.tokenConfig.usdp.address);
    expect(totalSupplyCall![0].functionName).toBe('totalSupply');
  });

  /**
   * CRITICAL TEST: Should use ERC20 totalSupply() function
   * This test WILL FAIL with current implementation (calls totalMintedUSDP)
   */
  test('should call totalSupply() instead of totalMintedUSDP()', () => {
    mockUseReadContract.mockImplementation((params: any) => {
      return {
        data: params?.functionName === 'totalSupply' ? BigInt('1000000000000000000000') : BigInt('100000000'),
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

    renderHook(() => useAnalytics());

    // Verify function name
    const calls = mockUseReadContract.mock.calls;
    const totalSupplyCall = calls.find((call) => {
      const params = call[0];
      return params.address === config.tokenConfig.usdp.address;
    });

    expect(totalSupplyCall).toBeDefined();
    expect(totalSupplyCall![0].functionName).toBe('totalSupply');
    expect(totalSupplyCall![0].functionName).not.toBe('totalMintedUSDP');
  });

  /**
   * CRITICAL TEST: Should use correct ERC20 ABI structure
   */
  test('should use ERC20 ABI with totalSupply function', () => {
    mockUseReadContract.mockImplementation((params: any) => {
      return {
        data: BigInt('1000000000000000000000'),
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

    renderHook(() => useAnalytics());

    const calls = mockUseReadContract.mock.calls;
    const totalSupplyCall = calls.find((call) => {
      const params = call[0];
      return params.functionName === 'totalSupply';
    });

    expect(totalSupplyCall).toBeDefined();

    const abi = totalSupplyCall![0].abi;
    const totalSupplyFunc = abi.find((item: any) => item.name === 'totalSupply');

    expect(totalSupplyFunc).toBeDefined();
    expect(totalSupplyFunc.inputs).toHaveLength(0);
    expect(totalSupplyFunc.outputs[0].type).toBe('uint256');
  });

  /**
   * COMPATIBILITY TEST: Should calculate TVL from USDP total supply
   */
  test('should calculate TVL from USDP totalSupply value', () => {
    mockUseReadContract.mockImplementation((params: any) => {
      if (params?.functionName === 'totalSupply') {
        return {
          data: BigInt('5000000000000000000000'), // 5000 USDP
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
      }
      return {
        data: BigInt('100000000'), // $1.00
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

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.summary.tvl.totalFormatted).toBe('5000');
    expect(result.current.summary.tvl.psmMintedFormatted).toBe('5000');
  });

  /**
   * BOUNDARY TEST: Zero total supply
   */
  test('should handle zero total supply gracefully', () => {
    mockUseReadContract.mockImplementation((params: any) => {
      if (params?.functionName === 'totalSupply') {
        return {
          data: BigInt('0'),
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
      }
      return {
        data: BigInt('100000000'),
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

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.summary.tvl.totalFormatted).toBe('0');
    expect(result.current.summary.dashboardState).toBe(AnalyticsDashboardState.READY);
  });

  /**
   * EXCEPTION TEST: Contract read error handling
   */
  test('should handle USDP contract read errors', () => {
    mockUseReadContract.mockImplementation((params: any) => {
      if (params?.functionName === 'totalSupply') {
        return {
          data: undefined,
          isLoading: false,
          isError: true,
          error: new Error('Contract read failed'),
          refetch: jest.fn(),
          isFetching: false,
          isSuccess: false,
          status: 'error',
          fetchStatus: 'idle',
          isRefetching: false,
          isLoadingError: false,
          isRefetchError: false,
          isPaused: false,
          dataUpdatedAt: 0,
          errorUpdatedAt: 0,
          failureCount: 1,
          failureReason: null,
          errorUpdateCount: 1,
          isFetched: true,
          isFetchedAfterMount: true,
          isPlaceholderData: false,
          isPreviousData: false,
          isStale: false,
          queryKey: [],
        };
      }
      return {
        data: BigInt('100000000'),
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

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.summary.dashboardState).toBe(AnalyticsDashboardState.ERROR);
    expect(result.current.error).toContain('Failed to fetch analytics data');
  });

  /**
   * PERFORMANCE TEST: Data refresh configuration
   */
  test('should configure correct refresh interval', () => {
    mockUseReadContract.mockImplementation(() => ({
      data: BigInt('1000000000000000000000'),
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
    }));

    renderHook(() => useAnalytics());

    const calls = mockUseReadContract.mock.calls;
    const totalSupplyCall = calls.find((call) => {
      const params = call[0];
      return params.functionName === 'totalSupply';
    });

    expect(totalSupplyCall).toBeDefined();
    expect(totalSupplyCall![0].query.refetchInterval).toBe(5 * 60 * 1000); // 5 minutes
  });

  /**
   * SECURITY TEST: Address validation
   */
  test('should use valid contract address from config', () => {
    mockUseReadContract.mockImplementation(() => ({
      data: BigInt('1000000000000000000000'),
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
    }));

    renderHook(() => useAnalytics());

    const calls = mockUseReadContract.mock.calls;
    const totalSupplyCall = calls.find((call) => {
      const params = call[0];
      return params.functionName === 'totalSupply';
    });

    const address = totalSupplyCall![0].address;

    // Verify address format (0x + 40 hex characters)
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);

    // Verify it's from config
    expect(address).toBe(config.tokenConfig.usdp.address);
  });
});
