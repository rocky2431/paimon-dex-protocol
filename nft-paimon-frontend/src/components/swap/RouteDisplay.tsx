'use client';

import { Box, Chip, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import type { Address } from 'viem';
import { DESIGN_TOKENS } from './constants';

/**
 * RouteDisplay Component
 * Visualizes swap routing path (single-hop or multi-hop)
 *
 * Features:
 * - Token chips with arrows
 * - "Direct" badge for single-hop
 * - Hop count for multi-hop routes
 * - Graceful handling of null/invalid routes
 *
 * @param route - Array of token addresses forming the swap route
 * @param tokenMap - Mapping of addresses to token symbols
 */

export interface RouteDisplayProps {
  route: Address[] | null;
  tokenMap: Record<string, string>;
}

export const RouteDisplay: React.FC<RouteDisplayProps> = ({ route, tokenMap }) => {
  // Handle null or empty routes
  if (!route || route.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No route available
        </Typography>
      </Box>
    );
  }

  // Handle invalid single-token route
  if (route.length === 1) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
          backgroundColor: 'rgba(211, 47, 47, 0.1)',
          border: '1px solid rgba(211, 47, 47, 0.3)',
        }}
      >
        <Typography variant="body2" color="error">
          Invalid route
        </Typography>
      </Box>
    );
  }

  // Calculate hop count (route length - 1)
  const hopCount = route.length - 1;
  const isDirect = hopCount === 1;

  /**
   * Format token symbol from address
   * If not found in tokenMap, show abbreviated address
   */
  const getTokenSymbol = (address: Address): string => {
    const symbol = tokenMap[address.toLowerCase()] || tokenMap[address];
    if (symbol) return symbol;

    // Abbreviated address format: 0xABCD…1234
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 2,
        borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        border: '1px solid rgba(76, 175, 80, 0.3)',
      }}
    >
      {/* Route path display */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {route.map((tokenAddress, index) => (
          <Box
            key={`${tokenAddress}-${index}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {/* Token Chip */}
            <Chip
              label={getTokenSymbol(tokenAddress)}
              sx={{
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderRadius: DESIGN_TOKENS.RADIUS_PILL,
              }}
            />

            {/* Arrow (except after last token) */}
            {index < route.length - 1 && (
              <ArrowForward
                sx={{
                  color: 'text.secondary',
                  fontSize: '1rem',
                }}
              />
            )}
          </Box>
        ))}
      </Box>

      {/* Route metadata (Direct badge or hop count) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {isDirect ? (
          <Chip
            label="Direct"
            size="small"
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              color: '#4CAF50',
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: DESIGN_TOKENS.RADIUS_PILL,
            }}
          />
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.75rem' }}
          >
            {hopCount} hops
          </Typography>
        )}
      </Box>
    </Box>
  );
};
