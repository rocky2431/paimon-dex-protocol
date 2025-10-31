/**
 * useRWAPrice Hook
 * Fetches RWA token price from RWAPriceOracle
 */

import { useReadContract } from 'wagmi';
import { RWA_PRICE_ORACLE_ABI } from '@/config/contracts/rwaPriceOracle';
import { formatUnits } from 'viem';

export function useRWAPrice(oracleAddress?: string) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: oracleAddress as `0x${string}`,
    abi: RWA_PRICE_ORACLE_ABI,
    functionName: 'getPrice',
    query: {
      enabled: !!oracleAddress && oracleAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Price is returned with 18 decimals
  const price = data ? parseFloat(formatUnits(data, 18)) : 0;

  return {
    price,
    isLoading,
    isError,
    refetch,
  };
}
