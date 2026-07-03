# GitHub Actions CI/CD 配置说明

## 工作流概述

本项目使用 GitHub Actions 实现自动化 CI/CD 流程，包含以下工作流：

### 1. CI (ci.yml) - 持续集成
用于 Pull Request 和代码推送时的自动化检查，确保代码质量。

### 2. CI/CD Pipeline (ci-cd.yml) - 完整流水线
包含完整的构建、测试、Docker 镜像构建和部署流程，支持自动回滚。

### 3. Code Quality Check (code-quality.yml) - 代码质量检查
执行 API 路径唯一性检查、组件命名规范检查和 console.log 检查。

### 4. Split Services CI/CD (split-services.yml) - 拆分服务 CI/CD
专门针对 mes/pdm/qms/lims/ehs/bi/report 等拆分服务的独立流水线。

---

## CI 工作流 (ci.yml)

### 触发条件

| 事件类型 | 触发分支 | 说明 |
|---------|---------|------|
| `push` | `main`, `develop` | 代码推送时运行 |
| `pull_request` | `main`, `develop` | PR 创建/更新时运行 |
| `workflow_dispatch` | 任意 | 手动触发 |

### Jobs 架构

```
                    ┌─────────────────┐
                    │   Pull Request  │
                    │  / Push Event   │
                    └────────┬────────┘
                             │
           ┌─────────────────┴─────────────────┐
           │                                   │
           ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────┐
│     Rust Lint       │             │  Frontend Lint      │
│  (cargo fmt/clippy) │             │   (ESLint)          │
└─────────┬───────────┘             └─────────┬───────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────┐
│     Rust Tests      │             │ Frontend Type Check │
│  (cargo test)       │             │  (tsc --noEmit)     │
└─────────┬───────────┘             └─────────┬───────────┘
          │                                   │
          │                                   ▼
          │                         ┌─────────────────────┐
          │                         │ Design System Check │
          │                         │  (token deviation)  │
          │                         └─────────┬───────────┘
          │                                   │
          │                                   ▼
          │                         ┌─────────────────────┐
          │                         │  Frontend Tests     │
          │                         │  (vitest + coverage)│
          │                         └─────────┬───────────┘
          │                                   │
          └─────────────────┬─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Security Scan  │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Quality Gate   │
                   │  (质量门禁)     │
                   └─────────────────┘
```

### Job 详情

#### 1. Rust Lint (`rust-lint`)
- **代码格式检查**: `cargo fmt --check --all`
- **静态分析**: `cargo clippy --workspace --all-targets -- -D warnings`

#### 2. Rust Tests (`rust-test`)
- **依赖**: `rust-lint` 通过后执行
- **服务**: PostgreSQL 16 + Redis 7
- **测试命令**: `cargo test --workspace --no-fail-fast`

#### 3. Frontend Lint (`frontend-lint`)
- **Lint 工具**: ESLint
- **命令**: `pnpm --filter topems-portal lint`

#### 4. Design System Check (`design-system-check`)
- **功能**: 检查设计系统 token 偏差
- **命令**: `pnpm --filter @topems/tokens build` + 偏差检查脚本

#### 5. Frontend Type Check (`frontend-typecheck`)
- **工具**: TypeScript
- **命令**: `pnpm --filter topems-portal typecheck`

#### 6. Frontend Tests (`frontend-test`)
- **依赖**: `frontend-lint` + `frontend-typecheck` + `design-system-check` 通过后执行
- **测试框架**: Vitest
- **命令**: `pnpm --filter topems-portal test:coverage`
- **代码覆盖率阈值**:
  - Statements: 60%
  - Branches: 50%
  - Functions: 60%
  - Lines: 60%
- **Bundle 大小检查**: 总大小 ≤ 5MB，单个 chunk ≤ 500KB，vendor chunk ≤ 2.5MB

#### 7. Security Scan (`security-scan`)
- **依赖审计**: `pnpm audit --prod --audit-level=high`
- **密钥扫描**: 检查代码中是否包含敏感信息

#### 8. Quality Gate (`quality-gate`)
- **依赖**: 所有上述 Job
- **作用**: 汇总所有检查结果，作为最终质量门禁

---

## CI/CD Pipeline (ci-cd.yml)

### 触发条件

| 事件类型 | 触发分支 | 触发操作 |
|---------|---------|---------|
| `push` | `main`, `develop`, `release/**` | 完整 CI/CD 流程 |
| `pull_request` | `main`, `develop` | 仅 Lint 和 Test |
| `workflow_dispatch` | 任意 | 手动触发部署 |

### 工作流架构

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Events                          │
│  push (main/develop/release/*) | pull_request | dispatch   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: lint                                                 │
│  ├── Rust: cargo fmt + clippy                              │
│  └── Frontend: ESLint                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ (success)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: test                                                 │
│  ├── PostgreSQL + Redis services                           │
│  ├── Rust: cargo test                                      │
│  └── Frontend: typecheck + vitest                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ (success)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: build                                                │
│  ├── Rust: cargo build --release                           │
│  ├── Frontend: pnpm build                                  │
│  └── Upload artifacts                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job: docker-build (Matrix)                                │
│  ├── 构建所有服务的 Docker 镜像                             │
│  ├── 生成 SBOM                                              │
│  └── 推送到 GHCR/Docker Hub                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│ Deploy Staging  │ │ Deploy Production│
│ (自动回滚)      │ │ (自动回滚)      │
└─────────────────┘ └─────────────────┘
```

### 部署特性

#### 自动回滚机制
- **备份**: 部署前自动备份当前版本到 `*.backup.{TIMESTAMP}`
- **健康检查**: 部署后检查所有服务端口的 `/health` 端点
- **自动回滚**: 如果健康检查失败，自动恢复到备份版本

#### 服务列表
| 服务 | 端口 |
|------|------|
| unified-core | 8000 |
| erp | 8010 |
| hrm | 8020 |
| crm | 8029 |
| pm | 8023 |
| gis | 8071 |
| rs | 8053 |
| scm | 8040 |
| wms | 8041 |
| srm | 8042 |
| mobile | 8070 |
| monitor | 8062 |
| portal | 8063 |
| ai | 8064 |
| integration | 8072 |
| mes | 8030 |
| pdm | 8031 |
| qms | 8050 |
| lims | 8051 |
| ehs | 8052 |
| bi | 8060 |
| report | 8061 |

---

## Split Services CI/CD (split-services.yml)

### 触发条件

| 事件类型 | 触发分支 | 路径过滤 |
|---------|---------|---------|
| `push` | `main`, `develop` | `svc/mes/**`, `svc/pdm/**`, `svc/qms/**`, `svc/lims/**`, `svc/ehs/**`, `svc/bi/**`, `svc/report/**`, `lib/**` |
| `pull_request` | `main`, `develop` | 同上 |

### 特性
- **增量构建**: 仅构建变更的服务
- **Kubernetes 部署**: 支持 staging 和 production 环境
- **Slack 通知**: 部署完成后发送通知
- **手动回滚**: 支持通过 workflow_dispatch 触发回滚

---

## 质量门禁规则

### 阻止合并的条件

| 检查项 | 工具 | 失败条件 |
|-------|------|---------|
| 代码格式 | `cargo fmt` | 格式不符合规范 |
| Rust 静态分析 | `cargo clippy` | 任何警告或错误 |
| Rust 单元测试 | `cargo test` | 任何测试失败 |
| 前端 Lint | `ESLint` | Error 级别问题 |
| 前端类型检查 | `tsc --noEmit` | 任何类型错误 |
| 前端单元测试 | `vitest` | 任何测试失败 |
| 测试覆盖率 | `v8 coverage` | 低于阈值 |
| Bundle 大小 | 构建检查 | 超过阈值 |

---

## 性能优化

### Rust 缓存
- 使用 `Swatinem/rust-cache@v2` 缓存依赖和构建产物
- 按 Job 类型分离缓存（lint / test / build / 服务名）

### pnpm 缓存
- 使用 `pnpm/action-setup@v4` 管理 pnpm 版本
- 缓存 pnpm store 目录
- 使用 `--frozen-lockfile` 确保依赖一致性

### 并行执行
- Rust 和前端检查并行执行
- Docker 镜像构建使用 Matrix 并行

---

## 本地验证命令

### 后端 Rust
```bash
cargo fmt --check --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

### 前端 TypeScript
```bash
pnpm install
pnpm --filter topems-portal lint
pnpm --filter topems-portal typecheck
pnpm --filter topems-portal test
pnpm --filter topems-portal test:coverage
```

---

## GitHub Secrets 配置

### 部署相关

| Secret 名称 | 说明 | 必需 |
|------------|------|------|
| `STAGING_HOST` | Staging 服务器主机地址 | 部署需要 |
| `STAGING_USER` | SSH 登录用户名 | 部署需要 |
| `STAGING_SSH_KEY` | SSH 私钥 | 部署需要 |
| `STAGING_PORT` | SSH 端口（默认 22） | 可选 |
| `PROD_HOST` | 生产服务器主机地址 | 部署需要 |
| `PROD_USER` | SSH 登录用户名 | 部署需要 |
| `PROD_SSH_KEY` | SSH 私钥 | 部署需要 |
| `PROD_PORT` | SSH 端口（默认 22） | 可选 |
| `PROD_DOMAIN` | 生产环境域名 | 部署需要 |
| `DOCKER_USERNAME` | Docker Hub 用户名 | 可选 |
| `DOCKER_PASSWORD` | Docker Hub 密码 | 可选 |
| `KUBE_CONFIG_STAGING` | Staging Kubernetes 配置（base64 编码） | K8s 部署需要 |
| `KUBE_CONFIG_PRODUCTION` | Production Kubernetes 配置（base64 编码） | K8s 部署需要 |
| `SLACK_WEBHOOK_URL` | Slack 通知 Webhook | 可选 |

---

## GitHub Environments 配置

1. **staging** - 用于预发布测试
2. **production** - 用于生产环境

**建议**: 为 production 环境启用 **Required reviewers** 功能，需要人工审核才能部署。

---

## Branch Protection 配置

为 `main` 和 `develop` 分支添加保护规则：

1. 启用 **Require status checks to pass before merging**
2. 添加以下 status checks:
   - `Rust Lint`
   - `Rust Tests`
   - `Frontend Lint`
   - `Frontend Type Check`
   - `Frontend Tests`
   - `Quality Gate`
3. 启用 **Require branches to be up to date before merging**

---

## 故障排除

### 常见问题

1. **Rust 构建失败**
   - 检查 Rust 版本是否正确
   - 清除缓存后重试
   - 检查 `Cargo.toml` 依赖配置

2. **测试失败**
   - 检查 PostgreSQL/Redis 服务是否正常启动
   - 查看测试日志中的具体错误信息
   - 本地运行测试验证

3. **前端依赖安装失败**
   - 检查 `pnpm-lock.yaml` 是否与 `package.json` 同步
   - 本地运行 `pnpm install` 验证

4. **Lint 失败**
   - 本地运行 lint 命令查看具体错误
   - 使用 `pnpm lint:fix` 自动修复可修复的问题

5. **部署失败**
   - 检查服务器 SSH 密钥配置
   - 查看部署日志中的错误信息
   - 自动回滚已触发，服务应已恢复

---

## 相关文件

- `.github/workflows/ci.yml` - CI 工作流配置
- `.github/workflows/ci-cd.yml` - 完整 CI/CD 流水线
- `.github/workflows/code-quality.yml` - 代码质量检查
- `.github/workflows/split-services.yml` - 拆分服务 CI/CD
- `apps/web/eslint.config.js` - ESLint 配置
- `apps/web/vitest.config.ts` - Vitest 测试配置
- `Cargo.toml` - Rust 工作区配置
- `package.json` - 前端工作区配置
- `pnpm-workspace.yaml` - pnpm 工作区配置