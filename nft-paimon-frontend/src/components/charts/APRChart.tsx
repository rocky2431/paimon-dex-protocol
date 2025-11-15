/**
 * APR Trend Chart Component.
 *
 * Displays historical APR data with time-series visualization.
 */

import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAPRHistory } from '@/hooks/useHistoricalData';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface APRChartProps {
  poolAddress: string;
  period?: '7d' | '30d' | '90d';
}

/**
 * APR Chart component.
 *
 * @param poolAddress - Pool contract address
 * @param period - Time period (default: 30d)
 */
export const APRChart: React.FC<APRChartProps> = ({ poolAddress, period = '30d' }) => {
  const { data, loading, error } = useAPRHistory(poolAddress, period);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.snapshots.length === 0) {
      return null;
    }

    // Reverse to show oldest → newest
    const sortedSnapshots = [...data.snapshots].reverse();

    return {
      labels: sortedSnapshots.map((s) =>
        new Date(s.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      ),
      datasets: [
        {
          label: 'APR (%)',
          data: sortedSnapshots.map((s) => parseFloat(s.apr.toString())),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
        },
      ],
    };
  }, [data]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `APR: ${context.parsed.y.toFixed(2)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load APR data: {error}
      </Alert>
    );
  }

  if (!data || data.snapshots.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No historical data available for this pool
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {data.pool_name} - APR Trend ({period})
        </Typography>

        {/* Statistics */}
        <Box display="flex" gap={4} mb={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Average APR
            </Typography>
            <Typography variant="h6" color="primary">
              {data.avg_apr.toFixed(2)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Max APR
            </Typography>
            <Typography variant="h6" color="success.main">
              {data.max_apr.toFixed(2)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Min APR
            </Typography>
            <Typography variant="h6" color="warning.main">
              {data.min_apr.toFixed(2)}%
            </Typography>
          </Box>
        </Box>

        {/* Chart */}
        <Box height={300}>
          {chartData && <Line data={chartData} options={chartOptions} />}
        </Box>
      </CardContent>
    </Card>
  );
};
