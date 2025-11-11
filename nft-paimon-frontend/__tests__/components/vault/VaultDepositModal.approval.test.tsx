/**
 * VaultDepositModal - HYD Token Approval Integration Tests
 *
 * Tests to verify that HYD token approval is properly integrated into the vault deposit flow.
 *
 * Task: gap-1.2.5
 * Issue: Deposit flow missing token approval step
 * Fix: Add useTokenApproval hook for HYD token deposits
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VaultDepositModal } from '@/components/vault/VaultDepositModal';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { testnet } from '@/config/chains/testnet';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
}));

// Mock vault hooks
jest.mock('@/hooks/useVault', () => ({
  useVaultDeposit: jest.fn(() => ({
    writeContract: jest.fn(),
    isPending: false,
  })),
  useVaultWithdraw: jest.fn(() => ({
    writeContract: jest.fn(),
    isPending: false,
  })),
  useVaultCollateralBalance: jest.fn(() => ({
    data: parseUnits('500', 18),  // User has 500 HYD deposited in vault
    isLoading: false,
    error: null,
  })),
}));

// Mock token approval hook
jest.mock('@/hooks/useTokenApproval', () => ({
  useTokenApproval: jest.fn(() => ({
    needsApproval: false,
    handleApprove: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));

describe('VaultDepositModal - HYD Token Approval Integration (gap-1.2.5)', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockWriteContract = jest.fn();
  const mockHandleApprove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock connected wallet
    (useAccount as jest.Mock).mockReturnValue({
      address: mockUserAddress,
      isConnected: true,
    });

    // Mock HYD balance (1000 HYD)
    (useReadContract as jest.Mock).mockImplementation((config) => {
      if (config.functionName === 'balanceOf') {
        return {
          data: parseUnits('1000', 18),
          isLoading: false,
          error: null,
        };
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
      };
    });
  });

  /**
   * TEST 1: Functional - Show Approve button when approval needed
   *
   * BEFORE: No approval step, direct deposit
   * AFTER: Show "Approve HYD" button when allowance insufficient
   */
  it('[TEST 1] should show Approve HYD button when approval is needed', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;
    useTokenApproval.mockReturnValue({
      needsApproval: true,  // ← Approval needed
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Enter deposit amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Should show "Approve HYD" button, not "Confirm Deposit"
    await waitFor(() => {
      expect(screen.getByText('Approve HYD')).toBeInTheDocument();
      expect(screen.queryByText('Confirm Deposit')).not.toBeInTheDocument();
    });
  });

  /**
   * TEST 2: Functional - Execute approval on button click
   */
  it('[TEST 2] should execute approval when Approve button is clicked', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;
    useTokenApproval.mockReturnValue({
      needsApproval: true,
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Click Approve button
    const approveButton = screen.getByText('Approve HYD');
    fireEvent.click(approveButton);

    // Verify handleApprove was called
    await waitFor(() => {
      expect(mockHandleApprove).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * TEST 3: Functional - Show Deposit button after approval
   *
   * Simulates the flow: Approve → Approval success → Show Deposit button
   */
  it('[TEST 3] should show Deposit button after approval is granted', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;

    // Initial state: approval needed
    useTokenApproval.mockReturnValue({
      needsApproval: false,  // ← Approval already granted
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Should show "Confirm Deposit" button
    await waitFor(() => {
      expect(screen.getByText('Confirm Deposit')).toBeInTheDocument();
      expect(screen.queryByText('Approve HYD')).not.toBeInTheDocument();
    });
  });

  /**
   * TEST 4: Functional - Correct token approval configuration
   *
   * Verify that useTokenApproval is called with correct parameters:
   * - tokenAddress: HYD token
   * - spenderAddress: Vault contract
   * - amount: User input amount
   */
  it('[TEST 4] should configure token approval with correct parameters', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Wait for useTokenApproval to be called
    await waitFor(() => {
      expect(useTokenApproval).toHaveBeenCalled();
    });

    // Verify the hook was called with correct parameters
    const callArgs = useTokenApproval.mock.calls[useTokenApproval.mock.calls.length - 1][0];

    expect(callArgs.tokenAddress).toBe(testnet.tokens.hyd);
    expect(callArgs.spenderAddress).toBe(testnet.tokens.vault);
    expect(callArgs.amount).toBe(parseUnits('100', 18));
  });

  /**
   * TEST 5: Boundary - Disable button when no amount entered
   */
  it('[TEST 5] should disable approve button when amount is empty', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;
    useTokenApproval.mockReturnValue({
      needsApproval: true,
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Don't enter amount - button should be disabled
    const approveButton = screen.getByText('Approve HYD');
    expect(approveButton).toBeDisabled();
  });

  /**
   * TEST 6: Exception - Handle approval failure
   */
  it('[TEST 6] should handle approval transaction failure', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;
    useTokenApproval.mockReturnValue({
      needsApproval: true,
      handleApprove: jest.fn().mockRejectedValue(new Error('User rejected')),
      isLoading: false,
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Click approve - should not crash
    const approveButton = screen.getByText('Approve HYD');
    fireEvent.click(approveButton);

    // Error handling should prevent crash
    await waitFor(() => {
      expect(approveButton).toBeEnabled();
    });
  });

  /**
   * TEST 7: Performance - Show loading state during approval
   */
  it('[TEST 7] should show loading state during approval transaction', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;
    useTokenApproval.mockReturnValue({
      needsApproval: true,
      handleApprove: mockHandleApprove,
      isLoading: true,  // ← Approval in progress
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Should show "Processing..." or loading indicator
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /approve|processing/i });
      expect(button).toBeDisabled();
    });
  });

  /**
   * TEST 8: Security - Validate amount before approval
   */
  it('[TEST 8] should not allow approval for invalid amounts', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;
    useTokenApproval.mockReturnValue({
      needsApproval: true,
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Try to enter negative amount (should be prevented)
    const amountInput = screen.getByPlaceholderText('Enter amount') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '-100' } });

    // Amount should be filtered or button disabled
    const approveButton = screen.getByText('Approve HYD');
    expect(approveButton).toBeDisabled();
  });

  /**
   * TEST 9: Compatibility - Works with Withdraw tab
   *
   * Withdraw should not require approval (withdrawing from vault, not depositing)
   */
  it('[TEST 9] should not show approval for withdraw operations', async () => {
    const useTokenApproval = require('@/hooks/useTokenApproval').useTokenApproval;
    useTokenApproval.mockReturnValue({
      needsApproval: false,  // ← No approval for withdraw
      handleApprove: mockHandleApprove,
      isLoading: false,
      error: null,
    });

    render(<VaultDepositModal open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Deposit HYD')).toBeInTheDocument();
    });

    // Switch to Withdraw tab
    const withdrawTab = screen.getByText('Withdraw');
    fireEvent.click(withdrawTab);

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '50' } });

    // Should show "Confirm Withdraw", not "Approve"
    await waitFor(() => {
      expect(screen.getByText('Confirm Withdraw')).toBeInTheDocument();
      expect(screen.queryByText('Approve HYD')).not.toBeInTheDocument();
    });
  });
});
