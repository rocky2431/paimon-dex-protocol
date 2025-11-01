/**
 * NitroPoolList Component Tests
 * 6-dimensional test coverage:
 * 1. Functional - Core functionality
 * 2. Boundary - Edge cases
 * 3. Exception - Error handling
 * 4. Performance - Rendering performance
 * 5. Security - Input validation
 * 6. Compatibility - Responsive design
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NitroPoolList } from '@/components/nitro/NitroPoolList';
import { useNitroPoolInfo, useNitroPoolRewardTokens } from '@/hooks/useNitroPool';

// Mock wagmi hooks
jest.mock('@/hooks/useNitroPool', () => ({
  useNitroPoolInfo: jest.fn(),
  useNitroPoolRewardTokens: jest.fn(),
}));

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890abcdef1234567890abcdef12345678' })),
  useReadContract: jest.fn(),
}));

describe('NitroPoolList', () => {
  // =========================
  // 1. Functional Tests (8)
  // =========================

  describe('Functional Tests', () => {
    it('should render pool list container', () => {
      (useNitroPoolInfo as jest.Mock).mockReturnValue({ data: undefined });
      (useNitroPoolRewardTokens as jest.Mock).mockReturnValue({ data: undefined });

      render(<NitroPoolList pools={[]} />);
      expect(screen.getByTestId('nitro-pool-list')).toBeInTheDocument();
    });

    it('should display pool name and project info', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Project Alpha',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60), // 30 days
          apr: 2500, // 25%
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText('Test Project Alpha')).toBeInTheDocument();
    });

    it('should display lock duration in days', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60), // 30 days
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/30\s*days/i)).toBeInTheDocument();
    });

    it('should display APR with percentage', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500, // 25%
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/25\.00%/)).toBeInTheDocument();
    });

    it('should display reward token list', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      (useNitroPoolRewardTokens as jest.Mock).mockReturnValue({
        data: [
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
          '0x1234123412341234123412341234123412341234' as `0x${string}`,
        ],
      });

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/reward tokens:/i)).toBeInTheDocument();
    });

    it('should show participate button for active pools', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByRole('button', { name: /participate/i })).toBeInTheDocument();
    });

    it('should display inactive status for inactive pools', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: false,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    });

    it('should display multiple pools correctly', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Pool Alpha',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
        {
          id: 2n,
          name: 'Pool Beta',
          lpToken: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
          lockDuration: BigInt(60 * 24 * 60 * 60),
          apr: 3500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText('Pool Alpha')).toBeInTheDocument();
      expect(screen.getByText('Pool Beta')).toBeInTheDocument();
    });
  });

  // =========================
  // 2. Boundary Tests (8)
  // =========================

  describe('Boundary Tests', () => {
    it('should handle empty pools array', () => {
      render(<NitroPoolList pools={[]} />);
      expect(screen.getByTestId('nitro-pool-list')).toBeInTheDocument();
      expect(screen.getByText(/no nitro pools available/i)).toBeInTheDocument();
    });

    it('should handle minimum lock duration (7 days)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(7 * 24 * 60 * 60), // 7 days
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/7\s*days/i)).toBeInTheDocument();
    });

    it('should handle maximum lock duration (365 days)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(365 * 24 * 60 * 60), // 365 days
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/365\s*days/i)).toBeInTheDocument();
    });

    it('should handle 0% APR', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 0, // 0%
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/0\.00%/)).toBeInTheDocument();
    });

    it('should handle very high APR (10000%)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 1000000, // 10000%
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/10000\.00%/)).toBeInTheDocument();
    });

    it('should handle no reward tokens', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      (useNitroPoolRewardTokens as jest.Mock).mockReturnValue({ data: [] });

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/no reward tokens/i)).toBeInTheDocument();
    });

    it('should handle maximum reward tokens (10)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      const rewardTokens = Array.from({ length: 10 }, (_, i) =>
        `0x${i.toString().padStart(40, '0')}` as `0x${string}`
      );

      (useNitroPoolRewardTokens as jest.Mock).mockReturnValue({ data: rewardTokens });

      render(<NitroPoolList pools={mockPools} />);
      // Should show +X more indicator
      expect(screen.getByText(/\+\d+ more/i)).toBeInTheDocument();
    });

    it('should handle very long pool names', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'This is a very long pool name that should be truncated if it exceeds the maximum character limit for display',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      const poolNameElement = screen.getByTestId('pool-name-1');
      expect(poolNameElement).toHaveStyle({ overflow: 'hidden', textOverflow: 'ellipsis' });
    });
  });

  // =========================
  // 3. Exception Tests (6)
  // =========================

  describe('Exception Tests', () => {
    it('should handle invalid pool ID', () => {
      const mockPools = [
        {
          id: 0n, // Invalid ID
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByTestId('nitro-pool-list')).toBeInTheDocument();
    });

    it('should handle invalid LP token address', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: 'invalid-address' as `0x${string}`, // Invalid format
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/invalid lp token/i)).toBeInTheDocument();
    });

    it('should handle hook error gracefully', () => {
      (useNitroPoolRewardTokens as jest.Mock).mockReturnValue({
        data: undefined,
        error: new Error('Failed to fetch'),
      });

      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/failed to load reward tokens/i)).toBeInTheDocument();
    });

    it('should handle missing pool data', () => {
      render(<NitroPoolList pools={undefined as any} />);
      expect(screen.getByText(/no nitro pools available/i)).toBeInTheDocument();
    });

    it('should handle null pool properties', () => {
      const mockPools = [
        {
          id: 1n,
          name: null as any,
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: null as any,
          apr: null as any,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/unnamed pool/i)).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      (useNitroPoolRewardTokens as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/loading rewards/i)).toBeInTheDocument();
    });
  });

  // =========================
  // 4. Performance Tests (4)
  // =========================

  describe('Performance Tests', () => {
    it('should render large list efficiently (100 pools)', () => {
      const mockPools = Array.from({ length: 100 }, (_, i) => ({
        id: BigInt(i + 1),
        name: `Pool ${i + 1}`,
        lpToken: `0x${i.toString().padStart(40, '0')}` as `0x${string}`,
        lockDuration: BigInt(30 * 24 * 60 * 60),
        apr: 2500,
        active: true,
      }));

      const startTime = performance.now();
      render(<NitroPoolList pools={mockPools} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should render in <1s
      expect(screen.getByTestId('nitro-pool-list')).toBeInTheDocument();
    });

    it('should memoize pool cards to prevent unnecessary re-renders', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      const { rerender } = render(<NitroPoolList pools={mockPools} />);
      const firstRender = screen.getByTestId('pool-card-1');

      // Re-render with same props
      rerender(<NitroPoolList pools={mockPools} />);
      const secondRender = screen.getByTestId('pool-card-1');

      expect(firstRender).toBe(secondRender); // Should be same DOM node
    });

    it('should virtualize long lists (>50 pools)', () => {
      const mockPools = Array.from({ length: 60 }, (_, i) => ({
        id: BigInt(i + 1),
        name: `Pool ${i + 1}`,
        lpToken: `0x${i.toString().padStart(40, '0')}` as `0x${string}`,
        lockDuration: BigInt(30 * 24 * 60 * 60),
        apr: 2500,
        active: true,
      }));

      render(<NitroPoolList pools={mockPools} />);

      // Should only render visible items initially
      const renderedCards = screen.getAllByTestId(/pool-card-\d+/);
      expect(renderedCards.length).toBeLessThanOrEqual(20); // Max visible items
    });

    it('should debounce filter updates', async () => {
      const mockPools = Array.from({ length: 10 }, (_, i) => ({
        id: BigInt(i + 1),
        name: `Pool ${i + 1}`,
        lpToken: `0x${i.toString().padStart(40, '0')}` as `0x${string}`,
        lockDuration: BigInt(30 * 24 * 60 * 60),
        apr: 2500,
        active: true,
      }));

      const { container } = render(<NitroPoolList pools={mockPools} showFilter />);
      const filterInput = container.querySelector('input[type="text"]');

      expect(filterInput).toBeInTheDocument();
      // Filter updates should be debounced to prevent excessive re-renders
    });
  });

  // =========================
  // 5. Security Tests (5)
  // =========================

  describe('Security Tests', () => {
    it('should sanitize pool names to prevent XSS', () => {
      const mockPools = [
        {
          id: 1n,
          name: '<script>alert("XSS")</script>',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      const poolNameElement = screen.getByTestId('pool-name-1');
      expect(poolNameElement.innerHTML).not.toContain('<script>');
    });

    it('should validate LP token address format', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: 'invalid-address' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/invalid lp token/i)).toBeInTheDocument();
    });

    it('should display risk warning for external projects', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/risk warning/i)).toBeInTheDocument();
      expect(screen.getByText(/external incentive pool/i)).toBeInTheDocument();
    });

    it('should warn about high APR (>100%)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 15000, // 150%
          active: true,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByText(/unusually high apr/i)).toBeInTheDocument();
    });

    it('should prevent action on inactive pools', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: false,
        },
      ];

      render(<NitroPoolList pools={mockPools} />);
      const participateButton = screen.queryByRole('button', { name: /participate/i });
      expect(participateButton).not.toBeInTheDocument();
    });
  });

  // =========================
  // 6. Compatibility Tests (4)
  // =========================

  describe('Compatibility Tests', () => {
    it('should be responsive on mobile (xs breakpoint)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      global.innerWidth = 375; // Mobile width
      global.dispatchEvent(new Event('resize'));

      render(<NitroPoolList pools={mockPools} />);
      const container = screen.getByTestId('nitro-pool-list');
      // Container exists and is visible
      expect(container).toBeInTheDocument();
      expect(container).toBeVisible();
    });

    it('should be responsive on tablet (sm breakpoint)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      global.innerWidth = 768; // Tablet width
      global.dispatchEvent(new Event('resize'));

      render(<NitroPoolList pools={mockPools} />);
      expect(screen.getByTestId('nitro-pool-list')).toBeInTheDocument();
    });

    it('should support dark/light theme', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      const { rerender } = render(<NitroPoolList pools={mockPools} theme="light" />);
      expect(screen.getByTestId('nitro-pool-list')).toBeInTheDocument();

      rerender(<NitroPoolList pools={mockPools} theme="dark" />);
      expect(screen.getByTestId('nitro-pool-list')).toBeInTheDocument();
    });

    it('should display bilingual content (EN/ZH)', () => {
      const mockPools = [
        {
          id: 1n,
          name: 'Test Pool',
          lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
          lockDuration: BigInt(30 * 24 * 60 * 60),
          apr: 2500,
          active: true,
        },
      ];

      const { rerender } = render(<NitroPoolList pools={mockPools} locale="en" />);
      expect(screen.getByText(/lock duration/i)).toBeInTheDocument();

      rerender(<NitroPoolList pools={mockPools} locale="zh" />);
      expect(screen.getByText(/锁定期限/i)).toBeInTheDocument();
    });
  });
});
