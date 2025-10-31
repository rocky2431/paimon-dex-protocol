# Paimon.dex Deployment Guide

This document provides step-by-step instructions for deploying Paimon.dex contracts to BSC testnet.

## Prerequisites

1. **Foundry installed**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment variables configured**

   Create a `.env` file in the project root:
   ```bash
   # Deployer private key (DO NOT commit this!)
   PRIVATE_KEY=0x...

   # BSC Testnet RPC
   BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/

   # BscScan API key for contract verification
   BSCSCAN_API_KEY=your_api_key_here

   # Multi-sig address for ownership (optional, defaults to deployer)
   DEPLOYER_ADDRESS=0x...
   ```

3. **Load environment variables**
   ```bash
   source .env
   ```

## Deployment Steps

### 1. Dry Run Simulation

Test the deployment script without broadcasting transactions:

```bash
forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC
```

This will:
- Simulate all contract deployments
- Check constructor parameters
- Verify configuration steps
- Display deployment addresses

### 2. Deploy to BSC Testnet

Deploy all contracts to BSC testnet:

```bash
forge script script/Deploy.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv
```

**Flags explanation:**
- `--broadcast`: Actually send transactions to the network
- `--verify`: Verify contracts on BscScan
- `-vvvv`: Verbose output for debugging

### 3. Save Deployment Addresses

After successful deployment, addresses will be saved to:
```
deployments/bsc-testnet-97.json
```

## Deployed Contracts

The script deploys the following contracts in order:

### Core Contracts
1. **HYD Token** - Stablecoin pegged to USD
2. **PAIMON Token** - Platform utility token (10B max supply)
3. **PSM** - Peg Stability Module for HYD/USDC swaps

### Governance Contracts
4. **VotingEscrow** - veNFT for time-weighted voting
5. **GaugeController** - Manages liquidity gauges and vote weights
6. **RewardDistributor** - Distributes PAIMON rewards via Merkle tree
7. **BribeMarketplace** - Bribe marketplace for vote incentives

### DEX Contracts
8. **DEXFactory** - Creates liquidity pairs
9. **HYD/USDC Pair** - Initial liquidity pair

### DeFi Integration
10. **PriceOracle** - Multi-source price oracle (Pyth)
11. **Treasury** - Protocol fee collection

### Test Tokens (Testnet Only)
12. **Mock USDC** - USDC mock for testing (6 decimals)

## Post-Deployment Configuration

The script automatically performs the following configuration:

1. **Role Grants**
   - Grant MINTER_ROLE to RewardDistributor for PAIMON token

2. **Gauge Setup**
   - Add HYD/USDC pair as initial gauge

3. **Token Whitelist**
   - Whitelist USDC in BribeMarketplace
   - Whitelist HYD in BribeMarketplace

4. **Ownership Transfer** (if DEPLOYER_ADDRESS is set)
   - Transfer PSM ownership to multi-sig
   - Transfer GaugeController ownership to multi-sig
   - Transfer BribeMarketplace ownership to multi-sig
   - Transfer Treasury ownership to multi-sig
   - Transfer PAIMON admin role to multi-sig

## Verification

After deployment, verify the following:

1. **Contract Addresses**
   ```bash
   cat deployments/bsc-testnet-97.json
   ```

2. **BscScan Verification**
   - Visit https://testnet.bscscan.com/
   - Search for each contract address
   - Verify "Contract" tab shows verified source code

3. **Configuration Checks**
   ```bash
   # Check PAIMON minter role
   cast call <PAIMON_ADDRESS> "hasRole(bytes32,address)" \
     $(cast keccak "MINTER_ROLE") <REWARD_DISTRIBUTOR_ADDRESS> \
     --rpc-url $BSC_TESTNET_RPC

   # Check gauge exists
   cast call <GAUGE_CONTROLLER_ADDRESS> "gaugeExists(address)" \
     <PAIR_ADDRESS> \
     --rpc-url $BSC_TESTNET_RPC

   # Check token whitelisted
   cast call <BRIBE_MARKETPLACE_ADDRESS> "isWhitelisted(address)" \
     <USDC_ADDRESS> \
     --rpc-url $BSC_TESTNET_RPC
   ```

## Troubleshooting

### Issue: "Compiler run failed"
**Solution**: Run `forge build` to check for compilation errors

### Issue: "Insufficient funds"
**Solution**: Ensure deployer address has enough BNB for gas fees
```bash
# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_TESTNET_RPC
```

### Issue: "Nonce too high"
**Solution**: Reset nonce or wait for pending transactions to confirm

### Issue: "Verification failed"
**Solution**: Manually verify contracts on BscScan using Foundry:
```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
  --chain-id 97 \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" <ARG>)
```

## Security Considerations

⚠️ **IMPORTANT SECURITY NOTES**:

1. **Private Key Security**
   - NEVER commit `.env` file to git
   - Use hardware wallet or multi-sig for mainnet deployment
   - Consider using `cast wallet` for safer key management

2. **Mock Oracle Addresses**
   - Current deployment uses placeholder Pyth address (0x1)
   - MUST configure real Pyth oracle before mainnet
   - Update oracle addresses via `PriceOracle.setPyth()`

3. **Multi-sig Ownership**
   - Set `DEPLOYER_ADDRESS` to Gnosis Safe or multi-sig
   - Test ownership transfer on testnet first
   - Use 2-step ownership transfer (Ownable2Step)

4. **Initial Liquidity**
   - Script funds PSM with 1M USDC reserve
   - Add liquidity to HYD/USDC pair after deployment
   - Monitor peg stability before mainnet

## Next Steps

After successful deployment:

1. **Add Liquidity**
   - Add initial liquidity to HYD/USDC pair
   - Test swaps and fee collection

2. **Configure Oracle**
   - Update Pyth oracle address for mainnet
   - Set price feeds for supported assets

3. **Set Parameters**
   - Adjust PSM fees (feeIn/feeOut)
   - Set mint caps (maxMintedHYD)
   - Configure reward distribution rates

4. **Integration Testing**
   - Test end-to-end flows
   - Verify governance mechanisms
   - Test emergency pause functions

5. **Documentation**
   - Update contract addresses in frontend
   - Provide API documentation
   - Create user guides

## Resources

- **Foundry Book**: https://book.getfoundry.sh/
- **BSC Testnet Faucet**: https://testnet.bnbchain.org/faucet-smart
- **BscScan Testnet**: https://testnet.bscscan.com/
- **Gnosis Safe**: https://safe.global/

## Contact

For questions or issues, please:
- Open an issue on GitHub
- Join our Discord
- Email: dev@paimon.dex
