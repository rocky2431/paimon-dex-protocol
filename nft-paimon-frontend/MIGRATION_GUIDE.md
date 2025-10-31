# 多链地址配置迁移指南

本文档指导您如何从现有的分散地址配置迁移到新的统一多链地址配置系统。

## 迁移概览

### 迁移目标
- 将散布在多个常量文件中的地址统一管理
- 支持多链部署（Ethereum、BSC、Arbitrum、Base、Optimism）
- 提供类型安全的地址访问接口
- 支持开发/测试/生产环境配置分离

### 迁移范围
- ✅ 已完成：新架构设计和核心实现
- 🚧 进行中：现有代码迁移
- 📋 待完成：测试验证

## 现有地址配置分析

### 当前问题
1. **地址分散**：地址散布在多个 `constants.ts` 文件中
2. **硬编码网络ID**：使用数字硬编码网络ID
3. **缺乏类型安全**：地址格式验证不足
4. **环境混合**：开发/生产地址混在一起
5. **扩展困难**：添加新链需要修改多个文件

### 现有文件列表
```
src/config/contracts/treasury.ts                    # Treasury合约地址
src/components/treasury/constants.ts                # Treasury相关常量
src/components/presale/constants.ts                 # Presale相关地址
src/components/liquidity/constants.ts               # DEX流动性地址
src/components/bribes/constants.ts                  # Bribe系统地址
src/components/rewards/constants.ts                 # 奖励系统地址
src/components/voting/constants.ts                  # 投票系统地址
src/components/swap/constants.ts                    # 交换功能地址
src/components/venft/constants.ts                   # veNFT相关地址
src/components/analytics/constants.ts               # 分析功能地址
```

## 迁移步骤

### Phase 1: 新架构设置 ✅
```bash
# 已完成的文件结构
src/config/chains/
├── types.ts                     # 类型定义
├── chain-definitions.ts         # 链定义
├── addresses/
│   ├── index.ts                 # 统一导出
│   ├── AddressManager.ts        # 地址管理器
│   ├── examples.ts              # 使用示例
│   └── bsc/                     # BSC链配置
│       ├── mainnet.ts
│       ├── testnet.ts
│       └── index.ts
└── contracts/
    ├── abis/                    # 合约ABI
    └── interfaces/              # 合约接口
```

### Phase 2: 现有代码迁移

#### 2.1 更新导入语句
**旧代码：**
```typescript
import { TREASURY_ADDRESS, TREASURY_ABI } from '@/config/contracts/treasury';
import { LIQUIDITY_ADDRESSES } from '@/components/liquidity/constants';
```

**新代码：**
```typescript
import { addressManager, getContractAddress } from '@/config/chains/addresses';
import { TREASURY_ABI } from '@/config/contracts/abis';
```

#### 2.2 获取合约地址
**旧代码：**
```typescript
const treasuryAddress = TREASURY_ADDRESS;
const routerAddress = LIQUIDITY_ADDRESSES.PANCAKE_ROUTER;
```

**新代码：**
```typescript
const chainId = useChainId(); // 从wagmi获取当前链ID
const treasuryAddress = getContractAddress(chainId, 'protocol.treasury');
const routerAddress = getContractAddress(chainId, 'dex.router');
```

#### 2.3 获取Token地址
**旧代码：**
```typescript
import { USDC_ADDRESSES } from '@/components/presale/constants';
const usdcAddress = USDC_ADDRESSES[chainId];
```

**新代码：**
```typescript
import { getTokenAddress } from '@/config/chains/addresses';
const usdcToken = getTokenAddress(chainId, 'USDC');
const usdcAddress = usdcToken?.address;
```

### Phase 3: 具体文件迁移示例

#### 3.1 迁移 Treasury 配置
**旧文件：** `src/config/contracts/treasury.ts`
```typescript
// 旧代码
export const TREASURY_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const TREASURY_ABI = [...];
```

**新用法：**
```typescript
// 新代码 - 使用地址管理器
import { addressManager } from '@/config/chains/addresses';
import { TREASURY_ABI } from '@/config/contracts/abis';

const chainId = useChainId();
const treasuryConfig = addressManager.getProtocolContracts(chainId);
const treasuryAddress = treasuryConfig?.treasury?.address;
```

#### 3.2 迁移流动性配置
**旧文件：** `src/components/liquidity/constants.ts`
```typescript
// 旧代码
export const LIQUIDITY_ADDRESSES = {
  PANCAKE_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  PANCAKE_FACTORY: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
} as const;

export const SUPPORTED_TOKENS: Record<string, Token> = {
  USDC: {
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
  },
  // ...
};
```

**新用法：**
```typescript
// 新代码
import { addressManager } from '@/config/chains/addresses';

const chainId = useChainId();
const dexContracts = addressManager.getDEXContracts(chainId);
const routerAddress = dexContracts?.router?.address;
const factoryAddress = dexContracts?.factory?.address;

// 获取所有支持的表情
const allTokens = addressManager.getAllTokens(chainId);
const usdcToken = allTokens.find(t => t.symbol === 'USDC');
```

#### 3.3 迁移 RWA 资产配置
**旧文件：** `src/components/treasury/constants.ts`
```typescript
// 旧代码
export const RWA_ASSETS: RWAAsset[] = [
  {
    address: '0x0000000000000000000000000000000000000001',
    name: 'Tokenized US Treasury Bond',
    symbol: 'tUST',
    tier: 1,
    ltvRatio: 60,
    // ...
  },
];
```

**新用法：**
```typescript
// 新代码 - 将RWA资产添加到链配置中
// 在对应的链配置文件中添加 customTokens
// 例如：src/config/chains/addresses/bsc/mainnet.ts

export const bscMainnetConfig = {
  // ...
  customTokens: [
    {
      address: '0x...' as const,
      symbol: 'tUST',
      name: 'Tokenized US Treasury Bond',
      decimals: 18,
      // 可以添加额外的RWA特定属性
      tier: 1,
      ltvRatio: 60,
    },
  ],
};

// 使用时：
import { addressManager } from '@/config/chains/addresses';

const chainId = useChainId();
const allTokens = addressManager.getAllTokens(chainId);
const rwaAssets = allTokens.filter(token => token.tier !== undefined);
```

### Phase 4: React组件迁移

#### 4.1 创建自定义Hook
```typescript
// src/hooks/useContractAddress.ts
import { useChainId } from 'wagmi';
import { useContractAddress as useContractAddressBase } from '@/config/chains/addresses/examples';

export function useContractAddress(contractPath: string) {
  const chainId = useChainId();
  return useContractAddressBase(chainId, contractPath);
}

// src/hooks/useTokenAddress.ts
import { useChainId } from 'wagmi';
import { addressManager } from '@/config/chains/addresses';

export function useTokenAddress(symbol: string) {
  const chainId = useChainId();
  return addressManager.getTokenAddress(chainId, symbol);
}
```

#### 4.2 更新组件使用
**旧代码：**
```typescript
import { TREASURY_ADDRESS } from '@/config/contracts/treasury';

function TreasuryDeposit() {
  const handleDeposit = () => {
    // 使用硬编码地址
    writeContract({
      address: TREASURY_ADDRESS,
      abi: TREASURY_ABI,
      functionName: 'depositRWA',
      args: [asset, amount],
    });
  };
}
```

**新代码：**
```typescript
import { useContractAddress } from '@/hooks/useContractAddress';

function TreasuryDeposit() {
  const { address: treasuryAddress } = useContractAddress('protocol.treasury');

  const handleDeposit = () => {
    if (!treasuryAddress) {
      throw new Error('Treasury contract not found');
    }

    writeContract({
      address: treasuryAddress,
      abi: TREASURY_ABI,
      functionName: 'depositRWA',
      args: [asset, amount],
    });
  };
}
```

### Phase 5: 环境配置

#### 5.1 开发环境配置
```typescript
// src/config/chains/addresses/bsc/testnet.ts
export const bscTestnetConfig = {
  chainId: 97,
  environment: 'development',
  protocol: {
    treasury: {
      address: '0x...', // 测试网地址
      name: 'Paimon Treasury (Testnet)',
    },
    // ...
  },
};
```

#### 5.2 生产环境配置
```typescript
// src/config/chains/addresses/bsc/mainnet.ts
export const bscMainnetConfig = {
  chainId: 56,
  environment: 'production',
  protocol: {
    treasury: {
      address: '0x...', // 主网地址
      name: 'Paimon Treasury',
    },
    // ...
  },
};
```

### Phase 6: 验证和测试

#### 6.1 配置验证
```typescript
// 添加到测试套件
import { validateAllConfigs } from '@/config/chains/addresses';

describe('Address Configuration', () => {
  it('should validate all chain configurations', () => {
    const results = validateAllConfigs();

    Object.entries(results).forEach(([chainId, result]) => {
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
```

#### 6.2 组件测试
```typescript
// 测试组件是否正确使用新配置
import { renderHook } from '@testing-library/react';
import { useContractAddress } from '@/hooks/useContractAddress';

describe('useContractAddress', () => {
  it('should return correct contract address', () => {
    const { result } = renderHook(() =>
      useContractAddress('protocol.treasury')
    );

    expect(result.current.address).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

## 迁移检查清单

### Phase 1: 架构准备 ✅
- [x] 创建类型定义
- [x] 实现地址管理器
- [x] 设置链定义
- [x] 创建BSC配置示例

### Phase 2: 代码迁移 🚧
- [ ] 更新所有导入语句
- [ ] 迁移Treasury相关代码
- [ ] 迁移流动性相关代码
- [ ] 迁移Presale相关代码
- [ ] 迁移其他组件常量
- [ ] 创建自定义Hook
- [ ] 更新React组件

### Phase 3: 测试验证 📋
- [ ] 单元测试覆盖
- [ ] 集成测试验证
- [ ] 端到端测试
- [ ] 配置验证测试
- [ ] 多链测试

### Phase 4: 文档和培训 📋
- [ ] 更新API文档
- [ ] 创建使用指南
- [ ] 团队培训材料
- [ ] 最佳实践文档

## 常见问题解答

### Q1: 如何处理现有的硬编码地址？
A: 使用地址管理器的 `getContractAddress` 函数替换硬编码地址，传入链ID和合约路径。

### Q2: 如何添加新的区块链支持？
A: 在 `src/config/chains/addresses/` 下创建新的链目录，添加 `mainnet.ts` 和 `testnet.ts` 配置文件。

### Q3: 如何处理环境特定的地址？
A: 地址管理器会根据当前环境自动过滤配置，确保生产环境只使用生产地址。

### Q4: 如何验证地址配置的正确性？
A: 使用 `validateAllConfigs()` 函数进行批量验证，或使用 `validateChainConfig(chainId)` 验证单个链。

### Q5: 迁移过程中如何保证服务不中断？
A: 采用渐进式迁移，先并行运行新旧系统，逐步切换，并保留回退机制。

## 下一步计划

1. **立即执行**：开始Phase 2的代码迁移工作
2. **并行进行**：创建测试用例验证新系统
3. **后续跟进**：文档更新和团队培训
4. **长期维护**：持续优化和扩展架构

## 技术支持

如果在迁移过程中遇到问题，请参考：
- 使用示例：`src/config/chains/addresses/examples.ts`
- 类型定义：`src/config/chains/types.ts`
- 地址管理器API：`src/config/chains/addresses/AddressManager.ts`

---

**注意**：本迁移指南会随着迁移进展持续更新。建议在开始迁移前，先在小范围内测试新架构的可行性。