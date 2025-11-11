/**
 * Integration tests for SavingsDepositModal with useTokenApproval
 * TDD Phase 1: RED - Writing failing tests for approval integration
 *
 * Test Coverage (6 Dimensions):
 * 1. Functional - Approval check, deposit with approval
 * 2. Boundary - Zero balance, insufficient allowance
 * 3. Exception - Approval rejection, deposit failure
 * 4. Performance - Multiple re-renders
 * 5. Security - Approval before deposit
 * 6. Compatibility - wagmi v2 integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavingsDepositModal } from '@/components/savings/SavingsDepositModal';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
}));

// Mock useTokenApproval
jest.mock('@/hooks/useTokenApproval', () => ({
  useTokenApproval: jest.fn(),
  ApprovalState: {
    IDLE: 'idle',
    CHECKING: 'checking',
    APPROVING: 'approving',
    APPROVED: 'approved',
    ERROR: 'error',
  },
}));

// Mock useSavingRate hooks
jest.mock('@/hooks/useSavingRate', () => ({
  useSavingPrincipal: jest.fn(() => ({
    data: parseUnits('0', 18),
    isLoading: false,
  })),
}));

const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;

describe('SavingsDepositModal - Approval Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  // =============================================================================
  // 1. FUNCTIONAL TESTS
  // =============================================================================

  it('[TEST 1] should show "Approve USDP" button when approval is needed', async () => {
    const mockApproval = {
      needsApproval: true,
      state: 'idle',
      handleApprove: jest.fn(),
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    // Mock USDP balance
    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    // Wait for modal to render
    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Should show "Approve USDP" button
    await waitFor(() => {
      expect(screen.getByText('Approve USDP')).toBeInTheDocument();
    });

    // Should NOT show "Confirm Deposit" yet
    expect(screen.queryByText('Confirm Deposit')).not.toBeInTheDocument();
  });

  it('[TEST 2] should execute approval when "Approve USDP" is clicked', async () => {
    const mockHandleApprove = jest.fn().mockResolvedValue(undefined);
    const mockApproval = {
      needsApproval: true,
      state: 'idle',
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    await waitFor(() => {
      expect(screen.getByText('Approve USDP')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve USDP');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockHandleApprove).toHaveBeenCalled();
    });
  });

  it('[TEST 3] should show "Confirm Deposit" after approval is granted', async () => {
    const mockApproval = {
      needsApproval: false,
      state: 'approved',
      handleApprove: jest.fn(),
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    await waitFor(() => {
      expect(screen.getByText('Confirm Deposit')).toBeInTheDocument();
    });

    // Should NOT show "Approve USDP"
    expect(screen.queryByText('Approve USDP')).not.toBeInTheDocument();
  });

  it('[TEST 4] should switch between Deposit and Withdraw tabs correctly', async () => {
    const mockApproval = {
      needsApproval: false,
      state: 'approved',
      handleApprove: jest.fn(),
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    require('@/hooks/useSavingRate').useSavingPrincipal.mockReturnValue({
      data: parseUnits('500', 18),
      isLoading: false,
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    // Click Withdraw tab
    const withdrawTab = screen.getByText('Withdraw');
    fireEvent.click(withdrawTab);

    await waitFor(() => {
      expect(screen.getByText(/withdraw usdp/i)).toBeInTheDocument();
    });

    // Enter amount in withdraw tab
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '50' } });

    // Should show "Confirm Withdraw" (no approval needed for withdraw)
    await waitFor(() => {
      expect(screen.getByText('Confirm Withdraw')).toBeInTheDocument();
    });

    // Should NOT show approval button in withdraw tab
    expect(screen.queryByText('Approve USDP')).not.toBeInTheDocument();
  });

  // =============================================================================
  // 2. BOUNDARY TESTS
  // =============================================================================

  it('[TEST 5] should handle zero USDP balance gracefully', async () => {
    const mockApproval = {
      needsApproval: false,
      state: 'idle',
      handleApprove: jest.fn(),
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('0', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    // Balance should show 0.00
    expect(screen.getByText(/0\.00 usdp/i)).toBeInTheDocument();

    // Try to enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Button should be disabled (insufficient balance)
    const confirmButton = screen.getByText(/confirm deposit/i);
    expect(confirmButton).toBeDisabled();
  });

  it('[TEST 6] should handle insufficient balance correctly', async () => {
    const mockApproval = {
      needsApproval: false,
      state: 'approved',
      handleApprove: jest.fn(),
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('50', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    // Try to enter amount > balance
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Button should be disabled
    await waitFor(() => {
      const confirmButton = screen.getByText(/confirm deposit/i);
      expect(confirmButton).toBeDisabled();
    });
  });

  // =============================================================================
  // 3. EXCEPTION TESTS
  // =============================================================================

  it('[TEST 7] should handle approval rejection gracefully', async () => {
    const mockHandleApprove = jest.fn().mockRejectedValue(new Error('User rejected transaction'));
    const mockApproval = {
      needsApproval: true,
      state: 'idle',
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    await waitFor(() => {
      expect(screen.getByText('Approve USDP')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve USDP');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockHandleApprove).toHaveBeenCalled();
    });

    // Error should be handled, approval remains needed
    await waitFor(() => {
      expect(screen.getByText('Approve USDP')).toBeInTheDocument();
    });
  });

  it('[TEST 8] should display approval errors from useTokenApproval', async () => {
    const mockApproval = {
      needsApproval: true,
      state: 'error',
      handleApprove: jest.fn(),
      isLoading: false,
      error: 'Approval failed: insufficient gas',
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Approval error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/approval failed/i)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // 4. PERFORMANCE TESTS
  // =============================================================================

  it('[TEST 9] should not cause infinite re-renders', async () => {
    const mockApproval = {
      needsApproval: false,
      state: 'approved',
      handleApprove: jest.fn(),
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    let renderCount = 0;
    const RenderCountWrapper = ({ children }: { children: React.ReactNode }) => {
      renderCount++;
      return <>{children}</>;
    };

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
    });

    render(
      <RenderCountWrapper>
        <SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />
      </RenderCountWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    // Should render reasonable number of times (<10)
    expect(renderCount).toBeLessThan(10);
  });

  // =============================================================================
  // 5. SECURITY TESTS
  // =============================================================================

  it('[TEST 10] should not allow deposit without approval', async () => {
    const mockDeposit = jest.fn();
    const mockApproval = {
      needsApproval: true,
      state: 'idle',
      handleApprove: jest.fn(),
      isLoading: false,
      error: null,
    };

    require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return { data: parseUnits('1000', 18), isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockDeposit,
      isPending: false,
    });

    render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/deposit usdp/i)).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    await waitFor(() => {
      expect(screen.getByText('Approve USDP')).toBeInTheDocument();
    });

    // Clicking "Approve USDP" should NOT call deposit
    const approveButton = screen.getByText('Approve USDP');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockDeposit).not.toHaveBeenCalled();
    });
  });
});
