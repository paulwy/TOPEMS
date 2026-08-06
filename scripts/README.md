# TOPEMS 脚本工具

## 目录结构

```
scripts/
├── topems.sh                  # 【主入口】统一服务管理脚本（推荐使用）
├── services.conf              # 统一服务配置
├── README.md                  # 本文档
│
├── dev/                       # 【开发工具】本地开发相关脚本
│   ├── install-deps.sh        # 依赖安装（PostgreSQL/Redis/Rust/Node.js）
│   ├── start-local.sh         # 本地一键启动
│   ├── health-check.sh        # 健康检查 / 环境诊断
│   ├── ai-models.sh           # AI 模型管理（Ollama）
│   ├── update-admin-password.sh  # 管理员密码重置
│   └── verify-route-matrix.sh   # 路由矩阵校验
│
├── test/                      # 【测试脚本】
│   ├── run-core-tests.sh      # 核心模块权限测试
│   └── run-iam-tests.sh       # IAM 模块测试
│
├── deploy/                    # 【部署脚本】
│   ├── deploy.sh              # 部署脚本（本地 / Docker）
│   ├── rollback.sh            # 回滚脚本
│   └── docker/
│       └── topems-docker.sh   # Docker Compose 部署
│
├── performance/               # 【性能测试】
│   ├── run-e2e-performance.sh # 一键 E2E：启动后端 → 执行测试 → 清理
│   ├── run-all-tests.sh       # k6 性能测试套件（支持冒烟/完整双模式）
│   ├── run_benchmark.sh       # curl 基准测试一键运行器
│   ├── benchmark.sh           # curl 顺序延迟采样（单客户端）
│   ├── scm-performance-test.js    # k6 SCM 服务并发性能测试
│   ├── database-performance-test.js  # k6 数据库并发性能测试
│   └── baseline.md            # 性能基线与方法论文档
│
├── security/                  # 【安全扫描】
│   ├── scan.sh
│   └── tenant-audit.sh
│
├── migration/                 # 【迁移校验】
│   └── validate.sh
│
├── openapi/                   # 【OpenAPI 类型生成】
│   ├── generate.sh
│   └── gen-types.mjs
│
├── finance/                   # 【财务模块工具】
│   ├── README.md
│   └── consistency-check.sh
│
├── tools/                     # 【工具项目】
│   ├── migration-generator/   # 迁移生成器（TS 子项目）
│   ├── README.md
│   └── hash_password.rs
│
├── windows/                   # 【Windows 脚本】
│   ├── README_WINDOWS.md
│   ├── check-env.ps1
│   ├── ports.ps1
│   ├── topems-standalone.ps1
│   └── topems.bat
│
├── blue-green-deploy.sh       # 蓝绿部署
├── bundle-check.sh            # 前端包体积检查
├── sccache-setup.sh           # Rust 编译缓存设置
├── patch-react-transition-group.js  # ESM 兼容性补丁（pnpm install 后执行）
│
└── archive/                   # 【归档】历史一次性脚本（不再使用）
```

## 统一服务配置

所有脚本通过 `services.conf` 共享统一的服务配置：

```bash
# 格式: 服务名 服务路径 二进制名 端口
iam         svc/unified-core       topems-unified-core  8000
pm          svc/pm                 topems-pm             8023
```

> **权威端口配置**: `config/ports.env` 是端口号的最终来源，`services.conf` 与之保持同步。

## 快速参考

### 主入口（推荐）

| 命令 | 说明 |
|------|------|
| `./scripts/topems.sh` | 查看帮助 |
| `./scripts/topems.sh status [服务]` | 查看服务状态 |
| `./scripts/topems.sh start <服务>` | 启动服务 |
| `./scripts/topems.sh stop <服务>` | 停止服务 |
| `./scripts/topems.sh restart <服务>` | 重启服务 |
| `./scripts/topems.sh logs <服务> [行数]` | 查看服务日志 |
| `./scripts/topems.sh build <服务>` | 编译服务 |
| `./scripts/topems.sh start-all` | 启动所有服务（含前端） |
| `./scripts/topems.sh stop-all` | 停止所有服务（含前端） |
| `./scripts/topems.sh dev` | 启动 macOS 开发环境 |
| `./scripts/topems.sh install-deps` | 安装所有依赖 |
| `./scripts/topems.sh ai start/stop/status/pull` | AI 模型管理 |
| `./scripts/topems.sh reset-password` | 重置管理员密码 |
| `./scripts/topems.sh deploy` | 部署服务 |

### 开发工具

| 脚本 | 说明 |
|------|------|
| `./scripts/dev/start-local.sh` | 本地一键启动（前端 + 后端 + 数据库） |
| `./scripts/dev/install-deps.sh` | 依赖安装 |
| `./scripts/dev/health-check.sh` | 健康检查 / 环境诊断 |
| `./scripts/dev/ai-models.sh` | AI 模型管理 |
| `./scripts/dev/update-admin-password.sh` | 管理员密码重置 |
| `./scripts/dev/verify-route-matrix.sh` | 路由矩阵校验 |

### 测试

| 脚本 | 说明 |
|------|------|
| `./scripts/test/run-core-tests.sh` | 核心模块权限测试 |
| `./scripts/test/run-iam-tests.sh` | IAM 模块测试 |
| `./scripts/performance/run-all-tests.sh` | 性能测试套件（支持冒烟/完整双模式） |
| `./scripts/performance/run-e2e-performance.sh` | **一键 E2E 性能测试**（自动启动后端 → 执行测试 → 清理） |
| `node scripts/patch-react-transition-group.js` | ESM 兼容性补丁（`pnpm install` 后必须执行一次） |

#### ESM 兼容性补丁

`react-transition-group@4.x` / `dom-helpers` / `@opentelemetry/resources` 在 pnpm 虚拟存储中的子路径导入存在 ESM 兼容性问题，会导致 Vitest 分片测试崩溃。`patch-react-transition-group.js` 会自动扫描所有 pnpm 副本并添加 `exports` 字段和目录入口文件。

```bash
# 安装依赖后执行
node scripts/patch-react-transition-group.js

# 验证补丁是否生效
node scripts/patch-react-transition-group.js --check
```

> CI 中每个前端 job 都会自动执行此脚本。本地开发时需在 `pnpm install` 后手动执行一次。

#### 性能测试套件

性能测试套件支持两种运行模式：

| 模式 | 命令 | VUs | Duration | 需后端 | 用途 |
|------|------|-----|----------|--------|------|
| 冒烟测试 | `SMOKE=true ./scripts/performance/run-all-tests.sh` | 1 | 5s | 否 | CI 验证脚本无语法错误 |
| 完整性能测试 | `./scripts/performance/run-all-tests.sh` | 50-100 | 60-120s | 是 | 真实性能评估 |

环境变量：
- `SMOKE=true|false` — 切换测试模式（默认 `false`）
- `BASE_URL=url` — 后端服务地址（默认 `http://localhost:8040`）

详细配置见 `scripts/performance/` 目录下各脚本顶部的 JSDoc 注释。

#### 一键 E2E 性能测试

`run-e2e-performance.sh` 自动完成「启动基础设施 → 编译后端 → 执行测试 → 输出报告 → 清理」全流程：

```bash
# 一键完整性能测试（自动启动 PostgreSQL + Redis + SCM 服务）
./scripts/performance/run-e2e-performance.sh

# 冒烟测试（快速验证，无需后端）
./scripts/performance/run-e2e-performance.sh --smoke

# 测试后保留服务运行
./scripts/performance/run-e2e-performance.sh --keep

# 跳过启动（已有后端在运行）
./scripts/performance/run-e2e-performance.sh --skip-start

# 指定后端地址
./scripts/performance/run-e2e-performance.sh --base-url http://192.168.1.100:8040
```

### 部署

| 脚本 | 说明 |
|------|------|
| `./scripts/deploy/deploy.sh` | 部署脚本（默认本地，--docker 使用 Docker） |
| `./scripts/deploy/rollback.sh` | 回滚脚本 |
| `./scripts/deploy/docker/topems-docker.sh` | Docker Compose 部署 |
| `./scripts/blue-green-deploy.sh` | 蓝绿部署 |

### 生产部署

生产环境部署请使用 `deploy/` 目录：

| 目录 | 说明 |
|------|------|
| `deploy/docker/` | Docker Compose 完整部署 |
| `deploy/k8s/` | Kubernetes 部署（Kustomize） |
| `deploy/systemd/` | systemd 生产服务单元 |
| `deploy/scripts/` | Linux 生产环境安装/更新/卸载脚本 |
| `deploy/nginx/` | Nginx 生产配置 |

## 支持的服务

| 服务名 | 说明 | 端口 | 端口区间 |
|--------|------|------|---------|
| **平台核心服务** | | | **8000-8009** |
| iam | 统一身份认证（unified-core） | 8000 | |
| **经营管理服务** | | | **8010-8019** |
| erp | 企业资源计划 | 8010 | |
| finance | 财务管理 | 8011 | |
| **协同办公服务** | | | **8020-8029** |
| hrm | 人力资源管理 | 8020 | |
| pm | 项目管理 | 8023 | |
| crm | 客户关系管理 | 8029 | |
| **生产制造服务** | | | **8030-8039** |
| mes | 生产执行系统 | 8030 | |
| pdm | 产品数据管理 | 8031 | |
| **供应链服务** | | | **8040-8049** |
| scm | 供应链管理 | 8040 | |
| wms | 仓库管理 | 8041 | |
| srm | 供应商管理 | 8042 | |
| **质量/研发服务** | | | **8050-8059** |
| qms | 质量管理 | 8050 | |
| lims | 实验室信息管理 | 8051 | |
| ehs | 环境安全 | 8052 | |
| rd | 研发管理 | 8053 | |
| **数据/门户服务** | | | **8060-8069** |
| bi | 商业智能（analytics） | 8060 | |
| portal | 企业门户 / BFF | 8063 | |
| ai | AI 服务 | 8013 | |
| **基础设施服务** | | | **8070-8079** |
| mobile | 移动端后端 | 8070 | |
| gis | 地理信息 | 8071 | |
| integration | 系统集成 | 8072 | |
| **扩展服务** | | | **8082-8090** |
| search | 搜索服务 | 8082 | |
| communication | 通讯服务 | 8084 | |
| billing | 计费服务 | 8085 | |
| ticket | 工单服务 | 8086 | |
| feedback | 反馈服务 | 8087 | |
| master-data | 主数据管理 | 8090 | |
| **前端** | | | |
| web | 前端应用 | 3000 | |

## 文档

- [Python CLI](../cli/README.md)
- [部署文档](../docs/deployment/README.md)
- [Windows 部署](./windows/README_WINDOWS.md)
- [Code Wiki](../docs/architecture/code-wiki.md)

## 归档说明

`scripts/archive/` 目录存放历史一次性修复脚本（如 i18n 迁移、模块重构、代码批量修复等）。这些脚本已完成使命，不再常规使用，保留仅供历史参考。
