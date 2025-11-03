# Deployment Script - Remaining Fixes

**Last Updated**: 2025-11-03
**Status**: Work in Progress

## Completed ✅

1. ✅ Created comprehensive deployment script (`DeployComplete.s.sol`) covering 27+ contracts
2. ✅ Created initialization script (`script/config/InitializeContracts.s.sol`)
3. ✅ Created validation script (`script/config/ValidateDeployment.s.sol`)
4. ✅ Created deployment checklist (`DEPLOYMENT_CHECKLIST.md`)
5. ✅ Created environment configuration template (`.env.example`)
6. ✅ Created local test script (`script/test-deployment-local.sh`)
7. ✅ Fixed PriceOracle interface conflicts
8. ✅ Fixed esPaimon naming conflict
9. ✅ Fixed MockChainlinkAggregator constructor
10. ✅ Fixed USDP minter role methods

## Remaining Issues ⚠️

### 1. Presale Contracts Excluded

**Reason**: Circular import issues with RWABondNFT, RemintController, and SettlementRouter

**Status**: Temporarily commented out in deployment script

**Impact**: Presale functionality will need separate deployment

**Solution**:
- Option A: Fix circular imports in source contracts
- Option B: Create separate deployment script for presale contracts

### 2. Constructor Signature Mismatches

The following contracts have constructor parameter mismatches:

#### USDPStabilityPool
- **Error**: Wrong argument count (3 given, 4 expected)
- **Current call**: `new USDPStabilityPool(address(usdp), address(usdpVault), address(gaugeController))`
- **Actual constructor**: `constructor(address _usdp, address _vault)` (2 params)
- **Fix**: Remove gaugeController parameter: `new USDPStabilityPool(address(usdp), address(usdpVault))`
- **Location**: `script/DeployComplete.s.sol:426`

#### IssuanceController
- **Error**: Wrong argument count (2 given, 4 expected)
- **Current call**: `new IssuanceController(address(projectRegistry), address(treasury))`
- **Actual constructor**: Need to check actual signature
- **Fix**: Check `src/launchpad/IssuanceController.sol` constructor and update call
- **Location**: `script/DeployComplete.s.sol:450`

### 3. Missing Method

#### GaugeController.setRewardDistributor()
- **Error**: Method not found
- **Current call**: `gaugeController.setRewardDistributor(address(rewardDistributor))`
- **Fix**: Check GaugeController.sol for correct method name (might be a constructor parameter instead)
- **Location**: `script/DeployComplete.s.sol:531`

## Next Steps

1. **Fix Constructor Calls** (Priority: High)
   - Read actual constructor signatures from source contracts
   - Update deployment script with correct parameters
   - Test compilation: `forge build --skip test`

2. **Fix GaugeController Integration** (Priority: High)
   - Check if RewardDistributor should be passed in constructor
   - Or find the correct method to set reward distributor
   - Update deployment script accordingly

3. **Test Deployment** (Priority: Medium)
   - Run local test: `./script/test-deployment-local.sh`
   - Verify all contracts deploy successfully
   - Check initialization completes without errors

4. **Presale Contracts** (Priority: Low)
   - Decision needed: Fix imports or separate deployment?
   - If separate: Create `DeployPresale.s.sol`
   - Document presale deployment process

## Quick Commands

```bash
# Check compilation (skip tests to focus on deployment script)
forge build --skip test

# Test locally when ready
chmod +x script/test-deployment-local.sh
./script/test-deployment-local.sh

# Deploy to testnet (after fixes)
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  --verify

# Run initialization
forge script script/config/InitializeContracts.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  --sig "run(string)" \
  deployments/bsc-testnet-97.json

# Validate deployment
forge script script/config/ValidateDeployment.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --sig "run(string)" \
  deployments/bsc-testnet-97.json
```

## Notes

- **Architecture Change**: Project now uses USDP instead of HYD
- **Testnet Focus**: Initial deployment targets BSC Testnet (ChainID: 97)
- **Contract Count**: 27 contracts in main deployment + 3 presale contracts (separate)
- **Deployment Phases**: 15 phases from mocks to ownership transfer
