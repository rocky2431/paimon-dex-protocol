'use client';

import { Tabs, Tab, Box } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

export type VoteTabValue = 'vote' | 'rewards' | 'bribes';

interface VoteTabsProps {
  /**
   * The currently active tab
   */
  activeTab: VoteTabValue;
}

/**
 * VoteTabs Component
 * Sub-navigation for governance-related pages
 *
 * Features:
 * - Tab navigation between Vote, Rewards, and Bribes
 * - Material Design 3 styling
 * - Icon indicators for each tab
 * - Active tab highlighting
 */
export function VoteTabs({ activeTab }: VoteTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: VoteTabValue) => {
    // Navigate to corresponding page
    switch (newValue) {
      case 'vote':
        router.push('/vote');
        break;
      case 'rewards':
        router.push('/rewards');
        break;
      case 'bribes':
        router.push('/bribes');
        break;
    }
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 4,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="governance navigation tabs"
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
          },
        }}
      >
        <Tab
          value="vote"
          icon={<HowToVoteIcon />}
          iconPosition="start"
          label="Vote for Gauges"
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 'vote' ? 700 : 600,
            fontSize: '1rem',
            color: activeTab === 'vote' ? 'primary.main' : 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            },
          }}
        />
        <Tab
          value="rewards"
          icon={<CardGiftcardIcon />}
          iconPosition="start"
          label="My Rewards"
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 'rewards' ? 700 : 600,
            fontSize: '1rem',
            color: activeTab === 'rewards' ? 'primary.main' : 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            },
          }}
        />
        <Tab
          value="bribes"
          icon={<LocalOfferIcon />}
          iconPosition="start"
          label="Bribes"
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 'bribes' ? 700 : 600,
            fontSize: '1rem',
            color: activeTab === 'bribes' ? 'primary.main' : 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            },
          }}
        />
      </Tabs>
    </Box>
  );
}
