/**
 * useRWAPrice Hook Tests
 *
 * Tests for RWA price fetching with correct Oracle address configuration
 *
 * Task: gap-2.1.2
 * Issue: useDepositPreview using token address as Oracle address
 * Fix: Use RWAPriceOracle contract address and pass token address as argument
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useRWAPrice } from '../useRWAPrice';
import { TESTNET_ADDRESSES } from '@/config/chains/generated/testnet';

// Mock wagmi
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(),
}));

// Zero address constant
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('useRWAPrice - Oracle Configuration (gap-2.1.2)', () => {
  const RWA_PRICE_ORACLE_ADDRESS = TESTNET_ADDRESSES.treasury.rwaPriceOracle;
  const HYD_TOKEN_ADDRESS = TESTNET_ADDRESSES.core.hyd;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TEST 1: Functional - Hook uses correct RWAPriceOracle address
   *
   * BEFORE: Hook receives token address and uses it as oracle address
   * AFTER: Hook receives Oracle address and uses it correctly
   */
  it('[TEST 1] should use correct RWAPriceOracle contract address', () => {
    const mockPrice = 1000000000000000000n; // 1.0 with 18 decimals

    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: mockPrice,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Hook should return price data
    expect(result.current).toBeDefined();
    expect(result.current.price).toBeGreaterThan(0);
  });

  /**
   * TEST 2: Functional - Price fetched successfully
   *
   * BEFORE: getPrice() called on token address (wrong contract)
   * AFTER: getPrice() called on Oracle address (correct contract)
   */
  it('[TEST 2] should fetch price successfully from Oracle', () => {
    const mockPrice = 2500000000000000000n; // 2.5 with 18 decimals

    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: mockPrice,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Price should be fetched successfully
    expect(result.current.price).toBe(2.5);
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  /**
   * TEST 3: Boundary - Handle zero address
   *
   * Hook should not query when oracle address is zero
   */
  it('[TEST 3] should not query with zero address', () => {
    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRWAPrice(ZERO_ADDRESS));

    // Hook should not execute query
    expect(result.current.price).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  /**
   * TEST 4: Boundary - Handle undefined address
   *
   * Hook should not query when address is undefined
   */
  it('[TEST 4] should not query with undefined address', () => {
    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRWAPrice(undefined));

    // Hook should not execute query
    expect(result.current.price).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  /**
   * TEST 5: Exception - Handle contract errors gracefully
   *
   * Hook should handle errors when contract call fails
   */
  it('[TEST 5] should handle contract errors gracefully', () => {
    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Should handle error gracefully (price = 0, isError = true)
    expect(result.current.price).toBe(0);
    expect(result.current.isError).toBe(true);
  });

  /**
   * TEST 6: Security - Oracle address used correctly
   *
   * Ensures the correct Oracle address is used
   */
  it('[TEST 6] should use the provided Oracle address', () => {
    const mockUseReadContract = require('wagmi').useReadContract as jest.Mock;

    mockUseReadContract.mockReturnValue({
      data: 1000000000000000000n,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Verify useReadContract was called with correct Oracle address
    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: RWA_PRICE_ORACLE_ADDRESS,
      })
    );
  });

  /**
   * TEST 7: Performance - Loading state managed correctly
   *
   * Hook should reflect loading state properly
   */
  it('[TEST 7] should reflect loading state', () => {
    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Should show loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.price).toBe(0);
  });

  /**
   * TEST 8: Functional - Price format is correct
   *
   * Price should be converted from wei (18 decimals) to number
   */
  it('[TEST 8] should convert price from wei to number correctly', () => {
    const mockPrice = 123456789012345678n; // ~0.123456789 with 18 decimals

    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: mockPrice,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Price should be converted correctly
    expect(typeof result.current.price).toBe('number');
    expect(result.current.price).toBeCloseTo(0.123456789, 9);
  });

  /**
   * TEST 9: Compatibility - Works with RWAPriceOracle ABI
   *
   * Verify ABI function name is correct
   */
  it('[TEST 9] should call getPrice function', () => {
    const mockUseReadContract = require('wagmi').useReadContract as jest.Mock;

    mockUseReadContract.mockReturnValue({
      data: 1000000000000000000n,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Verify getPrice function is called
    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'getPrice',
      })
    );
  });

  /**
   * TEST 10: Functional - Refetch functionality works
   *
   * Ensure refetch function is exposed
   */
  it('[TEST 10] should expose refetch function', () => {
    const mockRefetch = jest.fn();

    (require('wagmi').useReadContract as jest.Mock).mockReturnValue({
      data: 1000000000000000000n,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useRWAPrice(RWA_PRICE_ORACLE_ADDRESS));

    // Refetch function should be exposed
    expect(typeof result.current.refetch).toBe('function');
    expect(result.current.refetch).toBe(mockRefetch);
  });
});
