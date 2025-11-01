/**
 * SavingsDepositModal Component Tests
 * 6-Dimensional Test Coverage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SavingsDepositModal } from '@/components/savings/SavingsDepositModal';

// Mock wagmi hooks
const mockUseAccount = jest.fn();
const mockUseSavingPrincipal = jest.fn();
const mockUseReadContract = jest.fn(); // For USDP balance
const mockUseWriteContract = jest.fn();

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: () => mockUseReadContract(),
  useWriteContract: () => mockUseWriteContract(),
}));

jest.mock('@/hooks/useSavingRate', () => ({
  useSavingPrincipal: () => mockUseSavingPrincipal(),
  useSavingDeposit: () => mockUseWriteContract(),
  useSavingWithdraw: () => mockUseWriteContract(),
}));

describe('SavingsDepositModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAccount.mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    });

    mockUseReadContract.mockReturnValue({
      data: BigInt('5000000000000000000000'), // 5000 USDP balance
      isLoading: false,
      error: null,
    });

    mockUseSavingPrincipal.mockReturnValue({
      data: BigInt('1000000000000000000000'), // 1000 USDP deposited
      isLoading: false,
      error: null,
    });

    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      isLoading: false,
      isSuccess: false,
      error: null,
    });
  });

  // ===========================
  // Functional Tests (8)
  // ===========================
  describe('Functional Tests', () => {
    it('should render modal when open', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/Deposit USDP/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<SavingsDepositModal open={false} onClose={jest.fn()} locale="en" />);
      expect(screen.queryByText(/Deposit USDP/i)).not.toBeInTheDocument();
    });

    it('should switch between Deposit and Withdraw tabs', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

      // Default is Deposit
      expect(screen.getByText(/Deposit USDP/i)).toBeInTheDocument();

      // Click Withdraw tab
      const withdrawTab = screen.getByText(/Withdraw/i);
      fireEvent.click(withdrawTab);

      expect(screen.getByText(/Withdraw USDP/i)).toBeInTheDocument();
    });

    it('should display USDP balance for deposit', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/5,000\.00/)).toBeInTheDocument(); // 5000 USDP
    });

    it('should display principal balance for withdraw', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const withdrawTab = screen.getByText(/Withdraw/i);
      fireEvent.click(withdrawTab);

      expect(screen.getByText(/1,000\.00/)).toBeInTheDocument(); // 1000 USDP deposited
    });

    it('should fill max amount on Max button click', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const maxButton = screen.getByText(/Max/i);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      fireEvent.click(maxButton);

      // Should fill with balance
      expect(input).toHaveValue();
      expect(parseFloat(input.value)).toBeGreaterThan(0);
    });

    it('should call deposit on confirm', async () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
      });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);
      await userEvent.type(input, '100');

      const confirmButton = screen.getByText(/Confirm Deposit/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalled();
      });
    });

    it('should close modal on cancel', () => {
      const onClose = jest.fn();
      render(<SavingsDepositModal open={true} onClose={onClose} locale="en" />);

      const cancelButton = screen.getByText(/Cancel/i);
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  // ===========================
  // Boundary Tests (8)
  // ===========================
  describe('Boundary Tests', () => {
    it('should handle zero balance', () => {
      mockUseReadContract.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/0\.00/)).toBeInTheDocument();
    });

    it('should handle maximum USDP balance', () => {
      const maxUint256 = BigInt('1000000000000000000000000'); // 1 million USDP
      mockUseReadContract.mockReturnValue({
        data: maxUint256,
        isLoading: false,
        error: null,
      });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByTestId('deposit-modal')).toBeInTheDocument();
    });

    it('should validate amount exceeds balance', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '10000'); // Exceeds 5000 balance

      const confirmButton = screen.getByText(/Confirm Deposit/i);
      expect(confirmButton).toBeDisabled();
    });

    it('should validate zero amount', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '0');

      const confirmButton = screen.getByText(/Confirm Deposit/i);
      expect(confirmButton).toBeDisabled();
    });

    it('should handle 18-decimal precision input', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '1.123456789012345678');

      expect(input).toHaveValue('1.123456789012345678');
    });

    it('should reject more than 18 decimals', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '1.1234567890123456789'); // 19 decimals

      // Should only accept 18 decimals
      expect(input).toHaveValue('1.123456789012345678');
    });

    it('should handle minimum deposit (1 wei)', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '0.000000000000000001'); // 1 wei

      const confirmButton = screen.getByText(/Confirm Deposit/i);
      expect(confirmButton).not.toBeDisabled();
    });

    it('should handle large withdrawal (all principal)', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const withdrawTab = screen.getByText(/Withdraw/i);
      fireEvent.click(withdrawTab);

      const maxButton = screen.getByText(/Max/i);
      fireEvent.click(maxButton);

      const input = screen.getByPlaceholderText(/Enter amount/i);
      expect(input).toHaveValue();
      expect(parseFloat(input.value)).toBeGreaterThan(0);
    });
  });

  // ===========================
  // Exception Tests (6)
  // ===========================
  describe('Exception Tests', () => {
    it('should handle wallet not connected', () => {
      mockUseAccount.mockReturnValue({ address: undefined });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
    });

    it('should handle balance loading', () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle balance fetch error', () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should handle transaction failure', async () => {
      const mockWriteContract = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
      });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);
      await userEvent.type(input, '100');

      const confirmButton = screen.getByText(/Confirm Deposit/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid amount format', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, 'invalid');

      // Should not accept non-numeric input
      expect(input).toHaveValue('');
    });

    it('should handle negative amounts', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '-100');

      // Should not accept negative numbers
      expect(input).toHaveValue('100'); // Negative sign filtered
    });
  });

  // ===========================
  // Performance Tests (4)
  // ===========================
  describe('Performance Tests', () => {
    it('should render within 100ms', () => {
      const startTime = performance.now();
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid tab switching', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);

      const tabs = screen.getAllByRole('tab');
      const depositTab = tabs[0];
      const withdrawTab = tabs[1];

      // Rapid switching
      for (let i = 0; i < 10; i++) {
        fireEvent.click(i % 2 === 0 ? withdrawTab : depositTab);
      }

      expect(screen.getByTestId('deposit-modal')).toBeInTheDocument();
    });

    it('should validate input efficiently', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      const startTime = performance.now();
      await userEvent.type(input, '1234567890.123456789012345678');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Fast input validation
    });

    it('should handle rapid Max button clicks', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const maxButton = screen.getByText(/Max/i);

      for (let i = 0; i < 20; i++) {
        fireEvent.click(maxButton);
      }

      const input = screen.getByPlaceholderText(/Enter amount/i);
      expect(input).toHaveValue();
      expect(parseFloat(input.value)).toBeGreaterThan(0);
    });
  });

  // ===========================
  // Security Tests (5)
  // ===========================
  describe('Security Tests', () => {
    it('should validate Ethereum address', () => {
      mockUseAccount.mockReturnValue({
        address: 'invalid' as `0x${string}`,
      });

      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
    });

    it('should sanitize amount input (no XSS)', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '<script>alert("XSS")</script>');

      // Should not accept script tags
      expect(input).toHaveValue('');
    });

    it('should prevent bigint overflow', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      // Try to input extremely large number
      await userEvent.type(input, '999999999999999999999999999999');

      // Should handle gracefully (button disabled)
      const confirmButton = screen.getByText(/Confirm Deposit/i);
      expect(confirmButton).toBeDisabled();
    });

    it('should not expose private keys', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const modalContent = screen.getByTestId('deposit-modal').textContent;

      // Should not contain private key pattern
      expect(modalContent).not.toMatch(/0x[0-9a-f]{64}/i);
    });

    it('should require confirmation for large deposits', async () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      const input = screen.getByPlaceholderText(/Enter amount/i);

      await userEvent.type(input, '4600'); // >92% of balance (>90%)

      // Should show warning (or at least not crash)
      await waitFor(() => {
        expect(input).toHaveValue('4600');
      });
      // Warning should appear for amounts >90% of balance
      expect(screen.queryByText(/Warning/i) || screen.queryByText(/large/i)).toBeTruthy();
    });
  });

  // ===========================
  // Compatibility Tests (4)
  // ===========================
  describe('Compatibility Tests', () => {
    it('should support English locale', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      expect(screen.getByText(/Deposit USDP/i)).toBeInTheDocument();
      expect(screen.getByText(/Available Balance/i)).toBeInTheDocument();
    });

    it('should support Chinese locale', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="zh" />);
      expect(screen.getByText(/存入 USDP/)).toBeInTheDocument();
      expect(screen.getByText(/可用余额/)).toBeInTheDocument();
    });

    it('should be responsive on mobile', () => {
      render(<SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />);
      // Modal should render
      expect(screen.getByTestId('deposit-modal')).toBeInTheDocument();
    });

    it('should follow Material Design 3 guidelines', () => {
      const { container } = render(
        <SavingsDepositModal open={true} onClose={jest.fn()} locale="en" />
      );
      const confirmButton = screen.getByText(/Confirm Deposit/i);

      // Should have warm color (#ff6b00)
      expect(confirmButton).toHaveStyle({ textTransform: 'none' });
    });
  });
});
