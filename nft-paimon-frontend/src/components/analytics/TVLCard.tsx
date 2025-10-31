/**
 * TVL Card Component
 * Displays Protocol TVL with breakdown (PSM + DEX)
 * OlympusDAO style with orange gradient
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Skeleton,
  Grid,
  Box,
} from '@mui/material';
import { ProtocolTVL } from './types';
import { formatLargeNumber, ANALYTICS_DESIGN_TOKENS } from './constants';

// ==================== Props ====================

/**
 * TVLCard component props
 */
export interface TVLCardProps {
  /** Protocol TVL data */
  tvl: ProtocolTVL;
  /** Loading state */
  isLoading: boolean;
}

// ==================== Component ====================

/**
 * TVL Card Component
 *
 * Features:
 * - Large TVL number display
 * - Breakdown: PSM Minted + DEX Liquidity
 * - Orange gradient background
 * - Loading skeleton
 * - Responsive design
 *
 * @param props - Component props
 * @returns TVL card component
 */
export const TVLCard: React.FC<TVLCardProps> = ({ tvl, isLoading }) => {
  // ==================== Formatted Data ====================

  const totalTVL = parseFloat(tvl.totalFormatted);
  const psmMinted = parseFloat(tvl.psmMintedFormatted);
  const dexLiquidity = parseFloat(tvl.dexLiquidityFormatted);

  // ==================== Render ====================

  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_CARD,
        boxShadow: ANALYTICS_DESIGN_TOKENS.GLOW_EFFECT,
        color: '#FFFFFF',
        height: '100%',
      }}
    >
      <CardContent sx={{ padding: 3 }}>
        {/* Card Title */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            marginBottom: 2,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Protocol TVL
        </Typography>

        {/* Total TVL */}
        <Box sx={{ marginBottom: 3 }}>
          {isLoading ? (
            <Skeleton
              variant="text"
              width="60%"
              height={80}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}
            />
          ) : (
            <Typography
              variant="h2"
              component="div"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                lineHeight: 1.2,
              }}
            >
              ${formatLargeNumber(totalTVL)}
            </Typography>
          )}
        </Box>

        {/* TVL Breakdown */}
        <Grid container spacing={2}>
          {/* PSM Minted */}
          <Grid item xs={6}>
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_PILL,
                padding: 2,
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontWeight: 600,
                  marginBottom: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                }}
              >
                PSM Minted
              </Typography>
              {isLoading ? (
                <Skeleton
                  variant="text"
                  width="80%"
                  height={32}
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}
                />
              ) : (
                <Typography
                  variant="h5"
                  component="div"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                  }}
                >
                  ${formatLargeNumber(psmMinted)}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* DEX Liquidity */}
          <Grid item xs={6}>
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_PILL,
                padding: 2,
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontWeight: 600,
                  marginBottom: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                }}
              >
                DEX Liquidity
              </Typography>
              {isLoading ? (
                <Skeleton
                  variant="text"
                  width="80%"
                  height={32}
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}
                />
              ) : (
                <Typography
                  variant="h5"
                  component="div"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                  }}
                >
                  ${formatLargeNumber(dexLiquidity)}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Phase 1 Note */}
        {!isLoading && dexLiquidity === 0 && (
          <Typography
            variant="caption"
            component="div"
            sx={{
              marginTop: 2,
              opacity: 0.7,
              fontStyle: 'italic',
            }}
          >
            * DEX liquidity data coming in Phase 2
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== Export ====================

export default TVLCard;
