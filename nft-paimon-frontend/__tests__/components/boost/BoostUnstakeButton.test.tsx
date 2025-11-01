/**
 * BoostUnstakeButton Component Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Button states, unstake action
 * 2. Boundary - Locked vs unlocked state
 * 3. Exception - Transaction failure
 * 4. Performance - (Deferred to E2E)
 * 5. Security - Action confirmation
 * 6. Compatibility - Responsive design
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoostUnstakeButton } from '@/components/boost/BoostUnstakeButton';

const mockOnUnstake = jest.fn();

describe('BoostUnstakeButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: Button States', () => {
    it('shows enabled unstake button when unlocked', () => {
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const button = screen.getByRole('button', { name: /Unstake/i });
      expect(button).not.toBeDisabled();
    });

    it('shows disabled unstake button when locked', () => {
      render(
        <BoostUnstakeButton
          canUnstake={false}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const button = screen.getByRole('button', { name: /Locked/i });
      expect(button).toBeDisabled();
    });

    it('displays staked amount', () => {
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1234.56"
          onUnstake={mockOnUnstake}
        />
      );

      expect(screen.getByText(/1234\.56/)).toBeInTheDocument();
    });

    it('calls onUnstake when button clicked', async () => {
      const user = userEvent.setup();
      mockOnUnstake.mockResolvedValue(undefined);

      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const button = screen.getByRole('button', { name: /Unstake/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnUnstake).toHaveBeenCalled();
      });
    });

    it('shows confirmation dialog before unstaking', async () => {
      const user = userEvent.setup();
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const button = screen.getByRole('button', { name: /Unstake/i });
      await user.click(button);

      // Should show confirmation dialog
      expect(screen.getByText(/Confirm Unstake/i)).toBeInTheDocument();
    });

    it('executes unstake only after confirmation', async () => {
      const user = userEvent.setup();
      mockOnUnstake.mockResolvedValue(undefined);

      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      // Click unstake button
      const unstakeButton = screen.getByRole('button', { name: /Unstake/i });
      await user.click(unstakeButton);

      // Should NOT call onUnstake yet
      expect(mockOnUnstake).not.toHaveBeenCalled();

      // Click confirm button in dialog
      const confirmButton = screen.getByRole('button', { name: /Yes.*Unstake/i });
      await user.click(confirmButton);

      // Now should call onUnstake
      await waitFor(() => {
        expect(mockOnUnstake).toHaveBeenCalled();
      });
    });

    it('cancels unstake when cancel clicked', async () => {
      const user = userEvent.setup();
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      // Click unstake button
      const unstakeButton = screen.getByRole('button', { name: /Unstake/i });
      await user.click(unstakeButton);

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      // Should close dialog without calling onUnstake
      expect(mockOnUnstake).not.toHaveBeenCalled();
      expect(screen.queryByText(/Confirm Unstake/i)).not.toBeInTheDocument();
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('handles zero staked amount', () => {
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="0"
          onUnstake={mockOnUnstake}
        />
      );

      const button = screen.getByRole('button', { name: /Unstake/i });
      expect(button).toBeDisabled();
    });

    it('handles very large staked amount', () => {
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="999999999.99"
          onUnstake={mockOnUnstake}
        />
      );

      expect(screen.getByText(/999999999\.99/)).toBeInTheDocument();
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('handles onUnstake rejection gracefully', async () => {
      const user = userEvent.setup();
      mockOnUnstake.mockRejectedValue(new Error('Transaction failed'));

      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const unstakeButton = screen.getByRole('button', { name: /Unstake/i });
      await user.click(unstakeButton);

      const confirmButton = screen.getByRole('button', { name: /Yes.*Unstake/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Transaction failed/i)).toBeInTheDocument();
      });
    });

    it('shows disabled state when unstaking in progress', () => {
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
          unstaking={true}
        />
      );

      const button = screen.getByRole('button', { name: /Unstaking/i });
      expect(button).toBeDisabled();
    });

    it('prevents double-click during unstaking', async () => {
      const user = userEvent.setup();
      mockOnUnstake.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const unstakeButton = screen.getByRole('button', { name: /Unstake/i });
      await user.click(unstakeButton);

      const confirmButton = screen.getByRole('button', { name: /Yes.*Unstake/i });
      await user.click(confirmButton);
      await user.click(confirmButton); // Double click

      // Should only call once
      expect(mockOnUnstake).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * 5. Security Tests - Confirmation Required
   */
  describe('Security: Confirmation Required', () => {
    it('requires confirmation before unstaking', async () => {
      const user = userEvent.setup();
      mockOnUnstake.mockResolvedValue(undefined);

      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const button = screen.getByRole('button', { name: /Unstake/i });
      await user.click(button);

      // Should show warning message
      expect(screen.getByText(/irreversible/i)).toBeInTheDocument();
      expect(screen.getByText(/lose.*boost/i)).toBeInTheDocument();
    });

    it('shows consequences of unstaking', async () => {
      const user = userEvent.setup();
      render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      const button = screen.getByRole('button', { name: /Unstake/i });
      await user.click(button);

      // Should show what will happen
      expect(screen.getByText(/1000\.0 PAIMON/i)).toBeInTheDocument();
      expect(screen.getByText(/boost.*reset/i)).toBeInTheDocument();
    });
  });

  /**
   * 6. Compatibility Tests - Responsive Design
   */
  describe('Compatibility: Responsive Design', () => {
    it('renders without layout errors', () => {
      const { container } = render(
        <BoostUnstakeButton
          canUnstake={true}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders in locked state without errors', () => {
      const { container } = render(
        <BoostUnstakeButton
          canUnstake={false}
          stakedAmount="1000.0"
          onUnstake={mockOnUnstake}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
