/**
 * Referral Tab Component
 *
 * Integrated referral system for User Center Tab 6
 *
 * Features:
 * - Referral code generation and display
 * - Invite tracking and statistics
 * - Milestone progress with rewards
 * - Share functionality
 */

'use client';

import { Box, Typography, Alert, Grid, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ReferralCodeDisplay } from '@/components/presale/ReferralCodeDisplay';
import { InviteTracker } from '@/components/presale/InviteTracker';
import { ReferralData } from '@/types/tasks';
import PeopleIcon from '@mui/icons-material/People';
import InfoIcon from '@mui/icons-material/Info';

export function ReferralTab() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);

  // Mock referral data (will be replaced with backend API)
  const [referralData, setReferralData] = useState<ReferralData>({
    code: '',
    inviteCount: 0,
    rewardsEarned: 0,
    milestones: [
      { count: 1, reward: '5 USDC + 1 extra roll', achieved: false },
      { count: 5, reward: '25 USDC + Gold Dice', achieved: false },
      { count: 10, reward: '50 USDC + Diamond Dice', achieved: false },
    ],
  });

  // Load user referral data
  useEffect(() => {
    if (isConnected && address) {
      loadReferralData();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  /**
   * Load referral data from backend
   * TODO: Replace with actual API call
   */
  const loadReferralData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/referrals/${address}/stats`);
      // const data = await response.json();

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock: Generate referral code from address
      if (address) {
        setReferralData(prev => ({
          ...prev,
          code: `${address.slice(2, 8).toUpperCase()}`,
        }));
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate referral code
   */
  const handleGenerateReferralCode = async () => {
    if (!isConnected || !address) {
      return;
    }

    try {
      // TODO: Replace with backend API call
      // const response = await fetch('/api/referrals/generate-code', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ address }),
      // });
      // const { code } = await response.json();

      // Mock: Generate code from address
      const code = `${address.slice(2, 8).toUpperCase()}`;

      setReferralData(prev => ({
        ...prev,
        code,
      }));
    } catch (error) {
      console.error('Failed to generate referral code:', error);
    }
  };

  // Not connected state
  if (!isConnected || !address) {
    return (
      <Alert severity="info" icon={<InfoIcon />}>
        <Typography variant="body1">请先连接钱包以查看推荐系统</Typography>
      </Alert>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          加载中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            推荐系统
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          分享您的推荐码，邀请好友，并为每次成功推荐赚取奖励。追踪您的推荐统计数据。
        </Typography>
      </Box>

      {/* Referral Code and Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ReferralCodeDisplay
            referralData={referralData}
            onGenerateCode={handleGenerateReferralCode}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InviteTracker referralData={referralData} />
        </Grid>
      </Grid>

      {/* How It Works Section */}
      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          推荐系统如何运作？
        </Typography>
        <Box component="ul" sx={{ mt: 2, pl: 2 }}>
          <Typography component="li" variant="body2" color="text.secondary" paragraph>
            <strong>分享您的推荐码：</strong>复制您的唯一推荐码并分享给好友
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" paragraph>
            <strong>好友注册：</strong>好友使用您的推荐码注册 Paimon.dex
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" paragraph>
            <strong>赚取奖励：</strong>每成功推荐一位好友，您将获得 5 USDC 奖励
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>解锁里程碑：</strong>达到推荐人数里程碑，解锁额外奖励和特殊骰子
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
