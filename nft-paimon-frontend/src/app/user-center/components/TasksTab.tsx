/**
 * Tasks Tab Component
 *
 * Integrated task center for User Center Tab 5 (Task 32)
 *
 * Features:
 * - Social tasks (Twitter, Discord) via TaskDashboard
 * - Referral program
 * - Task progress tracking
 * - Points and rewards system
 *
 * Note: RWA task verification engine (Task 25) integration pending
 */

'use client';

import { Box, Typography, Alert, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { TaskDashboard } from '@/components/presale/TaskDashboard';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import InfoIcon from '@mui/icons-material/Info';

export function TasksTab() {
  const { address, isConnected } = useAccount();
  const [selectedCategory, setSelectedCategory] = useState(0);

  // Not connected state
  if (!isConnected || !address) {
    return (
      <Alert severity="info" icon={<InfoIcon />}>
        <Typography variant="body1">请先连接钱包以查看任务中心</Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AssignmentTurnedInIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            任务中心
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          完成社交任务和 RWA 验证任务以赚取积分和奖励。追踪您的进度并领取奖励。
        </Typography>
      </Box>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onChange={(_, newValue) => setSelectedCategory(newValue)}
        sx={{
          mb: 4,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            minHeight: 48,
          },
        }}
      >
        <Tab label="社交任务" />
        <Tab label="RWA 验证任务" />
      </Tabs>

      {/* Category Content */}
      {selectedCategory === 0 ? (
        // Social Tasks (TaskDashboard from presale)
        <TaskDashboard />
      ) : (
        // RWA Tasks (placeholder until Task 28 is complete)
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              RWA 验证任务即将推出
            </Typography>
            <Typography variant="body2">
              RWA 任务验证引擎正在开发中（Task 25 已完成核心架构）。
              您很快就能通过完成 RWA 相关验证任务来赚取额外积分。
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
}
