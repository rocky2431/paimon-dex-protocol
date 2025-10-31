'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { useAccount } from 'wagmi';
import { VeNFTOption } from './VeNFTOption';
import { CashOption } from './CashOption';
import { OptionComparisonTable } from './OptionComparisonTable';
import { ConfirmationModal } from './ConfirmationModal';
import { BondData, RarityTier } from '@/types/bond';
import {
  SettlementOption,
  VeNFTSettlementOption,
  CashSettlementOption,
  createVeNFTOption,
  createCashOption,
  generateComparisonMetrics,
} from '@/types/settlement';

interface SettlementPageProps {
  tokenId: number;
}

/**
 * SettlementPage Component
 * Main settlement interface with 2-option comparison
 *
 * Features:
 * - Bond info display
 * - veNFT vs Cash comparison table
 * - Lock duration selector for veNFT
 * - Confirmation modal
 * - Settlement execution (mock for now)
 */
export function SettlementPage({ tokenId }: SettlementPageProps) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [bond, setBond] = useState<BondData | null>(null);
  const [veNFTOption, setVeNFTOption] = useState<VeNFTSettlementOption | null>(null);
  const [cashOption, setCashOption] = useState<CashSettlementOption | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SettlementOption | null>(null);

  // Transaction state
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadBondData();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, tokenId]);

  /**
   * Load bond data and initialize settlement options
   * TODO: Replace with actual contract calls
   */
  const loadBondData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock bond data (replace with actual contract call)
      // const contract = getRWABondNFTContract();
      // const bondInfo = await contract.getBondInfo(tokenId);
      // const owner = await contract.ownerOf(tokenId);

      // For now, use mock data
      const mockBond: BondData = {
        tokenId,
        principal: 100,
        mintTime: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), // 95 days ago
        maturityDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (matured)
        accumulatedRemint: 5.2,
        diceType: 2, // Diamond
        diceTypeName: 'Diamond Dice',
        weeklyRollsLeft: 0,
        baseYield: 0.5,
        totalYield: 5.7, // 0.5 base + 5.2 Remint
        rarityTier: RarityTier.DIAMOND,
        daysUntilMaturity: 0,
        isMatured: true,
        maturityProgress: 100,
        remintProgress: 100,
      };

      setBond(mockBond);

      // Initialize settlement options with default lock duration (12 months)
      const defaultLockDays = 365; // 12 months
      const veNFT = createVeNFTOption(mockBond, defaultLockDays);
      const cash = createCashOption(mockBond);

      setVeNFTOption(veNFT);
      setCashOption(cash);
    } catch (err) {
      console.error('Failed to load bond data:', err);
      setError('Failed to load bond data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle lock duration change for veNFT option
   */
  const handleLockDurationChange = (durationDays: number) => {
    if (!bond) return;

    const updatedVeNFT = createVeNFTOption(bond, durationDays);
    setVeNFTOption(updatedVeNFT);
  };

  /**
   * Handle settlement button click - opens confirmation modal
   */
  const handleSettleClick = (option: SettlementOption) => {
    setSelectedOption(option);
    setModalOpen(true);
  };

  /**
   * Handle settlement confirmation
   * TODO: Replace with actual contract calls
   */
  const handleConfirmSettle = async () => {
    if (!selectedOption) return;

    try {
      setSettling(true);
      setError(null);

      // Mock transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // TODO: Call settlement contract
      // if (selectedOption === SettlementOption.VE_NFT && veNFTOption) {
      //   const contract = getSettlementRouterContract();
      //   const tx = await contract.settleToVeNFT(tokenId, veNFTOption.lockDurationDays);
      //   await tx.wait();
      // } else if (selectedOption === SettlementOption.CASH) {
      //   const contract = getSettlementRouterContract();
      //   const tx = await contract.settleToCash(tokenId);
      //   await tx.wait();
      // }

      // Mock success
      setSuccess(true);
      setModalOpen(false);

      // Redirect to success page or bonds dashboard after 2 seconds
      setTimeout(() => {
        // window.location.href = '/presale/bonds';
        console.log('Settlement successful! Redirecting...');
      }, 2000);
    } catch (err) {
      console.error('Settlement failed:', err);
      setError('Settlement failed. Please try again.');
      setModalOpen(false);
    } finally {
      setSettling(false);
    }
  };

  if (!isConnected) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Settlement
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          Please connect your wallet to settle your Bond NFT
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={48} sx={{ color: '#FF6B35' }} />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading bond information...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Error
        </Typography>
        <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!bond || !bond.isMatured) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Bond Not Ready for Settlement
        </Typography>
        <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto' }}>
          This bond has not reached maturity yet. Please wait until the maturity date before settling.
        </Alert>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#8BC34A' }}>
          Settlement Successful!
        </Typography>
        <Alert severity="success" sx={{ maxWidth: 600, mx: 'auto' }}>
          Your Bond NFT has been settled successfully. Redirecting...
        </Alert>
      </Box>
    );
  }

  if (!veNFTOption || !cashOption) {
    return null;
  }

  const comparisonMetrics = generateComparisonMetrics(veNFTOption, cashOption);

  return (
    <Box>
      {/* Header */}
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          mb: 1,
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
        }}
      >
        Settle Bond #{tokenId}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontSize: '1.125rem' }}>
        Choose how you want to settle your matured Bond NFT
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 4, display: 'block' }}>
        Total Value: {bond.principal + bond.totalYield} USDC (Principal + Yield)
      </Typography>

      {/* Comparison Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Option Comparison
        </Typography>
        <OptionComparisonTable metrics={comparisonMetrics} />
      </Box>

      {/* Settlement Options Grid */}
      <Grid container spacing={3}>
        {/* veNFT Option */}
        <Grid item xs={12} md={6}>
          <VeNFTOption
            option={veNFTOption}
            onLockDurationChange={handleLockDurationChange}
            onSettle={() => handleSettleClick(SettlementOption.VE_NFT)}
            settling={settling}
          />
        </Grid>

        {/* Cash Option */}
        <Grid item xs={12} md={6}>
          <CashOption
            option={cashOption}
            onSettle={() => handleSettleClick(SettlementOption.CASH)}
            settling={settling}
          />
        </Grid>
      </Grid>

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={modalOpen}
        option={selectedOption || SettlementOption.CASH}
        veNFTOption={selectedOption === SettlementOption.VE_NFT ? veNFTOption : undefined}
        cashOption={selectedOption === SettlementOption.CASH ? cashOption : undefined}
        tokenId={tokenId}
        onConfirm={handleConfirmSettle}
        onCancel={() => setModalOpen(false)}
        confirming={settling}
      />
    </Box>
  );
}
