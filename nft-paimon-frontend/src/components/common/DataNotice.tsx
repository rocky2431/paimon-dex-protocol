/**
 * DataNotice Component
 * 数据提示组件
 *
 * Purpose: Display user-friendly notices for modules with mock/incomplete data
 * 目的：为使用模拟/不完整数据的模块显示友好提示
 *
 * Use cases:
 * - Launchpad: Mock project data notice
 * - Analytics: Mock metrics notice
 * - Any module pending blockchain integration
 */

'use client';

import { Alert, AlertColor, Box } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * DataNotice Props
 */
export interface DataNoticeProps {
  /**
   * Notice message to display
   */
  message?: string;

  /**
   * Severity level (info, warning, error)
   * @default 'info'
   */
  severity?: AlertColor;

  /**
   * Custom icon (optional)
   */
  icon?: React.ReactNode;
}

/**
 * DataNotice Component
 *
 * @param {DataNoticeProps} props - Component props
 * @returns {JSX.Element} Data notice alert
 *
 * @example
 * ```tsx
 * <DataNotice
 *   message="此模块数据暂未接入链上，显示为示例数据"
 *   severity="info"
 * />
 * ```
 */
export function DataNotice({
  message = '此模块数据暂未接入链上，显示为示例数据',
  severity = 'info',
  icon,
}: DataNoticeProps): JSX.Element {
  // Default icons based on severity
  const defaultIcon = severity === 'warning' ? <WarningIcon /> : <InfoIcon />;

  return (
    <Box sx={{ mb: 3 }}>
      <Alert
        severity={severity}
        icon={icon || defaultIcon}
        sx={{
          borderRadius: 2,
          fontSize: { xs: '0.875rem', sm: '1rem' },
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          '& .MuiAlert-message': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        }}
      >
        {message}
      </Alert>
    </Box>
  );
}

export default DataNotice;
