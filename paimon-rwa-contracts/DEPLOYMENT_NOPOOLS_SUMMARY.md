# Paimon.dex BSC Testnet 部署总结（无池版本）

**部署时间**：2025-11-13
**网络**：BSC Testnet (Chain ID: 97)
**部署者**：0x90465a524Fd4c54470f77a11DeDF7503c951E62F
**Gas 消耗**：~0.005 BNB

---

## 部署成功！

✅ **32 个核心合约**已成功部署到 BSC 测试网
✅ **无 WBNB mock** - Router 支持纯 ERC20 配对
✅ **无预部署池** - 所有流动性池将由用户通过前端动态创建

---

## 核心合约地址

### 核心代币

| 合约 | 地址 |
|------|------|
| USDP | `0x6F7021C9B4DCD61b26d1aF5ACd1394A79eb49051` |
| PAIMON | `0x9c85485176fcD2db01eD0af66ed63680Eb9e5CB2` |
| esPAIMON | `0x16f3a36Adae84c9c980D6C96510F37A5861DF2C6` |
| HYD (测试 RWA) | `0x3803E40C522E23163078c6fB2980288974645d85` |
| PSM | `0xC04288c5f143541d38D5E7EAd152dB69b386a384` |

### DEX（无预部署池）

| 合约 | 地址 |
|------|------|
| DEXFactory | `0xc32F700393F6d9d39b4f3b30ceF02e7A0795DB5A` |
| DEXRouter | `0x77a9B25d69746d9b51455c2EE71dbcc934365dDB` |

⚠️ **重要**：没有预部署的流动性池！用户需要通过前端 UI 动态创建池子。

### 治理

| 合约 | 地址 |
|------|------|
| VotingEscrow (USDP) | `0x1A54aA3302a1F2F5BF852517A92587E9c43B15e8` |
| VotingEscrowPaimon | `0x9f70D468BBdC4e4b0789732DDBCa7eF01E671cC4` |
| GaugeController | `0x229d5744Edc1684C30A8A393e3d66428bd904b26` |
| EmissionManager | `0x8bF29ACdeFFBCc3965Aaa225C4CB3EA479e7615a` |
| EmissionRouter | `0x122e31af6BefAEC17EC5eE2402e31364aCAbE60b` |
| BribeMarketplace | `0x0B6454BF8C2a1111F1ba888AE29000c5FC52d7dF` |
| RewardDistributor | `0xc1867Dea89CaBcCdf207f348C420850dA4DeFF38` |

### 激励机制

| 合约 | 地址 |
|------|------|
| BoostStaking | `0xd7b1C5F77F2a2BEB06E3f145eF5cce53E566D2FF` |
| NitroPool | `0x52712Ef3aa240Bdd46180f3522c1bf7573C1abbA` |

### 国库 & 预言机

| 合约 | 地址 |
|------|------|
| Treasury | `0x0BdBeC0efe5f3Db5b771AB095aF1A7051B304E05` |
| SavingRate | `0x3977DB6503795E3c1812765f6910D96848b1e025` |
| PriceOracle | `0x53E69De7747a373071867eD1f0E0fFd4fC3C7357` |
| RWAPriceOracle | `0xbEf3913a7FA99985c1C7FfAb9B948C5f93eC2A8b` |

### Vault & Stability Pool

| 合约 | 地址 |
|------|------|
| USDPVault | `0x94E9F52F90609a6941ACc20996CCF9F738Eb22A1` |
| USDPStabilityPool | `0x594D48f69B14D3f22fa18682F48Bd6fBcB829dA0` |

### Launchpad

| 合约 | 地址 |
|------|------|
| ProjectRegistry | `0x03799e8F66027cE3A96e03bA3a39A641D72961dC` |
| IssuanceController | `0xA417eA34907F30DaC280E736b07B867ADB187E0e` |

### Mock 合约（仅测试网）

| 合约 | 地址 |
|------|------|
| MockUSDC | `0x2Dbcd194F22858Ae139Ba026830cBCc5C730FdF4` |
| USDC Price Feed | `0xC3071490d44f6122e892b37996308f073D75C4B7` |
| HYD Price Feed | `0x45E3E8bB1169283Ae9d5B7B65aE5D72227Ea83BF` |
| MockPyth | `0x04c8ca319FBd3378E56bDe0EbDbDb7200f462084` |
| MockVRFCoordinator | `0x2aAb24fC469334EE2e81F4A647c876EF921C1A2c` |

---

## 主要区别（与原始部署对比）

### ❌ 移除的内容：

1. **无 MockWBNB 合约** - DEXRouter 不再需要 WBNB 地址
2. **无预部署流动性池**：
   - 无 USDP/USDC 池
   - 无 PAIMON/WBNB 池
   - 无 HYD/USDP 池
3. **无初始流动性设置** - 部署者没有预先添加流动性

### ✅ 保留的内容：

1. **所有核心功能合约** - USDP, PAIMON, esPAIMON, HYD, PSM
2. **完整的 DEX 基础设施** - Factory + Router（支持纯 ERC20 配对）
3. **完整的治理系统** - veNFT, Gauge, Emission, Bribe
4. **完整的国库系统** - Treasury, Vault, Oracle, SavingRate
5. **完整的激励系统** - BoostStaking, NitroPool, RewardDistributor
6. **完整的 Launchpad** - ProjectRegistry, IssuanceController

---

## 下一步操作

### 1. 更新前端配置

```bash
cd ../nft-paimon-frontend
npm run sync-addresses  # 同步合约地址
npm run verify-addresses  # 验证地址匹配
```

### 2. 验证合约（BscScan）

```bash
# 待添加验证脚本
forge verify-contract <合约地址> <合约名称> \
  --chain 97 \
  --etherscan-api-key $BSCSCAN_API_KEY
```

### 3. 测试核心功能

- ✅ PSM 铸造 USDP（USDC ↔ USDP 1:1 兑换）
- ✅ 通过前端创建流动性池（USDP/USDC, PAIMON/任意代币）
- ✅ 添加流动性（确保首次添加比例正确！）
- ✅ Swap 交易测试
- ✅ veNFT 锁定测试
- ✅ Gauge 投票测试

---

## 重要提醒

### ⚠️ 流动性池创建注意事项

1. **首次添加流动性至关重要**
   - 首次比例决定后续所有交易
   - 对于稳定币对（如 USDP/USDC），确保 1:1 比例
   - 使用足够大的初始流动性（例如 10,000+ 每个代币）

2. **撤出流动性要完全撤出**
   - 使用 "Max" 按钮，不要手动输入百分比
   - 残留的 dust 会导致池子比例永久损坏
   - 一旦比例损坏，无法通过添加流动性修复

3. **Pool 创建流程**
   - 用户通过前端 UI 动态创建池子
   - Factory 合约会自动生成 Pair 地址
   - 首次添加流动性会初始化池子

---

## 测试资金获取

1. **获取测试网 BNB**：https://testnet.bnbchain.org/faucet-smart
2. **通过 PSM 铸造 USDP**：
   - 部署者持有 1B MockUSDC
   - PSM 储备金为 10M USDC
   - 任何人可以通过 PSM 1:1 兑换 USDP
3. **通过 DEX 获取其他代币**：
   - 创建池子后可以 swap
   - 或联系部署者获取测试代币

---

## 技术支持

- **部署日志**：`deploy_nopools.log`
- **合约地址**：`deployments/testnet-nopools/addresses.json`
- **广播记录**：`broadcast/DeployTestnetNoPools.s.sol/97/run-latest.json`
- **文档**：`ARCHITECTURE.md`, `DEVELOPMENT.md`

---

**部署状态**：✅ 成功
**测试网浏览器**：https://testnet.bscscan.com
**下一步**：更新前端配置并开始测试
