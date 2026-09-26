# Group A — 核心平台模块组 5 维实测评估（raw）

- 评估日期：2026-09-09
- 评估范围：后端 unified-core / master-data / server / portal；前端 API 目录 iam、workflow、file、doc、migration、automation、admin、system、tenant、permission、master、bff、unified-core；前端模块配置 apps/web/src/modules/{iam,admin,automation,workflow,doc,notification}
- 口径说明：
  - 后端路由数 = `grep -rn "\.route(" svc/<svc>/src --include=*.rs` 剔除注释行后的注册数（多行 .route 按 1 条计，含 nest 前缀）。
  - 前端 API 方法数 = `grep -rn "apiClient\." apps/web/src/api/<dir>` 计数（含测试文件时单独标注）。
  - 页面消费 = `grep -rln "api/<dir>\|workflowApi\.\|<symbol>" pages/ modules/ components/` 验证真实 import/调用。
  - 预埋悬空 = 有封装、有类型，但无任何页面/组件 import 消费。
  - 真实缺口 = 页面/组件消费了，但后端无对应路由（或路径前缀不对应）。

---

## 一、模块 × 5 维总览表

| 模块 | 后端路由数 | 前端API方法数 | 页面消费 | ①前后端完整度 | ②API对应 | ③菜单覆盖 | ④设置合理性 | ⑤冗余判定 |
|---|---|---|---|---|---|---|---|---|
| iam | 51（iam.rs）+6 auth（mod.rs）≈57 | 55 | 9 文件/4 页面 | 部分：核心 CRUD 完整，auth 扩展项悬空 | 部分缺口：password-policy/security-settings/sessions 无后端 | 完整：5 菜单页均有后端 | 部分：preferences 有后端，安全设置无后端 | 中：authApi/iamApi/default 三重别名 |
| workflow | 84（flow.rs） | 292（含测试 80，非测试≈212） | 13 页面+移动端 | 部分：核心流程完整，子域大量悬空 | 真实缺口：categories/delegates/form/rules/variables/performance/monitor 子路径无后端 | 完整：13 菜单页均有后端服务 | 完整：settings 前后端对应 | 中高：task.ts 48 方法无直接消费；测试文件直连 apiClient |
| file | 25（file.rs） | 48 | 0 直接消费（仅 doc/index.ts 内部 1 处 upload） | 缺口/预埋：整目录无页面消费 | 预埋：storage/scan/images 子路径后端无对应 | 无独立菜单（doc 模块内部引用） | 不适用 | 高：48 方法全部预埋悬空 |
| doc | 20（doc/handlers.rs） | 55 | 6 页面（含 1 静态页） | 部分：documents/folders/templates 完整 | 部分缺口：workspaces/my-checkouts/shared-with-me 无后端 | 完整：6 菜单页有后端 | 不适用 | 中：KnowledgeBasePage 静态页无 API |
| migration | 4（migration.rs） | 4 | 1 页面 | 缺口：路径双前缀错误 | 真实缺口：前端 /api/core/migration/migrations/services vs 后端 /api/core/api/migrations/services | 完整（admin 菜单内） | 不适用 | 低 |
| automation | 6（automation.rs，全部 501） | 32 | 5 页面 | 缺口：路由存在但全部 501 | 缺口：后端为 501 桩，且 designer/resources、dashboard/stats、webhook/order 路径不对应 | 完整：5 菜单页均有路由（但不可用） | 不适用 | 高：整模块死链（planned 占位） |
| admin | —（复用 core+erp） | 41 | 5 页面 | 部分：monitor 前缀错位，systemSetting 无后端 | 真实缺口：/api/core/monitor/* 无服务；/api/erp/system/settings 全库无路由 | 完整：20 菜单页 | 低：SystemSettingsPage 静态硬编码，systemSetting API 无后端 | 高：permissionAudit 与 iam/bi 重复 |
| system | 10（system.rs）+4（feature_flag.rs）+audit 20 | 37 | 6 页面 | 部分：params/config/cache/dict/feature-flag 完整 | 真实缺口：/system/audit-logs 全库无路由（AuditLogPage 消费） | 完整 | 完整：params/config 有 system_configs 表 | 中：audit 多套实现 |
| tenant | 30（master.rs 租户段） | 75 | 6 页面 | 部分：tenant CRUD 完整，settings/security/analytics/billing 悬空 | 预埋：config/security/analytics 子 API 无后端且无消费 | 完整（admin 菜单） | 部分：core_tenant_settings 表存在但前端 settings API 无后端无消费 | 高：TenantBillingPage 静态 mock |
| permission | iam.rs /permissions（≈6）+audit | 4（iam/permission.ts） | 1 页面（PermissionManagementPage） | 部分 | 部分：permissions 基础 CRUD 有后端，check-resource 有；批量审计在 admin | 完整 | 不适用 | 高：iam/permission + admin/permissionAudit + bi/permission 三套 |
| master | 240（master-data 服务） | 933 | 0 直接消费 | 缺口：整目录无页面消费 | 预埋：mdm-v61~v79（19 个版本命名空间）后端全无 | 无菜单入口（孤儿服务） | 不适用 | 极高：933 方法，~500+ 方法指向不存在的 mdm-v61+ 路由 |
| bff | portal 854 + server 15 | 4 | 9 页面（getDashboard 等） | 部分：graphql/dashboard 可用，REST 聚合无消费 | 预埋：getBusinessStats/getUnifiedTodos 无消费；masterDataApi 走 erp 有后端 | portal 无独立菜单（服务型） | 不适用 | 中：DashboardPage 与 UseDashboardData 双实现 |
| unified-core | 342 | 77 | 0 直接消费 | 缺口：整目录无页面消费 | 预埋：/api/core/monitor/*、/api/core/search/* 指向已外迁服务 | 无独立菜单 | 不适用 | 高：77 方法全部预埋，且 monitor/search 前缀过时 |

---

## 二、逐模块详细评估卡

### 2.1 iam（后端 svc/unified-core → /api/core/iam；前端 api/iam）

**后端路由**：57 条（iam.rs 51 条 + mod.rs auth 段 6 条）
- 证据：`svc/unified-core/src/routes/iam.rs:10-163`（/users、/users/me、/users/{user_id}/permissions|roles|effective-permissions|login-history、/users/batch-delete、/users/batch-update、/users/check-email、/users/check-username、/roles、/permissions、/user-permissions/{user_id}、/positions、/permissions/verify|verify-multiple|my-permissions|check-resource、/access-logs、/access-logs/user/{user_id} 等）；`svc/unified-core/src/routes/mod.rs:128-136`（/iam/auth/login|register|refresh|logout|forgot-password|reset-password）、`:157`（/iam/auth/verify）。
- 挂载：`src/routes/iam.rs:177` `.nest("/iam", ...)`；整体 `src/routes/mod.rs:183` `register_routes_with_legacy_alias(Router::new(), "/api/core", ...)`；`src/main.rs:319` api_prefix `/api/core`。

**前端 API 方法**：55 条（user.ts 26、auth.ts 17、role.ts 8、permission.ts 4；证据 `apps/web/src/api/iam/*.ts`）。

**页面消费清单**（真实消费）：
- `apps/web/src/pages/iam/UserManagementPage.tsx`、`RoleManagementPage.tsx`、`PermissionManagementPage.tsx`
- `apps/web/src/pages/shared/LoginPage.tsx`、`ForgotPasswordPage.tsx`、`ProfilePage.tsx`、`pages/shared/hooks/useProfile.ts`
- `apps/web/src/components/AccessLogger.tsx`、`components/shared/UserManagementApiAdapter.tsx`

**①完整度**：部分。用户/角色/权限 CRUD + 认证主链路前后端齐全；auth 扩展方法（password-policy、security-settings、sessions）有封装无后端且无消费。

**②API 对应**：
- 覆盖：/auth/login|register|refresh|logout|forgot-password|reset-password（mod.rs:128-136）；/users、/users/me、/users/me/permissions、/users/me/preferences、/users/me/avatar、/users/me/password、/users/batch-delete、/users/batch-update、/roles、/permissions、/access-logs（iam.rs 各行为证）。
- 真实缺口（无任何后端路由，已全 svc 检索）：`/auth/password-policy`（GET+PUT，auth.ts:84,96）、`/auth/sessions`（auth.ts:112）、`/auth/sessions/{id}`（auth.ts:116）、`/auth/sessions/revoke-all`（auth.ts:120）、`/auth/security-settings`（auth.ts:131,140）。后端检索 `grep -rn "password-policy\|security-settings\|/sessions\|revoke-all" svc/{unified-core,master-data,server,portal}` 均 0 命中。
- 消费判定：上述 5 个缺口方法在 pages/modules/components 无任何调用 → 预埋悬空（既有封装又无后端，属双死）。

**③菜单覆盖**：完整。`apps/web/src/modules/iam/config.ts:40-101` 5 个路由（dashboard/user/role/permission/company-structure）+ `iamNavConfig`（:143-203）。company-structure 后端由 /positions 系列承担（iam.rs:60-61,135-139,152-155），页面 `pages/iam/CompanyStructurePage.tsx` 存在（config.ts:98 验证 OK）。

**④设置合理性**：部分。
- /users/me/preferences ↔ iam.rs:17-20（GET）、104（PUT）✓
- /auth/password-policy、/auth/security-settings、/auth/sessions：前端有设置类接口但后端无实现 → 设置项无实际作用。
- 存储表：core_tenant_settings 存在（`svc/unified-core/src/modules/tenant/mod.rs:118`），iam 用户偏好存储表未取证。

**⑤冗余**：中。
- `api/iam/index.ts:45-49`：`authApi` 对象 + `export const iamApi = authApi` + `export default authApi` 三重别名。
- `api/iam/index.ts` 内 authApi 顶层扁平化重导出（register/login/logout/... 约 30 个）与 authApi.auth/users/roles/permissions 嵌套结构并存。

---

### 2.2 workflow（后端 svc/unified-core flow.rs → /api/core/flow；前端 api/workflow）

**后端路由**：84 条（`svc/unified-core/src/routes/flow.rs` 全文），挂载 `src/routes/mod.rs:158` `.nest("/flow", ...)` → /api/core/flow/*。核心路径：/approvals、/approval-tasks、/instances、/tasks（my/cc/count/created/involved/stats/overdue/candidate/high-priority/batch/*）、/workflows（versions/deploy/publish/rollback）、/templates（import/copy/export）、/settings、/history、/records、/statistics、/monitor/instances/{error,overdue,{id}/retry}。

**前端 API 方法**：292 条（含 `api/workflow/__tests__/workflow-api.test.ts` 80 条，非测试 ≈212）。分文件：task.ts 48、monitor.ts 34、form.ts 23、instance.ts 19、variable.ts 15、approval.ts 15、definition.ts 13、template.ts 8、rule.ts 7、delegate.ts 7、setting.ts 6、utils.ts 5、index.ts 4、history.ts 4、category.ts 4。

**页面消费清单**（真实消费）：
- `pages/workflow/`：WorkflowApprovalsPage、WorkflowApprovalDetailPage、WorkflowDashboardPage、WorkflowDefinitionsPage、WorkflowDesignerPage、WorkflowInstanceDetailPage、WorkflowInstancesPage、WorkflowMonitorPage（直接 import `@/api/workflow/monitor`）、WorkflowNotificationCenterPage、WorkflowSettingsPage（`workflowApi.settings.listSettings()`，index.tsx:49）、WorkflowStatisticsPage、WorkflowTemplatePage、WorkflowVersionHistoryPage
- `pages/mobile/MobileApprovalPage.tsx`、`pages/mobile/hooks/UseMobileApproval.tsx`（import `@/api/workflow/approval`）
- `pages/shared/DashboardPage.tsx`、`pages/shared/hooks/UseDashboardData.tsx`（workflowApi）

**①完整度**：部分。approvals/tasks/instances/workflows/templates/settings 主链路完整；categories/delegates/form/rules/variables/performance 及 monitor 大部分子路径无后端。

**②API 对应**（以 /api/core/flow 为基准逐项核对，后端路径全集来自 flow.rs grep）：
- 覆盖：/tasks、/tasks/my*、/tasks/count、/tasks/overdue、/tasks/{id}/claim|reject|approve|complete|delegate|unclaim、/tasks/batch/*、/instances*、/approvals*、/approval-tasks*、/workflows*、/templates*、/settings*、/statistics、/history*、/records*。
- 真实缺口（前端有方法、后端 flow.rs 无对应路径，且全 unified-core 检索 0 命中）：
  - /categories、/categories/active、/categories/sort、/categories/tree（category.ts）
  - /delegates、/delegates/active、/delegates/my、/delegates/my/attorneys（delegate.ts）
  - /form-definitions*、/form-instances*（form.ts，23 方法）
  - /rules、/rules/batch、/rules/type（rule.ts，7 方法）
  - /variables/global（variable.ts，15 方法）
  - /performance、/performance/reset（monitor.ts 内）
  - /workflows/import（definition.ts 内）
  - /monitor/analysis/*、/monitor/dashboard、/monitor/logs、/monitor/performance、/monitor/realtime、/monitor/sla-compliance、/monitor/statistics、/monitor/instances/{completed,rejected,running,suspended}（monitor.ts 34 方法中约 20 条）
- 消费判定：monitor.ts 被 `pages/workflow/WorkflowMonitorPage.tsx` 真实消费 → **真实缺口**；form/rule/delegate/variable/category/task（48 方法）在 pages/modules/components 无 `workflowApi.task` 等直接调用 → **预埋悬空**。

**③菜单覆盖**：完整。`apps/web/src/modules/workflow/config.ts:60-258` 13 个路由（dashboard/definitions/designer/versionHistory/instances/instanceDetail/approvals/approvalDetail/notificationCenter/monitor/statistics/templates/settings），navItems :299-437。所有 lazy 页面文件存在（实测全部 OK）。菜单指向的后端 /api/core/flow 存在。

**④设置合理性**：完整。前端 `api/workflow/setting.ts`（/settings、/settings/{id}、/settings/key/{key}、/settings/batch、/settings/{id}/reset）↔ 后端 `src/routes/flow.rs:111-114,258-267` 全对应。设置存储表未取证。

**⑤冗余**：中高。
- task.ts 48 个方法无任何页面直接消费（审批页用的是 approval.ts 的 approvalTaskApi），疑似冗余封装。
- `api/workflow/__tests__/workflow-api.test.ts` 含 80 处 `apiClient.*` 真实调用（测试直连 API client，非 mock），风险点。
- `apps/web/src/api/client.ts:630-635` `get workflow()` 与 `get flow()` 双 getter 指向同一 client，配合 runtime.ts 双别名。

---

### 2.3 file（后端 svc/unified-core file.rs → /api/core/file；前端 api/file）

**后端路由**：25 条（`src/routes/file.rs:9-85`）：/files、/files/{id}、/files/{id}/copy|move|share|star、/files/search、/files/export、/upload、/upload/multiple、/preview/{id}、/thumbnail/{id}、/shares/{id}、/stats、/download/{id}。

**前端 API 方法**：48 条（storage.ts 14、scan.ts 12、index.ts 12、image.ts 10）。

**页面消费**：**0 直接消费**。`grep -rln "api/file" pages/ modules/ components/ hooks/` 全空；`fileApi` 符号全 src 无消费（仅 `api/doc/index.ts:124` 内部 `apiClient.file.post('/upload')` 1 处间接使用）。

**①完整度**：缺口/预埋。整目录无页面消费。

**②API 对应**：
- 后端有但前端未消费：/files/search、/files/{id}/copy|move|share|star、/shares、/preview、/thumbnail、/stats、/upload/multiple（后端能力空置）。
- 前端有但后端无（`grep -rn` 全 unified-core/master-data 0 命中）：/storage/buckets、/storage/categories、/storage/cleanup、/storage/retention-policies、/storage/usage、/scan/*（batch/quarantine/rules/stats）、/images/batch-process、/images/formats、/files/shared（后端为 /files/search）。
- 消费判定：均无消费 → 预埋悬空（含 8 个后端没有的路径）。

**③菜单覆盖**：无独立菜单（file 能力经 doc 模块的 DocumentsPage/DocumentCenterPage 间接使用上传）。

**④设置合理性**：不适用（无设置类接口）。

**⑤冗余**：高。48 方法全部预埋；后端 /files/search、/files/export 等与前端 /files/stats、/files/shared 路径命名错位。

---

### 2.4 doc（后端 svc/unified-core modules/doc/handlers.rs → /api/core/doc；前端 api/doc）

**后端路由**：20 条（`src/modules/doc/handlers.rs:579-625`）：/dashboard、/documents、/documents/{document_id}、/documents/{document_id}/versions、/documents/{document_id}/versions/{version}、/documents/{document_id}/versions/{version}/restore、/folders、/folders/{folder_id}、/templates、/templates/{template_id}、/templates/categories。挂载 `src/routes/doc.rs:9` `.nest("/doc", ...)`。

**前端 API 方法**：55 条（workspace.ts 15、index.ts 14、versionControl.ts 13、collaboration.ts 13）。

**页面消费清单**：
- `pages/doc/DashboardPage.tsx`、`DocumentListPage.tsx`、`DocumentCenterPage.tsx`、`FileDetailPage.tsx`
- `pages/doc/DocumentsPage/index.tsx` + components（DocumentHeader/DocumentSidebar/DocumentStats/DocumentTree）+ hooks/useDocumentsPage.ts
- `pages/doc/KnowledgeBasePage.tsx`（**静态页**，无 docApi/useQuery 消费）

**①完整度**：部分。documents/folders/templates/versions 完整；workspaces/协作子路径无后端。

**②API 对应**：
- 覆盖：/documents、/documents/{id}、/documents/{id}/versions（versionControl.ts）、/folders、/dashboard。
- 真实缺口（后端 0 命中）：/workspaces（workspace.ts 15 方法主体）、/documents/my-checkouts、/documents/shared-with-me、/documents/{id}/... 协作路径（collaboration.ts 13 方法）、/upload（doc 域；前端 doc/index.ts:124 实际走 apiClient.file /upload → 后端 file.rs /upload ✓，故 upload 实际覆盖）。
- 消费判定：workspace/collaboration/versionControl 的缺口路径无页面直接消费（页面用 docApi 基础方法）→ 预埋悬空。

**③菜单覆盖**：完整。`modules/doc/config.ts:46-111` 6 路由（dashboard/list/documents/documentCenter/knowledgeBase/documentDetail），navItems :159-225。KnowledgeBasePage 文件存在但为静态模板页（`pages/doc/KnowledgeBasePage.tsx` 无 api 调用）→ 菜单指向页面但无数据链路。

**④设置合理性**：不适用。

**⑤冗余**：中。doc/index.ts 同时提供 `/documents` 列表与 workspace.ts 重复列表语义；KnowledgeBasePage 静态壳。

---

### 2.5 migration（后端 svc/unified-core migration.rs；前端 api/migration）

**后端路由**：4 条（`src/routes/migration.rs:10-23`）：/api/migrations/services、/api/migrations/services/{name}/status、/{name}/apply、/{name}/rollback。

**前端 API 方法**：4 条（`api/migration/index.ts`）：listServices/applyMigration/rollbackMigration/getMigrationStatus。

**页面消费**：`pages/admin/MigrationAdminPage.tsx`（import `@/api/migration`，:23；调用 listServices/getMigrationStatus/applyMigration/rollbackMigration，:51-205）。

**①完整度**：缺口。

**②API 对应**：**路径双前缀错位（真实缺口，被页面消费）**。
- 前端：apiClient.migration base = `/api/core/migration`（`apps/web/src/config/runtime.ts:69`），完整 URL = `/api/core/migration/migrations/services`。
- 后端：migration.rs 硬编码绝对路径 `/api/migrations/services`，经 `register_routes_with_legacy_alias`（`lib/shared-core/src/api_version.rs:96-108`，router.nest 前缀）注册后实际为 `/api/core/api/migrations/services`（及 legacy `/api/v1/core/api/migrations/services`）。
- 两者互不匹配 → MigrationAdminPage 所有 4 个请求均 404。

**③菜单覆盖**：完整（admin 模块 `config.ts:288-293` admin-migration → MigrationAdminPage）。

**④设置合理性**：不适用。

**⑤冗余**：低。

---

### 2.6 automation（后端 svc/unified-core automation.rs；前端 api/automation）

**后端路由**：6 条（`src/routes/automation.rs:78-`）：/automation/dashboard、/automation/designer/schema、/automation/rules、/automation/rules/{id}、/automation/runs、/automation/variables。**全部 handler 返回 501**（`automation.rs:1-5,17-65`：`not_implemented()`，文件头注明 "V66.1：planned 阶段占位，501 Not Implemented"）。

**前端 API 方法**：32 条（rules.ts 10、variables.ts 7、runs.ts 7、designer.ts 6、dashboard.ts 2）。

**页面消费**：5 页全部真实消费：`pages/automation/AutomationDashboardPage.tsx`、`AutomationRulesPage.tsx`、`AutomationRunsPage.tsx`、`AutomationVariablesPage.tsx`、`AutomationDesignerPage/*`（DesignerToolbar/NodeLibrary/useAutomationDesigner/shared）。

**①完整度**：缺口（路由存在但服务不可用，前端页面全部打到 501）。

**②API 对应**：
- 路径部分不对应：前端 base `/api/core/automation`（runtime.ts:123）+ 路径 /dashboard/stats、/designer/resources、/rules、/runs/purge、/variables、/variables/bulk-import、/webhook/order；后端为 /automation/dashboard、/automation/designer/schema、/automation/rules、/automation/runs、/automation/variables。即 /dashboard/stats≠/dashboard、/designer/resources≠/designer/schema、/runs/purge≠/runs、/webhook/order 无后端。
- 即便路径修正，handler 仍 501 → 功能性真实缺口。

**③菜单覆盖**：完整（`modules/automation/config.ts:49-119` 5 路由 + navItems :163-223）。

**④设置合理性**：不适用。

**⑤冗余**：高。整模块前后端均为占位/死链；designer 资源与 dashboard 统计存在两套路径定义。

---

### 2.7 admin（前端 api/admin；后端复用 unified-core core/audit + svc/erp + svc/monitor）

**前端 API 方法**：41 条（monitoring.ts 18、systemSetting.ts 8、permissionAudit.ts 8、auditLog.ts 4、operationAudit.ts 3）。client 使用：31 条 apiClient.core + 10 条 apiClient.erp。

**页面消费**：`pages/admin/MonitoringAlertPage.tsx`（import `@/api/admin/monitoring`，:37-45，调用 listAlerts/listAlertRules/getSystemHealth/getAlertStats）、`PerformanceMonitorPage.tsx`、`PermissionAuditPage.tsx`、`pages/desktop/AuditLogPage.tsx`、`pages/admin/hooks/UseOperationAuditLog.tsx`。

**①完整度**：部分。audit 链路可用；monitor 前缀错位；systemSetting 无后端。

**②API 对应**：
- 真实缺口 1（monitor 前缀错位）：前端 apiClient.core → `/api/core/monitor/alerts|rules|health`（monitoring.ts）；svc/monitor 实际前缀 `/api/monitor`（`svc/monitor/src/main.rs:33`），unified-core 无 /api/core/monitor/* 路由 → MonitoringAlertPage 请求落空（网关重写未见配置，未取证）。
- 真实缺口 2（systemSetting）：前端 apiClient.erp → `/api/erp/system/settings` CRUD+batch（systemSetting.ts:13-47）；全 svc `grep -rn "system/settings"` 仅命中 unified-core 的 /system/settings/smtp（settings.rs:17,31,35），**无 /system/settings 通用 CRUD 路由**。
- 覆盖：/audit/operations/stats ↔ `src/modules/audit/mod.rs` 的 /api/core/audit/operations/stats ✓；/system/v1/config ↔ system.rs:10,21 ✓。

**③菜单覆盖**：完整。`modules/admin/config.ts` 20 路由（dashboard/tenant/tenantDetail/account/auditLog/monitor/permissionAudit/tenantSettings/tenantBilling/bankAccount/dictionary/system/systemSettings/plugin/database/migration/configDebug/rateLimit/featureFlag/performance），页面文件全部存在（实测 OK）。

**④设置合理性**：低。
- `pages/admin/SystemSettingsPage.tsx:21-128` 为纯静态硬编码表单（systemName/companyName/address/fromName + 4 个 tab），无任何 API 调用，日志仅 `apiLogger.info`（:312）→ 设置项无实际作用。
- `api/admin/systemSetting.ts` 8 方法指向不存在的后端 /system/settings → 即使接线也 404。
- system_configs 表存在（`src/shared/config_store.rs:76`），/system/v1/config 可落库 ✓，但 SystemSettingsPage 未使用。

**⑤冗余**：高。permissionAudit.ts（8 方法，/business-tools/permissions/audit-logs 等）与 iam/permission.ts、bi/permission.ts 及 unified-core 三套 audit 路由重叠。

---

### 2.8 system（前端 api/system；后端 unified-core system.rs/feature_flag.rs/audit + erp + master-data）

**前端 API 方法**：37 条（index.ts 19、params.ts 10、featureFlag.ts 4、audit.ts 4）。client：19 core + 7 erp + 11 master。

**页面消费**：`pages/admin/DictionaryManagementPage.tsx`、`pages/admin/DatabaseStructurePage.tsx`、`pages/system/AuditLogPage/index.tsx`（hooks/useAuditLog.ts:5 import systemAuditApi）、`pages/system/FeatureFlagPage/index.tsx`、`pages/system/SystemParamsPage/index.tsx`、`pages/erp/DictManagementPage.tsx`。

**①完整度**：部分。

**②API 对应**：
- 覆盖：/system/v1/config、/system/v1/cache/*、/system/v1/log/config、/system/v1/params ↔ system.rs:10-14,21-25 ✓；/system/feature-flags ↔ feature_flag.rs ✓；/dict/* 经 apiClient.master（/api/master-data/dict/*）↔ master-data 服务 `.nest("/dict", ...)`（`svc/master-data/src/modules/mod.rs:543-544`）✓；/db/tables|columns|changes 经 apiClient.erp ↔ `svc/erp/src/modules/db_structure.rs:44-52` ✓。
- 真实缺口：/system/audit-logs（list/{id}/export/stats，system/audit.ts:20-62）→ 全 svc 检索 `grep -rn "system/audit-logs" --include=*.rs` **0 命中**；被 `pages/system/AuditLogPage` 真实消费 → 真实缺口。（后端仅有 /iam/v1/audit/logs、/audit/access-logs、/api/core/audit/operations 等不同路径。）

**③菜单覆盖**：完整（admin/system 两处菜单，页面均存在）。

**④设置合理性**：完整。params/config/cache/log 前后端对应，存储 system_configs 表（config_store.rs:76）；feature-flag 有 feature_flags 相关实现（表未取证）。

**⑤冗余**：中。audit 查询能力在 unified-core 内 3 处以上重复（/iam/v1/audit/logs、/audit/access-logs、/api/core/audit/operations、business_tools audit），前端另起 /system/audit-logs 造成第 4 套口径。

---

### 2.9 tenant（前端 api/tenant；后端 unified-core master.rs 租户段）

**前端 API 方法**：75 条（config.ts 22、index.ts 19、security.ts 18、analytics.ts 16）。全部 apiClient.core → /api/core/tenant/*。

**页面消费**：`pages/admin/TenantManagementPage.tsx`、`TenantDetailPage.tsx`、`TenantSettingsPage.tsx`（tenantApi.getCurrentTenantContext/getTenant/getTenantUsers，:65-86）、`TenantOnboardingWizardPage.tsx`、`TenantBillingPage.tsx`（**静态 mock**，:43-54 硬编码套餐特性，无 API）、`components/InviteMemberDialog.tsx`。

**①完整度**：部分。tenant CRUD/用户/统计/上下文完整；settings/security/analytics/billing 子 API 悬空。

**②API 对应**（后端 `src/routes/master.rs` 租户路径全集）：
- 覆盖：/tenant/context、/tenant/my、/tenant/list、/tenant/create、/tenant/switch（master.rs:61,96,128,30-31,42）、/tenant/{id}、/tenant/{id}/users、/tenant/{id}/users/{user_id}、/tenant/{id}/stats、/tenant/{id}/usage、/tenant/{id}/metrics、/tenant/{id}/billing、/tenant/{id}/invoices、/tenant/{id}/activate|suspend、/tenant/tenants*（master.rs 全文件路径集）。
- 预埋（前端有、后端 0 命中、且无页面消费）：/tenant/{id}/settings、/tenant/{id}/branding、/tenant/{id}/features、/tenant/{id}/domains、/tenant/{id}/email-config、/tenant/{id}/integrations、/tenant/{id}/security/*（api-keys/ip-whitelist/sessions/password-policy/2fa）、/tenant/{id}/analytics/*（config.ts/security.ts/analytics.ts 全部路径）。
- 消费判定：`grep -rln "getTenantSettings\|getTenantBranding\|listTenantApiKeys\|getTenantAnalytics..."` 无页面命中 → 预埋悬空。

**③菜单覆盖**：完整（admin 模块 tenant/tenantDetail/tenantSettings/tenantBilling 菜单，页面存在）。

**④设置合理性**：部分。core_tenant_settings 表存在（`svc/unified-core/src/modules/tenant/mod.rs:118`、`src/modules/tenant/handlers.rs:297` 有 INSERT 逻辑），但前端 /tenant/{id}/settings API 无后端路由、无页面消费 → 存储层与 API 层脱节；TenantBillingPage 为静态 mock 无真实账单链路。

**⑤冗余**：高。config/security/analytics 三个子文件 56 方法全部预埋；TenantBillingPage 硬编码套餐数据。

---

### 2.10 permission（前端 api/iam/permission.ts + api/admin/permissionAudit.ts + api/bi/permission.ts）

**前端 API 方法**：iam/permission.ts 4 条（listPermissions/create/update/delete）；admin/permissionAudit.ts 8 条；bi/permission.ts 12 条。

**页面消费**：`pages/iam/PermissionManagementPage.tsx`（消费 iam/permission.ts）；`pages/admin/PermissionAuditPage.tsx`（消费 admin/permissionAudit.ts）；bi/permission.ts 无页面消费。

**①完整度**：部分。权限 CRUD 有后端（iam.rs:52-55 /permissions + mod.rs /iam/permissions/metadata）；权限审计走 /business-tools/permissions/audit-logs（business_tools/audit_api.rs:9-12）。

**②API 对应**：
- iam/permission.ts（/permissions）↔ iam.rs:52-55 ✓。
- admin/permissionAudit.ts（/business-tools/permissions/audit-logs 系列）↔ `src/routes/business_tools/audit_api.rs:9-12` ✓。
- bi/permission.ts（12 方法）无页面消费 → 预埋悬空。

**③菜单覆盖**：iam-permission 菜单 → PermissionManagementPage ✓；admin-permission-audit 菜单 → PermissionAuditPage ✓。

**④设置合理性**：不适用。

**⑤冗余**：高。同一"权限"能力三套前端封装（iam/permission、admin/permissionAudit、bi/permission），且后端权限审计类路由与 audit 模块/iam access-logs 多处重叠。

---

### 2.11 master（后端 svc/master-data 240 路由；前端 api/master 933 方法）

**后端路由**：240 条，`svc/master-data/src/modules/mod.rs` nest 前缀：/quality-v51（:26）、/lineage-v52（:63）、/kg-v53（:97）、/mdm-v54（:123）、/mdm-v55（:171）、/mdm-v56（:210）、/mdm-v57（:259）、/mdm-v58（:309）、/mdm-v59（:375）、/mdm-v60（:453）、/schema-registry（:513）、/dict（:543）。另 main.rs 4 条 + master_plugin.rs 2 条。

**前端 API 方法**：933 条（922 apiClient.master → /api/master-data + 11 apiClient.erp），35 个文件。

**页面消费**：**0 直接消费**。`grep -rln "api/master"` 仅命中 config/runtime.ts、utils/apiPath.ts（路径映射工具），非业务消费；`masterDataApi`（bff 封装，走 /api/erp/master-data-refs）被 `components/common/MasterDataSelector.tsx` 消费，但那是 erp 服务，非 master-data 服务。

**①完整度**：缺口（整目录无消费，服务成孤儿）。

**②API 对应**：
- 覆盖：quality-v51、lineage-v52、kg-v53、mdm-v54~v60、schema-registry、dict ↔ 后端同名 nest ✓（路径一致）。
- 预埋悬空（后端 0 命中）：mdm-v61、v62、v63、v64、v65、v66、v67、v68、v69、v70、v71、v72、v73、v74、v75、v76、v77、v78、v79 —— 19 个版本命名空间（前端 `grep -rhoE "mdm-v[0-9]+" api/master/*.ts` 全集；后端 `grep -rn "mdm-v6[1-9]\|mdm-v7" svc/master-data/src` 0 命中）。涉及 dataSecurityV67（39）、dataSecurityAuditV76（38）、dataFederationMeshV75（37）、dataLifecycleV68（54）、dataPolicyConfigurationV79（31）等约 500+ 方法。
- 消费判定：全部无页面消费 → 预埋悬空。

**③菜单覆盖**：无任何前端菜单入口（modules/ 无 master 模块、pages/ 无 master 目录）→ **孤儿服务**。仅能经 bff masterDataApi → erp /master-data-refs 间接触达（不同链路）。

**④设置合理性**：不适用。

**⑤冗余**：极高。933 方法中约 500+ 指向后端不存在路由；且 master 与 master-data 双别名（runtime.ts:67-68）、api/master 与 api/bff(masterDataApi) 两套"主数据"客户端。

---

### 2.12 bff（后端 svc/portal 854 路由 + svc/server 15 路由；前端 api/bff）

**后端路由**：
- portal 854 条（embedded.rs 424、feature_routes.rs 370、router_config.rs 50、main.rs 6、portal_plugin 2、aggregation 2）。关键端点：/api/portal/graphql（feature_routes.rs:53）、/dashboard/business-stats（router_config.rs:185、embedded.rs:210）、/dashboard/unified-todos（router_config.rs:189、embedded.rs:214）、/todos（router_config.rs:72-75）、/services、/user、/search、/help/*。
- server 15 条（platform_module.rs、modules/{subscription,finance,dashboard,hrm_real,crm_real}_module.rs）：/api/server/health、/api/server/modules、/api/subscriptions、/api/dashboard/*、/api/finance-demo/* 及各服务代理（/api/bi、/api/erp、/api/master-data、/api/portal 等）。

**前端 API 方法**：4 条（bff/index.ts：getBusinessStats、getUnifiedTodos、masterDataApi{list,get,byCode}、getDashboard/completeTodoGql/subscribeServiceHealth 为 graphql/ws）。client：3 apiClient.erp + 1 apiClient.portal。

**页面消费**：getDashboard/completeTodoGql/subscribeServiceHealth 被 `pages/shared/DashboardPage.tsx:42,241-244`、`pages/shared/hooks/UseDashboardData.tsx:26,217-220` 及 ai/automation/doc/erp/finance/mes/pm 各 Dashboard 消费；getBusinessStats/getUnifiedTodos **无消费**（grep 0 命中）；masterDataApi 被 `components/common/MasterDataSelector.tsx` 消费。

**①完整度**：部分。GraphQL 主链路可用（portal 有 /api/portal/graphql）；REST 聚合端点有后端但前端不消费。

**②API 对应**：
- /api/portal/graphql ↔ portal feature_routes.rs:53 ✓（consumed）。
- /dashboard/business-stats、/dashboard/unified-todos ↔ portal router_config.rs:185,189 ✓（有后端、无消费 → 预埋）。
- masterDataApi → /api/erp/master-data-refs（list/by-code）↔ `svc/erp/src/modules/master_data_crud.rs:167,241,280` ✓。
- svc/server 的 /api/subscriptions ↔ `api/notification/subscription.ts` 消费 ✓（server BFF 有真实消费面）。

**③菜单覆盖**：portal/server 为服务型，无独立前端菜单（合理）。

**④设置合理性**：不适用。

**⑤冗余**：中。DashboardPage 与 UseDashboardData 双文件实现同一 BFF dashboard 查询（各 7 处 useQuery）；portal 854 条注册中 embedded.rs（424 条）与 router_config/feature_routes 为"模块化单体嵌入"双轨重复注册（embedded.rs:1-12 注释自述）。

---

### 2.13 unified-core（前端 api/unified-core，base /api/core）

**前端 API 方法**：77 条（businessMetric.ts 31、tenant.ts 19、system.ts 19、search.ts 4、iamAuth.ts 4）。全部 apiClient.core。

**页面消费**：**0 直接消费**（`grep -rln "api/unified-core"` 全 src 0 命中）。

**①完整度**：缺口（整目录预埋）。

**②API 对应**（前端硬编码绝对路径 /api/core/*）：
- /iam/auth/login|register、/users ↔ unified-core ✓。
- /api/core/tenant/context|create|list|my|switch ↔ master.rs ✓。
- /api/core/system/config|cache|params|log/config|settings/smtp ↔ system.rs/settings.rs ✓（settings/smtp 有）。
- /api/core/system/api-keys ↔ settings.rs:16-20 ✓。
- 预埋悬空（后端 0 命中）：/api/core/monitor/*（alerts/business-metrics/rules/slos/performance/reports，businessMetric.ts 31 方法主体）——svc/monitor 在 /api/monitor 前缀（main.rs:33），unified-core 无 monitor 路由；/api/core/search*（search.ts）——search 已外迁（mod.rs 注释），unified-core 无 /search 路由（audit/middleware.rs:31 仅作 skip 路径引用，非路由）。
- /api/core/system/audit-logs（system.ts）→ 全 svc 0 命中（同 2.8 缺口，但此目录无消费）。

**③菜单覆盖**：无独立菜单（预埋 API 目录）。

**④设置合理性**：不适用。

**⑤冗余**：高。77 方法全部无消费；monitor/search 前缀指向已外迁服务（过时路径）；tenant/system 能力与 api/tenant、api/system、api/admin 重复封装。

---

## 三、缺口 / 冗余清单

### 3.1 真实缺口（页面消费了但后端无路由 / 路径不对应）

| # | 模块 | 缺口 | 消费方 | 证据 |
|---|---|---|---|---|
| G1 | workflow | /monitor/analysis/*、/monitor/dashboard、/monitor/logs、/monitor/performance、/monitor/realtime、/monitor/sla-compliance、/monitor/statistics、/monitor/instances/{completed,rejected,running,suspended} 无后端 | WorkflowMonitorPage | api/workflow/monitor.ts vs svc/unified-core/src/routes/flow.rs（后端仅 /monitor/instances/{error,overdue,{id}/retry}） |
| G2 | migration | 前端 /api/core/migration/migrations/services vs 后端 /api/core/api/migrations/services（双前缀错位） | MigrationAdminPage | api/migration/index.ts:18 vs src/routes/migration.rs:11；lib/shared-core/src/api_version.rs:96-108 |
| G3 | automation | 后端 6 路由全部 501 桩；且 /dashboard/stats、/designer/resources、/runs/purge、/webhook/order 路径不对应 | Automation* 5 页 | src/routes/automation.rs:1-5,17-65 |
| G4 | admin/monitor | 前端 /api/core/monitor/* 无服务（svc/monitor 前缀 /api/monitor） | MonitoringAlertPage | api/admin/monitoring.ts:13-21 vs svc/monitor/src/main.rs:33 |
| G5 | admin/systemSetting | /api/erp/system/settings CRUD+batch 全库无路由 | 无页面消费（但 API 存在） | api/admin/systemSetting.ts:13-47 vs 全 svc grep 0 命中（仅 settings.rs:17,31,35 smtp） |
| G6 | system | /system/audit-logs（list/{id}/export/stats）全库无路由 | system/AuditLogPage | api/system/audit.ts:20-62 vs 全 svc grep 0 命中 |

### 3.2 预埋悬空（有封装有类型，无任何页面消费；部分同时后端无路由）

| # | 模块 | 内容 | 方法数 | 证据 |
|---|---|---|---|---|
| P1 | iam | /auth/password-policy、/auth/security-settings、/auth/sessions、/auth/sessions/revoke-all（后端亦无） | 7 | api/iam/auth.ts:84-140；全 svc grep 0 命中；无页面消费 |
| P2 | workflow | form.ts、rule.ts、delegate.ts、variable.ts、category.ts、task.ts（后端亦无对应路径） | ≈120 | api/workflow/*.ts；无 workflowApi.task/form/... 页面调用 |
| P3 | file | 整目录 storage/scan/images/files 系列（部分后端亦无） | 48 | api/file/*.ts；pages/modules 0 import |
| P4 | doc | /workspaces、/documents/my-checkouts、/documents/shared-with-me、collaboration 子路径 | ≈35 | api/doc/workspace.ts、collaboration.ts；后端 doc/handlers.rs 无 |
| P5 | tenant | /tenant/{id}/settings、branding、features、domains、email-config、integrations、security/*、analytics/*（后端亦无） | ≈56 | api/tenant/{config,security,analytics}.ts；grep 无页面消费；后端 master.rs 无 |
| P6 | master | mdm-v61 ~ mdm-v79 共 19 个版本命名空间（后端亦无） | ≈500+ | api/master/*V61..V79.ts vs svc/master-data/src/modules/mod.rs（仅 v54-v60） |
| P7 | unified-core | 整目录（monitor/search/tenant/system/iamAuth），monitor/search 前缀指向已外迁服务 | 77 | api/unified-core/*.ts；全 src 0 import |
| P8 | bff | getBusinessStats、getUnifiedTodos（后端有） | 2 | api/bff/index.ts:98-110；pages/modules 0 消费 |
| P9 | bi/permission | bi/permission.ts 12 方法 | 12 | api/bi/permission.ts；无页面消费 |
| P10 | admin | systemSetting.ts 8 方法（后端亦无） | 8 | api/admin/systemSetting.ts |

### 3.3 冗余 / 死代码 / 死链路

| # | 类型 | 描述 | 证据 |
|---|---|---|---|
| R1 | 前端重复封装 | iam authApi / iamApi / default 三重别名 + 嵌套与扁平双结构 | api/iam/index.ts:45-49 |
| R2 | 前端重复封装 | client.ts workflow/flow 双 getter；runtime.ts workflow/flow、master/master-data 双别名 | api/client.ts:630-635；config/runtime.ts:66-68,81,108-109 |
| R3 | 前端重复封装 | 权限能力三套：iam/permission.ts（4）+ admin/permissionAudit.ts（8）+ bi/permission.ts（12） | api/{iam/permission,admin/permissionAudit,bi/permission}.ts |
| R4 | 后端重复路由 | unified-core 审计 4 套：iam.rs /access-logs、audit /audit/access-logs、/iam/v1/audit/logs、business_tools audit（7 文件）；前端另起 /system/audit-logs | src/routes/iam.rs:45-49；src/modules/audit/mod.rs:136-201；src/routes/business_tools/audit_api.rs:9-12 |
| R5 | 前端重复实现 | DashboardPage 与 UseDashboardData 双实现同一 BFF dashboard 查询（各 7 useQuery） | pages/shared/DashboardPage.tsx、pages/shared/hooks/UseDashboardData.tsx |
| R6 | 后端路由重复注册 | portal embedded.rs 424 条与 router_config/feature_routes 双轨重复（模块化单体嵌入自述） | svc/portal/src/embedded.rs:1-12,103-108 |
| R7 | 死链路 | automation 后端 501 桩 + 前端 5 页消费 → 全链路不可用 | src/routes/automation.rs:1-5 |
| R8 | 死链路 | admin SystemSettingsPage 静态硬编码、无 API；systemSetting API 后端无路由 | pages/admin/SystemSettingsPage.tsx:21-128,312 |
| R9 | 死链路 | doc KnowledgeBasePage 静态模板页、无 API；TenantBillingPage 静态 mock | pages/doc/KnowledgeBasePage.tsx；pages/admin/TenantBillingPage.tsx:43-54 |
| R10 | 死链路 | master-data 服务 240 路由无任何前端菜单/页面消费（孤儿服务） | svc/master-data/src/modules/mod.rs；modules/ 无 master、pages/ 无 master |
| R11 | 测试问题 | api/workflow/__tests__/workflow-api.test.ts 80 处 apiClient 真实调用（非 mock） | api/workflow/__tests__/workflow-api.test.ts |
| R12 | 过时路径 | 前端 unified-core/admin 仍指向 /api/core/monitor/*、/api/core/search/*，服务已外迁（monitor 8095、search 8082） | config/runtime.ts:110-123；svc/monitor/src/main.rs:33 |

---

## 四、关键结论

1. **核心主链路（iam CRUD、workflow 审批/实例/模板、doc 文档/文件夹、system 参数/配置/字典、tenant CRUD）前后端对应良好**，menu→page→api→route 均有实证。
2. **真实缺口集中 6 处**：workflow monitor 子域（G1）、migration 路径双前缀（G2）、automation 整体 501（G3）、admin monitor 前缀错位（G4）、system audit-logs 全库无路由（G6）、admin system settings 无后端（G5）。
3. **预埋悬空规模极大**：master（≈500+ 方法，mdm-v61~v79）、unified-core（77）、file（48）、tenant 子域（56）、workflow 子域（≈120）——前端封装量远超后端实际能力，存在明显"先封装后规划"的推进模式。
4. **冗余集中**：权限/审计能力前后端各 3-4 套实现；Dashboard 双实现；portal 双轨路由；master/master-data、workflow/flow 双别名。
5. 所有数字均可追溯至仓库内 file:line 证据；设置存储表层面，system_configs 与 core_tenant_settings 存在，flow settings 存储表未取证。
