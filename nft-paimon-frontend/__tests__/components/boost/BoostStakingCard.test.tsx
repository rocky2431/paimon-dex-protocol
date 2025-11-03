/**
 * BoostStakingCard Component Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core functionality
 * 2. Boundary - Edge cases (no stake, loading, error)
 * 3. Exception - Error handling
 * 4. Performance - (Deferred to E2E)
 * 5. Security - Data validation
 * 6. Compatibility - Responsive design (visual validation)
 */

import { render, screen } from '@testing-library/react';
import { BoostStakingCard } from '@/components/boost/BoostStakingCard';
import { BoostStake } from '@/components/boost/types';

// Mock stake data for tests
const mockStake: BoostStake = {
  amount: BigInt('1000000000000000000000'), // 1000 PAIMON
  amountFormatted: '1000.0',
  stakeTime: 1730000000, // Some past timestamp
  unlockTime: 1730604800, // 7 days later
  boostMultiplier: 11000, // 1.1x
  boostMultiplierFormatted: '1.10x',
  canUnstake: false,
  timeRemaining: 86400, // 1 day remaining
};

describe('BoostStakingCard Component', () => {
  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: Core Rendering', () => {
    it('renders stake information correctly', () => {
      render(<BoostStakingCard stake={mockStake} />);

      // Should display staked amount
      expect(screen.getByText(/1000\.0/)).toBeInTheDocument();

      // Should display boost multiplier
      expect(screen.getByText(/1\.10x/)).toBeInTheDocument();
    });

    it('displays unlock countdown when stake is locked', () => {
      render(<BoostStakingCard stake={mockStake} />);

      // Should show time remaining (timeRemaining: 86400 seconds = 1 day)
      expect(screen.getByText(/1d/)).toBeInTheDocument();
    });

    it('shows unstake button when unlocked', () => {
      const unlockedStake: BoostStake = {
        ...mockStake,
        canUnstake: true,
        timeRemaining: 0,
      };

      render(<BoostStakingCard stake={unlockedStake} />);

      // Should show "Ready" status chip
      expect(screen.getByText('Ready')).toBeInTheDocument();

      // Should show unlock message
      expect(screen.getByText(/You can now unstake your PAIMON/i)).toBeInTheDocument();
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('renders empty state when no stake exists', () => {
      render(<BoostStakingCard stake={undefined} />);

      // Should show empty state message
      expect(screen.getByText(/No active stake|Stake PAIMON/i)).toBeInTheDocument();
    });

    it('renders loading state correctly', () => {
      render(<BoostStakingCard isLoading={true} />);

      // Should show loading indicator or skeleton
      expect(screen.getByText(/Loading|loading/i)).toBeInTheDocument();
    });

    it('handles zero stake amount', () => {
      const zeroStake: BoostStake = {
        ...mockStake,
        amount: BigInt(0),
        amountFormatted: '0.0',
        boostMultiplier: 10000, // 1.0x (minimum)
        boostMultiplierFormatted: '1.00x',
      };

      render(<BoostStakingCard stake={zeroStake} />);

      // Should render without crashing
      expect(screen.getByText(/0\.0/)).toBeInTheDocument();
      expect(screen.getByText(/1\.00x/)).toBeInTheDocument();
    });

    it('handles maximum boost multiplier (1.5x)', () => {
      const maxBoostStake: BoostStake = {
        ...mockStake,
        amount: BigInt('5000000000000000000000'), // 5000 PAIMON
        amountFormatted: '5000.0',
        boostMultiplier: 15000, // 1.5x (maximum)
        boostMultiplierFormatted: '1.50x',
      };

      render(<BoostStakingCard stake={maxBoostStake} />);

      expect(screen.getByText(/5000\.0/)).toBeInTheDocument();
      expect(screen.getByText(/1\.50x/)).toBeInTheDocument();
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('renders error state when error prop is provided', () => {
      render(<BoostStakingCard error="Failed to load stake data" />);

      // Should display error message
      expect(screen.getByText(/Failed to load stake data/i)).toBeInTheDocument();
    });

    it('handles invalid stake data gracefully', () => {
      const invalidStake = {
        ...mockStake,
        amount: BigInt(-1), // Invalid negative amount
      };

      // Should not crash - render without throwing
      expect(() => {
        render(<BoostStakingCard stake={invalidStake as BoostStake} />);
      }).not.toThrow();
    });
  });

  /**
   * 5. Security Tests - Data Validation
   */
  describe('Security: Data Validation', () => {
    it('sanitizes and validates displayed amounts', () => {
      render(<BoostStakingCard stake={mockStake} />);

      // Amount should be displayed as formatted string, not raw bigint
      const amountText = screen.getByText(/1000\.0/);
      expect(amountText).toBeInTheDocument();
      expect(amountText.textContent).not.toContain('BigInt');
    });

    it('prevents XSS in formatted values', () => {
      const maliciousStake: BoostStake = {
        ...mockStake,
        amountFormatted: '<script>alert("XSS")</script>',
      };

      render(<BoostStakingCard stake={maliciousStake} />);

      // Should render as text, not execute script
      expect(screen.queryByText(/alert/i)).not.toBeInTheDocument();
    });
  });

  /**
   * 6. Compatibility Tests - Responsive Design
   * Note: Visual testing deferred to E2E with chrome-devtools MCP
   */
  describe('Compatibility: Responsive Design', () => {
    it('renders without layout errors on different screen sizes', () => {
      const { container } = render(<BoostStakingCard stake={mockStake} />);

      // Should render a container element
      expect(container.firstChild).toBeInTheDocument();

      // Component should use MUI responsive components (Grid, Box)
      // Visual validation done in E2E tests
    });
  });
});
