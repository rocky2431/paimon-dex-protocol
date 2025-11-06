# Frontend 重构方案 V2 - 务实版

**基于团队评审调整的实际执行方案**

---

## 🎯 核心原则

1. **先修复构建** - TypeScript/ESLint错误是阻断项
2. **配置自动化** - 脚本化同步部署地址
3. **渐进式开发** - 核心功能优先,次要功能分阶段
4. **导航独立** - Launchpad单独成栏,Treasury归并Borrow

---

## 📊 当前问题诊断

### 1. TypeScript构建失败 (34个错误)

```bash
npm run type-check
# 错误类型:
# - HTMLElement.value类型错误: 13处
# - userEvent.type API变更: 1处
# - NitroPool类型不完整: 2处
# - PositionCard字段名错误: 1处
# - Playwright API错误: 4处
# - useAnalytics测试mock缺字段: 13处
```

**影响**: 阻断CI/CD流水线

### 2. 配置漂移问题

- ❌ **路径错误**: 我之前写的`paimon-rwa-contracts/addresses.json`不存在
- ✅ **实际路径**: `paimon-rwa-contracts/deployments/testnet/addresses.json`
- ❌ **手动维护**: `src/config/index.ts`与部署地址脱钩
- ❌ **无自动化**: 重新部署后需手动更新前端

### 3. 导航架构问题

**当前问题**:
```
Swap | Liquidity▾ | Lock | Vote | Savings | Launchpad▾ | Treasury▾ | Presale▾
```
- 8个顶级入口,无清晰分组
- Launchpad塞在中间,不够突出
- Vault/Stability/Convert/Boost/Bribes/Nitro/Rewards 7个核心功能缺失

**团队建议架构**(参考Camelot/Velodrome):
```
Trade | Earn | Borrow | Governance | Launch | Analytics
```

### 4. 未完成功能现状

- `/presale/*` - Phase 2,测试网不部署
- `/treasury/*` - 部分占位UI
- `/vault/*` - 页面存在但未接导航
- 大量TODO注释未清理

---

## ✅ 修正方案 (5阶段,按团队建议调整)

### **阶段 0: 环境修复 (阻断项, 2小时)**

#### Task 0.1: 修复TypeScript编译错误

**分类修复**:

```typescript
// 1. HTMLElement.value错误 (13处)
// 修复前:
const input = screen.getByLabelText('Amount');
expect(input.value).toBe('100');

// 修复后:
const input = screen.getByLabelText('Amount') as HTMLInputElement;
expect(input.value).toBe('100');

// 2. userEvent.type delay选项 (1处)
// 修复前:
await userEvent.type(input, '100', { delay: 10 });

// 修复后:
const user = userEvent.setup();
await user.type(input, '100');

// 3. NitroPool类型扩展 (2处)
// src/components/nitro/types.ts
export interface NitroPool {
  poolId: bigint;
  // ... existing fields
  stakingToken: `0x${string}`; // 新增
  rewardToken: `0x${string}`;  // 新增
}

// 4. PositionCard字段名 (1处)
// hydMinted → usdpMinted (统一业务语义)

// 5. Playwright API修复 (4处)
// 修复前:
await page.click('button:has-text("Vote")');

// 修复后:
await page.locator('button:has-text("Vote")').click();

// 6. useAnalytics mock补全 (13处)
// 补充缺失字段: isPending, promise, isEnabled等
```

**验证**:
```bash
npm run type-check # 0 errors
npm run lint       # 0 warnings
```

#### Task 0.2: 清理大量console.log和TODO

```bash
# 统计TODO数量
grep -r "TODO" src --exclude-dir=node_modules | wc -l

# 清理策略:
# - 移除开发调试用console.log
# - TODO分类: P0(阻断)/P1(重要)/P2(优化) → 移入Jira/GitHub Issues
# - 未实现功能在组件中添加 Coming Soon 提示,避免报错
```

---

### **阶段 1: 配置自动化 (关键, 3小时)**

#### Task 1.1: 创建地址同步脚本

**文件**: `/scripts/sync-addresses.ts`

```typescript
import fs from 'fs';
import path from 'path';

// 读取部署地址
const deploymentsPath = path.join(
  __dirname,
  '../../paimon-rwa-contracts/deployments/testnet/addresses.json'
);
const addresses = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));

// 生成TypeScript配置
const outputPath = path.join(
  __dirname,
  '../src/config/chains/generated/testnet.ts'
);

const content = `
// Auto-generated from deployments/testnet/addresses.json
// DO NOT EDIT MANUALLY - Run npm run sync-addresses

export const TESTNET_ADDRESSES = {
  // Core Tokens
  USDP: '${addresses.USDP}' as \`0x\${string}\`,
  PAIMON: '${addresses.PAIMON}' as \`0x\${string}\`,
  esPaimon: '${addresses.esPaimon}' as \`0x\${string}\`,
  HYD: '${addresses.HYD}' as \`0x\${string}\`,

  // Stablecoin Stack
  PSM: '${addresses.PSM}' as \`0x\${string}\`,
  USDPVault: '${addresses.USDPVault}' as \`0x\${string}\`,
  USDPStabilityPool: '${addresses.USDPStabilityPool}' as \`0x\${string}\`,
  SavingRate: '${addresses.SavingRate}' as \`0x\${string}\`,

  // Governance
  VotingEscrowPaimon: '${addresses.VotingEscrowPaimon}' as \`0x\${string}\`,
  GaugeController: '${addresses.GaugeController}' as \`0x\${string}\`,
  BribeMarketplace: '${addresses.BribeMarketplace}' as \`0x\${string}\`,

  // Incentives
  BoostStaking: '${addresses.BoostStaking}' as \`0x\${string}\`,
  NitroPool: '${addresses.NitroPool}' as \`0x\${string}\`,
  RewardDistributor: '${addresses.RewardDistributor}' as \`0x\${string}\`,

  // Emission
  EmissionManager: '${addresses.EmissionManager}' as \`0x\${string}\`,
  EmissionRouter: '${addresses.EmissionRouter}' as \`0x\${string}\`,

  // DEX
  DEXFactory: '${addresses.DEXFactory}' as \`0x\${string}\`,
  DEXRouter: '${addresses.DEXRouter}' as \`0x\${string}\`,

  // Treasury & Oracle
  Treasury: '${addresses.Treasury}' as \`0x\${string}\`,
  RWAPriceOracle: '${addresses.RWAPriceOracle}' as \`0x\${string}\`,

  // Launchpad
  ProjectRegistry: '${addresses.ProjectRegistry}' as \`0x\${string}\`,
  IssuanceController: '${addresses.IssuanceController}' as \`0x\${string}\`,

  // Phase 2 (Optional, may be null)
  RWABondNFT: ${addresses.RWABondNFT ? `'${addresses.RWABondNFT}' as \`0x\${string}\`` : 'null'},
  RemintController: ${addresses.RemintController ? `'${addresses.RemintController}' as \`0x\${string}\`` : 'null'},
  SettlementRouter: ${addresses.SettlementRouter ? `'${addresses.SettlementRouter}' as \`0x\${string}\`` : 'null'},
} as const;

// Feature flags based on contract availability
export const TESTNET_FEATURES = {
  psm: !!TESTNET_ADDRESSES.PSM,
  vault: !!TESTNET_ADDRESSES.USDPVault,
  stabilityPool: !!TESTNET_ADDRESSES.USDPStabilityPool,
  savings: !!TESTNET_ADDRESSES.SavingRate,
  veNFT: !!TESTNET_ADDRESSES.VotingEscrowPaimon,
  gaugeVoting: !!TESTNET_ADDRESSES.GaugeController,
  bribes: !!TESTNET_ADDRESSES.BribeMarketplace,
  boost: !!TESTNET_ADDRESSES.BoostStaking,
  nitro: !!TESTNET_ADDRESSES.NitroPool,
  rewards: !!TESTNET_ADDRESSES.RewardDistributor,
  launchpad: !!TESTNET_ADDRESSES.ProjectRegistry,
  treasury: !!TESTNET_ADDRESSES.Treasury,

  // Phase 2
  presale: !!TESTNET_ADDRESSES.RWABondNFT,
} as const;
`;

fs.writeFileSync(outputPath, content);
console.log('✅ Addresses synced to', outputPath);
```

**package.json添加脚本**:
```json
{
  "scripts": {
    "sync-addresses": "tsx scripts/sync-addresses.ts"
  }
}
```

#### Task 1.2: 更新config/index.ts使用生成配置

```typescript
// src/config/index.ts
import { bscTestnet, bsc } from 'wagmi/chains';
import { TESTNET_ADDRESSES, TESTNET_FEATURES } from './chains/generated/testnet';

const chainId = process.env.NEXT_PUBLIC_CHAIN_ID === '56' ? bsc.id : bscTestnet.id;

export const config = {
  chainId,
  addresses: chainId === bscTestnet.id ? TESTNET_ADDRESSES : MAINNET_ADDRESSES,
  features: chainId === bscTestnet.id ? TESTNET_FEATURES : MAINNET_FEATURES,
  // ...
};
```

---

### **阶段 2: 导航重构 (核心, 6小时)**

#### Task 2.1: 创建导航配置(团队建议的6栏结构)

**文件**: `/src/config/navigation.ts`

```typescript
import { config } from './index';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: string;
  children?: NavItem[];
  enabled?: boolean; // 通过feature flags控制
}

export const NAV_CONFIG: NavItem[] = [
  // 1. Trade (交易)
  {
    id: 'trade',
    label: 'Trade',
    icon: 'SwapHoriz',
    children: [
      {
        id: 'swap',
        label: 'Swap',
        href: '/',
        icon: 'SwapHoriz',
        enabled: config.features.psm,
      },
      {
        id: 'convert',
        label: 'Convert esPaimon',
        href: '/convert',
        icon: 'SwapVert',
        enabled: config.features.veNFT, // esPaimon需要veNFT系统
      },
      {
        id: 'liquidity',
        label: 'Liquidity',
        icon: 'Waves',
        children: [
          { label: 'Add', href: '/liquidity/add', icon: 'AddCircle' },
          { label: 'Remove', href: '/liquidity/remove', icon: 'RemoveCircle' },
          { label: 'Stake LP', href: '/liquidity/stake', icon: 'Lock' },
        ],
      },
    ],
  },

  // 2. Earn (收益)
  {
    id: 'earn',
    label: 'Earn',
    icon: 'TrendingUp',
    children: [
      {
        id: 'savings',
        label: 'Savings',
        href: '/savings',
        icon: 'Savings',
        enabled: config.features.savings,
      },
      {
        id: 'boost',
        label: 'Boost Staking',
        href: '/boost',
        icon: 'Bolt',
        enabled: config.features.boost,
      },
      {
        id: 'nitro',
        label: 'Nitro Pools',
        href: '/nitro',
        icon: 'Rocket',
        enabled: config.features.nitro,
      },
      {
        id: 'rewards',
        label: 'Claim Rewards',
        href: '/rewards',
        icon: 'CardGiftcard',
        enabled: config.features.rewards,
      },
    ],
  },

  // 3. Borrow (借贷 - 合并Vault + Treasury + Stability Pool)
  {
    id: 'borrow',
    label: 'Borrow',
    icon: 'AccountBalance',
    children: [
      {
        id: 'vault',
        label: 'Vault Dashboard',
        href: '/vault',
        icon: 'Dashboard',
        enabled: config.features.vault,
      },
      {
        id: 'borrow',
        label: 'Borrow USDP',
        href: '/vault/borrow',
        icon: 'CreditCard',
        enabled: config.features.vault,
      },
      {
        id: 'repay',
        label: 'Repay USDP',
        href: '/vault/repay',
        icon: 'Payment',
        enabled: config.features.vault,
      },
      {
        id: 'stability-pool',
        label: 'Stability Pool',
        href: '/stability-pool',
        icon: 'Shield',
        enabled: config.features.stabilityPool,
      },
      {
        id: 'treasury',
        label: 'Treasury (RWA Assets)',
        icon: 'Vault',
        enabled: config.features.treasury,
        children: [
          { label: 'Overview', href: '/treasury', icon: 'Dashboard' },
          { label: 'Deposit RWA', href: '/treasury/deposit', icon: 'Upload' },
          { label: 'My Positions', href: '/treasury/positions', icon: 'ListAlt' },
        ],
      },
    ],
  },

  // 4. Governance (治理)
  {
    id: 'governance',
    label: 'Governance',
    icon: 'HowToVote',
    children: [
      {
        id: 'lock',
        label: 'Lock PAIMON',
        href: '/lock',
        icon: 'Lock',
        enabled: config.features.veNFT,
      },
      {
        id: 'vote',
        label: 'Vote on Gauges',
        href: '/vote',
        icon: 'HowToVote',
        enabled: config.features.gaugeVoting,
      },
      {
        id: 'bribes',
        label: 'Bribes Market',
        href: '/bribes',
        icon: 'AttachMoney',
        enabled: config.features.bribes,
      },
    ],
  },

  // 5. Launch (RWA启动板 - 独立成栏)
  {
    id: 'launch',
    label: 'Launch',
    icon: 'RocketLaunch',
    enabled: config.features.launchpad,
    children: [
      {
        id: 'launchpad-projects',
        label: 'Project List',
        href: '/launchpad',
        icon: 'List',
      },
      {
        id: 'launchpad-participated',
        label: 'My Participations',
        href: '/launchpad?filter=participated',
        icon: 'Verified',
      },
    ],
  },

  // 6. Analytics (分析 - 独立入口)
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: 'BarChart',
  },

  // Phase 2: Presale (测试网隐藏)
  ...(config.features.presale ? [{
    id: 'presale',
    label: 'Presale',
    icon: 'LocalActivity',
    children: [
      { label: 'Mint Bond NFT', href: '/presale/mint', icon: 'LocalActivity' },
      { label: 'Dice Rolling', href: '/presale/dice', icon: 'Casino' },
      { label: 'Social Tasks', href: '/presale/tasks', icon: 'EmojiEvents' },
      { label: 'Leaderboards', href: '/presale/leaderboards', icon: 'Leaderboard' },
      { label: 'Bond Dashboard', href: '/presale/bonds', icon: 'AccountBalanceWallet' },
    ],
  }] : []),
];
```

#### Task 2.2: 重写Navigation组件(配置驱动)

```typescript
// src/components/layout/Navigation.tsx (简化版)
'use client';

import { NAV_CONFIG } from '@/config/navigation';
import { NavDropdown } from './NavDropdown';
import { NavLink } from './NavLink';

export function Navigation({ activePage }: NavigationProps) {
  return (
    <Box component="nav" sx={{ /* ... */ }}>
      <Container maxWidth="xl">
        <Stack direction="row" alignItems="center" sx={{ py: 2, gap: 3 }}>
          {/* Logo */}
          <Link href="/">
            <Typography variant="h6" fontWeight={700} color="primary">
              Paimon DEX
            </Typography>
          </Link>

          {/* 配置驱动的导航 */}
          <Stack direction="row" spacing={2} sx={{ flexGrow: 0 }}>
            {NAV_CONFIG.filter(item => item.enabled !== false).map(item => (
              item.children ? (
                <NavDropdown key={item.id} item={item} activePage={activePage} />
              ) : (
                <NavLink key={item.id} item={item} activePage={activePage} />
              )
            ))}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          {/* 钱包连接 */}
          <ConnectButton />
        </Stack>
      </Container>
    </Box>
  );
}
```

---

### **阶段 3: 核心功能优先 (渐进式, 8小时)**

**团队建议**: 不要一次性补7个功能,按优先级分批

#### Task 3.1: P0核心流程(先完成这些,其余渐进)

**优先级排序**:

| 优先级 | 页面 | 合约依赖 | 状态 | 预估时间 |
|--------|------|---------|------|---------|
| **P0** | `/` (Swap) | PSM | ✅ 已有(修复中) | 1h |
| **P0** | `/vault` | USDPVault | 📄 页面存在,需接导航 | 1h |
| **P0** | `/vault/borrow` | USDPVault | 📄 页面存在,需接导航 | 1h |
| **P0** | `/vault/repay` | USDPVault | 📄 页面存在,需接导航 | 1h |
| **P0** | `/stability-pool` | USDPStabilityPool | 📄 页面存在,需验证 | 1h |
| **P1** | `/convert` | esPaimon | ✅ 已有 | 0.5h |
| **P1** | `/boost` | BoostStaking | ✅ 已有 | 0.5h |
| **P1** | `/bribes` | BribeMarketplace | ✅ 已有 | 0.5h |
| **P1** | `/nitro` | NitroPool | ✅ 已有 | 0.5h |
| **P1** | `/rewards` | RewardDistributor | ✅ 已有 | 0.5h |

**执行策略**:
1. **Week 1**: P0核心流程(Swap, Vault, Stability)
2. **Week 2**: P1治理与激励(Convert, Boost, Bribes, Nitro, Rewards)
3. **Week 3**: P2优化与文档

#### Task 3.2: 未完成功能的Coming Soon处理

对于暂未接入的页面:

```typescript
// src/components/common/ComingSoon.tsx
export function ComingSoon({ feature }: { feature: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <RocketLaunchIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        {feature} Coming Soon
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This feature is under development. Stay tuned!
      </Typography>
    </Box>
  );
}
```

在未完成页面使用:
```typescript
// 例如 /treasury/deposit/page.tsx (如果暂未完成)
export default function TreasuryDepositPage() {
  if (!config.features.treasury) {
    return <ComingSoon feature="Treasury RWA Deposit" />;
  }
  // ... 实际实现
}
```

---

### **阶段 4: Bug修复与质量保证 (系统性, 4小时)**

#### Task 4.1: 创建Bug追踪文档

**文件**: `.ultra/docs/bug-tracker.md`

```markdown
# Bug Tracker

## P0 - CRITICAL (阻断核心功能)

### Bug #1: PSM Swap输出显示为0
- **页面**: `/`
- **错误**: 输入10,000 USDC,输出0.00000000... USDP
- **根因**: 缺少SCALE (10^12) decimals转换
- **修复**: ✅ 已添加SWAP_CONFIG.SCALE,已修改计算逻辑
- **验证**: 🔄 待重启dev server后测试
- **负责人**: Claude
- **截止日期**: 2025-11-07

### Bug #2: TypeScript构建失败 (34个错误)
- **影响**: 阻断CI/CD
- **分类**:
  - HTMLElement.value: 13处
  - Playwright API: 4处
  - Wagmi mock: 13处
  - 其他: 4处
- **修复**: 🔄 阶段0进行中
- **负责人**: Claude
- **截止日期**: 2025-11-07

## P1 - HIGH (影响体验但有workaround)

### Bug #3: 导航缺少Vault等7个核心功能入口
- **页面**: Navigation
- **影响**: 用户无法访问已实现的功能
- **修复**: 🔄 阶段2导航重构中
- **负责人**: Claude
- **截止日期**: 2025-11-08

## P2 - MEDIUM (UI/UX问题)

## P3 - LOW (优化建议)
```

#### Task 4.2: 系统性页面排查

**检查清单**:
```bash
# 逐个访问并记录
http://localhost:4000/          # Swap - ✅/❌ + 错误信息
http://localhost:4000/vault      # Vault Dashboard
http://localhost:4000/vault/borrow
http://localhost:4000/vault/repay
http://localhost:4000/stability-pool
http://localhost:4000/convert
http://localhost:4000/boost
http://localhost:4000/bribes
http://localhost:4000/nitro
http://localhost:4000/rewards
http://localhost:4000/savings
http://localhost:4000/lock
http://localhost:4000/vote
http://localhost:4000/liquidity/add
http://localhost:4000/liquidity/remove
http://localhost:4000/liquidity/stake
http://localhost:4000/launchpad
http://localhost:4000/treasury
http://localhost:4000/treasury/deposit
http://localhost:4000/treasury/positions
http://localhost:4000/analytics
```

**记录**:
- Console错误
- Network请求失败
- 合约调用revert
- UI渲染异常

---

### **阶段 5: 测试与文档 (保障, 3小时)**

#### Task 5.1: E2E测试核心流程

```typescript
// e2e/core-flow.spec.ts
import { test, expect } from '@playwright/test';

test('Core Flow: Swap USDC to USDP', async ({ page }) => {
  // 1. 访问首页
  await page.goto('http://localhost:4000');

  // 2. 连接钱包(模拟)
  // ...

  // 3. 输入100 USDC
  await page.locator('input[placeholder*="0.00"]').first().fill('100');

  // 4. 验证输出约99.9 USDP
  const output = await page.locator('input[placeholder*="0.00"]').last().inputValue();
  expect(parseFloat(output)).toBeCloseTo(99.9, 1);

  // 5. 执行Swap
  await page.locator('button:has-text("Swap")').click();

  // 6. 等待交易确认
  await page.waitForSelector('text=Transaction confirmed', { timeout: 30000 });
});

test('Core Flow: Vault Borrow', async ({ page }) => {
  // ...
});
```

#### Task 5.2: 更新README与用户文档

---

## 📋 调整后的任务列表

### **阶段0: 环境修复 (2h) ⚠️ CRITICAL**
- [ ] 0.1: 修复34个TypeScript错误
- [ ] 0.2: 清理console.log和TODO注释

### **阶段1: 配置自动化 (3h)**
- [ ] 1.1: 创建地址同步脚本 `scripts/sync-addresses.ts`
- [ ] 1.2: 更新config使用生成配置
- [ ] 1.3: 验证所有合约地址正确加载

### **阶段2: 导航重构 (6h)**
- [ ] 2.1: 创建导航配置 `config/navigation.ts` (6栏结构)
- [ ] 2.2: 重写Navigation组件(配置驱动)
- [ ] 2.3: 创建NavDropdown/NavLink子组件

### **阶段3: 核心功能 (8h, 渐进式)**
- [ ] 3.1: P0核心流程 - Swap, Vault, Stability (Week 1)
- [ ] 3.2: P1治理与激励 - Convert, Boost, Bribes, Nitro, Rewards (Week 2)
- [ ] 3.3: P2优化与文档 (Week 3)

### **阶段4: Bug修复 (4h)**
- [ ] 4.1: 创建bug-tracker.md
- [ ] 4.2: 系统性页面排查(20+页面)
- [ ] 4.3: 修复P0/P1优先级bug

### **阶段5: 测试文档 (3h)**
- [ ] 5.1: E2E测试核心流程
- [ ] 5.2: 更新README与用户文档

---

## 🚀 执行顺序 (严格遵守)

```
阶段0 (CRITICAL) → 阶段1 (配置) → 阶段2 (导航) → 阶段3.1 (P0) → 阶段4 → 阶段3.2 (P1) → 阶段5
```

**原因**:
1. TypeScript错误阻断CI,必须先修复
2. 配置自动化是后续所有工作的基础
3. 导航重构提供访问入口
4. P0核心功能优先,P1渐进开发
5. Bug修复与测试贯穿全程

---

## 📊 时间估算 (调整后)

| 阶段 | 时间 | 累计 |
|------|------|------|
| 阶段0: 环境修复 | 2h | 2h |
| 阶段1: 配置自动化 | 3h | 5h |
| 阶段2: 导航重构 | 6h | 11h |
| 阶段3.1: P0核心 | 5h | 16h |
| 阶段4: Bug修复 | 4h | 20h |
| 阶段3.2: P1功能 | 2.5h | 22.5h |
| 阶段5: 测试文档 | 3h | 25.5h |

**总计**: ~26小时 (约3-4个工作日)

**对比V1方案**: 从34小时降至26小时,更务实

---

## ✅ 关键改进点 (响应团队反馈)

### 1. TypeScript错误作为阻断项
- ✅ 提升到阶段0最高优先级
- ✅ 清零所有编译错误后再进行后续开发

### 2. 配置路径修正
- ✅ `addresses.json` → `deployments/testnet/addresses.json`
- ✅ 自动化脚本生成TypeScript配置
- ✅ Feature flags动态控制功能显示

### 3. 导航分组优化
- ✅ Launchpad独立成栏(响应团队建议)
- ✅ Treasury归并到Borrow下
- ✅ 6栏结构: Trade / Earn / Borrow / Governance / Launch / Analytics

### 4. 渐进式开发
- ✅ P0核心流程先完成(Week 1)
- ✅ P1功能渐进解锁(Week 2-3)
- ✅ 未完成功能使用Coming Soon组件

### 5. Bug追踪系统化
- ✅ bug-tracker.md分级管理
- ✅ 系统性页面排查清单
- ✅ P0/P1/P2/P3优先级

---

**创建时间**: 2025-11-07
**版本**: V2 (务实版,基于团队评审调整)
**状态**: 📝 待执行
**负责人**: Claude Code

---

## 🙏 致谢

感谢团队提供的专业评审,指出了V1方案的多个关键问题:
- TypeScript构建失败未作为阻断项
- 配置路径错误
- Stage 3过于激进
- 导航分组不合理
- 缺少对TODO和mock数据的处理策略

V2方案已全面吸收反馈并调整。
