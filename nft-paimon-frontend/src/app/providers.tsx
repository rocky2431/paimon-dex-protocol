'use client';

import React, { Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { theme } from '@/config/theme';
import { useConfigValidation } from '@/hooks/useConfigValidation';
import { ConfigErrorPage } from '@/components/common';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationToast } from '@/components/NotificationToast';

// Lazy load Web3Provider to improve initial page load performance
// This prevents loading ~242MB of Web3 dependencies on pages that don't need wallets
const Web3Provider = React.lazy(() =>
  import('@/components/providers/Web3Provider').then((mod) => ({
    default: mod.Web3Provider,
  }))
);

/**
 * Web3LoadingFallback Component
 * Minimal loading UI while Web3Provider is being lazy-loaded
 * 最小化的加载界面
 */
function Web3LoadingFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFF5E6',
      }}
    >
      <CircularProgress size={60} sx={{ color: '#FF6F00' }} />
    </Box>
  );
}

/**
 * ConfigValidator Component
 * Validates configuration before rendering app content
 * 配置验证组件
 */
function ConfigValidator({ children }: { children: React.ReactNode }) {
  const validation = useConfigValidation();

  // Show loading spinner while validating
  if (validation.isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#FFF5E6',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#FF6F00' }} />
      </Box>
    );
  }

  // Show error page if validation fails
  if (!validation.isValid) {
    return (
      <ConfigErrorPage
        error={validation.error || 'Unknown configuration error'}
        usdcDecimals={validation.usdcDecimals}
        psmUsdcDecimals={validation.psmUsdcDecimals}
        expectedScale={validation.expectedScale}
        psmScale={validation.psmScale}
      />
    );
  }

  // Validation passed, render app content
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense fallback={<Web3LoadingFallback />}>
        <Web3Provider>
          <SocketProvider>
            <ConfigValidator>
              {children}
              <NotificationToast />
            </ConfigValidator>
          </SocketProvider>
        </Web3Provider>
      </Suspense>
    </ThemeProvider>
  );
}
