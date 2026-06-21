# TOPEMS 前端与后端接口对应设计文档

## 1. 前端所有路径和页面归纳

### 1.1 认证模块 (Auth)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/login` | `LoginPage` | 用户登录页面 |

### 1.2 仪表盘模块 (Dashboard)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/dashboard` | `DashboardPage` | 主仪表盘页面 |
| `/profile` | `ProfilePage` | 用户个人资料页面 |
| `/addressbook` | `AddressbookPage` | 通讯录页面 |

### 1.3 人力资源管理 (HRM)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/hrm/companies` | `HrmCompanyPage` | 公司管理 |
| `/hrm/departments` | `HrmDepartmentPage` | 部门管理 |
| `/hrm/organization` | `HrmOrganizationPage` | 组织架构 |
| `/hrm/positions` | `HrmPositionPage` | 岗位管理 |
| `/hrm/employees` | `HrmEmployeePage` | 员工列表 |
| `/hrm/employee/:id` | `HrmEmployeeDetailPage` | 员工详情 |
| `/hrm/leave` | `HrmLeavePage` | 请假管理 |
| `/hrm/contracts` | `HrmContractPage` | 合同管理 |
| `/hrm/recruitment` | `HrmRecruitmentPage` | 招聘管理 |
| `/hrm/payroll` | `HrmPayrollPage` | 薪资管理 |
| `/hrm/performance` | `HrmPerformancePage` | 绩效管理 |
| `/hrm/attendance` | `HrmAttendancePage` | 考勤管理 |
| `/hrm/training` | `HrmTrainingPage` | 培训管理 |
| `/hrm/reports` | `HrmReportsPage` | HRM报表 |

### 1.4 客户关系管理 (CRM)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/crm` | Navigate → `/crm/dashboard` | 重定向到仪表盘 |
| `/crm/dashboard` | `CRMDashboardPage` | CRM仪表盘 |
| `/crm/customers` | `CustomerManagementPage` | 客户管理 |
| `/crm/customers/:id` | `CustomerDetailPage` | 客户详情 |
| `/crm/contacts` | `ContactManagementPage` | 联系人管理 |
| `/crm/opportunities` | `OpportunityManagementPage` | 商机管理 |
| `/crm/interactions` | `InteractionManagementPage` | 交互记录 |
| `/crm/scoring` | `CRMCustomerScoringPage` | 客户评分 |
| `/crm/forecast` | `CRMSalesForecastPage` | 销售预测 |
| `/crm/billing` | `CRMBillingPage` | 账单管理 |

### 1.5 企业资源规划 (ERP)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/assets` | `AssetManagementPage` | 资产管理 |
| `/equipment` | `EquipmentManagementPage` | 设备管理 |
| `/finance` | `FinanceExpensePage` | 财务费用 |
| `/finance/vouchers` | `FinanceVoucherPage` | 凭证管理 |
| `/finance/receivable-payable` | `FinanceReceivablePayablePage` | 应收应付 |
| `/finance/reports` | `FinanceReportsPage` | 财务报表 |
| `/finance/budget` | `FinanceBudgetPage` | 预算管理 |
| `/administration` | `AdministrationPage` | 行政管理 |
| `/budget` | `BudgetManagementPage` | 预算管理 |
| `/office-supplies` | `OfficeSuppliesManagementPage` | 办公用品管理 |
| `/meeting-rooms` | `MeetingRoomManagementPage` | 会议室管理 |
| `/vehicles` | `VehicleManagementPage` | 车辆管理 |
| `/announcements` | `AnnouncementManagementPage` | 公告管理 |
| `/finance/voucher-templates` | `VoucherTemplatePage` | 凭证模板 |
| `/finance/financial-reports` | `FinancialReportsPage` | 财务报告 |
| `/finance/accounts` | `AccountManagementPage` | 账户管理 |
| `/finance/bank-accounts` | `BankAccountManagementPage` | 银行账户管理 |
| `/finance/fixed-assets` | `FixedAssetManagementPage` | 固定资产管理 |
| `/finance/consolidation/scopes` | `ConsolidationScopePage` | 合并范围 |
| `/finance/consolidation/reports` | `ConsolidationReportsPage` | 合并报表 |
| `/finance/company-structure` | `CompanyStructurePage` | 公司结构 |
| `/finance/opening-balances` | `OpeningBalancePage` | 期初余额 |

### 1.6 身份与访问管理 (IAM)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/users` | `UserManagementPage` | 用户管理 |
| `/roles` | `RoleManagementPage` | 角色管理 |
| `/permissions` | `PermissionManagementPage` | 权限管理 |
| `/audit` | `AuditLogPage` | 审计日志 |
| `/system` | `SystemManagementPage` | 系统管理 |
| `/dictionaries` | `DictionaryManagementPage` | 字典管理 |
| `/database` | `DatabaseStructurePage` | 数据库结构 |
| `/migration` | `MigrationAdminPage` | 数据迁移管理 |
| `/debug` | `ConfigDebugPage` | 配置调试 |

### 1.7 工作流模块 (Workflow)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/workflows` | `FlowWorkflowPage` | 工作流列表 |
| `/workflow-designer` | `WorkflowDesignerPage` | 工作流设计器 |
| `/flow/instances` | `FlowInstanceListPage` | 流程实例列表 |
| `/flow/instance/:id` | `FlowInstanceDetailPage` | 流程实例详情 |
| `/flow/approvals` | `FlowApprovalPage` | 审批列表 |
| `/flow/approval/:id` | `FlowApprovalDetailPage` | 审批详情 |
| `/flow/notifications` | `FlowNotificationCenter` | 流程通知中心 |
| `/flow/statistics` | `FlowStatisticsPage` | 流程统计 |
| `/flow/history` | `FlowVersionHistoryPage` | 版本历史 |

### 1.8 商业智能 (BI)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/bi/dashboard` | `BIDashboardPage` | BI仪表盘 |
| `/bi/analytics` | `BIAnalyticsPage` | 数据分析 |
| `/bi/comparison` | `BIComparisonPage` | 数据对比 |
| `/bi/reports` | `BIReportPage` | BI报表 |
| `/bi/datasources` | `BIDataSourcePage` | 数据源管理 |
| `/bi/visualizations` | `BIVisualizationPage` | 可视化管理 |
| `/bi/module/:moduleId` | `BIModuleDetailPage` | 模块详情 |

### 1.9 项目管理 (PM)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/pm` | `PmDashboardPage` | PM仪表盘 |
| `/pm/projects` | `PmProjectListPage` | 项目列表 |
| `/pm/projects/create` | `PmProjectCreatePage` | 创建项目 |
| `/pm/projects/:id` | `PmProjectDetailPage` | 项目详情 |
| `/pm/projects/:id/edit` | `PmProjectCreatePage` | 编辑项目 |
| `/pm/contracts` | `PmContractListPage` | 合同列表 |
| `/pm/contracts/create` | `PmContractCreatePage` | 创建合同 |
| `/pm/contracts/:id` | `PmContractDetailPage` | 合同详情 |
| `/pm/dashboard` | `ProjectDashboardPage` | 项目仪表盘 |
| `/pm/templates` | `PmTemplatePage` | 模板管理 |
| `/pm/reports` | `PmReportPage` | 项目报表 |
| `/pm/reports/:projectId` | `PmReportPage` | 项目报表(按项目) |

### 1.10 研发管理 (RS)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/rs` | `RsDashboardPage` | RS仪表盘 |
| `/rs/projects` | `RsProjectListPage` | 项目列表 |
| `/rs/projects/create` | `RsProjectCreatePage` | 创建项目 |
| `/rs/projects/:id` | `RsProjectDetailPage` | 项目详情 |
| `/rs/projects/:id/edit` | `RsProjectCreatePage` | 编辑项目 |
| `/rs/experiments` | `RsExperimentListPage` | 试验列表 |
| `/rs/experiments/create` | `RsExperimentCreatePage` | 创建试验 |
| `/rs/experiments/:id` | `RsExperimentDetailPage` | 试验详情 |
| `/rs/experiments/:id/edit` | `RsExperimentCreatePage` | 编辑试验 |
| `/rs/formulas` | `RsFormulaListPage` | 配方列表 |
| `/rs/formulas/create` | `RsFormulaCreatePage` | 创建配方 |
| `/rs/formulas/:id` | `RsFormulaDetailPage` | 配方详情 |
| `/rs/formulas/:id/edit` | `RsFormulaCreatePage` | 编辑配方 |
| `/rs/materials` | `RsMaterialListPage` | 物料管理 |
| `/rs/reports` | `RsReportPage` | RS报表 |

### 1.11 通知模块 (Notifications)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/notifications` | `NotificationCenter` | 通知中心 |
| `/notifications/templates` | `NotificationTemplatesPage` | 通知模板 |
| `/notifications/archive` | `NotificationArchivePage` | 通知归档 |
| `/notifications/stats` | `NotificationStatsPage` | 通知统计 |
| `/notifications/:id` | `NotificationDetailPage` | 通知详情 |

### 1.12 文档模块 (Docs)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/documents` | `DocumentsPage` | 文档管理 |
| `/document-center` | `DocumentCenterPage` | 文档中心 |
| `/knowledge-base` | `KnowledgeBasePage` | 知识库 |
| `/templates` | `TemplateManagementPage` | 模板管理 |
| `/help` | `HelpCenterPage` | 帮助中心 |

### 1.13 AI模块

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/ai` | `AIPage` | AI功能页面 |

### 1.14 专业模块 (Professional)

#### 1.14.1 LIMS (实验室信息管理)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/lims` | Navigate → `/lims/samples` | 重定向到样品管理 |
| `/lims/samples` | `LimsSamplePage` | 样品管理 |
| `/lims/sample/:id` | `LimsSampleDetailPage` | 样品详情 |
| `/lims/processes` | `LimsProcessPage` | 检验流程 |
| `/lims/tasks` | `LimsTaskPage` | 检验任务 |
| `/lims/task/:id` | `LimsTaskDetailPage` | 任务详情 |
| `/lims/instruments` | `LimsInstrumentPage` | 仪器管理 |
| `/lims/instrument/:id` | `LimsInstrumentMaintenancePage` | 仪器维护 |

#### 1.14.2 QMS (质量管理)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/qms` | Navigate → `/qms/standards` | 重定向到标准管理 |
| `/qms/standards` | `QmsStandardPage` | 质量标准 |
| `/qms/standard/:id` | `QmsStandardDetailPage` | 标准详情 |
| `/qms/checks` | `QmsCheckPage` | 质量检查 |
| `/qms/issues` | `QmsIssuePage` | 质量问题 |
| `/qms/improvements` | `QmsAuditPage` | 质量改进 |
| `/qms/audit` | `QmsAuditManagementPage` | 审核管理 |

#### 1.14.3 EHS (环境健康安全)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/ehs` | Navigate → `/ehs/hazards` | 重定向到危险源管理 |
| `/ehs/hazards` | `EhsHazardPage` | 危险源管理 |
| `/ehs/hazard/:id` | `EhsHazardDetailPage` | 危险源详情 |
| `/ehs/checks` | `EhsCheckPage` | 安全检查 |
| `/ehs/plans` | `EhsPlanPage` | 应急预案 |
| `/ehs/drills` | `EhsDrillPage` | 演练记录 |
| `/ehs/incident` | `EhsIncidentReportPage` | 事故报告 |

#### 1.14.4 SRM (供应商关系管理)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/srm` | Navigate → `/srm/dashboard` | 重定向到仪表盘 |
| `/srm/dashboard` | `SrmDashboardPage` | SRM仪表盘 |
| `/srm/suppliers` | `SrmSupplierPage` | 供应商管理 |
| `/srm/suppliers/:id` | `SupplierDetailPage` | 供应商详情 |
| `/srm/evaluations` | `SrmEvaluationPage` | 供应商评估 |
| `/srm/orders` | `SrmOrderPage` | 采购订单 |
| `/srm/contracts` | `SrmContractPage` | 供应商合同 |
| `/srm/finance` | `SrmFinancePage` | SRM财务 |

#### 1.14.5 PDM (生产数据管理)

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/pdm` | Navigate → `/pdm/processes` | 重定向到工艺管理 |
| `/pdm/processes` | `PdmProcessPage` | 工艺流程 |
| `/pdm/steps` | `PdmStepPage` | 工序管理 |
| `/pdm/formulas` | `PdmFormulaPage` | 配方管理 |
| `/pdm/batches` | `PdmBatchPage` | 批次管理 |
| `/pdm/stats` | `PdmStatsPage` | PDM统计 |

#### 1.14.6 其他专业模块

| 路径 | 页面组件 | 功能描述 |
|------|----------|----------|
| `/gis` | `Gispage` | GIS地图 |
| `/im` | `Impage` | IM即时通讯 |
| `/mail` | `MailPage` | 邮件管理 |
| `/integration` | `IntegrationPage` | 集成管理 |
| `/integration/external-erp` | `ExternalErpConnectionsPage` | 外部ERP连接 |
| `/integration/external-erp/:connectionId/mappings` | `ExternalErpMappingPage` | ERP映射配置 |
| `/mobile-workstation` | `MobileWorkstationPage` | 移动工作站 |
| `/performance` | `PerformanceMonitorPage` | 性能监控 |

---

## 2. 后端模块路径和功能归纳

### 2.1 认证服务 (IAM Auth)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/auth/login` | POST | 用户登录 |
| `/api/v1/auth/register` | POST | 用户注册 |
| `/api/v1/auth/refresh` | POST | 刷新Token |
| `/api/v1/auth/reset-password` | POST | 密码重置请求 |
| `/api/v1/auth/set-new-password` | POST | 设置新密码 |
| `/api/v1/auth/password-policy` | GET/PUT | 密码策略 |
| `/api/v1/auth/sessions` | GET | 活跃会话列表 |
| `/api/v1/auth/sessions/:id` | DELETE | 撤销会话 |
| `/api/v1/auth/security-settings` | GET/PUT | 安全设置 |

### 2.2 用户管理 (IAM Users)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/users` | GET/POST | 用户列表/创建用户 |
| `/api/v1/users/:id` | GET/PUT/DELETE | 用户详情/更新/删除 |
| `/api/v1/users/me` | GET/PUT | 当前用户信息 |
| `/api/v1/users/me/permissions` | GET | 当前用户权限 |
| `/api/v1/users/:id/permissions` | GET | 用户权限详情 |
| `/api/v1/users/batch-delete` | POST | 批量删除用户 |

### 2.3 角色管理 (IAM Roles)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/roles` | GET/POST | 角色列表/创建角色 |
| `/api/v1/roles/:id` | GET/PUT/DELETE | 角色详情/更新/删除 |
| `/api/v1/roles/:id/permissions` | GET/POST/DELETE | 角色权限管理 |

### 2.4 权限管理 (IAM Permissions)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/permissions` | GET/POST | 权限列表/创建权限 |
| `/api/v1/permissions/:id` | GET/PUT/DELETE | 权限详情/更新/删除 |

### 2.5 审计日志 (IAM Audit)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/access-logs` | GET/POST | 访问日志列表/创建日志 |
| `/api/v1/access-logs/user/:userId` | GET | 用户访问日志 |

### 2.6 人力资源管理 (HRM)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/companies` | CRUD | 公司管理 |
| `/api/v1/departments` | CRUD | 部门管理 |
| `/api/v1/employees` | CRUD | 员工管理 |
| `/api/v1/positions` | CRUD | 岗位管理 |
| `/api/v1/leaves` | CRUD + approve/reject | 请假管理 |
| `/api/v1/attendance` | CRUD + check-in/check-out | 考勤管理 |
| `/api/v1/job-openings` | CRUD + publish/close | 职位发布 |
| `/api/v1/candidates` | CRUD | 候选人管理 |
| `/api/v1/interviews` | CRUD | 面试管理 |
| `/api/v1/payroll-runs` | CRUD + calculate/pay | 薪资管理 |
| `/api/v1/performance-reviews` | CRUD + submit/approve | 绩效评估 |
| `/api/v1/performance-goals` | CRUD | 绩效目标 |
| `/api/v1/contracts` | CRUD + renew | 合同管理 |
| `/api/v1/contract-renewals` | CRUD + approve/reject | 合同续签 |
| `/api/v1/training-plans` | CRUD | 培训计划 |
| `/api/v1/training-courses` | CRUD | 培训课程 |
| `/api/v1/training-records` | CRUD + enroll/complete | 培训记录 |
| `/api/v1/salary-adjustments` | CRUD | 薪资调整 |

### 2.7 客户关系管理 (CRM)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/customers` | CRUD | 客户管理 |
| `/api/v1/contacts` | CRUD | 联系人管理 |
| `/api/v1/opportunities` | CRUD | 商机管理 |
| `/api/v1/interactions` | CRUD | 交互记录 |

### 2.8 企业资源规划 (ERP)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/assets` | CRUD | 资产管理 |
| `/api/v1/expenses` | CRUD | 费用管理 |
| `/api/v1/budgets` | CRUD | 预算管理 |
| `/api/v1/receivables` | CRUD | 应收账款 |
| `/api/v1/payables` | CRUD | 应付账款 |
| `/api/v1/vouchers` | CRUD + items | 凭证管理 |
| `/api/v1/accounting-subjects` | CRUD | 会计科目 |
| `/api/v1/office-supplies` | CRUD | 办公用品 |
| `/api/v1/meeting-rooms` | CRUD + bookings | 会议室管理 |
| `/api/v1/vehicles` | CRUD + requests | 车辆管理 |
| `/api/v1/announcements` | CRUD + publish | 公告管理 |
| `/api/v1/fixed-assets` | CRUD + depreciate | 固定资产 |
| `/api/v1/bank-accounts` | CRUD | 银行账户 |
| `/api/v1/bank-transactions` | CRUD | 银行交易 |
| `/api/v1/finance/accounts/opening-balances` | CRUD + batch | 期初余额 |
| `/api/v1/reports/balance-sheet` | GET | 资产负债表 |
| `/api/v1/reports/income-statement` | GET | 利润表 |
| `/api/v1/reports/cash-flow` | GET | 现金流量表 |
| `/api/v1/reports/business-overview` | GET | 业务概览 |

### 2.9 工作流服务 (Flow)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/workflows` | CRUD | 工作流管理 |
| `/api/v1/workflows/:id/versions` | CRUD + activate | 版本管理 |
| `/api/v1/instances` | CRUD | 流程实例 |
| `/api/v1/approvals` | CRUD + process | 审批管理 |
| `/api/v1/notifications` | CRUD | 流程通知 |
| `/api/v1/statistics` | GET | 流程统计 |
| `/api/v1/performance` | GET | 性能统计 |

### 2.10 项目管理 (PM)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/projects` | CRUD + dashboard/gantt | 项目管理 |
| `/api/v1/projects/:id/phases` | CRUD | 项目阶段 |
| `/api/v1/projects/:id/milestones` | CRUD | 里程碑 |
| `/api/v1/projects/:id/members` | CRUD | 项目成员 |
| `/api/v1/projects/:id/resources` | CRUD | 项目资源 |
| `/api/v1/projects/:id/expenses` | CRUD | 项目费用 |
| `/api/v1/projects/:id/benefits` | CRUD | 项目收益 |
| `/api/v1/projects/:id/approval` | GET/POST | 项目审批 |
| `/api/v1/contracts` | CRUD + milestones/payments | 合同管理 |
| `/api/v1/contract-templates` | CRUD | 合同模板 |
| `/api/v1/budgets` | CRUD | 预算管理 |
| `/api/v1/risks` | CRUD | 风险管理 |
| `/api/v1/quality-checks` | CRUD | 质量检查 |
| `/api/v1/defects` | CRUD | 缺陷管理 |
| `/api/v1/acceptance-plans` | CRUD | 验收计划 |
| `/api/v1/settlements` | CRUD | 结算管理 |
| `/api/v1/documents` | CRUD | 文档管理 |
| `/api/v1/reports` | CRUD | 报表管理 |
| `/api/v1/statistics` | GET | PM统计 |

### 2.11 研发管理 (RS)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/projects` | CRUD + batch/export/import | 项目管理 |
| `/api/v1/experiments` | CRUD + phase/trace | 试验管理 |
| `/api/v1/formulas` | CRUD + versions/approve | 配方管理 |
| `/api/v1/statistics` | GET | RS统计 |
| `/api/v1/audit-logs` | CRUD | 审计日志 |

### 2.12 商业智能 (BI)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/dashboards` | CRUD | 仪表盘管理 |
| `/api/v1/reports` | CRUD | 报表管理 |
| `/api/v1/analytics/summary` | GET | 分析概览 |
| `/api/v1/analytics/development` | GET | 研发分析 |
| `/api/v1/analytics/quality` | GET | 质量分析 |
| `/api/v1/analytics/production` | GET | 生产分析 |
| `/api/v1/analytics/laboratory` | GET | 实验室分析 |
| `/api/v1/bi/rs/summary` | GET | RS模块分析 |
| `/api/v1/bi/lims/summary` | GET | LIMS模块分析 |
| `/api/v1/bi/qms/summary` | GET | QMS模块分析 |
| `/api/v1/bi/ehs/summary` | GET | EHS模块分析 |
| `/api/v1/bi/srm/summary` | GET | SRM模块分析 |
| `/api/v1/bi/pdm/summary` | GET | PDM模块分析 |

### 2.13 实验室信息管理 (LIMS)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/samples` | CRUD + batch/export/import | 样品管理 |
| `/api/v1/processes` | CRUD | 检验流程 |
| `/api/v1/tasks` | CRUD + complete_step | 检验任务 |
| `/api/v1/records` | CRUD | 检验记录 |
| `/api/v1/instruments` | CRUD | 仪器管理 |
| `/api/v1/maintenance` | CRUD | 仪器维护 |
| `/api/v1/statistics` | GET | LIMS统计 |

### 2.14 质量管理 (QMS)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/standards` | CRUD | 质量标准 |
| `/api/v1/standards/:id/revisions` | GET | 标准版本 |
| `/api/v1/checks` | CRUD | 质量检查 |
| `/api/v1/issues` | CRUD | 质量问题 |
| `/api/v1/improvements` | CRUD | 质量改进 |
| `/api/v1/audit-plans` | CRUD | 审核计划 |
| `/api/v1/audit-tasks` | CRUD | 审核任务 |
| `/api/v1/audit-findings` | CRUD | 审核发现 |

### 2.15 环境健康安全 (EHS)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/hazards` | CRUD | 危险源管理 |
| `/api/v1/hazards/:id/assessments` | CRUD | 风险评估 |
| `/api/v1/hazards/:id/controls` | CRUD | 控制措施 |
| `/api/v1/checks` | CRUD | 安全检查 |
| `/api/v1/plans` | CRUD | 应急预案 |
| `/api/v1/drills` | CRUD | 演练记录 |
| `/api/v1/incidents` | CRUD | 事故管理 |
| `/api/v1/incidents/:id/actions` | CRUD | 事故处理 |

### 2.16 供应商关系管理 (SRM)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/suppliers` | CRUD | 供应商管理 |
| `/api/v1/supplier-evaluations` | CRUD | 供应商评估 |
| `/api/v1/purchase-orders` | CRUD | 采购订单 |
| `/api/v1/supplier-contracts` | CRUD | 供应商合同 |
| `/api/v1/statistics` | GET | SRM统计 |
| `/api/v1/statistics/detailed` | GET | 详细统计 |
| `/api/v1/suppliers-with-stats` | GET | 供应商统计 |

### 2.17 生产数据管理 (PDM)

| API路径 | 方法 | 功能 |
|---------|------|------|
| `/api/v1/processes` | CRUD | 工艺流程 |
| `/api/v1/steps` | CRUD | 工序管理 |
| `/api/v1/formulas` | CRUD | 配方管理 |
| `/api/v1/batches` | CRUD | 批次管理 |
| `/api/v1/statistics` | GET | PDM统计 |

---

## 3. 前端功能和后端服务对应分析

### 3.1 对应状态总览

| 前端模块 | 后端服务 | 对应状态 | 说明 |
|----------|----------|----------|------|
| Auth | IAM Auth | 完全对应 | 登录、注册、Token管理完整 |
| Dashboard | IAM Users | 部分对应 | 个人资料和通讯录需要后端支持 |
| HRM | HRM Service | 完全对应 | 所有页面都有对应的CRUD API |
| CRM | CRM Service | 基本对应 | 客户评分和销售预测缺少专门API |
| ERP | ERP Service | 基本对应 | 部分财务报表页面需要完善 |
| IAM | IAM Service | 完全对应 | 用户、角色、权限、审计完整 |
| Workflow | Flow Service | 完全对应 | 工作流设计、审批、统计完整 |
| BI | BI Service | 完全对应 | 仪表盘、报表、各模块分析完整 |
| PM | PM Service | 完全对应 | 项目、合同、预算、风险完整 |
| RS | RS Service | 基本对应 | 物料管理缺少专门API |
| Notifications | IAM/Flow | 部分对应 | 需要独立通知服务 |
| Docs | Doc Service | 部分对应 | 需要文档服务支持 |
| AI | AI Service | 部分对应 | 需要AI服务支持 |
| LIMS | LIMS Service | 完全对应 | 样品、流程、任务、仪器完整 |
| QMS | QMS Service | 完全对应 | 标准、检查、问题、改进完整 |
| EHS | EHS Service | 完全对应 | 危险源、检查、预案、演练完整 |
| SRM | SRM Service | 完全对应 | 供应商、评估、订单、合同完整 |
| PDM | PDM Service | 完全对应 | 工艺、工序、配方、批次完整 |
| GIS | GIS Service | 未对应 | 需要GIS服务 |
| IM | IM Service | 未对应 | 需要即时通讯服务 |
| Mail | Mail Service | 未对应 | 需要邮件服务 |
| Integration | Integration Service | 部分对应 | 外部ERP集成需要完善 |
| Mobile | Mobile Service | 未对应 | 需要移动服务支持 |
| Performance | Monitor Service | 未对应 | 需要监控服务 |

### 3.2 未对应项详细分析

#### 3.2.1 CRM模块 - 缺少专门API

| 前端页面 | 缺失的后端API | 建议完善方案 |
|----------|---------------|--------------|
| `/crm/scoring` | 客户评分API | 新增 `/api/v1/customer-scoring` |
| `/crm/forecast` | 销售预测API | 新增 `/api/v1/sales-forecast` |
| `/crm/billing` | 账单管理API | 新增 `/api/v1/billing` |

#### 3.2.2 RS模块 - 物料管理缺失

| 前端页面 | 缺失的后端API | 建议完善方案 |
|----------|---------------|--------------|
| `/rs/materials` | 物料管理API | 新增 `/api/v1/materials` CRUD |

#### 3.2.3 Notifications模块 - 需要独立服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/notifications` | 使用Flow通知API | 新增独立通知服务 `/api/v1/notifications` |
| `/notifications/templates` | 无对应API | 新增通知模板API |
| `/notifications/archive` | 无对应API | 新增通知归档API |
| `/notifications/stats` | 无对应API | 新增通知统计API |

#### 3.2.4 Docs模块 - 需要文档服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/documents` | 无对应API | 新增文档管理API `/api/v1/documents` |
| `/knowledge-base` | 无对应API | 新增知识库API `/api/v1/knowledge-base` |
| `/templates` | 部分对应 | 完善模板管理API |

#### 3.2.5 AI模块 - 需要AI服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/ai` | 无对应API | 新增AI服务API `/api/v1/ai/*` |

#### 3.2.6 GIS模块 - 需要GIS服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/gis` | 无对应API | 新增GIS服务API `/api/v1/gis/*` |

#### 3.2.7 IM模块 - 需要即时通讯服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/im` | 无对应API | 新增IM服务API `/api/v1/im/*` |

#### 3.2.8 Mail模块 - 需要邮件服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/mail` | 无对应API | 新增邮件服务API `/api/v1/mail/*` |

#### 3.2.9 Mobile模块 - 需要移动服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/mobile-workstation` | 无对应API | 新增移动服务API `/api/v1/mobile/*` |

#### 3.2.10 Performance模块 - 需要监控服务

| 前端页面 | 当前状态 | 建议完善方案 |
|----------|----------|--------------|
| `/performance` | 无对应API | 新增性能监控API `/api/v1/monitor/*` |

### 3.3 完善方案建议

#### 3.3.1 优先级一：核心业务模块完善（高优先级）

1. **CRM模块完善**
   - 新增客户评分API：`/api/v1/customer-scoring`
   - 新增销售预测API：`/api/v1/sales-forecast`
   - 新增账单管理API：`/api/v1/billing`

2. **RS模块完善**
   - 新增物料管理API：`/api/v1/materials`

3. **Notifications模块完善**
   - 新增通知管理API：`/api/v1/notifications`
   - 新增通知模板API：`/api/v1/notification-templates`
   - 新增通知统计API：`/api/v1/notification-stats`

#### 3.3.2 优先级二：文档与AI模块完善（中优先级）

1. **Docs模块完善**
   - 新增文档管理API：`/api/v1/documents`
   - 新增知识库API：`/api/v1/knowledge-base`

2. **AI模块完善**
   - 新增AI服务API：`/api/v1/ai/chat`
   - 新增AI分析API：`/api/v1/ai/analysis`

#### 3.3.3 优先级三：辅助功能模块完善（低优先级）

1. **GIS模块完善**
   - 新增GIS服务API：`/api/v1/gis/locations`

2. **IM模块完善**
   - 新增IM服务API：`/api/v1/im/messages`

3. **Mail模块完善**
   - 新增邮件服务API：`/api/v1/mail/send`

4. **Mobile模块完善**
   - 新增移动服务API：`/api/v1/mobile/devices`

5. **Performance模块完善**
   - 新增监控服务API：`/api/v1/monitor/metrics`

### 3.4 前端API调用规范建议

1. **统一API客户端**：使用 `apiClient` 统一管理所有服务调用
2. **类型定义**：每个模块应有完整的TypeScript类型定义
3. **错误处理**：统一的错误处理和重试机制
4. **API文档**：为每个API模块编写详细的接口文档
5. **版本管理**：使用 `/api/v1/` 版本前缀，便于后续升级

---

## 4. Vite 开发服务器代理配置

### 4.1 代理模式说明

Vite 开发服务器通过代理将前端请求转发到后端服务。由于不同服务使用不同的 API 路径模式，代理配置分为两种模式：

#### 模式一：标准服务模式

适用于大多数独立服务（CRM、ERP、HRM、Flow、BI、MES、PDM、QMS、LIMS、EHS 等）。

**路径模式：**
- 前端调用: `apiClient.{service}.get('/api/{service}/{resource}')`
- 服务 baseURL: `/{service}` (来自 runtime.ts)
- 请求 URL: `/{service}/api/{service}/{resource}`
- 代理 rewrite: 简单去除 `/{service}` 前缀 → `/api/{service}/{resource}`
- 后端路由: `/api/{service}/{resource}`

**示例 (Flow 服务)：**
```
前端调用: apiClient.flow.get('/api/flow/approvals')
服务 baseURL: /flow
请求 URL: /flow/api/flow/approvals
代理 rewrite: /flow/api/flow/approvals -> /api/flow/approvals
后端路由: /api/flow/approvals
```

#### 模式二：核心平台模式

适用于集成在核心平台中的服务（Doc、File、Mail、Notification、IM）。

**路径模式：**
- 前端调用: `apiClient.doc.get('/api/{path}')`
- 服务 baseURL: `/{service}` (来自 runtime.ts)
- 请求 URL: `/{service}/api/{path}`
- 代理 rewrite: 添加核心平台前缀 → `/api/core/{service}/{path}`
- 后端路由: `/api/core/{service}/{path}`

**示例 (Doc 服务)：**
```
前端调用: apiClient.doc.get('/api/documents')
服务 baseURL: /doc
请求 URL: /doc/api/documents
代理 rewrite: /doc/api/documents -> /api/core/doc/documents
后端路由: /api/core/doc/documents
```

### 4.2 代理配置清单

| 服务 | 代理路径 | 目标地址 | rewrite 规则 | 适用模式 |
|------|----------|----------|--------------|----------|
| core | `/core/api` | localhost:8000 | `/^\/core/` → `/api/core` | 核心平台 |
| comm | `/comm/api` | localhost:8000 | `/^\/comm/` → `/api/core/comm` | 核心平台 |
| iam | `/iam/api` | localhost:8000 | `/^\/iam\/api\/iam\//` → `/api/core/iam/` | 核心平台 |
| doc | `/doc` | localhost:8000 | `/^\/doc(\/.*)$/` → `/api/core/doc$1` | 核心平台 |
| file | `/file` | localhost:8000 | `/^\/file(\/.*)$/` → `/api/core/file$1` | 核心平台 |
| mail | `/mail` | localhost:8000 | `/^\/mail(\/.*)$/` → `/api/core/comm/mail$1` | 核心平台 |
| notification | `/notification` | localhost:8000 | `/^\/notification(\/.*)$/` → `/api/core/comm/notify$1` | 核心平台 |
| im | `/im` | localhost:8000 | `/^\/im(\/.*)$/` → `/api/core/comm/im$1` | 核心平台 |
| flow | `/flow` | localhost:8000 | `/^\/flow/` → `''` | 标准服务 |
| bi | `/bi/api` | localhost:8060 | `/^\/bi/` → `''` | 标准服务 |
| hrm | `/hrm/api/hrm/` | localhost:8020 | `/^\/hrm\/api\/hrm\//` → `/api/hrm/` | 标准服务 |
| erp | `/erp/api` | localhost:8010 | `/^\/erp/` → `''` | 标准服务 |
| crm | `/crm/api` | localhost:8012 | `/^\/crm/` → `''` | 标准服务 |
| ai | `/ai/api` | localhost:8000 | `/^\/ai/` → `''` | 标准服务 |
| rs | `/rs/api` | localhost:8053 | `/^\/rs/` → `''` | 标准服务 |
| mes | `/mes` | localhost:8030 | `/^\/mes/` → `''` | 标准服务 |
| pdm | `/pdm` | localhost:8030 | `/^\/pdm/` → `''` | 标准服务 |
| qms | `/qms` | localhost:8050 | `/^\/qms/` → `''` | 标准服务 |
| lims | `/lims` | localhost:8051 | `/^\/lims/` → `''` | 标准服务 |
| ehs | `/ehs` | localhost:8052 | `/^\/ehs/` → `''` | 标准服务 |
| srm | `/srm/api` | localhost:8042 | `/^\/srm/` → `''` | 标准服务 |
| wms | `/wms/api` | localhost:8042 | `/^\/wms/` → `''` | 标准服务 |
| pm | `/pm/api` | localhost:8022 | `/^\/pm/` → `''` | 标准服务 |
| scm | `/scm/api` | localhost:8040 | `/^\/scm/` → `''` | 标准服务 |
| gis | `/gis/api` | localhost:8071 | `/^\/gis/` → `''` | 标准服务 |
| report | `/report` | localhost:8060 | `/^\/report/` → `''` | 标准服务 |
| master | `/master/api` | localhost:8000 | `/^\/master/` → `''` | 标准服务 |
| integration | `/integration/api` | localhost:8072 | `/^\/integration/` → `''` | 标准服务 |
| mobile | `/mobile/api` | localhost:8070 | `/^\/mobile/` → `''` | 标准服务 |
| migration | `/migration/api` | localhost:8787 | `/^\/migration/` → `''` | 标准服务 |

### 4.3 代理顺序重要性

Vite 代理按照定义的顺序匹配，**先定义的路径会先匹配**。因此：

1. **特定路径应放在通用路径之前**：如 `/bi/api` 必须放在 `/api` 通用代理之前
2. **带具体路径的代理应放在泛型路径之前**：如 `/flow/api` 应放在 `/flow` 之前

**错误示例（导致 404）：**
```javascript
// 通用 /api 放在前面，导致 /bi/api 被错误匹配
'/api': { target: 'http://localhost:8000' },  // 先匹配
'/bi/api': createServiceProxyConfig('bi', 'http://localhost:8060'), // 永远不会匹配
```

**正确示例：**
```javascript
// 特定路径放在前面
'/bi/api': createServiceProxyConfig('bi', 'http://localhost:8060'),
'/api': { target: 'http://localhost:8000' },  // 通用代理放后面
```

### 4.4 常见问题排查

1. **404 Not Found**：检查代理顺序，确保特定路径在通用路径之前
2. **请求被转发到错误服务**：检查 rewrite 规则是否正确
3. **后端服务不可用**：确认目标服务端口是否启动

---

## 5. 总结

### 5.1 已完成对应

- **核心业务模块**：HRM、ERP、IAM、Workflow、PM、LIMS、QMS、EHS、SRM、PDM 模块已实现前端页面与后端API的完整对应
- **分析模块**：BI模块已实现各业务模块的数据分析API

### 5.2 需要完善

| 模块 | 需要新增API数量 | 优先级 |
|------|----------------|--------|
| CRM | 3 | 高 |
| RS | 1 | 高 |
| Notifications | 3 | 高 |
| Docs | 2 | 中 |
| AI | 2 | 中 |
| GIS | 1 | 低 |
| IM | 1 | 低 |
| Mail | 1 | 低 |
| Mobile | 1 | 低 |
| Performance | 1 | 低 |

### 5.3 下一步行动建议

1. **立即执行**：完善CRM评分/预测API、RS物料API、通知服务API
2. **近期规划**：完善文档服务和AI服务
3. **远期规划**：完善GIS、IM、Mail等辅助服务

通过以上完善，可实现前端功能与后端服务的全面一一对应，确保系统功能的完整性和一致性。