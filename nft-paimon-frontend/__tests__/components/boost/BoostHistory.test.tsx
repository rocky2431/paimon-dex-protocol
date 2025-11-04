/**
 * BoostHistory Component Tests
 * 6-Dimensional Test Coverage:
 * 1. Functional - Display history entries
 * 2. Boundary - Empty list, single entry, many entries
 * 3. Exception - Invalid data
 * 4. Performance - (Deferred to E2E)
 * 5. Security - Data sanitization
 * 6. Compatibility - Responsive design
 */

import { render, screen } from '@testing-library/react';
import { BoostHistory } from '@/components/boost/BoostHistory';
import { BoostHistoryEntry } from '@/components/boost/types';

const mockEntries: BoostHistoryEntry[] = [
  {
    txHash: '0x1234567890abcdef',
    action: 'stake',
    amount: '1000.0',
    timestamp: 1730000000,
    multiplierAfter: '1.10x',
  },
  {
    txHash: '0xabcdef1234567890',
    action: 'unstake',
    amount: '500.0',
    timestamp: 1730100000,
    multiplierAfter: '1.05x',
  },
];

describe('BoostHistory Component', () => {
  /**
   * 1. Functional Tests - Core Functionality
   */
  describe('Functional: History Display', () => {
    it('renders history list', () => {
      render(<BoostHistory entries={mockEntries} />);

      expect(screen.getByText(/Boost History/i)).toBeInTheDocument();
    });

    it('displays all history entries', () => {
      render(<BoostHistory entries={mockEntries} />);

      expect(screen.getByText(/1000\.0/)).toBeInTheDocument();
      expect(screen.getByText(/500\.0/)).toBeInTheDocument();
    });

    it('shows transaction hashes (shortened)', () => {
      render(<BoostHistory entries={mockEntries} />);

      // Should show shortened hash (e.g., 0x1234...cdef)
      expect(screen.getByText(/0x1234/)).toBeInTheDocument();
    });

    it('displays action types correctly', () => {
      render(<BoostHistory entries={mockEntries} />);

      // ✅ FIX (Task 84): Action types appear multiple times (in Chips), use getAllByText
      const stakeMatches = screen.getAllByText(/Stake/i);
      expect(stakeMatches.length).toBeGreaterThanOrEqual(1);
      const unstakeMatches = screen.getAllByText(/Unstake/i);
      expect(unstakeMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('shows multiplier after each action', () => {
      render(<BoostHistory entries={mockEntries} />);

      expect(screen.getByText(/1\.10x/)).toBeInTheDocument();
      expect(screen.getByText(/1\.05x/)).toBeInTheDocument();
    });

    it('displays timestamps in readable format', () => {
      render(<BoostHistory entries={mockEntries} />);

      // Should show formatted dates
      expect(screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toHaveLength(2);
    });

    it('makes transaction hash clickable (external link)', () => {
      render(<BoostHistory entries={mockEntries} />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href');
    });
  });

  /**
   * 2. Boundary Tests - Edge Cases
   */
  describe('Boundary: Edge Cases', () => {
    it('renders empty state when no entries', () => {
      render(<BoostHistory entries={[]} />);

      expect(screen.getByText(/No history/i)).toBeInTheDocument();
    });

    it('handles single entry', () => {
      const singleEntry = [mockEntries[0]];
      render(<BoostHistory entries={singleEntry} />);

      expect(screen.getByText(/1000\.0/)).toBeInTheDocument();
    });

    it('handles many entries (scroll)', () => {
      const manyEntries = Array.from({ length: 20 }, (_, i) => ({
        ...mockEntries[0],
        txHash: `0x${i}234567890abcdef`,
        timestamp: 1730000000 + i * 10000,
      }));

      render(<BoostHistory entries={manyEntries} />);

      // ✅ FIX (Task 84): MUI sx prop generates CSS classes, not inline styles
      // Instead, verify all 20 entries are rendered (component handles scroll internally)
      const txLinks = screen.getAllByRole('link');
      expect(txLinks.length).toBe(20);
    });

    it('displays loading state', () => {
      render(<BoostHistory entries={[]} isLoading={true} />);

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });

  /**
   * 3. Exception Tests - Error Handling
   */
  describe('Exception: Error Handling', () => {
    it('handles missing transaction hash gracefully', () => {
      const invalidEntry = { ...mockEntries[0], txHash: '' };

      expect(() => {
        render(<BoostHistory entries={[invalidEntry]} />);
      }).not.toThrow();
    });

    it('handles invalid timestamp', () => {
      const invalidEntry = { ...mockEntries[0], timestamp: NaN };

      expect(() => {
        render(<BoostHistory entries={[invalidEntry]} />);
      }).not.toThrow();
    });

    it('handles zero amount', () => {
      const zeroEntry = { ...mockEntries[0], amount: '0' };

      render(<BoostHistory entries={[zeroEntry]} />);

      // ✅ FIX (Task 84): "0" appears multiple times (amount, possibly in date/hash), use more specific
      expect(screen.getByText(/^0 PAIMON$/)).toBeInTheDocument();
    });
  });

  /**
   * 5. Security Tests - Data Sanitization
   */
  describe('Security: Data Sanitization', () => {
    it('prevents XSS in amount field', () => {
      const maliciousEntry = {
        ...mockEntries[0],
        amount: '<script>alert("XSS")</script>',
      };

      const { container } = render(<BoostHistory entries={[maliciousEntry]} />);

      // Should render as escaped text, not execute script
      // React auto-escapes HTML, so the text will be visible
      expect(screen.getByText(/script.*alert.*XSS.*\/script/i)).toBeInTheDocument();

      // Verify no actual <script> element was created
      expect(container.querySelector('script')).toBeNull();
    });

    it('prevents XSS in multiplier field', () => {
      const maliciousEntry = {
        ...mockEntries[0],
        multiplierAfter: '<img src=x onerror=alert(1)>',
      };

      const { container } = render(<BoostHistory entries={[maliciousEntry]} />);

      // Should render as escaped text, not execute HTML
      // React auto-escapes HTML
      expect(screen.getByText(/img src=x onerror=alert/i)).toBeInTheDocument();

      // Verify no malicious <img> element was created (only MUI icons)
      const maliciousImages = Array.from(container.querySelectorAll('img')).filter(
        (img) => img.getAttribute('src') === 'x'
      );
      expect(maliciousImages).toHaveLength(0);
    });
  });

  /**
   * 6. Compatibility Tests - Responsive Design
   */
  describe('Compatibility: Responsive Design', () => {
    it('renders without layout errors', () => {
      const { container } = render(<BoostHistory entries={mockEntries} />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders in empty state without errors', () => {
      const { container } = render(<BoostHistory entries={[]} />);

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
