/**
 * LiquidationRewardsPanel Component
 * Display and claim liquidation rewards by collateral type
 *
 * Features:
 * - Pending rewards by collateral type (USDC, RWA, etc.)
 * - Claim button for each collateral
 * - Total rewards value
 */

'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Redeem as RedeemIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { useAccount, useWriteContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useStabilityPoolPendingGain, useStabilityPoolClaim } from '@/hooks/useStabilityPool';
import { testnet } from '@/config/chains/testnet';

interface LiquidationRewardsPanelProps {
  locale?: 'en' | 'zh';
}

const translations = {
  en: {
    title: 'Liquidation Rewards',
    pendingRewards: 'Pending Rewards',
    claimAll: 'Claim All',
    claim: 'Claim',
    totalValue: 'Total Value',
    noRewards: 'No pending rewards',
    connectWallet: 'Connect wallet to view rewards',
  },
  zh: {
    title: '清算奖励',
    pendingRewards: '待领取奖励',
    claimAll: '全部领取',
    claim: '领取',
    totalValue: '总价值',
    noRewards: '暂无待领取奖励',
    connectWallet: '连接钱包查看奖励',
  },
};

// Mock collateral types - in production, this would come from contract
const COLLATERAL_TYPES = [
  { address: testnet.tokens.usdc, symbol: 'USDC', decimals: 6 },
  { address: testnet.tokens.wbnb, symbol: 'WBNB', decimals: 18 },
  { address: testnet.tokens.usdp, symbol: 'USDP', decimals: 18 },
];

export function LiquidationRewardsPanel({ locale = 'en' }: LiquidationRewardsPanelProps) {
  const t = translations[locale];
  const { address } = useAccount();
  const { writeContract: claim, isPending: isClaimPending } = useStabilityPoolClaim();

  // Read pending gains for each collateral type
  const usdcGain = useStabilityPoolPendingGain(address, COLLATERAL_TYPES[0].address);
  const rwa1Gain = useStabilityPoolPendingGain(address, COLLATERAL_TYPES[1].address);
  const rwa2Gain = useStabilityPoolPendingGain(address, COLLATERAL_TYPES[2].address);

  const rewards = useMemo(() => {
    return [
      {
        collateral: COLLATERAL_TYPES[0],
        amount: usdcGain.data ? Number(formatUnits(usdcGain.data, 6)) : 0,
        isLoading: usdcGain.isLoading,
      },
      {
        collateral: COLLATERAL_TYPES[1],
        amount: rwa1Gain.data ? Number(formatUnits(rwa1Gain.data, 18)) : 0,
        isLoading: rwa1Gain.isLoading,
      },
      {
        collateral: COLLATERAL_TYPES[2],
        amount: rwa2Gain.data ? Number(formatUnits(rwa2Gain.data, 18)) : 0,
        isLoading: rwa2Gain.isLoading,
      },
    ];
  }, [usdcGain.data, rwa1Gain.data, rwa2Gain.data, usdcGain.isLoading, rwa1Gain.isLoading, rwa2Gain.isLoading]);

  const totalRewards = useMemo(() => {
    return rewards.reduce((sum, reward) => sum + reward.amount, 0);
  }, [rewards]);

  const handleClaim = (collateralAddress: `0x${string}`) => {
    if (!address) return;

    claim({
      address: testnet.tokens.stabilityPool,
      abi: [{
        name: 'claimCollateralGain',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'collateral', type: 'address' }],
        outputs: [],
      }],
      functionName: 'claimCollateralGain',
      args: [collateralAddress],
    });
  };

  const handleClaimAll = () => {
    if (!address) return;

    claim({
      address: testnet.tokens.stabilityPool,
      abi: [{
        name: 'claimAllCollateralGains',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
      }],
      functionName: 'claimAllCollateralGains',
      args: [],
    });
  };

  if (!address) {
    return (
      <Card
        sx={{
          backgroundColor: 'rgba(255, 107, 0, 0.05)',
          border: '1px solid rgba(255, 107, 0, 0.2)',
        }}
      >
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            {t.connectWallet}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 107, 0, 0.05)',
        border: '1px solid rgba(255, 107, 0, 0.2)',
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RedeemIcon sx={{ color: '#ff6b00', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff6b00' }}>
              {t.title}
            </Typography>
          </Box>
          {totalRewards > 0 && (
            <Button
              variant="contained"
              size="small"
              onClick={handleClaimAll}
              disabled={isClaimPending}
              sx={{
                backgroundColor: '#ff6b00',
                '&:hover': {
                  backgroundColor: '#e66100',
                },
              }}
            >
              {isClaimPending ? <CircularProgress size={20} /> : t.claimAll}
            </Button>
          )}
        </Box>

        {/* Total Value */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t.totalValue}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            ${totalRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Rewards List */}
        {totalRewards === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            {t.noRewards}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {rewards.map((reward, index) => (
              <Grid item xs={12} key={index}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 1,
                    border: '1px solid rgba(255, 107, 0, 0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon sx={{ color: '#ff6b00' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {reward.collateral.symbol}
                      </Typography>
                      {reward.isLoading ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {reward.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleClaim(reward.collateral.address)}
                    disabled={reward.amount === 0 || isClaimPending}
                    sx={{
                      borderColor: '#ff6b00',
                      color: '#ff6b00',
                      '&:hover': {
                        borderColor: '#e66100',
                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                      },
                    }}
                  >
                    {t.claim}
                  </Button>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
