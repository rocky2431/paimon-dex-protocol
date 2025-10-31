# Paimon 项目改造方案详细计划（2025-11-01 R2 修订版）

> **⚠️ 本文档为 R2 修订版详细规格说明**
> **基础版本**：`transform-plan.md`
> **修订依据**：`.ultra/docs/研究报告-改造计划准确性评估-2025-11-01.md`
>
> **核心变更汇总**：
> - ✅ 修正手续费分配：最终确认 **70/30**（动态计算方式）
> - ✅ 新增 3 个核心合约：BoostStaking.sol、NitroPool.sol、SavingRate.sol
> - ✅ 时间估算：15-23天 → 27-39天（含缓冲 32-47天）
> - ✅ 新增测试用例：~150 个（6 维度全覆盖）
> - ✅ 新增前端模块：3 个（Boost/Nitro/储蓄率）
>
> **🆕 R2 修订（2025-11-01）**：
> - ✅ 修正 vePaimon 锁仓期：2年 → **4年**（与现有 VotingEscrow 一致）
> - ✅ 修正 Boost 倍数：2-2.5x → **1.0-1.5x**（更合理的激励范围）
> - ✅ 发现 DEXRouter 不存在（前端使用测试网 Router，本期不自研）
> - ✅ 手续费实现方式：动态计算（避免精度问题）
> - ✅ 完整参数表：Oracle、esPaimon、Boost、Nitro 等默认值
> - ❌ **发现 PSM 合约严重错误**：当前实现为 USDC↔HYD，应为 USDC↔USDP（需重构）

---

## 目录

1. [新增合约完整清单](#1-新增合约完整清单)
2. [核心合约详细规格](#2-核心合约详细规格)
3. [修改现有合约详细规格](#3-修改现有合约详细规格)
4. [测试用例详细规格](#4-测试用例详细规格)
5. [前端组件详细规格](#5-前端组件详细规格)
6. [部署序列与初始化](#6-部署序列与初始化)
7. [数据迁移方案](#7-数据迁移方案)
8. [性能优化指标](#8-性能优化指标)

---

## 1. 新增合约完整清单

### 1.1 核心代币合约（3 个）

| 合约名称 | 文件路径 | 优先级 | 复杂度 | 估算时间 | 依赖关系 |
|---------|---------|-------|-------|---------|---------|
| **USDP** | `src/core/USDP.sol` | P0 | High | 2 天 | PSM, Treasury |
| **esPaimon** | `src/core/esPaimon.sol` | P0 | Medium | 1.5 天 | RewardDistributor |
| **VotingEscrowPaimon** | `src/core/VotingEscrowPaimon.sol` | P0 | High | 1.5 天 | GaugeController |

### 1.2 激励机制合约（3 个）- 🔴 原计划遗漏

| 合约名称 | 文件路径 | 优先级 | 复杂度 | 估算时间 | 业务价值 |
|---------|---------|-------|-------|---------|---------|
| **BoostStaking** | `src/incentives/BoostStaking.sol` | P0 | Medium | 1.5 天 | 核心激励机制 |
| **NitroPool** | `src/incentives/NitroPool.sol` | P0 | Medium | 1.5 天 | 外部项目引流 |
| **SavingRate** | `src/treasury/SavingRate.sol` | P1 | Low | 1 天 | USDP 持有激励 |

### 1.3 总计

- **新增合约总数**：6 个（原计划 3 个 → 修订后 6 个）
- **估算总工作量**：9 天（合约开发 + 单元测试）
- **关键路径**：USDP → VotingEscrowPaimon → BoostStaking → RewardDistributor 集成

---

## 2. 核心合约详细规格

### 2.1 USDP.sol - 稳定币合约

#### 2.1.1 继承关系
```solidity
contract USDP is ERC20, ERC20Permit, Ownable, ReentrancyGuard
```

#### 2.1.2 状态变量
```solidity
// 累积索引（1e18 精度）
uint256 public accrualIndex;

// 上次累积时间
uint256 public lastAccrualTime;

// 累积间隔（1 天）
uint256 public constant ACCRUAL_INTERVAL = 1 days;

// 分红分发器地址
address public distributor;

// 用户份额映射（内部计数，不暴露给 ERC20）
mapping(address => uint256) private _shares;

// 总份额
uint256 private _totalShares;
```

#### 2.1.3 核心函数

**初始化**
```solidity
constructor() ERC20("USDP Stablecoin", "USDP") ERC20Permit("USDP") {
    accrualIndex = 1e18;
    lastAccrualTime = block.timestamp;
}
```

**累积分红**
```solidity
function accumulate(uint256 rewardAmount) external onlyDistributor {
    require(block.timestamp >= lastAccrualTime + ACCRUAL_INTERVAL, "Too soon");
    require(_totalShares > 0, "No shares");

    // 更新索引：newIndex = oldIndex × (1 + rewardAmount / totalSupply)
    accrualIndex = accrualIndex * (1e18 + rewardAmount * 1e18 / totalSupply()) / 1e18;
    lastAccrualTime = block.timestamp;

    emit AccrualIndexUpdated(accrualIndex, rewardAmount);
}
```

**铸造（份额模式）**
```solidity
function mint(address to, uint256 amount) external onlyMinter nonReentrant {
    uint256 shares = amount * 1e18 / accrualIndex;
    _shares[to] += shares;
    _totalShares += shares;

    emit Transfer(address(0), to, amount);
}
```

**余额查询（份额 × 索引）**
```solidity
function balanceOf(address account) public view override returns (uint256) {
    return _shares[account] * accrualIndex / 1e18;
}
```

**销毁**
```solidity
function burn(address from, uint256 amount) external onlyMinter nonReentrant {
    uint256 shares = amount * 1e18 / accrualIndex;
    require(_shares[from] >= shares, "Insufficient balance");

    _shares[from] -= shares;
    _totalShares -= shares;

    emit Transfer(from, address(0), amount);
}
```

#### 2.1.4 事件
```solidity
event AccrualIndexUpdated(uint256 indexed newIndex, uint256 rewardAmount);
event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
```

#### 2.1.5 安全考虑
- ✅ ReentrancyGuard：所有状态修改函数
- ✅ 精度优化：乘法先于除法 `(shares * accrualIndex) / 1e18`
- ✅ Invariant：`sum(_shares[user]) == _totalShares`
- ✅ Invariant：`totalSupply() == _totalShares * accrualIndex / 1e18`

---

### 2.1.6 PSM.sol - 锚定稳定模块（❌ 需重构）

**❌ 当前实现错误分析**：

| 项目 | ❌ 当前错误实现 | ✅ 正确实现 |
|------|---------------|-----------|
| **目标代币** | HYD (RWA 抵押资产) | USDP (稳定币) |
| **接口** | `IHYD` | `IUSDP` |
| **功能名** | `swapUSDCForHYD` / `swapHYDForUSDC` | `swapUSDCForUSDP` / `swapUSDPForUSDC` |
| **业务目的** | 维持 HYD 锚定（错误逻辑） | 维持 USDP $1 锚定（正确逻辑） |
| **mint cap** | `maxMintedHYD` + `totalMinted` 追踪 | 不需要（USDC 储备即限制） |
| **协议角色** | 与 Treasury 冲突（HYD 应通过 Treasury 铸造） | 补充 Treasury（提供 1:1 套利通道） |

**✅ 正确实现规格**：

#### 2.1.6.1 继承关系
```solidity
contract PSM is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
}
```

#### 2.1.6.2 状态变量
```solidity
// USDP 稳定币地址（immutable）
IUSDP public immutable USDP;

// USDC 储备资产地址（immutable）
IERC20 public immutable USDC;

// 铸造手续费（基点，0 = 0%）
uint256 public feeIn;

// 赎回手续费（基点，0 = 0%）
uint256 public feeOut;

// 最大手续费（10000 = 100%）
uint256 public constant MAX_FEE = 10000;

// 基点分母
uint256 private constant BP_DENOMINATOR = 10000;
```

#### 2.1.6.3 核心函数

**USDC → USDP（铸造）**
```solidity
function swapUSDCForUSDP(uint256 usdcAmount) external nonReentrant returns (uint256 usdpReceived) {
    require(usdcAmount > 0, "PSM: Zero amount");

    // 计算手续费（USDC，6 decimals）
    uint256 feeUSDC = (usdcAmount * feeIn) / BP_DENOMINATOR;
    uint256 usdcAfterFee = usdcAmount - feeUSDC;

    // 转换 USDC (6 decimals) → USDP (18 decimals) - 1:1 价值
    usdpReceived = usdcAfterFee * 1e12;

    // 转账 USDC 到 PSM
    USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

    // 铸造 USDP 给用户
    USDP.mint(msg.sender, usdpReceived);

    emit SwapUSDCForUSDP(msg.sender, usdcAmount, usdpReceived, feeUSDC * 1e12);
}
```

**USDP → USDC（赎回）**
```solidity
function swapUSDPForUSDC(uint256 usdpAmount) external nonReentrant returns (uint256 usdcReceived) {
    require(usdpAmount > 0, "PSM: Zero amount");

    // 计算手续费（USDP，18 decimals）
    uint256 feeUSDP = (usdpAmount * feeOut) / BP_DENOMINATOR;
    uint256 usdpAfterFee = usdpAmount - feeUSDP;

    // 转换 USDP (18 decimals) → USDC (6 decimals) - 1:1 价值
    usdcReceived = usdpAfterFee / 1e12;

    // 检查 USDC 储备
    require(USDC.balanceOf(address(this)) >= usdcReceived, "PSM: Insufficient USDC reserve");

    // 销毁用户的 USDP
    USDP.burnFrom(msg.sender, usdpAmount);

    // 转账 USDC 给用户
    USDC.safeTransfer(msg.sender, usdcReceived);

    emit SwapUSDPForUSDC(msg.sender, usdpAmount, usdcReceived, feeUSDP);
}
```

#### 2.1.6.4 事件
```solidity
event SwapUSDCForUSDP(address indexed user, uint256 usdcIn, uint256 usdpOut, uint256 fee);
event SwapUSDPForUSDC(address indexed user, uint256 usdpIn, uint256 usdcOut, uint256 fee);
event FeeUpdated(string feeType, uint256 newFee);
```

#### 2.1.6.5 安全考虑
- ✅ ReentrancyGuard：所有状态修改函数
- ✅ SafeERC20：兼容 USDT 等非标准 ERC20
- ✅ Immutable 地址：节省 gas
- ✅ 精度处理：先乘后除避免精度损失
- ✅ USDC 储备检查：防止赎回失败
- ✅ Invariant：`USDC_balance >= USDP_minted_via_PSM`

#### 2.1.6.6 套利机制说明

**USDP 价格 < $1.00（例如 $0.98）**：
1. 套利者在 DEX 用 $0.98 买入 1 USDP
2. 通过 PSM 用 1 USDP 兑换 1 USDC（价值 $1.00）
3. 赚取 $0.02 差价
4. **结果**：USDP 需求增加 → 价格回升

**USDP 价格 > $1.00（例如 $1.02）**：
1. 套利者通过 PSM 用 1 USDC 铸造 1 USDP
2. 在 DEX 卖出 1 USDP 获得 $1.02
3. 赚取 $0.02 差价
4. **结果**：USDP 供应增加 → 价格回落

---

### 2.2 BoostStaking.sol - Boost 质押合约（🆕）

#### 2.2.1 继承关系
```solidity
contract BoostStaking is Ownable, ReentrancyGuard
```

#### 2.2.2 状态变量
```solidity
// esPaimon 合约地址
IERC20 public immutable esPaimon;

// 最低质押时长（7 天）
uint256 public constant MIN_STAKE_DURATION = 7 days;

// 最大 Boost 倍数（1.5x）- R2 修正
uint256 public constant MAX_BOOST_MULTIPLIER = 1500; // 150%

// 用户质押信息
struct StakeInfo {
    uint256 amount;        // 质押数量
    uint256 startTime;     // 开始时间
    uint256 unlockTime;    // 解锁时间
}

mapping(address => StakeInfo) public stakes;

// 总质押量
uint256 public totalStaked;
```

#### 2.2.3 核心函数

**质押 esPaimon**
```solidity
function stake(uint256 amount) external nonReentrant {
    require(amount > 0, "Zero amount");

    esPaimon.safeTransferFrom(msg.sender, address(this), amount);

    StakeInfo storage info = stakes[msg.sender];
    info.amount += amount;
    info.startTime = block.timestamp;
    info.unlockTime = block.timestamp + MIN_STAKE_DURATION;

    totalStaked += amount;

    emit Staked(msg.sender, amount, info.unlockTime);
}
```

**解除质押**
```solidity
function unstake(uint256 amount) external nonReentrant {
    StakeInfo storage info = stakes[msg.sender];
    require(info.amount >= amount, "Insufficient stake");
    require(block.timestamp >= info.unlockTime, "Still locked");

    info.amount -= amount;
    totalStaked -= amount;

    esPaimon.safeTransfer(msg.sender, amount);

    emit Unstaked(msg.sender, amount);
}
```

**查询 Boost 倍数**
```solidity
function getBoostMultiplier(address user) external view returns (uint256) {
    StakeInfo memory info = stakes[user];
    if (info.amount == 0) return 10000; // 1.0x (100%)

    // 基础 Boost：每质押 1000 esPaimon = +0.1x（最大 1.5x）- R2 修正
    uint256 boostPoints = info.amount / 1000;
    uint256 multiplier = 10000 + boostPoints * 100;

    // 上限 1.5x
    if (multiplier > MAX_BOOST_MULTIPLIER) {
        multiplier = MAX_BOOST_MULTIPLIER;
    }

    return multiplier; // 返回基点（10000 = 1.0x, 15000 = 1.5x）
}
```

**应用 Boost（由 RewardDistributor 调用）**
```solidity
function applyBoost(uint256 baseReward, address user) external view returns (uint256) {
    uint256 multiplier = getBoostMultiplier(user);
    return baseReward * multiplier / 10000;
}
```

#### 2.2.4 事件
```solidity
event Staked(address indexed user, uint256 amount, uint256 unlockTime);
event Unstaked(address indexed user, uint256 amount);
event BoostApplied(address indexed user, uint256 baseReward, uint256 boostedReward);
```

#### 2.2.5 安全考虑
- ✅ 最低质押时长：防止闪电贷攻击
- ✅ Boost 上限：防止无限放大奖励
- ✅ 线性增长：每 1000 esPaimon = +0.1x（可调参数）
- ✅ 不变量：`totalStaked == sum(stakes[user].amount)`

---

### 2.3 NitroPool.sol - Nitro 激励池合约（🆕）

#### 2.3.1 继承关系
```solidity
contract NitroPool is Ownable, ReentrancyGuard
```

#### 2.3.2 状态变量
```solidity
// Nitro 池信息
struct NitroInfo {
    address creator;           // 创建者（外部项目方）
    address lpToken;           // LP Token 地址
    address rewardToken;       // 奖励代币地址
    uint256 rewardAmount;      // 总奖励数量
    uint256 startTime;         // 开始时间
    uint256 endTime;           // 结束时间
    uint256 minLiquidity;      // 最低流动性要求
    uint256 totalStaked;       // 总质押量
    bool approved;             // 是否通过治理审批
}

// 池 ID → 池信息
mapping(uint256 => NitroInfo) public nitroPools;

// 用户质押信息
mapping(uint256 => mapping(address => uint256)) public userStakes;

// 池计数器
uint256 public poolCount;

// vePaimon 合约（用于治理审批）
address public vePaimon;

// 平台管理费率（2%）
uint256 public constant PLATFORM_FEE = 200; // 2%
```

#### 2.3.3 核心函数

**创建 Nitro 池（需治理审批）**
```solidity
function createNitroPool(
    address lpToken,
    address rewardToken,
    uint256 rewardAmount,
    uint256 duration,
    uint256 minLiquidity
) external nonReentrant returns (uint256) {
    require(duration >= 7 days, "Duration too short");
    require(rewardAmount > 0, "Zero reward");

    IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), rewardAmount);

    uint256 poolId = poolCount++;
    NitroInfo storage pool = nitroPools[poolId];
    pool.creator = msg.sender;
    pool.lpToken = lpToken;
    pool.rewardToken = rewardToken;
    pool.rewardAmount = rewardAmount;
    pool.startTime = block.timestamp;
    pool.endTime = block.timestamp + duration;
    pool.minLiquidity = minLiquidity;
    pool.approved = false; // 需治理审批

    emit NitroPoolCreated(poolId, msg.sender, lpToken, rewardToken, rewardAmount);
    return poolId;
}
```

**治理审批**
```solidity
function approveNitroPool(uint256 poolId) external onlyGovernance {
    require(!nitroPools[poolId].approved, "Already approved");
    nitroPools[poolId].approved = true;
    emit NitroPoolApproved(poolId);
}
```

**参与 Nitro 池**
```solidity
function enterNitro(uint256 poolId, uint256 amount) external nonReentrant {
    NitroInfo storage pool = nitroPools[poolId];
    require(pool.approved, "Not approved");
    require(block.timestamp < pool.endTime, "Pool ended");
    require(amount >= pool.minLiquidity, "Below min liquidity");

    IERC20(pool.lpToken).safeTransferFrom(msg.sender, address(this), amount);

    userStakes[poolId][msg.sender] += amount;
    pool.totalStaked += amount;

    emit NitroEntered(poolId, msg.sender, amount);
}
```

**领取 Nitro 奖励**
```solidity
function claimNitroRewards(uint256 poolId) external nonReentrant {
    NitroInfo storage pool = nitroPools[poolId];
    require(block.timestamp >= pool.endTime, "Pool not ended");

    uint256 userStake = userStakes[poolId][msg.sender];
    require(userStake > 0, "No stake");

    // 奖励 = 用户质押量 / 总质押量 × 总奖励
    uint256 reward = userStake * pool.rewardAmount / pool.totalStaked;

    // 扣除平台管理费（2%）
    uint256 platformFee = reward * PLATFORM_FEE / 10000;
    uint256 userReward = reward - platformFee;

    userStakes[poolId][msg.sender] = 0;

    IERC20(pool.rewardToken).safeTransfer(msg.sender, userReward);
    IERC20(pool.rewardToken).safeTransfer(owner(), platformFee);

    emit NitroRewardClaimed(poolId, msg.sender, userReward);
}
```

#### 2.3.4 事件
```solidity
event NitroPoolCreated(uint256 indexed poolId, address indexed creator, address lpToken, address rewardToken, uint256 rewardAmount);
event NitroPoolApproved(uint256 indexed poolId);
event NitroEntered(uint256 indexed poolId, address indexed user, uint256 amount);
event NitroRewardClaimed(uint256 indexed poolId, address indexed user, uint256 reward);
```

#### 2.3.5 安全考虑
- ✅ 治理审批机制：防止恶意代币
- ✅ 代币白名单：只接受 vePaimon 投票批准的代币
- ✅ 风险提示：前端显著提示"外部奖励代币风险自担"
- ✅ 平台管理费：2% 收益归平台（用于安全审计成本）

---

### 2.4 SavingRate.sol - USDP 储蓄率合约（🆕）

#### 2.4.1 继承关系
```solidity
contract SavingRate is Ownable, ReentrancyGuard
```

#### 2.4.2 状态变量
```solidity
// USDP 合约地址
IUSDP public immutable usdp;

// 用户存款信息
struct Deposit {
    uint256 principal;        // 本金
    uint256 depositTime;      // 存入时间
    uint256 lastClaimTime;    // 上次领取时间
}

mapping(address => Deposit) public deposits;

// 总存款量
uint256 public totalDeposits;

// 年化利率（基点，5% = 500）
uint256 public annualRate;

// 利率上限（20%）
uint256 public constant MAX_ANNUAL_RATE = 2000;

// 单周利率变动上限（20%）
uint256 public constant MAX_WEEKLY_RATE_CHANGE = 2000;

// 上次利率更新时间
uint256 public lastRateUpdateTime;
```

#### 2.4.3 核心函数

**存入 USDP**
```solidity
function deposit(uint256 amount) external nonReentrant {
    require(amount > 0, "Zero amount");

    usdp.safeTransferFrom(msg.sender, address(this), amount);

    Deposit storage dep = deposits[msg.sender];

    // 先领取之前的利息
    if (dep.principal > 0) {
        _claimInterest(msg.sender);
    }

    dep.principal += amount;
    dep.depositTime = block.timestamp;
    dep.lastClaimTime = block.timestamp;

    totalDeposits += amount;

    emit Deposited(msg.sender, amount);
}
```

**取出 USDP（本金 + 利息）**
```solidity
function withdraw(uint256 amount) external nonReentrant {
    Deposit storage dep = deposits[msg.sender];
    require(dep.principal >= amount, "Insufficient balance");

    // 先领取利息
    _claimInterest(msg.sender);

    dep.principal -= amount;
    totalDeposits -= amount;

    usdp.safeTransfer(msg.sender, amount);

    emit Withdrawn(msg.sender, amount);
}
```

**领取利息**
```solidity
function claimInterest() external nonReentrant {
    _claimInterest(msg.sender);
}

function _claimInterest(address user) internal {
    Deposit storage dep = deposits[user];
    if (dep.principal == 0) return;

    uint256 timeElapsed = block.timestamp - dep.lastClaimTime;
    uint256 interest = dep.principal * annualRate * timeElapsed / (10000 * 365 days);

    if (interest > 0) {
        dep.lastClaimTime = block.timestamp;
        usdp.safeTransfer(user, interest);
        emit InterestClaimed(user, interest);
    }
}
```

**更新年化利率（仅 Owner，受单周变动上限限制）**
```solidity
function updateAnnualRate(uint256 newRate) external onlyOwner {
    require(newRate <= MAX_ANNUAL_RATE, "Rate too high");
    require(block.timestamp >= lastRateUpdateTime + 7 days, "Too soon");

    // 单周变动 <20%
    uint256 rateChange = newRate > annualRate
        ? newRate - annualRate
        : annualRate - newRate;
    require(rateChange * 10000 / annualRate <= MAX_WEEKLY_RATE_CHANGE, "Change too large");

    uint256 oldRate = annualRate;
    annualRate = newRate;
    lastRateUpdateTime = block.timestamp;

    emit AnnualRateUpdated(oldRate, newRate);
}
```

**查询累计利息**
```solidity
function pendingInterest(address user) external view returns (uint256) {
    Deposit memory dep = deposits[user];
    if (dep.principal == 0) return 0;

    uint256 timeElapsed = block.timestamp - dep.lastClaimTime;
    return dep.principal * annualRate * timeElapsed / (10000 * 365 days);
}
```

#### 2.4.4 事件
```solidity
event Deposited(address indexed user, uint256 amount);
event Withdrawn(address indexed user, uint256 amount);
event InterestClaimed(address indexed user, uint256 interest);
event AnnualRateUpdated(uint256 oldRate, uint256 newRate);
```

#### 2.4.5 安全考虑
- ✅ 利率上限：年化 20%（防止无限铸币）
- ✅ 单周变动上限：<20%（使用储备金平滑波动）
- ✅ 利息来源验证：RWA 收益提成（Treasury 注入）
- ✅ 精度优化：`(principal × rate × time) / (10000 × 365 days)`

---

## 3. 修改现有合约详细规格

### 3.1 DEXPair.sol - 手续费分配修正（🔴 P0）

#### 3.1.1 现状
```solidity
// 当前手续费分配（70/30）
uint256 public constant VOTER_FEE = 17;      // 0.175% = 70% of 0.25%
uint256 public constant TREASURY_FEE = 8;    // 0.075% = 30% of 0.25%
uint256 public constant TOTAL_FEE = 25;      // 0.25%
```

#### 3.1.2 修正目标（70/30 - 最终确认）
```solidity
// 最终确认手续费分配（70/30）- 保持现有比例
uint256 public constant VOTER_FEE = 17;      // 0.175% = 70% of 0.25%
uint256 public constant TREASURY_FEE = 8;    // 0.075% = 30% of 0.25%
uint256 public constant TOTAL_FEE = 25;      // 0.25% (保持不变)
```

#### 3.1.3 影响分析
- **RewardDistributor.sol**：保持现有手续费收入计算（70/30 比例）
- **BribeMarketplace.sol**：bribe 激励基于 voter fees（保持现有水平）
- **测试用例**：无需更新（保持 70/30 现有预期值）

#### 3.1.4 回滚方案
```solidity
// 如需回滚，只需修改常量并重新部署
uint256 public constant VOTER_FEE = 17;  // 回滚到 70%
uint256 public constant TREASURY_FEE = 8; // 回滚到 30%
```

---

### 3.2 RewardDistributor.sol - Boost 集成

#### 3.2.1 新增状态变量
```solidity
// BoostStaking 合约地址
IBoostStaking public boostStaking;
```

#### 3.2.2 修改分发逻辑
```solidity
function distributeRewards(address user, uint256 baseReward) external {
    // 查询用户 Boost 倍数
    uint256 multiplier = boostStaking.getBoostMultiplier(user);

    // 应用 Boost（1.0x - 2.5x）
    uint256 boostedReward = baseReward * multiplier / 10000;

    // 分发奖励
    _distribute(user, boostedReward);

    emit RewardDistributed(user, baseReward, boostedReward, multiplier);
}
```

#### 3.2.3 新增事件
```solidity
event RewardDistributed(address indexed user, uint256 baseReward, uint256 boostedReward, uint256 multiplier);
```

---

### 3.3 BribeMarketplace.sol - 接受 esPaimon

#### 3.3.1 新增代币白名单
```solidity
// 现有白名单：USDC, USDT
// 新增：esPaimon, USDP

mapping(address => bool) public acceptedTokens;

function addAcceptedToken(address token) external onlyOwner {
    acceptedTokens[token] = true;
    emit TokenWhitelisted(token);
}
```

#### 3.3.2 修改 bribe 创建逻辑
```solidity
function createBribe(
    address token,
    uint256 amount,
    uint256 gaugeId
) external {
    require(acceptedTokens[token], "Token not accepted");
    // 允许 esPaimon 作为 bribe 资产
    // ...
}
```

---

## 4. 测试用例详细规格

### 4.1 新增测试文件（6 个）

#### 4.1.1 test/core/USDP.t.sol（~30 个测试）

**功能测试**（15 个）：
```solidity
testMintAndBurn() // 铸造和销毁
testAccrualIndex() // 累积索引更新
testBalanceOfWithAccrual() // 余额计算（份额 × 索引）
testTransfer() // 转账
testPermit() // EIP-2612 许可
testMultiUserAccrual() // 多用户分红
testZeroSupplyAccrual() // 零供应时累积（应 revert）
testAccrualInterval() // 累积间隔限制
testDistributorOnly() // 仅 distributor 可调用
testMinterOnly() // 仅 minter 可调用
```

**边界测试**（8 个）：
```solidity
testZeroMint() // 铸造 0（应 revert）
testMaxSupply() // 最大供应量
testMinBalance() // 最小余额（1 wei）
testAccrualIndexOverflow() // 索引溢出
testRapidAccrual() // 快速连续累积
testLargeRewardAmount() // 大额奖励（>1M USDP）
testDustShares() // 粉尘份额处理
testRoundingError() // 四舍五入误差
```

**异常测试**（4 个）：
```solidity
testReentrancyMint() // 铸造重入攻击
testReentrancyBurn() // 销毁重入攻击
testUnauthorizedAccrual() // 非授权累积
testInvalidDistributor() // 无效分发器地址
```

**性能测试**（2 个）：
```solidity
testGasMintBatch() // 批量铸造 Gas（<200K）
testGasAccrualBatch() // 批量累积 Gas（<300K）
```

**不变量测试**（1 个）：
```solidity
invariant_totalSupplyMatchesShares() // 总供应 = 总份额 × 索引
```

---

#### 4.1.2 test/incentives/BoostStaking.t.sol（~25 个测试）

**功能测试**（12 个）：
```solidity
testStakeEsPaimon() // 质押 esPaimon
testUnstakeEsPaimon() // 解除质押
testGetBoostMultiplier() // 查询 Boost 倍数
testApplyBoost() // 应用 Boost
testMinStakeDuration() // 最低质押时长
testBoostCap() // Boost 上限 2.5x
testMultipleStakes() // 多次质押累加
testPartialUnstake() // 部分解除质押
testStakeAndReward() // 质押后立即领取奖励
testBoostDecay() // Boost 不衰减（设计决策）
```

**边界测试**（7 个）：
```solidity
testZeroStake() // 质押 0（应 revert）
testUnstakeBeforeUnlock() // 锁定期内解除（应 revert）
testMaxStake() // 最大质押量（达到 2.5x 上限）
testMinBoost() // 最小 Boost（1.0x 无质押）
testBoostOverflow() // Boost 计算溢出
testDustStake() // 粉尘质押（<1 esPaimon）
testExactUnlockTime() // 精确解锁时间边界
```

**安全测试**（4 个）：
```solidity
testFlashLoanAttack() // 闪电贷攻击（7 天锁定期防御）
testReentrancyStake() // 质押重入攻击
testReentrancyUnstake() // 解除质押重入攻击
testUnauthorizedApplyBoost() // 非授权应用 Boost
```

**性能测试**（1 个）：
```solidity
testGasStakeUnstake() // 质押/解除质押 Gas（<150K）
```

**不变量测试**（1 个）：
```solidity
invariant_totalStakedMatchesSum() // 总质押 = sum(用户质押)
```

---

#### 4.1.3 test/incentives/NitroPool.t.sol（~30 个测试）

**功能测试**（15 个）：
```solidity
testCreateNitroPool() // 创建 Nitro 池
testApproveNitroPool() // 治理审批
testEnterNitro() // 参与 Nitro 池
testClaimNitroRewards() // 领取 Nitro 奖励
testMultipleUsers() // 多用户参与
testPoolExpiration() // 池到期
testPlatformFee() // 平台管理费（2%）
testMinLiquidity() // 最低流动性要求
testRewardCalculation() // 奖励计算正确性
testPartialWithdraw() // 部分取出（不支持，设计决策）
```

**边界测试**（8 个）：
```solidity
testZeroReward() // 零奖励（应 revert）
testShortDuration() // 短期池（<7 天，应 revert）
testMaxDuration() // 最长期限（365 天）
testSingleUser() // 单用户独享奖励
testClaimBeforeEnd() // 结束前领取（应 revert）
testClaimTwice() // 重复领取（应 revert）
testBelowMinLiquidity() // 低于最低流动性（应 revert）
testDustReward() // 粉尘奖励（<1 wei）
```

**安全测试**（5 个）：
```solidity
testUnapprovedPoolEntry() // 未审批池参与（应 revert）
testMaliciousToken() // 恶意代币（需治理审批）
testRewardTokenPriceManipulation() // 奖励代币价格操纵
testReentrancyEnter() // 参与重入攻击
testReentrancyClaim() // 领取重入攻击
```

**性能测试**（1 个）：
```solidity
testGasNitroOperations() // Nitro 操作 Gas（<300K）
```

**不变量测试**（1 个）：
```solidity
invariant_rewardsMatchStakes() // 奖励总额 = 质押比例分配
```

---

#### 4.1.4 test/treasury/SavingRate.t.sol（~20 个测试）

**功能测试**（10 个）：
```solidity
testDeposit() // 存入 USDP
testWithdraw() // 取出 USDP
testClaimInterest() // 领取利息
testPendingInterest() // 查询待领利息
testUpdateAnnualRate() // 更新年化利率
testCompoundInterest() // 复利（设计为简单利息）
testMultipleDeposits() // 多次存款
testPartialWithdraw() // 部分取出
testDepositAfterInterest() // 领取利息后再存入
testZeroPrincipal() // 零本金利息
```

**边界测试**（5 个）：
```solidity
testZeroDeposit() // 零存款（应 revert）
testMaxAnnualRate() // 最高年化利率（20%）
testWeeklyRateChangeLimit() // 单周变动上限（20%）
testRapidRateUpdates() // 快速更新利率（应 revert）
testDustInterest() // 粉尘利息（<1 wei）
```

**安全测试**（3 个）：
```solidity
testUnauthorizedRateUpdate() // 非授权更新利率（应 revert）
testReentrancyDeposit() // 存款重入攻击
testReentrancyWithdraw() // 取款重入攻击
```

**性能测试**（1 个）：
```solidity
testGasSavingOperations() // 储蓄操作 Gas（<200K）
```

**不变量测试**（1 个）：
```solidity
invariant_interestSourceVerified() // 利息来源 = RWA 收益提成
```

---

### 4.2 修改现有测试（~50 个测试需更新）

#### 4.2.1 test/dex/DEXPair.t.sol
- 保持现有手续费分配比例：70/30（最终确认）
- 受影响测试：无需修改（保持现有预期值）

#### 4.2.2 test/governance/RewardDistributor.t.sol
- 集成 Boost 倍数计算测试
- 新增 `testBoostIntegration()`
- 受影响测试：~15 个（奖励分发逻辑）

#### 4.2.3 test/governance/BribeMarketplace.t.sol
- 新增 esPaimon 作为 bribe 资产测试
- 受影响测试：~10 个（代币白名单）

#### 4.2.4 test/core/PSM.t.sol

**❌ 当前合约实现错误**：
- **问题**：当前 `src/core/PSM.sol` 实现的是 `USDC ↔ HYD` 兑换
- **应该是**：`USDC ↔ USDP` 兑换（维持 USDP 锚定）
- **影响**：
  - 合约需要完全重构（接口从 `IHYD` 改为 `IUSDP`）
  - 函数名：`swapUSDCForHYD` → `swapUSDCForUSDP`
  - 函数名：`swapHYDForUSDC` → `swapUSDPForUSDC`
  - 移除 `maxMintedHYD` 和 `totalMinted` 追踪（USDP 供应由 USDC 储备支持）
- **正确实现**：见下方 §2.1.X PSM 重构规格

**测试用例**（重构后）：
- USDP → USDC 流程测试
- 受影响测试：~5 个（铸造/赎回逻辑需全部重写）

---

### 4.3 测试覆盖率目标

| 维度 | 目标覆盖率 | 测试数量 | 验收标准 |
|------|-----------|---------|---------|
| **功能测试** | 100% | ~60 个 | 所有核心功能可用 |
| **边界测试** | ≥90% | ~35 个 | 边界条件正确处理 |
| **异常测试** | ≥85% | ~20 个 | 错误处理完善 |
| **性能测试** | 关键路径 | ~8 个 | Gas 优化达标 |
| **安全测试** | 100% | ~15 个 | 无已知漏洞 |
| **不变量测试** | 核心不变量 | ~8 个 | 数学逻辑正确 |
| **总计** | **≥80%** | **~150 个** | Foundry 测试通过 |

---

## 5. 前端组件详细规格

### 5.1 Boost 质押模块（🆕 P0）

#### 5.1.1 页面路径
- 独立页面：`src/app/boost/page.tsx`
- 或嵌入：`src/app/rewards/boost/page.tsx`

#### 5.1.2 核心组件

**BoostStakingCard.tsx**
```typescript
interface BoostStakingCardProps {
  userAddress: string;
  esPaimonBalance: bigint;
  stakedAmount: bigint;
  boostMultiplier: number; // 1.0 - 2.5
  onStake: (amount: bigint) => void;
  onUnstake: (amount: bigint) => void;
}

// 展示内容：
// - 当前 Boost 倍数（大号数字 + 彩色进度条）
// - 已质押 esPaimon 数量
// - 解锁倒计时（如果在 7 天锁定期内）
// - 质押/解除质押按钮
```

**BoostCalculator.tsx**
```typescript
interface BoostCalculatorProps {
  currentStake: bigint;
  currentMultiplier: number;
}

// 功能：
// - 输入框：计划质押数量
// - 实时计算：质押后的 Boost 倍数
// - 预计收益提升：
//   - 当前 APR：20%
//   - Boost 后 APR：35%（1.75x）
//   - 月收益提升：+75%
```

**BoostHistory.tsx**
```typescript
// 展示历史 Boost 操作记录
// - 表格：时间、操作类型（质押/解除质押）、数量、Boost 变化
// - 分页：每页 20 条
// - 导出：CSV 下载
```

#### 5.1.3 Wagmi Hooks
```typescript
// hooks/useBoostStaking.ts
export function useBoostStaking(userAddress: string) {
  const { data: stakedAmount } = useReadContract({
    address: BOOST_STAKING_ADDRESS,
    abi: BoostStakingABI,
    functionName: 'stakes',
    args: [userAddress],
  });

  const { data: boostMultiplier } = useReadContract({
    address: BOOST_STAKING_ADDRESS,
    abi: BoostStakingABI,
    functionName: 'getBoostMultiplier',
    args: [userAddress],
  });

  const { writeContract: stake } = useWriteContract();
  const { writeContract: unstake } = useWriteContract();

  return {
    stakedAmount,
    boostMultiplier: Number(boostMultiplier || 10000n) / 10000, // 1.0 - 2.5
    stake: (amount: bigint) => stake({
      address: BOOST_STAKING_ADDRESS,
      abi: BoostStakingABI,
      functionName: 'stake',
      args: [amount],
    }),
    unstake: (amount: bigint) => unstake({
      address: BOOST_STAKING_ADDRESS,
      abi: BoostStakingABI,
      functionName: 'unstake',
      args: [amount],
    }),
  };
}
```

#### 5.1.4 国际化
```json
// public/locales/zh/boost.json
{
  "title": "Boost 质押",
  "currentBoost": "当前 Boost 倍数",
  "stakedAmount": "已质押 esPaimon",
  "unlockTime": "解锁时间",
  "calculator": "收益计算器",
  "predictedBoost": "预计 Boost 倍数",
  "revenueIncrease": "收益提升"
}

// public/locales/en/boost.json
{
  "title": "Boost Staking",
  "currentBoost": "Current Boost Multiplier",
  "stakedAmount": "Staked esPaimon",
  "unlockTime": "Unlock Time",
  "calculator": "Reward Calculator",
  "predictedBoost": "Predicted Boost",
  "revenueIncrease": "Revenue Increase"
}
```

---

### 5.2 Nitro 池列表模块（🆕 P0）

#### 5.2.1 页面路径
- 独立页面：`src/app/nitro/page.tsx`
- 或嵌入：`src/app/liquidity/nitro/page.tsx`

#### 5.2.2 核心组件

**NitroPoolList.tsx**
```typescript
interface NitroPool {
  poolId: number;
  projectName: string;
  lpToken: string;
  rewardToken: string;
  totalReward: bigint;
  apr: number;
  duration: number; // 天数
  minLiquidity: bigint;
  totalStaked: bigint;
  endTime: number;
  approved: boolean;
}

interface NitroPoolListProps {
  pools: NitroPool[];
  onParticipate: (poolId: number) => void;
}

// 展示内容：
// - 表格：项目名、APR、锁定期限、奖励代币、总质押量、剩余时间
// - 筛选：进行中/已结束、按 APR 排序
// - 风险提示：外部奖励代币风险自担（显著提示）
// - 参与按钮：进入 Nitro 池
```

**NitroParticipateModal.tsx**
```typescript
interface NitroParticipateModalProps {
  pool: NitroPool;
  userLpBalance: bigint;
  onConfirm: (amount: bigint) => void;
  onClose: () => void;
}

// 功能：
// - 显示池详情（项目介绍、奖励代币信息、风险警告）
// - 输入框：质押 LP Token 数量
// - 预计奖励计算：
//   - 假设总质押量不变
//   - 显示预计获得的奖励代币数量
// - 风险确认：勾选"我已了解外部奖励代币风险"
// - 确认/取消按钮
```

**NitroRewardsCard.tsx**
```typescript
// 展示用户已参与的 Nitro 池
// - 我的参与列表（项目名、质押数量、预计奖励）
// - 可领取奖励（池已结束）
// - 一键领取按钮
```

#### 5.2.3 Wagmi Hooks
```typescript
// hooks/useNitroPool.ts
export function useNitroPool() {
  const { data: poolCount } = useReadContract({
    address: NITRO_POOL_ADDRESS,
    abi: NitroPoolABI,
    functionName: 'poolCount',
  });

  const { data: pools } = useContractReads({
    contracts: Array.from({ length: Number(poolCount || 0) }, (_, i) => ({
      address: NITRO_POOL_ADDRESS,
      abi: NitroPoolABI,
      functionName: 'nitroPools',
      args: [i],
    })),
  });

  const { writeContract: enterNitro } = useWriteContract();
  const { writeContract: claimRewards } = useWriteContract();

  return {
    pools,
    enterNitro: (poolId: number, amount: bigint) => enterNitro({
      address: NITRO_POOL_ADDRESS,
      abi: NitroPoolABI,
      functionName: 'enterNitro',
      args: [poolId, amount],
    }),
    claimRewards: (poolId: number) => claimRewards({
      address: NITRO_POOL_ADDRESS,
      abi: NitroPoolABI,
      functionName: 'claimNitroRewards',
      args: [poolId],
    }),
  };
}
```

#### 5.2.4 国际化
```json
// public/locales/zh/nitro.json
{
  "title": "Nitro 激励池",
  "projectName": "项目名称",
  "apr": "年化收益率",
  "lockDuration": "锁定期限",
  "rewardToken": "奖励代币",
  "totalStaked": "总质押量",
  "timeRemaining": "剩余时间",
  "participate": "参与",
  "riskWarning": "⚠️ 外部奖励代币风险自担，平台不对代币价格负责"
}
```

---

### 5.3 储蓄率视图模块（🆕 P1）

#### 5.3.1 页面路径
- 独立页面：`src/app/savings/page.tsx`
- 或嵌入：`src/app/treasury/savings/page.tsx`

#### 5.3.2 核心组件

**SavingsRateCard.tsx**
```typescript
interface SavingsRateCardProps {
  currentApr: number; // 当前年化利率（%）
  totalDeposits: bigint; // 总存款量
  userPrincipal: bigint; // 用户本金
  pendingInterest: bigint; // 待领利息
  onDeposit: (amount: bigint) => void;
  onWithdraw: (amount: bigint) => void;
  onClaimInterest: () => void;
}

// 展示内容：
// - 当前 APR（大号数字 + 趋势图标）
// - 我的存款：本金 + 待领利息
// - 存入/取出/领取利息按钮
// - 利息来源说明：RWA 收益提成（悬停提示）
```

**SavingsDepositModal.tsx**
```typescript
// 存入 USDP 模态框
// - 输入框：存入数量
// - 预计年化收益：
//   - 当前 APR：2%
//   - 月收益：X USDP
//   - 年收益：Y USDP
// - 确认/取消按钮
```

**InterestChart.tsx**
```typescript
interface InterestChartProps {
  historicalData: {
    date: string;
    apr: number;
    interest: bigint;
  }[];
  period: '7d' | '30d' | '90d';
}

// 功能：
// - 折线图：历史 APR 变化（使用 recharts）
// - 柱状图：累计利息（按日/周/月）
// - 周期切换：7 天 / 30 天 / 90 天
// - 导出：PNG 图片下载
```

#### 5.3.3 Wagmi Hooks
```typescript
// hooks/useSavingRate.ts
export function useSavingRate(userAddress: string) {
  const { data: annualRate } = useReadContract({
    address: SAVING_RATE_ADDRESS,
    abi: SavingRateABI,
    functionName: 'annualRate',
  });

  const { data: deposit } = useReadContract({
    address: SAVING_RATE_ADDRESS,
    abi: SavingRateABI,
    functionName: 'deposits',
    args: [userAddress],
  });

  const { data: pendingInterest } = useReadContract({
    address: SAVING_RATE_ADDRESS,
    abi: SavingRateABI,
    functionName: 'pendingInterest',
    args: [userAddress],
  });

  const { writeContract } = useWriteContract();

  return {
    annualRate: Number(annualRate || 0n) / 100, // 转换为百分比
    principal: deposit?.principal || 0n,
    pendingInterest: pendingInterest || 0n,
    deposit: (amount: bigint) => writeContract({
      address: SAVING_RATE_ADDRESS,
      abi: SavingRateABI,
      functionName: 'deposit',
      args: [amount],
    }),
    withdraw: (amount: bigint) => writeContract({
      address: SAVING_RATE_ADDRESS,
      abi: SavingRateABI,
      functionName: 'withdraw',
      args: [amount],
    }),
    claimInterest: () => writeContract({
      address: SAVING_RATE_ADDRESS,
      abi: SavingRateABI,
      functionName: 'claimInterest',
    }),
  };
}
```

#### 5.3.4 国际化
```json
// public/locales/zh/savings.json
{
  "title": "USDP 储蓄",
  "currentApr": "当前年化利率",
  "myDeposit": "我的存款",
  "principal": "本金",
  "pendingInterest": "待领利息",
  "deposit": "存入",
  "withdraw": "取出",
  "claimInterest": "领取利息",
  "interestSource": "利息来源：RWA 收益提成",
  "historicalApr": "历史利率"
}
```

---

### 5.4 前端性能优化

#### 5.4.1 Core Web Vitals 目标
- **LCP (Largest Contentful Paint)** < 2.5s
- **INP (Interaction to Next Paint)** < 200ms
- **CLS (Cumulative Layout Shift)** < 0.1

#### 5.4.2 优化策略
- **代码分割**：每个新增模块独立打包（Boost/Nitro/储蓄率各 <100KB）
- **图片优化**：使用 Next.js Image 组件 + WebP 格式
- **懒加载**：Nitro 池列表虚拟滚动（react-window）
- **骨架屏**：加载状态使用骨架屏而非 Loading 动画
- **字体优化**：预加载 Material Icons + 字体子集化

#### 5.4.3 测量工具
- **Chrome DevTools MCP**（权威测量）：
  ```typescript
  // Phase 0: 测量基线
  mcp__chrome-devtools__navigate_page("http://localhost:4000");
  mcp__chrome-devtools__performance_start_trace(reload=true, autoStop=true);
  const baseline = mcp__chrome-devtools__performance_stop_trace();

  // Phase 4: 对比改造后
  const phase4 = mcp__chrome-devtools__performance_stop_trace();

  // 验收：无回归（LCP/INP/CLS 均不劣于基线）
  ```

---

## 6. 部署序列与初始化

### 6.1 部署顺序（BSC Testnet → Mainnet）

**✅ 核心逻辑**：HYD (RWA 抵押物) → Treasury → USDP → 治理 + DEX → 激励机制

| 步骤 | 合约名称 | 依赖关系 | 初始化参数 | 验证标准 |
|------|---------|---------|-----------|---------|
| **Phase 0: RWA 抵押物基础设施** |
| 0 | **HYD** | - | Mint 初始供应（测试用） | ✅ 标准 ERC20，**作为 RWA 抵押 token** |
| 1 | **RWAPriceOracle** | Chainlink/Custodian | `HYD price=$1.00, deviation=20%` | 价格查询可用 + 断路测试 |
| 2 | **Treasury** | RWAPriceOracle | HYD 白名单（T1, 80% LTV）+ 授权 USDP mint | HYD 存入 → USDP 铸造测试 |
| **Phase 1: 稳定币基础设施** |
| 3 | **USDP** | - | `accrualIndex=1e18` | 铸造/销毁可用 |
| 4 | **PSM** | USDP, USDC | `FEE=0` | USDC↔USDP 1:1 兑换 |
| **Phase 2: 治理代币** |
| 5 | **Paimon** | - | - | 标准 ERC20 |
| 6 | **esPaimon** | Paimon | `VESTING_PERIOD=365 days` | 线性释放测试 |
| 7 | **VotingEscrowPaimon** | Paimon | `MAX_LOCK=4 years` | 锁仓/投票测试，NFT 可转让 |
| **Phase 3: DEX** |
| 8 | **DEXFactory** | - | 动态计算 70/30 | 创建交易对 |
| 9 | **DEXRouter** | DEXFactory | - | 添加流动性（或使用测试网 Router） |
| **Phase 4: 治理机制** |
| 10 | **GaugeController** | vePaimon | `WEEK=7 days` | 投票权重测试 |
| 11 | **BribeMarketplace** | GaugeController | `esPaimon whitelist` | bribe 创建 |
| **Phase 5: 激励机制** |
| 12 | **BoostStaking** | esPaimon | `MIN_STAKE=7 days, MAX_BOOST=1.5x` | Boost 1.0x-1.5x 测试 |
| 13 | **RewardDistributor** | BoostStaking, GaugeController | - | 奖励分发 + Boost |
| 14 | **NitroPool** | vePaimon | `PLATFORM_FEE=200` | 创建池测试 |
| 15 | **SavingRate** | USDP | `annualRate=200 (2%)` | 存取测试 |

### 6.2 初始化脚本示例

```solidity
// script/DeployFull.s.sol
contract DeployFull is Script {
    function run() external {
        vm.startBroadcast();

        // ==================== Phase 0: RWA 抵押物基础设施 ====================

        // Step 0: HYD (新部署，作为 RWA 抵押 token)
        HYD hyd = new HYD("HYD Token", "HYD");
        hyd.mint(DEPLOYER, 1_000_000e18); // Mint 初始供应（测试用）
        console.log("HYD (RWA token) deployed:", address(hyd));

        // Step 1: RWAPriceOracle
        RWAPriceOracle oracle = new RWAPriceOracle(
            CHAINLINK_AGGREGATOR,  // Chainlink price feed
            CUSTODIAN_NAV_ORACLE   // Custodian NAV oracle
        );
        oracle.setDeviationThreshold(2000); // 20% deviation
        oracle.addAsset(address(hyd), CHAINLINK_HYD_FEED); // 配置 HYD 价格源
        console.log("RWAPriceOracle deployed:", address(oracle));

        // Step 2: Treasury
        Treasury treasury = new Treasury(address(oracle));
        treasury.whitelistAsset(address(hyd), Treasury.Tier.T1); // HYD 作为 T1 资产，80% LTV
        console.log("Treasury deployed:", address(treasury));

        // ==================== Phase 1: 稳定币基础设施 ====================

        // Step 3: USDP
        USDP usdp = new USDP();
        usdp.grantRole(usdp.MINTER_ROLE(), address(treasury)); // Treasury 可以 mint USDP
        console.log("USDP deployed:", address(usdp));

        // Step 4: PSM
        PSM psm = new PSM(address(usdp), USDC_ADDRESS);
        usdp.grantRole(usdp.MINTER_ROLE(), address(psm)); // PSM 可以 mint USDP
        console.log("PSM deployed:", address(psm));

        // ==================== Phase 2: 治理代币 ====================

        // Step 5-6: Paimon + esPaimon
        Paimon paimon = new Paimon();
        esPaimon esPaimon = new esPaimon(address(paimon));
        console.log("Paimon deployed:", address(paimon));
        console.log("esPaimon deployed:", address(esPaimon));

        // Step 7: VotingEscrowPaimon (4 years max lock, NFT transferable)
        VotingEscrowPaimon vePaimon = new VotingEscrowPaimon(address(paimon));
        console.log("vePaimon deployed:", address(vePaimon));

        // ==================== Phase 3: DEX ====================

        // Step 8: DEXFactory (70/30 dynamic fee split)
        DEXFactory factory = new DEXFactory(TREASURY_ADDRESS);
        console.log("DEXFactory deployed:", address(factory));

        // Step 9: DEXRouter (optional, or use testnet router)
        // address router = TESTNET_ROUTER_ADDRESS; // Use existing
        DEXRouter router = new DEXRouter(address(factory), WBNB_ADDRESS);
        console.log("DEXRouter deployed:", address(router));

        // ==================== Phase 4: 治理机制 ====================

        // Step 10: GaugeController
        GaugeController gaugeController = new GaugeController(address(vePaimon));
        console.log("GaugeController deployed:", address(gaugeController));

        // Step 11: BribeMarketplace
        BribeMarketplace bribeMarket = new BribeMarketplace(
            address(gaugeController),
            TREASURY_ADDRESS
        );
        bribeMarket.whitelistToken(address(esPaimon)); // 白名单 esPaimon
        console.log("BribeMarketplace deployed:", address(bribeMarket));

        // ==================== Phase 5: 激励机制 ====================

        // Step 12: BoostStaking (1.0x-1.5x)
        BoostStaking boostStaking = new BoostStaking(address(esPaimon));
        console.log("BoostStaking deployed:", address(boostStaking));

        // Step 13: RewardDistributor
        RewardDistributor distributor = new RewardDistributor(
            address(boostStaking),
            address(gaugeController),
            TREASURY_ADDRESS
        );
        console.log("RewardDistributor deployed:", address(distributor));

        // Step 14: NitroPool
        NitroPool nitroPool = new NitroPool(address(vePaimon));
        console.log("NitroPool deployed:", address(nitroPool));

        // Step 15: SavingRate
        SavingRate savingRate = new SavingRate(address(usdp));
        savingRate.updateAnnualRate(200); // 2% APR
        usdp.grantRole(usdp.MINTER_ROLE(), address(savingRate)); // SavingRate 可以 mint 利息
        console.log("SavingRate deployed:", address(savingRate));

        // ==================== 初始化流动性（测试网） ====================

        // 创建 USDP/USDC 交易对
        address pair_USDP_USDC = factory.createPair(address(usdp), USDC_ADDRESS);
        console.log("USDP/USDC pair:", pair_USDP_USDC);

        // 创建 Paimon/USDP 交易对
        address pair_Paimon_USDP = factory.createPair(address(paimon), address(usdp));
        console.log("Paimon/USDP pair:", pair_Paimon_USDP);

        vm.stopBroadcast();
    }
}
```

### 6.3 多签配置

**Treasury 操作**（3-of-5 多签 + 48h Timelock）：
- 签名者：5 个团队成员地址
- Timelock 地址：`0x...`
- 阈值：3 个签名

**紧急暂停**（4-of-7 多签，无 Timelock）：
- 签名者：7 个团队 + 社区成员地址
- 阈值：4 个签名
- 可暂停合约：Treasury, PSM, DEXFactory, GaugeController

---

## 7. 数据迁移方案

### 7.1 迁移场景分析

**场景 A：无既有部署（全新部署）**
- ✅ 直接部署新架构
- ✅ 无数据迁移需求
- ✅ 最简单方案

**场景 B：测试网已有 HYD 部署（推荐）**
- 方案 B1：并行部署
  - HYD 与 USDP 路线并存
  - HYD 只读（冻结铸造）
  - 提供 HYD → USDP 兑换入口（1:1 快照）
  - 逐步下线 HYD 铸造

- 方案 B2：快照迁移
  - 冻结 HYD 合约
  - 快照所有 HYD 持有者
  - 1:1 空投 USDP
  - 发布迁移指南

### 7.2 推荐迁移流程（方案 B1）

**Phase 1：准备期（1 周）**
1. 部署全套 USDP 架构（测试网）
2. 冻结 HYD 新铸造（保留赎回）
3. 发布迁移公告（中英文）

**Phase 2：并行期（2 周）**
1. 开放 HYD → USDP 兑换入口
2. veHYD 持有者可迁移至 vePaimon（保留剩余锁仓时长）
3. 前端同时展示 HYD 和 USDP 数据

**Phase 3：过渡期（4 周）**
1. HYD 流动性逐步迁移至 USDP 池
2. 激励倾斜：USDP 池 APR > HYD 池 APR
3. 每周发布迁移进度报告

**Phase 4：下线期（2 周）**
1. 关闭 HYD 铸造（仅保留赎回）
2. 删除 HYD 相关前端页面
3. 归档 HYD 合约（只读模式）

---

## 8. 性能优化指标

### 8.1 Gas 优化目标

| 操作 | 当前 Gas | 目标 Gas | 优化策略 |
|------|---------|---------|---------|
| **USDP 铸造** | - | <120K | 份额模式 + storage 打包 |
| **USDP 累积** | - | <150K | 批量更新索引 |
| **esPaimon 质押** | - | <130K | 单次 storage 写入 |
| **Boost 应用** | - | <50K | view 函数（无 gas） |
| **Nitro 参与** | - | <200K | 最小化 storage 写入 |
| **储蓄存取** | - | <150K | 简单利息公式 |
| **DEX 交易**（修正后） | ~200K | <220K | 手续费分配简化 |

### 8.2 前端性能目标

| 指标 | 基线（Phase 0） | 目标（Phase 4） | 测量工具 |
|------|---------------|---------------|---------|
| **LCP** | _待测量_ | <2.5s | Chrome DevTools MCP |
| **INP** | _待测量_ | <200ms | Chrome DevTools MCP |
| **CLS** | _待测量_ | <0.1 | Chrome DevTools MCP |
| **首屏加载** | _待测量_ | <3s | Lighthouse |
| **Bundle 大小**（Boost 模块） | - | <100KB | webpack-bundle-analyzer |
| **Bundle 大小**（Nitro 模块） | - | <120KB | webpack-bundle-analyzer |

### 8.3 合约部署 Gas 成本估算

| 合约 | 估算部署 Gas | BSC Testnet 成本（GWEI=3） | BSC Mainnet 成本（GWEI=5） |
|------|------------|---------------------------|---------------------------|
| USDP | ~2.5M | 0.0075 BNB | 0.0125 BNB |
| esPaimon | ~2.0M | 0.006 BNB | 0.01 BNB |
| VotingEscrowPaimon | ~3.0M | 0.009 BNB | 0.015 BNB |
| BoostStaking | ~1.8M | 0.0054 BNB | 0.009 BNB |
| NitroPool | ~2.2M | 0.0066 BNB | 0.011 BNB |
| SavingRate | ~1.5M | 0.0045 BNB | 0.0075 BNB |
| **总计** | **~13M** | **~0.039 BNB** (~$20) | **~0.065 BNB** (~$33) |

---

## 9. 文档维护清单

### 9.1 必须更新的文档
- ✅ `README.md` - 项目概览、快速开始
- ✅ `ARCHITECTURE.md` - 架构图、合约交互流程
- ✅ `DEVELOPMENT.md` - 开发指南、测试指南
- ✅ `.ultra/docs/prd.md` - 产品需求文档（确认手续费分配）
- ✅ `.ultra/docs/tech.md` - 技术规格文档（确认经济模型）
- ✅ `.ultra/tasks/tasks.json` - 任务分解（基于修订计划）

### 9.2 新增文档
- 🆕 `docs/BOOST.md` - Boost 机制详细说明
- 🆕 `docs/NITRO.md` - Nitro 插件使用指南
- 🆕 `docs/SAVINGS.md` - 储蓄率机制说明
- 🆕 `docs/MIGRATION.md` - HYD → USDP 迁移指南
- 🆕 `docs/DEPLOYMENT.md` - 部署手册（测试网 + 主网）

---

## 10. 验收总结

### 10.1 合约验收清单

- [ ] **USDP**：accrualIndex 正确，PSM 1:1 兑换通过
- [ ] **esPaimon**：线性释放/提前退出罚则正确，与 Bribe/Distributor 联调通过
- [ ] **vePaimon**：锁仓/权重/衰减/投票/快照正确，Gauge 流程完整
- [ ] **BoostStaking**：esPaimon 质押 → Boost 倍数计算 → 奖励提升 2-2.5x
- [ ] **NitroPool**：外部项目设置激励池 → LP 领取额外奖励 → 平台收取管理费
- [ ] **SavingRate**：USDP 存入 → 按 APR 累计利息 → 赎回时获得本金+利息
- [ ] **手续费分配**：DEX 交易 → 70% 归属 ve 投票者、30% 入国库（最终确认）
- [ ] **测试覆盖**：≥80% 整体覆盖，关键路径 100%，新增 ~150 个测试用例

### 10.2 前端验收清单

- [ ] **Boost 展示**：显示当前 Boost 倍数、质押数量、预计收益提升
- [ ] **Nitro 池**：显示外部项目池列表、APR、参与按钮
- [ ] **储蓄率视图**：显示 USDP 储蓄 APR、存入金额、累计利息曲线
- [ ] **Core Web Vitals**：LCP<2.5s, INP<200ms, CLS<0.1
- [ ] **性能对比**：Phase 0 基线 vs Phase 4 改造后（无回归）
- [ ] **i18n 完整**：中英文翻译覆盖所有新增术语

### 10.3 安全验收清单

- [ ] **Boost 攻击防御**：闪电贷攻击被阻止（最低质押 7 天）
- [ ] **Nitro 风险提示**：外部代币风险警告显著展示
- [ ] **精度损失测试**：USDP accrualIndex 累积误差 <0.01%
- [ ] **Reentrancy**：所有 state-changing 函数受保护
- [ ] **AccessControl**：权限控制测试通过
- [ ] **Oracle 断路**：>20% 偏离触发暂停
- [ ] **多签+Timelock**：3-of-5 多签、48 小时延迟生效

---

## 11. 时间估算总结（与基础版本一致）

| Phase | 原计划 | 修订后 | 增幅 | 原因 |
|-------|-------|-------|------|------|
| **Phase 0** | 1-2天 | 2-3天 | +33% | +经济模型对齐会议、+性能基线测量 |
| **Phase 1** | 5-8天 | 9-13天 | +62% | +Boost/Nitro/储蓄率合约、+手续费修正 |
| **Phase 2** | 3-5天 | 5-7天 | +40% | +Nitro 治理流程、+Boost 计算集成 |
| **Phase 3** | 4-6天 | 6-9天 | +50% | +Boost/Nitro/储蓄率前端模块 |
| **Phase 4** | 3-4天 | 5-7天 | +75% | +安全测试、+性能对比 |
| **总计** | **16-25天** | **27-39天** | **+56%** | 基于遗漏功能和风险缓解 |

**含 20% 缓冲**：**32-47 天**

---

## 12. 后续动作（与基础版本一致）

### 立即执行（Phase 0）
1. **经济模型最终确认**（✅ 已完成）：
   - ✅ 手续费分配：**70/30**（70% 归属 ve 投票者、30% 入国库）
   - ✅ vePaimon 转让性：**可转让**（NFT 支持 transfer）
   - 确认 esPaimon 衰减率：每周 1% 还是 2%？

2. **前端性能基线测量**（0.5 天）：
   - 使用 chrome-devtools MCP 测量当前 LCP/INP/CLS
   - 记录基线数据用于 Phase 4 对比

3. **创建改造分支**：
   - 分支名：`feat/usdp-vepaimon-full`
   - 保护主分支，冻结部署操作

### Phase 1-4 执行（按修订计划）
- **Week 1-2**：核心代币 + 手续费修正（P0）
- **Week 3-4**：Boost + Nitro + 储蓄率（P0+P1）
- **Week 5-6**：治理对齐 + 前端改造
- **Week 7**：验证与发布

---

**修订历史**：
- **2025-11-01 基础版本**：`transform-plan.md`（已修正 3 个严重遗漏、1 个重大偏差）
- **2025-11-01 详细版本**：`transform-plan-revised.md`（本文档，包含完整合约规格、测试用例、前端组件、部署序列）

**修订依据**：`.ultra/docs/研究报告-改造计划准确性评估-2025-11-01.md`

---

**关键交付物汇总**：

| 交付物 | 数量 | 估算工作量 | 验收标准 |
|-------|------|-----------|---------|
| **新增合约** | 6 个 | 9 天 | 单元测试通过，覆盖率 ≥80% |
| **修改合约** | 6 个 | 3 天 | 集成测试通过，不变量保持 |
| **新增测试** | ~150 个 | 5 天 | 6 维度全覆盖 |
| **修改测试** | ~50 个 | 2 天 | 预期值更新正确 |
| **前端组件** | 3 个模块 | 6 天 | Core Web Vitals 达标 |
| **部署脚本** | 1 个 | 1 天 | 测试网验证通过 |
| **文档更新** | 5 个 | 2 天 | 中英文完整 |
| **总计** | - | **28 天** | **含缓冲 34 天** |

---

## 🆕 R2 修订补充（2025-11-01）

> 本节为 **R2 二次修订**，对文档进行全面细化与关键纠正。若与前文描述有冲突，**以本节为准**。

### R2.1 关键参数最终确认

#### R2.1.1 决策确认表

| 参数 | 最终值 | 说明 | 修订原因 |
|------|-------|------|---------|
| **vePaimon 锁仓期** | **1 周 ~ 4 年** | 线性衰减权重 | 与现有 VotingEscrow.sol 保持一致 |
| **Boost 倍数范围** | **1.0x ~ 1.5x** | 质押 esPaimon 收益提升 | 2-2.5x 过大，改为适中激励 |
| **esPaimon 衰减率** | **1% / 周** | 仅影响 Boost 质押权重 | 不影响 365 天线性解锁进度 |
| **USDP 分红模式** | **SavingRate 池** | RWA 年化 5% → 2% 分配 | 采用存款生息模式 |
| **Nitro 奖励代币** | **开放 ERC20 + 白名单** | Owner 动态管理白名单 | 灵活性与安全性平衡 |
| **DEX 手续费分配** | **70% / 30%** | 动态计算，非固定常量 | 最终确认比例，避免精度问题 |
| **Oracle 偏离阈值** | **20%** (2000 bps) | 触发断路切换 Pyth | 仅部署参数配置 |

#### R2.1.2 完整参数表（默认值）

| 类别 | 参数名称 | 默认值 | 单位 | 可调整 | 调整权限 |
|------|---------|-------|------|-------|---------|
| **DEX** | 总手续费率 | 25 | bp (0.25%) | ❌ 固定 | - |
| **DEX** | Voter 分配比例 | 70 | % | ✅ | Owner |
| **DEX** | Treasury 分配比例 | 30 | % | ✅ | Owner |
| **ve锁仓** | 最小锁仓期 | 1 | 周 | ❌ 固定 | - |
| **ve锁仓** | 最大锁仓期 | 4 | 年 | ❌ 固定 | - |
| **Boost** | 最小质押时长 | 7 | 天 (1 Epoch) | ✅ | Owner |
| **Boost** | 最大倍数 | 1.5 | x | ✅ | Owner |
| **Boost** | 权重衰减率 | 1 | % / 周 | ✅ | Owner |
| **esPaimon** | 线性解锁周期 | 365 | 天 | ❌ 固定 | - |
| **esPaimon** | 提前退出罚则 | 剩余占比 | 线性 | ❌ 固定 | - |
| **SavingRate** | 默认 APR | 2 | % | ✅ | Owner |
| **SavingRate** | 最大 APR | 20 | % | ❌ 固定 | - |
| **SavingRate** | 单周变动上限 | 20 | % | ❌ 固定 | - |
| **Bribe** | 平台管理费 | 2 | % | ✅ | Owner |
| **Nitro** | 平台管理费 | 2 | % | ✅ | Owner |
| **Oracle** | 偏离阈值 | 20 | % | ✅ | Owner |
| **Oracle** | 最老价时延 | 1 | 小时 | ✅ | Owner |
| **Oracle** | 恢复延迟 | 30 | 分钟 | ✅ | Owner |

---

### R2.2 关键技术纠正

#### R2.2.1 DEXRouter 不存在问题 ⚠️

**发现**：
```
现状：代码库当前不存在 DEXRouter.sol
仅存在：DEXFactory.sol、DEXPair.sol
```

**解决方案**（KISS/YAGNI 原则）：
- ✅ 前端使用测试网 Router 地址（配置文件 `nft-paimon-frontend/src/config/chains/testnet.ts`）
- ✅ 本期**不自研 Router**（复用现有测试网基础设施）
- ✅ 配置文件添加注释说明：
  ```typescript
  // src/config/chains/testnet.ts
  export const testnetConfig = {
    dex: {
      factory: '0x...',  // 我们部署的 DEXFactory
      router: '0x...',   // 使用测试网现有 Router（非自研）
    }
  };
  ```

**影响**：
- 前端路由逻辑无需修改
- 节省 Router 开发与测试时间（约 2-3 天）
- 降低安全审计复杂度

---

#### R2.2.2 手续费分配实现方式修正

**现状问题**：
```solidity
// 当前 DEXPair.sol 实现
uint256 public constant VOTER_FEE = 17;      // 实际 = 68%
uint256 public constant TREASURY_FEE = 8;    // 实际 = 32%
// 与最终确认的 70/30 接近，但仍需动态计算以精确实现
```

**R2 修正方案（动态计算）**：

```solidity
// 删除固定拆分常量，改为动态计算

// 步骤 1：计算总手续费
uint256 fee = (amountIn * TOTAL_FEE) / FEE_DENOMINATOR;

// 步骤 2：按 70/30 切分（最终确认）
uint256 voterShare = (fee * 7) / 10;         // 70%
uint256 treasuryShare = fee - voterShare;    // 30%（避免精度问题）

// 步骤 3：累积到各自账户
voterFees0 += voterShare;                     // 假设 token0
treasuryFees0 += treasuryShare;

// 步骤 4：保持 K 不变量校验
// K 校验在"净额"（扣除手续费后）上下文中执行
```

**优势**：
- ✅ 精确实现 70/30 分配（25bp × 70% = 17.5bp，动态计算无舍入误差）
- ✅ 消除常量维护重复（DRY 原则）
- ✅ 易于调整分配比例（仅修改 7/10 系数）
- ✅ 精度损失最小化（先乘后除）

---

#### R2.2.3 vePaimon 锁仓期修正

**之前错误**：1 周 ~ **2 年**

**R2 修正**：1 周 ~ **4 年**

**原因**：
- 复用现有 `VotingEscrow.sol` 的时间常量 `MAXTIME = 4 years`
- 保持与 PRD 一致（PRD 明确提到 4 年锁仓）
- 与 Curve 等主流 ve 模型对齐

**实现**：
```solidity
// src/core/VotingEscrowPaimon.sol
contract VotingEscrowPaimon is VotingEscrow {
    constructor(address _paimon) VotingEscrow(_paimon) {
        // 继承 MAXTIME = 4 years
        // 继承 WEEK = 7 days
    }

    // 权重计算公式不变
    // power = amount × (lockEnd - now) / MAXTIME
}
```

**🆕 vePaimon NFT 可转让性**：

**最终确认**：vePaimon NFT **支持转让**（transferable）

**实现**：
- ✅ 继承 OpenZeppelin `ERC721` 标准（自动支持 `transferFrom`）
- ✅ 不覆写 `_transfer` 为 revert（保持默认可转让）
- ✅ 权重随 NFT 转移（新持有人继承剩余锁仓期和投票权）

**业务影响**：
- ✅ 允许二级市场交易（提高流动性）
- ✅ 支持 OTC 转让和质押品用途
- ⚠️  需注意：转让后投票历史不可追溯（新持有人获得全部权重）

**代码确认**：
```solidity
// src/core/VotingEscrowPaimon.sol
contract VotingEscrowPaimon is VotingEscrow {
    // 不覆写 _transfer，保持 NFT 可转让
    // function _transfer() internal override { revert("non-transferable"); } // ❌ 不添加此行
}
```

---

#### R2.2.4 Boost 倍数修正（1.0x ~ 1.5x）

**之前设定**：2.0x ~ 2.5x（过大）

**R2 修正**：**1.0x ~ 1.5x**（适中）

**修正原因**：
1. **7 天最低质押时长**相对较短（不足以支撑 2.5x 高倍数）
2. **esPaimon 本身已是激励代币**（叠加 Boost 不宜过高）
3. **参考行业实践**：
   - GMX: esGMX 质押约 1.3-1.5x 收益提升
   - Convex: 额外 10-20% Boost
   - Curve: 1.0x - 2.5x（但 veCRV 锁仓长达 4 年）

**实现修正**：
```solidity
// 修正前
uint256 public constant MAX_BOOST_MULTIPLIER = 2500;  // 2.5x

// 修正后
uint256 public constant MAX_BOOST_MULTIPLIER = 1500;  // 1.5x

// 倍数计算公式不变
function getBoostMultiplier(address user) external view returns (uint256) {
    StakeInfo memory info = stakes[user];
    if (info.amount == 0) return 10000;  // 1.0x

    // 每质押 1000 esPaimon = +0.1x
    uint256 boostPoints = info.amount / 1000;
    uint256 multiplier = 10000 + boostPoints * 100;

    // 上限 1.5x
    if (multiplier > 1500) {
        multiplier = 1500;
    }

    return multiplier;  // 10000 = 1.0x, 15000 = 1.5x
}
```

**示例**：
- 质押 0 esPaimon → **1.0x** Boost
- 质押 2,500 esPaimon → **1.25x** Boost
- 质押 5,000 esPaimon → **1.5x** Boost（达到上限）
- 质押 10,000 esPaimon → **1.5x** Boost（维持上限）

**效果评估**：
- ✅ 非质押用户仍有竞争力（基础收益 100%）
- ✅ 质押用户获得适度奖励（最高 +50%）
- ✅ 避免"必须质押才能参与"的强制效应
- ✅ 保持经济模型平衡

---

### R2.3 esPaimon Boost 衰减机制详解

**关键设计**：esPaimon 有两个独立的时间维度

#### 维度 1：365 天线性解锁（不衰减）
```solidity
// 解锁进度：每天解锁 1/365
uint256 vestedAmount = totalAmount * (now - startTime) / 365 days;

// 用户可领取：claim()
function claim() external {
    uint256 vested = calculateVested(msg.sender);
    paimon.transfer(msg.sender, vested);  // 释放为 Paimon
}

// 提前退出罚则：剩余未归集占比线性罚没
uint256 penalty = unvestedAmount * progressPercentage / 100;
```

**特点**：
- ✅ 解锁进度**不受 Boost 衰减影响**
- ✅ 365 天后完全归集为 Paimon
- ✅ 提前退出罚金默认注入 RewardDistributor 奖励池

#### 维度 2：Boost 质押权重衰减（1% / 周）
```solidity
// 质押权重随时间衰减
uint256 epochsElapsed = (now - stakeTime) / 1 weeks;
uint256 effectiveStake = rawStake * (100 - epochsElapsed)^epochsElapsed / 100^epochsElapsed;

// 或使用简化公式（避免指数运算）
uint256 decayFactor = 10000 - (epochsElapsed * 100);  // 每周 -1%
uint256 effectiveStake = rawStake * decayFactor / 10000;
```

**特点**：
- ✅ **仅影响 Boost 倍数计算**，不影响 esPaimon 解锁
- ✅ 激励用户定期 restake（刷新衰减）
- ✅ 防止"一次质押永久 Boost"
- ✅ 与 Gauge 周期（7 天）对齐

**示例**：
| 质押时长 | 原始质押 | 有效质押 | Boost 倍数 | 说明 |
|---------|---------|---------|-----------|------|
| 0 周 | 5000 esPaimon | 5000 | 1.5x | 初始 |
| 10 周 | 5000 esPaimon | 4500 | 1.45x | 衰减 10% |
| 20 周 | 5000 esPaimon | 4000 | 1.4x | 衰减 20% |
| 50 周 | 5000 esPaimon | 2500 | 1.25x | 衰减 50% |
| 100 周 | 5000 esPaimon | 0 | 1.0x | 衰减至 0 |

**操作建议**：
- 用户应定期 `restake()` 刷新 Boost 权重
- 或在衰减至阈值时重新质押

---

### R2.4 USDP 份额模式详解

**账户记账方式**：
```solidity
// 用户余额 = 用户份额 × 累积索引
userBalance = _shares[user] * accrualIndex / 1e18

// 接口
mint(to, shares)           // 铸造份额
burn(from, shares)         // 销毁份额
setAccrualIndex(newIndex)  // 更新索引（仅金库）

// 不变量
totalSupply == _totalShares * accrualIndex / 1e18
```

**优势**：
- ✅ 避免 rebase（减少外部集成影响）
- ✅ 精度损失最小化（1e18 精度）
- ✅ Gas 优化（份额不变，仅索引更新）

**SavingRate 池设计**：
```solidity
// 存款获得 srShares
function deposit(uint256 amount) external {
    uint256 shares = amount * 1e18 / srIndex;
    srShares[msg.sender] += shares;
    usdp.transferFrom(msg.sender, address(this), amount);
}

// 取款按份额兑换 USDP
function withdraw(uint256 shares) external {
    uint256 amount = shares * srIndex / 1e18;
    srShares[msg.sender] -= shares;
    usdp.transfer(msg.sender, amount);
}

// 金库注资提升 srIndex
function fund(uint256 amount) external onlyTreasury {
    usdp.transferFrom(msg.sender, address(this), amount);
    // srIndex 自动提升（因 poolUSDPBalance 增加）
}
```

**利息来源**：
- RWA 年化收益 5% → 提取 2% 注入 SavingRate
- 协议手续费 10% 国库部分 → 部分注入

---

### R2.5 Oracle 参数配置

**部署参数**（无需代码修改）：

```solidity
// PriceOracle 构造函数参数
constructor(
    address _chainlink,
    address _pyth,
    uint256 _deviationThreshold,  // 2000 bps = 20%
    uint256 _maxStalePeriod,      // 1 hour
    uint256 _recoveryDelay        // 30 minutes
) { ... }
```

**断路逻辑**：
1. 链接 Chainlink 与 Pyth 双源
2. 价格偏离 >20% → 触发断路
3. 断路期间使用 Pyth 价格
4. 恢复延迟 30 分钟后重新检查

**优势**：
- ✅ 仅配置参数，无需代码改动
- ✅ 灵活调整阈值（Owner 权限）
- ✅ 双源保障价格安全

---

### R2.6 部署清单与初始化

**✅ 核心逻辑**：HYD (RWA 抵押物) → Treasury → USDP → 治理 + DEX → 激励机制

**部署顺序**（BSC Testnet）：

| 步骤 | 合约 | 构造参数 | 初始化操作 | 验证标准 |
|------|------|---------|-----------|---------|
| **Phase 0: RWA 抵押物基础设施** |
| 0 | **HYD** | - | Mint 初始供应（测试用） | ✅ 标准 ERC20，**作为 RWA 抵押 token** |
| 1 | **RWAPriceOracle** | Chainlink, Custodian NAV | `deviation=20%, stale=1h, recovery=30m` + 配置 HYD 价格源 | 价格查询测试 + 断路测试 |
| 2 | **Treasury** | RWAPriceOracle | HYD 白名单（T1, 80% LTV）+ 授权 USDP mint | HYD 存入 → USDP 铸造测试 |
| **Phase 1: 稳定币基础设施** |
| 3 | **USDP** | - | `accrualIndex = 1e18` + 授权 Treasury/PSM | 铸造/销毁测试 |
| 4 | **PSM** | USDP, USDC | `FEE = 0` + 授权 USDP mint | USDC↔USDP 1:1 兑换 |
| **Phase 2: 治理代币** |
| 5 | **Paimon** | - | - | 标准 ERC20 |
| 6 | **esPaimon** | Paimon | `VESTING_PERIOD = 365 days` | 线性解锁测试 |
| 7 | **VotingEscrowPaimon** | Paimon | `MAXTIME = 4 years` | 锁仓/投票测试，NFT 可转让 |
| **Phase 3: DEX** |
| 8 | **DEXFactory** | Treasury | 动态计算 70/30 | 创建 USDP/USDC、Paimon/USDP 交易对 |
| 9 | **DEXRouter** | DEXFactory, WBNB | - | 添加流动性测试（或使用测试网 Router） |
| **Phase 4: 治理机制** |
| 10 | **GaugeController** | vePaimon | `WEEK = 7 days` | 投票权重测试 |
| 11 | **BribeMarketplace** | GaugeController | 白名单 esPaimon | bribe 创建测试 |
| **Phase 5: 激励机制** |
| 12 | **BoostStaking** | esPaimon | `MIN_STAKE = 7 days, MAX_BOOST = 1500 (1.5x)` | Boost 倍数测试 |
| 13 | **RewardDistributor** | BoostStaking, GC | - | 奖励分发 + Boost 测试 |
| 14 | **NitroPool** | vePaimon | `PLATFORM_FEE = 200` | 创建池测试 |
| 15 | **SavingRate** | USDP | `annualRate = 200 (2%)` + 授权 USDP mint | 存取 + 利息测试 |

**初始化脚本示例**：
```bash
# 设置白名单
cast send $NITRO_POOL "whitelist(address,bool)" $esPAIMON true
cast send $BRIBE_MARKETPLACE "whitelist(address,bool)" $esPAIMON true

# 设置 Oracle 参数
cast send $ORACLE "setDeviationThreshold(uint256)" 2000  # 20%

# 设置国库地址
cast send $DEXFACTORY "setTreasury(address)" $TREASURY
cast send $REWARD_DISTRIBUTOR "setTreasury(address)" $TREASURY
```

---

### R2.7 任务分解更新

基于 R2 修订，更新 `.ultra/tasks/tasks.json`：

**新增任务**：
- [ ] **Task-R2-01**：修改 DEXPair.sol 手续费计算为动态方式（2天）
- [ ] **Task-R2-02**：调整 BoostStaking 上限从 2.5x 到 1.5x（0.5天）
- [ ] **Task-R2-03**：实现 esPaimon Boost 衰减机制（1天）
- [ ] **Task-R2-04**：添加 DEXRouter 配置说明文档（0.5天）
- [ ] **Task-R2-05**：更新所有测试用例预期值（Boost 1.5x）（1天）
- [ ] **Task-R2-06**：前端配置测试网 Router 地址（0.5天）
- [ ] **Task-R2-07**：创建完整参数表文档（0.5天）

**估算调整**：
- 原估算：27-39 天
- R2 新增：约 6 天
- **最终估算**：**33-45 天**（含缓冲 40-54 天）

---

### R2.8 风险与缓解（R2 新增）

#### 高优先级风险

1. **Boost 倍数降低影响用户预期**（Medium）
   - **风险**：从 2.5x 降至 1.5x，已公布的用户可能不满
   - **缓解**：在公告中强调"更合理的经济模型"+"保持非质押用户竞争力"

2. **DEXRouter 依赖测试网基础设施**（Medium）
   - **风险**：测试网 Router 不稳定或停服
   - **缓解**：前端保留自研 Router 集成接口，必要时快速切换

3. **手续费动态计算的 Gas 成本**（Low）
   - **风险**：动态计算比固定常量多消耗 Gas
   - **缓解**：Gas 增幅 <5%（可接受），优先保证代码质量

#### 中优先级风险

4. **esPaimon Boost 衰减的用户理解成本**（Medium）
   - **风险**：用户混淆"解锁进度"与"Boost 衰减"
   - **缓解**：前端清晰区分展示两个维度，添加教程提示

5. **vePaimon 4 年锁仓门槛过高**（Low）
   - **风险**：用户不愿锁仓 4 年
   - **缓解**：支持 1 周 ~ 4 年灵活选择，短期锁仓也可获得投票权

---

### R2.9 验收标准更新

**R2 新增验收标准**：

#### 合约验收
- [ ] ✅ **DEXPair 手续费**：动态计算 70/30（最终确认），测试通过
- [ ] ✅ **BoostStaking 倍数**：1.0x - 1.5x 范围正确，上限强制执行
- [ ] ✅ **esPaimon 衰减**：Boost 权重按周衰减 1%，解锁进度不受影响
- [ ] ✅ **vePaimon 锁仓**：1 周 ~ 4 年，权重线性衰减，**NFT 可转让**
- [ ] ✅ **SavingRate**：存取测试通过，利息计算正确

#### 前端验收
- [ ] ✅ **Boost 显示**：倍数范围 1.0x - 1.5x，衰减进度可视化
- [ ] ✅ **Router 配置**：测试网 Router 地址正确，交易正常
- [ ] ✅ **参数表文档**：中英文完整，所有参数有说明

#### 文档验收
- [ ] ✅ **R2 修订说明**：所有关键修正点清晰列出
- [ ] ✅ **参数表**：完整且可导出为 JSON
- [ ] ✅ **决策确认**：所有冲突点已解决

---

**R2 修订完成时间**：2025-11-01
**下一步**：执行 Phase 0（经济模型对齐会议）

