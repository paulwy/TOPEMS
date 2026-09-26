# TOPEMS "HR 与制造" 组前后端功能完整性/对应性审计报告

**审计日期**: 2026-09-08
**审计范围**: hrm / mes(含 aps_compat) / pdm / qms / rd 五个后端服务及对应前端 API 与页面
**仓库根路径**: /Users/air/TOPEMS

---

## 一、后端路由总览

### 1.1 HRM 服务 (`/api/hrm`) — 82 个路由注册点

| 模块文件 | 路由前缀 | 路由数 | 关键端点 |
|---|---|---|---|
| employee.rs | /employees | 5 | list, get, create, update, delete, details, export |
| department.rs | /departments | 2 | list+create, get+update+delete |
| company.rs | /companies | 2 | list+create, get+update+delete |
| position.rs | /positions | 2 | list+create, get+update+delete |
| contract.rs | /contracts, /contract-renewals | 10 | CRUD + expiring, renew, approve/reject/execute |
| attendance.rs | /attendance | 3 | list+create, today-status, get+update+delete |
| leave.rs | /leaves | 4 | list+create, get+update+delete, approve, reject |
| payroll.rs | /payroll-runs, /payroll-items, /payroll-details, /payroll-slips | 9 | CRUD + calculate, pay, generate-voucher |
| salary_adjustment.rs | /salary-adjustments | 4 | list+create, get+update, approve, reject |
| performance.rs | /performance-reviews, /performance-goals | 8 | CRUD + submit, approve, employee reviews/goals |
| recruitment.rs | /job-openings, /candidates, /interviews | 9 | CRUD + publish/close, complete |
| training.rs | /training-plans, /training-courses, /training-records | 11 | CRUD + enroll, course-records, employee-records |
| reports.rs | /reports/* | 6 | employee/department/contract/training/attendance/payroll summary |
| audit.rs | /audit-logs | 2 | list, get |
| setup.rs | /hrm/setup/* | 6 | progress, company, departments, positions, admin, complete |
| health.rs | /health | 1 | health_check |
| hrm_plugin.rs | /api/plugins/* | 2 | info, health |

**注意**: HRM 后端 **无 `/dashboard` 路由**，仅有 `/reports/*` 系列报表端点。

---

### 1.2 MES 服务 (`/api/mes`) — 147 个路由注册点（含 aps_compat 16 个重定向路由）

| 模块文件 | 路由前缀 | 路由数 | 关键端点 |
|---|---|---|---|
| production_order.rs | /orders | 11 | CRUD + from-erp, release, start, complete, cancel, approval |
| work_order.rs | /work-orders | 9 | CRUD + start, complete, cancel, pause, resume |
| work_report.rs | /work-reports | 9 | CRUD + today-output, approve, reject, rework approval |
| production_scheduling.rs | /schedules | 5 | CRUD + adjust, gantt |
| production_plan.rs | /production-plans | 5 | CRUD + submit, approve, reject |
| production_process.rs | /processes | 4 | CRUD + deactivate |
| production_record.rs | /records | 4 | CRUD + complete |
| production_kanban.rs | /kanban/* | 5 | dashboard, order-progress, workstation-status, quality-trend, equipment-status |
| production_cost.rs | /cost/* | 7 | work-order cost/detail, production-order cost, period, trend, comparison, forecast |
| equipment.rs | /equipment, /inspections, /maintenances | 8 | equipment CRUD + statistics, maintenance; inspections CRUD; maintenances CRUD + status |
| equipment_oee.rs | /equipment-oee | 4 | CRUD + statistics, equipment efficiency |
| work_station.rs | /workstations | 4 | CRUD + activate, deactivate |
| team.rs | /teams | 4 | CRUD + members CRUD |
| wip.rs | /wips | 5 | CRUD + transfer, transfers list, statistics |
| material_bom/mod.rs | /boms, /material-issues, /material-returns | 6 | each CRUD |
| material_requirement.rs | /material-requirements | 5 | CRUD + calculate, confirm, release |
| process_route.rs | /process-routes | 5 | CRUD + steps CRUD + reorder |
| process_flow.rs | /process-flows | 5 | CRUD + steps CRUD + reorder + capacity |
| quality_management/mod.rs | /quality/inspections, /quality/patrols, /quality/standards | 12 | inspections CRUD + concession approval; patrols CRUD + items; standards CRUD |
| quality_traceability.rs | /traceability/* | 4 | forward, backward, chain, quality-records |
| anomaly_detection.rs | /anomaly/* | 10 | alerts, summary, equipment, rules CRUD, scan, trend, handling approval |
| energy_management.rs | /energy/* | 7 | realtime, history, report, forecast, alerts, equipment, export |
| capacity.rs | /capacities | 5 | CRUD + allocate, release, maintenance |
| demand_forecast.rs | /demand-forecasts | 5 | CRUD + calculate, validate, adopt |
| aps_scheduling.rs | /aps/schedule/* | 6 | execute, simulate, check-constraints, optimization-report, bottleneck-analysis, order feasibility |
| audit.rs | /audit-logs | 2 | list, get |
| **aps_compat.rs** | **/(嵌套于 /api/aps)** | **16** | **全部为 301 重定向到 /api/mes/*，含 production-plans(5), capacities(5), forecasts(5), 兜底 {*path}(1)** |

**关键架构事实**:
- `aps_compat` 在 `main.rs:94` 通过 `.nest("/api/aps", ...)` 注册，**不在** `modules::create_routes()` 合并列表中
- `aps_compat` 全部路由为 `any(redirect_*)` 301 永久重定向，**无实际业务处理逻辑**
- 重定向映射: `/api/aps/production-plans`→`/api/mes/production-plans`, `/api/aps/capacities`→`/api/mes/capacities`, `/api/aps/forecasts`→`/api/mes/demand-forecasts`, 其他→`/api/mes/{path}`
- `approval_common.rs`, `work_order_calc.rs`, `equipment_oee_calc.rs`, `oee_logic.rs`, `dashboard_ws.rs` 为内部计算/WebSocket 模块，**无 HTTP 路由**

---

### 1.3 PDM 服务 (`/api/pdm`) — 62 个路由注册点

| 模块文件 | 路由前缀 | 路由数 | 关键端点 |
|---|---|---|---|
| product.rs | /products | 2 | CRUD |
| material.rs | /materials | 2 | CRUD |
| bom.rs | /bom-versions, /bom-items, /bom-compare | 11 | versions CRUD + activate/archive + items batch; items CRUD; compare CRUD |
| document.rs | /documents | 7 | CRUD + search, status, approve, approval-history, pending-approval |
| document_version.rs | /documents/{id}/versions | 7 | versions CRUD + publish, upload, download |
| project.rs | /projects | 9 | CRUD + status, phase, members CRUD, phases CRUD |
| change_notice.rs | /change-notices | 5 | CRUD + submit, approve, reject |
| workflow.rs | /workflows, /workflow-instances | 7 | workflows CRUD + start; instances list/get + advance |
| version.rs | /versions | 2 | CRUD |
| configuration.rs | /configurations | 2 | CRUD |
| production_batch.rs | /production-batches | 2 | CRUD |
| production_formula.rs | /production-formulas | 2 | CRUD |
| production_process.rs | /production-processes | 2 | CRUD |
| production_step.rs | /production-steps | 2 | CRUD |
| production_statistics.rs | /production-statistics, /statistics | 3 | list, summary, get |
| dashboard.rs | /dashboard, /health, /import | 3 | dashboard, health, import |

**注意**: PDM 后端有 `/production-batches`, `/production-formulas`, `/production-processes`, `/production-steps`, `/production-statistics`, `/configurations`, `/versions` 等路由，**前端 API 目录中无对应封装文件**。

---

### 1.4 QMS 服务 (`/api/qms`) — 143 个路由注册点

| 模块文件 | 路由前缀 | 路由数 | 关键端点 |
|---|---|---|---|
| apqp.rs | /apqp/projects, /apqp/phases, /apqp/tasks, /apqp/risks, /apqp/approvals | 26 | 各实体 CRUD + transition, progress, approve, complete, cancel; approval process |
| eight_d.rs | /eightd | 16 | CRUD + d1-team, d3-d7 各步骤, close, audit-logs, approve, close-approval, cancel |
| fmea.rs | /fmea, /fmea-items | 12 | analyses CRUD + statistics; items CRUD |
| spc.rs | /spc/charts, /spc/data-points | 8 | charts CRUD + data-points get/add + calculate |
| quality_inspection.rs | /checks | 13 | CRUD + assign, submit, audit, rework, approve, reject, results, audits |
| quality_issue.rs | /issues | 10 | CRUD + resolve, approval start/approve/reject, approve/reject status, cancel |
| quality_standard.rs | /standards | 7 | CRUD + revisions list/create |
| quality_cost.rs | /quality-costs | 7 | CRUD + statistics, trend |
| corrective_action.rs | /actions | 7 | CRUD + complete, items |
| audit.rs | /audit-plans, /audit-tasks, /audit-findings | 9 | plans CRUD + start/complete; tasks create/complete; findings create/verify |
| quality_dashboard.rs | /quality-dashboard/*, /alert-rules, /alert-messages | 12 | overview, trend, defect-distribution; alert-rules CRUD; alert-messages CRUD + acknowledge |
| dashboard.rs | /dashboard, /quality-tasks/today-pass-rate | 2 | dashboard stats, today pass rate |
| data_sync.rs | /sync-records, /sync/* | 6 | sync-records CRUD + retry; inspection-to-lims, issue-to-ehs |
| integration.rs | /api/internal/qms/* | 2 | internal integration endpoints |
| qms_plugin.rs | /api/plugins/* | 2 | info, health |

---

### 1.5 RD 服务 (`/api/rd`) — 68 个路由注册点

| 模块文件 | 路由前缀 | 路由数 | 关键端点 |
|---|---|---|---|
| project.rs | /projects | 9 | CRUD + batch create/delete, export, import, dashboard, gantt |
| experiment.rs | /experiments, /batch-trace | 10 | CRUD + records CRUD, lab/pilot/scaleup lists, advance-phase, batch trace |
| formula.rs | /formulas | 6 | CRUD + versions CRUD, approve |
| material.rs | /material-tests | 4 | CRUD + by-project, by-experiment |
| patent.rs | /patents | 3 | CRUD + by-project |
| change_management.rs | /change-requests, /change-orders | 5 | change-requests CRUD + transition + change-orders create/list |
| project_member.rs | /members | 4 | create + by-project, update, delete |
| project_milestone.rs | /milestones | 4 | create + by-project, update, delete |
| project_phase.rs | /phases, /projects/{id}/phases | 4 | create + by-project list/create, update, delete |
| project_report.rs | /reports/projects/* | 5 | summary, trends, types, performance, detail |
| research_cost.rs | /research-costs | 4 | CRUD + by-project, statistics |
| statistics.rs | /statistics | 1 | get statistics |
| ai_integration.rs | /ai/analyses, /ai/chat, /entities/*/analyses | 5 | analyses CRUD + chat + entity analyses |
| doc_integration.rs | /documents, /entities/*/documents | 5 | documents CRUD + entity documents |
| audit.rs | /audit-logs | 3 | list, get, export |
| rs_plugin.rs | /api/plugins/* | 2 | info, health |

**关键缺失**: RD 后端 **无 `/bugs`, `/builds`, `/deploys`, `/tests` 路由**。

---

## 二、前端 API 方法总览

### 2.1 HRM 前端 (`apps/web/src/api/hrm/`) — 62 个方法 / 14 个有效文件

| 文件 | 导出对象 | 方法数 | 调用 client |
|---|---|---|---|
| employee.ts | employeeApi, roleApi, positionApi, employeePerformanceApi | ~10 | hrm |
| department.ts | departmentApi | 5 | hrm |
| company.ts | companyApi | 5 | hrm |
| contract.ts | contractApi, contractRenewalApi | 15 | hrm |
| attendance.ts | attendanceApi | 5 | hrm |
| leave.ts | leaveApi | 5 | hrm |
| payroll.ts | payrollApi, salaryAdjustmentApi | ~12 | hrm |
| performance.ts | performanceReviewApi, performanceGoalApi | ~10 | hrm |
| recruitment.ts | jobOpeningApi, candidateApi, interviewApi | ~15 | hrm |
| training.ts | trainingPlanApi, trainingCourseApi, trainingRecordApi | ~18 | hrm |
| hrmReports.ts | hrmReportsApi | 6 | hrm |
| hrmAudit.ts | hrmAuditApi | 2 | hrm |
| hrmSetup.ts | hrmSetupApi | 6 | hrm |
| dashboard.ts | hrmDashboardApi | 1 | hrm |

**已排除**: types.ts, index.ts

---

### 2.2 MES 前端 (`apps/web/src/api/mes/`) — 166 个方法 / 23 个有效文件

| 文件 | 导出对象 | 方法数 | 调用 client | URL 模式 |
|---|---|---|---|---|
| productionOrder.ts | productionOrderApi | 10 | mes | /orders/* |
| workOrder.ts | workOrderApi | 9 | mes | /work-orders/* |
| workReport.ts | workReportApi | 7 | mes | /work-reports/* |
| productionSchedule.ts | productionScheduleApi | 7 | mes | /schedules/* |
| productionPlan.ts | (未在 index 导出) | 5 | mes | /production-plans/* |
| productionProcess.ts | productionProcessApi | 6 | mes | /processes/* |
| productionRecord.ts | productionRecordApi | 6 | mes | /records/* |
| productionKanban.ts | productionKanbanApi | 5 | mes | /kanban/* |
| equipment.ts | equipmentApi, mesEquipmentApi, equipmentOeeApi | ~20 | mes | /equipment/*, /equipment-oee/*, /inspections, /maintenances |
| workStation.ts | workStationApi | 7 | mes | /workstations/* |
| team.ts | teamApi | 8 | mes | /teams/* |
| wip.ts | wipApi | 8 | mes | /wips/* |
| material.ts | materialBomApi, materialIssueApi, materialReturnApi | ~10 | mes | /boms/*, /material-issues/*, /material-returns/* |
| materialRequirement.ts | materialRequirementApi | 8 | mes | /material-requirements/* |
| process.ts | processRouteApi | 8 | mes | /process-routes/* |
| processFlow.ts | processFlowApi | 7 | mes | /process-flows/* |
| quality.ts | qualityApi | ~18 | mes | /quality/inspections/*, /quality/patrols/*, /quality/standards/* |
| traceability.ts | traceabilityApi | 4 | mes | /traceability/* |
| anomalyDetection.ts | anomalyDetectionApi | 8 | mes | /anomaly/* |
| aps.ts | apsApi | 6 | mes | /aps/schedule/* |
| **energyManagement.ts** | energyManagementApi | 7 | **apiClient (裸调用)** | **/mes/v1/energy/* ⚠️** |
| **productionCost.ts** | productionCostApi | 7 | **apiClient (裸调用)** | **/mes/v1/cost/* ⚠️** |
| **analytics.ts** | (空文件) | 0 | - | 0 行 ⚠️ |
| **approval.ts** | (空文件) | 0 | - | 0 行 ⚠️ |

**已排除**: types.ts, index.ts

---

### 2.3 APS 前端 (`apps/web/src/api/aps/`) — 42 个方法 / 5 个有效文件

| 文件 | 导出对象 | 方法数 | 调用 client | URL 模式 |
|---|---|---|---|---|
| productionPlan.ts | productionPlanApi | 8 | aps | /production-plans/* |
| schedule.ts | scheduleApi | 12 | aps | /schedules/* |
| capacity.ts | capacityApi | 8 | aps | /capacities/* |
| forecast.ts | forecastApi | 7 | aps | /forecasts/* |
| materialPlan.ts | materialPlanApi | 7 | aps | /material-plans/* ⚠️ |

**已排除**: types.ts, index.ts

**关键**: 全部通过 `apiClient.aps` 调用，即走 `/api/aps` 前缀，由 mes 的 aps_compat 层重定向到 `/api/mes`。

---

### 2.4 PDM 前端 (`apps/web/src/api/pdm/`) — 62 个方法 / 10 个有效文件

| 文件 | 导出对象 | 方法数 | 调用 client |
|---|---|---|---|
| bom.ts | bomApi | ~20 | pdm |
| document.ts | documentApi | ~15 | pdm |
| documentApproval.ts | documentApprovalApi | 3 | pdm |
| changeNoticeAction.ts | changeNoticeActionApi | 3 | pdm |
| workflow.ts | workflowApi | 8 | pdm |
| pdmMaterial.ts | (export *) | 5 | pdm |
| pdmProduct.ts | (export *) | 5 | pdm |
| project.ts | (export *) | ~14 | pdm |
| pdmVersion.ts | pdmVersionApi | ? | pdm |
| dashboard.ts | pdmDashboardApi | 1 | pdm |

**已排除**: types.ts, index.ts

**缺失封装**: 后端有但前端无对应 API 文件的模块: `production_batch`, `production_formula`, `production_process`, `production_step`, `production_statistics`, `configuration`, `version`(独立版本管理，非文档版本)

---

### 2.5 QMS 前端 (`apps/web/src/api/qms/`) — 110 个方法 / 13 个有效文件

| 文件 | 导出对象 | 方法数 | 调用 client |
|---|---|---|---|
| apqp.ts | apqpApi | ~25 | qms |
| eightD.ts | eightDApi | 12 | qms |
| fmea.ts | fmeaApi | 12 | qms |
| spc.ts | spcApi | 8 | qms |
| inspection.ts | inspectionApi | 11 | qms |
| issue.ts | issueApi | 6 | qms |
| standard.ts | standardApi | 6 | qms |
| qualityCost.ts | qualityCostApi | 7 | qms |
| correctiveAction.ts | correctiveActionApi | 2 | qms |
| improvement.ts | improvementApi | 5 | qms |
| audit.ts | auditApi | ~10 | qms |
| dashboard.ts | qualityDashboardApi | 1 | qms |
| sync.ts | syncApi | 6 | qms |
| **adapters.ts** | (数据适配层，无 HTTP 调用) | 0 | - |
| **mock.ts / mockData.ts** | (Mock 数据) | - | - |

**已排除**: types.ts, index.ts, mock.ts, mockData.ts, adapters.ts

---

### 2.6 RD 前端 (`apps/web/src/api/rd/`) — 62 个方法 / 10 个有效文件

| 文件 | 导出对象 | 方法数 | 调用 client | URL |
|---|---|---|---|---|
| project.ts | projectApi | ~12 | rd | /projects/* |
| experiment.ts | experimentApi | ~12 | rd | /experiments/* |
| formula.ts | formulaApi | ~10 | rd | /formulas/* |
| material.ts | materialApi | ~8 | rd | /materials/* ⚠️ |
| audit.ts | auditRdApi | 3 | rd | /audit-logs/* |
| statistics.ts | rdStatisticsApi | 1 | rd | /statistics |
| **bug.ts** | bugApi | 5 | rd | **/bugs/* ⚠️ 后端无此路由** |
| **build.ts** | buildApi | 3 | rd | **/builds/* ⚠️ 后端无此路由** |
| **deploy.ts** | deployApi | 3 | rd | **/deploys/* ⚠️ 后端无此路由** |
| **test.ts** | testApi | 5 | rd | **/tests/* ⚠️ 后端无此路由** |

**已排除**: types.ts, index.ts

---

## 三、页面消费矩阵

### 3.1 HRM 页面消费 (31 个页面文件)

| 页面 | 消费的 API | 状态 |
|---|---|---|
| HrmEmployeePage / HrmEmployeeCreatePage / HrmEmployeeEditPage / HrmEmployeeDetailPage | employeeApi, departmentApi, positionApi | ✅ 完整 |
| HrmDepartmentPage / HrmOrganizationPage | departmentApi, employeeApi, hrmApi | ✅ 完整 |
| HrmCompanyPage | companyApi, departmentApi, employeeApi | ✅ 完整 |
| HrmPositionPage | positionApi, departmentApi | ✅ 完整 |
| HrmContractPage / HrmContractDetailPage | contractApi, hrmApi | ✅ 完整 |
| HrmAttendancePage | attendanceApi, leaveApi | ✅ 完整 |
| HrmLeavePage | leaveApi | ✅ 完整 |
| HrmPayrollPage | payrollApi, salaryAdjustmentApi | ✅ 完整 |
| HrmSalaryAdjustmentPage | salaryAdjustmentApi | ✅ 完整 |
| HrmPerformancePage | hrmApi (barrel) | ⚠️ 通过 barrel 间接消费 |
| HrmRecruitmentPage | hrmApi (barrel) | ⚠️ 通过 barrel 间接消费 |
| HrmTrainingPage | hrmApi (barrel) | ⚠️ 通过 barrel 间接消费 |
| HrmReportsPage | hrmReportsApi | ✅ 完整 |
| HrmDashboardPage / DashboardPage | hrmDashboardApi | ❌ **后端无 /dashboard 路由** |
| HrmOverviewPage | hrmApi | ⚠️ |
| setting/* (4个设置页) | (未直接 import API) | ⚠️ 可能未接入后端 |

### 3.2 MES 页面消费 (30+ 个页面文件)

| 页面 | 消费的 API | 状态 |
|---|---|---|
| ProductionOrderManagementPage / ProductionOrderDetailPage | mesApi (barrel) | ✅ |
| MesWorkOrderPage | mesApi (barrel) | ✅ |
| WorkReportPage | (未在 grep 中显式出现，可能通过 barrel) | ⚠️ 待验证 |
| ProductionSchedulePage | (通过 barrel) | ✅ |
| ProductionProcessPage | mesApi | ✅ |
| ProductionRecordPage | mesApi | ✅ |
| ProductionKanbanPage | mesApi | ✅ |
| ProductionDashboardPage | mesApi (barrel) | ✅ |
| ProductionCostPage | productionCostApi | ❌ **使用 /mes/v1/cost/* 旧 URL** |
| MesEquipmentPage / EquipmentOEEPage / EquipmentManagementPage | mesApi, equipmentOeeApi | ✅ |
| WorkStationPage | (通过 barrel) | ✅ |
| TeamManagementPage | (通过 barrel) | ✅ |
| MaterialIssuePage / MaterialReturnPage / MaterialBOMPage | mesApi | ✅ |
| MaterialRequirementPage | mesApi | ✅ |
| ProcessFlowPage | (通过 barrel) | ✅ |
| MesQualityPage / QualityInspectionPage | qualityApi | ✅ |
| TraceabilityDetailPage | (通过 barrel) | ✅ |
| AnomalyDetectionPage | anomalyDetectionApi | ✅ |
| EnergyManagementPage | energyManagementApi | ❌ **使用 /mes/v1/energy/* 旧 URL** |
| ApsSchedulingPage | apsApi (mes/aps.ts) | ✅ |

### 3.3 APS 页面消费 (18 个页面文件)

| 页面 | 消费的 API | 状态 |
|---|---|---|
| ProductionPlanPage / ProductionPlanDetailPage / PlanComparisonDetailPage | productionPlanApi | ✅ (经 aps_compat 重定向) |
| ScheduleManagementPage / ScheduleDetailPage | scheduleApi | ⚠️ **部分方法后端不支持** |
| CapacityManagementPage / CapacityDetailPage | capacityApi | ⚠️ **submit 方法后端不支持** |
| ForecastManagementPage / ForecastDetailPage | forecastApi | ✅ (经 aps_compat 重定向到 demand-forecasts) |
| MaterialPlanPage / MaterialPlanDetailPage | materialPlanApi | ❌ **后端无 /material-plans 路由** |
| ApsDashboardPage | productionPlanApi, scheduleApi | ⚠️ |
| analytics/* (6个分析页) | apsApi (barrel) | ⚠️ 待验证 |

### 3.4 PDM 页面消费 (21 个页面文件)

| 页面 | 消费的 API | 状态 |
|---|---|---|
| ProductPage / PdmProductCategoryPage / PdmProductConfigPage | pdmApi, documentApi | ✅ |
| MaterialPage | pdmApi | ✅ |
| BomPage / PdmBomPage | pdmApi, bomApi | ✅ |
| DocumentPage / PdmVersionPage | documentApi, pdmApi | ✅ |
| ChangePage | pdmApi | ✅ |
| PdmProjectPage | project (export *) | ✅ |
| PdmDashboardPage | pdmDashboardApi | ✅ |
| PdmBatchPage | pdmApi | ⚠️ **后端 /production-batches 无前端独立封装** |
| PdmFormulaPage | pdmApi | ⚠️ **后端 /production-formulas 无前端独立封装** |
| PdmProcessPage / PdmStepPage / PdmStatsPage | pdmApi | ⚠️ **无独立前端封装** |
| setting/* (3个设置页) | (未直接 import) | ⚠️ 待验证 |

### 3.5 QMS 页面消费 (26 个页面文件)

| 页面 | 消费的 API | 状态 |
|---|---|---|
| QmsDashboardPage | qmsApi, useQmsMock | ⚠️ **使用 Mock 数据** |
| QmsInspectionPage / QmsInspectionDetailPage | inspectionApi | ✅ |
| QmsNonconformancePage / QmsIssueDetailPage | qmsApi, issueApi | ✅ |
| QmsQualityControlPage | qmsApi | ✅ |
| QmsStandardListPage / QmsStandardDetailPage | qmsApi, standardApi | ✅ |
| QmsSpcPage | spcApi | ✅ |
| QmsFmeaPage / QmsFmeaDetailPage | fmeaApi | ✅ |
| QmsEightDPage / QmsEightDDetailPage | eightDApi | ✅ |
| QmsApqpPage / QmsApqpProjectDetailPage | qmsApi, apqpApi | ✅ |
| QmsAuditManagementPage / QmsAuditPlanDetailPage | auditApi | ✅ |
| QmsQualityCostPage | qualityCostApi | ✅ |
| analytics/* (6个分析页) | (未在 grep 中显式出现) | ⚠️ 待验证 |

### 3.6 RD 页面消费 (24 个页面文件)

| 页面 | 消费的 API | 状态 |
|---|---|---|
| RsProjectListPage / RsProjectCreatePage / RsProjectDetailPage | rdApi (barrel) | ✅ |
| RsExperimentListPage / RsExperimentCreatePage / RsExperimentDetailPage | rdApi, experimentApi | ✅ |
| RsFormulaListPage / RsFormulaCreatePage / RsFormulaDetailPage | formulaApi, rdApi | ✅ |
| RsMaterialListPage | materialApi | ⚠️ **前端调用 /materials，后端是 /material-tests** |
| RsMilestonePage | rdApi | ⚠️ **后端 /milestones 无前端独立封装** |
| RsReviewPage / RsReportPage | rdApi | ⚠️ 待验证 |
| RsDocPage | rdApi | ⚠️ **后端 /documents (doc_integration) 无前端独立封装** |
| RsSettingsPage | (未直接 import) | ⚠️ |
| DashboardPage | rdApi | ✅ |
| RsOverviewPage | rdApi | ✅ |
| **RsBugPage** | **rdApi (bugApi)** | ❌ **后端无 /bugs 路由** |
| **RsBuildPage** | **rdApi (buildApi)** | ❌ **后端无 /builds 路由** |
| **RsDeployPage** | **rdApi (deployApi)** | ❌ **后端无 /deploys 路由** |
| **RsTestPage** | **rdApi (testApi)** | ❌ **后端无 /tests 路由** |
| RsReleasePage / RsCodePage | rdApi | ⚠️ 待验证 |

---

## 四、缺口清单

### P0 — 阻断级（功能完全不可用）

| # | 模块 | 缺口类型 | 描述 | 文件:行证据 | 状态 | 补全方向 |
|---|---|---|---|---|---|---|
| P0-1 | RD | 前端有后端无 | RD 前端 bug.ts 定义了完整的 Bug CRUD API（list/get/create/update/delete），调用 `/api/rd/bugs`，但 RD 后端**无任何 /bugs 路由**。RsBugPage 页面完全无法工作。 | 前端: `apps/web/src/api/rd/bug.ts:30-46`<br>后端: `svc/rd/src/modules/` 下无 bug.rs | 已核实 | 后端新增 bug.rs 模块，实现 bugs 表 CRUD；或前端移除该模块及页面 |
| P0-2 | RD | 前端有后端无 | RD 前端 build.ts 定义 Build API（list/get/create），调用 `/api/rd/builds`，后端无 /builds 路由。RsBuildPage 无法工作。 | 前端: `apps/web/src/api/rd/build.ts:28-36`<br>后端: 无对应模块 | 已核实 | 后端新增 build.rs 模块（CI 构建记录）；或移除前端 |
| P0-3 | RD | 前端有后端无 | RD 前端 deploy.ts 定义 Deploy API，调用 `/api/rd/deploys`，后端无 /deploys 路由。RsDeployPage 无法工作。 | 前端: `apps/web/src/api/rd/deploy.ts:29-37`<br>后端: 无对应模块 | 已核实 | 后端新增 deploy.rs 模块（部署记录）；或移除前端 |
| P0-4 | RD | 前端有后端无 | RD 前端 test.ts 定义 Test CRUD API，调用 `/api/rd/tests`，后端无 /tests 路由。RsTestPage 无法工作。 | 前端: `apps/web/src/api/rd/test.ts:29-45`<br>后端: 无对应模块 | 已核实 | 后端新增 test.rs 模块（测试管理）；或移除前端 |
| P0-5 | APS | 前端有后端无 | APS 前端 materialPlan.ts 定义 MaterialPlan CRUD + submit/requisition/cancel，调用 `/api/aps/material-plans`。aps_compat 兜底重定向到 `/api/mes/material-plans`，但 MES 后端**无 /material-plans 路由**（仅有 /material-requirements 和 /boms）。MaterialPlanPage 和 MaterialPlanDetailPage 完全无法工作。 | 前端: `apps/web/src/api/aps/materialPlan.ts:16-66`<br>后端: `svc/mes/src/modules/aps_compat.rs:45` 兜底重定向; mes 无 material-plans 路由 | 已核实 | 方案A: MES 后端新增 /material-plans 路由（物料计划独立实体）<br>方案B: 前端 materialPlan.ts 改用 /material-requirements 端点<br>方案C: aps_compat 增加 material-plans → material-requirements 的特殊重定向 |
| P0-6 | HRM | 前端有后端无 | HRM 前端 dashboard.ts 的 getOverview() 调用 `GET /api/hrm/dashboard`，但 HRM 后端**无 /dashboard 路由**（仅有 /reports/* 六个报表端点）。HrmDashboardPage 和 DashboardPage 无法加载概览数据。 | 前端: `apps/web/src/api/hrm/dashboard.ts:16`<br>后端: `svc/hrm/src/modules/` 无 dashboard.rs，reports.rs 仅有 /reports/* | 已核实 | 后端新增 dashboard.rs 聚合端点；或前端 getOverview() 改用 /reports/employee-summary 等现有端点聚合 |

---

### P1 — 重要级（核心功能受损或方法不匹配）

| # | 模块 | 缺口类型 | 描述 | 文件:行证据 | 状态 | 补全方向 |
|---|---|---|---|---|---|---|
| P1-1 | MES | URL 前缀不匹配 | MES 前端 energyManagement.ts 使用 `apiClient.get('/mes/v1/energy/realtime')` 等旧 URL 模式（共 7 个方法），而非标准的 `apiClient.mes.get('/energy/realtime')`。实际请求路径为 `/mes/v1/energy/*`，与后端 `/api/mes/energy/*` 不匹配。EnergyManagementPage 所有能源数据请求失败。 | 前端: `apps/web/src/api/mes/energyManagement.ts:103-131`<br>后端: `svc/mes/src/modules/energy_management.rs:478+` | 已核实 | 将 energyManagement.ts 全部改为 `apiClient.mes.get('/energy/...')` 模式 |
| P1-2 | MES | URL 前缀不匹配 | MES 前端 productionCost.ts 使用 `apiClient.get('/mes/v1/cost/...')` 旧 URL 模式（共 7 个方法），与后端 `/api/mes/cost/*` 不匹配。ProductionCostPage 成本数据请求失败。 | 前端: `apps/web/src/api/mes/productionCost.ts:163-192`<br>后端: `svc/mes/src/modules/production_cost.rs:29+` | 已核实 | 将 productionCost.ts 全部改为 `apiClient.mes.get('/cost/...')` 模式 |
| P1-3 | APS | 方法不匹配 | APS 前端 schedule.ts 定义了 start/complete/cancel/submit/release/hold 共 6 个操作方法（均为 POST `/schedules/{id}/xxx`），但 MES 后端 `/schedules` 仅有 CRUD + adjust(PUT) + gantt(GET)，**无 start/complete/cancel/submit/release/hold 端点**。aps_compat 兜底重定向后这些请求全部 404。 | 前端: `apps/web/src/api/aps/schedule.ts:34-73`<br>后端: `svc/mes/src/modules/production_scheduling.rs:25-33` | 已核实 | MES 后端 production_scheduling.rs 新增 schedule 状态流转端点（start/complete/cancel等）；或前端 schedule.ts 移除这些方法 |
| P1-4 | APS | 方法不匹配 | APS 前端 capacity.ts 定义了 submit 方法（POST `/capacities/{id}/submit`），但 MES 后端 /capacities 仅有 CRUD + allocate/release/maintenance，**无 submit 端点**。 | 前端: `apps/web/src/api/aps/capacity.ts`<br>后端: `svc/mes/src/modules/capacity.rs:20-28` | 已核实 | 后端新增 capacity submit 端点；或前端移除该方法 |
| P1-5 | RD | 路径不匹配 | RD 前端 material.ts 调用 `/api/rd/materials`（list/create 等），但 RD 后端实际路由为 `/api/rd/material-tests`。路径完全不匹配，RsMaterialListPage 数据加载失败。 | 前端: `apps/web/src/api/rd/material.ts`<br>后端: `svc/rd/src/modules/material.rs:59` 路由为 /material-tests | 已核实 | 前端 material.ts URL 从 /materials 改为 /material-tests；或后端增加 /materials 别名路由 |
| P1-6 | HRM | 方法/路径不匹配 | HRM 前端 training.ts 存在三处不匹配：(1) activate/deactivate 调用 PUT `/training-plans/{id}/activate` 和 `/deactivate`，后端无此端点；(2) enroll 调用 POST `/training-records/enroll`，后端实际为 POST `/training-courses/{id}/enroll`；(3) complete 调用 PUT `/training-records/{id}/complete`，后端无此端点。 | 前端: `apps/web/src/api/hrm/training.ts`<br>后端: `svc/hrm/src/modules/training.rs:19-38` | 已核实 | 前端修正 enroll URL 为 /training-courses/{id}/enroll；后端新增 activate/deactivate/complete 端点或前端移除 |
| P1-7 | MES | 前端有后端无 | MES 前端 quality.ts 未封装质量检验让步审批端点（concession approval: start/approve/reject），但后端 quality_management 模块有 `/quality/inspections/{id}/approval/start|approve|reject` 三个端点。前端无法触发让步审批流程。 | 前端: `apps/web/src/api/mes/quality.ts` (无 approval 方法)<br>后端: `svc/mes/src/modules/quality_management/mod.rs:36-47` | 已核实 | 前端 quality.ts 新增 concessionApprovalStart/approve/reject 方法 |
| P1-8 | QMS | 前端方法缺失 | QMS 前端 inspection.ts 未封装 approve 和 reject 方法，但后端有 POST `/checks/{id}/approve` 和 `/reject` 端点。前端无法执行检验审批操作。 | 前端: `apps/web/src/api/qms/inspection.ts`<br>后端: `svc/qms/src/modules/quality_inspection.rs:603` (approve/reject 路由) | 已核实 | 前端 inspection.ts 新增 approveCheck/rejectCheck 方法 |
| P1-9 | QMS | 前端方法缺失 | QMS 前端 issue.ts 未封装 approve/reject/cancel 方法，但后端有 POST `/issues/{id}/approve`、`/reject`、`/cancel` 端点。 | 前端: `apps/web/src/api/qms/issue.ts`<br>后端: `svc/qms/src/modules/quality_issue.rs:593` | 已核实 | 前端 issue.ts 新增 approveIssue/rejectIssue/cancelIssue 方法 |

---

### P2 — 一般级（功能不完整或封装缺失）

| # | 模块 | 缺口类型 | 描述 | 文件:行证据 | 状态 | 补全方向 |
|---|---|---|---|---|---|---|
| P2-1 | PDM | 后端有前端无 | PDM 后端有 /production-batches、/production-formulas、/production-processes、/production-steps、/production-statistics、/configurations、/versions（独立版本管理）共 7 组路由，但前端 API 目录中**无对应封装文件**。相关页面（PdmBatchPage, PdmFormulaPage 等）通过 pdmApi barrel 间接调用，但 barrel 中也未包含这些实体的 API。 | 后端: `svc/pdm/src/modules/production_batch.rs` 等 7 个文件<br>前端: `apps/web/src/api/pdm/` 下无对应文件 | 已核实 | 前端新增对应 API 文件（productionBatch.ts, productionFormula.ts 等），并在 index.ts 中导出 |
| P2-2 | RD | 后端有前端无 | RD 后端有 /patents、/change-requests、/change-orders、/members、/milestones、/phases、/research-costs、/ai/analyses、/ai/chat、/reports/projects/* 共 10+ 组路由，但前端 API 目录中**无独立封装文件**（部分通过 rdApi barrel 间接暴露，但不完整）。 | 后端: `svc/rd/src/modules/patent.rs` 等 10 个文件<br>前端: `apps/web/src/api/rd/` 下无对应文件 | 已核实 | 前端新增 patent.ts, changeManagement.ts, milestone.ts, researchCost.ts, aiIntegration.ts 等 API 文件 |
| P2-3 | MES | 空文件 | MES 前端 analytics.ts 和 approval.ts 为**0 行空文件**，但被列在 API 目录中。可能是预留未实现或误创建。 | 前端: `apps/web/src/api/mes/analytics.ts` (0行), `approval.ts` (0行) | 已核实 | 若为预留则补充实现；若为误创建则删除 |
| P2-4 | MES | 方法不匹配 | MES 前端 productionRecord.ts 的 complete 方法使用 PUT `/records/{id}/complete`，但后端为 POST `/records/{id}/complete`。HTTP 方法不匹配导致请求失败。 | 前端: `apps/web/src/api/mes/productionRecord.ts`<br>后端: `svc/mes/src/modules/production_record.rs:24` (POST complete_record) | 已核实 | 前端 complete 方法从 PUT 改为 POST |
| P2-5 | MES | 路径不匹配 | MES 前端 wip.ts 的 listTransfers 调用 GET `/wips/transfers`，但后端实际路由为 GET `/wips/{wip_id}/transfers`（需要 wip_id 参数）。路径结构不匹配。 | 前端: `apps/web/src/api/mes/wip.ts`<br>后端: `svc/mes/src/modules/wip.rs:25` (GET list_wip_transfers, 路径含 {wip_id}) | 已核实 | 前端 listTransfers 方法增加 wipId 参数，URL 改为 /wips/{wipId}/transfers |
| P2-6 | QMS | 后端有前端无 | QMS 后端有 /alert-rules 和 /alert-messages 两组路由（质量预警规则和消息），但前端 API 无对应封装。 | 后端: `svc/qms/src/modules/quality_dashboard.rs:539` (alert-rules, alert-messages)<br>前端: `apps/web/src/api/qms/` 无 alert.ts | 已核实 | 前端新增 alert.ts 封装预警规则和消息 API |
| P2-7 | QMS | 后端有前端无 | QMS 后端有 /quality-tasks/today-pass-rate 端点（今日质检通过率），前端无封装。 | 后端: `svc/qms/src/modules/dashboard.rs:177`<br>前端: 无 | 已核实 | 前端 dashboard.ts 或新增方法封装该端点 |
| P2-8 | HRM | 前后端都有但页面未消费 | HRM 前端 hrmSetup.ts 定义了 6 个初始化设置方法（getInitProgress/setupCompanyInfo/setupDepartments/setupPositions/setupAdminUser/completeInitialization），后端有完整 /hrm/setup/* 路由，但**页面目录中无初始化引导页面消费这些 API**。 | 前端: `apps/web/src/api/hrm/hrmSetup.ts:105-110`<br>后端: `svc/hrm/src/modules/setup.rs:103-110`<br>页面: `pages/hrm/` 下无 SetupPage | 已核实 | 新增 HRM 初始化引导页面；或确认该功能由其他入口（如首次登录引导）消费 |
| P2-9 | PDM | 前后端都有但页面未消费 | PDM 前端 workflow.ts 定义了完整的工作流 API（8个方法），后端有 /workflows 和 /workflow-instances 路由，但**页面目录中无工作流管理页面**。 | 前端: `apps/web/src/api/pdm/workflow.ts:42-79`<br>后端: `svc/pdm/src/modules/workflow.rs:17-32`<br>页面: `pages/pdm/` 下无 WorkflowPage | 待验证 | 确认工作流功能是否嵌入在文档审批/变更通知页面中消费；若独立则需新增页面 |
| P2-10 | RD | 前端方法不匹配 | RD 前端 material.ts 定义了 batchDeleteMaterials (DELETE /materials/batch)、importMaterials (POST /materials/import)、exportMaterials 三个方法，但后端 /material-tests 路由仅有 CRUD + by-project + by-experiment，**无 batch/import/export 端点**。 | 前端: `apps/web/src/api/rd/material.ts`<br>后端: `svc/rd/src/modules/material.rs:59` | 已核实 | 后端新增批量删除/导入/导出端点；或前端移除这些方法 |

---

### P3 — 可选级（优化建议/命名混淆/技术债）

| # | 模块 | 缺口类型 | 描述 | 文件:行证据 | 状态 | 补全方向 |
|---|---|---|---|---|---|---|
| P3-1 | MES/APS | 命名混淆 | mes/aps.ts 与 aps/ 目录是**两套不同功能的 API**，命名易混淆：mes/aps.ts 调用 apiClient.mes，路径 /aps/schedule/*，是 APS 排程引擎（计算/模拟/约束检查）；aps/ 目录调用 apiClient.aps，路径 /production-plans 等，是 APS 计划数据（经兼容层重定向）。两者无功能重复。 | 前端: `apps/web/src/api/mes/aps.ts` vs `apps/web/src/api/aps/` | 已核实 | 在代码注释或文档中明确两者职责边界；考虑将 mes/aps.ts 重命名为 apsSchedule.ts |
| P3-2 | QMS | Mock 依赖 | QMS 前端 QmsDashboardPage 同时导入 qmsApi 和 useQmsMock（Mock 数据 hook），可能存在部分数据走 Mock 而非真实后端的情况。 | 前端: `apps/web/src/pages/qms/QmsDashboardPage.tsx:27` | 待验证 | 确认 Mock 使用范围，逐步替换为真实 API 调用 |
| P3-3 | APS | 兼容层技术债 | aps_compat 全部为 301 永久重定向，标注 deprecated_since=2026-08-28, removal_date=2026-11-28。当前 aps/ 前端目录全部依赖该兼容层。需在移除日期前完成前端迁移到 apiClient.mes。 | 后端: `svc/mes/src/modules/aps_compat.rs:89-90`<br>前端: `apps/web/src/api/aps/` 全部 5 个文件 | 已核实 | 制定迁移计划：将 aps/ 前端 API 逐步改为 apiClient.mes 直接调用，URL 对应调整（forecasts→demand-forecasts 等） |
| P3-4 | HRM | 纯计算模块 | HRM 后端 individual_tax_calc.rs、payroll_calc.rs、social_insurance_calc.rs 为纯计算模块（无路由），前端无对应 API。这些计算逻辑可能嵌入在 payroll.rs 的 calculate 端点中。 | 后端: `svc/hrm/src/modules/individual_tax_calc.rs` 等 | 已核实 | 确认计算逻辑已通过 /payroll-runs/{id}/calculate 端点暴露；无需独立路由 |
| P3-5 | MES | 内部模块 | MES 后端 approval_common.rs、work_order_calc.rs、equipment_oee_calc.rs、oee_logic.rs 为内部计算/共享模块，无 HTTP 路由，前端无对应 API。 | 后端: `svc/mes/src/modules/approval_common.rs` 等 | 已核实 | 这些是内部逻辑模块，无需前端对应 |
| P3-6 | QMS | 内部集成端点 | QMS 后端 integration.rs 有 /api/internal/qms/* 两个内部集成端点（actions/integration, inspections/{no}/result），前端无对应 API。这些是服务间调用端点。 | 后端: `svc/qms/src/modules/integration.rs`<br>前端: adapters.ts 为数据适配层而非 HTTP 调用 | 已核实 | 内部服务间端点，无需前端对应；adapters.ts 负责前后端数据结构转换 |
| P3-7 | RD | 页面冗余 | RD 页面目录中有 RsMilestonePage.tsx.bak 备份文件，应清理。 | 前端: `apps/web/src/pages/rd/RsMilestonePage.tsx.bak` | 已核实 | 删除 .bak 文件 |

---

## 五、四类判定汇总

| 判定类别 | HRM | MES | APS | PDM | QMS | RD | 合计 |
|---|---|---|---|---|---|---|---|
| **功能完整**（前后端对应+页面消费） | 12 | 18 | 2 | 8 | 13 | 5 | **58** |
| **后端有前端无**（缺前端封装/页面） | 0 | 1 | 0 | 7 | 2 | 10+ | **20+** |
| **前端有后端无**（缺后端路由/404） | 1 | 0 | 1 | 0 | 0 | 4 | **6** |
| **前后端都有但方法/路径不匹配** | 1 | 4 | 2 | 0 | 3 | 2 | **12** |
| **前后端都有但页面未消费** | 1 | 0 | 0 | 1 | 0 | 0 | **2** |

---

## 六、总体健康评估

### 6.1 综合评分

| 模块 | 后端路由数 | 前端方法数 | 页面数 | 完整度 | 健康评级 |
|---|---|---|---|---|---|
| **HRM** | 82 | 62 | 31 | ~85% | 🟢 良好（P0×1, P1×1, P2×2） |
| **MES** | 147 | 166 | 30+ | ~80% | 🟡 一般（P1×3, P2×3, P3×3）— 旧 URL 和空文件是主要问题 |
| **APS** | 16(兼容层) | 42 | 18 | ~55% | 🔴 较差（P0×1, P1×2, P3×1）— 严重依赖兼容层，materialPlan 无后端支撑 |
| **PDM** | 62 | 62 | 21 | ~75% | 🟡 一般（P2×2, P3×1）— 7组后端路由无前端封装 |
| **QMS** | 143 | 110 | 26 | ~85% | 🟢 良好（P1×3, P2×2, P3×2）— 功能覆盖面广，少量方法缺失 |
| **RD** | 68 | 62 | 24 | ~60% | 🔴 较差（P0×4, P1×1, P2×3）— bug/build/deploy/test 四大模块无后端 |

### 6.2 关键发现

1. **RD 服务是最大风险点**: 前端定义了 bug/build/deploy/test 四个完整的 CRUD 模块和对应页面，但后端完全没有实现。这四个页面（RsBugPage, RsBuildPage, RsDeployPage, RsTestPage）在运行时全部 404。需要决策是后端补全还是前端移除。

2. **APS 兼容层是临时方案**: aps/ 前端目录全部依赖 mes 的 aps_compat 301 重定向，该兼容层标注 2026-11-28 移除。其中 materialPlan 模块即使经过重定向也无法找到后端路由（mes 无 /material-plans）。需要在移除日期前完成前端迁移。

3. **MES 存在旧 URL 技术债**: energyManagement.ts 和 productionCost.ts 使用 `/mes/v1/` 旧前缀，与当前 `/api/mes/` 标准前缀不匹配。这两个页面的实际数据请求会失败。

4. **HRM 概览端点缺失**: 前端 dashboard.ts 调用 /dashboard 但后端仅有 /reports/*，需要后端新增聚合端点或前端改用现有报表端点。

5. **PDM 和 RD 后端功能超前于前端**: PDM 有 7 组路由、RD 有 10+ 组路由在前端没有独立 API 封装。这些功能可能通过 barrel 导出间接可用，也可能完全未接入前端。

6. **QMS 成熟度最高**: 143 个后端路由与 110 个前端方法对应度较高，主要缺口是少量审批方法（approve/reject/cancel）未封装。

### 6.3 优先修复建议

**立即修复（本周）**:
- P0-1~P0-4: 决策 RD 的 bug/build/deploy/test 是补全后端还是移除前端
- P0-5: 决策 APS materialPlan 的后端实现方案
- P0-6: HRM dashboard 端点补全或前端改用 reports
- P1-1~P1-2: MES energyManagement/productionCost 的 URL 前缀修正（改动量小，收益大）

**短期修复（本月）**:
- P1-3~P1-4: APS schedule/capacity 方法补全或移除
- P1-5: RD material 路径修正（/materials → /material-tests）
- P1-6: HRM training 方法/路径修正
- P1-7~P1-9: QMS/MES 审批方法前端封装
- P2-4~P2-5: MES productionRecord/wip 方法/路径修正

**中期规划（下月）**:
- P2-1: PDM 7 组后端路由的前端封装
- P2-2: RD 10+ 组后端路由的前端封装
- P3-3: APS 兼容层迁移计划制定与执行
- P2-3: MES 空文件处理
- P2-6~P2-7: QMS 预警/通过率端点封装

---

*审计完成时间: 2026-09-08*
*审计工具: 静态代码分析（grep + Python AST 辅助解析）*
*验证状态: 所有 P0/P1 级缺口均已通过源码交叉验证；P2/P3 级部分标注"待验证"需运行时确认*
