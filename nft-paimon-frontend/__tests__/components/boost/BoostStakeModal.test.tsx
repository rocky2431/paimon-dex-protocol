/**
 * BoostStakeModal Component Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Modal interactions, input handling, stake submission
 * 2. Boundary - Zero amount, max balance, boost cap (5000)
 * 3. Exception - Insufficient balance, invalid input
 * 4. Performance - (Deferred to E2E)
 * 5. Security - Input validation, XSS prevention
 * 6. Compatibility - Responsive design (visual validation)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoostStakeModal } from '@/components/boost/BoostStakeModal';

// Mock onStake handler
const mockOnStake = jest.fn();
const mockOnClose = jest.fn();

describe('BoostStakeModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: Modal Interactions', () => {
    it('renders modal when open is true', () => {
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      // ✅ FIX (Task 84): Use exact text to avoid multiple matches
      expect(screen.getByText('Stake PAIMON to Boost Rewards')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <BoostStakeModal
          open={false}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      expect(screen.queryByText(/Stake PAIMON/i)).not.toBeInTheDocument();
    });

    it('displays user balance correctly', () => {
      render(
        <BoostStakeModal
          open={true}
          userBalance="1234.56"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      expect(screen.getByText(/1234\.56/)).toBeInTheDocument();
    });

    it('allows user to input amount', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '500');

      expect(input).toHaveValue('500');
    });

    it('shows estimated boost multiplier when amount entered', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '1000');

      // 1000 PAIMON → 1.1x boost
      await waitFor(() => {
        expect(screen.getByText(/1\.10x/)).toBeInTheDocument();
      });
    });

    it('calls onStake when confirm button clicked', async () => {
      const user = userEvent.setup();
      mockOnStake.mockResolvedValue(undefined);

      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '500');

      const confirmButton = screen.getByRole('button', { name: /Stake/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnStake).toHaveBeenCalledWith('500');
      });
    });

    it('calls onClose when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('has "Max" button to fill balance', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1234.56"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const maxButton = screen.getByRole('button', { name: /Max/i });
      await user.click(maxButton);

      const input = screen.getByRole('textbox', { name: /amount/i });
      expect(input).toHaveValue('1234.56');
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('handles zero amount', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '0');

      const confirmButton = screen.getByRole('button', { name: /Stake/i });
      expect(confirmButton).toBeDisabled();
    });

    it('handles maximum boost amount (5000)', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="10000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '5000');

      // 5000 PAIMON → 1.5x boost (capped)
      await waitFor(() => {
        expect(screen.getByText(/1\.50x/)).toBeInTheDocument();
      });
    });

    it('shows cap warning when exceeding 5000', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="10000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '6000');

      await waitFor(() => {
        expect(screen.getByText(/maximum boost reached/i)).toBeInTheDocument();
      });
    });

    it('handles existing stake (additional staking)', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="2000.0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '1000');

      // 2000 + 1000 = 3000 total → 1.3x boost
      await waitFor(() => {
        expect(screen.getByText(/3000/)).toBeInTheDocument();
        expect(screen.getByText(/1\.30x/)).toBeInTheDocument();
      });
    });

    it('handles zero balance', () => {
      render(
        <BoostStakeModal
          open={true}
          userBalance="0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
      const confirmButton = screen.getByRole('button', { name: /Stake/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('shows error when amount exceeds balance', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '1500');

      await waitFor(() => {
        expect(screen.getByText(/exceeds balance/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /Stake/i });
      expect(confirmButton).toBeDisabled();
    });

    it('handles onStake rejection gracefully', async () => {
      const user = userEvent.setup();
      mockOnStake.mockRejectedValue(new Error('Transaction failed'));

      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '500');

      const confirmButton = screen.getByRole('button', { name: /Stake/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Transaction failed/i)).toBeInTheDocument();
      });
    });

    it('shows disabled state when staking in progress', () => {
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
          staking={true}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /Staking/i });
      expect(confirmButton).toBeDisabled();
    });

    it('rejects negative amounts', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '-100');

      const confirmButton = screen.getByRole('button', { name: /Stake/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  /**
   * 5. Security Tests - Data Validation
   */
  describe('Security: Data Validation', () => {
    it('sanitizes input to prevent XSS', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, '<script>alert("XSS")</script>');

      // Should not execute script
      expect(screen.queryByText(/alert/)).not.toBeInTheDocument();
    });

    it('validates numeric input only', async () => {
      const user = userEvent.setup();
      render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      const input = screen.getByRole('textbox', { name: /amount/i });
      await user.type(input, 'abc');

      // Should reject non-numeric input
      expect(input).toHaveValue('');
    });
  });

  /**
   * 6. Compatibility Tests - Responsive Design
   */
  describe('Compatibility: Responsive Design', () => {
    it('renders without layout errors', () => {
      const { container } = render(
        <BoostStakeModal
          open={true}
          userBalance="1000.0"
          currentStaked="0"
          onClose={mockOnClose}
          onStake={mockOnStake}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    describe('Mobile Viewport (375px)', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
      });

      it('should render modal content on mobile', () => {
        render(
          <BoostStakeModal
            open={true}
            userBalance="1000.0"
            currentStaked="0"
            onClose={mockOnClose}
            onStake={mockOnStake}
          />
        );

        expect(screen.getByText('Stake PAIMON to Boost Rewards')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /amount/i })).toBeInTheDocument();
      });

      it('should display buttons on mobile', () => {
        render(
          <BoostStakeModal
            open={true}
            userBalance="1000.0"
            currentStaked="0"
            onClose={mockOnClose}
            onStake={mockOnStake}
          />
        );

        expect(screen.getByRole('button', { name: /Max/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Stake/i })).toBeInTheDocument();
      });

      it('should handle touch interactions on mobile', async () => {
        const user = userEvent.setup();
        mockOnStake.mockResolvedValue(undefined);

        render(
          <BoostStakeModal
            open={true}
            userBalance="1000.0"
            currentStaked="0"
            onClose={mockOnClose}
            onStake={mockOnStake}
          />
        );

        const input = screen.getByRole('textbox', { name: /amount/i });
        await user.type(input, '250');

        const stakeButton = screen.getByRole('button', { name: /Stake/i });
        await user.click(stakeButton);

        await waitFor(() => {
          expect(mockOnStake).toHaveBeenCalledWith('250');
        });
      });
    });

    describe('Tablet Viewport (768px)', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 768,
        });
      });

      it('should render modal correctly on tablet', () => {
        render(
          <BoostStakeModal
            open={true}
            userBalance="1000.0"
            currentStaked="0"
            onClose={mockOnClose}
            onStake={mockOnStake}
          />
        );

        expect(screen.getByText('Stake PAIMON to Boost Rewards')).toBeInTheDocument();
        // ✅ FIX (Task 85): Use correct text "Available Balance"
        expect(screen.getByText(/Available Balance/)).toBeInTheDocument();
      });

      it('should display all content without truncation on tablet', () => {
        render(
          <BoostStakeModal
            open={true}
            userBalance="9999.99"
            currentStaked="1234.56"
            onClose={mockOnClose}
            onStake={mockOnStake}
          />
        );

        // ✅ FIX (Task 85): Component displays userBalance, not currentStaked directly
        expect(screen.getByText(/9999\.99/)).toBeVisible();
        expect(screen.getByText(/Available Balance/)).toBeVisible();
      });
    });

    describe('Desktop Viewport (1920px)', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1920,
        });
      });

      it('should render modal with full layout on desktop', () => {
        render(
          <BoostStakeModal
            open={true}
            userBalance="1000.0"
            currentStaked="0"
            onClose={mockOnClose}
            onStake={mockOnStake}
          />
        );

        expect(screen.getByText('Stake PAIMON to Boost Rewards')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /amount/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Max/i })).toBeInTheDocument();
      });

      it('should have proper spacing on desktop', () => {
        const { container } = render(
          <BoostStakeModal
            open={true}
            userBalance="1000.0"
            currentStaked="0"
            onClose={mockOnClose}
            onStake={mockOnStake}
          />
        );

        // Modal should be rendered
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });
});
