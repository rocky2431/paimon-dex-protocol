/**
 * Task Types and Interfaces
 * Defines all social task structures for the gamification system
 */

/**
 * Task status enum
 */
export enum TaskStatus {
  LOCKED = 'locked',         // Requirements not met
  AVAILABLE = 'available',   // Ready to complete
  IN_PROGRESS = 'in_progress', // Verification pending
  COMPLETED = 'completed'    // Task completed
}

/**
 * Task category enum
 */
export enum TaskCategory {
  TWITTER = 'twitter',
  DISCORD = 'discord',
  REFERRAL = 'referral'
}

/**
 * Social task interface
 */
export interface SocialTask {
  id: string;                    // Unique task ID (converted to bytes32 for contract)
  title: string;                 // Task title
  description: string;           // Task description
  category: TaskCategory;        // Task category
  icon: React.ReactNode;         // Task icon (Twitter/Discord/Gift)
  action: string;                // CTA button text
  actionUrl?: string;            // External URL for the task
  reward: string;                // Reward description
  status: TaskStatus;            // Current status
  requiresNFT?: boolean;         // Whether NFT is required
  requiredTaskIds?: string[];    // Prerequisites
}

/**
 * Task verification request
 */
export interface TaskVerificationRequest {
  tokenId: string;
  taskId: string;
  proof?: string; // Optional proof (e.g., tweet URL)
}

/**
 * Task verification response from oracle
 */
export interface TaskVerificationResponse {
  success: boolean;
  signature?: string;  // Oracle signature for on-chain verification
  message?: string;    // Error or success message
}

/**
 * User task progress
 */
export interface TaskProgress {
  totalTasks: number;
  completedTasks: number;
  unlockedDiceType: 'normal' | 'gold' | 'diamond';
  nextMilestone?: {
    tasksRequired: number;
    reward: string;
  };
}

/**
 * Referral data
 */
export interface ReferralData {
  code: string;              // User's unique referral code
  inviteCount: number;       // Number of invites
  rewardsEarned: number;     // Total USDC earned
  milestones: {
    count: number;
    reward: string;
    achieved: boolean;
  }[];
}
