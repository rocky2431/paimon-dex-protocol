'use client';

import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Construction } from '@mui/icons-material';

/**
 * ComingSoon - 未实现功能的友好占位组件
 *
 * 用于标记正在开发中的功能，提供友好的用户体验
 */

export interface ComingSoonProps {
  /**
   * 功能标题
   */
  title: string;

  /**
   * 功能描述
   */
  description?: string;

  /**
   * 预计发布时间（可选）
   */
  estimatedRelease?: string;

  /**
   * 优先级标签（可选）
   * @default 'medium'
   */
  priority?: 'low' | 'medium' | 'high';

  /**
   * 是否显示为紧凑模式
   * @default false
   */
  compact?: boolean;
}

/**
 * 优先级颜色映射
 */
const priorityColors = {
  low: '#FFA726', // Orange
  medium: '#FFD54F', // Yellow
  high: '#FF7043', // Deep Orange
} as const;

/**
 * 优先级文本映射
 */
const priorityLabels = {
  low: '低优先级',
  medium: '开发中',
  high: '即将推出',
} as const;

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  description,
  estimatedRelease,
  priority = 'medium',
  compact = false,
}) => {
  if (compact) {
    // 紧凑模式 - 内联提示
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          padding: 1,
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderRadius: 1,
          border: '1px solid rgba(255, 193, 7, 0.3)',
        }}
      >
        <Construction sx={{ fontSize: 16, color: priorityColors[priority] }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {title} - {priorityLabels[priority]}
        </Typography>
      </Box>
    );
  }

  // 完整卡片模式
  return (
    <Card
      sx={{
        maxWidth: 600,
        margin: '0 auto',
        backgroundColor: 'rgba(255, 193, 7, 0.05)',
        border: '2px dashed rgba(255, 193, 7, 0.3)',
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: 4,
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
          }}
        >
          <Construction sx={{ fontSize: 40, color: priorityColors[priority] }} />
        </Box>

        {/* Title */}
        <Typography
          variant="h5"
          component="h2"
          fontWeight="bold"
          textAlign="center"
          color="text.primary"
        >
          {title}
        </Typography>

        {/* Priority Badge */}
        <Chip
          label={priorityLabels[priority]}
          size="small"
          sx={{
            backgroundColor: priorityColors[priority],
            color: 'white',
            fontWeight: 'bold',
          }}
        />

        {/* Description */}
        {description && (
          <Typography variant="body1" color="text.secondary" textAlign="center">
            {description}
          </Typography>
        )}

        {/* Estimated Release */}
        {estimatedRelease && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            预计发布时间: {estimatedRelease}
          </Typography>
        )}

        {/* Additional Info */}
        <Typography variant="caption" color="text.secondary" textAlign="center">
          我们正在努力开发这个功能。敬请期待！
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ComingSoon;
