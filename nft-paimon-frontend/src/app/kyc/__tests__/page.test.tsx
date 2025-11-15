/**
 * Unit tests for KYC page
 *
 * Test coverage:
 * 1. Functional: KYC status display, tier information, authentication button
 * 2. Boundary: Different tier levels (0/1/2), different KYC statuses
 * 3. Exception: Loading state, error handling, unauthorized access
 * 4. Security: Only show user's own KYC status
 */

import { render, screen, waitFor } from '@testing-library/react';
import KYCPage from '../page';
import { useAccount } from 'wagmi';
import * as useKYCStatusModule from '@/hooks/useKYCStatus';

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

// Mock useKYCStatus hook
jest.mock('@/hooks/useKYCStatus');

// Mock BlockpassWidget
jest.mock('@/components/blockpass/BlockpassWidget', () => {
  return function MockBlockpassWidget() {
    return <div data-testid="blockpass-widget">Blockpass Widget</div>;
  };
});

describe('KYC Page', () => {
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Functional Tests', () => {
    it('should render KYC status card for Tier 0 user', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: {
          tier: 0,
          status: 'pending',
          blockpassId: null,
          approvedAt: null,
        },
        isLoading: false,
        error: null,
      });

      render(<KYCPage />);

      await waitFor(() => {
        expect(screen.getByText(/tier 0/i)).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });
    });

    it('should render KYC status card for Tier 1 user', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: {
          tier: 1,
          status: 'approved',
          blockpassId: 'bp_test_123',
          approvedAt: '2025-01-15T12:00:00Z',
        },
        isLoading: false,
        error: null,
      });

      render(<KYCPage />);

      await waitFor(() => {
        expect(screen.getByText(/tier 1/i)).toBeInTheDocument();
        expect(screen.getByText(/approved/i)).toBeInTheDocument();
      });
    });

    it('should render KYC status card for Tier 2 user', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: {
          tier: 2,
          status: 'approved',
          blockpassId: 'bp_test_456',
          approvedAt: '2025-01-15T12:00:00Z',
        },
        isLoading: false,
        error: null,
      });

      render(<KYCPage />);

      await waitFor(() => {
        expect(screen.getByText(/tier 2/i)).toBeInTheDocument();
        expect(screen.getByText(/approved/i)).toBeInTheDocument();
      });
    });

    it('should render Blockpass authentication button for Tier 0 users', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: {
          tier: 0,
          status: 'pending',
          blockpassId: null,
          approvedAt: null,
        },
        isLoading: false,
        error: null,
      });

      render(<KYCPage />);

      await waitFor(() => {
        expect(screen.getByTestId('blockpass-widget')).toBeInTheDocument();
      });
    });

    it('should render Tier benefits table', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: {
          tier: 0,
          status: 'pending',
          blockpassId: null,
          approvedAt: null,
        },
        isLoading: false,
        error: null,
      });

      render(<KYCPage />);

      await waitFor(() => {
        // Check for tier benefit headers
        expect(screen.getByText(/tier benefits/i)).toBeInTheDocument();
        // Check for specific benefits
        expect(screen.getByText(/basic trading/i)).toBeInTheDocument();
        expect(screen.getByText(/launchpad/i)).toBeInTheDocument();
      });
    });
  });

  describe('Boundary Tests', () => {
    it('should handle loading state', () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<KYCPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle different KYC statuses (rejected)', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: {
          tier: 0,
          status: 'rejected',
          blockpassId: 'bp_test_789',
          approvedAt: null,
        },
        isLoading: false,
        error: null,
      });

      render(<KYCPage />);

      await waitFor(() => {
        expect(screen.getByText(/rejected/i)).toBeInTheDocument();
      });
    });

    it('should handle different KYC statuses (expired)', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: {
          tier: 0,
          status: 'expired',
          blockpassId: 'bp_test_999',
          approvedAt: '2024-01-15T12:00:00Z',
        },
        isLoading: false,
        error: null,
      });

      render(<KYCPage />);

      await waitFor(() => {
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });
  });

  describe('Exception Tests', () => {
    it('should show connect wallet message when not connected', () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      render(<KYCPage />);

      expect(screen.getByText(/connect.*wallet/i)).toBeInTheDocument();
    });

    it('should handle API error gracefully', async () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch KYC status'),
      });

      render(<KYCPage />);

      await waitFor(() => {
        expect(screen.getByText(/error.*KYC status/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security Tests', () => {
    it('should only fetch KYC status for connected wallet address', () => {
      const useKYCStatusSpy = jest.spyOn(useKYCStatusModule, 'useKYCStatus');

      (useAccount as jest.Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });

      (useKYCStatusModule.useKYCStatus as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<KYCPage />);

      expect(useKYCStatusSpy).toHaveBeenCalledWith(mockAddress);
    });
  });
});
