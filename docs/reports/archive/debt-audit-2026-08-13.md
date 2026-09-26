# TOPEMS 技术债审计报告

> 审计日期：2026-08-13  
> 审计范围：`apps/web/src/**/*.{ts,tsx}` + `svc/**/*.rs` + `lib/**/*.rs`  
> 排除项：`node_modules/`、`target/`、`__tests__/`、`*.d.ts`、`build.rs`（println! 构建脚本除外）

---

## 一、总览

### 1.1 显式技术债注释（TODO / FIXME / HACK / XXX）

| 维度 | 后端 (Rust) | 前端 (TypeScript) | 合计 |
|------|------------|------------------|------|
| TODO | 29 | 36 | **65** |
| FIXME | 0 | 0 | **0** |
| HACK | 0 | 0 | **0** |
| XXX（注释占位） | 27 | 42 | **69** |
| **原始 grep 总数** | **320** | **368** | **688** |
| **真实技术债注释数（去模板后）** | **~22** | **~18** | **~40** |

> ⚠️ **真实技术债 ≪ grep 原始计数**：原始 grep 命中中大量是误匹配：
> - 后端 27 处 `XXX` 全部是 `schema_defense.rs` / `bootstrap.rs` 文档模板里的 `CREATE TABLE IF NOT EXISTS xxx` 示例，**不是债**
> - 前端 42 处 `XXX` 中 30+ 处是 `modules/*/config.ts` 的模板占位、`crudPageAdapter.ts` 的 `xxxAdapter` 示例、或 webhook placeholder，**不是债**
> - 前端 36 处 `TODO` 中约一半是 `hooks/bff/*` 里的文档注释中的 `todos` 字段示例，**不是债**

### 1.2 隐式技术债（代码坏味道）

| 坏味道 | 数量 | 高风险 |
|--------|------|--------|
| 后端 `.unwrap()` 生产代码残留 | **235** | portal 20 + shared-event 36 + erp 28 |
| 后端 `.unwrap()` 含测试 | 707 | 其中 ~472 在测试中 |
| 后端 `println!` 生产代码残留 | **~15** | 仅 build.rs + 1 处 debug 输出 |
| 前端 `any` / `as any` | **239** | 微前端层 + 业务页面 |
| 前端 `any` 热点文件 | 50+ | sandbox/event-isolation.ts 25 + js-sandbox.ts 16 |

---

## 二、按类型明细

### 2.1 后端：TODO 注释（29 处）

| # | 文件 | 模块 | 内容摘要 |
|---|------|------|---------|
| 1 | `svc/monitor/src/main.rs:76` | monitor | TODO: 后续补齐 `monitor_plugin::auto_register_to_core` 调用 |
| 2 | `svc/portal/src/handlers.rs:25` | portal | @todo V81+ 接入 `get_uptime()`（健康检查 uptime 字段为 None） |
| 3 | `svc/portal/src/router_config.rs:71` | portal | `// Todos` — 路由层待补 |
| 4–7 | `svc/portal/src/modules/graphql_schema.rs:10,980,1004` | portal | GraphQL Schema 文档 + N+1 问题注释（设计说明，非执行 TODO） |
| 8–9 | `svc/mes/src/modules/work_report.rs:173,213` | mes | TODO(Mobile-BFF 数据迁移): 跨 schema 查询旧表待迁移 |
| 10–12 | `svc/mes/src/modules/work_report.rs:1058,1091,1123` | mes | TODO: 审批转换（rejected → reworking）+ audit log |
| 13–15 | `svc/mes/src/modules/production_order.rs:1249,1281,1312` | mes | TODO: 审批转换 + audit log |
| 16–18 | `svc/mes/src/modules/anomaly_detection.rs:1153,1186,1218` | mes | TODO: 审批转换（acknowledged → handling）+ audit log |
| 19–21 | `svc/mes/src/modules/quality_management/inspection.rs:640,677,713` | mes | TODO: 审批转换（failed → concession_received）+ audit log |
| 22–23 | `svc/hrm/src/modules/attendance.rs:41,78` | hrm | TODO(Mobile-BFF 数据迁移): 跨 schema 查询旧表待迁移 |
| 24 | `svc/ai/src/modules/code_assistant.rs:97` | ai | AI 生成代码模板里的 `// TODO: Implement based on the prompt` |
| 25–26 | `svc/qms/src/modules/dashboard.rs:26,70` | qms | TODO(Mobile-BFF 数据迁移): 跨 schema 查询旧表待迁移 |
| 27 | `svc/plugin-registry/src/modules/plugin/mod.rs:16` | plugin-registry | TODO: 从 unified-core 迁移 marketplace/tenant/runtime/dev/reviews 路由 |
| 28 | `svc/plugin-registry/src/modules/plugin/mod.rs:17` | plugin-registry | TODO: 补齐 `require_permission("plugin:read"/"plugin:write")` 细粒度鉴权 |
| 29 | `lib/shared-service-client/src/service_client/qms_client.rs:56` | shared-client | TODO(数据归属迁移): 直连 `plugin_mobile.quality_tasks` |
| 30 | `lib/shared-service-client/src/service_client/mes_client.rs:50` | shared-client | TODO(数据归属迁移): 直连 `plugin_mobile.work_reports` |

### 2.2 前端：TODO 注释（36 处，真实 ~18 处）

| 真实 | 文件 | 模块 | 内容摘要 |
|------|------|------|---------|
| ✅ | `apps/web/src/api/hrm/employee.ts:48` | api/hrm | TODO: V72 A4-5 重生成 schema 后切换为 `TypedPaginatedResponse<Employee>` |
| ✅ | `apps/web/src/api/hrm/employee.ts:66` | api/hrm | TODO: V72 A4-5 后补 schema（保留 `Partial<Employee>`） |
| ✅ | `apps/web/src/config/env.ts:8` | config | @todo V79+ 环境变量 |
| ✅ | `apps/web/src/utils/a2ui/smart-code-reviewer.ts:860` | utils | TODO 计数 |
| ✅ | `apps/web/src/pages/_shared/UserManagementApiAdapter.shared.tsx:6` | pages | @todo Phase 2 - full merge |
| ✅ | `apps/web/src/debug/DebugOverlay.tsx:35` | debug | @todo V81+ 接入真实 API 计数器（axios interceptor counter） |
| ✅ | `apps/web/src/utils/graphql-performance.ts:31` | utils | GraphQL mutation 注释 |
| ✅ | `apps/web/src/utils/zerocode/auto-doc-generator.ts:12,14` | utils | auto-doc-generator 使用示例 |
| ✅ | `apps/web/src/utils/zerocode/index.ts:10` | utils | re-export 注释 |
| ✅ | `apps/web/src/utils/ai/test-generator.ts:774` | utils | 生成测试中的 `// TODO: 实现测试逻辑`（运行时字符串，非技术债） |
| ✅ | `apps/web/src/schema/crudPageAdapter.ts:5` | schema | XXX: `xxxAdapter` 注释（文档说明，非执行 TODO） |
| ❌（误） | `hooks/bff/*` 14 处 | hooks | 文档注释里的 `todos` 字段示例，不是 TODO |
| ❌（误） | `components/dashboard/HybridDashboard.tsx` 2 处 | components | `Todo List Column` 是 UI 组件名注释 |
| ❌（误） | `api/bff/index.ts:249,317` 2 处 | api/bff | GraphQL 查询里的 `todos { ... }` 字段名 |
| ❌（误） | `api/im/taskSync.ts:12–15` 4 处 | api/im | REST 路由 `/task-sync/todos` 文档 |
| ❌（误） | `pages/shared/hooks/useDashboardData.tsx:7,10` 2 处 | pages | 文档注释里的 `todos` 字段 |

---

## 三、按模块分布

### 3.1 后端模块 × 注释数量

| 模块 | TODO | XXX（文档模板） | 真实债数 |
|------|------|----------------|---------|
| **svc/mes** | 14 | 0 | **14** |
| **svc/portal** | 6 | 0 | **6** |
| **svc/unified-core** | 0 | 4 | 0 |
| **svc/hrm** | 2 | 0 | **2** |
| **svc/plugin-registry** | 2 | 0 | **2** |
| **lib/shared-service-client** | 2 | 0 | **2** |
| **svc/qms** | 2 | 0 | **2** |
| **svc/monitor** | 1 | 0 | **1** |
| **svc/ai** | 1 | 0 | **1** |
| svc/pm | 0 | 2 | 0 |
| svc/crm | 0 | 2 | 0 |
| svc/ehs | 0 | 1 | 0 |
| lib/shared-bootstrap | 0 | 3 | 0 |
| svc/*（schema_defense 模板） | 0 | ~15 | 0 |

### 3.2 前端模块 × 注释数量

| 模块 | 注释数 | 真实债数 |
|------|--------|---------|
| **hooks/bff** | 14 | 0（全是文档示例） |
| **utils** | 6 | **4** |
| **microfrontend/runtime** | 5 | 0（全是 cross-framework 事件说明） |
| **api/im** | 4 | 0（REST 路由文档） |
| **api/hrm** | 2 | **2** |
| **api/bff** | 2 | 0 |
| **api/automation** | 2 | 0 |
| **pages/monitor** | 2 | 0 |
| **pages/shared** | 2 | 0 |
| **config** | 1 | **1** |
| **debug** | 1 | **1** |
| **pages/_shared** | 1 | **1** |
| **components/dashboard** | 2 | 0 |
| modules/*（30+ config.ts） | 1 per module | 0（模板） |

### 3.3 后端生产 unwrap() 模块排名（TOP 15）

| 模块 | 生产 unwrap() | 严重度 |
|------|-------------|--------|
| lib/shared-event | 36 | 🟠 共享层，影响面广 |
| svc/erp | 28 | 🟠 业务核心 |
| svc/portal | 20 | 🟠 入口聚合层 |
| svc/finance | 20 | 🟠 财务核心 |
| svc/srm | 15 | 🟡 |
| lib/shared-db | 15 | 🟠 共享 DB 层 |
| lib/shared-core | 15 | 🟠 共享核心 |
| svc/lims | 13 | 🟡 |
| svc/pdm | 13 | 🟡 |
| svc/scm | 12 | 🟡 |
| svc/mes | 11 | 🟡 |
| lib/shared-observability | 6 | 🟡 |
| lib/shared-auth | 6 | 🟠 鉴权层 |
| svc/hrm | 5 | 🟡 |
| svc/unified-core | 3 | 🟢 |
| **合计** | **~235** | |

### 3.4 前端 any 类型热点（TOP 15 文件）

| 文件 | any 数量 | 位置 | 风险 |
|------|---------|------|------|
| `microfrontend/sandbox/event-isolation.ts` | 25 | sandbox | 🟠 运行时隔离层 |
| `microfrontend/sandbox/js-sandbox.ts` | 16 | sandbox | 🟠 运行时隔离层 |
| `microfrontend/serverless/on-demand-loader.ts` | 15 | serverless | 🟠 动态加载 |
| `microfrontend/runtime/cross-framework.ts` | 11 | runtime | 🟠 跨框架适配 |
| `pages/hrm/HrmAttendancePage.tsx` | 11 | 业务页 | 🟡 |
| `pages/finance/FinanceReceivablePayablePage.tsx` | 10 | 业务页 | 🟡 |
| `pages/notification/NotificationListPage.tsx` | 9 | 业务页 | 🟡 |
| `common/types/normalize_response.stub.ts` | 5 | 类型桩 | 🟡 应该实现 |
| `api/ai/assistant.ts` | 1+ | API | 🟡 `data: any[]` |
| `pages/srm/SupplierPortalPage.tsx` | 4 | 业务页 | 🟢 |
| `pages/mes/WorkStationPage.tsx` | 4 | 业务页 | 🟢 |
| `pages/mes/TeamManagementPage.tsx` | 4 | 业务页 | 🟢 |
| `pages/mes/ProcessFlowPage.tsx` | 4 | 业务页 | 🟢 |
| `pages/lims/ReagentPage.tsx` | 4 | 业务页 | 🟢 |
| `pages/asset/DepreciationPage.tsx` | 4 | 业务页 | 🟢 |

---

## 四、值得立即处理的 TOP 10

| # | 严重度 | 问题 | 位置 | 理由 |
|---|--------|------|------|------|
| 1 | 🔴 **P0 安全** | **plugin-registry 路由空壳 + 无鉴权** | `svc/plugin-registry/src/modules/plugin/mod.rs:16-17` | Router::new() — 没有路由！如果该服务暴露端口，任何请求都会到达空路由。且 TODO 注释明确"迁移路由 + 补齐 permission"都未做。 |
| 2 | 🔴 **P0 安全** | **shared-auth 生产 unwrap** | `lib/shared-auth/`（6 处生产 unwrap） | 鉴权层出 unwrap 意味着 panic 会导致整个请求崩溃，且可能在认证/解码环节触发。 |
| 3 | 🔴 **P0 安全** | **middleware 测试辅助函数 unwrap** | `svc/unified-core/src/middleware/{tenant_rls,versioning}.rs` | 虽然在 `create_test_request` helper 内（非 production path），但这种 panic-on-bad-input 模式一旦被复制到生产 middleware，就是线上 crash。建议整体改 `?.ok_or()` 风格。 |
| 4 | 🟡 **P1 业务** | **MES 审批转换逻辑缺失 × 4 个模块共 12 处** | `mes/work_report.rs`, `production_order.rs`, `anomaly_detection.rs`, `quality_management/inspection.rs` | 明确标注了"创建 approval 记录 + 校验 approval_id 版本 + 执行状态转换 + audit log"四步审批流程，全部留空。业务审批流形同虚设。 |
| 5 | 🟡 **P1 数据** | **Mobile-BFF 数据归属迁移 × 3 模块** | `mes/work_report.rs:173`, `hrm/attendance.rs:41`, `qms/dashboard.rs:26`, `lib/shared-service-client/{mes,qms}_client.rs` | 跨 schema 直连 `plugin_mobile` 表是 Phase 1 已知遗留，当前 Mobile BFF 已下线但直连代码未清理。影响 5+ 个文件。 |
| 6 | 🟡 **P1 稳定性** | **生产 unwrap 热点：portal/graphql_schema.rs 10 处** | `svc/portal/src/modules/graphql_schema.rs`（14K 行巨型文件） | GraphQL resolver 内 `patterns.last_mut().unwrap()`、`timestamps.front().unwrap()` — 空集合时直接 panic，Gateway 聚合层崩溃会影响所有业务。 |
| 7 | 🟡 **P1 稳定性** | **生产 unwrap 热点：shared-event 36 处** | `lib/shared-event/` | 共享事件层被所有服务依赖，unwrap panic 会导致消费者崩溃。 |
| 8 | 🟡 **P1 稳定性** | **生产 unwrap 热点：portal/shared/mod.rs 10 处** | `svc/portal/src/shared/mod.rs:68–100` | 一系列 `*ServiceClient::new(...).unwrap()` — 服务连接失败直接 panic。 |
| 9 | 🟡 **P1 类型安全** | **前端微前端层 any 残留 × 57 处** | `microfrontend/sandbox/event-isolation.ts`(25), `js-sandbox.ts`(16), `cross-framework.ts`(11), `on-demand-loader.ts`(15) | 运行时隔离层和动态加载层用大量 `any` 绕过类型检查，重构和 bug 定位难度极高。 |
| 10 | 🟢 **P2 维护** | **前端 API schema 未对齐** | `api/hrm/employee.ts:48,66` | `Partial<Employee>` 占位了很长时间（V72 A4-5），应尽快重生成 OpenAPI schema 后切换为 `TypedPaginatedResponse<Employee>`。 |

---

## 五、清理建议（分阶段）

### Phase 1：P0 安全止血（1–2 周）

| 任务 | 工作量 | 关联问题 |
|------|--------|---------|
| 为 `plugin-registry` 空 Router 补最基本的 health + 404 handler，防止裸露端口 | 0.5d | #1 |
| 审阅 `lib/shared-auth/` 6 处生产 unwrap，改为 `map_err()` 或 `ok_or_else()` | 1d | #2 |
| 统一 middleware 层错误处理模式（从 unwrap 改为 Result 链） | 2d | #3 |

### Phase 2：P1 业务 & 稳定性（2–4 周）

| 任务 | 工作量 | 关联问题 |
|------|--------|---------|
| **MES 审批转换补全**：work_report / production_order / anomaly_detection / inspection 4 个模块各 3 处 TODO，统一走 approval_service + audit_log | 5–8d | #4 |
| **Mobile-BFF 数据迁移清理**：mes/hrm/qms 3 个模块 + shared-service-client 2 个 client 的跨 schema 直连改造 | 3–5d | #5 |
| **portal/graphql_schema.rs unwrap 清理**（10 处）：Resolver 空集安全访问 | 2d | #6 |
| **shared-event unwrap 审计**（36 处）：区分"可接受的测试数据构造"和"生产风险" | 3d | #7 |
| **portal/shared/mod.rs unwrap 审计**（10 处）：ServiceClient 连接错误降级处理 | 1d | #8 |

### Phase 3：P2 类型安全 & 重构（持续进行）

| 任务 | 工作量 | 关联问题 |
|------|--------|---------|
| 前端微前端层 any 清理（57 处）：sandbox / runtime / serverless | 5d | #9 |
| 前端 API schema 重生成 + `Partial<T>` → `TypedPaginatedResponse<T>` | 1d | #10 |
| 生产 unwrap 全量审计剩余 ~140 处（erp/finance/srm/lims/pdm/scm/mes/...） | 10–15d | 3.3 表格 |
| println! 生产残留清扫（~15 处非 build.rs 的 debug 输出） | 1d | 1.2 表格 |

---

## 六、附录：方法论说明

### A.1 grep 误匹配原因

原始 grep 命令 `grep -rniE 'TODO|FIXME|HACK|XXX' apps/web/src` 返回 368 行，但经过二次过滤后真实技术债仅 ~40 处。主要误匹配类型：

1. **注释中的字段名**：`todos` / `Todo List` 是业务术语，不是 TODO 注释
2. **文档模板占位**：`xxxAdapter` / `CREATE TABLE xxx` / `access_token=xxx` 是代码文档的示例占位
3. **正则 pattern**：`/TODO|FIXME|HACK|XXX/g` 被代码审阅器自身的正则表达式匹配到
4. **运行时字符串**：`apps/web/src/utils/ai/test-generator.ts:774` 中的 `'// TODO: 实现测试逻辑'` 是 AI 生成测试时注入的字符串，不是项目自身的技术债

### A.2 unwrap 二次过滤逻辑

- 排除 `#[cfg(test)]` 模块内的 unwrap
- 排除紧接 `fn test_` / `fn build_test` / `fn create_test_*` 等测试 helper 后的 unwrap
- 排除 `.unwrap_or()` / `.unwrap_or_else()` / `.unwrap_unchecked()` 等非 `.unwrap()` 变体

### A.3 XXX / FIXME / HACK 统计为零

本项目前后端都没有显式标注为 FIXME 或 HACK 的代码——这是好消息，但也可能意味着开发者习惯只用 TODO，或者把 workaround 代码注释里不写标记。建议后续引入 `cargo clippy` + `eslint no-restricted-syntax` 强制 `.unwrap()` 检查。

---

## 七、趋势跟踪（下次审计对比）

| 指标 | 本次 | 下次目标 |
|------|------|---------|
| 后端生产 unwrap() | 235 | < 100 |
| 前端 any 类型 | 239 | < 150 |
| MES 审批 TODO 块 | 12 | 0 |
| plugin-registry 路由空壳 | ✅ 存在 | ✅ 补路由 + 鉴权 |
| FIXME/HACK 真实注释 | 0 | 0 |

---

*报告由审计脚本自动生成 + 人工复核。审计脚本：`scripts/audit_debt.py`（可复用于下次审计）。*
