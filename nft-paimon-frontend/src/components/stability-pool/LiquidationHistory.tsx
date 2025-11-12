/**
 * LiquidationHistory Component
 * Display historical liquidation events
 *
 * Features:
 * - Time, debt offset amount, collateral gained, share changes
 * - Pagination
 * - Filtering by time range
 */

'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  History as HistoryIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { DataNotice } from '@/components/common/DataNotice';

interface LiquidationHistoryProps {
  locale?: 'en' | 'zh';
}

const translations = {
  en: {
    title: 'Liquidation History',
    time: 'Time',
    debtOffset: 'Debt Offset',
    collateralGained: 'Collateral Gained',
    shareChange: 'Share Change',
    noHistory: 'No liquidation history',
  },
  zh: {
    title: '清算历史',
    time: '时间',
    debtOffset: '债务抵消',
    collateralGained: '获得抵押品',
    shareChange: '份额变化',
    noHistory: '暂无清算历史',
  },
};

// TODO Phase 3.2+: Implement via The Graph Subgraph
// Index StabilityPool.Liquidated events:
//   - borrower, liquidator, debtOffset, collateralSent, timestamp
// GraphQL query: liquidations(first: 10, orderBy: timestamp, orderDirection: desc)
// Create useLiquidationHistory hook to query subgraph
// Long-term solution: Real-time event indexing with historical data
interface Liquidation {
  timestamp: number;
  debtOffset: number;
  collateralGained: { symbol: string; amount: number };
  shareChange: number;
}

export function LiquidationHistory({ locale = 'en' }: LiquidationHistoryProps) {
  const t = translations[locale];

  // Empty array - liquidation history requires The Graph Subgraph (Phase 3.2+)
  const liquidations = useMemo(() => [] as Liquidation[], []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 107, 0, 0.05)',
        border: '1px solid rgba(255, 107, 0, 0.2)',
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <HistoryIcon sx={{ color: '#ff6b00', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff6b00' }}>
            {t.title}
          </Typography>
        </Box>

        {/* Table */}
        {liquidations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <InfoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t.noHistory}
            </Typography>
            <DataNotice
              message={
                locale === 'zh'
                  ? '清算历史功能需要事件索引支持，将在 Phase 3.2 通过 The Graph Subgraph 实现。'
                  : 'Liquidation history requires event indexing and will be implemented via The Graph Subgraph in Phase 3.2.'
              }
              severity="info"
            />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{t.time}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">
                    {t.debtOffset}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">
                    {t.collateralGained}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">
                    {t.shareChange}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liquidations.map((liq, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(255, 107, 0, 0.05)',
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2">{formatDate(liq.timestamp)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {liq.debtOffset.toLocaleString()} USDP
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        icon={<TrendingUpIcon />}
                        label={`${liq.collateralGained.amount.toLocaleString()} ${liq.collateralGained.symbol}`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(76, 175, 80, 0.1)',
                          color: '#4caf50',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        icon={<TrendingDownIcon />}
                        label={`${liq.shareChange}%`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(244, 67, 54, 0.1)',
                          color: '#f44336',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
