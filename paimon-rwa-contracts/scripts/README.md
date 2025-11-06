# Tooling Scripts

该目录收纳了链上排放模型与审计打包流程相关的辅助脚本。

## 1. `sync_audit_package.sh`

> **目标**：保持 `audit-package/contracts/src` 与主合约目录 `src` 100% 一致，避免平行修改。

**用法**

```bash
./scripts/sync_audit_package.sh
```

**行为**

- 使用 `rsync` 将 `src` 中的 Solidity 合约同步到审计包镜像目录。
- 启用 `--delete`，确保删除主目录文件时镜像同步删除，彻底杜绝漂移。
- 该目录被视为生成物；任何直接修改都会在下一次同步时被覆盖。

建议在 CI 中新增一步执行此脚本并调用 `git diff --exit-code`，确保提交前两棵树完全一致。

## 2. `generate-phase-b-table.py`

- 状态：**Legacy**。在最新的链上实现中，Phase-B 排放已改为实时指数公式，不再依赖查表常量。
- 保留原因：便于审计或离线对照历史数组值，如需复现旧版本数据仍可运行该脚本。
- 依赖：Python ≥3.8，无第三方库。

## 3. `generate-emission-schedule.py`

- 功能：生成 352 周排放 JSON，便于前端或运营核对。
- 当前实现遵循链上版本：
  - Phase A（Week 1-12）：固定 `37,500,000` PAIMON/周。
  - Phase B（Week 13-248）：指数衰减，初始 `37,500,000 × 0.985^(week-13)`。
  - Phase C（Week 249-352）：固定 `4,326,923.076923` PAIMON/周。
- 输出路径：`../.ultra/docs/emission-schedule.json`。

## 4. `test-emission-schedule.py`

- 覆盖：阶段边界、守恒校验、分流比例以及 JSON Schema。
- 执行：`python3 scripts/test-emission-schedule.py`。
- 推荐在修改排放逻辑或参数后运行，确保 off-chain 数据与链上一致。

## 开发准则

- **KISS**：脚本仅封装流程所需最小逻辑，复杂计算保留在合约或专门模块中。
- **DRY**：所有排放参数均从白皮书与合约单一来源读取，脚本不重复硬编码常量。
- **SOLID**：同步脚本只负责文件复制，不掺杂业务校验；生成与校验脚本各自独立。
- **YAGNI**：暂不引入虚拟环境或依赖管理工具，后续确有需要时再扩展。

如需新增脚本，请在本文件登记用途、输入输出与依赖，保持同事可快速上手。 
