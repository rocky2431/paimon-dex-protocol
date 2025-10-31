'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Tabs, Tab, Alert, CircularProgress } from '@mui/material';
import { useAccount } from 'wagmi';
import { TaskCard } from './TaskCard';
import { TaskProgressBar } from './TaskProgressBar';
import { ReferralCodeDisplay } from './ReferralCodeDisplay';
import { InviteTracker } from './InviteTracker';
import {
  SocialTask,
  TaskCategory,
  TaskStatus,
  TaskProgress,
  ReferralData,
} from '@/types/tasks';
import { SOCIAL_TASKS, getTasksByCategory, getAllCategories, DICE_MILESTONES } from '@/config/tasks';

/**
 * TaskDashboard Component
 * Main dashboard for social tasks, referrals, and progress tracking
 *
 * Features:
 * - Tab navigation (Twitter/Discord/Referral)
 * - Task cards grouped by category
 * - Progress tracking with dice unlock milestones
 * - Referral system with code generation
 * - Blockchain integration for task verification
 */
export function TaskDashboard() {
  const { address, isConnected } = useAccount();
  const [selectedTab, setSelectedTab] = useState(0);
  const [tasks, setTasks] = useState<Record<string, SocialTask>>(SOCIAL_TASKS);
  const [loading, setLoading] = useState(true);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);

  // Mock user progress (will be replaced with blockchain data)
  const [progress, setProgress] = useState<TaskProgress>({
    totalTasks: Object.keys(SOCIAL_TASKS).length,
    completedTasks: 0,
    unlockedDiceType: 'normal',
    nextMilestone: {
      tasksRequired: DICE_MILESTONES.GOLD.tasksRequired,
      reward: DICE_MILESTONES.GOLD.name,
    },
  });

  // Mock referral data (will be replaced with blockchain data)
  const [referralData, setReferralData] = useState<ReferralData>({
    code: '',
    inviteCount: 0,
    rewardsEarned: 0,
    milestones: [
      { count: 1, reward: '5 USDC + 1 roll', achieved: false },
      { count: 5, reward: '25 USDC + Gold Dice', achieved: false },
      { count: 10, reward: '50 USDC + Diamond Dice', achieved: false },
    ],
  });

  // Load user data on mount
  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  /**
   * Load user task completion data from blockchain
   * TODO: Integrate with RemintController contract
   */
  const loadUserData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual contract calls
      // const contract = getRemintControllerContract();
      // const userTokenId = await getUserTokenId(address);
      // const completedTasks = await contract.getTasksCompleted(userTokenId);
      // const diceData = await contract.getDiceData(userTokenId);

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock: Generate referral code
      if (address) {
        setReferralData(prev => ({
          ...prev,
          code: `${address.slice(2, 8).toUpperCase()}`,
        }));
      }

    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle task verification
   * Calls oracle API then submits to blockchain
   */
  const handleVerifyTask = async (taskId: string) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setVerifyingTaskId(taskId);

      // Step 1: Call oracle API for verification
      // TODO: Implement oracle API integration
      // const response = await fetch('/api/verify-task', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     tokenId: userTokenId,
      //     taskId: taskId,
      //     proof: '...', // e.g., tweet URL
      //   }),
      // });

      // const { signature, message } = await response.json();

      // Step 2: Submit to RemintController contract
      // TODO: Implement contract integration
      // const contract = getRemintControllerContract();
      // const tx = await contract.completeSocialTask(userTokenId, taskId, signature);
      // await tx.wait();

      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update task status
      setTasks(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          status: TaskStatus.COMPLETED,
        },
      }));

      // Update progress
      setProgress(prev => {
        const newCompleted = prev.completedTasks + 1;
        let newDiceType = prev.unlockedDiceType;
        let newNextMilestone = prev.nextMilestone;

        if (newCompleted >= DICE_MILESTONES.DIAMOND.tasksRequired) {
          newDiceType = 'diamond';
          newNextMilestone = undefined;
        } else if (newCompleted >= DICE_MILESTONES.GOLD.tasksRequired) {
          newDiceType = 'gold';
          newNextMilestone = {
            tasksRequired: DICE_MILESTONES.DIAMOND.tasksRequired,
            reward: DICE_MILESTONES.DIAMOND.name,
          };
        }

        return {
          ...prev,
          completedTasks: newCompleted,
          unlockedDiceType: newDiceType,
          nextMilestone: newNextMilestone,
        };
      });

    } catch (error) {
      console.error('Task verification failed:', error);
      alert('Task verification failed. Please try again.');
    } finally {
      setVerifyingTaskId(null);
    }
  };

  /**
   * Generate referral code
   */
  const handleGenerateReferralCode = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // TODO: Generate unique code from backend or use address hash
      const code = `${address.slice(2, 8).toUpperCase()}`;

      setReferralData(prev => ({
        ...prev,
        code,
      }));
    } catch (error) {
      console.error('Failed to generate referral code:', error);
    }
  };

  // Tab categories
  const categories = getAllCategories();
  const tabLabels = {
    [TaskCategory.TWITTER]: 'Twitter Tasks',
    [TaskCategory.DISCORD]: 'Discord Tasks',
    [TaskCategory.REFERRAL]: 'Referral Program',
  };

  // Get tasks for current tab
  const currentCategory = categories[selectedTab];
  const currentTasks = getTasksByCategory(currentCategory);

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Social Tasks Dashboard
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          Please connect your wallet to view and complete social tasks
        </Alert>
      </Box>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={48} sx={{ color: '#FF6B35' }} />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading your tasks...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          mb: 1,
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
        }}
      >
        Social Tasks Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem' }}>
        Complete tasks to earn extra dice rolls and unlock better dice types
      </Typography>

      {/* Progress Section */}
      <Box sx={{ mb: 4 }}>
        <TaskProgressBar progress={progress} />
      </Box>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{
          mb: 4,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            minHeight: 56,
          },
          '& .Mui-selected': {
            color: '#FF6B35',
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#FF6B35',
            height: 3,
          },
        }}
      >
        {categories.map((category) => (
          <Tab key={category} label={tabLabels[category]} />
        ))}
      </Tabs>

      {/* Task List or Referral Section */}
      {currentCategory === TaskCategory.REFERRAL ? (
        // Referral Program Tab
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
      ) : (
        // Task Cards (Twitter/Discord)
        <Grid container spacing={3}>
          {currentTasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <TaskCard
                task={tasks[task.id] || task}
                onVerify={handleVerifyTask}
                isVerifying={verifyingTaskId === task.id}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
