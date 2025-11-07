/**
 * Governance Hub (V3 - 治理中心)
 *
 * 功能: vePAIMON 治理全流程管理
 * 路由: /governance
 * Tabs: Vote | Lock | Bribes | Rewards
 *
 * 设计理念:
 * - Vote: Gauge 投票分配 Emission
 * - Lock: 锁仓 PAIMON → 获得 vePAIMON NFT
 * - Bribes: Bribe 市场 + 提交/领取
 * - Rewards: 所有奖励聚合 (Gauge + Bribe + Boost)
 * - 侧栏固定: Epoch Countdown, veNFT 状态, Emission 分配图
 */

'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Alert, Chip, LinearProgress } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import { useAccount } from 'wagmi';

// Vote Tab components
import { VotingCard } from '@/components/voting/VotingCard';

// Bribes Tab components
import { BribesList } from '@/components/bribes/BribesList';

// Rewards Tab components
import { RewardsDashboard } from '@/components/rewards/RewardsDashboard';
import { VestingProgressBar, ClaimVestedButton } from '@/components/convert';
import { BoostStakingCard, BoostCalculator, BoostHistory } from '@/components/boost';
import { useVestingPosition } from '@/hooks/useVestingPosition';

export default function GovernanceHub() {
  const { address, isConnected } = useAccount();
  const [currentTab, setCurrentTab] = useTabState('vote');

  const GOVERNANCE_TABS = [
    { value: 'vote', label: 'Vote' },
    { value: 'lock', label: 'Lock' },
    { value: 'bribes', label: 'Bribes' },
    { value: 'rewards', label: 'Rewards' },
  ];

  // Vesting data for Rewards tab
  const vestingPosition = useVestingPosition(address);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />

      <Container maxWidth="xl" sx={{ pt: 12, pb: 8, px: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#ff6b00',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            Governance Hub
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              maxWidth: 700,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            Lock PAIMON, vote for gauges, earn bribes and rewards
          </Typography>
        </Box>

        {/* Epoch & Emission Overview */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Next Epoch</Typography>
                <Typography variant="h5" fontWeight={700}>0d 0h 0m</Typography>
                <LinearProgress variant="determinate" value={0} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Weekly Emission</Typography>
                <Typography variant="h5" fontWeight={700}>0 PAIMON</Typography>
                <Typography variant="caption" color="text.disabled">4 channels</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total vePAIMON</Typography>
                <Typography variant="h5" fontWeight={700}>0</Typography>
                <Chip label="Locked PAIMON" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Your Voting Power</Typography>
                <Typography variant="h5" fontWeight={700} color="primary">0</Typography>
                <Typography variant="caption" color="text.disabled">0.00% of total</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={GOVERNANCE_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Vote Tab */}
        {currentTab === 'vote' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Gauge Voting - Direct Emission
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Use your vePAIMON voting power to direct weekly PAIMON emission to liquidity gauges
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <VotingCard />
              </Grid>
            </Grid>

            {/* Emission Breakdown */}
            <Card sx={{ mt: 4, backgroundColor: 'rgba(255, 152, 0, 0.05)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 2 }}>
                  Weekly Emission Distribution (4 Channels)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="40%" color="success" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>Gauge Voting</Typography>
                      <Typography variant="caption" color="text.secondary">LP Staking Rewards</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="25%" color="warning" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>veNFT Incentives</Typography>
                      <Typography variant="caption" color="text.secondary">Lock + Vote Rewards</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="20%" color="error" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>Debt Mining</Typography>
                      <Typography variant="caption" color="text.secondary">Vault Borrowers</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="15%" color="info" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>Stability Pool</Typography>
                      <Typography variant="caption" color="text.secondary">Liquidation Support</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {!isConnected && (
              <Alert severity="info" sx={{ mt: 4 }}>
                Connect your wallet to vote for gauges
              </Alert>
            )}
          </>
        )}

        {/* Lock Tab */}
        {currentTab === 'lock' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Lock PAIMON - Get vePAIMON NFT
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Lock PAIMON for 1 week to 4 years and receive non-transferable vePAIMON NFT
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#ff6b00' }}>
                      Lock PAIMON
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Lock PAIMON tokens for 1 week to 4 years and receive vePAIMON NFT with governance voting power.
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Lock component coming soon. Connect wallet to lock PAIMON and receive vePAIMON NFT.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#ff6b00' }}>
                      Your veNFTs
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      View and manage your vePAIMON NFT positions. Each NFT represents locked PAIMON with voting power.
                    </Typography>
                    <Alert severity="info">
                      No veNFTs found. Lock PAIMON to receive your first vePAIMON NFT.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 4 }}>
              vePAIMON NFT is non-transferable and voting power decays linearly over time
            </Alert>
          </>
        )}

        {/* Bribes Tab */}
        {currentTab === 'bribes' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Bribe Marketplace - Incentivize Votes
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Submit bribes to attract votes or claim bribes from gauges you voted for
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <BribesList bribes={[]} tokenId={undefined} isLoading={false} />
              </Grid>
            </Grid>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 4 }}>
              Bribes are distributed proportionally to voters each epoch
            </Alert>
          </>
        )}

        {/* Rewards Tab */}
        {currentTab === 'rewards' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Rewards Management - Claim All
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Claim gauge rewards, bribes, esPAIMON vesting, and boost rewards
              </Typography>
            </Box>

            {/* Rewards Dashboard */}
            <Box sx={{ mb: 6 }}>
              <RewardsDashboard />
            </Box>

            {/* esPAIMON Vesting Section */}
            <Box sx={{ mb: 6 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#8B4513' }}>
                esPAIMON Vesting
              </Typography>

              {vestingPosition.totalVested === 0n && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  No esPAIMON vesting position yet. Enable vesting in Rewards settings.
                </Alert>
              )}

              <VestingProgressBar
                progress={vestingPosition.vestingProgress}
                remainingDays={vestingPosition.remainingDays}
              />

              <Box sx={{ mt: 3 }}>
                <ClaimVestedButton claimableAmount={vestingPosition.claimable || 0n} />
              </Box>
            </Box>

            {/* Boost Staking Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#D2691E' }}>
                Boost Staking
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                  <BoostStakingCard />
                </Grid>
                <Grid item xs={12} lg={6}>
                  <BoostCalculator userBalance="0" currentMultiplier={10000} />
                </Grid>
                <Grid item xs={12}>
                  <BoostHistory entries={[]} />
                </Grid>
              </Grid>
            </Box>
          </>
        )}

        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
