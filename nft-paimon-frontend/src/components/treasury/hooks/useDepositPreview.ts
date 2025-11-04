/**
 * useDepositPreview Hook
 * Calculates USDP mint amount and health factor for RWA deposit preview
 */

import { useMemo } from "react";
import { useReadContract, useAccount } from "wagmi";
import { TREASURY_ABI } from "@/config/contracts/treasury";
import { config } from "@/config";
import { useRWAPrice } from "./useRWAPrice";
import { DepositPreview } from "@/types/treasury";
import { parseUnits } from "viem";

interface UseDepositPreviewParams {
  assetAddress?: string;
  amount: string; // User input amount as string
  oracleAddress?: string;
  ltvRatio?: number; // LTV in percentage (e.g., 60 for 60%)
}

export function useDepositPreview({
  assetAddress,
  amount,
  oracleAddress,
  ltvRatio,
}: UseDepositPreviewParams) {
  const { address: userAddress } = useAccount();
  const treasuryAddress = config.tokens.treasury as `0x${string}` | undefined;
  const { price: rwaPrice, isLoading: isPriceLoading } =
    useRWAPrice(oracleAddress);

  // Query RWA asset configuration from Treasury
  const { data: assetConfig, isLoading: isConfigLoading } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "rwaAssets",
    args:
      assetAddress && treasuryAddress
        ? [assetAddress as `0x${string}`]
        : undefined,
    query: {
      enabled:
        !!assetAddress &&
        !!treasuryAddress &&
        assetAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // Query BPS denominator from contract
  const { data: bpsDenominator } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "BPS_DENOMINATOR",
    query: {
      enabled: !!treasuryAddress,
    },
  });

  // Query user's existing position
  const { data: userPosition } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getUserPosition",
    args:
      userAddress && assetAddress && treasuryAddress
        ? [userAddress, assetAddress as `0x${string}`]
        : undefined,
    query: {
      enabled:
        !!userAddress &&
        !!assetAddress &&
        !!treasuryAddress &&
        assetAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  const preview: DepositPreview | null = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0 || !rwaPrice) {
      return null;
    }

    try {
      // Parse amount to bigint (assuming 18 decimals)
      const amountBigInt = parseUnits(amount, 18);

      // Calculate RWA value in USD (price has 18 decimals, amount has 18 decimals)
      // rwaValue = amount * price (both in 18 decimals, so result is 36 decimals, divide by 1e18)
      const rwaValue =
        (amountBigInt * parseUnits(rwaPrice.toString(), 18)) /
        parseUnits("1", 18);

      // Get LTV ratio from config or props
      let effectiveLtvRatio = ltvRatio || 60; // Default 60%
      let mintDiscount = 0;

      if (assetConfig && bpsDenominator) {
        // ltvRatio from contract is in BPS (e.g., 6000 for 60%)
        effectiveLtvRatio =
          (Number(assetConfig[2]) / Number(bpsDenominator)) * 100;
        mintDiscount = (Number(assetConfig[3]) / Number(bpsDenominator)) * 100;
      }

      // Calculate USDP mint amount with LTV and discount
      // usdpMintAmount = rwaValue * (ltvRatio / 100) * (1 - mintDiscount / 100)
      const ltvMultiplier = BigInt(Math.floor(effectiveLtvRatio * 100));
      const discountMultiplier = BigInt(Math.floor((100 - mintDiscount) * 100));

      let usdpMintAmount = (rwaValue * ltvMultiplier) / 10000n;
      usdpMintAmount = (usdpMintAmount * discountMultiplier) / 10000n;

      // Calculate health factor
      // For new position: healthFactor = (collateralValue / debtValue) * 100
      // Need to consider existing position if any
      let totalRwaValue = rwaValue;
      let totalHydMinted = usdpMintAmount;

      if (userPosition && userPosition[1] > 0n) {
        // User has existing position
        const existingRwaAmount = userPosition[1];
        const existingHydMinted = userPosition[2];

        // Calculate existing RWA value
        const existingRwaValue =
          (existingRwaAmount * parseUnits(rwaPrice.toString(), 18)) /
          parseUnits("1", 18);

        totalRwaValue = rwaValue + existingRwaValue;
        totalHydMinted = usdpMintAmount + existingHydMinted;
      }

      // Health factor = (totalCollateralValue / totalDebt) * 100
      // Avoid division by zero
      const healthFactor =
        totalHydMinted > 0n
          ? Number((totalRwaValue * 100n) / totalHydMinted) / 100
          : 999; // Very high health factor for no debt

      return {
        rwaValue,
        usdpMintAmount,
        ltvRatio: effectiveLtvRatio,
        healthFactor,
        mintDiscount,
      };
    } catch (error) {
      console.error("Error calculating deposit preview:", error);
      return null;
    }
  }, [amount, rwaPrice, ltvRatio, assetConfig, bpsDenominator, userPosition]);

  return {
    preview,
    isLoading: isPriceLoading || isConfigLoading,
  };
}
