/**
 * SavingRateCard Component
 * Displays SavingRate contract funding status and annual rate
 * Material Design 3 with warm color gradient (orange/red)
 */

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Skeleton,
  Grid,
  Box,
  Chip,
} from "@mui/material";
import { formatUnits } from "viem";
import {
  formatLargeNumber,
  ANALYTICS_DESIGN_TOKENS,
} from "@/components/analytics/constants";

// ==================== Types ====================

export interface SavingRateStats {
  totalFunded?: bigint;
  annualRate?: bigint;
  lastRateUpdateTime?: bigint;
  weekStartRate?: bigint;
}

export interface SavingRateCardProps {
  /** SavingRate statistics */
  stats: SavingRateStats;
  /** Loading state */
  isLoading: boolean;
}

type PoolHealthStatus = "healthy" | "warning" | "critical" | "no-funds";

// ==================== Helper Functions ====================

/**
 * Format annual rate from basis points to percentage
 * @param rateBps - Rate in basis points (e.g., 200 = 2%)
 * @returns Formatted percentage string
 */
const formatAnnualRate = (rateBps: bigint | undefined): string => {
  if (rateBps === undefined) return "0.00%";
  const rate = Number(rateBps) / 100; // Convert bps to percentage
  return `${rate.toFixed(2)}%`;
};

/**
 * Format timestamp to readable date
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date string
 */
const formatTimestamp = (timestamp: bigint | undefined): string => {
  if (timestamp === undefined) return "N/A";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Determine pool health status based on total funded amount
 * @param totalFunded - Total funded amount in USDP (18 decimals)
 * @returns Pool health status
 */
const determinePoolHealth = (
  totalFunded: bigint | undefined
): PoolHealthStatus => {
  if (totalFunded === undefined || totalFunded === 0n) {
    return "no-funds";
  }

  const fundedAmount = Number(formatUnits(totalFunded, 18));

  if (fundedAmount >= 50_000) {
    return "healthy";
  } else if (fundedAmount >= 10_000) {
    return "warning";
  } else {
    return "critical";
  }
};

/**
 * Get pool health display info
 * @param status - Pool health status
 * @returns Display text and color
 */
const getPoolHealthInfo = (
  status: PoolHealthStatus
): { text: string; color: string } => {
  switch (status) {
    case "healthy":
      return { text: "Healthy", color: "#4CAF50" }; // Green
    case "warning":
      return { text: "Warning", color: "#FF9800" }; // Orange
    case "critical":
      return { text: "Critical", color: "#F44336" }; // Red
    case "no-funds":
      return { text: "No Funds", color: "#757575" }; // Gray
  }
};

// ==================== Component ====================

/**
 * SavingRateCard Component
 *
 * Features:
 * - Display annual interest rate (APR)
 * - Show total funded amount
 * - Pool health status indicator
 * - Last update timestamp
 * - Loading skeleton
 * - Warm color gradient (orange/red)
 * - Responsive design
 *
 * @param props - Component props
 * @returns SavingRateCard component
 */
export const SavingRateCard: React.FC<SavingRateCardProps> = ({
  stats,
  isLoading,
}) => {
  // ==================== Formatted Data ====================

  const annualRateFormatted = formatAnnualRate(stats.annualRate);
  const totalFundedValue = stats.totalFunded
    ? Number(formatUnits(stats.totalFunded, 18))
    : 0;
  const totalFundedFormatted = formatLargeNumber(totalFundedValue);
  const lastUpdateFormatted = formatTimestamp(stats.lastRateUpdateTime);
  const poolHealth = determinePoolHealth(stats.totalFunded);
  const poolHealthInfo = getPoolHealthInfo(poolHealth);

  // ==================== Render ====================

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #FF6F00 0%, #D84315 100%)", // Orange to deep orange gradient
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
          Saving Rate
        </Typography>

        {/* Annual Rate */}
        {isLoading ? (
          <Skeleton
            data-testid="skeleton-rate"
            variant="text"
            width="60%"
            height={60}
            sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }}
          />
        ) : (
          <Typography
            variant="h3"
            component="div"
            sx={{
              fontWeight: 900,
              marginBottom: 2,
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            {annualRateFormatted}
          </Typography>
        )}

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
          Annual Interest Rate
        </Typography>

        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ marginBottom: 2 }}>
          {/* Total Funded */}
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.8,
                  marginBottom: 0.5,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                }}
              >
                Total Funded
              </Typography>
              {isLoading ? (
                <Skeleton
                  data-testid="skeleton-funded"
                  variant="text"
                  width="80%"
                  sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }}
                />
              ) : (
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  ${totalFundedFormatted}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Pool Status */}
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.8,
                  marginBottom: 0.5,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                }}
              >
                Pool Status
              </Typography>
              {isLoading ? (
                <Skeleton
                  data-testid="skeleton-status"
                  variant="rectangular"
                  width="80px"
                  height="24px"
                  sx={{
                    borderRadius: "12px",
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                  }}
                />
              ) : (
                <Chip
                  label={poolHealthInfo.text}
                  size="small"
                  sx={{
                    bgcolor: poolHealthInfo.color,
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    height: "24px",
                  }}
                />
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Last Update */}
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
            Last Rate Update
          </Typography>
          {isLoading ? (
            <Skeleton
              data-testid="skeleton-update"
              variant="text"
              width="60%"
              sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }}
            />
          ) : (
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
              }}
            >
              {lastUpdateFormatted}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
