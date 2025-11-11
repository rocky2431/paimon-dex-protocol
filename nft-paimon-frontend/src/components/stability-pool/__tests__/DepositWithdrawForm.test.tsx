/**
 * Integration tests for DepositWithdrawForm with useTokenApproval
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

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { DepositWithdrawForm } from '../DepositWithdrawForm';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
}));

// Mock useTokenApproval hook
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

// Mock useStabilityPool hooks
jest.mock('@/hooks/useStabilityPool', () => ({
  useStabilityPoolDeposit: jest.fn(() => ({
    writeContract: jest.fn(),
    data: undefined,
    isPending: false,
  })),
  useStabilityPoolWithdraw: jest.fn(() => ({
    writeContract: jest.fn(),
    data: undefined,
    isPending: false,
  })),
  useStabilityPoolBalance: jest.fn(() => ({
    data: undefined,
  })),
}));

const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
const mockStabilityPoolAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
const mockUSDPAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`;

describe('DepositWithdrawForm - Approval Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });

    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
    });
  });

  describe('[TEST 1-4] Functional Tests - Approval Flow', () => {
    it('[TEST 1] should show "Authorize USDP" button when approval is needed', async () => {
      // Mock USDP balance (user has USDP)
      let callCount = 0;
      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) }; // 1000 USDP
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('0', 18) }; // No allowance
        }
        return { data: undefined };
      });

      // Mock useTokenApproval - needs approval
      const mockApproval = {
        needsApproval: true,
        state: 'idle',
        handleApprove: jest.fn(),
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Should show "Authorize USDP" button
      await waitFor(() => {
        expect(screen.getByText('Approve USDP')).toBeInTheDocument();
      });

      // Should NOT show "Confirm Deposit" yet
      expect(screen.queryByText('Confirm Deposit')).not.toBeInTheDocument();
    });

    it('[TEST 2] should show "Confirm Deposit" button when approval is sufficient', async () => {
      // Mock USDP balance and sufficient allowance
      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('500', 18) }; // Sufficient allowance
        }
        return { data: undefined };
      });

      // Mock useTokenApproval - no approval needed
      const mockApproval = {
        needsApproval: false,
        state: 'approved',
        handleApprove: jest.fn(),
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Should show "Confirm Deposit" button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /confirm deposit/i })).toBeInTheDocument();
      });

      // Should NOT show "Authorize USDP"
      expect(screen.queryByRole('button', { name: /authorize usdp/i })).not.toBeInTheDocument();
    });

    it('[TEST 3] should execute approval when "Authorize USDP" is clicked', async () => {
      const mockHandleApprove = jest.fn().mockResolvedValue(undefined);

      // Mock USDP balance and no allowance
      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('0', 18) };
        }
        return { data: undefined };
      });

      const mockApproval = {
        needsApproval: true,
        state: 'idle',
        handleApprove: mockHandleApprove,
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Wait for button to update
      await waitFor(() => {
        expect(screen.getByText('Approve USDP')).toBeInTheDocument();
      });

      // Click "Authorize USDP"
      const authorizeButton = screen.getByText('Approve USDP');
      fireEvent.click(authorizeButton);

      // Should call handleApprove
      await waitFor(() => {
        expect(mockHandleApprove).toHaveBeenCalledTimes(1);
      });
    });

    it('[TEST 4] should transition from "Authorize" to "Confirm Deposit" after approval', async () => {
      // Start with needs approval
      const mockHandleApprove = jest.fn().mockResolvedValue(undefined);

      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('0', 18) }; // Start with no allowance
        }
        return { data: undefined };
      });

      const initialMockApproval = {
        needsApproval: true,
        state: 'idle',
        handleApprove: mockHandleApprove,
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(initialMockApproval);

      const { rerender } = render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Should show "Approve USDP"
      await waitFor(() => {
        expect(screen.getByText('Approve USDP')).toBeInTheDocument();
      });

      // Click "Authorize USDP"
      const authorizeButton = screen.getByText('Approve USDP');
      fireEvent.click(authorizeButton);

      await waitFor(() => {
        expect(mockHandleApprove).toHaveBeenCalled();
      });

      // Update mock to simulate successful approval
      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('500', 18) }; // Now has allowance
        }
        return { data: undefined };
      });

      const approvedMockApproval = {
        needsApproval: false,
        state: 'approved',
        handleApprove: jest.fn(),
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(approvedMockApproval);

      // Rerender to pick up new approval state
      rerender(<DepositWithdrawForm locale="en" />);

      // Should now show "Confirm Deposit"
      await waitFor(() => {
        expect(screen.getByText('Confirm Deposit')).toBeInTheDocument();
      });
    });
  });

  describe('[TEST 5-7] Boundary Tests', () => {
    it('[TEST 5] should handle zero amount correctly', async () => {
      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('500', 18) };
        }
        return { data: undefined };
      });

      const mockApproval = {
        needsApproval: false,
        state: 'approved',
        handleApprove: jest.fn(),
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Don't enter any amount (zero)
      const submitButton = screen.getByRole('button', { name: /confirm deposit/i });

      // Button should be disabled for zero amount
      expect(submitButton).toBeDisabled();
    });

    it('[TEST 6] should handle insufficient balance correctly', async () => {
      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('50', 18) }; // Only 50 USDP
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('500', 18) };
        }
        return { data: undefined };
      });

      const mockApproval = {
        needsApproval: false,
        state: 'approved',
        handleApprove: jest.fn(),
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount greater than balance
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Click deposit
      const submitButton = screen.getByRole('button', { name: /confirm deposit/i });
      fireEvent.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
      });
    });

    it('[TEST 7] should handle wallet not connected', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Should show "Connect Wallet" button
      expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
    });
  });

  describe('[TEST 8-10] Exception Tests', () => {
    it('[TEST 8] should handle approval rejection gracefully', async () => {
      const mockHandleApprove = jest.fn().mockRejectedValue(new Error('User rejected'));

      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('0', 18) };
        }
        return { data: undefined };
      });

      const mockApproval = {
        needsApproval: true,
        state: 'error',
        handleApprove: mockHandleApprove,
        isLoading: false,
        error: 'User rejected',
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/user rejected/i)).toBeInTheDocument();
      });
    });

    it('[TEST 9] should show loading state during approval', async () => {
      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('0', 18) };
        }
        return { data: undefined };
      });

      const mockApproval = {
        needsApproval: true,
        state: 'approving',
        handleApprove: jest.fn(),
        isLoading: true,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Should show loading state (Processing...)
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });

      // Button should be disabled during loading
      const button = screen.getByText('Processing...');
      expect(button.closest('button')).toBeDisabled();
    });

    it('[TEST 10] should handle deposit failure after approval', async () => {
      // Mock console.error to suppress error output
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockDeposit = jest.fn(() => {
        throw new Error('Deposit failed');
      });

      (useReadContract as jest.Mock).mockImplementation((config) => {
        if (config.functionName === 'balanceOf') {
          return { data: parseUnits('1000', 18) };
        }
        if (config.functionName === 'allowance') {
          return { data: parseUnits('500', 18) };
        }
        return { data: undefined };
      });

      require('@/hooks/useStabilityPool').useStabilityPoolDeposit.mockReturnValue({
        writeContract: mockDeposit,
        data: undefined,
        isPending: false,
      });

      const mockApproval = {
        needsApproval: false,
        state: 'approved',
        handleApprove: jest.fn(),
        isLoading: false,
        error: null,
      };

      require('@/hooks/useTokenApproval').useTokenApproval.mockReturnValue(mockApproval);

      render(<DepositWithdrawForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Deposit')).toBeInTheDocument();
      });

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Wait for "Confirm Deposit" button
      await waitFor(() => {
        expect(screen.getByText('Confirm Deposit')).toBeInTheDocument();
      });

      // Click deposit
      const submitButton = screen.getByText('Confirm Deposit');
      fireEvent.click(submitButton);

      // Should call deposit and error is logged
      await waitFor(() => {
        expect(mockDeposit).toHaveBeenCalled();
        expect(mockConsoleError).toHaveBeenCalledWith('Deposit error:', expect.any(Error));
      });

      // Restore console.error
      mockConsoleError.mockRestore();
    });
  });
});
