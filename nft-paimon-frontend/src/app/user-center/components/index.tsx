/**
 * User Center Tab Components
 *
 * Phase 1 (Task 29): Placeholder components
 * Phase 2 (Task 30-35): Replace with actual implementations
 */

'use client';

import { TabPlaceholder } from './TabPlaceholder';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';

/**
 * Tab 1: Overview
 * Total assets, risk warnings, quick actions
 */
export function OverviewTab() {
  return (
    <TabPlaceholder
      title="Overview"
      description="View your total assets, risk warnings, and quick actions across all Paimon DEX products."
      icon={<DashboardIcon />}
      comingSoonMessage="Overview dashboard will be available in Phase 2 (Task 30)"
    />
  );
}

/**
 * Tab 2: Positions
 * All position details (LP, USDP Vault, veNFT, Launchpad, Savings)
 */
export function PositionsTab() {
  return (
    <TabPlaceholder
      title="Positions"
      description="Manage all your positions including Liquidity Pools, USDP Vault, veNFT locks, Launchpad investments, and Savings deposits."
      icon={<AccountBalanceWalletIcon />}
      comingSoonMessage="Positions management will be available in Phase 2 (Task 30)"
    />
  );
}

/**
 * Tab 3: Rewards
 * One-click claim, esPAIMON vesting, Boost staking
 */
export function RewardsTab() {
  return (
    <TabPlaceholder
      title="Rewards"
      description="Claim all your rewards in one click, manage esPAIMON vesting, and stake PAIMON for boost multipliers."
      icon={<CardGiftcardIcon />}
      comingSoonMessage="Rewards dashboard will be available in Phase 2 (Task 30)"
    />
  );
}

/**
 * Tab 4: KYC
 * Blockpass integration, verification status
 */
export function KYCTab() {
  return (
    <TabPlaceholder
      title="KYC Verification"
      description="Complete your identity verification through Blockpass to access advanced features and higher transaction limits."
      icon={<VerifiedUserIcon />}
      comingSoonMessage="KYC module will be available in Phase 2 (Task 31)"
    />
  );
}

/**
 * Tab 5: Tasks
 * TaskOn integration + RWA task verification engine
 */
export function TasksTab() {
  return (
    <TabPlaceholder
      title="Tasks"
      description="Complete social tasks and RWA verification tasks to earn points and rewards. Track your progress and claim rewards."
      icon={<AssignmentIcon />}
      comingSoonMessage="Task center will be available in Phase 2 (Task 32)"
    />
  );
}

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
