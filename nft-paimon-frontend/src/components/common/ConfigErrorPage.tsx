/**
 * ConfigErrorPage Component
 * Displays configuration validation errors
 * 配置错误页面组件
 *
 * Purpose:
 * Shows a blocking error page when cross-network configuration
 * validation fails, preventing unsafe user operations.
 *
 * Features:
 * - Material Design 3 compliant
 * - Warm color scheme (red/orange for errors)
 * - Bilingual support (EN + CN)
 * - Detailed technical information
 * - Clear call-to-action
 */

'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import {
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

export interface ConfigErrorPageProps {
  /** Error message to display */
  error: string;
  /** USDC decimals from chain */
  usdcDecimals?: number | null;
  /** PSM cached USDC decimals */
  psmUsdcDecimals?: number | null;
  /** Expected SCALE factor */
  expectedScale?: bigint | null;
  /** Actual PSM SCALE factor */
  psmScale?: bigint | null;
}

/**
 * ConfigErrorPage Component
 * Displays configuration validation errors with technical details
 */
export function ConfigErrorPage({
  error,
  usdcDecimals,
  psmUsdcDecimals,
  expectedScale,
  psmScale,
}: ConfigErrorPageProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE4CC 100%)', // Warm gradient
        padding: 3,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={8}
          sx={{
            padding: 4,
            borderRadius: 3,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 32px rgba(255, 87, 51, 0.15)',
          }}
        >
          {/* Error Icon and Title */}
          <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
            <ErrorIcon
              sx={{
                fontSize: 80,
                color: '#FF5733', // Warm red
                marginBottom: 2,
              }}
            />
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: '#D84315', // Deep orange
              }}
            >
              Configuration Error
            </Typography>
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: '#E64A19', // Orange
              }}
            >
              配置错误
            </Typography>
          </Box>

          {/* Main Error Alert */}
          <Alert
            severity="error"
            sx={{
              marginBottom: 3,
              backgroundColor: '#FFEBEE',
              '& .MuiAlert-icon': {
                color: '#D32F2F',
              },
            }}
          >
            <AlertTitle sx={{ fontWeight: 600 }}>
              Critical Configuration Mismatch Detected
              <br />
              检测到关键配置不匹配
            </AlertTitle>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {error}
            </Typography>
          </Alert>

          {/* Action Guidance */}
          <Paper
            variant="outlined"
            sx={{
              padding: 3,
              marginBottom: 3,
              backgroundColor: '#FFF3E0',
              borderColor: '#FFB74D',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F57C00' }}>
              ⚠️ Operations Blocked / 操作已阻止
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>English:</strong>
              <br />
              All swap operations have been blocked to prevent precision loss or incorrect
              calculations. This safety measure protects your funds from potential 10^12x
              miscalculations.
            </Typography>
            <Typography variant="body1">
              <strong>中文：</strong>
              <br />
              所有交换操作已被阻止，以防止精度损失或计算错误。此安全措施可保护您的资金免受潜在的
              10^12 倍错误计算的影响。
            </Typography>
          </Paper>

          {/* Technical Details (Collapsible) */}
          {(usdcDecimals !== null || psmUsdcDecimals !== null) && (
            <Accordion sx={{ marginBottom: 3 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: '#FFF8E1',
                  '&:hover': {
                    backgroundColor: '#FFF3E0',
                  },
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Technical Details / 技术细节
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: '#FFFBF5' }}>
                <Box component="dl" sx={{ margin: 0 }}>
                  {usdcDecimals !== null && (
                    <>
                      <Typography component="dt" variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                        On-chain USDC decimals:
                      </Typography>
                      <Typography component="dd" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        {usdcDecimals}
                      </Typography>
                    </>
                  )}
                  {psmUsdcDecimals !== null && (
                    <>
                      <Typography component="dt" variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                        PSM cached USDC decimals:
                      </Typography>
                      <Typography component="dd" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        {psmUsdcDecimals}
                      </Typography>
                    </>
                  )}
                  {expectedScale !== null && (
                    <>
                      <Typography component="dt" variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                        Expected SCALE factor:
                      </Typography>
                      <Typography component="dd" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        {expectedScale.toString()} (10^
                        {usdcDecimals !== null ? 18 - usdcDecimals : '?'})
                      </Typography>
                    </>
                  )}
                  {psmScale !== null && (
                    <>
                      <Typography component="dt" variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                        Actual PSM SCALE factor:
                      </Typography>
                      <Typography component="dd" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        {psmScale.toString()} (10^
                        {psmUsdcDecimals !== null ? 18 - psmUsdcDecimals : '?'})
                      </Typography>
                    </>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{
                backgroundColor: '#FF6F00',
                '&:hover': {
                  backgroundColor: '#E65100',
                },
                paddingX: 4,
                paddingY: 1.5,
                fontWeight: 600,
              }}
            >
              Refresh Page / 刷新页面
            </Button>
          </Box>

          {/* Support Contact */}
          <Box sx={{ marginTop: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              If the problem persists, please contact the development team.
              <br />
              如果问题仍然存在，请联系开发团队。
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default ConfigErrorPage;
