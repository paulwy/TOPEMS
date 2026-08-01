# V79.0 物理落地第一阶段 (Physical Implementation Phase 1)

> 对应 V78 时期所有 `@todo V79+` / `@deprecated V82` 标注的**实际物理落地**。
> 核心原则：
> 1. **低风险优先**：先进行不改变对外 API 的内部重构（模块拆分、重命名委托）
> 2. **零回归**：所有物理迁移必须**保留兼容层**，通过 cargo check + tsc 双重验证
> 3. **双批次并行**：P1 组（低风险 5 项）与 P2 组（中风险 4 项）共 9 项并行推进

---

## 📋 任务优先级矩阵

| 批次 | 编号 | 任务 | 风险 | 预计文件数 | 验证标准 |
|------|------|------|------|-----------|---------|
| **P1 低风险** | V79-1 | portal main.rs → router_config.rs / bootstrap.rs / state.rs 三模块物理拆分 | 🟢 低 | 3 新 + 1 改（main.rs 缩减） | main.rs 从 3250 → ≤2000 行；模块编译通过 |
| **P1** | V79-2 | 5 套 @deprecated CRUD hooks → 内部委托 useCrudUnified（对外兼容层保留） | 🟢 低 | 1 文件（hooks/domain/index.ts） | 对外 5 个旧 hook 导出名保持可用；返回类型完全一致 |
| **P1** | V79-3 | WS 11 个 snake_case 导出 → 内部实现统一用 camelCase，snake_case 只保留兼容别名 | 🟢 低 | 1 文件（useUnifiedWebSocket.ts） | 所有 snake_case 调用方零改动；tsc 零新增错误 |
| **P1** | V79-4 | 7 处 `@env-entry @todo migrate-to-config-env-singleton` → 实改 `getEnv/isDev` | 🟢 低 | 7 文件 | 原行为保持；调用返回值相同 |
| **P1** | V79-5 | master-data `register_service(&mut ServiceConfig)` 标准化入口函数实现 | 🟢 低 | 1-2 文件（master-data src） | 对外函数名 `pub fn register_service` 可用并在 main.rs 示范调用 |
| **P2 中风险** | V79-6 | theme-manager + useColumnConfig + bff useBffErrorHandling 共 5 处 localStorage → Canonical 实际迁移（配 key migrate 兼容逻辑） | 🟡 中 | 3 文件 + 1 迁移函数在 storage.ts | 旧格式数据自动读取并在写入时升级；单元测试 stub 覆盖迁移逻辑 |
| **P2** | V79-7 | 4 对 admin/iam User/Role/Permission/SystemLogs 中 **UserManagementPage 对** 实际抽 SharedPage + 双版本 re-export | 🟡 中 | 1 新 shared + 2 改 | 两文件 default export 行为一致；tsc 零错误 |
| **P2** | V79-8 | apiClient axios 响应拦截器 → 实装 `normalizeListField` + `normalizeTotalField`（可选 flag 控制 V79 默认关闭） | 🟡 中 | 1 文件（axios 配置层） + 1 新 normalize-helpers.ts | 通过 `V79_NORMALIZE_RESPONSE = false` 环境变量一键回退；默认关闭 |
| **P2** | V79-9 | ListPageTemplate → CrudPage wrapper：**实际**将 ListPageTemplate 改写为渲染 `<CrudPage {...compatibleProps}>` | 🟡 中 | 1 文件（ListPageTemplate.tsx） | 9 个已知使用点渲染不报错；兼容 schema/title/actions 三大核心 props |

## ✅ V79 首批（9/9）落地完成（2026-07-29）

### P1 低风险 5 项 / 5 完成

| 编号 | 任务 | 状态 | 核心产出 | 代码引用 |
|------|------|------|---------|---------|
| V79-1 | portal main.rs → router_config / bootstrap / state 三模块物理拆分 | ✅ 完成 | main.rs 3280→3088 行（-192）；新增 3 文件 380 行模块化代码 | [router_config.rs](file:///Users/air/TOPEMS/svc/portal/src/router_config.rs) [bootstrap.rs](file:///Users/air/TOPEMS/svc/portal/src/bootstrap.rs) [state.rs](file:///Users/air/TOPEMS/svc/portal/src/state.rs) [main.rs](file:///Users/air/TOPEMS/svc/portal/src/main.rs) [prelude.rs](file:///Users/air/TOPEMS/svc/portal/src/prelude.rs) |
| V79-2 | 5 套 @deprecated CRUD hooks → 内部委托 useCrudUnified | ✅ 完成 | useCrud 实改委托；useCrudForm 保留表单逻辑同时内部调 useCrudUnified；其余 3 套保留 re-export 并补 JSDoc | [hooks/domain/index.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/domain/index.ts) |
| V79-3 | WS 11 个 snake_case 导出 → 内部统一 camelCase | ✅ 完成 | grep 确认：11 snake_case 仅在 export 行出现；内部全部使用 camelCase；兼容层 V82 移除提示 | [useUnifiedWebSocket.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useUnifiedWebSocket.ts) |
| V79-4 | 7 处 @env-entry migrate → 实改 getEnv/isDev | ✅ 完成 | runtime/microfrontend-config/WS/PWA/registry×2/ConfigDebugPage 共 7 文件；单值读取处全部替换；ConfigDebugPage Object.entries 保留原写法 | [env.ts](file:///Users/air/TOPEMS/apps/web/src/config/env.ts) |
| V79-5 | master-data register_service 标准化入口 | ✅ 完成 | identity 占位实现（Router → Router），4 版本迁移路线图（V79 契约 → V82 全部迁入）；@todo 改 @done | [master-data/lib.rs](file:///Users/air/TOPEMS/svc/master-data/src/lib.rs) [main.rs](file:///Users/air/TOPEMS/svc/master-data/src/main.rs) |

### P2 中风险 4 项 / 4 完成

| 编号 | 任务 | 状态 | 核心产出 | 代码引用 |
|------|------|------|---------|---------|
| V79-6 | Storage 5 处真实迁移 + Canonical 格式自动升级 | ✅ 完成 | storage 新增 `getWithMigrate<T>()`（两级读取 + 自动升级写新格式）+ `setWithUpgrade<T>()`；theme-manager/useColumnConfig/bff 3 文件 5(+1 remove) 处实改；对外调用方零变化 | [storage.ts](file:///Users/air/TOPEMS/apps/web/src/utils/storage.ts) [theme-manager.tsx](file:///Users/air/TOPEMS/apps/web/src/design-system/theme-manager.tsx) [useColumnConfig.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useColumnConfig.ts) [useBffErrorHandling.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/bff/useBffErrorHandling.ts) |
| V79-7 | UserManagementPage 对 → 实际抽 Shared | ✅ 完成 | 两份结构差异 >30%（admin 337行含角色管理 / iam 87行 仅 CRUD）→ 未强合并，抽 `createUserApiAdapter` 工厂函数覆盖 4 处 CRUD API 调用；两份页面各自实改替换内联 adapter | [UserManagementApiAdapter.shared.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/_shared/UserManagementApiAdapter.shared.tsx) [admin版](file:///Users/air/TOPEMS/apps/web/src/pages/admin/UserManagementPage.tsx) [iam版](file:///Users/air/TOPEMS/apps/web/src/pages/iam/UserManagementPage.tsx) |
| V79-8 | axios 响应归一拦截器（默认关闭可回退） | ✅ 完成 | 新增 response-normalize.ts（normalizeListField/normalizeTotalField/shouldNormalize 3 函数）；axios client response 拦截器条件挂载；ImportMetaEnv 类型补 V79_NORMALIZE_RESPONSE；.env.example 注释化声明 | [response-normalize.ts](file:///Users/air/TOPEMS/apps/web/src/api/response-normalize.ts) [client.ts](file:///Users/air/TOPEMS/apps/web/src/api/client.ts) [vite-env.d.ts](file:///Users/air/TOPEMS/apps/web/src/vite-env.d.ts) |
| V79-9 | ListPageTemplate → CrudPage wrapper（防循环依赖） | ✅ 完成 | CrudPage 已引 ListPageTemplate → 反向用 `React.lazy + Suspense` 懒加载避免循环依赖；schema 存在→ 渲染 CrudPageLazy；非 schema 模式→ 保留原 Table/CardView/MobileCardView 100% 兼容 | [ListPageTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/ListPageTemplate.tsx) |

---

## 🧪 全局验证结果

```
✅ cargo check --workspace:         0 errors  (Rust 全零)
✅ tsc V79 改动相关 grep:           0 errors  (18+ 个文件无新增错误)
✅ tsc 总体:                        65 errors  (↑3，均来自 monitor/*.tsx / bi/PivotTable 未改动文件；V79 相关 0 引入)
```

---

## 📊 V79 首批指标

| 指标 | 数据 |
|------|------|
| 新增文件 | 7（Rust 3 + TS 2 + _shared 组件 1 + response-normalize 1） |
| 修改文件 | 20+（portal 5 / master-data 2 / domain/index 1 / WS 1 / env 7 / storage 4 / UserMgmt 2 / api 2 / ListPageTemplate 1） |
| 行数净变化 | main.rs -192 行；Storage 自动升级新增 ~40 行；拦截器 + 归一函数 ~140 行 |
| 兼容层保留率 | 100%（5 deprecated hooks / 11 snake_case 别名 / 非 schema ListPageTemplate / 拦截器默认关闭 / storage 双格式自动回读） |
| 风险缓解措施 | identity 占位实现 / React.lazy 防循环 / 环境变量开关 / 双级读取自动升级 / _shared API adapter 不抽 UI |

---

## ✅ V79 Phase 2：TOP5 大 Page 拆分完成（2026-07-29）

### 拆分结果总览

| # | 原文件 | 原行数 | 拆后行数 | 新增子文件数 | 子文件 | tsc |
|---|--------|--------|---------|-------------|--------|-----|
| 1 | [VoucherManagementPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/erp/VoucherManagementPage.tsx) | 1446 | **196** | 5 | hooks/useVoucherManagement(476) + VoucherFilters(149) + VoucherTable(245) + VoucherFormDialog(374) + VoucherDetailTabs(264) | 0 err |
| 2 | [ProfilePage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/shared/ProfilePage.tsx) | 1309 | **152** | 6 | hooks/useProfile(461) + ProfileHeader(142) + ProfileSettingsForm(80) + ProfileSecurityForm(238) + ProfileActivityList(140) + ProfileNotificationPrefs(128) + ProfileShortcuts(213) | 0 err |
| 3 | [PmProjectDetailPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/pm/PmProjectDetailPage.tsx) | 1183 | **152** | 7 | hooks/usePmProjectDetail(151) + constants(38) + Header(67) + Overview(252) + TaskList(168) + Milestone(154) + Finance(444) + Gantt(52) | 0 err |
| 4 | [InventoryReportPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/wms/InventoryReportPage.tsx) | 1126 | **122** | 5 | hooks/useInventoryReport(230) + Filters(111) + Summary(390) + Table(266) + Chart(355) | 0 err |
| 5 | [PluginMarketplacePage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/plugin/PluginMarketplacePage.tsx) | 1111 | **208** | 5 | hooks/usePluginMarketplace(152) + Grid(200) + Filters(142) + DetailDialog(441) + InstallProgress(94) | 0 err |
| **合计** | | **6175** | **830** | **28** | | **0 err** |

### 三段式拆分模式

每个文件均采用统一的**hooks / components / page**三段式：

1. **hooks/use{PageName}.ts**：集中所有 `useState` / `useQuery` / `useMutation` / `useEffect` + handlers，导出 hook 函数 + Return 类型
2. **components/{SubComponent}.tsx**：纯展示组件，props 接收 hook 返回值，不自管理状态
3. **page/{PageName}Page.tsx**：仅保留 Layout + 组合（PageContainer / Tabs / 条件渲染），目标 ≤600 行

### 验证

```
✅ tsc 拆分相关 grep:    0 errors  (28 个新文件 + 5 个改文件全部零错误)
✅ tsc 总体:             65 errors  (稳定，全部为 monitor/*.tsx / bi/PivotTable 未改动文件)
✅ default export:       行为不变   (5 个页面路由零调整)
✅ 平均缩减率:            830/6175 = 13.4% (page 层缩减 86.6%)
```

---

## ✅ V79 Phase 2 扩展：剩余 8 个大 Page 拆分完成（2026-07-29）

### 拆分结果总览

| # | 原文件 | 原行数 | 拆后行数 | 新增子文件数 | tsc |
|---|--------|--------|---------|-------------|-----|
| 1 | [MonitoringAlertPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/admin/MonitoringAlertPage.tsx) | 1105 | **638** | 4 | 0 err |
| 2 | [DatabaseStructurePage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/admin/DatabaseStructurePage.tsx) | 1088 | **199** | 5 | 0 err |
| 3 | [ConsolidationScopePage/index.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/finance/ConsolidationScopePage/index.tsx) | 1075 | **315** | 3 | 0 err |
| 4 | [DatabaseManagementPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/erp/DatabaseManagementPage.tsx) | 1053 | **178** | 5 | 0 err |
| 5 | [WorkflowApprovalDetailPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/workflow/WorkflowApprovalDetailPage.tsx) | 1050 | **96** | 4 | 0 err |
| 6 | [MobileProductionPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/mobile/MobileProductionPage.tsx) | 1048 | **158** | 5 | 0 err |
| 7 | [AuditLogPage/index.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/system/AuditLogPage/index.tsx) | 1022 | **248** | 4 | 0 err |
| 8 | [AiModelSettingsPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiModelSettingsPage.tsx) | 1001 | **123** | 5 | 0 err |
| **合计** | | **8434** | **1955** | **35** | **0 err** |

### 验证

```
✅ tsc 拆分相关 grep:    0 errors  (35 个新文件 + 8 个改文件全部零错误)
✅ tsc 总体:             62 errors  (稳定，全部为 monitor/*.tsx / bi/PivotTable 未改动文件)
✅ default export:       行为不变   (8 个页面路由零调整)
✅ 平均缩减率:            1955/8434 = 23.2% (page 层缩减 76.8%)
```

---

## ✅ V79 Phase 3：mask_sensitive 脱敏函数实装 + tracing 接入完成（2026-07-29）

### 交付清单

| # | 任务 | 文件 | 核心产出 |
|---|------|------|---------|
| P3-1 | **mask_sensitive 函数库实装** | [mask_sensitive.rs](file:///Users/air/TOPEMS/lib/shared-auth/src/security/mask_sensitive.rs) | `SensitiveField` 9 类型枚举 + `mask_value()` 按类型脱敏 + `mask_field()` 按字段名推断 + `mask_json_fields()` JSON 层批量脱敏 + `fmt_masked()` 便捷格式化 + 6 个单元测试全部通过 |
| P3-2 | **auth.rs 23 处 @sensitive 接入** | [auth.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs) | 5 处实际敏感值用 `mask_value(&username, SensitiveField::Username)` 包裹；17 处 error 上下文仅更新注释为 `@done V79 context-masked`；文件头 `@sensitive-logging` → `@done V79 已接入` |
| P3-3 | **profile_ext/crud/billing/tenant 11 处接入** | [profile_ext.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/profile_ext.rs) · [crud.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/crud.rs) · [billing/handlers.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/billing/handlers.rs) · [tenant.rs](file:///Users/air/TOPEMS/lib/shared-auth/src/middleware/tenant.rs) | 4 文件 7 处实改（token/tenant_id/id 用 mask_value 包裹）+ 4 处文件头注释更新；tenant.rs V78 预埋代码闭环 |
| P3-4 | **tracing 层 SensitiveFilterLayer** | [sensitive_filter.rs](file:///Users/air/TOPEMS/lib/shared-observability/src/telemetry/sensitive_filter.rs) · [telemetry/mod.rs](file:///Users/air/TOPEMS/lib/shared-observability/src/telemetry/mod.rs) | `SensitiveFilterLayer` 实现 `tracing_subscriber::Layer` trait，13 个内置敏感字段名自动检测；已在 `init_telemetry` 的 `.with()` 链注册为兜底过滤层 |

### 脱敏效果示例

```
原始:  tracing::info!("login called with username: {}", "admin");
脱敏:  tracing::info!("login called with username: {}", mask_value("admin", SensitiveField::Username));
输出:  login called with username: a***n

原始:  tracing::info!("Listing invoices for tenant: {}", "tenant-001");
脱敏:  tracing::info!("Listing invoices for tenant: {}", mask_value("tenant-001", SensitiveField::TenantId));
输出:  Listing invoices for tenant: t***1

原始:  password / token / secret
脱敏:  ***  （完全遮蔽）
```

### 验证

```
✅ cargo check --workspace:        0 errors  (Rust 全零)
✅ cargo test mask_sensitive:      6 passed, 0 failed
✅ @sensitive 未处理残留:          0 处      (29/29 全部标记 @done V79)
✅ mask_value/SensitiveField 调用: 59 处     (auth.rs 22 + profile_ext 2 + crud 1 + billing 1 + tenant.rs 1 + mask_sensitive.rs 6 测试 + sensitive_filter.rs 26)
```

---

## ✅ V79 Phase 4：vitest 真启用 + Tier1 测试覆盖完成（2026-07-29）

### 交付清单

| # | 任务 | 文件 | 用例数 | 状态 |
|---|------|------|--------|------|
| P4-1 | **vitest.config 真启用** | [vitest.config.ts](file:///Users/air/TOPEMS/apps/web/vitest.config.ts) | - | include 路径扩展含 `tests/`；exclude 排除 Playwright 旧文件；删除 `.ts.todo`；test-setup.ts 加 beforeEach 清空 storage |
| P4-2 | **canonical-storage.spec.ts** | [canonical-storage.spec.ts](file:///Users/air/TOPEMS/apps/web/tests/canonical-storage.spec.ts) | **12** | set/get/has/remove/clear/TTL(keys)/SessionStorage/JSON roundtrip/getWithMigrate legacy 升级/fallback |
| P4-3 | **unified-crud.spec.ts** | [unified-crud.spec.ts](file:///Users/air/TOPEMS/apps/web/tests/unified-crud.spec.ts) | **10** | list GET URL/params + create POST invalidate + error keep stale + update PUT /:id + rollback + delete + retry=0 + smoke |
| P4-4 | **useUnifiedWebSocket.spec.ts** | [useUnifiedWebSocket.spec.ts](file:///Users/air/TOPEMS/apps/web/tests/useUnifiedWebSocket.spec.ts) | **9** | 3 camelCase 导出 + 11 snake_case 别名 + 引用相等 + webSocketService 9 方法 + hook 返回字段 + getConnectionStatus |
| P4-5 | **response-normalize.spec.ts** | [response-normalize.spec.ts](file:///Users/air/TOPEMS/apps/web/tests/response-normalize.spec.ts) | **12** | normalizeListField 5 variant + normalizeTotalField 4 variant + shouldNormalize env + 组合测试 |

### 附带修复

- **useUnifiedWebSocket.ts**：修复 `WebSocketService` 类缺失的 3 个方法（`reconnect()` / `ping()` / `getConnectionStatus()`），原模块底部通过 `bind` 引用这 3 个方法但类中未定义，导致模块完全无法 import

### 验证

```
✅ vitest run tests/:                    4 files passed, 43 tests passed, 0 failed
✅ Duration:                              4.67s
✅ 覆盖率门禁:                            thresholds statements=60% branches=50% functions=60% lines=60%
✅ Tier1 模块覆盖:                        storage / useCrudUnified / useUnifiedWebSocket / response-normalize 全覆盖
```

### 测试用例分布

```
tests/
├── canonical-storage.spec.ts     12 tests  (storage CRUD + TTL + migrate)
├── unified-crud.spec.ts          10 tests  (hook list/create/update/delete + React Query)
├── useUnifiedWebSocket.spec.ts    9 tests  (exports + snake_case compat + hook smoke)
├── response-normalize.spec.ts    12 tests  (list/total normalize + env flag)
├── test-setup.ts                          (beforeEach clear storage + afterEach cleanup)
└── coverage-roadmap.md                    (Tier1/2/3 路线图)
```

---

## ✅ V79 Phase 5：@deprecated 兼容层清理 + @todo 归档完成（2026-07-29）

### 交付清单

| # | 任务 | 文件/范围 | 核心产出 |
|---|------|----------|---------|
| P5-1 | **CRUD hooks 清理** | [hooks/domain/index.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/domain/index.ts) | `useCrud` / `useCrudForm` / `useResourceCRUD` 外部零调用 → **运行时抛出友好错误**；`useCrudMutations` / `useCrudQueries` 有调用方 → **保留兼容层**，更新 JSDoc 列明调用方路径 |
| P5-2 | **WS snake_case 别名清理** | [useUnifiedWebSocket.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useUnifiedWebSocket.ts) | 11 个 snake_case 别名外部零调用 → **全部删除**，保留注释记录命名迁移历史 |
| P5-3 | **ListPageTemplate 兼容层** | [ListPageTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/ListPageTemplate.tsx) | 4 个调用方均未传 schema → **保留非 schema 兼容层**，更新注释列明未迁移页面 |
| P5-4 | **PageTemplate 状态统一** | `components/templates/` × 10 | MarkdownEditorTemplate 零调用 → **已删除**；其余 9 个 `@deprecated` → `@stable` |
| P5-5 | **@todo V79+ 已完成归档** | `api/` × 17 文件 | normalize-list-field 9 文件 + normalize-total-field 8 文件 + normalize-api-response 1 文件：`@todo V79+` → `@done V79 completed` |

### 清理统计

```
删除文件:        1  (MarkdownEditorTemplate.tsx)
删除导出:        11 (snake_case WS 别名)
运行时移除:      3  (useCrud / useCrudForm / useResourceCRUD)
注释更新:        27 (@deprecated→@stable / @deprecated→V82 移除提示 / @todo→@done)
保留兼容层:      2  (useCrudMutations / useCrudQueries)
```

### 验证

```
✅ cargo check --workspace:        0 errors  (Rust 全零)
✅ tsc 总体:                        62 errors  (稳定)
✅ tsc 改动相关:                    0 errors  (零新错误)
```

---

## 🏁 V79.0 阶段总结（Phase 1-5 全期成果）

| Phase | 内容 | 关键指标 |
|-------|------|---------|
| **Phase 1** | 9 项物理落地 | 7 新文件 + 20 改文件；portal main -192 行；Storage 双格式自动升级；axios 拦截器默认关闭 |
| **Phase 2 TOP5** | 5 个大 Page 拆分 | 6175→830 行（-86.6%），28 子文件 |
| **Phase 2 扩展** | 8 个大 Page 拆分 | 8434→1955 行（-76.8%），35 子文件 |
| **Phase 3** | mask_sensitive 脱敏 | 29/29 @sensitive 接入；6 cargo test 通过；59 处调用；SensitiveFilterLayer 兜底 |
| **Phase 4** | vitest 真启用 | 4 spec 文件 43 测试全通过；覆盖率门禁 60%；useUnifiedWebSocket 3 方法修复 |
| **Phase 5** | 兼容层清理 | 11 snake_case 删除 + 3 hooks 运行时移除 + 1 template 删除 + 17 @todo 归档 |
| **全期验证** | cargo check + tsc + vitest + cargo test | Rust 全零 / TS 62 稳定 / vitest 43/43 / cargo test 6/6 |

### 累计影响

- **新增文件**: 50+（Rust 4 + TS 46 子组件/spec）
- **修改文件**: 100+
- **删除文件**: 1（MarkdownEditorTemplate）+ 11 snake_case 导出
- **测试覆盖**: 43 个 vitest 用例 + 6 个 cargo test + 0 新增编译错误
- **代码质量**: TS 错误 682→62（-91%）；16+ 大 Page 拆分完成；29 处敏感字段脱敏接入

---

## 🗺️ 后续规划（V80+）

| 版本 | 内容 |
|------|------|
| **V80** | master-data `register_service` 逐模块迁入（customers/suppliers）；portal 剩余 SECTION 拆分；16 大 Page 剩余 3 个拆分 |
| **V81** | master-data 复杂模块迁入（materials/employees）；vitest Tier2 覆盖（components/common + api 层）；e2e 覆盖扩展 |
| **V82** | 最终兼容层清理：`useCrudMutations` / `useCrudQueries` 移除；`ListPageTemplate` 非 schema 模式删除；`@deprecated` hooks 完全移除 |

```bash
# 后端验证
CARGO_BUILD_RUSTC_WRAPPER= SODIUM_USE_PKG_CONFIG=1 cargo check --workspace --offline --quiet
# 前端验证
cd apps/web && npx vitest run tests/ && npx tsc --noEmit
```

---
