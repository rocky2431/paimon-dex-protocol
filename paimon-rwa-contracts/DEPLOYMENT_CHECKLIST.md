# Deployment Checklist - Paimon.dex

**Version**: 1.0
**Last Updated**: 2025-11-03
**Target Network**: BSC Testnet / Mainnet

---

## Pre-Deployment Preparation

### 1. Environment Setup

- [ ] **Install Dependencies**
  ```bash
  npm install
  forge install
  ```

- [ ] **Configure Environment Variables**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Set `PRIVATE_KEY` (deployer wallet private key)
  - [ ] Set `BSC_TESTNET_RPC` or `BSC_MAINNET_RPC`
  - [ ] Set `BSCSCAN_API_KEY` for contract verification
  - [ ] Set `DEPLOYER_ADDRESS` (multi-sig address for ownership transfer)
  - [ ] Set `IS_TESTNET` (`true` for testnet, `false` for mainnet)

- [ ] **Verify Deployer Wallet**
  - [ ] Deployer has sufficient BNB for gas fees
  - [ ] Deployer address is correct and accessible
  - [ ] Multi-sig address is correct (if different from deployer)

### 2. Code Verification

- [ ] **Smart Contract Audit**
  - [ ] All contracts have been audited
  - [ ] Critical issues have been resolved
  - [ ] Audit report is available

- [ ] **Testing**
  - [ ] All unit tests passing: `forge test`
  - [ ] Test coverage ≥80%: `forge coverage`
  - [ ] Integration tests passing
  - [ ] E2E tests passing (frontend + contracts)

- [ ] **Code Quality**
  - [ ] No compiler warnings
  - [ ] Code follows SOLID principles
  - [ ] Gas optimization complete
  - [ ] Documentation is up-to-date

### 3. Network Configuration

- [ ] **For Testnet**
  - [ ] Connected to BSC Testnet (ChainID: 97)
  - [ ] Test BNB available in deployer wallet
  - [ ] Test USDC will be deployed via MockERC20

- [ ] **For Mainnet**
  - [ ] Connected to BSC Mainnet (ChainID: 56)
  - [ ] Sufficient BNB for deployment (estimated: 5-10 BNB)
  - [ ] Mainnet USDC address confirmed: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
  - [ ] Chainlink VRF v2 subscription created
  - [ ] Pyth Network address confirmed: `0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594`

---

## Deployment Execution

### Phase 1: Dry Run

- [ ] **Run Deployment Dry Run**
  ```bash
  forge script script/DeployComplete.s.sol --rpc-url $BSC_TESTNET_RPC
  ```

- [ ] **Review Deployment Plan**
  - [ ] All 30 contracts listed
  - [ ] Deployment order is correct
  - [ ] No compilation errors
  - [ ] Estimated gas costs are acceptable

### Phase 2: Deploy Contracts

- [ ] **Execute Deployment**
  ```bash
  forge script script/DeployComplete.s.sol \
    --rpc-url $BSC_TESTNET_RPC \
    --broadcast \
    --verify \
    --slow
  ```

- [ ] **Monitor Deployment**
  - [ ] All transactions confirmed
  - [ ] No transaction reverts
  - [ ] All contracts deployed successfully
  - [ ] Deployment addresses saved to `deployments/bsc-<network>-<chainid>.json`

- [ ] **Verify Contracts on BscScan**
  - [ ] All contracts verified
  - [ ] Source code matches deployed bytecode
  - [ ] Constructor arguments are correct

### Phase 3: Initialize Contracts

- [ ] **Run Initialization Script**
  ```bash
  forge script script/config/InitializeContracts.s.sol \
    --rpc-url $BSC_TESTNET_RPC \
    --broadcast \
    --sig "run(string)" \
    deployments/bsc-testnet-97.json
  ```

- [ ] **Verify Initialization**
  - [ ] Emission schedule configured
  - [ ] Initial gauges added
  - [ ] Vault parameters set
  - [ ] StabilityPool configured
  - [ ] Initial liquidity added (testnet only)

### Phase 4: Validate Deployment

- [ ] **Run Validation Script**
  ```bash
  forge script script/config/ValidateDeployment.s.sol \
    --rpc-url $BSC_TESTNET_RPC \
    --sig "run(string)" \
    deployments/bsc-testnet-97.json
  ```

- [ ] **Validation Checks**
  - [ ] All contracts deployed at non-zero addresses
  - [ ] All contracts have code (not empty)
  - [ ] Ownership is correct
  - [ ] Permissions are set correctly
  - [ ] Parameters are within acceptable ranges
  - [ ] Integrations are working

---

## Post-Deployment Configuration

### 1. Contract Configuration

- [ ] **USDP Configuration**
  - [ ] PSM has minter role
  - [ ] USDPVault has minter role
  - [ ] No other addresses have minter role

- [ ] **PAIMON Configuration**
  - [ ] RewardDistributor has minter role
  - [ ] EmissionManager has minter role
  - [ ] Total supply cap is enforced

- [ ] **PSM Configuration**
  - [ ] Fee In: 0.1% (10 bp)
  - [ ] Fee Out: 0.1% (10 bp)
  - [ ] Initial USDC reserve funded (testnet: 1M USDC)

- [ ] **Vault Configuration**
  - [ ] Min collateral ratio: 150% (15000 bp)
  - [ ] Liquidation threshold: 120% (12000 bp)
  - [ ] Borrow fee: 0.5% (50 bp)
  - [ ] StabilityPool address set

- [ ] **StabilityPool Configuration**
  - [ ] Reward rate: 10% APY (1000 bp)
  - [ ] Pool is active
  - [ ] Gauge integration enabled

- [ ] **GaugeController Configuration**
  - [ ] USDP/USDC pair gauge added
  - [ ] RewardDistributor address set
  - [ ] Voting enabled

- [ ] **DEX Configuration**
  - [ ] DEXFactory treasury address set
  - [ ] USDP/USDC pair created
  - [ ] Swap fee: 0.25% (25 bp)

### 2. Initial Liquidity (Testnet Only)

- [ ] **Add Initial Liquidity to USDP/USDC Pair**
  ```bash
  # 1. Swap USDC for USDP via PSM
  cast send $PSM_ADDRESS "swapUSDCForUSDP(uint256)" "1000000000000" \
    --rpc-url $BSC_TESTNET_RPC --private-key $PRIVATE_KEY

  # 2. Approve tokens
  cast send $USDP_ADDRESS "approve(address,uint256)" $DEX_ROUTER_ADDRESS "1000000000000" \
    --rpc-url $BSC_TESTNET_RPC --private-key $PRIVATE_KEY

  cast send $USDC_ADDRESS "approve(address,uint256)" $DEX_ROUTER_ADDRESS "1000000000000" \
    --rpc-url $BSC_TESTNET_RPC --private-key $PRIVATE_KEY

  # 3. Add liquidity
  cast send $DEX_ROUTER_ADDRESS "addLiquidity(...)" \
    --rpc-url $BSC_TESTNET_RPC --private-key $PRIVATE_KEY
  ```

- [ ] **Verify Liquidity**
  - [ ] LP tokens minted
  - [ ] Pair reserves are correct
  - [ ] Initial price is 1:1

### 3. Ownership Transfer

- [ ] **Transfer Ownership to Multi-sig**
  - [ ] PSM ownership transferred
  - [ ] GaugeController ownership transferred
  - [ ] BribeMarketplace ownership transferred
  - [ ] Treasury ownership transferred
  - [ ] PAIMON admin role transferred
  - [ ] USDP ownership transferred

- [ ] **Verify Multi-sig Configuration**
  - [ ] Multi-sig address is correct
  - [ ] All signers are confirmed
  - [ ] Signing threshold is correct (e.g., 3-of-5)
  - [ ] Timelock is configured (if applicable)

---

## Testing Phase

### 1. Functional Testing

- [ ] **Core Functionality**
  - [ ] USDC → USDP swap via PSM
  - [ ] USDP → USDC swap via PSM
  - [ ] USDP/USDC DEX swap
  - [ ] USDP locking for veNFT
  - [ ] Voting with veNFT
  - [ ] USDP borrowing from Vault
  - [ ] USDP repayment to Vault
  - [ ] USDP deposit to StabilityPool
  - [ ] USDP withdrawal from StabilityPool

- [ ] **Governance**
  - [ ] Gauge voting
  - [ ] Bribe creation
  - [ ] Bribe claiming
  - [ ] Emission distribution
  - [ ] Reward claiming

- [ ] **Incentives**
  - [ ] PAIMON staking in BoostStaking
  - [ ] Boost calculation
  - [ ] NitroPool deposits
  - [ ] External rewards

### 2. Integration Testing

- [ ] **Frontend Integration**
  - [ ] All pages load correctly
  - [ ] Wallet connection works
  - [ ] All transactions succeed
  - [ ] Balance updates correctly
  - [ ] UI displays correct data

- [ ] **E2E Testing**
  - [ ] Run E2E test suite: `cd nft-paimon-frontend && npm run test:e2e`
  - [ ] All E2E tests passing
  - [ ] Core Web Vitals meet targets (LCP<2.5s, INP<200ms, CLS<0.1)

### 3. Security Testing

- [ ] **Access Control**
  - [ ] Only authorized addresses can mint USDP
  - [ ] Only authorized addresses can mint PAIMON
  - [ ] Only owner can change critical parameters
  - [ ] Only multi-sig can execute governance actions

- [ ] **Reentrancy Protection**
  - [ ] All state-changing functions have reentrancy guards
  - [ ] No reentrancy vulnerabilities found

- [ ] **Price Oracle**
  - [ ] Oracle returns correct prices
  - [ ] Staleness check works
  - [ ] Deviation threshold enforced
  - [ ] Circuit breaker activates correctly

---

## Monitoring & Maintenance

### 1. Setup Monitoring

- [ ] **On-Chain Monitoring**
  - [ ] Set up event monitoring
  - [ ] Monitor critical metrics (TVL, collateral ratio, etc.)
  - [ ] Set up alerts for anomalies

- [ ] **Off-Chain Monitoring**
  - [ ] Monitor frontend uptime
  - [ ] Monitor API endpoints
  - [ ] Set up error tracking (Sentry)

### 2. Documentation

- [ ] **Update Documentation**
  - [ ] Update ARCHITECTURE.md with deployed addresses
  - [ ] Update README.md with deployment info
  - [ ] Create user guide
  - [ ] Create developer guide

- [ ] **Create Runbooks**
  - [ ] Emergency procedures
  - [ ] Incident response plan
  - [ ] Rollback procedures
  - [ ] Contact list

### 3. Communication

- [ ] **Announce Deployment**
  - [ ] Official blog post
  - [ ] Twitter announcement
  - [ ] Discord announcement
  - [ ] Telegram announcement

- [ ] **User Education**
  - [ ] Tutorial videos
  - [ ] FAQs
  - [ ] Support channels

---

## Mainnet-Specific Checklist

### Pre-Mainnet

- [ ] **Security**
  - [ ] Full security audit completed
  - [ ] All critical/high issues resolved
  - [ ] Bug bounty program launched
  - [ ] Insurance coverage obtained (if applicable)

- [ ] **Legal & Compliance**
  - [ ] Legal review completed
  - [ ] Terms of service finalized
  - [ ] Privacy policy published
  - [ ] Compliance requirements met

- [ ] **Infrastructure**
  - [ ] CDN configured for frontend
  - [ ] Load balancers configured
  - [ ] Database backups configured
  - [ ] Disaster recovery plan in place

### Post-Mainnet

- [ ] **First 24 Hours**
  - [ ] Monitor all metrics closely
  - [ ] Check for any anomalies
  - [ ] Respond to any issues immediately
  - [ ] Update status page

- [ ] **First Week**
  - [ ] Review all transactions
  - [ ] Analyze user behavior
  - [ ] Gather user feedback
  - [ ] Plan first iteration

---

## Emergency Procedures

### If Deployment Fails

1. **Stop deployment immediately**
2. **Document the error**
3. **Analyze the root cause**
4. **Fix the issue**
5. **Re-run dry run**
6. **Deploy again**

### If Critical Bug Found

1. **Assess severity**
2. **Pause affected contracts** (if pause functionality exists)
3. **Notify team and users**
4. **Prepare fix**
5. **Test fix thoroughly**
6. **Deploy fix or migrate to new contracts**

### If Oracle Fails

1. **Check Pyth/Chainlink status**
2. **Activate circuit breaker**
3. **Use backup oracle (if available)**
4. **Notify users**
5. **Resolve oracle issue**
6. **Resume operations**

---

## Rollback Plan

In case of critical failure:

1. **Testnet**: Simply redeploy with fixes
2. **Mainnet**:
   - Pause all contracts (if possible)
   - Migrate funds to new contracts
   - Compensate affected users
   - Perform full post-mortem

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Tech Lead** | | | |
| **Security Lead** | | | |
| **DevOps Lead** | | | |
| **Product Lead** | | | |

---

**Deployment Status**: [ ] Not Started [ ] In Progress [ ] Completed [ ] Failed

**Deployment Date**: ___________________

**Deployed By**: ___________________

**Notes**:
```
[Add any deployment notes, issues encountered, or deviations from the checklist]
```
