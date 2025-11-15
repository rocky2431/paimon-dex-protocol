/**
 * KYC Page
 *
 * Displays user's KYC status and provides authentication interface.
 *
 * Features:
 * - KYC status card showing current tier and status
 * - Blockpass authentication widget for Tier 0 users
 * - Tier benefits comparison table
 * - Responsive layout
 */

'use client';

import { Box, Container, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { useAccount } from 'wagmi';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import KYCStatusCard from './components/KYCStatusCard';
import TierBenefitsTable from './components/TierBenefitsTable';
import BlockpassWidget from '@/components/blockpass/BlockpassWidget';

export default function KYCPage() {
  const { address, isConnected } = useAccount();
  const { data: kycStatus, isLoading, error } = useKYCStatus(address);

  // Not connected state
  if (!isConnected || !address) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="info">
          <Typography variant="body1">
            请先连接钱包以查看 KYC 状态
          </Typography>
        </Alert>
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          加载中...
        </Typography>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">
          <Typography variant="body1">
            加载 KYC 状态失败：{error.message}
          </Typography>
        </Alert>
      </Container>
    );
  }

  // No data (should not happen)
  if (!kycStatus) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            未找到 KYC 数据
          </Typography>
        </Alert>
      </Container>
    );
  }

  const showAuthButton = kycStatus.tier === 0;

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Page Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          KYC 认证中心
        </Typography>
        <Typography variant="body1" color="text.secondary">
          完成 KYC 认证，解锁更多平台权益
        </Typography>
      </Box>

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
          A: Tier 1 需要基础身份验证（身份证 + 人脸识别），Tier 2 额外需要地址证明文件。Tier 2 可参与高价值 Launchpad 并享有更高借贷额度。
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Q: KYC 认证安全吗？</strong>
          <br />
          A: 我们使用 Blockpass 第三方 KYC 服务，您的身份信息加密存储，符合 GDPR 和数据保护法规。
        </Typography>
      </Box>
    </Container>
  );
}
