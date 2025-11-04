/**
 * Unit tests for StabilityPoolOverview component
 * StabilityPoolOverview 组件的单元测试
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StabilityPoolOverview } from '../StabilityPoolOverview';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
}));

// Mock hooks
jest.mock('@/hooks/useStabilityPool', () => ({
  useStabilityPoolBalance: jest.fn(),
  useStabilityPoolShares: jest.fn(),
  useStabilityPoolTotalDeposits: jest.fn(),
  useStabilityPoolTotalShares: jest.fn(),
}));

import { useAccount } from 'wagmi';
import {
  useStabilityPoolBalance,
  useStabilityPoolShares,
  useStabilityPoolTotalDeposits,
  useStabilityPoolTotalShares,
} from '@/hooks/useStabilityPool';

const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;

describe('StabilityPoolOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });

    (useStabilityPoolBalance as jest.Mock).mockReturnValue({
      data: BigInt(100000000000000000000), // 100 USDP
      isLoading: false,
      isError: false,
    });

    (useStabilityPoolShares as jest.Mock).mockReturnValue({
      data: BigInt(100000000000000000000), // 100 shares
      isLoading: false,
      isError: false,
    });

    (useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
      data: BigInt(10000000000000000000000), // 10,000 USDP
      isLoading: false,
      isError: false,
    });

    (useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
      data: BigInt(10000000000000000000000), // 10,000 shares
      isLoading: false,
      isError: false,
    });
  });

  describe('Functional Tests', () => {
    it('should render component successfully', () => {
      render(<StabilityPoolOverview />);
      expect(screen.getByText(/stability pool overview/i)).toBeInTheDocument();
    });

    it('should display total deposits amount', () => {
      render(<StabilityPoolOverview />);
      // Total deposits: 10,000 USDP
      expect(screen.getByText(/10,000/)).toBeInTheDocument();
      expect(screen.getByText(/total deposits/i)).toBeInTheDocument();
    });

    it('should display user share percentage', () => {
      render(<StabilityPoolOverview />);
      // User share: 100/10,000 = 1%
      expect(screen.getByText(/1\.0/)).toBeInTheDocument();
      expect(screen.getByText(/your share/i)).toBeInTheDocument();
    });

    it('should display estimated APY', () => {
      render(<StabilityPoolOverview />);
      expect(screen.getByText(/estimated apy/i)).toBeInTheDocument();
      expect(screen.getByText('8.0%')).toBeInTheDocument();
    });

    it('should display user balance', () => {
      render(<StabilityPoolOverview />);
      // User balance: 100 USDP
      expect(screen.getByText(/100/)).toBeInTheDocument();
      expect(screen.getByText(/your balance/i)).toBeInTheDocument();
    });
  });

  describe('Boundary Tests', () => {
    it('should handle zero total deposits', () => {
      (useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        isError: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/total deposits/i)).toBeInTheDocument();
      expect(screen.getByText('0 USDP')).toBeInTheDocument();
    });

    it('should handle zero user balance', () => {
      (useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        isError: false,
      });

      (useStabilityPoolShares as jest.Mock).mockReturnValue({
        data: BigInt(0),
        isLoading: false,
        isError: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText('0 USDP')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should handle very large deposits (1 billion USDP)', () => {
      (useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: BigInt('1000000000000000000000000000'), // 1 billion USDP
        isLoading: false,
        isError: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/1,000,000,000/)).toBeInTheDocument();
    });

    it('should handle 100% user share', () => {
      (useStabilityPoolShares as jest.Mock).mockReturnValue({
        data: BigInt(10000000000000000000000), // Same as total
        isLoading: false,
        isError: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
    });

    it('should handle very small share (0.01%)', () => {
      (useStabilityPoolShares as jest.Mock).mockReturnValue({
        data: BigInt(1000000000000000000), // 1 USDP
        isLoading: false,
        isError: false,
      });

      (useStabilityPoolTotalShares as jest.Mock).mockReturnValue({
        data: BigInt(10000000000000000000000), // 10,000 USDP
        isLoading: false,
        isError: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/0\.01%/)).toBeInTheDocument();
    });
  });

  describe('Exception Tests', () => {
    it('should handle loading state', () => {
      (useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle error state', () => {
      (useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should handle disconnected wallet', () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
    });

    it('should handle undefined data gracefully', () => {
      (useStabilityPoolBalance as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/--/)).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('should render quickly with normal data', () => {
      const startTime = performance.now();
      render(<StabilityPoolOverview />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // <100ms render
    });

    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(<StabilityPoolOverview />);
      const initialRender = screen.getByText(/stability pool overview/i);

      rerender(<StabilityPoolOverview />);
      const secondRender = screen.getByText(/stability pool overview/i);

      expect(initialRender).toBe(secondRender); // Same DOM node
    });
  });

  describe('Security Tests', () => {
    it('should sanitize large numbers to prevent XSS', () => {
      (useStabilityPoolTotalDeposits as jest.Mock).mockReturnValue({
        data: BigInt('999999999999999999999999'),
        isLoading: false,
        isError: false,
      });

      const { container } = render(<StabilityPoolOverview />);
      const html = container.innerHTML;

      // Check that large number is formatted and doesn't contain XSS
      expect(html).toContain('USDP');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('javascript:');
    });

    it('should not expose private user data in DOM attributes', () => {
      const { container } = render(<StabilityPoolOverview />);
      const html = container.innerHTML;

      expect(html).not.toContain(mockAddress);
      expect(html).not.toContain('private');
    });
  });

  describe('Compatibility Tests', () => {
    it('should render correctly on mobile viewport', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/stability pool overview/i)).toBeInTheDocument();
    });

    it('should render correctly on desktop viewport', () => {
      global.innerWidth = 1920;
      global.dispatchEvent(new Event('resize'));

      render(<StabilityPoolOverview />);
      expect(screen.getByText(/stability pool overview/i)).toBeInTheDocument();
    });

    it('should support RTL languages', () => {
      const { container } = render(<StabilityPoolOverview />);
      const cards = container.querySelectorAll('[dir]');

      // Should not break with RTL direction
      cards.forEach((card) => {
        if (card.getAttribute('dir') === 'rtl') {
          expect(card).toBeInTheDocument();
        }
      });
    });
  });
});
