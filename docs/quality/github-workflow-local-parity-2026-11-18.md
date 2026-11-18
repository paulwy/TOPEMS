# GitHub Workflow → 本地门禁对账（2026-11-18）

> 目的：GitHub Actions 因账户计费问题（"recent account payments have failed or your spending limit needs to be increased"）全量停摆后，明确哪些 CI 检查在本地已有等价物、哪些需要补、哪些无法等价，避免「本地绿 = 可发布」的误判。
>
> 本轮只出对账与方案：未改 `.github/workflows/**`、未改 `lefthook.yml`、未改代码、未 commit、未 push。

## 0. 结论摘要

- 范围：`.github/workflows/` 下 **8 个 workflow、57 个 job 定义、351 个 step**（矩阵展开后 GitHub 侧是 78 个 check-run）。
- 分档结果：**本地已等价 17 个 job / 可等价但缺失 32 个 / 无法本地等价 8 个**（按 job 计；`migration-test`、Docker、Storybook 为混合档，按主判定计入并在表中标注）。
- 主干（Rust 编译、前端 lint/typecheck、权限/菜单/API 静态门禁、迁移静态校验、敏感信息）**本地已覆盖**，pre-commit + pre-push 合计 57 个钩子命令。
- 但存在 **4 处「假绿」**：gitleaks 只扫暂存区（CI 扫全历史）、Rust clippy/check/test 只跑变更 crate 的 `--lib`（CI 跑全 workspace + 集成测试 + 覆盖率）、前端单测/覆盖率不在钩子内（CI 跑 unit + 5 分片 + 阈值）、迁移只做静态校验（CI 跑空库全链 + up-down-up + 审计）。
- 建议补齐顺序：**P0 修假绿（gitleaks 全历史、迁移动态演练、Rust/前端全量通道）→ P1 补 DB 依赖型静态门禁与 E2E 冒烟 → P2 镜像构建/性能/AI**；部署类（k8s、GitHub Pages、GHCR 推送、SBOM/SARIF 上传）本地不做。

## 1. 背景与证据

- 触发：commit `6e2bc1d30` 的 8 个 workflow 全部在 job 启动前失败（`steps=0`，耗时 3–13s），注解一致为上述计费报错；历史 run 同样如此，无代码级信号。
- 对账输入：
  - workflow 结构：用 PyYAML 解析 8 个文件，导出 job/step/run 清单（`/tmp/wf_inventory.json`，临时文件，不入库）。
  - 本地门禁：`lefthook.yml`（pre-commit 45 个命令、pre-push 12 个命令）。
  - 脚本与入口：`scripts/ci/`、`scripts/dev/`、`scripts/migration/`、`scripts/tools/`、`scripts/i18n/`、根 `package.json`、`apps/web/package.json`、`apps/desktop/package.json`。
- 判定口径：

| 档位 | 含义 | 标注 |
|---|---|---|
| **A** | 本地已等价，给出命令与位置 | `A`；覆盖缩水的标 `A⚠`（假绿） |
| **B** | 本地可等价但缺失，给出实现方式/依赖/耗时 | `B` |
| **C** | 无法本地等价（依赖 GitHub 托管服务） | `C` |

## 2. 总览

| workflow | job 数 | 主要职能 | 本地覆盖结论 |
|---|---|---|---|
| `ci.yml`（CI） | 41 | Rust/前端/静态门禁/迁移/桌面构建 | 主干已覆盖；全量编译测试、动态迁移、前端单测缺失 |
| `e2e.yml`（E2E） | 4 | Playwright 认证/业务流 | 部分：`run-e2e-stack.sh` 只覆盖 full-route-smoke 子集 |
| `docker-build.yml`（Docker Build） | 3 | 23 个镜像构建 + GHCR 推送 + SBOM | 镜像有本地构建脚本（`deploy/docker/build-local.sh`/`build-service.sh`）；推送/SBOM 不可 |
| `secret-scan.yml`（Secret Scan） | 2 | gitleaks 全历史 + Trivy fs | gitleaks 有钩子但范围缩水（A⚠）；Trivy 缺失 |
| `ai-tests.yml`（AI Tests） | 4 | AI 单测/clippy、AI E2E、k6 | 单测可本地跑；E2E/k6 缺失 |
| `e2e-web.yml`（Web E2E） | 1（22 step） | apps/web 全量 UI E2E | 可本地复现但需手工起栈，属 B |
| `storybook-docs.yml` | 1 | 构建并发布 Storybook 到 Pages | 构建可本地；发布不可 |
| `deploy-k8s.yml` | 1 | kubectl 部署 staging/prod | 不可本地等价 |

## 3. 逐 workflow 对账

### 3.1 `ci.yml`（41 个 job）

| # | job | 关键命令 | 档 | 本地对应 / 缺口 |
|---|---|---|---|---|
| 1 | Detect Changes | 路径过滤 → 输出开关 | C | CI 编排层；本地由 lefthook glob 按暂存文件路径触发，无需等价 |
| 2 | Rust Smoke | `cargo test -p topems-monitor … -p topems-unified-core --test smoke` | B | 无钩子；可手动跑，需 PG。约 5–10 min |
| 3 | Rust Lint | `cargo fmt --check --all` + `cargo clippy --workspace --all-targets -D warnings` | A⚠ | pre-push `cargo-fmt-check`（全量）+ `cargo-clippy-workspace`（**仅变更 crate**）。clippy 非全量 = 假绿 |
| 4 | 连接治理门禁 | `check-schema-prefix/search-path/pool-acquire/request-txn/check-pool-direct-system-scope` | A | pre-commit 同名 5 个钩子全在 |
| 5 | ShellCheck | `check-shellcheck.sh` + `check-prod-migration-entry` + `check-hardcoded-passwords` | A | pre-commit `shellcheck-changed`/`prod-migration-entry`/`hardcoded-passwords`；pre-push `shellcheck-workspace` 全量兜底 |
| 6 | 配置单一真相源 | `check-workspace-registry.py --check` + `check-config-sources.cjs --check` | B | 仅 pre-push `config-consistency`（`scripts/dev/check-config-consistency.py`）与 pre-commit `ports-consistency`，与 CI 两脚本不完全同源，需补一次显式调用 |
| 7 | CHANGELOG 校验 | `./scripts/release.sh check` | B | 脚本存在，无钩子；仅 tag 发布时相关，手动即可 |
| 8 | cargo check | `RUSTFLAGS=-D warnings SQLX_OFFLINE=true cargo check --workspace --all-targets` | A⚠ | pre-push `run-cargo-changed.sh check`（**仅变更 crate**）。全量缺失 = 假绿 |
| 9 | mes online compile | 导入 `fixtures/mes_compile_schema.sql` + `scripts/mes_guard.sh` | B | 脚本齐全，需本地 PG；约 3–5 min |
| 10 | runtime SQL contract | `fixtures/full_schema_contract.sql` + `scripts/dev/check-runtime-sql-contract.py --all` | B | 同上，需 PG；约 5–8 min |
| 11 | date-type-audit | `python3 scripts/date-type-audit.py` | B | 纯静态、秒级，**值得进 pre-push** |
| 12 | schema-defense-drift | `python3 scripts/check-schema-defense-drift.py` | A | pre-push `schema-defense-check` |
| 13 | Cargo Test | `cargo test --workspace`（带 PG） | B | pre-push 只跑变更 crate `--lib`；全量 + 集成缺失。约 20–40 min |
| 14 | Rust Tests | nextest 全量 + 集成（DB）+ llvm-cov + 覆盖率阈值 | B | 同上；coverage 本机可装 `cargo-llvm-cov`，耗时长 |
| 15 | Rust Security Audit | `cargo audit` | B | 未入钩子；需 `cargo-audit` + 网络索引。约 2–5 min |
| 16 | Cargo Deny | `cargo deny check` | B | 同上 |
| 17 | Frontend Lint | `pnpm lint` + `lint:a11y` + `check-dependency-audit.cjs` + `check-api-boundary.cjs` | A⚠ | pre-commit `frontend-lint`（eslint+prettier）、`a11y-changed`（仅变更）、`api-boundary-gate`；**依赖安全审计缺失** |
| 18 | Design System Token | `pnpm --filter @topems/tokens build` + `check-design-tokens.mjs` | A | pre-commit `design-tokens-changed`（增量） |
| 19 | Frontend Audit | 8 个脚本（page/icon/nav/api 模块/API 覆盖/a11y/token/i18n） | B | 仅 `icon-page`、`a11y-changed`、`design-tokens-changed`、i18n 部分在 pre-commit；page-audit/nav-route/api-coverage 未接。纯 node，约 1–2 min |
| 20 | OpenAPI Gate | `check-openapi-coverage.cjs` + `check-openapi-aggregated.cjs` | A | pre-commit `openapi-gate` + `api-gate` |
| 21 | i18n Quality Gate | `check-i18n-quality.cjs --strict` + `verify-glossary.cjs --strict` + `scan-hardcoded-precise.cjs --strict` | A | pre-commit `i18n-quality`/`glossary-verify`/`hardcoded-precise` |
| 22 | Permission Matrix Gate | `perm-matrix-toolkit.cjs` + `gen-permissions --check` + `check-no-runtime-permission-insert.mjs` | A | pre-commit `perm-matrix`/`perm-codegen`/`perm-seed-guard`（本轮新增守卫） |
| 23 | Menu Health Gate | `node scripts/analyze-menu.cjs`（fail-fast 基线 T1/T2/P1/R3=0） | B | 脚本存在，无钩子；纯 node，约 30s，**建议进 pre-push** |
| 24 | Axum Layer Gate | `check-axum-layer-order.cjs` + `check-group2-services.cjs --strict` | A | pre-commit `axum-layer` |
| 25 | API Audit Gate | `check-api-audit.cjs`（P6+P7 基线） | A | pre-commit `api-gate` |
| 26 | Frontend Type Check | `pnpm --filter topems-portal typecheck` + 全部 shared packages | A⚠ | pre-commit `frontend-typecheck` 只做 portal；shared packages 未覆盖 |
| 27 | Frontend Tests | `test:unit` + `test:shard:1..5`（矩阵 6 个） | B | 钩子内**无 vitest**；可 `pnpm --filter topems-portal test:all`。约 8–15 min |
| 28 | Frontend Coverage | `test:coverage` + 阈值检查 | B | 同上，约 10–15 min |
| 29 | Frontend Build | `pnpm build` + `bundle-check.sh`（30M/500K/2500K/1500K 预算） | B | 命令可手动跑；未入钩子。约 5–8 min |
| 30 | Lighthouse | `lhci autorun`（preview server） | B | `apps/web` 有 `perf:ci`（lhci）；需 Chrome + 构建产物。约 3–5 min |
| 31 | Security Scan | `pnpm audit --prod … || true` + 代码密钥扫描 | B | npm audit 在 CI 本身就非阻断（`|| true`）；本地缺失，属 P2 |
| 32 | Code Quality | `check_api_duplicates_ci.py` + `check_component_naming.py` + console.log + `check_allow_baseline.sh` | B | 脚本全在 `scripts/tools/`、`scripts/`，未入钩子；纯 python/bash，约 1 min |
| 33 | Migration Up-Down-Up | 6 个静态检查 + 空库全链 + `validate.sh` + `audit_permission_codes.py --gate` | A+B | 静态部分 A（pre-commit `migration-validate`/`migration-prod-guard`/`baseline-integrity`，pre-push `migration-insert-shape`）；**动态部分 B**：`scripts/ensure-empty-db-prereqs.sh` + `scripts/migration/validate.sh` 可手动跑（需 PG + `sqlx-cli`，约 5–10 min） |
| 34 | Desktop Build | `pnpm --filter @topems/api-client build` + `apps/desktop` 的 `pnpm run build`（Tauri，矩阵 mac/win/linux） | B | 本机可构建 macOS 目标；跨平台产物与 artifact 上传不可 |
| 35 | Error Handling Gate | `check-error-handling.cjs --changed-only` | A | pre-commit `error-handling`（同为 changed-only） |
| 36 | Quality Gate | 汇总 25 个 needs + SQLx cache freshness（warn） | C | 聚合器；本地无对应概念 |
| 37 | Schema Boundary Gate | `check_schema_boundary.py` + `check-schema-boundary.cjs` | A | pre-commit `boundary-gate`/`boundary-gate-py` |
| 38 | Schema Defense Gate | 19 schema + 26 二进制预编译 + `defense-check-all` + sqlx cache 语义校验 | B | 需本地 PG + 建 19 schema + 长时间编译；约 20–40 min，建议仅在迁移/DDL 变更时手动跑 |
| 39 | Slow DB Startup Test | `scripts/dev/test-slow-db-startup.sh 10` | B | 脚本在，无钩子；需 PG，约 1–2 min |
| 40 | Nightly Failure Notify | GitHub Issue | C | GitHub 服务 |
| 41 | Environment Check | 内联 Python 校验 YAML/端口/环境变量一致性 | B | 与 #6 部分重叠；可合并进一次本地静态检查 |

### 3.2 `e2e.yml`（4 个 job）

| job | 关键命令 | 档 | 说明 |
|---|---|---|---|
| E2E Smoke | 起 PG → `sqlx migrate run` → `cargo build -p topems-server` → `:8080` → `npx playwright test tests/auth.spec.ts tests/production-order.spec.ts`（working-directory `tests/e2e`） | B | 本地有 `scripts/dev/run-e2e-stack.sh up/smoke`，但只跑 `apps/web/e2e/ui/full-route-smoke.spec.ts`，**不含 auth/production 两个 spec** → 部分等价 |
| E2E Business | `npx playwright test tests/purchase-order.spec.ts tests/financial-voucher.spec.ts` | B | spec 文件确认存在于 `tests/e2e/tests/`；无对应脚本，需手工起栈后跑。约 15–25 min |
| E2E Cross-browser | chromium/firefox/webkit 全跑 | B | `npx playwright install` 后本地可跑；仅 workflow_dispatch/nightly 触发 |
| E2E Summary | 汇总 | C | GH 服务 |

### 3.3 `docker-build.yml`（3 个 job）

| job | 关键命令 | 档 | 说明 |
|---|---|---|---|
| Build `<matrix>` | `docker/build-push-action` 构建 23 个镜像（unified-core、monolith、erp、finance、ai、hrm、pm、crm、mes、pdm、scm、wms、srm、qms、lims、ehs…），推 GHCR | A/C | 镜像构建本地已等价：`deploy/docker/build-local.sh`（21 服务串行、断点续跑）与 `build-service.sh <svc>`；**推送/SBOM/attestation 属 C**。全量首次 30–60 min，手动 |
| Build Frontend Image | 同上，`apps/web` 镜像 | A/C | 本地 `apps/web/Dockerfile` + compose 可构建；推送 C |
| Summarize | 汇总 | C | GH 服务 |

> 现状：仓库根无 `Dockerfile`，镜像入口为 `apps/web/Dockerfile`、`svc/unified-core/Dockerfile` 与 `deploy/docker/*`；本地构建脚本齐全但不在任何钩子内（手动、低频）。

### 3.4 `secret-scan.yml`（2 个 job）

| job | 关键命令 | 档 | 说明 |
|---|---|---|---|
| Gitleaks Scan | `gitleaks/gitleaks-action@v2`，checkout `fetch-depth: 0`（**全历史**） | **A⚠ 假绿** | 本地 pre-commit `gitleaks protect --staged` 只扫暂存增量；**pre-push 无 gitleaks**；且未安装时降级 SKIP+WARN。全历史/全分支从未在本地扫过 |
| Trivy Filesystem | `trivy fs --severity CRITICAL,HIGH` → SARIF | B | 未安装、未入钩子；`brew install trivy` 后 1–3 min（SARIF 上传属 C） |

### 3.5 `ai-tests.yml`（4 个 job）

| job | 关键命令 | 档 | 说明 |
|---|---|---|---|
| AI Unit Tests | `cargo test -p topems-ai --lib` + `cargo test -p topems-unified-core --lib ai::` + clippy | B | 本地可跑（需 PG）。约 5–10 min |
| AI E2E | `playwright test tests/ai-*.spec.ts` | B | 需完整栈（后端 + web + AI 服务）；规格路径同上待核实 |
| AI Performance | k6 smoke（`ai-dsh-service.k6.js`） | B | 需 `k6` + release 构建；仅手动触发，P2 |
| AI Tests Summary | 汇总 | C | GH 服务 |

### 3.6 `e2e-web.yml`（1 个 job / 22 step）

| job | 关键命令 | 档 | 说明 |
|---|---|---|---|
| Web UI E2E | `sqlx migrate run` → `seed-e2e-core.sql` → `topems-server :8099` → `vite preview :3000` → 4 组 Playwright：7 模块冒烟子集、数据断言型核心 spec、518 路由全量（nightly）、tms-shipment 全流程 | B | 本地元件齐全：`scripts/dev/run-e2e-stack.sh`（8099）+ `scripts/dev/seed-e2e-core.sql` + `apps/web` 的 `e2e` 脚本；**一键编排缺失**。核心子集约 15–25 min，全量 60 min+ |

### 3.7 `storybook-docs.yml`（1 个 job）

| job | 关键命令 | 档 | 说明 |
|---|---|---|---|
| Deploy | `pnpm --filter topems-portal build-storybook` → `upload-pages-artifact` → `deploy-pages` | B/C | 构建本地可做（A 级命令）；**发布到 GitHub Pages 属 C** |

### 3.8 `deploy-k8s.yml`（1 个 job）

全部 **C**：`kubectl apply -f k8s/base/`、`kubectl set image … ghcr.io/...`、`rollout status`、smoke tests。依赖集群凭据与 GHCR 镜像，本地不可等价（本地 kind/minikube 只能验证清单语法，不等于 CI 行为）。

## 4. 假绿风险（重点）

| # | 假绿点 | 本地实际 | CI 实际 | 后果 |
|---|---|---|---|---|
| 1 | **gitleaks** | `gitleaks protect --staged`（仅暂存；未安装直接 SKIP） | `fetch-depth: 0` 全历史 + action | 历史提交/未暂存文件中的密钥本地永不可见 |
| 2 | **Rust clippy / check** | `run-cargo-changed.sh`：仅变更 crate，`RUSTFLAGS=-D warnings` 只作用于它们 | `cargo clippy --workspace --all-targets`、`cargo check --workspace --all-targets` | 未变更 crate 的 warning/编译错误本地放行 |
| 3 | **Rust test** | 变更 crate `cargo test --lib`；`LEFTHOOK_RUN_HEAVY=1` 才 `--workspace --lib` | `cargo nextest run --workspace`（含集成测试，带 DB）+ coverage 阈值 | 集成测试、跨 crate 行为、覆盖率阈值本地从未验证 |
| 4 | **前端单测** | 钩子只有 eslint + portal typecheck | unit + 5 分片 + coverage 阈值 + build + bundle 预算 + lighthouse | 测试失败可在本地全绿后进入仓库 |
| 5 | **迁移动态验证** | pre-commit `validate.sh`（仅暂存含迁移时）+ 静态检查 | 空库全链 + up-down-up + `validate.sh` + `audit_permission_codes.py --gate` | 迁移在空库/回滚路径上的问题本地不暴露（本轮第 2 项已在克隆库手工演练，但未固化为钩子） |
| 6 | **a11y / design-tokens / i18n** | 钩子多为 `--changed-only` | 全量 strict + baseline | 存量回退不易被本地发现 |
| 7 | **E2E** | `run-e2e-stack.sh smoke` 仅 full-route-smoke | 4 组 spec + 518 路由全量 | 业务流与数据断言型用例本地缺跑 |
| 8 | **CI 自身非阻断项** | — | `pnpm audit … || true`、SQLx cache freshness warn 模式 | 即使 CI 恢复，这两项也不构成门禁 |

## 5. 补齐方案（按主干优先）

依赖基线：本地已有 PostgreSQL（`topems_test_runner`/`topems_prod` 只读）、Node/pnpm、Rust；以下耗时为**估算**。

### P0 — 修假绿（主干正确性，先做）

| 项 | 目标 | 实现方式 | 依赖 | 估算 |
|---|---|---|---|---|
| P0-1 | gitleaks 覆盖全历史 | pre-push 增加 `gitleaks detect --redact --verbose`（全仓）或 `gitleaks git --log-opts="$(git merge-base origin/main HEAD)..HEAD"`；保留 pre-commit 暂存扫描 | gitleaks（`brew install gitleaks`） | 全仓扫描 5–20s/次 |
| P0-2 | 迁移动态演练固化 | 新脚本（建议 `scripts/dev/run-migration-drill.sh`）：临时库 → `ensure-empty-db-prereqs.sh` → `validate.sh` → `audit_permission_codes.py --gate` → up-down-up | 本地 PG + `sqlx-cli` | 5–10 min |
| P0-3 | Rust 全量通道可用 | 已有 `LEFTHOOK_RUN_HEAVY=1`；补一份显式命令清单：`cargo clippy --workspace --all-targets -- -D warnings`、`cargo check --workspace --all-targets`、`cargo test --workspace --lib` | Rust + SQLx cache | 10–30 min |
| P0-4 | 前端单测与覆盖率 | `pnpm --filter topems-portal test:all`、`test:coverage`（阈值脚本在 CI 内联，需一并本地化） | Node/pnpm | 8–15 min |

### P1 — DB 依赖型门禁与 E2E 冒烟

| 项 | 目标 | 实现方式 | 依赖 | 估算 |
|---|---|---|---|---|
| P1-1 | runtime SQL contract / mes online / schema defense / slow-db | 复用 CI 命令，本地 PG + `fixtures/*.sql` | PG、19 schema、长编译 | 5–40 min |
| P1-2 | 静态审计族一次跑完 | 汇总 `scripts/ci/check-api-audit.cjs`、`analyze-menu.cjs`、`check-axum-layer-order.cjs`、`scripts/tools/check_*`、`date-type-audit.py` | Node/Python | 1–3 min |
| P1-3 | E2E 冒烟（含 auth/production/business） | 在 `run-e2e-stack.sh` 增加 spec 组参数；先确认 `tests/*.spec.ts` 的真实路径 | PG + Rust 构建 + Playwright | 15–30 min |
| P1-4 | Web E2E 核心子集 | 按 `e2e-web.yml` 17/18 步复刻：构建 web → `vite preview` → 7 模块子集 | Playwright + 构建产物 | 15–25 min |
| P1-5 | cargo audit / cargo deny | 安装后直接跑；可月度而非每次 push | 网络索引 | 2–5 min |

### P2 — 可选/低频

- Docker 镜像：本地脚本已存在（`deploy/docker/build-local.sh`、`build-service.sh`），属低频手动，只需在 Dockerfile/依赖变更时执行；推送/SBOM 仍不可本地。
- Lighthouse（`apps/web` `perf:ci`）、desktop macOS 构建、AI 单测/E2E、k6 perf。
- 依赖安全审计（`pnpm audit --prod`，CI 本身非阻断）。

### 不做（C）

- `deploy-k8s.yml` 全部步骤（集群凭据、GHCR 镜像、rollout 验证）。
- `storybook-docs.yml` 的 Pages 发布。
- Docker 推送、SBOM 生成/上传、Trivy SARIF 上传。
- `nightly-failure-notify`、各 workflow 的 summary job、`quality-gate` 聚合器、`Detect Changes` 编排。

## 6. CI 恢复后的定位

1. **CI 是复核，不是唯一门禁**：计费恢复后 CI 仍可能因 runner 镜像、第三方 action、网络而抖动；本地 P0/P1 通过应视为「可进入复核」，CI 绿是「可发布」，两者不可互相替代。
2. **门禁分层**：pre-commit（秒级：lint/typecheck/静态/权限/敏感信息）→ pre-push（分钟级：增量 Rust、全量 shellcheck、gitleaks 全历史、迁移静态）→ 本地全量演练（P0-2/P0-3/P0-4）→ CI（全矩阵复核 + 托管服务）。
3. **本次计费故障的教训**：本地 57 个钩子命令已覆盖大部分静态门禁，但**动态验证（DB 集成、E2E、覆盖率）与全历史密钥扫描**是结构性缺口；CI 停摆期间这些项必须显式手工执行并记录。
4. **恢复后的第一批跑法**：先 `gh run rerun` 最近一次 push，确认 8 个 workflow 能正常启动；再对比本对账表第 4 节 8 处假绿，决定是否把 P0 项固化为钩子（需另开改动，本轮不做）。

## 附录：复核命令

```bash
# workflow 结构导出（只读）
python3 - <<'PY'
import yaml,glob
for f in sorted(glob.glob('.github/workflows/*.yml')):
    d=yaml.safe_load(open(f))
    print(f, len(d.get('jobs') or {}), 'jobs', sum(len(j.get('steps') or []) for j in (d.get('jobs') or {}).values()), 'steps')
PY

# 本地钩子清单
awk '/^pre-commit:/{f=1} /^pre-push:/{f=0} f && /^    [a-z0-9-]+:/{print $1}' lefthook.yml
awk '/^pre-push:/{f=1} f && /^    [a-z0-9-]+:/{print $1}' lefthook.yml
```

## 7. P0 收尾实测与遗留（2026-11-18）

本节只记录**实测**结果，替代第 5 节的估算。测量环境：macOS / 10 核 / gitleaks 8.30.0 / 本机 PostgreSQL。
测量期间有其它会话的 `cargo test` 争用 target 构建锁，系统 load average 约 36（10 核），
因此 Rust / 前端读数为**显著偏高**口径，干净 CI 机器应更低。

### 7.1 gitleaks：347 → 120 条冻结

| 口径 | 命中 | 耗时 | 退出 |
|---|---|---|---|
| `gitleaks git`（原始规则） | 347 | 39.1s | 0（`--exit-code 0`） |
| 收紧规则后全历史 | 120 | 39s 量级 | 0 |
| `bash scripts/ci/check-gitleaks-full.sh`（含 baseline） | 0 新增 | **44s / 51s（两次）** | 0 |

仓库规模：约 1.26 万 commits / 1.10GB。

#### 7.1.1 修的洞：`.env` 路径豁免把模板一起放过了

原 allowlist 用 `'''\.env'''` 宽匹配，任何路径含 `.env` 都豁免，连带 `.env.example`、`.env.mail`、
`config/standalone.env` 全部不扫——真实值从来没被看见过。现改为：

```toml
''' (^|/)\.env$ '''   # 只豁免本机 .env 本身
```

`.env.example` / `.env.*.example` / `*.env` 模板重新纳入扫描；占位符改由**规则级 allowlist** 排除。

#### 7.1.2 规则收紧

| 规则 | 改动 |
|---|---|
| `topems-database-url` | 正则 `postgres://[^:]+:([^@]+)@` → `postgres(?:ql)?://[^:\s/]+:([^@\s/]+)@`（旧写法跨行吞掉 sed/代码，347 里 20+ 条是误捕）；新增 allowlist：`dev_password/topems/postgres/pass/password/pw/placeholder/nobody/test/...`、`${...}`、`-topems}`、含正则元字符或空白的误捕 |
| `topems-jwt-secret` | 新增 allowlist：`topems-jwt-secret*`、`your-*`、`*change-in-production*`、`this-is-a-very-long-secret-key-at-least-32-chars`、含换行/正则元字符的代码误捕 |

#### 7.1.3 基线冻结（冻结 ≠ 已处理）

`scripts/ci/gitleaks-baseline.json` 冻结 **120 条**，为**脱敏**报告（`"Secret": "REDACTED"`），不含明文密钥：

| 规则 | 条数 |
|---|---|
| `generic-api-key` | 102 |
| `jwt` | 8 |
| `curl-auth-header` | 6 |
| `topems-database-url` | 2 |
| `private-key` | 2 |

347 → 120 的构成：database-url 257→2（规则收紧 -255）、jwt-secret 22→0（allowlist -22）、
generic-api-key 52→102（模板文件重新纳入扫描 +50）、jwt/curl/private-key 不变。

fail-closed 已实测：临时仓库新增一条不同随机口令 → exit=1；删除 baseline → exit=1；
脱敏不会造成假阴性（同文件 + 同规则、口令不同的新命中仍被拦截）。

**这 120 条只是「不再阻断」，不代表已处理。** 其中真实凭据单独跟踪如下。

#### 7.1.4 真实凭据（5 个凭据 / 15 条命中）与处理状态

| # | 凭据（打码） | 命中位置 | 暴露时间 | 现状 | 处理状态 |
|---|---|---|---|---|---|
| 1 | `SMTP_PASSWORD=BMyf23…`（163 邮箱 topmap@163.com） | `.env.example:43`（6226ce55/bdabc29c/9190e370）、`.env.mail:7`（8eedba1e）、`scripts/init-db-local.sh:298`（15dd6906/7b4660e9/6f926c00） | 2026-06-10 → 2026-06-30 清除 | 本机 `./.env` 仍为同值 | **立刻轮换**：用户今天自行重置邮箱授权码（已转达） |
| 2 | `JWT_SECRET=78e96b07…` | `config/standalone.env:20`（e9d7038e/ebf380f1） | 2026-08-20 | 文件已 untracked；当前值为 2026-10-07 重建的 `6e4f994d…` | **窗口轮换**：是否有现役 standalone 实例未确认，按在用处理 |
| 3 | `REFRESH_SECRET=7dbad3b5…` | `config/standalone.env:21`（e9d7038e/ebf380f1） | 2026-08-20 | 同上（当前 `5871e349…`） | **窗口轮换**（同 #2） |
| 4 | 本地 PG 口令 `3b07cf82…` | `scripts/dev/check-runtime-sql-contract.py:31`（2f3f6ca9）、`scripts/dev/audit-date-types.sh:24`（3d3c5d4f） | 2026-10-12 | `check-runtime-sql-contract.py` 仍硬编码；`audit-date-types.sh` 已改为从 env 提取 | **代码改为从 env 读取 + 轮换本地口令**（仅 localhost/topems，非生产） |
| 5 | 开发自签私钥（RSA2048, CN=localhost） | `docker/nginx/certs/localhost.key:1`（3ab58a82/ecdd1077） | 2026-06-03 | 已从工作树删除，全仓无 `ssl_certificate` 引用，证书自签、2026-06-02→2027-06-02 | **噪音，无需轮换** |

结论：立刻轮换只有 #1；#2/#3 进生产窗口；#4 先改代码再换本地口令；#5 纯噪音。

### 7.2 迁移演练：拆两档 + 两条已知缺陷

`verify:migration-drill` 拆为：

- `npm run drill:anchor`：正式闸门，fail-closed。从 `database/baseline` 快照恢复隔离库（schema →
  账本 → 参考数据，校验 sha256），再 `apply-forward.sh` 只应用 `version > anchor` 的前向迁移，
  随后 `validate.sh` + `audit_permission_codes.py --gate` + up-down-up 重放。
- `npm run drill:zero`：空库全链，**已知缺陷 MIG-001，预期失败**；不进 pre-push、不进 `verify:full`。
  仅当失败签名命中 MIG-001 时返回 0，其它失败仍非 0。

| 缺陷 | 位置 | 现象 | 影响面 | 现网是否受影响 |
|---|---|---|---|---|
| **MIG-001** | `20261005000004_lims_qa_lab_fk_repoint.sql:52` | 空库链引用 `public.qa_lab_tasks`，但该表直到 `20261007000009:2902` 才创建，且 `20261003000002` 已 DROP 掉 `lims/qms` 副本 → `relation "public.qa_lab_tasks" does not exist` | 新建环境从零部署、灾备重建 | **不受影响**：演进库该表在历史中早已存在 |
| **MIG-002** | `20261114100000` | 基线快照 `20261105235700` 缺约束 `ehs.ck_qa_ehs_disease_cases_status_standard`，迁移守卫主动中止 | 从旧基线恢复的新环境/灾备 | **不受影响**：`topems_prod` 账本 20261117235500 且该约束存在（只读已核） |

另：仓库**没有** `20261115130000` 锚点的快照（现有唯一锚点 20261105235700；生产副本账本已到
20261117235500）。因此 `drill:anchor` 默认取最新可用锚点，检测不到指定锚点资产时直接 fail-closed。

#### 7.2.1 P1 立项：生产锚点新基线

- **正确修法**：以当前生产账本（20261117235500）生成新基线（schema + 账本 + 参考数据 + sha256），
  把历史迁移归档；`drill:anchor` 从新基线向前跑。**不是**前移建表语句，也**不是**改已应用迁移。
- **为什么不能改已应用迁移**：sqlx 会校验 `_sqlx_migrations` 的 checksum，改动后所有后续迁移报
  「previously applied but has been modified」，新环境与现网同时瘫痪。
- **影响面**：新环境从零部署、灾备重建；现网不受影响（证据：prod 副本存在缺失约束、账本已越过缺陷版本）。
- **当前代价**：迁移类 push 的 `drill:anchor` 为红，直到新基线建成；这是有意 fail-closed。

### 7.3 四个 verify 实测

| 命令 | 退出 | 实测耗时 | 说明 |
|---|---|---|---|
| `npm run drill:zero` | 0 | **3.4s** | 输出 `EXPECTED-FAIL [MIG-001]` |
| `npm run drill:anchor` | 1 | **18.3s** | 恢复基线 + 前向迁移在 `20261114100000` 失败（MIG-002） |
| `npm run verify:rust-full` | 1 | **25.8s** | 在 `cargo fmt --all --check` 即失败：**59 个文件的未提交格式改动来自其它会话的 WIP**，不是本次改动；`git worktree` 验证 HEAD 本身 fmt 干净（失败时 rustfmt 会打印全部 diff，耗时主要在输出） |
| `npm run verify:web-full` | 1 | **19m07s** | 6649 passed / 1 failed（`ForceChangePasswordPage.tsx loads without throwing` 在 120s 超时）/ 1 skipped；覆盖率阈值未触发失败。**该超时在随后 `verify:full` 的同一用例中未复现（通过）→ 高负载下的 flaky，不是确定性失败** |
| `npm run verify:full` | 1 | **17m10s** | 并行：Rust 侧 22s（fmt 失败，他人 WIP）、前端侧 **1029s 通过**；总耗时 ≈ max(两侧) |
| `bash scripts/ci/check-gitleaks-full.sh` | 0 | **51s** | 全历史 + baseline（前一次 44s） |

Rust 分阶段实测（同一工作树，串行；含其它会话构建锁争用）：

| 阶段 | 耗时 | 退出 |
|---|---|---|
| `cargo fmt --all --check` | 0.6s | 1（他人 WIP） |
| `RUSTFLAGS=-D warnings cargo check --workspace --all-targets` | **6m50s** | 0 |
| `cargo clippy --workspace --all-targets -- -D warnings` | **9m01s** | 0 |
| `cargo nextest run --workspace` | **31m36s** | 100（1066 passed / 1 failed / 514 skipped） |
| `cargo llvm-cov test --workspace` | 未实测 | —（`verify:rust-full` 在 fmt 阶段即中止，且该项不属 pre-push；接入 CI 前需单独测） |

`cargo nextest run --workspace` 唯一失败项：
`topems-ai::integration_tests::test_faq_admin_crud_roundtrip`（`svc/ai/tests/integration_tests.rs:252`）——
`42501 new row violates row-level security policy for table "ai_faqs"`。该文件本身处于他人未提交状态，
且与租户 RLS 策略相关；**不是本次改动引入**，但说明当前工作树的 workspace 测试不是全绿，
`verify:rust-full` 即使跳过 fmt 也不会通过。

> 结论：`verify:rust-full` / `verify:web-full` 明确不进 pre-push；pre-push 只保留增量 Rust 与
> 全历史 gitleaks。

### 7.4 pre-push 新增预算

| 新增命令 | 触发条件 | 实测 | 是否计入常规 push |
|---|---|---|---|
| `gitleaks-full` | 每次 push | 44–51s | 是 |
| `migration-drill-anchor` | 仅 `database/migrations/**` 或 `database/baseline/**` 变更 | 18.3s | 否（常规 push 秒级跳过） |

新增总耗时：常规 push **+44–51s**，迁移类 push **+62–69s**，均低于 2–3 分钟上限。
`lefthook.yml` / `package.json` 的改动按约定**未提交**，等确认后再落。

### 7.5 standalone 部署现状（供 flow 18 张影子表共用）

- `config/standalone.env` **仍是活的部署机制，未标废弃**：`scripts/install-deps.sh:275` 生成它，
  另有 7 处消费方（`topems.sh`、`start-local.sh`、`sqlx-prepare.sh`、`update-admin-password.sh`、
  `audit-date-types.sh`、`ai-models.sh`、`windows/topems.ps1`）。
- 该文件已 untracked（`.gitignore:37`），2026-10-07 重建为随机值；审计文档确认四个真实密钥的
  **在线轮换仍待用户/运维执行**。
- 结论：**是否有现役实例未确认，按在用处理**。因此 7.1.4 的 #2/#3 必须进窗口轮换；
  同时它**不能作为「嵌入式部署已停用」的证据**，`flow` 18 张影子表仍需独立取证。

## 8. 生产锚点快照与 14 条窗口预演（2026-11-18）

### 8.1 锚点口径改为「生产当前 schema 快照」

固定版本号 `20261115130000` 在仓库不存在，该口径作废。新锚点取生产账本当前最大版本 `20261117235500`。

只读证据（未写入生产）：`current_user=topems_prod` 时 `pg_is_in_recovery=f`、`default_transaction_read_only=off`；
本轮对生产只执行 `SELECT` / `pg_dump`，无任何 DDL/DML。探测时账本 704 条成功记录、max(version)=`20261117235500`。

| 资产（`database/baseline/`） | 大小 | sha256（前 16 位） |
|---|---:|---|
| `prod_schema_20261117235500.sql.gz` | 184259 B | `6e6c67938809c7bd` |
| `prod_ledger_20261117235500.sql` | 221743 B | `164519ff57a8b4ed` |
| `baseline_20261117235500_data.sql.gz` | 152005 B | `ab4919f101205fea` |
| `baseline_20261117235500.json` / `_data.json` | 3698 / 1468 B | 记录 schema/ledger/data 哈希 |

元数据：源库 `topems_prod`、源主机 `127.0.0.1/32`、`PostgreSQL 18.4 (Homebrew)`、生成时间 `2026-11-18T03:53:00Z`、
表 **1345**、账本成功 **704**、参考数据 **10 张表 / 4740 行**。
`node scripts/ci/check-baseline-integrity.mjs` **PASS**；`anchors.json` 追加至 `20261117235500`，保持单调不减。

版本化规则（已落地）：
- 一个锚点一份不可变快照；`gen-baseline.sh` 对已存在的锚点文件默认**拒绝覆盖**，`--force` 必须人工显式给出。
- 哈希双写：元数据与 `anchors.json` 同时记录 schema/ledger/data 的 sha256；`check-baseline-integrity.mjs` 阻断不一致。
- 保留策略：全部保留，不清理；单份资产约 0.15–0.22 MB。
- 使用方式：`drill:anchor` 自动取 `anchors.json` 最大值，不再依赖固定版本号；pre-push 仅在
  `database/migrations/**` / `database/baseline/**` 变更时触发。
- 本轮**只生成、不提交**（`git add/commit` 均未执行），工作树留给用户确认。

生成前修正的两处洞：
1. `gen-baseline.sh` 对齐白名单原为硬编码 16 条，而当前 version ≤ 锚点却不在 prod 账本的迁移有 **59 条**。
   改为「16 条定向 ∪ `database/migration_manifest.yaml` 已登记版本」，不新增第二份清单；未登记的新迁移仍会硬失败。
2. 参考数据脚本增加 `--tables` 显式覆盖，并把用户引用列检查限定在本次实际纳入的表，避免 `--tables` 剔除后误报。

生产只读账号权限缺口：`topems_prod` 对 `mes.tenant_backfill_quarantine` **无 SELECT**，
`pg_dump --schema-only` 在 `LOCK TABLE` 阶段即失败（不是无声失败，是整份 dump 失败）。
只读普查该角色缺 SELECT 的表**仅此 1 张**（其余缺 USAGE 的 schema 均为临时 schema）。
因此重建快照必须使用超级用户或先补齐授权；本轮用本机超级用户只读连接生成，仍为零写入。此项已写入
`docs/quality/environment-provisioning.md` §4。

参考数据 PII 审查（10 张纳入 / 其余只带结构）：
- 纳入：`core_permissions`(1157，audit gate 唯一依赖)、`core_role_permissions`(2917，纯 ID)、`core_roles`(17)、
  `core_tenants`(1，`database_host/port` 全 NULL)、`core_menus`(452)、`core_menu_groups`(130，FK 父表)、
  `finance.core_finance_currencies`(16)、`finance.core_finance_report_line_map`(48)、
  `pm.project_type_configs`(1)、`mobile.sync_policies`(1，`user_id` 为不透明 UUID)。
- 只带结构：`core_tenant_settings`、`core_dict_types`、`core_dict_items`（均 0 行）；
  `hrm.departments`、`hrm.positions`（人员/组织域，0 行）。
- 含姓名/手机/邮箱/身份证/地址明文的表一律不带数据；列名正则审查 0 命中。

后 4 张 `finance/pm/mobile` 表是预演中发现的追加项：`20261118110000` 有硬前置断言
（NULL 租户行 = 8/48/1/1），空表会直接 `RAISE EXCEPTION`。首次 `drill:anchor` 正是在该条失败，
补齐后才与生产一致。

### 8.2 `drill:anchor` 新锚点基线

`npm run drill:anchor` **PASS，83s**：恢复 schema+账本+参考数据 → 向前应用全部 15 条待应用迁移
（含用户清单外的 `20261118124000`，gate 不区分窗口清单）→ `validate.sh` → `audit_permission_codes --gate`
→ 整库重建重放。该结果只证明闸门可用；窗口预演按下面的 14 条单独计时。

### 8.3 14 条逐条预演（隔离库，生产零写入）

隔离库 `topems_window_drill_<pid>`，恢复 schema + 账本 + 参考数据后，每条用
`apply-forward --only <v> --defer <其余>` 单独调用，`20261118124000` 全程显式 defer。
耗时含每次调用的全仓 checksum 预检（约 1.9–2.5s），迁移 DDL 本身远小于该值。

| 版本 | 耗时(s) | 账本 | 策略数 | 策略数变化（表: 前→后） | 策略定义变化（策略名） |
|---|---:|---:|---:|---|---|
| `20261118090000` | 2.35 | 705 | 1036 | navigation_menu 1→0；pinned_apps 1→0；todos 1→0 | core_operation_logs、subscriptions 换为 `rls_tenant_isolation`；三张骨架表策略删除 |
| `20261118093000` | 2.20 | 706 | 1044 | bi.analytics_* 8 张 0→1 | 8 张新增 `rls_tenant_isolation` |
| `20261118100000` | 2.25 | 707 | 1047 | qa_inspection_items/plans、qa_sampling_plans 0→1 | 3 张新增 `rls_tenant_isolation` |
| `20261118103000` | 2.24 | 708 | 1047 | 每表 1→1 | hrm.initialization_logs、qms.quality_inspections/standards：allow_all → `rls_tenant_isolation` |
| `20261118110000` | 2.11 | 709 | 1046 | mobile.sync_policies 2→1 | 4 张 `rls_global_read` → `rls_platform_read`；sync_policies 去掉全局读 |
| `20261118111000` | 2.09 | 710 | 1046 | — | —（策略重建为规范形式，文本一致） |
| `20261118112000` | 2.40 | 711 | 1046 | 每表 1→1 | gis 4 表 allow_all → `rls_tenant_isolation` |
| `20261118113000` | 1.86 | 712 | 1047 | portal_quick_actions 1→2 | allow_all → `rls_tenant_isolation` + `rls_platform_read` |
| `20261118120000` | 2.10 | 713 | 1046 | rs.formulas 2→1 | erp 字典 2 表、rs.formulas 换为 `rls_tenant_isolation` |
| `20261118123000` | 2.11 | 714 | 1047 | core.core_plugins 1→2 | allow_all → `rls_tenant_isolation` + `rls_platform_read` |
| `20261118125000` | 2.18 | 715 | 1047 | — | —（种子 0 行：69 个权限码已存在） |
| `20261118130000` | 2.25 | 716 | 1048 | erp.holidays 1→2 | allow_all → `rls_tenant_isolation` + `rls_platform_read` |
| `20261118140000` | 2.40 | 717 | 1047 | core_tenants 2→1 | `rls_global_read`/`rls_system_only` → `rls_tenant_isolation` |
| `20261118150000` | 2.17 | 718 | 1050 | core_file_permissions/core_users/monitor_thresholds 0→1 | 3 张新增 `rls_tenant_isolation` |

- 14/14 成功，表数全程 1345，业务行数（不含账本）全程 4740，行数变化只有账本 `+1/条`。
- `20261118125000` 零增量：生产本就存在 69 个权限码与角色绑定，`ON CONFLICT` 幂等。
- `20261118110000`/`20261118140000` 的 `UPDATE` 只改 `tenant_id`，不改行数。
- 执行顺序与「090000 先」的原因见窗口 runbook §2。

### 8.3.1 账本可信度与「未应用」判据（2026-11-18 复核）

**方法论**：`_sqlx_migrations.success=t` 只证明「该版本被登记过」，不证明「在本库执行过」。
生产账本 704 行里有 6 个同一秒批量导入批次（531 行），因此账本水位不能作为开窗前置判据；
前置检查改为「anchor 基线的 schema diff + RLS 指纹」（`scripts/migration/check-pending-ddl.mjs`）。

历史 6 条曾被称为「已证伪」的版本，按 schema diff 复核后必须拆分：

| 版本 | 复核结果 | 依据 |
|---|---|---|
| `20261014000000` | **可证伪**（未应用） | DROP 目标仍在 |
| `20261028040000` | **可证伪**（未应用） | DROP 目标仍在 |
| `20261007000012` | **不明** | 新增列已存在 |
| `20261014000020` | **不明** | DROP 目标已不存在 |
| `20261014000050` | **不明** | DROP 目标已不存在 |
| `20261027200000` | **不明** | DROP 目标已不存在 |

`DROP TABLE IF EXISTS` 的歧义是「不明」的根因：目标缺失既可能是迁移已执行，也可能是目标
原本就不存在；静态结构无法区分两者，所以只能记「不明」，不能记「已应用」或「已证伪」。

本批 14 条窗口的前置检查结果：PASS 13 / NOOP 1 / SKIP 0 / FAIL 0。其中 11 条 policy-only
由 RLS 指纹覆盖（38 张表 / 114 条断言：`relrowsecurity`、`relforcerowsecurity`、策略名集合
逐表与 anchor 快照一致），`20261118125000` 为纯数据种子（69/69 已存在，`ON CONFLICT` 幂等
→ NOOP），`20261118123000`/`20261118130000` 由 4 条 ADD COLUMN 断言覆盖。

### 8.4 整批回滚与指纹比对（13 个 rollback 修复后）

按逆序执行 14 个 `database/rollback/*.rollback.sql`：**14/14 成功，合计 0.48s**。
13 个缺失账本清理的脚本已在末尾补 `DELETE FROM public._sqlx_migrations WHERE version = <v>;`
（按版本精确匹配、幂等；`20261118125000` 原本已有）。回滚后：

| 判据 | 结果 |
|---|---|
| 列结构指纹（information_schema.columns） | **完全一致**（0 diff） |
| 表数量 | 1345 → 1345 |
| 策略总数 | 1039 → **1039** |
| 策略集合 | 完全一致（无缺失/多余策略） |
| 策略定义指纹 | 2 条已知差异，**语义等价** |
| 业务行数 | 4740 → 4740 |
| `_sqlx_migrations` | 704 → **704**（每个 rollback 的后置断言要求本条登记行 = 0） |

两条已知策略定义差异（脚本内登记为白名单）：
- `public.core_tenants.rls_system_only`
- `rs.formulas.rls_tenant_isolation`

差异形态均为：回滚前 `WITH CHECK` 为空（`FOR ALL` 省略时按 `USING` 生效），回滚后显式写入同一表达式。
脚本已按「策略全名」比对，其余任何定义或集合差异都会使预演非 0 退出。

断言实现：`scripts/migration/window-rehearsal.py`。它把账本行数、表数、业务行数、策略总数、
列指纹、策略定义全部写成脚本断言，失败即非 0 退出并保留隔离库，不依赖人工读数。

### 8.5 `test_faq_admin_crud_roundtrip` 的 42501 与 `ai_faqs` 漂移（只出结论）

- 测试：`svc/ai/tests/integration_tests.rs:252`，向 `core.ai_faqs` 插入 `tenant_id = 全零 UUID` 的全局行，未设置任何 GUC。
- 实际测试库：`.env` 的 `TEST_DATABASE_URL` 指向 `topems_test_runner`；该库 `core.ai_faqs`
  为严格策略：
  `USING / WITH CHECK = COALESCE(current_setting('app.rls_system',true),'off')='on' OR tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid`，
  且 `relrowsecurity=true`、`relforcerowsecurity=true`、表 owner 为测试角色（无 BYPASSRLS）。
- 实测三组（均在同一事务内 `ROLLBACK`，无残留）：
  1. 不设 GUC → **42501**；
  2. `set_config('app.tenant_id','000…0',true)` → 插入成功；
  3. `set_config('app.rls_system','on',true)` → 插入成功。
- 结论：**测试没有设置租户上下文，不是 `ai_faqs` 策略本身有问题**。严格策略符合本轮统一收紧方向；
  测试沿用了旧宽松语义（未设 GUC 时允许全局行）。

漂移现状与修法（不改历史迁移）：

- 仓库 `database/migrations/20261024000015_copilot_faq_table.sql` 仍创建旧宽松策略
  （含 `tenant_id = 全零 OR 未设 GUC` 豁免）；生产与 `topems_test_runner` 是线下收紧的严格版；
  `topems_test` 仍是宽松版。生产严格定义为：
  `rls_system='on' OR tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid`（`USING` + `WITH CHECK`）。
- 生产行为正确，且运行时已支持：`search_faq` 的平台全零行走独立的
  `scope_read_platform()`（系统通道），不依赖宽松策略里的「全零行对所有租户放行」。
  保留宽松 `WITH CHECK` 反而允许租户写入全零全局行，属写放大风险。
- 修法要点（新增一条 `version > 当前锚点` 的前向迁移，历史迁移不动）：
  1. 单事务、文件内不写 `BEGIN/COMMIT`；版本必须大于锚点并登记 manifest。
  2. `DROP POLICY IF EXISTS tenant_isolation_core_ai_faqs ON core.ai_faqs;`
     再按生产严格谓词重建 `FOR ALL` 策略，`USING` 与 `WITH CHECK` 使用同一表达式；
     保持 `ENABLE` + `FORCE ROW LEVEL SECURITY`。
  3. 迁移末尾加断言（`DO $$` 查 `pg_policies.qual/with_check`）：策略存在、含 `app.rls_system`、
     不含全零 UUID 字面量与 `IS NULL` 豁免；不满足即 `RAISE EXCEPTION`。
  4. 配对应 rollback（恢复宽松定义或删除策略），并在末尾删除自己的账本登记行。
- 是否进本次窗口：**不进**。理由：
  1. 生产已是严格版，这条迁移对生产行为零变化，只修仓库/新环境重放的一致性；
  2. 本窗口 14 条已冻结并完成预演，临时加第 15 条会使「逐条预期值」和整批回滚断言全部失效；
  3. 新环境供给走基线快照，快照里已是严格策略，漂移只影响「不受支持的空库全链重放」；
  4. 应作为窗口后的独立提交，单独预演（无数据变更、回滚代价极低）；若安全评审要求
     仓库与生产在下一锚点前一致，可单开一个单版本小窗口应用。

### 8.6 窗口当天中止判据与遗留

完整可执行清单见 [`docs/database/window-rls-strict-20261118-runbook.md`](../database/window-rls-strict-20261118-runbook.md)
（前置检查、14 条顺序、逐条中止判据、单条/整批回滚命令、账本核对 SQL、恢复服务前验证点）。

中止判据（任一命中即停）：
1. 任一迁移非 0 退出；
2. 某条迁移后的账本/策略数/策略定义变化与 §8.3 表不符（`124000` 单独另行验证）；
3. 出现非账本表的行数变化（本批预期为 0）；
4. 整批回滚后账本不是 704、表数/策略总数/业务行数与快照不一致，或出现两条已知等价差异之外的策略差异。

遗留与未提交项：
- 快照资产、`anchors.json`、`migrations_at_anchor.json`：**已生成、未提交**。
- `scripts/migration/gen-baseline.sh`、`gen-baseline-data.sh`、`apply-forward.sh` 的修正：**未提交**
  （`apply-forward.sh` 仅修 macOS `mktemp` 模板必须尾随 `X` 的问题，否则一次失败后会永久卡在 `File exists`）。
- `lefthook.yml` / `package.json`：按约定仍未提交，等确认。
- 生产零写入；未 push。
- `ai_faqs` 仓库/现网策略漂移：结论与修法见 §8.5，**不进本窗口**，窗口后独立提交。

