'use client';

import React, { useState } from 'react';
import { Box, Container, Typography, Tabs, Tab, Card, Chip } from '@mui/material';
import { BribesList } from './BribesList';
import { CreateBribeForm } from './CreateBribeForm';
import { useBribes } from './hooks/useBribes';
import { BRIBES_DESIGN_TOKENS } from './constants';

/**
 * BribesMarketplace Component
 * Main container for bribes marketplace
 *
 * Features:
 * - Tabbed interface (All Bribes / Create Bribe / My Claims)
 * - Responsive layout
 * - OlympusDAO design aesthetics
 * - Integration with useBribes hook
 */
export const BribesMarketplace: React.FC = () => {
  const { allBribes, isLoading } = useBribes();

  const [activeTab, setActiveTab] = useState<number>(0); // 0 = All Bribes, 1 = Create Bribe, 2 = My Claims

  // Mock tokenId - TODO: Get from veNFT component
  const mockTokenId: bigint | undefined = undefined;

  // ==================== Handlers ====================

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // ==================== Stats ====================

  const totalBribes = allBribes.length;
  const totalValue = allBribes.reduce((sum, bribe) => sum + bribe.amount, 0n);
  const activeGauges = new Set(allBribes.map((b) => b.gauge)).size;

  // ==================== Render ====================

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            mb: 1,
            background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Bribes Marketplace
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Incentivize voters to boost your gauge rewards
        </Typography>

        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 4 }}>
          {/* Total Bribes */}
          <Card
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
              boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
              background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 87, 34, 0.05) 100%)',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {totalBribes}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Bribes
            </Typography>
          </Card>

          {/* Total Value */}
          <Card
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
              boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
              background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 87, 34, 0.05) 100%)',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              ${totalValue > 0n ? '...' : '0'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Value (USD)
            </Typography>
          </Card>

          {/* Active Gauges */}
          <Card
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
              boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
              background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 87, 34, 0.05) 100%)',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {activeGauges}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Gauges
            </Typography>
          </Card>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1.1rem',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                All Bribes
                {totalBribes > 0 && (
                  <Chip
                    label={totalBribes}
                    size="small"
                    sx={{
                      bgcolor: activeTab === 0 ? 'primary.main' : 'grey.300',
                      color: activeTab === 0 ? 'white' : 'text.secondary',
                      fontWeight: 600,
                      height: 20,
                      fontSize: '0.75rem',
                    }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Create Bribe" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                My Claims
                {mockTokenId && (
                  <Chip
                    label="veNFT"
                    size="small"
                    sx={{
                      bgcolor: activeTab === 2 ? 'success.main' : 'grey.300',
                      color: activeTab === 2 ? 'white' : 'text.secondary',
                      fontWeight: 600,
                      height: 20,
                      fontSize: '0.75rem',
                    }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box>
        {/* Tab 0: All Bribes - BribesList handles Loading and Empty states (no data case) */}
        {activeTab === 0 && <BribesList bribes={allBribes} tokenId={mockTokenId} isLoading={isLoading} />}

        {/* Tab 1: Create Bribe */}
        {activeTab === 1 && <CreateBribeForm />}

        {/* Tab 2: My Claims */}
        {activeTab === 2 && (
          <BribesList
            bribes={allBribes}
            tokenId={mockTokenId}
            isLoading={isLoading}
          />
        )}
      </Box>
    </Container>
  );
};
