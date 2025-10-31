'use client';

import { Box, Typography, Grid, Avatar, LinearProgress } from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Casino as CasinoIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { UserRank, LeaderboardType, LEADERBOARD_CONFIG } from '@/types/leaderboards';

interface UserRankCardProps {
  userRank: UserRank | null;
  loading?: boolean;
}

/**
 * UserRankCard Component
 * Display current user's rank across all leaderboards
 *
 * Features:
 * - 3-column grid showing rank for each leaderboard
 * - Score display with progress indicator
 * - "Not ranked" state for users outside top 100
 * - Material Design 3 warm colors
 */
export function UserRankCard({ userRank, loading = false }: UserRankCardProps) {
  // Format rank display
  const formatRank = (rank: number | null) => {
    if (rank === null) return '-';
    if (rank > 100) return '100+';
    return `#${rank}`;
  };

  // Get rank color
  const getRankColor = (rank: number | null) => {
    if (rank === null || rank > 100) return '#9E9E9E';
    if (rank === 1) return '#FFD54F';
    if (rank === 2) return '#FFB74D';
    if (rank === 3) return '#FF8A65';
    if (rank <= 10) return '#FF6B35';
    return '#FFB74D';
  };

  // Calculate progress to next milestone (mock logic)
  const getProgress = (type: LeaderboardType, score: number) => {
    // Mock milestones
    const milestones = {
      [LeaderboardType.TOP_EARNERS]: [100, 500, 1000, 5000],
      [LeaderboardType.LUCKIEST_ROLLERS]: [10, 15, 18, 20],
      [LeaderboardType.SOCIAL_CHAMPIONS]: [5, 10, 15, 20],
    };

    const targets = milestones[type];
    const nextTarget = targets.find((t) => t > score);

    if (!nextTarget) return 100;

    const prevTarget = targets[targets.indexOf(nextTarget) - 1] || 0;
    const progress = ((score - prevTarget) / (nextTarget - prevTarget)) * 100;

    return Math.min(Math.max(progress, 0), 100);
  };

  // Rank entries
  const rankEntries = [
    {
      type: LeaderboardType.TOP_EARNERS,
      icon: <MoneyIcon />,
      label: 'Top Earners',
    },
    {
      type: LeaderboardType.LUCKIEST_ROLLERS,
      icon: <CasinoIcon />,
      label: 'Luckiest Rollers',
    },
    {
      type: LeaderboardType.SOCIAL_CHAMPIONS,
      icon: <TrophyIcon />,
      label: 'Social Champions',
    },
  ];

  if (!userRank && !loading) {
    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 2,
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <TrendingUpIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Your Rankings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect your wallet to see your rankings
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: 2,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <TrendingUpIcon sx={{ color: '#FF6B35', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Your Rankings
        </Typography>
      </Box>

      {/* Rank Grid */}
      <Grid container spacing={2}>
        {rankEntries.map(({ type, icon, label }) => {
          const rank = userRank?.ranks[type] ?? null;
          const score = userRank?.scores[type] ?? 0;
          const config = LEADERBOARD_CONFIG[type];
          const progress = getProgress(type, score);

          return (
            <Grid item xs={12} sm={4} key={type}>
              <Box
                sx={{
                  backgroundColor: `${config.color}08`,
                  borderRadius: 1.5,
                  p: 2,
                  border: '1px solid',
                  borderColor: `${config.color}30`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: `${config.color}12`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${config.color}20`,
                  },
                }}
              >
                {/* Icon and Label */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Box sx={{ color: config.color, display: 'flex' }}>{icon}</Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                    }}
                  >
                    {label}
                  </Typography>
                </Box>

                {/* Rank Badge */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      color: getRankColor(rank),
                      lineHeight: 1,
                    }}
                  >
                    {formatRank(rank)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 600,
                    }}
                  >
                    Rank
                  </Typography>
                </Box>

                {/* Score */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: config.color,
                    mb: 1,
                  }}
                >
                  {score.toLocaleString()} {config.scoreLabel}
                </Typography>

                {/* Progress Bar */}
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: `${config.color}20`,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: config.color,
                    },
                  }}
                />
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Info Note */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: 'rgba(255, 107, 53, 0.05)',
          borderRadius: 1.5,
          border: '1px solid rgba(255, 107, 53, 0.2)',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          Rankings update in real-time. Complete more social tasks and roll higher to climb the
          leaderboards!
        </Typography>
      </Box>
    </Box>
  );
}
