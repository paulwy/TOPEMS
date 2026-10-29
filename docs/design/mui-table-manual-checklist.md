# 手写 MUI Table 人工核对清单（长尾）

> 来源：TODO.md v1.112「66 个手写 MUI Table」观察项；本清单为可执行口径（grep `<Table` 组件，排除模板/共享/测试/microfrontend），实际 **82 个业务页文件**。
> 原则：详情抽屉子表已有纯文本空文案或父级 `!record` 守卫、图表/风险矩阵/弹窗/表单/静态桩（无 fetch）不在本清单强制范围；仅对**有数据数组且无空态守卫**的文件做人工核销。

| # | 文件 | 已有守卫（自动检测） | 人工核销 |
|---|---|---|---|
| 1 | apps/web/src/components/bi/DashboardEditor.tsx | 长度守卫 | ☐ |
| 2 | apps/web/src/components/LoadingProvider.tsx | 待人工确认 | ☐ |
| 3 | apps/web/src/pages/pm/PmProjectTypeConfigPage.tsx | 长度守卫 | ☐ |
| 4 | apps/web/src/pages/pm/PmContractDetailPage.tsx | 长度守卫 | ☐ |
| 5 | apps/web/src/pages/pm/PmProjectDetailPage.tsx | 长度守卫 | ☐ |
| 6 | apps/web/src/pages/pm/components/PmReportBenefitsTable.tsx | 长度守卫 | ☐ |
| 7 | apps/web/src/pages/pm/PmReportPage.tsx | 长度守卫 | ☐ |
| 8 | apps/web/src/pages/lims/MethodCategoryPage.tsx | 待人工确认 | ☐ |
| 9 | apps/web/src/pages/lims/AnalytePage.tsx | 待人工确认 | ☐ |
| 10 | apps/web/src/pages/lims/LimsInstrumentDetailPage.tsx | !record守卫、长度守卫 | ☐ |
| 11 | apps/web/src/pages/lims/LimsInstrumentDataPage/components/ParseTestDialog.tsx | 长度守卫 | ☐ |
| 12 | apps/web/src/pages/monitor/MonitorDashboardPage.tsx | !record守卫、长度守卫 | ☐ |
| 13 | apps/web/src/pages/wms/components/InventoryReportTable.tsx | EmptyState、长度守卫 | ☐ |
| 14 | apps/web/src/pages/wms/SupplierDetailPage.tsx | 待人工确认 | ☐ |
| 15 | apps/web/src/pages/crm/TagPage.tsx | 待人工确认 | ☐ |
| 16 | apps/web/src/pages/admin/components/RateLimitPathRules.tsx | 长度守卫 | ☐ |
| 17 | apps/web/src/pages/admin/RateLimitConfigPage.tsx | 长度守卫 | ☐ |
| 18 | apps/web/src/pages/admin/DatabaseStructurePage.tsx | 长度守卫 | ☐ |
| 19 | apps/web/src/pages/tms/TransportPlanDetailPage.tsx | 长度守卫 | ☐ |
| 20 | apps/web/src/pages/desktop/DesktopMonitorPage.tsx | 待人工确认 | ☐ |
| 21 | apps/web/src/pages/mes/MaterialIssuePage.tsx | 长度守卫 | ☐ |
| 22 | apps/web/src/pages/mes/CapacityPage.tsx | 待人工确认 | ☐ |
| 23 | apps/web/src/pages/mes/ProductionKanbanPage.tsx | 长度守卫 | ☐ |
| 24 | apps/web/src/pages/mes/TeamManagementPage.tsx | 长度守卫 | ☐ |
| 25 | apps/web/src/pages/mes/MaterialReturnPage.tsx | 长度守卫 | ☐ |
| 26 | apps/web/src/pages/mes/MesMasterDataPage.tsx | 待人工确认 | ☐ |
| 27 | apps/web/src/pages/mes/ProductionCostPage.tsx | 长度守卫 | ☐ |
| 28 | apps/web/src/pages/mes/MaterialBOMPage.tsx | 长度守卫 | ☐ |
| 29 | apps/web/src/pages/system/MenuManagementPage/index.tsx | 长度守卫 | ☐ |
| 30 | apps/web/src/pages/master/MasterGovernancePage.tsx | 长度守卫 | ☐ |
| 31 | apps/web/src/pages/master/PublicMasterDataPage.tsx | 长度守卫 | ☐ |
| 32 | apps/web/src/pages/master/MasterQualityPage.tsx | 长度守卫 | ☐ |
| 33 | apps/web/src/pages/master/MasterSemanticSearchPage.tsx | 长度守卫 | ☐ |
| 34 | apps/web/src/pages/master/MasterKnowledgeGraphPage.tsx | 长度守卫 | ☐ |
| 35 | apps/web/src/pages/master/MasterDisasterRecoveryPage.tsx | 长度守卫 | ☐ |
| 36 | apps/web/src/pages/master/LineageAnalyticsPage.tsx | 长度守卫 | ☐ |
| 37 | apps/web/src/pages/master/DataAssetCatalogPage.tsx | 长度守卫 | ☐ |
| 38 | apps/web/src/pages/master/MasterVersioningPage.tsx | 长度守卫 | ☐ |
| 39 | apps/web/src/pages/master/SchemaRegistryPage.tsx | 长度守卫 | ☐ |
| 40 | apps/web/src/pages/master/CommercialConsolePage.tsx | 长度守卫 | ☐ |
| 41 | apps/web/src/pages/master/AiGovernancePage.tsx | 长度守卫 | ☐ |
| 42 | apps/web/src/pages/ai/AiModelSettingsPage.tsx | 待人工确认 | ☐ |
| 43 | apps/web/src/pages/ai/components/AiAssistantReportTab.tsx | 长度守卫 | ☐ |
| 44 | apps/web/src/pages/ai/components/AiAssistantFlowTab.tsx | 长度守卫 | ☐ |
| 45 | apps/web/src/pages/ai/DshKnowledgePage.tsx | 长度守卫 | ☐ |
| 46 | apps/web/src/pages/ai/AiAssistantPage.tsx | 长度守卫 | ☐ |
| 47 | apps/web/src/pages/ai/DshRagPage.tsx | 长度守卫 | ☐ |
| 48 | apps/web/src/pages/qms/QmsApqpProjectDetailPage.tsx | 长度守卫 | ☐ |
| 49 | apps/web/src/pages/qms/QmsAuditPlanDetailPage.tsx | 长度守卫 | ☐ |
| 50 | apps/web/src/pages/qms/QmsIssueDetailPage.tsx | 长度守卫 | ☐ |
| 51 | apps/web/src/pages/qms/InspectionStandardPage.tsx | 待人工确认 | ☐ |
| 52 | apps/web/src/pages/qms/QmsFmeaDetailPage.tsx | 长度守卫 | ☐ |
| 53 | apps/web/src/pages/qms/analytics/QmsDefectParetoPage.tsx | 长度守卫 | ☐ |
| 54 | apps/web/src/pages/qms/analytics/QmsFmeaRiskMatrixPage.tsx | 长度守卫 | ☐ |
| 55 | apps/web/src/pages/qms/QmsInspectionDetailPage.tsx | 长度守卫 | ☐ |
| 56 | apps/web/src/pages/bi/BIModuleDetailPage.tsx | 长度守卫 | ☐ |
| 57 | apps/web/src/pages/bi/DataAnalysisPage.tsx | 待人工确认 | ☐ |
| 58 | apps/web/src/pages/bi/BIVisualizationPage.tsx | 长度守卫 | ☐ |
| 59 | apps/web/src/pages/bi/GisPage/components/ImportModal.tsx | 待人工确认 | ☐ |
| 60 | apps/web/src/pages/bi/components/BiPermissionDataTable.tsx | 长度守卫 | ☐ |
| 61 | apps/web/src/pages/bi/BIComparisonPage.tsx | 长度守卫 | ☐ |
| 62 | apps/web/src/pages/bi/DatasetPage.tsx | !record守卫、长度守卫 | ☐ |
| 63 | apps/web/src/pages/report/ReportViewer.tsx | 长度守卫 | ☐ |
| 64 | apps/web/src/pages/finance/FinancePeriodPage.tsx | 长度守卫 | ☐ |
| 65 | apps/web/src/pages/finance/VoucherCreatePage.tsx | 待人工确认 | ☐ |
| 66 | apps/web/src/pages/finance/VoucherDetailPage.tsx | 长度守卫 | ☐ |
| 67 | apps/web/src/pages/finance/FinanceApprovalConfigPage.tsx | 长度守卫 | ☐ |
| 68 | apps/web/src/pages/finance/FinanceCurrencyPage.tsx | 长度守卫 | ☐ |
| 69 | apps/web/src/pages/automation/AutomationRunsPage.tsx | 长度守卫 | ☐ |
| 70 | apps/web/src/pages/erp/DatabaseManagementPage.tsx | 待人工确认 | ☐ |
| 71 | apps/web/src/pages/erp/components/VoucherTable.tsx | 长度守卫 | ☐ |
| 72 | apps/web/src/pages/erp/components/VoucherDetailTabs.tsx | 待人工确认 | ☐ |
| 73 | apps/web/src/pages/erp/DictionaryPage.tsx | 待人工确认 | ☐ |
| 74 | apps/web/src/pages/rd/RsProjectDetailPage.tsx | 待人工确认 | ☐ |
| 75 | apps/web/src/pages/rd/RsFormulaDetailPage.tsx | 长度守卫 | ☐ |
| 76 | apps/web/src/pages/rd/RsFormulaCreatePage.tsx | 长度守卫 | ☐ |
| 77 | apps/web/src/pages/gis/GisTrackingPage.tsx | 长度守卫 | ☐ |
| 78 | apps/web/src/pages/gis/GisFencePage.tsx | 长度守卫 | ☐ |
| 79 | apps/web/src/pages/gis/DevicePage.tsx | 待人工确认 | ☐ |
| 80 | apps/web/src/pages/srm/InquiryQuotationPage.tsx | 长度守卫 | ☐ |
| 81 | apps/web/src/pages/srm/BiddingPage.tsx | 长度守卫 | ☐ |
| 82 | apps/web/src/pages/pdm/PdmDrawingPage.tsx | 长度守卫 | ☐ |

## 说明
- 自动检测仅覆盖常见守卫形态，**待人工确认**行需打开文件确认是否有其他空态处理（如子表仅在有父记录时渲染、`items?.map` 空数组渲染空容器）。
- 有守卫行也建议抽查确认守卫覆盖的是表格主体（而非仅弹窗/头部）。
