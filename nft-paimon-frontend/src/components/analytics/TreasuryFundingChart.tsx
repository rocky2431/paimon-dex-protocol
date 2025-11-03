/**
 * TreasuryFundingChart Component
 * Displays SavingRate funding status visualization
 *
 * Phase 1: Current status display (no historical data)
 * Phase 2 TODO: Add historical trending via The Graph event indexing
 */

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Skeleton,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { formatUnits } from "viem";
import {
  formatLargeNumber,
  ANALYTICS_DESIGN_TOKENS,
} from "./constants";

// ==================== Types ====================

export interface FundingStats {
  totalFunded?: bigint;
  annualRate?: bigint;
}

export interface TreasuryFundingChartProps {
  /** Funding statistics */
  stats: FundingStats;
  /** Loading state */
  isLoading: boolean;
}

// ==================== Helper Functions ====================

/**
 * Calculate funding health percentage (0-100%)
 * Based on: >100K = 100%, <10K = 0%
 */
const calculateFundingHealth = (totalFunded: bigint | undefined): number => {
  if (!totalFunded) return 0;

  const fundedAmount = Number(formatUnits(totalFunded, 18));
  const MAX_HEALTHY = 100_000; // $100K = 100%
  const MIN_CRITICAL = 10_000; // $10K = 0%

  if (fundedAmount >= MAX_HEALTHY) return 100;
  if (fundedAmount <= MIN_CRITICAL) return 0;

  // Linear interpolation between min and max
  return ((fundedAmount - MIN_CRITICAL) / (MAX_HEALTHY - MIN_CRITICAL)) * 100;
};

/**
 * Get health color based on percentage
 */
const getHealthColor = (percentage: number): string => {
  if (percentage >= 70) return "#4CAF50"; // Green
  if (percentage >= 40) return "#FF9800"; // Orange
  return "#F44336"; // Red
};

// ==================== Component ====================

/**
 * TreasuryFundingChart Component
 *
 * Phase 1 Features:
 * - Current funding amount
 * - Funding health bar
 * - Annual rate display
 * - Warm color gradient
 *
 * Phase 2 TODO:
 * - Historical funding trend chart (via The Graph)
 * - Rate change history
 * - Weekly funding flow
 *
 * @param props - Component props
 * @returns TreasuryFundingChart component
 */
export const TreasuryFundingChart: React.FC<TreasuryFundingChartProps> = ({
  stats,
  isLoading,
}) => {
  const t = useTranslations();

  // ==================== Formatted Data ====================

  const totalFundedValue = stats.totalFunded
    ? Number(formatUnits(stats.totalFunded, 18))
    : 0;
  const totalFundedFormatted = formatLargeNumber(totalFundedValue);
  const annualRateBps = stats.annualRate ? Number(stats.annualRate) : 0;
  const annualRatePercent = (annualRateBps / 100).toFixed(2);
  const fundingHealth = calculateFundingHealth(stats.totalFunded);
  const healthColor = getHealthColor(fundingHealth);

  // ==================== Render ====================

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #FFA726 0%, #FF7043 100%)", // Orange gradient
        borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_CARD,
        boxShadow: ANALYTICS_DESIGN_TOKENS.GLOW_EFFECT,
        color: "#FFFFFF",
        height: "100%",
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
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Treasury Funding
        </Typography>

        {/* Total Funded Amount */}
        {isLoading ? (
          <Skeleton
            variant="text"
            width="60%"
            height={60}
            sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }}
          />
        ) : (
          <>
            <Typography
              variant="h3"
              component="div"
              sx={{
                fontWeight: 900,
                marginBottom: 1,
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              }}
            >
              ${totalFundedFormatted}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                marginBottom: 3,
                textTransform: "uppercase",
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
              }}
            >
              Total Funded
            </Typography>
          </>
        )}

        {/* Funding Health Bar */}
        <Box sx={{ marginBottom: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                fontSize: "0.75rem",
                textTransform: "uppercase",
              }}
            >
              Funding Health
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {fundingHealth.toFixed(0)}%
            </Typography>
          </Box>
          {isLoading ? (
            <Skeleton
              variant="rectangular"
              height={8}
              sx={{
                borderRadius: "4px",
                bgcolor: "rgba(255, 255, 255, 0.2)",
              }}
            />
          ) : (
            <LinearProgress
              variant="determinate"
              value={fundingHealth}
              sx={{
                height: 8,
                borderRadius: "4px",
                bgcolor: "rgba(255, 255, 255, 0.2)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: healthColor,
                  borderRadius: "4px",
                },
              }}
            />
          )}
        </Box>

        {/* Current Annual Rate */}
        <Box
          sx={{
            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            paddingTop: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              opacity: 0.8,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              marginBottom: 0.5,
            }}
          >
            Current Annual Rate
          </Typography>
          {isLoading ? (
            <Skeleton
              variant="text"
              width="40%"
              sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }}
            />
          ) : (
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
              }}
            >
              {annualRatePercent}%
            </Typography>
          )}
        </Box>

        {/* Phase 2 TODO */}
        <Box
          sx={{
            marginTop: 3,
            padding: 2,
            borderRadius: "12px",
            bgcolor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              fontSize: "0.7rem",
            }}
          >
            📊 Phase 2: Historical trending chart (via The Graph event indexing)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
