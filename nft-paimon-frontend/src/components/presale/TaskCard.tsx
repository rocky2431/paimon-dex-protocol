'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Check as CheckIcon, Lock as LockIcon } from '@mui/icons-material';
import { SocialTask, TaskStatus } from '@/types/tasks';

interface TaskCardProps {
  task: SocialTask;
  onVerify: (taskId: string) => Promise<void>;
  isVerifying?: boolean;
}

/**
 * TaskCard Component
 * Displays individual task with icon, description, CTA, and status badge
 *
 * Status colors (Material Design 3 + Warm palette):
 * - Locked: Gray
 * - Available: Orange
 * - In Progress: Amber
 * - Completed: Green (warm green #8BC34A)
 */
export function TaskCard({ task, onVerify, isVerifying = false }: TaskCardProps) {
  const [localVerifying, setLocalVerifying] = useState(false);

  const handleAction = async () => {
    if (task.status === TaskStatus.LOCKED) {
      return; // Do nothing if locked
    }

    if (task.status === TaskStatus.COMPLETED) {
      return; // Already completed
    }

    // For tasks with external URLs, open in new tab
    if (task.actionUrl && task.status === TaskStatus.AVAILABLE) {
      window.open(task.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // For verification
    setLocalVerifying(true);
    try {
      await onVerify(task.id);
    } finally {
      setLocalVerifying(false);
    }
  };

  const getStatusChip = () => {
    const statusConfig = {
      [TaskStatus.LOCKED]: {
        label: 'Locked',
        icon: <LockIcon sx={{ fontSize: 16 }} />,
        color: '#9E9E9E' as const,
        bgColor: 'rgba(158, 158, 158, 0.1)',
      },
      [TaskStatus.AVAILABLE]: {
        label: 'Available',
        icon: null,
        color: '#FF6B35' as const,
        bgColor: 'rgba(255, 107, 53, 0.1)',
      },
      [TaskStatus.IN_PROGRESS]: {
        label: 'Verifying...',
        icon: <CircularProgress size={14} sx={{ color: '#FFB74D' }} />,
        color: '#FFB74D' as const,
        bgColor: 'rgba(255, 183, 77, 0.1)',
      },
      [TaskStatus.COMPLETED]: {
        label: 'Completed',
        icon: <CheckIcon sx={{ fontSize: 16 }} />,
        color: '#8BC34A' as const,
        bgColor: 'rgba(139, 195, 74, 0.1)',
      },
    };

    const config = statusConfig[task.status];

    return (
      <Chip
        icon={config.icon || undefined}
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.bgColor,
          color: config.color,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 24,
          '& .MuiChip-icon': {
            marginLeft: '4px',
          },
        }}
      />
    );
  };

  const getButtonConfig = () => {
    if (task.status === TaskStatus.LOCKED) {
      return {
        text: 'Locked',
        disabled: true,
        variant: 'outlined' as const,
      };
    }

    if (task.status === TaskStatus.COMPLETED) {
      return {
        text: 'Completed',
        disabled: true,
        variant: 'outlined' as const,
      };
    }

    if (task.status === TaskStatus.IN_PROGRESS) {
      return {
        text: 'Verifying...',
        disabled: true,
        variant: 'contained' as const,
      };
    }

    // Available
    return {
      text: task.action,
      disabled: false,
      variant: 'contained' as const,
    };
  };

  const buttonConfig = getButtonConfig();
  const isLoading = localVerifying || isVerifying;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        border: '1px solid',
        borderColor: task.status === TaskStatus.COMPLETED ? '#8BC34A' : 'divider',
        opacity: task.status === TaskStatus.LOCKED ? 0.6 : 1,
        '&:hover': {
          transform: task.status !== TaskStatus.LOCKED ? 'translateY(-4px)' : 'none',
          boxShadow: task.status !== TaskStatus.LOCKED ? 4 : 1,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        {/* Header: Icon + Status Badge */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 107, 53, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {task.icon}
          </Box>
          {getStatusChip()}
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 1,
            fontSize: { xs: '1rem', sm: '1.125rem' },
          }}
        >
          {task.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            flexGrow: 1,
            lineHeight: 1.6,
          }}
        >
          {task.description}
        </Typography>

        {/* Reward */}
        <Box
          sx={{
            backgroundColor: 'rgba(255, 183, 77, 0.1)',
            borderRadius: 1,
            p: 1.5,
            mb: 2,
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
            Reward
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mt: 0.5,
            }}
          >
            {task.reward}
          </Typography>
        </Box>

        {/* Action Button */}
        <Button
          variant={buttonConfig.variant}
          disabled={buttonConfig.disabled || isLoading}
          onClick={handleAction}
          fullWidth
          sx={{
            py: 1.5,
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
            backgroundColor:
              buttonConfig.variant === 'contained' && !buttonConfig.disabled
                ? '#FF6B35'
                : undefined,
            '&:hover': {
              backgroundColor:
                buttonConfig.variant === 'contained' && !buttonConfig.disabled
                  ? '#FF5722'
                  : undefined,
            },
            ...(buttonConfig.disabled && {
              borderColor: task.status === TaskStatus.COMPLETED ? '#8BC34A' : undefined,
              color: task.status === TaskStatus.COMPLETED ? '#8BC34A' : undefined,
            }),
          }}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Processing...' : buttonConfig.text}
        </Button>
      </CardContent>
    </Card>
  );
}
