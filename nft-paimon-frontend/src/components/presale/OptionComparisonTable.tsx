'use client';

import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { ComparisonMetric } from '@/types/settlement';
import { CheckCircle as CheckIcon } from '@mui/icons-material';

interface OptionComparisonTableProps {
  metrics: ComparisonMetric[];
}

/**
 * OptionComparisonTable Component
 * Side-by-side comparison table for veNFT vs Cash settlement options
 *
 * Features:
 * - 3-column table (Metric | veNFT | Cash)
 * - Highlighting for veNFT advantages
 * - Responsive design
 * - Material Design 3 warm colors
 */
export function OptionComparisonTable({ metrics }: OptionComparisonTableProps) {
  const renderValue = (value: string | number | boolean, isVeNFT: boolean, highlight?: boolean) => {
    // Boolean values
    if (typeof value === 'boolean') {
      return value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckIcon sx={{ fontSize: 18, color: '#8BC34A' }} />
          <Typography variant="body2" fontWeight={600} color="#8BC34A">
            Yes
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No
        </Typography>
      );
    }

    // String/Number values
    return (
      <Typography
        variant="body2"
        fontWeight={highlight && isVeNFT ? 700 : 600}
        sx={{
          color: highlight && isVeNFT ? '#FF6B35' : 'text.primary',
        }}
      >
        {value}
      </Typography>
    );
  };

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Table>
        {/* Header */}
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            }}
          >
            <TableCell
              sx={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                width: '35%',
              }}
            >
              Comparison
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: '#FF6B35',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                width: '32.5%',
                borderLeft: '1px solid',
                borderColor: 'divider',
              }}
            >
              veNFT (Lock + Vote)
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: '#FFB74D',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                width: '32.5%',
                borderLeft: '1px solid',
                borderColor: 'divider',
              }}
            >
              Cash (USDC)
            </TableCell>
          </TableRow>
        </TableHead>

        {/* Body */}
        <TableBody>
          {metrics.map((metric, index) => (
            <TableRow
              key={metric.label}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 152, 0, 0.02)',
                },
                '&:last-child td': {
                  borderBottom: 0,
                },
              }}
            >
              {/* Metric Label */}
              <TableCell>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  {metric.label}
                </Typography>
              </TableCell>

              {/* veNFT Value */}
              <TableCell
                align="center"
                sx={{
                  backgroundColor: metric.veNFTHighlight ? 'rgba(255, 107, 53, 0.04)' : 'transparent',
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  position: 'relative',
                }}
              >
                {metric.veNFTHighlight && (
                  <Chip
                    label="Better"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: '#FF6B35',
                      color: '#FFFFFF',
                    }}
                  />
                )}
                {renderValue(metric.veNFTValue, true, metric.veNFTHighlight)}
              </TableCell>

              {/* Cash Value */}
              <TableCell
                align="center"
                sx={{
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {renderValue(metric.cashValue, false)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
