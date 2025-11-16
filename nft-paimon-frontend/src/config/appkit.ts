/**
 * Reown AppKit Configuration
 *
 * Configures wallet connection with:
 * - BSC Mainnet and Testnet support
 * - Social login (Email, Google, X)
 * - MetaMask, Binance Wallet, WalletConnect support
 *
 * @see https://docs.reown.com/appkit/react/core/installation
 */

import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc, bscTestnet, type AppKitNetwork } from '@reown/appkit/networks';
import { http, fallback } from 'viem';

// Get projectId from environment
const envProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Detect placeholder/invalid Project IDs
const isPlaceholder =
  !envProjectId ||
  envProjectId === 'demo_project_id_placeholder' ||
  envProjectId === 'your_project_id_here' ||
  envProjectId.length < 32; // Valid WalletConnect Project IDs are 32 characters

if (isPlaceholder) {
  console.warn(
    '⚠️ Invalid WalletConnect Project ID detected.\n\n' +
    'Current value: "' + (envProjectId || '(empty)') + '"\n\n' +
    'Impact:\n' +
    '  ❌ Remote configuration will fail (HTTP 403 errors in console)\n' +
    '  ❌ Analytics and usage tracking disabled\n' +
    '  ✅ Local wallet connection still works (MetaMask, Binance Wallet, etc.)\n' +
    '  ✅ WalletConnect QR code may have limited functionality\n\n' +
    'To fix:\n' +
    '  1. Visit https://cloud.reown.com (free account)\n' +
    '  2. Create a new project\n' +
    '  3. Copy your Project ID (32 characters)\n' +
    '  4. Update .env.local:\n' +
    '     NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_real_project_id\n' +
    '  5. Restart dev server: npm run dev\n'
  );
}

// Use empty string for placeholder to minimize errors
// AppKit will fall back to local/default configuration
export const projectId = isPlaceholder ? '' : envProjectId;

// Set up metadata
const metadata = {
  name: 'Paimon DEX',
  description: 'RWA + veDEX + CDP Protocol on BSC',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://paimon.dex',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// Define networks (use type assertion to match AppKitNetwork array type)
const networksList: [AppKitNetwork, ...AppKitNetwork[]] = [bscTestnet, bsc]; // Testnet first for development

// Configure RPC transports with fallback (solves 401 WalletConnect errors)
const transports = {
  [bscTestnet.id]: fallback([
    http('https://data-seed-prebsc-1-s1.binance.org:8545'),
    http('https://data-seed-prebsc-2-s1.binance.org:8545'),
    http('https://bsc-testnet.publicnode.com'),
  ]),
  [bsc.id]: fallback([
    http('https://bsc-dataseed.binance.org'),
    http('https://bsc-dataseed1.defibit.io'),
    http('https://bsc-dataseed1.ninicoin.io'),
  ]),
};

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: networksList,
  projectId, // Still used for WalletConnect modal, not for RPC
  transports, // Custom RPC transports (bypasses WalletConnect RPC)
});

// Create modal with social login support and Binance Wallet prioritization
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: networksList,
  projectId,
  metadata,
  features: {
    email: true, // Enable email login
    socials: ['google', 'x'], // Enable Google and X (Twitter) social login
    emailShowWallets: true, // Show wallet options even when using email
    analytics: false, // Disable analytics to prevent 403 errors and reduce initialization time
  },
  // Highlight Binance Wallet and BSC ecosystem wallets at the top
  // Note: Binance Wallet browser extension is auto-detected as injected wallet
  featuredWalletIds: [
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet (Binance ecosystem)
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
  ],
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#FF6F00', // Orange accent color
    '--w3m-border-radius-master': '8px',
  },
});

// Export wagmi config for use in providers
export const config = wagmiAdapter.wagmiConfig;
