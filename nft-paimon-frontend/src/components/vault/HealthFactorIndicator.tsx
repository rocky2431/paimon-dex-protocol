/**
 * HealthFactorIndicator Component
 * 健康系数指示器组件
 *
 * Displays the user's vault position health factor with color-coded risk levels
 * 显示用户Vault仓位健康系数并用颜色标识风险等级
 */

import { Box, Typography, LinearProgress, Alert } from "@mui/material";
import { Warning, CheckCircle, Error } from "@mui/icons-material";

interface HealthFactorIndicatorProps {
  healthFactor: bigint | undefined;
  isLoading?: boolean;
}

/**
 * Convert health factor from contract format to decimal
 * Health factor in contract: 1.5 = 1500000 (6 decimals)
 */
function formatHealthFactor(hf: bigint): number {
  return Number(hf) / 1000000;
}

/**
 * Get risk level and color based on health factor
 * - HF >= 1.5: Safe (green)
 * - 1.2 <= HF < 1.5: Warning (orange)
 * - 1.0 <= HF < 1.2: Danger (red)
 * - HF < 1.0: Liquidation (critical red)
 */
function getRiskLevel(hf: number): {
  level: "safe" | "warning" | "danger" | "liquidation";
  color: string;
  icon: React.ReactNode;
  message: string;
} {
  if (hf >= 1.5) {
    return {
      level: "safe",
      color: "#FF6B35", // Warm orange-red (safe)
      icon: <CheckCircle />,
      message: "Position is healthy",
    };
  } else if (hf >= 1.2) {
    return {
      level: "warning",
      color: "#FFA500", // Orange (warning)
      icon: <Warning />,
      message: "Close to liquidation threshold - consider adding collateral",
    };
  } else if (hf >= 1.0) {
    return {
      level: "danger",
      color: "#FF4500", // Red-orange (danger)
      icon: <Warning />,
      message: "High risk of liquidation - add collateral immediately",
    };
  } else {
    return {
      level: "liquidation",
      color: "#DC143C", // Crimson (liquidation)
      icon: <Error />,
      message: "Position can be liquidated - urgent action required!",
    };
  }
}

export function HealthFactorIndicator({
  healthFactor,
  isLoading,
}: HealthFactorIndicatorProps) {
  if (isLoading) {
    return (
      <Box sx={{ width: "100%", p: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Loading health factor...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!healthFactor || healthFactor === BigInt(0)) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No debt position
        </Typography>
      </Box>
    );
  }

  const hf = formatHealthFactor(healthFactor);
  const risk = getRiskLevel(hf);

  // Calculate progress bar value (0-100)
  // Map 0-2 health factor to 0-100 progress
  const progressValue = Math.min((hf / 2) * 100, 100);

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {risk.icon}
          Health Factor
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: risk.color,
          }}
        >
          {hf.toFixed(2)}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progressValue}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: "rgba(255, 107, 53, 0.1)",
          "& .MuiLinearProgress-bar": {
            backgroundColor: risk.color,
            borderRadius: 4,
          },
        }}
      />

      {risk.level !== "safe" && (
        <Alert severity={risk.level === "liquidation" ? "error" : "warning"} sx={{ mt: 2 }}>
          {risk.message}
        </Alert>
      )}

      <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary">
          Liquidation Threshold: 1.0
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Safe Zone: ≥ 1.5
        </Typography>
      </Box>
    </Box>
  );
}
