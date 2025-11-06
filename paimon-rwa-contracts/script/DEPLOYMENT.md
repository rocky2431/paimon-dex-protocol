# Paimon.dex Deployment Guide

This guide provides step-by-step instructions for deploying Paimon.dex smart contracts to BSC (Binance Smart Chain).

---

## Prerequisites

### 1. Foundry Installation

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:
```bash
forge --version
# Expected output: forge 0.2.0 (...)
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# Deployer private key (NEVER commit this!)
PRIVATE_KEY=0x...

# BSC Network RPC URLs
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# BscScan API key for contract verification
BSCSCAN_API_KEY=your_api_key_here

# Multi-sig address for ownership (optional)
MULTI_SIG_ADDRESS=0x...
```

### 3. Load Environment Variables

```bash
source .env
```

### 4. Fund Deployer Address

Ensure your deployer address has sufficient BNB for gas fees:

**Testnet**:
- Visit https://testnet.bnbchain.org/faucet-smart
- Get free testnet BNB

**Mainnet**:
- Transfer BNB to deployer address
- Check balance: `cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_MAINNET_RPC_URL`

---

## Deployment Architecture

### Contract Deployment Sequence

```
1. Core Tokens
   ├── USDP (Synthetic Stablecoin)
   └── PAIMON (Governance Token)

2. DEX Infrastructure
   ├── DEXFactory
   └── DEXRouter

3. Stablecoin Module
   └── PSMParameterized (USDC ↔ USDP 1:1)

4. Treasury System
   ├── Treasury (RWA Collateral Vault)
   └── RWAPriceOracle (Dual-source pricing)

5. Governance Infrastructure
   ├── VotingEscrow (vePAIMON NFT)
   └── GaugeController (Liquidity mining weights)

6. Emission System
   ├── EmissionManager (3-phase emission scheduler)
   └── EmissionRouter (4-channel distribution pipeline)

7. Launchpad
   ├── ProjectRegistry (veNFT governance)
   └── IssuanceController (Token sales)

8. Presale (Optional - Phase 1)
   ├── RWABondNFT (Gamified bond certificates)
   └── RemintController (Dice rolling + social tasks)
       └── Chainlink VRF setup required
```

### Key Infrastructure Components

**Governable Base Class**:
- All governance-enabled contracts inherit from `Governable`
- Supports multiple governors (Timelock, Multi-sig)
- Unified role-based access control

**ProtocolConstants**:
- `BASIS_POINTS = 10,000` (Percentage base)
- `WEEK = 7 days` (Governance cycle)
- `EPOCH_DURATION = 7 days`

**ProtocolRoles**:
- `GOVERNANCE_ADMIN_ROLE` - Governance administrators
- `EMISSION_POLICY_ROLE` - Emission policy managers
- `INCENTIVE_MANAGER_ROLE` - Incentive managers
- `TREASURY_MANAGER_ROLE` - Treasury managers

**EpochUtils**:
- `computeEpoch(start, duration, timestamp)` - Calculate epoch number
- `currentEpoch(start, duration)` - Get current epoch

---

## Step-by-Step Deployment

### Step 1: Dry Run Simulation

Test deployment without broadcasting transactions:

```bash
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_TESTNET_RPC_URL \
  -vvvv
```

This will:
- Simulate all contract deployments
- Validate constructor parameters
- Display deployment addresses
- Estimate gas costs

### Step 2: Deploy to BSC Testnet

Deploy and verify all contracts:

```bash
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv
```

**Flags**:
- `--broadcast`: Execute transactions on network
- `--verify`: Verify contracts on BscScan
- `-vvvv`: Maximum verbosity for debugging

**Expected Output**:
```
[⠒] Compiling...
[⠆] Compiling 50 files with 0.8.24
[⠰] Solc 0.8.24 finished in 2.43s

== Logs ==
Deploying to: BSC Testnet (ChainID 97)
Deployer: 0x...

1/12 Deploying USDP...
  ✅ Deployed at: 0x...

2/12 Deploying PAIMON...
  ✅ Deployed at: 0x...

...

12/12 Configuring EmissionRouter...
  ✅ Configuration complete

✅ All contracts deployed successfully!
Deployment addresses saved to: deployments/bsc-testnet-97.json
```

### Step 3: Verify Deployment

Check saved deployment addresses:

```bash
cat deployments/bsc-testnet-97.json
```

Verify on BscScan:
- Visit https://testnet.bscscan.com/
- Search for each contract address
- Verify "Contract" tab shows verified source code

### Step 4: Post-Deployment Configuration

#### 4.1 Configure EmissionManager

Set LP split parameters (default: 60% Pairs, 40% Stability Pool):

```bash
cast send $EMISSION_MANAGER_ADDRESS \
  "setLpSplitParams(uint256,uint256)" \
  6000 4000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL
```

#### 4.2 Configure EmissionRouter

Set channel sinks:

```bash
cast send $EMISSION_ROUTER_ADDRESS \
  "setSinks(address,address,address,address)" \
  $DEBT_SINK_ADDRESS \
  $LP_PAIRS_SINK_ADDRESS \
  $STABILITY_POOL_SINK_ADDRESS \
  $ECO_SINK_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL
```

Grant emission policy role:

```bash
cast send $EMISSION_ROUTER_ADDRESS \
  "grantEmissionPolicy(address)" \
  $AUTHORIZED_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL
```

#### 4.3 Add Initial Gauges

Add first liquidity pair gauge:

```bash
cast send $GAUGE_CONTROLLER_ADDRESS \
  "addGauge(address,uint256)" \
  $PAIR_ADDRESS \
  100 \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL
```

#### 4.4 Transfer Ownership (Production Only)

Transfer governance to multi-sig:

```bash
# Transfer EmissionManager
cast send $EMISSION_MANAGER_ADDRESS \
  "transferGovernance(address)" \
  $MULTI_SIG_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_MAINNET_RPC_URL

# Transfer EmissionRouter
cast send $EMISSION_ROUTER_ADDRESS \
  "transferGovernance(address)" \
  $MULTI_SIG_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_MAINNET_RPC_URL

# Transfer PSM
cast send $PSM_ADDRESS \
  "transferGovernance(address)" \
  $MULTI_SIG_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_MAINNET_RPC_URL
```

---

## Deployment Verification

### Contract Verification Checks

```bash
# 1. Verify USDP total supply is 0
cast call $USDP_ADDRESS "totalSupply()" --rpc-url $BSC_TESTNET_RPC_URL

# 2. Verify EmissionManager phase parameters
cast call $EMISSION_MANAGER_ADDRESS "PHASE_A_END()" --rpc-url $BSC_TESTNET_RPC_URL
# Expected: 12

# 3. Verify EmissionRouter has 4 sinks configured
cast call $EMISSION_ROUTER_ADDRESS "sinks()" --rpc-url $BSC_TESTNET_RPC_URL

# 4. Verify VotingEscrow token name
cast call $VOTING_ESCROW_ADDRESS "name()" --rpc-url $BSC_TESTNET_RPC_URL
# Expected: "Vote-escrowed PAIMON"

# 5. Verify GaugeController epoch start
cast call $GAUGE_CONTROLLER_ADDRESS "epochStart()" --rpc-url $BSC_TESTNET_RPC_URL
```

### Governance Verification

```bash
# Check governance count (should be 1 initially)
cast call $EMISSION_MANAGER_ADDRESS \
  "governanceCount()" \
  --rpc-url $BSC_TESTNET_RPC_URL

# Check if deployer is governance
cast call $EMISSION_MANAGER_ADDRESS \
  "isGovernance(address)" \
  $DEPLOYER_ADDRESS \
  --rpc-url $BSC_TESTNET_RPC_URL
# Expected: true (1)

# Check emission policy role
cast call $EMISSION_ROUTER_ADDRESS \
  "hasRole(bytes32,address)" \
  $(cast keccak "EMISSION_POLICY_ROLE") \
  $DEPLOYER_ADDRESS \
  --rpc-url $BSC_TESTNET_RPC_URL
# Expected: true (1)
```

---

## Mainnet Deployment Checklist

Before deploying to BSC mainnet:

### Pre-Deployment

- [ ] All testnet tests passing (980/990 tests, 98.99%)
- [ ] Deployment script dry run successful
- [ ] Multi-sig wallet configured (3-of-5 recommended)
- [ ] Timelock contract deployed (48-hour delay)
- [ ] Emergency pause multi-sig ready (4-of-7 recommended)
- [ ] Chainlink VRF subscription funded
- [ ] Oracle price feeds configured
- [ ] Legal review completed (RWA compliance)

### Deployment

- [ ] Deploy all contracts in correct sequence
- [ ] Verify all contracts on BscScan
- [ ] Configure emission parameters
- [ ] Set up channel sinks
- [ ] Add initial gauges
- [ ] Transfer ownership to multi-sig
- [ ] Fund PSM with initial USDC reserve
- [ ] Add initial DEX liquidity

### Post-Deployment

- [ ] Run integration tests on mainnet
- [ ] Monitor first epoch execution
- [ ] Set up alerting (Forta, Tenderly)
- [ ] Publish deployment addresses
- [ ] Update frontend contract addresses
- [ ] Community announcement

---

## Troubleshooting

### Issue: "Compiler run failed"

**Solution**:
```bash
forge clean
forge build
```

### Issue: "Insufficient funds for gas"

**Solution**:
```bash
# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_TESTNET_RPC_URL

# Get testnet BNB
# Visit: https://testnet.bnbchain.org/faucet-smart
```

### Issue: "Nonce too high"

**Solution**:
```bash
# Get current nonce
cast nonce $DEPLOYER_ADDRESS --rpc-url $BSC_TESTNET_RPC_URL

# Wait for pending transactions or use --nonce flag
forge script script/DeployComplete.s.sol \
  --nonce <SPECIFIC_NONCE> \
  ...
```

### Issue: "Verification failed"

**Solution**:
```bash
# Manually verify contract
forge verify-contract \
  <CONTRACT_ADDRESS> \
  <CONTRACT_PATH>:<CONTRACT_NAME> \
  --chain-id 97 \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" <ARG>)
```

---

## Security Considerations

### Private Key Management

⚠️ **CRITICAL SECURITY**:
- NEVER commit `.env` file to git
- Use hardware wallet (Ledger/Trezor) for mainnet deployment
- Consider using `cast wallet` for key management
- Rotate keys after deployment

### Multi-sig Setup

**Production Requirements**:
- Treasury operations: 3-of-5 multi-sig + 48-hour timelock
- Emergency pause: 4-of-7 multi-sig (instant)
- Ownership transfer: 2-step process (Ownable2Step pattern)

**Recommended Multi-sig Providers**:
- Gnosis Safe (https://safe.global/)
- Multi-sig wallet on BSC

### Oracle Configuration

**Testnet** (Placeholder):
- Currently uses mock oracle addresses
- Replace before mainnet deployment

**Mainnet** (Required):
- Chainlink Price Feeds for RWA assets
- Custodian NAV feed integration
- Circuit breaker configuration (>20% deviation)

### Initial Liquidity

**Recommendations**:
- Fund PSM with >$1M USDC reserve (mainnet)
- Add >$500K liquidity to USDP/USDC pair
- Bootstrap PAIMON/USDP pair with >$100K
- Monitor peg stability for first 7 days

---

## Gas Optimization

### Deployment Gas Costs (Estimated)

| Contract | Gas Used | USD Cost @ 3 Gwei |
|----------|----------|-------------------|
| USDP | ~1.2M | ~$0.50 |
| PAIMON | ~1.5M | ~$0.62 |
| PSMParameterized | ~2.3M | ~$0.95 |
| Treasury | ~3.5M | ~$1.45 |
| VotingEscrow | ~4.2M | ~$1.74 |
| EmissionManager | ~3.8M | ~$1.57 |
| EmissionRouter | ~1.8M | ~$0.75 |
| GaugeController | ~2.9M | ~$1.20 |
| **Total** | **~21M** | **~$8.70** |

*Gas costs are estimates and may vary based on network congestion.*

### Gas-Saving Tips

1. **Batch Configuration**: Group related configuration calls into single transaction
2. **Constructor Parameters**: Pre-calculate complex parameters off-chain
3. **Multicall**: Use Multicall3 for batch reads/writes
4. **Foundry Optimizer**: Deployment script uses `--optimize --optimizer-runs 200`

---

## Resources

- **Foundry Book**: https://book.getfoundry.sh/
- **BSC Testnet Faucet**: https://testnet.bnbchain.org/faucet-smart
- **BscScan Testnet**: https://testnet.bscscan.com/
- **BscScan Mainnet**: https://bscscan.com/
- **Gnosis Safe**: https://safe.global/
- **Chainlink VRF**: https://vrf.chain.link/
- **Chainlink Price Feeds**: https://data.chain.link/

---

## Contact

For deployment issues or questions:
- **GitHub Issues**: https://github.com/rocky2431/paimon-dex-protocol/issues
- **Email**: rocky243@example.com

---

**Last Updated**: 2025-11-06
**Deployment Status**: Testnet Ready, Mainnet Preparation
