/**
 * Vote Page (V3 - 扁平化架构)
 *
 * 功能: 治理投票统一入口
 * 路由: /vote
 * Tabs: Vote (Gauge投票) | Lock (锁仓veNFT) | Bribes (贿赂市场)
 *
 * 设计理念:
 * - Vote: 流动性激励分配，epoch周期投票
 * - Lock: 锁定PAIMON获得vePAIMON NFT投票权
 * - Bribes: veNFT持有者赚取贿赂收益
 * - 统一治理生态入口
 */

'use client';

import { Container, Typography, Box } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import { VotingCard } from '@/components/voting/VotingCard';
import { VeNFTCard } from '@/components/venft/VeNFTCard';
import { BribesMarketplace } from '@/components/bribes/BribesMarketplace';

export default function VotePage() {
  const [currentTab, setCurrentTab] = useTabState('vote');

  const VOTE_TABS = [
    { value: 'vote', label: 'Vote' },
    { value: 'lock', label: 'Lock' },
    { value: 'bribes', label: 'Bribes' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation />

      {/* Main content area */}
      <Container
        maxWidth="lg"
        sx={{
          pt: 12, // Account for fixed navbar
          pb: 8,
          px: {
            xs: 2,
            sm: 3,
          },
          minHeight: '100vh',
        }}
      >
        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={VOTE_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Vote Tab Content */}
        {currentTab === 'vote' && (
          <>
            <VotingCard />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 4,
                textAlign: 'center',
                fontSize: '0.875rem',
              }}
            >
              Governance Voting • Epoch-based Rewards Distribution
            </Typography>
          </>
        )}

        {/* Lock Tab Content */}
        {currentTab === 'lock' && (
          <>
            <VeNFTCard />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 4,
                textAlign: 'center',
                fontSize: '0.875rem',
              }}
            >
              Vote-Escrowed NFT • Lock PAIMON for Voting Power
            </Typography>
          </>
        )}

        {/* Bribes Tab Content */}
        {currentTab === 'bribes' && <BribesMarketplace />}

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
