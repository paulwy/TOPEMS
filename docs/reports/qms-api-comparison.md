# QMS 模块前后端 API 对接情况报告

> 生成时间：2026-07-05

## 一、总体概览

| 指标 | 数量 |
|------|------|
| 前端 API 总数 | 110 |
| 后端 API 总数 | 58 |
| 已对接 API 数 | 55 |
| 前端超前（前端有、后端无） | 55 |
| 后端超前（后端有、前端无） | 3 |
| **对接率（以前端为基准）** | **50.0%** |
| 对接率（以后端为基准） | 94.8% |

## 二、各模块对接情况

| 模块 | 前端API数 | 已对接数 | 对接率 | 状态 |
|------|----------|---------|--------|------|
| APQP先期质量策划（apqp） | 25 | 20 | 80.0% | 🟡 大部分对接 |
| 质量审计（audit） | 10 | 4 | 40.0% | 🟠 部分对接 |
| 纠正措施（correctiveAction） | 2 | 0 | 0.0% | 🔴 严重缺失 |
| 质量看板（dashboard） | 1 | 0 | 0.0% | 🔴 严重缺失 |
| 8D报告（eightD） | 13 | 4 | 30.8% | 🟠 部分对接 |
| FMEA分析（fmea） | 11 | 10 | 90.9% | 🟡 大部分对接 |
| 质量改进（improvement） | 5 | 3 | 60.0% | 🟠 部分对接 |
| 质量检验（inspection） | 11 | 1 | 9.1% | 🔴 严重缺失 |
| 质量问题（issue） | 5 | 5 | 100.0% | ✅ 完全对接 |
| 质量成本（qualityCost） | 7 | 0 | 0.0% | 🔴 严重缺失 |
| SPC统计过程控制（spc） | 8 | 6 | 75.0% | 🟡 大部分对接 |
| 质量标准（standard） | 6 | 1 | 16.7% | 🔴 严重缺失 |
| 数据同步（sync） | 6 | 1 | 16.7% | 🔴 严重缺失 |

## 三、前端 API 清单

### 3.13 APQP先期质量策划（apqp）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listApqpApprovals | GET | `/apqp/approvals` | ✅ 已对接 |
| 2 | createApqpApproval | POST | `/apqp/approvals` | ✅ 已对接 |
| 3 | processApqpApproval | POST | `/apqp/approvals/{id}/process` | ❌ 未对接 |
| 4 | listApqpPhases | GET | `/apqp/phases` | ✅ 已对接 |
| 5 | createApqpPhase | POST | `/apqp/phases` | ✅ 已对接 |
| 6 | getApqpPhase | GET | `/apqp/phases/{id}` | ✅ 已对接 |
| 7 | updateApqpPhase | PUT | `/apqp/phases/{id}` | ✅ 已对接 |
| 8 | deleteApqpPhase | DELETE | `/apqp/phases/{id}` | ✅ 已对接 |
| 9 | listApqpProjects | GET | `/apqp/projects` | ✅ 已对接 |
| 10 | createApqpProject | POST | `/apqp/projects` | ✅ 已对接 |
| 11 | getApqpProject | GET | `/apqp/projects/{id}` | ✅ 已对接 |
| 12 | updateApqpProject | PUT | `/apqp/projects/{id}` | ❌ 未对接 |
| 13 | deleteApqpProject | DELETE | `/apqp/projects/{id}` | ❌ 未对接 |
| 14 | getApqpProgress | GET | `/apqp/projects/{id}/progress` | ❌ 未对接 |
| 15 | transitionApqpStatus | POST | `/apqp/projects/{id}/transition` | ❌ 未对接 |
| 16 | listApqpRisks | GET | `/apqp/risks` | ✅ 已对接 |
| 17 | createApqpRisk | POST | `/apqp/risks` | ✅ 已对接 |
| 18 | getApqpRisk | GET | `/apqp/risks/{id}` | ✅ 已对接 |
| 19 | updateApqpRisk | PUT | `/apqp/risks/{id}` | ✅ 已对接 |
| 20 | deleteApqpRisk | DELETE | `/apqp/risks/{id}` | ✅ 已对接 |
| 21 | listApqpTasks | GET | `/apqp/tasks` | ✅ 已对接 |
| 22 | createApqpTask | POST | `/apqp/tasks` | ✅ 已对接 |
| 23 | getApqpTask | GET | `/apqp/tasks/{id}` | ✅ 已对接 |
| 24 | updateApqpTask | PUT | `/apqp/tasks/{id}` | ✅ 已对接 |
| 25 | deleteApqpTask | DELETE | `/apqp/tasks/{id}` | ✅ 已对接 |

### 3.12 质量审计（audit）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listAuditFindings | GET | `/audit-findings` | ✅ 已对接 |
| 2 | createAuditFinding | POST | `/audit-findings` | ❌ 未对接 |
| 3 | verifyAuditFinding | POST | `/audit-findings/{findingId}/verify` | ❌ 未对接 |
| 4 | listAuditPlans | GET | `/audit-plans` | ✅ 已对接 |
| 5 | createAuditPlan | POST | `/audit-plans` | ✅ 已对接 |
| 6 | completeAuditPlan | POST | `/audit-plans/{id}/complete` | ❌ 未对接 |
| 7 | startAuditPlan | POST | `/audit-plans/{id}/start` | ❌ 未对接 |
| 8 | listAuditTasks | GET | `/audit-tasks` | ✅ 已对接 |
| 9 | createAuditTask | POST | `/audit-tasks` | ❌ 未对接 |
| 10 | completeAuditTask | PUT | `/audit-tasks/{taskId}/complete` | ❌ 未对接 |

### 3.11 纠正措施（correctiveAction）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | getActionItems | GET | `/actions/{actionId}/items` | ❌ 未对接 |
| 2 | completeAction | POST | `/actions/{id}/complete` | ❌ 未对接 |

### 3.9 质量看板（dashboard）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | getQualityOverview | GET | `/quality-dashboard/overview` | ❌ 未对接 |

### 3.7 8D报告（eightD）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listEightDReports | GET | `/eightd` | ✅ 已对接 |
| 2 | createEightDReport | POST | `/eightd` | ✅ 已对接 |
| 3 | getEightDReport | GET | `/eightd/{id}` | ✅ 已对接 |
| 4 | updateEightDReport | PUT | `/eightd/{id}` | ✅ 已对接 |
| 5 | deleteEightDReport | DELETE | `/eightd/{id}` | ❌ 未对接 |
| 6 | getEightDAuditLogs | GET | `/eightd/{id}/audit-logs` | ❌ 未对接 |
| 7 | closeEightDReport | POST | `/eightd/{id}/close` | ❌ 未对接 |
| 8 | updateD1Team | PUT | `/eightd/{id}/d1-team` | ❌ 未对接 |
| 9 | submitD3Containment | POST | `/eightd/{id}/d3-containment` | ❌ 未对接 |
| 10 | submitD4RootCause | POST | `/eightd/{id}/d4-root-cause` | ❌ 未对接 |
| 11 | submitD5PermanentAction | POST | `/eightd/{id}/d5-permanent-action` | ❌ 未对接 |
| 12 | verifyD6Effectiveness | POST | `/eightd/{id}/d6-verify` | ❌ 未对接 |
| 13 | submitD7Preventive | POST | `/eightd/{id}/d7-preventive` | ❌ 未对接 |

### 3.8 FMEA分析（fmea）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listFmeaAnalyses | GET | `/fmea` | ✅ 已对接 |
| 2 | createFmeaAnalysis | POST | `/fmea` | ✅ 已对接 |
| 3 | listFmeaItems | GET | `/fmea-items` | ✅ 已对接 |
| 4 | createFmeaItem | POST | `/fmea-items` | ✅ 已对接 |
| 5 | getFmeaItem | GET | `/fmea-items/{id}` | ✅ 已对接 |
| 6 | updateFmeaItem | PUT | `/fmea-items/{id}` | ✅ 已对接 |
| 7 | deleteFmeaItem | DELETE | `/fmea-items/{id}` | ✅ 已对接 |
| 8 | getFmeaStatistics | GET | `/fmea/{fmeaId}/statistics` | ❌ 未对接 |
| 9 | getFmeaAnalysis | GET | `/fmea/{id}` | ✅ 已对接 |
| 10 | updateFmeaAnalysis | PUT | `/fmea/{id}` | ✅ 已对接 |
| 11 | deleteFmeaAnalysis | DELETE | `/fmea/{id}` | ✅ 已对接 |

### 3.4 质量改进（improvement）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listImprovements | GET | `/actions` | ✅ 已对接 |
| 2 | createImprovement | POST | `/actions` | ✅ 已对接 |
| 3 | getImprovement | GET | `/actions/{id}` | ✅ 已对接 |
| 4 | updateImprovement | PUT | `/actions/{id}` | ❌ 未对接 |
| 5 | deleteImprovement | DELETE | `/actions/{id}` | ❌ 未对接 |

### 3.2 质量检验（inspection）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listChecks | GET | `/checks` | ✅ 已对接 |
| 2 | createCheck | POST | `/checks` | ❌ 未对接 |
| 3 | getCheck | GET | `/checks/{id}` | ❌ 未对接 |
| 4 | updateCheck | PUT | `/checks/{id}` | ❌ 未对接 |
| 5 | deleteCheck | DELETE | `/checks/{id}` | ❌ 未对接 |
| 6 | assignCheck | POST | `/checks/{id}/assign` | ❌ 未对接 |
| 7 | auditCheck | POST | `/checks/{id}/audit` | ❌ 未对接 |
| 8 | getCheckAudits | GET | `/checks/{id}/audits` | ❌ 未对接 |
| 9 | getCheckResults | GET | `/checks/{id}/results` | ❌ 未对接 |
| 10 | reworkCheck | POST | `/checks/{id}/rework` | ❌ 未对接 |
| 11 | submitCheckResult | POST | `/checks/{id}/submit` | ❌ 未对接 |

### 3.3 质量问题（issue）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listIssues | GET | `/issues` | ✅ 已对接 |
| 2 | createIssue | POST | `/issues` | ✅ 已对接 |
| 3 | getIssue | GET | `/issues/{id}` | ✅ 已对接 |
| 4 | updateIssue | PUT | `/issues/{id}` | ✅ 已对接 |
| 5 | deleteIssue | DELETE | `/issues/{id}` | ✅ 已对接 |

### 3.6 质量成本（qualityCost）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listQualityCosts | GET | `/quality-costs` | ❌ 未对接 |
| 2 | createQualityCost | POST | `/quality-costs` | ❌ 未对接 |
| 3 | getCostStatistics | GET | `/quality-costs/statistics` | ❌ 未对接 |
| 4 | getCostTrend | GET | `/quality-costs/trend` | ❌ 未对接 |
| 5 | getQualityCost | GET | `/quality-costs/{id}` | ❌ 未对接 |
| 6 | updateQualityCost | PUT | `/quality-costs/{id}` | ❌ 未对接 |
| 7 | deleteQualityCost | DELETE | `/quality-costs/{id}` | ❌ 未对接 |

### 3.5 SPC统计过程控制（spc）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listSpcCharts | GET | `/spc/charts` | ✅ 已对接 |
| 2 | createSpcChart | POST | `/spc/charts` | ✅ 已对接 |
| 3 | calculateControlLimits | POST | `/spc/charts/{chartId}/calculate` | ❌ 未对接 |
| 4 | getSpcDataPoints | GET | `/spc/charts/{chartId}/data-points` | ❌ 未对接 |
| 5 | getSpcChart | GET | `/spc/charts/{id}` | ✅ 已对接 |
| 6 | updateSpcChart | PUT | `/spc/charts/{id}` | ✅ 已对接 |
| 7 | deleteSpcChart | DELETE | `/spc/charts/{id}` | ✅ 已对接 |
| 8 | addSpcDataPoint | POST | `/spc/data-points` | ✅ 已对接 |

### 3.1 质量标准（standard）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listStandards | GET | `/standards` | ✅ 已对接 |
| 2 | createStandard | POST | `/standards` | ❌ 未对接 |
| 3 | getStandard | GET | `/standards/{id}` | ❌ 未对接 |
| 4 | updateStandard | PUT | `/standards/{id}` | ❌ 未对接 |
| 5 | deleteStandard | DELETE | `/standards/{id}` | ❌ 未对接 |
| 6 | listRevisions | GET | `/standards/{standardId}/revisions` | ❌ 未对接 |

### 3.10 数据同步（sync）

| 序号 | 函数名 | 方法 | 路径 | 对接状态 |
|------|--------|------|------|----------|
| 1 | listSyncRecords | GET | `/sync-records` | ✅ 已对接 |
| 2 | getSyncRecord | GET | `/sync-records/{id}` | ❌ 未对接 |
| 3 | deleteSyncRecord | DELETE | `/sync-records/{id}` | ❌ 未对接 |
| 4 | retrySync | POST | `/sync-records/{id}/retry` | ❌ 未对接 |
| 5 | syncInspectionToLims | POST | `/sync/inspection-to-lims` | ❌ 未对接 |
| 6 | syncIssueToEhs | POST | `/sync/issue-to-ehs` | ❌ 未对接 |

## 四、后端 API 清单

| 序号 | 方法 | 路径 | Handler |
|------|------|------|---------|
| 1 | GET | `/actions` | corrective_action::list_actions |
| 2 | POST | `/actions` | corrective_action::create_action |
| 3 | GET | `/actions/{id}` | corrective_action::get_action |
| 4 | GET | `/apqp/approvals` | apqp::list_apqp_approvals |
| 5 | POST | `/apqp/approvals` | apqp::create_apqp_approval |
| 6 | GET | `/apqp/phases` | apqp::list_apqp_phases |
| 7 | POST | `/apqp/phases` | apqp::create_apqp_phase |
| 8 | GET | `/apqp/phases/{id}` | apqp::get_apqp_phase |
| 9 | PUT | `/apqp/phases/{id}` | apqp::update_apqp_phase |
| 10 | DELETE | `/apqp/phases/{id}` | apqp::delete_apqp_phase |
| 11 | GET | `/apqp/projects` | apqp::list_apqp_projects |
| 12 | POST | `/apqp/projects` | apqp::create_apqp_project |
| 13 | GET | `/apqp/projects/{id}` | apqp::get_apqp_project |
| 14 | GET | `/apqp/risks` | apqp::list_apqp_risks |
| 15 | POST | `/apqp/risks` | apqp::create_apqp_risk |
| 16 | GET | `/apqp/risks/{id}` | apqp::get_apqp_risk |
| 17 | PUT | `/apqp/risks/{id}` | apqp::update_apqp_risk |
| 18 | DELETE | `/apqp/risks/{id}` | apqp::delete_apqp_risk |
| 19 | GET | `/apqp/tasks` | apqp::list_apqp_tasks |
| 20 | POST | `/apqp/tasks` | apqp::create_apqp_task |
| 21 | GET | `/apqp/tasks/{id}` | apqp::get_apqp_task |
| 22 | PUT | `/apqp/tasks/{id}` | apqp::update_apqp_task |
| 23 | DELETE | `/apqp/tasks/{id}` | apqp::delete_apqp_task |
| 24 | GET | `/audit-findings` | audit::list_audit_findings |
| 25 | GET | `/audit-plans` | audit::list_audit_plans |
| 26 | POST | `/audit-plans` | audit::create_audit_plan |
| 27 | GET | `/audit-plans/{id}` | audit::get_audit_plan |
| 28 | GET | `/audit-tasks` | audit::list_audit_tasks |
| 29 | GET | `/checks` | quality_inspection::list_inspections |
| 30 | GET | `/dashboard` | dashboard::get_dashboard_stats |
| 31 | GET | `/eightd` | eight_d::list_eightd_reports |
| 32 | POST | `/eightd` | eight_d::create_eightd_report |
| 33 | GET | `/eightd/{id}` | eight_d::get_eightd_report |
| 34 | PUT | `/eightd/{id}` | eight_d::update_eightd_report |
| 35 | GET | `/fmea` | fmea::list_fmea_analyses |
| 36 | POST | `/fmea` | fmea::create_fmea_analysis |
| 37 | GET | `/fmea-items` | fmea::list_fmea_items |
| 38 | POST | `/fmea-items` | fmea::create_fmea_item |
| 39 | GET | `/fmea-items/{id}` | fmea::get_fmea_item |
| 40 | PUT | `/fmea-items/{id}` | fmea::update_fmea_item |
| 41 | DELETE | `/fmea-items/{id}` | fmea::delete_fmea_item |
| 42 | GET | `/fmea/{id}` | fmea::get_fmea_analysis |
| 43 | PUT | `/fmea/{id}` | fmea::update_fmea_analysis |
| 44 | DELETE | `/fmea/{id}` | fmea::delete_fmea_analysis |
| 45 | GET | `/issues` | quality_issue::list_issues |
| 46 | POST | `/issues` | quality_issue::create_issue |
| 47 | GET | `/issues/{id}` | quality_issue::get_issue |
| 48 | PUT | `/issues/{id}` | quality_issue::update_issue |
| 49 | DELETE | `/issues/{id}` | quality_issue::delete_issue |
| 50 | GET | `/spc/charts` | spc::list_spc_charts |
| 51 | POST | `/spc/charts` | spc::create_spc_chart |
| 52 | GET | `/spc/charts/{id}` | spc::get_spc_chart |
| 53 | PUT | `/spc/charts/{id}` | spc::update_spc_chart |
| 54 | DELETE | `/spc/charts/{id}` | spc::delete_spc_chart |
| 55 | GET | `/spc/data-points` | spc::get_spc_data_points |
| 56 | POST | `/spc/data-points` | spc::add_spc_data_point |
| 57 | GET | `/standards` | quality_standard::list_standards |
| 58 | GET | `/sync-records` | data_sync::list_sync_records |

## 五、前端超前的 API（前端有，后端没有）

共 **55** 个 API 前端已定义但后端未实现：

### 5.12 APQP先期质量策划（apqp）- 5个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | processApqpApproval | POST | `/apqp/approvals/{id}/process` |
| 2 | updateApqpProject | PUT | `/apqp/projects/{id}` |
| 3 | deleteApqpProject | DELETE | `/apqp/projects/{id}` |
| 4 | getApqpProgress | GET | `/apqp/projects/{id}/progress` |
| 5 | transitionApqpStatus | POST | `/apqp/projects/{id}/transition` |

### 5.11 质量审计（audit）- 6个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | createAuditFinding | POST | `/audit-findings` |
| 2 | verifyAuditFinding | POST | `/audit-findings/{findingId}/verify` |
| 3 | completeAuditPlan | POST | `/audit-plans/{id}/complete` |
| 4 | startAuditPlan | POST | `/audit-plans/{id}/start` |
| 5 | createAuditTask | POST | `/audit-tasks` |
| 6 | completeAuditTask | PUT | `/audit-tasks/{taskId}/complete` |

### 5.10 纠正措施（correctiveAction）- 2个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | getActionItems | GET | `/actions/{actionId}/items` |
| 2 | completeAction | POST | `/actions/{id}/complete` |

### 5.8 质量看板（dashboard）- 1个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | getQualityOverview | GET | `/quality-dashboard/overview` |

### 5.6 8D报告（eightD）- 9个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | deleteEightDReport | DELETE | `/eightd/{id}` |
| 2 | getEightDAuditLogs | GET | `/eightd/{id}/audit-logs` |
| 3 | closeEightDReport | POST | `/eightd/{id}/close` |
| 4 | updateD1Team | PUT | `/eightd/{id}/d1-team` |
| 5 | submitD3Containment | POST | `/eightd/{id}/d3-containment` |
| 6 | submitD4RootCause | POST | `/eightd/{id}/d4-root-cause` |
| 7 | submitD5PermanentAction | POST | `/eightd/{id}/d5-permanent-action` |
| 8 | verifyD6Effectiveness | POST | `/eightd/{id}/d6-verify` |
| 9 | submitD7Preventive | POST | `/eightd/{id}/d7-preventive` |

### 5.7 FMEA分析（fmea）- 1个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | getFmeaStatistics | GET | `/fmea/{fmeaId}/statistics` |

### 5.3 质量改进（improvement）- 2个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | updateImprovement | PUT | `/actions/{id}` |
| 2 | deleteImprovement | DELETE | `/actions/{id}` |

### 5.2 质量检验（inspection）- 10个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | createCheck | POST | `/checks` |
| 2 | getCheck | GET | `/checks/{id}` |
| 3 | updateCheck | PUT | `/checks/{id}` |
| 4 | deleteCheck | DELETE | `/checks/{id}` |
| 5 | assignCheck | POST | `/checks/{id}/assign` |
| 6 | auditCheck | POST | `/checks/{id}/audit` |
| 7 | getCheckAudits | GET | `/checks/{id}/audits` |
| 8 | getCheckResults | GET | `/checks/{id}/results` |
| 9 | reworkCheck | POST | `/checks/{id}/rework` |
| 10 | submitCheckResult | POST | `/checks/{id}/submit` |

### 5.5 质量成本（qualityCost）- 7个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listQualityCosts | GET | `/quality-costs` |
| 2 | createQualityCost | POST | `/quality-costs` |
| 3 | getCostStatistics | GET | `/quality-costs/statistics` |
| 4 | getCostTrend | GET | `/quality-costs/trend` |
| 5 | getQualityCost | GET | `/quality-costs/{id}` |
| 6 | updateQualityCost | PUT | `/quality-costs/{id}` |
| 7 | deleteQualityCost | DELETE | `/quality-costs/{id}` |

### 5.4 SPC统计过程控制（spc）- 2个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | calculateControlLimits | POST | `/spc/charts/{chartId}/calculate` |
| 2 | getSpcDataPoints | GET | `/spc/charts/{chartId}/data-points` |

### 5.1 质量标准（standard）- 5个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | createStandard | POST | `/standards` |
| 2 | getStandard | GET | `/standards/{id}` |
| 3 | updateStandard | PUT | `/standards/{id}` |
| 4 | deleteStandard | DELETE | `/standards/{id}` |
| 5 | listRevisions | GET | `/standards/{standardId}/revisions` |

### 5.9 数据同步（sync）- 5个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | getSyncRecord | GET | `/sync-records/{id}` |
| 2 | deleteSyncRecord | DELETE | `/sync-records/{id}` |
| 3 | retrySync | POST | `/sync-records/{id}/retry` |
| 4 | syncInspectionToLims | POST | `/sync/inspection-to-lims` |
| 5 | syncIssueToEhs | POST | `/sync/issue-to-ehs` |

## 六、后端超前的 API（后端有，前端没有）

共 **3** 个 API 后端已实现但前端未使用：

| 序号 | 方法 | 路径 | Handler |
|------|------|------|---------|
| 1 | GET | `/audit-plans/{id}` | audit::get_audit_plan |
| 2 | GET | `/dashboard` | dashboard::get_dashboard_stats |
| 3 | GET | `/spc/data-points` | spc::get_spc_data_points |

## 七、已对接 API 清单

共 **55** 个 API 前后端均已实现：

### 7.10 APQP先期质量策划（apqp）- 20个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listApqpApprovals | GET | `/apqp/approvals` |
| 2 | createApqpApproval | POST | `/apqp/approvals` |
| 3 | listApqpPhases | GET | `/apqp/phases` |
| 4 | createApqpPhase | POST | `/apqp/phases` |
| 5 | getApqpPhase | GET | `/apqp/phases/{id}` |
| 6 | updateApqpPhase | PUT | `/apqp/phases/{id}` |
| 7 | deleteApqpPhase | DELETE | `/apqp/phases/{id}` |
| 8 | listApqpProjects | GET | `/apqp/projects` |
| 9 | createApqpProject | POST | `/apqp/projects` |
| 10 | getApqpProject | GET | `/apqp/projects/{id}` |
| 11 | listApqpRisks | GET | `/apqp/risks` |
| 12 | createApqpRisk | POST | `/apqp/risks` |
| 13 | getApqpRisk | GET | `/apqp/risks/{id}` |
| 14 | updateApqpRisk | PUT | `/apqp/risks/{id}` |
| 15 | deleteApqpRisk | DELETE | `/apqp/risks/{id}` |
| 16 | listApqpTasks | GET | `/apqp/tasks` |
| 17 | createApqpTask | POST | `/apqp/tasks` |
| 18 | getApqpTask | GET | `/apqp/tasks/{id}` |
| 19 | updateApqpTask | PUT | `/apqp/tasks/{id}` |
| 20 | deleteApqpTask | DELETE | `/apqp/tasks/{id}` |

### 7.9 质量审计（audit）- 4个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listAuditFindings | GET | `/audit-findings` |
| 2 | listAuditPlans | GET | `/audit-plans` |
| 3 | createAuditPlan | POST | `/audit-plans` |
| 4 | listAuditTasks | GET | `/audit-tasks` |

### 7.6 8D报告（eightD）- 4个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listEightDReports | GET | `/eightd` |
| 2 | createEightDReport | POST | `/eightd` |
| 3 | getEightDReport | GET | `/eightd/{id}` |
| 4 | updateEightDReport | PUT | `/eightd/{id}` |

### 7.7 FMEA分析（fmea）- 10个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listFmeaAnalyses | GET | `/fmea` |
| 2 | createFmeaAnalysis | POST | `/fmea` |
| 3 | listFmeaItems | GET | `/fmea-items` |
| 4 | createFmeaItem | POST | `/fmea-items` |
| 5 | getFmeaItem | GET | `/fmea-items/{id}` |
| 6 | updateFmeaItem | PUT | `/fmea-items/{id}` |
| 7 | deleteFmeaItem | DELETE | `/fmea-items/{id}` |
| 8 | getFmeaAnalysis | GET | `/fmea/{id}` |
| 9 | updateFmeaAnalysis | PUT | `/fmea/{id}` |
| 10 | deleteFmeaAnalysis | DELETE | `/fmea/{id}` |

### 7.4 质量改进（improvement）- 3个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listImprovements | GET | `/actions` |
| 2 | createImprovement | POST | `/actions` |
| 3 | getImprovement | GET | `/actions/{id}` |

### 7.2 质量检验（inspection）- 1个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listChecks | GET | `/checks` |

### 7.3 质量问题（issue）- 5个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listIssues | GET | `/issues` |
| 2 | createIssue | POST | `/issues` |
| 3 | getIssue | GET | `/issues/{id}` |
| 4 | updateIssue | PUT | `/issues/{id}` |
| 5 | deleteIssue | DELETE | `/issues/{id}` |

### 7.5 SPC统计过程控制（spc）- 6个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listSpcCharts | GET | `/spc/charts` |
| 2 | createSpcChart | POST | `/spc/charts` |
| 3 | getSpcChart | GET | `/spc/charts/{id}` |
| 4 | updateSpcChart | PUT | `/spc/charts/{id}` |
| 5 | deleteSpcChart | DELETE | `/spc/charts/{id}` |
| 6 | addSpcDataPoint | POST | `/spc/data-points` |

### 7.1 质量标准（standard）- 1个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listStandards | GET | `/standards` |

### 7.8 数据同步（sync）- 1个

| 序号 | 函数名 | 方法 | 路径 |
|------|--------|------|------|
| 1 | listSyncRecords | GET | `/sync-records` |

## 八、主要缺失项摘要

### 8.1 后端需要优先补充的模块（按缺失数量排序）

- **质量检验**：缺失 10/11 个（对接率 9.1%）
- **8D报告**：缺失 9/13 个（对接率 30.8%）
- **质量成本**：缺失 7/7 个（对接率 0.0%）
- **质量审计**：缺失 6/10 个（对接率 40.0%）
- **质量标准**：缺失 5/6 个（对接率 16.7%）
- **数据同步**：缺失 5/6 个（对接率 16.7%）
- **APQP先期质量策划**：缺失 5/25 个（对接率 80.0%）
- **质量改进**：缺失 2/5 个（对接率 60.0%）
- **SPC统计过程控制**：缺失 2/8 个（对接率 75.0%）
- **纠正措施**：缺失 2/2 个（对接率 0.0%）
- **FMEA分析**：缺失 1/11 个（对接率 90.9%）
- **质量看板**：缺失 1/1 个（对接率 0.0%）

### 8.2 关键缺失 API 汇总

| 模块 | 缺失的核心功能 |
|------|--------------|
| 质量检验 | 检验单的增删改查、分配、提交、审核、返工、结果查询（仅有列表接口） |
| 8D报告 | 8D报告的删除、审核日志、关闭、各步骤提交（D1/D3/D4/D5/D6/D7）均未实现 |
| 质量成本 | 质量成本全部功能（列表、详情、增删改、统计、趋势）均未实现 |
| 质量审计 | 审计计划的启动/完成、审计任务创建/完成、审计发现创建/验证均未实现 |
| 质量标准 | 标准的增删改查、版本修订（仅有列表接口） |
| 数据同步 | 同步记录详情、删除、重试、向LIMS/EHS同步均未实现 |
| APQP先期质量策划 | 项目更新/删除/状态流转/进度、审批处理未实现 |
| 质量改进 | 改进措施的更新、删除未实现 |
| SPC统计过程控制 | 控制限计算、图表数据点查询（子路径）未实现 |
| 纠正措施 | 纠正措施的完成、子任务列表均未实现 |
| FMEA分析 | FMEA统计接口未实现 |
| 质量看板 | 质量看板概览接口未实现 |

## 九、建议

1. **高优先级**：补充质量检验、质量标准、质量成本、8D报告等核心业务模块的后端 API
2. **中优先级**：补充审计、纠正措施、数据同步等管理功能模块的后端 API
3. **低优先级**：补充 SPC 控制限计算、FMEA 统计、APQP 状态流转等高级功能
4. **建议统一**：后端 dashboard 路径为 `/dashboard`，前端为 `/quality-dashboard/overview`，建议统一路径命名规范
5. **注意事项**：后端超前的 3 个 API（audit-plans详情、dashboard、spc/data-points GET）前端尚未使用，需确认是否需要前端对接
