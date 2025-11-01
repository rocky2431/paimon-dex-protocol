/**
 * AccrualIndexChart Component
 * Display historical USDP accrualIndex curve with daily growth
 *
 * Features:
 * - Dual-line chart (Index + Daily Growth %)
 * - Current index display
 * - Total growth calculation
 * - Responsive layout
 * - Bilingual support (EN/ZH)
 * - Material Design 3 compliance
 */

'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Grid,
  Chip,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export interface ChartDataPoint {
  timestamp: number;
  index: number;
  dailyGrowth: number;
}

interface AccrualIndexChartProps {
  data: ChartDataPoint[];
  locale?: 'en' | 'zh';
}

const translations = {
  en: {
    title: 'Accrual Index History',
    currentIndex: 'Current Index',
    totalGrowth: 'Total Growth',
    dailyGrowth: 'Daily Growth',
    indexValue: 'Index Value',
    noData: 'No data available',
    date: 'Date',
    percentage: 'Percentage (%)',
    index: 'Index',
    growth: 'Growth',
  },
  zh: {
    title: '累积指数历史',
    currentIndex: '当前指数',
    totalGrowth: '总增长',
    dailyGrowth: '每日增长',
    indexValue: '指数值',
    noData: '暂无数据',
    date: '日期',
    percentage: '百分比 (%)',
    index: '指数',
    growth: '增长',
  },
};

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp: number, locale: 'en' | 'zh'): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  if (locale === 'zh') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Format index value (from 18 decimals to readable)
 */
function formatIndexValue(index: number): string {
  const value = index / 1e18;
  return value.toFixed(2);
}

/**
 * Format percentage
 */
function formatPercentage(value: number): string {
  return (value * 100).toFixed(2);
}

/**
 * Custom tooltip component
 */
function CustomTooltip({
  active,
  payload,
  label,
  locale = 'en',
}: TooltipProps<ValueType, NameType> & { locale?: 'en' | 'zh' }) {
  const t = translations[locale];

  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <Box
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(255, 107, 0, 0.3)',
        borderRadius: '8px',
        p: 1.5,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {formatDate(label, locale)}
      </Typography>
      {payload.map((entry, index) => (
        <Typography
          key={index}
          variant="caption"
          sx={{
            display: 'block',
            color: entry.color,
            fontWeight: 500,
          }}
        >
          {entry.name}:{' '}
          {entry.dataKey === 'index'
            ? formatIndexValue(entry.value as number)
            : `${formatPercentage(entry.value as number)}%`}
        </Typography>
      ))}
    </Box>
  );
}

export function AccrualIndexChart({ data, locale = 'en' }: AccrualIndexChartProps) {
  // Fallback to 'en' for invalid locales
  const validLocale = locale === 'zh' || locale === 'en' ? locale : 'en';
  const t = translations[validLocale];

  // Validate and prepare data
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Filter out invalid data points
    const validData = data.filter((d) => {
      return (
        typeof d.timestamp === 'number' &&
        !isNaN(d.timestamp) &&
        isFinite(d.timestamp) &&
        typeof d.index === 'number' &&
        !isNaN(d.index) &&
        isFinite(d.index) &&
        typeof d.dailyGrowth === 'number' &&
        !isNaN(d.dailyGrowth) &&
        isFinite(d.dailyGrowth)
      );
    });

    // Sort by timestamp
    return validData.sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        currentIndex: 0,
        totalGrowth: 0,
        latestDailyGrowth: 0,
      };
    }

    const latest = chartData[chartData.length - 1];
    const oldest = chartData[0];

    const currentIndex = latest.index / 1e18;
    const totalGrowth = oldest.index > 0 ? (latest.index - oldest.index) / oldest.index : 0;
    const latestDailyGrowth = latest.dailyGrowth;

    return {
      currentIndex,
      totalGrowth,
      latestDailyGrowth,
    };
  }, [chartData]);

  // Empty state
  if (chartData.length === 0) {
    return (
      <Card
        data-testid="accrual-index-chart"
        sx={{
          borderRadius: '24px',
          border: '1px solid rgba(255,107,0,0.3)',
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#ff6b00' }}>
            {t.title}
          </Typography>
          <Alert severity="info">{t.noData}</Alert>
        </CardContent>
      </Card>
    );
  }

  // Main chart
  return (
    <Card
      data-testid="accrual-index-chart"
      sx={{
        borderRadius: '24px',
        border: '1px solid rgba(255,107,0,0.3)',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.05) 0%, rgba(255,180,80,0.05) 100%)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Title */}
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#ff6b00' }}>
          {t.title}
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'rgba(255,107,0,0.1)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t.currentIndex}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                <ShowChartIcon sx={{ fontSize: 20, color: '#ff6b00' }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff6b00' }}>
                  {stats.currentIndex.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'rgba(255,107,0,0.1)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t.totalGrowth}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                <TrendingUpIcon sx={{ fontSize: 20, color: '#ff6b00' }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff6b00' }}>
                  {(stats.totalGrowth * 100).toFixed(2)}%
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'rgba(255,107,0,0.1)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t.dailyGrowth}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff6b00', mt: 0.5 }}>
                {(stats.latestDailyGrowth * 100).toFixed(2)}%
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => formatDate(value, locale)}
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#ff6b00"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatIndexValue(value)}
              label={{
                value: t.indexValue,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '12px', fill: '#666' },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#82ca9d"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${formatPercentage(value)}%`}
              label={{
                value: t.percentage,
                angle: 90,
                position: 'insideRight',
                style: { fontSize: '12px', fill: '#666' },
              }}
            />
            <Tooltip content={<CustomTooltip locale={locale} />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="index"
              stroke="#ff6b00"
              strokeWidth={2}
              dot={{ fill: '#ff6b00', r: 3 }}
              activeDot={{ r: 5 }}
              name={t.index}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="dailyGrowth"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ fill: '#82ca9d', r: 3 }}
              activeDot={{ r: 5 }}
              name={t.growth}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
