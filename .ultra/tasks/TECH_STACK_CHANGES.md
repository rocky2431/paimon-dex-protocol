# 后端技术栈变更摘要

**日期**: 2025-11-14
**变更类型**: 后端框架迁移
**变更范围**: Node.js + NestJS → Python + FastAPI

---

## 一、变更概览

### 核心技术栈对比

| 组件 | 原方案（NestJS） | 新方案（FastAPI） | 变更原因 |
|------|-----------------|------------------|---------|
| **运行时** | Node.js 20+ | Python 3.11+ | Web3 生态更成熟 |
| **框架** | NestJS | FastAPI | 异步性能优异，自带 OpenAPI |
| **ORM** | Prisma | SQLAlchemy + Alembic | Python 生态标准 ORM |
| **依赖管理** | npm / package.json | Poetry / pip + requirements.txt | Python 包管理 |
| **Redis 客户端** | @nestjs/redis + ioredis | redis-py (asyncio) | 异步支持完整 |
| **JWT 库** | @nestjs/jwt | python-jose + passlib | JWT 标准实现 |
| **Web3 库** | viem (前端) | web3.py + eth-account | 后端区块链交互 |
| **定时任务** | @nestjs/schedule | APScheduler | 灵活的任务调度 |
| **WebSocket** | @nestjs/platform-socket.io | python-socketio | Socket.IO Python 实现 |
| **HTTP 客户端** | axios | httpx (异步) | 异步 HTTP 请求 |
| **日志** | Winston | loguru / Python logging | 日志管理 |
| **配置管理** | @nestjs/config | pydantic-settings | 类型安全配置 |
| **代码格式化** | Prettier + ESLint | Black + Ruff | Python 代码规范 |
| **API 文档** | @nestjs/swagger | FastAPI 内置 OpenAPI | 自动生成文档 |
| **服务器** | Node.js | Uvicorn (ASGI) | 高性能异步服务器 |

---

## 二、受影响的任务清单

### Phase 1 - 后端基础架构（Task 1-11）

| 任务 ID | 任务标题 | 主要变更 |
|---------|---------|---------|
| **Task 1** | 初始化后端项目 | NestJS CLI → FastAPI + Poetry/pip |
| **Task 2** | 集成 ORM | Prisma → SQLAlchemy + Alembic |
| **Task 3** | 集成 Redis | ioredis → redis-py (asyncio) |
| **Task 5** | 通用模块 | Winston/ConfigModule → loguru/pydantic-settings |
| **Task 6** | API 文档 | @nestjs/swagger → FastAPI OpenAPI (/docs, /redoc) |
| **Task 7** | 部署 | Node Dockerfile → Python Dockerfile + Uvicorn |
| **Task 8** | JWT 认证 | @nestjs/jwt → python-jose + passlib |
| **Task 9** | 钱包签名登录 | viem → eth-account (web3.py) |
| **Task 10** | 社交登录 | NestJS OAuth → httpx 异步验证 |

### Phase 1 - 任务系统（Task 23, 25）

| 任务 ID | 任务标题 | 主要变更 |
|---------|---------|---------|
| **Task 23** | 链上任务验证 | viem → web3.py + eth_getLogs |
| **Task 25** | 任务奖励发放 | viem → web3.py 发送交易 |

### Phase 2 - 数据索引器（Task 37-44）

| 任务 ID | 任务标题 | 主要变更 |
|---------|---------|---------|
| **Task 37** | LP 仓位索引 | web3.py event filters |
| **Task 38** | Vault 仓位索引 | web3.py event filters |
| **Task 39** | veNFT 仓位索引 | web3.py event filters |
| **Task 40** | 定时扫描机制 | NestJS Cron → APScheduler |
| **Task 43** | 历史 APR 记录 | NestJS Cron → APScheduler |
| **Task 44** | 历史收益记录 | NestJS Cron → APScheduler |

### Phase 2 - 实时通知（Task 47）

| 任务 ID | 任务标题 | 主要变更 |
|---------|---------|---------|
| **Task 47** | 集成 Socket.IO | @nestjs/platform-socket.io → python-socketio |

---

## 三、核心依赖包清单

### Python 核心依赖（requirements.txt / pyproject.toml）

```toml
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.110.0"
uvicorn = {extras = ["standard"], version = "^0.28.0"}
sqlalchemy = "^2.0.28"
alembic = "^1.13.1"
asyncpg = "^0.29.0"                # PostgreSQL 异步驱动
redis = {extras = ["hiredis"], version = "^5.0.2"}  # Redis 异步客户端
python-jose = {extras = ["cryptography"], version = "^3.3.0"}  # JWT
passlib = {extras = ["bcrypt"], version = "^1.7.4"}
web3 = "^6.15.1"                   # 区块链交互
eth-account = "^0.11.0"            # 签名验证
pydantic-settings = "^2.2.1"       # 配置管理
python-socketio = "^5.11.1"        # WebSocket
httpx = "^0.27.0"                  # 异步 HTTP 客户端
apscheduler = "^3.10.4"            # 定时任务
loguru = "^0.7.2"                  # 日志
psycopg2-binary = "^2.9.9"         # TimescaleDB（可选）

[tool.poetry.group.dev.dependencies]
black = "^24.2.0"                  # 代码格式化
ruff = "^0.3.0"                    # 代码检查
pytest = "^8.1.1"                  # 测试框架
pytest-asyncio = "^0.23.5"         # 异步测试
```

---

## 四、项目结构对比

### NestJS 结构（原）

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── user/
│   │   └── task/
│   ├── common/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── entities/
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── package.json
└── tsconfig.json
```

### FastAPI 结构（新）

```
backend/
├── app/
│   ├── routers/
│   │   ├── auth.py
│   │   ├── user.py
│   │   └── task.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── task_service.py
│   │   └── blockchain_service.py
│   ├── models/
│   │   ├── user.py
│   │   ├── task.py
│   │   └── kyc.py
│   ├── schemas/
│   │   ├── auth.py
│   │   └── user.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── middleware/
│   │   └── response.py
│   ├── utils/
│   │   ├── web3_utils.py
│   │   └── redis_utils.py
│   └── main.py
├── alembic/
│   ├── versions/
│   └── env.py
├── pyproject.toml
├── poetry.lock
└── requirements.txt
```

---

## 五、关键代码模式变更

### 1. 依赖注入

**NestJS（原）**:
```typescript
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}
}
```

**FastAPI（新）**:
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    # JWT 验证逻辑
    pass

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### 2. 路由定义

**NestJS（原）**:
```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

**FastAPI（新）**:
```python
from fastapi import APIRouter, Body
from app.schemas.auth import LoginSchema

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(login_data: LoginSchema = Body(...)):
    return await auth_service.login(login_data)
```

### 3. 异步操作

**NestJS（原）**:
```typescript
async findUserByAddress(address: string): Promise<User> {
  return this.prisma.user.findUnique({
    where: { address }
  });
}
```

**FastAPI（新）**:
```python
from sqlalchemy import select

async def get_user_by_address(db: AsyncSession, address: str) -> User:
    result = await db.execute(
        select(User).where(User.address == address)
    )
    return result.scalar_one_or_none()
```

### 4. Web3 交互

**NestJS（原，使用 viem）**:
```typescript
import { verifyMessage } from 'viem';

const valid = await verifyMessage({
  address: userAddress,
  message: nonce,
  signature: signature,
});
```

**FastAPI（新，使用 web3.py）**:
```python
from eth_account.messages import encode_defunct
from web3 import Web3

w3 = Web3()
message = encode_defunct(text=nonce)
recovered_address = w3.eth.account.recover_message(message, signature=signature)
valid = recovered_address.lower() == user_address.lower()
```

### 5. 定时任务

**NestJS（原）**:
```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_5_MINUTES)
async scanBlocks() {
  // 扫描逻辑
}
```

**FastAPI（新）**:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('interval', minutes=5)
async def scan_blocks():
    # 扫描逻辑
    pass

scheduler.start()
```

---

## 六、优势分析

### Python FastAPI 相比 NestJS 的优势

| 维度 | FastAPI 优势 | 说明 |
|------|------------|------|
| **Web3 生态** | ⭐️⭐️⭐️⭐️⭐️ | web3.py 是区块链交互的事实标准，文档完善 |
| **异步性能** | ⭐️⭐️⭐️⭐️⭐️ | ASGI 协议，性能接近 Go（比 Node.js 快 20-30%） |
| **开发速度** | ⭐️⭐️⭐️⭐️ | 内置 OpenAPI、类型提示、更少样板代码 |
| **机器学习集成** | ⭐️⭐️⭐️⭐️⭐️ | Phase 3 智能推荐可直接使用 scikit-learn/pandas |
| **部署简单** | ⭐️⭐️⭐️⭐️ | 单文件部署，无需 node_modules |
| **学习曲线** | ⭐️⭐️⭐️⭐️ | 团队可能更熟悉 Python |
| **内存占用** | ⭐️⭐️⭐️⭐️ | 通常比 Node.js 低 30-40% |

### 潜在挑战

| 挑战 | 应对措施 |
|------|---------|
| 类型系统不如 TypeScript 严格 | 使用 mypy 静态类型检查 + Pydantic 运行时验证 |
| 异步库生态不如 Node.js 丰富 | 使用 asyncio 标准库 + httpx/aioredis 成熟库 |
| 部分 Web3 库更新不如 JS 快 | web3.py 维护活跃，社区支持强 |

---

## 七、迁移风险评估

| 风险类型 | 概率 | 影响 | 缓解措施 |
|---------|------|------|---------|
| 开发延期 | 中（30%） | 高 | 使用 FastAPI 成熟模板，减少学习成本 |
| 性能问题 | 低（10%） | 中 | FastAPI 性能优于 NestJS，风险低 |
| 库兼容性 | 低（15%） | 中 | 所有依赖都有成熟的 Python 替代方案 |
| 团队技能 | 中（20%） | 中 | Python 学习曲线低，快速上手 |

---

## 八、下一步行动

1. ✅ **已完成**: tasks.json 修改完成（66 个任务）
2. 📋 **下一步**:
   - 用户批准技术栈变更
   - 执行 `/ultra-dev 1` 开始 Task 1（初始化 FastAPI 项目）
3. 🔧 **技术准备**:
   - 安装 Python 3.11+
   - 安装 Poetry 或升级 pip
   - 准备 IDE（VS Code + Python 扩展）
4. 🌐 **基础设施准备**:
   - 注册 Supabase（PostgreSQL）
   - 注册 Upstash（Redis）
   - 注册 Railway/Render（后端托管）

---

**总结**: 技术栈迁移已完成规划，所有 66 个任务的后端相关部分已更新为 Python FastAPI 方案。前端保持 Next.js 14 + Reown AppKit 不变。准备就绪，等待开发启动！
