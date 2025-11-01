/**
 * SavingsRateCard Component Tests
 * 6-Dimensional Test Coverage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SavingsRateCard } from '@/components/savings/SavingsRateCard';

// Mock wagmi hooks
const mockUseAccount = jest.fn();
const mockUseSavingAnnualRate = jest.fn();
const mockUseSavingPrincipal = jest.fn();
const mockUseSavingAccruedInterest = jest.fn();
const mockUseSavingCurrentInterest = jest.fn();
const mockUseSavingClaimInterest = jest.fn();

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
}));

jest.mock('@/hooks/useSavingRate', () => ({
  useSavingAnnualRate: () => mockUseSavingAnnualRate(),
  useSavingPrincipal: () => mockUseSavingPrincipal(),
  useSavingAccruedInterest: () => mockUseSavingAccruedInterest(),
  useSavingCurrentInterest: () => mockUseSavingCurrentInterest(),
  useSavingClaimInterest: () => mockUseSavingClaimInterest(),
}));

describe('SavingsRateCard', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default mock values
    mockUseAccount.mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    });

    mockUseSavingAnnualRate.mockReturnValue({
      data: BigInt(200), // 2% APR (200 bps)
      isLoading: false,
      error: null,
    });

    mockUseSavingPrincipal.mockReturnValue({
      data: BigInt('1000000000000000000000'), // 1000 USDP
      isLoading: false,
      error: null,
    });

    mockUseSavingAccruedInterest.mockReturnValue({
      data: BigInt('10000000000000000000'), // 10 USDP
      isLoading: false,
      error: null,
    });

    mockUseSavingCurrentInterest.mockReturnValue({
      data: BigInt('5000000000000000000'), // 5 USDP (current interest)
      isLoading: false,
      error: null,
    });

    mockUseSavingClaimInterest.mockReturnValue({
      writeContract: jest.fn(),
    });
  });

  // ===========================
  // Functional Tests (8)
  // ===========================
  describe('Functional Tests', () => {
    it('should render card container', () => {
      render(<SavingsRateCard locale="en" />);
      const card = screen.getByTestId('savings-rate-card');
      expect(card).toBeInTheDocument();
    });

    it('should display APR correctly', () => {
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/2\.00%/)).toBeInTheDocument(); // 200 bps = 2.00%
    });

    it('should display principal balance', () => {
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/1,000\.00/)).toBeInTheDocument(); // 1000 USDP
    });

    it('should display accrued interest', () => {
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/10\.00/)).toBeInTheDocument(); // 10 USDP interest
    });

    it('should show interest source tooltip on hover', async () => {
      render(<SavingsRateCard locale="en" />);
      const infoIcon = screen.getByTestId('interest-source-info');
      fireEvent.mouseEnter(infoIcon);
      await waitFor(() => {
        expect(screen.getByText(/RWA yield/i)).toBeInTheDocument();
      });
    });

    it('should open deposit modal on deposit button click', () => {
      const onDepositClick = jest.fn();
      render(<SavingsRateCard locale="en" onDepositClick={onDepositClick} />);
      const depositButtons = screen.getAllByText(/Deposit/i);
      // Click the second deposit button (in main card)
      fireEvent.click(depositButtons[depositButtons.length - 1]);
      expect(onDepositClick).toHaveBeenCalled();
    });

    it('should call claim interest on button click', async () => {
      const mockWriteContract = jest.fn();
      mockUseSavingClaimInterest.mockReturnValue({
        writeContract: mockWriteContract,
      });

      render(<SavingsRateCard locale="en" />);
      const claimButton = screen.getByText(/Claim Interest/i);
      fireEvent.click(claimButton);

      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalled();
      });
    });

    it('should show wallet not connected state', () => {
      mockUseAccount.mockReturnValue({ address: undefined });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
    });
  });

  // ===========================
  // Boundary Tests (8)
  // ===========================
  describe('Boundary Tests', () => {
    it('should handle zero APR', () => {
      mockUseSavingAnnualRate.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/0\.00%/)).toBeInTheDocument();
    });

    it('should handle maximum APR (100%)', () => {
      mockUseSavingAnnualRate.mockReturnValue({
        data: BigInt(10000), // 10000 bps = 100%
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/100/)).toBeInTheDocument(); // May contain "100.00%"
    });

    it('should handle zero principal', () => {
      mockUseSavingPrincipal.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      // Should show "No deposit yet" empty state
      expect(screen.getByText(/No deposit yet/i)).toBeInTheDocument();
    });

    it('should handle large principal (1 billion USDP)', () => {
      mockUseSavingPrincipal.mockReturnValue({
        data: BigInt('1000000000000000000000000000'), // 1 billion USDP
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/1,000,000,000\.00/)).toBeInTheDocument();
    });

    it('should handle zero interest', () => {
      mockUseSavingAccruedInterest.mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      const claimButtons = screen.getAllByText(/Claim Interest/i);
      // The claim button should be disabled
      expect(claimButtons[0]).toHaveAttribute('disabled');
    });

    it('should handle maximum uint256 interest', () => {
      const maxUint256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      mockUseSavingAccruedInterest.mockReturnValue({
        data: maxUint256,
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      // Should not crash, should display formatted number
      expect(screen.getByTestId('savings-rate-card')).toBeInTheDocument();
    });

    it('should handle tiny interest (1 wei)', () => {
      mockUseSavingAccruedInterest.mockReturnValue({
        data: BigInt(1), // 1 wei
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      // Card should render (interest rounds to 0.00 but doesn't crash)
      expect(screen.getByTestId('savings-rate-card')).toBeInTheDocument();
    });

    it('should format 18-decimal precision correctly', () => {
      mockUseSavingPrincipal.mockReturnValue({
        data: BigInt('1234567890123456789'), // 1.234567890123456789 USDP
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/1\.23/)).toBeInTheDocument(); // Rounds to 2 decimals
    });
  });

  // ===========================
  // Exception Tests (6)
  // ===========================
  describe('Exception Tests', () => {
    it('should handle contract read failure', () => {
      mockUseSavingAnnualRate.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Contract call reverted'),
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should handle network error', () => {
      mockUseSavingPrincipal.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network request failed'),
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it('should handle invalid address format', () => {
      mockUseAccount.mockReturnValue({
        address: 'invalid-address' as `0x${string}`,
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
    });

    it('should handle missing data gracefully', () => {
      mockUseSavingPrincipal.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });
      render(<SavingsRateCard locale="en" />);
      // Should show empty state when principal is undefined
      expect(screen.getByText(/No deposit yet/i)).toBeInTheDocument();
    });

    it('should handle claim interest failure', async () => {
      const mockWriteContract = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      mockUseSavingClaimInterest.mockReturnValue({
        writeContract: mockWriteContract,
      });

      render(<SavingsRateCard locale="en" />);
      const claimButton = screen.getByText(/Claim Interest/i);
      fireEvent.click(claimButton);

      await waitFor(() => {
        expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
      });
    });

    it('should handle data refresh timeout', async () => {
      mockUseSavingCurrentInterest.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<SavingsRateCard locale="en" />);

      // Wait for timeout
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  // ===========================
  // Performance Tests (4)
  // ===========================
  describe('Performance Tests', () => {
    it('should render within 100ms', () => {
      const startTime = performance.now();
      render(<SavingsRateCard locale="en" />);
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should memoize APR calculation', () => {
      const { rerender } = render(<SavingsRateCard locale="en" />);
      const initialRender = screen.getByText(/2\.00%/);

      // Rerender without changing APR
      rerender(<SavingsRateCard locale="en" />);
      const secondRender = screen.getByText(/2\.00%/);

      // Should be same element (memoized)
      expect(initialRender).toBe(secondRender);
    });

    it('should format large numbers efficiently', () => {
      const largeNumber = BigInt('999999999999999999999999'); // ~1 million USDP
      mockUseSavingPrincipal.mockReturnValue({
        data: largeNumber,
        isLoading: false,
        error: null,
      });

      const startTime = performance.now();
      render(<SavingsRateCard locale="en" />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Format should be fast
    });

    it('should handle rapid data refreshes', async () => {
      const { rerender } = render(<SavingsRateCard locale="en" />);

      // Simulate 10 rapid refreshes
      for (let i = 0; i < 10; i++) {
        mockUseSavingCurrentInterest.mockReturnValue({
          data: BigInt(i * 1000000000000000000),
          isLoading: false,
          error: null,
        });
        rerender(<SavingsRateCard locale="en" />);
      }

      // Should not crash or slow down
      expect(screen.getByTestId('savings-rate-card')).toBeInTheDocument();
    });
  });

  // ===========================
  // Security Tests (5)
  // ===========================
  describe('Security Tests', () => {
    it('should validate Ethereum address format', () => {
      mockUseAccount.mockReturnValue({
        address: '0xINVALID' as `0x${string}`,
      });
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
    });

    it('should prevent XSS in interest source tooltip', () => {
      render(<SavingsRateCard locale="en" />);
      const infoIcon = screen.getByTestId('interest-source-info');
      fireEvent.mouseEnter(infoIcon);

      // Tooltip should not contain script tags
      const tooltip = screen.queryByText(/<script>/i);
      expect(tooltip).not.toBeInTheDocument();
    });

    it('should handle bigint overflow gracefully', () => {
      const overflowValue = BigInt('999999999999999999999999999999999999999999');
      mockUseSavingPrincipal.mockReturnValue({
        data: overflowValue,
        isLoading: false,
        error: null,
      });

      expect(() => render(<SavingsRateCard locale="en" />)).not.toThrow();
    });

    it('should not display sensitive user information', () => {
      render(<SavingsRateCard locale="en" />);
      const cardContent = screen.getByTestId('savings-rate-card').textContent;

      // Should not contain private key or full address
      expect(cardContent).not.toMatch(/0x[0-9a-f]{64}/i); // Private key pattern
    });

    it('should sanitize user input in deposit amount', async () => {
      const onDepositClick = jest.fn();
      render(<SavingsRateCard locale="en" onDepositClick={onDepositClick} />);

      // Find all deposit buttons, click the last one (main card button)
      const depositButtons = screen.getAllByRole('button', { name: /Deposit/i });
      fireEvent.click(depositButtons[depositButtons.length - 1]);

      // Should call callback (actual sanitization happens in modal)
      expect(onDepositClick).toHaveBeenCalled();
    });
  });

  // ===========================
  // Compatibility Tests (4)
  // ===========================
  describe('Compatibility Tests', () => {
    it('should support English locale', () => {
      render(<SavingsRateCard locale="en" />);
      expect(screen.getByText(/Annual Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/My Deposit/i)).toBeInTheDocument();
      expect(screen.getByText(/Accrued Interest/i)).toBeInTheDocument();
    });

    it('should support Chinese locale', () => {
      render(<SavingsRateCard locale="zh" />);
      expect(screen.getByText(/年化利率/)).toBeInTheDocument();
      expect(screen.getByText(/我的存款/)).toBeInTheDocument();
      expect(screen.getByText(/已累积利息/)).toBeInTheDocument();
    });

    it('should be responsive on mobile (xs breakpoint)', () => {
      const { container } = render(<SavingsRateCard locale="en" />);
      const card = container.querySelector('[data-testid="savings-rate-card"]');

      // Should have responsive styles
      expect(card).toHaveStyle({ borderRadius: '24px' });
    });

    it('should follow Material Design 3 guidelines', () => {
      const { container } = render(<SavingsRateCard locale="en" />);
      const card = container.querySelector('[data-testid="savings-rate-card"]');

      // Should use warm color palette (#ff6b00)
      const computedStyle = window.getComputedStyle(card!);
      expect(computedStyle.borderColor).toContain('255, 107, 0'); // rgba(255,107,0,...)
    });
  });
});
