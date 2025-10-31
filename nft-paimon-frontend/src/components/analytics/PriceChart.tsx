'use client';

/**
 * HYD Price Chart Component
 * Line chart with time range selector
 * Shows HYD price trend with $1.00 target reference line
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { ChartTimeRange } from './types';
import {
  generateMockPriceData,
  formatChartDate,
  HYD_TARGET_PRICE,
  ANALYTICS_DESIGN_TOKENS,
} from './constants';

// ==================== Props ====================

/**
 * PriceChart component props
 */
export interface PriceChartProps {
  /** Current HYD price */
  currentPrice: number;
  /** Loading state */
  isLoading: boolean;
}

// ==================== Component ====================

/**
 * HYD Price Chart Component
 *
 * Features:
 * - Line chart showing HYD price trend
 * - Reference line at $1.00 target price
 * - Time range selector (24H/7D/30D/ALL)
 * - Responsive design
 * - Orange theme
 *
 * @param props - Component props
 * @returns Price chart component
 */
export const PriceChart: React.FC<PriceChartProps> = ({
  currentPrice,
  isLoading,
}) => {
  // ==================== State ====================

  const [timeRange, setTimeRange] = useState<ChartTimeRange>(
    ChartTimeRange.MONTH
  );

  // ==================== Mock Data ====================

  // Generate mock price data (Phase 1)
  // TODO (Phase 2): Fetch real data from The Graph
  const mockData = generateMockPriceData(30);

  // Filter data based on time range
  const getChartData = () => {
    switch (timeRange) {
      case ChartTimeRange.DAY:
        return mockData.slice(-1); // Last 1 day
      case ChartTimeRange.WEEK:
        return mockData.slice(-7); // Last 7 days
      case ChartTimeRange.MONTH:
        return mockData.slice(-30); // Last 30 days
      case ChartTimeRange.ALL:
        return mockData; // All data
      default:
        return mockData;
    }
  };

  const chartData = getChartData();

  // ==================== Event Handlers ====================

  /**
   * Handle time range change
   */
  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeRange: ChartTimeRange | null
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  // ==================== Render ====================

  return (
    <Card
      sx={{
        borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_CARD,
        boxShadow: ANALYTICS_DESIGN_TOKENS.SHADOW_CARD,
        border: '1px solid rgba(255, 152, 0, 0.2)',
        height: '100%',
      }}
    >
      <CardContent sx={{ padding: 3 }}>
        {/* Card Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          {/* Title */}
          <Box>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                color: '#FF9800',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              HYD Price
            </Typography>
            <Typography
              variant="h4"
              component="div"
              sx={{
                fontWeight: 900,
                color: '#212121',
                marginTop: 1,
              }}
            >
              ${currentPrice.toFixed(4)}
            </Typography>
          </Box>

          {/* Time Range Selector */}
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_PILL,
                border: '1px solid rgba(255, 152, 0, 0.3)',
                color: '#FF9800',
                fontWeight: 600,
                fontSize: '0.75rem',
                padding: '4px 12px',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  color: '#FFFFFF',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                  },
                },
              },
            }}
          >
            <ToggleButton value={ChartTimeRange.DAY}>24H</ToggleButton>
            <ToggleButton value={ChartTimeRange.WEEK}>7D</ToggleButton>
            <ToggleButton value={ChartTimeRange.MONTH}>30D</ToggleButton>
            <ToggleButton value={ChartTimeRange.ALL}>ALL</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 152, 0, 0.1)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatChartDate}
              stroke="#757575"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              domain={[0.95, 1.05]}
              stroke="#757575"
              style={{ fontSize: '0.75rem' }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid rgba(255, 152, 0, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              labelFormatter={(label) => formatChartDate(label as number)}
              formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
            />
            {/* Target Price Reference Line */}
            <ReferenceLine
              y={HYD_TARGET_PRICE}
              stroke="#FF9800"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: 'Target $1.00',
                position: 'right',
                fill: '#FF9800',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#FF9800"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#FF9800' }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Phase 1 Note */}
        <Typography
          variant="caption"
          component="div"
          sx={{
            marginTop: 2,
            color: '#757575',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          * Mock data for Phase 1. Real-time data from The Graph coming in Phase 2.
        </Typography>
      </CardContent>
    </Card>
  );
};

// ==================== Export ====================

export default PriceChart;
