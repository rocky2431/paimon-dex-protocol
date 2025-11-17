# Launchpad 模块 API 规范

**模块**: Launchpad (ProjectRegistry, IssuanceController)
**版本**: v1.0
**最后更新**: 2025-11-17

---

## 📋 合约列表

| 合约名称 | 地址 | 用途 |
|---------|------|------|
| **ProjectRegistry** | `addresses.ProjectRegistry` | RWA 项目注册与审批 |
| **IssuanceController** | `addresses.IssuanceController` | RWA 资产发行与管理 |

---

## 1. ProjectRegistry (项目注册)

### 1.1 合约概述

ProjectRegistry 管理 RWA 项目的提交、审核和批准流程。

**核心特性**:
- ✅ 去中心化项目提交
- ✅ 治理投票审批（veNFT 权重）
- ✅ 三层资产分级（T1/T2/T3）
- ✅ IPFS 元数据存储

### 1.2 核心函数

#### 1.2.1 registerProject - 提交项目

```solidity
/**
 * @notice 提交 RWA 项目申请
 * @param _name 项目名称
 * @param _tier 资产分级（T1=0, T2=1, T3=2）
 * @param _targetRaise 目标募资额（USDC, 6 decimals）
 * @param _metadataURI IPFS 元数据 URI
 * @return projectId 项目 ID
 */
function registerProject(
    string memory _name,
    AssetTier _tier,
    uint256 _targetRaise,
    string memory _metadataURI
) external payable returns (uint256 projectId);
```

**调用示例**:
```javascript
async function submitRWAProject(projectData) {
  const {
    name,
    tier, // 0=T1, 1=T2, 2=T3
    targetRaise,
    metadataURI // "ipfs://Qm..."
  } = projectData;

  // 1. 查询注册费
  const registrationFee = await publicClient.readContract({
    address: addresses.ProjectRegistry,
    abi: registryABI,
    functionName: 'registrationFee'
  });

  console.log(`📝 注册费: ${formatUnits(registrationFee, 18)} BNB`);

  // 2. 提交项目
  const { result: projectId } = await publicClient.simulateContract({
    address: addresses.ProjectRegistry,
    abi: registryABI,
    functionName: 'registerProject',
    args: [
      name,
      tier,
      parseUnits(targetRaise, 6), // USDC 6 decimals
      metadataURI
    ],
    value: registrationFee
  });

  const registerHash = await walletClient.writeContract({
    address: addresses.ProjectRegistry,
    abi: registryABI,
    functionName: 'registerProject',
    args: [name, tier, parseUnits(targetRaise, 6), metadataURI],
    value: registrationFee
  });

  await publicClient.waitForTransactionReceipt({ hash: registerHash });

  console.log(`✅ 项目已提交: ID #${projectId}`);
  console.log(`📊 名称: ${name}`);
  console.log(`📈 分级: T${tier + 1}`);
  console.log(`💵 目标: ${targetRaise} USDC`);

  return { projectId, txHash: registerHash };
}

// 示例: 提交 6 个月期美债项目
await submitRWAProject({
  name: "US Treasury 6M T-Bill Pool Q1",
  tier: 0, // T1
  targetRaise: "1000000", // 100 万 USDC
  metadataURI: "ipfs://QmXyz...abc"
});
```

**元数据格式（IPFS JSON）**:
```json
{
  "name": "US Treasury 6M T-Bill Pool Q1",
  "description": "6个月期美国国债池，托管于 Fireblocks，年化收益率 5.25%",
  "assetType": "US Treasury",
  "tier": "T1",
  "targetRaise": "1000000",
  "currency": "USDC",
  "maturity": "2025-07-01",
  "expectedAPR": "5.25%",
  "custodian": "Fireblocks",
  "auditor": "Deloitte",
  "legalEntity": "Paimon Treasury Fund I LLC (Delaware)",
  "kycProvider": "Blockpass",
  "documents": [
    {
      "type": "Prospectus",
      "url": "ipfs://Qm...prospectus.pdf"
    },
    {
      "type": "Audit Report",
      "url": "ipfs://Qm...audit.pdf"
    },
    {
      "type": "Legal Opinion",
      "url": "ipfs://Qm...legal.pdf"
    }
  ],
  "images": {
    "logo": "ipfs://Qm...logo.png",
    "banner": "ipfs://Qm...banner.jpg"
  },
  "socialLinks": {
    "website": "https://treasury.paimon.dex",
    "twitter": "https://twitter.com/paimon_dex"
  }
}
```

**事件**:
```solidity
event ProjectRegistered(
    uint256 indexed projectId,
    address indexed issuer,
    string name,
    AssetTier tier,
    uint256 targetRaise,
    string metadataURI
);
```

**可能的错误**:
```solidity
error InsufficientRegistrationFee(uint256 paid, uint256 required);
error InvalidAssetTier(uint8 tier);
error EmptyProjectName();
error InvalidMetadataURI();
```

---

#### 1.2.2 getProjectInfo - 查询项目信息

```solidity
/**
 * @notice 查询项目详细信息
 * @param _projectId 项目 ID
 * @return Project struct (name, issuer, tier, status, etc.)
 */
function getProjectInfo(uint256 _projectId) external view returns (Project memory);
```

**调用示例**:
```javascript
async function getProjectDetails(projectId) {
  const project = await publicClient.readContract({
    address: addresses.ProjectRegistry,
    abi: registryABI,
    functionName: 'getProjectInfo',
    args: [projectId]
  });

  console.log(`📊 项目 #${projectId} 详情:`);
  console.log(`  名称: ${project.name}`);
  console.log(`  发行方: ${project.issuer}`);
  console.log(`  分级: T${project.tier + 1}`);
  console.log(`  状态: ${getStatusName(project.status)}`);
  console.log(`  目标募资: ${formatUnits(project.targetRaise, 6)} USDC`);
  console.log(`  元数据: ${project.metadataURI}`);

  // 从 IPFS 获取元数据
  const metadata = await fetch(`https://ipfs.io/ipfs/${project.metadataURI.replace('ipfs://', '')}`)
    .then(r => r.json());

  console.log(`  年化收益率: ${metadata.expectedAPR}`);
  console.log(`  托管方: ${metadata.custodian}`);

  return { project, metadata };
}

function getStatusName(status) {
  const names = ['待审核', '已批准', '已拒绝', '进行中', '已完成', '已清算'];
  return names[status] || '未知';
}
```

---

#### 1.2.3 approveProject - 批准项目（仅治理）

```solidity
/**
 * @notice 批准项目（仅治理角色）
 * @param _projectId 项目 ID
 */
function approveProject(uint256 _projectId) external onlyGovernance;
```

**事件**:
```solidity
event ProjectApproved(uint256 indexed projectId, uint256 timestamp);
```

---

#### 1.2.4 rejectProject - 拒绝项目（仅治理）

```solidity
/**
 * @notice 拒绝项目（仅治理角色）
 * @param _projectId 项目 ID
 * @param _reason 拒绝原因
 */
function rejectProject(uint256 _projectId, string memory _reason) external onlyGovernance;
```

**事件**:
```solidity
event ProjectRejected(
    uint256 indexed projectId,
    string reason,
    uint256 timestamp
);
```

---

### 1.3 完整 ProjectRegistry ABI

```javascript
const PROJECT_REGISTRY_ABI = [
  // Read functions
  {
    name: 'getProjectInfo',
    type: 'function',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'issuer', type: 'address' },
          { name: 'tier', type: 'uint8' },
          { name: 'status', type: 'uint8' },
          { name: 'targetRaise', type: 'uint256' },
          { name: 'metadataURI', type: 'string' },
          { name: 'createdAt', type: 'uint256' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    name: 'registrationFee',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'projectCount',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'registerProject',
    type: 'function',
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_tier', type: 'uint8' },
      { name: '_targetRaise', type: 'uint256' },
      { name: '_metadataURI', type: 'string' }
    ],
    outputs: [{ name: 'projectId', type: 'uint256' }],
    stateMutability: 'payable'
  },
  {
    name: 'approveProject',
    type: 'function',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'rejectProject',
    type: 'function',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_reason', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'ProjectRegistered',
    type: 'event',
    inputs: [
      { indexed: true, name: 'projectId', type: 'uint256' },
      { indexed: true, name: 'issuer', type: 'address' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'tier', type: 'uint8' },
      { indexed: false, name: 'targetRaise', type: 'uint256' },
      { indexed: false, name: 'metadataURI', type: 'string' }
    ]
  },
  {
    name: 'ProjectApproved',
    type: 'event',
    inputs: [
      { indexed: true, name: 'projectId', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    name: 'ProjectRejected',
    type: 'event',
    inputs: [
      { indexed: true, name: 'projectId', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ]
  }
];
```

---

## 2. IssuanceController (资产发行)

### 2.1 合约概述

IssuanceController 管理 RWA 资产的发行、认购和生命周期。

**核心特性**:
- ✅ KYC 白名单机制
- ✅ 阶梯式分红（季度/半年度）
- ✅ 到期自动赎回
- ✅ NAV 实时定价

### 2.2 核心函数

#### 2.2.1 participate - 参与认购

```solidity
/**
 * @notice 参与 RWA 资产认购（需通过 KYC）
 * @param _projectId 项目 ID
 * @param _usdcAmount USDC 投资额（6 decimals）
 */
function participate(uint256 _projectId, uint256 _usdcAmount) external;
```

**调用示例**:
```javascript
async function participateInLaunchpad(projectId, investmentAmount) {
  // 1. 检查 KYC 状态
  const isWhitelisted = await publicClient.readContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'isWhitelisted',
    args: [walletClient.account.address]
  });

  if (!isWhitelisted) {
    throw new Error('❌ 需要完成 KYC 认证。请访问 https://kyc.paimon.dex');
  }

  // 2. 查询项目信息
  const issuance = await publicClient.readContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'issuances',
    args: [projectId]
  });

  const now = Math.floor(Date.now() / 1000);
  if (now < issuance.startTime || now > issuance.endTime) {
    throw new Error('❌ 认购期已结束');
  }

  if (issuance.raised >= issuance.targetRaise) {
    throw new Error('❌ 已达到募资上限');
  }

  // 3. 检查最小投资额
  const minInvestment = issuance.minInvestment;
  if (parseUnits(investmentAmount, 6) < minInvestment) {
    throw new Error(`❌ 最小投资额: ${formatUnits(minInvestment, 6)} USDC`);
  }

  // 4. 批准 USDC
  const approveHash = await walletClient.writeContract({
    address: addresses.USDC,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.IssuanceController, parseUnits(investmentAmount, 6)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 5. 参与认购
  const participateHash = await walletClient.writeContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'participate',
    args: [projectId, parseUnits(investmentAmount, 6)]
  });

  console.log(`✅ 认购成功: ${investmentAmount} USDC`);
  console.log(`📊 预计获得: ${investmentAmount} pToken (1:1 比例)`);

  return participateHash;
}

// 示例: 投资 1000 USDC
await participateInLaunchpad(42, '1000');
```

**事件**:
```solidity
event ParticipationReceived(
    uint256 indexed projectId,
    address indexed participant,
    uint256 usdcAmount,
    uint256 tokenAmount  // pToken 数量（1:1）
);
```

**可能的错误**:
```solidity
error NotWhitelisted(address user);                    // 未通过 KYC
error IssuanceNotActive(uint256 projectId);            // 认购期未开始或已结束
error BelowMinimumInvestment(uint256 amount, uint256 minimum);
error ExceedsTargetRaise(uint256 raised, uint256 target);
```

---

#### 2.2.2 claimDividend - 领取分红

```solidity
/**
 * @notice 领取项目分红
 * @param _projectId 项目 ID
 * @param _dividendRound 分红轮次（0=Q1, 1=Q2, etc.）
 */
function claimDividend(uint256 _projectId, uint256 _dividendRound) external;
```

**调用示例**:
```javascript
async function claimProjectDividend(projectId, round) {
  // 1. 查询可领取分红
  const claimable = await publicClient.readContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'claimableDividend',
    args: [projectId, round, walletClient.account.address]
  });

  console.log(`💰 可领取分红: ${formatUnits(claimable, 6)} USDC`);

  if (claimable === 0n) {
    console.log('⚠️ 暂无可领取分红');
    return null;
  }

  // 2. 领取
  const claimHash = await walletClient.writeContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'claimDividend',
    args: [projectId, round]
  });

  return claimHash;
}

// 示例: 领取 Q1 分红
await claimProjectDividend(42, 0);
```

**事件**:
```solidity
event DividendClaimed(
    uint256 indexed projectId,
    address indexed participant,
    uint256 round,
    uint256 amount
);
```

---

#### 2.2.3 redeem - 到期赎回

```solidity
/**
 * @notice 到期赎回本金（销毁 pToken）
 * @param _projectId 项目 ID
 * @param _amount pToken 数量（18 decimals）
 */
function redeem(uint256 _projectId, uint256 _amount) external;
```

**调用示例**:
```javascript
async function redeemMaturedAsset(projectId, amount) {
  // 1. 查询项目到期时间
  const issuance = await publicClient.readContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'issuances',
    args: [projectId]
  });

  const now = Math.floor(Date.now() / 1000);
  if (now < issuance.maturityDate) {
    const daysRemaining = Math.floor((issuance.maturityDate - now) / 86400);
    throw new Error(`❌ 未到期，剩余 ${daysRemaining} 天`);
  }

  // 2. 查询 pToken 余额
  const pTokenAddress = issuance.pToken;
  const balance = await publicClient.readContract({
    address: pTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletClient.account.address]
  });

  console.log(`💼 pToken 余额: ${formatUnits(balance, 18)}`);

  // 3. 赎回
  const redeemHash = await walletClient.writeContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'redeem',
    args: [projectId, parseUnits(amount, 18)]
  });

  console.log(`✅ 赎回成功: ${amount} pToken → ${amount} USDC`);

  return redeemHash;
}

// 示例: 赎回全部到期资产
await redeemMaturedAsset(42, '1000');
```

**事件**:
```solidity
event Redeemed(
    uint256 indexed projectId,
    address indexed participant,
    uint256 pTokenAmount,
    uint256 usdcAmount
);
```

**可能的错误**:
```solidity
error NotMatured(uint256 projectId, uint256 maturityDate);
error InsufficientBalance(uint256 requested, uint256 available);
```

---

#### 2.2.4 getNAV - 查询实时净值

```solidity
/**
 * @notice 查询项目的实时 NAV（Net Asset Value）
 * @param _projectId 项目 ID
 * @return navPerToken 每 pToken 的 NAV（6 decimals USDC）
 */
function getNAV(uint256 _projectId) external view returns (uint256 navPerToken);
```

**调用示例**:
```javascript
async function getProjectNAV(projectId) {
  const nav = await publicClient.readContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'getNAV',
    args: [projectId]
  });

  const navValue = Number(formatUnits(nav, 6));

  console.log(`📊 实时 NAV: ${navValue.toFixed(4)} USDC/pToken`);

  // 计算相对于面值的涨跌幅
  const parValue = 1.0; // 初始面值
  const change = ((navValue - parValue) / parValue) * 100;

  console.log(`📈 相对面值: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);

  return { nav, navValue, change };
}

// 示例: 查询项目 42 的 NAV
await getProjectNAV(42);
```

---

### 2.3 完整 IssuanceController ABI

```javascript
const ISSUANCE_CONTROLLER_ABI = [
  // Read functions
  {
    name: 'issuances',
    type: 'function',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'pToken', type: 'address' },
          { name: 'targetRaise', type: 'uint256' },
          { name: 'raised', type: 'uint256' },
          { name: 'minInvestment', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'maturityDate', type: 'uint256' },
          { name: 'status', type: 'uint8' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    name: 'isWhitelisted',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'claimableDividend',
    type: 'function',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_round', type: 'uint256' },
      { name: '_user', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'getNAV',
    type: 'function',
    inputs: [{ name: '_projectId', type: 'uint256' }],
    outputs: [{ name: 'navPerToken', type: 'uint256' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'participate',
    type: 'function',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_usdcAmount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'claimDividend',
    type: 'function',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_dividendRound', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'redeem',
    type: 'function',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'ParticipationReceived',
    type: 'event',
    inputs: [
      { indexed: true, name: 'projectId', type: 'uint256' },
      { indexed: true, name: 'participant', type: 'address' },
      { indexed: false, name: 'usdcAmount', type: 'uint256' },
      { indexed: false, name: 'tokenAmount', type: 'uint256' }
    ]
  },
  {
    name: 'DividendClaimed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'projectId', type: 'uint256' },
      { indexed: true, name: 'participant', type: 'address' },
      { indexed: false, name: 'round', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ]
  },
  {
    name: 'Redeemed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'projectId', type: 'uint256' },
      { indexed: true, name: 'participant', type: 'address' },
      { indexed: false, name: 'pTokenAmount', type: 'uint256' },
      { indexed: false, name: 'usdcAmount', type: 'uint256' }
    ]
  },
  {
    name: 'DividendPaid',
    type: 'event',
    inputs: [
      { indexed: true, name: 'projectId', type: 'uint256' },
      { indexed: false, name: 'round', type: 'uint256' },
      { indexed: false, name: 'totalAmount', type: 'uint256' }
    ]
  }
];
```

---

## 3. 集成示例：完整 Launchpad 流程

```javascript
/**
 * 完整流程: KYC → 浏览项目 → 参与认购 → 领取分红 → 到期赎回
 */
async function fullLaunchpadJourney() {
  // Step 1: KYC 认证（链下流程）
  console.log('Step 1: KYC 认证...');
  console.log('访问: https://kyc.paimon.dex');
  console.log('上传护照、地址证明，等待 Blockpass 审核');

  // Step 2: 浏览项目
  console.log('Step 2: 浏览可用项目...');
  const projectCount = await publicClient.readContract({
    address: addresses.ProjectRegistry,
    abi: registryABI,
    functionName: 'projectCount'
  });

  console.log(`📊 总项目数: ${projectCount}`);

  for (let i = 1; i <= Number(projectCount); i++) {
    const { project, metadata } = await getProjectDetails(i);
    if (project.status === 1) { // 已批准
      console.log(`\n🎯 项目 #${i}: ${project.name}`);
      console.log(`  年化收益: ${metadata.expectedAPR}`);
      console.log(`  到期日: ${metadata.maturity}`);
    }
  }

  // Step 3: 参与认购
  console.log('\nStep 3: 参与项目 #42...');
  const projectId = 42;
  await participateInLaunchpad(projectId, '1000');

  // Step 4: 监控 NAV
  console.log('\nStep 4: 监控资产净值...');
  setInterval(async () => {
    await getProjectNAV(projectId);
  }, 3600 * 1000); // 每小时

  // Step 5: 领取分红（Q1, Q2）
  console.log('\nStep 5: 领取季度分红...');
  await claimProjectDividend(projectId, 0); // Q1
  await claimProjectDividend(projectId, 1); // Q2

  // Step 6: 到期赎回
  console.log('\nStep 6: 到期赎回本金...');
  await redeemMaturedAsset(projectId, '1000');

  console.log('\n✅ 完整 Launchpad 流程执行完毕');
  console.log('📊 总收益: 分红 + 本金返还');
}
```

---

## 4. KYC 集成指南

### 4.1 Blockpass 集成流程

```javascript
// 前端集成 Blockpass Widget
import { BlockpassKYCConnect } from '@blockpass/kyc-connect';

const blockpassWidget = new BlockpassKYCConnect({
  clientId: 'paimon_dex_prod',
  env: 'prod',
  refId: walletAddress, // 用户钱包地址
  onComplete: async (data) => {
    console.log('✅ KYC 完成:', data);

    // 调用后端 API 更新白名单
    await fetch('https://api.paimon.dex/kyc/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletAddress,
        blockpassId: data.blockpassId
      })
    });
  }
});

blockpassWidget.startKYCConnect();
```

### 4.2 白名单查询

```javascript
async function checkKYCStatus(userAddress) {
  const isWhitelisted = await publicClient.readContract({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    functionName: 'isWhitelisted',
    args: [userAddress]
  });

  if (isWhitelisted) {
    console.log('✅ KYC 已通过，可参与 Launchpad');
  } else {
    console.log('❌ 请先完成 KYC 认证');
    console.log('👉 https://kyc.paimon.dex');
  }

  return isWhitelisted;
}
```

---

**下一步**: [Treasury 模块 API](./treasury-api.md) - Treasury, RWAPriceOracle
