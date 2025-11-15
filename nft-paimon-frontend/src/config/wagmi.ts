import { createConfig, http } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';

export const config = createConfig({
  chains: [bscTestnet, bsc], // Testnet first for development/testing
  transports: {
    [bscTestnet.id]: http(),
    [bsc.id]: http(),
  },
  ssr: true,
});
