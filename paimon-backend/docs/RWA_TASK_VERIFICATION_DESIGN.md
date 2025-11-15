# RWA 任务验证引擎设计文档

## 概述

复杂 RWA 任务验证引擎，用于验证用户在链上的 RWA 相关行为，支持时间维度和复杂条件组合。

## 任务类型定义

### 1. HOLD_RWA_ASSET - 持有 RWA 资产满 N 天

**场景**: 用户在 Treasury 中存入 RWA collateral 并持有满指定天数

**验证逻辑**:
- 追踪用户首次存款时间（从 Treasury.Deposit 事件）
- 验证当前仍持有资产（余额 > 0）
- 计算持有时长 = 当前时间 - 首次存款时间

**Config 示例**:
```json
{
  "type": "HOLD_RWA_ASSET",
  "collateralType": "T1_US_TREASURY",
  "minimumAmount": "1000000000000000000000",  // 1000 USDT worth
  "holdDays": 30
}
```

**Verification Data**:
```json
{
  "firstDepositTime": "2025-01-01T00:00:00Z",
  "currentBalance": "5000000000000000000000",
  "holdDuration": 45,
  "verified": true
}
```

---

### 2. MAINTAIN_HEALTH_FACTOR - 保持健康因子高于阈值

**场景**: 用户在 N 天内保持健康因子始终高于阈值（如 1.5）

**验证逻辑**:
- 定期快照用户健康因子（每天一次）
- 检查所有快照是否都 >= 阈值
- 验证快照覆盖完整时间范围

**Config 示例**:
```json
{
  "type": "MAINTAIN_HEALTH_FACTOR",
  "minimumHealthFactor": "1.5",
  "durationDays": 7,
  "snapshotIntervalHours": 24
}
```

**Verification Data**:
```json
{
  "snapshots": [
    {"timestamp": "2025-01-01T00:00:00Z", "healthFactor": "1.8"},
    {"timestamp": "2025-01-02T00:00:00Z", "healthFactor": "1.65"}
  ],
  "minimumHF": "1.65",
  "allAboveThreshold": true,
  "verified": true
}
```

---

### 3. MINT_USDP_AMOUNT - 铸造 USDP 达到金额

**场景**: 用户累计铸造 USDP 达到指定金额

**验证逻辑**:
- 统计用户在 USDPVault 中的所有铸造事件
- 累加铸造金额
- 验证累计金额 >= 目标金额

**Config 示例**:
```json
{
  "type": "MINT_USDP_AMOUNT",
  "targetAmount": "10000000000000000000000",  // 10,000 USDP
  "startTime": "2025-01-01T00:00:00Z"
}
```

**Verification Data**:
```json
{
  "totalMinted": "15000000000000000000000",
  "mintEvents": [
    {"timestamp": "2025-01-05", "amount": "5000000000000000000000"},
    {"timestamp": "2025-01-15", "amount": "10000000000000000000000"}
  ],
  "verified": true
}
```

---

### 4. PROVIDE_LIQUIDITY - 提供流动性达到金额和时长

**场景**: 用户在 DEX Pool 中提供流动性，金额和时长都满足要求

**验证逻辑**:
- 查询用户 LP token 余额
- 追踪首次提供流动性时间
- 验证金额 >= 最小金额 AND 时长 >= 最小时长

**Config 示例**:
```json
{
  "type": "PROVIDE_LIQUIDITY",
  "poolAddress": "0x...",
  "minimumLiquidity": "1000000000000000000000",  // 1000 USD worth
  "minimumDays": 14
}
```

**Verification Data**:
```json
{
  "currentLiquidity": "2500000000000000000000",
  "firstProvidedTime": "2025-01-01T00:00:00Z",
  "holdDuration": 20,
  "verified": true
}
```

---

### 5. EARN_STABILITY_POOL - 在稳定池中赚取收益

**场景**: 用户在 StabilityPool 中存款并获得收益达到目标

**验证逻辑**:
- 查询用户在 StabilityPool 的存款
- 计算已获得的收益（PAIMON 奖励）
- 验证收益 >= 目标收益

**Config 示例**:
```json
{
  "type": "EARN_STABILITY_POOL",
  "minimumDeposit": "5000000000000000000000",  // 5000 USDP
  "targetRewards": "100000000000000000000",    // 100 PAIMON
  "minimumDays": 7
}
```

**Verification Data**:
```json
{
  "currentDeposit": "8000000000000000000000",
  "totalRewards": "150000000000000000000",
  "depositDuration": 10,
  "verified": true
}
```

---

## 架构设计

### 目录结构

```
app/services/rwa_task/
├── __init__.py
├── web3_provider.py           # Web3 连接管理
├── contract_manager.py        # 合约实例管理（ABI 加载）
├── task_verifier.py           # 任务验证器基类
├── verifiers/
│   ├── __init__.py
│   ├── hold_rwa_asset.py
│   ├── maintain_health_factor.py
│   ├── mint_usdp.py
│   ├── provide_liquidity.py
│   └── earn_stability_pool.py
├── cache_manager.py           # Redis 缓存优化
└── verification_service.py    # 主验证服务
```

### 核心组件

#### 1. Web3Provider

```python
class Web3Provider:
    """Web3 连接管理"""

    def __init__(self, rpc_url: str, chain_id: int):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.chain_id = chain_id

    async def get_block(self, block_number: int | str) -> dict:
        """获取区块信息"""

    async def get_logs(self, filter_params: dict) -> list[dict]:
        """查询事件日志"""
```

#### 2. ContractManager

```python
class ContractManager:
    """合约实例管理"""

    def __init__(self, w3: Web3, addresses: dict):
        self.w3 = w3
        self.addresses = addresses
        self.contracts = {}

    def get_contract(self, name: str) -> Contract:
        """获取合约实例（懒加载）"""

    def load_abi(self, contract_name: str) -> dict:
        """从 out/ 目录加载 ABI"""
```

#### 3. BaseTaskVerifier

```python
class BaseTaskVerifier(ABC):
    """任务验证器基类"""

    def __init__(
        self,
        w3_provider: Web3Provider,
        contract_mgr: ContractManager,
        cache_mgr: CacheManager
    ):
        self.w3 = w3_provider
        self.contracts = contract_mgr
        self.cache = cache_mgr

    @abstractmethod
    async def verify(
        self,
        address: str,
        config: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        """
        验证任务完成情况

        Returns:
            (verified: bool, verification_data: dict)
        """
```

#### 4. CacheManager

```python
class CacheManager:
    """Redis 缓存管理"""

    VERIFICATION_CACHE_PREFIX = "rwa:verify:"
    VERIFICATION_CACHE_TTL = timedelta(minutes=10)

    async def get_verification_result(
        self,
        address: str,
        task_id: str
    ) -> dict[str, Any] | None:
        """获取缓存的验证结果"""

    async def set_verification_result(
        self,
        address: str,
        task_id: str,
        result: dict[str, Any]
    ) -> bool:
        """缓存验证结果（10 分钟 TTL）"""
```

#### 5. VerificationService

```python
class VerificationService:
    """主验证服务"""

    def __init__(
        self,
        w3_provider: Web3Provider,
        contract_mgr: ContractManager,
        cache_mgr: CacheManager,
        db: AsyncSession
    ):
        self.w3 = w3_provider
        self.contracts = contract_mgr
        self.cache = cache_mgr
        self.db = db

        # 注册验证器
        self.verifiers = {
            "HOLD_RWA_ASSET": HoldRWAAssetVerifier(...),
            "MAINTAIN_HEALTH_FACTOR": MaintainHealthFactorVerifier(...),
            "MINT_USDP_AMOUNT": MintUSDPAmountVerifier(...),
            "PROVIDE_LIQUIDITY": ProvideLiquidityVerifier(...),
            "EARN_STABILITY_POOL": EarnStabilityPoolVerifier(...)
        }

    async def verify_task(
        self,
        address: str,
        task_id: str,
        task_config: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        """
        验证任务

        1. 检查缓存
        2. 调用对应验证器
        3. 更新 PostgreSQL
        4. 缓存结果
        """
```

---

## 性能优化策略

### 1. Redis 缓存

- **缓存键**: `rwa:verify:{address}:{task_id}`
- **TTL**: 10 分钟
- **缓存内容**: 完整验证结果（包括 verification_data）
- **失效策略**: TTL 自动过期 + 手动失效（用户操作后）

### 2. 批量查询

- 使用 `eth_getLogs` 批量获取事件
- 使用 `multicall` 批量查询合约状态（如果需要）

### 3. 异步处理

- 使用 `asyncio` 并发查询多个数据源
- 使用 `httpx.AsyncClient` 进行异步 RPC 调用

---

## 错误处理

### 1. RPC 错误

- 捕获网络超时、连接失败
- 自动重试（最多 3 次）
- 降级策略：返回缓存结果或错误提示

### 2. 合约调用错误

- 验证合约地址有效性
- 处理 ABI 解析错误
- 记录错误日志

### 3. 数据不一致

- 验证区块链数据完整性
- 处理重组（reorganization）情况

---

## 测试策略

### 1. 单元测试

- 每个验证器独立测试
- Mock Web3 调用（使用 pytest-mock）
- 测试边界条件

### 2. 集成测试

- 使用 BSC Testnet 真实数据
- 测试完整验证流程
- 测试缓存机制

### 3. 性能测试

- 验证 <2s 响应时间
- 并发测试（100 个并发请求）
- 缓存命中率测试

---

## 部署配置

### 环境变量

```bash
# 已有配置
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97

# 新增配置（如需要）
WEB3_REQUEST_TIMEOUT=30  # RPC 请求超时（秒）
WEB3_MAX_RETRIES=3       # 最大重试次数
```

### 合约地址配置

从 `deployments/testnet/addresses.json` 加载，包括：
- Treasury: 0x0BdBeC0efe5f3Db5b771AB095aF1A7051B304E05
- USDPVault: 0x94E9F52F90609a6941ACc20996CCF9F738Eb22A1
- StabilityPool: 0x594D48f69B14D3f22fa18682F48Bd6fBcB829dA0
- DEXFactory: 0xc32F700393F6d9d39b4f3b30ceF02e7A0795DB5A

---

## 参考资料

- Web3.py Documentation: https://web3py.readthedocs.io/
- BSC Testnet: https://testnet.bscscan.com/
- Paimon Contracts: paimon-rwa-contracts/src/
