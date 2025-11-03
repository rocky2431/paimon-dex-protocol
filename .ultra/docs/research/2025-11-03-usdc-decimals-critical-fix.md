# USDC Decimals 不一致 - Critical Bug 修复方案

**发现日期**: 2025-11-03
**严重性**: 🔴 **Critical** - 可能导致资金损失
**影响范围**: PSM 合约 + 前端配置

---

## 一、链上验证结果

### ✅ BSC 主网 USDC

```bash
$ cast call 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d "decimals()(uint8)" \
  --rpc-url https://bsc-dataseed.binance.org/

18  # ← 主网 USDC = 18 decimals
```

**合约地址**: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
**名称**: USDC (Binance-Peg USD Coin)

---

### ✅ BSC 测试网 USDC

```bash
$ cast call 0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2 "decimals()(uint8)" \
  --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545/

6  # ← 测试网 USDC = 6 decimals
```

**合约地址**: `0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2`
**名称**: USDC (符号已验证)

---

## 二、问题根因分析

### 当前实现状态

| 组件 | 主网假设 | 测试网假设 | 实际情况 |
|------|---------|----------|---------|
| **PSM.sol** | USDC = 6 decimals<br/>转换因子 `1e12` | USDC = 6 decimals<br/>转换因子 `1e12` | ⚠️ **主网错误**<br/>✅ 测试网正确 |
| **前端配置** | USDC = 18 decimals<br/>`decimals: 18` | USDC = 18 decimals<br/>`decimals: 18` | ✅ **主网正确**<br/>⚠️ 测试网错误 |

### PSM.sol 代码分析

```solidity
// paimon-rwa-contracts/src/core/PSM.sol:111
// USDC → USDP
usdpReceived = usdcAfterFee * 1e12; // 假设 USDC=6, USDP=18 → 需要 1e12

// line 141
// USDP → USDC
usdcReceived = usdpAfterFee / 1e12; // 假设 USDP=18, USDC=6 → 需要 1e12
```

**问题**：硬编码 `1e12` 无法适配主网 USDC=18 的情况

---

## 三、风险影响评估

### 🔴 主网部署风险（如果不修复）

**场景 1：用户 USDC → USDP**
```
用户存入: 1000 USDC (18 decimals) = 1,000,000,000,000,000,000,000 wei
PSM 计算: usdpReceived = 1000e18 * 1e12 = 1,000,000,000,000,000,000,000,000,000,000,000 wei
结果: 铸造 1,000,000,000,000 USDP（1 万亿 USDP！）
影响: 通货膨胀，锚定失效，协议崩溃
```

**场景 2：用户 USDP → USDC**
```
用户存入: 1000 USDP (18 decimals) = 1,000,000,000,000,000,000,000 wei
PSM 计算: usdcReceived = 1000e18 / 1e12 = 1,000,000 wei = 0.000001 USDC
结果: 用户损失 99.9999% 的资金
影响: 用户资金被"吞噬"，严重的合约漏洞
```

### ✅ 测试网当前状态（正常工作）

```
测试网 USDC = 6 decimals
PSM 转换因子 = 1e12
计算: 1000 USDC (6 decimals) * 1e12 = 1000 USDP (18 decimals) ✅ 正确
```

---

## 四、修复方案（三选一）

### 方案 A：参数化 PSM 合约（推荐 ⭐）

**优势**：
- ✅ 最灵活，支持任意 ERC20 decimals
- ✅ 主网和测试网使用同一套合约代码
- ✅ 未来可支持其他稳定币（USDT、DAI）

**劣势**：
- ❌ 需要修改合约并重新部署
- ❌ 需要重新审计安全性
- ❌ 需要更新测试用例

**实现**：

```solidity
// PSM.sol 修改
contract PSM {
    IERC20 public immutable USDC;
    IERC20 public immutable USDP;

    uint8 public immutable usdcDecimals;  // 新增
    uint8 public constant USDP_DECIMALS = 18;

    constructor(address _usdc, address _usdp, uint8 _usdcDecimals) {
        USDC = IERC20(_usdc);
        USDP = IUSDP(_usdp);
        usdcDecimals = _usdcDecimals;  // 可配置
    }

    function swapUSDCForUSDP(uint256 usdcAmount) external returns (uint256 usdpReceived) {
        uint256 feeUSDC = (usdcAmount * feeIn) / BP_DENOMINATOR;
        uint256 usdcAfterFee = usdcAmount - feeUSDC;

        // 动态计算转换因子
        if (usdcDecimals < USDP_DECIMALS) {
            uint256 scaleFactor = 10 ** (USDP_DECIMALS - usdcDecimals);
            usdpReceived = usdcAfterFee * scaleFactor;
        } else if (usdcDecimals > USDP_DECIMALS) {
            uint256 scaleFactor = 10 ** (usdcDecimals - USDP_DECIMALS);
            usdpReceived = usdcAfterFee / scaleFactor;
        } else {
            usdpReceived = usdcAfterFee;  // 1:1
        }

        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);
        USDP.mint(msg.sender, usdpReceived);
        emit SwapUSDCForUSDP(msg.sender, usdcAmount, usdpReceived, ...);
    }

    function swapUSDPForUSDC(uint256 usdpAmount) external returns (uint256 usdcReceived) {
        uint256 feeUSDP = (usdpAmount * feeOut) / BP_DENOMINATOR;
        uint256 usdpAfterFee = usdpAmount - feeUSDP;

        // 动态计算转换因子（反向）
        if (usdcDecimals < USDP_DECIMALS) {
            uint256 scaleFactor = 10 ** (USDP_DECIMALS - usdcDecimals);
            usdcReceived = usdpAfterFee / scaleFactor;
        } else if (usdcDecimals > USDP_DECIMALS) {
            uint256 scaleFactor = 10 ** (usdcDecimals - USDP_DECIMALS);
            usdcReceived = usdpAfterFee * scaleFactor;
        } else {
            usdcReceived = usdpAfterFee;  // 1:1
        }

        require(USDC.balanceOf(address(this)) >= usdcReceived, "Insufficient reserve");
        USDP.burnFrom(msg.sender, usdpAmount);
        USDC.safeTransfer(msg.sender, usdcReceived);
        emit SwapUSDPForUSDC(msg.sender, usdpAmount, usdcReceived, ...);
    }
}
```

**部署参数**：
- 测试网：`PSM(testnetUSDC, USDP, 6)`
- 主网：`PSM(mainnetUSDC, USDP, 18)`

**测试计划**：
1. 单元测试：6/18/18 三种 decimals 组合
2. 边界测试：0 金额、最大值、溢出检测
3. 集成测试：与 Treasury、SavingRate 交互
4. Gas 测试：对比修改前后 gas 消耗

**预估成本**：
- 开发：2 天
- 测试：2 天
- 审计：3-5 天
- 部署：1 天
- **总计**：8-10 天

---

### 方案 B：修改前端配置（快速修复 ⚡）

**优势**：
- ✅ 无需修改合约
- ✅ 快速部署（1 小时内）
- ✅ 测试网立即可用

**劣势**：
- ❌ 仅解决测试网问题
- ❌ 主网仍然无法部署（USDC=18）
- ❌ 临时方案，不可持续

**实现**：

```typescript
// nft-paimon-frontend/src/config/chains/testnet.ts

export const tokens = {
  usdc: "0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2" as const,
  // 其他配置...
}

export const tokenConfig = {
  usdc: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: tokens.usdc,
    decimals: 6,  // ← 改为 6（匹配测试网实际情况）
    chainId: BSC_TESTNET,
  },
  // ...
}
```

**注意**：主网配置需保持 18

```typescript
// nft-paimon-frontend/src/config/chains/mainnet.ts
export const tokenConfig = {
  usdc: {
    decimals: 18,  // ← 主网保持 18
    // ...
  },
}
```

**预估成本**：
- 修改：30 分钟
- 测试：30 分钟
- 部署：即时
- **总计**：1 小时

**问题**：主网部署仍然会失败（需要方案 A 或 C）

---

### 方案 C：使用主网兼容的测试网 USDC

**优势**：
- ✅ 测试环境更贴近主网
- ✅ 无需修改合约
- ✅ 避免环境差异导致的 bug

**劣势**：
- ❌ 需要部署新的测试网 USDC 合约（18 decimals）
- ❌ 需要更新所有配置和测试脚本
- ❌ 现有测试网交互需迁移

**实现步骤**：
1. 部署 18 decimals 的 Mock USDC 到测试网
2. 更新前端配置指向新合约
3. 更新部署脚本和测试用例
4. 迁移现有测试数据

**预估成本**：
- 部署合约：1 天
- 更新配置：1 天
- 迁移测试：2 天
- **总计**：4 天

---

## 五、推荐实施路径

### 🎯 最佳方案：A（参数化） + B（临时修复）

**阶段 1：紧急修复（1 小时内）**
- 执行方案 B：修改前端测试网配置 `decimals: 6`
- 验证测试网 PSM swap 功能正常
- **目标**：立即解除测试网环境风险

**阶段 2：长期修复（8-10 天）**
- 执行方案 A：参数化 PSM 合约
- 完整测试和审计
- 主网部署前验证
- **目标**：支持主网部署，消除架构风险

---

## 六、验证清单

### 测试网验证（方案 B 实施后）

- [ ] 前端显示 USDC 金额正确（6 decimals）
- [ ] PSM swap USDC → USDP：1000 USDC → ~999 USDP（扣除 0.1% fee）
- [ ] PSM swap USDP → USDC：1000 USDP → ~999 USDC（扣除 0.1% fee）
- [ ] 小额测试：0.000001 USDC 可正常 swap
- [ ] 大额测试：1,000,000 USDC 可正常 swap
- [ ] 事件日志：SwapUSDCForUSDP/SwapUSDPForUSDC 参数正确

### 主网验证（方案 A 实施后）

- [ ] 部署参数：`PSM(mainnetUSDC, USDP, 18)`
- [ ] 单元测试：18 decimals USDC 转换正确
- [ ] Gas 测试：新逻辑 gas 消耗可接受（<5% 增加）
- [ ] 审计报告：无 Critical/High 风险
- [ ] 前端适配：自动检测 USDC decimals 并显示
- [ ] E2E 测试：完整 swap 流程成功

---

## 七、时间线

### 紧急修复（Today）

| 时间 | 任务 | 负责人 |
|-----|------|-------|
| +30min | 修改测试网前端配置 | 前端 |
| +1h | 测试网验证 | QA |
| +1.5h | 部署到测试网 | DevOps |

### 长期修复（Week 1-2）

| Day | 任务 | 负责人 |
|-----|------|-------|
| D1-2 | PSM.sol 参数化开发 | 合约 |
| D3-4 | 单元+集成测试 | QA |
| D5-7 | 安全审计 | 安全团队 |
| D8 | 部署到测试网 | DevOps |
| D9 | E2E 测试 | QA |
| D10 | 主网部署准备 | 全员 |

---

## 八、风险缓解

### 如果必须立即部署主网（不推荐）

**临时方案**：使用符合 PSM 假设的 6 decimals USDC

1. 部署 6 decimals 的 Mock USDC 到主网
2. PSM 指向 Mock USDC（而非官方 USDC）
3. 前端配置 `decimals: 6`

**问题**：
- ❌ 失去与官方 USDC 的互操作性
- ❌ 需要额外的桥接机制
- ❌ 增加用户理解成本

**结论**：**强烈不推荐**，应优先执行方案 A

---

## 九、附录：相关代码位置

### 合约
- `paimon-rwa-contracts/src/core/PSM.sol:111` - USDC → USDP 转换
- `paimon-rwa-contracts/src/core/PSM.sol:141` - USDP → USDC 转换

### 前端
- `nft-paimon-frontend/src/config/chains/testnet.ts:59` - 测试网 USDC 配置
- `nft-paimon-frontend/src/config/chains/mainnet.ts` - 主网 USDC 配置
- `nft-paimon-frontend/src/components/swap/hooks/usePSMSwap.ts` - PSM swap 逻辑

### 测试
- `paimon-rwa-contracts/test/unit/PSM.t.sol` - PSM 单元测试

---

**报告完成时间**: 2025-11-03 23:30:00
**下一步行动**: 团队决策选择修复方案
**紧急联系**: 如需立即讨论，请组织紧急会议
