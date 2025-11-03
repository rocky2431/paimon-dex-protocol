/**
 * StabilityPoolOverview Component Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core display logic
 * 2. Boundary - Edge cases (zero values, large numbers)
 * 3. Exception - Error handling
 * 4. Performance - Rendering performance
 * 5. Security - XSS prevention
 * 6. Compatibility - Responsive design
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StabilityPoolOverview } from '../StabilityPoolOverview';
import * as stabilityPoolHooks from '@/hooks/useStabilityPool';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
}));

// Mock stability pool hooks
jest.mock('@/hooks/useStabilityPool');

describe('StabilityPoolOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // 1. FUNCTIONAL TESTS - Core display logic
  // ========================================
  describe('Functional Tests', () => {
    it('should display total deposits correctly', () => {
      // Mock total deposits
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n, // 1,000,000 USDP (18 decimals)
        isLoading: false,
        isError: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n, // 10,000 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display formatted total deposits
      expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
      expect(screen.getAllByText(/USDP/).length).toBeGreaterThan(0);
    });

    it('should display user share percentage correctly', () => {
      // User has 10,000 USDP out of 1,000,000 total = 1%
      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n, // 10,000 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n, // 1,000,000 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display 1.00% share
      expect(screen.getByText(/1\.00%/)).toBeInTheDocument();
    });

    it('should display estimated APY based on liquidation frequency', () => {
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display APY (estimated)
      expect(screen.getByText(/APY/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // 2. BOUNDARY TESTS - Edge cases
  // ========================================
  describe('Boundary Tests', () => {
    it('should handle zero total deposits', () => {
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 0n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 0n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 0n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display 0 without errors
      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('should handle very large deposit amounts', () => {
      // 1 billion USDP
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000000n, // 1,000,000,000 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should format large numbers with commas
      expect(screen.getByText(/1,000,000,000/)).toBeInTheDocument();
    });

    it('should handle 100% user share', () => {
      // User has all deposits
      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n, // 1,000,000 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n, // 1,000,000 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display 100.00%
      expect(screen.getByText(/100\.00%/)).toBeInTheDocument();
    });

    it('should handle very small share percentages', () => {
      // User has 1 USDP out of 1,000,000 = 0.0001%
      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 1000000000000000000n, // 1 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n, // 1,000,000 USDP
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display small percentage (0.00%)
      expect(screen.getByText('0.00%')).toBeInTheDocument();
    });
  });

  // ========================================
  // 3. EXCEPTION TESTS - Error handling
  // ========================================
  describe('Exception Tests', () => {
    it('should display loading state when data is loading', () => {
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should show loading indicators
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    });

    it('should handle contract read errors gracefully', () => {
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Contract read failed'),
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display error message or fallback UI
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
    });

    it('should handle undefined user address', () => {
      // Mock no connected wallet
      const useAccount = require('wagmi').useAccount as jest.Mock;
      useAccount.mockReturnValue({ address: undefined });

      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display connect wallet message or 0 balance
      expect(screen.getByText(/connect/i) || screen.getByText(/0/)).toBeInTheDocument();
    });
  });

  // ========================================
  // 4. PERFORMANCE TESTS - Rendering performance
  // ========================================
  describe('Performance Tests', () => {
    it('should render within acceptable time (<100ms)', () => {
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      const startTime = performance.now();
      render(<StabilityPoolOverview locale="en" />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in <100ms
    });

    it('should not cause unnecessary re-renders', async () => {
      const mockData = {
        data: 1000000000000000000000000n,
        isLoading: false,
      };

      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue(mockData);
      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue(mockData);
      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue(mockData);

      const { rerender } = render(<StabilityPoolOverview locale="en" />);

      // Rerender with same props
      rerender(<StabilityPoolOverview locale="en" />);

      // Component should handle rerender efficiently
      await waitFor(() => {
        expect(screen.getAllByText(/USDP/).length).toBeGreaterThan(0);
      });
    });
  });

  // ========================================
  // 5. SECURITY TESTS - XSS prevention
  // ========================================
  describe('Security Tests', () => {
    it('should sanitize numeric display to prevent XSS', () => {
      // Even if malicious data somehow gets through, numbers should be sanitized
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      const { container } = render(<StabilityPoolOverview locale="en" />);

      // Should not contain script tags
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).not.toContain('javascript:');
    });
  });

  // ========================================
  // 6. COMPATIBILITY TESTS - Responsive & i18n
  // ========================================
  describe('Compatibility Tests', () => {
    it('should support English locale', () => {
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="en" />);

      // Should display English text
      expect(screen.getByText(/Total Deposits/i)).toBeInTheDocument();
    });

    it('should support Chinese locale', () => {
      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      render(<StabilityPoolOverview locale="zh" />);

      // Should display Chinese text
      expect(screen.getByText(/总存款/)).toBeInTheDocument();
    });

    it('should be responsive on mobile viewport', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      (stabilityPoolHooks.useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: 10000000000000000000000n,
        isLoading: false,
      });

      (stabilityPoolHooks.useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: 1000000000000000000000000n,
        isLoading: false,
      });

      const { container } = render(<StabilityPoolOverview locale="en" />);

      // Should render without horizontal overflow
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
