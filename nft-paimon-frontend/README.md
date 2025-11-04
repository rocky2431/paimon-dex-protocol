# Paimon DEX Frontend

Next.js 14 frontend for Paimon DEX - a veNFT Governance DEX on BSC.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Web3**: wagmi v2 + RainbowKit + viem
- **UI Library**: Material-UI v5
- **State Management**: TanStack Query (React Query)
- **Network**: BSC Mainnet + BSC Testnet
- **i18n**: next-intl (English + Chinese)

## Features

- ✅ Wallet connection (MetaMask, Trust Wallet, WalletConnect)
- ✅ BSC mainnet/testnet switching
- ✅ Material Design 3 compliant
- ✅ Warm color theme (no blue/purple)
- ✅ Responsive design (mobile + desktop)
- ✅ Bilingual support (EN + CN)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Get your WalletConnect Project ID from https://cloud.walletconnect.com
# Add it to .env.local
```

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Type check
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   ├── providers.tsx    # Context providers
│   │   └── globals.css      # Global styles
│   ├── config/              # Configuration
│   │   ├── wagmi.ts        # wagmi + RainbowKit config
│   │   └── theme.ts        # MUI theme (warm colors)
│   ├── components/          # Reusable components (to be added)
│   ├── hooks/               # Custom hooks (to be added)
│   └── utils/               # Utilities (to be added)
├── public/                  # Static assets
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## Environment Variables

See `.env.example` for required variables.

### WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Create a new project
3. Copy the Project ID
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Deployment

```bash
npm run build
npm start
```

## Next Steps

1. [ ] Implement PSM swap UI
2. [ ] Implement veNFT locking UI
3. [ ] Implement gauge voting UI
4. [ ] Implement bribe marketplace UI
5. [ ] Add analytics dashboard

## License

MIT
