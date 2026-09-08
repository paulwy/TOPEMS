# TOPEMS "核心平台与主数据"组 前后端功能完整性/对应性审计报告

**审计日期**: 2026-09-08
**审计范围**: unified-core (8000) / master-data / server(portal BFF) / 前端 api+pages
**审计方法**: 后端路由注册点全量扫描 + 前端 API 方法全量提取 + 页面 import 消费矩阵 + URL 归一化双向比对

---

## 一、后端路由清单

### 1.1 unified-core（端口 8000，/api/core/*）

**路由总数**: 317 条（不含 3 个 nest 前缀），分布于以下子模块：

| 子模块 | 路由数 | 路径前缀 | 注册文件 |
|--------|--------|----------|----------|
| iam | 51 | /api/core/iam/* | routes/iam.rs (nest /iam) + routes/mod.rs (auth public) |
| flow/workflow | 80 | /api/core/flow/* | routes/flow.rs (nest /flow) |
| file | 27 | /api/core/file/* | routes/file.rs |
| doc | 15 | /api/core/doc/* | modules/doc/handlers.rs (nest /doc) |
| automation | 9 | /api/core/automation/* | routes/automation.rs |
| migration | 4 | /api/migrations/* | routes/migration.rs |
| system | 11 | /api/core/system/v1/* | routes/system.rs |
| feature-flags | 4 | /api/core/system/feature-flags/* | routes/feature_flag.rs |
| settings | 7 | /api/core/system/settings/*, /api/core/system/api-keys/* | routes/settings.rs |
| tenant | 33 | /api/core/tenant/*, /api/core/tenant/tenants/* | routes/master.rs |
| menu | 10 | /api/core/menu/* | routes/master.rs |
| mdm | 7 | /api/core/mdm/refs/* | routes/master.rs |
| audit | 36 | /api/core/audit/*, /api/core/iam/v1/audit/*, /api/core/login-log/* | modules/audit/mod.rs |
| business-tools | 26 | /api/core/business-tools/* | routes/business_tools/* |
| sse | 2 | /api/sse/*, /sse/* | routes/sse.rs, routes/mod.rs |
| websocket | 2 | /ws/core/* | routes/mod.rs |
| openapi/health | 10 | /api-docs, /docs, /swagger, /health, /metrics | routes/openapi.rs, routes/mod.rs |

**关键 handler 映射**:
- iam: `modules::iam::user::*`, `modules::iam::role::*`, `modules::iam::permission::*`, `modules::iam::auth::*`, `modules::iam::position::*`
- flow: `modules::flow::task::*`, `modules::flow::workflow::*`, `modules::flow::instance::*`, `modules::flow::approval::*`, `modules::flow::template::*`, `modules::flow::history::*`, `modules::flow::setting::*`
- file: `modules::file::manage::*`, `modules::file::upload::*`, `modules::file::download::*`

### 1.2 master-data（/api/master-data）

**路由总数**: 240 条，按版本号 nest 前缀组织：

| 版本前缀 | 模块 | 路由数 | 后端文件 |
|----------|------|--------|----------|
| /quality-v51 | 数据质量 | 24 | quality_v51.rs |
| /lineage-v52 | 数据血缘 | 18 | lineage_v52.rs |
| /kg-v53 | 知识图谱 | 14 | knowledge_v53.rs |
| /mdm-v54 | 版本管理 | 24 | versioning_v54.rs |
| /mdm-v55 | API商业化 | 20 | commercial_v55.rs |
| /mdm-v56 | 灾难恢复 | 24 | disaster_v56.rs |
| /mdm-v57 | 语义搜索/图谱 | 24 | semantic_v57.rs |
| /mdm-v58 | 治理成熟度 | 20 | governance_v58.rs |
| /mdm-v59 | AI治理 | 1 | ai_governance_v59.rs |
| /mdm-v60 | 元数据 | 1 | metadata_v60.rs |
| /schema-registry | Schema管理 | ~10 | schema_registry.rs |
| /dict | 字典管理 | ~15 | dict/ |
| health/metrics | 健康检查 | 4 | main.rs |

**注意**: V59 和 V60 后端各只有 1 条路由（占位/骨架），远未完整实现。

### 1.3 server（聚合入口/BFF，嵌入 portal）

**路由总数**: 8 条（主要为 real_service_adapter 适配层 + subscription_module）
- `portal_real_module.rs`: portal 嵌入模块，转发至 portal 服务
- `master_data_real_module.rs`: master-data 适配
- `*_real_module.rs`: 各业务服务适配层（crm/erp/hrm/lims/mes/pm/qms/scm/srm/tms/wms/ehs/rd/finance）
- `subscription_module.rs`: 订阅管理
- `dashboard_module.rs`: 仪表盘聚合

### 1.4 portal（BFF 聚合层，已嵌入 server）

**路由总数**: 816 条（含大量 GraphQL resolver 注册）
- GraphQL schema/resolver: graphql_schema.rs, graphql_types.rs, graphql_dataloader.rs, graphql_cache.rs, graphql_helpers.rs
- 聚合端点: aggregation.rs, orchestration.rs, smart_gateway.rs, federation_gateway.rs, deep_federation.rs
- 用户/导航/通知/搜索/待办: user.rs, navigation.rs, notifications.rs, search.rs, todos.rs, quick_actions.rs
- 监控/安全/限流: monitoring.rs, gateway_monitoring.rs, security_v1.rs, rate_limiting.rs, gateway_security.rs
- 偏好/设置/帮助: preferences.rs, settings.rs, help/
- 部署/版本: deployment_manager.rs, version_control.rs, schema_versioning.rs

---

## 二、前端 API 方法清单

**总方法数**: 1365 个（去重后）

| API 模块 | 方法数 | 使用的 client 命名空间 | 匹配后端率 |
|----------|--------|----------------------|-----------|
| iam | 50 | iam | 72% (36/50) |
| workflow | 204 | workflow | 37% (76/204) |
| file | 45 | file | 16% (7/45) |
| doc | 55 | doc, file | 5% (3/55) |
| migration | 1 | migration | 0% (0/1) |
| automation | 18 | automation | 28% (5/18) |
| master | 702 | master, erp | 33% (232/702) |
| admin | 33 | core, erp | 21% (7/33) |
| system | 33 | core, erp | 42% (14/33) |
| dict | 11 | core | 0% (0/11) |
| tenant | 75 | core | 1% (1/75) |
| bff | 0 | (GraphQL) | N/A |
| shared | 17 | core, file | 6% (1/17) |
| template | 44 | doc | 7% (3/44) |
| unified-core | 77 | core | 36% (28/77) |
| help.ts | 0 | (无 REST 调用) | N/A |

**关键发现**:
- `admin/auditLog.ts` 使用 `apiClient.erp`（指向 /api/erp），而非 unified-core
- `master/dictionary.ts` 使用 `apiClient.erp`（指向 /api/erp/system/dict-types）
- `system/index.ts` 的 dict 方法使用 `apiClient.core`（指向 /api/core/dict/*），但后端该路由已注释
- `bff/` 目录全部走 GraphQL（`bffGraphQL` 函数），无 REST 方法
- `unified-core/` 目录是与 iam/system 重叠的替代 API 层

---

## 三、页面消费矩阵

| API 模块 | 消费页面数 | 消费组件数 | 状态 |
|----------|-----------|-----------|------|
| iam | 17 | 2 | ✅ 正常消费 |
| workflow | 24 | 0 | ✅ 正常消费 |
| file | 0 | 0 | ⚠️ 零消费 |
| doc | 15 | 1 | ✅ 正常消费 |
| migration | 1 | 0 | ✅ 有消费 |
| automation | 12 | 0 | ✅ 正常消费 |
| master | 0 | 0 | ⚠️ 零消费 |
| admin | 10 | 0 | ✅ 正常消费 |
| system | 20 | 0 | ✅ 正常消费 |
| dict | 0 | 0 | ⚠️ 零消费 |
| tenant | 13 | 0 | ✅ 正常消费 |
| bff | 3 | 2 | ✅ 正常消费 |
| shared | 3 | 0 | ✅ 有消费 |
| template | 8 | 3 | ✅ 正常消费 |
| help | 3 | 0 | ✅ 有消费 |
| unified-core | 0 | 0 | ⚠️ 零消费 |

**零消费模块**: file, master, dict, unified-core — 共 835 个 API 方法无任何页面/组件 import。

---

## 四、缺口清单

### 🔴 P1 — 重要功能缺失或明显不对应

#### GAP-01: master/ V61-V79 共 19 个模块无后端实现
- **模块**: master (dataContractV61, apiLifecycleV62, dataStandardV63, dataMaskingV64, dataQualityEnhancedV65, dataAssetCatalogV66, dataSecurityV67, dataLifecycleV68, dataMarketplaceV69, complianceReportV70, dataServiceOrchestrationV71, dataProductCatalogV72, dataServiceMarketplaceV73, dataGovernanceDashboardV74, dataFederationMeshV75, dataSecurityAuditV76, dataLineageEnhancedV77, dataWorkflowAutomationV78, dataPolicyConfigurationV79)
- **类型**: 前端有后端无（后端缺口）
- **影响方法数**: ~470 个
- **描述**: 前端 master API 目录有 36 个文件，后端 master-data 仅实现 V51-V60 共 12 个版本化模块。V61-V79 的 19 个文件（数据契约、API生命周期、数据标准、数据脱敏、数据质量增强、数据资产目录、数据安全、数据生命周期、数据市场、合规报告、数据服务编排、数据产品目录、数据服务市场、数据治理仪表盘、数据联邦网格、数据安全审计、数据血缘增强、数据工作流自动化、数据策略配置）完全无后端路由支撑。
- **证据**: 前端 `apps/web/src/api/master/dataContractV61.ts` 等 19 文件调用 `/api/master-data/mdm-v61/*` 至 `/mdm-v79/*`；后端 `svc/master-data/src/modules/mod.rs` 仅 nest 到 `/mdm-v60`
- **状态**: 已核实
- **补全方向**: 按优先级分批实现后端模块；或在前端标记为 `@experimental` 并隐藏对应入口；V59/V60 后端当前各仅 1 条路由，需优先补全

#### GAP-02: tenant/ 前端 API 与后端路径结构严重不匹配
- **模块**: tenant
- **类型**: 前端有后端无（后端缺口 + 路径不对应）
- **影响方法数**: 74/75
- **描述**: 前端 tenant API 采用 `/api/core/tenant/{tenantId}/analytics/*`、`/billing/*`、`/config/*`、`/webhooks/*`、`/members/*` 等富语义路径（75 方法），后端仅提供 `/api/core/tenant/tenants/{id}` 和 `/api/core/tenant/{id}` 基础 CRUD（33 路由）。前端的租户分析仪表盘、账单管理、Webhook 配置、成员管理高级功能均无后端端点。
- **证据**: 前端 `tenant/analytics.ts:208` 调用 `GET /api/core/tenant/{id}/analytics/overview`；后端 `routes/master.rs:10-64` 仅有 `/tenant/tenants`、`/tenant/{id}`、`/tenant/my` 等基础路径
- **状态**: 已核实
- **补全方向**: 后端新增 tenant analytics/billing/webhooks 子模块；或前端收敛至后端已有的 `/tenant/{id}/stats`、`/tenant/{id}/billing`、`/tenant/{id}/invoices` 端点

#### GAP-03: dict 功能三处实现分裂且 unified-core 路由已禁用
- **模块**: dict, system, master/dictionary
- **类型**: 前端有后端无（后端缺口 + 架构分裂）
- **影响方法数**: 33 个方法
- **描述**: 字典功能存在三处前端实现且路径各不相同：
  1. `dict/dict.ts` (11方法): `apiClient.core` → `/api/core/dict/types/*` — 后端 unified-core dict 路由已全部注释（`routes/master.rs:136` 注释"dict 路由迁移到 svc/master-data"），调用将 404
  2. `system/index.ts` (11方法): `apiClient.core` → `/api/core/dict/dict-types/*` — 同上，后端已禁用
  3. `master/dictionary.ts` (11方法): `apiClient.erp` → `/api/erp/system/dict-types/*` — 调用 ERP 服务，非核心平台
  后端实际字典路由在 `master-data` 的 `/api/master-data/dict/dict-types/*`（`modules/mod.rs:543` nest `/dict`）
- **证据**: 后端 `svc/unified-core/src/routes/master.rs:137-195` 全部 `// let dict_read/write = Router::new()` 注释；后端 `svc/master-data/src/modules/mod.rs:543-560` 有活跃 `/dict` nest
- **状态**: 已核实
- **补全方向**: 统一前端 dict 调用至 `apiClient.master` → `/api/master-data/dict/*`；删除 `dict/` 和 `system/` 中指向已禁用 `/api/core/dict/*` 的方法；确认 ERP 字典与 master-data 字典的数据同步策略

#### GAP-04: workflow/ 前端 API 远超后端实现（监控/表单/变量/分类缺失）
- **模块**: workflow
- **类型**: 前端有后端无（后端缺口）
- **影响方法数**: 128/204
- **描述**: 前端 workflow API 有 204 个方法，覆盖 task(40+), instance, approval, template, definition, form(23), monitor(30), variable(14), category(4), delegate(7), rule(7), notification, setting 等 15 个子模块。后端 flow 仅 80 路由，覆盖 tasks/workflows/instances/approvals/templates/history/records/statistics/settings 基础功能。前端的 **流程监控(monitor)、动态表单(form)、流程变量(variable)、流程分类(category)、流程委托(delegate)、流程规则(rule)** 六大子模块完全无后端对应。
- **证据**: 前端 `workflow/monitor.ts` 30 个方法调用 `/api/core/flow/monitor/*`；后端 `routes/flow.rs` 无 `/monitor` 前缀路由（仅有 `/monitor/instances/error` 和 `/monitor/instances/overdue` 2 条）
- **状态**: 已核实
- **补全方向**: 后端 flow 模块新增 monitor/form/variable/category 子路由；评估前端这些子模块是否为规划中功能，若是则加 `@planned` 标注

#### GAP-05: doc/ 前端工作区/检出/共享功能无后端
- **模块**: doc
- **类型**: 前端有后端无（后端缺口）
- **影响方法数**: 52/55
- **描述**: 前端 doc API 有 55 个方法，后端 doc 仅 15 路由（documents CRUD + templates + folders）。前端的 **工作区管理(workspaces)、文档检出(checkouts)、文档共享(shared-with-me)、文档协作(collaboration)、文档版本(versions)** 等高级功能无后端端点。
- **证据**: 前端 `doc/workspace.ts:112` 调用 `GET /api/core/doc/workspaces`；后端 `modules/doc/handlers.rs:578-610` 仅有 /dashboard, /documents, /templates, /folders 四组路由
- **状态**: 已核实
- **补全方向**: 后端 doc 模块扩展 workspaces/checkouts 子路由；或前端收敛至已有 documents/folders 功能

### 🟡 P2 — 一般功能缺失或悬空 API

#### GAP-06: master/ 整个模块零页面消费（702 方法悬空）
- **模块**: master
- **类型**: 前后端都有但页面未消费（悬空 API）
- **描述**: master API 目录 36 个文件 702 个方法，无任何 pages/ 或 components/ 文件 import。整个主数据前端 API 层处于"已建设未接入"状态。
- **证据**: 页面消费矩阵 master 行 pages=0, components=0
- **状态**: 已核实
- **补全方向**: 确认主数据管理页面是否在规划中；若短期无页面计划，建议将 master API 标记为 `@internal` 或迁移至 `_archive/`

#### GAP-07: file/ 模块零页面消费（45 方法悬空）
- **模块**: file
- **类型**: 前后端都有但页面未消费（悬空 API）
- **描述**: file API 45 个方法（含图片处理 image.ts 15 方法），无页面直接 import。doc 模块通过 `apiClient.file` 间接使用部分文件功能，但 file/ 目录本身未被消费。
- **证据**: 页面消费矩阵 file 行 pages=0, components=0
- **状态**: 已核实
- **补全方向**: 评估是否需要独立文件管理页面；图片处理端点（/images/convert, /images/compress 等）后端未实现，需确认是否计划

#### GAP-08: unified-core/ API 目录为重复替代层（77 方法零消费）
- **模块**: unified-core
- **类型**: 悬空 API + 潜在重复代码
- **描述**: `api/unified-core/` 目录包含 iamAuth.ts, system.ts 等 77 个方法，使用 `apiClient.core` 直接调用 `/api/core/*`，与 `api/iam/` 和 `api/system/` 功能重叠。零页面消费，疑似历史迁移残留。
- **证据**: `unified-core/iamAuth.ts:38` 定义 `login → POST /iam/auth/login`，与 `iam/auth.ts` 重复；页面消费矩阵 unified-core 行 pages=0
- **状态**: 已核实
- **补全方向**: 确认是否为 SDK 层供其他模块使用；若否，建议归档至 `_archive/`

#### GAP-09: iam/ 安全功能后端缺失（14 方法）
- **模块**: iam
- **类型**: 前端有后端无（后端缺口）
- **描述**: 前端 iam API 的以下安全功能无后端端点：
  - 密码策略管理 (`GET/PUT /auth/password-policy`)
  - 会话管理 (`GET /auth/sessions`, `DELETE /auth/sessions/{id}`, `POST /auth/sessions/revoke-all`)
  - 安全设置 (`GET/PUT /auth/security-settings`)
  - 角色权限 CRUD (`GET/POST/DELETE /roles/{id}/permissions`)
  - 权限更新/删除 (`PUT/DELETE /permissions/{id}`)
  - 健康检查 (`GET /health`)
- **证据**: 前端 `iam/auth.ts:84-140`；后端 `routes/mod.rs:128-136` 仅有 login/register/refresh/logout/forgot-password/reset-password 六个 auth 端点
- **状态**: 已核实
- **补全方向**: 后端 iam auth 模块扩展 password-policy/sessions/security-settings 端点；role permission 端点需确认是否复用 user-permissions 体系

#### GAP-10: automation/ 前端扩展端点后端缺失（13 方法）
- **模块**: automation
- **类型**: 前端有后端无（后端缺口）
- **描述**: 前端 automation API 18 方法，后端仅 9 路由。缺失：运行重试/取消/清理 (`runs/{id}/retry`, `runs/{id}/cancel`, `runs/purge`)、设计器资源 (`designer/resources`)、仪表盘统计 (`dashboard/stats`)、健康检查 (`health`)、按代码查询规则 (`rules/by-code/{code}`)。
- **证据**: 前端 `automation/runs.ts:29-61`；后端 `routes/automation.rs:78-87` 仅有 dashboard/designer-schema/rules CRUD/runs list/variables list
- **状态**: 已核实
- **补全方向**: 后端 automation 模块扩展 runs 操作端点和 designer 资源端点

#### GAP-11: migration/ 前端仅实现 1/4 后端端点
- **模块**: migration
- **类型**: 后端有前端无（前端缺口）
- **描述**: 后端 migration 有 4 路由（list_services, get_status, apply_migration, rollback_migration），前端仅实现 `listServices` 1 个方法。缺少获取迁移状态、执行迁移、回滚迁移三个关键操作。
- **证据**: 后端 `routes/migration.rs:10-22`；前端 `migration/index.ts:67` 仅有 listServices
- **状态**: 已核实
- **补全方向**: 前端 migration API 补充 getMigrationStatus, applyMigration, rollbackMigration 三个方法；admin/MigrationAdminPage 已有页面但功能不完整

#### GAP-12: template/ 大部分端点后端缺失（41 方法）
- **模块**: template
- **类型**: 前端有后端无（后端缺口）
- **描述**: 前端 template API 44 方法（使用 apiClient.doc），后端 doc 模块的 /templates 仅有 list/get/create/update/delete/categories 6 路由。前端的模板分配(assignments)、使用统计(usage)、克隆(clone)、导出(export)、导入(import)、依赖(dependencies)、审批(approvals)等功能无后端。
- **证据**: 前端 `template/assignment.ts:110-186`；后端 `modules/doc/handlers.rs:591-602` 仅有 /templates 和 /templates/categories
- **状态**: 已核实
- **补全方向**: 后端 doc 模块扩展 templates 子路由；或前端收敛至基础模板 CRUD

### 🟢 P3 — 命名不一致、文档缺失等

#### GAP-13: admin/auditLog 跨服务调用 ERP 而非 unified-core
- **模块**: admin
- **类型**: 命名/架构不一致
- **描述**: `admin/auditLog.ts` 使用 `apiClient.erp.get('/system/audit-logs')` 调用 ERP 服务的审计日志，而 admin 模块的 operationAudit/permissionAudit 使用 `apiClient.core` 调用 unified-core。同一 admin 模块内审计功能分裂到两个后端服务。
- **证据**: `admin/auditLog.ts:25` 使用 `apiClient.erp`；`admin/operationAudit.ts:83` 使用 `apiClient.core`
- **状态**: 已核实
- **补全方向**: 确认审计日志是否应统一到 unified-core 的 `/api/core/audit/operations`；若 ERP 审计日志为独立数据源，应在代码中加注释说明

#### GAP-14: workflow/flow 别名双 getter 未清理
- **模块**: workflow
- **类型**: 命名不一致
- **描述**: `client.ts:630-634` 同时定义 `workflow` 和 `flow` 两个 getter，均返回 `this.clients.workflow`。`runtime.ts:63` 已标注 `workflow` 为 `@deprecated`，但 getter 未移除，前端代码中可能仍有混用。
- **证据**: `api/client.ts:630-634`；`config/runtime.ts:63-65`
- **状态**: 已核实
- **补全方向**: 全局搜索 `apiClient.workflow` 用法并替换为 `apiClient.flow`；移除 deprecated getter

#### GAP-15: _archive/ aps 后端归档但前端页面仍活跃
- **模块**: _archive 残留
- **类型**: 归档残留引用
- **描述**: `svc/_archive/aps/` 后端已归档，但 `apps/web/src/pages/aps/` 下有 8+ 页面仍在 import `@/api/aps`（该 API 目录仍活跃未归档）。`runtime.ts:93-94` 注释说明 aps 由 mes 的 aps_compat 兼容层提供。billing 和 lowcode 已完全归档无前端引用；feedback 已合并至 ticket 但保留兼容路由。
- **证据**: `pages/aps/ScheduleManagementPage.tsx:4` import `@/api/aps`；`svc/_archive/aps/` 存在
- **状态**: 已核实
- **补全方向**: 确认 aps 前端页面是否通过 mes 兼容层正常工作；若是，更新文档说明；若否，归档前端 aps 页面

#### GAP-16: help.ts 无 REST API 方法
- **模块**: help
- **类型**: 实现方式待确认
- **描述**: `api/help.ts` 未检测到任何 `apiClient.*` REST 调用，但有 3 个帮助中心页面消费。可能使用了不同的调用模式（如直接 fetch、portal BFF GraphQL、或纯静态内容）。
- **证据**: `api/help.ts` 全文无 apiClient 调用；`pages/help/HelpCenterPage.tsx` 等 3 页面 import
- **状态**: 待验证
- **补全方向**: 人工确认 help.ts 的数据获取方式；若使用 portal BFF，应在文件头部标注

---

## 五、总体健康评估

### 5.1 模块完整性分级

| 模块 | 后端路由 | 前端方法 | 匹配率 | 页面消费 | 健康评级 |
|------|---------|---------|--------|---------|---------|
| iam | 51 | 50 | 72% | 17页+2组件 | 🟢 良好（基础功能完整，安全增强缺失） |
| workflow/flow | 80 | 204 | 37% | 24页 | 🟡 一般（核心流程可用，监控/表单/变量缺失） |
| file | 27 | 45 | 16% | 0页 | 🔴 差（零消费 + 图片处理后端缺失） |
| doc | 15 | 55 | 5% | 15页+1组件 | 🟡 一般（基础文档可用，工作区/检出缺失） |
| migration | 4 | 1 | 0% | 1页 | 🔴 差（前端仅 1/4 端点，页面功能不完整） |
| automation | 9 | 18 | 28% | 12页 | 🟡 一般（规则 CRUD 可用，运行操作缺失） |
| master | 240 | 702 | 33% | 0页 | 🔴 差（零消费 + V61-V79 无后端 + V59/V60 骨架） |
| admin | — | 33 | 21% | 10页 | 🟡 一般（跨服务调用分裂） |
| system | — | 33 | 42% | 20页 | 🟡 一般（dict 端点指向已禁用路由） |
| dict | — | 11 | 0% | 0页 | 🔴 差（零消费 + 指向已禁用后端） |
| tenant | 33 | 75 | 1% | 13页 | 🔴 差（路径结构不匹配，分析/账单/Webhook 缺失） |
| bff | 816 | 0(GraphQL) | N/A | 3页+2组件 | 🟢 良好（GraphQL 架构，按设计运行） |
| shared | — | 17 | 6% | 3页 | 🟡 一般 |
| template | — | 44 | 7% | 8页+3组件 | 🟡 一般（大部分端点后端缺失） |
| unified-core | — | 77 | 36% | 0页 | 🔴 差（零消费 + 与 iam/system 重复） |

### 5.2 统计汇总

| 指标 | 数值 |
|------|------|
| 后端路由总数（去重 method+url） | 958 |
| 前端 API 方法总数（去重） | 1365 |
| 前端方法匹配后端 | ~450 (33%) |
| 前端方法无后端对应 | ~915 (67%) |
| 后端路由无前端消费 | 611 (64%) |
| 审计模块总数 | 17 |
| ✅ 功能完整模块 | 2 (iam, bff) |
| 🟡 部分完整模块 | 8 (workflow, doc, automation, admin, system, shared, template, help) |
| 🔴 有明显缺口模块 | 7 (file, migration, master, dict, tenant, unified-core, +server/portal 待验证) |
| 零页面消费模块 | 4 (file, master, dict, unified-core) |
| 零消费方法数 | 835 |

### 5.3 缺口分级统计

| 级别 | 数量 | 占比 | 说明 |
|------|------|------|------|
| P0 阻断 | 0 | 0% | 无核心模块完全不可用 |
| **P1 重要** | **5** | **26%** | master V61-V79、tenant 路径、dict 分裂、workflow 子模块、doc 工作区 |
| **P2 一般** | **7** | **37%** | master/file/unified-core 零消费、iam 安全功能、automation 扩展、migration 前端缺口、template |
| **P3 可选** | **4** | **21%** | admin 跨服务、flow 别名、_archive 残留、help 实现方式 |
| 待验证 | 3 | 16% | server/portal BFF 端点对应性、help.ts 数据获取、部分 URL 归一化边缘 case |

### 5.4 核心结论

1. **"核心平台与主数据"组整体健康度偏低（约 35%）**：前端 API 层建设远超后端实现，1365 个前端方法中仅 33% 有后端路由对应。这是典型的"API 先行、后端滞后"模式。

2. **最严重问题是 master 主数据模块**：702 个方法零页面消费，其中 19 个 V61-V79 模块（~470 方法）完全无后端实现，V59/V60 后端仅骨架。整个主数据前端层处于"建而不用"状态。

3. **tenant 租户模块路径设计不匹配**：前端采用富语义 REST 路径（/analytics, /billing, /webhooks），后端仍为基础 CRUD 结构，75 个方法中仅 1 个匹配。

4. **dict 字典功能架构分裂**：三处前端实现指向三个不同后端（unified-core 已禁用、ERP 服务、master-data 活跃），需立即统一。

5. **四个模块零页面消费（835 方法悬空）**：file、master、dict、unified-core 需确认是规划中还是应归档。

6. **workflow/flow 别名已标注 deprecated 但未清理**，client.ts 双 getter 应在下一版本移除。

7. **_archive 中 aps 后端归档但前端页面仍活跃**，需确认 mes 兼容层是否正常支撑。

### 5.5 优先修复建议

**立即修复（P1）**:
1. 统一 dict 前端调用至 `apiClient.master` → `/api/master-data/dict/*`，删除指向已禁用 `/api/core/dict/*` 的方法
2. 确认 master V61-V79 模块的产品计划，无计划的归档至 `_archive/`
3. tenant 前端 API 收敛至后端已有端点，或后端新增 analytics/billing/webhooks 子模块

**短期修复（P2）**:
4. migration 前端补充 3 个缺失方法（已有页面等待）
5. iam 后端补充 password-policy/sessions 端点（前端安全页面已建设）
6. 评估 file/master/dict/unified-core 零消费模块的去留

**长期优化（P3）**:
7. 清理 workflow deprecated getter
8. 统一 admin 审计日志服务来源
9. 确认 _archive/aps 前端页面兼容性

---

*报告生成时间: 2026-09-08 | 审计工具: 自定义路由/API 提取脚本 + URL 归一化双向比对*
