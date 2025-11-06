'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Alert, CircularProgress } from '@mui/material';
import { useAccount } from 'wagmi';
import { BondCard } from './BondCard';
import { BondData, calculateRarityTier, calculateRemintProgress } from '@/types/bond';

/**
 * BondDashboard Component
 * Main dashboard displaying all user's Bond NFTs
 *
 * Features:
 * - Grid display of all bonds
 * - Auto-load user bonds
 * - Settlement handling
 * - Empty state
 */
export function BondDashboard() {
  const { address, isConnected } = useAccount();
  const [bonds, setBonds] = useState<BondData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      loadUserBonds();
    } else {
      setLoading(false);
      setBonds([]);
    }
  }, [isConnected, address]);

  /**
   * Load all bonds for current user
   * TODO: Replace with actual contract calls
   */
  const loadUserBonds = async () => {
    try {
      setLoading(true);

      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data
      const mockBonds: BondData[] = [
        {
          tokenId: 1,
          principal: 100,
          mintTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          maturityDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          accumulatedRemint: 2.45,
          diceType: 1, // Gold
          diceTypeName: 'Gold Dice',
          weeklyRollsLeft: 3,
          baseYield: 3.5,
          totalYield: 5.95,
          rarityTier: calculateRarityTier(2.45),
          daysUntilMaturity: 60,
          isMatured: false,
          maturityProgress: 33,
          remintProgress: calculateRemintProgress(2.45, calculateRarityTier(2.45)),
        },
        {
          tokenId: 2,
          principal: 100,
          mintTime: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), // 95 days ago
          maturityDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (matured)
          accumulatedRemint: 5.2,
          diceType: 2, // Diamond
          diceTypeName: 'Diamond Dice',
          weeklyRollsLeft: 0,
          baseYield: 4.2,
          totalYield: 9.4,
          rarityTier: calculateRarityTier(5.2),
          daysUntilMaturity: 0,
          isMatured: true,
          maturityProgress: 100,
          remintProgress: calculateRemintProgress(5.2, calculateRarityTier(5.2)),
        },
      ];

      setBonds(mockBonds);
    } catch (error) {
      console.error('Failed to load bonds:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle bond settlement
   */
  const handleSettle = async (tokenId: number, option: 'veNFT' | 'cash') => {
    try {
      // TODO: Call settlement contract
      // Mock success
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Reload bonds
      await loadUserBonds();
    } catch (error) {
      console.error('Settlement failed:', error);
      throw error;
    }
  };

  if (!isConnected) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Bond Dashboard
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          Please connect your wallet to view your Bond NFTs
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={48} sx={{ color: '#FF6B35' }} />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading your bonds...
        </Typography>
      </Box>
    );
  }

  if (bonds.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          No Bonds Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          You don&apos;t have any Bond NFTs yet. Mint your first bond to get started!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          mb: 1,
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
        }}
      >
        Bond Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem' }}>
        Manage your Bond NFTs, track yields, and settle when ready
      </Typography>

      <Grid container spacing={3}>
        {bonds.map((bond) => (
          <Grid item xs={12} sm={6} md={4} key={bond.tokenId}>
            <BondCard bond={bond} onSettle={handleSettle} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
