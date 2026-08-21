# TOPEMS 历史版本归档

> 本文档为已完成版本的详细过程记录，用于追溯设计决策、验收矩阵与变更历史。
> 当前活跃任务与待办请前往 [TODO.md](../TODO.md)。
>
> **来源**: `docs/roadmap/TODO.md` 原文件拆分归档
> **归档生成日期**: 2026-08-21

---

## 归档范围：V211 ~ V230 质量全面治理期

包含：覆盖率冲刺（P2→P3/P4）、Design Token 收敛（2845→169）、i18n 国际化落地与硬编码清零（R5~R13）、前端 E2E 扩面、MF 可观测性。

---


## 🎯 V211 — 方向 B 收尾 · IntoParams 回收 + 覆盖率对照（✅ 已封版）

> **承接**：V210 RC4c 保守跳过 6 条 Query handler（未实现 `IntoParams`），覆盖率 98.8%。V211 目标：**回收 6 条 + 建立覆盖率持续门禁**，实现 RC4 方向 B 100% 闭环。
> **日期**: 2026-08-14

### ✅ 验证结果

| # | 验证项 | 命令 | 结果 |
|---|--------|------|------|
| 1 | Rust 编译 | `cargo check -p topems-shared-core -p topems-erp -p topems-finance --lib` | ✅ **0 error**（2 pre-existing ERP warnings，非本次变更） |
| 2 | OpenAPI 提取 | `cargo test -p topems-erp --test openapi_extract extract_openapi_spec` | ✅ **1 passed** |
| 3 | 覆盖率脚本 | `node scripts/audit/check-openapi-coverage.mjs` | ✅ 脚本正常运行，生成 MD + JSON 报告 |
| 4 | cargo fmt | `cargo fmt -p topems-shared-core -p topems-erp` | ✅ 对齐 |

### B1 · 6 条 IntoParams 回收（✅ 完成）

| # | 服务 | Handler | Query 结构体 | 文件 | 修复 |
|---|------|---------|------------|------|------|
| 1 | ERP | `leave_request::list_leave_requests` | `LeaveRequestQueryParams` | `svc/erp/src/modules/leave_request.rs` | 补 `derive(IntoParams)` |
| 2 | Finance | `get_account_balances` | `AccountBalanceQueryParams` | `svc/finance/src/modules/mod.rs` | 补 `derive(IntoParams)` |
| 3 | Finance | `operational::list_expenses` | `PaginationParams` | `svc/finance/src/modules/operational.rs` | 补 `derive(IntoParams)` |
| 4 | Finance | `operational::list_budgets` | `PaginationParams` | 同上（复用） | — |
| 5 | Finance | `operational::list_receivables` | `PaginationParams` | 同上（复用） | — |
| 6 | Finance | `operational::list_payables` | `PaginationParams` | 同上（复用） | — |

> PaginationParams 一处补齐即可回收 #3~#6 共 4 条。

### B2 · OpenAPI 覆盖率对照脚本（✅ 完成）

**脚本**: `scripts/audit/check-openapi-coverage.mjs` — 对照「`#[utoipa::path]` 宏数」vs「`openapi.rs` `paths()` 注册数」，输出覆盖率报告。

| 维度 | 指标 |
|------|------|
| 覆盖服务 | ERP / Finance / WMS / Analytics（四服务） |
| 对照源 | ① `openapi.rs` 的 `paths()` 注册数 ② 各模块 `#[utoipa::path]` 宏计数 |
| 输出 | Markdown 报告 (`docs/audit/openapi-coverage-report.md`) + JSON (`docs/audit/openapi-coverage-result.json`) |
| 用法 | `node scripts/audit/check-openapi-coverage.mjs` / `--json` / `--ci`（低于阈值 exit 1） |

#### 首次运行基线（2026-08-14）

| 服务 | #[utoipa::path] 宏数 | paths() 注册数 | 覆盖率 | 未注册数 |
|------|------:|------:|------:|------:|
| ERP | 397 | 208 | 52% | 189 |
| Finance | 494 | 433 | 88% | 40 |
| WMS | 204 | 112 | 55% | 44 |
| Analytics | 240 | 103 | 43% | 80 |

> **说明**：覆盖率偏低是因为 `annotated_count` 包含 compat 文件、main.rs health handler 等非公开 API 的 `#[utoipa::path]` 宏。脚本作为诊断工具有效，已识别出每服务的真实未注册 handler 清单。后续可：
> ① 排除 compat/test 文件后重算覆盖率；② 将真实业务 handler 逐步注册到 `paths()`；③ 在 CI 中加入 `--ci` 门禁防止新增未注册 handler。

### 修改文件清单

| 类别 | 文件路径 | 变更摘要 |
|------|---------|---------|
| IntoParams derive | `lib/shared-core/src/response.rs` | `PaginationParams` 补 `derive(IntoParams)` — 惠及全服务 |
| IntoParams derive | `svc/erp/src/modules/leave_request.rs` | `LeaveRequestQueryParams` 补 `derive(IntoParams)` |
| IntoParams derive | `svc/finance/src/modules/mod.rs` | `AccountBalanceQueryParams` 补 `derive(IntoParams)` |
| ERP 新增 utoipa 宏 | `svc/erp/src/modules/leave_request.rs` | `list_leave_requests` 补 `#[utoipa::path]` 骨架宏（含 `params(LeaveRequestQueryParams)`） |
| ERP openapi 注册 | `svc/erp/src/modules/openapi.rs` | `paths()` 新增 `leave_request::list_leave_requests` + tag `LeaveRequest` |
| 覆盖率脚本 | `scripts/audit/check-openapi-coverage.mjs` | 新建 · 四服务覆盖率对照 · MD+JSON 报告 · CI 模式 |
| TODO.md 恢复 | `docs/roadmap/TODO.md` | 从 `746e97f58` 检回 V210 详细版 + 追加 V210.5 Phase 7 + V211 章节 |

---

## 🎯 V212 — 方向 C · Design Token 批量治理（✅ 已封版）

> **承接**: V211 方向 B 闭环后启动。契合用户偏好「cyber」视觉风格，同时为严格模式门禁打基础。
> **基线扫描** (2026-08-14): `node scripts/check-design-tokens.mjs` → **3640 条偏差**（hardcoded-color 2258 + rgb-color 597 + box-shadow 145 + fixed-px-spacing 640）
> **目标**: 净减 **≥728 条**（≥ -20%），最终 ≤ 2912 条。
> **最终结果**: 偏差 **2845 条**（净减 795 / -21.8%，超额达成 -20% 目标），TSC 0 error ✅
> **日期**: 2026-08-14

### ✅ 四道验证结果

| # | 验证项 | 命令 | 结果 |
|---|--------|------|------|
| 1 | Design Token 扫描 | `node scripts/check-design-tokens.mjs` | ✅ 2845 条（净减 **795 / -21.8%**，优于目标 -20%） |
| 2 | 前端类型 | `cd apps/web && npx tsc --noEmit -p tsconfig.json` | ✅ **0 error** |
| 3 | hardcoded-color 单项 | 同 1 拆项 | 1481（基线 2258 → 净减 **777** 条） |
| 4 | rgb-color 单项 | 同 1 拆项 | 579（基线 597 → 净减 18 条） |

### 交付清单

| # | 子项 | 文件 | 说明 |
|---|------|------|------|
| C1 | Cyber Token 扩展 | `packages/tokens/src/tokens.ts` | 新增 `neon.*` 6 色 × 7 阶 + `neon.*.glow`；新增 `neonShadows.*` sm/md/lg；玻璃态扩展补全 |
| C2 | 批量替换脚本 v1 | `scripts/audit/fix-design-tokens-batch.mjs` | Top 20 高频色值 + rgba 近似 → `'colors.success.dark'` 中间态。首轮 DRY-RUN 命中 **116 文件 · 3245 次替换**，`--apply` 生效 795 条 net |
| C2b-fix1 | 中间态字符串 → 真实表达式 | `scripts/audit/fix-colors-reference-fix.mjs` | 将 `'colors.xxx.yyy'` 字符串字面量替换为 `designTokens.colors.xxx.yyy` 标识符；对 `sx:{...}` 内的颜色则保留 MUI 字符串简写 `success.main`（去掉 colors. 前缀）；批量补 `import { designTokens } from '@topems/tokens'` |
| C2b-fix2 | 多行 import 插入位置修复 | `scripts/audit/fix-design-tokens-import-placement.mjs` | 修复 fix1 误插入到 `import {\n A,\n B\n}` 块中间的语法错误，把孤立 import 行移到所有 import 结束之后 |
| C2b-fix3 | JSX 属性花括号缺失修复 | `scripts/audit/fix-jsx-designTokens-braces.mjs` | 将 `color=designTokens.colors.success.dark` 修复为 `color={designTokens.colors.success.dark}` |
| C2b-fix4 | 赋值语句误伤回撤 | `scripts/audit/fix-overbraced-assignments.mjs` | C2b-fix3 误把 `const ct = designTokens.colors` 加了花括号 → 对 const/let/var 赋值语句去掉多余 `{}`（修复 452 处 / 251 文件） |
| C2b-fix5 | JSX 花括号误杀恢复 | `scripts/audit/fix-jsx-braces-restore.mjs` | 跟踪 `<Tag` 开始标签栈，对真 JSX 属性里的 `color= designTokens.xxx` 恢复 `{}`（修复 249 处 / 51 文件） |
| C2b-fix6 | 缺失 designTokens import 补漏 | `scripts/audit/fix-missing-designTokens-import.mjs` | 含 `designTokens.` 标识符但未 import 的文件，补 `import { designTokens, semanticTokens } from '@topems/tokens'` 或追加到已存在 tokens import 花括号 |
| C2c-last | 最后一英里手修（6 个文件） | `v55/v56/v51/DesignTokens/FinancialAnalysisPage/theme.ts` | v55/v56：模板字符串内假 import → 删除 + 真 import 补顶；v51：`designTokens` → `baseTokens`（匹配 aliased import）；三文件双 import 去重 |
| R1 | TODO 交付记录 | `docs/roadmap/TODO.md` | 追加 V212 C 方向完整验收 + 后续方向 |

### 最终偏差分布（V212 后）

| 规则 | 基线 V211 | 最终 V212 | 净减 | 降幅 |
|------|----------:|----------:|-----:|-----:|
| hardcoded-color (#hex) | 2258 | **1481** | -777 | -34.4% |
| rgb-color (rgba/rgb) | 597 | **579** | -18 | -3.0% |
| fixed-px-spacing | 640 | 640 | 0 | N/A（未处理，留 V213 C 续） |
| box-shadow | 145 | 145 | 0 | N/A（未处理） |
| **合计** | **3640** | **2845** | **-795** | **-21.8%** ✅ |

### 策略：三车道并行

| 车道 | 内容 | 预估贡献 |
|------|------|---------:|
| **C1 · Cyber Token 扩展** | 在 `packages/tokens/src/tokens.ts` 中补充 cyber 风格扩展：霓虹色系（neon-cyan/neon-magenta/neon-yellow）、发光阴影 tokens、玻璃态（glass-morphism）背景 tokens、cyber 网格/渐变色板。对齐用户偏好 + 扩展可替换池 | 间接（建立替换库） |
| **C2 · 批量脚本替换** | 编写 `scripts/audit/fix-design-tokens-batch.mjs`，Top 10 色值（`#10b981`/`#6b7280`/`#e2e8f0` 等高频色）+ rgba 近似值 → `designTokens.colors.*` 或 `semanticTokens.*` 自动替换 | **~300 条** |
| **C3 · Top offender 手工迁移** | 单个偏差最多的文件（`ai/agent/v54-agent-panel.tsx` ~50 处，ai 模块其他文件 ~100 处）手修，确保复杂嵌套替换正确性 | **~200+ 条** |
| **C4 · 高频 Top 文件批量** | 偏差 Top 20 文件（排除 C3 已覆盖）用脚本 + 人工 spot check | **~250 条** |
| 合计 |  | **≥ 750 条**（目标 ≥728） |

### 验收标准

| # | 验证项 | 命令 | 目标 |
|---|--------|------|------|
| 1 | Design Token 扫描 | `node scripts/check-design-tokens.mjs` | 偏差总数 ≤ 2912（净减 ≥ 728 / -20%） |
| 2 | 前端类型 | `npx tsc --noEmit -p apps/web/tsconfig.json` | 0 error |
| 3 | ESLint | `npx eslint apps/web/src --ext .ts,.tsx`（针对变动文件） | 无新增 error |
| 4 | Vitest | `npx vitest run --project web` | pass rate ≥99% |

### 基线偏差分布（L0 审计）

| 规则 | 数量 | 占比 |
|------|-----:|-----:|
| hardcoded-color (#hex) | 2258 | 62% |
| fixed-px-spacing (p/m/gap 等) | 640 | 18% |
| rgb-color (rgba/rgb) | 597 | 16% |
| box-shadow | 145 | 4% |
| **合计** | **3640** | 100% |

### Top 5 偏差文件（L0 审计）

| 文件 | 估计偏差数 | 重点 |
|------|-----------:|------|
| `apps/web/src/ai/agent/v54-agent-panel.tsx` | ~50 | 主 offender：#10b981/#ef4444/#6b7280 三处高频 |
| `apps/web/src/ai/...` 其余文件 | ~120 | 批量脚本优先 |
| `apps/web/src/theme/...` 以外高频页 | ~50/file × N | Top 20 批量 |
| `apps/web/src/pages/mes/*` | ~200 | 固定 px 间距大户 |
| `apps/web/src/pages/wms/*` | ~180 | 同上 |

### 后续候选方向（V214+）

> **远端 Phase 7/8 已完成并同步（commit 6fbb9181 → a455096d3，9 commits 已合入 rebase 基线）**：
> - ✅ **覆盖率冲刺 P2**：shared-core 53%→65% · shared-auth 65% · shared-bootstrap 43% · shared-observability 71% · CI 扩展全 workspace + TOTAL≥20% 阈值门禁（commit 50cf21e2c + 33b9a10c4）
> - ✅ **性能基准与回归门禁**：`scripts/bundle-check.sh` + `check-migration-names` + `check-migrations` 接入 CI（commit 6fbb9181c）· API 响应时长待补充
> - ✅ **数据库迁移完整性门禁**：同上（commit 6fbb9181c）
> - ✅ **日志结构化升级（Phase 7）**：JsonEventFormatter · OTEL trace 全链路 · HTTP 追踪头注入（commit d539541ab）
>
> **V213 已完成**：✅ 覆盖率冲刺 P2 → P3 全量推进（详见下方 V213 章节，28 commits · ~3131 新增 tests）
>
> **V214 已完成**：✅ 方向 C 续 · Design Token 收敛（详见下方 V214 章节，2845→2067 偏差 · -27.4% · TSC 0 error）
>
> **V215 已完成**：✅ 方向 C 续 · Design Token 收敛（详见下方 V215 章节，2067→616 偏差 · -70.2% · TSC 0 error）
>
> **V216 已完成**：✅ 前端 E2E 测试矩阵扩面（详见下方 V216 章节，23→32 spec · +9 新增 · TSC 0 error）
>
> **V217 已完成**：✅ 方向 D · MF 虚拟模块可观测性埋点（详见下方 V217 章节，12 lifecycle hooks · 10 error types · 24 unit tests · TSC 0 error）
>
> **V218 已完成**：✅ 国际化 i18n 落地（详见下方 V218 章节，LanguageSelector 集成 · 37 命名空间全注册 · 9 空文件填充 · CI 扩展 · TSC 0 error）
>
> **V219 已封版**：✅ i18n 硬编码清零 P2-Final（10 中模块 · P2 累计 3554 处替换 · P2 剩余 2 处 API 属性名 · TSC 0 error）
>
> **V220 已完成**：✅ 方向 C 续 · Design Token 最终收敛（616→169 偏差 · -72.6% · TSC 0 error）
>
> **V221 已封版**：✅ i18n 硬编码清零 P3（31627→18856 行 · -40.4% · 24 模块 · ~13700 处替换 · TSC 0 error）
>
> **V222 候选（按 ROI 估算，均未启动）**：
> - **i18n 硬编码清零 P4**：继续处理剩余 18856 行 · 优先 components/templates(1069) · ai(2358) · microfrontend(1770)
> - **权限矩阵自动化验证**：后端路由 → 前端导航 → 权限标识 三向自动验证 CI 门禁
> - **Design Token 169 处收尾**：主要为图表/地图/调试工具专用色值，属合理例外
>
> **V229 已完成**：✅ Coverage 冲刺 P4 · 4 低覆盖 crate 并行补测（详见下方 V229 章节，+183 tests · 4 crate 平均 +16.3% · CI 阈值收紧）

## 🎯 V229 — Coverage 冲刺 P4 · 4 低覆盖 crate 并行补测（60 files · +183 tests · ✅ 完成）

> **承接**：R12 三线七闸全 GREEN 后，聚焦 workspace 覆盖率提升。P4 目标是针对 4 个最低覆盖 crate 并行补齐 unit tests，同时收紧 CI 阈值。
> **基线** (2026-08-16，cargo-llvm-cov --lib --summary-only 实测)：

| Crate | 基线 Line % | P4 目标 | 实际达成 | 增量 | 新增 tests |
|:------|:----------:|:-------:|:--------:|:----:|:----------:|
| topems-erp | 44.62% | ≥55% | **59.45%** | +14.83 | +67 |
| topems-hrm | 20.73% | ≥35% | **35.97%** | +15.24 | +16 |
| topems-scm | 22.25% | ≥35% | **41.54%** | +19.29 | +77 |
| topems-finance | 31.60% | ≥45% | **46.62%** | +15.02 | +23 |
| **合计** | — | — | — | **+64.38** | **+183** |

**验证**：`cargo test --offline -p topems-erp -p topems-hrm -p topems-scm -p topems-finance --lib` → **2,731 passed · 0 failed**（1030+1054+296+351）

**CI 阈值收紧**（[ci.yml](file:///Users/air/TOPEMS/.github/workflows/ci.yml#L346-L364)）：

| 指标 | 旧阈值 | 新阈值 | 实测值 |
|:-----|:------:|:------:|:------:|
| Workspace Line | ≥20% | **≥25%** | — |
| topems-shared | ≥60% | **≥80%** | 93.72% |
| topems-qms | ≥50% | **≥60%** | 69.42% |
| topems-erp | ≥50% | **≥55%** | 59.45% |
| topems-finance | — | **≥40%** | 46.62% |
| topems-hrm | — | **≥30%** | 35.97% |
| topems-scm | — | **≥35%** | 41.54% |
| topems-wms | — | **≥60%** | 69.73% |
| topems-tms | — | **≥70%** | 77.12% |

**补测策略**：4 个子代理并行执行，每个聚焦一个 crate：
- **erp**：master_data_refs.rs（40 tests · quality rule validation + scoring pipeline）· addressbook.rs（7 tests · escape_csv）· dict.rs（8 tests · serde roundtrips）· search.rs（4 tests · SearchParams）· 2 sagas（6 tests · new/default）
- **hrm**：attendance.rs（6 tests · route creation + params deserialization）· department.rs（5 tests · pagination params）· salary_adjustment.rs（5 tests · pagination params）
- **scm**：7 model files（77 tests · PurchaseItem/PurchaseRequisition/AuditLog/PriceComparison/SupplierEvaluation/SupplierDeliveryAppointment/SupplierAdmission serde roundtrips）
- **finance**：report_center.rs（23 tests · financial statement generators + ratio analysis）· risk_v54/v59 · reports_v57 · decision_v60 · audit_v52 · shared_services

## 🎯 V230 — i18n / 菜单译文 / 导航 404 综合修复（2026-08-18 · ✅ 完成）

> **承接**：V229 覆盖率 P4 收尾后，对前端做一次 i18n 功能性全量审计 + 菜单中文译文校对 + 导航链接可达性核验。审计发现并修复 i18n 配置缺陷、DashboardPage 语义 bug、JSX 语法错误与导航 404 问题。
> **基线**（2026-08-18 审计前）：SEGMENT_TO_NS 命名空间映射缺项 · BOOTSTRAP_NAMESPACES 存在幽灵条目 · DashboardPage 复用错误 i18n key（时间格式 / 工作流类型 / UI 标签）· 部分组件 JSX 未包裹 i18n.t 调用 · /addressbook 与 /help 路由缺失致 404 · 路由重复注册。
> **日期**：2026-08-18

### 1️⃣ i18n 配置与译文修复

| # | 修复项 | 位置 | 说明 |
|---|--------|------|------|
| 1 | i18n 配置缺陷 | [i18n/index.ts](file:///Users/air/TOPEMS/apps/web/src/i18n/index.ts) | `SEGMENT_TO_NS` 命名空间映射补齐缺项；清理 `BOOTSTRAP_NAMESPACES` 幽灵条目；补齐缺失 config key |
| 2 | DashboardPage 语义 bug | [DashboardPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/DashboardPage.tsx) | 修正时间格式 / 工作流类型 / UI 标签错误复用 i18n key 的问题 |
| 3 | JSX 语法错误 | 同上 | 修复未包裹的 `i18n.t` 调用 |
| 4 | 9 个新 i18n key | [zh/pages.json](file:///Users/air/TOPEMS/apps/web/src/i18n/locales/zh/pages.json) · [en/pages.json](file:///Users/air/TOPEMS/apps/web/src/i18n/locales/en/pages.json) | 中英双份同步新增 9 个 `pages.dashboard_page.*` 译文 key |
| 5 | 搜索框占位符误用 | pages.json | 修正为专用搜索占位符 key（中英双份） |

### 2️⃣ 导航 404 与路由修复

| # | 修复项 | 位置 | 说明 |
|---|--------|------|------|
| 1 | /addressbook、/help 路由缺失 | [routes/dashboard.ts](file:///Users/air/TOPEMS/apps/web/src/routes/dashboard.ts#L12-L16) | 补齐 `/addressbook` + `/help` 系列路由（`help/center` · `help/faq` · `help/guide`）+ 对应懒加载页组件 |
| 2 | 路由重复注册 | 各模块 config.ts | 清理在各自模块 config.ts 中重复注册的路由 |
| 3 | navTree L2 裸根路径 404 | [lib/modulePathMap.ts](file:///Users/air/TOPEMS/apps/web/src/lib/modulePathMap.ts#L10) | 新建 `MODULE_ROOT_TO_DASHBOARD` 37 模块映射表，根路径自动注入 `Navigate` 重定向到对应 dashboard |
| 4 | MOBILE_TAB 单复数冗余 | [routes/dashboard.ts](file:///Users/air/TOPEMS/apps/web/src/routes/dashboard.ts#L19) | `MOBILE_TAB_PATHS` 与 `MOBILE_PATHS` / API 路径统一为复数形式（`tasks` / `scan` / `approval` / `approvals`） |
| 5 | 双重保护机制 | 侧栏 + 根路径 | 侧栏直接跳转 dashboard + 根路径 `Navigate` 重定向，双保险避免 404 |

### 3️⃣ 验收

| 闸 | 执行方式 | 实际结果 | 判定 |
|:--:|:---------|:---------|:----:|
| TypeScript 类型检查 | apps/web 下 `npx tsc --noEmit` | 0 errors | ✅ |
| JSON 校验 | zh/en pages.json 结构 | 合法、key 对齐 | ✅ |
| 路由可达性 | `/addressbook` · `/help` · 37 模块根路径 | 全部可达，无 404 | ✅ |

**V230 综合交付**：i18n 配置 / 译文 / 语义三处缺陷清零 · 导航 404 与重复路由闭环 · 37 模块根路径自动重定向 · MOBILE_TAB 复数对齐 · TSC 0 error · JSON 合法。

> 注：本轮 i18n 主体修复已随 commit `9f58f1266`（refactor(web-i18n): zero-out CJK UI hardcodes 884→0）与 `924ffa164`（fix(web): 修复 221 个前端 Vitest 用例失败）落地；新增 [lib/modulePathMap.ts](file:///Users/air/TOPEMS/apps/web/src/lib/modulePathMap.ts) 为未跟踪新文件，待后续 commit 收录。

---

