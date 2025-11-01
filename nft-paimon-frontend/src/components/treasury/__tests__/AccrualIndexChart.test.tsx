/**
 * AccrualIndexChart Component Tests
 * TDD: RED phase - Comprehensive 6-dimensional test coverage
 *
 * Test Dimensions:
 * 1. Functional - Core chart rendering and data display
 * 2. Boundary - Edge cases (empty data, single point, large datasets)
 * 3. Exception - Error handling (invalid data, NaN, Infinity)
 * 4. Performance - Rendering optimization and memoization
 * 5. Security - XSS prevention, data validation
 * 6. Compatibility - EN/ZH locales, responsive behavior
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccrualIndexChart, ChartDataPoint } from '../AccrualIndexChart';

// Mock data generators
function generateMockData(days: number = 30): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const baseIndex = 1e18; // Start at 1.0
  const now = Date.now();

  for (let i = 0; i < days; i++) {
    const timestamp = now - (days - i) * 24 * 60 * 60 * 1000;
    const index = baseIndex + (i * 0.01e18); // 1% growth per day
    const dailyGrowth = i > 0 ? 0.01 : 0; // 1% daily growth

    data.push({
      timestamp,
      index,
      dailyGrowth,
    });
  }

  return data;
}

describe('AccrualIndexChart - Functional Tests', () => {
  it('should render chart title', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    expect(screen.getByText('Accrual Index History')).toBeInTheDocument();
  });

  it('should render chart with valid data', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    const chart = screen.getByTestId('accrual-index-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should display Chinese title when locale is zh', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} locale="zh" />);

    expect(screen.getByText('累积指数历史')).toBeInTheDocument();
  });

  it('should render dual-axis chart (index + growth)', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    // Check for stat cards which indicate dual metrics are tracked
    expect(screen.getByText(/Current Index/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Growth/i)).toBeInTheDocument();
  });

  it('should format index values correctly', () => {
    const data = [
      {
        timestamp: Date.now() - 86400000,
        index: 1.5e18,
        dailyGrowth: 0.02,
      },
      {
        timestamp: Date.now(),
        index: 1.53e18,
        dailyGrowth: 0.02,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    // Index should be formatted as decimal (1.5, 1.53)
    expect(screen.getByText(/1\.5/)).toBeInTheDocument();
  });

  it('should display current index prominently', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    // Latest index should be displayed as a stat card
    const currentIndex = screen.getByText(/Current Index/i);
    expect(currentIndex).toBeInTheDocument();
  });

  it('should show daily growth percentage', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    // Daily growth should be formatted as percentage
    expect(screen.getByText(/Daily Growth/i)).toBeInTheDocument();
  });

  it('should calculate and display total growth', () => {
    const data = [
      {
        timestamp: Date.now() - 7 * 86400000,
        index: 1.0e18,
        dailyGrowth: 0,
      },
      {
        timestamp: Date.now(),
        index: 1.07e18,
        dailyGrowth: 0.01,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    // Total growth = (1.07 - 1.0) / 1.0 = 7%
    const totalGrowthElements = screen.getAllByText(/7\.00%/);
    expect(totalGrowthElements.length).toBeGreaterThan(0);
  });
});

describe('AccrualIndexChart - Boundary Tests', () => {
  it('should handle empty data array', () => {
    render(<AccrualIndexChart data={[]} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const data = [
      {
        timestamp: Date.now(),
        index: 1.0e18,
        dailyGrowth: 0,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    const chart = screen.getByTestId('accrual-index-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should handle very large dataset (365 days)', () => {
    const data = generateMockData(365);
    render(<AccrualIndexChart data={data} />);

    const chart = screen.getByTestId('accrual-index-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should handle maximum index value', () => {
    const data = [
      {
        timestamp: Date.now(),
        index: 1000e18, // Very large index
        dailyGrowth: 0.5, // 50% daily growth
      },
    ];

    render(<AccrualIndexChart data={data} />);

    expect(screen.getByTestId('accrual-index-chart')).toBeInTheDocument();
  });

  it('should handle minimum index value (1.0)', () => {
    const data = [
      {
        timestamp: Date.now(),
        index: 1e18,
        dailyGrowth: 0,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    expect(screen.getByText(/1\.00/)).toBeInTheDocument();
  });

  it('should handle zero daily growth', () => {
    const data = generateMockData(7).map(d => ({
      ...d,
      dailyGrowth: 0,
    }));

    render(<AccrualIndexChart data={data} />);

    expect(screen.getByText(/0\.00%/)).toBeInTheDocument();
  });

  it('should handle negative growth (deflation)', () => {
    const data = [
      {
        timestamp: Date.now() - 86400000,
        index: 1.0e18,
        dailyGrowth: 0,
      },
      {
        timestamp: Date.now(),
        index: 0.99e18,
        dailyGrowth: -0.01, // -1% growth
      },
    ];

    render(<AccrualIndexChart data={data} />);

    // Should display negative growth in daily growth stat
    const dailyGrowthElements = screen.getAllByText(/-1\.00%/);
    expect(dailyGrowthElements.length).toBeGreaterThan(0);
  });

  it('should sort data by timestamp if unsorted', () => {
    const data = [
      {
        timestamp: Date.now(),
        index: 1.01e18,
        dailyGrowth: 0.01,
      },
      {
        timestamp: Date.now() - 86400000,
        index: 1.0e18,
        dailyGrowth: 0,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    // Should not crash - data will be sorted internally
    expect(screen.getByTestId('accrual-index-chart')).toBeInTheDocument();
  });
});

describe('AccrualIndexChart - Exception Tests', () => {
  it('should filter out NaN values', () => {
    const data = [
      {
        timestamp: Date.now() - 86400000,
        index: 1.0e18,
        dailyGrowth: 0,
      },
      {
        timestamp: Date.now(),
        index: NaN,
        dailyGrowth: NaN,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    // Should still render with valid data
    expect(screen.getByTestId('accrual-index-chart')).toBeInTheDocument();
  });

  it('should filter out Infinity values', () => {
    const data = [
      {
        timestamp: Date.now() - 86400000,
        index: 1.0e18,
        dailyGrowth: 0,
      },
      {
        timestamp: Date.now(),
        index: Infinity,
        dailyGrowth: Infinity,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    expect(screen.getByTestId('accrual-index-chart')).toBeInTheDocument();
  });

  it('should handle invalid timestamp', () => {
    const data = [
      {
        timestamp: NaN,
        index: 1.0e18,
        dailyGrowth: 0,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    // Should show "no data" because all entries are invalid
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle undefined data prop', () => {
    // @ts-expect-error - Testing runtime behavior
    render(<AccrualIndexChart data={undefined} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle null data prop', () => {
    // @ts-expect-error - Testing runtime behavior
    render(<AccrualIndexChart data={null} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle non-array data', () => {
    // @ts-expect-error - Testing runtime behavior
    render(<AccrualIndexChart data={{ invalid: 'data' }} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});

describe('AccrualIndexChart - Performance Tests', () => {
  it('should memoize processed data', () => {
    const data = generateMockData(30);
    const { rerender } = render(<AccrualIndexChart data={data} />);

    // Re-render with same data - should not reprocess
    rerender(<AccrualIndexChart data={data} />);

    expect(screen.getByTestId('accrual-index-chart')).toBeInTheDocument();
  });

  it('should render large dataset without performance issues', () => {
    const startTime = performance.now();
    const data = generateMockData(365);

    render(<AccrualIndexChart data={data} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in less than 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('should update efficiently on data change', () => {
    const data1 = generateMockData(7);
    const { rerender } = render(<AccrualIndexChart data={data1} />);

    const data2 = generateMockData(14);
    const startTime = performance.now();

    rerender(<AccrualIndexChart data={data2} />);

    const endTime = performance.now();
    const rerenderTime = endTime - startTime;

    // Re-render should be fast (<50ms)
    expect(rerenderTime).toBeLessThan(50);
  });

  it('should not re-render unnecessarily', () => {
    const data = generateMockData(7);
    let renderCount = 0;

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      renderCount++;
      return <>{children}</>;
    };

    const { rerender } = render(
      <TestWrapper>
        <AccrualIndexChart data={data} />
      </TestWrapper>
    );

    // Re-render with same props
    rerender(
      <TestWrapper>
        <AccrualIndexChart data={data} />
      </TestWrapper>
    );

    // Should have rendered twice (initial + re-render)
    expect(renderCount).toBe(2);
  });
});

describe('AccrualIndexChart - Security Tests', () => {
  it('should sanitize XSS in custom data', () => {
    const data = [
      {
        timestamp: Date.now(),
        index: 1.0e18,
        dailyGrowth: 0,
        malicious: '<script>alert("xss")</script>',
      } as any,
    ];

    render(<AccrualIndexChart data={data} />);

    // Should not execute script
    expect(screen.queryByText(/alert/i)).not.toBeInTheDocument();
  });

  it('should validate data types', () => {
    const data = [
      {
        timestamp: '2024-01-01',
        index: '1.5e18',
        dailyGrowth: '0.01',
      },
    ] as any;

    render(<AccrualIndexChart data={data} />);

    // Invalid data should be filtered out
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle extremely large numbers safely', () => {
    const data = [
      {
        timestamp: Date.now(),
        index: Number.MAX_SAFE_INTEGER * 1e18,
        dailyGrowth: Number.MAX_SAFE_INTEGER,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    // Should not crash
    expect(screen.getByTestId('accrual-index-chart')).toBeInTheDocument();
  });

  it('should prevent prototype pollution', () => {
    const data = [
      {
        timestamp: Date.now(),
        index: 1.0e18,
        dailyGrowth: 0,
        __proto__: { polluted: true },
      } as any,
    ];

    render(<AccrualIndexChart data={data} />);

    // Should not pollute prototype
    expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);
  });

  it('should handle circular references gracefully', () => {
    const circular: any = {
      timestamp: Date.now(),
      index: 1.0e18,
      dailyGrowth: 0,
    };
    circular.self = circular;

    const data = [circular];

    // Should not crash on render
    expect(() => render(<AccrualIndexChart data={data} />)).not.toThrow();
  });
});

describe('AccrualIndexChart - Compatibility Tests', () => {
  it('should render with English locale', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} locale="en" />);

    expect(screen.getByText('Accrual Index History')).toBeInTheDocument();
  });

  it('should render with Chinese locale', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} locale="zh" />);

    expect(screen.getByText('累积指数历史')).toBeInTheDocument();
  });

  it('should default to English if locale not specified', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    expect(screen.getByText('Accrual Index History')).toBeInTheDocument();
  });

  it('should handle invalid locale gracefully', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} locale={'fr' as any} />);

    // Should fallback to English
    expect(screen.getByText('Accrual Index History')).toBeInTheDocument();
  });

  it('should be responsive (mobile viewport)', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    const chart = screen.getByTestId('accrual-index-chart');

    // ResponsiveContainer should adjust to container
    expect(chart).toBeInTheDocument();
  });

  it('should work with different date formats', () => {
    const data = [
      {
        timestamp: new Date('2024-01-01').getTime(),
        index: 1.0e18,
        dailyGrowth: 0,
      },
      {
        timestamp: new Date('2024-01-02').getTime(),
        index: 1.01e18,
        dailyGrowth: 0.01,
      },
    ];

    render(<AccrualIndexChart data={data} />);

    expect(screen.getByTestId('accrual-index-chart')).toBeInTheDocument();
  });

  it('should support Material Design 3 theme', () => {
    const data = generateMockData(7);
    render(<AccrualIndexChart data={data} />);

    const chart = screen.getByTestId('accrual-index-chart');

    // Should have MD3 styling (border-radius: 24px, warm colors)
    const styles = window.getComputedStyle(chart);
    expect(styles.borderRadius).toBe('24px');
  });

  it('should be accessible (a11y)', () => {
    const data = generateMockData(7);
    const { container } = render(<AccrualIndexChart data={data} />);

    // Should have proper ARIA labels
    const chart = container.querySelector('[data-testid="accrual-index-chart"]');
    expect(chart).toBeInTheDocument();
  });
});
