# GitHub Actions CI/CD 配置说明

## 工作流概述

本项目使用 GitHub Actions 实现自动化 CI/CD 流程，包含以下工作流：

### 1. CI (ci.yml) - 持续集成
用于 Pull Request 和代码推送时的自动化检查，确保代码质量。

### 2. CI/CD Pipeline (ci-cd.yml) - 完整流水线
包含完整的构建、测试、Docker 镜像构建和部署流程。

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
          │                         │  Frontend Tests     │
          │                         │  (vitest + coverage)│
          │                         └─────────┬───────────┘
          │                                   │
          └─────────────────┬─────────────────┘
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
- **质量门禁**: Clippy 警告视为错误，阻止合并

#### 2. Rust Tests (`rust-test`)
- **依赖**: `rust-lint` 通过后执行
- **服务**: PostgreSQL 16 + Redis 7
- **测试命令**: `cargo test --workspace --no-fail-fast`
- **质量门禁**: 测试失败阻止合并

#### 3. Frontend Lint (`frontend-lint`)
- **Lint 工具**: ESLint
- **命令**: `pnpm --filter topems-portal lint`
- **质量门禁**: Lint 错误阻止合并，警告不阻止

#### 4. Frontend Type Check (`frontend-typecheck`)
- **工具**: TypeScript
- **命令**: `pnpm --filter topems-portal typecheck`
- **质量门禁**: 类型错误阻止合并

#### 5. Frontend Tests (`frontend-test`)
- **依赖**: `frontend-lint` + `frontend-typecheck` 通过后执行
- **测试框架**: Vitest
- **命令**: `pnpm --filter topems-portal test:coverage`
- **代码覆盖率**: 使用 v8 provider，生成 HTML/JSON 报告
- **覆盖率阈值**:
  - Statements: 60%
  - Branches: 50%
  - Functions: 60%
  - Lines: 60%
- **质量门禁**: 测试失败阻止合并

#### 6. Quality Gate (`quality-gate`)
- **依赖**: 所有上述 Job
- **作用**: 汇总所有检查结果，作为最终质量门禁
- **输出**: 在 GitHub Step Summary 中生成结果表格

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
         ┌─────────┴─────────┐
         ▼                   ▼
┌───────────────┐    ┌───────────────────┐
│ Docker Build  │    │ Docker Build Split│
│ (Matrix)      │    │ (mes/pdm/qms/...) │
└───────┬───────┘    └─────────┬─────────┘
        │                      │
        └───────────┬──────────┘
                    ▼
         ┌─────────────────┐
         │  Deploy Jobs    │
         │  Staging / Prod │
         └─────────────────┘
```

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
| 测试覆盖率 | `v8 coverage` | 低于阈值（可选） |

### 不阻止合并的条件
- ESLint Warning 级别问题
- 测试覆盖率警告（可配置为强制）

---

## 性能优化

### Rust 缓存
- 使用 `Swatinem/rust-cache@v2` 缓存依赖和构建产物
- 按 Job 类型分离缓存（lint / test / build）
- 显著减少重复构建时间

### pnpm 缓存
- 使用 `pnpm/action-setup@v4` 管理 pnpm 版本
- 缓存 pnpm store 目录
- 使用 `--frozen-lockfile` 确保依赖一致性
- 基于 `pnpm-lock.yaml` 生成缓存 key

### 并行执行
- 后端和前端检查并行执行（Rust Lint || Frontend Lint）
- Frontend Lint 和 Frontend Type Check 并行执行
- 减少整体 CI 运行时间

---

## 本地验证命令

### 后端 Rust
```bash
# 代码格式检查
cargo fmt --check --all

# Clippy 静态分析
cargo clippy --workspace --all-targets -- -D warnings

# 运行所有测试
cargo test --workspace
```

### 前端 TypeScript
```bash
# 安装依赖
pnpm install

# Lint 检查
pnpm --filter topems-portal lint

# 类型检查
pnpm --filter topems-portal typecheck

# 单元测试
pnpm --filter topems-portal test

# 单元测试（带覆盖率）
pnpm --filter topems-portal test:coverage
```

---

## GitHub Secrets 配置

在 GitHub 仓库的 **Settings > Secrets and variables > Actions** 中配置以下 secrets：

### 部署相关（CI/CD Pipeline 需要）

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

---

## GitHub Environments 配置

在 GitHub 仓库的 **Settings > Environments** 中创建以下环境：

1. **staging** - 用于预发布测试
2. **production** - 用于生产环境

**建议**: 为 production 环境启用 **Required reviewers** 功能，需要人工审核才能部署。

---

## Branch Protection 配置

为了确保质量门禁生效，建议配置 Branch Protection Rules：

1. 进入仓库 **Settings > Branches**
2. 为 `main` 和 `develop` 分支添加保护规则
3. 启用 **Require status checks to pass before merging**
4. 添加以下 status checks:
   - `Rust Lint`
   - `Rust Tests`
   - `Frontend Lint`
   - `Frontend Type Check`
   - `Frontend Tests`
   - `Quality Gate`
5. 启用 **Require branches to be up to date before merging**

---

## 故障排除

### 常见问题

1. **Rust 构建失败**
   - 检查 Rust 版本是否正确
   - 清除缓存后重试（在 Actions 页面手动清除缓存）
   - 检查 `Cargo.toml` 依赖配置

2. **测试失败**
   - 检查 PostgreSQL/Redis 服务是否正常启动
   - 查看测试日志中的具体错误信息
   - 本地运行测试验证

3. **前端依赖安装失败**
   - 检查 `pnpm-lock.yaml` 是否与 `package.json` 同步
   - 本地运行 `pnpm install` 验证
   - 检查 Node.js 版本是否匹配

4. **Lint 失败**
   - 本地运行 lint 命令查看具体错误
   - 使用 `pnpm lint:fix` 自动修复可修复的问题
   - 检查 ESLint 配置文件

### 查看日志

- 在 GitHub Actions 页面查看每个 Job 的详细日志
- 点击具体的 Step 查看输出
- 使用 **Re-run jobs** 按钮重新运行失败的 Job

---

## 相关文件

- `.github/workflows/ci.yml` - CI 工作流配置
- `.github/workflows/ci-cd.yml` - 完整 CI/CD 流水线
- `.github/workflows/deploy.yml` - 部署工作流
- `apps/web/eslint.config.js` - ESLint 配置
- `apps/web/vitest.config.ts` - Vitest 测试配置
- `Cargo.toml` - Rust 工作区配置
- `package.json` - 前端工作区配置
- `pnpm-workspace.yaml` - pnpm 工作区配置
