'use client';

import { Box, Card, CardContent, Typography, Divider } from '@mui/material';
import { useTranslations } from 'next-intl';
import { formatUnits } from 'viem';
import { REWARDS_DESIGN_TOKENS } from './constants';
import { calculateActualReward } from '@/hooks/useRewardDistributor';

interface RewardBreakdownProps {
  baseReward: bigint;
  boostMultiplier: bigint;
  useEsVesting: boolean;
}

/**
 * RewardBreakdown Component
 * Displays reward calculation breakdown with boost multiplier
 * 显示奖励计算明细（含Boost乘数）
 *
 * Features:
 * - Base reward amount
 * - Boost multiplier (from BoostStaking)
 * - Actual reward (base × boost)
 * - Vesting mode indicator
 * - Formula display
 */
export const RewardBreakdown: React.FC<RewardBreakdownProps> = ({
  baseReward,
  boostMultiplier,
  useEsVesting,
}) => {
  const t = useTranslations();

  const actualReward = calculateActualReward(baseReward, boostMultiplier);
  const boostPercentage = Number(boostMultiplier) / 100 - 100; // Convert basis points to percentage

  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, rgba(18, 18, 18, 0.6), rgba(18, 18, 18, 0.8))',
        borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
        border: '1px solid rgba(255, 152, 0, 0.1)',
        boxShadow: REWARDS_DESIGN_TOKENS.SHADOW_CARD,
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800', mb: 2 }}>
          {t('rewards.breakdown.title')}
        </Typography>

        {/* Base reward */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('rewards.breakdown.base')}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#ffa726' }}>
            {formatUnits(baseReward, 18)} PAIMON
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Boost multiplier */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('rewards.breakdown.boost')}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#ff9800' }}>
            {boostPercentage > 0 ? `+${boostPercentage}%` : '0%'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('rewards.breakdown.boost.source')} BoostStaking
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Actual reward */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('rewards.breakdown.actual')}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00' }}>
            {formatUnits(actualReward, 18)} {useEsVesting ? 'esPAIMON' : 'PAIMON'}
          </Typography>
        </Box>

        {/* Formula */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(255, 152, 0, 0.05)', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {t('rewards.breakdown.formula')}
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#ffa726' }}>
            {formatUnits(actualReward, 18)} = {formatUnits(baseReward, 18)} × {Number(boostMultiplier) / 10000}
          </Typography>
        </Box>

        {/* Vesting note */}
        {useEsVesting && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 152, 0, 0.05)', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              💡 {t('rewards.breakdown.vesting.note')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
