/**
 * React hook for fetching historical APR and rewards data.
 *
 * Integrates with backend /api/v2/historical endpoints.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface APRSnapshot {
  pool_address: string;
  pool_name: string;
  timestamp: string;
  apr: number;
  tvl_usd: number;
  trading_volume_24h: number;
}

export interface APRHistory {
  pool_address: string;
  pool_name: string;
  period: string;
  snapshots: APRSnapshot[];
  avg_apr: number;
  max_apr: number;
  min_apr: number;
}

export interface RewardSnapshot {
  user_address: string;
  pool_address: string;
  timestamp: string;
  reward_type: string;
  amount: number;
  cumulative_amount: number;
}

export interface RewardsHistory {
  user_address: string;
  pool_address?: string;
  reward_type?: string;
  period: string;
  rewards: RewardSnapshot[];
  total_earned: number;
}

/**
 * Fetch APR history for a pool.
 *
 * @param poolAddress - Pool contract address
 * @param period - Time period (7d, 30d, 90d)
 * @returns APR history with loading/error states
 */
export function useAPRHistory(
  poolAddress: string | null,
  period: '7d' | '30d' | '90d' = '30d'
) {
  const [data, setData] = useState<APRHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolAddress) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<APRHistory>(
          `${API_BASE_URL}/api/v2/historical/apr/${poolAddress}`,
          { params: { period } }
        );
        setData(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch APR history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [poolAddress, period]);

  return { data, loading, error };
}

/**
 * Fetch rewards history for a user.
 *
 * @param userAddress - User wallet address
 * @param options - Filter options (pool, type, period)
 * @returns Rewards history with loading/error states
 */
export function useRewardsHistory(
  userAddress: string | null,
  options: {
    poolAddress?: string;
    rewardType?: 'lp' | 'debt' | 'boost' | 'ecosystem';
    period?: '7d' | '30d' | '90d';
  } = {}
) {
  const [data, setData] = useState<RewardsHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { poolAddress, rewardType, period = '30d' } = options;

  useEffect(() => {
    if (!userAddress) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: any = { period };
        if (poolAddress) params.pool_address = poolAddress;
        if (rewardType) params.reward_type = rewardType;

        const response = await axios.get<RewardsHistory>(
          `${API_BASE_URL}/api/v2/historical/rewards/${userAddress}`,
          { params }
        );
        setData(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch rewards history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userAddress, poolAddress, rewardType, period]);

  return { data, loading, error };
}

/**
 * Fetch latest APR for all pools.
 *
 * @returns Latest APR snapshots for all pools
 */
export function useLatestAPRAllPools() {
  const [data, setData] = useState<APRSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<APRSnapshot[]>(
          `${API_BASE_URL}/api/v2/historical/apr/pools/all`
        );
        setData(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch APR data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
