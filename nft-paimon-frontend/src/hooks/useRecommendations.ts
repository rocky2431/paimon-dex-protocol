/**
 * Recommendations Hook (Task 64)
 *
 * Fetches personalized pool and strategy recommendations.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PoolRecommendation {
  pool_address: string;
  pool_name: string;
  apr: number;
  tvl_usd: number;
  risk_score: number;
  match_score: number;
}

export interface StrategyRecommendation {
  strategy_name: string;
  description: string;
  expected_apr: number;
  risk_level: string;
  steps: string[];
}

export function usePoolRecommendations(userAddress: string | null) {
  const [recommendations, setRecommendations] = useState<PoolRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<PoolRecommendation[]>(
          `${API_BASE_URL}/api/analytics/recommend/pools/${userAddress}`
        );
        setRecommendations(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch pool recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userAddress]);

  return { recommendations, loading, error };
}

export function useStrategyRecommendations(userAddress: string | null) {
  const [recommendations, setRecommendations] = useState<StrategyRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<StrategyRecommendation[]>(
          `${API_BASE_URL}/api/analytics/recommend/strategies/${userAddress}`
        );
        setRecommendations(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch strategy recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userAddress]);

  return { recommendations, loading, error };
}
