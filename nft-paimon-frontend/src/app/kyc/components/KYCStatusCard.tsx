/**
 * KYCStatusCard Component
 *
 * Displays user's current KYC status including:
 * - Tier level (0, 1, or 2)
 * - Status (pending, approved, rejected, expired)
 * - Approval timestamp (if approved)
 *
 * @param kycStatus - KYC status data
 */

import { Card, CardContent, Typography, Chip, Box } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { KYCStatus } from '@/hooks/useKYCStatus';

interface KYCStatusCardProps {
  kycStatus: KYCStatus;
}

export default function KYCStatusCard({ kycStatus }: KYCStatusCardProps) {
  const { tier, status, approvedAt } = kycStatus;

  // Get status color and icon
  const getStatusDisplay = () => {
    switch (status) {
      case 'approved':
        return {
          color: 'success' as const,
          icon: <CheckCircleIcon />,
          label: '已认证',
        };
      case 'pending':
        return {
          color: 'warning' as const,
          icon: <PendingIcon />,
          label: '待审核',
        };
      case 'rejected':
        return {
          color: 'error' as const,
          icon: <CancelIcon />,
          label: '已拒绝',
        };
      case 'expired':
        return {
          color: 'default' as const,
          icon: <InfoIcon />,
          label: '已过期',
        };
      default:
        return {
          color: 'default' as const,
          icon: <InfoIcon />,
          label: status,
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Get tier display name
  const getTierName = () => {
    switch (tier) {
      case 0:
        return 'Tier 0 - 未认证';
      case 1:
        return 'Tier 1 - 基础认证';
      case 2:
        return 'Tier 2 - 高级认证';
      default:
        return `Tier ${tier}`;
    }
  };

  // Format approval date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            KYC 认证状态
          </Typography>
          <Chip
            icon={statusDisplay.icon}
            label={statusDisplay.label}
            color={statusDisplay.color}
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            认证等级
          </Typography>
          <Typography variant="h5" component="div" color="primary">
            {getTierName()}
          </Typography>
        </Box>

        {approvedAt && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              认证时间
            </Typography>
            <Typography variant="body1">
              {formatDate(approvedAt)}
            </Typography>
          </Box>
        )}

        {status === 'pending' && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            您的 KYC 认证正在审核中，请耐心等待。
          </Typography>
        )}

        {status === 'rejected' && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            您的 KYC 认证未通过审核，请重新提交。
          </Typography>
        )}

        {status === 'expired' && (
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            您的 KYC 认证已过期，请重新认证。
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
