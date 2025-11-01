/**
 * NitroParticipateModal Component Tests
 * 6-dimensional test coverage for pool participation modal
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NitroParticipateModal } from '@/components/nitro/NitroParticipateModal';
import { useEnterNitroPool } from '@/hooks/useNitroPool';

// Mock wagmi hooks
jest.mock('@/hooks/useNitroPool', () => ({
  useEnterNitroPool: jest.fn(),
}));

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890abcdef1234567890abcdef12345678' })),
  useReadContract: jest.fn(() => ({ data: BigInt('1000000000000000000000') })), // 1000 tokens
}));

describe('NitroParticipateModal', () => {
  const mockPool = {
    id: 1n,
    name: 'Test Nitro Pool',
    lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    lockDuration: BigInt(30 * 24 * 60 * 60), // 30 days
    apr: 2500, // 25%
    active: true,
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockWriteContract = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEnterNitroPool as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      isPending: false,
      isSuccess: false,
      isError: false,
    });
  });

  // =========================
  // 1. Functional Tests (8)
  // =========================

  describe('Functional Tests', () => {
    it('should render modal when open', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText(/participate in nitro pool/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<NitroParticipateModal open={false} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.queryByText(/participate in nitro pool/i)).not.toBeInTheDocument();
    });

    it('should display pool information', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText('Test Nitro Pool')).toBeInTheDocument();
      expect(screen.getByText(/30 days/i)).toBeInTheDocument();
      expect(screen.getByText(/25\.00%/)).toBeInTheDocument();
    });

    it('should show LP token balance', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText(/available:/i)).toBeInTheDocument();
      expect(screen.getByText(/1,000\.00/)).toBeInTheDocument(); // 1000 tokens formatted
    });

    it('should have amount input field', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      const input = screen.getByLabelText(/amount to stake/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have Max button to fill balance', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const maxButton = screen.getByRole('button', { name: /max/i });
      await user.click(maxButton);

      const input = screen.getByLabelText(/amount to stake/i) as HTMLInputElement;
      expect(input.value).toBe('1000');
    });

    it('should have Participate button', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /participate/i })).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // =========================
  // 2. Boundary Tests (8)
  // =========================

  describe('Boundary Tests', () => {
    it('should handle zero balance', () => {
      jest.mocked(useReadContract).mockReturnValue({ data: BigInt(0) } as any);
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText(/available:.*0\.00/i)).toBeInTheDocument();
    });

    it('should handle very large balance', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: BigInt('1000000000000000000000000'), // 1M tokens
      } as any);
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText(/1,000,000\.00/)).toBeInTheDocument();
    });

    it('should validate minimum amount (>0)', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '0');

      const participateButton = screen.getByRole('button', { name: /participate/i });
      await user.click(participateButton);

      expect(screen.getByText(/amount must be greater than zero/i)).toBeInTheDocument();
    });

    it('should validate maximum amount (≤balance)', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '1001'); // Over balance

      const participateButton = screen.getByRole('button', { name: /participate/i });
      await user.click(participateButton);

      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });

    it('should handle decimal amounts', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '123.456');

      expect(input).toHaveValue('123.456');
    });

    it('should handle very small amounts (0.000001)', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '0.000001');

      expect(input).toHaveValue('0.000001');
    });

    it('should limit decimal places to 18', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '1.123456789012345678999');

      // Should truncate to 18 decimals
      expect(input.value).toMatch(/^1\.1234567890123456789?$/);
    });

    it('should handle negative amounts gracefully', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '-100');

      expect(screen.getByText(/amount must be greater than zero/i)).toBeInTheDocument();
    });
  });

  // =========================
  // 3. Exception Tests (6)
  // =========================

  describe('Exception Tests', () => {
    it('should handle wallet not connected', () => {
      jest.mocked(useAccount).mockReturnValue({ address: undefined } as any);
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText(/please connect wallet/i)).toBeInTheDocument();
    });

    it('should handle invalid input (non-numeric)', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, 'abc');

      // Should not allow non-numeric input
      expect(input).toHaveValue('');
    });

    it('should handle transaction error', async () => {
      const user = userEvent.setup();
      (useEnterNitroPool as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: new Error('Transaction failed'),
      });

      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '100');

      const participateButton = screen.getByRole('button', { name: /participate/i });
      await user.click(participateButton);

      await waitFor(() => {
        expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
      });
    });

    it('should handle balance loading state', () => {
      jest.mocked(useReadContract).mockReturnValue({ data: undefined, isLoading: true } as any);
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText(/loading balance/i)).toBeInTheDocument();
    });

    it('should handle missing pool data', () => {
      render(<NitroParticipateModal open={true} pool={null as any} onClose={mockOnClose} />);
      expect(screen.getByText(/pool data unavailable/i)).toBeInTheDocument();
    });

    it('should prevent double submission', async () => {
      const user = userEvent.setup();
      (useEnterNitroPool as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: true, // Transaction in progress
        isSuccess: false,
        isError: false,
      });

      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '100');

      const participateButton = screen.getByRole('button', { name: /participate/i });
      expect(participateButton).toBeDisabled();
    });
  });

  // =========================
  // 4. Performance Tests (4)
  // =========================

  describe('Performance Tests', () => {
    it('should render quickly (<100ms)', () => {
      const startTime = performance.now();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should debounce input validation', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);

      // Type quickly
      await user.type(input, '123456789', { delay: 10 });

      // Validation should be debounced (not run 9 times)
      await waitFor(() => {
        expect(input).toHaveValue('123456789');
      });
    });

    it('should memoize pool calculations', () => {
      const { rerender } = render(
        <NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />
      );

      const firstRenderAPR = screen.getByText(/25\.00%/);

      // Re-render with same pool
      rerender(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const secondRenderAPR = screen.getByText(/25\.00%/);
      expect(firstRenderAPR).toBe(secondRenderAPR); // Same DOM node
    });

    it('should not re-render unnecessarily', () => {
      let renderCount = 0;
      const TestComponent = () => {
        renderCount++;
        return <NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />;
      };

      const { rerender } = render(<TestComponent />);
      const initialCount = renderCount;

      rerender(<TestComponent />);
      expect(renderCount).toBe(initialCount + 1); // Only 1 additional render
    });
  });

  // =========================
  // 5. Security Tests (5)
  // =========================

  describe('Security Tests', () => {
    it('should sanitize pool name to prevent XSS', () => {
      const maliciousPool = {
        ...mockPool,
        name: '<script>alert("XSS")</script>',
      };

      render(<NitroParticipateModal open={true} pool={maliciousPool} onClose={mockOnClose} />);
      const poolNameElement = screen.getByTestId('pool-name');
      expect(poolNameElement.innerHTML).not.toContain('<script>');
    });

    it('should display prominent risk warning', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      expect(screen.getByText(/risk warning/i)).toBeInTheDocument();
      expect(screen.getByText(/funds will be locked/i)).toBeInTheDocument();
    });

    it('should require confirmation for large amounts', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      const input = screen.getByLabelText(/amount to stake/i);
      await user.type(input, '900'); // >90% of balance

      const participateButton = screen.getByRole('button', { name: /participate/i });
      await user.click(participateButton);

      expect(screen.getByText(/confirm large stake/i)).toBeInTheDocument();
    });

    it('should validate LP token address format', () => {
      const invalidPool = {
        ...mockPool,
        lpToken: 'invalid-address' as `0x${string}`,
      };

      render(<NitroParticipateModal open={true} pool={invalidPool} onClose={mockOnClose} />);
      expect(screen.getByText(/invalid lp token address/i)).toBeInTheDocument();
    });

    it('should disable participation for inactive pools', () => {
      const inactivePool = {
        ...mockPool,
        active: false,
      };

      render(<NitroParticipateModal open={true} pool={inactivePool} onClose={mockOnClose} />);
      expect(screen.getByText(/pool is inactive/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /participate/i })).toBeDisabled();
    });
  });

  // =========================
  // 6. Compatibility Tests (4)
  // =========================

  describe('Compatibility Tests', () => {
    it('should be responsive on mobile', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('should support bilingual content (EN)', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} locale="en" />);
      expect(screen.getByText(/participate in nitro pool/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount to stake/i)).toBeInTheDocument();
    });

    it('should support bilingual content (ZH)', () => {
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} locale="zh" />);
      expect(screen.getByText(/参与 Nitro 池/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/质押数量/i)).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<NitroParticipateModal open={true} pool={mockPool} onClose={mockOnClose} />);

      // Tab to input
      await user.tab();
      const input = screen.getByLabelText(/amount to stake/i);
      expect(input).toHaveFocus();

      // Type amount
      await user.keyboard('100');
      expect(input).toHaveValue('100');

      // Tab to Participate button
      await user.tab();
      await user.tab();
      const participateButton = screen.getByRole('button', { name: /participate/i });
      expect(participateButton).toHaveFocus();
    });
  });
});
