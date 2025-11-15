/**
 * User Center Tab Components
 *
 * Phase 1 (Task 29): Placeholder components
 * Phase 2 (Task 30-35): Replace with actual implementations
 *
 * Task 30: Migrated Overview, Positions, Rewards from /portfolio
 */

'use client';

import { TabPlaceholder } from './TabPlaceholder';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';

/**
 * Tab 1: Overview
 * Total assets, risk warnings, quick actions
 * (Migrated from /portfolio - Task 30)
 */
export { OverviewTab } from './OverviewTab';

/**
 * Tab 2: Positions
 * All position details (LP, USDP Vault, veNFT, Launchpad, Savings)
 * (Migrated from /portfolio - Task 30)
 */
export { PositionsTab } from './PositionsTab';

/**
 * Tab 3: Rewards
 * One-click claim, esPAIMON vesting, Boost staking
 * (Migrated from /portfolio - Task 30)
 */
export { RewardsTab } from './RewardsTab';

/**
 * Tab 4: KYC
 * Blockpass integration, verification status
 * (Migrated from /kyc - Task 31)
 */
export { KYCTab } from './KYCTab';

/**
 * Tab 5: Tasks
 * TaskOn integration + RWA task verification engine
 * (Task 32)
 */
export { TasksTab } from './TasksTab';

/**
 * Tab 6: Referral
 * Referral code generation, invited users, rewards
 */
export function ReferralTab() {
  return (
    <TabPlaceholder
      title="Referral Program"
      description="Share your referral code, invite friends, and earn rewards for every successful referral. Track your referral statistics."
      icon={<PeopleIcon />}
      comingSoonMessage="Referral system will be available in Phase 2 (Task 33)"
    />
  );
}
