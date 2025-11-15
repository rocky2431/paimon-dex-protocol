/**
 * KYC Tab Component
 *
 * Integrated from /kyc page (Task 31)
 *
 * Features:
 * - KYC status card showing current tier and status
 * - Blockpass authentication widget for Tier 0 users
 * - Tier benefits comparison table
 * - FAQ section
 */

'use client';

import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useAccount } from 'wagmi';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import KYCStatusCard from '@/app/kyc/components/KYCStatusCard';
import TierBenefitsTable from '@/app/kyc/components/TierBenefitsTable';
import BlockpassWidget from '@/components/blockpass/BlockpassWidget';

export function KYCTab() {
  const { address, isConnected } = useAccount();
  const { data: kycStatus, isLoading, error } = useKYCStatus(address);

  // Not connected state
  if (!isConnected || !address) {
    return (
      <Alert severity="info">
        <Typography variant="body1">请先连接钱包以查看 KYC 状态</Typography>
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          加载中...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="body1">加载 KYC 状态失败：{error.message}</Typography>
      </Alert>
    );
  }

  // No data (should not happen)
  if (!kycStatus) {
    return (
      <Alert severity="warning">
        <Typography variant="body1">未找到 KYC 数据</Typography>
      </Alert>
    );
  }

  const showAuthButton = kycStatus.tier === 0;

  return (
    <>
      {/* KYC Status Card */}
      <KYCStatusCard kycStatus={kycStatus} />

      {/* Blockpass Authentication Button (Tier 0 only) */}
      {showAuthButton && (
        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 4, textAlign: 'center' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              您当前为 Tier 0（未认证），完成 KYC 认证可解锁更多功能
            </Typography>
          </Alert>
          <BlockpassWidget />
        </Box>
      )}

      {/* Tier Benefits Table */}
      <TierBenefitsTable />

      {/* Help Section */}
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          常见问题
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>Q: KYC 审核需要多长时间？</strong>
          <br />
          A: 通常在 1-3 个工作日内完成审核，高峰期可能延长至 5 个工作日。
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>Q: Tier 1 和 Tier 2 有什么区别？</strong>
          <br />
          A: Tier 1 需要基础身份验证（身份证 + 人脸识别），Tier 2
          额外需要地址证明文件。Tier 2 可参与高价值 Launchpad 并享有更高借贷额度。
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Q: KYC 认证安全吗？</strong>
          <br />
          A: 我们使用 Blockpass 第三方 KYC 服务，您的身份信息加密存储，符合 GDPR
          和数据保护法规。
        </Typography>
      </Box>
    </>
  );
}
