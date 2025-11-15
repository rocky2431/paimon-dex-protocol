/**
 * Unit Tests for OverviewTab Component
 *
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core rendering and data display
 * 2. Boundary - Edge cases (no data, loading, empty states)
 * 3. Exception - Error handling
 * 4. Performance - Render performance
 * 5. Security - XSS prevention
 * 6. Compatibility - Different wallet states
 */

import { render, screen, waitFor } from '@testing-library/react';
import { OverviewTab } from '../index';

// Mock wagmi hook
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
}));

// Mock portfolio hook
jest.mock('@/hooks/useUserPortfolio', () => ({
  useUserPortfolio: jest.fn(() => ({
    isLoading: false,
    lpPositions: [
      {
        pool: 'USDP-USDC',
        liquidity: '2000',
        apr: '15.5',
        pendingRewards: '10.5',
      },
    ],
    vaultPositions: [],
    veNFTPositions: [],
    launchpadInvestments: [],
    savingsPosition: {
      principal: '1000',
      accruedInterest: '50',
      currentAPR: '8.5',
    },
    riskAlerts: [],
  })),
}));

describe('OverviewTab - Functional Tests', () => {
  test('FUNCTIONAL: should render total net worth section', () => {
    render(<OverviewTab />);

    // Should show total net worth header
    expect(screen.getByText(/Total Net Worth/i)).toBeInTheDocument();
  });

  test('FUNCTIONAL: should render asset breakdown cards', () => {
    render(<OverviewTab />);

    // Should show all 6 asset category cards
    expect(screen.getByText(/Liquidity Pools/i)).toBeInTheDocument();
    expect(screen.getByText(/USDP Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/veNFT/i)).toBeInTheDocument();
    expect(screen.getByText(/Launchpad/i)).toBeInTheDocument();
    expect(screen.getByText(/USDP Savings/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Rewards/i)).toBeInTheDocument();
  });

  test('FUNCTIONAL: should render quick actions section', () => {
    render(<OverviewTab />);

    // Should show quick action buttons
    expect(screen.getByRole('link', { name: /Add Liquidity/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Borrow USDP/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lock PAIMON/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse Projects/i })).toBeInTheDocument();
  });

  test('FUNCTIONAL: should display Claim All Rewards button', () => {
    render(<OverviewTab />);

    expect(screen.getByRole('button', { name: /Claim All Rewards/i })).toBeInTheDocument();
  });
});

describe('OverviewTab - Boundary Tests', () => {
  test('BOUNDARY: should show loading state', () => {
    // Mock loading state
    const { useUserPortfolio } = require('@/hooks/useUserPortfolio');
    useUserPortfolio.mockReturnValue({
      isLoading: true,
      lpPositions: [],
      vaultPositions: [],
      veNFTPositions: [],
      launchpadInvestments: [],
      savingsPosition: null,
      riskAlerts: [],
    });

    render(<OverviewTab />);

    // Should show skeleton loaders (Material-UI Skeleton components)
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('BOUNDARY: should show empty state when no assets', () => {
    // Mock empty portfolio
    const { useUserPortfolio } = require('@/hooks/useUserPortfolio');
    useUserPortfolio.mockReturnValue({
      isLoading: false,
      lpPositions: [],
      vaultPositions: [],
      veNFTPositions: [],
      launchpadInvestments: [],
      savingsPosition: null,
      riskAlerts: [],
    });

    render(<OverviewTab />);

    // Should show empty state message
    expect(screen.getByText(/No Assets Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Start your DeFi journey/i)).toBeInTheDocument();
  });

  test('BOUNDARY: should display risk alerts when present', () => {
    // Mock portfolio with risk alerts
    const { useUserPortfolio } = require('@/hooks/useUserPortfolio');
    useUserPortfolio.mockReturnValue({
      isLoading: false,
      lpPositions: [],
      vaultPositions: [],
      veNFTPositions: [],
      launchpadInvestments: [],
      savingsPosition: null,
      riskAlerts: [
        {
          severity: 'high',
          message: 'Your USDP Vault position is at risk of liquidation',
        },
      ],
    });

    render(<OverviewTab />);

    // Should show risk alert section
    expect(screen.getByText(/Risk Alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/at risk of liquidation/i)).toBeInTheDocument();
  });
});

describe('OverviewTab - Exception Tests', () => {
  test('EXCEPTION: should handle missing portfolio data gracefully', () => {
    // Mock hook returning undefined/null
    const { useUserPortfolio } = require('@/hooks/useUserPortfolio');
    useUserPortfolio.mockReturnValue({
      isLoading: false,
      lpPositions: [],
      vaultPositions: [],
      veNFTPositions: [],
      launchpadInvestments: [],
      savingsPosition: null,
      riskAlerts: [],
    });

    expect(() => render(<OverviewTab />)).not.toThrow();
  });

  test('EXCEPTION: should handle invalid portfolio data types', () => {
    // Mock hook with invalid data
    const { useUserPortfolio } = require('@/hooks/useUserPortfolio');
    useUserPortfolio.mockReturnValue({
      isLoading: false,
      lpPositions: null, // Invalid type
      vaultPositions: undefined, // Invalid type
      veNFTPositions: [],
      launchpadInvestments: [],
      savingsPosition: null,
      riskAlerts: [],
    });

    // Should not crash
    expect(() => render(<OverviewTab />)).not.toThrow();
  });
});

describe('OverviewTab - Performance Tests', () => {
  test('PERFORMANCE: should render within 100ms', () => {
    const startTime = performance.now();

    render(<OverviewTab />);

    const renderTime = performance.now() - startTime;

    expect(renderTime).toBeLessThan(100);
  });

  test('PERFORMANCE: should handle large portfolio data efficiently', () => {
    // Mock large dataset
    const { useUserPortfolio } = require('@/hooks/useUserPortfolio');
    useUserPortfolio.mockReturnValue({
      isLoading: false,
      lpPositions: Array(50).fill({
        pool: 'USDP-USDC',
        liquidity: '2000',
        apr: '15.5',
        pendingRewards: '10.5',
      }),
      vaultPositions: [],
      veNFTPositions: [],
      launchpadInvestments: [],
      savingsPosition: null,
      riskAlerts: [],
    });

    const startTime = performance.now();

    render(<OverviewTab />);

    const renderTime = performance.now() - startTime;

    // Should still render quickly even with large data
    expect(renderTime).toBeLessThan(200);
  });
});

describe('OverviewTab - Security Tests', () => {
  test('SECURITY: should sanitize user addresses in display', () => {
    render(<OverviewTab />);

    // Addresses should be truncated (not full address displayed)
    const fullAddress = '0x1234567890123456789012345678901234567890';
    expect(screen.queryByText(fullAddress)).not.toBeInTheDocument();
  });

  test('SECURITY: should not render script tags from portfolio data', () => {
    // Mock malicious data
    const { useUserPortfolio } = require('@/hooks/useUserPortfolio');
    useUserPortfolio.mockReturnValue({
      isLoading: false,
      lpPositions: [
        {
          pool: '<script>alert("xss")</script>',
          liquidity: '2000',
          apr: '15.5',
          pendingRewards: '10.5',
        },
      ],
      vaultPositions: [],
      veNFTPositions: [],
      launchpadInvestments: [],
      savingsPosition: null,
      riskAlerts: [],
    });

    render(<OverviewTab />);

    // Should not execute script
    expect(document.querySelector('script')).toBeNull();
  });
});

describe('OverviewTab - Compatibility Tests', () => {
  test('COMPATIBILITY: should work when wallet disconnected', () => {
    // This test verifies tab content, not wallet connection UI
    // The parent page handles wallet connection check
    const { useAccount } = require('wagmi');
    useAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
    });

    // Component should still render (parent handles connection check)
    expect(() => render(<OverviewTab />)).not.toThrow();
  });

  test('COMPATIBILITY: should be responsive on mobile', () => {
    // Simulate mobile viewport
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<OverviewTab />);

    // All main sections should still be present
    expect(screen.getByText(/Total Net Worth/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
  });
});
