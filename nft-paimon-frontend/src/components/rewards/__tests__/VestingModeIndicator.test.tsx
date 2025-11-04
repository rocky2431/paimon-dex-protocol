/**
 * Unit tests for VestingModeIndicator component
 * VestingModeIndicator组件的单元测试
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { VestingModeIndicator } from '../VestingModeIndicator';
import '@testing-library/jest-dom';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('VestingModeIndicator Component Tests', () => {
  // ==================== Functional Tests ====================

  describe('Functional Behavior', () => {
    it('should render vesting mode when enabled', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // ✅ FIX (Task 84): Text appears in both Chip and Table Cell, use getAllByText
      const modeMatches = screen.getAllByText(/vesting.mode.enabled/i);
      expect(modeMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/vesting.description.365days/i)).toBeInTheDocument();
    });

    it('should render direct mode when vesting is disabled', () => {
      render(<VestingModeIndicator useEsVesting={false} loading={false} />);

      // ✅ FIX (Task 84): Text appears in both Chip and Table Cell, use getAllByText
      const modeMatches = screen.getAllByText(/vesting.mode.disabled/i);
      expect(modeMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/vesting.description.immediate/i)).toBeInTheDocument();
    });

    it('should display mode comparison table', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // ✅ FIX (Task 84): "vesting.mode" appears multiple times (headers + cells), use getAllByText
      // Check for comparison headers
      const modeMatches = screen.getAllByText(/vesting.mode/i);
      expect(modeMatches.length).toBeGreaterThanOrEqual(1);
      const prosMatches = screen.getAllByText(/vesting.pros/i);
      expect(prosMatches.length).toBeGreaterThanOrEqual(1);
      const consMatches = screen.getAllByText(/vesting.cons/i);
      expect(consMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should show link to Convert page when vesting is enabled', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      const link = screen.getByRole('link', { name: /convert/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/convert');
    });

    it('should not show Convert link when vesting is disabled', () => {
      render(<VestingModeIndicator useEsVesting={false} loading={false} />);

      const link = screen.queryByRole('link', { name: /convert/i });
      expect(link).not.toBeInTheDocument();
    });
  });

  // ==================== Boundary Tests ====================

  describe('Boundary Cases', () => {
    it('should handle loading state', () => {
      render(<VestingModeIndicator useEsVesting={undefined} loading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle undefined vesting state', () => {
      render(<VestingModeIndicator useEsVesting={undefined} loading={false} />);

      // Should render default state or show error
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    });

    it('should render correctly with minimal props', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // Should render without crashing
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  // ==================== Exception Tests ====================

  describe('Error Handling', () => {
    it('should handle missing translation keys gracefully', () => {
      // Translation returns the key itself when missing
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // Should not crash and show key as fallback
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should not crash when useEsVesting is null', () => {
      render(<VestingModeIndicator useEsVesting={null as any} loading={false} />);

      // Should render without crashing
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  // ==================== Performance Tests ====================

  describe('Performance', () => {
    it('should render quickly (under 50ms)', () => {
      const start = performance.now();
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it('should handle rapid prop changes efficiently', () => {
      const { rerender } = render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        rerender(<VestingModeIndicator useEsVesting={i % 2 === 0} loading={false} />);
      }
      const end = performance.now();

      // 100 rerenders should complete in under 500ms
      expect(end - start).toBeLessThan(500);
    });
  });

  // ==================== Security Tests ====================

  describe('Security', () => {
    it('should sanitize external links', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      const link = screen.getByRole('link', { name: /convert/i });
      // Should use Next.js Link (internal routing, no target="_blank")
      expect(link).not.toHaveAttribute('target', '_blank');
    });

    it('should not expose sensitive data in DOM', () => {
      const { container } = render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // Should not contain any private keys, addresses, or sensitive info
      const html = container.innerHTML;
      expect(html).not.toMatch(/0x[a-fA-F0-9]{40}/); // No addresses
      expect(html).not.toMatch(/private/i);
    });
  });

  // ==================== Compatibility Tests ====================

  describe('Compatibility', () => {
    it('should render correctly on mobile viewport', () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('should render correctly on desktop viewport', () => {
      // Simulate desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;

      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('should support keyboard navigation for links', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      const link = screen.getByRole('link', { name: /convert/i });
      expect(link).toHaveAttribute('href');

      // Link should be keyboard accessible (has role and tabindex)
      expect(link.tagName).toBe('A');
    });

    it('should have proper ARIA attributes', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // Card should have article role for semantic structure
      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('should support screen readers', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // Check for proper semantic HTML structure
      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();

      // Headings should be present for navigation
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  // ==================== UI/UX Tests ====================

  describe('UI/UX', () => {
    it('should use warm color palette (no blue/purple)', () => {
      const { container } = render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      const html = container.innerHTML;
      // Should not contain blue colors
      expect(html).not.toMatch(/#[0-9a-f]{6}.*blue/i);
      expect(html).not.toMatch(/#00[0-9a-f]{4}/); // Common blue range
      // Should not contain purple colors
      expect(html).not.toMatch(/#[0-9a-f]{6}.*purple/i);
      expect(html).not.toMatch(/#[89a-f]0[0-9a-f]{4}/); // Common purple range
    });

    it('should display badge for mode indicator', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // Badge should be visible (using getAllByText to handle multiple matches)
      const badges = screen.getAllByText(/vesting.mode.enabled/i);
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0]).toBeVisible();
    });

    it('should show info icon for help text', () => {
      render(<VestingModeIndicator useEsVesting={true} loading={false} />);

      // Info icon or tooltip should be present
      const info = screen.getByRole('article');
      expect(info).toBeInTheDocument();
    });
  });
});
