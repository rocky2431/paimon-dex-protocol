/**
 * NitroRewardsCard Component
 * Display user's Nitro pool rewards and participation
 *
 * Features:
 * - Active participations list
 * - Pending rewards per pool
 * - Claim rewards button
 * - Exit pool functionality
 */

'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  useNitroUserStake,
  useNitroPendingRewards,
  useCanExitNitro,
  useClaimNitroRewards,
  useExitNitroPool,
} from '@/hooks/useNitroPool';
import { formatLockDuration } from './constants';
import type { NitroPool } from './types';

interface NitroRewardsCardProps {
  pools: NitroPool[];
  locale?: 'en' | 'zh';
}

interface PoolParticipation {
  poolId: bigint;
  poolName: string;
  stakedAmount: bigint;
  lockDuration: bigint;
  canExit: boolean;
  rewards: {
    token: `0x${string}`;
    amount: bigint;
  }[];
}

export function NitroRewardsCard({ pools, locale = 'en' }: NitroRewardsCardProps) {
  const { address } = useAccount();

  // Get all user participations
  const participations = useMemo(() => {
    if (!pools || !address) return [];

    const result: PoolParticipation[] = [];

    pools.forEach((pool) => {
      // Note: In real implementation, we'd use the hook to fetch data
      // For now, this is a placeholder structure
      result.push({
        poolId: pool.id,
        poolName: pool.name,
        stakedAmount: BigInt(0),
        lockDuration: pool.lockDuration,
        canExit: false,
        rewards: [],
      });
    });

    return result;
  }, [pools, address]);

  if (!address) {
    return (
      <Card sx={{ borderRadius: '24px', border: '1px solid rgba(255,107,0,0.3)' }}>
        <CardContent>
          <Alert severity="info">
            {locale === 'zh' ? '请连接钱包查看您的 Nitro 奖励' : 'Please connect wallet to view your Nitro rewards'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (participations.length === 0) {
    return (
      <Card sx={{ borderRadius: '24px', border: '1px solid rgba(255,107,0,0.3)' }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {locale === 'zh' ? '暂无参与的 Nitro 池' : 'No Active Nitro Participations'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {locale === 'zh' ? '参与 Nitro 池即可开始赚取奖励' : 'Participate in a Nitro pool to start earning rewards'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="nitro-rewards-card"
      sx={{
        borderRadius: '24px',
        border: '1px solid rgba(255,107,0,0.3)',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.05) 0%, rgba(255,180,80,0.05) 100%)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#ff6b00' }}>
            {locale === 'zh' ? '我的 Nitro 奖励' : 'My Nitro Rewards'}
          </Typography>
          <Chip
            label={`${participations.length} ${locale === 'zh' ? '个池' : 'Pools'}`}
            size="small"
            sx={{ bgcolor: 'rgba(255,107,0,0.1)', color: '#ff6b00', fontWeight: 600 }}
          />
        </Box>

        {/* Participations List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {participations.map((participation, index) => (
            <Box key={participation.poolId.toString()}>
              {index > 0 && <Divider sx={{ my: 2 }} />}

              {/* Pool Info */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {participation.poolName}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      {locale === 'zh' ? '已质押' : 'Staked'}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatUnits(participation.stakedAmount, 18)} LP
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      {locale === 'zh' ? '锁定期' : 'Lock Duration'}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatLockDuration(participation.lockDuration)} {locale === 'zh' ? '天' : 'days'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Rewards */}
              {participation.rewards.length > 0 ? (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,107,0,0.05)', borderRadius: '12px' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {locale === 'zh' ? '待领取奖励' : 'Pending Rewards'}
                  </Typography>
                  {participation.rewards.map((reward) => (
                    <Box key={reward.token} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        {reward.token.slice(0, 6)}...{reward.token.slice(-4)}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatUnits(reward.amount, 18)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  {locale === 'zh' ? '暂无待领取奖励' : 'No pending rewards'}
                </Typography>
              )}

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={participation.rewards.length === 0}
                  startIcon={<TrendingUpIcon />}
                  sx={{
                    bgcolor: '#ff6b00',
                    borderRadius: '12px',
                    textTransform: 'none',
                    flex: 1,
                    '&:hover': {
                      bgcolor: '#e65c00',
                    },
                  }}
                >
                  {locale === 'zh' ? '领取奖励' : 'Claim Rewards'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!participation.canExit}
                  startIcon={<ExitToAppIcon />}
                  sx={{
                    borderColor: '#ff6b00',
                    color: '#ff6b00',
                    borderRadius: '12px',
                    textTransform: 'none',
                    flex: 1,
                    '&:hover': {
                      borderColor: '#e65c00',
                      bgcolor: 'rgba(255,107,0,0.05)',
                    },
                  }}
                >
                  {locale === 'zh' ? '退出池' : 'Exit Pool'}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Summary */}
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,107,0,0.2)' }}>
          <Typography variant="caption" color="text.secondary">
            {locale === 'zh'
              ? '定期领取奖励以复利增长。退出池前请确保锁定期已结束。'
              : 'Claim rewards regularly for compound growth. Ensure lock period has ended before exiting pools.'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
