/**
 * useUserPositions Hook
 * Query all user RWA positions from Treasury contract
 */

"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { TREASURY_ABI } from "@/config/contracts/treasury";
import { config } from "@/config";
import { RWA_ASSETS } from "../constants";
import { UserPosition } from "@/types/treasury";
import { formatUnits } from "viem";
import { useRWAPrice } from "./useRWAPrice";

export interface PositionWithMetadata extends UserPosition {
  assetSymbol: string;
  assetName: string;
  assetTier: number;
  rwaPrice: number;
  rwaValueUSD: number;
  hydValueUSD: number;
  collateralizationRatio: number;
  healthFactor: number;
  canRedeem: boolean;
  timeUntilRedemption: number; // seconds
}

export function useUserPositions() {
  const { address: userAddress } = useAccount();
  const treasuryAddress = config.tokens.treasury as `0x${string}` | undefined;

  // Get RWA assets (hardcoded for 3 assets)
  const asset0 = RWA_ASSETS[0];
  const asset1 = RWA_ASSETS[1];
  const asset2 = RWA_ASSETS[2];

  // ==================== Query Asset 0 ====================
  const {
    data: positionData0,
    isLoading: isLoading0,
    refetch: refetch0,
  } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getUserPosition",
    args:
      userAddress && treasuryAddress && asset0
        ? [userAddress, asset0.address as `0x${string}`]
        : undefined,
    query: {
      enabled: !!userAddress && !!treasuryAddress && !!asset0,
    },
  });

  const { data: canRedeemData0 } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "canRedeem",
    args:
      userAddress && treasuryAddress && asset0
        ? [userAddress, asset0.address as `0x${string}`]
        : undefined,
    query: {
      enabled: !!userAddress && !!treasuryAddress && !!asset0,
    },
  });

  const { price: rwaPrice0 } = useRWAPrice(asset0?.address);

  // ==================== Query Asset 1 ====================
  const {
    data: positionData1,
    isLoading: isLoading1,
    refetch: refetch1,
  } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getUserPosition",
    args:
      userAddress && treasuryAddress && asset1
        ? [userAddress, asset1.address as `0x${string}`]
        : undefined,
    query: {
      enabled: !!userAddress && !!treasuryAddress && !!asset1,
    },
  });

  const { data: canRedeemData1 } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "canRedeem",
    args:
      userAddress && treasuryAddress && asset1
        ? [userAddress, asset1.address as `0x${string}`]
        : undefined,
    query: {
      enabled: !!userAddress && !!treasuryAddress && !!asset1,
    },
  });

  const { price: rwaPrice1 } = useRWAPrice(asset1?.address);

  // ==================== Query Asset 2 ====================
  const {
    data: positionData2,
    isLoading: isLoading2,
    refetch: refetch2,
  } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getUserPosition",
    args:
      userAddress && treasuryAddress && asset2
        ? [userAddress, asset2.address as `0x${string}`]
        : undefined,
    query: {
      enabled: !!userAddress && !!treasuryAddress && !!asset2,
    },
  });

  const { data: canRedeemData2 } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "canRedeem",
    args:
      userAddress && treasuryAddress && asset2
        ? [userAddress, asset2.address as `0x${string}`]
        : undefined,
    query: {
      enabled: !!userAddress && !!treasuryAddress && !!asset2,
    },
  });

  const { price: rwaPrice2 } = useRWAPrice(asset2?.address);

  // Query redemption cooldown constant
  const { data: redemptionCooldownData } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "REDEMPTION_COOLDOWN",
    query: {
      enabled: !!treasuryAddress,
    },
  });

  const redemptionCooldown = redemptionCooldownData
    ? Number(redemptionCooldownData)
    : 7 * 24 * 60 * 60; // Default 7 days

  // Transform data into enriched positions
  const positions: PositionWithMetadata[] = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);

    const queries = [
      {
        asset: asset0,
        positionData: positionData0,
        canRedeemData: canRedeemData0,
        rwaPrice: rwaPrice0,
      },
      {
        asset: asset1,
        positionData: positionData1,
        canRedeemData: canRedeemData1,
        rwaPrice: rwaPrice1,
      },
      {
        asset: asset2,
        positionData: positionData2,
        canRedeemData: canRedeemData2,
        rwaPrice: rwaPrice2,
      },
    ];

    return queries
      .filter((query) => {
        // Filter out empty positions
        if (!query.positionData) return false;
        const [, rwaAmount] = query.positionData;
        return rwaAmount > 0n;
      })
      .map((query) => {
        const { asset, positionData, canRedeemData, rwaPrice } = query;
        const [rwaAsset, rwaAmount, hydMinted, depositTime] = positionData!;

        // Calculate USD values
        const rwaAmountFloat = parseFloat(formatUnits(rwaAmount, 18));
        const hydMintedFloat = parseFloat(formatUnits(hydMinted, 18));
        const rwaValueUSD = rwaAmountFloat * rwaPrice;
        const hydValueUSD = hydMintedFloat; // HYD is 1:1 with USD

        // Calculate collateralization ratio (collateral / debt * 100%)
        const collateralizationRatio =
          hydValueUSD > 0 ? (rwaValueUSD / hydValueUSD) * 100 : 999;

        // Calculate health factor (same as collateralization ratio for now)
        // In production, this would consider liquidation thresholds
        const healthFactor = collateralizationRatio;

        // Calculate time until redemption
        const depositTimeNum = Number(depositTime);
        const timeUntilRedemption = Math.max(
          0,
          depositTimeNum + redemptionCooldown - now
        );

        return {
          rwaAsset,
          rwaAmount,
          hydMinted,
          depositTime,
          assetSymbol: asset.symbol,
          assetName: asset.name,
          assetTier: asset.tier,
          rwaPrice,
          rwaValueUSD,
          hydValueUSD,
          collateralizationRatio,
          healthFactor,
          canRedeem: canRedeemData === true,
          timeUntilRedemption,
        };
      });
  }, [
    asset0,
    asset1,
    asset2,
    positionData0,
    positionData1,
    positionData2,
    canRedeemData0,
    canRedeemData1,
    canRedeemData2,
    rwaPrice0,
    rwaPrice1,
    rwaPrice2,
    redemptionCooldown,
  ]);

  // Aggregate loading state
  const isLoading = isLoading0 || isLoading1 || isLoading2;

  // Refetch all positions
  const refetchAll = () => {
    refetch0();
    refetch1();
    refetch2();
  };

  // Calculate aggregate stats
  const totalCollateralUSD = positions.reduce(
    (sum, pos) => sum + pos.rwaValueUSD,
    0
  );
  const totalDebtUSD = positions.reduce((sum, pos) => sum + pos.hydValueUSD, 0);
  const overallHealthFactor =
    totalDebtUSD > 0 ? (totalCollateralUSD / totalDebtUSD) * 100 : 999;

  return {
    positions,
    isLoading,
    refetchAll,
    totalCollateralUSD,
    totalDebtUSD,
    overallHealthFactor,
  };
}
