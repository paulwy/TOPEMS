# Group C 制造/质量/研发/项目管理 模块组 — 全量 5 维度实测评估（Raw）

- 评估日期：2026-09-09
- 评估对象：mes / aps / qms / pdm / ehs / lims / rd / pm（后端 svc/* + 前端 api/* + 前端 modules/*）
- 取证方式：仓库内 grep/find/读取实测，所有数字均附 `file:line` 证据；无法取证处标注「未取证」
- 关键架构事实（影响后续所有对应判断）：
  - 路由挂载：`svc/server/src/modules/*_real_module.rs` 将各业务模块 `create_routes()` 以 `api_prefix` 挂载（如 `mes_real_module.rs:42` → `/api/mes`、`qms_real_module.rs:43` → `/api/qms`、`pm_real_module.rs:42` → `/api/pm`、`ehs_real_module.rs:47` → `/api/ehs`、`rd_real_module.rs:40` → `/api/rd`、`lims_real_module.rs:45` → `/api/lims`）；pdm 独立部署（`svc/pdm/src/main.rs:40` api_prefix=/api/pdm，traefik `deploy/docker/traefik/dynamic.yml:99-104`）。
  - APS：无独立后端服务。原 `svc/_archive/aps` 已归档；现由 `svc/mes/src/modules/aps_compat.rs` 提供 `/api/aps/*` 301 重定向到 `/api/mes/*`（`apps/web/src/config/runtime.ts:93-94` 注释、`deploy/docker/traefik/dynamic.yml:325-331`）。
  - 前端子客户端 baseURL：`apps/web/src/config/runtime.ts:86-99`（mes→/api/mes、aps→/api/aps、qms→/api/qms、pdm→/api/pdm、ehs→/api/ehs、lims→/api/lims、rd→/api/rd、pm→/api/pm）。

---

## 1. 模块 × 5 维总览表

| 模块 | D1 前后端完整度 | D2 前后端 API 对应 | D3 菜单前后端覆盖 | D4 设置合理性 | D5 冗余判定 |
|---|---|---|---|---|---|
| mes | 完整（170 后端路由 / 65 前端路径，全对应） | 完整（无真实缺口；/health 为公共基础设施路由） | 部分（2 个孤儿页无菜单；work-order/quality 双菜单项） | 差（4 个设置页全为占位空模板，无后端接口） | 高（2 空 API 文件、2 孤儿页、3 组重复页面、APS 双前端表面） |
| aps | 部分（5 前端路径全部经 301 重定向链路可用，但走废弃链路） | 部分（无真实缺口，但全部依赖 mes 兼容层，2026-11-28 计划移除） | 完整（17 页面均有菜单入口与后端覆盖） | NA（无设置页） | 高（独立服务已归档、api/aps 与 api/mes/aps 双表面、mes 内双 APS 实现并存） |
| qms | 完整（99 后端路由 / 26 前端路径，无缺口） | 完整 | 完整（26 页面均有菜单与后端） | NA（无设置页；后端亦无 settings 端点） | 中（qms/mock.ts 954 行死代码与 mockData.ts 重复；同路径拆分注册为合法写法） |
| pdm | 完整（67 后端路由 / 24 前端路径，无缺口） | 完整 | 完整（16 页面 + 4 设置占位页均有菜单） | 差（4 个设置页全为占位；/configurations 被产品配置页消费而非设置页） | 中（BomPage 与 PdmBomPage 双页面） |
| ehs | 缺口（FE 49 路径中 /dashboard 无后端路由） | 缺口（1 真实缺口：ehs/dashboard.ts:16；另有 ehsDashboardApi 预埋悬空） | 完整（21 页面均有菜单） | NA（无设置页） | 低（1 个预埋悬空 API） |
| lims | 缺口（FE 46 路径中 /dashboard 无后端路由且页面真实消费） | 缺口（1 真实缺口：lims/dashboard.ts:16 ← LimsDashboardPage.tsx:23） | 完整（18 页面均有菜单） | NA（无设置页） | 低 |
| rd | 部分（74 后端路由中大量 FE 未消费；FE 16 路径中 14 走 rd、2 走 erp） | 部分（无真实缺口；但后端预埋大量未消费路由：ai/change-orders/patents/research-costs/material-tests 等） | 部分（code/review/release/milestone 为 facade 页复用他 API，无专属后端） | 差（RsSettingsPage 仅本地内存 CRUD，无持久化） | 高（change_management/ai_integration 后端模块无 FE 消费；RsMilestonePage.tsx.bak 死文件） |
| pm | 完整（87 后端路由 / 27 前端路径，无缺口） | 完整 | 完整（23 页面均有菜单） | NA（无设置页） | 中（三套项目创建/主从页面并存） |

---

## 2. 逐模块详细评估卡

### 2.1 mes（制造执行）

**后端路由**
- `.route(` 出现次数：180（`svc/mes/src` 全量 grep，证据文件 `tmp/assess-c/be_mes_routes.txt`）
- 去重后唯一路径：**170**（含多行注册，`tmp/assess-c/be_mes_paths2.txt`），前缀 `/api/mes`（`svc/server/src/modules/mes_real_module.rs:42`；legacy `/api/v1/mes`）
- 关键模块证据：`production_order.rs:32-49`（/orders 集合+详情+审批）、`production_plan.rs:22-29`、`capacity.rs:22-31`、`demand_forecast.rs:23-34`、`production_scheduling.rs:29+`、`aps_scheduling.rs:33-47`（/aps/schedule 等 6 条）、`material_plan.rs:27+`、`work_order.rs:35-38`、`audit.rs:39-40`（/audit-logs，见冗余）、`quality_traceability.rs:25-26`

**前端 API**
- `apiClient.` 调用次数：**181**（`apps/web/src/api/mes/`，`tmp/assess-c/fe_mes_api.txt`）
- 去重后基础路径：**65**（`tmp/assess-c/fe_mes_urls2.txt`）
- 聚合对象 `mesApi` 子域消费：orders(11)/workOrders(5)/teams(5)/workstations(4)/processes(4)/workReports(2)/schedules(2)/records(2)/equipment(2)/traceability(1)/kanban(1)/equipmentOee(1)（`pages/mes/`+`modules/mes/` 实测）

**页面消费**
- 40 个页面/模块文件 import `@/api/mes`（清单见上文总览，代表性：ProductionOrderManagementPage、ProductionDashboardPage/index.tsx、ApsSchedulingPage、MaterialBOMPage、MesWorkOrderPage 等；`pages/mes/` 全量 grep）
- 直接按文件 import：anomalyDetection（AnomalyDetectionPage.tsx:33）、energyManagement（EnergyManagementPage.tsx:12）、process/processFlow/productionCost/quality（ProcessRoutePage.tsx:8、ProcessFlowPage.tsx:15、ProductionCostPage.tsx:20、QualityInspectionPage.tsx:9）等

**菜单覆盖（apps/web/src/modules/mes/config.ts）**
- `MES_PATHS` 定义 39 个菜单路由（config.ts:8-45），含两套菜单体系（旧 1477 行起 / 新 905 行起）
- 疑点：`/mes/work-order`（WorkOrderPage，config.ts:963）与 `/mes/work-orders`（MesWorkOrderPage，config.ts:1302）并存；`/mes/quality`（MesQualityPage，config.ts:1314）与 `/mes/quality-inspection`（QualityInspectionPage，config.ts:1114）并存
- 孤儿页（有页面无菜单）：`pages/mes/MesEquipmentPage.tsx`、`pages/mes/TraceabilityDetailPage.tsx`（全仓无任何 import/config 引用）
- 后端模块无菜单/无 FE 消费：`audit.rs`（/audit-logs，FE 无任何 api/mes 消费者）

**设置项检查**
- 4 个设置页全为占位空模板（`sections={[]}`、`actions={[]}`、无任何 API/useQuery 调用）：
  - `pages/mes/setting/ApsConfigPage.tsx`（全文件 17 行，无 api 引用）
  - `pages/mes/setting/BomVersionPolicyPage.tsx`、`EquipmentThresholdPage.tsx`、`QualityTemplatePage.tsx`（api_hits=0 实测）
- mes 后端无任何 /settings、/config、/threshold、/templates 端点（grep 全量无命中）→ 设置项前后端完全不对应，纯静态占位

**冗余发现**
- 空文件死代码：`apps/web/src/api/mes/approval.ts`（0 行）、`apps/web/src/api/mes/analytics.ts`（0 行），均未导出未消费
- 孤儿页 2 个（见上）
- 重复页面：WorkOrderPage/MesWorkOrderPage、QualityInspectionPage/MesQualityPage（双菜单并存）、EquipmentManagementPage 与 MesEquipmentPage（后者孤儿）
- APS 双表面：`api/mes/aps.ts`（走 /api/mes/aps/*）+ `api/aps/`（走 /api/aps/* 兼容层）

---

### 2.2 aps（高级排程）

**后端路由**
- 无独立服务：`svc/_archive/aps` 已归档（源码 31 条 `.route(`，`tmp/assess-c/be_aps_routes.txt` 未独立统计，见 `_archive/aps/src/modules`）
- 现行实现（均在 svc/mes 内）：
  - `aps_scheduling.rs:33-47`：/aps/schedule、/aps/schedule/simulate、/aps/schedule/check-constraints、/aps/schedule/optimization-report、/aps/schedule/bottleneck-analysis、/aps/orders/{id}/feasibility（6 条，挂在 /api/mes 下）
  - `aps_compat.rs:27-43`：/production-plans/*、/capacities/*、/forecasts/* 显式重定向 + `/{*path}` 兜底（挂在 `/api/aps`，`mes/src/main.rs:94` nest）
  - 合计 aps 可达路径 **22**（compat 层 + aps_scheduling，含 `/{*path}` 兜底）

**前端 API**
- `apiClient.` 调用次数：**42**（`apps/web/src/api/aps/`，`tmp/assess-c/fe_aps_api.txt`）
- 去重基础路径：**5**：/capacities、/forecasts、/material-plans、/production-plans、/schedules
- 全部经 `/api/aps` → 301 → `/api/mes`（material-plans/schedules 走兜底重定向；forecasts 映射为 demand-forecasts，`aps_compat.rs:49-58`）

**页面消费**
- 17 个页面消费 `@/api/aps`（ScheduleManagementPage、CapacityManagementPage、ProductionPlanPage、ForecastManagementPage、MaterialPlanPage 及 analytics/* 6 页等，全量清单见上文）
- 另 `pages/mes/ApsSchedulingPage.tsx:36` 消费 `@/api/mes` 的 apsApi（/aps/schedule/*）

**菜单覆盖（modules/aps/config.ts）**
- APS_PATHS 20 个菜单路由，17 个页面组件全部可解析（实测无缺失）；后端覆盖经兼容层齐全

**设置项**：无设置页。**冗余**：见总览（归档服务 + 双表面 + 兼容层移除期限 `aps_compat.rs:91-96` deprecated_since=2026-08-28、removal_date=2026-11-28）。

---

### 2.3 qms（质量管理）

**后端路由**
- `.route(` 出现次数：154；去重唯一路径 **99**（`tmp/assess-c/be_qms_paths2.txt`），前缀 /api/qms（`qms_real_module.rs:43`）
- 模块证据：`quality_inspection.rs:605-617`、`corrective_action.rs:285-286`、`audit.rs`、`spc.rs`、`fmea.rs`、`apqp.rs`、`quality_dashboard.rs`、`data_sync.rs`（/sync-records 等）
- 说明：同文件同路径 `.route("/checks", get(...))` 与 `.route("/checks", post(...))` 拆分注册，axum 0.8.9 `path_router.rs:94-97` 明确允许合并（"This makes .route("/", get(_)).route("/", post(_)) work"），非缺陷

**前端 API**
- `apiClient.` 调用次数：**115**（`api/qms/`）；去重基础路径 **26**（含动态模板 /{id}/{id}/approve 等通用审批端点，`qms/index.ts:317` 注释）
- 前端 26 个基础路径 100% 有后端路由覆盖（自动比对无缺失）

**页面消费**
- 26 个页面 + pages/shared/DashboardPage.tsx、UseDashboardData.tsx（清单见上文）

**菜单覆盖（modules/qms/config.ts）**
- QMS_PATHS 26 个菜单路由，24 个页面组件全部可解析；后端均有对应路由

**设置项**：无设置页，后端亦无 settings 端点（一致性 NA）。**冗余**：
- `api/qms/mock.ts`（954 行）与 `api/qms/mockData.ts`（970 行）内容重复，页面全部 import `mockData`（QmsApqpProjectDetailPage.tsx:25 等 5 处），`mock.ts` 无任何消费 = 死代码
- `api/qms/adapters.ts`（539 行）经 barrel 导出（index.ts:22），正常

---

### 2.4 pdm（产品数据管理）

**后端路由**
- `.route(` 出现次数：77；去重唯一路径 **67**（`tmp/assess-c/be_pdm_paths2.txt`），前缀 /api/pdm（`svc/pdm/src/main.rs:40`，独立部署 traefik `dynamic.yml:99-104` → svc-pdm:8031）
- 模块证据：`bom.rs`、`configuration.rs:15-19`（/configurations）、`document.rs`、`document_version.rs`、`change_notice.rs`、`workflow.rs`、`production_formula.rs`、`production_process.rs`、`production_batch.rs` 等

**前端 API**
- `apiClient.` 调用次数：**121**（`api/pdm/`）；去重基础路径 **24**（含 /bom-items、/bom-versions、/change-notices、/configurations、/production-formulas、/production-processes、/workflow-instances 等）
- 自动比对：24 路径全部有后端覆盖（含 /configurations：后端 configuration.rs:15-19 ↔ 前端 api/pdm/index.ts:474-491）

**页面消费**
- 16 个页面消费 `@/api/pdm`（PdmBomPage、BomPage、MaterialPage、ProductPage、PdmProductConfigPage、PdmFormulaPage、PdmProcessPage、PdmBatchPage、DocumentPage、ChangePage、PdmProjectPage、PdmVersionPage、PdmStatsPage 等，清单见上文）

**菜单覆盖（modules/pdm/config.ts）**
- PDM_PATHS 21 个菜单路由，20 个页面组件全部可解析；后端覆盖齐全
- 疑点：`/pdm/bom`（BomPage，config.ts:95-97）与 `/pdm/pdm-bom`（PdmBomPage，config.ts:108-110）双 BOM 页面并存

**设置项检查**
- 4 个设置页全为占位空模板（api_hits=0）：`pages/pdm/setting/BomTemplatePage.tsx`、`CategoryRulePage.tsx`、`ChangeTemplatePage.tsx`、`DocApprovalFlowPage.tsx`
- 后端有 /configurations（configuration.rs:15-19）但被产品配置 CRUD 页（PdmProductConfigPage.tsx:11）消费，与 4 个「设置」占位页无关 → 设置项前后端不对应

**冗余**：BomPage + PdmBomPage 双页面（菜单中均可见）；PdmProductCategoryPage 与 ProductPage 功能重叠（未取证到明确去重依据，标注观察项）。

---

### 2.5 ehs（环境健康安全）

**后端路由**
- `.route(` 出现次数：139；去重唯一路径 **136**（`tmp/assess-c/be_ehs_paths2.txt`），前缀 /api/ehs（`ehs_real_module.rs:47`；部分路由自带 /api/ehs 前缀，如 openapi.rs）
- 模块证据：`risk.rs`（/hazards）、`accident.rs`（/incidents）、`environment.rs`、`training.rs`、`safety_check.rs`（/checks）、`occupational_health.rs`、`occupational_disease.rs`、`hazardous_material.rs`、`data_sync.rs`（/sync/to-qms、/sync/to-lims）等

**前端 API**
- `apiClient.` 调用次数：**258**（`api/ehs/`，全组最高）；去重基础路径 **49**
- **真实缺口 1 个**：`api/ehs/dashboard.ts:16` 调用 `/dashboard`，后端 ehs 全仓无任何 dashboard 路由（grep 无命中）

**页面消费**
- 21 个页面 + pages/shared/DashboardPage.tsx、UseDashboardData.tsx（清单见上文）
- 注意：EhsDashboardPage.tsx 并未消费 ehsDashboardApi，而是读取 `window.__ehsStats` 全局占位（EhsDashboardPage.tsx:22-25）→ dashboard 数据链路为空

**菜单覆盖（modules/ehs/config.ts）**：EHS_PATHS 16 个菜单路由，15 个页面组件全部可解析

**设置项**：无设置页。**冗余/悬空**：
- `ehsDashboardApi`（ehs/index.ts:43 聚合为 ehsApi.dashboard）**预埋悬空**：无任何页面消费，且后端无 /dashboard（双重重叠问题）

---

### 2.6 lims（实验室信息管理）

**后端路由**
- `.route(` 出现次数：120；去重唯一路径 **118**（`tmp/assess-c/be_lims_paths2.txt`），前缀 /api/lims（`lims_real_module.rs:45`）
- 模块证据：`sample.rs`、`inspection_task.rs`、`reagent.rs`、`instrument_data/`、`proficiency_testing.rs`（/pt-plans 等）、`test_method.rs`、`uncertainty.rs`、`sample_barcode.rs`、`data_sync.rs`（/sync/reagent-to-ehs、/sync/record-to-qms）等

**前端 API**
- `apiClient.` 调用次数：**99**；去重基础路径 **46**
- **真实缺口 1 个**：`api/lims/dashboard.ts:16` 调用 `/dashboard`，后端 lims 全仓无 dashboard 路由（grep 无命中）

**页面消费**
- 18 个页面 + pages/admin/AuditLogPage.tsx（auditLimsApi）+ pages/shared/DashboardPage.tsx、UseDashboardData.tsx（清单见上文）
- `LimsDashboardPage.tsx:23` 真实调用 `limsApi.dashboard.getOverview()` → `/dashboard` → 后端 404（真实缺口，页面级消费）

**菜单覆盖（modules/lims/config.ts）**：LIMS_PATHS 18 个菜单路由，17 个页面组件全部可解析

**设置项**：无设置页。**冗余**：低（未见重复页面/空文件；仪表盘缺口为主要问题）。

---

### 2.7 rd（研发管理）

**后端路由**
- `.route(` 出现次数：82；去重唯一路径 **74**（`tmp/assess-c/be_rd_paths2.txt`），前缀 /api/rd（`rd_real_module.rs:40`）
- 模块证据：`rd_ci_cd.rs:22-32`（/bugs、/builds、/deploys、/tests 各 +{id}）、`project.rs`（/projects、/projects/batch、/projects/{id}/gantt 等）、`experiment.rs`、`formula.rs`、`material.rs:61-72`（/material-tests/*，注意：非 /materials）、`change_management.rs:593-611`（/change-requests、/change-orders）、`ai_integration.rs:87-91`（/ai/analyses、/ai/chat）、`patent.rs:84-89`（/patents）、`research_cost.rs:76-85`（/research-costs）、`project_member.rs`（/members）、`project_milestone.rs`、`project_phase.rs`、`doc_integration.rs`（/documents）

**前端 API**
- `apiClient.` 调用次数：**60**（`api/rd/`）；去重基础路径 **16**，其中：
  - `apiClient.rd`：14 条（/audit-logs、/batch-trace、/bugs、/builds、/deploys、/experiments、/experiments/project、/formulas、/health、/projects、/projects/batch、/projects/import、/statistics、/tests）
  - `apiClient.erp`：2 条（`api/rd/material.ts:30-90` 的 /materials、/materials/import 走 ERP 服务，非 rd 后端）
- 前端 14 条 rd 路径全部有后端覆盖（无真实缺口）

**页面消费**
- 23 个页面 + pages/admin/AuditLogPage.tsx（auditRdApi）+ pages/shared/DashboardPage.tsx 等（清单见上文）
- CI/CD 页面后端覆盖专项：
  - RsBugPage ← bug.ts → /bugs ✓（rd_ci_cd.rs:22）
  - RsBuildPage ← build.ts → /builds ✓（rd_ci_cd.rs:27）
  - RsTestPage ← test.ts → /tests ✓（rd_ci_cd.rs:31）
  - RsDeployPage ← deploy.ts → /deploys ✓（rd_ci_cd.rs:29）
  - RsReviewPage ← buildApi（review 复用构建数据，RsReviewPage.tsx:10）
  - RsReleasePage ← deployApi（复用部署数据，RsReleasePage.tsx:10）
  - RsCodePage ← rdApi.listProjects/updateProject（复用项目 API，RsCodePage.tsx:35/57）
  - RsMilestonePage ← buildApi（里程碑页复用构建 API，RsMilestonePage.tsx:43/60）—— 页面语义与后端数据模型错位

**菜单覆盖（modules/rd/config.ts）**：RD_PATHS 21 个菜单路由，23 个页面组件引用全部可解析（含 RsOverviewPage/RsReportPage）

**设置项检查**
- `RsSettingsPage.tsx:143-187`：仅调用 `rdApi.getStatistics()` 后做**本地内存 CRUD**（currentData 数组），无任何后端持久化 → 设置项无实际作用
- 后端无 /settings 端点（grep 无命中）

**冗余/死链**
- 后端预埋未消费（FE 全仓 grep=0）：/ai/analyses、/ai/chat（ai_integration.rs:87-91）、/change-orders（change_management.rs:611）、/change-requests（593-607）、/patents（patent.rs:84）、/research-costs（research_cost.rs:76-85）、/material-tests（material.rs:61-72）、/members、/milestones、/phases、/documents、/reports/projects/* 等
- `pages/rd/RsMilestonePage.tsx.bak` 死文件（备份文件残留在 pages 目录）
- RD 无独立「代码仓库/评审/发布/里程碑」后端能力，4 个菜单页为 facade 复用

---

### 2.8 pm（项目管理）

**后端路由**
- `.route(` 出现次数：89；去重唯一路径 **87**（`tmp/assess-c/be_pm_paths2.txt`），前缀 /api/pm（`pm_real_module.rs:42`；legacy /api/v1/pm）
- 模块证据：`project.rs`、`project_phase.rs`、`project_milestone.rs`、`project_member.rs`、`project_resource.rs`、`project_expense.rs`、`project_benefit.rs`、`contract.rs`、`budget.rs`、`risk.rs`、`acceptance.rs`、`settlement.rs`、`notification.rs`（/notification-settings）、`task.rs`、`project_type_config.rs`（/project-types）、`service_integration.rs` 等

**前端 API**
- `apiClient.` 调用次数：**147**；去重基础路径 **27**（含 /projects、/contracts、/budgets、/risks、/settlements、/acceptance-plans、/notification-settings、/statistics/* 等）
- 自动比对：27 路径全部有后端覆盖（无真实缺口）

**页面消费**
- 23 个页面（PmProjectListPage、PmProjectDetailPage、PmContractListPage、PmContractDetailPage、PmReportPage、ProjectTaskKanbanPage、ProjectTimelinePage、PmTemplatePage、PmResourcePage、DashboardPage 及 components/hooks 等，清单见上文）

**菜单覆盖（modules/pm/config.ts）**
- PM_PATHS 14 个菜单路由，14 个页面组件引用全部可解析
- 疑点：项目创建存在三套页面：PmProjectCreatePage（config.ts:158）、ProjectCreateWizardPage（config.ts:228）、ProjectMasterDetailPage（config.ts:245）并存

**设置项**：无设置页；后端 notification-settings（notification.rs）被 FE 消费（/notification-settings 在 FE 27 路径中），一致性 OK。**冗余**：三套项目创建/主从页面并存（观察项，未取证到统一计划）。

---

## 3. 缺口 / 冗余清单

### 3.1 真实缺口（页面消费了但后端无路由）— 全组仅 2 处

| # | 模块 | 前端调用证据 | 说明 |
|---|---|---|---|
| G1 | ehs | `apps/web/src/api/ehs/dashboard.ts:16` GET /dashboard | 后端 ehs 全仓无 dashboard 路由（grep 无命中）；且 ehsDashboardApi 无任何页面消费（预埋） |
| G2 | lims | `apps/web/src/api/lims/dashboard.ts:16`；真实页面消费 `pages/lims/LimsDashboardPage.tsx:23` | 后端 lims 全仓无 dashboard 路由；EHS 侧 EhsDashboardPage.tsx:22-25 退化为读取 window.__ehsStats 全局占位 |

### 3.2 预埋悬空（有封装/有类型/有后端，但无任何页面消费）

| # | 模块 | 证据 | 说明 |
|---|---|---|---|
| P1 | ehs | ehsDashboardApi（ehs/index.ts:43 聚合），页面消费=0 | 封装了 /dashboard 但无人用，后端也没有 |
| P2 | rd | 后端 ai_integration.rs:87-91（/ai/analyses、/ai/chat）、change_management.rs:593-611（/change-requests、/change-orders）、patent.rs:84（/patents）、research_cost.rs:76-85（/research-costs）、material.rs:61-72（/material-tests）、project_member/milestone/phase（/members、/milestones、/phases）、doc_integration（/documents）、reports/projects/* | FE 全仓 grep=0，后端整套能力无前端入口 |
| P3 | mes | 后端 audit.rs:39-40（/audit-logs、/audit-logs/{id}） | FE api/mes 无任何 audit 消费者（audit 由 admin 页走 lims/rd 客户端） |
| P4 | qms | `api/qms/mock.ts`（954 行） | 与 mockData.ts（970 行，5 页面使用）功能重复，mock.ts 无人 import |

### 3.3 冗余 / 重复实现 / 死代码

| # | 模块 | 证据 | 类型 |
|---|---|---|---|
| R1 | mes | `api/mes/approval.ts`、`api/mes/analytics.ts` 均为 0 行空文件，未导出未消费 | 死文件 |
| R2 | mes | `pages/mes/MesEquipmentPage.tsx`、`pages/mes/TraceabilityDetailPage.tsx` 无任何 config/import 引用 | 孤儿页 |
| R3 | mes | WorkOrderPage（config.ts:963）vs MesWorkOrderPage（config.ts:1302）；QualityInspectionPage（config.ts:1114）vs MesQualityPage（config.ts:1314） | 双页面双菜单 |
| R4 | mes/aps | 双前端表面：api/aps/*（42 次调用，5 路径，走 301 兼容层）+ api/mes/aps.ts（/aps/schedule/*）；双页面集：pages/aps/*（17 页）+ pages/mes/ApsSchedulingPage.tsx；原 svc/_archive/aps 已归档 | 双实现并存（迁移过渡，有移除期限 2026-11-28） |
| R5 | qms | mock.ts vs mockData.ts 重复（见 P4） | 死代码 |
| R6 | pdm | BomPage（config.ts:95）vs PdmBomPage（config.ts:108）双 BOM 页面；PdmProductCategoryPage/ProductPage 重叠（观察项） | 双页面 |
| R7 | pm | PmProjectCreatePage（config.ts:158）+ ProjectCreateWizardPage（config.ts:228）+ ProjectMasterDetailPage（config.ts:245）三套并存 | 双/三页面 |
| R8 | rd | `pages/rd/RsMilestonePage.tsx.bak` 残留；code/review/release/milestone 4 个菜单页为 facade（复用 project/build/deploy API），后端无专属能力 | 死文件 + 语义错位 |
| R9 | 全组 | 后端「同路径拆分注册」模式（qms quality_inspection.rs:605-606 等）：`/checks` 先 get 再 post 分两条 .route() 注册 —— axum 0.8.9 path_router.rs:94-97 确认合法（自动合并），非缺陷，但建议合并为方法链写法 | 风格观察（非缺陷） |

### 3.4 设置项专项问题（D4）

| # | 模块 | 证据 | 问题 |
|---|---|---|---|
| S1 | mes | 4 个设置页全为占位（sections={[]}/actions={[]}，api_hits=0）：ApsConfigPage.tsx（全 17 行）、BomVersionPolicyPage.tsx、EquipmentThresholdPage.tsx、QualityTemplatePage.tsx | 菜单有设置项，后端无任何设置端点，页面无功能 = 硬编码占位 |
| S2 | pdm | 4 个设置页全为占位（api_hits=0）：BomTemplatePage.tsx、CategoryRulePage.tsx、ChangeTemplatePage.tsx、DocApprovalFlowPage.tsx；后端 /configurations 存在但被 PdmProductConfigPage 消费 | 设置项前后端不对应 |
| S3 | rd | RsSettingsPage.tsx:143-187 仅本地内存 CRUD（currentData），无持久化 | 设置项无实际作用 |
| S4 | ehs/lims | 无设置页；但 Dashboard 数据链路为空（见 G1/G2） | 观察项 |

### 3.5 未取证项

- 各表（死表）与数据层对应关系：本评估仅覆盖 API/路由/菜单层，未执行 SQL 层死表核验（死表清单已有独立评估 `docs/assessments/dead-tables-review-2026-09-08.md`，可交叉引用）
- qms/pdm/ehs 等服务的运行时路由装配是否与 `svc/server` 统一入口一致（代码层面证据齐全，未启动进程实测）
- mes 双菜单体系（config.ts:905 起与 1477 起两套）的线上实际展示路径（未取证）
- pm 三套项目创建页面的最终用户可见入口归属（未取证）

---

## 4. 结论摘要

- 前后端路由对应整体健康：8 个模块中 6 个（mes/qms/pdm/aps/pm/rd）前端消费路径全部有后端覆盖；全组**真实缺口仅 2 处**（ehs、lims 的 /dashboard），且 ehs 侧缺口因页面已退化为全局变量占位而隐性化。
- 最大系统性风险在 **rd**：后端预埋大量未消费能力（变更管理/专利/研发成本/AI/物料测试/成员里程碑阶段/文档/报表），同时前端 4 个菜单页（code/review/release/milestone）以 facade 形式复用项目/构建/部署 API，语义错位；设置页仅本地内存操作。
- **mes/aps** 处于明确的迁移过渡态（原 aps 服务归档、兼容层 301、2026-11-28 移除期限），当前双前端表面双页面集并存属可控冗余，但需在移除期限前完成 api/aps → api/mes 的前端切换。
- **设置项整体最弱**：mes 4 页 + pdm 4 页 + rd 1 页均为无后端/无持久化的占位或本地实现，D4 维度全组无一个模块达标。
- 死代码集中点：mes 2 个空 API 文件 + 2 个孤儿页 + 3 组重复页面；qms mock.ts 954 行死代码；rd .bak 文件残留。
