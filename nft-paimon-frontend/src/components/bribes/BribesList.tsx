'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import { Bribe } from './types';
import { groupBribesByGauge, sortBribesByAmount, BRIBES_DESIGN_TOKENS } from './constants';
import { ClaimBribeButton } from './ClaimBribeButton';

/**
 * Props for BribesList component
 */
interface BribesListProps {
  /** All active bribes */
  bribes: Bribe[];
  /** User's veNFT token ID (if available) */
  tokenId?: bigint;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * BribesList Component
 * Displays all active bribes in a table grouped by gauge
 *
 * Features:
 * - Table view with gauge grouping
 * - Filter by claimable/all bribes
 * - Claim button for each bribe
 * - Empty state handling
 * - OlympusDAO design aesthetics
 */
export const BribesList: React.FC<BribesListProps> = ({ bribes, tokenId, isLoading = false }) => {
  const [filterTab, setFilterTab] = useState<number>(0); // 0 = All, 1 = Claimable

  // ==================== Group and Sort Bribes ====================

  const groupedBribes = useMemo(() => {
    const grouped = groupBribesByGauge(bribes);
    const result: Array<{ gauge: `0x${string}`; gaugeName: string; bribes: Bribe[] }> = [];

    grouped.forEach((gaugeBribes, gaugeAddress) => {
      const sorted = sortBribesByAmount(gaugeBribes);
      result.push({
        gauge: gaugeAddress,
        gaugeName: gaugeBribes[0]?.gaugeName || 'Unknown',
        bribes: sorted,
      });
    });

    // Sort groups by total bribe amount
    return result.sort((a, b) => {
      const sumA = a.bribes.reduce((sum, bribe) => sum + bribe.amount, 0n);
      const sumB = b.bribes.reduce((sum, bribe) => sum + bribe.amount, 0n);
      if (sumA > sumB) return -1;
      if (sumA < sumB) return 1;
      return 0;
    });
  }, [bribes]);

  // ==================== Filter Bribes ====================

  const filteredBribes = useMemo(() => {
    if (filterTab === 0) {
      // All bribes
      return groupedBribes;
    } else {
      // Claimable only (requires tokenId)
      // In production, filter based on hasClaimed status
      // For now, show all if tokenId exists
      return tokenId ? groupedBribes : [];
    }
  }, [groupedBribes, filterTab, tokenId]);

  // ==================== Handlers ====================

  const handleFilterChange = (_event: React.SyntheticEvent, newValue: number) => {
    setFilterTab(newValue);
  };

  // ==================== Empty State ====================

  if (!isLoading && bribes.length === 0) {
    return (
      <Card
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
          boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Active Bribes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Be the first to create a bribe and incentivize voters!
        </Typography>
      </Card>
    );
  }

  if (!isLoading && filteredBribes.length === 0 && filterTab === 1) {
    return (
      <Card
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
          boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Claimable Bribes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vote for gauges with active bribes to earn rewards!
        </Typography>
      </Card>
    );
  }

  // ==================== Render ====================

  return (
    <Box>
      {/* Filter Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={filterTab}
          onChange={handleFilterChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label="All Bribes" />
          <Tab label="My Claimable" disabled={!tokenId} />
        </Tabs>
      </Box>

      {/* Bribes Table */}
      {filteredBribes.map((group) => (
        <Card
          key={group.gauge}
          sx={{
            mb: 3,
            borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
            boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
            overflow: 'hidden',
          }}
        >
          {/* Gauge Header */}
          <Box
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 87, 34, 0.1) 100%)',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {group.gaugeName}
              </Typography>
              <Chip
                label={`${group.bribes.length} Bribe${group.bribes.length > 1 ? 's' : ''}`}
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>

          {/* Bribes Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Token</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    APR
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Creator
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.bribes.map((bribe) => (
                  <TableRow
                    key={bribe.bribeId.toString()}
                    sx={{
                      '&:hover': {
                        bgcolor: 'rgba(255, 152, 0, 0.05)',
                      },
                    }}
                  >
                    {/* Token */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {bribe.tokenSymbol}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Amount */}
                    <TableCell align="right">
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {parseFloat(bribe.amountFormatted).toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* APR */}
                    <TableCell align="right">
                      <Chip
                        label={bribe.apr || '0%'}
                        size="small"
                        sx={{
                          bgcolor: 'success.main',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>

                    {/* Creator */}
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                      >
                        {bribe.creator.slice(0, 6)}...{bribe.creator.slice(-4)}
                      </Typography>
                    </TableCell>

                    {/* Action */}
                    <TableCell align="right">
                      {tokenId ? (
                        <ClaimBribeButton bribe={bribe} tokenId={tokenId} />
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          disabled
                          sx={{
                            borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_PILL,
                            textTransform: 'none',
                            fontWeight: 600,
                          }}
                        >
                          Connect veNFT
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ))}

      {/* Loading State */}
      {isLoading && (
        <Card
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
            boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Loading bribes...
          </Typography>
        </Card>
      )}
    </Box>
  );
};
