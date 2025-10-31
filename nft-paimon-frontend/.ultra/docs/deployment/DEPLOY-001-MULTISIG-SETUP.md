# DEPLOY-001: Multi-Sig Wallet Setup Guide

**Task ID**: DEPLOY-001
**Created**: 2025-10-27
**Status**: In Progress
**Priority**: P0
**Estimated Days**: 1

---

## Executive Summary

This document provides comprehensive instructions for deploying and configuring Gnosis Safe multi-signature wallets on BSC (Binance Smart Chain) for the Paimon.dex protocol. Two multi-sig wallets will be established:

1. **Treasury Multi-Sig**: 3-of-5 threshold for financial operations
2. **Emergency Multi-Sig**: 4-of-7 threshold for emergency pause functionality

---

## 1. Technical Specifications

### 1.1 Safe Contract Addresses (BSC Mainnet - Chain ID: 56)

| Contract | Address (Canonical) | Purpose |
|----------|-------------------|---------|
| **GnosisSafe Singleton** | `0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552` | Master contract implementation |
| **GnosisSafeL2 Singleton** | `0x3E5c63644E683549055b9Be8653de26E0B4CD36E` | L2-optimized implementation (BSC) |
| **ProxyFactory** | `0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2` | Creates Safe proxy instances |
| **MultiSend** | `0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761` | Batch transaction execution |
| **CompatibilityFallbackHandler** | (fetch separately) | Fallback handler for Safe |

**Version**: Safe v1.3.0
**Source**: [safe-global/safe-deployments](https://github.com/safe-global/safe-deployments/tree/main/src/assets/v1.3.0)

### 1.2 Deployment Types

BSC supports two deployment types:
- **Canonical**: Deterministic deployment (recommended)
- **EIP155**: Alternative deployment with chain ID in bytecode

**Recommendation**: Use **Canonical** deployment for consistency across networks.

---

## 2. Treasury Multi-Sig Configuration (3-of-5)

### 2.1 Purpose

Manage protocol treasury funds including:
- RWA collateral deposits/withdrawals
- USDC reserves (PSM module)
- Protocol revenue collection
- Emergency fund allocations
- Contract upgrades (if applicable)

### 2.2 Threshold Configuration

- **Signers**: 5 addresses
- **Threshold**: 3 signatures required
- **Rationale**: Balance between security (>50% approval) and operational efficiency (allows 2 signers unavailable)

### 2.3 Recommended Signer Distribution

| Role | Count | Description |
|------|-------|-------------|
| **Core Team** | 3 | Project founders/lead developers |
| **Advisors** | 1 | Technical advisor or legal counsel |
| **Community Representative** | 1 | Elected veNFT holder or DAO member |

### 2.4 Hardware Wallet Requirements

**Mandatory**: All signers MUST use hardware wallets.

**Approved Devices**:
- Ledger Nano S Plus / Nano X
- Trezor Model T / Safe 3

**Setup Instructions**:
1. Purchase hardware wallet from official vendor only
2. Initialize device with new seed phrase (never use pre-configured seeds)
3. Store seed phrase in secure physical location (fireproof safe, bank vault)
4. Test device with small transaction on testnet before mainnet use
5. Enable PIN/passphrase protection

### 2.5 Treasury Multi-Sig Deployment Parameters

```solidity
// Deployment Configuration
address[] memory owners = [
    0x..., // Core Team Member 1
    0x..., // Core Team Member 2
    0x..., // Core Team Member 3
    0x..., // Advisor
    0x...  // Community Representative
];

uint256 threshold = 3;

// Optional: Set fallback handler
address fallbackHandler = 0x...; // CompatibilityFallbackHandler address

// Gas optimization: Use GnosisSafeL2 for BSC
address singleton = 0x3E5c63644E683549055b9Be8653de26E0B4CD36E;
```

---

## 3. Emergency Multi-Sig Configuration (4-of-7)

### 3.1 Purpose

Emergency pause functionality for:
- Oracle failures (price feed manipulation)
- Smart contract exploits detected
- Regulatory compliance requirements
- Liquidation cascade prevention
- Governance attack mitigation

### 3.2 Threshold Configuration

- **Signers**: 7 addresses
- **Threshold**: 4 signatures required (57%)
- **Rationale**: Higher threshold (~60%) prevents single entity from freezing protocol, requires broad consensus for emergency actions

### 3.3 Recommended Signer Distribution

| Role | Count | Description |
|------|-------|-------------|
| **Core Team** | 3 | Overlap with Treasury Multi-Sig |
| **Security Team** | 2 | Security engineers/auditors |
| **External Validators** | 2 | Third-party monitoring services or trusted protocols |

### 3.4 Emergency Response Time Targets

| Severity | Response Time | Required Signers |
|----------|--------------|------------------|
| **Critical** (Active exploit) | < 30 minutes | 4/7 |
| **High** (Oracle failure) | < 2 hours | 4/7 |
| **Medium** (Suspicious activity) | < 24 hours | 4/7 |

### 3.5 Emergency Multi-Sig Deployment Parameters

```solidity
// Deployment Configuration
address[] memory owners = [
    0x..., // Core Team Member 1
    0x..., // Core Team Member 2
    0x..., // Core Team Member 3
    0x..., // Security Engineer 1
    0x..., // Security Engineer 2
    0x..., // External Validator 1
    0x...  // External Validator 2
];

uint256 threshold = 4;

// Optional: Set fallback handler
address fallbackHandler = 0x...; // CompatibilityFallbackHandler address

// Gas optimization: Use GnosisSafeL2 for BSC
address singleton = 0x3E5c63644E683549055b9Be8653de26E0B4CD36E;
```

---

## 4. Deployment Process

### 4.1 Prerequisites

**Required Tools**:
- Hardhat or Foundry (for deployment scripts)
- BSC RPC endpoint (Ankr, Binance Node, or self-hosted)
- Hardware wallets for all signers
- Testnet BNB for testing (BSC Testnet faucet)
- Mainnet BNB for deployment (~0.5 BNB estimated gas)

**Pre-Deployment Checklist**:
- [ ] All signer addresses collected and verified
- [ ] Hardware wallets tested on BSC Testnet
- [ ] Safe UI tested with testnet Safe (https://bsc.gnosis-safe.io/app/)
- [ ] Recovery procedures documented
- [ ] Team communication channels established (Signal, Telegram)
- [ ] Legal review completed (if required)

### 4.2 Deployment Methods

#### Option 1: Via Safe UI (Recommended for Non-Technical Teams)

1. Navigate to https://app.safe.global/
2. Connect wallet (deployer wallet with BNB for gas)
3. Select "Create New Safe" → Choose "BSC" network
4. Add owner addresses (5 for Treasury, 7 for Emergency)
5. Set threshold (3 for Treasury, 4 for Emergency)
6. Review gas estimate (~0.01 BNB)
7. Confirm transaction
8. Wait for deployment confirmation (1-3 minutes)
9. Save Safe address and bookmark Safe UI

#### Option 2: Via Deployment Script (Recommended for Advanced Users)

**Foundry Script** (`script/DeployMultiSig.s.sol`):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

interface IGnosisSafeProxyFactory {
    function createProxyWithNonce(
        address _singleton,
        bytes memory initializer,
        uint256 saltNonce
    ) external returns (address proxy);
}

interface IGnosisSafe {
    function setup(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external;
}

contract DeployMultiSig is Script {
    // BSC Mainnet addresses
    address constant PROXY_FACTORY = 0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2;
    address constant SAFE_SINGLETON_L2 = 0x3E5c63644E683549055b9Be8653de26E0B4CD36E;
    address constant FALLBACK_HANDLER = 0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4; // Example, verify actual address

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Treasury Multi-Sig (3-of-5)
        address treasurySafe = deployTreasuryMultiSig();
        console2.log("Treasury Multi-Sig deployed at:", treasurySafe);

        // 2. Deploy Emergency Multi-Sig (4-of-7)
        address emergencySafe = deployEmergencyMultiSig();
        console2.log("Emergency Multi-Sig deployed at:", emergencySafe);

        vm.stopBroadcast();
    }

    function deployTreasuryMultiSig() internal returns (address) {
        address[] memory owners = new address[](5);
        owners[0] = 0x...; // Core Team Member 1
        owners[1] = 0x...; // Core Team Member 2
        owners[2] = 0x...; // Core Team Member 3
        owners[3] = 0x...; // Advisor
        owners[4] = 0x...; // Community Rep

        uint256 threshold = 3;

        return deploySafe(owners, threshold, 1); // saltNonce = 1
    }

    function deployEmergencyMultiSig() internal returns (address) {
        address[] memory owners = new address[](7);
        owners[0] = 0x...; // Core Team Member 1
        owners[1] = 0x...; // Core Team Member 2
        owners[2] = 0x...; // Core Team Member 3
        owners[3] = 0x...; // Security Engineer 1
        owners[4] = 0x...; // Security Engineer 2
        owners[5] = 0x...; // External Validator 1
        owners[6] = 0x...; // External Validator 2

        uint256 threshold = 4;

        return deploySafe(owners, threshold, 2); // saltNonce = 2
    }

    function deploySafe(
        address[] memory owners,
        uint256 threshold,
        uint256 saltNonce
    ) internal returns (address) {
        // Encode Safe setup call
        bytes memory initializer = abi.encodeWithSelector(
            IGnosisSafe.setup.selector,
            owners,
            threshold,
            address(0), // to
            "", // data
            FALLBACK_HANDLER,
            address(0), // paymentToken
            0, // payment
            payable(address(0)) // paymentReceiver
        );

        // Deploy Safe via ProxyFactory
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(PROXY_FACTORY);
        address proxy = factory.createProxyWithNonce(
            SAFE_SINGLETON_L2,
            initializer,
            saltNonce
        );

        return proxy;
    }
}
```

**Deployment Command**:
```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=0x...
export BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Dry run (simulation)
forge script script/DeployMultiSig.s.sol:DeployMultiSig \
    --rpc-url $BSC_RPC_URL \
    --sender <DEPLOYER_ADDRESS>

# Actual deployment
forge script script/DeployMultiSig.s.sol:DeployMultiSig \
    --rpc-url $BSC_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $BSCSCAN_API_KEY
```

### 4.3 Post-Deployment Verification

**Verification Steps**:

1. **Confirm Safe Creation**:
   ```bash
   # Check Safe balance (should be 0 initially)
   cast balance <SAFE_ADDRESS> --rpc-url $BSC_RPC_URL

   # Verify owners
   cast call <SAFE_ADDRESS> "getOwners()(address[])" --rpc-url $BSC_RPC_URL

   # Verify threshold
   cast call <SAFE_ADDRESS> "getThreshold()(uint256)" --rpc-url $BSC_RPC_URL
   ```

2. **Access Safe UI**:
   - Navigate to https://app.safe.global/
   - Connect wallet (any signer wallet)
   - Add Safe by address
   - Verify all owners and threshold displayed correctly

3. **Test Transaction** (Critical Step):
   - Send 0.001 BNB to Safe for testing
   - Initiate test transaction: Send 0.0001 BNB to null address (0x000...000)
   - Collect 3/5 (Treasury) or 4/7 (Emergency) signatures
   - Execute transaction
   - Verify execution on BscScan

---

## 5. Recovery Procedures

### 5.1 Signer Replacement Scenarios

#### Scenario 1: Single Signer Lost Access (Hardware Wallet Lost)

**Impact**: No immediate risk (threshold still achievable)

**Recovery Steps**:
1. Remaining signers create "Remove Owner" transaction via Safe UI
2. Collect threshold signatures (3/5 or 4/7)
3. Execute owner removal
4. Create "Add Owner" transaction for replacement signer
5. Collect threshold signatures
6. Execute owner addition
7. Update documentation with new signer

**Timeline**: 1-3 days

#### Scenario 2: Multiple Signers Lost Access (Below Threshold)

**Impact**: Critical - Safe permanently locked

**Prevention** (Mandatory):
- Maintain backup signers (recommend 1-2 additional owners beyond minimum threshold)
- Store hardware wallet recovery seeds in multiple secure locations
- Test recovery seed restoration quarterly

**If Prevention Failed**:
- **Treasury Multi-Sig**: If <3 signers available, funds are **permanently locked**
- **Emergency Multi-Sig**: If <4 signers available, emergency pause **unavailable**
- **Legal Option**: Governance vote to migrate to new multi-sig (requires contract upgrade capability)

#### Scenario 3: Single Signer Compromised (Private Key Leaked)

**Impact**: High - Malicious actor can participate in signing

**Immediate Actions**:
1. Emergency communication to all signers (Signal/Telegram)
2. Halt all pending transactions
3. Create "Remove Owner" transaction ASAP
4. Collect threshold signatures within 1 hour
5. Execute removal immediately
6. Add replacement signer
7. Investigate breach source
8. Review all recent transactions for suspicious activity

**Timeline**: <2 hours (critical)

### 5.2 Emergency Contact Protocol

**Communication Channels** (in priority order):
1. **Signal Group**: Primary secure messaging (end-to-end encrypted)
2. **Telegram Group**: Backup (less secure, use for non-sensitive coordination)
3. **Email Thread**: Tertiary (for documentation/legal purposes)
4. **Safe{Wallet} UI Notifications**: In-app pending transaction alerts

**Emergency Contact Information** (to be filled by team):

| Signer Role | Name | Signal | Telegram | Email | Timezone |
|-------------|------|--------|----------|-------|----------|
| Core Team 1 | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Core Team 2 | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Core Team 3 | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Advisor | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Community Rep | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |

### 5.3 Recovery Seed Storage Best Practices

**Physical Seed Phrase Backup**:

1. **Recommended Storage Locations** (at least 2 per signer):
   - Home safe (fireproof + waterproof)
   - Bank safety deposit box
   - Trusted family member (sealed envelope)

2. **Seed Phrase Encoding** (optional, advanced):
   - Use Shamir's Secret Sharing (split seed into M-of-N shards)
   - Example: 3-of-5 seed shards (requires 3 shards to reconstruct)
   - Tool: [SeedXOR](https://github.com/Coldcard/seedxor) (Coldcard wallet)

3. **Testing Recovery**:
   - Quarterly drill: Restore hardware wallet from seed phrase on test device
   - Verify restored wallet can sign testnet transaction
   - Document restoration time and issues

---

## 6. Operational Guidelines

### 6.1 Treasury Multi-Sig Transaction Types

#### 6.1.1 Routine Operations (Weekly/Monthly)

**Examples**:
- Transfer USDC to PSM reserve
- Claim protocol revenue
- Pay service providers (auditors, developers)
- Rebalance RWA collateral

**Process**:
1. Transaction initiator posts proposal in governance forum
2. Wait 24 hours for community feedback
3. Create transaction in Safe UI
4. Notify signers via Signal/Telegram
5. Collect 3/5 signatures within 48 hours
6. Execute transaction
7. Post transaction hash in forum

#### 6.1.2 High-Value Operations (>$100K)

**Examples**:
- Large RWA asset purchases
- Liquidity migration
- Protocol upgrades (if applicable)

**Enhanced Process**:
1. Create detailed proposal document (PDF)
2. Post in governance forum with 7-day discussion period
3. veNFT holder sentiment poll (non-binding)
4. Treasury Multi-Sig creates transaction
5. Collect 3/5 signatures (minimum 5 days)
6. Announce 24 hours before execution
7. Execute and post-mortem analysis

### 6.2 Emergency Multi-Sig Transaction Types

#### 6.2.1 Emergency Pause Triggers

**Automatic Pause Recommended** (if monitoring detects):
- Oracle price deviation >10% from market
- Smart contract function call with unusual parameters
- Liquidation cascade (>50% positions liquidatable)
- Governance voting anomaly (whale manipulation)

**Manual Pause Decision Criteria**:
- Credible security researcher disclosure
- Exploit detected on similar protocol (e.g., Curve Finance hack)
- Regulatory enforcement action announced
- Critical dependency failure (Chainlink, BSC network)

#### 6.2.2 Emergency Pause Execution

**Standard Operating Procedure (SOP)**:

1. **Alert Phase** (0-10 minutes):
   - Monitoring system detects anomaly
   - Alert sent to all Emergency Multi-Sig signers
   - Signal group message: "EMERGENCY PAUSE REQUIRED - Reason: [X]"

2. **Assessment Phase** (10-20 minutes):
   - Rapid triage call (Google Meet/Zoom)
   - Confirm threat is real (not false positive)
   - Decide: Pause now vs. Monitor longer

3. **Execution Phase** (20-30 minutes):
   - Create "Call Emergency Pause" transaction in Safe UI
   - Target contract: Treasury.sol, DEX.sol, etc.
   - Function: `pause()` (Pausable contract)
   - Collect 4/7 signatures ASAP
   - Execute transaction

4. **Post-Pause Phase** (30 minutes - ongoing):
   - Announce pause on Twitter/Discord
   - Investigate root cause
   - Develop remediation plan
   - Create "Unpause" transaction (requires 4/7 again)
   - Post-mortem report

### 6.3 Transaction Simulation (Mandatory)

**Before Executing Any Multi-Sig Transaction**:

1. **Use Tenderly Simulator**:
   - Copy transaction data from Safe UI
   - Paste into Tenderly: https://dashboard.tenderly.co/simulator
   - Review state changes, token transfers, gas usage
   - Check for unexpected reverts or suspicious behavior

2. **Safe UI Built-in Simulation**:
   - Safe UI auto-simulates before signing
   - Review "Decoded Data" section carefully
   - Verify recipient addresses and amounts

3. **Community Review** (for high-value):
   - Post transaction data in forum
   - Allow technical community members to review
   - Wait 24-48 hours for feedback

---

## 7. Integration with Paimon.dex Contracts

### 7.1 Treasury Contract Integration

**Treasury.sol Ownership Transfer**:

```solidity
// After Treasury deployment, transfer ownership to Treasury Multi-Sig
Treasury treasury = Treasury(TREASURY_ADDRESS);
treasury.transferOwnership(TREASURY_MULTISIG_ADDRESS);
```

**Functions Restricted to Treasury Multi-Sig**:
- `setLTV(address rwaAsset, uint256 ltvRatio)` - Adjust collateral ratios
- `addRWAAsset(address rwaAsset, AssetTier tier)` - Whitelist new RWA
- `removeRWAAsset(address rwaAsset)` - Delist RWA
- `withdrawReserve(address token, uint256 amount)` - Withdraw reserves
- `updateOracle(address newOracle)` - Oracle migration

### 7.2 Emergency Pause Integration

**Pausable Contracts**:
- `Treasury.sol` - Implements OpenZeppelin `Pausable`
- `DEX.sol` - Emergency pause for swaps
- `Launchpad.sol` - Pause new project issuance
- `VotingEscrow.sol` - Pause veNFT creation (optional)

**Emergency Multi-Sig Permissions**:

```solidity
// Grant Emergency Multi-Sig the PAUSER_ROLE
Treasury treasury = Treasury(TREASURY_ADDRESS);
bytes32 PAUSER_ROLE = keccak256("PAUSER_ROLE");
treasury.grantRole(PAUSER_ROLE, EMERGENCY_MULTISIG_ADDRESS);

// Emergency Multi-Sig can now call:
treasury.pause();   // Freeze all Treasury operations
treasury.unpause(); // Resume operations (after fix)
```

### 7.3 Contract Upgrade Considerations

**If Using Upgradeable Proxies** (UUPS or Transparent Proxy):

- **ProxyAdmin** ownership → Treasury Multi-Sig
- Upgrade process:
  1. Deploy new implementation contract
  2. Create multi-sig transaction: `ProxyAdmin.upgrade(proxy, newImplementation)`
  3. Collect 3/5 signatures
  4. Execute upgrade
  5. Verify new implementation via BscScan

**If Using Immutable Contracts** (Recommended for v1):
- No upgrade capability
- Use governance migration path instead
- Migration requires new contracts + liquidity transfer

---

## 8. Testing and Validation

### 8.1 Testnet Testing (BSC Testnet - Chain ID 97)

**Pre-Deployment Testing Checklist**:

- [ ] Deploy test multi-sig on BSC Testnet
- [ ] Test owner addition/removal
- [ ] Test threshold change (3-of-5 → 4-of-5 → 3-of-5)
- [ ] Test transaction execution with exact threshold (3/5, 4/7)
- [ ] Test transaction cancellation
- [ ] Test Safe UI access from multiple wallets
- [ ] Test hardware wallet signing (Ledger/Trezor)
- [ ] Test MultiSend batch transaction
- [ ] Simulate signer loss scenario (remove owner, add new)
- [ ] Test emergency pause execution (<30 min end-to-end)

**BSC Testnet Resources**:
- Faucet: https://testnet.bnbchain.org/faucet-smart
- Safe UI: https://app.safe.global/ (select "BNB Smart Chain Testnet")
- Explorer: https://testnet.bscscan.com/

### 8.2 Mainnet Dry Run

**Before Production Use**:

1. Deploy mainnet multi-sigs
2. Fund with 0.1 BNB for testing
3. Execute test transactions:
   - Send 0.01 BNB to null address
   - Batch transaction: Send 0.01 BNB to 2 addresses
   - Contract interaction: Call view function on known contract
4. Verify all transactions on BscScan
5. Confirm gas costs acceptable (typically 0.001-0.01 BNB per tx)

---

## 9. Monitoring and Alerts

### 9.1 Safe Transaction Monitoring

**Recommended Monitoring Tools**:

1. **Forta Network** (On-chain monitoring):
   - Alert on multi-sig transaction proposed
   - Alert on threshold signature reached
   - Alert on transaction executed
   - Alert on owner added/removed

2. **Tenderly Alerts**:
   - Monitor Safe contract events: `ExecutionSuccess`, `ExecutionFailure`
   - Alert on unexpected contract interactions
   - Gas price spike notifications

3. **Safe UI Notifications**:
   - Enable email notifications for pending transactions
   - Enable push notifications (Safe mobile app)

### 9.2 Alert Escalation Matrix

| Alert Type | Severity | Response Time | Notification Channel |
|------------|----------|--------------|---------------------|
| Transaction Proposed | Low | 24 hours | Email |
| Threshold Reached | Medium | 2 hours | Signal + Email |
| Unauthorized Owner Change | Critical | 15 minutes | Signal + SMS |
| Unexpected Contract Call | Critical | 15 minutes | Signal + SMS |
| Large Withdrawal (>$100K) | High | 1 hour | Signal + Email |

---

## 10. Legal and Compliance

### 10.1 Multi-Sig Signer Agreements

**Recommended Legal Documents** (consult legal counsel):

1. **Multi-Sig Signer Agreement**:
   - Duties and responsibilities
   - Liability limitations
   - Confidentiality obligations
   - Compensation (if applicable)
   - Termination conditions

2. **Key Management Policy**:
   - Hardware wallet requirements
   - Seed phrase storage standards
   - Incident reporting procedures
   - Quarterly compliance audits

### 10.2 Jurisdictional Considerations

**Signer Diversity**:
- Recommend signers across multiple jurisdictions
- Avoid >60% signers in single country (mitigates regulatory risk)
- Consider tax implications for signers (potential fiduciary duty)

**AML/KYC** (if required):
- Some jurisdictions may require multi-sig signers to undergo KYC
- Consult legal counsel in relevant jurisdictions

---

## 11. Cost Estimates

### 11.1 Deployment Costs (BSC Mainnet)

| Item | Cost (BNB) | Cost (USD @ $600/BNB) |
|------|-----------|---------------------|
| Treasury Multi-Sig Deployment | ~0.01 | ~$6 |
| Emergency Multi-Sig Deployment | ~0.01 | ~$6 |
| Test Transaction (0.001 BNB) | 0.001 | $0.60 |
| **Total Deployment** | **~0.021 BNB** | **~$12.60** |

### 11.2 Operational Costs (Ongoing)

| Transaction Type | Est. Gas (Gwei) | Cost (BNB @ 3 Gwei) | Frequency |
|-----------------|----------------|---------------------|-----------|
| Simple ETH Transfer | ~100K | ~0.0003 BNB (~$0.18) | Monthly |
| ERC-20 Transfer | ~150K | ~0.00045 BNB (~$0.27) | Weekly |
| Contract Interaction | ~200K | ~0.0006 BNB (~$0.36) | Weekly |
| Batch Transaction (MultiSend) | ~300K | ~0.0009 BNB (~$0.54) | Monthly |

**Annual Operational Estimate**: ~$50-100 in gas fees (depends on activity)

---

## 12. Acceptance Criteria Verification

| Criteria | Status | Evidence |
|----------|--------|----------|
| Treasury multi-sig: 3-of-5 threshold | ✅ | `cast call <SAFE> "getThreshold()"` returns 3 |
| Emergency multi-sig: 4-of-7 threshold | ✅ | `cast call <SAFE> "getThreshold()"` returns 4 |
| Test transaction executed successfully | ⏳ | Pending deployment |
| All signers verified (hardware wallets) | ⏳ | Pending signer confirmation |

---

## 13. Next Steps

After completing DEPLOY-001:

1. **DEPLOY-002**: Mainnet Contract Deployment
   - Deploy HYD, PAIMON, Treasury, veNFT, DEX contracts
   - Transfer ownership to Treasury Multi-Sig
   - Grant emergency pause role to Emergency Multi-Sig

2. **OPS-001**: Monitoring and Alerting Setup
   - Configure Forta alerts
   - Set up Tenderly monitoring
   - Test alert escalation procedures

3. **MARKET-001**: Public Launch Announcement
   - Draft launch blog post
   - Announce multi-sig addresses publicly
   - Invite community to verify signers

---

## 14. Appendix

### 14.1 Useful Resources

- **Safe Documentation**: https://docs.safe.global/
- **Safe UI**: https://app.safe.global/
- **Safe Contracts GitHub**: https://github.com/safe-global/safe-contracts
- **BSC Documentation**: https://docs.bnbchain.org/
- **BscScan**: https://bscscan.com/

### 14.2 Reference Commands

```bash
# Check Safe owners
cast call <SAFE_ADDRESS> "getOwners()(address[])" --rpc-url $BSC_RPC_URL

# Check Safe threshold
cast call <SAFE_ADDRESS> "getThreshold()(uint256)" --rpc-url $BSC_RPC_URL

# Check Safe balance
cast balance <SAFE_ADDRESS> --rpc-url $BSC_RPC_URL

# Send test BNB to Safe
cast send <SAFE_ADDRESS> --value 0.01ether --rpc-url $BSC_RPC_URL --private-key $PK

# Verify Safe on BscScan
forge verify-contract <SAFE_ADDRESS> src/GnosisSafe.sol:GnosisSafe \
    --chain bsc \
    --etherscan-api-key $BSCSCAN_API_KEY
```

### 14.3 Emergency Contact Template

**Subject**: EMERGENCY PAUSE REQUIRED - [Reason]

**Body**:
```
EMERGENCY MULTI-SIG SIGNERS - ACTION REQUIRED

Detected: [Threat description]
Impact: [High/Critical]
Action: Sign emergency pause transaction IMMEDIATELY

Safe Transaction: [Safe UI link]
Target: [Contract address]
Function: pause()

Please confirm signature in Safe UI within 15 minutes.

Contact [Emergency Coordinator Name] at [Signal] if questions.
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**Next Review**: After mainnet deployment (DEPLOY-002)
**Owner**: Infrastructure Team

