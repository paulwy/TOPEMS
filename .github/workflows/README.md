# GitHub Actions CI/CD 配置说明

## 工作流概述

本项目使用 GitHub Actions 实现自动化 CI/CD 流程，包含 5 个工作流（P2-5 合并后从 12 个精简而来）：

| # | 工作流 | 文件 | 职责 |
|---|--------|------|------|
| 1 | **CI** | `ci.yml` | 主 CI 流水线：lint、test、build、quality gate、migration test、desktop build |
| 2 | **Docker Build** | `docker-build.yml` | Docker 镜像构建与推送 |
| 3 | **Deploy to Kubernetes** | `deploy-k8s.yml` | K8s 集群部署（staging/production） |
| 4 | **E2E** | `e2e.yml` | Playwright 端到端测试（含后端启动） |
| 5 | **Secret Scan** | `secret-scan.yml` | Gitleaks 安全扫描 |

### P2-5 合并记录

以下 7 个工作流已合并到上述 5 个中并删除：

| 已删除文件 | 合并到 | 原因 |
|-----------|--------|------|
| `ci-cd.yml` | `ci.yml` + `docker-build.yml` + `deploy-k8s.yml` | lint/docker/deploy 三段均与已有工作流重复 |
| `lint-check.yml` | `ci.yml` | 是 `ci.yml` 的子集 |
| `code-quality.yml` | `ci.yml` (code-quality job) | API path / 命名 / console.log / allow_baseline 检查 |
| `e2e-test.yml` | `e2e.yml` | 是 `e2e.yml` 的子集 |
| `migration-test.yml` | `ci.yml` (migration-test job) | 条件触发：migration 路径变更 |
| `split-services.yml` | `docker-build.yml` + `deploy-k8s.yml` | per-service 构建/部署已被统一工作流覆盖 |
| `desktop-build.yml` | `ci.yml` (desktop-build job) | 条件触发：apps/desktop 路径变更 |

---

## CI 工作流 (ci.yml)

### 触发条件

| 事件类型 | 触发分支 | 说明 |
|---------|---------|------|
| `push` | `main`, `develop`, `v*` tags | 代码推送时运行 |
| `pull_request` | `main`, `develop` | PR 创建/更新时运行 |
| `schedule` | — | 每日 02:00 UTC 夜间回归 |
| `workflow_dispatch` | 任意 | 手动触发（可跳过 Rust） |

### 路径过滤

`paths-ignore`: 纯文档/配置变更（`*.md`, `docs/**`, `LICENSE`, `.gitignore`）不触发 CI。

### 变更检测 (`changes` job)

使用 `dorny/paths-filter@v4` 检测变更路径，输出以下信号：

| 输出 | 检测路径 | 关联 Job |
|------|---------|---------|
| `rust` | `lib/**`, `svc/**`, `Cargo.toml`, `Cargo.lock` | Rust Lint / Test / Schema Defense |
| `frontend` | `apps/web/**`, `packages/**`, `pnpm-lock.yaml` | Frontend Lint / Test / Build |
| `i18n` | `apps/web/src/i18n/**`, `scripts/i18n/**` | i18n Quality Gate |
| `permission` | `lib/shared-auth/**`, `svc/**/*.rs`, `permissions.ts` | Permission Matrix Gate |
| `menu` | `apps/web/src/modules/*/config.ts`, `navigation/**` | Menu Health Gate |
| `api_audit` | `apps/web/src/api/**`, `scripts/p6-*.cjs` | API Audit Gate |
| `migration` | `svc/**/migrations/**`, `database/migrations/**` | Migration Test |
| `desktop` | `apps/desktop/**` | Desktop Build |
| `ci` | `.github/**`, `scripts/ci/**` | 全部 CI 相关 |

### Job 列表

| Job | 条件 | 说明 |
|-----|------|------|
| `changes` | — | 变更检测 |
| `rust-smoke` | rust | Phase 1 — 5 standalone services 快速验证 |
| `rust-lint` (fmt + clippy + check) | rust | Rust 格式 / 静态分析 / 编译检查 |
| `rust-test` | rust | Rust 全量测试 |
| `rust-audit` | rust | Rust 依赖安全审计 |
| `schema-defense-gate` | rust | 26 服务 Schema 自检（严格模式） |
| `frontend-lint` | frontend | ESLint |
| `frontend-typecheck` | frontend | tsc --noEmit |
| `frontend-test` | frontend | Vitest (9 shards) |
| `frontend-coverage` | frontend | 覆盖率检查 |
| `frontend-build` | frontend | Bundle 大小检查 |
| `design-system-check` | frontend | 设计 token 偏差检查 |
| `frontend-audit` | frontend | V64 前端审计 |
| `i18n-quality-gate` | i18n | R12 七合一 i18n 质量门禁 |
| `permission-matrix-gate` | permission | 权限矩阵三向门禁 |
| `menu-health-gate` | menu | 37 模块菜单健康门禁 |
| `axum-layer-gate` | rust | Axum 中间件顺序检查 |
| `api-audit-gate` | api_audit | P6 Page→API + P7 RBAC 审计 |
| `security-scan` | frontend | npm audit + 密钥扫描 |
| `code-quality` | frontend/ci | API path 唯一性 / 命名规范 / console.log / allow_baseline |
| `migration-test` | migration | DB migration up-down-up 幂等测试 |
| `desktop-build` | desktop | 跨平台 Tauri 桌面应用构建 (ubuntu/windows/macos) |
| `quality-gate` | always | 最终质量门禁汇总 |

### 质量门禁规则

阻止合并的条件（`quality-gate` job 检查所有 job 结果，`skipped` 视为通过）：

- Rust: fmt / clippy / test / schema-defense 任一 failure
- Frontend: lint / typecheck / test / coverage / build 任一 failure
- i18n: fake-en / mixed-structure / hardcoded CJK 任一 failure
- 权限/菜单/API 审计任一 failure
- Migration / Desktop / Code Quality 任一 failure（仅当对应路径变更时）

---

## Docker Build (docker-build.yml)

### 触发条件

| 事件类型 | 触发分支 | 说明 |
|---------|---------|------|
| `push` | `main`, `develop`, `v*` tags | 自动构建 |
| `pull_request` | `main` | PR 验证 |
| `workflow_dispatch` | 任意 | 可指定服务列表 |

### 构建矩阵

使用统一模板 `docker/Dockerfile.service` 构建 27+ 个服务镜像，推送到 `ghcr.io`。

---

## Deploy to Kubernetes (deploy-k8s.yml)

### 触发条件

| 事件类型 | 触发分支 | 说明 |
|---------|---------|------|
| `push` | `main`, `develop`, `v*` tags | 自动部署 |
| `workflow_dispatch` | 任意 | 可指定环境和 image_tag |

### 部署流程

1. 确定 image tag（输入 > tag > sha-xxx）
2. 配置 kubectl
3. 滚动部署到 K8s 集群
4. 验证部署状态

---

## E2E Tests (e2e.yml)

### 触发条件

| 事件类型 | 触发分支 | 说明 |
|---------|---------|------|
| `push` | `main`, `develop` | 自动运行 |
| `pull_request` | `main`, `develop` | PR 验证 |
| `schedule` | — | 每日 03:00 UTC 夜间回归 |
| `workflow_dispatch` | 任意 | 可选择浏览器 |

### 测试流程

1. 启动 PostgreSQL + Redis + Rust 服务后端
2. 安装 Playwright 浏览器
3. 运行 Playwright 测试套件
4. 上传测试报告和截图

---

## Secret Scan (secret-scan.yml)

### 触发条件

| 事件类型 | 触发分支 | 说明 |
|---------|---------|------|
| `push` | `main`, `develop` | 自动扫描 |
| `pull_request` | `main`, `develop` | PR 检查 |
| `schedule` | — | 每周一 06:00 UTC |
| `workflow_dispatch` | 任意 | 手动触发 |

使用 Gitleaks 扫描全历史，配置文件 `.gitleaks.toml`。

---

## GitHub Secrets 配置

### 部署相关

| Secret 名称 | 说明 | 必需 |
|------------|------|------|
| `KUBE_CONFIG_STAGING` | Staging Kubernetes 配置（base64） | K8s 部署需要 |
| `KUBE_CONFIG_PRODUCTION` | Production Kubernetes 配置（base64） | K8s 部署需要 |
| `SLACK_WEBHOOK_URL` | Slack 通知 Webhook | 可选 |

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

### 代码质量
```bash
python scripts/check_api_duplicates_ci.py --ci
python scripts/check_component_naming.py --ci
bash scripts/check_allow_baseline.sh
```

### Migration 测试
```bash
node scripts/check-migration-names.mjs --strict
node scripts/check-migrations.mjs
sqlx migrate run --source svc/{service}/migrations --database-url "$DATABASE_URL"
```

---

## Branch Protection 配置

为 `main` 和 `develop` 分支添加保护规则：

1. 启用 **Require status checks to pass before merging**
2. 添加以下 status checks:
   - `Quality Gate`
   - `Rust Lint`
   - `Rust Tests`
   - `Frontend Lint`
   - `Frontend Type Check`
   - `Frontend Tests`
3. 启用 **Require branches to be up to date before merging**

---

## 相关文件

- `.github/workflows/ci.yml` — 主 CI 工作流
- `.github/workflows/docker-build.yml` — Docker 镜像构建
- `.github/workflows/deploy-k8s.yml` — K8s 部署
- `.github/workflows/e2e.yml` — E2E 测试
- `.github/workflows/secret-scan.yml` — 安全扫描
- `apps/web/eslint.config.js` — ESLint 配置
- `apps/web/vitest.config.ts` — Vitest 测试配置
- `Cargo.toml` — Rust 工作区配置
- `package.json` — 前端工作区配置
- `pnpm-workspace.yaml` — pnpm 工作区配置
