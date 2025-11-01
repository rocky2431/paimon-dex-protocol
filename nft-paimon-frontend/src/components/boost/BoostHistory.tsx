'use client';

import { Box, Card, CardContent, Typography, Link, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import {
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { BoostHistoryProps } from './types';
import { BOOST_DESIGN_TOKENS } from './constants';

/**
 * BoostHistory Component
 * Displays user's boost staking history (stake/unstake transactions)
 *
 * Features:
 * - Transaction list with action type, amount, timestamp
 * - Shortened transaction hash with external link
 * - Multiplier display after each action
 * - Empty state and loading state
 * - Scrollable for many entries
 * - Material Design 3 styling
 */
export function BoostHistory({ entries, isLoading = false }: BoostHistoryProps) {
  /**
   * Format transaction hash to shortened version
   * e.g., "0x1234567890abcdef" → "0x1234...cdef"
   */
  const formatTxHash = (hash: string): string => {
    if (!hash || hash.length < 10) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  /**
   * Format Unix timestamp to readable date
   * e.g., 1730000000 → "10/27/2024"
   */
  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) return 'Invalid Date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  /**
   * Get block explorer URL for transaction
   * TODO: Replace with actual network explorer URL
   */
  const getExplorerUrl = (txHash: string): string => {
    return `https://testnet.bscscan.com/tx/${txHash}`;
  };

  /**
   * Get action icon and color
   */
  const getActionDisplay = (action: 'stake' | 'unstake') => {
    if (action === 'stake') {
      return {
        icon: <TrendingUpIcon sx={{ fontSize: 18 }} />,
        label: 'Stake',
        color: BOOST_DESIGN_TOKENS.COLOR_SUCCESS,
      };
    } else {
      return {
        icon: <TrendingDownIcon sx={{ fontSize: 18 }} />,
        label: 'Unstake',
        color: BOOST_DESIGN_TOKENS.COLOR_WARNING,
      };
    }
  };

  return (
    <Card
      sx={{
        borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
        border: `1px solid ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}40`,
        boxShadow: BOOST_DESIGN_TOKENS.SHADOW_CARD,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <HistoryIcon sx={{ fontSize: 28, color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY }} />
          <Typography variant="h6" fontWeight={700}>
            Boost History
          </Typography>
        </Box>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY }} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Loading history...
            </Typography>
          </Box>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              No history yet
            </Typography>
            <Typography variant="caption">
              Your stake and unstake transactions will appear here.
            </Typography>
          </Alert>
        )}

        {/* History List */}
        {!isLoading && entries.length > 0 && (
          <Box
            sx={{
              maxHeight: 500,
              overflowY: 'auto',
              overflowX: 'hidden',
              // Custom scrollbar styling
              '&::-webkit-scrollbar': {
                width: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: BOOST_DESIGN_TOKENS.COLOR_PRIMARY,
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: BOOST_DESIGN_TOKENS.COLOR_SECONDARY,
                },
              },
            }}
          >
            {entries.map((entry, index) => {
              const actionDisplay = getActionDisplay(entry.action);

              return (
                <Box key={`${entry.txHash}-${index}`}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: BOOST_DESIGN_TOKENS.RADIUS_MEDIUM,
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 107, 0, 0.05)',
                      },
                    }}
                  >
                    {/* Action Type and Amount */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={actionDisplay.icon}
                          label={actionDisplay.label}
                          size="small"
                          sx={{
                            backgroundColor: `${actionDisplay.color}20`,
                            color: actionDisplay.color,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                        <Typography variant="body1" fontWeight={700}>
                          {entry.amount} PAIMON
                        </Typography>
                      </Box>

                      {/* Multiplier After */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Multiplier:
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color={BOOST_DESIGN_TOKENS.COLOR_PRIMARY}>
                          {entry.multiplierAfter}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Transaction Hash and Timestamp */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {/* Transaction Hash Link */}
                      <Link
                        href={getExplorerUrl(entry.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          fontSize: '0.875rem',
                          color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY,
                          fontWeight: 600,
                        }}
                      >
                        {formatTxHash(entry.txHash)}
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>

                      {/* Timestamp */}
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(entry.timestamp)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Divider (except for last item) */}
                  {index < entries.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
