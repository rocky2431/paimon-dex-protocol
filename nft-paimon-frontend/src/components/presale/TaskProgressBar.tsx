'use client';

import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { TaskProgress } from '@/types/tasks';
import { DICE_MILESTONES } from '@/config/tasks';

interface TaskProgressBarProps {
  progress: TaskProgress;
}

/**
 * TaskProgressBar Component
 * Displays task completion progress with dice unlock milestones
 *
 * Progress visualization:
 * - Linear progress bar with warm gradient
 * - Current dice type indicator
 * - Next milestone information
 */
export function TaskProgressBar({ progress }: TaskProgressBarProps) {
  const { completedTasks, totalTasks, unlockedDiceType, nextMilestone } = progress;

  // Calculate progress percentage
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Get dice type color
  const getDiceColor = () => {
    switch (unlockedDiceType) {
      case 'diamond':
        return '#FFB74D'; // Warm gold (not blue)
      case 'gold':
        return '#FFD54F'; // Lighter warm gold
      case 'normal':
      default:
        return '#FF8A65'; // Warm orange-red
    }
  };

  // Get dice type display name
  const getDiceName = () => {
    switch (unlockedDiceType) {
      case 'diamond':
        return DICE_MILESTONES.DIAMOND.name;
      case 'gold':
        return DICE_MILESTONES.GOLD.name;
      case 'normal':
      default:
        return DICE_MILESTONES.NORMAL.name;
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: 2,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrophyIcon sx={{ color: getDiceColor(), fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Your Progress
          </Typography>
        </Box>

        <Chip
          label={getDiceName()}
          size="small"
          sx={{
            backgroundColor: `${getDiceColor()}20`,
            color: getDiceColor(),
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        />
      </Box>

      {/* Progress Stats */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            mb: 1,
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {completedTasks} / {totalTasks} Tasks Completed
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: getDiceColor(),
              fontWeight: 700,
            }}
          >
            {progressPercentage.toFixed(0)}%
          </Typography>
        </Box>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 12,
            borderRadius: 6,
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              background: `linear-gradient(90deg, ${getDiceColor()}, #FF6B35)`,
            },
          }}
        />
      </Box>

      {/* Next Milestone */}
      {nextMilestone && (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 183, 77, 0.1)',
            borderRadius: 1.5,
            p: 2,
            border: '1px solid rgba(255, 183, 77, 0.3)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#FFB74D',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Next Milestone
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mt: 0.5,
              lineHeight: 1.6,
            }}
          >
            Complete {nextMilestone.tasksRequired - completedTasks} more{' '}
            {nextMilestone.tasksRequired - completedTasks === 1 ? 'task' : 'tasks'} to unlock{' '}
            <Box component="span" sx={{ color: '#FFB74D', fontWeight: 700 }}>
              {nextMilestone.reward}
            </Box>
          </Typography>
        </Box>
      )}

      {/* Fully Completed State */}
      {!nextMilestone && completedTasks === totalTasks && totalTasks > 0 && (
        <Box
          sx={{
            backgroundColor: 'rgba(139, 195, 74, 0.1)',
            borderRadius: 1.5,
            p: 2,
            border: '1px solid rgba(139, 195, 74, 0.3)',
            textAlign: 'center',
          }}
        >
          <TrophyIcon sx={{ color: '#8BC34A', fontSize: 32, mb: 1 }} />
          <Typography
            variant="body1"
            sx={{
              color: '#8BC34A',
              fontWeight: 700,
            }}
          >
            All tasks completed! You&apos;ve unlocked all dice types!
          </Typography>
        </Box>
      )}
    </Box>
  );
}
