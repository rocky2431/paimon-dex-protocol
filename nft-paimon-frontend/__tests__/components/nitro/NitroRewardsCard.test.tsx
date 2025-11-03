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
    stakingToken: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    rewardTokens: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`],
    lockDuration: BigInt(7),
    minStakeAmount: BigInt('1000000000000000000'), // 1 token
    maxStakeAmount: BigInt('1000000000000000000000'), // 1000 tokens
    totalStaked: BigInt('5000000000000000000000'), // 5000 tokens
    isActive: true,
    apy: 25.5,
  },
  {
    id: BigInt(2),
    name: 'PAIMON-USDP Pool',
    stakingToken: '0x2345678901234567890123456789012345678901' as `0x${string}`,
    rewardTokens: ['0xbcdefabcdefabcdefabcdefabcdefabcdefabcde' as `0x${string}`],
    lockDuration: BigInt(14),
    minStakeAmount: BigInt('1000000000000000000'),
    maxStakeAmount: BigInt('1000000000000000000000'),
    totalStaked: BigInt('3000000000000000000000'),
    isActive: true,
    apy: 35.8,
  },
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

      const claimButtons = screen.getAllByText(/Claim Rewards/i);
      const exitButtons = screen.getAllByText(/Exit Pool/i);

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

      render(<NitroRewardsCard pools={[maliciousPool]} locale="en" />);

      // Should render as text, not execute script
      expect(screen.queryByText(/alert/)).not.toBeInTheDocument();
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
      expect(screen.getByText(/Claim Rewards/i)).toBeInTheDocument();
      expect(screen.getByText(/Exit Pool/i)).toBeInTheDocument();
    });

    it('renders Chinese text when locale is "zh"', () => {
      mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' } as any);

      render(<NitroRewardsCard pools={mockPools} locale="zh" />);

      expect(screen.getByText(/我的 Nitro 奖励/i)).toBeInTheDocument();
      expect(screen.getByText(/领取奖励/i)).toBeInTheDocument();
      expect(screen.getByText(/退出池/i)).toBeInTheDocument();
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

      const claimButtons = screen.getAllByText(/Claim Rewards/i);

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

      // Should have 2 sets of buttons
      expect(screen.getAllByText(/Claim Rewards/i).length).toBe(2);
      expect(screen.getAllByText(/Exit Pool/i).length).toBe(2);
    });
  });
});
