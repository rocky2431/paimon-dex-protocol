"use client";

import { useReadContract } from "wagmi";
import { config } from "@/config";

/**
 * useGaugeStatus Hook
 * Check if a pool is registered as a gauge in GaugeController
 */
export const useGaugeStatus = (poolAddress?: `0x${string}`) => {
  const gaugeControllerAddress = config.governanceConfig.gaugeController
    .address as `0x${string}`;

  // Check if pool exists as a gauge
  const { data: gaugeExists, isLoading } = useReadContract({
    address: gaugeControllerAddress,
    abi: [
      {
        inputs: [{ name: "", type: "address" }],
        name: "gaugeExists",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "gaugeExists",
    args: poolAddress ? [poolAddress] : undefined,
    query: {
      enabled: !!poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  return {
    gaugeExists: gaugeExists ?? false,
    isLoading,
    needsGaugeRegistration: poolAddress && !gaugeExists,
  };
};
