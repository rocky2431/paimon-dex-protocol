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

// Get projectId from environment
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined');
}

// Set up metadata
const metadata = {
  name: 'Paimon DEX',
  description: 'RWA + veDEX + CDP Protocol on BSC',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://paimon.dex',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// Define networks (use type assertion to match AppKitNetwork array type)
const networksList: [AppKitNetwork, ...AppKitNetwork[]] = [bscTestnet, bsc]; // Testnet first for development

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: networksList,
  projectId,
});

// Create modal with social login support
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: networksList,
  projectId,
  metadata,
  features: {
    email: true, // Enable email login
    socials: ['google', 'x'], // Enable Google and X (Twitter) social login
    emailShowWallets: true, // Show wallet options even when using email
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#FF6F00', // Orange accent color
    '--w3m-border-radius-master': '8px',
  },
});

// Export wagmi config for use in providers
export const config = wagmiAdapter.wagmiConfig;
