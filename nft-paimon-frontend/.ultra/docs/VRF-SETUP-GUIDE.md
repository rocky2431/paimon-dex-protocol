# Chainlink VRF V2 Setup Guide

**For RWABondNFT Dice Rolling Integration**

---

## 📋 Overview

This guide explains how to set up Chainlink VRF V2 for the RWABondNFT contract on BSC (Binance Smart Chain). The VRF provides provably fair randomness for the dice rolling game.

---

## 🎯 Prerequisites

### 1. LINK Tokens
You need LINK tokens to fund the VRF subscription:

**BSC Testnet**:
- Amount: 10 LINK (recommended)
- Get from faucet: https://faucets.chain.link/bnb-chain-testnet
- LINK Token: `0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06`

**BSC Mainnet**:
- Amount: 100 LINK (recommended)
- Buy from exchange or swap on PancakeSwap
- LINK Token: `0x404460C6A5EdE2D891e8297795264fDe62ADBB75`

### 2. Deployer Wallet
- Must have BNB for gas fees
- Must have LINK for subscription funding
- Private key stored in `.env` as `PRIVATE_KEY`

---

## 🚀 Setup Steps

### Step 1: Create VRF Subscription

You can create a subscription using either **Chainlink UI** (recommended) or **deployment script**.

#### Option A: Chainlink VRF UI (Recommended)

1. Visit Chainlink VRF UI:
   - **Testnet**: https://vrf.chain.link/bnb-chain-testnet
   - **Mainnet**: https://vrf.chain.link/bnb-chain

2. Connect your wallet (MetaMask)

3. Click "Create Subscription"

4. Note down the **Subscription ID**

5. Fund the subscription with LINK (10 LINK for testnet, 100 for mainnet)

#### Option B: Deployment Script

```bash
# BSC Testnet
forge script script/SetupVRFSubscription.s.sol:SetupVRFSubscription \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  --verify

# BSC Mainnet (use with caution!)
forge script script/SetupVRFSubscription.s.sol:SetupVRFSubscription \
  --rpc-url $BSC_MAINNET_RPC \
  --broadcast \
  --verify
```

**Output**: Script will print your Subscription ID. Save it!

---

### Step 2: Deploy RWABondNFT Contract

Deploy the RWABondNFT contract with the subscription ID from Step 1.

```bash
# Example deployment (update with your subscription ID)
forge create contracts/presale/RWABondNFT.sol:RWABondNFT \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    0x<USDC_ADDRESS> \
    0x<TREASURY_ADDRESS> \
    0x6A2AAd07396B36Fe02a22b33cf443582f682c82f \  # VRF Coordinator (testnet)
    <SUBSCRIPTION_ID> \
    0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314 \  # Key Hash (testnet)
    200000  # Callback Gas Limit
```

**Save the deployed RWABondNFT contract address!**

---

### Step 3: Add RWABondNFT as Consumer

The RWABondNFT contract must be added as a consumer to the VRF subscription.

#### Option A: Chainlink VRF UI

1. Go to your subscription page
2. Click "Add Consumer"
3. Enter the RWABondNFT contract address
4. Confirm transaction

#### Option B: Script

```bash
# Run the addConsumer helper function
cast send <VRF_COORDINATOR_ADDRESS> \
  "addConsumer(uint64,address)" \
  <SUBSCRIPTION_ID> \
  <RWA_BOND_NFT_ADDRESS> \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $PRIVATE_KEY
```

---

### Step 4: Test Dice Rolling

1. Mint a test NFT:
```bash
cast send <RWA_BOND_NFT_ADDRESS> \
  "mint(uint256)" \
  1 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $PRIVATE_KEY
```

2. Request a dice roll:
```bash
cast send <RWA_BOND_NFT_ADDRESS> \
  "requestDiceRoll(uint256)" \
  1 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $PRIVATE_KEY
```

3. Wait for VRF callback (usually 3-5 blocks)

4. Check Remint earnings:
```bash
cast call <RWA_BOND_NFT_ADDRESS> \
  "getBondInfo(uint256)" \
  1 \
  --rpc-url $BSC_TESTNET_RPC
```

Look for `accumulatedRemint` value!

---

## 📊 Network Configuration

### BSC Testnet (Chapel - Chain ID: 97)
| Parameter | Value |
|-----------|-------|
| VRF Coordinator | `0x6A2AAd07396B36Fe02a22b33cf443582f682c82f` |
| Key Hash (50 gwei) | `0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314` |
| LINK Token | `0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06` |
| Request Confirmations | 3 |
| Callback Gas Limit | 200,000 |
| Recommended Funding | 10 LINK |

### BSC Mainnet (Chain ID: 56)
| Parameter | Value |
|-----------|-------|
| VRF Coordinator | `0xc587d9053cd1118f25F645F9E08BB98c9712A4EE` |
| Key Hash (200 gwei) | `0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04` |
| LINK Token | `0x404460C6A5EdE2D891e8297795264fDe62ADBB75` |
| Request Confirmations | 3 |
| Callback Gas Limit | 200,000 |
| Recommended Funding | 100 LINK |

---

## 🔧 Troubleshooting

### Error: "RWABondNFT: VRF request failed"

**Cause**: Subscription not funded or consumer not added.

**Solution**:
1. Check subscription balance: Visit Chainlink VRF UI
2. Ensure RWABondNFT is added as consumer
3. Fund subscription with more LINK

### Error: "RWABondNFT: no rolls left this week"

**Cause**: User has exhausted their weekly rolls (default: 1).

**Solution**: Wait for weekly reset or complete social tasks to earn more rolls (PRESALE-002).

### VRF Callback Never Arrives

**Possible causes**:
1. Insufficient subscription balance
2. Network congestion (wait longer)
3. Wrong key hash for network

**Check**:
```bash
# View subscription details
cast call <VRF_COORDINATOR> \
  "getSubscription(uint64)" \
  <SUBSCRIPTION_ID> \
  --rpc-url $BSC_TESTNET_RPC
```

---

## 🛡️ Security Best Practices

1. **Use Multi-Sig for Mainnet**: The subscription owner should be a multi-sig wallet

2. **Monitor Subscription Balance**: Set up alerts when LINK balance drops below threshold

3. **Rate Limiting**: The contract already implements weekly roll limits

4. **Emergency Pause**: Owner can pause the contract if VRF issues arise

5. **Subscription Migration**: Use `setVRFSubscriptionId()` to migrate if needed

---

## 📚 Additional Resources

- **Chainlink VRF V2 Docs**: https://docs.chain.link/vrf/v2/introduction
- **BSC Network Details**: https://docs.chain.link/vrf/v2/subscription/supported-networks#bnb-chain-mainnet
- **VRF UI**: https://vrf.chain.link/
- **LINK Faucet**: https://faucets.chain.link/

---

## 🎮 Dice Mechanics Reference

| Dice Type | Range | Max Reward | Unlock Condition |
|-----------|-------|------------|------------------|
| Normal | 1-6 | 0.5 USDC | Default |
| Gold | 1-12 | 1.0 USDC | Complete 5 social tasks |
| Diamond | 1-20 | 2.0 USDC | Complete 10 social tasks |

**Formula**: `reward = (diceResult / maxValue) × maxReward`

---

## ✅ Checklist

Before going live on mainnet:

- [ ] Created VRF subscription
- [ ] Funded subscription with 100 LINK
- [ ] Deployed RWABondNFT contract
- [ ] Added RWABondNFT as consumer
- [ ] Tested dice rolling on testnet
- [ ] Verified VRF callback works
- [ ] Set subscription owner to multi-sig
- [ ] Monitored first 10 dice rolls
- [ ] Documented subscription ID securely

---

**Need Help?**
Contact the development team or check Chainlink Discord: https://discord.gg/chainlink
