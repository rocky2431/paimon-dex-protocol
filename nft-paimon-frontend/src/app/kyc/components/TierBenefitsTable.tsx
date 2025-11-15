/**
 * TierBenefitsTable Component
 *
 * Displays comparison table of benefits across different KYC tiers.
 * Shows what features are available at each tier level.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface TierBenefit {
  feature: string;
  tier0: boolean;
  tier1: boolean;
  tier2: boolean;
}

const tierBenefits: TierBenefit[] = [
  {
    feature: '查看行情数据',
    tier0: true,
    tier1: true,
    tier2: true,
  },
  {
    feature: '基本交易功能',
    tier0: false,
    tier1: true,
    tier2: true,
  },
  {
    feature: '标准 Launchpad 参与',
    tier0: false,
    tier1: true,
    tier2: true,
  },
  {
    feature: '基础借贷额度',
    tier0: false,
    tier1: true,
    tier2: true,
  },
  {
    feature: '高价值 Launchpad 参与',
    tier0: false,
    tier1: false,
    tier2: true,
  },
  {
    feature: '增强借贷额度',
    tier0: false,
    tier1: false,
    tier2: true,
  },
  {
    feature: '高级交易功能',
    tier0: false,
    tier1: false,
    tier2: true,
  },
  {
    feature: '治理投票权',
    tier0: false,
    tier1: false,
    tier2: true,
  },
];

export default function TierBenefitsTable() {
  const renderCheckmark = (available: boolean) => {
    return available ? (
      <CheckIcon color="success" fontSize="small" />
    ) : (
      <CloseIcon color="disabled" fontSize="small" />
    );
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 3 }}>
        Tier Benefits 权益对比
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  功能特权
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip label="Tier 0" size="small" color="default" />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  未认证
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip label="Tier 1" size="small" color="primary" />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  基础 KYC
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip label="Tier 2" size="small" color="secondary" />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  高级 KYC
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tierBenefits.map((benefit) => (
              <TableRow key={benefit.feature} hover>
                <TableCell component="th" scope="row">
                  {benefit.feature}
                </TableCell>
                <TableCell align="center">
                  {renderCheckmark(benefit.tier0)}
                </TableCell>
                <TableCell align="center">
                  {renderCheckmark(benefit.tier1)}
                </TableCell>
                <TableCell align="center">
                  {renderCheckmark(benefit.tier2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>说明：</strong>
          <br />
          • Tier 1 需要完成基础 KYC 认证（身份证 + 人脸识别）
          <br />
          • Tier 2 需要完成高级 KYC 认证（额外地址证明）
          <br />
          • 更高等级 Tier 包含所有低等级权限
        </Typography>
      </Box>
    </Box>
  );
}
