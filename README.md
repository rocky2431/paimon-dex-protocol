# Paimon.dex

> DeFi protocol combining RWA (Real World Asset) tokenization, ve33 DEX, and treasury-backed synthetic assets.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://docs.soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

## Overview

**Paimon.dex** is a comprehensive DeFi protocol that bridges real-world assets with decentralized finance.

### Key Tokens
- **HYD**: Treasury-backed synthetic asset with multi-tier RWA collateralization
- **PAIMON**: Utility token for platform governance
- **veNFT**: Vote-escrowed NFT for governance rights (1 week ~ 4 years lock)

## Project Structure

```
paimon 1111111/
├── paimon-rwa-contracts/    # Solidity smart contracts (Foundry)
├── nft-paimon-frontend/     # Next.js 14 frontend (TypeScript)
└── .ultra/                  # Ultra Builder Pro project management
```

## Quick Start

### Smart Contracts
```bash
cd paimon-rwa-contracts
forge build && forge test
```

### Frontend
```bash
cd nft-paimon-frontend
npm install && npm run dev
```

## Development Workflow

This project uses **Ultra Builder Pro** for task management:

```bash
/ultra-status    # Check project status
/ultra-plan      # Plan tasks from requirements
/ultra-dev       # Develop with TDD workflow
/ultra-test      # Run comprehensive tests
/ultra-deliver   # Prepare for deployment
```

## Documentation

- **Product Requirements**: `.ultra/docs/prd.md`
- **Technical Design**: `.ultra/docs/tech.md`
- **Architecture**: `paimon-rwa-contracts/ARCHITECTURE.md`
- **ADRs**: `.ultra/docs/decisions/`

## License

MIT License

---

**Built with Ultra Builder Pro - AI-assisted development workflow**
