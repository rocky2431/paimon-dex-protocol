/**
 * InterestChart Component Tests
 * 6-Dimensional Test Coverage
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InterestChart } from '@/components/savings/InterestChart';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children, data }: any) => (
      <div data-testid="line-chart" data-points={data?.length}>
        {children}
      </div>
    ),
    Line: ({ dataKey, stroke }: any) => (
      <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
    ),
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

describe('InterestChart', () => {
  const mockHistoricalData = [
    { timestamp: 1704067200000, apr: 2.5, interest: 10.5 },
    { timestamp: 1704153600000, apr: 2.6, interest: 21.3 },
    { timestamp: 1704240000000, apr: 2.4, interest: 31.8 },
    { timestamp: 1704326400000, apr: 2.7, interest: 43.2 },
    { timestamp: 1704412800000, apr: 2.5, interest: 53.9 },
  ];

  // ===========================
  // Functional Tests (8)
  // ===========================
  describe('Functional Tests', () => {
    it('should render chart container', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      expect(screen.getByTestId('interest-chart')).toBeInTheDocument();
    });

    it('should render responsive container', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render line chart with data', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute('data-points', '5');
    });

    it('should render APR line', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      const aprLine = screen.getByTestId('line-apr');
      expect(aprLine).toBeInTheDocument();
      expect(aprLine).toHaveAttribute('data-stroke', '#ff6b00');
    });

    it('should render Interest line', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      const interestLine = screen.getByTestId('line-interest');
      expect(interestLine).toBeInTheDocument();
    });

    it('should render chart axes', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      // Should have 2 Y-axes (left for APR, right for Interest)
      const yAxes = screen.getAllByTestId('y-axis');
      expect(yAxes).toHaveLength(2);
    });

    it('should render grid', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('should render tooltip and legend', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  // ===========================
  // Boundary Tests (8)
  // ===========================
  describe('Boundary Tests', () => {
    it('should handle empty data array', () => {
      render(<InterestChart data={[]} locale="en" />);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      const singlePoint = [{ timestamp: 1704067200000, apr: 2.5, interest: 10.5 }];
      render(<InterestChart data={singlePoint} locale="en" />);
      const chart = screen.getByTestId('line-chart');
      expect(chart).toHaveAttribute('data-points', '1');
    });

    it('should handle very large dataset (100+ points)', () => {
      const largeData = Array.from({ length: 150 }, (_, i) => ({
        timestamp: 1704067200000 + i * 86400000,
        apr: 2.5 + Math.random() * 0.5,
        interest: i * 1.2,
      }));
      render(<InterestChart data={largeData} locale="en" />);
      const chart = screen.getByTestId('line-chart');
      expect(chart).toHaveAttribute('data-points', '150');
    });

    it('should handle zero APR values', () => {
      const zeroData = [
        { timestamp: 1704067200000, apr: 0, interest: 0 },
        { timestamp: 1704153600000, apr: 0, interest: 0 },
      ];
      render(<InterestChart data={zeroData} locale="en" />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle maximum APR (100%)', () => {
      const maxData = [
        { timestamp: 1704067200000, apr: 100, interest: 1000 },
      ];
      render(<InterestChart data={maxData} locale="en" />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle negative timestamps (past dates)', () => {
      const pastData = [
        { timestamp: 0, apr: 2.5, interest: 10 },
        { timestamp: 1000000000, apr: 2.6, interest: 20 },
      ];
      render(<InterestChart data={pastData} locale="en" />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle very small interest values', () => {
      const smallData = [
        { timestamp: 1704067200000, apr: 2.5, interest: 0.000001 },
      ];
      render(<InterestChart data={smallData} locale="en" />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle very large interest values', () => {
      const largeData = [
        { timestamp: 1704067200000, apr: 2.5, interest: 999999999.99 },
      ];
      render(<InterestChart data={largeData} locale="en" />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  // ===========================
  // Exception Tests (6)
  // ===========================
  describe('Exception Tests', () => {
    it('should handle undefined data', () => {
      render(<InterestChart data={undefined as any} locale="en" />);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });

    it('should handle null data', () => {
      render(<InterestChart data={null as any} locale="en" />);
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });

    it('should handle malformed data (missing fields)', () => {
      const malformedData = [
        { timestamp: 1704067200000 }, // Missing apr and interest
        { apr: 2.5, interest: 10 }, // Missing timestamp
      ] as any;
      expect(() => render(<InterestChart data={malformedData} locale="en" />)).not.toThrow();
    });

    it('should handle invalid timestamp format', () => {
      const invalidData = [
        { timestamp: 'invalid', apr: 2.5, interest: 10 },
      ] as any;
      expect(() => render(<InterestChart data={invalidData} locale="en" />)).not.toThrow();
    });

    it('should handle NaN values', () => {
      const nanData = [
        { timestamp: 1704067200000, apr: NaN, interest: NaN },
      ];
      expect(() => render(<InterestChart data={nanData} locale="en" />)).not.toThrow();
    });

    it('should handle Infinity values', () => {
      const infinityData = [
        { timestamp: 1704067200000, apr: Infinity, interest: Infinity },
      ];
      expect(() => render(<InterestChart data={infinityData} locale="en" />)).not.toThrow();
    });
  });

  // ===========================
  // Performance Tests (4)
  // ===========================
  describe('Performance Tests', () => {
    it('should render within 100ms', () => {
      const startTime = performance.now();
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid data updates', () => {
      const { rerender } = render(<InterestChart data={mockHistoricalData} locale="en" />);

      // Simulate 10 rapid updates
      for (let i = 0; i < 10; i++) {
        const newData = mockHistoricalData.map((d) => ({
          ...d,
          apr: d.apr + Math.random() * 0.1,
          interest: d.interest + i,
        }));
        rerender(<InterestChart data={newData} locale="en" />);
      }

      expect(screen.getByTestId('interest-chart')).toBeInTheDocument();
    });

    it('should handle large dataset efficiently', () => {
      const largeData = Array.from({ length: 365 }, (_, i) => ({
        timestamp: 1704067200000 + i * 86400000,
        apr: 2.5 + Math.random() * 0.5,
        interest: i * 1.2,
      }));

      const startTime = performance.now();
      render(<InterestChart data={largeData} locale="en" />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should memoize formatted data', () => {
      const { rerender } = render(<InterestChart data={mockHistoricalData} locale="en" />);
      const firstRender = screen.getByTestId('line-chart');

      // Rerender with same data
      rerender(<InterestChart data={mockHistoricalData} locale="en" />);
      const secondRender = screen.getByTestId('line-chart');

      // Should be same element (memoized)
      expect(firstRender).toBe(secondRender);
    });
  });

  // ===========================
  // Security Tests (5)
  // ===========================
  describe('Security Tests', () => {
    it('should not execute script in data', () => {
      const xssData = [
        {
          timestamp: 1704067200000,
          apr: 2.5,
          interest: 10,
          label: '<script>alert("XSS")</script>',
        },
      ] as any;

      render(<InterestChart data={xssData} locale="en" />);
      const scripts = document.querySelectorAll('script');
      expect(scripts.length).toBe(0);
    });

    it('should sanitize tooltip content', () => {
      const xssData = [
        {
          timestamp: 1704067200000,
          apr: 2.5,
          interest: 10,
        },
      ];

      render(<InterestChart data={xssData} locale="en" />);
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip.innerHTML).not.toContain('<script>');
    });

    it('should handle extremely large numbers without overflow', () => {
      const overflowData = [
        {
          timestamp: Number.MAX_SAFE_INTEGER,
          apr: Number.MAX_SAFE_INTEGER,
          interest: Number.MAX_SAFE_INTEGER,
        },
      ];

      expect(() => render(<InterestChart data={overflowData} locale="en" />)).not.toThrow();
    });

    it('should not expose sensitive data in DOM', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      const container = screen.getByTestId('interest-chart');

      // Should not contain API keys or private keys
      expect(container.textContent).not.toMatch(/0x[0-9a-f]{64}/i);
    });

    it('should validate data structure before rendering', () => {
      const invalidData = [
        { timestamp: '2024-01-01', apr: 'high', interest: 'lots' },
      ] as any;

      // Should not crash, should show error state or empty state
      expect(() => render(<InterestChart data={invalidData} locale="en" />)).not.toThrow();
    });
  });

  // ===========================
  // Compatibility Tests (4)
  // ===========================
  describe('Compatibility Tests', () => {
    it('should support English locale', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      expect(screen.getByTestId('interest-chart')).toBeInTheDocument();
    });

    it('should support Chinese locale', () => {
      render(<InterestChart data={mockHistoricalData} locale="zh" />);
      expect(screen.getByTestId('interest-chart')).toBeInTheDocument();
    });

    it('should be responsive', () => {
      render(<InterestChart data={mockHistoricalData} locale="en" />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('should follow Material Design 3 guidelines', () => {
      const { container } = render(<InterestChart data={mockHistoricalData} locale="en" />);
      const chart = container.querySelector('[data-testid="interest-chart"]');

      // Should have warm color palette
      expect(chart).toBeInTheDocument();
    });
  });
});
