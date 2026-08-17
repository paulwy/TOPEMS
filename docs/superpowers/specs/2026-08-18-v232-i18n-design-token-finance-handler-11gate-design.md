# V232：i18n Strict-Zero + 616 Design Token 收尾 + Finance Handler 接入 + 9→11 Gate 升级 设计文档

> **Date:** 2026-08-18
> **Owner:** Agent-Driven + Human Approval
> **承接:** V231 封版（`dfaaedd4a`）· 9 NEEDS_FIX 文件清理 + 六闸 SEAL ALL GREEN（ec9dcd20f）。方向 A 选定 "最后硬骨头收尾 + CI 升级一次性闭环"，打包策略 A-1（P0-P4 五批一锅端）。
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans next to generate the step-by-step implementation plan for P0-P4 5 batches (each batch independent commits), then execute task-by-task.

---

## 0. 目标摘要

**一句话目标：** 3 条业务清理主线（Finance Handler 接入 · i18n Strict-Zero 280→0 · 616 Design Token 收尾）+ CI 升级主线（9→11 Gate 全工作区）+ 收尾封版主线（SEAL 11 闸实跑 + TODO Actual 全填），五批独立 commit 推进，**11-Gate ALL GREEN + 零 TBD 残留** 后封版。

### 量化成功标准（5 KPI + 11 Gate = 16 条）

#### 5 条业务清理 KPI（#1-#5）

| # | 指标 | 基线（启动值） | 阈值 | Actual | Status |
|---|------|:----:|:----:|--------|--------|
| 1 | Finance handler 集成测试覆盖（settlement / unsettlement / reverse 3 端） | 0 handler tests（纯函数 168 unit 已 PASS，但 handler 链未接） | ≥20 handler tests 0 failed + 3 async handler 均已接前置校验层（grep `settlement_v55_validate_prepare` 匹配 3 处） | TBD | ⏳ 待执行 |
| 2 | i18n 硬编码 strict-zero 全模块（scan-hardcoded-precise.cjs --strict） | baseline 280 FAIL（开工前第一件事重跑真实 baseline 并校正此处 Actual） | FAIL=0 且 WARN=0 且 ALL=0（真·严格清零） | TBD | ⏳ 待执行 |
| 3 | Design Token 硬编码清零（色值 + box-shadow 合计） | baseline 616 条（V214 末段统计 2067→1024→616，开工前重跑真实 baseline） | 616→0，且 CI 强门禁（scan-hardcoded-colors.cjs --strict 纳入 Gate I 子项） | TBD | ⏳ 待执行 |
| 4 | 11-Gate 全工作区固化（lefthook pre-commit + pre-push 双段） | 现 9-Gate：A-lint / B-typecheck / C-i18n / D-glossary / E-hardcoded / F-cargo-test / G-perm / H-CRM / I-icon+page | 9→11，新增 J-cargo-fmt / K-cargo-clippy；lefthook 新增 `pre-push` 段，Changes filter 按文件扩展名智能跑子集 | TBD | ⏳ 待执行 |
| 5 | 版本章节完整度（标题 tag + 双表 Actual/Status） | V232 标题 tag=`⏳ 待执行`，2 张表 Actual=`TBD`，Status=`⏳` | tag=`✅ 已封版`，Actual 全部填实值（非 TBD/空），Status 16 行全部 ✅ | TBD | ⏳ 待执行 |

#### 11-Gate SEAL（V231 6 闸 + pre-commit 3 闸 = 原 9 + 新增 2 = 11）

| # | Gate | 命令 | 退出码 | 关键结果 | Status |
|---|------|------|:------:|----------|--------|
| A | lint（apps/web + scripts） | `npm run lint -w apps/web && npm run lint -w scripts` | — | 含 eslint + prettier --check；scripts/*.cjs 全 prettier 2 空格 + 无 unused var | ⏳ 待执行 |
| B | typecheck（apps/web） | `npm run typecheck -w apps/web` | — | `tsc --noEmit` 0 error 0 warning；i18n 新增 key 不引入未定义 import | ⏳ 待执行 |
| C | i18n-quality-gate | `node scripts/ci/check-i18n-quality.cjs` | — | 假 en 值检测 + key 一致性 + flat/nested 三向 0 mismatch；P1 新增 ~280 个 i18n key 双语齐全 | ⏳ 待执行 |
| D | glossary verify | `node scripts/ci/verify-glossary.cjs` | — | glossary.csv 别名 CSV 合法；0 alias 冲突；P1 新增翻译符合术语表（尤其 Finance settlement 相关术语 currency / period / reversal） | ⏳ 待执行 |
| E | hardcoded-precise strict-zero | `node scripts/i18n/scan-hardcoded-precise.cjs --strict` | — | EXEMPT_PATHS = `['__tests__','stories']`（空业务豁免）；FAIL=0 WARN=0 | ⏳ 待执行 |
| F | cargo test finance（unit + handler integration） | `cargo test -p topems-finance -- --test-threads=4` | — | `#[cfg(test)]` 168 unit + P0.1 新增 ≥20 handler integration，合计 188+ tests 0 failed | ⏳ 待执行 |
| G | perm-matrix 3-way gate | `node scripts/ci/perm-matrix-gate.cjs --strict` | — | R1（Routes ↔ PERMISSIONS）/ R2（Nav ↔ PERMISSIONS）/ R3（Routes ↔ Nav）全 0；baseline 已 0/0/0 确保 P3 没改路由/权限时仍绿 | ⏳ 待执行 |
| H | CRM contract consistency | `node scripts/ci/check-crm-contract.cjs` | — | CRM entity schema ↔ frontend types ↔ utoipa OpenAPI 三路一致；无改动时应 PASS | ⏳ 待执行 |
| I | icon completeness + V64 page standardization | `node scripts/ci/check-icons.cjs && node scripts/ci/check-pages.cjs` | — | icon registry 零缺失；pages/ 下所有路由符合 V64 模块路径规范（2 deep 根路径 redirect + 404 fallback） | ⏳ 待执行 |
| J | cargo fmt workspace（新增 10th Gate） | `cargo fmt --all --check` | — | 所有 `lib/` + `svc/` Rust 文件 cargo fmt 对齐；如有 diff 先 `cargo fmt --all` commit 再跑 | ⏳ 待执行 |
| K | cargo clippy workspace（新增 11th Gate） | `cargo clippy --workspace --all-targets -- -D warnings` | — | clippy 0 warnings（-D warnings 强约束变 error 退出非 0）；修 warning 不引入逻辑改动，只写 idiom fix | ⏳ 待执行 |

---

## 1. 架构总览

```
┌───────────────────────────────────────────────────────────────────────┐
│ V232 执行流水线（8-12 commits · 5 批次 · 11-Gate SEAL）                │
│                                                                       │
│  ┌─ Batch P0 · Finance（3-4 commits · 高风险优先）─┐                   │
│  │ [0.1] settlement / unsettlement / reverse 3     │                   │
│  │     async handler 开头接入 settlement_v55_       │                   │
│  │     validate_prepare()                           │                   │
│  │ [0.2] Error → ErrorPayload { 422,               │                   │
│  │     code=SETTLEMENT_INVALID, field_errors }      │                   │
│  │ [0.3] 新增 20+ handler integration tests        │                   │
│  │  → cargo test -p topems-finance GREEN 188+ tests │                   │
│  └──────────────────────────────────────────────────┘                   │
│                              ↓                                         │
│  ┌─ Batch P1 · i18n（2-3 commits · 跨 18 modules）┐                   │
│  │ [1.1] 拆 3 子批：aps+crane+lims / rd+scm+tms    │                   │
│  │       / manual-fallback（chart data /           │                   │
│  │       enum Display / dangerouslySetInnerHTML）  │                   │
│  │       · 每批 30 条 → Gate C + E 双闸实跑 → commit│                   │
│  │ [1.2] scan-hardcoded-precise.cjs EXEMPT_PATHS=[]│                   │
│  │       只留 __tests__|stories 豁免                │                   │
│  │  → strict scan 0 FAIL · 0 WARN · EXEMPT=2       │                   │
│  └──────────────────────────────────────────────────┘                   │
│                              ↓                                         │
│  ┌─ Batch P2 · Design Token（1-2 commits · 全局）┐                    │
│  │ [2.1] scan-hardcoded-colors.cjs --dry-run →    │                   │
│  │       severity:high/medium/low → apply high+    │                   │
│  │       medium (95%) · low 30 条人工改             │                   │
│  │ [2.2] tokens.css 补最后 4 个 box-shadow token   │                   │
│  │       → 42 vars 全部 var(--x) 引用 ≥1 次        │                   │
│  │  → 616→0 strict + 10 page visual smoke GREEN    │                   │
│  └──────────────────────────────────────────────────┘                   │
│                              ↓                                         │
│  ┌─ Batch P3 · 9→11 Gate 升级（1-2 commits · CI）─┐                    │
│  │ [3.1] Step 1: cargo fmt --all + cargo           │                   │
│  │       clippy --fix 自动修基线 commit（不改逻辑） │                   │
│  │ [3.2] Step 2: lefthook 新增 pre-push 段 +       │                   │
│  │       Changes filter（Rust/TS 按扩展名智能闸子集）│                   │
│  │       · Gate J/K 写入 ci.yml jobs               │                   │
│  │ [3.3] "六闸/6-Gate" 文本 → "11-Gate" 全仓替换    │                   │
│  │  → lefthook run pre-commit + pre-push 双段 GREEN │                   │
│  └──────────────────────────────────────────────────┘                   │
│                              ↓                                         │
│  ┌─ Batch P4 · SEAL + TODO Actual（1 commit）─────┐                    │
│  │ [4.1] A-K 11-Gate 顺序实跑，退出码 + 关键结果    │                   │
│  │       JSON 落盘 artifacts/v232-seal-11gate.json │                   │
│  │ [4.2] V232 标题 tag ⏳→✅ · 双表 Actual/Status   │                   │
│  │       两列 16 行全部填实 + grep TBD = 0         │                   │
│  │  → commit → pull --rebase → push origin main    │                   │
│  └──────────────────────────────────────────────────┘                   │
└───────────────────────────────────────────────────────────────────────┘
```

### 5 批次文件范围零耦合保证（Revert 互不影响）

| 批次 | 改动文件范围（硬边界） | Revert 影响 |
|------|-----------------------|------------|
| P0 | `svc/finance/src/**` 只改 finance crate | 仅回滚 Finance，P1-P3 无交集 |
| P1 | `apps/web/src/modules/**/*.tsx` + `apps/web/src/i18n/locales/{zh,en}.json` + `apps/web/src/i18n/locales/modules/**` | 仅回滚 i18n 文本与 key，其他保留 |
| P2 | `apps/web/src/{styles,components,pages}/**/*.css *.scss *.tsx` + `apps/web/src/styles/tokens.css` | 仅回滚色值/box-shadow，其他保留 |
| P3 | `.lefthook.yml` + `.github/workflows/ci.yml` + `scripts/ci/*.cjs`（只改 --help 文本）+ `docs/**/*.md`（"六闸"→"11-Gate"） | 回滚 CI 配置但不回滚业务修复 |
| P4 | `docs/roadmap/TODO.md` + `docs/roadmap/artifacts/v232-seal-11gate.json` | 回滚文档但不回滚任何代码 |

---

## 2. 详细设计（按批次）

### 2.0 P0 · Finance Handler 接入前置校验层

#### 背景问题
`svc/finance/src/routers/settlement_v55.rs` 当前 3 个 async handler（`post_settlement` / `post_unsettlement` / `post_reverse_settlement`）：
1. 先 `let mut tx = pool.begin().await?;`（直接拿 DB Pool，开启事务）
2. 直接写 SQL `INSERT INTO finance_settlements ...`
3. SQL 后才零散 `if body.amount > MAX_AMOUNT { return Err(...) }` 判断
4. `ValidationError(...)` 在 `Error::into_response()` 里 `match` 不到 → 回退 HTTP 500 + 堆栈泄露

而纯函数 `settlement_v55_validate_*` 系列已经有 168 unit tests（`#[cfg(test)]`），但 **真实 handler 链完全没调用** = 业务守护只存在于测试中，生产没启用。

#### 修复动作（等价重构 + 双校验保障，零行为差异纪律）

```rust
// 接入位置：每个 async handler 函数的第一行（pool.begin() 之前）
async fn post_settlement(
    State(state): State<AppState>,
    Json(body): Json<SettlementRequest>,
) -> Result<impl IntoResponse, Error> {
    // [NEW] Step 1: 纯函数前置校验（拿 DB 只读 pool 查期状态，不开启事务）
    let validated = settlement_v55_validate_prepare(&body, &state.pool).await?;
    // [NEW] Step 2: 双校验保障 —— validated 结构体与原 body 关键值 100% 一致
    // （等价重构约束：纯函数不能改值，只能校验，否则双校验会报错）
    debug_assert_eq!(validated.currency, body.currency);
    debug_assert_eq!(validated.amount, body.amount);
    debug_assert_eq!(validated.period_id, body.period_id);

    // [OLD] Step 3: 原有事务 + SQL 流程完全保留（零改动保证无行为差异）
    let mut tx = state.pool.begin().await?;
    let id = sqlx::query!(...).fetch_one(&mut *tx).await?.id;
    tx.commit().await?;
    Ok(Json(json!({"id": id})))
}
```

```rust
// 错误转换：ErrorPayload From<ValidationError> 新增
impl From<settlement_v55::ValidationError> for ErrorPayload {
    fn from(e: settlement_v55::ValidationError) -> Self {
        let (code, field, message) = match e {
            ValidationError::CurrencyMismatch { expected, actual } => (
                "SETTLEMENT_INVALID",
                Some("body.currency"),
                format!("currency mismatch: expected {expected}, got {actual}"),
            ),
            ValidationError::SelfTransfer { counterparty_id } => (
                "SETTLEMENT_INVALID",
                Some("body.counterparty_id"),
                format!("self-transfer not allowed: counterparty_id={counterparty_id}"),
            ),
            ValidationError::AmountExceedsLimit { amount, limit } => (
                "SETTLEMENT_INVALID",
                Some("body.amount"),
                format!("amount {amount} exceeds limit {limit}"),
            ),
            ValidationError::PeriodClosed { period_id } => (
                "SETTLEMENT_INVALID",
                Some("body.period_id"),
                format!("period {period_id} is closed, cannot settle"),
            ),
            ValidationError::PeriodNotFound { period_id } => (
                "SETTLEMENT_INVALID",
                Some("body.period_id"),
                format!("period {period_id} not found"),
            ),
        };
        let mut field_errors = HashMap::new();
        if let Some(f) = field { field_errors.insert(f.to_string(), message.clone()); }
        ErrorPayload {
            status: 422,
            code: code.to_string(),
            message,
            field_errors,
            request_id: None,
        }
    }
}
```

#### P0 测试（≥20 handler integration tests）

使用 `#[sqlx::test]` 真实 SQLite Pool（或 testcontainers PostgreSQL，优先 SQLite 提速）：

| 业务规则 | cases 明细 | case 数 |
|---------|-----------|:-------:|
| 币种校验 | CNY ✅ / USD ✅ / JPY ❌ 未启用 / "CNY " 尾空格 ❌ / 空字符串 ❌ | 5 |
| 自转校验 | self org_id=counterparty_id ❌ / different ✅ / counterparty=0 无效 id ❌ | 3 |
| 金额校验 | amount=0 ❌ / amount=-100 ❌ / amount=limit ✅ / amount=limit+1 ❌ / 3 位小数(超出币种精度) ❌ | 5 |
| 期状态校验 | period status=OPEN ✅ / CLOSED ❌ / FUTURE 尚未到开始日 ❌ / period_id 不存在 ❌ | 4 |
| 正常路径 | CNY + OPEN period + 不同 counterparty + amount=limit/2 ✅ · 响应 id=i64 · HTTP 200 | 3 |
| **合计** | | **≥20** |

### 2.1 P1 · i18n 280→0 Strict-Zero

#### 背景问题
V231 E 闸实跑时已把 BI 白名单移除并清零 BI 模块残留（commit `ec9dcd20f` E 闸 exit=0）。但 baseline 仍有 **280 FAIL**（来自 18 新模块 `modules/{aps, crane, lims, rd, scm, tms, asset, hrm, addressbook, help, lims, ...}` 未参与之前 R13-P4 批处理），其中 70% 是可脚本批量改，30% 是 3 种难改结构：
- Chart data array `[{name: "不合格率", value: 12}]` — 数据驱动的 UI 文本
- `enum Display::fmt` Rust/TS 两边 impl 中中文 — 枚举 Display
- `dangerouslySetInnerHTML={{ __html: "<div>操作指南</div>" }}` — HTML 内嵌中文字符串

#### 修复动作（3 子批 + 双闸每批实跑纪律）

- **子批 1 (aps/crane/lims 3 modules)**：`fix_residual_chinese.cjs --scope modules/aps modules/crane modules/lims --apply` → 改完立刻实跑双闸：
  ```bash
  node scripts/ci/check-i18n-quality.cjs          # 假 en / key 冲突
  node scripts/i18n/scan-hardcoded-precise.cjs --strict  # strict scan
  ```
  任一闸 exit≠0 → **reject commit，改完再跑**，双绿才 commit（scope: `i18n-p1-aps-crane-lims`）

- **子批 2 (rd/scm/tms + 其余 12 小模块)**：同上，scope: `i18n-p1-rd-scm-tms`

- **子批 3 (30% 难改结构 手动改)**：3 种难改结构手动改：
  - Chart data array → 外层 `t()` + `map(name => t(name))` 动态取译
  - Enum Display → 新增 `DisplayI18n` trait 或直接 `t('enum.Status.' + variant)`
  - `dangerouslySetInnerHTML` → 外层 `t(xxx).replace('<div>','<div>')` 注入 i18n
  改完跑双闸，scope: `i18n-p1-manual-fallback`

- **1.2 EXEMPT_PATHS 归零**：`scan-hardcoded-precise.cjs` 顶部 `const EXEMPT_PATHS = [/\/__tests__\//, /\.stories\.tsx$/];` 只留测试/故事豁免，删除所有业务模块豁免（如 `modules/bi` 白名单）。

### 2.2 P2 · 616 Design Token 收尾

#### 背景问题
V214 已经把 2845 条硬编码色值收敛到 616 条（-78.3%），最后 616 条分布：
- `box-shadow: 0 2px 8px #0003`（非正式变量的半透明色，281 条）
- `color: #333 / background: #F5F7FA` 非官方色板色值（DS 只规定 `--gray-50/100/200/.../900`，230 条）
- `rgba(0, 0, 0, 0.08)` 这类 rgba 写法未走 `rgba(var(--gray-900-rgb) / 0.08)` 模式（105 条）

#### 修复动作（三阶段 dry-run + 最后 4 个 box-shadow token 补齐）

1. **Phase A: dry-run JSON 输出**
   ```bash
   node scripts/design-tokens/scan-hardcoded-colors.cjs \
     --dry-run --json docs/roadmap/artifacts/v232-design-token-patch-list.json
   ```
   输出 616 条 patch，每条含 `{path, line, severity, from, to, confidence}`，severity 三级：
   - high (confidence 100%，如 `#333 → var(--gray-800)`)
   - medium (confidence 80-99%，如 `#F5F7FA → var(--gray-50)`)
   - low (confidence <80%，风险：`::before content` / inline style 计数器值等，≈30 条)

2. **Phase B: apply high+medium（≈586 条 95%）**
   ```bash
   node scripts/design-tokens/scan-hardcoded-colors.cjs --apply --severity high,medium
   ```

3. **Phase C: 人工改 low 30 条**：逐文件 diff 比对确认后手动改。

4. **tokens.css 补最后 4 个 box-shadow token**（补齐后 Design Token 100% 覆盖）：
   ```css
   --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
   --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
   --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
   --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
   ```
   对应替换掉 281 条散写 box-shadow。

5. **10 page visual smoke**（浏览器打开验证）：Login / BI ModuleDetail ×3 charts / Finance Settlement 表单 / APS Plan Gantt / QMS Defect Pareto / WMS Dashboard / MES Anomaly Detection / CRM Dashboard / Asset Dashboard。只看"色值只变不缺，没有明显半透明黑块"。

### 2.3 P3 · 9→11 Gate 升级

#### 背景问题
现在 pre-commit 已经是 **9 闸**（A-lint / B-typecheck / C-i18n / D-glossary / E-hardcoded / F-cargo-test finance / G-perm 3-way / H-CRM / I-icon+page），但 Rust workspace 级 fmt/clippy 缺失，导致：
- push 后 GHA 才报告 fmt diff → 需要 amend 回滚
- `cargo clippy` 有 `unknown_lints` / `needless_return` 警告未被拦截

同时 lefthook 只有 pre-commit 段，pre-push 完全没拦截 → push 后 CI 红需要回滚。

#### 修复动作（2 小步拆 commit，零逻辑改动只改基线）

1. **Step 1: 基线 auto-fix commit（先独立 commit，避免 P3 单 commit 1000 行 diff）**
   ```bash
   cargo fmt --all
   cargo clippy --workspace --all-targets --fix --allow-dirty
   ```
   提交信息：`chore(fmt/clippy): V232 P3 Gate J/K baseline auto-fix`，说明 "cargo fmt --all + cargo clippy --fix --allow-dirty 基线修复，无业务逻辑改动"。

2. **Step 2: lefthook + ci.yml 写入 J/K 闸 + pre-push 段**
   ```yaml
   # .lefthook.yml 新增 pre-push 段
   pre-push:
     parallel: true
     commands:
       # Rust 改动：F/G/J/K 四闸
       cargo-test-finance:
         files: git diff --name-only @{push}...HEAD -- 'svc/finance/**' 'lib/**'
         run: cargo test -p topems-finance -- --test-threads=4
       perm-matrix:
         files: git diff --name-only @{push}...HEAD -- 'svc/**/routes.rs' 'apps/web/src/**/config.ts' 'apps/web/src/lib/constants/PERMISSIONS*'
         run: node scripts/ci/perm-matrix-gate.cjs --strict
       cargo-fmt:
         files: git diff --name-only @{push}...HEAD -- '**/*.rs'
         run: cargo fmt --all --check
       cargo-clippy:
         files: git diff --name-only @{push}...HEAD -- '**/*.rs' '**/Cargo.toml'
         run: cargo clippy --workspace --all-targets -- -D warnings
       # TS 改动：A/B/C/D/E/I 六闸
       lint:
         files: git diff --name-only @{push}...HEAD -- 'apps/web/**/*.{ts,tsx,js,cjs}' 'scripts/**/*.{js,cjs}'
         run: npm run lint -w apps/web && npm run lint -w scripts
       i18n-quality:
         files: git diff --name-only @{push}...HEAD -- 'apps/web/src/i18n/locales/**' 'apps/web/src/**/*.tsx'
         run: node scripts/ci/check-i18n-quality.cjs
       hardcoded-strict:
         files: git diff --name-only @{push}...HEAD -- 'apps/web/src/**/*.tsx'
         run: node scripts/i18n/scan-hardcoded-precise.cjs --strict
       icon-pages:
         files: git diff --name-only @{push}...HEAD -- 'apps/web/src/**/*.{tsx,svg}'
         run: node scripts/ci/check-icons.cjs && node scripts/ci/check-pages.cjs
   ```

3. **Step 3: 文本 "六闸" → "11-Gate" 全仓替换**（docs + scripts `--help` 输出）：
   ```bash
   grep -rlE '六闸|6-Gate|Six Gate' docs scripts 2>/dev/null | xargs sed -i '' 's/六闸/11-Gate/g; s/6-Gate/11-Gate/g; s/Six Gate/11-Gate/g'
   ```
   归档 V231/V213 等章节说明文字中的 "六闸 SEAL" 保留（历史语境），但 TODO 中 V232 之后、scripts/ 下所有 `--help` 输出中的 "六闸" 必须替换。

### 2.4 P4 · SEAL 11-Gate 实跑 + TODO Actual 全填

1. **[4.1] 11-Gate 顺序实跑**：按 A→B→C→D→E→F→G→H→I→J→K 顺序，记录退出码与关键结果，落盘 JSON：
   ```json
   {
     "version": "V232",
     "commit": "<HEAD-SHA>",
     "date": "2026-08-18",
     "gates": [
       { "id": "A", "name": "lint", "cmd": "...", "exit_code": 0, "summary": "..." },
       { "id": "B", "name": "typecheck", "exit_code": 0, "summary": "..." },
       ...
       { "id": "K", "name": "cargo-clippy", "exit_code": 0, "summary": "0 warnings" }
     ]
   }
   ```
   保存路径 `docs/roadmap/artifacts/v232-seal-11gate.json`（与 V231 的六闸 artifacts 目录一致）。

2. **[4.2] TODO 章节 Actual/Status 全填 + tag 改 ✅**：
   - V232 标题 `⏳ 待执行 → ✅ 已封版`
   - 5 KPI 表 Actual 列填真实值（如 `#1: "190 tests · 0 failed · 3 handlers grep matched=3"`）
   - 11-Gate 表 Status 列全 `✅ PASS`，退出码列填真实 exit_code
   - 自检：`grep -nE '\bTBD\b' docs/roadmap/TODO.md` → V232 章节内 = 0

---

## 3. 风险边界 · 测试 · 回滚策略

### 3.1 风险与缓解（逐批）

| 批次 | 风险点（严重度·概率） | 缓解动作 |
|------|------|----------|
| P0 Finance handler | 高·中：校验位置移动导致正常结算路径 500（纯函数 168 unit 没覆盖真实 handler 链） | 等价重构约束：`settlement_v55_validate_prepare()` 只返回 `ValidatedSettlement { currency, period, amount, counterparty_id }` 结构体，**不替换 SQL 流程**；原散判断 + validated 双校验保障零行为差异；先跑 168 unit tests 全绿再接入 |
| P1 i18n 280 | 中·高：批量脚本改 500+ 文件引入空译 / key 重名冲突 | 每批 30 条 → commit 前 Gate C + E 双闸实跑；exit≠0 不 commit；每批 FAIL 数 drop ≥30 验证 |
| P2 Design Token 616 | 中·中：`::before/::after content` 里 `#FF0000` 被误识别为色值改坏 UI 伪类 | 三阶段 dry-run，severity 分类；只 apply high+medium（≈95%），low 5% 人工改；10 page visual smoke 改完必跑 |
| P3 11-Gate 升级 | 低·高：J/K 首次实跑 fmt 1000+ diff + clippy -D warnings 80+ 警告 | 拆 2 小步：Step 1 `cargo fmt --all` + `cargo clippy --fix` 单独 commit 基线；Step 2 再写入 lefthook/ci.yml 并实跑 |
| P4 SEAL | 低·低：某闸第一次跑红（如 perm-matrix 路由/权限变动） | P4 只改 TODO.md + artifacts；任何闸 FAIL 直接 cherry-pick 修复 commit，不回滚业务代码 |

### 3.2 测试策略（逐批 × 断言粒度）

| 批次 | 测试方法 | 断言粒度 |
|------|------|----------|
| P0 | `cargo test -p topems-finance -- --test-threads=4`（unit + `#[sqlx::test]` handler integration） | 每业务规则 ≥5 cases：币种×5 / 自转×3 / 金额×5 / 期状态×4 / 正常路径×3 = ≥20 cases |
| P1 | `scan-hardcoded-precise.cjs --strict` + `check-i18n-quality.cjs` 双闸每批 commit 前必跑 | 每批 FAIL 数 drop ≥30；所有新增 i18n key 双语 grep 确认（key → en → zh 都有 entry） |
| P2 | `scan-hardcoded-colors.cjs --strict` + 10 page Chrome visual smoke | 10 页 UI 色值只变不缺；tokens.css 42 vars 全部 var(--x) 引用 ≥1 次（100% coverage） |
| P3 | `lefthook run pre-commit` + `lefthook run pre-push` 双段实跑 + Changes filter 验证 | A-K 11 闸 exit 0；只改 Rust 时跳过 A/B/C/D/E/I（TS 闸跳过）；只改 TS 时跳过 F/J/K（Rust 闸跳过） |
| P4 | 11-Gate 顺序实跑 + JSON 落盘 + `jq` 全零验证 | `jq '[.gates[].exit_code] | add' artifacts/v232-seal-11gate.json = 0`（11 个 exit_code 全 0） |

### 3.3 回滚策略（零耦合批次 × 独立 revert）

5 批文件范围完全不相交（见 Section 1 表格），任何一批出问题 `git revert <SHA>` 即可，其他批次改动零影响：

| 批次 | 文件边界 | revert 命令 |
|------|---------|------------|
| P0 | `svc/finance/**` | `git revert <P0 SHA>` → 只回滚 Finance，P1-P3 保留 |
| P1 | `apps/web/src/modules/**` + `apps/web/src/i18n/locales/**` | `git revert <P1 SHA>` → 只回滚 i18n 文本 |
| P2 | `apps/web/src/{styles,components,pages}/**` + `tokens.css` | `git revert <P2 SHA>` → 只回滚色值/box-shadow |
| P3 | `.lefthook.yml` + `.github/workflows/ci.yml` + scripts/docs 文本替换 | `git revert <P3 SHA>` → 回滚 CI 配置不回滚业务 |
| P4 | `docs/roadmap/TODO.md` + `docs/roadmap/artifacts/v232-seal-11gate.json` | `git revert <P4 SHA>` → 回滚文档，代码全保留 |

---

## 4. 版本边界 / 不做的事（Scope Guard，避免 scope creep）

以下内容 **不在 V232 scope 内**，必须放后续版本（V233+）：

1. **业务新功能开发**：APS 排程可解算引擎、MES 异常检测模型训练、QMS 缺陷 AI 分类、BI 多主题 KPI 自动发现 —— 一律 V233+。
2. **Finance SQL 流程重构**：P0 只做"校验位置前移 + 错误转规范 ErrorPayload"，绝不改 INSERT / UPDATE / SELECT SQL 流程本身（改 SQL 归 V233 Finance V56）。
3. **i18n v2 架构升级**（如 vue-i18n 迁移、i18next 升级到 v24、locales JSON 拆 per-module YAML）— V234 再做，P1 只清零，不改架构。
4. **Design System v2 大改版**（组件重写、新设计语言）— 归 P2 Design 专项，P2 只补 616 残留 + 最后 4 个 shadow token。
5. **全 workspace 单测补齐**（`cargo test --workspace` 全绿 · 2000+ tests）— V214 覆盖率续做，V232 只扩 finance handler ≥20。

---

## 5. 下一步（Writing-Plans Skill 必用）

> **For agentic workers:** 本 spec 经 user review 批准后，**MUST invoke `superpowers:writing-plans` skill** 生成：
> 1. 8-12 commits × 每 commit 步骤明细（P0.1 → P0.2 → P0.3 → P1.1 → P1.2 → P1.3 → P2.1-P2.2 → P3.1 → P3.2 → P3.3 → P4.1 → P4.2）
> 2. 每个 step 的前置条件、执行命令、验收断言、失败回滚命令
> 3. 插入 TODO.md V232 章节占位的具体行 + commit message 骨架
> 4. 执行顺序纪律：P0→P1→P2→P3→P4 严格串行，绝不跨批并行改同一文件
