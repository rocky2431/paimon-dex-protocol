# Paimon.dex Deployment Guide

**Last Updated**: 2025-11-06
**Version**: v3.3.0
**Target Networks**: BSC Testnet (ChainID 97) → BSC Mainnet (ChainID 56)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [BSC Testnet Deployment](#bsc-testnet-deployment)
4. [Verification & Testing](#verification--testing)
5. [BSC Mainnet Deployment](#bsc-mainnet-deployment)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Contract Addresses](#contract-addresses)

---

## Prerequisites

### System Requirements

- **Node.js**: v18+ or v20+
- **Foundry**: Latest version (`foundryup`)
- **Git**: Latest version
- **BNB**: Testnet BNB (via faucet) or Mainnet BNB for gas fees

### Required Tools

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
forge --version
cast --version

# Install project dependencies
forge install
```

### External Services

**For Testnet**:
- ✅ Testnet BNB Faucet: https://testnet.bnbchain.org/faucet-smart
- ✅ BscScan Testnet: https://testnet.bscscan.com/
- ⚠️ Chainlink VRF: Optional (using mocks)
- ⚠️ Chainlink Price Feeds: Optional (using mocks)

**For Mainnet**:
- ✅ Binance Smart Chain RPC: Official or Ankr/QuickNode
- ✅ BscScan API Key: For contract verification
- ✅ Chainlink VRF v2 Subscription: Required
- ✅ Chainlink Price Feeds: USDC/USD, BNB/USD
- ✅ Pyth Network: RWA asset price feeds
- ✅ Multi-sig Wallet: Gnosis Safe (3-of-5 recommended)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/paimondex/paimon-contracts.git
cd paimon-contracts/paimon-rwa-contracts
```

### 2. Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required Variables**:

```bash
# Deployer Configuration
DEPLOYER_PRIVATE_KEY=your_private_key_here  # Without 0x prefix
DEPLOYER_ADDRESS=0xYourDeployerAddress

# Network RPC URLs
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/

# BscScan API (for verification)
BSCSCAN_API_KEY=your_bscscan_api_key

# Testnet flag
IS_TESTNET=true  # Set to false for mainnet

# Multi-sig (mainnet only)
MULTISIG_ADDRESS=0xYourGnosisSafeAddress  # 3-of-5 recommended
```

### 3. Verify Configuration

```bash
# Check environment variables loaded correctly
source .env
echo "Deployer: $DEPLOYER_ADDRESS"
echo "Testnet: $IS_TESTNET"

# Test RPC connection
cast block-number --rpc-url $BSC_TESTNET_RPC
```

---

## BSC Testnet Deployment

### Step 1: Fund Deployer Wallet

```bash
# Get testnet BNB (minimum 5 BNB recommended)
# Visit: https://testnet.bnbchain.org/faucet-smart

# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_TESTNET_RPC --ether
```

### Step 2: Dry Run Deployment

```bash
# Simulate deployment without broadcasting
forge script script/DeployTestnet.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Review output - should show all deployment steps
```

### Step 3: Execute Deployment

```bash
# Deploy all contracts to testnet
forge script script/DeployTestnet.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --legacy  # Use legacy transactions for BSC compatibility

# Deployment takes ~10-15 minutes
# Follow progress in terminal
```

**What Gets Deployed**:

| Phase | Contracts | Description |
|-------|-----------|-------------|
| 1 | Mock External Dependencies | USDC, WBNB, Chainlink Feeds, Pyth, VRF |
| 2 | Core Tokens | USDP, PAIMON, esPAIMON, HYD |
| 3 | PSM | USDC ↔ USDP 1:1 swap |
| 4 | Governance | VotingEscrow, GaugeController, EmissionManager/Router, BribeMarketplace |
| 5 | Incentives | BoostStaking, NitroPool, RewardDistributor |
| 6 | DEX | Factory, Router, 3 Pairs (USDP/USDC, PAIMON/WBNB, HYD/USDP) |
| 7 | Treasury & Oracle | Treasury, SavingRate, PriceOracle, RWAPriceOracle |
| 8 | Vault & StabilityPool | USDPVault (CDP), USDPStabilityPool |
| 9 | Launchpad | ProjectRegistry, IssuanceController |
| 10-13 | Initialization | Configure permissions, setup liquidity, verify |

### Step 4: Save Deployment Addresses

```bash
# Addresses automatically saved to:
ls -la deployments/testnet/addresses.json

# Review deployment summary
cat deployments/testnet/addresses.json | jq
```

**Example Output**:
```json
{
  "network": "BSC Testnet",
  "chainId": 97,
  "deployer": "0xYourAddress",
  "timestamp": 1730937600,
  "contracts": {
    "core": {
      "USDP": "0x...",
      "PAIMON": "0x...",
      "PSM": "0x..."
    },
    "dex": {
      "DEXFactory": "0x...",
      "DEXRouter": "0x..."
    }
  }
}
```

---

## Verification & Testing

### 1. Verify Contract Deployment

```bash
# Check all contracts deployed
cast code $USDP_ADDRESS --rpc-url $BSC_TESTNET_RPC
cast code $PSM_ADDRESS --rpc-url $BSC_TESTNET_RPC

# Verify on BscScan
# Visit: https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS
```

### 2. Test Core Functionality

#### Test PSM Swap (USDC → USDP)

```bash
# Approve USDC for PSM
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $PSM_ADDRESS \
  1000000000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Swap 1000 USDC for USDP
cast send $PSM_ADDRESS \
  "swapIn(uint256)" \
  1000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Check USDP balance
cast call $USDP_ADDRESS \
  "balanceOf(address)(uint256)" \
  $DEPLOYER_ADDRESS \
  --rpc-url $BSC_TESTNET_RPC
```

#### Test DEX Swap

```bash
# Get swap quote
cast call $DEX_ROUTER_ADDRESS \
  "getAmountsOut(uint256,address[])(uint256[])" \
  1000000000000000000 \
  "[$USDP_ADDRESS,$USDC_ADDRESS]" \
  --rpc-url $BSC_TESTNET_RPC

# Execute swap (USDP → USDC)
cast send $DEX_ROUTER_ADDRESS \
  "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)" \
  1000000000000000000 \
  0 \
  "[$USDP_ADDRESS,$USDC_ADDRESS]" \
  $DEPLOYER_ADDRESS \
  $(($(date +%s) + 3600)) \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

#### Test VotingEscrow Lock

```bash
# Approve PAIMON for VotingEscrow
cast send $PAIMON_ADDRESS \
  "approve(address,uint256)" \
  $VOTING_ESCROW_PAIMON_ADDRESS \
  1000000000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Create 1-year lock (10,000 PAIMON)
cast send $VOTING_ESCROW_PAIMON_ADDRESS \
  "createLock(uint256,uint256)" \
  10000000000000000000000 \
  $(($(date +%s) + 31536000)) \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Check veNFT balance
cast call $VOTING_ESCROW_PAIMON_ADDRESS \
  "balanceOfNFT(uint256)(uint256)" \
  1 \
  --rpc-url $BSC_TESTNET_RPC
```

### 3. Run Automated Test Suite

```bash
# Run full test suite against deployed contracts
forge test --fork-url $BSC_TESTNET_RPC -vvv

# Run specific test
forge test --match-contract PSMTest --fork-url $BSC_TESTNET_RPC -vvv

# Check test coverage
forge coverage --fork-url $BSC_TESTNET_RPC
```

### 4. Frontend Integration

```bash
# Copy addresses to frontend config
cp deployments/testnet/addresses.json ../nft-paimon-frontend/src/config/contracts-testnet.json

# Start frontend dev server
cd ../nft-paimon-frontend
npm install
npm run dev

# Open http://localhost:4000
# Test wallet connection and core features
```

---

## BSC Mainnet Deployment

### Prerequisites Checklist

Before deploying to mainnet, ensure:

- [ ] **Testnet validated** - All features tested for 7+ days
- [ ] **Security audit completed** - Third-party audit (Certik/PeckShield)
- [ ] **Multi-sig setup** - Gnosis Safe configured (3-of-5)
- [ ] **Mainnet BNB funded** - At least 10 BNB for deployment gas
- [ ] **Chainlink VRF subscription** - Active subscription with LINK funded
- [ ] **Price feed addresses** - Verified Chainlink feed addresses
- [ ] **Initial liquidity ready** - $1M+ in stablecoins and tokens
- [ ] **Emergency response team** - 24/7 monitoring for 48 hours post-launch
- [ ] **Rollback plan documented** - Emergency pause procedures

### Mainnet Deployment Steps

#### 1. Update Environment Variables

```bash
# Switch to mainnet configuration
nano .env
```

```bash
IS_TESTNET=false
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/

# Multi-sig address (CRITICAL - triple check!)
MULTISIG_ADDRESS=0xYourVerifiedGnosisSafeAddress

# External contract addresses (BSC Mainnet)
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
CHAINLINK_USDC_FEED=0x51597f405303C4377E36123cBc172b13269EA163
CHAINLINK_BNB_FEED=0x0567F2323251f0Aaa5944f5c4f4a8d1f9eD2EcDc
PYTH_MAINNET=0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594
VRF_COORDINATOR=0xc587d9053cd1118f25F645F9E08BB98c9712A4EE
VRF_KEY_HASH=0x...  # BSC mainnet VRF key hash
VRF_SUBSCRIPTION_ID=123  # Your actual subscription ID
```

#### 2. Pre-Deployment Validation

```bash
# Verify deployer balance (should have >10 BNB)
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_MAINNET_RPC --ether

# Verify multi-sig address is contract
cast code $MULTISIG_ADDRESS --rpc-url $BSC_MAINNET_RPC

# Verify Chainlink feeds working
cast call $CHAINLINK_USDC_FEED \
  "latestAnswer()(int256)" \
  --rpc-url $BSC_MAINNET_RPC
```

#### 3. Deploy to Mainnet

```bash
# CRITICAL: Use DeployComplete.s.sol for mainnet (no mocks)
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --legacy \
  --slow  # Add delay between transactions for reliability

# Deployment takes 20-30 minutes
# DO NOT INTERRUPT - Wait for completion
```

#### 4. Verify Ownership Transfer

```bash
# Verify all critical contracts owned by multi-sig
cast call $USDP_ADDRESS "owner()(address)" --rpc-url $BSC_MAINNET_RPC
cast call $TREASURY_ADDRESS "owner()(address)" --rpc-url $BSC_MAINNET_RPC
cast call $PSM_ADDRESS "governor()(address)" --rpc-url $BSC_MAINNET_RPC

# All should return: $MULTISIG_ADDRESS
```

---

## Post-Deployment Configuration

### 1. Configure Emission Schedule

```bash
# Verify EmissionManager schedule
cast call $EMISSION_MANAGER_ADDRESS \
  "getPhaseInfo(uint256)(uint256,uint256,uint256)" \
  0 \  # Phase A
  --rpc-url $BSC_MAINNET_RPC

# Expected: (startTime, endTime, emissionPerDay)
# Phase A: 30,000 PAIMON/day for 2 years
# Phase B: 30,000 → 3,000 decay over 4.77 years
# Phase C: 3,000 PAIMON/day perpetual
```

### 2. Setup Gauge Voting

```bash
# Add liquidity pools to GaugeController (multi-sig operation)
# Example: Add USDP/USDC pair gauge
cast send $GAUGE_CONTROLLER_ADDRESS \
  "addGauge(address,uint256)" \
  $USDP_USDC_PAIR_ADDRESS \
  100  # Weight 100 (will be normalized)
  --rpc-url $BSC_MAINNET_RPC

# Add other strategic pairs
# - PAIMON/BNB
# - HYD/USDP
# - Major stablecoin pairs
```

### 3. Fund Initial Liquidity

```bash
# Add USDP/USDC liquidity ($500K each)
cast send $DEX_ROUTER_ADDRESS \
  "addLiquidity(...)" \
  --rpc-url $BSC_MAINNET_RPC \
  --value 0

# Add PAIMON/BNB liquidity ($300K)
# Add HYD/USDP liquidity ($200K)

# Verify liquidity
cast call $USDP_USDC_PAIR_ADDRESS \
  "getReserves()(uint112,uint112,uint32)" \
  --rpc-url $BSC_MAINNET_RPC
```

### 4. Configure Treasury RWA Assets

```bash
# Register whitelisted RWA assets (multi-sig)
# Tier 1 (80% LTV): US Treasuries
# Tier 2 (70% LTV): Investment-grade bonds
# Tier 3 (60% LTV): RWA revenue pools

cast send $TREASURY_ADDRESS \
  "addRWAAsset(address,address,uint256)" \
  $RWA_ASSET_ADDRESS \
  $RWA_ORACLE_ADDRESS \
  6000  # 60% LTV (Tier 3)
  --rpc-url $BSC_MAINNET_RPC
```

### 5. Enable Contract Monitoring

```bash
# Setup event monitoring for critical functions
# - USDP minting (track supply)
# - Treasury deposits/withdrawals
# - DEX swaps (volume tracking)
# - Oracle price updates
# - Liquidations

# Example: Monitor USDP total supply
cast call $USDP_ADDRESS "totalSupply()(uint256)" --rpc-url $BSC_MAINNET_RPC

# Setup alerts for:
# - Oracle deviation >20%
# - Treasury collateralization <110%
# - PSM USDC reserve <50% of USDP supply
# - Abnormal transaction volume
```

---

## Troubleshooting

### Common Deployment Errors

#### Error: "Insufficient funds for gas"

```bash
# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_TESTNET_RPC --ether

# Solution: Get more testnet BNB from faucet
# Or for mainnet: Fund deployer wallet with 10+ BNB
```

#### Error: "Contract creation code storage out of gas"

```bash
# Some contracts are large (GaugeController, EmissionRouter)
# Solution: Increase gas limit or deploy with optimizer

# Edit foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 200
```

#### Error: "EvmError: Revert"

```bash
# Deployment step failed
# Solution: Check previous step completed successfully

# View detailed error with -vvvv
forge script script/DeployTestnet.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  -vvvv  # Very verbose output
```

#### Error: "Verification failed"

```bash
# BscScan verification may fail due to flattening issues
# Solution: Manually verify contracts

# Flatten contract
forge flatten src/core/USDP.sol > USDP_flat.sol

# Upload to BscScan UI
# https://testnet.bscscan.com/verifyContract
```

### Deployment Recovery

If deployment fails mid-process:

1. **Identify last successful step**:
   ```bash
   # Check broadcast directory
   cat broadcast/DeployTestnet.s.sol/97/run-latest.json | jq
   ```

2. **Resume from checkpoint**:
   - Comment out completed phases in deployment script
   - Re-run deployment

3. **Manual deployment**:
   - Deploy remaining contracts manually with `cast`
   - Update addresses.json

---

## Contract Addresses

### BSC Testnet (ChainID: 97)

**Deployment Date**: 2025-11-07 02:02:44 UTC
**Deployer**: `0x90465a524Fd4c54470f77a11DeDF7503c951E62F`
**Gas Used**: 0.0060533788 BNB

```json
{
  "network": "BSC Testnet",
  "chainId": 97,
  "contracts": {
    "core": {
      "USDP": "0x69cA4879c52A0935561F9D8165e4CB3b91f951a6",
      "PAIMON": "0x4FfBD9CC8e5E26Ec1559D754cC71a061D1820fDF",
      "esPAIMON": "0xA848c9F841bB2deDC160DCb5108F2aac610CA02a",
      "HYD": "0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c",
      "PSM": "0x46eB7627024cEd13826359a5c0aEc57c7255b330",
      "VotingEscrow": "0x8CC8a97Cf7a05d5308b49CFdF24De5Fa66F696B7",
      "VotingEscrowPaimon": "0xdEe148Cd27a9923DE1986399a6629aB375F244e1",
      "USDPVault": "0xF98B41CD89e5434Cae982d4b7EB326D2C1222867",
      "StabilityPool": "0x4f40786fB0722A10822E3929d331c07042B68838"
    },
    "governance": {
      "GaugeController": "0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A",
      "RewardDistributor": "0x94c9E4eb5F82D381e889178d322b7b36601AD11a",
      "BribeMarketplace": "0x748800E079eC6605D23d9803A6248613e80253B1",
      "EmissionManager": "0x13536aDe0a7b8Ec6B07FcFc29a6915881c50EA38",
      "EmissionRouter": "0x0B6638cb031b880238DC5793aD1B3CFCE10DA852"
    },
    "dex": {
      "DEXFactory": "0x1c1339F5A11f462A354D49ee03377D55B03E7f3D",
      "DEXRouter": "0x066Db99AE64B1524834a1f97aa1613e2411E13AC",
      "USDP_USDC_Pair": "0x3B8D3c266B2BbE588188cA70525a2da456a848d2",
      "PAIMON_BNB_Pair": "0xc625Ab8646582100D48Ae4FC68c1E8B0976111fA",
      "HYD_USDP_Pair": "0x2361484f586eEf76dCbaE9e4dD37C2b3d10d9110"
    },
    "treasury": {
      "Treasury": "0x8CA5Cd0293b9d3C8BC796083E806bc5bC381772A",
      "SavingRate": "0xB89188bD9b635EC9Dd73f73C9E3bE17dB83D01B2",
      "PriceOracle": "0x5Ae36173EA62B33590857eD2E77580A9680d4d33",
      "RWAPriceOracle": "0xa6dD28dfCa8448965BE9D97BBBAaf82c45CE25C7"
    },
    "launchpad": {
      "ProjectRegistry": "0x764a546351cc7C74f68D10b15C18b8d4D7bBB08A",
      "IssuanceController": "0xd7b22158801C22fFc0Ff81a1C5B000f29779530E"
    },
    "incentives": {
      "BoostStaking": "0x0998dA12E9A61a7957e37feE9bBdAe7DDA6Ef314",
      "NitroPool": "0x89f108938951CF996cD3c26556dAF525aD4d9957"
    },
    "mocks": {
      "USDC": "0xA1112f596A73111E102b4a9c39064b2b2383EC38",
      "WBNB": "0xe3402BAd7951c00e2B077A745C9e8B14122f05ED",
      "USDCPriceFeed": "0xD36eff69950c1eE2713BB1d204f875434Da28aB7",
      "BNBPriceFeed": "0x6D0a11083DCe3Fe5a2498b4B37f8edb30b29645B",
      "HYDPriceFeed": "0x536608101E17e4C2c7b0d5eCc4e5659a75fE1489",
      "Pyth": "0x4B4a7949694c9bcb7B4731dA60C511DD73f7FBB8",
      "VRFCoordinator": "0xeAcAa0e6c5965f680fc6470745dE63E53A5D249c"
    }
  }
}
```

**Mock Contracts (Testnet Only)**:
- **Mock USDC**: `0xA1112f596A73111E102b4a9c39064b2b2383EC38` (1B supply, 6 decimals)
- **Mock WBNB**: `0xe3402BAd7951c00e2B077A745C9e8B14122f05ED` (10,000 supply)
- **USDC Price Feed**: `0xD36eff69950c1eE2713BB1d204f875434Da28aB7`
- **BNB Price Feed**: `0x6D0a11083DCe3Fe5a2498b4B37f8edb30b29645B`
- **HYD Price Feed**: `0x536608101E17e4C2c7b0d5eCc4e5659a75fE1489`

**Links**:
- Deployment Details: `deployments/testnet/addresses.json`
- BscScan: https://testnet.bscscan.com/
- USDP Contract: https://testnet.bscscan.com/address/0x69cA4879c52A0935561F9D8165e4CB3b91f951a6
- Mock USDC: https://testnet.bscscan.com/address/0xA1112f596A73111E102b4a9c39064b2b2383EC38
- Frontend: https://testnet.paimon.dex (Coming Soon)

### BSC Mainnet (ChainID: 56)

**Deployment Date**: TBD
**Deployer**: TBD
**Multi-sig**: TBD

```json
{
  "network": "BSC Mainnet",
  "chainId": 56,
  "contracts": {
    "USDP": "TBD",
    "PAIMON": "TBD",
    "PSM": "TBD"
  }
}
```

**Links**:
- Deployment Details: `deployments/mainnet/addresses.json`
- BscScan: https://bscscan.com/
- Frontend: https://app.paimon.dex

---

## Deployment Timeline

### Testnet Phase (Week 1-2)

- [x] Day 1: Deploy to testnet ✅ **Completed 2025-11-07**
- [ ] Day 2-3: Verify all contracts
- [ ] Day 4-5: Test core functionality
- [ ] Day 6-7: Frontend integration testing
- [ ] Week 2: Public testnet beta
- [ ] Week 2: Bug bounty program

### Mainnet Phase (Week 3-4)

- [ ] Week 3: Security audit completion
- [ ] Week 3: Multi-sig setup and testing
- [ ] Week 4: Mainnet deployment
- [ ] Week 4: Initial liquidity provision
- [ ] Week 4: Public launch announcement
- [ ] Week 4+: 24/7 monitoring for 30 days

---

## Support & Resources

### Documentation

- **Architecture**: `ARCHITECTURE.md`
- **Development**: `DEVELOPMENT.md`
- **Security**: `audit-package/`
- **Frontend**: `../nft-paimon-frontend/README.md`

### Community

- **Discord**: https://discord.gg/paimondex
- **Twitter**: https://twitter.com/paimondex
- **GitHub**: https://github.com/paimondex/paimon-contracts

### Emergency Contacts

- **Security Issues**: security@paimon.dex
- **Technical Support**: dev@paimon.dex
- **24/7 Hotline** (Post-launch): TBD

---

**Last Updated**: 2025-11-07 (BSC Testnet Deployed)
**Maintainer**: Paimon.dex Team
**License**: MIT
