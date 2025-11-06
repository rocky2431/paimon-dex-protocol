# Paimon DEX - User Guide

**Version:** 1.0  
**Last Updated:** 2025-11-07

---

## Welcome to Paimon DEX

Paimon DEX is a decentralized exchange combining RWA (Real World Asset) tokenization, veNFT governance, and synthetic stablecoins.

**Key Features:**
- 💱 Swap tokens (PSM 1:1 USDC ↔ USDP, DEX for other pairs)
- 🏦 Borrow USDP against RWA collateral
- 🔒 Lock PAIMON tokens for voting power (vePAIMON NFT)
- 🗳️ Vote on governance proposals and liquidity incentives
- 💧 Provide liquidity and earn fees
- 🚀 Participate in RWA project launches

---

## Getting Started

### 1. Connect Your Wallet

**Supported Wallets:**
- MetaMask (recommended)
- WalletConnect
- Coinbase Wallet
- Rainbow

**Steps:**
1. Click **"Connect Wallet"** button (top right)
2. Select your wallet from the modal
3. Approve connection in your wallet
4. Verify you're on **BSC Mainnet** (ChainID: 56)

**Need BSC in your wallet?**
- Bridge from Ethereum using [Binance Bridge](https://www.bnbchain.org/en/bridge)
- Or buy BNB directly on an exchange and withdraw to BSC

---

## Core Features

### 💱 Swap Tokens

**Navigate:** Trade → Swap

**Swap USDC ↔ USDP (PSM - 1:1 no slippage):**
1. Select **USDC** (top) and **USDP** (bottom)
2. Enter amount to swap
3. Click **"Swap"**
4. Confirm transaction in wallet
5. Wait for confirmation (usually <5 seconds)

**Swap Other Pairs (DEX):**
1. Select token pair (e.g., PAIMON/USDC)
2. Enter amount
3. Review slippage tolerance (0.5% default)
4. Click **"Swap"**
5. Confirm transaction

**Pro Tips:**
- Use PSM for USDC ↔ USDP (no fees, instant)
- Check liquidity before large swaps
- Adjust slippage for volatile pairs

---

### 🏦 Borrow USDP (Vault)

**Navigate:** Borrow → Vault Dashboard

**What is the Vault?**
Deposit RWA collateral (HYD tokens) and borrow USDP stablecoin at 80% LTV ratio.

**How to Borrow:**
1. Go to **Vault Dashboard**
2. Click **"Borrow"** button
3. Enter amount to borrow (max shown)
4. Click **"Confirm Borrow"**
5. Confirm transaction in wallet

**How to Repay:**
1. Go to **Vault Dashboard**
2. Click **"Repay"** button
3. Enter amount to repay (or click "MAX")
4. Click **"Confirm Repay"**
5. Confirm transaction

**Important:**
- **Health Factor**: Keep above 1.5 to avoid liquidation
- **LTV Ratio**: Maximum 80% (e.g., $100 collateral → borrow up to $80 USDP)
- **Liquidation**: Occurs if health factor drops below 1.0

---

### 🛡️ Stability Pool

**Navigate:** Borrow → Stability Pool

**What is the Stability Pool?**
Deposit USDP to earn liquidation rewards. When vaults are liquidated, you gain collateral at a discount.

**How to Deposit:**
1. Go to **Stability Pool**
2. Click **"Deposit"** tab
3. Enter USDP amount
4. Click **"Confirm Deposit"**
5. Confirm transaction

**How to Withdraw:**
1. Click **"Withdraw"** tab
2. Enter amount to withdraw
3. Click **"Confirm Withdraw"**
4. Confirm transaction

**Expected Returns:**
- **Estimated APY:** ~0.2% from liquidations
- **Bonus:** Earn PAIMON token rewards
- **Risk:** Your USDP is used to absorb bad debt (but you gain collateral)

---

### 🔒 Lock PAIMON (veNFT)

**Navigate:** Trade → Lock PAIMON

**What is vePAIMON?**
Lock PAIMON tokens to receive a vePAIMON NFT (non-transferable) with voting power.

**Lock Duration Options:**
- **1 week** → 0.0048x voting power
- **1 month** → 0.019x voting power
- **6 months** → 0.115x voting power
- **1 year** → 0.25x voting power
- **4 years (max)** → 1.0x voting power

**How to Lock:**
1. Go to **Lock PAIMON** page
2. Enter PAIMON amount
3. Select lock duration (slider)
4. Click **"Lock PAIMON"**
5. Confirm transaction
6. Receive vePAIMON NFT

**Voting Power:**
- Decays linearly over time
- Used for governance voting
- Used for gauge weight voting (liquidity incentives)

---

### 🗳️ Governance Voting

**Navigate:** Governance → Vote

**What Can You Vote On?**
1. **Gauge Weights** - Direct liquidity mining rewards to pools
2. **Governance Proposals** - Protocol changes, treasury management
3. **Launchpad Projects** - Approve new RWA projects

**How to Vote on Gauges:**
1. Go to **Vote** page
2. View list of liquidity pools
3. Allocate voting power (% to each pool)
4. Click **"Submit Votes"**
5. Confirm transaction

**How to Vote on Proposals:**
1. Go to **Governance → Proposals**
2. Read proposal details
3. Click **"Vote For"** or **"Vote Against"**
4. Confirm transaction

**Voting Period:**
- Gauge votes: Every 2 weeks (epoch system)
- Governance votes: 7-day voting period

---

### 💧 Provide Liquidity

**Navigate:** Trade → Add Liquidity

**How to Add Liquidity:**
1. Go to **Add Liquidity** page
2. Select token pair (e.g., PAIMON/USDC)
3. Enter amount for one token
4. Other token amount auto-calculates
5. Click **"Add Liquidity"**
6. Confirm 2 transactions:
   - Approve tokens
   - Add liquidity
7. Receive LP tokens

**How to Remove Liquidity:**
1. Go to **Remove Liquidity** page
2. Select pool
3. Choose removal percentage (slider)
4. Click **"Remove Liquidity"**
5. Confirm transaction
6. Receive both tokens back

**Earning Fees:**
- 0.25% swap fee on all trades
- 70% distributed to voters (via bribes)
- 30% to treasury

---

### 🚀 Launchpad (RWA Projects)

**Navigate:** Governance → Launchpad

**What is the Launchpad?**
Discover and participate in vetted RWA tokenization projects.

**How to Participate:**
1. Browse project list
2. Click on a project card
3. Read project details:
   - Business model
   - Collateral type
   - Compliance documents
4. Vote to approve (if you have vePAIMON)
5. After approval, participate in token sale

**Due Diligence:**
- ✅ Review compliance documents
- ✅ Check collateral quality
- ✅ Read third-party audits
- ✅ Understand business model

---

### 💰 Claim Rewards

**Navigate:** Earn → Claim Rewards

**Reward Sources:**
1. **Liquidity Mining** - Earn PAIMON for providing liquidity
2. **Voting Incentives** - Earn bribes for voting
3. **Stability Pool** - Earn liquidation rewards
4. **Boost Staking** - Earn boosted rewards (1.0x-1.5x)

**How to Claim:**
1. Go to **Claim Rewards** page
2. View total claimable rewards
3. Click **"Claim All"**
4. Confirm transaction
5. Rewards sent to your wallet

**Vesting Options:**
- **Immediate** (50% penalty) - Receive 50% now
- **Linear Vesting** (365 days) - Vest over 1 year, full amount

---

### ⚡ Boost Staking

**Navigate:** Earn → Boost Staking

**What is Boost Staking?**
Stake PAIMON to earn 1.0x-1.5x multiplier on all rewards.

**How to Stake:**
1. Go to **Boost Staking** page
2. Enter PAIMON amount
3. Click **"Stake"**
4. Confirm transaction
5. Wait 7 days minimum (lock period)

**Multiplier Tiers:**
- Stake 1,000 PAIMON → 1.0x multiplier
- Stake 10,000 PAIMON → 1.25x multiplier
- Stake 50,000 PAIMON → 1.5x multiplier

**How to Unstake:**
1. Wait 7 days minimum
2. Click **"Unstake"**
3. Confirm transaction
4. PAIMON returned to wallet

---

## Common Questions (FAQ)

### What is USDP?

USDP is a synthetic stablecoin backed by RWA collateral (US Treasuries, investment-grade credit). It maintains $1 peg through:
1. PSM (1:1 USDC ↔ USDP swap)
2. Collateral backing (Treasury holds RWA)
3. Stability Pool (absorbs bad debt)

---

### What is vePAIMON NFT?

vePAIMON is a non-transferable NFT you receive when locking PAIMON tokens. It represents:
- Voting power (governance + gauge voting)
- Governance rights
- Revenue sharing

**Key difference from regular tokens:**
- Cannot be sold or transferred
- Voting power decays over time
- Must be locked for specified duration

---

### How is my collateral secured?

RWA collateral is held by custodians (regulated financial institutions) and tokenized on-chain. Security mechanisms:
1. **Dual-price oracle** (Chainlink + NAV feed)
2. **Multi-sig treasury** (3-of-5 timelock)
3. **Third-party audits**
4. **Collateral tiers** (T1/T2/T3 with different LTV ratios)

---

### What happens if I get liquidated?

If your vault's health factor drops below 1.0:
1. Stability Pool depositors absorb your debt
2. They receive your collateral at a discount (~10%)
3. You lose your collateral
4. Your debt is cleared

**Avoid liquidation:**
- Maintain health factor >1.5
- Monitor collateral value
- Repay debt if health factor drops

---

### Can I close my vePAIMON lock early?

**Yes, but with 50% penalty:**
1. Go to **Lock PAIMON** page
2. View your lock position
3. Click **"Early Exit"**
4. Confirm penalty (50% of locked PAIMON)
5. Receive remaining 50% back

**Recommendation:** Only use if absolutely necessary.

---

## Safety Tips

### 🔐 Security Best Practices

1. **Never share your seed phrase**
2. **Verify transaction details** before signing
3. **Use hardware wallet** for large amounts (Ledger, Trezor)
4. **Bookmark official URL** (avoid phishing sites)
5. **Enable 2FA on wallet** if supported

---

### ⚠️ Risk Warnings

- **Smart Contract Risk** - Code is audited but not risk-free
- **Liquidation Risk** - Maintain healthy collateral ratio
- **Impermanent Loss** - Providing liquidity has IL risk
- **Volatility Risk** - Token prices can fluctuate
- **Regulatory Risk** - RWA regulations may change

---

## Troubleshooting

### Transaction Failed

**Possible causes:**
- Insufficient gas (BNB)
- Slippage too low (increase to 1-2%)
- Deadline expired (refresh page)
- Contract paused (check announcements)

**Solutions:**
1. Check BNB balance for gas
2. Increase slippage tolerance
3. Refresh page and retry
4. Check Discord for updates

---

### Wallet Not Connecting

**Solutions:**
1. Refresh page
2. Clear browser cache
3. Switch wallet network to BSC Mainnet
4. Try different browser
5. Reinstall wallet extension

---

### Wrong Network

**Switch to BSC Mainnet:**
1. Open MetaMask
2. Click network dropdown (top)
3. Select "BNB Smart Chain"
4. If not listed, add manually:
   - Network Name: BSC Mainnet
   - RPC URL: https://bsc-dataseed.binance.org/
   - Chain ID: 56
   - Symbol: BNB
   - Explorer: https://bscscan.com

---

## Support

### Community

- **Discord:** [discord.gg/paimondex](https://discord.gg/paimondex)
- **Telegram:** [@paimondex](https://t.me/paimondex)
- **Twitter:** [@paimondex](https://twitter.com/paimondex)

### Documentation

- **Technical Docs:** [docs.paimon.dex](https://docs.paimon.dex)
- **GitHub:** [github.com/paimon-contracts](https://github.com/paimon-contracts)

### Contact

- **Email:** support@paimon.dex
- **Bug Reports:** [GitHub Issues](https://github.com/paimon-contracts/issues)

---

## Legal

**Disclaimer:** Paimon DEX is a decentralized protocol. Use at your own risk. Not available in restricted jurisdictions (US, China, etc.). Read full [Terms of Service](https://paimon.dex/terms) before using.

---

**Version:** 1.0  
**Last Updated:** 2025-11-07  
**Happy Trading!** 🚀
