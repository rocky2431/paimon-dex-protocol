/**
 * useKYCStatus Hook
 *
 * Fetches KYC status from backend API for a given wallet address.
 * Includes tier level, status, and approval information.
 *
 * @param address - Wallet address to fetch KYC status for
 * @returns KYC status data, loading state, and error
 *
 * @example
 * const { data, isLoading, error } = useKYCStatus(address);
 */

import { useState, useEffect } from 'react';

export interface KYCStatus {
  tier: number; // 0, 1, or 2
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  blockpassId: string | null;
  approvedAt: string | null;
}

export interface UseKYCStatusReturn {
  data: KYCStatus | null;
  isLoading: boolean;
  error: Error | null;
}

export function useKYCStatus(address: string | undefined): UseKYCStatusReturn {
  const [data, setData] = useState<KYCStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Don't fetch if address is not provided
    if (!address) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchKYCStatus = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get JWT token from localStorage
        const token = localStorage.getItem('jwtToken');

        // Fetch KYC status from backend
        const response = await fetch(
          `/api/kyc/status/${address}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch KYC status: ${response.statusText}`);
        }

        const kycStatus = await response.json();
        setData(kycStatus);
      } catch (err) {
        setError(err as Error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKYCStatus();
  }, [address]);

  return { data, isLoading, error };
}
