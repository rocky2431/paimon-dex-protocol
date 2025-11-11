/**
 * 统一 Card 样式配置 - Uiverse 风格
 * Unified Card Styling System - Uiverse Inspired
 *
 * 用途：确保所有 Card 组件使用统一的现代化样式、玻璃态效果、暖色调
 *
 * Accessibility: Supports prefers-reduced-motion
 * Use getCardVariantWithMotion() to respect user's motion preferences
 */

import { SxProps, Theme } from '@mui/material';

/**
 * Helper function to get transition value based on motion preference
 * @param prefersReducedMotion - User's motion preference
 * @param transition - Transition string to use when motion is enabled
 * @returns 'none' if reduced motion preferred, otherwise the transition string
 */
export const getTransition = (
  prefersReducedMotion: boolean,
  transition: string
): string => {
  return prefersReducedMotion ? 'none' : transition;
};

/**
 * Card 样式变体 - Uiverse 风格
 * 特点：玻璃态、渐变、柔和阴影、暖色调
 */
export const cardVariants = {
  // 主要卡片 - 橙色玻璃态
  primary: {
    background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.08) 0%, rgba(255, 152, 0, 0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 107, 0, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(255, 107, 0, 0.12)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      boxShadow: '0 12px 48px 0 rgba(255, 107, 0, 0.18)',
      transform: 'translateY(-2px)',
      borderColor: 'rgba(255, 107, 0, 0.3)',
    },
  } as SxProps<Theme>,

  // 次要卡片 - 浅橙色玻璃态
  secondary: {
    background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(255, 193, 7, 0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 152, 0, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(255, 152, 0, 0.12)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      boxShadow: '0 12px 48px 0 rgba(255, 152, 0, 0.18)',
      transform: 'translateY(-2px)',
    },
  } as SxProps<Theme>,

  // 警告卡片 - 黄色玻璃态
  warning: {
    background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 235, 59, 0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 193, 7, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(255, 193, 7, 0.12)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } as SxProps<Theme>,

  // 成功卡片 - 绿色玻璃态
  success: {
    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(129, 199, 132, 0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(76, 175, 80, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(76, 175, 80, 0.12)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } as SxProps<Theme>,

  // 错误卡片 - 红色玻璃态
  error: {
    background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(229, 115, 115, 0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(244, 67, 54, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(244, 67, 54, 0.12)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } as SxProps<Theme>,

  // 深色卡片 - 棕色玻璃态
  dark: {
    background: 'linear-gradient(135deg, rgba(121, 85, 72, 0.08) 0%, rgba(141, 110, 99, 0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(121, 85, 72, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(121, 85, 72, 0.12)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } as SxProps<Theme>,

  // 交互式卡片（可点击）- 橙色高亮
  interactive: {
    background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.12) 0%, rgba(255, 152, 0, 0.08) 100%)',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255, 107, 0, 0.3)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px 0 rgba(255, 107, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-6px) scale(1.02)',
      boxShadow: '0 16px 56px 0 rgba(255, 107, 0, 0.25)',
      border: '2px solid rgba(255, 107, 0, 0.5)',
      background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(255, 152, 0, 0.1) 100%)',
    },
    '&:active': {
      transform: 'translateY(-2px) scale(0.98)',
    },
  } as SxProps<Theme>,

  // 虚线边框卡片（用于流程图等）
  dashed: {
    background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.05) 0%, rgba(255, 152, 0, 0.03) 100%)',
    backdropFilter: 'blur(8px)',
    border: '2px dashed rgba(255, 107, 0, 0.3)',
    borderRadius: '16px',
    boxShadow: 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } as SxProps<Theme>,

  // 扁平卡片（无阴影）
  flat: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '12px',
    boxShadow: 'none',
  } as SxProps<Theme>,

  // 玻璃态信息卡
  glass: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } as SxProps<Theme>,
};

/**
 * 指标卡片样式 (KPI Cards)
 * 统一尺寸和内边距 - Uiverse风格
 */
export const metricCardStyle: SxProps<Theme> = {
  ...cardVariants.primary,
  minHeight: 140,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  '& .MuiCardContent-root': {
    p: 3,
  },
};

/**
 * 内容卡片样式 (Content Cards)
 * 用于包含表单、列表等内容的卡片
 */
export const contentCardStyle: SxProps<Theme> = {
  ...cardVariants.flat,
  minHeight: 200,
  '& .MuiCardContent-root': {
    p: 3,
  },
};

/**
 * 操作卡片样式 (Action Cards)
 * 用于引导用户操作的卡片 - 强化交互效果
 */
export const actionCardStyle: SxProps<Theme> = {
  ...cardVariants.interactive,
  minHeight: 200,
  textAlign: 'center',
  '& .MuiCardContent-root': {
    py: 4,
    px: 3,
  },
};

/**
 * 流程卡片样式 (Flowchart Cards)
 * 用于飞轮流程图的卡片
 */
export const flowchartCardStyle: SxProps<Theme> = {
  p: 2.5,
  borderRadius: '16px',
  border: '1.5px solid',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateX(4px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
};

/**
 * 公告卡片样式 (Announcement Cards)
 * 用于系统公告和更新提示
 */
export const announcementCardStyle: SxProps<Theme> = {
  ...cardVariants.glass,
  '& .MuiCardContent-root': {
    p: 3,
  },
};

/**
 * 获取颜色变体的卡片样式
 */
export const getCardVariant = (variant: keyof typeof cardVariants): SxProps<Theme> => {
  return cardVariants[variant];
};
