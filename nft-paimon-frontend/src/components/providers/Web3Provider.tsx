/**
 * Web3Provider Component
 *
 * Provides Web3 functionality (Wagmi + React Query) to the application.
 * This component is lazy-loaded to improve initial page load performance.
 *
 * Lazy loading benefits:
 * - Reduces initial bundle size by ~242MB
 * - Faster page load for non-wallet pages
 * - Web3 dependencies only loaded when needed
 *
 * @see src/app/providers.tsx - Lazy loading implementation
 */

'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/appkit';

// Create QueryClient instance
const queryClient = new QueryClient();

/**
 * Web3Provider props
 */
interface Web3ProviderProps {
  children: React.ReactNode;
}

/**
 * Web3Provider component
 *
 * Wraps children with Wagmi and React Query providers.
 * Lazy-loaded to optimize initial page load performance.
 *
 * @param props - Component props
 * @param props.children - Child components that need Web3 functionality
 * @returns React component with Web3 providers
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
