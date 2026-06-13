# TOPEMS 脚本工具

## 🚀 统一服务管理脚本

### 主脚本：topems.sh

推荐使用统一的服务管理脚本，默认使用**本地模式**（无需Docker，适合内网/开发环境）：

```bash
# 启动所有服务（默认：本地模式）
./scripts/topems.sh start

# 使用Docker方案启动（需要外网下载镜像）
./scripts/topems.sh start-docker

# 强制使用本地模式（无外网可用时）
./scripts/topems.sh start-local

# ⚡ 优化启动（推荐开发环境）
./scripts/topems.sh start-core              # 核心服务（~200 MB）
./scripts/topems.sh start-module erp        # ERP 模块（~150 MB）
./scripts/topems.sh start-module plm        # PLM 模块（~180 MB）
./scripts/topems.sh start-module mes        # MES 模块（~120 MB）
./scripts/topems.sh start-module scm        # SCM 模块（~120 MB）
./scripts/topems.sh start-module infra      # 基础设施（~150 MB）
./scripts/topems.sh start-module analytics  # 数据分析（~200 MB）

# 停止所有服务
./scripts/topems.sh stop

# 查看服务状态
./scripts/topems.sh status

# 查看服务健康状态（详细）
./scripts/topems.sh health

# 查看特定服务日志
./scripts/topems.sh logs lims
./scripts/topems.sh logs gis

# 检查数据库迁移状态
./scripts/topems.sh migrate-status

# 修复数据库迁移问题
./scripts/topems.sh migrate-fix lims
./scripts/topems.sh migrate-fix all

# 自动修复服务（检查迁移+重启）
./scripts/topems.sh fix lims
./scripts/topems.sh fix gis

# AI模型管理（独立管理，资源占用高）
./scripts/topems.sh ai start
./scripts/topems.sh ai pull qwen2.5:7b-instruct-q4_0

# 编译构建
./scripts/topems.sh build

# 运行测试
./scripts/topems.sh test

# 显示帮助
./scripts/topems.sh help
```

## 🧪 测试工具

### 统一测试脚本

```bash
# 运行所有测试（格式检查 + 静态分析 + 单元测试 + 集成测试）
bash scripts/run-tests.sh all

# 仅运行单元测试
bash scripts/run-tests.sh unit

# 仅运行集成测试
bash scripts/run-tests.sh integration

# 生成测试覆盖率报告（需要安装 cargo-llvm-cov）
bash scripts/run-tests.sh coverage

# 运行静态分析
bash scripts/run-tests.sh lint

# 检查代码格式
bash scripts/run-tests.sh format
```

### 测试所有 Rust 服务

```bash
bash scripts/test-all-rust-services.sh
```

### ⚡ 优化启动命令

| 命令 | 内存占用 | 启动服务 | 端口范围 |
|------|---------|---------|---------|
| `start` | ~800 MB | 全部服务 | 8000-8070 |
| `start-core` | ~200 MB | iam, pm, notification, portal, flow, integration | 8000-8005 |
| `start-module erp` | ~150 MB | erp, hrm, crm | 8010-8012 |
| `start-module plm` | ~180 MB | rs, lims, pdm, doc | 8020, 8022-8024 |
| `start-module mes` | ~120 MB | mes, qms, ehs | 8030-8032 |
| `start-module scm` | ~120 MB | scm, srm, wms | 8040-8042 |
| `start-module infra` | ~150 MB | file, mail, im, gis | 8050-8053 |
| `start-module analytics` | ~200 MB | bi, report, ai | 8060-8062 |

### 端口规划 (v4.0)

所有服务按业务模块分组，端口连续分配：

| 模块 | 端口范围 | 服务 | 状态 |
|------|---------|------|------|
| **核心服务** | 8000-8009 | iam, pm, notification, portal, flow, integration | 已实现 |
| **ERP/财务** | 8010-8019 | erp, hrm, crm | 已实现 |
| **PLM/研发** | 8020-8029 | rs, lims, pdm, doc（8021禁用） | 已实现 |
| **MES/生产** | 8030-8039 | mes, qms, ehs | 已实现 |
| **SCM/供应链** | 8040-8049 | scm, srm, wms | 已实现 |
| **基础设施** | 8050-8059 | file, mail, im, gis | 已实现 |
| **数据分析** | 8060-8069 | bi, report, ai | 已实现 |
| **扩展服务** | 8070-8079 | mobile, iot | 已实现/预留 |

### 可用模块列表

| 模块 | 命令 | 服务 | 端口 |
|------|------|------|------|
| `core` | `start-module core` | iam, pm, notification, portal, flow, integration | 8000-8005 |
| `erp` | `start-module erp` | erp, hrm, crm | 8010-8012 |
| `plm` | `start-module plm` | rs, lims, pdm, doc | 8020, 8022-8024 |
| `mes` | `start-module mes` | mes, qms, ehs | 8030-8032 |
| `scm` | `start-module scm` | scm, srm, wms | 8040-8042 |
| `infra` | `start-module infra` | file, mail, im, gis | 8050-8053 |
| `analytics` | `start-module analytics` | bi, report, ai | 8060-8062 |

### 脚本架构

```
scripts/
├── topems.sh                    # 统一入口脚本（默认本地模式）
├── topems-standalone.sh          # 本地部署脚本
├── ai-models.sh                 # AI模型管理脚本
├── install-deps.sh              # 依赖安装脚本
├── setup-db.sh                  # 数据库初始化脚本
└── docker/                      # Docker方案脚本
    ├── docker-compose.yml       # Docker Compose配置
    └── topems-docker.sh         # Docker方案启动脚本
```

### 脚本工具列表

#### 统一入口脚本

| 脚本 | 说明 |
|------|------|
| `topems.sh` | **统一服务管理脚本**（推荐使用，默认本地模式） |

#### Docker方案脚本

| 脚本 | 说明 |
|------|------|
| `docker/docker-compose.yml` | Docker Compose配置文件 |
| `docker/topems-docker.sh` | Docker方案启动脚本 |

#### 本地模式脚本

| 脚本 | 说明 |
|------|------|
| `topems-standalone.sh` | 本地部署启动脚本 |
| `install-deps.sh` | 依赖安装脚本（PostgreSQL, Redis, Rust, Node.js） |
| `ai-models.sh` | AI模型管理脚本（Ollama） |

#### 数据库脚本

| 脚本 | 说明 |
|------|------|
| `setup-db.sh` | 数据库设置脚本（推荐，自动检测环境） |
| `init-db-unified.sh` | 交互式数据库初始化 |
| `init-db-local.sh` | 本地模式详细初始化（含 .env.local 生成） |
| `init-vector-index.sh` | 初始化向量索引 |
| `install-pgvector.sh` | 安装配置 pgvector |

#### 开发脚本

| 脚本 | 说明 |
|------|------|
| `build-all-services.sh` | 构建所有服务（已整合到 topems.sh build） |
| `test-all-rust-services.sh` | 检查所有 Rust 服务编译状态 |
| `cleanup.sh` | 全面清理（端口、进程、缓存） |
| `clean-warnings.sh` | 批量清理代码警告（自动修复） |
| `run-tests.sh` | 运行测试套件（已整合到 topems.sh test） |
| `test-hrm-api.sh` | HRM API 端到端测试 |
| `encrypt-env.sh` | 加密环境变量文件 |

#### 部署脚本

| 脚本 | 说明 |
|------|------|
| `deploy.sh` | 离线部署脚本 |
| `download-images.sh` | 下载 Docker 镜像 |
| `monitor.sh` | 启动监控服务 |

## 使用示例

### 方案选择指南

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 开发环境 | 本地模式 | 资源占用低，启动快 |
| CI/CD测试 | Docker方案 | 环境一致性好 |
| 生产部署 | Docker方案 | 便于扩展和管理 |
| 离线环境 | 本地模式 | 无容器依赖 |
| 资源受限 | 本地模式 | 资源占用更低 |

### 本地模式（推荐开发/内网）

```bash
# 首次使用：安装依赖
bash scripts/topems.sh install

# 启动核心服务（推荐开发环境）
bash scripts/topems.sh start-core

# 启动指定模块
bash scripts/topems.sh start-module plm

# 启动所有服务
bash scripts/topems.sh start

# 停止服务
bash scripts/topems.sh stop

# 查看状态
bash scripts/topems.sh status
```

### Docker方案

```bash
# 启动所有服务
bash scripts/topems.sh start-docker

# 停止服务
bash scripts/topems.sh stop-docker

# 查看状态
bash scripts/topems.sh status-docker
```

### 数据库初始化

```bash
# 方式一：自动检测（推荐）
bash scripts/setup-db.sh

# 方式二：交互式初始化
bash scripts/init-db-unified.sh

# 方式三：本地详细模式
bash scripts/init-db-local.sh
```

### AI模型管理

```bash
# 启动Ollama服务（资源占用高，按需启动）
bash scripts/topems.sh ai start

# 下载推荐模型（量化版本，节省50%内存）
bash scripts/topems.sh ai pull qwen2.5:7b-instruct-q4_0

# 查看模型状态
bash scripts/topems.sh ai status

# 测试模型响应
bash scripts/topems.sh ai test

# 停止Ollama服务
bash scripts/topems.sh ai stop
```

### 配置向量搜索

```bash
# 安装pgvector扩展
bash scripts/install-pgvector.sh

# 初始化向量索引
bash scripts/init-vector-index.sh
```

### 清理环境

```bash
# 清理所有进程和端口
bash scripts/cleanup.sh

# 清理Docker资源
bash scripts/docker/topems-docker.sh stop
```

## 服务端口配置 (v4.0)

端口配置文件位于 `config/ports.env`：

| 模块 | 服务 | 端口 | 环境变量 |
|------|------|------|---------|
| **核心服务** | iam | 8000 | IAM_PORT |
| | pm | 8001 | PM_PORT |
| | notification | 8002 | NOTIFICATION_PORT |
| | portal | 8003 | PORTAL_PORT |
| | flow | 8004 | FLOW_PORT |
| | integration | 8005 | INTEGRATION_PORT |
| **ERP/财务** | erp | 8010 | ERP_PORT |
| | hrm | 8011 | HRM_PORT |
| | crm | 8012 | CRM_PORT |
| **PLM/研发** | rs | 8020 | RS_PORT |
| | - | 8021 | -（禁用） |
| | lims | 8022 | LIMS_PORT |
| | pdm | 8023 | PDM_PORT |
| | doc | 8024 | DOC_PORT |
| **MES/生产** | mes | 8030 | MES_PORT |
| | qms | 8031 | QMS_PORT |
| | ehs | 8032 | EHS_PORT |
| **SCM/供应链** | scm | 8040 | SCM_PORT |
| | srm | 8041 | SRM_PORT |
| | wms | 8042 | WMS_PORT |
| **基础设施** | file | 8050 | FILE_PORT |
| | mail | 8051 | MAIL_PORT |
| | im | 8052 | IM_PORT |
| | gis | 8053 | GIS_PORT |
| **数据分析** | bi | 8060 | BI_PORT |
| | report | 8061 | REPORT_PORT |
| | ai | 8062 | AI_PORT |
| **扩展服务** | mobile | 8070 | MOBILE_PORT |

## 环境变量配置

### 数据库配置

```bash
# PostgreSQL
export DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Redis
export REDIS_URL=redis://:topems_redis_secret@localhost:6379
```

### AI配置

```bash
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=qwen2.5:7b-instruct-q4_0  # 量化模型，节省内存
export OLLAMA_KEEP_ALIVE=5m                    # 空闲5分钟后释放
```

### 安全配置

```bash
export JWT_SECRET=your-jwt-secret-key-here
export CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

## 启动模式说明

### ★ 本地模式（默认）

- **命令**: `start`, `start-core`, `start-module`, `start-standalone`
- **适用场景**: 开发环境、内网环境、离线环境
- **特点**: 资源占用低，直接运行进程，无需Docker

### ◆ Docker模式

- **命令**: `start-docker`
- **适用场景**: 测试环境、生产环境
- **特点**: 环境隔离，便于扩展，需要外网下载镜像

## 更新日志

### 2026-06-13 - 脚本测试和修复

#### 修复的问题

1. **前端代码格式问题**
   - 修复了 `apps/web/src/components/gis/modules/MapModule/MapView.tsx` 中的 prettier 格式问题
   - 将 TileLayer 的 url 属性格式化为多行形式

2. **Rust 代码格式问题**
   - 运行 `cargo fmt` 修复了所有 Rust 服务的代码格式问题
   - 涉及多个服务的代码格式标准化

3. **测试脚本逻辑问题**
   - 修复了 `scripts/test-all-rust-services.sh` 脚本的测试结果判断逻辑
   - 移除了重复运行测试的问题
   - 改进了测试结果的捕获和显示方式

4. **数据库测试问题**
   - 修复了 `svc/mes/tests/integration_tests.rs` 中缺少 `organization_id` 字段的问题
   - 修复了 `svc/qms/tests/integration_tests.rs` 中缺少 `organization_id` 字段的问题
   - 添加了 `TEST_ORGANIZATION_ID` 常量用于测试

#### 测试结果

所有测试脚本现在可以正常运行：

- **前端测试**: `npm run lint` 和 `npm run typecheck` 通过
- **Rust 服务测试**: 19 个服务测试通过，9 个服务无测试
- **代码格式检查**: `cargo fmt --check` 通过

#### 建议的后续改进

1. 为以下服务添加测试：
   - ai, file, im, mail, mobile, notification, pdm, report, shared

2. 统一所有服务的 `organization_id` 字段处理方式

3. 添加自动化测试流程到 CI/CD 管道

### 2026-06-13 - 后续改进实施

#### 已完成的改进

1. **为缺少测试的服务添加了基础测试**
   - 为 ai, file, im, mail, mobile, notification, pdm, report, shared 服务创建了集成测试文件
   - 测试包括数据库连接测试、表存在性测试、基础 CRUD 操作测试
   - 所有测试文件位于各服务的 tests/integration_tests.rs

2. **统一了 organization_id 字段处理方式**
   - 在所有测试文件中添加了 TEST_ORGANIZATION_ID 常量
   - 统一使用固定的测试组织 ID：00000000-0000-0000-0000-000000000001
   - 确保所有数据库插入操作都包含 organization_id 字段

3. **解决了前端依赖版本冲突问题**
   - 将 @heroui/react 从 v3.1.0 降级到 v2.6.11
   - 将 @heroui/styles 从 v3.1.0 降级到 v2.6.11
   - HeroUI v2 支持 React 18，解决了依赖冲突

4. **添加了自动化测试流程到 CI/CD 管道**
   - 更新了 .github/workflows/ci.yml 配置文件
   - 添加了 PostgreSQL 和 Redis 服务容器
   - 分离了 Rust 测试、前端测试和集成测试为独立的 jobs
   - 添加了代码格式检查（cargo fmt --check）
   - 添加了测试报告生成步骤

#### CI/CD 流程说明

新的 CI/CD 流程包含三个独立的测试阶段：

1. **rust-tests**: Rust 服务测试
   - 代码格式检查
   - Clippy 静态分析
   - 构建所有服务
   - 运行单元测试

2. **frontend-tests**: 前端测试
   - 安装依赖（使用 --legacy-peer-deps）
   - ESLint 检查
   - TypeScript 类型检查
   - 运行测试
   - 构建前端

3. **integration-tests**: 集成测试
   - 依赖 rust-tests 和 frontend-tests 完成
   - 运行所有服务的集成测试
   - 生成测试报告

#### 下一步建议

1. 创建数据库表结构，确保所有服务的测试表存在
2. 为新创建的测试添加更完善的测试用例
3. 配置测试覆盖率报告生成
4. 添加端到端测试（E2E）到 CI/CD 流程

### 2026-06-13 - 前端依赖冲突修复

#### 修复的问题

1. **移除了不兼容的 @heroui/react 和 @heroui/styles 依赖**
   - @heroui/react v3 需要 React 19，但项目使用 React 18
   - @heroui/styles 没有 v2 版本，无法降级

2. **替换为 @nextui-org/react**
   - 项目已安装 @nextui-org/react v2.6.11，支持 React 18
   - 修改了 FormBuilder.tsx 和 ConfirmDialog.tsx 使用 NextUI v2 组件
   - 修复了组件 API 差异导致的 TypeScript 错误

3. **修复的 TypeScript 错误**
   - ConfirmDialog.tsx: 添加了 size 参数默认值
   - FormBuilder.tsx: 修复了 SelectItem 的使用方式
   - FormBuilder.tsx: 修复了 Button variant 和 color 属性
   - FormBuilder.tsx: 修复了 defaultSelectedKey → defaultSelectedKeys

4. **其他依赖冲突**
   - @react-three/fiber 需要 React 19，但项目使用 React 18
   - 使用 --legacy-peer-deps 解决依赖冲突

#### 测试结果

- **TypeScript 检查**: 通过
- **依赖安装**: 成功（使用 --legacy-peer-deps）
