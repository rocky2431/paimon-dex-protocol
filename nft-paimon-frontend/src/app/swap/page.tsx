'use client';

import { Container, Typography, Box } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import { SwapCard } from '@/components/swap/SwapCard';
import { PSMSwapCard } from '@/components/swap/PSMSwapCard';

/**
 * Swap Page (V3 - 扁平化架构)
 *
 * 功能: PSM + DEX 交易统一入口
 * 路由: /swap
 * Tabs: PSM (1:1稳定币兑换) | DEX (AMM交易)
 *
 * 设计理念:
 * - 主入口: PSM（新用户友好，无滑点）
 * - 高级功能: DEX（任意代币交易）
 * - Tab切换: 保持在同一页面，减少跳转
 */
export default function SwapPage() {
  const [currentTab, setCurrentTab] = useTabState('psm');

  const SWAP_TABS = [
    { value: 'psm', label: 'PSM' },
    { value: 'dex', label: 'DEX' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation />

      {/* Main content area */}
      <Container
        maxWidth="lg"
        sx={{
          pt: 12, // Account for fixed navbar
          pb: 8,
          px: {
            xs: 2,
            sm: 3,
          },
          minHeight: '100vh',
        }}
      >
        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Sub-navigation tabs (PSM | DEX) */}
        <SubNavigation
          tabs={SWAP_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="scrollable"
        />

        {/* Tab content */}
        {currentTab === 'psm' && <PSMSwapCard />}
        {currentTab === 'dex' && <SwapCard />}

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Footer info */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 4,
            textAlign: 'center',
            fontSize: '0.875rem',
          }}
        >
          {currentTab === 'psm'
            ? 'PSM (Peg Stability Module) • 1:1 Stablecoin Swap • 0.1% Fee'
            : 've33 DEX • Automated Market Maker • BSC Network'
          }
        </Typography>
      </Container>
    </Box>
  );
}
