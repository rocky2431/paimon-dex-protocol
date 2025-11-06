# BSC Testnet Deployment - Quick Start Guide

**目标**: 在 BSC 测试网快速部署 Paimon.dex 完整协议

**预计时间**: 30-45 分钟

---

## 🚀 快速部署（5步）

### 1. 准备环境 (5分钟)

```bash
# 进入合约目录
cd paimon-rwa-contracts

# 安装 Foundry（如未安装）
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 安装依赖
forge install

# 验证安装
forge build
```

### 2. 配置环境变量 (3分钟)

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**必填字段**:
```bash
DEPLOYER_PRIVATE_KEY=你的私钥（不要0x前缀）
DEPLOYER_ADDRESS=0x你的部署地址
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
BSCSCAN_API_KEY=你的BscScan_API密钥
IS_TESTNET=true
```

### 3. 获取测试网 BNB (5分钟)

```bash
# 访问水龙头
# https://testnet.bnbchain.org/faucet-smart

# 检查余额（需要至少 5 BNB）
source .env
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_TESTNET_RPC --ether
```

### 4. 部署到测试网 (15-20分钟)

```bash
# 测试运行（dry run，不广播交易）
forge script script/DeployTestnet.s.sol \
  --rpc-url $BSC_TESTNET_RPC

# 正式部署
forge script script/DeployTestnet.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --legacy

# ⏳ 等待部署完成（10-15分钟）
# 终端会显示详细进度
```

### 5. 验证部署 (5分钟)

```bash
# 检查部署地址
cat deployments/testnet/addresses.json | jq

# 验证核心合约
export USDP_ADDRESS=$(jq -r '.contracts.core.USDP' deployments/testnet/addresses.json)
export PSM_ADDRESS=$(jq -r '.contracts.core.PSM' deployments/testnet/addresses.json)

# 检查合约代码
cast code $USDP_ADDRESS --rpc-url $BSC_TESTNET_RPC
cast code $PSM_ADDRESS --rpc-url $BSC_TESTNET_RPC

# 测试 PSM 功能
cast call $PSM_ADDRESS "getFeeIn()(uint256)" --rpc-url $BSC_TESTNET_RPC
```

---

## ✅ 部署成功标志

部署完成后，你应该看到：

1. **终端输出**:
   ```
   ====================================================================
     BSC Testnet Deployment Completed Successfully!
   ====================================================================
   ```

2. **生成的文件**:
   - ✅ `deployments/testnet/addresses.json` - 合约地址
   - ✅ `broadcast/DeployTestnet.s.sol/97/run-latest.json` - 交易记录

3. **BscScan 验证**:
   - 访问: https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS
   - 应显示 ✅ 已验证合约

---

## 🧪 快速测试

### 测试 PSM 互换

```bash
# 1. 获取 Mock USDC 地址
USDC_ADDRESS=$(jq -r '.contracts.mocks.USDC' deployments/testnet/addresses.json)

# 2. 授权 USDC
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $PSM_ADDRESS \
  1000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# 3. 用 USDC 兑换 USDP
cast send $PSM_ADDRESS \
  "swapIn(uint256)" \
  1000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# 4. 检查 USDP 余额
cast call $USDP_ADDRESS \
  "balanceOf(address)(uint256)" \
  $DEPLOYER_ADDRESS \
  --rpc-url $BSC_TESTNET_RPC
```

### 测试 DEX 交易

```bash
# 获取 DEXRouter 地址
DEX_ROUTER=$(jq -r '.contracts.dex.DEXRouter' deployments/testnet/addresses.json)

# 获取报价
cast call $DEX_ROUTER \
  "getAmountsOut(uint256,address[])(uint256[])" \
  1000000000000000000 \
  "[$USDP_ADDRESS,$USDC_ADDRESS]" \
  --rpc-url $BSC_TESTNET_RPC
```

---

## 📱 前端集成

```bash
# 1. 复制合约地址到前端
cp deployments/testnet/addresses.json \
   ../nft-paimon-frontend/src/config/contracts-testnet.json

# 2. 启动前端开发服务器
cd ../nft-paimon-frontend
npm install
npm run dev

# 3. 访问 http://localhost:4000
# 连接钱包并测试功能
```

---

## 🔧 常见问题

### 部署失败："Insufficient funds for gas"

```bash
# 解决: 获取更多测试网 BNB
# https://testnet.bnbchain.org/faucet-smart

# 检查余额
cast balance $DEPLOYER_ADDRESS --rpc-url $BSC_TESTNET_RPC --ether
```

### 合约验证失败

```bash
# 手动验证
forge verify-contract \
  $USDP_ADDRESS \
  src/core/USDP.sol:USDP \
  --chain-id 97 \
  --etherscan-api-key $BSCSCAN_API_KEY
```

### "EvmError: Revert" 错误

```bash
# 使用详细输出重新运行
forge script script/DeployTestnet.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  -vvvv  # 非常详细的输出
```

---

## 📚 下一步

部署成功后：

1. **测试核心功能** (1-2天)
   - PSM swap (USDC ↔ USDP)
   - DEX liquidity & swaps
   - VotingEscrow locking
   - Gauge voting

2. **压力测试** (7天)
   - 模拟高频交易
   - 测试极端情况
   - 监控gas消耗
   - 检查事件日志

3. **社区测试** (1-2周)
   - 发布测试网公告
   - 收集用户反馈
   - 修复发现的bug
   - 优化用户体验

4. **准备主网部署**
   - 第三方安全审计
   - 配置多签钱包 (3-of-5)
   - 准备初始流动性 ($1M+)
   - 制定应急响应计划

---

## 📞 支持

遇到问题？

- **文档**: `DEPLOYMENT.md` (完整部署指南)
- **架构**: `ARCHITECTURE.md` (系统架构)
- **开发**: `DEVELOPMENT.md` (开发指南)
- **Discord**: https://discord.gg/paimondex
- **GitHub Issues**: https://github.com/paimondex/issues

---

**祝部署顺利！** 🎉
