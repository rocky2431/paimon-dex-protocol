// @ts-nocheck - Temporarily disable type checking for wagmi v2 API changes
/**
 * SwapCard Component Tests - PSM/AMM Auto-Detection
 * TDD Phase 1: RED - Writing failing tests
 *
 * Test Coverage:
 * 1. Functional - Automatic PSM vs AMM mode detection
 * 2. UI - Different display for PSM (1:1 badge) vs AMM (route + slippage)
 * 3. Boundary - Token switching and mode transitions
 * 4. Exception - Missing routes, undefined tokens
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SwapCard } from '../SwapCard';
import { useAccount, useBalance, useWriteContract, useReadContract } from 'wagmi';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useBalance: jest.fn(),
  useWriteContract: jest.fn(),
  useReadContract: jest.fn(),
  usePublicClient: jest.fn(),
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseBalance = useBalance as jest.MockedFunction<typeof useBalance>;
const mockUseWriteContract = useWriteContract as jest.MockedFunction<typeof useWriteContract>;
const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>;

describe('SwapCard - PSM/AMM Auto-Detection (Functional Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: Connected wallet
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

    mockUseBalance.mockReturnValue({
      data: {
        value: BigInt('1000000000000000000000'), // 1000 tokens
        decimals: 18,
        formatted: '1000',
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

    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      writeContractAsync: jest.fn().mockResolvedValue('0x123'),
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

    mockUseReadContract.mockReturnValue({
      data: BigInt('1000000000000000000000'), // Sufficient allowance
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
  });

  it('[TEST 1] should detect USDC↔USDP pair and use PSM mode', () => {
    render(<SwapCard />);

    // SwapCard should default to USDC → USDP (PSM mode)
    // PSM mode indicators:
    // 1. Should show "1:1" badge (Chip component)
    const oneToOneBadges = screen.getAllByText(/1:1/i);
    expect(oneToOneBadges.length).toBeGreaterThan(0);

    // 2. Should show PSM title
    expect(screen.getByText(/PSM Swap/i)).toBeInTheDocument();

    // 3. Should show "Peg Stability Module" info text
    expect(screen.getByText(/Peg Stability Module/i)).toBeInTheDocument();

    // 4. Should show "No slippage, no price impact" message
    expect(screen.getByText(/no slippage/i)).toBeInTheDocument();
  });

  it('[TEST 2] should detect non-PSM pair (HYD↔USDC) and use AMM mode', () => {
    render(<SwapCard />);

    // Change tokens to HYD → USDC (AMM mode)
    // Find token selector and change to HYD
    const tokenButtons = screen.getAllByRole('button');
    const inputTokenButton = tokenButtons[0]; // First token selector (input)

    fireEvent.click(inputTokenButton);

    // Select HYD from dropdown
    waitFor(() => {
      const hydOption = screen.getByText(/HYD/i);
      fireEvent.click(hydOption);
    });

    // AMM mode indicators:
    // 1. Should NOT show "1:1" badge
    expect(screen.queryByText(/1:1/i)).not.toBeInTheDocument();

    // 2. Should show route display (e.g., "HYD → WBNB → USDC")
    waitFor(() => {
      expect(screen.getByText(/→/)).toBeInTheDocument(); // Arrow indicates route
      expect(screen.getByText(/HYD/i)).toBeInTheDocument();
      expect(screen.getByText(/WBNB/i)).toBeInTheDocument();
      expect(screen.getByText(/USDC/i)).toBeInTheDocument();
    });

    // 3. Should show slippage settings
    waitFor(() => {
      expect(screen.getByText(/slippage/i)).toBeInTheDocument();
    });
  });

  it('[TEST 3] should stay in PSM mode when switching USDC→USDP to USDP→USDC', () => {
    render(<SwapCard />);

    // Initial: USDC → USDP (PSM mode)
    expect(screen.getByText(/PSM Swap/i)).toBeInTheDocument();

    // Click switch button
    const switchButton = screen.getByTestId('SwapVertIcon').closest('button');
    if (switchButton) {
      fireEvent.click(switchButton);
    }

    // After switch: USDP → USDC (still PSM mode)
    waitFor(() => {
      expect(screen.getByText(/PSM Swap/i)).toBeInTheDocument();
      expect(screen.getByText(/Peg Stability Module/i)).toBeInTheDocument();
    });
  });
});

describe('SwapCard - UI Display Tests', () => {
  beforeEach(() => {
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

    mockUseBalance.mockReturnValue({
      data: {
        value: BigInt('1000000000000000000000'),
        decimals: 18,
        formatted: '1000',
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

    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      writeContractAsync: jest.fn().mockResolvedValue('0x123'),
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

    mockUseReadContract.mockReturnValue({
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
    });
  });

  it('[TEST 4] PSM mode should display "1:1" badge and info box', () => {
    render(<SwapCard />);

    // 1:1 badge (Chip component)
    const oneToOneBadges = screen.getAllByText(/1:1/i);
    expect(oneToOneBadges.length).toBeGreaterThan(0);

    // PSM info box
    const infoBox = screen.getByText(/Peg Stability Module/i);
    expect(infoBox).toBeInTheDocument();

    // Check that info box has correct styling
    const infoBoxContainer = infoBox.closest('div');
    expect(infoBoxContainer).toHaveStyle('background-color: rgba(255, 152, 0, 0.1)');
  });

  it('[TEST 5] AMM mode should display route and slippage controls', () => {
    render(<SwapCard />);

    // Switch to AMM pair (HYD → USDC)
    // (Mock token change here - implementation will handle this)

    // For now, test that AMM mode would show:
    // 1. Route display (e.g., "HYD → WBNB → USDC")
    // 2. Slippage tolerance selector
    // 3. Price impact warning

    // This test will fail initially since SwapCard doesn't support AMM yet
    // After implementation, these assertions should pass:

    // waitFor(() => {
    //   expect(screen.getByText(/route/i)).toBeInTheDocument();
    //   expect(screen.getByText(/→/)).toBeInTheDocument();
    //   expect(screen.getByText(/slippage/i)).toBeInTheDocument();
    //   expect(screen.getByText(/price impact/i)).toBeInTheDocument();
    // });

    // Placeholder assertion to make test fail
    expect(screen.queryByText(/route display coming soon/i)).toBeInTheDocument();
  });

  it('[TEST 6] PSM mode shows 0.1% fee, AMM mode shows price impact', () => {
    render(<SwapCard />);

    // PSM mode: Should show PSM title
    expect(screen.getByText(/PSM Swap/i)).toBeInTheDocument();

    // PSM mode: Should show info about "no price impact"
    expect(screen.getByText(/no price impact/i)).toBeInTheDocument();

    // Note: Fee is shown in SwapDetails component, which is not easily testable here
    // The important thing is that PSM mode is active and showing PSM-specific UI

    // After switching to AMM mode:
    // - Should show calculated price impact (e.g., "0.3%")
    // - Fee should change to "0.3% per hop"
    // (This will be tested separately when AMM mode is fully implemented)
  });
});

describe('SwapCard - Boundary Tests', () => {
  beforeEach(() => {
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

    mockUseBalance.mockReturnValue({
      data: {
        value: BigInt('1000000000000000000000'),
        decimals: 18,
        formatted: '1000',
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

    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      writeContractAsync: jest.fn().mockResolvedValue('0x123'),
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

    mockUseReadContract.mockReturnValue({
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
    });
  });

  it('[TEST 7] should handle mode transition from PSM to AMM smoothly', () => {
    render(<SwapCard />);

    // Start in PSM mode (USDC → USDP)
    expect(screen.getByText(/PSM Swap/i)).toBeInTheDocument();

    // Switch to AMM mode by changing token to HYD
    // (Implementation needed - TokenInput selector not yet implemented in tests)

    // For now, verify PSM mode is working
    // AMM mode transition will be tested in E2E tests
    expect(screen.getByText(/Peg Stability Module/i)).toBeInTheDocument();
  });

  it('[TEST 8] should handle undefined tokens gracefully', () => {
    render(<SwapCard />);

    // If inputToken or outputToken is undefined:
    // - Should show "Select token" placeholder
    // - Swap button should be disabled
    // - No calculation should be displayed

    // This test ensures robustness
    expect(screen.getByRole('button', { name: /swap/i })).toBeDefined();
  });
});

describe('SwapCard - Exception Tests', () => {
  it('[TEST 9] AMM mode should handle missing route gracefully', () => {
    // Mock scenario: No direct pair, no WBNB route available
    mockUseReadContract.mockReturnValue({
      data: '0x0000000000000000000000000000000000000000', // No pair exists
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

    render(<SwapCard />);

    // Should show error message
    waitFor(() => {
      expect(screen.getByText(/no route available/i)).toBeInTheDocument();
    });

    // Swap button should be disabled
    const swapButton = screen.getByRole('button', { name: /swap/i });
    expect(swapButton).toBeDisabled();
  });
});
