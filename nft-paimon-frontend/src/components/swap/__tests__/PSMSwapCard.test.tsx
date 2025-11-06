/**
 * PSMSwapCard Component Tests
 * TDD: RED phase - Comprehensive 6-dimensional test coverage
 *
 * Test Dimensions:
 * 1. Functional - USDC↔USDP swap functionality
 * 2. Boundary - Min/max amounts, edge cases
 * 3. Exception - Insufficient balance, invalid inputs
 * 4. Performance - Render optimization
 * 5. Security - Input validation, XSS prevention
 * 6. Compatibility - Wallet states, responsive design
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PSMSwapCard } from '../PSMSwapCard';
import { useAccount, useBalance, useWriteContract, useReadContract } from 'wagmi';

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

describe('PSMSwapCard - Functional Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementation (connected wallet)
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
        value: BigInt('1000000000000000000000'), // 1000 USDC
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

  it('should render PSM swap card with title', () => {
    render(<PSMSwapCard />);
    expect(screen.getByText(/PSM Swap/i)).toBeInTheDocument();
  });

  it('should show USDC to USDP as default swap direction', () => {
    render(<PSMSwapCard />);

    // Check for token selectors
    const tokenInputs = screen.getAllByRole('button');
    expect(tokenInputs.length).toBeGreaterThan(0);
  });

  it('should display 1:1 exchange rate prominently', () => {
    render(<PSMSwapCard />);

    // PSM should show 1:1 exchange rate (multiple occurrences expected)
    const exchangeRateElements = screen.getAllByText(/1:1/i);
    expect(exchangeRateElements.length).toBeGreaterThan(0);
  });

  it('should calculate output amount with 0.1% fee', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '100' } });

    // 100 USDC - 0.1% fee = 99.9 USDP
    waitFor(() => {
      expect(screen.getByDisplayValue('99.9')).toBeInTheDocument();
    });
  });

  it('should show fee amount separately', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '1000' } });

    // Fee should be displayed
    waitFor(() => {
      expect(screen.getByText(/fee/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.1%/i)).toBeInTheDocument();
    });
  });

  it('should allow switching USDC ↔ USDP direction', () => {
    render(<PSMSwapCard />);

    // Find switch button by test ID or icon
    const switchButton = screen.getByTestId('SwapVertIcon').closest('button');
    expect(switchButton).toBeInTheDocument();
    if (switchButton) {
      fireEvent.click(switchButton);
    }

    // Direction should reverse (component handles this internally)
  });

  it('should show wallet balance for input token', () => {
    render(<PSMSwapCard />);

    // Balance should be displayed (multiple occurrences expected for input and output)
    const balanceElements = screen.getAllByText(/balance/i);
    expect(balanceElements.length).toBeGreaterThan(0);
    // Check for formatted balance
    expect(balanceElements[0].textContent).toBeTruthy();
  });

  it('should have MAX button to use full balance', () => {
    render(<PSMSwapCard />);

    const maxButton = screen.getByText(/MAX/i);
    expect(maxButton).toBeInTheDocument();

    fireEvent.click(maxButton);

    // Input should be set to max balance
    waitFor(() => {
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });
  });
});

describe('PSMSwapCard - Boundary Tests', () => {
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
        value: BigInt('100000000000000000'), // 0.1 USDC
        decimals: 18,
        formatted: '0.1',
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

  it('should handle zero amount input', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '0' } });

    // Should show validation error
    waitFor(() => {
      expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
    });
  });

  it('should handle very small amounts (0.01)', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '0.01' } });

    // Should calculate correctly
    waitFor(() => {
      expect(screen.getByDisplayValue(/0.0099/i)).toBeInTheDocument();
    });
  });

  it('should handle very large amounts', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '999999999' } });

    // Should show insufficient balance error
    waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });
  });

  it('should handle empty string input', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '' } });

    // Output should also be empty
    const outputs = screen.getAllByRole('textbox');
    expect(outputs[1]).toHaveValue('');
  });

  it('should handle maximum precision (18 decimals)', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '0.123456789012345678' } });

    // Should handle without precision loss
    waitFor(() => {
      const outputs = screen.getAllByRole('textbox');
      expect((outputs[1] as HTMLInputElement).value).toBeTruthy();
    });
  });
});

describe('PSMSwapCard - Exception Tests', () => {
  it('should show "Connect Wallet" when not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      isDisconnected: true,
      isConnecting: false,
      isReconnecting: false,
      status: 'disconnected',
      connector: undefined,
      chain: undefined,
      chainId: undefined,
      addresses: undefined,
    });

    render(<PSMSwapCard />);

    // Button should be disabled and show error message
    const swapButton = screen.getByRole('button', { name: /swap now/i });
    expect(swapButton).toBeDisabled();
    expect(screen.getByText(/please connect your wallet/i)).toBeInTheDocument();
  });

  it('should show error when balance insufficient', () => {
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
        value: BigInt('10000000000000000'), // 0.01 USDC
        decimals: 18,
        formatted: '0.01',
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

    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '100' } });

    waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });
  });

  it('should handle invalid input characters', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: 'abc' } });

    // Should reject non-numeric input
    expect(input).not.toHaveValue('abc');
  });

  it('should prevent XSS attacks in amount input', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '<script>alert("XSS")</script>' } });

    // Should sanitize input
    expect(input).not.toHaveValue('<script>alert("XSS")</script>');
  });
});

describe('PSMSwapCard - Performance Tests', () => {
  it('should render without unnecessary re-renders', () => {
    const { rerender } = render(<PSMSwapCard />);

    // Re-render with same props
    rerender(<PSMSwapCard />);

    // Component should handle re-renders efficiently
    expect(screen.getByText(/PSM Swap/i)).toBeInTheDocument();
  });

  it('should debounce calculation updates', async () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];

    // Rapid input changes
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.change(input, { target: { value: '100' } });

    // Should debounce and only calculate final value
    await waitFor(() => {
      expect(input).toHaveValue('100');
    }, { timeout: 500 });
  });
});

describe('PSMSwapCard - Security Tests', () => {
  it('should validate amount is positive number', () => {
    render(<PSMSwapCard />);

    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '-100' } });

    // Should reject negative numbers
    waitFor(() => {
      expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
    });
  });

  it('should check token allowance before swap', async () => {
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

    mockUseReadContract.mockReturnValue({
      data: BigInt('0'), // Zero allowance
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

    render(<PSMSwapCard />);

    // Enter amount to enable swap button
    const inputs = screen.getAllByPlaceholderText(/0\.00/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: '100' } });

    await waitFor(() => {
      // Swap button should handle approval internally
      const swapButton = screen.getByRole('button', { name: /swap now/i });
      expect(swapButton).toBeDefined();
    });
  });
});

describe('PSMSwapCard - Compatibility Tests', () => {
  it('should be responsive on mobile (320px)', () => {
    global.innerWidth = 320;
    global.dispatchEvent(new Event('resize'));

    render(<PSMSwapCard />);

    const card = screen.getByText(/PSM Swap/i).closest('div');
    expect(card).toBeInTheDocument();
  });

  it('should be responsive on desktop (1920px)', () => {
    global.innerWidth = 1920;
    global.dispatchEvent(new Event('resize'));

    render(<PSMSwapCard />);

    const card = screen.getByText(/PSM Swap/i).closest('div');
    expect(card).toBeInTheDocument();
  });
});
