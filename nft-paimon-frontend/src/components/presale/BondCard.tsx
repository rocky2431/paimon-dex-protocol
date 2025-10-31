'use client';

import { useState } from 'react';
import { Box, Typography, Button, Divider, Grid, Chip } from '@mui/material';
import {
  AccountBalance as CashIcon,
  Lock as LockIcon,
  Casino as DiceIcon,
} from '@mui/icons-material';
import { BondData, DICE_CONFIG, RARITY_COLORS } from '@/types/bond';
import { CountdownTimer } from './CountdownTimer';
import { RemintProgress } from './RemintProgress';

interface BondCardProps {
  bond: BondData;
  onSettle?: (tokenId: number, option: 'veNFT' | 'cash') => Promise<void>;
}

/**
 * BondCard Component
 * Display single Bond NFT with all details
 *
 * Features:
 * - Token ID and rarity tier
 * - Base yield + Remint display
 * - Countdown to maturity
 * - Remint progress bar
 * - Settlement buttons (veNFT / Cash)
 * - Dice info display
 */
export function BondCard({ bond, onSettle }: BondCardProps) {
  const [settling, setSettling] = useState(false);
  const diceConfig = DICE_CONFIG[bond.diceType];
  const tierColor = RARITY_COLORS[bond.rarityTier];

  const handleSettle = async (option: 'veNFT' | 'cash') => {
    if (!onSettle) return;

    setSettling(true);
    try {
      await onSettle(bond.tokenId, option);
    } catch (error) {
      console.error('Settlement failed:', error);
    } finally {
      setSettling(false);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '2px solid',
        borderColor: tierColor,
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${tierColor}40`,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          background: `linear-gradient(135deg, ${tierColor}20 0%, ${tierColor}05 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: tierColor,
            }}
          >
            Bond #{bond.tokenId}
          </Typography>
          <Chip
            label={bond.rarityTier}
            size="small"
            sx={{
              backgroundColor: tierColor,
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Dice Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DiceIcon sx={{ fontSize: 16, color: diceConfig.color }} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            {diceConfig.name} ({bond.weeklyRollsLeft} rolls left)
          </Typography>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: 2 }}>
        {/* Yield Section */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Base Yield
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: '#FFB74D',
                lineHeight: 1,
              }}
            >
              {bond.baseYield.toFixed(2)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
              }}
            >
              USDC
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Total Yield
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: '#FF6B35',
                lineHeight: 1,
              }}
            >
              {bond.totalYield.toFixed(2)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
              }}
            >
              USDC
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Remint Progress */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              mb: 1,
              display: 'block',
            }}
          >
            Remint Progress
          </Typography>
          <RemintProgress
            remintAmount={bond.accumulatedRemint}
            currentTier={bond.rarityTier}
            progress={bond.remintProgress}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Maturity Countdown */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              mb: 1,
              display: 'block',
            }}
          >
            Time to Maturity
          </Typography>
          <CountdownTimer targetDate={bond.maturityDate} />
        </Box>

        {/* Settlement Buttons */}
        {bond.isMatured && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<LockIcon />}
                disabled={settling}
                onClick={() => handleSettle('veNFT')}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  backgroundColor: '#FF6B35',
                  '&:hover': {
                    backgroundColor: '#FF5722',
                  },
                }}
              >
                Settle to veNFT (Lock + Vote)
              </Button>
              <Button
                variant="outlined"
                startIcon={<CashIcon />}
                disabled={settling}
                onClick={() => handleSettle('cash')}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderColor: '#FFB74D',
                  color: '#FFB74D',
                  '&:hover': {
                    borderColor: '#FFA726',
                    backgroundColor: 'rgba(255, 183, 77, 0.08)',
                  },
                }}
              >
                Settle to Cash (USDC)
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
