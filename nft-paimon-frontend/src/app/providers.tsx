'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { config } from '@/config/appkit'; // Changed from wagmi.ts to appkit.ts
import { theme } from '@/config/theme';
import { useConfigValidation } from '@/hooks/useConfigValidation';
import { ConfigErrorPage } from '@/components/common';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationToast } from '@/components/NotificationToast';

const queryClient = new QueryClient();

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
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SocketProvider>
            <ConfigValidator>
              {children}
              <NotificationToast />
            </ConfigValidator>
          </SocketProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
