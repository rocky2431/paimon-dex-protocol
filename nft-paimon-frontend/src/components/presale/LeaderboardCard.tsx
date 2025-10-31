'use client';

import { Box, Typography, Divider, CircularProgress } from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Casino as CasinoIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { LeaderboardData, LeaderboardType, LEADERBOARD_CONFIG } from '@/types/leaderboards';
import { LeaderboardEntry } from './LeaderboardEntry';

interface LeaderboardCardProps {
  data: LeaderboardData;
  loading?: boolean;
  currentUserAddress?: string;
}

/**
 * LeaderboardCard Component
 * Display a single leaderboard with top 10 entries
 *
 * Features:
 * - Header with icon and title
 * - Top 10 entries list
 * - Current user highlighting
 * - Loading state with skeleton
 * - Material Design 3 warm colors
 */
export function LeaderboardCard({ data, loading = false, currentUserAddress }: LeaderboardCardProps) {
  const config = LEADERBOARD_CONFIG[data.type];

  // Get icon component
  const getIcon = () => {
    switch (data.type) {
      case LeaderboardType.TOP_EARNERS:
        return <MoneyIcon sx={{ fontSize: 32, color: config.color }} />;
      case LeaderboardType.LUCKIEST_ROLLERS:
        return <CasinoIcon sx={{ fontSize: 32, color: config.color }} />;
      case LeaderboardType.SOCIAL_CHAMPIONS:
        return <TrophyIcon sx={{ fontSize: 32, color: config.color }} />;
    }
  };

  // Format timestamp
  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          backgroundColor: `${config.color}10`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          {getIcon()}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: config.color,
            }}
          >
            {config.title}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 1,
          }}
        >
          {config.description}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
          }}
        >
          Last updated: {formatLastUpdated(data.lastUpdated)}
        </Typography>
      </Box>

      {/* Entries List */}
      <Box sx={{ p: 2 }}>
        {loading ? (
          // Loading state
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} sx={{ color: config.color }} />
          </Box>
        ) : data.entries.length === 0 ? (
          // Empty state
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <TrophyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No entries yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Be the first to claim a spot!
            </Typography>
          </Box>
        ) : (
          // Entries
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {data.entries.map((entry, index) => (
              <Box key={entry.address}>
                <LeaderboardEntry
                  entry={entry}
                  scoreLabel={config.scoreLabel}
                  isCurrentUser={
                    currentUserAddress
                      ? entry.address.toLowerCase() === currentUserAddress.toLowerCase()
                      : false
                  }
                />
                {/* Divider after top 3 */}
                {index === 2 && data.entries.length > 3 && (
                  <Divider sx={{ my: 1, borderColor: 'rgba(255, 107, 53, 0.1)' }} />
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Total entries count */}
        {!loading && data.entries.length > 0 && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
              }}
            >
              Showing top {data.entries.length} of {data.totalEntries} entries
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
