/**
 * useConfigValidation Hook
 * Cross-network configuration consistency validation
 * 跨网配置一致性校验 Hook
 *
 * Purpose:
 * Validates that on-chain USDC decimals match PSM's cached decimals
 * to prevent precision loss or incorrect calculations during swaps.
 *
 * Implementation:
 * 1. Read USDC.decimals() from USDC token contract
 * 2. Read PSM.usdcDecimals() from PSM contract
 * 3. Verify both values match
 * 4. Calculate expected SCALE = 10^(18 - usdcDecimals)
 * 5. Return validation result with detailed error messages
 *
 * Security:
 * - Detects configuration mismatches before user operations
 * - Prevents 10^12 precision loss scenarios
 * - Blocks operations when validation fails
 *
 * @example
 * ```tsx
 * const { isValid, isLoading, error, shouldBlockOperations } = useConfigValidation();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (!isValid) return <ConfigErrorPage error={error} />;
 * ```
 */

'use client';

import { useReadContract, useChainId } from 'wagmi';
import { useMemo } from 'react';
import { ERC20_ABI } from '../config/contracts/erc20';

// PSM ABI for reading cached USDC decimals
const PSM_ABI = [
  {
    type: 'function',
    name: 'usdcDecimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

// Network-specific contract addresses
const ADDRESSES = {
  56: {
    // BSC Mainnet
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as `0x${string}`,
    PSM: '0x0000000000000000000000000000000000000000' as `0x${string}`, // TODO: Update after mainnet deployment
  },
  97: {
    // BSC Testnet (2025-11-07 deployment)
    USDC: '0xA1112f596A73111E102b4a9c39064b2b2383EC38' as `0x${string}`, // Mock USDC (6 decimals)
    PSM: '0x46eB7627024cEd13826359a5c0aEc57c7255b330' as `0x${string}`, // PSM
  },
} as const;

export interface ConfigValidationResult {
  /** Whether configuration is valid and consistent */
  isValid: boolean;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Error message if validation fails */
  error: string | null;
  /** USDC decimals from USDC contract */
  usdcDecimals: number | null;
  /** Cached USDC decimals from PSM contract */
  psmUsdcDecimals: number | null;
  /** Expected SCALE factor (10^(18 - usdcDecimals)) */
  expectedScale: bigint | null;
  /** Calculated SCALE factor from PSM decimals */
  psmScale: bigint | null;
  /** Whether to block user operations */
  shouldBlockOperations: boolean;
}

/**
 * Hook for validating cross-network configuration consistency
 * 跨网配置一致性校验 Hook
 */
export function useConfigValidation(): ConfigValidationResult {
  const chainId = useChainId();

  // Get network-specific addresses
  const addresses = useMemo(() => {
    if (chainId === 56 || chainId === 97) {
      return ADDRESSES[chainId];
    }
    return null;
  }, [chainId]);

  // Read USDC decimals from USDC token contract
  const {
    data: usdcDecimalsData,
    isLoading: isLoadingUsdcDecimals,
    isError: isErrorUsdcDecimals,
    error: errorUsdcDecimals,
  } = useReadContract({
    address: addresses?.USDC,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId,
  });

  // Read cached USDC decimals from PSM contract
  const {
    data: psmUsdcDecimalsData,
    isLoading: isLoadingPsmDecimals,
    isError: isErrorPsmDecimals,
    error: errorPsmDecimals,
  } = useReadContract({
    address: addresses?.PSM,
    abi: PSM_ABI,
    functionName: 'usdcDecimals',
    chainId,
  });

  // Calculate validation result
  const validationResult = useMemo<ConfigValidationResult>(() => {
    // Handle loading state
    const isLoading = isLoadingUsdcDecimals || isLoadingPsmDecimals;
    if (isLoading) {
      return {
        isValid: false,
        isLoading: true,
        error: null,
        usdcDecimals: null,
        psmUsdcDecimals: null,
        expectedScale: null,
        psmScale: null,
        shouldBlockOperations: true,
      };
    }

    // Handle unsupported network
    if (!addresses) {
      return {
        isValid: false,
        isLoading: false,
        error: `Unsupported network (ChainID: ${chainId}). Please switch to BSC Mainnet (56) or Testnet (97).`,
        usdcDecimals: null,
        psmUsdcDecimals: null,
        expectedScale: null,
        psmScale: null,
        shouldBlockOperations: true,
      };
    }

    // Handle USDC decimals read error
    if (isErrorUsdcDecimals || usdcDecimalsData === undefined) {
      return {
        isValid: false,
        isLoading: false,
        error: `Failed to read USDC decimals from chain. ${errorUsdcDecimals?.message || 'Unknown error'}`,
        usdcDecimals: null,
        psmUsdcDecimals: null,
        expectedScale: null,
        psmScale: null,
        shouldBlockOperations: true,
      };
    }

    // Handle PSM decimals read error
    if (isErrorPsmDecimals || psmUsdcDecimalsData === undefined) {
      return {
        isValid: false,
        isLoading: false,
        error: `Failed to read PSM SCALE from chain. ${errorPsmDecimals?.message || 'Unknown error'}`,
        usdcDecimals: Number(usdcDecimalsData),
        psmUsdcDecimals: null,
        expectedScale: null,
        psmScale: null,
        shouldBlockOperations: true,
      };
    }

    // Convert to numbers
    const usdcDecimals = Number(usdcDecimalsData);
    const psmUsdcDecimals = Number(psmUsdcDecimalsData);

    // Validate decimals are within valid range
    if (usdcDecimals < 0 || usdcDecimals > 18) {
      return {
        isValid: false,
        isLoading: false,
        error: `Invalid USDC decimals: ${usdcDecimals}. Must be between 0 and 18.`,
        usdcDecimals,
        psmUsdcDecimals,
        expectedScale: null,
        psmScale: null,
        shouldBlockOperations: true,
      };
    }

    // Calculate SCALE factors
    const expectedScale = BigInt(10 ** (18 - usdcDecimals));
    const psmScale = BigInt(10 ** (18 - psmUsdcDecimals));

    // Validate consistency
    if (usdcDecimals !== psmUsdcDecimals) {
      return {
        isValid: false,
        isLoading: false,
        error: `Configuration mismatch detected!
• On-chain USDC.decimals(): ${usdcDecimals}
• PSM cached decimals: ${psmUsdcDecimals}
• Expected SCALE: 10^${18 - usdcDecimals} = ${expectedScale.toString()}
• PSM SCALE: 10^${18 - psmUsdcDecimals} = ${psmScale.toString()}

⚠️  This mismatch can cause ${
          usdcDecimals < psmUsdcDecimals
            ? `${10 ** (psmUsdcDecimals - usdcDecimals)}x over-calculation`
            : `${10 ** (usdcDecimals - psmUsdcDecimals)}x under-calculation`
        } in swap amounts.

Please contact the development team to redeploy PSM with correct USDC address.`,
        usdcDecimals,
        psmUsdcDecimals,
        expectedScale,
        psmScale,
        shouldBlockOperations: true,
      };
    }

    // All checks passed
    return {
      isValid: true,
      isLoading: false,
      error: null,
      usdcDecimals,
      psmUsdcDecimals,
      expectedScale,
      psmScale,
      shouldBlockOperations: false,
    };
  }, [
    isLoadingUsdcDecimals,
    isLoadingPsmDecimals,
    addresses,
    chainId,
    isErrorUsdcDecimals,
    usdcDecimalsData,
    errorUsdcDecimals,
    isErrorPsmDecimals,
    psmUsdcDecimalsData,
    errorPsmDecimals,
  ]);

  return validationResult;
}
