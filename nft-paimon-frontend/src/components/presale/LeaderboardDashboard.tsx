'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Tabs, Tab, Alert, CircularProgress } from '@mui/material';
import { useAccount } from 'wagmi';
import { LeaderboardCard } from './LeaderboardCard';
import { UserRankCard } from './UserRankCard';
import {
  LeaderboardData,
  LeaderboardType,
  UserRank,
  LEADERBOARD_CONFIG,
} from '@/types/leaderboards';

/**
 * LeaderboardDashboard Component
 * Main dashboard for all leaderboards
 *
 * Features:
 * - Tab navigation for 3 leaderboard types
 * - User rank summary card
 * - Top 10 display for each leaderboard
 * - Real-time updates from blockchain
 * - Material Design 3 warm colors
 */
export function LeaderboardDashboard() {
  const { address, isConnected } = useAccount();
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<UserRank | null>(null);

  // Leaderboard data state
  const [leaderboards, setLeaderboards] = useState<Record<LeaderboardType, LeaderboardData>>({
    [LeaderboardType.TOP_EARNERS]: {
      type: LeaderboardType.TOP_EARNERS,
      title: LEADERBOARD_CONFIG[LeaderboardType.TOP_EARNERS].title,
      description: LEADERBOARD_CONFIG[LeaderboardType.TOP_EARNERS].description,
      scoreLabel: LEADERBOARD_CONFIG[LeaderboardType.TOP_EARNERS].scoreLabel,
      icon: LEADERBOARD_CONFIG[LeaderboardType.TOP_EARNERS].icon,
      entries: [],
      totalEntries: 0,
      lastUpdated: Date.now(),
    },
    [LeaderboardType.LUCKIEST_ROLLERS]: {
      type: LeaderboardType.LUCKIEST_ROLLERS,
      title: LEADERBOARD_CONFIG[LeaderboardType.LUCKIEST_ROLLERS].title,
      description: LEADERBOARD_CONFIG[LeaderboardType.LUCKIEST_ROLLERS].description,
      scoreLabel: LEADERBOARD_CONFIG[LeaderboardType.LUCKIEST_ROLLERS].scoreLabel,
      icon: LEADERBOARD_CONFIG[LeaderboardType.LUCKIEST_ROLLERS].icon,
      entries: [],
      totalEntries: 0,
      lastUpdated: Date.now(),
    },
    [LeaderboardType.SOCIAL_CHAMPIONS]: {
      type: LeaderboardType.SOCIAL_CHAMPIONS,
      title: LEADERBOARD_CONFIG[LeaderboardType.SOCIAL_CHAMPIONS].title,
      description: LEADERBOARD_CONFIG[LeaderboardType.SOCIAL_CHAMPIONS].description,
      scoreLabel: LEADERBOARD_CONFIG[LeaderboardType.SOCIAL_CHAMPIONS].scoreLabel,
      icon: LEADERBOARD_CONFIG[LeaderboardType.SOCIAL_CHAMPIONS].icon,
      entries: [],
      totalEntries: 0,
      lastUpdated: Date.now(),
    },
  });

  // Load leaderboard data on mount
  useEffect(() => {
    loadLeaderboardData();
  }, []);

  // Load user rank when address changes
  useEffect(() => {
    if (isConnected && address) {
      loadUserRank();
    } else {
      setUserRank(null);
    }
  }, [isConnected, address]);

  /**
   * Load all leaderboard data from blockchain
   * TODO: Integrate with RemintController contract
   */
  const loadLeaderboardData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual contract calls
      // const contract = getRemintControllerContract();
      // const topEarners = await contract.getLeaderboard(LeaderboardType.TOP_EARNERS, 10);
      // const luckiestRollers = await contract.getLeaderboard(LeaderboardType.LUCKIEST_ROLLERS, 10);
      // const socialChampions = await contract.getLeaderboard(LeaderboardType.SOCIAL_CHAMPIONS, 10);

      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data for demonstration
      const mockLeaderboards = {
        [LeaderboardType.TOP_EARNERS]: {
          ...leaderboards[LeaderboardType.TOP_EARNERS],
          entries: generateMockEntries(10, LeaderboardType.TOP_EARNERS),
          totalEntries: 47,
          lastUpdated: Date.now(),
        },
        [LeaderboardType.LUCKIEST_ROLLERS]: {
          ...leaderboards[LeaderboardType.LUCKIEST_ROLLERS],
          entries: generateMockEntries(10, LeaderboardType.LUCKIEST_ROLLERS),
          totalEntries: 52,
          lastUpdated: Date.now(),
        },
        [LeaderboardType.SOCIAL_CHAMPIONS]: {
          ...leaderboards[LeaderboardType.SOCIAL_CHAMPIONS],
          entries: generateMockEntries(10, LeaderboardType.SOCIAL_CHAMPIONS),
          totalEntries: 38,
          lastUpdated: Date.now(),
        },
      };

      setLeaderboards(mockLeaderboards);
    } catch (error) {
      console.error('Failed to load leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load user's rank across all leaderboards
   * TODO: Integrate with RemintController contract
   */
  const loadUserRank = async () => {
    if (!address) return;

    try {
      // TODO: Replace with actual contract calls
      // const contract = getRemintControllerContract();
      // const userTokenId = await getUserTokenId(address);
      // const diceData = await contract.getDiceData(userTokenId);
      // const tasksCompleted = await contract.getTasksCompleted(userTokenId);

      // Mock data
      const mockUserRank: UserRank = {
        address: address,
        tokenId: 123,
        ranks: {
          [LeaderboardType.TOP_EARNERS]: 15,
          [LeaderboardType.LUCKIEST_ROLLERS]: 8,
          [LeaderboardType.SOCIAL_CHAMPIONS]: 5,
        },
        scores: {
          [LeaderboardType.TOP_EARNERS]: 234.56,
          [LeaderboardType.LUCKIEST_ROLLERS]: 17,
          [LeaderboardType.SOCIAL_CHAMPIONS]: 12,
        },
      };

      setUserRank(mockUserRank);
    } catch (error) {
      console.error('Failed to load user rank:', error);
    }
  };

  /**
   * Generate mock leaderboard entries
   * TODO: Remove after contract integration
   */
  const generateMockEntries = (count: number, type: LeaderboardType) => {
    const mockAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
      '0x9876543210987654321098765432109876543210',
      '0xFEDCBA0987654321FEDCBA0987654321FEDCBA09',
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444',
      '0x5555555555555555555555555555555555555555',
      '0x6666666666666666666666666666666666666666',
    ];

    const getScore = (rank: number) => {
      if (type === LeaderboardType.TOP_EARNERS) {
        return Math.max(1000 - rank * 80, 50);
      } else if (type === LeaderboardType.LUCKIEST_ROLLERS) {
        return Math.max(20 - rank * 1, 8);
      } else {
        return Math.max(20 - rank * 1, 3);
      }
    };

    return Array.from({ length: count }, (_, i) => ({
      rank: i + 1,
      address: mockAddresses[i] || `0x${Math.random().toString(16).slice(2, 42)}`,
      tokenId: i + 1,
      score: getScore(i + 1),
    }));
  };

  // Tab labels
  const tabLabels = [
    LEADERBOARD_CONFIG[LeaderboardType.TOP_EARNERS].title,
    LEADERBOARD_CONFIG[LeaderboardType.LUCKIEST_ROLLERS].title,
    LEADERBOARD_CONFIG[LeaderboardType.SOCIAL_CHAMPIONS].title,
  ];

  // Current leaderboard
  const currentLeaderboard = leaderboards[selectedTab as LeaderboardType];

  return (
    <Box>
      {/* Header */}
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          mb: 1,
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
        }}
      >
        Leaderboards
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem' }}>
        Compete with other bond holders to climb the rankings and earn prestige
      </Typography>

      {/* User Rank Summary */}
      <Box sx={{ mb: 4 }}>
        <UserRankCard userRank={userRank} loading={loading && isConnected} />
      </Box>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{
          mb: 4,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            minHeight: 56,
          },
          '& .Mui-selected': {
            color: '#FF6B35',
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#FF6B35',
            height: 3,
          },
        }}
      >
        {tabLabels.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {/* Leaderboard Display */}
      {!isConnected && (
        <Alert severity="info" sx={{ mb: 4 }}>
          Connect your wallet to see your position in the leaderboards
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <LeaderboardCard
            data={currentLeaderboard}
            loading={loading}
            currentUserAddress={address}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
