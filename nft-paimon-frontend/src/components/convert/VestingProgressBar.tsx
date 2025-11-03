/**
 * VestingProgressBar Component
 * 归属进度条组件
 *
 * Displays linear vesting progress over 365 days with Material Design 3 styling
 * 显示 365 天线性归属进度，采用 Material Design 3 样式
 */

import React from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';

export interface VestingProgressBarProps {
  /** Progress percentage (0-100) 归属进度百分比 */
  progress: number;
  /** Remaining days until fully vested 剩余天数 */
  remainingDays: number;
}

/**
 * Linear progress bar for vesting status
 * 线性归属进度条
 *
 * @example
 * ```tsx
 * <VestingProgressBar progress={50} remainingDays={182} />
 * ```
 */
const VestingProgressBar: React.FC<VestingProgressBarProps> = ({
  progress,
  remainingDays,
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE4B5 100%)', // Warm beige gradient
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, color: '#8B4513' }}>
          Vesting Progress
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, color: '#FF6B00' }}>
          {progress}%
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 12,
          borderRadius: 6,
          backgroundColor: '#FFE4B5',
          '& .MuiLinearProgress-bar': {
            borderRadius: 6,
            background: 'linear-gradient(90deg, #FF8C00 0%, #FFD700 100%)', // Warm orange to gold
          },
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" sx={{ color: '#8B4513' }}>
          {remainingDays} days remaining
        </Typography>
        <Typography variant="caption" sx={{ color: '#8B4513' }}>
          365 days total
        </Typography>
      </Box>
    </Paper>
  );
};

export default VestingProgressBar;
