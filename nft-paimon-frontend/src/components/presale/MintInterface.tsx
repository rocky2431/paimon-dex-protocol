'use client';

import { Box, Button, CardContent, Typography, CircularProgress, Alert, LinearProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { StyledCard } from '@/components/common';
import { QuantitySelector } from './QuantitySelector';
import { CostDisplay } from './CostDisplay';
import { useMintBondNFT } from './hooks/useMintBondNFT';
import { PRESALE_MESSAGES, MINT_CONFIG } from './constants';
import { getBscScanLink } from '@/config';

/**
 * Main Mint Interface Component
 * Handles the complete minting flow: quantity selection → approval → minting
 */
export function MintInterface() {
  const {
    quantity,
    setQuantity,
    isApproving,
    isMinting,
    isApproved,
    contractData,
    costCalculation,
    validation,
    handleApprove,
    handleMint,
    approvalTxHash,
    mintTxHash,
  } = useMintBondNFT();

  const totalSupply = contractData.totalSupply;
  const remaining = MINT_CONFIG.MAX_SUPPLY - totalSupply;
  const progress = (totalSupply / MINT_CONFIG.MAX_SUPPLY) * 100;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Typography variant="h4" sx={{ mb: 1, color: '#D17A00', fontWeight: 'bold', textAlign: 'center' }}>
        Mint RWA Bond NFTs
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: '#8B4000', textAlign: 'center' }}>
        Invest in real-world assets with guaranteed yield and gamified rewards
      </Typography>

      {/* Supply Progress */}
      <StyledCard variant="accent" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.7)', fontWeight: 600 }}>
              Total Minted:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, color: 'rgba(0, 0, 0, 0.9)' }}>
              {totalSupply.toLocaleString()} / {MINT_CONFIG.MAX_SUPPLY.toLocaleString()}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(255, 255, 255, 0.3)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 5,
              },
            }}
          />
          <Typography variant="body2" sx={{ display: 'block', mt: 1.5, textAlign: 'center', color: 'rgba(0, 0, 0, 0.7)', fontWeight: 500 }}>
            {remaining.toLocaleString()} NFTs remaining
          </Typography>
        </CardContent>
      </StyledCard>

      {/* Quantity Selector */}
      <StyledCard variant="white" sx={{ mb: 3 }}>
        <QuantitySelector
          quantity={quantity}
          onChange={setQuantity}
          disabled={isApproving || isMinting}
        />
      </StyledCard>

      {/* Cost Display */}
      <Box sx={{ mb: 3 }}>
        <CostDisplay calculation={costCalculation} userBalance={contractData.usdcBalance} />
      </Box>

      {/* Error Message */}
      {!validation.isValid && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {validation.error}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Step 1: Approve USDC */}
        <Button
          variant="contained"
          size="large"
          onClick={handleApprove}
          disabled={!validation.isValid || isApproved || isApproving || isMinting}
          startIcon={
            isApproving ? (
              <CircularProgress size={20} sx={{ color: 'white' }} />
            ) : isApproved ? (
              <CheckCircleIcon />
            ) : null
          }
          sx={{
            bgcolor: isApproved ? '#2E7D32' : '#FF8C00',
            color: 'white',
            py: 1.5,
            fontSize: '16px',
            fontWeight: 'bold',
            '&:hover': {
              bgcolor: isApproved ? '#2E7D32' : '#FF7F00',
            },
            '&.Mui-disabled': {
              bgcolor: '#FFCC80',
              color: 'white',
            },
          }}
        >
          {isApproving
            ? PRESALE_MESSAGES.APPROVAL_PENDING
            : isApproved
              ? '✓ USDC Approved'
              : `Step 1: Approve ${costCalculation.formattedCost} USDC`}
        </Button>

        {/* Approval Transaction */}
        {approvalTxHash && (
          <Typography variant="caption" sx={{ textAlign: 'center', color: '#A0522D' }}>
            Approval Tx:{' '}
            <a
              href={getBscScanLink(approvalTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#FF8C00' }}
            >
              {approvalTxHash.slice(0, 10)}...{approvalTxHash.slice(-8)}
            </a>
          </Typography>
        )}

        {/* Step 2: Mint NFTs */}
        <Button
          variant="contained"
          size="large"
          onClick={handleMint}
          disabled={!validation.isValid || !isApproved || isMinting}
          startIcon={isMinting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null}
          sx={{
            bgcolor: '#FFB74D',
            color: '#5D4037',
            py: 1.5,
            fontSize: '16px',
            fontWeight: 'bold',
            '&:hover': {
              bgcolor: '#FFA726',
            },
            '&.Mui-disabled': {
              bgcolor: '#FFE0B2',
              color: '#A1887F',
            },
          }}
        >
          {isMinting ? PRESALE_MESSAGES.MINT_PENDING : `Step 2: Mint ${quantity} Bond NFT${quantity > 1 ? 's' : ''}`}
        </Button>

        {/* Mint Transaction */}
        {mintTxHash && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {PRESALE_MESSAGES.MINT_SUCCESS}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Transaction:{' '}
              <a
                href={getBscScanLink(mintTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2E7D32' }}
              >
                {mintTxHash.slice(0, 10)}...{mintTxHash.slice(-8)}
              </a>
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Info Card */}
      <StyledCard variant="accent" sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: '#D17A00' }}>
            Bond NFT Benefits
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 3, color: '#8B4000' }}>
            <li>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Guaranteed 2% APY (0.5 USDC yield per NFT over 90 days)
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Earn up to 1.5 USDC bonus through weekly dice rolls and social tasks
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Upgrade rarity (Bronze → Silver → Gold → Platinum → Diamond)
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Redeem for USDC or convert to veNFT for governance power
              </Typography>
            </li>
          </Box>
        </CardContent>
      </StyledCard>
    </Box>
  );
}
