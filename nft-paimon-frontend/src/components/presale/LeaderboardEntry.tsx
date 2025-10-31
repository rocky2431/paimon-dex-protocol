'use client';

import { Box, Typography, Avatar } from '@mui/material';
import { LeaderboardEntry as LeaderboardEntryType } from '@/types/leaderboards';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  scoreLabel: string;
  isCurrentUser?: boolean;
}

/**
 * LeaderboardEntry Component
 * Single entry in a leaderboard list
 *
 * Features:
 * - Rank badge with podium colors (1st/2nd/3rd)
 * - Shortened address display
 * - Score with custom label
 * - Highlight for current user
 * - Material Design 3 warm colors
 */
export function LeaderboardEntry({ entry, scoreLabel, isCurrentUser = false }: LeaderboardEntryProps) {
  const { rank, address, score, displayName } = entry;

  // Get rank badge color (warm palette)
  const getRankColor = () => {
    if (rank === 1) return '#FFD54F'; // Gold
    if (rank === 2) return '#FFB74D'; // Silver (warm amber)
    if (rank === 3) return '#FF8A65'; // Bronze (warm coral)
    return '#9E9E9E'; // Default gray
  };

  // Get rank badge size
  const getRankSize = () => {
    if (rank <= 3) return 40;
    return 32;
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    if (displayName) return displayName;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format score with commas
  const formatScore = (value: number) => {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        borderRadius: 1.5,
        backgroundColor: isCurrentUser ? 'rgba(255, 107, 53, 0.08)' : 'transparent',
        border: isCurrentUser ? '2px solid #FF6B35' : '1px solid transparent',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: isCurrentUser ? 'rgba(255, 107, 53, 0.12)' : 'rgba(255, 107, 53, 0.04)',
        },
      }}
    >
      {/* Rank Badge */}
      <Avatar
        sx={{
          width: getRankSize(),
          height: getRankSize(),
          backgroundColor: getRankColor(),
          color: rank <= 3 ? '#1A1A1A' : '#FFFFFF',
          fontWeight: 800,
          fontSize: rank <= 3 ? '1.125rem' : '1rem',
          boxShadow: rank <= 3 ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
        }}
      >
        {rank}
      </Avatar>

      {/* User Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: isCurrentUser ? 700 : 600,
            color: isCurrentUser ? '#FF6B35' : 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatAddress(address)}
        </Typography>
        {isCurrentUser && (
          <Typography
            variant="caption"
            sx={{
              color: '#FF6B35',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            You
          </Typography>
        )}
      </Box>

      {/* Score */}
      <Box sx={{ textAlign: 'right' }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: rank <= 3 ? getRankColor() : '#FFB74D',
            lineHeight: 1,
          }}
        >
          {formatScore(score)}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          {scoreLabel}
        </Typography>
      </Box>
    </Box>
  );
}
