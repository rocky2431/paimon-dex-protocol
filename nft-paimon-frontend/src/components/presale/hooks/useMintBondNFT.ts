'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import type { MintState, CostCalculation, MintValidation, ContractData, TransactionState } from '../types';
import {
  BOND_NFT_ADDRESSES,
  USDC_ADDRESSES,
  BOND_NFT_ABI,
  ERC20_ABI,
  MINT_CONFIG,
  PRESALE_MESSAGES,
} from '../constants';

/**
 * Hook for minting RWA Bond NFTs
 * Handles USDC approval and minting flow
 */
export function useMintBondNFT() {
  const { address } = useAccount();
  const chainId = useChainId() as keyof typeof BOND_NFT_ADDRESSES;

  // Contract addresses
  const bondNFTAddress = BOND_NFT_ADDRESSES[chainId];
  const usdcAddress = USDC_ADDRESSES[chainId];

  // State
  const [quantity, setQuantity] = useState<number>(1);
  const [txState, setTxState] = useState<TransactionState>({
    approvalStatus: 'idle',
    mintStatus: 'idle',
  });

  // ==================== Contract Reads ====================

  // Read total supply
  const { data: totalSupply = 0n } = useReadContract({
    address: bondNFTAddress,
    abi: BOND_NFT_ABI,
    functionName: 'totalSupply',
  });

  // Read user's Bond NFT balance
  const { data: userNFTBalance = 0n } = useReadContract({
    address: bondNFTAddress,
    abi: BOND_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read user's USDC balance
  const { data: usdcBalance = 0n } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read USDC allowance
  const { data: allowance = 0n } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, bondNFTAddress] : undefined,
    query: { enabled: !!address },
  });

  // ==================== Contract Writes ====================

  // USDC Approve
  const { data: approveHash, writeContract: approve } = useWriteContract();

  // Bond NFT Mint
  const { data: mintHash, writeContract: mint } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproving, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isMinting, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // ==================== Calculations ====================

  // Cost calculation
  const costCalculation = useMemo<CostCalculation>(() => {
    const pricePerNFT = MINT_CONFIG.NFT_PRICE;
    const totalCost = quantity * pricePerNFT;
    return {
      quantity,
      pricePerNFT,
      totalCost,
      formattedCost: totalCost.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [quantity]);

  // Required amount in wei
  const requiredAmount = useMemo(() => {
    return parseUnits(costCalculation.totalCost.toString(), MINT_CONFIG.DECIMALS);
  }, [costCalculation.totalCost]);

  // Check if approved
  const isApproved = useMemo(() => {
    return allowance >= requiredAmount;
  }, [allowance, requiredAmount]);

  // ==================== Validation ====================

  const validation = useMemo<MintValidation>(() => {
    // Check if wallet connected
    if (!address) {
      return { isValid: false, error: 'Please connect your wallet' };
    }

    // Check quantity range
    if (quantity < MINT_CONFIG.MIN_QUANTITY) {
      return { isValid: false, error: `Minimum quantity is ${MINT_CONFIG.MIN_QUANTITY}` };
    }

    if (quantity > MINT_CONFIG.MAX_QUANTITY) {
      return { isValid: false, error: PRESALE_MESSAGES.MAX_QUANTITY_EXCEEDED };
    }

    // Check supply
    const remaining = MINT_CONFIG.MAX_SUPPLY - Number(totalSupply);
    if (remaining === 0) {
      return { isValid: false, error: PRESALE_MESSAGES.SOLD_OUT };
    }

    if (quantity > remaining) {
      return { isValid: false, error: `Only ${remaining} NFTs remaining` };
    }

    // Check USDC balance
    if (usdcBalance < requiredAmount) {
      return { isValid: false, error: PRESALE_MESSAGES.INSUFFICIENT_BALANCE };
    }

    return { isValid: true };
  }, [address, quantity, totalSupply, usdcBalance, requiredAmount]);

  // ==================== Actions ====================

  const handleApprove = useCallback(async () => {
    if (!validation.isValid || !address) return;

    try {
      setTxState(prev => ({ ...prev, approvalStatus: 'pending' }));

      approve({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [bondNFTAddress, requiredAmount],
      });
    } catch (error) {
      console.error('Approval error:', error);
      setTxState(prev => ({
        ...prev,
        approvalStatus: 'error',
        error: PRESALE_MESSAGES.APPROVAL_ERROR,
      }));
    }
  }, [validation, address, approve, usdcAddress, bondNFTAddress, requiredAmount]);

  const handleMint = useCallback(async () => {
    if (!validation.isValid || !isApproved || !address) return;

    try {
      setTxState(prev => ({ ...prev, mintStatus: 'pending' }));

      mint({
        address: bondNFTAddress,
        abi: BOND_NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
      });
    } catch (error) {
      console.error('Mint error:', error);
      setTxState(prev => ({
        ...prev,
        mintStatus: 'error',
        error: PRESALE_MESSAGES.MINT_ERROR,
      }));
    }
  }, [validation, isApproved, address, mint, bondNFTAddress, quantity]);

  // ==================== Contract Data ====================

  const contractData: ContractData = useMemo(() => ({
    totalSupply: Number(totalSupply),
    userBalance: Number(userNFTBalance),
    usdcBalance: formatUnits(usdcBalance, MINT_CONFIG.DECIMALS),
    allowance: formatUnits(allowance, MINT_CONFIG.DECIMALS),
  }), [totalSupply, userNFTBalance, usdcBalance, allowance]);

  // ==================== Return ====================

  return {
    // State
    quantity,
    setQuantity,

    // Transaction state
    isApproving,
    isMinting,
    isApproved,
    approvalTxHash: approveHash,
    mintTxHash: mintHash,

    // Data
    contractData,
    costCalculation,
    validation,

    // Actions
    handleApprove,
    handleMint,

    // Config
    config: MINT_CONFIG,
  };
}
