# BSC 测试网部署计划

**日期**: 2025-10-26 (Updated)
**目标**: 将 Paimon.dex 完整功能部署到 BSC 测试网 (ve33 DEX + PSM + RWA Bond NFT Presale with Gamification)

---

## 📊 当前状态

✅ **Phase 1-3 完成**: ve33 DEX + PSM 稳定币机制
✅ **代码完成度**: 53% (27/51 tasks completed)
✅ **测试覆盖率**: 100% (157/157 passing for Phase 1-3)
✅ **部署脚本**: Phase 1-3 已就绪 (`Deploy.s.sol`)

🚧 **Phase 3.5 开发中**: RWA Bond NFT Presale (Gamified)
- Chainlink VRF 骰子掷骰系统 (Normal/Gold/Diamond 骰子)
- 社交任务验证系统 (Twitter/Discord/Referrals)
- 排行榜系统 (Top Earners, Luckiest Rollers, Social Champions)
- 动态 NFT 稀有度 (Bronze → Silver → Gold → Diamond → Legendary)
- Bond Doge 吉祥物 (Shiba Inu 病毒式营销策略)
- 2选项结算 (veNFT 或现金赎回)

---

## 🎯 测试网部署目标

### 核心验证项 (Phase 1-3: ve33 DEX)

1. **PSM 稳定币机制**
   - USDC ↔ HYD 1:1 兑换
   - 费用收取 (0.1%)
   - 铸币上限 (1M HYD)

2. **ve33 DEX 功能**
   - HYD/USDC 流动性池
   - Swap 交易 (0.25% fee)
   - 费用分配 (70% voters, 30% treasury)

3. **veNFT 治理**
   - 锁定 HYD → veNFT
   - Gauge 投票
   - 贿赂市场
   - 奖励分发

4. **前端集成**
   - Web3 钱包连接
   - Swap UI
   - Lock/Vote UI
   - Analytics Dashboard

### 新增验证项 (Phase 3.5: RWA Bond NFT Presale)

5. **RWA Bond NFT 铸造**
   - 支付 100 USDC → 铸造 1 枚 Bond NFT
   - 总供应上限 5,000 枚
   - 90 天到期期限
   - 基础收益 2% APY (0.5 USDC 固定)

6. **Chainlink VRF 骰子掷骰**
   - 每周 1 次免费掷骰
   - 3 种骰子: Normal (1-6), Gold (1-12), Diamond (1-20)
   - 随机结果 → Remint 收益 (0-10% APY)
   - VRF 回调更新 NFT 元数据

7. **社交任务系统**
   - Twitter 任务: 关注、转推、创建 meme
   - Discord 任务: 加入服务器、分享结果
   - 推荐系统: 邀请朋友 → 解锁更好骰子
   - Oracle 签名验证

8. **排行榜与竞争**
   - Top Earners (最高累计 Remint)
   - Luckiest Rollers (最高单次掷骰结果)
   - Social Champions (完成最多任务)
   - Top 10 实时更新

9. **动态 NFT 元数据**
   - 5 个稀有度等级: Bronze → Silver → Gold → Diamond → Legendary
   - 根据累计 Remint 自动升级
   - OpenSea 兼容元数据

10. **到期结算**
    - Option 1: 转换为 veNFT (1 USDC = 1 HYD 锁定)
    - Option 2: 赎回现金 (本金 + 基础收益 + Remint 收益)
    - 与 VotingEscrow 和 Treasury 集成

---

## 📋 部署检查清单

### Phase 1: 准备工作 (30 分钟)

#### 1.1 环境配置
```bash
# 创建 .env 文件
cat > .env <<EOF
PRIVATE_KEY=0x...  # 测试网私钥
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
BSCSCAN_API_KEY=your_api_key
DEPLOYER_ADDRESS=0x...  # 同 deployer 或测试多签
EOF

source .env
```

#### 1.2 钱包准备
- [ ] 确保测试网钱包有 ≥0.1 BNB
- [ ] 获取 BscScan API key: https://bscscan.com/myapikey
- [ ] 验证 RPC 连接: `cast block latest --rpc-url $BSC_TESTNET_RPC`

#### 1.3 代码验证
```bash
# 1. 清理编译
forge clean && forge build

# 2. 运行测试
forge test -vvv

# 3. Gas 报告
forge test --gas-report

# 预期结果:
# ✅ 0 compilation errors
# ✅ 157/157 tests passing
```

---

### Phase 2: 干运行测试 (15 分钟)

```bash
# 模拟部署（不广播）
forge script script/Deploy.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  -vvvv

# 检查输出:
# ✅ Step 1-10 全部成功
# ✅ 部署地址显示
# ✅ 配置步骤完成
# ✅ 无 revert 或 error
```

**如果干运行失败**:
- 检查 RPC 连接
- 检查钱包余额
- 查看错误日志

---

### Phase 3: 实际部署 (20 分钟)

```bash
# 1. 最后确认
echo "Deployer: $(cast wallet address --private-key $PRIVATE_KEY)"
echo "Balance: $(cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $BSC_TESTNET_RPC)"

# 2. 部署到测试网
forge script script/Deploy.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv

# 3. 等待确认 (约 10-15 分钟)
# - 12 个合约部署
# - BscScan 自动验证
# - 配置步骤执行

# 4. 检查部署结果
cat deployments/bsc-testnet-97.json
```

**预期输出**:
```json
{
  "hyd": "0x...",
  "paimon": "0x...",
  "psm": "0x...",
  "votingEscrow": "0x...",
  "gaugeController": "0x...",
  "rewardDistributor": "0x...",
  "bribeMarketplace": "0x...",
  "dexFactory": "0x...",
  "hydUsdcPair": "0x...",
  "priceOracle": "0x...",
  "treasury": "0x...",
  "usdc": "0x..."
}
```

---

### Phase 4: 部署验证 (15 分钟)

#### 4.1 合约验证
```bash
# 设置环境变量
export HYD=$(jq -r '.hyd' deployments/bsc-testnet-97.json)
export USDC=$(jq -r '.usdc' deployments/bsc-testnet-97.json)
export PSM=$(jq -r '.psm' deployments/bsc-testnet-97.json)
export PAIR=$(jq -r '.hydUsdcPair' deployments/bsc-testnet-97.json)
export GAUGE=$(jq -r '.gaugeController' deployments/bsc-testnet-97.json)

# 1. 检查 PSM 储备
cast call $PSM "getReserve()(uint256)" --rpc-url $BSC_TESTNET_RPC
# 预期: 1000000000000 (1M USDC, 6 decimals)

# 2. 检查 HYD/USDC 池
cast call $DEX_FACTORY "getPair(address,address)(address)" $HYD $USDC --rpc-url $BSC_TESTNET_RPC
# 预期: $PAIR 地址

# 3. 检查 Gauge 存在
cast call $GAUGE "gaugeExists(address)(bool)" $PAIR --rpc-url $BSC_TESTNET_RPC
# 预期: true

# 4. 检查 PAIMON 铸造权限
MINTER_ROLE=$(cast keccak "MINTER_ROLE()")
cast call $PAIMON "hasRole(bytes32,address)(bool)" \
  $MINTER_ROLE $REWARD_DISTRIBUTOR --rpc-url $BSC_TESTNET_RPC
# 预期: true
```

#### 4.2 BscScan 验证
访问 https://testnet.bscscan.com/ 并检查:
- [ ] 所有合约显示"Verified" ✅ 图标
- [ ] 合约源代码可见
- [ ] Read/Write Contract 功能可用

---

### Phase 5: 功能测试 (30 分钟)

#### 5.1 PSM 测试 (USDC ↔ HYD)
```bash
# 1. 铸造测试 USDC
cast send $USDC "mint(address,uint256)" \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  100000000000 \  # 100K USDC
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

# 2. 授权 PSM
cast send $USDC "approve(address,uint256)" \
  $PSM \
  100000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

# 3. 兑换 USDC → HYD
cast send $PSM "swapUSDCForHYD(uint256)" \
  1000000000 \  # 1000 USDC
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

# 4. 检查 HYD 余额
cast call $HYD "balanceOf(address)(uint256)" \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $BSC_TESTNET_RPC
# 预期: ~999000000000000000000 (999 HYD after 0.1% fee)
```

#### 5.2 DEX 测试 (添加流动性)
```bash
# 1. 授权 HYD 和 USDC 给 Pair
cast send $HYD "approve(address,uint256)" $PAIR $(cast max-uint256) --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC
cast send $USDC "approve(address,uint256)" $PAIR $(cast max-uint256) --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC

# 2. 转账代币到 Pair
cast send $HYD "transfer(address,uint256)" $PAIR 100000000000000000000 --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC  # 100 HYD
cast send $USDC "transfer(address,uint256)" $PAIR 100000000 --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC  # 100 USDC

# 3. Mint LP tokens
cast send $PAIR "mint(address)" $(cast wallet address --private-key $PRIVATE_KEY) --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC

# 4. 检查 LP 余额
cast call $PAIR "balanceOf(address)(uint256)" $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $BSC_TESTNET_RPC
```

#### 5.3 veNFT 测试 (锁定 HYD)
```bash
# 1. 授权 HYD 给 VotingEscrow
cast send $HYD "approve(address,uint256)" $VOTING_ESCROW $(cast max-uint256) --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC

# 2. 创建锁定 (100 HYD, 1 年)
LOCK_END=$(date -u -d "+1 year" +%s)
cast send $VOTING_ESCROW "createLock(uint256,uint256)" \
  100000000000000000000 \  # 100 HYD
  $LOCK_END \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

# 3. 检查 veNFT
cast call $VOTING_ESCROW "balanceOf(address)(uint256)" \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url $BSC_TESTNET_RPC
# 预期: 1 (NFT ID)
```

---

### Phase 6: 前端集成 (20 分钟)

#### 6.1 更新前端配置
```bash
cd frontend

# 1. 复制合约地址
cp ../deployments/bsc-testnet-97.json src/config/contracts.json

# 2. 更新 chain ID
# 编辑 src/config/wagmi.ts
# 确保 bscTestnet (97) 在 chains 列表中

# 3. 安装依赖（如果需要）
npm install

# 4. 启动开发服务器
npm run dev
```

#### 6.2 前端测试
访问 http://localhost:3000 并测试:
- [ ] 连接钱包 (MetaMask/Trust Wallet)
- [ ] 切换到 BSC Testnet (97)
- [ ] Swap USDC ↔ HYD
- [ ] 添加流动性 (HYD/USDC)
- [ ] 锁定 HYD → veNFT
- [ ] 查看 Analytics Dashboard

---

### Phase 7: RWA Bond NFT 部署 (30 分钟) - **NEW**

#### 7.1 Chainlink VRF 准备
```bash
# 1. 访问 Chainlink VRF UI
# BSC Testnet: https://vrf.chain.link/bsc-testnet

# 2. 创建 VRF Subscription
# - 连接钱包
# - 点击 "Create Subscription"
# - 复制 Subscription ID

# 3. 充值 LINK 代币
# - 获取测试网 LINK: https://faucets.chain.link/bsc-testnet
# - 向 Subscription 充值 10 LINK

# 4. 记录 Subscription ID
export VRF_SUBSCRIPTION_ID=<your_subscription_id>
```

#### 7.2 部署 Bond NFT 合约
```bash
# 更新部署脚本添加 Bond NFT 合约
# 编辑 script/Deploy.s.sol - 添加以下合约:
# - RWABondNFT
# - RemintController
# - SettlementRouter
# - Leaderboard

# 部署
forge script script/DeployBondNFT.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv

# 预期输出: 4 个新合约地址
```

#### 7.3 配置 VRF Consumer
```bash
# 在 Chainlink VRF UI 中添加 Consumer
# - 选择你的 Subscription
# - 点击 "Add Consumer"
# - 输入 RWABondNFT 合约地址

# 验证
cast call $BOND_NFT "s_subscriptionId()(uint64)" --rpc-url $BSC_TESTNET_RPC
# 预期: 你的 Subscription ID
```

#### 7.4 部署社交任务 Oracle 服务
```bash
# 1. 部署后端服务 (Node.js + Express)
cd backend/social-oracle

# 2. 配置环境变量
cat > .env <<EOF
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
DISCORD_BOT_TOKEN=your_discord_bot_token
ORACLE_PRIVATE_KEY=0x...  # 用于 EIP-712 签名
REMINT_CONTROLLER_ADDRESS=$REMINT_CONTROLLER
DATABASE_URL=postgresql://...
EOF

# 3. 启动服务
npm install
npm run build
npm start

# 4. 验证服务运行
curl http://localhost:3001/health
# 预期: {"status":"ok"}
```

#### 7.5 Bond NFT 功能测试
```bash
# 设置环境变量
export BOND_NFT=$(jq -r '.bondNFT' deployments/bsc-testnet-97.json)
export REMINT_CONTROLLER=$(jq -r '.remintController' deployments/bsc-testnet-97.json)
export SETTLEMENT_ROUTER=$(jq -r '.settlementRouter' deployments/bsc-testnet-97.json)

# 1. 铸造 Bond NFT
cast send $USDC "approve(address,uint256)" \
  $BOND_NFT \
  100000000 \  # 100 USDC
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

cast send $BOND_NFT "mint(uint256)" \
  1 \  # 铸造 1 枚 NFT
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

# 2. 检查 NFT 所有权
cast call $BOND_NFT "ownerOf(uint256)(address)" 1 --rpc-url $BSC_TESTNET_RPC
# 预期: 你的地址

# 3. 检查 NFT 元数据
cast call $BOND_NFT "tokenURI(uint256)(string)" 1 --rpc-url $BSC_TESTNET_RPC
# 预期: JSON 元数据 URL

# 4. 测试骰子掷骰 (需要等待 VRF 回调)
cast send $REMINT_CONTROLLER "rollDice(uint256)" \
  1 \  # NFT ID
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

# 等待 30-60 秒让 VRF 回调完成
sleep 60

# 5. 检查 Remint 收益
cast call $BOND_NFT "accumulatedRemint(uint256)(uint256)" 1 --rpc-url $BSC_TESTNET_RPC
# 预期: >0 (基于骰子结果)

# 6. 测试社交任务 (需要 Oracle 服务运行)
# 前端调用 POST /verify-task → 获取签名 → 链上提交
# 手动测试:
SIGNATURE=$(curl -X POST http://localhost:3001/verify-task \
  -H "Content-Type: application/json" \
  -d '{"tokenId":1,"taskId":"twitter_follow","proof":"@PaimonDEX"}' \
  | jq -r '.signature')

cast send $REMINT_CONTROLLER "completeTask(uint256,bytes32,bytes)" \
  1 \
  $(cast keccak "twitter_follow") \
  $SIGNATURE \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC

# 7. 检查排行榜
cast call $LEADERBOARD "getTopEarners()(address[],uint256[])" --rpc-url $BSC_TESTNET_RPC
```

#### 7.6 前端 Bond NFT 测试
访问 http://localhost:3000/presale 并测试:
- [ ] Minting UI: 选择数量 → 授权 USDC → 铸造 NFT
- [ ] Dashboard: 查看 NFT 列表 (基础收益 + Remint 收益 + 稀有度)
- [ ] Dice Rolling: 掷骰子 → 等待 VRF 结果 → 查看 Remint 增加
- [ ] Social Tasks: 完成 Twitter 任务 → 验证 → 解锁 Gold 骰子
- [ ] Leaderboards: 查看 Top 10 排行榜
- [ ] Settlement: (仅在到期后) 选择 veNFT 或现金 → 执行结算

---

## 🚨 常见问题与解决方案

### 问题 1: 编译失败
```bash
Error: Compiler run failed
```

**解决**:
```bash
forge clean
rm -rf cache out
forge build
```

### 问题 2: Gas 不足
```bash
Error: insufficient funds for gas
```

**解决**:
1. 访问 https://testnet.bnbchain.org/faucet-smart
2. 领取测试 BNB
3. 等待确认后重试

### 问题 3: 验证失败
```bash
Error: Failed to verify contract
```

**解决**:
```bash
# 手动验证
forge verify-contract <ADDRESS> <CONTRACT_NAME> \
  --chain-id 97 \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" <ARG>)
```

### 问题 4: 前端无法连接
```bash
Error: unsupported chain
```

**解决**:
1. 在 MetaMask 手动添加 BSC Testnet
   - Chain ID: 97
   - RPC: https://data-seed-prebsc-1-s1.binance.org:8545/
   - Symbol: tBNB
   - Explorer: https://testnet.bscscan.com/
2. 切换到 BSC Testnet
3. 刷新页面

---

## 📊 部署后验证清单

### 智能合约层 (Phase 1-3: ve33 DEX)
- [ ] 12 个合约全部部署成功
- [ ] BscScan 验证通过 (绿色勾)
- [ ] PSM 有 1M USDC 储备
- [ ] HYD/USDC Pair 已创建
- [ ] Gauge 已添加
- [ ] PAIMON MINTER_ROLE 已授权

### 智能合约层 (Phase 3.5: Bond NFT) - **NEW**
- [ ] 4 个 Bond NFT 合约部署成功 (RWABondNFT, RemintController, SettlementRouter, Leaderboard)
- [ ] BscScan 验证通过 (绿色勾)
- [ ] Chainlink VRF Subscription 已创建并充值 (≥10 LINK)
- [ ] RWABondNFT 已添加为 VRF Consumer
- [ ] Treasury 有 500K USDC 储备 (用于 Bond NFT 销售)
- [ ] SettlementRouter 已授权调用 VotingEscrow 和 Treasury
- [ ] 社交任务 Oracle 服务运行正常 (99% uptime)

### 功能测试 (Phase 1-3: ve33 DEX)
- [ ] PSM: USDC → HYD 兑换成功
- [ ] PSM: HYD → USDC 兑换成功
- [ ] DEX: 添加流动性成功
- [ ] DEX: Swap 交易成功
- [ ] veNFT: 锁定 HYD 成功
- [ ] veNFT: 投票功能正常
- [ ] Bribes: 创建贿赂成功

### 功能测试 (Phase 3.5: Bond NFT) - **NEW**
- [ ] Minting: 支付 100 USDC → 成功铸造 1 枚 Bond NFT
- [ ] Metadata: tokenURI() 返回 OpenSea 兼容的 JSON
- [ ] Dice Rolling: 掷骰子 → VRF 回调 → Remint 收益更新
- [ ] Dice Types: 完成 5 个任务 → 解锁 Gold 骰子
- [ ] Social Tasks: Twitter 任务验证成功 (Oracle 签名)
- [ ] Referral: 邀请朋友 → 获得 5 USDC 奖励
- [ ] Leaderboards: Top 10 排行榜正确显示
- [ ] Dynamic Metadata: Remint 达到 2 USDC → NFT 升级为 Silver
- [ ] Settlement (veNFT): NFT 成功转换为 veNFT (1 USDC = 1 HYD 锁定)
- [ ] Settlement (Cash): NFT 销毁 → 收到本金 + 收益

### 前端集成 (Phase 1-3: ve33 DEX)
- [ ] 钱包连接正常
- [ ] Swap UI 可用
- [ ] Lock UI 可用
- [ ] Vote UI 可用
- [ ] Rewards Dashboard 显示数据
- [ ] Analytics 图表显示

### 前端集成 (Phase 3.5: Bond NFT) - **NEW**
- [ ] Minting UI: 数量选择器 → USDC 授权 → 铸造成功
- [ ] Dashboard: 显示所有 NFT (基础收益 + Remint + 稀有度)
- [ ] Dice Rolling UI: 3D 骰子动画 → 结果展示 → Twitter 分享
- [ ] Social Tasks UI: 任务列表 → 验证按钮 → 进度条
- [ ] Leaderboards UI: 3 个排行榜 Tab → Top 10 列表 → 当前排名
- [ ] Settlement UI: 2 选项对比表 → Lock 期限选择器 → 确认弹窗
- [ ] Bond Doge Mascot: 占位符图片显示正常 (等待设计师)

---

## 🎯 成功标准

### 最低要求 (MVP - Phase 1-3)
1. ✅ 所有合约部署成功
2. ✅ PSM 机制运行正常 (USDC ↔ HYD)
3. ✅ DEX 可以交易 (HYD/USDC)
4. ✅ veNFT 可以锁定和投票
5. ✅ 前端可以连接和交互

### 新增要求 (Gamified Bond NFT - Phase 3.5) - **NEW**
1. ✅ Bond NFT 铸造成功 (5,000 supply cap)
2. ✅ Chainlink VRF 骰子掷骰正常运行 (3 种骰子类型)
3. ✅ 社交任务 Oracle 服务 99% uptime
4. ✅ 排行榜实时更新
5. ✅ 动态 NFT 元数据在 OpenSea 显示正确
6. ✅ 2 种结算路径测试通过 (veNFT + Cash)
7. ✅ 前端游戏化 UI 完整可用 (Dice Rolling, Social Tasks, Leaderboards)

### 优化目标
1. ⭐ Gas 成本 < $0.50/tx (Bond NFT minting < $2)
2. ⭐ 交易确认 < 10 秒 (BSC average 3s)
3. ⭐ 前端响应 < 2 秒 (3D dice animation < 3s)
4. ⭐ VRF 回调延迟 < 60 秒
5. ⭐ 0 critical bugs

### 病毒式营销目标 (Shiba Inu Strategy) - **NEW**
1. 🚀 预售 7 天内售罄 (5,000 NFTs @ 100 USDC = $500K)
2. 🚀 推荐转化率 >20% (1,000+ 来自推荐)
3. 🚀 Twitter 30 天 >10,000 粉丝
4. 🚀 每周 >500 活跃掷骰用户
5. 🚀 Top 10 排行榜竞争激烈 (>100 地址参与)

---

## 📅 时间表

### Phase 1-3 部署 (ve33 DEX) - **COMPLETED**
| 阶段 | 预计时间 | 负责人 | 状态 |
|------|---------|--------| ----- |
| Phase 1: 准备 | 30 分钟 | Dev | ✅ |
| Phase 2: 干运行 | 15 分钟 | Dev | ✅ |
| Phase 3: 部署 | 20 分钟 | Dev | ✅ |
| Phase 4: 验证 | 15 分钟 | Dev | ✅ |
| Phase 5: 功能测试 | 30 分钟 | Dev + QA | ✅ |
| Phase 6: 前端集成 | 20 分钟 | Frontend | ✅ |
| **小计** | **~2.5 小时** | Team | ✅ |

### Phase 3.5 部署 (Bond NFT Gamification) - **PENDING**
| 阶段 | 预计时间 | 负责人 | 状态 |
|------|---------|--------| ----- |
| Phase 7.1: Chainlink VRF 准备 | 15 分钟 | Dev | 🔲 |
| Phase 7.2: 部署 Bond NFT 合约 | 20 分钟 | Dev | 🔲 |
| Phase 7.3: 配置 VRF Consumer | 10 分钟 | Dev | 🔲 |
| Phase 7.4: 部署社交任务 Oracle | 30 分钟 | Backend Dev | 🔲 |
| Phase 7.5: Bond NFT 功能测试 | 30 分钟 | Dev + QA | 🔲 |
| Phase 7.6: 前端 Bond NFT 测试 | 30 分钟 | Frontend | 🔲 |
| **小计** | **~2.5 小时** | Team | 🔲 |

### 总计
| 类别 | 时间 | 状态 |
|------|------|------|
| Phase 1-3 (ve33 DEX) | 2.5 小时 | ✅ 完成 |
| Phase 3.5 (Bond NFT) | 2.5 小时 | 🔲 待开发 (Week 7-10) |
| **完整部署总时间** | **~5 小时** | **53% 完成** |

---

## 🔗 有用链接

### BSC Testnet
- Faucet: https://testnet.bnbchain.org/faucet-smart
- Explorer: https://testnet.bscscan.com/
- RPC: https://data-seed-prebsc-1-s1.binance.org:8545/
- Chain ID: 97

### 文档
- 部署脚本: `script/Deploy.s.sol`
- 部署指南: `script/DEPLOYMENT.md`
- PRD 分析: `.ultra/docs/analysis/PRD-VS-IMPLEMENTATION-GAP.md`
- 技术文档: `.ultra/docs/`

### 社区
- Discord: TBD
- Twitter: TBD
- Docs: TBD

---

## ✅ 下一步

**Phase 1-3 部署成功后** (✅ 完成):
1. ✅ 记录所有合约地址到 README
2. ✅ 发布测试网公告
3. ✅ 邀请社区测试
4. ✅ 收集 Bug 反馈
5. ✅ 内部审计完成 (Slither)

**Phase 3.5 开发中** (🚧 Week 7-10):
1. 🔲 完成 RWA Bond NFT 智能合约 (PRESALE-001 to PRESALE-008)
2. 🔲 集成 Chainlink VRF V2 (PRESALE-004)
3. 🔲 部署社交任务 Oracle 服务 (PRESALE-005)
4. 🔲 实现排行榜系统 (PRESALE-007)
5. 🔲 开发完整前端 UI (PRESALE-010 to PRESALE-015)
6. 🔲 创建 Bond Doge 吉祥物占位符 (PRESALE-016)
7. 🔲 综合测试 (>90% 覆盖率) (PRESALE-009)

**Phase 3.5 部署成功后**:
1. 📝 更新 README 添加 Bond NFT 合约地址
2. 🎉 发布游戏化 Bond NFT 测试网公告
3. 👥 邀请社区测试骰子掷骰和社交任务
4. 🐛 收集 Gamification UX 反馈
5. 🔍 准备外部审计 (包含 Bond NFT 合约) (AUDIT-001)

**主网准备**:
1. 外部审计 (CertiK/OpenZeppelin) - 包含 Chainlink VRF 审查
2. 多签钱包设置
3. Bug Bounty 计划 (扩展到 Bond NFT)
4. 监控告警系统 (VRF 回调监控)
5. 社交任务 Oracle 服务部署到生产环境 (AWS Multi-AZ, 99.9% SLA)
6. 正式上线 + 病毒式营销活动

---

**Last Updated**: 2025-10-26 (Updated with Gamified Bond NFT)
**Status**:
- Phase 1-3: ✅ Ready to Deploy (完成)
- Phase 3.5: 🚧 In Development (Week 7-10)
**Next Action**: 开发 PRESALE-001 (RWABondNFT Contract with Chainlink VRF)
