# Lefthook Git Hook 配置文档

> **版本**: lefthook 2.1.10
> **配置文件**: [lefthook.yml](../../lefthook.yml)
> **激活方式**: `package.json` 的 `prepare` 脚本自动执行 `lefthook install`
> **Gate 总数**: 16（14 pre-commit + 2 pre-push）

## 架构概览

```
git commit ──→ pre-commit (parallel: false, 顺序执行 14 Gate)
                   │
                   ├── Gate A-N (原有 10 + P0 迁移 4)
                   └── 失败时阻止提交

git push ────→ pre-push (parallel: true, 并行执行 2 Gate)
                   │
                   ├── Gate J/K (Rust 格式 + Clippy)
                   └── 失败时阻止推送
```

### 执行策略

| 阶段 | 并行模式 | Gate 数 | 说明 |
|---|---|---|---|
| `pre-commit` | `parallel: false` | 14 | 顺序执行，避免资源竞争（cargo + tsc + node） |
| `pre-push` | `parallel: true` | 2 | 并行执行 cargo fmt + clippy，互不依赖 |

### 跳过 Hook

```bash
# 单次跳过
git commit --no-verify
git push --no-verify

# 调试单 Gate
npx lefthook run pre-commit --command <gate-name> --force
```

---

## pre-commit Gate（14 个）

### Gate A · frontend-lint

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(ts\|tsx\|js\|jsx\|cjs\|mjs\|json\|css\|scss\|yml\|yaml\|md)$` |
| **执行命令** | `npx lint-staged` |
| **配置来源** | [.lintstagedrc.json](../../.lintstagedrc.json) |
| **tags** | `frontend lint` |

**作用**: 对暂存的前端文件运行 eslint + prettier，自动修复格式问题。lint-staged 只处理 git 暂存的文件，避免全量扫描。

**失败行为**: eslint 发现不可自动修复的错误时 exit 1。

---

### Gate B · frontend-typecheck

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(ts\|tsx\|js\|jsx\|cjs\|mjs\|json)$` |
| **执行命令** | `pnpm --filter topems-portal typecheck` |
| **tags** | `frontend typecheck` |

**作用**: 运行 TypeScript 编译器 `tsc --noEmit`，检查整个前端项目的类型安全。

**失败行为**: TypeScript 类型错误时 exit 1。

**耗时**: 首次运行约 1-2 分钟（全量编译），增量运行约 10-30 秒。

---

### Gate C · i18n-quality

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(ts\|tsx\|js\|jsx\|cjs\|mjs\|json)$` |
| **执行命令** | `node scripts/ci/check-i18n-quality.cjs --strict` |
| **脚本** | [scripts/ci/check-i18n-quality.cjs](../../scripts/ci/check-i18n-quality.cjs) |
| **tags** | `frontend i18n` |

**作用**: 检查 i18n 翻译质量的三项核心指标：
1. **假 en 值残留**: 中文翻译值被错误填入 en 命名空间（必须为 0）
2. **key 一致性**: en/zh 翻译 key 必须完全对齐
3. **混合结构 bug**: 同一命名空间内不允许扁平/嵌套结构混用

**失败行为**: 严格模式下任一指标不为 0 时 exit 1。

---

### Gate D · glossary-verify

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(ts\|tsx\|js\|jsx\|cjs\|mjs\|json\|csv)$` |
| **执行命令** | `node scripts/ci/verify-glossary.cjs --strict` |
| **脚本** | [scripts/ci/verify-glossary.cjs](../../scripts/ci/verify-glossary.cjs) |
| **tags** | `frontend i18n glossary` |

**作用**: 扫描所有 i18n 命名空间，验证 TopN 术语翻译是否与 glossary 标准译法一致。当前 glossary 包含 61 条标准术语，覆盖 67 个命名空间。

**失败行为**: 发现非标准译法时 exit 1。

---

### Gate E · hardcoded-precise

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(ts\|tsx\|js\|jsx)$` |
| **执行命令** | `node scripts/i18n/scan-hardcoded-precise.cjs --strict --details 30 <staged_files>` |
| **脚本** | [scripts/i18n/scan-hardcoded-precise.cjs](../../scripts/i18n/scan-hardcoded-precise.cjs) |
| **tags** | `frontend i18n hardcoded` |

**作用**: 精确扫描暂存的 TS/TSX 文件中的硬编码中文字符串（排除注释、console.log、i18n.t() 调用等合法场景）。只检查暂存文件，避免全量扫描。

**失败行为**: `--strict` 模式下发现硬编码中文时 exit 1，输出 Top 30 详情。

---

### Gate F · cargo-test

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(rs\|toml\|lock)$` |
| **执行命令** | `cargo test --workspace` |
| **tags** | `rust test` |

**作用**: 编译并运行整个 Rust 工作区的测试（27 个微服务 + 4 个 lib crate）。

**失败行为**: 编译错误或测试失败时 exit 1。

**耗时**: 首次编译约 10-15 分钟（无缓存），增量编译约 2-5 分钟。

---

### Gate G · perm-matrix

| 属性 | 值 |
|---|---|
| **触发文件** | `.(rs\|ts\|tsx)$` + permissions.ts + modules/*/config.ts + navigation/ + routes/v2.tsx |
| **执行命令** | `node scripts/ci/perm-matrix-toolkit.cjs ci-report --dry-run` |
| **脚本** | [scripts/ci/perm-matrix-toolkit.cjs](../../scripts/ci/perm-matrix-toolkit.cjs) |
| **tags** | `permission security` |

**作用**: 权限矩阵三方对齐检查（dry-run 模式，不阻止提交）：
- **R1 (FAIL)**: 后端 lib.rs 缺少 `pub mod permission;`
- **R2 (WARN)**: 服务缺少路由级权限守卫中间件
- **R3 (WARN)**: admin-only 端点缺少显式 gate 注解
- **R4 (FAIL)**: topems-rbac 依赖声明但 permission 模块未使用
- **R5 (FAIL)**: utoipa path 缺少 security()/permission() 属性
- **R6 (FAIL)**: handler 函数体使用 `PERM_SCOPE "*"` 通配符

**失败行为**: dry-run 模式仅报告，不 exit 1。R1/R4/R5/R6 违规时输出详情。

---

### Gate H · crm-contract

| 属性 | 值 |
|---|---|
| **触发文件** | `apps/web/src/schemas/crm/` + `apps/web/src/api/crm/` + `svc/crm/src/models/customer` + `.rs/.ts/.tsx` |
| **执行命令** | `node scripts/dev/check-crm-contract.mjs` |
| **脚本** | [scripts/dev/check-crm-contract.mjs](../../scripts/dev/check-crm-contract.mjs) |
| **tags** | `crm contract` |

**作用**: 验证 CRM 模块的前后端契约一致性：
- **字段对称性**: 前端 Schema（13 字段）↔ 后端 Model（13 字段）
- **路由对称性**: 前端 API Client（9 路由）↔ 后端 Axum Handlers（9 路由）

**失败行为**: 字段或路由数量不匹配时 exit 1。

---

### Gate I · icon-page

| 属性 | 值 |
|---|---|
| **触发文件** | `iconMapping.tsx` + `modules/*/config.ts` + `navigation/types.ts` + `pages/*.tsx` + `.ts/.tsx` |
| **执行命令** | `node scripts/ci/check-icons.cjs --strict` + `node scripts/ci/page-audit.cjs --diff --strict` |
| **脚本** | [scripts/ci/check-icons.cjs](../../scripts/ci/check-icons.cjs) + [scripts/ci/page-audit.cjs](../../scripts/ci/page-audit.cjs) |
| **tags** | `frontend icon page` |

**作用**: 两项检查合并执行：
1. **图标完整性**: 扫描所有模块的 icon 引用（487 个），验证 iconMapping 是否已注册（182 个），缺失图标 = 0
2. **页面标准化**: 审计 `pages/*.tsx` 文件是否符合单页单文件规范

**失败行为**: 缺失图标或页面未标准化时 exit 1。

---

### Gate M · axum-layer

| 属性 | 值 |
|---|---|
| **触发文件** | `.(rs\|toml\|lock)$` + `scripts/ci/check-axum-layer-order.cjs` |
| **执行命令** | `node scripts/ci/check-axum-layer-order.cjs` |
| **脚本** | [scripts/ci/check-axum-layer-order.cjs](../../scripts/ci/check-axum-layer-order.cjs) |
| **tags** | `rust axum layer` |

**作用**: Axum 中间件层序检查（dry-run 模式），扫描 `svc/**/*.rs`（1352 文件，147 路由）：
- **R1 (FAIL)**: tenant 中间件在 auth 之前 → 500 Missing Claims
- **R2 (WARN)**: 仅有 auth_middleware 无 tenant 隔离
- **R3 (WARN)**: 仅有 tenant_middleware 无 auth → Missing Claims panic

**失败行为**: dry-run 模式仅报告，不 exit 1。Integrity 检查确保扫描覆盖率。

---

### Gate N · large-files

| 属性 | 值 |
|---|---|
| **触发文件** | 全部暂存文件（无 files 过滤） |
| **执行命令** | 内联 shell（扫描暂存文件大小） |
| **tags** | `files size` |
| **迁移来源** | husky #1 |

**作用**: 检查暂存文件是否超过 1MB（1048576 字节），防止意外提交大文件。排除 lockfile 和数据库文件。

**排除文件**: `pnpm-lock.yaml`、`*-lock.yaml`、`database/postgres_data/*`

**失败行为**: 发现超过 1MB 的文件时 exit 1，输出文件名和大小。

---

### Gate O · sensitive-info

| 属性 | 值 |
|---|---|
| **触发文件** | 全部暂存文件（无 files 过滤） |
| **执行命令** | `bash scripts/ci/check-sensitive-info.sh` |
| **脚本** | [scripts/ci/check-sensitive-info.sh](../../scripts/ci/check-sensitive-info.sh) |
| **tags** | `security secrets` |
| **迁移来源** | husky #2 |

**作用**: 扫描暂存文件中的潜在敏感信息，检测 9 类模式：
1. `password = '...'`
2. `secret = '...'`
3. `api_key = '...'`
4. `private_key = '...'`
5. `token = '...'`
6. `AWS_ACCESS_KEY_ID = '...'`
7. `AWS_SECRET_ACCESS_KEY = '...'`
8. `-----BEGIN PRIVATE KEY-----`
9. `-----BEGIN RSA PRIVATE KEY-----`

同时检测 `.key`/`.pem`/`.p12`/`.pfx` 等密钥证书文件。

**失败行为**: 检测到敏感信息时 exit 1，输出文件名和匹配模式。可使用 `--no-verify` 跳过误报。

---

### Gate P · api-duplicates

| 属性 | 值 |
|---|---|
| **触发文件** | `^svc/.*\.rs$` |
| **执行命令** | `python3 scripts/check_api_duplicates_ci.py --ci` |
| **脚本** | [scripts/check_api_duplicates_ci.py](../../scripts/check_api_duplicates_ci.py) |
| **tags** | `api rust` |
| **迁移来源** | husky #4 |

**作用**: 检查后端 Rust 服务的 API 路径是否有重复定义，防止路由冲突。

**失败行为**: 发现重复 API 路径时 exit 1。

---

### Gate Q · i18n-hardcode-admin

| 属性 | 值 |
|---|---|
| **触发文件** | `apps/web/src/i18n/` + `pages/*.tsx` + `scripts/i18n/` + `.ts/.tsx` |
| **执行命令** | `node scripts/ci/check-i18n.cjs --strict` |
| **脚本** | [scripts/ci/check-i18n.cjs](../../scripts/ci/check-i18n.cjs) |
| **tags** | `frontend i18n hardcoded` |
| **迁移来源** | husky #8b |

**作用**: 严格模式检查 admin 模块的硬编码中文（admin 模块要求硬编码中文 = 0）。同时扫描全部 771 个文件，报告非 admin 模块的硬编码中文分布。

**模块约束**:
- `admin`: 硬编码中文必须为 0（严格模式）
- `shared/ai/automation/lowcode` 等: 报告但不阻止提交

**失败行为**: admin 模块硬编码中文 > 0 时 exit 1。

---

## pre-push Gate（2 个）

### Gate J · cargo-fmt-check

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(rs\|toml\|lock)$` |
| **执行命令** | `cargo fmt --all --check` |
| **tags** | `rust fmt` |

**作用**: 检查整个 Rust 工作区的代码格式是否符合 `rustfmt` 规范。仅检查不修改。

**失败行为**: 发现格式不符的文件时 exit 1。运行 `cargo fmt --all` 修复。

---

### Gate K · cargo-clippy-workspace

| 属性 | 值 |
|---|---|
| **触发文件** | `\.(rs\|toml\|lock)$` |
| **执行命令** | `cargo clippy --workspace --all-targets -- -D warnings` |
| **tags** | `rust clippy` |

**作用**: 对整个 Rust 工作区运行 clippy 静态分析，`-D warnings` 将所有警告视为错误。

**失败行为**: clippy 发现任何警告时 exit 1。

---

## 辅助工具

### 对比脚本

[scripts/dev/compare-hooks.py](../../scripts/dev/compare-hooks.py) — 对比 husky 与 lefthook 的检查项差异。

```bash
python3 scripts/dev/compare-hooks.py          # 文本报告
python3 scripts/dev/compare-hooks.py --json   # JSON 输出
```

### 迁移脚本

[scripts/dev/migrate-husky-to-lefthook.py](../../scripts/dev/migrate-husky-to-lefthook.py) — 将 husky 检查项迁移为 lefthook Gate（幂等，已完成的迁移自动跳过）。

```bash
python3 scripts/dev/migrate-husky-to-lefthook.py --diff   # 预览差异
python3 scripts/dev/migrate-husky-to-lefthook.py --apply   # 正式写入
```

---

## P0 迁移记录

以下 4 个 Gate 从 husky `pre-commit` shell 脚本迁移：

| Gate | husky 原始检查 | 迁移方式 |
|---|---|---|
| Gate N | husky #1 大文件检查 | 内联 shell |
| Gate O | husky #2 敏感信息 | 外部脚本 [check-sensitive-info.sh](../../scripts/ci/check-sensitive-info.sh) |
| Gate P | husky #4 API 路径重复 | Python 脚本调用 |
| Gate Q | husky #8b admin 硬编码中文 | Node 脚本调用 |

**已删除**: `.husky/pre-commit`（180+ 行 shell）、`.husky/` 目录
**已切换**: `package.json` prepare 脚本 `husky` → `lefthook install`
**已精简**: `.pre-commit-config.yaml` 移除 3 个 local hooks
