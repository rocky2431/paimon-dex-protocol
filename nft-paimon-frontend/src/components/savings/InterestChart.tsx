/**
 * InterestChart Component
 * Display historical APR and interest curve
 *
 * Features:
 * - Dual-line chart (APR + Interest)
 * - Responsive layout
 * - Bilingual support (EN/ZH)
 * - Material Design 3 compliance
 * - Empty state handling
 */

'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
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
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export interface ChartDataPoint {
  timestamp: number;
  apr: number;
  interest: number;
}

interface InterestChartProps {
  data: ChartDataPoint[];
  locale?: 'en' | 'zh';
}

const translations = {
  en: {
    title: 'Historical APR & Interest',
    apr: 'APR',
    interest: 'Interest',
    noData: 'No data available',
    date: 'Date',
    percentage: 'Percentage (%)',
    amount: 'Amount (USDP)',
  },
  zh: {
    title: '历史 APR 和利息',
    apr: '年化利率',
    interest: '累积利息',
    noData: '暂无数据',
    date: '日期',
    percentage: '百分比 (%)',
    amount: '金额 (USDP)',
  },
};

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp: number, locale: 'en' | 'zh'): string {
  const date = new Date(timestamp);
  if (locale === 'zh') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
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
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          {entry.dataKey === 'apr' ? '%' : ' USDP'}
        </Typography>
      ))}
    </Box>
  );
}

export function InterestChart({ data, locale = 'en' }: InterestChartProps) {
  const t = translations[locale];

  // Validate and prepare data
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Filter out invalid data points
    return data
      .filter((d) => {
        return (
          typeof d.timestamp === 'number' &&
          !isNaN(d.timestamp) &&
          typeof d.apr === 'number' &&
          !isNaN(d.apr) &&
          isFinite(d.apr) &&
          typeof d.interest === 'number' &&
          !isNaN(d.interest) &&
          isFinite(d.interest)
        );
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  // Empty state
  if (chartData.length === 0) {
    return (
      <Card
        data-testid="interest-chart"
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
      data-testid="interest-chart"
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
              label={{
                value: t.percentage,
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
              label={{
                value: t.amount,
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
              dataKey="apr"
              stroke="#ff6b00"
              strokeWidth={2}
              dot={{ fill: '#ff6b00', r: 3 }}
              activeDot={{ r: 5 }}
              name={t.apr}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="interest"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ fill: '#82ca9d', r: 3 }}
              activeDot={{ r: 5 }}
              name={t.interest}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
