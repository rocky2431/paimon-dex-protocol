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

      // Should show base vs boosted rewards
      expect(screen.getByText(/Base Reward/i)).toBeInTheDocument();
      expect(screen.getByText(/Boosted Reward/i)).toBeInTheDocument();
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

      // Should show 1.0x (minimum)
      expect(screen.getByText(/1\.00x/)).toBeInTheDocument();
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

      // Should not accept negative input
      expect(input).toHaveValue('');
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
