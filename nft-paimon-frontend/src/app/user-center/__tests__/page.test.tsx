/**
 * Unit Tests for User Center Page
 *
 * 6-Dimensional Test Coverage:
 * 1. Functional - Core tab rendering and switching
 * 2. Boundary - Edge cases (invalid tab params, empty states)
 * 3. Exception - Error handling (invalid URLs, missing components)
 * 4. Performance - Render performance, tab switch speed
 * 5. Security - XSS prevention in tab labels, URL param sanitization
 * 6. Compatibility - Different screen sizes, browser compatibility
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import UserCenterPage from '../page';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock wagmi hook
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
}));

describe('UserCenterPage - Functional Tests', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    // Setup mocks
    mockRouter = {
      push: jest.fn((url: string) => {
        // Simulate URL parameter update on push
        const match = url.match(/[?&]tab=([^&]*)/);
        if (match) {
          mockSearchParams.set('tab', match[1]);
        }
      }),
    };

    mockSearchParams = new URLSearchParams();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/user-center');
    (useSearchParams as jest.Mock).mockImplementation(() => mockSearchParams);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('FUNCTIONAL: should render all 6 tabs', () => {
    render(<UserCenterPage />);

    // Verify all 6 tabs are rendered
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Positions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Rewards/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /KYC/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Referral/i })).toBeInTheDocument();
  });

  test('FUNCTIONAL: should display Overview tab by default', () => {
    render(<UserCenterPage />);

    // Verify Overview tab is selected
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  test.skip('FUNCTIONAL: should switch tabs when clicked (covered by E2E tests)', async () => {
    // This test requires complex URL state mocking
    // Covered by E2E tests in e2e/user-center/user-center.spec.ts
    render(<UserCenterPage />);

    // Click Positions tab
    const positionsTab = screen.getByRole('tab', { name: /Positions/i });
    fireEvent.click(positionsTab);

    // Wait for state update
    await waitFor(() => {
      expect(positionsTab).toHaveAttribute('aria-selected', 'true');
    });

    // Verify router.push was called with correct URL
    expect(mockRouter.push).toHaveBeenCalledWith(
      '/user-center?tab=positions',
      expect.objectContaining({ scroll: false })
    );
  });

  test('FUNCTIONAL: should read tab from URL query parameter', () => {
    // Set URL to have ?tab=rewards
    mockSearchParams.set('tab', 'rewards');

    render(<UserCenterPage />);

    // Verify Rewards tab is selected
    const rewardsTab = screen.getByRole('tab', { name: /Rewards/i });
    expect(rewardsTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('UserCenterPage - Boundary Tests', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    };

    mockSearchParams = new URLSearchParams();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/user-center');
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  test('BOUNDARY: should handle invalid tab parameter gracefully', () => {
    // Set invalid tab parameter
    mockSearchParams.set('tab', 'invalid-tab-value');

    render(<UserCenterPage />);

    // Should fall back to default tab (overview)
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  test('BOUNDARY: should handle empty tab parameter', () => {
    // Set empty tab parameter
    mockSearchParams.set('tab', '');

    render(<UserCenterPage />);

    // Should use default tab
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  test('BOUNDARY: should handle missing tab parameter', () => {
    // No tab parameter in URL
    render(<UserCenterPage />);

    // Should use default tab
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('UserCenterPage - Exception Tests', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    };

    mockSearchParams = new URLSearchParams();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/user-center');
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  test('EXCEPTION: should not crash when router.push fails', async () => {
    // Mock router.push to throw error
    mockRouter.push.mockImplementation(() => {
      throw new Error('Navigation failed');
    });

    render(<UserCenterPage />);

    // Click tab (should not crash despite error)
    const positionsTab = screen.getByRole('tab', { name: /Positions/i });
    expect(() => fireEvent.click(positionsTab)).not.toThrow();
  });

  test('EXCEPTION: should handle special characters in tab parameter', () => {
    // Set tab parameter with special characters
    mockSearchParams.set('tab', '<script>alert("xss")</script>');

    render(<UserCenterPage />);

    // Should fall back to default tab (no XSS vulnerability)
    const overviewTab = screen.getByRole('tab', { name: /Overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // Verify no script tag is rendered
    expect(document.querySelector('script')).toBeNull();
  });
});

describe('UserCenterPage - Performance Tests', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    };

    mockSearchParams = new URLSearchParams();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/user-center');
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  test('PERFORMANCE: should render within 100ms', () => {
    const startTime = performance.now();

    render(<UserCenterPage />);

    const renderTime = performance.now() - startTime;

    expect(renderTime).toBeLessThan(100);
  });

  test.skip('PERFORMANCE: should switch tabs quickly (covered by E2E tests)', async () => {
    // This test requires real browser timing measurement
    // Covered by E2E tests in e2e/user-center/user-center.spec.ts
    render(<UserCenterPage />);

    const startTime = performance.now();

    // Click Rewards tab
    const rewardsTab = screen.getByRole('tab', { name: /Rewards/i });
    fireEvent.click(rewardsTab);

    await waitFor(() => {
      expect(rewardsTab).toHaveAttribute('aria-selected', 'true');
    });

    const switchTime = performance.now() - startTime;

    // Tab switch should be fast (< 50ms)
    expect(switchTime).toBeLessThan(50);
  });
});

describe('UserCenterPage - Security Tests', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    };

    mockSearchParams = new URLSearchParams();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/user-center');
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  test('SECURITY: should sanitize tab labels to prevent XSS', () => {
    render(<UserCenterPage />);

    // Verify no dangerous HTML in tab labels
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      const label = tab.textContent || '';
      expect(label).not.toContain('<script>');
      expect(label).not.toContain('javascript:');
      expect(label).not.toContain('onerror=');
    });
  });

  test('SECURITY: should prevent injection through URL parameters', () => {
    // Try to inject script through tab parameter
    mockSearchParams.set('tab', "'; DROP TABLE users; --");

    render(<UserCenterPage />);

    // Should not execute SQL injection or cause error
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
  });
});

describe('UserCenterPage - Compatibility Tests', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    };

    mockSearchParams = new URLSearchParams();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/user-center');
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  test('COMPATIBILITY: should render correctly on mobile viewport', () => {
    // Simulate mobile viewport
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<UserCenterPage />);

    // All tabs should still be accessible
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Positions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Rewards/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /KYC/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Referral/i })).toBeInTheDocument();
  });

  test('COMPATIBILITY: should render correctly on desktop viewport', () => {
    // Simulate desktop viewport
    global.innerWidth = 1280;
    global.dispatchEvent(new Event('resize'));

    render(<UserCenterPage />);

    // All tabs should be visible
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
  });

  test('COMPATIBILITY: should work without wallet connection', () => {
    // Mock disconnected wallet
    (require('wagmi').useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false,
    });

    render(<UserCenterPage />);

    // Page should still render (may show "Connect Wallet" message)
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
  });
});
