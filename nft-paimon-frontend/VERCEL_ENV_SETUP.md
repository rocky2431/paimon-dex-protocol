# Vercel 环境变量配置指南

## 部署信息

- **项目名称**: nft-paimon-frontend
- **生产环境 URL**: https://nft-paimon-frontend-ochjvb26k-rocky2431s-projects.vercel.app
- **Vercel Dashboard**: https://vercel.com/rocky2431s-projects/nft-paimon-frontend

---

## 方式 1：通过 Vercel CLI 配置（推荐）

在项目根目录运行以下命令：

```bash
# WalletConnect Project ID（必需）
# 从 https://cloud.walletconnect.com 获取
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production

# BSC 测试网合约地址
vercel env add NEXT_PUBLIC_HYD_ADDRESS_TESTNET production
# 输入: 0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c

vercel env add NEXT_PUBLIC_USDC_ADDRESS_TESTNET production
# 输入: （从测试网 USDC 合约获取）

vercel env add NEXT_PUBLIC_PSM_ADDRESS_TESTNET production
# 输入: 0x46eB7627024cEd13826359a5c0aEc57c7255b330

vercel env add NEXT_PUBLIC_VOTING_ESCROW_ADDRESS_TESTNET production
# 输入: 0xdEe148Cd27a9923DE1986399a6629aB375F244e1

vercel env add NEXT_PUBLIC_GAUGE_CONTROLLER_ADDRESS_TESTNET production
# 输入: 0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A

vercel env add NEXT_PUBLIC_DEX_FACTORY_ADDRESS_TESTNET production
# 输入: （从测试网 DEXFactory 合约获取）
```

---

## 方式 2：通过 Vercel Dashboard 配置

1. 访问环境变量设置页面：
   https://vercel.com/rocky2431s-projects/nft-paimon-frontend/settings/environment-variables

2. 点击 "Add New" 按钮

3. 添加以下环境变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | 你的 Project ID | Production |
| `NEXT_PUBLIC_HYD_ADDRESS_TESTNET` | `0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c` | Production |
| `NEXT_PUBLIC_PSM_ADDRESS_TESTNET` | `0x46eB7627024cEd13826359a5c0aEc57c7255b330` | Production |
| `NEXT_PUBLIC_VOTING_ESCROW_ADDRESS_TESTNET` | `0xdEe148Cd27a9923DE1986399a6629aB375F244e1` | Production |
| `NEXT_PUBLIC_GAUGE_CONTROLLER_ADDRESS_TESTNET` | `0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A` | Production |

---

## 方式 3：批量导入（最快）

创建一个 `.env.production` 文件：

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的_project_id
NEXT_PUBLIC_HYD_ADDRESS_TESTNET=0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c
NEXT_PUBLIC_PSM_ADDRESS_TESTNET=0x46eB7627024cEd13826359a5c0aEc57c7255b330
NEXT_PUBLIC_VOTING_ESCROW_ADDRESS_TESTNET=0xdEe148Cd27a9923DE1986399a6629aB375F244e1
NEXT_PUBLIC_GAUGE_CONTROLLER_ADDRESS_TESTNET=0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A
```

然后运行：
```bash
vercel env pull .env.production --environment production
```

---

## 重新部署

配置完环境变量后，需要重新部署以使更改生效：

```bash
vercel --prod --yes
```

或者在 Vercel Dashboard 中点击 "Redeploy" 按钮。

---

## 验证部署

1. 访问生产环境 URL：https://nft-paimon-frontend-ochjvb26k-rocky2431s-projects.vercel.app
2. 打开浏览器开发者工具（F12）
3. 检查控制台是否有错误
4. 尝试连接钱包并与合约交互

---

## 常用命令

```bash
# 查看部署日志
vercel logs nft-paimon-frontend-ochjvb26k-rocky2431s-projects.vercel.app

# 查看部署详情
vercel inspect nft-paimon-frontend-ochjvb26k-rocky2431s-projects.vercel.app

# 查看所有环境变量
vercel env ls

# 删除环境变量
vercel env rm VARIABLE_NAME production

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

---

## 自定义域名（可选）

如果你有自定义域名，可以在 Vercel Dashboard 中配置：
https://vercel.com/rocky2431s-projects/nft-paimon-frontend/settings/domains

---

## 故障排除

### 问题 1：环境变量未生效

**解决方案**：
1. 确认环境变量已正确添加到 Production 环境
2. 重新部署应用
3. 清除浏览器缓存

### 问题 2：钱包连接失败

**解决方案**：
1. 确认 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 已配置
2. 检查 WalletConnect Project 是否有效
3. 查看浏览器控制台错误信息

### 问题 3：合约交互失败

**解决方案**：
1. 确认所有合约地址环境变量已配置
2. 确认钱包连接到 BSC 测试网（Chain ID: 97）
3. 确认钱包账户有足够的 BNB 测试币

---

## 下一步

1. ✅ 配置 WalletConnect Project ID
2. ✅ 添加合约地址环境变量
3. ✅ 重新部署应用
4. ⬜ 测试钱包连接
5. ⬜ 测试合约交互功能
6. ⬜ 配置自定义域名（可选）
7. ⬜ 设置 CI/CD 自动部署
