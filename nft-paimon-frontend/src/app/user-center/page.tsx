/**
 * User Center Page
 *
 * Route: /user-center
 * Tabs: Overview | Positions | Rewards | KYC | Tasks | Referral
 *
 * Design Philosophy:
 * - Unified Entry: Single entry point for all user-related features
 * - Tab Navigation: Smooth tab switching with URL synchronization
 * - Progressive Enhancement: Phase 1 (placeholders) → Phase 2 (full features)
 *
 * Phase 1 (Task 29): Layout + placeholders
 * Phase 2 (Task 30-35): Migrate actual content from Portfolio Hub, KYC, etc.
 */

'use client';

import { Container, Typography, Box } from '@mui/material';
import { useAccount } from 'wagmi';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import {
  OverviewTab,
  PositionsTab,
  RewardsTab,
  KYCTab,
  TasksTab,
  ReferralTab,
} from './components';

/**
 * User Center Tabs Definition
 */
const USER_CENTER_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'positions', label: 'Positions' },
  { value: 'rewards', label: 'Rewards' },
  { value: 'kyc', label: 'KYC' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'referral', label: 'Referral' },
];

/**
 * User Center Page Component
 */
export default function UserCenterPage() {
  const { address, isConnected } = useAccount();
  const [currentTab, setCurrentTab] = useTabState('overview');

  // Validate tab value to prevent XSS and invalid values
  const getValidTab = (tab: string): string => {
    const validTabs = USER_CENTER_TABS.map((t) => t.value);
    return validTabs.includes(tab) ? tab : 'overview';
  };

  // Get safe tab value
  const safeTab = getValidTab(currentTab);

  // Validated onChange handler
  const handleTabChange = (newTab: string) => {
    const validTab = getValidTab(newTab);
    setCurrentTab(validTab);
  };

  // Render tab content based on current tab
  const renderTabContent = () => {
    switch (safeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'positions':
        return <PositionsTab />;
      case 'rewards':
        return <RewardsTab />;
      case 'kyc':
        return <KYCTab />;
      case 'tasks':
        return <TasksTab />;
      case 'referral':
        return <ReferralTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight={700}
            gutterBottom
          >
            User Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your assets, positions, rewards, KYC status, tasks, and referrals
            {isConnected && address && ` for ${address.slice(0, 6)}...${address.slice(-4)}`}
          </Typography>
        </Box>

        {/* Tab Navigation */}
        <SubNavigation
          tabs={USER_CENTER_TABS}
          currentTab={safeTab}
          onChange={handleTabChange}
          variant="scrollable"
        />

        {/* Tab Content */}
        <Box sx={{ mt: 4 }}>
          {renderTabContent()}
        </Box>
      </Container>
    </>
  );
}
