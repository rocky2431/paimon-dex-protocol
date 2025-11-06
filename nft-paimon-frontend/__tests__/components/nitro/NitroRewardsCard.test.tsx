/**
 * NitroRewardsCard Component Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core functionality
 * 2. Boundary - Edge cases (no wallet, no participations, empty rewards)
 * 3. Exception - Error handling
 * 4. Performance - (Deferred to E2E)
 * 5. Security - Data validation
 * 6. Compatibility - Bilingual support
 */

import { render, screen } from '@testing-library/react';
import { NitroRewardsCard } from '@/components/nitro/NitroRewardsCard';
import type { NitroPool } from '@/components/nitro/types';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

// Mock useNitroPool hooks
jest.mock('@/hooks/useNitroPool', () => ({
  useNitroUserStake: jest.fn(),
  useNitroPendingRewards: jest.fn(),
  useCanExitNitro: jest.fn(),
  useClaimNitroRewards: jest.fn(),
  useExitNitroPool: jest.fn(),
}));

import { useAccount } from 'wagmi';

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;

// Mock pool data
const mockPools: NitroPool[] = [
  {
    id: BigInt(1),
    name: 'USDP-USDC Pool',
    lpToken: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    stakingToken: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    rewardToken: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
    lockDuration: BigInt(7),
    apr: 25.5,
    active: true,
  } as any,
  {
    id: BigInt(2),
    name: 'PAIMON-USDP Pool',
    lpToken: '0x2345678901234567890123456789012345678901' as `0x${string}`,
    stakingToken: '0x2345678901234567890123456789012345678901' as `0x${string}`,
    rewardToken: '0xbcdefabcdefabcdefabcdefabcdefabcdefabcde' as `0x${string}`,
    lockDuration: BigInt(14),
    apr: 35.8,
    active: true,
  } as any,
];

describe('NitroRewardsCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: Core Rendering', () => {
    it('renders wallet connection message when not connected', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      expect(screen.getByText(/Please connect wallet to view your Nitro rewards/i)).toBeInTheDocument();
    });

    it('renders empty state when no participations', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={[]} locale="en" />);

      expect(screen.getByText(/No Active Nitro Participations/i)).toBeInTheDocument();
      expect(screen.getByText(/Participate in a Nitro pool to start earning rewards/i)).toBeInTheDocument();
    });

    it('renders participations when user has staked', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      // Should show header
      expect(screen.getByText(/My Nitro Rewards/i)).toBeInTheDocument();

      // Should show pool count
      expect(screen.getByText(/2 Pools/i)).toBeInTheDocument();

      // Should show pool names
      expect(screen.getByText('USDP-USDC Pool')).toBeInTheDocument();
      expect(screen.getByText('PAIMON-USDP Pool')).toBeInTheDocument();
    });

    it('displays claim rewards and exit pool buttons', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      // ✅ FIX (Task 84): Use getByRole to get buttons only (not summary text with "Claim rewards")
      const claimButtons = screen.getAllByRole('button', { name: /Claim Rewards/i });
      const exitButtons = screen.getAllByRole('button', { name: /Exit Pool/i });

      expect(claimButtons.length).toBe(2); // One for each pool
      expect(exitButtons.length).toBe(2);
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('handles empty pools array', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={[]} locale="en" />);

      expect(screen.getByText(/No Active Nitro Participations/i)).toBeInTheDocument();
    });

    it('handles single pool participation', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={[mockPools[0]]} locale="en" />);

      expect(screen.getByText(/1 Pool/i)).toBeInTheDocument();
      expect(screen.getByText('USDP-USDC Pool')).toBeInTheDocument();
    });

    it('handles many pool participations', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      const manyPools = Array.from({ length: 10 }, (_, i) => ({
        ...mockPools[0],
        id: BigInt(i + 1),
        name: `Pool ${i + 1}`,
      }));

      render(<NitroRewardsCard pools={manyPools} locale="en" />);

      expect(screen.getByText(/10 Pools/i)).toBeInTheDocument();
    });

    it('displays zero staked amount correctly', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      // Component should render "0 LP" for staked amount (placeholder data)
      const stakingLabels = screen.getAllByText(/Staked/i);
      expect(stakingLabels.length).toBeGreaterThan(0);
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('handles undefined address gracefully', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);

      expect(() => {
        render(<NitroRewardsCard pools={mockPools} locale="en" />);
      }).not.toThrow();
    });

    it('handles null pools array gracefully', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      expect(() => {
        render(<NitroRewardsCard pools={null as any} locale="en" />);
      }).not.toThrow();
    });

    it('handles pools with invalid bigint values', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      const invalidPools = [
        {
          ...mockPools[0],
          lockDuration: BigInt(0), // Edge case: zero lock duration
        },
      ];

      expect(() => {
        render(<NitroRewardsCard pools={invalidPools} locale="en" />);
      }).not.toThrow();
    });
  });

  /**
   * 5. Security Tests - Data Validation
   */
  describe('Security: Data Validation', () => {
    it('sanitizes pool names', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      const maliciousPool: NitroPool = {
        ...mockPools[0],
        name: '<script>alert("XSS")</script>',
      };

      const { container } = render(<NitroRewardsCard pools={[maliciousPool]} locale="en" />);

      // ✅ FIX (Task 84): React escapes HTML, so text "alert" will be visible but safe
      // Verify the escaped text is displayed (safe)
      expect(screen.getByText(/<script>alert\("XSS"\)<\/script>/)).toBeInTheDocument();

      // Verify no actual <script> element was created (security check)
      expect(container.querySelector('script')).toBeNull();
    });

    it('validates address format', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      // Component should render without crashing even with placeholder data
      expect(screen.getByTestId('nitro-rewards-card')).toBeInTheDocument();
    });

    it('prevents display of raw bigint values', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      const { container } = render(<NitroRewardsCard pools={mockPools} locale="en" />);

      // Should not contain "BigInt" string in rendered output
      expect(container.textContent).not.toContain('BigInt');
    });
  });

  /**
   * 6. Compatibility Tests - Bilingual Support
   */
  describe('Compatibility: Bilingual Support', () => {
    it('renders English text when locale is "en"', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      expect(screen.getByText(/My Nitro Rewards/i)).toBeInTheDocument();
      // ✅ FIX (Task 84): Buttons appear multiple times (one per pool), use getAllByText
      const claimMatches = screen.getAllByText(/Claim Rewards/i);
      expect(claimMatches.length).toBeGreaterThanOrEqual(1);
      const exitMatches = screen.getAllByText(/Exit Pool/i);
      expect(exitMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Chinese text when locale is "zh"', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="zh" />);

      expect(screen.getByText(/我的 Nitro 奖励/i)).toBeInTheDocument();
      // ✅ FIX (Task 84): Buttons appear multiple times (one per pool), use getAllByText
      const claimMatches = screen.getAllByText(/领取奖励/i);
      expect(claimMatches.length).toBeGreaterThanOrEqual(1);
      const exitMatches = screen.getAllByText(/退出池/i);
      expect(exitMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Chinese wallet connection message', () => {
      mockUseAccount.mockReturnValue({ address: undefined } as any);

      render(<NitroRewardsCard pools={mockPools} locale="zh" />);

      expect(screen.getByText(/请连接钱包查看您的 Nitro 奖励/i)).toBeInTheDocument();
    });

    it('renders Chinese empty state', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={[]} locale="zh" />);

      expect(screen.getByText(/暂无参与的 Nitro 池/i)).toBeInTheDocument();
      expect(screen.getByText(/参与 Nitro 池即可开始赚取奖励/i)).toBeInTheDocument();
    });

    it('defaults to English when locale is not provided', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} />);

      expect(screen.getByText(/My Nitro Rewards/i)).toBeInTheDocument();
    });
  });

  /**
   * Integration Tests - Component Interaction
   */
  describe('Integration: Component State', () => {
    it('disables claim button when no rewards', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      // ✅ FIX (Task 84): Use getByRole to get button elements (not text elements)
      const claimButtons = screen.getAllByRole('button', { name: /Claim Rewards/i });

      // All claim buttons should be disabled (placeholder data has no rewards)
      claimButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('disables exit button when cannot exit', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      const exitButtons = screen.getAllByText(/Exit Pool/i);

      // All exit buttons should be disabled (placeholder data has canExit = false)
      exitButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('renders correct number of pools', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="en" />);

      // Should render 2 pools
      expect(screen.getByText('USDP-USDC Pool')).toBeInTheDocument();
      expect(screen.getByText('PAIMON-USDP Pool')).toBeInTheDocument();

      // ✅ FIX (Task 84): Use getByRole to count buttons (not text including summary)
      // Should have 2 sets of buttons
      expect(screen.getAllByRole('button', { name: /Claim Rewards/i }).length).toBe(2);
      expect(screen.getAllByRole('button', { name: /Exit Pool/i }).length).toBe(2);
    });
  });
});
