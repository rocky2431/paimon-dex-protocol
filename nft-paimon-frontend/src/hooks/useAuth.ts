/**
 * Authentication Hook for Wallet and Social Login
 *
 * Handles:
 * - Wallet signature login (MetaMask, Binance, WalletConnect)
 * - Social login (Email, Google, X via Reown AppKit)
 * - JWT Token management
 * - Auto-login after wallet connection
 *
 * Note: Reown AppKit social login creates smart wallets, so we use
 * wallet signature flow instead of traditional OAuth token flow.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  address: string | null;
  email: string | null;
  tokens: AuthTokens | null;
  error: string | null;
}

/**
 * useAuth Hook
 *
 * Provides authentication functionality for both wallet and social login
 *
 * @example
 * ```tsx
 * const { isAuthenticated, login, logout, error } = useAuth();
 *
 * // Manual login (optional, auto-login is enabled by default)
 * await login();
 *
 * // Logout
 * logout();
 * ```
 */
export function useAuth() {
  const { address, isConnected } = useAccount();
  const { embeddedWalletInfo } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage();

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    address: null,
    email: null,
    tokens: null,
    error: null,
  });

  /**
   * Get nonce from backend for signature
   */
  const getNonce = useCallback(async (walletAddress: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/nonce?address=${walletAddress}`);

    if (!response.ok) {
      throw new Error('Failed to get nonce from server');
    }

    const data = await response.json();
    return data.nonce;
  }, []);

  /**
   * Login with wallet signature
   */
  const login = useCallback(async (): Promise<void> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Get nonce from backend
      const nonce = await getNonce(address);

      // Step 2: Create message to sign
      const message = `Sign this message to login to Paimon DEX.\n\nNonce: ${nonce}`;

      // Step 3: Sign message
      const signature = await signMessageAsync({ message });

      // Step 4: Send signature to backend for verification
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for httpOnly refresh token
        body: JSON.stringify({
          address,
          message,
          signature,
          nonce,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const tokens: AuthTokens = await response.json();

      // Step 5: Store access token in localStorage
      localStorage.setItem('access_token', tokens.accessToken);

      // Extract email from embedded wallet info (for social login users)
      const email = embeddedWalletInfo?.user?.email || null;

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        address,
        email,
        tokens,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        address: null,
        email: null,
        tokens: null,
        error: errorMessage,
      });

      throw error;
    }
  }, [address, signMessageAsync, getNonce, embeddedWalletInfo]);

  /**
   * Logout user
   */
  const logout = useCallback((): void => {
    // Clear tokens from storage
    localStorage.removeItem('access_token');

    // Reset auth state
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      address: null,
      email: null,
      tokens: null,
      error: null,
    });
  }, []);

  /**
   * Auto-login when wallet connects
   */
  useEffect(() => {
    if (isConnected && address && !authState.isAuthenticated) {
      // Auto-login after wallet connection
      login().catch((error) => {
        console.error('Auto-login failed:', error);
      });
    }

    // Logout when wallet disconnects
    if (!isConnected && authState.isAuthenticated) {
      logout();
    }
  }, [isConnected, address, authState.isAuthenticated, login, logout]);

  /**
   * Load tokens from storage on mount
   */
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');

    if (storedToken && address) {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        address,
        tokens: {
          accessToken: storedToken,
          refreshToken: '', // Refresh token is in httpOnly cookie
          tokenType: 'bearer',
        },
      }));
    }
  }, [address]);

  return {
    ...authState,
    login,
    logout,
  };
}
