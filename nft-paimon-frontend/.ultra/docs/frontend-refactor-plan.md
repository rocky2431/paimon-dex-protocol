# Frontend 重构方案 - 原子级任务分解

## 📊 当前问题分析

### 1. 导航栏混乱问题

**当前导航栏结构**:
```
Swap | Liquidity▾ | Lock | Vote | Savings | Launchpad▾ | Treasury▾ | Presale▾ | [钱包]
```

**问题**:
- ❌ 导航项过多(9个顶级项,13个二级项)造成视觉混乱
- ❌ Phase 2 的 Presale 功能在测试网不应显示
- ❌ 核心功能(Vault, Stability Pool, Convert, Boost, Bribes等)缺失或隐藏
- ❌ 缺少明确的功能分组逻辑

### 2. 功能缺失对比

根据 README.md,应该有 23 个核心功能(不含 Phase 2 的6个),但导航栏仅显示 13 个。

**缺失功能**:
1. `/vault` - Vault 抵押借款 (核心功能!)
2. `/vault/borrow` - 借款 USDP
3. `/vault/repay` - 偿还 USDP
4. `/stability-pool` - 稳定池存款 (核心功能!)
5. `/convert` - esPaimon 转换 (核心功能!)
6. `/boost` - PAIMON 质押加成
7. `/bribes` - Bribe 市场
8. `/nitro` - Nitro 外部激励
9. `/rewards` - 奖励领取
10. `/analytics` - 数据分析

### 3. 合约地址配置错误

从之前的 PSM swap bug 可以看出,前端合约配置与实际部署合约不匹配。需要系统性排查。

---

## 🎯 参考设计: Camelot & Velodrome

### Camelot v2 导航结构
```
Trade (交易) ▾
├── Swap (交换)
├── Liquidity (流动性)
└── Limit Orders (限价单)

Earn (收益) ▾
├── Farms (流动性挖矿)
├── Launchpad (项目启动)
├── Nitro Pools (外部激励)
└── xGRAIL (质押)

NFTs (NFT) ▾
├── Marketplace (市场)
└── Positions (仓位)

Analytics (分析)
veToken (治理)
```

### Velodrome v2 导航结构
```
Swap (交换)

Liquidity (流动性) ▾
├── Pools (池子)
├── Positions (我的仓位)
└── Create Pool (创建池子)

Vote (投票)

Rewards (奖励) ▾
├── Claim (领取)
└── Bribes (贿选)

Lock (锁仓)
```

**共同特征**:
1. **顶级导航项 ≤6 个** - 避免过度拥挤
2. **清晰的功能分组** - 同类功能聚合在一个下拉菜单
3. **核心功能优先** - 高频操作放在顶级导航
4. **逻辑一致性** - 用户旅程连贯(Trade → Earn → Manage → Analyze)

---

## ✅ 新导航架构设计

### 推荐方案: 5 个顶级分组 + Analytics

```
Swap | Vault▾ | Earn▾ | Govern▾ | Treasury▾ | Analytics
```

#### **1. Swap (交换)** - 直达 PSM 交换页
- 页面: `/` (首页 = Swap 页面)
- 功能: USDC ↔ USDP 1:1 交换

#### **2. Vault (金库)** - RWA 抵押借款
```
Vault ▾
├── 📊 Dashboard (总览) → /vault
├── 💰 Borrow USDP (借款) → /vault/borrow
├── 💳 Repay USDP (还款) → /vault/repay
└── 🛡️ Stability Pool (稳定池) → /stability-pool
```

#### **3. Earn (收益)** - 流动性挖矿与激励
```
Earn ▾
├── 💧 Liquidity (流动性)
│   ├── Add Liquidity → /liquidity/add
│   ├── Remove Liquidity → /liquidity/remove
│   └── Stake LP → /liquidity/stake
├── 💰 Savings (储蓄) → /savings
├── 🚀 Boost Staking (加成质押) → /boost
├── 🔥 Nitro Pools (外部激励) → /nitro
└── 🎁 Claim Rewards (领取奖励) → /rewards
```

#### **4. Govern (治理)** - veNFT 治理生态
```
Govern ▾
├── 🔒 Lock PAIMON (锁仓) → /lock
├── 🗳️ Vote on Gauges (Gauge投票) → /vote
├── 💸 Bribes Market (贿选市场) → /bribes
├── 🔄 Convert esPaimon (转换) → /convert
└── 🚀 Launchpad (RWA 项目)
    ├── Project List → /launchpad
    └── My Participations → /launchpad?filter=participated
```

#### **5. Treasury (国库)** - RWA 资产管理
```
Treasury ▾
├── 📊 Overview (总览) → /treasury
├── 💵 Deposit RWA (存入资产) → /treasury/deposit
└── 📈 My Positions (我的仓位) → /treasury/positions
```

#### **6. Analytics (分析)** - 数据仪表板
- 页面: `/analytics`
- 功能: 协议数据、用户统计、TVL/Volume 等

---

## 🧩 原子级任务分解

### **阶段 1: 配置修复与验证 (优先级: CRITICAL)**

#### Task 1.1: 审计合约地址配置
**文件**: `/src/config/index.ts`, `/src/config/contracts/*.ts`
**目标**: 确保所有合约地址与 `addresses.json` 一致
**验证**:
```bash
# 对比配置与实际部署
diff <(jq -S '.testnet' paimon-rwa-contracts/addresses.json) \
     <(grep -r "0x" nft-paimon-frontend/src/config/contracts | cut -d'"' -f2 | sort | uniq)
```

#### Task 1.2: 修复 PSM Swap 计算 SCALE 问题
**文件**: `/src/components/swap/hooks/usePSMSwap.ts`, `/src/components/swap/constants.ts`
**已完成**: ✅ SCALE 常量已添加,计算逻辑已修复
**待验证**: 🔄 需重启 Next.js 服务验证实际效果

#### Task 1.3: 验证所有已部署合约的配置
**合约清单** (根据 addresses.json):
- [ ] USDP (stablecoin)
- [ ] PAIMON (governance token)
- [ ] esPaimon (vesting token)
- [ ] HYD (test RWA)
- [ ] PSM (swap module)
- [ ] USDPVault (CDP)
- [ ] USDPStabilityPool (liquidation buffer)
- [ ] SavingRate (interest)
- [ ] Treasury
- [ ] VotingEscrowPaimon (vePAIMON NFT)
- [ ] GaugeController
- [ ] BribeMarketplace
- [ ] BoostStaking
- [ ] NitroPool
- [ ] RewardDistributor
- [ ] EmissionManager
- [ ] EmissionRouter
- [ ] DEXFactory, DEXRouter
- [ ] RWAPriceOracle
- [ ] ProjectRegistry, IssuanceController

**方法**: 为每个合约创建 `useConfigValidation.ts` 样式的 hook,验证 `decimals()` 等基础调用。

---

### **阶段 2: 导航栏重构 (优先级: HIGH)**

#### Task 2.1: 创建新导航配置文件
**文件**: `/src/config/navigation.ts`
**内容**:
```typescript
export const NAVIGATION_CONFIG = {
  testnet: {
    showPresale: false, // Phase 2 功能隐藏
  },
  mainnet: {
    showPresale: true,
  },
};

export const NAV_ITEMS = [
  {
    id: 'swap',
    label: 'Swap',
    href: '/',
    icon: 'SwapHoriz',
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: 'AccountBalance',
    children: [
      { label: 'Dashboard', href: '/vault', icon: 'Dashboard' },
      { label: 'Borrow USDP', href: '/vault/borrow', icon: 'CreditCard' },
      { label: 'Repay USDP', href: '/vault/repay', icon: 'Payment' },
      { label: 'Stability Pool', href: '/stability-pool', icon: 'Shield' },
    ],
  },
  {
    id: 'earn',
    label: 'Earn',
    icon: 'TrendingUp',
    children: [
      {
        label: 'Liquidity',
        children: [
          { label: 'Add Liquidity', href: '/liquidity/add', icon: 'AddCircle' },
          { label: 'Remove Liquidity', href: '/liquidity/remove', icon: 'RemoveCircle' },
          { label: 'Stake LP', href: '/liquidity/stake', icon: 'Lock' },
        ],
      },
      { label: 'Savings', href: '/savings', icon: 'Savings' },
      { label: 'Boost Staking', href: '/boost', icon: 'Bolt' },
      { label: 'Nitro Pools', href: '/nitro', icon: 'Rocket' },
      { label: 'Claim Rewards', href: '/rewards', icon: 'CardGiftcard' },
    ],
  },
  {
    id: 'govern',
    label: 'Govern',
    icon: 'HowToVote',
    children: [
      { label: 'Lock PAIMON', href: '/lock', icon: 'Lock' },
      { label: 'Vote on Gauges', href: '/vote', icon: 'HowToVote' },
      { label: 'Bribes Market', href: '/bribes', icon: 'AttachMoney' },
      { label: 'Convert esPaimon', href: '/convert', icon: 'SwapVert' },
      {
        label: 'Launchpad',
        children: [
          { label: 'Project List', href: '/launchpad', icon: 'RocketLaunch' },
          { label: 'My Participations', href: '/launchpad?filter=participated', icon: 'Verified' },
        ],
      },
    ],
  },
  {
    id: 'treasury',
    label: 'Treasury',
    icon: 'AccountBalance',
    children: [
      { label: 'Overview', href: '/treasury', icon: 'Dashboard' },
      { label: 'Deposit RWA', href: '/treasury/deposit', icon: 'Savings' },
      { label: 'My Positions', href: '/treasury/positions', icon: 'MonitorHeart' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: 'BarChart',
  },
];
```

#### Task 2.2: 重写 Navigation 组件
**文件**: `/src/components/layout/Navigation.tsx`
**目标**:
- 使用新的导航配置
- 支持多层嵌套下拉菜单 (Earn > Liquidity > Add/Remove/Stake)
- 根据网络隐藏 Phase 2 功能
- 改进响应式设计 (移动端折叠菜单)

#### Task 2.3: 创建移动端导航菜单
**文件**: `/src/components/layout/MobileNavigation.tsx`
**功能**:
- 汉堡菜单图标
- 侧边栏抽屉 (Drawer)
- 折叠式菜单结构

---

### **阶段 3: 缺失功能页面开发 (优先级: MEDIUM)**

#### Task 3.1: 检查已实现页面的完整性
**方法**: 逐个页面访问,检查:
- [ ] 页面是否加载成功
- [ ] 是否有合约调用错误
- [ ] UI 是否正常显示
- [ ] 是否有 TypeScript 错误
- [ ] 是否有控制台 JavaScript 错误

#### Task 3.2: 修复 Vault 相关页面
**页面清单**:
- `/vault` - Dashboard (列出所有用户的抵押仓位)
- `/vault/borrow` - 借款 USDP (抵押 RWA → mint USDP)
- `/vault/repay` - 偿还 USDP (burn USDP → 释放抵押品)

**关键合约交互**:
```typescript
// USDPVault ABI 函数
- borrow(address collateral, uint256 amount)
- repay(address collateral, uint256 amount)
- getPosition(address user, address collateral)
- liquidate(address user, address collateral)
```

#### Task 3.3: 修复 Stability Pool 页面
**页面**: `/stability-pool`
**功能**:
- 存入 USDP 到稳定池
- 查看份额和奖励
- 领取清算收益

**关键合约交互**:
```typescript
// USDPStabilityPool ABI 函数
- deposit(uint256 amount)
- withdraw(uint256 amount)
- claimRewards()
- getUserShares(address user)
```

#### Task 3.4: 修复 Convert 页面
**页面**: `/convert`
**功能**:
- 将 esPaimon 转换为 PAIMON (365 天线性归属)
- 提前退出 (罚款机制)
- 查看归属进度

**关键合约交互**:
```typescript
// esPaimon ABI 函数
- vest(uint256 amount)
- earlyExit(uint256 vestingId)
- getVestingSchedule(address user, uint256 vestingId)
```

#### Task 3.5: 修复 Boost 页面
**页面**: `/boost`
**功能**:
- 质押 PAIMON 获得 1.0x-1.5x 奖励加成
- 解除质押
- 查看加成倍数

**关键合约交互**:
```typescript
// BoostStaking ABI 函数
- stake(uint256 amount)
- unstake(uint256 amount)
- getBoostMultiplier(address user)
```

#### Task 3.6: 修复 Bribes 页面
**页面**: `/bribes`
**功能**:
- 查看所有 Gauge 的 Bribe 激励
- 投票者领取 Bribe 奖励
- 项目方存入 Bribe

**关键合约交互**:
```typescript
// BribeMarketplace ABI 函数
- depositBribe(address gauge, address token, uint256 amount)
- claimBribe(address gauge, bytes32[] merkleProof)
- getActiveBribes(address gauge)
```

#### Task 3.7: 修复 Nitro 页面
**页面**: `/nitro`
**功能**:
- 查看所有 Nitro Pool
- 质押 LP 到 Nitro Pool
- 领取外部项目激励

**关键合约交互**:
```typescript
// NitroPool ABI 函数
- stake(uint256 poolId, uint256 amount, uint256 lockDuration)
- unstake(uint256 poolId, uint256 positionId)
- claimRewards(uint256 poolId, uint256 positionId)
- getActiveNitroPools()
```

#### Task 3.8: 修复 Rewards 页面
**页面**: `/rewards`
**功能**:
- 统一查看所有奖励来源 (Debt Mining, LP Gauge, Stability Pool, Boost)
- 一键领取所有奖励 (批量 claim)

**关键合约交互**:
```typescript
// RewardDistributor ABI 函数
- claimRewards(bytes32[] merkleProof)
- getPendingRewards(address user)
```

---

### **阶段 4: Bug 修复与优化 (优先级: HIGH)**

#### Task 4.1: 系统性错误排查
**方法**:
1. 启动 dev server: `npm run dev`
2. 打开 Chrome DevTools Console
3. 访问每个页面并记录:
   - 控制台错误
   - 网络请求失败
   - 合约调用失败 (revert reasons)
4. 分类整理错误:
   - 合约地址错误
   - ABI 缺失/错误
   - Decimals 转换错误
   - 权限错误 (msg.sender 不匹配)
   - 逻辑错误 (计算错误, 条件判断错误)

#### Task 4.2: 创建错误日志
**文件**: `.ultra/docs/bug-tracker.md`
**格式**:
```markdown
## Bug #1: PSM Swap 输出显示为 0

**页面**: /swap
**错误**: 输入 10,000 USDC,输出显示 0.00000000... USDP
**根因**: 缺少 SCALE (10^12) decimals 转换
**修复**: 添加 SWAP_CONFIG.SCALE 常量,修改计算公式
**状态**: ✅ 已修复,待验证

---

## Bug #2: [待补充]

**页面**: [页面路径]
**错误**: [错误描述]
**根因**: [根本原因]
**修复**: [修复方案]
**状态**: [🔄 进行中 | ✅ 已修复 | ⏸️ 待处理]
```

#### Task 4.3: 修复高优先级 Bug (根据排查结果)
**优先级排序**:
1. **P0 - CRITICAL**: 阻塞核心功能 (如 Swap 无法使用)
2. **P1 - HIGH**: 影响用户体验但有 workaround
3. **P2 - MEDIUM**: UI/UX 问题,不影响功能
4. **P3 - LOW**: 优化建议

---

### **阶段 5: 测试与文档 (优先级: MEDIUM)**

#### Task 5.1: 创建端到端测试用例
**文件**: `/src/__tests__/e2e/user-journey.test.tsx`
**场景**:
1. **用户旅程 1: Swap USDC → USDP**
   - 连接钱包
   - 输入 100 USDC
   - 验证输出约 99.9 USDP (0.1% fee)
   - 执行 swap
   - 验证余额更新

2. **用户旅程 2: 抵押借款**
   - 存入 HYD 到 Vault
   - 借款 USDP (LTV 80%)
   - 验证债务记录

3. **用户旅程 3: LP 挖矿**
   - 添加 USDP/USDC 流动性
   - 质押 LP 到 Gauge
   - 领取奖励

#### Task 5.2: 更新用户文档
**文件**: `/docs/USER_GUIDE.md`
**内容**:
- 导航栏功能说明
- 各页面操作步骤
- 常见问题 FAQ
- 合约交互风险提示

---

## 📋 执行检查清单

### **开始前准备**
- [ ] Backup 现有代码: `git branch backup-$(date +%Y%m%d)`
- [ ] 创建 feature 分支: `git checkout -b feat/frontend-refactor`
- [ ] 安装依赖: `npm install`

### **阶段 1: 配置修复**
- [ ] Task 1.1: 审计合约地址配置
- [ ] Task 1.2: 验证 PSM Swap 修复
- [ ] Task 1.3: 验证所有合约配置

### **阶段 2: 导航栏重构**
- [ ] Task 2.1: 创建导航配置文件
- [ ] Task 2.2: 重写 Navigation 组件
- [ ] Task 2.3: 创建移动端菜单

### **阶段 3: 缺失页面开发**
- [ ] Task 3.1: 检查已有页面完整性
- [ ] Task 3.2: 修复 Vault 页面
- [ ] Task 3.3: 修复 Stability Pool 页面
- [ ] Task 3.4: 修复 Convert 页面
- [ ] Task 3.5: 修复 Boost 页面
- [ ] Task 3.6: 修复 Bribes 页面
- [ ] Task 3.7: 修复 Nitro 页面
- [ ] Task 3.8: 修复 Rewards 页面

### **阶段 4: Bug 修复**
- [ ] Task 4.1: 系统性错误排查
- [ ] Task 4.2: 创建错误日志
- [ ] Task 4.3: 修复高优先级 Bug

### **阶段 5: 测试与文档**
- [ ] Task 5.1: E2E 测试用例
- [ ] Task 5.2: 更新用户文档

### **最终验证**
- [ ] 所有页面无控制台错误
- [ ] 所有导航链接可访问
- [ ] 所有合约调用成功
- [ ] 移动端适配完成
- [ ] TypeScript 无编译错误
- [ ] Lint 检查通过: `npm run lint`
- [ ] 构建成功: `npm run build`

---

## 🚀 开始执行

**当前任务**: 阶段 1 Task 1.3 - 系统性验证所有合约配置

**下一步行动**:
1. 创建 `/src/hooks/useContractValidation.ts` - 统一验证所有合约基础调用
2. 在首页添加"配置健康检查"面板 - 开发模式下显示所有合约状态
3. 修复所有配置错误后,进入阶段 2 导航栏重构

**时间估算**:
- 阶段 1: 4 小时
- 阶段 2: 6 小时
- 阶段 3: 12 小时
- 阶段 4: 8 小时 (取决于 bug 数量)
- 阶段 5: 4 小时
- **总计**: ~34 小时 (约 4-5 个工作日)

---

**创建时间**: 2025-11-07
**作者**: Claude Code
**状态**: 📝 待执行
