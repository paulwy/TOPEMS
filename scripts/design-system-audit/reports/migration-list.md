# TOPEMS 未使用模板页面迁移清单

> 生成时间：2026-08-21T06:02:26.463Z
> 数据来源：scripts/design-system-audit/reports/page-template-map.csv
> 筛选条件：hasTemplate = no

---

## 1. 总体概况

| 指标 | 数值 |
|------|------|
| 扫描页面总数 | 537 |
| 未使用模板页面数 | **172** |
| 未使用模板占比 | 32.0% |

### 按优先级分布

| 优先级 | 页面数 | 占比 | 说明 |
|--------|--------|------|------|
| P0 | 31 | 18.0% | MES / WMS / ERP，优先处理 |
| P1 | 17 | 9.9% | CRM / Finance / HRM / QMS |
| P2 | 28 | 16.3% | RD / PDM / SCM / SRM / LIMS / APS / TMS / EHS |
| P3 | 96 | 55.8% | 长尾模块 |

### 按模块分布（TOP20）

| 优先级 | 模块 | 未使用模板页面数 |
|--------|------|------------------|
| P0 | mes | 14 |
| P0 | wms | 13 |
| P0 | erp | 4 |
| P1 | qms | 12 |
| P1 | finance | 3 |
| P1 | crm | 1 |
| P1 | hrm | 1 |
| P2 | tms | 13 |
| P2 | aps | 12 |
| P2 | lims | 2 |
| P2 | srm | 1 |
| P3 | shared | 13 |
| P3 | mobile | 11 |
| P3 | lowcode | 10 |
| P3 | ai | 9 |
| P3 | report | 9 |
| P3 | admin | 7 |
| P3 | automation | 5 |
| P3 | workflow | 5 |
| P3 | oa | 4 |

### 迁移工作量预估

| 复杂度 | 页面数 | 单页工作量 | 总工作量估算 |
|--------|--------|------------|--------------|
| 中 | 7 | 1.5 天 | 约 10.5 人天 |
| 低 | 84 | 0.75 天 | 约 63.0 人天 |
| 高 | 81 | 3 天 | 约 243.0 人天 |
| **合计** | **172** | - | **约 316.5 人天** |

---

## 2. 迁移路线图建议

### 第一波：P0 模块（31 个页面）

目标模块：MES、WMS、ERP
建议周期：2-3 周
验收标准：
- [ ] P0 模块未使用模板页面 100% 完成迁移
- [ ] 迁移后无 P0/P1 级回归 Bug
- [ ] 所有迁移页面通过设计走查

### 第二波：P1 模块（17 个页面）

目标模块：CRM、Finance、HRM、QMS
建议周期：3-4 周
验收标准：
- [ ] P1 模块未使用模板页面 80% 完成迁移
- [ ] 优先处理列表/详情/表单类高频页面

### 第三波：P2 模块（28 个页面）

目标模块：RD、PDM、SCM、SRM、LIMS、APS、TMS、EHS
建议周期：4-6 周
验收标准：
- [ ] P2 模块未使用模板页面 50% 完成迁移

### 第四波：P3 模块（96 个页面）

目标模块：其他长尾模块
建议周期：按业务需求择机处理

---

## 3. 详细迁移清单

### P0 优先级（31 个页面）

#### erp（4 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AuditLogPage.tsx | crud / list | PageContainer; StatusBadge | 低 | 0.5-1 天 | 已有 PageContainer |
| DatabaseManagementPage.tsx | crud / list | PageContainer; StatusBadge; ConfirmDialog | 低 | 0.5-1 天 | 已有 PageContainer |
| FinancialAnalysisPage.tsx | crud / list | PageContainer; LoadingSpinner | 低 | 0.5-1 天 | 已有 PageContainer |
| FinancialReportPage.tsx | stats | PageContainer | 高 | 2-4 天 | 已有 PageContainer |

#### mes（14 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| analytics/MesCapacityUtilizationPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/MesDeliveryAnalyticsPage.tsx | stats | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/MesEnergyCostPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/MesEquipmentMtbfPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/MesOeeDashboardPage.tsx | dashboard | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/MesQualityParetoPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| AnomalyDetectionPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| ApsSchedulingPage.tsx | crud / list | PageContainer; LoadingSpinner | 低 | 0.5-1 天 | 已有 PageContainer |
| EnergyManagementPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| ProductionCostPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| ProductionDashboardPage/constants.tsx | crud（需进一步确认） | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ProductionDashboardPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| ProductionKanbanPage.tsx | kanban | PageContainer; LoadingSpinner | 高 | 2-4 天 | 已有 PageContainer |
| QualityTraceabilityPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### wms（13 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| analytics/WmsAbcAnalysisPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/WmsAgeParetoPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/WmsFlowTrendPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/WmsInventoryTurnoverPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/WmsLocationUtilizationPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/WmsOrderFulfillmentPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| InventoryReportPage.tsx | stats | PageContainer; Grid | 高 | 2-4 天 | 已有 PageContainer |
| WmsInboundDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| WmsInventoryMovementDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| WmsOutboundDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| WmsStockTakeDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| WmsTransferDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| WmsWavePickDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

### P1 优先级（17 个页面）

#### crm（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| CrmForecastAlgorithmPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### finance（3 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| ConsolidationScopePage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| OpeningBalancePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| PaymentPrintTemplate.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### hrm（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| EmployeeFinanceTab.tsx | crud（需进一步确认） | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

#### qms（12 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| analytics/QmsAuditCompliancePage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/QmsCostAnalysisPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/QmsDefectParetoPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/QmsFmeaRiskMatrixPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/QmsQualityTrendPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/QmsSpcControlChartPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| QmsApqpProjectDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| QmsAuditPlanDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| QmsEightDDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| QmsFmeaDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| QmsInspectionDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| QmsIssueDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

### P2 优先级（28 个页面）

#### aps（12 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| analytics/CapacityUtilizationPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/ForecastAccuracyPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/MaterialShortagePage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/OeeDashboardPage.tsx | dashboard | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/PlanAdherencePage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/ScheduleGanttPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| CapacityDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ForecastDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| MaterialPlanDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| PlanComparisonDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ProductionPlanDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ScheduleDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

#### lims（2 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| InspectionResultPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| LimsInstrumentDataPage/index.tsx | crud（需进一步确认） | PageContainer; ConfirmDialog | 低 | 0.5-1 天 | 已有 PageContainer |

#### srm（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| SupplierPortalPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### tms（13 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| analytics/CarrierPerformancePage.tsx | crud / form | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/DriverPerformancePage.tsx | crud / form | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/FreightCostPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/RouteEfficiencyPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/ShipmentTrendPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| analytics/VehicleUtilizationPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| CarrierDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| DriverDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| RouteDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ShipmentDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ShipmentManagementPage.tsx | crud / list | PageContainer; StatusChip | 低 | 0.5-1 天 | 已有 PageContainer |
| TransportPlanDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| VehicleDetailPage.tsx | crud / detail | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

### P3 优先级（96 个页面）

#### _shared（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| UserManagementApiAdapter.shared.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

#### admin（7 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| DatabaseStructurePage.tsx | tree | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MonitoringAlertPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MonitorPage.tsx | crud / list | LoadingSpinner | 低 | 0.5-1 天 | 已有 PageContainer |
| PermissionAuditPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| RateLimitConfigPage.tsx | settings | PageContainer | 中 | 1-2 天 | 已有 PageContainer |
| SystemManagementPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| TenantSettingsPage.tsx | settings | PageContainer; Grid | 中 | 1-2 天 | 已有 PageContainer |

#### ai（9 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AiAssistantPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| AiChatPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| AiCodeAssistantPage.tsx | crud / list | PageContainer; Grid | 低 | 0.5-1 天 | 已有 PageContainer |
| AiDashboardPage.tsx | dashboard | PageContainer | 高 | 2-4 天 | 已有 PageContainer |
| AiDocumentAnalysisPage.tsx | crud / list | PageContainer; Grid | 低 | 0.5-1 天 | 已有 PageContainer |
| AiKnowledgeBasePage.tsx | crud / list | PageContainer; Grid | 低 | 0.5-1 天 | 已有 PageContainer |
| AiModelSettingsPage.tsx | settings | PageContainer; Grid | 中 | 1-2 天 | 已有 PageContainer |
| AiPromptLibraryPage.tsx | crud / list | PageContainer; Grid | 低 | 0.5-1 天 | 已有 PageContainer |
| DifyChatPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### automation（5 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AutomationDashboardPage.tsx | dashboard | PageContainer | 高 | 2-4 天 | 已有 PageContainer |
| AutomationDesignerPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| AutomationRulesPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| AutomationRunsPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| AutomationVariablesPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### bi（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| GisPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### desktop（2 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AuditLogPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| DesktopMonitorPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

#### doc（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| DocumentsPage/index.tsx | crud（需进一步确认） | ConfirmDialog | 低 | 0.5-1 天 | 已有 PageContainer |

#### gis（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### help（3 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| FaqPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| GuidePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| HelpCenterPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### iam（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| CompanyStructurePage.tsx | tree | PageContainer; DataTable; ConfirmDialog | 低 | 0.5-1 天 | 已有 PageContainer；已用 DataTable |

#### im（2 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| MailPage/hooks.tsx | crud（需进一步确认） | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| MailPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### integration（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| IntegrationExternalErpOverviewPage.tsx | dashboard | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### lowcode（10 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AppListPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| AppManagementPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| DataModelListPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| DataSourcePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| FormDesignPage.tsx | crud / form | PageContainer | 中 | 1-2 天 | 已有 PageContainer |
| FormListPage.tsx | crud / form | PageContainer | 中 | 1-2 天 | 已有 PageContainer |
| LowCodeHomePage.tsx | dashboard | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| PageDesignPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| PageListPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| WorkflowConfigPage.tsx | settings | PageContainer | 中 | 1-2 天 | 已有 PageContainer |

#### mobile（11 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| MobileApprovalPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileAttendancePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileHomePage.tsx | dashboard | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileInventoryPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileProductionPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileProfilePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileQualityPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileScanPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileTaskListPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MobileWorkbenchPage.tsx | crud / list | Grid; PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| PushNotificationPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### notification（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| NotificationCenter.tsx | crud（需进一步确认） | - | 高 | 2-4 天 | 无公共组件，迁移成本高；已有 PageContainer |

#### oa（4 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AnnouncementPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| DocumentManagementPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| MeetingManagementPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| VehicleManagementPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### performance（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| PerformanceTestPage.tsx | crud / form | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |

#### plugin（3 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| PluginDetailPage.tsx | crud / detail | PageContainer | 中 | 1-2 天 | 已有 PageContainer |
| PluginMarketplacePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| PluginUploadPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### pm（1 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| PmTemplatePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### report（9 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| ReportBuilder.tsx | stats | PageContainer | 高 | 2-4 天 | 已有 PageContainer |
| ReportBuilderPage.tsx | stats | PageContainer | 高 | 2-4 天 | 已有 PageContainer |
| ReportDesignPage.tsx | stats | PageContainer | 高 | 2-4 天 | 已有 PageContainer |
| ReportPage.tsx | stats | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ReportPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| ReportPage/utils.tsx | crud（需进一步确认） | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ReportSchedulePage.tsx | stats | PageContainer; ConfirmDialog | 高 | 2-4 天 | 已有 PageContainer |
| ReportViewer.tsx | stats | PageContainer | 高 | 2-4 天 | 已有 PageContainer |
| TemplateManagementPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高；已有 PageContainer |

#### shared（13 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AttachmentsPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| CommentsPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| DashboardPage.tsx | dashboard | PageContainer; EmptyState | 高 | 2-4 天 | 已有 PageContainer |
| ErrorPage.tsx | crud / list | BackButton | 低 | 0.5-1 天 | - |
| FavoritesPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| ForgotPasswordPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| HybridHomePage.tsx | dashboard | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| IMPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| LoginPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ModulesOverviewPage.tsx | dashboard | - | 高 | 2-4 天 | 无公共组件，迁移成本高；已有 PageContainer |
| NotFoundPage.tsx | crud / list | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| ProfilePage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| V4DemoPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### system（4 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| AuditLogPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| BackupPage.tsx | crud / list | PageContainer; ConfirmDialog | 低 | 0.5-1 天 | 已有 PageContainer |
| FeatureFlagPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| SystemParamsPage/index.tsx | crud（需进一步确认） | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

#### workflow（5 个）

| 文件 | 推荐模板 | 当前公共组件 | 复杂度 | 预估工作量 | 备注 |
|------|----------|--------------|--------|------------|------|
| WorkflowDesignerPage.tsx | crud / list | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| WorkflowNotificationCenterPage.tsx | crud / list | LoadingSpinner; PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |
| WorkflowSettingsPage/constants.tsx | crud（需进一步确认） | - | 高 | 2-4 天 | 无公共组件，迁移成本高 |
| WorkflowSettingsPage/index.tsx | crud（需进一步确认） | PageContainer; ConfirmDialog | 低 | 0.5-1 天 | 已有 PageContainer |
| WorkflowVersionHistoryPage.tsx | timeline | PageContainer | 低 | 0.5-1 天 | 已有 PageContainer |

---

## 4. 迁移决策指南

### 4.1 推荐模板选择逻辑

| 文件名特征 | 推荐模板 | 说明 |
|------------|----------|------|
| Dashboard / Overview / Home | dashboard | 统计看板类 |
| List / Management / Page | crud / list | 数据列表类，优先用 CrudPage |
| Detail / View | crud / detail | 详情展示类 |
| Create / Edit / Form | crud / form | 表单编辑类 |
| Settings / Config / Preference | settings | 设置页 |
| Stats / Analytics / Report | stats | 统计分析页 |
| Kanban / Board | kanban | 看板页 |
| Timeline / History / Version | timeline | 时间轴页 |
| Map / Gis / Tracking | gis-map | GIS 地图页 |
| Wizard / Onboarding / Setup | wizard | 分步向导页 |
| Tree / Structure / Organization | tree | 树形结构页 |
| 其他 | crud（需确认） | 默认建议，需人工复核 |

### 4.2 迁移注意事项

1. **优先迁移已有 PageContainer 的页面**：这些页面布局基础较好，迁移成本低。
2. **使用 DataTable 的页面**：若当前已直接用 DataTable，可考虑直接接入 CrudPage 或 ListPageTemplate。
3. **无公共组件的页面**：需要额外评估是否先抽象公共组件再迁移。
4. **Dashboard 类页面**：统一接入 DashboardTemplate，统计卡片使用 StatCardComponent。
5. **AI / BI / GIS 等特殊页面**：注意 Cyber 主题和常规主题的视觉差异。

---

## 5. 附录

### 5.1 优先级定义

| 优先级 | 模块 | 理由 |
|--------|------|------|
| P0 | MES、WMS、ERP | 页面最多，业务核心，模板迁移收益最大 |
| P1 | CRM、Finance、HRM、QMS | 高频使用，列表/详情/表单典型 |
| P2 | RD、PDM、SCM、SRM、LIMS、APS、TMS、EHS | 中等优先级，按业务节奏处理 |
| P3 | 其他 | 页面较少或低频，择机处理 |

### 5.2 相关文件

- 扫描脚本：scripts/design-system-audit/scan.mjs
- 扫描报告：scripts/design-system-audit/reports/page-template-map.csv
- 实施规划：design-system-implementation-plan.md
- 资产盘点：design-inventory-and-template-analysis.md

---

*本清单基于正则扫描结果自动生成，推荐模板类型和复杂度仅为初步判断，实际迁移前需人工复核。*
