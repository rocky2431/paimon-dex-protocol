/**
 * ClaimVestedButton Component
 * 领取已归属代币按钮组件
 *
 * Button to claim vested PAIMON tokens with transaction handling
 * 用于领取已归属 PAIMON 代币的按钮，带交易处理
 */

import React from 'react';
import { Button, CircularProgress, Alert, Box } from '@mui/material';
import { useWriteContract } from 'wagmi';
import { ESPAIMON_ABI } from '@/config/contracts/esPaimon';
import { testnet } from '@/config/chains/testnet';

export interface ClaimVestedButtonProps {
  /** Amount of claimable tokens 可领取代币数量 */
  claimableAmount: bigint;
}

/**
 * Button component to claim vested tokens
 * 领取已归属代币的按钮组件
 *
 * @example
 * ```tsx
 * <ClaimVestedButton claimableAmount={500000000000000000000n} />
 * ```
 */
const ClaimVestedButton: React.FC<ClaimVestedButtonProps> = ({
  claimableAmount,
}) => {
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const handleClaim = () => {
    writeContract({
      address: testnet.tokens.esPaimon,
      abi: ESPAIMON_ABI,
      functionName: 'claim',
    });
  };

  const isDisabled = claimableAmount === 0n || isPending;

  return (
    <Box>
      <Button
        variant="contained"
        onClick={handleClaim}
        disabled={isDisabled}
        sx={{
          background: 'linear-gradient(90deg, #FF8C00 0%, #FFD700 100%)',
          color: '#FFFFFF',
          fontWeight: 600,
          px: 4,
          py: 1.5,
          '&:hover': {
            background: 'linear-gradient(90deg, #FF7000 0%, #FFC700 100%)',
          },
          '&:disabled': {
            background: '#D3D3D3',
            color: '#A9A9A9',
          },
        }}
      >
        {isPending ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1, color: '#FFFFFF' }} />
            Claiming...
          </>
        ) : (
          'Claim Vested'
        )}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Error: {error.message}
        </Alert>
      )}

      {isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Claim successful!
        </Alert>
      )}
    </Box>
  );
};

export default ClaimVestedButton;
