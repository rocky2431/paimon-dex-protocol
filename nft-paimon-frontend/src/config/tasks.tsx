import { Twitter as TwitterIcon, Forum as DiscordIcon, CardGiftcard as GiftIcon } from '@mui/icons-material';
import { TaskCategory, SocialTask, TaskStatus } from '@/types/tasks';

/**
 * All available social tasks
 * Tasks are organized by category (Twitter, Discord, Referral)
 */
export const SOCIAL_TASKS: Record<string, SocialTask> = {
  // ==================== Twitter Tasks ====================
  'twitter-follow': {
    id: 'twitter-follow',
    title: 'Follow @PaimonDEX on Twitter',
    description: 'Follow our official Twitter account to stay updated',
    category: TaskCategory.TWITTER,
    icon: <TwitterIcon sx={{ color: '#FF6B35' }} />, // Warm orange instead of blue
    action: 'Follow on Twitter',
    actionUrl: 'https://twitter.com/PaimonDEX',
    reward: '+1 extra dice roll this week',
    status: TaskStatus.AVAILABLE,
    requiresNFT: true,
  },
  'twitter-retweet': {
    id: 'twitter-retweet',
    title: 'Retweet Announcement',
    description: 'Retweet our latest announcement to spread the word',
    category: TaskCategory.TWITTER,
    icon: <TwitterIcon sx={{ color: '#FF6B35' }} />,
    action: 'Retweet Announcement',
    actionUrl: 'https://twitter.com/PaimonDEX/status/LATEST', // Update with actual tweet
    reward: '+1 extra dice roll this week',
    status: TaskStatus.AVAILABLE,
    requiresNFT: true,
    requiredTaskIds: ['twitter-follow'], // Must follow first
  },
  'twitter-meme': {
    id: 'twitter-meme',
    title: 'Submit Meme Contest Entry',
    description: 'Create and share a Paimon meme (upload to IPFS)',
    category: TaskCategory.TWITTER,
    icon: <TwitterIcon sx={{ color: '#FF6B35' }} />,
    action: 'Upload Meme',
    reward: '+1 extra dice roll + community vote rewards',
    status: TaskStatus.AVAILABLE,
    requiresNFT: true,
  },

  // ==================== Discord Tasks ====================
  'discord-join': {
    id: 'discord-join',
    title: 'Join Paimon Discord Server',
    description: 'Join our Discord community',
    category: TaskCategory.DISCORD,
    icon: <DiscordIcon sx={{ color: '#FF8C61' }} />, // Warm coral
    action: 'Join Discord',
    actionUrl: 'https://discord.gg/paimondex',
    reward: '+1 extra dice roll this week',
    status: TaskStatus.AVAILABLE,
    requiresNFT: true,
  },
  'discord-share': {
    id: 'discord-share',
    title: 'Share Your NFT in Discord',
    description: 'Share your Paimon NFT in #flex channel',
    category: TaskCategory.DISCORD,
    icon: <DiscordIcon sx={{ color: '#FF8C61' }} />,
    action: 'Share in Discord',
    reward: '+1 extra dice roll this week',
    status: TaskStatus.AVAILABLE,
    requiresNFT: true,
    requiredTaskIds: ['discord-join'], // Must join first
  },
  'discord-ama': {
    id: 'discord-ama',
    title: 'Attend AMA Session',
    description: 'Participate in our weekly AMA',
    category: TaskCategory.DISCORD,
    icon: <DiscordIcon sx={{ color: '#FF8C61' }} />,
    action: 'Join AMA',
    reward: '+2 extra dice rolls this week',
    status: TaskStatus.AVAILABLE,
    requiresNFT: true,
    requiredTaskIds: ['discord-join'],
  },

  // ==================== Referral Tasks ====================
  'referral-1': {
    id: 'referral-1',
    title: 'Invite 1 Friend',
    description: 'Share your referral code and invite 1 friend',
    category: TaskCategory.REFERRAL,
    icon: <GiftIcon sx={{ color: '#FFB84D' }} />, // Warm gold
    action: 'Generate Referral Code',
    reward: '5 USDC + 1 extra dice roll',
    status: TaskStatus.AVAILABLE,
    requiresNFT: true,
  },
  'referral-5': {
    id: 'referral-5',
    title: 'Invite 5 Friends',
    description: 'Invite 5 friends to earn more rewards',
    category: TaskCategory.REFERRAL,
    icon: <GiftIcon sx={{ color: '#FFB84D' }} />,
    action: 'View Referral Stats',
    reward: '25 USDC + Unlock Gold Dice',
    status: TaskStatus.LOCKED,
    requiresNFT: true,
    requiredTaskIds: ['referral-1'],
  },
  'referral-10': {
    id: 'referral-10',
    title: 'Invite 10 Friends',
    description: 'Invite 10 friends to become a top referrer',
    category: TaskCategory.REFERRAL,
    icon: <GiftIcon sx={{ color: '#FFB84D' }} />,
    action: 'View Referral Stats',
    reward: '50 USDC + Unlock Diamond Dice',
    status: TaskStatus.LOCKED,
    requiresNFT: true,
    requiredTaskIds: ['referral-5'],
  },
};

/**
 * Get tasks by category
 */
export function getTasksByCategory(category: TaskCategory): SocialTask[] {
  return Object.values(SOCIAL_TASKS).filter(task => task.category === category);
}

/**
 * Get all task categories
 */
export function getAllCategories(): TaskCategory[] {
  return [TaskCategory.TWITTER, TaskCategory.DISCORD, TaskCategory.REFERRAL];
}

/**
 * Convert task ID to bytes32 for contract
 */
export function taskIdToBytes32(taskId: string): `0x${string}` {
  // Use keccak256 hash from viem (already in dependencies)
  const { keccak256, toBytes } = require('viem');
  return keccak256(toBytes(taskId));
}

/**
 * Dice unlock milestones
 */
export const DICE_MILESTONES = {
  NORMAL: {
    tasksRequired: 0,
    name: 'Normal Dice',
    description: '1-6 points → 0-3% APY',
  },
  GOLD: {
    tasksRequired: 5,
    name: 'Gold Dice',
    description: '1-12 points → 0-6% APY',
  },
  DIAMOND: {
    tasksRequired: 10,
    name: 'Diamond Dice',
    description: '1-20 points → 0-10% APY',
  },
};
