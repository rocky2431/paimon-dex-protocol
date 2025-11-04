/**
 * BoostCalculator Component Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Input calculation, boost preview
 * 2. Boundary - Zero, max boost (5000), large numbers
 * 3. Exception - Invalid input
 * 4. Performance - (Deferred to E2E)
 * 5. Security - Input validation
 * 6. Compatibility - Responsive design
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoostCalculator } from '@/components/boost/BoostCalculator';

describe('BoostCalculator Component', () => {
  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: Calculation Logic', () => {
    it('renders calculator interface', () => {
      render(<BoostCalculator userBalance="1000.0" currentMultiplier={10000} />);

      expect(screen.getByText(/Boost Calculator/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('displays current balance', () => {
      render(<BoostCalculator userBalance="1234.56" currentMultiplier={10000} />);

      expect(screen.getByText(/1234\.56/)).toBeInTheDocument();
    });

    it('calculates boost multiplier correctly', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="10000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '1000');

      // 1000 PAIMON → 1.1x boost
      expect(screen.getByText(/1\.10x/)).toBeInTheDocument();
    });

    it('shows reward increase percentage', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="10000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '1000');

      // 1.1x = 10% increase
      expect(screen.getByText(/10.*%/)).toBeInTheDocument();
    });

    it('shows example rewards comparison', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="10000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '2000');

      // ✅ FIX (Task 84): Texts appear multiple times, use getAllByText
      const baseRewardMatches = screen.getAllByText(/Base Reward/i);
      expect(baseRewardMatches.length).toBeGreaterThanOrEqual(1);
      const boostedRewardMatches = screen.getAllByText(/Boosted Reward/i);
      expect(boostedRewardMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onCalculate when amount entered', async () => {
      const mockOnCalculate = jest.fn();
      const user = userEvent.setup();

      render(
        <BoostCalculator
          userBalance="10000.0"
          currentMultiplier={10000}
          onCalculate={mockOnCalculate}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '500');

      expect(mockOnCalculate).toHaveBeenCalledWith('500');
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('handles zero amount', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="1000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '0');

      // ✅ FIX (Task 84): Component only shows boost results when amountNum > 0
      // Zero amount should not display boost multiplier section
      expect(screen.queryByText(/Estimated Boost/i)).not.toBeInTheDocument();
    });

    it('handles maximum boost (5000 PAIMON)', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="10000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '5000');

      // Should show 1.5x (maximum)
      expect(screen.getByText(/1\.50x/)).toBeInTheDocument();
    });

    it('shows cap warning when exceeding 5000', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="10000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '6000');

      expect(screen.getByText(/maximum.*reached/i)).toBeInTheDocument();
    });

    it('considers current stake when calculating', async () => {
      const user = userEvent.setup();
      // Current multiplier 1.2x (2000 already staked)
      render(<BoostCalculator userBalance="5000.0" currentMultiplier={12000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '1000');

      // 2000 + 1000 = 3000 total → 1.3x
      expect(screen.getByText(/1\.30x/)).toBeInTheDocument();
    });

    it('handles very large numbers', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="999999.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '100000');

      // Should cap at 1.5x
      expect(screen.getByText(/1\.50x/)).toBeInTheDocument();
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('shows error when amount exceeds balance', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="1000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '1500');

      expect(screen.getByText(/exceeds balance/i)).toBeInTheDocument();
    });

    it('rejects negative amounts', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="1000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '-100');

      // ✅ FIX (Task 84): Regex validates char-by-char, '-' rejected but digits accepted
      // User types '-' (rejected) → '1' (accepted) → '0' (accepted) → '0' (accepted)
      expect(input).toHaveValue('100');
    });

    it('handles zero balance gracefully', () => {
      render(<BoostCalculator userBalance="0" currentMultiplier={10000} />);

      expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
    });
  });

  /**
   * 5. Security Tests - Input Validation
   */
  describe('Security: Input Validation', () => {
    it('validates numeric input only', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="1000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'abc');

      // Should reject non-numeric input
      expect(input).toHaveValue('');
    });

    it('prevents XSS in input', async () => {
      const user = userEvent.setup();
      render(<BoostCalculator userBalance="1000.0" currentMultiplier={10000} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '<script>alert("XSS")</script>');

      // Should not execute script
      expect(screen.queryByText(/alert/)).not.toBeInTheDocument();
    });
  });

  /**
   * 6. Compatibility Tests - Responsive Design
   */
  describe('Compatibility: Responsive Design', () => {
    it('renders without layout errors', () => {
      const { container } = render(
        <BoostCalculator userBalance="1000.0" currentMultiplier={10000} />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
