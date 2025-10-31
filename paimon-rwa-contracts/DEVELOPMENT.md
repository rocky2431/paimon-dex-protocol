# Paimon.dex Development Guide

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- (Optional) Foundry for advanced testing

### Installation

```bash
# Clone the repository
git clone https://github.com/paimon-dex/paimon-dex.git
cd paimon-dex

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env and add your private key and API keys

# Verify environment setup
npm run verify-setup
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required for deployment
PRIVATE_KEY=your_private_key_here

# Required for contract verification
BSCSCAN_API_KEY=your_bscscan_api_key

# Optional: Custom RPC endpoints
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
```

⚠️ **NEVER commit your `.env` file with real private keys!**

## Development Workflow

### 1. Compile Contracts

```bash
npm run compile
```

### 2. Run Tests

```bash
# Hardhat tests
npm test

# With coverage
npm run test:coverage

# Foundry tests (if installed)
npm run test:forge
```

### 3. Deploy to Testnet

```bash
# Deploy to BSC Testnet
npm run deploy:testnet

# Verify contracts
npm run verify:testnet
```

### 4. Lint and Format

```bash
# Lint Solidity code
npm run lint

# Format code
npm run format
```

## Project Structure

```
paimon-dex/
├── .github/workflows/     # CI/CD pipelines
├── .ultra/               # Ultra Builder Pro project management
│   ├── config.json       # Project configuration
│   ├── tasks/            # Task tracking
│   └── docs/             # Architecture docs, ADRs
├── contracts/            # Smart contracts
│   ├── core/            # HYD, PAIMON, veNFT
│   ├── treasury/        # Treasury and PSM
│   ├── dex/             # AMM contracts
│   ├── launchpad/       # RWA issuance
│   └── governance/      # Governance coordinator
├── scripts/             # Deployment and utility scripts
│   ├── deploy.ts        # Main deployment script
│   └── verify-setup.js  # Environment verification
├── test/                # Smart contract tests
│   ├── core/            # Core contract tests
│   └── integration/     # Integration tests
├── hardhat.config.ts    # Hardhat configuration
├── foundry.toml         # Foundry configuration
└── package.json         # Dependencies and scripts
```

## BSC Network Configuration

### Testnet (ChainID: 97)

- **RPC**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer**: https://testnet.bscscan.com/
- **Faucet**: https://testnet.bnbchain.org/faucet-smart

### Mainnet (ChainID: 56)

- **RPC**: https://bsc-dataseed.binance.org/
- **Explorer**: https://bscscan.com/
- **Gas Price**: ~3 Gwei (check https://bscscan.com/gastracker)

## Common Tasks

### Get Testnet BNB

Visit the [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart) and enter your wallet address.

### Verify Contracts on BscScan

```bash
# After deployment, verify using:
npm run verify:testnet -- <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Example:
npm run verify:testnet -- 0x1234...5678 "arg1" "arg2"
```

### Run Local Hardhat Network

```bash
# Start local node
npx hardhat node

# In another terminal, deploy to local network
npx hardhat run scripts/deploy.ts --network localhost
```

### Fork BSC Mainnet Locally

```bash
# Set environment variable
export FORK_MAINNET=true

# Run Hardhat node with forking
npx hardhat node

# Interact with forked mainnet
npx hardhat console --network localhost
```

## Testing Best Practices

### 6-Dimensional Test Coverage

All contracts should have tests covering:

1. **Functional**: Core functionality works as expected
2. **Boundary**: Edge cases (max/min values, limits)
3. **Exception**: Error handling and reverts
4. **Performance**: Gas optimization
5. **Security**: Access control, reentrancy, overflow
6. **Compatibility**: Integration with external contracts

### Test Structure

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ContractName", function () {
  // Setup
  beforeEach(async function () {
    // Deploy contracts
  });

  describe("Functional Tests", function () {
    it("should perform basic operation", async function () {
      // Test implementation
    });
  });

  describe("Security Tests", function () {
    it("should revert on unauthorized access", async function () {
      await expect(contract.protectedFunction()).to.be.revertedWith("Unauthorized");
    });
  });
});
```

## Gas Optimization Tips

Based on `.ultra/docs/research/bsc-rwa-protocol-optimization-2025-10-24.md`:

1. **Storage Packing**: Use `uint128` + `uint64` to pack multiple values in one slot (saves ~4200 gas/query)
2. **Batch Operations**: Support batch voting/transfers (saves ~84,000 gas)
3. **Event-Driven History**: Use events instead of storage for historical data (saves ~60,000 gas/vote)
4. **Immutable Variables**: Declare constants as `immutable` for cheaper reads
5. **Unchecked Arithmetic**: Use `unchecked { ++i }` in loops

## Troubleshooting

### "Insufficient funds" error

- Ensure your wallet has enough BNB for gas fees
- On testnet, get free BNB from the faucet

### "Nonce too high" error

- Reset your MetaMask account: Settings → Advanced → Reset Account

### Compilation errors

```bash
# Clean cache and recompile
rm -rf cache artifacts
npm run compile
```

### CI/CD failures

- Check GitHub Actions logs
- Ensure all tests pass locally: `npm test`
- Verify code formatting: `npm run format -- --check`

## Resources

- **Documentation**: `.ultra/docs/`
  - [PRD](.ultra/docs/prd.md) - Product requirements
  - [Tech Design](.ultra/docs/tech.md) - Technical architecture
  - [ADRs](.ultra/docs/decisions/) - Architecture decisions
- **Hardhat**: https://hardhat.org/docs
- **Foundry**: https://book.getfoundry.sh/
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts
- **BSC Docs**: https://docs.bnbchain.org/

## Getting Help

- **Issues**: https://github.com/paimon-dex/paimon-dex/issues
- **Discord**: [Join our community](https://discord.gg/paimondex)
- **Email**: dev@paimondex.com
