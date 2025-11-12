'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickData } from 'lightweight-charts';
import { Box, ToggleButtonGroup, ToggleButton, CircularProgress, Typography } from '@mui/material';

/**
 * PriceChart Component
 * TradingView Lightweight Charts integration for token pair price visualization
 *
 * Features:
 * - Multiple timeframes (1H, 4H, 1D, 1W)
 * - Candlestick or Line chart
 * - Responsive to container size
 * - Warm orange theme
 */

export interface PriceChartProps {
  /** Token pair symbol (e.g., "HYD/USDC") */
  pair: string;
  /** Chart height in pixels */
  height?: number;
}

// Mock data generator (replace with real API calls)
function generateMockPriceData(timeframe: string, count: number = 100): CandlestickData[] {
  const now = Math.floor(Date.now() / 1000);
  const interval = timeframe === '1H' ? 3600 : timeframe === '4H' ? 14400 : timeframe === '1D' ? 86400 : 604800;

  let basePrice = 0.85;
  const data: CandlestickData[] = [];

  for (let i = count; i > 0; i--) {
    const time = (now - i * interval) as any;
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility;

    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    data.push({
      time,
      open,
      high,
      low,
      close,
    });

    basePrice = close;
  }

  return data;
}

export const PriceChart: React.FC<PriceChartProps> = ({ pair, height = 280 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState<string>('1D');
  const [loading, setLoading] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#666',
      },
      grid: {
        vertLines: { color: 'rgba(255, 107, 0, 0.1)' },
        horzLines: { color: 'rgba(255, 107, 0, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: {
        borderColor: 'rgba(255, 107, 0, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 107, 0, 0.2)',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#FF9800',
          width: 1,
          style: 2,
          labelBackgroundColor: '#FF9800',
        },
        horzLine: {
          color: '#FF9800',
          width: 1,
          style: 2,
          labelBackgroundColor: '#FF9800',
        },
      },
    });

    // Add candlestick series
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#FF9800',
      downColor: '#D84315',
      borderUpColor: '#FF9800',
      borderDownColor: '#D84315',
      wickUpColor: '#FF9800',
      wickDownColor: '#D84315',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Load initial data
    const data = generateMockPriceData(timeframe);
    candlestickSeries.setData(data);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  // Update data when timeframe changes
  useEffect(() => {
    if (!seriesRef.current) return;

    setLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const data = generateMockPriceData(timeframe);
      seriesRef.current?.setData(data);
      chartRef.current?.timeScale().fitContent();
      setLoading(false);
    }, 300);
  }, [timeframe]);

  const handleTimeframeChange = (_event: React.MouseEvent<HTMLElement>, newTimeframe: string | null) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Timeframe Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {pair} Price
        </Typography>
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={handleTimeframeChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.secondary',
              border: '1px solid rgba(255, 107, 0, 0.2)',
              '&.Mui-selected': {
                backgroundColor: '#FF9800',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#F57C00',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
              },
            },
          }}
        >
          <ToggleButton value="1H">1H</ToggleButton>
          <ToggleButton value="4H">4H</ToggleButton>
          <ToggleButton value="1D">1D</ToggleButton>
          <ToggleButton value="1W">1W</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Chart Container */}
      <Box
        ref={chartContainerRef}
        sx={{
          position: 'relative',
          borderRadius: 2,
          border: '1px solid rgba(255, 107, 0, 0.2)',
          overflow: 'hidden',
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 10,
          }}
        >
          <CircularProgress sx={{ color: '#FF9800' }} />
        </Box>
      )}
    </Box>
  );
};
