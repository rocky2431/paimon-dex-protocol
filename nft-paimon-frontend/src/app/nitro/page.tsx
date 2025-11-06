/**
 * Nitro Pools Page
 *
 * External incentive pools with governance approval
 */

'use client';

import { useState } from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import { Navigation } from '@/components/layout';
import {
  NitroPoolList,
  NitroParticipateModal,
  NitroRewardsCard,
} from '@/components/nitro';
import type { NitroPool } from '@/components/nitro/types';

/**
 * Nitro Pools Page
 * Nitro 池页面
 */
export default function NitroPage() {
  const [selectedPool, setSelectedPool] = useState<NitroPool | null>(null);
  const [participateModalOpen, setParticipateModalOpen] = useState(false);

  // Mock data - in real implementation, fetch from contract
  const mockPools: NitroPool[] = [
    {
      id: 1n,
      name: 'Project Alpha - USDC/PAIMON LP',
      lpToken: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      lockDuration: BigInt(30 * 24 * 60 * 60), // 30 days
      apr: 2500, // 25%
      active: true,
    },
    {
      id: 2n,
      name: 'Project Beta - USDP/PAIMON LP',
      lpToken: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
      lockDuration: BigInt(60 * 24 * 60 * 60), // 60 days
      apr: 3500, // 35%
      active: true,
    },
    {
      id: 3n,
      name: 'Project Gamma - HYD/USDP LP',
      lpToken: '0x9876543210fedcba9876543210fedcba98765432' as `0x${string}`,
      lockDuration: BigInt(90 * 24 * 60 * 60), // 90 days
      apr: 4500, // 45%
      active: true,
    },
  ];

  const handleParticipate = (poolId: bigint) => {
    const pool = mockPools.find((p) => p.id === poolId);
    if (pool) {
      setSelectedPool(pool);
      setParticipateModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setParticipateModalOpen(false);
    setSelectedPool(null);
  };

  const handleSuccess = () => {
    // Refresh data after successful participation
  };

  return (
    <>
      <Navigation activePage="rewards" />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#ff6b00',
              mb: 1,
            }}
          >
            Nitro Pools
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Participate in external incentive pools to earn additional rewards
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* My Rewards Card */}
          <Grid item xs={12} md={4}>
            <NitroRewardsCard pools={mockPools} locale="en" />
          </Grid>

          {/* Pool List */}
          <Grid item xs={12} md={8}>
            <NitroPoolList
              pools={mockPools}
              showFilter={true}
              locale="en"
            />
          </Grid>
        </Grid>

        {/* Participate Modal */}
        <NitroParticipateModal
          open={participateModalOpen}
          pool={selectedPool}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          locale="en"
        />
      </Container>
    </>
  );
}
