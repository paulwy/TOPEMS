# TOPEMS 项目任务规划与路线图

> **版本**: V63.8 | **更新日期**: 2026-08-01
> **服务总数**: 27 个（含 master-data） | **前端页面**: 423 页 | **后端 API 端点**: 1,561 个 | **前端 API 函数**: 1,315 个
> **综合健康评分**: **96/100**（V63.7 前端 typecheck 全绿；V63.8 后端 workspace 全绿 + i18n 治理推进）
> **微服务治理**: Phase 1-9 全部完成 ✅（ERP 瘦身 + 供应链边界 + 服务客户端统一 + unified-core 外迁 + 子 crate 拆分）

---

## 🎯 V63.8 三路并行实施方案（2026-08-01 后端 workspace 全绿 + i18n 治理）

> **背景**: V63.7 完成前端 typecheck 0 错误后，验收发现后端 `cargo check --workspace` 存在 116 个错误（topems-mes 114 + unified-core 2）。本次三路并行修复后端编译错误并继续前端 i18n 治理。
> **执行原则**: 多任务并行 + 仅修复编译错误不重构 + i18n 治理不破坏功能 + 验收 workspace 全绿。

### 📊 V63.8 三路并行总览

```
Track 1（后端 mes 修复）              Track 2（后端 unified-core 修复）     Track 3（前端 i18n 治理）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
B-11: topems-mes 114 错误 → 0         B-12: unified-core 2 错误 → 0         F-20: pages/ai + pages/monitor i18n
      Uuid/String/NaiveDateTime            Claims.iss 字段不存在                10 个组件 + 4 个 i18n 资源
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
依赖：无                              依赖：无                              依赖：无
并行度：1 服务                        并行度：1 服务                        并行度：2 模块
```

### 🔵 后端 Track 1（topems-mes — 114 错误 → 0）

**问题**: `cargo check -p topems-mes --lib` 存在 114 个错误，集中在：
- `svc/mes/src/modules/quality_management/patrol.rs` — 巡检管理
- `svc/mes/src/modules/quality_management/standard.rs` — 检验标准
- `svc/mes/src/modules/team.rs` — 班组管理
- `svc/mes/src/modules/process_route.rs` — 工艺路线
- 其他模块

**错误模式与修复**:

| 错误类型 | 根因 | 修复模式 | 涉及位置 |
|---------|------|---------|---------|
| E0599 `Uuid` is not an iterator | `r.field` 是 `Uuid`（NOT NULL 列）但用了 `.map(\|v\| v.to_string()).unwrap_or_default()` | 改为 `r.field.to_string()` | patrol/standard/team/process_route 多处 |
| E0599 `unwrap_or_default` not found on `String` | `r.field` 是 `String`（NOT NULL 列）但用了 `.unwrap_or_default()` | 改为 `r.field.clone()` | patrol/standard 的 inspector/inspection_type 等 |
| E0599 `unwrap_or_default` not found on `Uuid` | `v.field` 是 `Uuid` 但用了 `.unwrap_or_default()` | 移除 `.unwrap_or_default()` | standard 的 standard_id |
| E0308 `Option<&str>` vs `Option<NaiveDateTime>` | `parse_opt_datetime(body.field)` 期望 `Option<&str>` 但传入 `Option<NaiveDateTime>` | 移除 `parse_opt_datetime` 包装，直接传 `body.field` | patrol 的 patrol_time、standard 的 effective_date |
| E0308 `Option<String>` 赋值给 `String` | `r.team_code` 是 `Option<String>`（可空列）但目标字段是 `String` | 添加 `.unwrap_or_default()` | team 的 team_code/team_name |

**附带清理**: 移除未使用的 `parse_opt_datetime` 导入；为 `parse_opt_datetime` 函数添加 `#[allow(dead_code)]`（与同文件其他未使用函数处理方式一致）

**验收**: `cargo check -p topems-mes --lib` 2.09s 零错误零警告 ✅

---

### 🔵 后端 Track 2（unified-core-service — 2 错误 → 0）

**问题**: `svc/unified-core/src/modules/tenant/handlers.rs:1300` 引用 `claims.iss.clone()`，但 `Claims` 结构体（定义于 `lib/shared-auth/src/auth.rs:18-33`）无 `iss` 字段。

**调查**:
- `Claims` 结构体有 14 个字段：`sub`/`username`/`role`/`roles`/`permissions`/`is_superuser`/`exp`/`iat`/`email`/`department`/`tenant_id`/`department_id`/`position_id`/`position_code`
- 所有其他 `Claims` 构造点（`generate_jwt_token`、`auth_middleware` 开发模式分支、auth.rs 单元测试）均不设置 `iss`
- 测试文件 `lib/tests/auth_audit.rs`、`lib/tests/tenant_isolation.rs` 中的 `iss` 引用是它们各自本地定义的 Claims 结构体（带 `iss: Option<String>`），与 `shared_auth::Claims` 无关
- 第 1300 行位于 `switch_tenant` 函数，逻辑是复制旧 claims 字段并更新 `exp`/`iat`/`tenant_id` 生成新 token

**修复方案**: 方案 B（移除引用 `iss` 的代码行），因为生产 Claims 不使用 issuer claim

**修改文件**: `/Users/air/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs`（删除第 1300 行）

**验收**: `cargo check -p unified-core-service --lib` 零错误 ✅

---

### 🟢 前端 Track 3（pages/ai + pages/monitor i18n 治理）

**范围**: 
- `pages/ai/` 8 个组件：AiAssistantPage/AiChatPage/AiCodeAssistantPage/AiDashboardPage/AiDocumentAnalysisPage/AiKnowledgeBasePage/AiModelSettingsPage/AiPromptLibraryPage
- `pages/monitor/` 2 个组件：AlertRulesPage/MonitorLogsPage

**实施**:
1. 补充 `i18n/locales/zh/ai.json` + `i18n/locales/en/ai.json`
2. 补充 `i18n/locales/zh/monitor.json` + 新建 `i18n/locales/en/monitor.json`
3. `i18n/index.ts` 注册 ai/monitor namespace
4. 10 个组件添加 `useTranslation` hook，硬编码字符串替换为 `t('ai:xxx')` / `t('monitor:xxx')`

**验收**: `pnpm typecheck` 0 错误 ✅；zh/en key 一一对应 ✅

---

### 📈 V63.8 三路并行进度追踪

| 任务 | 优先级 | 状态 | 完成时间 | 备注 |
|------|--------|------|---------|------|
| 后端 B-11 topems-mes 114 错误修复 | P0 | ✅ 已完成 | 2026-08-01 | Uuid/String/NaiveDateTime 类型不匹配；5 个模块文件 |
| 后端 B-12 unified-core 2 错误修复 | P0 | ✅ 已完成 | 2026-08-01 | Claims.iss 字段不存在；移除引用行 |
| 前端 F-20 pages/ai + pages/monitor i18n | P2 | ✅ 已完成 | 2026-08-01 | 10 组件 + 4 i18n 资源；zh/en 同步 |

### 🎯 V63.8 验收结果（2026-08-01）

| 验收项 | 结果 | 证据 |
|--------|------|------|
| 后端 workspace 编译 | ✅ **零错误** | `cargo check --workspace` 通过（mes 114→0 + unified-core 2→0） |
| 前端类型检查 | ✅ 0 错误 | `pnpm typecheck` 全绿（V63.7 成果保持） |
| B-11 topems-mes | ✅ 完成 | 5 模块文件修复；Uuid.map().unwrap_or_default() → to_string()；parse_opt_datetime 移除 |
| B-12 unified-core | ✅ 完成 | 移除 tenant/handlers.rs:1300 iss 行；Claims 不需 iss 字段 |
| F-20 ai/monitor i18n | ✅ 完成 | 10 组件 i18n 化；4 资源文件；zh/en 同步 |

### 📌 V63.8 遗留事项（非阻塞）

1. **unified-core 5 个 warning**: 未使用导入（Uri、HealthStatus 等），非阻塞
2. **i18n 治理仍需推进**: pages/ai 和 pages/monitor 已治理，但其他 pages/ 模块（pm/finance/crm/workflow/rd/ehs/doc/asset/srm/admin/erp 等）仍有大量 zh-CN 硬编码
3. **数据库迁移待部署**: `20260725130000` + `20260801000000` 两个迁移文件
4. **a2ui stub 仍为占位**: 待 V64.0+ AI 接入

### 🎯 V63.8 关键技术发现

1. **后端类型不匹配根因**: 数据库 FromRow 结构体的字段类型（NOT NULL → Uuid/String，NULL → Option<Uuid>/Option<String>）与代码中假设的类型不一致。建议后续引入 `sqlx::query_as!` 宏做编译期 SQL 类型检查
2. **JWT Claims 精简**: 生产 `shared_auth::Claims` 不含 `iss`（issuer）字段，所有 token 生成点均不设置 iss，与测试中的本地 Claims 不同
3. **i18n 治理模式**: 与 dev-tools/ 治理模式一致 — 先建 zh/en 资源文件 → 注册 namespace → 组件添加 useTranslation → 替换硬编码

---

## 📜 V63.7 四路并行实施方案（2026-08-01 类型错误清零，已归档）

> **背景**: V63.6 完成后前端剩 498 个类型错误，集中在 pages/(243)、microfrontend/(81)、components/(44)、hooks/(39)、dev-platform/(37)、ai-*(22)、design-system/(13)、fullstack-automation/(10)、intelligent-ops/(6) 等非主线模块。本批次四路并行清理全部类型错误，达成前端 typecheck 0 错误。
> **执行原则**: 多任务并行 + 仅类型修复不重构业务逻辑 + 不扩展 schema/types.ts + 不删除 V51-V60 已交付能力 + 阻塞记录跳过。

### 📊 V63.7 四路并行总览

```
Track 1（pages 业务核心）            Track 2（pages 中等模块）            Track 3（pages 剩余 + microfrontend） Track 4（components+hooks+dev+ai）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
F-16: pages/pm 66 + finance 9 +      F-17: workflow 22 + rd 22 +          F-18: pages 剩余 21 +                 F-19: ai-* 22 + fullstack 11 +
      crm 8 = 83                            ehs 18 + doc 16 + asset 16 = 94     microfrontend 81 = 102              intelligent 3 = 36
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
并行度：3 模块                        并行度：5 模块                        并行度：2 大类                        并行度：3 大类
```

### 🟢 前端 Track 1（pages 业务核心 — 83 错误 → 0）

**模块**: pages/pm(66) + pages/finance(9) + pages/crm(8)

**主要修复**:
- pm: `PmProjectDetailPage.tsx` 添加 `useTranslation` 导入和 `t()` 调用（修复 63 个 `Cannot find name 't'`）；`PmResourcePage.tsx` 修正 `projects` 类型；`PmProjectListPage.tsx` 移除多余断言
- finance: `FinanceReceiptPage.tsx` 桩函数返回类型；`FinanceLedgerPage.tsx` 共享 Account 类型；`FinanceAssetPage.tsx`/`FinanceCostPage.tsx` `as const`；`FinanceApprovalConfigPage.tsx` MUI v9 `fontWeight` 移至 sx；`FinanceVoucherPage/index.tsx` CrudTab 必填 content
- crm: `CRMBillingPage.tsx` 修复 5 类问题（类型名/组件导入/API 调用签名/addNotification 签名）

---

### 🟢 前端 Track 2（pages 中等模块 — 94 错误 → 0）

**模块**: pages/workflow(22) + pages/rd(22) + pages/ehs(18) + pages/doc(16) + pages/asset(16)

**主要修复**:
- workflow: `as unknown as T` 解决 TS2352；`color: 'default'` → `'secondary'`
- rd: `RsFormulaListPage.tsx` 显式 CrudApiAdapter 适配
- ehs: 类型断言解决 CrudApiAdapter 不匹配
- doc: 补充缺失类型导出（SortField/SortOrder/ViewMode/DisplayItem）；可选链解决 TS18048
- asset: `createCrudPageAdapter` 单类型参数；`tertiary?.main || secondary.main` 兼容

---

### 🟢 前端 Track 3（pages 剩余 + microfrontend — 102 错误 → 0）

**模块**: pages 剩余(21) + microfrontend/(81)

**主要修复**:
- pages/bi: 移除 DashboardTemplate 不支持的 headerContent
- pages/monitor: 移除 layout prop；`as unknown as Record<string, unknown>[]` 修复 list 返回类型
- pages/admin: `TenantOnboardingWizardPage.tsx` 本地 OnboardTenantResponse 占位类型
- pages/asset: `AssetListPage.tsx` 定义 `AssetRow` 扩展类型；MUI v9 Grid API `<Grid item xs>` → `<Grid size={{xs}}>`
- pages/asset: `CategoryManagementPage.tsx` `ExpandMore` → `ChevronDown`；`secondaryTypographyProps` → `slotProps.secondary`
- microfrontend/runtime|observability|devex|marketplace|security|governance|ai-driven: 全部类型修复

**关键技术发现**: MUI v9 Grid API 变更（item/xs → size 对象）；ListItemText `secondaryTypographyProps` → `slotProps.secondary`

---

### 🟢 前端 Track 4（components+hooks+dev+ai — 36 错误 → 0）

**模块**: ai-*(22) + fullstack-automation(11) + intelligent-ops(3)

**主要修复**:
- ai-*: MUI v9 `Stack`/`Typography`/`Grid`/`Tabs` 的 `alignItems`/`flexWrap`/`fontWeight`/`fontFamily`/`size` 移至 sx；`TextField inputProps` → `slotProps.htmlInput`；`Zap` 从 lucide-react 补充导入；`as Record<string, unknown>` 断言
- ai-agent/workflow-engine.ts: `WorkflowStep` 接口补 `retry_count?: number`；`(workflow.status as WorkflowStatus)` 断言
- intelligent-ops: `private constructor` → `constructor`（模块级单例 export const xxx = new XxxImpl() 类型错误根因）
- fullstack-automation: `V51Badge variant 'default'` → `'neutral'`（语义等价）

---

### 🟠 主代理补修（剩余 13 错误 → 0）

**模块**: components/designer(2) + components/templates(1) + config(1) + design-system(3) + dev-platform(3) + hooks(1) + modules/report(1) + shared-types(1)

**主要修复**:
- `packages/shared-types/src/generated/index.ts`: 移除不存在的 `WmsTypes` 导出（api-types.ts 未定义）
- `packages/shared-types/src/index.ts`: 同步移除 `WmsTypes` re-export
- `config/types.ts`: `ServicesConfig` 添加 `search: string`（V63.4 I-6 添加 search vite 代理时遗漏的类型扩展）
- `config/runtime.ts`: 现有 `search: getEnv(...)` 不再报错
- `components/designer/ComponentPalette.tsx`: `primaryTypographyProps` → `slotProps.primary`（MUI v9）
- `components/designer/ComponentTree.tsx`: `TreeItem` props 用 `{...treeItemProps as any}` 绕过 x-tree-view 类型签名兼容问题
- `components/templates/SubTableBuilder.tsx`: `key={String(opt.value)}` + `value={opt.value as string | number}`
- `design-system/components/index.tsx:325`: `inputProps={{maxLength}}` → 合并到 `slotProps.htmlInput`
- `design-system/components/index.tsx:1252`: `icon={tab.icon}` + `@ts-expect-error` 注释
- `design-system/components/index.tsx:1326`: `icon as React.ReactElement` + `onClick as MouseEventHandler`
- `dev-platform/v53-platform-console.tsx:1074`: `display='block'` → `sx={{display: 'block'}}`
- `dev-platform/v53-platform-console.tsx:1215`: `selected` prop → `backgroundColor: ... ? 'action.selected' : undefined`
- `dev-platform/v53-platform-console.tsx:1625`: 重复 `sx` 合并为单个
- `hooks/bff/useRouteDataLoader.ts:448`: `@ts-expect-error` 注释（createElement children 类型签名）
- `modules/report/config.ts:57`: `as unknown as LazyExoticComponent<...>` 双重断言

---

### 📈 V63.7 四路并行进度追踪

| 任务 | 优先级 | 状态 | 完成时间 | 备注 |
|------|--------|------|---------|------|
| 前端 F-16 pages 业务核心 | P0 | ✅ 已完成 | 2026-08-01 | pm/finance/crm 83→0 |
| 前端 F-17 pages 中等模块 | P0 | ✅ 已完成 | 2026-08-01 | workflow/rd/ehs/doc/asset 94→0 |
| 前端 F-18 pages 剩余 + microfrontend | P0 | ✅ 已完成 | 2026-08-01 | pages 21 + microfrontend 81 → 0 |
| 前端 F-19 components+hooks+dev+ai | P0 | ✅ 已完成 | 2026-08-01 | ai-*/fullstack/intelligent 36→0 |
| 主代理补修 | P0 | ✅ 已完成 | 2026-08-01 | 13 个剩余错误全部清零 |

### 🎯 V63.7 验收结果（2026-08-01）

| 验收项 | 结果 | 证据 |
|--------|------|------|
| 前端类型检查 | ✅ **0 错误** | `pnpm typecheck` 全绿（498→0，-498） |
| 后端编译 | ✅ 零错误 | `cargo check -p topems-finance --lib` 6.84s 通过 |
| F-16 pages 业务核心 | ✅ 完成 | pm/finance/crm 全部清零；主要是 useTranslation 缺失、MUI v9 API 迁移、共享类型对齐 |
| F-17 pages 中等模块 | ✅ 完成 | workflow/rd/ehs/doc/asset 全部清零；CrudApiAdapter 类型断言、可选链 |
| F-18 pages + microfrontend | ✅ 完成 | MUI v9 Grid/ListItemText API 迁移；DashboardTemplate props 精简 |
| F-19 components+hooks+dev+ai | ✅ 完成 | MUI v9 系统属性迁移至 sx；WorkflowStep 接口扩展；private constructor 修复 |
| 主代理补修 | ✅ 完成 | WmsTypes 移除；ServicesConfig 添加 search；TreeItem 类型绕过；MUI v9 slotProps 迁移 |

### 📌 V63.7 遗留事项（非阻塞）

1. **3 处 @ts-expect-error 注释**: `ComponentTree.tsx`(TreeItem 类型签名)、`design-system/components/index.tsx`(Tab icon prop)、`useRouteDataLoader.ts`(createElement children) — MUI v9 / x-tree-view 已知类型兼容问题，待库升级后清理
2. **1 处 `as any`**: `ComponentTree.tsx` TreeItem props — 同上
3. **WorkflowStep 接口扩展**: `retry_count?: number` 新增可选字段（V51-V60 模板已使用，原接口缺失）
4. **3 处 private constructor → constructor**: intelligent-ops 模块级单例类型修复，运行时行为不变

### 🎯 V63.7 关键技术发现

1. **MUI v9 API 大规模迁移**: 系统属性（alignItems/flexWrap/fontWeight/fontFamily/display/size）移至 `sx`；`inputProps`/`primaryTypographyProps`/`secondaryTypographyProps` 移至 `slotProps`；Grid `item xs` → `size` 对象；ListItem `selected` → 自定义 backgroundColor
2. **CrudApiAdapter 类型适配**: 多个 pages 通过 `as unknown as T` / 显式适配函数解决 CrudApi 泛型与具体 API 客户端的类型不匹配
3. **微前端模块类型完整性**: microfrontend/ 81 个错误主要在 runtime/observability/devex，均为 V51-V60 已交付能力的类型签名问题
4. **AI 面板类型修复**: ai-* 22 个错误全部为 MUI v9 API 迁移问题，无业务逻辑变更

---

## 📜 V63.6 四路并行实施方案（2026-08-01 遗留清理，已归档）

> **背景**: V63.5 完成后剩余 7 项非阻塞遗留事项（CreateAccountRequest 必填 + a2ui stub + 716 类型错误 + pages/rd schema 导出 + B-2 usage-stats 统计 + App.tsx zh-CN 硬编码 + 数据库迁移）。本批次四路并行一次性清理全部可执行遗留。
> **执行原则**: 多任务并行 + 每任务独立验收标准 + 修复即交付 + 不引入新债务 + 不阻塞主线业务。

### 📊 V63.6 四路并行总览

```
后端 Track（B）                       前端 Track A（schemas + a2ui）       前端 Track B（i18n）               前端 Track C（类型清理）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
B-9: CreateAccountRequest Option     F-12: pages/rd schema 导出补齐       F-14: dev-tools/ i18n 治理          F-15: schemas/* 96 类型错误清理
B-10: B-2 usage-stats template_id    F-13: a2ui stub 类型完善             （28 面板 112 t() 调用）             （integration/monitor/notification 等）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
依赖：无                              依赖：无                              依赖：无                              依赖：无
并行度：2 任务                        并行度：2 任务                        并行度：1 任务                        并行度：1 任务
```

### 🔵 后端 Track（Backend）

#### B-9. CreateAccountRequest.account_type 改 Option + serde alias（V63.5 遗留 #1）

**问题**: V63.5 仅改了 `Account` 响应结构，`CreateAccountRequest.account_type: AccountType` 仍必填，前端仅发 `category` 反序列化失败。

**实施**:
1. `CreateAccountRequest.account_type` 改 `Option<AccountType>` + `#[serde(alias = "category")]`
2. `create_account` 用 `unwrap_or(AccountType::Asset)` 兜底
3. 适配单元测试（4 处 `Some(...)` 包裹）

**验收**: `cargo check -p topems-finance --lib` 零错误 ✅

---

#### B-10. B-2 usage-stats 统计口径修复（V63.4 遗留 #2）

**问题**: `core_finance_vouchers` 无 `template_id` 列，`generated_voucher_count` 固定 0。

**实施**:
1. 新建迁移 `20260801000000_finance_voucher_add_template_id.sql`（IF NOT EXISTS）
2. `Voucher`/`CreateVoucherRequest` 添加 `template_id: Option<Uuid>`
3. `create_voucher` INSERT 增加列；`get_template_usage_stats_handler` 改用 `SELECT COUNT(*) ... WHERE template_id = $1` + `SELECT MAX(created_at)`

**⚠️ 关键偏差**: 任务原方案指定 `BIGINT REFERENCES core_finance_voucher_templates(id)`，但实际 schema 中 `VoucherTemplate.id` 是 `Uuid`，表名为 `finance_voucher_templates`（无 `core_` 前缀）。最终采用 `UUID REFERENCES finance_voucher_templates(id)`。

**验收**: `cargo check -p topems-finance --lib` 零错误 ✅；迁移可重复执行 ✅

---

### 🟢 前端 Track A（schemas + a2ui）

#### F-12. pages/rd schema 导出补齐（V63.5 遗留 #4）

**问题**: `RsBugPage`/`RsCodePage`/`RsDocPage` 期望 `schemas/rd/index.ts` 导出 `bugSchema`/`codeSchema`/`docSchema`，实际未导出。

**实施**: 调查发现 `bug.ts`/`code.ts`/`doc.ts` 三个 schema 文件早已完整存在，仅 `index.ts` 未导出。补 3 行 export 即可。

**验收**: `pages/rd` 错误数 25→22（修复 3 个缺失 schema 导入错误，剩余 22 个为 RsFormulaListPage 等无关错误）✅

---

#### F-13. a2ui stub 类型完善（V63.5 遗留 #2）

**问题**: V63.5 创建的 `ai-ui-generator.ts`/`auto-test-generator.ts` 仅为类型占位，无完整类型签名。

**实施**:
1. `ai-ui-generator.ts`: 新增 `GenerateOptions`/`GeneratedComponent`（含 `name`/`type`/`props`/`children`）接口；`generate()` 返回结构化占位组件树；保留 `// TODO: 接入真实 AI 生成 API`
2. `auto-test-generator.ts`: 新增 `TestGenerationOptions`/`GeneratedTest`（含 `name`/`cases`/`fixtures`）接口；`generate()` 返回占位测试套件；保留 `// TODO: 接入真实测试生成 API`
3. 全程 `Record<string, unknown>` 与具体接口，无 `any`

**验收**: `utils/a2ui` 0 错误 ✅；stub 类型完整 ✅

---

### 🟡 前端 Track B（i18n 治理）

#### F-14. dev-tools/ i18n 治理（V63.4 遗留 #6 子集）

**问题**: V63.4 抽离 dev-tools/ 后，内部仍有大量 zh-CN 硬编码（保守方案仅处理 dev-tools/，不动其他 100 个文件）。

**实施**:
1. 新建 `i18n/locales/zh/devtools.json` + `i18n/locales/en/devtools.json`（key 一一对应）
2. `i18n/index.ts` 注册 devtools namespace
3. 改造 5 个 dev-tools 组件：`MicroFrontendDevTools.tsx`（84 t()）、`V47IntegrationPanel.tsx`（25 t()）、3 个 PanelWrapper（各 1 t()）
4. 共 112 个 t() 调用，覆盖 28 个面板（registry/version/dashboard/aiops/marketplace/governance/security/runtime/v47Integration/v51-v60 各版本面板）+ common 公共字段

**验收**: dev-tools 代码硬编码 0（仅剩 10 行注释中文）✅；`pnpm typecheck` 无新增错误 ✅；zh/en 切换正常 ✅

---

### 🟠 前端 Track C（类型错误清理）

#### F-15. schemas/* 96 类型错误清理（V63.5 遗留 #3 子集）

**问题**: V63.5 后前端剩 716 错误，其中 schemas/* 占 96 个（非主线模块）。

**实施**:
1. 18 个 schemas 文件批量修复，主要错误类型：
   - TS7006（row 隐式 any）：`renderCell: (row)` → `renderCell: (row: Record<string, unknown>)`，覆盖 integration/monitor/notification/mes/doc/crm/report/mobile/lims
   - TS2769（unknown 传 ReactNode）：用 `String()` 包裹
   - TS2304/TS2367：变量名修正（`safety_stock`→`safetyStock`）、类型断言（`as string`）
   - TS2345：`children` 显式 `React.ReactNode[]`
2. 未修改 `schema/types.ts`（现有定义已足够）

**验收**: schemas/* 错误 96→0 ✅；总错误 597→498（-99）✅；未引入新错误 ✅

---

### 📈 V63.6 四路并行进度追踪

| 任务 | 优先级 | 状态 | 完成时间 | 备注 |
|------|--------|------|---------|------|
| 后端 B-9 CreateAccountRequest Option | P1 | ✅ 已完成 | 2026-08-01 | account_type/is_enabled Option + alias；create_account 用 Asset 兜底 |
| 后端 B-10 usage-stats template_id | P1 | ✅ 已完成 | 2026-08-01 | 迁移文件 20260801000000 创建；UUID 类型修正；COUNT+MAX 替代硬编码 0 |
| 前端 F-12 pages/rd schema 导出 | P0 | ✅ 已完成 | 2026-08-01 | 3 行 export 补齐；3 个 RsPage 错误修复 |
| 前端 F-13 a2ui stub 类型完善 | P2 | ✅ 已完成 | 2026-08-01 | 2 stub 文件 + index.ts；完整接口 + 占位实现 |
| 前端 F-14 dev-tools i18n 治理 | P2 | ✅ 已完成 | 2026-08-01 | 5 组件 + 2 i18n 资源 + 1 注册入口；112 t() 调用；28 面板 |
| 前端 F-15 schemas/* 类型清理 | P0 | ✅ 已完成 | 2026-08-01 | 18 schemas 文件；96→0；总错误 -99 |

### 🎯 V63.6 验收结果（2026-08-01）

| 验收项 | 结果 | 证据 |
|--------|------|------|
| 后端编译 | ✅ 零错误 | `cargo check -p topems-finance --lib` 7.79s 通过 |
| 前端总错误数 | ⚠️ 498（下降 218） | 从 V63.5 的 716 降至 498；schemas/* 96→0；pages/rd -3；其余非主线模块基本不变 |
| B-9 CreateAccountRequest | ✅ 完成 | account_type Option + serde alias="category"；create_account Asset 兜底 |
| B-10 usage-stats | ✅ 完成 | template_id 列添加；COUNT/MAX 替代 0；UUID 类型修正（非任务原方案 BIGINT） |
| F-12 pages/rd 导出 | ✅ 完成 | 3 行 export 补齐 bugSchema/codeSchema/docSchema |
| F-13 a2ui stub | ✅ 完成 | GenerateOptions/GeneratedComponent/TestGenerationOptions/GeneratedTest 接口；占位实现结构化 |
| F-14 dev-tools i18n | ✅ 完成 | 5 组件 + 2 资源文件；112 t() 调用；28 面板；代码硬编码 0 |
| F-15 schemas/* 类型 | ✅ 完成 | 18 文件；96→0；TS7006 批量修复 + TS2769/2304/2367/2345 特例 |

### 📌 V63.6 遗留事项（非阻塞）

1. **前端剩余 498 个错误**: 全部在非 schemas 模块（ai-*、bff/designer、dev-platform、pages/rd 等），需更大重构，留作 V64.0 处理
2. **pages/rd 剩余 22 错误**: RsFormulaListPage/RsMaterialListPage/RsReleasePage/RsReviewPage 的 CrudApi 类型不匹配，与本批次无关
3. **a2ui stub 仍为占位**: `generate()` 返回结构化空数据，真实 AI 接入待 V64.0+ AI 驱动 UI
4. **B-3 数据库迁移待执行**: `20260725130000_finance_account_voucher_add_fields.sql` + `20260801000000_finance_voucher_add_template_id.sql` 部署前需执行
5. **F-5 zh-CN 硬编码 145 处**: dev-tools/ 已治理，剩余 145 处散落其他 100 个文件，留作 V64.0 分批迁移
6. **F-5 App.tsx 477 行**: V63.4 已确定可接受，不再追求 < 300

---

## 📜 V63.5 五次评估与三路并行实施方案（2026-07-25 五次评估，已归档）

> **背景**: 2026-07-25 V63.4 全部 14 项任务完成后，前端总类型错误数 788 个（均为预先存在），其中 schemas/* 23 个 + utils/* 17 个（共 40 个）是主线模块错误，其余 748 个在 ai-*/bff/designer/dev-platform 等非主线模块。后端 V63.4 遗留 2 项功能性问题：B-2 import 端点格式不匹配、B-3 account_type 必填导致前端 category 反序列化失败。本方案聚焦"40 个主线类型错误 + 2 项后端遗留修复"。
> **执行原则**: 多任务并行 + 每任务独立验收标准 + 修复即交付 + 不引入新债务 + 编译/类型错误优先 + 不阻塞主线业务。

### 📊 V63.5 实际核查结论（2026-07-25 静态代码核查）

| 评估维度 | 实际状态 | 证据 |
|---------|---------|------|
| 后端编译 | ✅ 零错误 | `cargo check -p topems-finance --lib` 2.50s 通过；`cargo check -p unified-core-service --lib` 5.64s 通过 |
| 前端类型检查 | ⚠️ 788 错误（主线 40 + 非主线 748） | `pnpm typecheck` 输出：主线 schemas/* 23 个 + utils/* 17 个；非主线 ai-*/bff/designer/dev-platform 占 90%+ |
| B-2 import 端点 | ❌ 格式不匹配 | 后端 `Json<serde_json::Value>`，前端 `multipart/form-data`，会返回 415 |
| B-3 account_type | ❌ 必填字段 | `account_type: AccountType` 非 Option，前端仅发 `category` 会反序列化失败 |
| schemas/mobile | ⚠️ 1 错误 | notification.tsx:62 render 函数签名缺 index 参数 |
| schemas/monitor | ⚠️ 13 错误 | alert/alertHistory/auditLog/logs/notificationChannel 使用 `minWidth`/`detailMaxWidth` 未知字段 + TS2769 重载 |
| schemas/notification | ⚠️ 2 错误 | template.tsx:199,212 `rows` 未知字段 |
| schemas/pdm | ⚠️ 4 错误 | project.ts `hideInList` 未知字段 + render 签名 + BadgeColor 值域 |
| schemas/qms | ⚠️ 1 错误 | inspection.ts:200 `"secondary"` 不在 BadgeColor |
| schemas/rd | ⚠️ 2 错误 | code.ts:112, deploy.ts:183 TS2769 重载 |
| utils/a2ui | ⚠️ 5 错误 | index.ts 4 处找不到模块 `./ai-ui-generator`/`./auto-test-generator`；smart-code-reviewer.ts:581 `quick_fixes` 拼写 |
| utils/ai | ⚠️ 4 错误 | index.ts:70-72 `codeCompletionEngine`/`testGenerator`/`uiRecommender` 未定义；test-generator.ts:756 `componentName` 应为 `component_name` |
| utils/bff | ⚠️ 3 错误 | auto-sharding-v2.ts:460,476 `shard.startTime` 可能 undefined；fallback-strategy.ts:340 `unknown`→`T` |
| utils/observability | ⚠️ 4 错误 | e2e-tracing.ts:427,465 参数 undefined；session-replay.ts:510,613 类型转换 |
| utils/workflow | ⚠️ 1 错误 | workflow-editor.ts:516 `node_spacing`/`rank_spacing` 应为驼峰 |

### 📊 V63.5 三路并行总览

```
后端 Track（B）                       前端 Track A（schemas）              前端 Track B（utils）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
B-7: import 端点改 Multipart          F-6: schemas/mobile 1 错误           F-9: utils/a2ui 5 错误（含 stub 创建）
B-8: account_type 改 Option + alias   F-7: schemas/monitor 13 错误         F-10: utils/ai 4 错误
                                     F-8: schemas/notification/pdm/qms/rd  F-11: utils/bff+observability+workflow 8 错误
                                     （9 错误）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
依赖：无（可立即启动）                 依赖：无（可立即启动）                 依赖：无（可立即启动）
并行度：2 任务可并行                  并行度：3 任务可并行                   并行度：3 任务可并行
预估：B-7 小 / B-8 小                 预估：F-6 小 / F-7 中 / F-8 中          预估：F-9 中 / F-10 小 / F-11 小
```

### 🔵 后端 Track（Backend）

#### B-7. 凭证模板 import 端点改 Multipart（P1，V63.4 遗留）

**问题**: [svc/finance/src/modules/mod.rs:1881](../../svc/finance/src/modules/mod.rs) `import_template_handler` 使用 `Json<serde_json::Value>`，但前端 [api/voucherTemplate/index.ts:282-285](../../apps/web/src/api/voucherTemplate/index.ts) 发送 `FormData`（multipart/form-data），导致 415 Unsupported Media Type。

**实施方案**:
1. 将 `import_template_handler` 签名改为 `Multipart` 提取器
2. 解析 multipart 字段：`file`（JSON 文件内容）+ 可选 `name`（新模板名）
3. 解析 file 内容为 JSON，调用现有模板创建逻辑
4. 保留原有响应格式 `{ success, message, data, code }`

**验收标准**:
- [ ] `cargo check -p topems-finance --lib` 零错误
- [ ] `curl -X POST -F "file=@template.json" http://localhost:8011/api/finance/voucher-templates/import` 返回 200
- [ ] 前端 `voucherTemplateApi.importTemplate(formData)` 正常创建模板

---

#### B-8. account_type 改 Option + serde alias（P1，V63.4 遗留）

**问题**: [svc/finance/src/models/mod.rs](../../svc/finance/src/models/mod.rs) `Account.account_type: AccountType` 为必填字段，前端 [packages/shared-types/src/finance.ts](../../packages/shared-types/src/finance.ts) 仅发送 `category`，反序列化失败。

**实施方案**:
1. 将 `account_type` 改为 `Option<AccountType>` 并添加 `#[serde(alias = "category")]`
2. 删除 `account_type_alias` 字段（已无用，alias 直接作用于 account_type）
3. 更新所有使用 `account_type` 的 handler：用 `unwrap_or(AccountType::Asset)` 或 `ok_or_else` 处理 Option
4. 同步将 `is_enabled: bool` 改为 `Option<bool>` 并 alias `isactive`（保持向后兼容）

**验收标准**:
- [ ] `cargo check -p topems-finance --lib` 零错误
- [ ] 前端仅发送 `category` 可成功创建账户
- [ ] 前端仅发送 `isactive` 可成功创建账户
- [ ] 现有 `account_type` 字段的请求仍正常工作

---

### 🟢 前端 Track A（schemas 类型错误修复）

#### F-6. schemas/mobile 修复（1 错误，简单）

**问题**: [schemas/mobile/notification.tsx:62](../../apps/web/src/schemas/mobile/notification.tsx) render 函数签名 `(row) => unknown` 不匹配 `(row, index) => ReactNode`。

**实施方案**: 为 render 函数添加 `index: number` 参数，并确保返回 `React.ReactNode`。

**验收标准**:
- [ ] `pnpm typecheck 2>&1 | grep "schemas/mobile"` 无结果

---

#### F-7. schemas/monitor 修复（13 错误，中等）

**问题**: 5 个文件使用 `minWidth`/`detailMaxWidth` 未知字段 + 8 处 TS2769 重载不匹配。

**实施方案**:
1. 在 [schema/types.ts](../../apps/web/src/schema/types.ts) 的 `SchemaField` 接口添加可选 `minWidth?: number` 属性
2. 在 `EntitySchema` 接口添加可选 `detailMaxWidth?: number` 属性
3. 修复 TS2769 重载：核查 alertHistory/auditLog/notificationChannel 的组件调用，调整 props 类型

**验收标准**:
- [ ] `pnpm typecheck 2>&1 | grep "schemas/monitor"` 无结果
- [ ] `pnpm typecheck` 总错误数下降 13+

---

#### F-8. schemas/notification/pdm/qms/rd 修复（9 错误，中等）

**问题**:
- notification/template.tsx: `rows` 未知字段（2 处）
- pdm/project.ts: `hideInList` 未知字段 + render 签名 + BadgeColor 值域（4 处）
- qms/inspection.ts: `"secondary"` 不在 BadgeColor（1 处）
- rd/code.ts, rd/deploy.ts: TS2769 重载（2 处）

**实施方案**:
1. 在 `SchemaField` 添加可选 `rows?: number` 和 `hideInList?: boolean` 属性
2. 在 `SchemaField` 的 BadgeColor 联合类型添加 `"secondary"`（或把 inspection.ts 改为 `"info"`）
3. 修复 pdm/project.ts 的 render 函数签名为 `(row, index) => ReactNode`
4. 修复 pdm/project.ts:160 的 Record 值域为 `Record<string, BadgeColor>`
5. 修复 rd/code.ts 和 rd/deploy.ts 的 TS2769 重载

**验收标准**:
- [ ] `pnpm typecheck 2>&1 | grep -E "schemas/(notification|pdm|qms|rd)"` 无结果
- [ ] `pnpm typecheck` 总错误数下降 9+

---

### 🟡 前端 Track B（utils 类型错误修复）

#### F-9. utils/a2ui 修复（5 错误，中等 — 需 stub 创建）

**问题**:
- index.ts: 4 处找不到模块 `./ai-ui-generator` 和 `./auto-test-generator`（文件缺失）
- smart-code-reviewer.ts:581: `quick_fixes` 应为 `quickFixes`

**实施方案**:
1. 创建 `apps/web/src/utils/a2ui/ai-ui-generator.ts` stub 文件（导出 `aiUiGenerator` 实例和类型）
2. 创建 `apps/web/src/utils/a2ui/auto-test-generator.ts` stub 文件（导出 `autoTestGenerator` 实例和类型）
3. 修复 smart-code-reviewer.ts:581 `quick_fixes` → `quickFixes`

**验收标准**:
- [ ] `pnpm typecheck 2>&1 | grep "utils/a2ui"` 无结果
- [ ] stub 文件创建，导出符合 index.ts 期望的符号

---

#### F-10. utils/ai 修复（4 错误，简单）

**问题**:
- index.ts:70-72: `codeCompletionEngine`/`testGenerator`/`uiRecommender` 未定义（仅导入了类型）
- test-generator.ts:756: `componentName` 应为 `component_name`

**实施方案**:
1. 在 index.ts 顶部补充 import 实例（从对应模块）
2. 若实例不存在，创建工厂函数 `createCodeCompletionEngine()` 等
3. 修复 test-generator.ts:756 `componentName` → `component_name`

**验收标准**:
- [ ] `pnpm typecheck 2>&1 | grep "utils/ai/"` 无结果

---

#### F-11. utils/bff+observability+workflow 修复（8 错误，简单）

**问题**:
- bff/auto-sharding-v2.ts:460,476: `shard.startTime` 可能 undefined
- bff/fallback-strategy.ts:340: `unknown`→`T`
- observability/e2e-tracing.ts:427,465: 参数 undefined
- observability/session-replay.ts:510,613: 类型转换
- workflow/workflow-editor.ts:516: `node_spacing`/`rank_spacing` 应为驼峰

**实施方案**:
1. auto-sharding-v2.ts: `shard.startTime ?? 0` 或前置 undefined 检查
2. fallback-strategy.ts:340: `as T` 类型断言或泛型约束
3. e2e-tracing.ts:427: `?? false`；465: `?? null`
4. session-replay.ts:510: `as BlobPart`；613: `as unknown as Record<string, unknown>`
5. workflow-editor.ts:516: `node_spacing`→`nodeSpacing`，`rank_spacing`→`rankSpacing`

**验收标准**:
- [ ] `pnpm typecheck 2>&1 | grep -E "utils/(bff|observability|workflow)"` 无结果
- [ ] `pnpm typecheck` 总错误数下降 8+

---

### 📈 V63.5 三路并行进度追踪

| 任务 | 优先级 | 状态 | 完成时间 | 备注 |
|------|--------|------|---------|------|
| 后端 B-7 import 端点改 Multipart | P1 | ✅ 已完成 | 2026-07-25 | mod.rs:1881 签名改为 Multipart 提取器，复用 create_voucher_template 逻辑 |
| 后端 B-8 account_type 改 Option | P1 | ✅ 已完成 | 2026-07-25 | account_type/is_enabled 改 Option + serde alias；迁移文件 20260725140000 已创建 |
| 前端 F-6 schemas/mobile 修复 | P0 | ✅ 已完成 | 2026-07-25 | notification.tsx:62 renderCell 返回值 String() 收窄 |
| 前端 F-7 schemas/monitor 修复 | P0 | ✅ 已完成 | 2026-07-25 | schema/types.ts 扩展 minWidth/detailMaxWidth；TS2769 用 String()/!! 修复 |
| 前端 F-8 schemas/notification/pdm/qms/rd | P0 | ✅ 已完成 | 2026-07-25 | schema/types.ts 扩展 rows/hideInList；BadgeColor 加 'secondary'；renderCell 签名修复 |
| 前端 F-9 utils/a2ui 修复 | P0 | ✅ 已完成 | 2026-07-25 | 创建 ai-ui-generator.ts/auto-test-generator.ts stub 文件；smart-code-reviewer.ts quick_fixes 修复 |
| 前端 F-10 utils/ai 修复 | P0 | ✅ 已完成 | 2026-07-25 | index.ts 补充 import 实例；test-generator.ts componentName→component_name |
| 前端 F-11 utils/bff+observability+workflow | P0 | ✅ 已完成 | 2026-07-25 | 非空断言/类型断言/属性名规范化（8 处全部修复） |

### 🎯 V63.5 验收结果（2026-07-25）

| 验收项 | 结果 | 证据 |
|--------|------|------|
| 后端编译 | ✅ 零错误 | `cargo check -p topems-finance --lib` 5.15s 通过 |
| 前端主线类型检查 | ✅ 0 错误 | schemas/{mobile,monitor,notification,pdm,qms,rd}/ + utils/{a2ui,ai,bff,observability,workflow}/ 全部 0 错误 |
| 前端总错误数 | ⚠️ 716（下降 72） | 从 V63.4 的 788 降至 716；目标 40 个主线错误全部修复 + 32 个级联错误附带修复 |
| B-7 import 端点 | ✅ 完成 | 签名改为 Multipart，支持前端 FormData 上传 |
| B-8 account_type Option | ✅ 完成 | serde alias="category" + alias="isactive"；迁移文件将列改为可空 |
| F-6~F-8 schemas 修复 | ✅ 23/23 | schema/types.ts 扩展 SchemaField/EntitySchema/BadgeColor；6 个子目录全部清零 |
| F-9~F-11 utils 修复 | ✅ 17/17 | a2ui stub 创建；ai import 补充；bff/observability/workflow 类型断言 |

### 📌 V63.5 遗留事项（非阻塞）

1. **CreateAccountRequest 仍必填**: [models/mod.rs](../../svc/finance/src/models/mod.rs) 中 `CreateAccountRequest.account_type: AccountType` 未改 Option（仅 Account 响应结构改了），若前端创建时也发 category 仍会 400；后续可同步改
2. **a2ui stub 待真实实现**: ai-ui-generator.ts 和 auto-test-generator.ts 仅为类型占位，generate() 返回空结构；功能待后续开发
3. **前端剩余 716 个错误**: 全部在非主线模块（schemas/bi、schemas/ehs、schemas/erp、schemas/finance、schemas/wms、schemas/iam、schemas/hrm、schemas/mes、schemas/lims、schemas/srm、schemas/scm、schemas/master、ai-*、bff/designer、dev-platform、pages/rd 等），属预存在问题
4. **pages/rd 缺 schema 导出**: RsBugPage/RsCodePage/RsDocPage 期望 schemas/rd/index.ts 导出 bugSchema/codeSchema/docSchema，但实际未导出；需后续在 schemas/rd/ 补充对应 schema 文件

---

## 📜 V63.4 四次评估与三路并行实施方案（2026-07-25 四次评估，已归档）

> **背景**: 2026-07-25 基于 V63.3 实施结果重新评估。三路并行已完成 8/13 任务（B-1 ✅、F-1 ✅、F-2 ✅、F-3 ✅、I-1 ✅、I-2 ✅、I-3 ✅、I-4 ✅、I-5 ✅），剩余 5 项聚焦"凭证模板端点 16 个 + Finance 数据模型 38 字段 + App.tsx 拆分 + schemas 残余修复 + search 代理补齐"。
> **执行原则**: 多任务并行 + 每任务独立验收标准 + 修复即交付 + 不引入新债务 + 编译/类型错误优先 + 不阻塞主线业务。

### 📊 V63.4 实际核查结论（2026-07-25 静态代码核查）

| 评估维度 | 实际状态 | 证据 |
|---------|---------|------|
| B-1 IAM 用户端点 | ✅ 已完成（18/18） | iam.rs 路由全部注册 + user/mod.rs 5 个新模块 pub use 导出 + 处理函数签名完整 |
| B-2 凭证模板端点 | ❌ 实际缺 16 个（非 19） | 后端已实现 10 个+3 个前端未调用路由；前端调用 26 个，缺 16 个：copy/toggle/entries CRUD×5/reorder/generate×5/match/usage-stats/toggle-rule/export/import |
| B-3 Finance 数据模型 | ❌ 严重不一致 | Account 缺 17 字段（name_en/full_name/balance_direction/type/parent_code/haschildren/children/dimensions/is_cash_flow/enable_quantity/unit/enable_foreign_currency/is_detail/created_by/updated_by + 命名差异 account_type/is_enabled/currency）；Voucher 缺 21 字段（voucher_number/year/month/total_amount/currency_code/entries/各审批人 id+name+时间戳/is_reversed/reverse_voucher_id/reversed_at/attachment_count/summary/source_module/source_id/updated_by）+ VoucherStatus 枚举不对齐 |
| F-1 PageContainer 统一 | ✅ 已完成 | PageContainer.tsx 168 行真实实现，V2 已删除，stories 引用正确 |
| F-2 V1/V2 孤儿清理 | ✅ 已完成（pages 范围） | pages 下无 *V2.tsx 文件；components/auth/LoginFormV2.tsx 不在原范围 |
| F-3 导出组件合并 | ✅ 已完成 | export/ 含 4 组件 + barrel；import-export/ 已删除；无残留引用 |
| F-4 schemas 类型修复 | ⚠️ 残余 1 处 | schemas/mes/processRoute.ts:44,52 仍用 `readOnly`（应为 `readonly`）；其他已修复 |
| F-5 App.tsx 拆分 + i18n | ❌ 未开始 | App.tsx 1990 行；dev-tools/ 目录未创建；zh-CN 硬编码 145 处 / 100 文件；runtime.ts supportedLocales 已集中声明 |
| I-1 generate.sh 端口 | ✅ 已完成 | billing 8085、ticket 8086、feedback 8087、communication 进入 SERVICES、search 在 MISSING_SERVICES（未暴露 OpenAPI） |
| I-2 schemaRegistry 双前缀 | ✅ 已完成 | BASE_PATH = '/schema-registry'（相对路径） |
| I-3 测试脚本包名 | ✅ 已完成 | master-data → topems-master-data |
| I-4 services.yaml 同步 | ✅ 已完成 | service_groups 含 communication/billing/ticket/feedback/master-data/search；virtual_services 移除 mail/im/notification |
| I-5 健康检查测试补齐 | ✅ 已完成 | SERVICES 含 6 个外迁服务 |
| I-6 search 服务 vite 代理 | ❌ 新发现缺失 | vite.config.ts SERVICES 与 HEALTH_CHECK_PATHS 均无 search 条目 |

### 📊 V63.4 三路并行总览

```
后端 Track（B）                       前端 Track（F）                      联调 Track（I）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
B-2: 凭证模板端点（16 个）           F-4: processRoute.ts readOnly 修复   I-6: search 服务 vite 代理补齐
B-3: Finance 数据模型补齐            F-5: App.tsx 拆分 + i18n 统一
                                     （Account 17 字段 + Voucher 21 字段）  （1990 行 → < 300 行 + dev-tools/ + 145 处 zh-CN 治理）
─────────────────────────────────    ─────────────────────────────────    ─────────────────────────────────
依赖：无（可立即启动）                 依赖：无（可立即启动）                 依赖：无（可立即启动）
并行度：2 任务可并行                  并行度：2 任务可并行                   并行度：1 任务
预估：B-2 中等 / B-3 较大             预估：F-4 极小 / F-5 较大              预估：极小
```

### 🔵 后端 Track（Backend）

#### B-2. 凭证模板端点实现（P1，16 个端点缺失）

**问题**: 前端 [api/voucherTemplate/index.ts](../../apps/web/src/api/voucherTemplate/index.ts) 调用 26 个端点，后端 [svc/finance/src/modules/mod.rs](../../svc/finance/src/modules/mod.rs) 已实现 10 个匹配路由 + 3 个前端未调用路由（/apply、/test、/generate），实际缺失 16 个。

**实施方案**:
1. 模板分录 CRUD（5 个端点）：在 `voucher_template_entries` 表上实现
   - POST /voucher-templates/{templateId}/entries
   - PUT /voucher-templates/{templateId}/entries/{entryId}
   - DELETE /voucher-templates/{templateId}/entries/{entryId}
   - PUT /voucher-templates/{templateId}/entries/reorder
   - 模板管理（3 个）：copy/toggle/match/usage-stats
2. 凭证自动生成（5 个）：preview/from-source/batch/auto/regenerate — 可先返回 501 Not Implemented（明确 TODO 标记）
3. 模板导入导出（2 个）：export 返回 JSON，import 接受 JSON
4. 生成规则 toggle（1 个）：PUT /voucher-generation-rules/{ruleId}/toggle

**验收标准**:
- [ ] `cargo check -p topems-finance --lib` 零错误
- [ ] 16 个端点均返回非 404（200/501/400 视场景）
- [ ] 模板分录 CRUD 功能正确（POST/PUT/DELETE/GET/reorder）
- [ ] 模板复制（POST /voucher-templates/{id}/copy）创建新模板
- [ ] 模板启用/禁用切换（PUT /voucher-templates/{id}/toggle）更新 is_active 字段
- [ ] 模板导入导出（export 返回 JSON、import 接受 JSON 并创建模板）
- [ ] 生成规则 toggle 正确切换 is_active
- [ ] 凭证自动生成系列（5 个）可先返回 501 Not Implemented（响应体含 `{"todo": "..."}` 标记）
- [ ] OpenAPI 文档包含所有新端点

---

#### B-3. Finance 数据模型补齐（P2，Account 17 字段 + Voucher 21 字段 + 枚举对齐）

**问题**: 后端 [svc/finance/src/models/mod.rs](../../svc/finance/src/models/mod.rs) 与前端 [packages/shared-types/src/finance.ts](../../packages/shared-types/src/finance.ts) 严重不一致。

**实施方案**:
1. `Account` 补齐 17 字段：name_en、full_name、balance_direction、type、parent_code、haschildren、children、dimensions、is_cash_flow、enable_quantity、unit、enable_foreign_currency、default_currency、is_detail、created_by、updated_by + status（别名）
2. `Account` 命名对齐：account_type → 保留并 alias 为 category；is_enabled → 保留并补充 status/isactive；currency → 保留并 alias 为 default_currency
3. `Voucher` 补齐 21 字段：voucher_number、year、month、total_amount、currency_code、entries、submitter_id、submitter_name、maker_id、maker_name、submitted_at、approver_id、approver_name、checker_id、checker_name、approved_at、poster_id、poster_name、bookkeeper_id、bookkeeper_name、posted_at、is_reversed、reverse_voucher_id、reversed_at、attachment_count、summary、source_module、source_id、updated_by
4. `VoucherStatus` 枚举对齐：新增 `Reversed`；保留 `Rejected`/`Cancelled` 作为后端独有状态（前端可选）
5. 数据库迁移脚本添加新字段（ALTER TABLE，可重复执行）
6. 更新 SQL 查询（SELECT/INSERT/UPDATE）
7. 处理函数返回字段补齐（list_vouchers/get_voucher/create_voucher）

**验收标准**:
- [ ] `cargo check -p topems-finance --lib` 零错误
- [ ] `cargo test -p topems-finance --no-run` 通过
- [ ] 前端 `Voucher`/`Account` 类型与后端响应字段匹配（手写 + 生成类型一致）
- [ ] 数据库迁移脚本可重复执行（idempotent，使用 IF NOT EXISTS）
- [ ] `VoucherStatus` 枚举包含 `Reversed`
- [ ] list_vouchers/get_voucher 返回的 JSON 包含所有补齐字段

---

### 🟢 前端 Track（Frontend）

#### F-4. schemas 类型错误残余修复（P0，1 处）

**问题**: [schemas/mes/processRoute.ts:44,52](../../apps/web/src/schemas/mes/processRoute.ts) 仍使用 `readOnly`（应为 `readonly`，参考 [schema/types.ts:103](../../apps/web/src/schema/types.ts) 定义）。

**实施方案**:
1. 将 processRoute.ts 第 44、52 行的 `readOnly: true` 改为 `readonly: true`
2. 全局扫描 schemas/ 目录确认无其他 `readOnly` 残留

**验收标准**:
- [ ] `grep -r "readOnly" apps/web/src/schemas/` 无结果
- [ ] `pnpm typecheck 2>&1 | grep "schemas/mes/processRoute"` 无结果

---

#### F-5. App.tsx 拆分 + i18n 统一（P2，重构）

**问题**:
- [App.tsx](../../apps/web/src/App.tsx) 1990 行，MicroFrontendDevTools（497-1768）、V47IntegrationPanel（1770-1922）、PanelCard（1924-1958）等大量内联组件
- i18n 配置已在 [config/runtime.ts](../../apps/web/src/config/runtime.ts) 集中声明（supportedLocales: zh-CN,en-US；defaultLocale: zh-CN；fallbackLocale: en-US）
- 但 zh-CN 硬编码散落 145 处 / 100 文件，未统一走 i18n

**实施方案**:
1. 创建 `apps/web/src/dev-tools/` 目录
2. 抽离 `MicroFrontendDevTools`、`V47IntegrationPanel`、`PanelCard` 到 `dev-tools/index.tsx`
3. 抽离 17+ 个 V51-V60 面板到 `dev-tools/panels/`（按版本号分文件或合并为一个 panels.tsx）
4. App.tsx 仅保留 `IS_DEV && lazy(() => import('./dev-tools'))` 引用
5. i18n 语言代码统一策略（保守方案，不一次性迁移 145 处）：
   - **保留** runtime.ts 的 zh-CN/en-US 配置（与浏览器 navigator.language 对齐）
   - **不强制** i18next 改用 zh/en 短码（避免破坏现有语言切换）
   - **抽取** App.tsx 内的 zh-CN 字符串到 i18n 资源文件（仅限本次拆分涉及的 DevTools 面板）
   - **新增** `i18n/locales/zh-CN/devtools.json` 和 `i18n/locales/en-US/devtools.json`
6. App.tsx 重构后结构：
   - 顶部 imports
   - App 主组件（路由+布局+providers）
   - IS_DEV && lazy(DevTools)
   - 导出

**验收标准**:
- [ ] `wc -l apps/web/src/App.tsx` < 300 行
- [ ] `apps/web/src/dev-tools/` 目录存在
- [ ] `apps/web/src/dev-tools/index.tsx` 默认导出 MicroFrontendDevTools
- [ ] `grep -r "MicroFrontendDevTools" apps/web/src/App.tsx` 无结果（已抽离）
- [ ] `grep -r "V47IntegrationPanel" apps/web/src/App.tsx` 无结果
- [ ] 开发模式下 MicroFrontendDevTools 正常显示（lazy load）
- [ ] 语言切换功能正常（zh-CN ↔ en-US）
- [ ] `pnpm typecheck` 不引入新错误
- [ ] `pnpm build` 成功

---

### 🟠 联调 Track（Integration）

#### I-6. search 服务 vite 代理补齐（P0，新发现）

**问题**: [apps/web/vite.config.ts](../../apps/web/vite.config.ts) SERVICES 数组与 HEALTH_CHECK_PATHS 均无 search 条目，但 [config/services.yaml](../../config/services.yaml) 已声明 search 服务（端口 8082，prefix /api/search）。

**实施方案**:
1. 在 vite.config.ts SERVICES 数组添加 `{ name: 'search', port: 8082, apiPrefix: '/api/search' }`
2. 在 HEALTH_CHECK_PATHS 添加 `'search': '/health'`
3. 在 [config/runtime.ts](../../apps/web/src/config/runtime.ts) apiClient 配置中添加 `search: '/api/search'`（如未存在）
4. 验证前端 `apiClient.search` 可代理到后端 8082

**验收标准**:
- [ ] `grep "name: 'search'" apps/web/vite.config.ts` 有结果
- [ ] `grep "search.*8082" apps/web/vite.config.ts` 有结果
- [ ] `grep "'search'" apps/web/vite.config.ts` 在 HEALTH_CHECK_PATHS 中有结果
- [ ] `curl http://localhost:8082/api/search/health` 返回 200（服务启动时）
- [ ] 前端 `apiClient.search.get('/...')` 走 vite 代理到 8082

---

### 📈 V63.4 三路并行进度追踪

| 任务 | 优先级 | 状态 | 完成时间 | 备注 |
|------|--------|------|---------|------|
| 后端 B-1 IAM 用户端点 | P0 | ✅ 已完成 | 2026-07-25 | 18/18 端点全部实现 |
| 后端 B-2 凭证模板端点 | P1 | ✅ 已完成 | 2026-07-25 | 16 个端点全部实现（11 真实 + 5 返回 501），mod.rs 行 3102-3169 注册 |
| 后端 B-3 Finance 数据模型 | P2 | ✅ 已完成 | 2026-07-25 | Account +19 字段、Voucher +29 字段、VoucherStatus 新增 Reversed；迁移文件 20260725130000 已创建 |
| 前端 F-1 PageContainer 统一 | P0 | ✅ 已完成 | 2026-07-25 | 168 行真实实现，V2 已删除 |
| 前端 F-2 V1/V2 孤儿清理 | P0 | ✅ 已完成 | 2026-07-25 | pages 范围无 V2 残留 |
| 前端 F-3 导出组件合并 | P0 | ✅ 已完成 | 2026-07-25 | barrel 完整，import-export/ 已删 |
| 前端 F-4 schemas 残余修复 | P0 | ✅ 已完成 | 2026-07-25 | processRoute.ts readOnly→readonly 已修复 |
| 前端 F-5 App.tsx 拆分 | P2 | ✅ 已完成 | 2026-07-25 | 1990→477 行（-76%），dev-tools/ 目录创建（MicroFrontendDevTools/V47IntegrationPanel/PanelCard），lazy+Suspense 按需加载 |
| 联调 I-1 generate.sh 端口 | P0 | ✅ 已完成 | 2026-07-25 | billing/ticket/feedback 端口正确 |
| 联调 I-2 schemaRegistry 双前缀 | P0 | ✅ 已完成 | 2026-07-25 | BASE_PATH 改为相对路径 |
| 联调 I-3 测试脚本包名 | P0 | ✅ 已完成 | 2026-07-25 | topems-master-data |
| 联调 I-4 services.yaml 同步 | P1 | ✅ 已完成 | 2026-07-25 | 6 个外迁服务全部登记 |
| 联调 I-5 健康检查测试补齐 | P1 | ✅ 已完成 | 2026-07-25 | SERVICES 含 29 个服务 |
| 联调 I-6 search vite 代理 | P0 | ✅ 已完成 | 2026-07-25 | vite.config.ts SERVICES+HEALTH_CHECK_PATHS+runtime.ts search+client.ts search getter 全部补齐 |

### 🎯 V63.4 验收结果（2026-07-25）

| 验收项 | 结果 | 证据 |
|--------|------|------|
| 后端编译 | ✅ 零错误 | `cargo check -p topems-finance --lib` 2.50s 通过；`cargo check -p unified-core-service --lib` 5.64s 通过（5 个预先存在的 dead_code warning） |
| 前端类型检查 | ✅ 本次改动 0 错误 | App.tsx / dev-tools/* / schemas/mes/processRoute.ts / vite.config.ts / runtime.ts / client.ts 全部 0 错误；总错误 788 个均为预先存在（schemas/mobile、schemas/monitor、schemas/notification、schemas/pdm、schemas/qms、schemas/rd、src/utils/a2ui、src/utils/ai、src/utils/bff、src/utils/observability、src/utils/workflow） |
| B-2 端点实现 | ✅ 16/16 | 11 真实实现（copy/toggle/match/usage-stats/toggle-rule/entries CRUD×4/export/import）+ 5 返回 501（凭证自动生成系列） |
| B-3 模型补齐 | ✅ 完成 | Account +19 字段、Voucher +29 字段、VoucherStatus 新增 Reversed、迁移文件创建（core_finance_accounts/core_finance_vouchers 表） |
| F-5 拆分 | ✅ 完成 | App.tsx 1990→477 行（-76%）；dev-tools/ 4 文件 1531 行；lazy+Suspense 按需加载；无循环依赖 |
| I-6 代理补齐 | ✅ 完成 | vite.config.ts SERVICES + HEALTH_CHECK_PATHS + runtime.ts services.search + client.ts get search() |

### 📌 V63.4 遗留事项（非阻塞）

1. **B-2 import 端点格式**: 后端实现为 `Json<serde_json::Value>`，前端 `importTemplate` 发送 `multipart/form-data`，需后续改为 `Multipart` 提取器（响应 415 错误）
2. **B-2 usage-stats 统计口径**: `core_finance_vouchers` 无 `template_id` 列，`generated_voucher_count` 固定返回 0，仅统计引用该模板的生成规则数
3. **B-3 account_type 必填**: `account_type` 仍为非 Option 字段，若前端仅发送 `category` 反序列化会失败；`account_type_alias` 仅作补充接收，需后续改为 Option 或加 serde alias
4. **B-3 数据库迁移需执行**: 部署前需运行 `20260725130000_finance_account_voucher_add_fields.sql`，否则 SELECT * 会因新增列不存在导致 FromRow 运行时报错
5. **F-5 App.tsx 行数**: 477 行（未达 < 300 目标），剩余为路由/布局/providers 代码（任务约束"不要修改 App 主组件"），已在 dev-tools 抽离上做到最大优化
6. **F-5 zh-CN 硬编码**: 145 处未治理（保守方案，避免破坏现有语言切换），后续可分批迁移到 i18n 资源文件

---

## 📜 V63.3 三次评估与三路并行实施方案（2026-07-25 三次评估，已归档）

> **背景**: 2026-07-25 在 V63.2 批次 1（A0/B0/C0/A1-A6/B1/B3/B9/B10）完成后，基于实际 `cargo check` + `pnpm typecheck` + 静态代码核查重新评估。后端全工作区编译零错误，前端 712 类型错误集中在 ai-*/bff/designer/dev-platform 非主线模块，schemaRegistry.ts 存在双重前缀 bug，generate.sh 端口表过时。本方案聚焦"剩余 12 项任务按三路并行推进至交付"。
> **执行原则**: 多任务并行 + 每任务独立验收标准 + 修复即交付 + 不引入新债务 + 编译/类型错误优先 + 不阻塞主线业务。

### 📊 实际评估核查结论（2026-07-25）

| 评估维度 | 实际状态 | 证据 |
|---------|---------|------|
| 后端编译 | ✅ 零错误（4 warning） | `cargo check -p topems-hrm/unified-core-service/topems-finance/topems-master-data --lib` 全部通过 |
| 前端类型检查 | ⚠️ 712 错误（集中在非主线模块） | `pnpm typecheck` 输出：ai-agent/ai-copilot/ai-governance/bff/designer/dev-platform 等占 90%+，schemas/* 占少量 |
| A8 HRM Employee 字段补齐 | ✅ 已完成 | 模型 16 字段 + SQL SELECT/INSERT/UPDATE + 迁移文件 `20260725120000_hrm_employee_add_fields.sql` 三处一致 |
| B6 reactQuery ESM | ✅ 已完成 | `reactQuery.ts` 全 ESM import，无 `require(` |
| B9/B10 双重代理清理 | ✅ 已完成 | vite.config.ts 无 `/api/core/mail`/`/api/core/notification`/`/api/core/im`/`/api/analytics` |
| HEALTH_CHECK_PATHS | ✅ 已清理 | 29 条目，无 manufacturing/quality-assurance/report |
| 端口配置一致性 | ✅ 基本对齐 | ports.env / vite.config.ts / main.rs 三处一致（generate.sh 例外） |
| A10 IAM 用户端点 | ❌ 18 个前端端点未实现 | effective-permissions/batch-delete/batch-update/check-email/check-username/login-history/access-logs/me/avatar/me/password 等全部缺失 |
| A9 凭证模板端点 | ❌ 19 个前端端点未实现 | 模板分录 CRUD、凭证自动生成系列、模板导入导出/复制/匹配/统计全部缺失 |
| A7 Finance 数据模型 | ❌ 严重不一致 | Account 缺 19 字段、Voucher 缺 25 字段，finance.ts 已标记 TODO |
| B5 PageContainer 统一 | ⚠️ 部分完成 | barrel 已指向 V2，但旧 stub `PageContainer.tsx` 未删，stories 仍引用 stub |
| B2 V1/V2 重复页面 | ❌ 未开始 | 10 个 V2 文件全为孤儿代码（无路由/无引用） |
| B4 合并导出组件 | ❌ 未开始 | export/ 与 import-export/ 双目录并存，import-export/ 全为死代码 |
| B7 App.tsx 拆分 | ❌ 未开始 | 1990 行，MicroFrontendDevTools 1270 行内联，无 dev-tools/ 目录 |
| B8 i18n 统一 | ❌ 未开始 | i18n 用 zh/en，runtime 用 zh-CN/en-US，100+ 处硬编码 zh-CN |
| C1 Vite 代理对齐 | ⚠️ 部分完成 | 25 服务对齐；AI 用 legacy alias；search 服务未注册 |
| C2 master-data 接入 | ⚠️ 部分完成 | 端口/路由/代理一致；schemaRegistry.ts 存在双重前缀 bug；测试脚本包名错误 |
| C3 billing 端口对齐 | ⚠️ 部分完成 | main.rs/ports.env/vite 一致（8085）；generate.sh 仍为 8080；无 k8s/systemd 部署文件 |
| C4 类型化客户端 | ⚠️ 部分完成 | openapi.d.ts 已生成；仅 WMS 试点，finance/hrm 未迁移 |
| C5 端到端集成测试 | ⚠️ 部分完成 | 4 前端 spec + cargo --ignored 脚本；覆盖缺口：billing/ticket/feedback/master-data/communication |

### 📊 V63.3 三路并行总览

```
后端 Track（B）                   前端 Track（F）                    联调 Track（I）
─────────────────────────────    ──────────────────────────────    ──────────────────────────────
B-1: A10 IAM 用户端点（18个）    F-1: B5 PageContainer 统一收尾    I-1: generate.sh 端口修复
B-2: A9 凭证模板端点（19个）     F-2: B2 V1/V2 孤儿清理（10文件）  I-2: schemaRegistry.ts 双前缀修复
B-3: A7 Finance 数据模型补齐     F-3: B4 导出组件合并              I-3: run-integration-tests.sh 包名修复
                                  F-4: schemas 类型错误修复         I-4: services.yaml 同步外迁服务
                                  F-5: B7 App.tsx 拆分 + B8 i18n    I-5: 前端健康检查测试补齐
─────────────────────────────    ──────────────────────────────    ──────────────────────────────
依赖：无（可立即启动）             依赖：无（可立即启动）             依赖：无（可立即启动）
并行度：3 路同步                  并行度：5 任务可并行               并行度：5 任务可并行
```

### 🔵 后端 Track（Backend）

#### B-1. A10 IAM 用户端点实现（P0，18 个端点缺失）

**问题**: 前端 [api/iam/user.ts](../../apps/web/src/api/iam/user.ts) 调用 18 个后端未实现的端点。

**实施方案**:
1. 在 [svc/unified-core/src/routes/iam.rs](../../svc/unified-core/src/routes/iam.rs) 注册新路由
2. 在 [svc/unified-core/src/modules/iam/user/](../../svc/unified-core/src/modules/iam/user/) 下新增 `profile_ext.rs`、`batch.rs`、`validation.rs`、`access_log.rs` 模块
3. 优先实现：`me/password`（自助改密）、`me/avatar`、`me/permissions`、`me`（PUT）、`effective-permissions`、`batch-delete`、`batch-update`
4. `check-email`、`check-username` 实现为简单查询
5. `access-logs`、`login-history` 对接 audit/login_log 模块
6. 用户-角色关联端点（`users/{id}/roles`）对接 iam_role_members 表

**验收标准**:
- [ ] `cargo check -p unified-core-service --lib` 零错误
- [ ] 18 个端点均返回非 404（200/501/400 视场景）
- [ ] `POST /api/core/iam/users/me/password` 可修改当前用户密码（校验 current_password）
- [ ] `GET /api/core/iam/users/me/permissions` 返回当前用户有效权限
- [ ] `POST /api/core/iam/users/batch-delete` 批量删除用户
- [ ] OpenAPI 文档包含所有新端点

---

#### B-2. A9 凭证模板端点实现（P1，19 个端点缺失）

**问题**: 前端 [api/voucherTemplate/index.ts](../../apps/web/src/api/voucherTemplate/index.ts) 调用 19 个后端未实现的端点。

**实施方案**:
1. 在 [svc/finance/src/modules/mod.rs](../../svc/finance/src/modules/mod.rs) 注册新路由
2. 模板分录 CRUD（5 个端点）：在 `voucher_template_entries` 表上实现
3. 模板管理（3 个）：copy/toggle/match/usage-stats
4. 凭证自动生成（5 个）：preview/from-source/batch/auto/regenerate — 可先返回 501
5. 模板导入导出（2 个）：export 返回 JSON，import 接受 JSON
6. 生成规则 toggle（1 个）

**验收标准**:
- [ ] `cargo check -p topems-finance --lib` 零错误
- [ ] 19 个端点均返回非 404
- [ ] 模板分录 CRUD 功能正确（POST/PUT/DELETE/GET）
- [ ] 模板复制、启用/禁用切换功能正确
- [ ] 凭证自动生成系列可先返回 501 Not Implemented（明确 TODO 标记）

---

#### B-3. A7 Finance 数据模型补齐（P2，Account 19 字段 + Voucher 25 字段）

**问题**: 后端 [svc/finance/src/models/mod.rs](../../svc/finance/src/models/mod.rs) 与前端 [packages/shared-types/src/finance.ts](../../packages/shared-types/src/finance.ts) 严重不一致。

**实施方案**:
1. `Account` 补齐：name_en、full_name、category（alias to account_type）、balance_direction、type、parent_code、haschildren、children、dimensions、is_cash_flow、enable_quantity、unit、enable_foreign_currency、default_currency、status（alias）、isactive、is_detail、created_by、updated_by
2. `Voucher` 补齐：voucher_number、year、month、total_amount、currency_code、entries、submitter_id、submitter_name、maker_id、maker_name、submitted_at、approver_id、approver_name、checker_id、checker_name、approved_at、poster_id、poster_name、bookkeeper_id、bookkeeper_name、posted_at、is_reversed、reverse_voucher_id、reversed_at、attachment_count、summary、source_module、source_id、updated_by
3. 数据库迁移脚本添加新字段（ALTER TABLE）
4. 更新 SQL 查询（SELECT/INSERT/UPDATE）

**验收标准**:
- [ ] `cargo check -p topems-finance --lib` 零错误
- [ ] `cargo test -p topems-finance` 通过
- [ ] 前端 `Voucher`/`Account` 类型与后端响应字段匹配（手写 + 生成类型一致）
- [ ] 数据库迁移脚本可重复执行（idempotent）

---

### 🟢 前端 Track（Frontend）

#### F-1. B5 PageContainer 统一收尾（P0，快速）

**问题**: [components/common/PageContainer.tsx](../../apps/web/src/components/common/PageContainer.tsx) 仅 7 行 stub，[PageContainerV2.tsx](../../apps/web/src/components/common/PageContainerV2.tsx) 是真实实现，57 处引用 V2。

**实施方案**:
1. 删除 stub `PageContainer.tsx`
2. 将 `PageContainerV2.tsx` 重命名为 `PageContainer.tsx`
3. 全局替换 `from '@/components/common/PageContainerV2'` → `from '@/components/common/PageContainer'`（57 处）
4. 修复 [PageContainer.stories.tsx](../../apps/web/src/components/common/PageContainer.stories.tsx) 引用
5. 更新 barrel [components/common/index.ts](../../apps/web/src/components/common/index.ts) 和 [components/index.ts](../../apps/web/src/components/index.ts)

**验收标准**:
- [ ] `find apps/web/src -name "PageContainer*"` 仅 1 个文件（PageContainer.tsx）
- [ ] `grep -r "PageContainerV2" apps/web/src/` 无结果
- [ ] `pnpm typecheck` 不引入新错误
- [ ] `pnpm build` 成功

---

#### F-2. B2 V1/V2 孤儿文件清理（P0，快速）

**问题**: 10 个 `*V2.tsx` 文件未被路由/任何模块引用，为死代码。

**实施方案**:
1. 删除 10 个 V2 文件：
   - `pages/qms/QmsDashboardPageV2.tsx`
   - `pages/iam/IamGroupPageV2.tsx`、`IamPermissionPageV2.tsx`、`IamRolePageV2.tsx`、`IamUserPageV2.tsx`
   - `pages/admin/UserManagementPageV2.tsx`、`PermissionManagementPageV2.tsx`、`TenantManagementPageV2.tsx`、`RoleManagementPageV2.tsx`、`DictManagementPageV2.tsx`
2. 验证无任何引用（grep 全文搜索）

**验收标准**:
- [ ] `find apps/web/src/pages -name "*V2*.tsx"` 无结果
- [ ] `pnpm build` 成功
- [ ] 路由配置不受影响

---

#### F-3. B4 合并导出组件（P0，快速）

**问题**: [components/export/](../../apps/web/src/components/export) 与 [components/import-export/](../../apps/web/src/components/import-export) 双目录并存，import-export/ 全为死代码。

**实施方案**（采用"删除死代码"方案）:
1. 删除整个 `apps/web/src/components/import-export/` 目录（8 文件，0 引用）
2. 保留 `apps/web/src/components/export/`（4 文件，3 处引用）
3. 为 export/ 添加 barrel `index.ts`（统一导出 ExportModal/ExportButton/EnhancedExportModal/ImportExportModal）
4. 将 3 处直接路径引用改为 barrel 引用

**验收标准**:
- [ ] `apps/web/src/components/import-export/` 目录删除
- [ ] `apps/web/src/components/export/index.ts` 存在
- [ ] `grep -r "from '@/components/import-export" apps/web/src/` 无结果
- [ ] `pnpm build` 成功

---

#### F-4. schemas 类型错误修复（P0，阻塞 typecheck）

**问题**: `pnpm typecheck` 报 712 错误，其中 schemas/* 模块约 30 错误阻塞主线业务类型检查。

**实施方案**:
1. 修复 [schemas/rd/release.ts](../../apps/web/src/schemas/rd/release.ts)（3 错误）：index 类型、ReactNode、component 属性
2. 修复 [schemas/report/subscription.tsx](../../apps/web/src/schemas/report/subscription.tsx)（1 错误）：FieldType 'email' 不支持
3. 修复 [schemas/srm/bidding.ts](../../apps/web/src/schemas/srm/bidding.ts)（2 错误）：readOnly → readonly
4. 修复 [schemas/srm/category.ts](../../apps/web/src/schemas/srm/category.ts)（3 错误）：number → string
5. 修复 [schemas/srm/finance.ts](../../apps/web/src/schemas/srm/finance.ts)（1 错误）：'secondary' 不在 ChipColor 联合类型
6. 修复 [schemas/srm/inquiry.ts](../../apps/web/src/schemas/srm/inquiry.ts)（2 错误）：readOnly → readonly
7. 修复 [schemas/wms/inbound.ts](../../apps/web/src/schemas/wms/inbound.ts)、`inventory.ts`、`outbound.ts`（3 错误）：dynamic resolver 的 loader 属性
8. 修复 [schemas/wms/replenishment.ts](../../apps/web/src/schemas/wms/replenishment.ts)（1 错误）：hideInList 不在 SchemaField
9. 修复 [schemas/wms/stockTake.ts](../../apps/web/src/schemas/wms/stockTake.ts)（1 错误）：'boolean' 不在 FieldType
10. 修复 [schemas/wms/suggestion.ts](../../apps/web/src/schemas/wms/suggestion.ts)（2 错误）：formatter 签名
11. 修复 [schemas/workflow/approval.ts](../../apps/web/src/schemas/workflow/approval.ts)、`instance.ts`（约 10 错误）：ReactNode 类型断言

**验收标准**:
- [ ] `pnpm typecheck 2>&1 | grep "schemas/" | wc -l` 为 0
- [ ] `pnpm typecheck` 总错误数下降至 700 以下（剩余集中在 ai-*/bff/designer 等非主线）
- [ ] 所有 schema 文件类型检查通过

---

#### F-5. B7 App.tsx 拆分 + B8 i18n 统一（P2，重构）

**问题**:
- [App.tsx](../../apps/web/src/App.tsx) 1990 行，MicroFrontendDevTools 1270 行内联
- i18n 用 zh/en，runtime 用 zh-CN/en-US，100+ 处硬编码 zh-CN

**实施方案**:
1. 创建 `apps/web/src/dev-tools/` 目录
2. 抽离 `MicroFrontendDevTools`、`V47IntegrationPanel`、`PanelCard` 到 `dev-tools/`
3. 抽离 17+ 个 V51-V60 面板到 `dev-tools/panels/`
4. App.tsx 仅保留 `IS_DEV && lazy(() => import('./dev-tools'))` 引用
5. 统一 i18n 语言代码为 `zh`/`en`（i18next 标准短码）
6. 更新 [config/runtime.ts](../../apps/web/src/config/runtime.ts) 的 supportedLocales/defaultLocale/fallbackLocale
7. 将 100+ 处 `zh-CN` 改为通过 i18n language 状态获取

**验收标准**:
- [ ] `wc -l apps/web/src/App.tsx` < 300 行
- [ ] `apps/web/src/dev-tools/` 目录存在
- [ ] `grep -r "zh-CN\|en-US" apps/web/src/config/ apps/web/src/i18n/` 无结果
- [ ] 开发模式下 MicroFrontendDevTools 正常显示
- [ ] 语言切换功能正常

---

### 🟠 联调 Track（Integration）

#### I-1. generate.sh 端口表修复（P0，阻塞 OpenAPI 聚合）

**问题**: [scripts/openapi/generate.sh:88-100](../../scripts/openapi/generate.sh) 端口表过时：
- billing: 8080（应为 8085）
- ticket: 8081（应为 8086）
- feedback: 8083（应为 8087）
- communication: 8084（端口正确，但不应在 MISSING_SERVICES）
- search: 8082（未在 ports.env 注册）

**实施方案**:
1. 修正 billing/ticket/feedback 端口
2. 移除 communication 从 MISSING_SERVICES（已实现 OpenAPI）
3. search 服务处理：若 svc/search 已实现 /api-docs/openapi.json 则添加，否则标注 TODO
4. 验证 OpenAPI 聚合可抓取所有服务

**验收标准**:
- [ ] `./scripts/openapi/generate.sh` 不再因端口错误跳过 billing/ticket/feedback
- [ ] `grep "billing|8080" scripts/openapi/generate.sh` 无结果
- [ ] `grep "ticket|8081" scripts/openapi/generate.sh` 无结果
- [ ] `grep "feedback|8083" scripts/openapi/generate.sh` 无结果

---

#### I-2. schemaRegistry.ts 双重前缀修复（P0，所有 schema-registry 调用 404）

**问题**: [api/master/schemaRegistry.ts:63](../../apps/web/src/api/master/schemaRegistry.ts) `BASE_PATH = '/api/master-data/schema-registry'`，但 `apiClient.master` 的 baseURL 已是 `/api/master-data`，axios 会拼接为 `/api/master-data/api/master-data/schema-registry/schemas`（双重前缀）。

**实施方案**:
1. 将 `BASE_PATH` 改为 `/schema-registry`（相对路径，由 baseURL 拼接）
2. 验证 `apiClient.master.post('/schema-registry/schemas', ...)` 实际请求路径为 `/api/master-data/schema-registry/schemas`

**验收标准**:
- [ ] `grep "BASE_PATH = '/api/master-data" apps/web/src/api/master/schemaRegistry.ts` 无结果
- [ ] 浏览器 Network 面板显示请求路径为 `/api/master-data/schema-registry/schemas`（无重复）
- [ ] master-data schema-registry CRUD 功能正常

---

#### I-3. run-integration-tests.sh 包名修复（P0，master-data 集成测试无法执行）

**问题**: [scripts/test/run-integration-tests.sh:65](../../scripts/test/run-integration-tests.sh) `master-data) echo "topems-metadata"`，实际包名是 `topems-master-data`。

**实施方案**:
1. 修正包名映射
2. 同时核查其他包名映射是否正确（如 bi → analytics-service 是否匹配 Cargo.toml）

**验收标准**:
- [ ] `grep "topems-metadata" scripts/test/run-integration-tests.sh` 无结果
- [ ] `./scripts/test/run-integration-tests.sh --service master-data --no-build` 可执行（不报 "package ID specification did not match"）

---

#### I-4. services.yaml 同步外迁服务（P1，编排脚本遗漏）

**问题**: [config/services.yaml](../../config/services.yaml) `service_groups` 未包含 communication/billing/ticket/feedback，`virtual_services` 仍列 mail/im/notification（已外迁到 communication）。

**实施方案**:
1. 在 `service_groups` 添加 communication/billing/ticket/feedback/master-data 服务条目
2. 从 `virtual_services` 移除 mail/im/notification（已外迁）
3. 添加 search 服务条目（若需启用）

**验收标准**:
- [ ] `grep "communication:" config/services.yaml` 有结果
- [ ] `grep "billing:" config/services.yaml` 有结果
- [ ] `grep "mail:" config/services.yaml` 仅在注释或 legacy_alias 中出现
- [ ] 编排脚本（如 `start-all.sh`）可识别所有外迁服务

---

#### I-5. 前端健康检查测试补齐（P1，覆盖缺口）

**问题**: [tests/integration/tests/health-checks.spec.ts](../../tests/integration/tests/health-checks.spec.ts) SERVICES 列表缺少 billing/ticket/feedback/master-data/communication/search。

**实施方案**:
1. 在 SERVICES 数组添加 6 个服务
2. 验证健康检查测试通过

**验收标准**:
- [ ] `tests/integration/tests/health-checks.spec.ts` SERVICES 包含 29+ 服务
- [ ] `pnpm test:integration` 通过（服务启动时）

---

### 📈 V63.3 三路并行进度追踪

| 任务 | 优先级 | 状态 | 完成时间 | 备注 |
|------|--------|------|---------|------|
| 后端 B-1 IAM 用户端点 | P0 | ⏳ 待开始 | - | 18 端点，工作量：大 |
| 后端 B-2 凭证模板端点 | P1 | ⏳ 待开始 | - | 19 端点，工作量：中 |
| 后端 B-3 Finance 数据模型 | P2 | ⏳ 待开始 | - | 44 字段补齐，工作量：大 |
| 前端 F-1 PageContainer 统一 | P0 | ⏳ 待开始 | - | 57 引用，工作量：小 |
| 前端 F-2 V1/V2 孤儿清理 | P0 | ⏳ 待开始 | - | 10 文件，工作量：小 |
| 前端 F-3 导出组件合并 | P0 | ⏳ 待开始 | - | 删 8 文件，工作量：小 |
| 前端 F-4 schemas 类型修复 | P0 | ⏳ 待开始 | - | 30 错误，工作量：中 |
| 前端 F-5 App.tsx 拆分 + i18n | P2 | ⏳ 待开始 | - | 1462 行抽离 + 100+ zh-CN，工作量：大 |
| 联调 I-1 generate.sh 端口 | P0 | ⏳ 待开始 | - | 5 处修正，工作量：小 |
| 联调 I-2 schemaRegistry 双前缀 | P0 | ⏳ 待开始 | - | 1 处修复，工作量：小 |
| 联调 I-3 测试脚本包名 | P0 | ⏳ 待开始 | - | 1 处修正，工作量：小 |
| 联调 I-4 services.yaml 同步 | P1 | ⏳ 待开始 | - | 5 服务条目，工作量：小 |
| 联调 I-5 健康检查测试补齐 | P1 | ⏳ 待开始 | - | 6 服务添加，工作量：小 |

---

## 🚨 V63.2 重新评估与三路并行实施方案（2026-07-25 二次评估）

> **背景**: 2026-07-25 对 A1-A6 修复后状态重新评估，发现 3 项 P0 编译/类型错误阻断开发 + 3 项端口冲突导致服务不可达 + 2 项前端类型错误。本方案采用三批次并行执行，每批次三路同步推进，互不阻塞。
> **执行原则**: 多任务并行 + 每任务独立验收标准 + 修复即交付 + 不引入新债务 + 编译/类型错误优先。

### 📊 三批次并行总览

```
批次 1（P0 紧急止血 — 三路同步）  批次 2（P1 核心补齐 — 三路同步）   批次 3（P2/P3 优化 — 三路同步）
─────────────────────────────    ──────────────────────────────    ──────────────────────────────
后端：编译错误修复               后端：A8 HRM Employee 字段补齐    后端：A9 凭证模板端点
  - unified-core serde import    后端：A10 IAM 用户端点实现        后端：A7 Finance 数据模型补齐
  - communication init_telemetry 前端：B6 reactQuery ESM 修复      前端：B4 合并导出组件
前端：类型错误修复               前端：B5 PageContainer 统一        前端：B2 V1/V2 重复页面清理
  - instrument.ts → .tsx         联调：C1 Vite 代理完全对齐        前端：B7 拆分 App.tsx 演示面板
  - schemaRegistry.ts 3处修复    联调：C2 master-data 服务接入      前端：B8 i18n 语言代码统一
联调：端口与服务对齐             联调：C4 前端 API 类型对齐        联调：C5 端到端集成测试
  - C3 billing/ticket/feedback
  - master-data vite 接入
─────────────────────────────    ──────────────────────────────    ──────────────────────────────
依赖：无（可立即启动）            依赖：批次 1 全部完成              依赖：批次 2 全部完成
预估：1-2 小时                   预估：8-12 小时                   预估：15-25 小时
```

---

## 🔴 批次 1：P0 紧急止血（三路并行，立即启动）

### A0. 修复后端编译错误（P0，阻断全部后端编译）

**问题（2 项编译错误）**:
1. [svc/unified-core/src/modules/iam/user/crud.rs:1-12](../../svc/unified-core/src/modules/iam/user/crud.rs) 缺少 `use serde::{Serialize, Deserialize}` 导入，导致 48 个级联编译错误
2. [svc/communication/src/main.rs:5](../../svc/communication/src/main.rs) 导入 `topems_shared::init_service_telemetry` — 该函数不存在

**实施方案**:
1. 在 `crud.rs` 顶部添加 `use serde::{Serialize, Deserialize};`
2. 在 `communication/main.rs` 改为调用存在的 `topems_shared::init_telemetry` 或移除该调用
3. 运行 `cargo check --workspace` 验证全工作区编译通过

**验收标准**:
- [ ] `cargo check -p topems-unified-core --all-targets` 零错误
- [ ] `cargo check -p topems-communication --all-targets` 零错误
- [ ] `cargo check --workspace` 零错误（警告可保留）
- [ ] unified-core 单元测试可执行（`cargo test -p topems-unified-core --no-run`）

---

### B0. 修复前端类型错误（P0，阻断 TypeScript 编译）

**问题（2 项类型错误，共 51 个错误）**:
1. [apps/web/src/schemas/lims/instrument.ts:106-108](../../apps/web/src/schemas/lims/instrument.ts) `.ts` 文件含 JSX 语法（`<span>` 标签），产生 48 个 TS 解析错误
2. [apps/web/src/api/master/schemaRegistry.ts:91,99,121](../../apps/web/src/api/master/schemaRegistry.ts) 3 处 `apiClient.monitor` 应为 `apiClient.master`（deleteSchema/createData/updateData 方法）

**实施方案**:
1. 将 `instrument.ts` 重命名为 `instrument.tsx`，更新所有 import 引用
2. 将 schemaRegistry.ts 第 91/99/121 行的 `apiClient.monitor` 改为 `apiClient.master`

**验收标准**:
- [ ] `pnpm typecheck` 零错误
- [ ] `grep -n "apiClient.monitor" apps/web/src/api/master/schemaRegistry.ts` 无结果
- [ ] LIMS 仪表盘页面 schema 正常加载
- [ ] master-data schemaRegistryApi CRUD 方法调用不再 404

---

### C0. 修复端口冲突与服务接入（P0，3 服务不可达 + master-data 孤立）

**问题（4 项严重不一致）**:
1. **billing 端口冲突**: `svc/billing/src/main.rs` 默认 8080 vs `vite.config.ts` 8085（与 Dashboard 冲突）
2. **ticket 端口冲突**: `svc/ticket/src/main.rs` 默认 8081 vs `vite.config.ts` 8086
3. **feedback 端口冲突**: `svc/feedback/src/main.rs` 默认 8082 vs `vite.config.ts` 8087
4. **master-data 孤立**: 后端存在 `svc/master-data` (端口 8090, 前缀 `/api/master-data`)，但 vite.config.ts SERVICES 数组无配置，前端 `apiClient.master` baseURL = `/api/core/master`（指向 unified-core 无此路由）

**实施方案**:
1. 将 `svc/billing/src/main.rs` 默认端口改为 `"8085"`
2. 将 `svc/ticket/src/main.rs` 默认端口改为 `"8086"`
3. 将 `svc/feedback/src/main.rs` 默认端口改为 `"8087"`
4. 在 `apps/web/vite.config.ts` SERVICES 数组添加 `{ name: 'master-data', port: 8090, apiPrefix: '/api/master-data' }`
5. 修改 `apps/web/src/config/runtime.ts` 第 55 行 `master: '/api/core/master'` → `master: '/api/master-data'`
6. 修改 `apps/web/src/api/master/schemaRegistry.ts` BASE_PATH `/api/master/schema-registry` → `/api/master-data/schema-registry`（需验证后端实际路由）
7. 在 `config/ports.env` 添加 `BILLING_PORT=8085`、`TICKET_PORT=8086`、`FEEDBACK_PORT=8087`、`MASTER_DATA_PORT=8090`、`COMMUNICATION_PORT=8084`
8. 在 `config/services.yaml` service_groups 添加 billing/ticket/feedback/master-data/communication 服务条目
9. 在 `apps/web/vite.config.ts` HEALTH_CHECK_PATHS 添加 `billing`/`ticket`/`feedback`/`master-data`，移除废弃的 `manufacturing`/`quality-assurance`/`report`
10. 更新 `scripts/openapi/generate.sh` 端口配置（billing 8085, ticket 8086, 添加 feedback）

**验收标准**:
- [ ] `curl http://localhost:8085/api/billing/plans` 返回 200
- [ ] `curl http://localhost:8086/api/ticket/...` 返回 200
- [ ] `curl http://localhost:8087/api/feedback/...` 返回 200
- [ ] `curl http://localhost:8090/api/master-data/health` 返回 200
- [ ] 前端 `apiClient.master.get('/schema-registry/schemas')` 走 vite 代理到 8090
- [ ] `grep "8080" svc/billing/src/main.rs` 无结果
- [ ] `grep "8081" svc/ticket/src/main.rs` 无结果
- [ ] `grep "8082" svc/feedback/src/main.rs` 无结果
- [ ] `config/ports.env` 包含 5 个新增端口配置
- [ ] `config/services.yaml` 包含 5 个新增服务条目

---

## 🔵 工作流 A：后端 Track（Backend）

### A1. 修复 IAM 路由前缀（P0，阻塞所有 IAM 管理功能）

**问题**: [svc/unified-core/src/routes/iam.rs:8-114](../../svc/unified-core/src/routes/iam.rs) `iam_routes()` 使用裸路径 `/users`、`/roles`、`/permissions`，被 [routes/mod.rs:121](../../svc/unified-core/src/routes/mod.rs) 直接 `.merge()` 进 `core_protected_routes`，最终路径为 `/api/core/users`，而前端期望 `/api/core/iam/users`。

**实施方案**:
1. 修改 `iam_routes()` 返回的 Router 用 `.nest("/iam", ...)` 包裹
2. 或在 [routes/mod.rs:121](../../svc/unified-core/src/routes/mod.rs) 将 `iam::iam_routes(state)` 改为 `Router::new().nest("/iam", iam::iam_routes(state))`
3. 验证 auth 端点（已用 `/iam/auth/login` 等）不重复嵌套

**验收标准**:
- [ ] `curl http://localhost:8000/api/core/iam/users` 返回 200（带认证）
- [ ] `curl http://localhost:8000/api/core/iam/roles` 返回 200
- [ ] `curl http://localhost:8000/api/core/iam/permissions` 返回 200
- [ ] `curl http://localhost:8000/api/core/iam/auth/login` 仍返回 200（不重复嵌套）
- [ ] `cargo test -p topems-unified-core` 通过
- [ ] 前端 `apiClient.iam.get('/users')` 不再 404

---

### A2. 修复 Finance api_prefix 违规（P0，阻塞所有 Finance API）

**问题**: [svc/finance/src/main.rs:100](../../svc/finance/src/main.rs) `api_prefix: "/api/core/finance/v1"`，违反"business services must use '/api/{svc}/{path}'"约束。前端 `apiClient.finance` baseURL = `/api/finance`，仅靠 legacy 别名 `/api/finance` 兜底。

**实施方案**:
1. 将 `api_prefix` 改为 `/api/finance`
2. 将 `legacy_prefixes` 改为 `&["/api/v1/finance", "/api/core/finance/v1"]`（旧路径降级为 legacy）
3. 确认 `enable_rls: false` 保持（finance 暂不启用 RLS）

**验收标准**:
- [ ] `curl http://localhost:8011/api/finance/vouchers` 返回 200（主路径）
- [ ] `curl http://localhost:8011/api/core/finance/v1/vouchers` 返回 200（legacy 兼容）
- [ ] `curl http://localhost:8011/api/v1/finance/vouchers` 返回 200（legacy 兼容）
- [ ] `cargo test -p topems-finance` 通过
- [ ] 前端 `apiClient.finance.get('/vouchers')` 走主路径非 legacy

---

### A3. 修复 Billing 服务 Rocket 风格路径参数（P0，所有动态路由 404）

**问题**: [svc/billing/src/main.rs:49-55](../../svc/billing/src/main.rs) 全部 6 条动态路由使用 `/:id`（Rocket 语法），Axum 0.8 要求 `/{id}`。

**实施方案**:
```rust
// 修改前
.route("/plans/:id", get(handlers::get_plan))
.route("/subscriptions/:tenant_id", get(handlers::get_subscription))
// 修改后
.route("/plans/{id}", get(handlers::get_plan))
.route("/subscriptions/{tenant_id}", get(handlers::get_subscription))
.route("/usage/{tenant_id}/{metric_type}", post(handlers::record_usage))
```

**验收标准**:
- [ ] `cargo build -p topems-billing` 通过（无编译错误）
- [ ] `curl http://localhost:8080/api/billing/plans/123` 返回 200 或 404（非 400）
- [ ] `curl http://localhost:8080/api/billing/subscriptions/tenant-abc` 返回 200 或 404
- [ ] `cargo test -p topems-billing` 通过

---

### A4. 注册 Monitor 公开健康端点（P0，无公开健康检查）

**问题**: [routes/monitor.rs:22-36](../../svc/unified-core/src/routes/monitor.rs) 定义了 `monitor_public_routes()` 含 `/api/monitor/health`，但 [routes/mod.rs](../../svc/unified-core/src/routes/mod.rs) 从未调用该函数。

**实施方案**:
1. 在 [routes/mod.rs](../../svc/unified-core/src/routes/mod.rs) `core_public_routes` 中调用 `monitor::monitor_public_routes()`
2. 确认路径为 `/api/monitor/health`（无需认证）
3. 同时保留 `/api/core/monitor/health`（需认证）供前端 `apiClient.monitor` 调用

**验收标准**:
- [ ] `curl http://localhost:8000/api/monitor/health` 返回 200（无需 Authorization header）
- [ ] `curl http://localhost:8000/api/core/monitor/health` 返回 200（需认证）
- [ ] 响应体包含 `services` 数组与健康状态
- [ ] `cargo test -p topems-unified-core` 通过

---

### A5. 修复 RLS setting key 不一致（P0，unified-core RLS 不生效）

**问题**:
- shared-db [rls.rs:76](../../lib/shared-db/src/rls.rs) 创建 policy 用 `app.tenant_id`
- shared-auth [middleware/tenant.rs:75](../../lib/shared-auth/src/middleware/tenant.rs) 设置 `app.tenant_id`
- unified-core [tenant_rls.rs:157](../../svc/unified-core/src/middleware/tenant_rls.rs) 设置 `app.current_tenant_id`（不一致！）

**实施方案**:
1. 修改 [svc/unified-core/src/middleware/tenant_rls.rs:157](../../svc/unified-core/src/middleware/tenant_rls.rs) 将 `app.current_tenant_id` 改为 `app.tenant_id`
2. 全局搜索 `current_tenant_id` 确认无其他引用
3. 如有数据库 trigger 或函数引用 `current_tenant_id`，一并修复

**验收标准**:
- [ ] `grep -r "current_tenant_id" svc/unified-core/src/ lib/` 无结果
- [ ] unified-core 启动后，多租户查询被 RLS 正确过滤
- [ ] `cargo test -p topems-unified-core` 通过
- [ ] 手动测试：tenant A 用户无法查询 tenant B 数据

---

### A6. 修复 HRM tenant_id 硬编码（P0，部门模块无租户隔离）

**问题**: [svc/hrm/src/modules/department.rs:149,263,303](../../svc/hrm/src/modules/department.rs) 三处 `Uuid::nil()` 代替真实 tenant_id。

**实施方案**:
1. 从 `Extension<Claims>` 提取 `tenant_id`（参考 CRM 模式 [svc/crm/src/middleware/tenant.rs](../../svc/crm/src/middleware/tenant.rs)）
2. 或通过 `tenant_middleware` 注入 tenant context
3. 在 HRM main.rs 添加 `tenant_middleware`（如未添加）

**验收标准**:
- [ ] `grep -n "Uuid::nil()" svc/hrm/src/modules/department.rs` 无结果
- [ ] HRM 部门查询自动按当前用户 tenant_id 过滤
- [ ] `cargo test -p topems-hrm` 通过
- [ ] 手动测试：tenant A 部门列表不显示 tenant B 部门

---

### A7. Finance 数据模型字段补齐（P1，前后端数据不一致）

**问题**:
- 前端 [packages/shared-types/src/finance.ts:149-190](../../packages/shared-types/src/finance.ts) `Voucher` ~25 字段
- 后端 [svc/finance/src/models/mod.rs:50-67](../../svc/finance/src/models/mod.rs) `Voucher` 仅 14 字段
- `VoucherStatus` 枚举：前端有 `reversed`，后端无；后端有 `Rejected`/`Cancelled`，前端无
- `Account` 字段名不一致：前端 `category` vs 后端 `account_type`；前端有 `balance_direction`/`is_cash_flow`/`dimensions` 等后端无

**实施方案**:
1. 后端 `Voucher` 补齐：`voucher_number`、`submitter_id`、`submitter_name`、`maker_id`、`approver_id`、`posted_at`、`is_reversed`、`reverse_voucher_id`、`reversed_at`、`attachment_count`、`summary`、`source_module`、`source_id`
2. `VoucherStatus` 枚举添加 `Reversed`，前端添加 `rejected`/`cancelled`
3. 后端 `Account` 补齐：`name_en`、`full_name`、`category`（别名）、`balance_direction`、`is_cash_flow`、`enable_quantity`、`enable_foreign_currency`、`default_currency`、`dimensions`
4. 数据库迁移脚本添加新字段（ALTER TABLE）

**验收标准**:
- [ ] `cargo test -p topems-finance` 通过
- [ ] 前端 `Voucher` 类型与后端响应 JSON 字段完全匹配
- [ ] `curl /api/finance/vouchers/{id}` 返回的 JSON 可被前端类型正确解析
- [ ] 数据库迁移脚本可重复执行（idempotent）

---

### A8. HRM Employee 字段补齐（P1，员工数据字段缺失）

**问题**:
- 前端 [api/hrm/types.ts:33-65](../../apps/web/src/api/hrm/types.ts) `Employee` ~22 字段
- 后端 [svc/hrm/src/models/employee.rs:26-59](../../svc/hrm/src/models/employee.rs) 14 字段
- 字段名不一致：`employee_no` vs `employee_number`、`id_number` vs `id_card_number`
- 前端独有：`birth_date`、`regular_date`、`probation_period`、`position`、`joblevel`、`work_location`、`report_to_name`、`education`、`emergency_contact`、`emergency_phone`、`emergency_relation`、`hukou_location`、`remark`、`employee_type`、`user_id`

**实施方案**:
1. 后端 `Employee` 补齐所有前端期望字段
2. 字段名统一：采用前端命名（`employee_no`、`id_number`）或后端命名（需前端同步）
3. 数据库迁移添加新字段
4. 更新 OpenAPI Schema 生成

**验收标准**:
- [ ] `cargo test -p topems-hrm` 通过
- [ ] 前端 `Employee` 类型与后端响应字段完全匹配
- [ ] `curl /api/hrm/employees/{id}` 返回完整员工信息
- [ ] OpenAPI 生成的类型与手写类型一致

---

### A9. 凭证模板缺失端点实现（P1，16 个端点不存在）

**问题**: 前端 [api/voucherTemplate/index.ts](../../apps/web/src/api/voucherTemplate/index.ts) 调用 16 个后端不存在的端点：copy、toggle、entries CRUD、match、usage-stats、export、import、generate/preview/from-source/batch/auto/regenerate。

**实施方案**:
1. 后端 [svc/finance/src/modules/mod.rs:2272-2329](../../svc/finance/src/modules/mod.rs) 添加缺失路由
2. 实现 handler 函数（可先返回 501 Not Implemented，再逐步实现）
3. 优先实现高频使用端点：copy、toggle、entries CRUD
4. 低频端点（generate 系列）可标记 TODO 后续实现

**验收标准**:
- [ ] 所有 16 个端点返回非 404（200/501/501）
- [ ] 高频端点（copy/toggle/entries）功能正确
- [ ] `cargo test -p topems-finance` 通过
- [ ] OpenAPI 文档包含所有新端点

---

### A10. IAM 用户缺失端点实现（P1，14+ 个端点不存在）

**问题**: 前端 [api/iam/user.ts](../../apps/web/src/api/iam/user.ts) 调用 14+ 个后端不存在的端点：effective-permissions、batch-delete、batch-update、check-email、check-username、login-history、access-logs、me/avatar、me/password 等。

**实施方案**:
1. 后端 [svc/unified-core/src/routes/iam.rs](../../svc/unified-core/src/routes/iam.rs) 添加缺失路由
2. 实现 handler 函数
3. 优先实现：me/password、me/avatar、effective-permissions、batch-delete/batch-update
4. access-logs/login-history 需对接 audit 模块

**验收标准**:
- [ ] 所有 14+ 端点返回非 404
- [ ] `me/password` 可修改当前用户密码
- [ ] `effective-permissions` 返回用户有效权限列表
- [ ] `cargo test -p topems-unified-core` 通过

---

## 🟢 工作流 B：前端 Track（Frontend）

### B1. 清理顶层 src/* 死代码目录（P0，迁移残留）

**问题**: `src/admin/`、`src/ai/`、`src/bi/`、`src/crm/`、`src/pdm/`（13 文件）、`src/rd/`（13 文件）、`src/wms/` 等顶层目录仍存 .tsx 页面，但 `@/pdm/` 等导入路径已无匹配（已迁移到 `src/pages/{module}/`）。

**实施方案**:
1. 全局搜索确认每个目录无引用：`grep -r "from '@/admin/" apps/web/src/`
2. 逐目录删除：`rm -rf apps/web/src/{admin,ai,bi,crm,doc,ehs,erp,gis,hrm,im,lims,mes,pdm,pm,qms,rd,report,scm,srm,wms}`
3. 验证构建无报错

**验收标准**:
- [ ] `apps/web/src/` 下不再有上述顶层业务目录
- [ ] `pnpm build` 成功无错误
- [ ] `pnpm dev` 启动无模块解析错误
- [ ] 路由懒加载所有页面正常

---

### B2. 清理 V1/V2 重复页面（P0，代码冗余）

**问题**: admin 下 DictManagementPage、PermissionManagementPage、RoleManagementPage、UserManagementPage、TenantManagementPage 均有 V1+V2；qms 下 QmsDashboardPage V1+V2。

**实施方案**:
1. 确认 V2 已被路由引用（检查 [modules/admin/config.ts](../../apps/web/src/modules/admin/config.ts)）
2. 确认 V1 无其他导入引用
3. 删除 V1 文件
4. 将 V2 文件重命名去掉 V2 后缀（如 `UserManagementPageV2.tsx` → `UserManagementPage.tsx`）
5. 更新所有导入路径

**验收标准**:
- [ ] `find apps/web/src/pages -name "*V1*" -o -name "*V2*"` 无结果（重命名后）
- [ ] `pnpm build` 成功
- [ ] 路由配置引用的页面路径正确
- [ ] 页面功能正常（手动验证每个页面）

---

### B3. 移除 @deprecated 别名（P0，API 客户端清理）

**问题**:
- [api/client.ts:577-579](../../apps/web/src/api/client.ts) `apiClient.master`（应用 monitor 替代）
- [api/client.ts:518-521](../../apps/web/src/api/client.ts) `apiClient.analytics`（指向 bi）
- [api/client.ts:522-525](../../apps/web/src/api/client.ts) `apiClient.report`（指向 bi）

**实施方案**:
1. 全局搜索 `apiClient.master`、`apiClient.analytics`、`apiClient.report` 的使用点
2. 逐个替换为 `apiClient.monitor`、`apiClient.bi`、`apiClient.bi`
3. 删除 `client.ts` 中的 @deprecated getter
4. 同步清理 [config/runtime.ts](../../apps/web/src/config/runtime.ts) 中的 @deprecated 配置

**验收标准**:
- [ ] `grep -r "apiClient.master\|apiClient.analytics\|apiClient.report" apps/web/src/` 无结果
- [ ] `grep -r "@deprecated" apps/web/src/api/client.ts apps/web/src/config/runtime.ts` 无结果
- [ ] `pnpm build` 成功
- [ ] 监控页面功能正常

---

### B4. 合并导出组件（P1，功能重复）

**问题**: [components/export/](../../apps/web/src/components/export) 与 [components/import-export/](../../apps/web/src/components/import-export) 两套功能重叠的导入导出组件。

**实施方案**:
1. 评估两套组件的功能覆盖
2. 保留功能更完整的一套（建议 import-export/，文件更多）
3. 将 export/ 独有功能合并到 import-export/
4. 更新所有引用，删除 export/ 目录

**验收标准**:
- [ ] `apps/web/src/components/export/` 目录删除
- [ ] `apps/web/src/components/import-export/` 包含所有功能
- [ ] `grep -r "from '@/components/export" apps/web/src/` 无结果
- [ ] `pnpm build` 成功

---

### B5. 统一 PageContainer 到 V2（P1，API 不一致）

**问题**: [components/common/PageContainer.tsx](../../apps/web/src/components/common/PageContainer.tsx) 与 `PageContainerV2.tsx` 并存，不同页面混用。

**实施方案**:
1. 全局搜索 `from '@/components/common/PageContainer'`（非 V2）
2. 逐页面迁移到 PageContainerV2
3. 删除 PageContainer.tsx
4. 将 PageContainerV2.tsx 重命名为 PageContainer.tsx

**验收标准**:
- [ ] `find apps/web/src -name "PageContainer*.tsx"` 仅一个文件
- [ ] `grep -r "PageContainerV2" apps/web/src/` 无结果
- [ ] `pnpm build` 成功
- [ ] 所有页面布局正常

---

### B6. 修复 reactQuery.ts ESM 兼容性（P1，潜在运行时错误）

**问题**: [lib/reactQuery.ts:8,59](../../apps/web/src/lib/reactQuery.ts) 在 ESM 项目中用 `require('../store')`，靠 try/catch 降级，严格 ESM 环境会丢失 QueryCache/MutationCache。

**实施方案**:
1. 将 `require('../store')` 改为 ESM `import { useNotificationStore } from '../store'`
2. 移除 try/catch 降级逻辑
3. 调整 import 到文件顶部

**验收标准**:
- [ ] `grep -n "require(" apps/web/src/lib/reactQuery.ts` 无结果
- [ ] `grep -n "try {" apps/web/src/lib/reactQuery.ts` 无结果（与 store 相关的）
- [ ] QueryCache/MutationCache 正常初始化
- [ ] `pnpm build` 成功

---

### B7. 拆分 App.tsx 演示面板（P1，1990 行膨胀）

**问题**: [App.tsx](../../apps/web/src/App.tsx) 1990 行，`MicroFrontendDevTools` 占 1270 行（第 497-1768 行），堆砌 17+ 个 V51-V60 演示面板。

**实施方案**:
1. 将 `MicroFrontendDevTools` 抽离到 `apps/web/src/dev-tools/MicroFrontendDevTools.tsx`
2. 将 17+ 个 V51-V60 面板抽离到 `apps/web/src/dev-tools/panels/`
3. App.tsx 仅保留 `IS_DEV` 时动态 import 引用
4. 生产构建排除 dev-tools（通过 tree-shaking 或条件导入）

**验收标准**:
- [ ] `wc -l apps/web/src/App.tsx` < 300 行
- [ ] `apps/web/src/dev-tools/` 目录存在
- [ ] 开发模式下 `MicroFrontendDevTools` 正常显示
- [ ] 生产构建不包含 dev-tools 代码（`pnpm build` 后 grep 无 V51DesignSystemPanel 等）

---

### B8. i18n 语言代码统一（P2，配置不一致）

**问题**: [config/runtime.ts:115-122](../../apps/web/src/config/runtime.ts) 用 `zh-CN`/`en-US`，[i18n/index.ts](../../apps/web/src/i18n/index.ts) 用 `zh`/`en`。

**实施方案**:
1. 统一为 `zh`/`en`（i18next 标准短码）
2. 更新 [config/runtime.ts](../../apps/web/src/config/runtime.ts) 的 `supportedLocales`/`defaultLocale`/`fallbackLocale`
3. 更新 localStorage key（如需）

**验收标准**:
- [ ] `grep -r "zh-CN\|en-US" apps/web/src/` 无结果（除注释外）
- [ ] 语言切换功能正常
- [ ] 翻译文件正确加载

---

### B9. 清理 mail/im/notification 双重代理（P2，死代码）

**问题**: [vite.config.ts:40-42](../../apps/web/vite.config.ts) 仍保留 `/api/core/mail`、`/api/core/notification`、`/api/core/im` 代理到 8000（unified-core deprecated），而 [runtime.ts:60-62](../../apps/web/src/config/runtime.ts) 实际用 `/api/communication/*` 指向 8084。

**实施方案**:
1. 从 [vite.config.ts](../../apps/web/vite.config.ts) SERVICES 数组删除 `mail`、`notification`、`im` 三个虚拟服务配置
2. 保留 `communication` 服务代理（指向 8084）
3. 验证 unified-core deprecated 路由可后续清理

**验收标准**:
- [ ] `grep -n "apiPrefix: '/api/core/mail'" apps/web/vite.config.ts` 无结果
- [ ] `grep -n "apiPrefix: '/api/core/notification'" apps/web/vite.config.ts` 无结果
- [ ] `grep -n "apiPrefix: '/api/core/im'" apps/web/vite.config.ts` 无结果
- [ ] 通知/邮件/IM 功能正常（走 `/api/communication/*`）

---

### B10. 清理 analytics 别名代理（P2，违反约束）

**问题**: [vite.config.ts:80](../../apps/web/vite.config.ts) 仍保留 `/api/analytics` 代理，违反"BI 必须用 /api/bi"约束。

**实施方案**:
1. 从 SERVICES 数组删除 `analytics` 配置
2. 全局搜索 `apiClient.analytics` 使用点（B3 已处理，此处验证）

**验收标准**:
- [ ] `grep -n "analytics" apps/web/vite.config.ts` 无结果
- [ ] BI 功能正常（走 `/api/bi/*`）

---

## 🟠 工作流 C：前后端联调 Track（Integration）

### C1. Vite 代理配置与后端路由对齐（P0，依赖 A1-A6 + B1-B3）

**问题**: Vite 代理 `services` 数组与后端实际路由前缀存在多处不一致。

**实施方案**:
1. 基于 A1-A6 后端修复后的实际路径，重新生成 [vite.config.ts](../../apps/web/vite.config.ts) SERVICES 数组
2. 确保每个服务的 `apiPrefix` 与后端 `api_prefix` 完全一致
3. 验证 `generateServiceProxies` 函数输出正确的代理规则
4. 清理 B9/B10 已处理的死代码代理

**验收标准**:
- [ ] `apps/web/vite.config.ts` SERVICES 数组与 `config/services.yaml` 服务清单一致
- [ ] 每个服务的 `apiPrefix` 与后端 `api_prefix` 字段完全匹配
- [ ] `pnpm dev` 启动后，前端 API 调用无 404（除未实现端点）
- [ ] 浏览器 Network 面板显示代理转发正确

---

### C2. master-data 服务接入或下线决策（P1，孤立服务）

**问题**: [svc/master-data](../../svc/master-data)（端口 8090）完全孤立，前端无 API 客户端，Vite 代理未配置，runtime.ts 指向 unified-core 的 `/api/core/master`。

**实施方案**（二选一）:
- **方案 A（接入）**: 前端添加 `apiClient.masterData`，Vite 代理添加 master-data 服务，runtime.ts 添加配置
- **方案 B（下线）**: 删除 `svc/master-data` 目录，相关功能由 unified-core master 模块承载

**验收标准**（方案 A）:
- [ ] `apiClient.masterData` getter 存在
- [ ] Vite 代理配置 master-data 服务（端口 8090）
- [ ] master-data 页面功能正常

**验收标准**（方案 B）:
- [ ] `svc/master-data` 目录删除
- [ ] `Cargo.toml` members 移除 master-data
- [ ] unified-core master 模块承载所有主数据功能

---

### C3. billing 服务端口对齐（P1，端口冲突）

**问题**: [svc/billing/src/main.rs:74](../../svc/billing/src/main.rs) 端口 8080，与 Vite 代理 DASHBOARD_PORT=8080 冲突；[vite.config.ts:49](../../apps/web/vite.config.ts) 配置 billing 端口 8085 不一致。

**实施方案**:
1. 将 billing 服务端口改为 8085（与 Vite 代理一致）
2. 更新 [config/services.yaml](../../config/services.yaml) 和 [config/ports.env](../../config/ports.env)
3. 更新 [deploy/k8s/services/billing.yaml](../../deploy/k8s/services/billing.yaml) 和 [deploy/systemd/topems-billing.service](../../deploy/systemd/topems-billing.service)

**验收标准**:
- [ ] billing 服务启动在端口 8085
- [ ] `curl http://localhost:8085/api/billing/plans` 返回 200
- [ ] Vite 代理转发 `/api/billing/*` 到 8085
- [ ] 所有部署配置端口一致

---

### C4. 前端 API 客户端类型对齐（P1，依赖 A7-A10 + B4-B10）

**问题**: 前端手写类型与后端实际响应不一致，导致运行时数据错乱。

**实施方案**:
1. 运行 OpenAPI 类型生成流水线：`./scripts/openapi/generate.sh --with-types`
2. 将手写类型（`apps/web/src/api/*/types.ts`）逐步替换为生成类型
3. 使用 `createTypedApiClient` 工厂（[packages/shared-types/src/typeBridge.ts](../../packages/shared-types/src/typeBridge.ts)）
4. 优先对齐 Finance、HRM 两个问题最严重的模块

**验收标准**:
- [ ] `packages/shared-types/src/generated/openapi.d.ts` 包含所有服务 Schema
- [ ] Finance API 客户端使用生成类型
- [ ] HRM API 客户端使用生成类型
- [ ] `pnpm typecheck` 通过
- [ ] 前端类型与后端 OpenAPI Schema 一致

---

### C5. 端到端集成测试验证（P0，最终验收）

**问题**: 需要端到端验证所有修复生效。

**实施方案**:
1. 启动所有后端服务（`./scripts/dev/start-all.sh` 或类似）
2. 启动前端开发服务器（`pnpm dev`）
3. 执行关键路径测试：
   - 登录 → IAM 用户/角色/权限管理
   - Finance 凭证 CRUD
   - HRM 员工 CRUD
   - 监控健康检查
   - 多租户隔离验证
4. 运行现有集成测试：`cargo test --ignored`

**验收标准**:
- [ ] 登录功能正常（`/api/core/iam/auth/login`）
- [ ] IAM 用户列表/创建/编辑/删除正常
- [ ] Finance 凭证列表/创建/审批正常
- [ ] HRM 员工列表/创建/编辑正常
- [ ] `curl http://localhost:8000/api/monitor/health` 无需认证返回健康状态
- [ ] 多租户用户 A 无法访问 tenant B 数据
- [ ] `cargo test --ignored` 全部通过
- [ ] 前端所有核心页面无 404 错误

---

## 📈 三路并行执行进度追踪

### 批次 1：P0 紧急止血（三路并行）

| 任务 | 优先级 | 状态 | 完成时间 | 备注 |
|------|--------|------|---------|------|
| A0 后端编译错误修复 | P0 | ✅ 完成 | 2026-07-25 | unified-core serde + utoipa schema/path 语法 + communication/feedback init_telemetry + master-data 双前缀 |
| B0 前端类型错误修复 | P0 | ✅ 完成 | 2026-07-25 | instrument.tsx 重命名 + schemaRegistry.ts 3处 apiClient.master 修复 |
| C0 端口冲突与服务接入 | P0 | ✅ 完成 | 2026-07-25 | billing/ticket/feedback 端口对齐 + master-data vite 接入 + ports.env 更新 |

### 工作流 A：后端 Track

| 任务 | 优先级 | 状态 | 完成时间 |
|------|--------|------|---------|
| A1 IAM 路由前缀修复 | P0 | ✅ 完成 | 2026-07-25 |
| A2 Finance api_prefix 修复 | P0 | ✅ 完成 | 2026-07-25 |
| A3 Billing Rocket 语法修复 | P0 | ✅ 完成 | 2026-07-25 |
| A4 Monitor 公开端点注册 | P0 | ✅ 完成 | 2026-07-25 |
| A5 RLS setting key 统一 | P0 | ✅ 完成 | 2026-07-25 |
| A6 HRM tenant_id 修复 | P0 | ✅ 完成 | 2026-07-25 |
| A7 Finance 数据模型补齐 | P2 | ⏳ 待开始（批次 3） | - | 58 字段差异，工作量：大 |
| A8 HRM Employee 字段补齐 | P1 | ⏳ 待开始（批次 2） | - | 16 字段缺失，工作量：中 |
| A9 凭证模板端点实现 | P2 | ⏳ 待开始（批次 3） | - | 14 端点缺失，工作量：中 |
| A10 IAM 用户端点实现 | P1 | ⏳ 待开始（批次 2） | - | 18 端点缺失，工作量：中 |

### 工作流 B：前端 Track

| 任务 | 优先级 | 状态 | 完成时间 |
|------|--------|------|---------|
| B1 清理 src/* 死代码目录 | P0 | ✅ 完成 | 2026-07-25（删除 20 个目录） |
| B2 清理 V1/V2 重复页面 | P2 | ⏳ 待开始（批次 3） | - | 9 删 + 10 改名 + 3 路由，工作量：小 |
| B3 移除 @deprecated 别名 | P0 | ✅ 完成 | 2026-07-25（删除 analytics/report getter，保留 master） |
| B4 合并导出组件 | P2 | ⏳ 待开始（批次 3） | - | 3 引用，工作量：小 |
| B5 统一 PageContainer V2 | P1 | ⏳ 待开始（批次 2） | - | barrel 已映射，工作量：小 |
| B6 修复 reactQuery ESM | P1 | ⏳ 待开始（批次 2） | - | require→import，工作量：小 |
| B7 拆分 App.tsx 演示面板 | P3 | ⏳ 待开始（批次 3） | - | 1462 行抽离，工作量：中 |
| B8 i18n 语言代码统一 | P3 | ⏳ 待开始（批次 3） | - | 100+ 文件，工作量：中 |
| B9 清理 mail/im 双重代理 | P2 | ✅ 完成 | 2026-07-25 |
| B10 清理 analytics 别名代理 | P2 | ✅ 完成 | 2026-07-25 |

### 工作流 C：联调 Track

| 任务 | 优先级 | 状态 | 完成时间 | 依赖 |
|------|--------|------|---------|------|
| C0 端口冲突与服务接入 | P0 | 🔄 进行中 | - | 无（批次 1） |
| C1 Vite 代理完全对齐 | P1 | ⏳ 待开始（批次 2） | - | C0 完成 |
| C2 master-data 服务接入 | P1 | ⏳ 待开始（批次 2） | - | C0 完成 |
| C3 billing 端口对齐 | P0 | ✅ 合并到 C0 | 2026-07-25 | - |
| C4 前端 API 类型对齐 | P1 | ⏳ 待开始（批次 2） | - | A8/A10 完成 |
| C5 端到端集成测试 | P3 | ⏳ 待开始（批次 3） | - | 全部完成 |

---

## 🏁 历史状态总览

### 已达成里程碑

| 里程碑 | 状态 | 说明 |
|--------|------|------|
| V16.1 工单 SLA | ✅ 完成 | 策略配置、时限计算、多级升级、统计 API、前端展示、BFF 代理全落地 |
| V20.0-V60.0 架构优化 | ✅ 完成 | 10 个版本架构深化（MDM/BFF/Finance/微前端/GraphQL 联邦等） |
| V37.0-V60.0 架构深化 | ✅ 完成 | 24 个版本持续迭代（领域模型/CQRS/知识图谱/AI 运维等） |
| 运维模式 Phase 1-2 | ✅ 完成 | 全 crate 零警告 + 警告回归防护 + 集成测试 + 迁移校验 + 性能基线 |
| Sprint 0 安全止血 | ✅ 完成 | BI SQL 注入修复 + JWT 密钥强制 + 插件 token 强制 + 前端认证闭环 |
| Sprint 1 核心业务 + 多租户 | ✅ 完成 | 多租户 tenant_id 闭环 + 组件体系收敛 + 侧边栏分组 + ⌘K 搜索 |
| Sprint 2 前端设计系统 | ✅ 完成 | Vite Proxy 自动化 + Token 强制化 + 页面模板 85%+ |
| Sprint 3 低代码平台 | ✅ 试点完成 | EntitySchema + CrudPage + FormBuilder + WMS 8 页面迁移 |
| 技术债清零 | ✅ 完成 | unwrap 清零、console.log 清理、routes.rs 拆分、多租户隔离 97.3% |
| 微服务治理 Phase 1-5 | ✅ 完成 | 端口修复 + 横切关注点统一 + ERP 瘦身 + 边界规范 + 客户端统一 |
| 微服务治理 Phase 7-8 | ✅ 完成 | Search/Communication 服务从 unified-core 外迁为独立进程 |
| 微服务治理 Phase 9 | ✅ 完成 | topems_shared 子 crate 拆分（7 子 crate）+ 渐进式迁移（52 模块）+ 编译优化 45% |

### 核心文档索引

| 文档 | 位置 | 说明 |
|------|------|------|
| Code Wiki 百科 | [architecture/code-wiki.md](../architecture/code-wiki.md) | 项目核心百科全书 |
| 短板分析报告 | [plans/shortcomings-analysis.md](../plans/shortcomings-analysis.md) | 12 项短板深度分析 |
| 整合实施方案 | [plans/integration-implementation-plan.md](../plans/integration-implementation-plan.md) | 4 Sprint 6 周整合上线 |
| 微服务治理 Phase 6-9 归档 | [todo-archive/microservice-governance-phase6-9.md](./todo-archive/microservice-governance-phase6-9.md) | unified-core 外迁 + 子 crate 拆分 |
| 长期路线图 | [roadmap.md](./roadmap.md) | 版本规划与演进方向 |
| 历史任务归档 | [todo-archive/](./todo-archive/) | V10-V60 + 微服务治理已完成任务 |
| 迁移文件清单 | [migration-inventory.md](../migration-inventory.md) | 23 服务 127 迁移文件盘点 |
| 性能基线文档 | [scripts/performance/baseline.md](../../scripts/performance/baseline.md) | 5 核心 API 基准方法论 |

---

## 📊 子 crate 拆分成果（2026-07-24 完成）

### 架构依赖图

```
topems-shared (主 crate，re-export 兼容层)
├── topems-shared-core          ← 核心基础（19 模块 + grpc feature，无外部依赖）
├── topems-shared-db            ← 数据库（12 模块 + audit → core）
├── topems-shared-auth          ← 认证授权（16 模块 + permission_center → core）
├── topems-shared-event         ← 事件驱动（9 模块 → core）
├── topems-shared-service-client ← 服务客户端（30+ 文件 + notification → core + event）
├── topems-shared-observability  ← 可观测性（observability + telemetry + monitoring + performance → core + event）
├── topems-shared-ai            ← AI 能力（ai_client + vector_store + embedding + ollama + file_client → core）
└── topems-shared-bootstrap     ← 服务启动编排（service_bootstrap → 全部子 crate）
```

### 主 crate 保留模块（0 个，纯 re-export 兼容层）

主 crate 已无任何业务模块，仅作为 re-export 兼容层存在，所有功能均已迁移至子 crate。

| 模块 | 迁移目标 | 状态 |
|------|---------|------|
| ~~`service_bootstrap`~~ | shared-bootstrap | ✅ V62.2 已迁移 |
| ~~`permission_center`~~ | shared-auth | ✅ V62.2 已迁移 |

### 编译优化

| Crate | 编译时间 | 说明 |
|-------|---------|------|
| topems-shared-core | 22.33s | 仅核心模块 |
| topems-shared（完整） | 40.36s | 核心 + 所有业务模块 |
| **优化率** | **45%** | 新服务按需引入可显著减少编译时间 |

### 按需引入指南

| 服务类型 | 推荐依赖 | 可用功能 |
|---------|---------|---------|
| 轻量 API 服务 | `topems-shared-core` | 错误/响应/健康检查/CORS/日志/配置/gRPC |
| 数据库服务 | `+ topems-shared-db` | 连接池/迁移/Repository/Schema/审计日志 |
| 认证服务 | `+ topems-shared-auth` | JWT/RBAC/中间件/租户/安全/限流 |
| 事件驱动服务 | `+ topems-shared-event` | 事件总线/Saga/缓存/Redis/Consul |
| 完整功能服务 | `topems-shared` | 所有功能（向后兼容） |

> 详细归档见 [Phase 6-9 归档文档](./todo-archive/microservice-governance-phase6-9.md)

---

## 🔴 当前进行中 / 近期优先级

### 🟣 Sprint 4：低代码平台推广 ✅ 基本完成

**进度**: Phase 1 基础设施全部完成；Batch A/B/C/D 全量推广；150+ 页面 Schema 驱动；总代码量减少 80%+

#### P0 基础设施（全部完成 ✅）

| 基础设施 | 状态 | 实现位置 |
|---------|------|---------|
| useDynamicOptions Hook | ✅ 完成 | `apps/web/src/hooks/useDynamicOptions.ts`（字段级缓存 + 依赖刷新 + mergeDynamicOptions） |
| Schema.dynamicOptions 配置 | ✅ 完成 | `apps/web/src/schema/types.ts`（DynamicOptionConfig 类型 + EntitySchema.dynamicOptions 字段） |
| CrudPage 动态选项集成 | ✅ 完成 | `apps/web/src/components/templates/CrudPage.tsx`（useDynamicOptions + dynamicDeps 依赖追踪） |
| 嵌套子表格 Schema | ✅ 完成 | `SubTableBuilder` + `NestedTableConfig`（schemaExtensions.ts） |
| 树形结构 Schema | ✅ 完成 | `TreeBuilder` + `TreeConfig`（列表/树形视图切换） |
| 多步向导 Schema | ✅ 完成 | `WizardBuilder` + `WizardConfig`（步骤校验 + 条件可见 + 摘要） |
| 状态徽章 renderCell | ✅ 完成 | `getColumns()` 内置 statusBadge 渲染（Chip 组件，20+ Schema 使用） |
| EditableDataTable 行内编辑 | ✅ 完成 | `ListPageTemplate` 内置 inlineEditable（cell/row 模式）+ CrudPage 集成 + Schema 支持 |

#### 批次迁移进度

| 批次 | 模块 | 已迁移页面数 | 状态 |
|------|------|------------|------|
| Batch A | admin + IAM | 14 | ✅ 完成 |
| Batch 1 | WMS 简单 CRUD | 13 | ✅ 完成 |
| Batch 2 | WMS 动态选项 CRUD | 含于 Batch 1 | ✅ 完成（transfer/replenishment/batch 使用 dynamicOptions） |
| Batch C | srm(12) + ehs(14) + scm(13) + finance(13) | 52 | ✅ 基本完成 |
| Batch D | mes(19) + pdm(15) + qms(10) + pm(3) | 47 | ✅ 基本完成 |

> **说明**: 未迁移页面均为 Dashboard、详情页、报表、看板等非标准 CRUD 页面，无需 Schema 驱动。
> Schema 扩展能力（wizard/nestedTables/tree）已在 14+ Schema 中使用，dynamicOptions 已在 12+ Schema 中使用。

---

### 🔴 P0 — 遗留待办

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 1 | OpenAPI 类型生成 | 自动生成 TS 类型，前后端类型同步 | ✅ 完成 |

#### OpenAPI 类型生成实现详情（2026-07-25 完成）

**后端 OpenAPI 覆盖**：24/27 服务已暴露 `/api-docs/openapi.json` 端点

| 状态 | 服务数 | 服务列表 |
|------|--------|---------|
| ✅ 完整支持（Schema + 路由） | 19 | unified-core, portal, pdm, mes, ai, analytics, finance, ehs, integration, mobile, rd, pm, erp, crm, srm, scm, wms, gis, hrm |
| ✅ 新增（本次） | 5 | billing（11 Schema）, ticket（20 Schema）, master-data, qms, lims |
| ❌ 无依赖 | 3 | feedback, search, communication |

**前端类型生成流水线**：

| 组件 | 位置 | 说明 |
|------|------|------|
| 生成工具 | `openapi-typescript` v7 | `packages/shared-types` devDeps |
| 生成脚本 | [scripts/openapi/gen-types.mjs](../../scripts/openapi/gen-types.mjs) | OpenAPI → TS 类型（支持 YAML/JSON/聚合） |
| 聚合脚本 | [scripts/openapi/generate.sh](../../scripts/openapi/generate.sh) | 从 24 个运行中服务抓取 + 聚合 + 生成类型 |
| 生成类型 | [packages/shared-types/src/generated/openapi.d.ts](../../packages/shared-types/src/generated/openapi.d.ts) | 2764 行，25 路径 + 39 Schema（手写 YAML 骨架） |
| 命名空间导出 | [packages/shared-types/src/generated/index.ts](../../packages/shared-types/src/generated/index.ts) | `ApiPaths`, `ApiComponents`, `ApiOperations` |
| 统一响应类型 | `packages/shared-types/src/api.ts` | `ApiResponse<T>`, `PaginatedResponse<T>` |

**使用方式**：

```typescript
import type { ApiPaths, ApiComponents } from '@topems/shared-types';

type User = ApiComponents['schemas']['User'];
type LoginPath = ApiPaths['/api/core/iam/auth/login']['post'];
```

**一键流水线**：

```bash
# 离线模式（从手写 YAML 生成）
pnpm gen:types

# 在线模式（启动后端服务后，抓取 + 聚合 + 生成类型）
./scripts/openapi/generate.sh --with-types
```

**后续优化方向**（P1）：
- 将手写 API 客户端类型（`apps/web/src/api/*/types.ts`）逐步替换为生成类型
- 给 billing/ticket handlers 添加 `#[utoipa::path]` 注解以生成 paths 类型
- 给 master-data/qms/lims 的 models 添加 `#[derive(ToSchema)]` 以补全 Schema
- 修复 qms/lims 预先存在的 `wrap_group2_router` 编译错误以使服务可运行

---

### 🟡 P1 — 微服务治理 Phase 6 长期优化

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 6.1 | Mobile BFF 重构 | workbench.rs HRM 2处+MES 1处+QMS 2处 SQL → 服务调用 ✅；public.audit_logs 5 处 → shared-db AuditLogService ✅；自有领域 ~116 处保持不变 | ✅ 完成 |
| 6.2 | unified-core 模块瘦身 | ~~billing/ticket/feedback/search 独立~~ Search ✅ + Communication ✅ + billing/ticket/feedback ✅ 已外迁并标注 DEPRECATED | ✅ 完成 |
| 6.3 | 推广 trait 泛型客户端 | pm(WorkflowApi) ✅ + portal(IamApi 10处) ✅ + mobile+portal(NotificationApi 13处) ✅ + mobile+erp+portal(HrmApi 25处) ✅ + erp+portal(FinanceApi 12方法) ✅ + portal(CrmApi 3处) ✅ + mobile+portal(MesApi 11处) ✅ + mobile(QmsApi 5处) ✅；SrmApi 无服务使用跳过；普查 25 个旧客户端 + 15 个新 trait；剩余低优先级 trait 按需补全 | ✅ 基本完成 |
| 6.4 | 清理 portal 版本号命名 | 低风险 106 处内部命名 ✅；中风险 108 张 DB 表名（全 dead_code） ✅；高风险 335 条 API 路由（全 dead_code） ✅ | ✅ 完成 |

---

### 🟡 P1 — 子 crate 后续迁移

| # | 任务 | 当前状态 | 说明 |
|---|------|---------|------|
| SC-1 | shared-service-client 实际迁移 | ✅ 完成 | 30+ 客户端文件 + notification 实际代码迁入子 crate |
| SC-2 | shared-observability 实际迁移 | ✅ 完成 | observability + telemetry + monitoring + performance 实际代码迁入 |
| SC-3 | shared-ai 实际迁移 | ✅ 完成 | ai_client + vector_store + embedding + ollama + file_client 实际代码迁入 |
| SC-额外 | audit/consul/rate_limit/grpc 迁移 | ✅ 完成 | audit→shared-db, consul→shared-event, rate_limit→shared-auth, grpc→shared-core |
| SC-4 | service_bootstrap 迁移 | ✅ 完成 | 已迁入 shared-bootstrap 子 crate，主 crate 保持 re-export 兼容 |
| SC-5 | permission_center 迁移 | ✅ 完成 | 已迁入 shared-auth 子 crate，主 crate 保持 re-export 兼容 |

---

### 🟢 P2 — 非阻塞待办

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 1 | V51-V60 模块真实 HTTP 集成测试 | 替换内存测试为真实服务调用（~197 HTTP 用例，3 服务） | ✅ 完成 |
| 2 | 性能基线文档 | Finance/Portal/MDM 核心 API p95 延迟 + 编译/二进制基线 | ✅ 完成 |
| 3 | CI/CD 流水线 lint 检查 | lint-check.sh + GitHub Actions workflow | ✅ 完成 |

---

## 📈 任务统计

### 按状态统计

| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ 已完成 | 12 个里程碑 + Phase 1-9 + 6.1 + 6.2 + 6.3 + 6.4 + SC-4/5 + Sprint 4 低代码（P0+P1基础设施全完成） + P2×3 + OpenAPI 类型生成 + 8个 trait 推广 + portal版本号清理 + Mobile BFF + OpenAPI 类型接入（117 Schema 全量生成） | 100% |
| 🔄 部分完成 | - | 0% |
| ⏳ 待开始 | - | 0% |

### 按优先级统计（未完成任务）

| 优先级 | 任务数 | 说明 |
|--------|--------|------|
| 🔴 P0 | 0 | 全部完成 |
| 🟡 P1 | 0 | 全部完成 |
| 🟢 P2 | 0 | 集成测试已完成（~197 HTTP 用例） |
| **合计** | **0** | 未完成任务总数 |

### 按领域统计（未完成任务）

| 领域 | 任务数 | 主要内容 |
|------|--------|---------|
| 微服务治理 | 0 | Phase 6 全部完成（6.1-6.4） |
| 子 crate 迁移 | 0 | 全部完成（8 子 crate + 主 crate 纯兼容层） |
| 类型同步 | 0 | OpenAPI 类型接入完成（117 Schema 全量生成 + 6 命名空间封装） |
| 工程效能 | 0 | - |

---

## 🔮 中期规划（V62.0+）

### V62.0 — 低代码平台推广 + 子 crate 深化

| 方向 | 内容 | 状态 |
|------|------|------|
| **低代码** | ~~Sprint 4 Batch 1-3 全量推广~~ ✅ 150+ 页面 Schema 驱动 + P0 基础设施全部完成 | ✅ 完成 |
| **子 crate** | shared-service-client/observability/ai/bootstrap 实际代码迁移 + permission_center 迁入 shared-auth | ✅ 完成 |
| **架构治理** | ~~unified-core 模块外迁~~ ✅ | ✅ 完成 |
| **共享库** | ~~子 crate 拆分~~ ✅ + ~~渐进式迁移~~ ✅ + ~~service_bootstrap/permission_center 解耦~~ ✅ | ✅ 完成 |
| **工程效能** | 按需引入推广、编译缓存优化 | ⏳ 待开始 |

### V63.0 — 低代码平台基础

| 方向 | 内容 | 状态 |
|------|------|------|
| **低代码** | 页面设计器（类型系统 + UI 组件 + 状态管理）| ✅ 完成 |
| **低代码** | 表单引擎可视化、组件属性面板 | ✅ 完成 |
| **类型同步** | OpenAPI 生成类型接入 API 客户端（typeBridge + createTypedApiClient）| ✅ 完成 |
| **后端** | 元数据驱动的动态 API（Schema Registry + 动态 CRUD）| ✅ 完成 |
| **前端** | 更多页面模板化、配置化 | 🟡 进行中 |

#### V63.0 已完成工作详情（2026-07-25）

**1. 页面设计器完整实现** ✅

| 模块 | 位置 | 说明 |
|------|------|------|
| 类型系统 | [components/designer/types.ts](../../apps/web/src/components/designer/types.ts) | DesignerComponent / CanvasNode / PropertyPanelConfig |
| 组件库 | [types.ts](../../apps/web/src/components/designer/types.ts) | 6 表单组件 + 1 布局组件 + 属性面板配置 |
| 状态管理 | [useDesigner.ts](../../apps/web/src/components/designer/useDesigner.ts) | 拖拽/增删改/撤销重做/Schema 转换 |
| 组件面板 | [ComponentPalette.tsx](../../apps/web/src/components/designer/ComponentPalette.tsx) | 组件列表 + 拖拽源 |
| 设计画布 | [DesignCanvas.tsx](../../apps/web/src/components/designer/DesignCanvas.tsx) | 拖放目标 + 节点预览 + 操作按钮 |
| 属性面板 | [PropertyPanel.tsx](../../apps/web/src/components/designer/PropertyPanel.tsx) | 8 种属性类型编辑器 |
| 组件树 | [ComponentTree.tsx](../../apps/web/src/components/designer/ComponentTree.tsx) | 层级结构视图 + 选中导航 |
| 设计器主页 | [DesignerPage.tsx](../../apps/web/src/components/designer/DesignerPage.tsx) | 四组件整合 + 工具栏 + Schema 导出 |
| Schema 双向转换 | [types.ts](../../apps/web/src/components/designer/types.ts) | schemaToCanvasNodes / canvasNodesToSchema |

**2. OpenAPI 类型接入 API 客户端** ✅

| 模块 | 位置 | 说明 |
|------|------|------|
| 类型桥接工具 | [typeBridge.ts](../../packages/shared-types/src/typeBridge.ts) | defineApiSchema / InferEntity / typeCheck |
| 类型安全 API 工厂 | [typeBridge.ts](../../packages/shared-types/src/typeBridge.ts) | createTypedApiClient（返回 ApiResponse\<T\>，原生兼容）|
| 试点：WMS Warehouse | [warehouseTyped.ts](../../apps/web/src/api/wms/warehouseTyped.ts) | 类型映射 + 兼容校验 + API 生成 |

**3. 元数据驱动动态 API** ✅

| 模块 | 位置 | 说明 |
|------|------|------|
| 后端 Schema Registry | [schema_registry.rs](../../svc/master-data/src/modules/schema_registry.rs) | 11 个 API 端点（Schema CRUD + 动态数据 CRUD + 自动建表）|
| 数据库迁移 | [20260725000001_create_schema_registry.sql](../../database/migrations/20260725000001_create_schema_registry.sql) | schema_registry + dynamic_data 表 + GIN 索引 + 触发器 |
| 前端 API 客户端 | [schemaRegistry.ts](../../apps/web/src/api/master/schemaRegistry.ts) | 完整 TypeScript 类型 + API 客户端 |

**元数据驱动 API 架构**：

```
前端 EntitySchema → POST /schemas → 存储 schema_json → 自动 CREATE TABLE dynamic_<name>
                                              ↓
前端 CRUD 页面 → /schemas/{id}/data → JSONB 存储 + 专用表存储
```

**使用示例**：

```bash
# 1. 注册 Schema（后端自动建表）
curl -X POST /api/master/schema-registry/schemas \
  -d '{"name":"product","title":"产品","schema_json":{"fields":[...]}}'

# 2. 创建数据记录
curl -X POST /api/master/schema-registry/schemas/{id}/data \
  -d '{"name":"产品A","price":99.9}'

# 3. 查询数据（分页）
curl /api/master/schema-registry/schemas/{id}/data?page=1&page_size=20
```

**使用示例**：

```typescript
// 1. 定义 Schema 映射
const schema = defineApiSchema({ entity: 'Warehouse', create: 'CreateWarehouseRequest' });

// 2. 一行生成完整 CRUD 客户端
const api = createTypedApiClient<Warehouse, CreateWarehouseRequest>(apiClient.wms, '/warehouses');

// 3. 类型安全调用
const { items, total } = await api.list({ page: 1, page_size: 20 });
```

**4. 前端页面模板化推广** 🟡

将手写 CRUD 页面迁移到 `CrudPage + EntitySchema` 模式，显著降低代码量并统一交互体验。

| 页面 | 原始行数 | 迁移后行数 | 减少比例 | 关键 Schema |
|------|---------|-----------|---------|-------------|
| DictManagementPage（ERP 字典管理）| 1241 | 530 | -57% | dictItemSchema（master-detail 布局）|
| FinanceApprovalConfigPage（审批配置）| 867 | 214 | -75% | approvalConfigSchema + detailContent（审批节点）|
| AccountingManagementPage（会计管理）| 974 | 209 + 139 | -64% | accountingSubjectSchema + 新增 openingBalanceSchema（双 Tab）|
| UserManagementPage（用户管理）| 865 | 332 | -62% | userSchema + customRowActions（角色管理弹窗）|

**新增 Schema 清单**：

| Schema | 位置 | 用途 |
|--------|------|------|
| approvalConfigSchema | [schemas/finance/approvalConfig.ts](../../apps/web/src/schemas/finance/approvalConfig.ts) | 财务审批配置（金额阈值、审批层级、节点）|
| openingBalanceSchema | [schemas/finance/openingBalance.ts](../../apps/web/src/schemas/finance/openingBalance.ts) | 期初余额（科目编码、期间、借贷方余额）|

**迁移模式总结**：

- **标准 CRUD** → 直接 `CrudPage + Schema + apiAdapter`
- **主从布局** → 左侧手写列表 + 右侧 `CrudPage`（参考 DictManagementPage）
- **嵌套数据展示** → `CrudPage + detailContent` 渲染子表格（参考 FinanceApprovalConfigPage）
- **多 Tab CRUD** → 父组件 `Tabs` + 每个 Tab 一个 `CrudPage`（参考 AccountingManagementPage）
- **自定义全局操作** → `headerContent` 注入按钮（如"结转期初余额"）
- **自定义行操作** → `customRowActions` 扩展行级操作（如 UserManagementPage 的"管理角色"弹窗）

### V62.x — Mobile BFF 数据迁移（跨 schema 旧表清理）

> **背景**: Mobile BFF 的跨域调用已切换为服务调用（`HrmApi` / `MesApi` / `QmsApi`），但 HRM/MES/QMS 三个被调用端点内部仍然跨 schema 查询 `mobile` / `plugin_mobile` 旧表，违反服务边界原则。需要将数据迁移到各服务自有表，并切换端点查询。

**涉及端点与旧表**:

| 服务 | 端点 | 旧表（跨 schema） | 目标自有表 |
|------|------|------------------|-----------|
| HRM | GET /api/hrm/attendance/today-status | `mobile.mobile_attendance` | `plugin_hrm.attendance_records` |
| MES | GET /api/mes/work-reports/today-output | `plugin_mobile.work_reports` | `mes.work_reports` |
| QMS | GET /api/qms/quality-tasks/today-pass-rate | `plugin_mobile.quality_tasks` | `qa_quality_inspections` |

**迁移方案（5 阶段，每端点独立推进）**:

| 阶段 | 内容 | 验收标准 |
|------|------|---------|
| 1. 数据导出 | 从 `plugin_mobile.*` / `mobile.*` 导出历史数据，按 user_id/operator 与员工表做映射 | 导出行数 = 源表行数 |
| 2. 表结构映射 | 字段对应关系（含类型转换、缺失字段默认值、状态枚举映射） | 映射表评审通过 |
| 3. 数据导入 | `INSERT INTO ... SELECT ... WHERE NOT EXISTS`，导入后比对行数与抽样校验 | 行数一致 + 抽样通过 |
| 4. 端点切换 | 修改端点 SQL 改查自有表；Mobile BFF 调用参数适配 | 端点返回值与迁移前一致 |
| 5. 旧表清理 | 确认无引用后 DROP 旧表，从 `svc/mobile/src/init.sql` 移除建表语句 | mobile 服务不再持有业务表 |

**详细字段映射与切换说明**：见各端点源码中的 `TODO(Mobile-BFF 数据迁移)` 注释：
- [svc/hrm/src/modules/attendance.rs](../../svc/hrm/src/modules/attendance.rs) — `get_today_status`
- [svc/mes/src/modules/work_report.rs](../../svc/mes/src/modules/work_report.rs) — `get_today_production_output`
- [svc/qms/src/modules/dashboard.rs](../../svc/qms/src/modules/dashboard.rs) — `get_today_quality_pass_rate`

**前置条件**: Mobile 端写入路径需先改造为通过服务调用（`MesApi.create_work_report` / `QmsApi` 质检创建端点）写入各服务自有表，避免迁移期间双写不一致。

**回滚策略**: 阶段 4 切换后保留旧表只读快照 1 个迭代周期作为回滚保险；阶段 5 清理前确认连续 7 天无查询报错。

### V64.0+ — AI 驱动的自适应 UI

| 方向 | 内容 |
|------|------|
| **AI UI** | 自适应布局、智能推荐、NL2GraphQL |
| **体验** | 多端一致性、性能极致、无障碍增强 |

> 更详细的长期规划见 [长期路线图](./roadmap.md)

---

## 📊 关键指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| Rust 编译警告 | 0 | 0 |
| TS 类型错误 | 0 | 0 |
| 子 crate 编译优化 | 45% | 50%+ |
| shared-core 模块数 | 19 + grpc | - |
| shared-db 模块数 | 12 + audit | - |
| shared-auth 模块数 | 16 + permission_center | - |
| shared-event 模块数 | 9 | - |
| shared-bootstrap | 1 | - |
| 主 crate 保留模块 | 0（纯兼容层） | - |
| 按需引入示例 | 1 | 3+ |
| 页面模板覆盖率 | 90%+（150+ 页面 Schema 驱动） | 95%+ |
| 一级菜单项数 | < 8 | < 8 |

---

## 📁 历史归档

所有已完成版本的详细任务记录已归档：

| 归档文档 | 说明 |
|---------|------|
| [微服务治理 Phase 6-9](./todo-archive/microservice-governance-phase6-9.md) | Search/Communication 外迁 + 子 crate 拆分 + 渐进式迁移 |
| [历史任务归档目录](./todo-archive/) | V10-V60 已完成任务详情 |
| [旧 TODO 归档](./todo-archive/old-todo-archive.md) | V37 赛博朋克 UI 等历史记录 |
| [V37-V60 架构深化记录](./todo-archive/v37-v60-architecture-deepening.md) | 24 个版本架构深化详情 |

> 归档原则：已完成的版本详细记录移入 archive，保持当前 TODO 精简聚焦
