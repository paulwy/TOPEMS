# TOPEMS 系统页面规划与菜单体系分析报告

| 项目 | 内容 |
|------|------|
| **报告版本** | v1.0.0 |
| **生成日期** | 2026-06-20 |
| **分析范围** | 全系统模块、路由、页面结构 |
| **目标** | 统一页面规范、完善菜单体系、拆分页面功能 |

---

## 一、系统页面规范和模版总结

### 1.1 四种核心页面模版

系统采用统一的页面模板架构,提供四种核心模板组件:

| 模版类型 | 组件名称 | 适用场景 | 主要功能 |
|---------|---------|---------|---------|
| **列表页** | `ListPageTemplate` | 数据列表展示 | 表格展示、搜索筛选、分页浏览、行操作、批量选择、列配置 |
| **表单页** | `FormPageTemplate` | 数据新建/编辑 | 表单分Section、字段联动、文件上传、实时验证、提交状态 |
| **详情页** | `DetailPageTemplate` | 数据详情查看 | Tab切换、信息卡片、Section区块、侧边栏、快捷操作 |
| **仪表盘** | `DashboardTemplate` | 数据概览统计 | 统计卡片、图表区域、最近事项、快捷操作 |

### 1.2 统一的页面设计规范

#### 1.2.1 技术栈规范

| 规范项 | 要求 | 说明 |
|--------|------|------|
| **UI框架** | Material-UI (MUI) | 使用 `sx` prop,不使用 Tailwind/shadcn |
| **导入路径** | `@/` 别名 | 统一使用 `@/components` 等别名导入 |
| **图标库** | lucide-react | 统一使用 lucide-react 图标 |
| **表单验证** | react-hook-form + zod | 表单验证使用 zod schema |
| **路由** | React Router v6 | 使用 lazy loading + 权限控制 |

#### 1.2.2 页面必须元素

| 元素 | 类型 | 位置 | 说明 |
|------|------|------|------|
| **返回按钮** | 导航 | 页面头部左侧 | 详情页、表单页必须有 |
| **页面标题** | 信息 | 页面头部中央 | 所有页面必须有 |
| **面包屑** | 导航 | 页面头部上方 | 非首页必须有 |
| **搜索框** | 功能 | 列表页头部 | 列表页必须有 |
| **帮助按钮** | 功能 | 页面头部右侧 | 所有页面必须有 |
| **主题切换** | 功能 | Header右侧 | 全局必须有 |
| **操作按钮组** | 功能 | 页面头部右侧 | 根据页面类型配置 |

#### 1.2.3 三级导航体系

| 级别 | 名称 | 位置 | 功能 | 数据源 |
|------|------|------|------|--------|
| **L1** | Header全局导航 | 页面顶部固定 | 模块间切换、全局功能 | 核心模块 + 插件动态注册 |
| **L2** | 模块Tab导航 | 模块内页面切换 | 模块内页面切换 | 插件 `plugin.yaml` 配置 |
| **L3** | 页面内部导航 | 页面内容区 | 详情页Tab、表单步骤等 | 插件页面内部定义 |

---

## 二、现有模块及其功能清单

### 2.1 核心模块清单

| 模块代码 | 模块名称 | 主要功能 | 页面数量 | 状态 |
|----------|----------|----------|----------|------|
| **HRM** | 人力资源管理 | 员工、部门、岗位、考勤、薪酬、绩效、招聘、培训、合同 | 15 | ✅ 已实现 |
| **CRM** | 客户关系管理 | 客户、商机、联系人、交互记录、评分、预测、计费 | 9 | ✅ 已实现 |
| **PM** | 项目管理 | 项目、合同、模板、报表 | 11 | ✅ 已实现 |
| **ERP** | 企业资源计划 | 资产、设备、财务、行政、办公用品、车辆、会议室 | 24 | ✅ 已实现 |
| **Flow** | 工作流管理 | 流程定义、审批、实例、统计、设计器 | 10 | ✅ 已实现 |
| **BI** | 商业智能 | 仪表盘、报表、可视化、数据源、对比分析 | 7 | ✅ 已实现 |

### 2.2 专业模块清单

| 模块代码 | 模块名称 | 主要功能 | 页面数量 | 状态 |
|----------|----------|----------|----------|------|
| **LIMS** | 实验室信息管理 | 样品、检测任务、流程、仪器 | 5 | ✅ 已实现 |
| **RS** | 研发管理 | 项目、配方、材料、实验 | 13 | ✅ 已实现 |
| **PDM** | 产品数据管理 | 工艺、工序、配方、批次 | 5 | ✅ 已实现 |
| **QMS** | 质量管理 | 审核、标准、检查、不合格品 | 5 | ✅ 已实现 |
| **EHS** | 安全环保管理 | 风险评估、应急预案、演练、检查 | 7 | ✅ 已实现 |

### 2.3 供应链模块清单

| 模块代码 | 模块名称 | 主要功能 | 页面数量 | 状态 |
|----------|----------|----------|----------|------|
| **SCM** | 供应链管理 | 供应商、采购订单、采购明细、评估 | 5 | ✅ 已实现 |
| **SRM** | 供应商关系管理 | 供应商、采购订单、评估、财务 | 6 | ✅ 已实现 |
| **WMS** | 仓储管理 | 仓库、库存、入库、出库 | 5 | ✅ 已实现 |
| **MES** | 生产执行系统 | 生产订单、工序、工作站、生产记录 | 5 | ✅ 已实现 |

### 2.4 其他模块清单

| 模块代码 | 模块名称 | 主要功能 | 页面数量 | 状态 |
|----------|----------|----------|----------|------|
| **GIS** | 地理信息系统 | 地图监控、设备点位、管线、区域 | 2 | ✅ 已实现 |
| **IM** | 即时通讯 | 聊天会话、消息、通知 | 1 | ✅ 已实现 |
| **Mail** | 邮件管理 | 收件箱、发件箱、邮件详情 | 1 | ✅ 已实现 |
| **Docs** | 文件管理 | 文件列表、文件详情、文档中心 | 3 | ✅ 已实现 |
| **AI** | 人工智能助手 | AI聊天、文档生成、文本分析、数据补全、编码生成 | 1 | ✅ 已实现 |
| **IAM** | 身份与访问管理 | 用户、角色、权限、插件、通知、集成 | 11 | ✅ 已实现 |

---

## 三、现有路由和菜单结构分析

### 3.1 现有导航配置分析

#### 3.1.1 Header全局导航 (L1)

当前配置包含以下一级菜单:

| 菜单项 | 路径 | 子菜单数量 | 说明 |
|--------|------|------------|------|
| **首页** | `/dashboard` | 0 | 唯一入口,不展开 |
| **人力** | `/hrm` | 6个二级菜单 | 人事管理、组织管理、考勤管理、薪酬绩效、人才发展 |
| **客户** | `/crm` | 2个二级菜单 | 客户关系、销售分析 |
| **项目** | `/pm` | 2个二级菜单 | 项目管理、合同与报表 |
| **数据** | `/bi` | 2个二级菜单 | 数据可视化、数据管理 |
| **运营** | `/assets` | 2个二级菜单 | 资产设备、行政综合 |
| **工作流** | `/flow` | 2个二级菜单 | 流程审批、流程统计 |
| **协作** | `/im` | 2个二级菜单 | 沟通协作、AI助手 |
| **更多** | - | 7个二级菜单 | 研发创新、质量安全、供应链、生产、地理信息、系统管理、帮助 |

#### 3.1.2 模块Tab导航 (L2)

当前配置包含19个模块的Tab导航:

| 模块 | Tab数量 | 主要Tab项 |
|------|---------|-----------|
| HRM | 10 | 概览、员工、部门、岗位、考勤、薪酬、绩效、招聘、培训、合同 |
| CRM | 8 | 概览、客户、商机、联系人、交互、评分、预测、计费 |
| PM | 5 | 概览、项目、合同、模板、报表 |
| BI | 6 | 概览、仪表盘、报表、可视化、数据源、对比 |
| Assets | 7 | 概览、资产台账、设备管理、行政管理、办公用品、车辆管理、会议室 |
| Flow | 6 | 概览、审批中心、实例管理、版本历史、流程设计器、流程统计 |
| IM | 6 | 概览、即时通讯、邮件、文件管理、AI助手、知识库 |

### 3.2 现有路由结构分析

#### 3.2.1 HRM模块路由

```
/hrm                    → DashboardPage (仪表盘)
/hrm/companies          → HrmCompanyPage (公司列表)
/hrm/departments        → HrmDepartmentPage (部门列表)
/hrm/organization       → HrmOrganizationPage (组织架构)
/hrm/positions          → HrmPositionPage (岗位列表)
/hrm/employees          → HrmEmployeePage (员工列表)
/hrm/employee/:id       → HrmEmployeeDetailPage (员工详情)
/hrm/leave              → HrmLeavePage (请假管理)
/hrm/contracts          → HrmContractPage (合同管理)
/hrm/recruitment        → HrmRecruitmentPage (招聘管理)
/hrm/payroll            → HrmPayrollPage (薪酬管理)
/hrm/performance        → HrmPerformancePage (绩效管理)
/hrm/attendance         → HrmAttendancePage (考勤管理)
/hrm/training           → HrmTrainingPage (培训管理)
/hrm/reports            → HrmReportsPage (报表统计)
```

**问题分析:**
- ✅ 路由结构清晰,符合一页一功能原则
- ✅ 列表页和详情页分离
- ⚠️ 缺少创建/编辑表单页面路由 (如 `/hrm/employees/create`, `/hrm/employees/:id/edit`)

#### 3.2.2 CRM模块路由

```
/crm                    → Navigate to /crm/dashboard
/crm/dashboard          → DashboardPage (仪表盘)
/crm/customers          → CustomerManagementPage (客户列表)
/crm/customers/:id      → CustomerDetailPage (客户详情)
/crm/contacts           → ContactManagementPage (联系人列表)
/crm/opportunities      → OpportunityManagementPage (商机列表)
/crm/interactions       → InteractionManagementPage (交互记录列表)
/crm/scoring            → CRMCustomerScoringPage (客户评分)
/crm/forecast           → CRMSalesForecastPage (销售预测)
/crm/billing            → CRMBillingPage (计费管理)
```

**问题分析:**
- ✅ 路由结构清晰
- ✅ 列表页和详情页分离
- ⚠️ 缺少创建/编辑表单页面路由
- ⚠️ 缺少联系人、商机、交互记录的详情页路由

#### 3.2.3 PM模块路由

```
/pm                     → PmDashboardPage (仪表盘)
/pm/projects            → PmProjectListPage (项目列表)
/pm/projects/create     → PmProjectCreatePage (创建项目)
/pm/projects/:id        → PmProjectDetailPage (项目详情)
/pm/projects/:id/edit   → PmProjectCreatePage (编辑项目)
/pm/contracts           → PmContractListPage (合同列表)
/pm/contracts/create    → PmContractCreatePage (创建合同)
/pm/contracts/:id       → PmContractDetailPage (合同详情)
/pm/templates           → PmTemplatePage (模板库)
/pm/reports             → PmReportPage (报表)
/pm/reports/:projectId  → PmReportPage (项目报表)
/pm/dashboard           → ProjectDashboardPage (项目仪表盘)
```

**问题分析:**
- ✅ 路由结构完整,包含列表、详情、创建、编辑
- ✅ 符合一页一功能原则
- ✅ 最佳实践案例

#### 3.2.4 ERP模块路由

```
/erp                    → ERPHomePage (仪表盘)
/assets                 → AssetManagementPage (资产台账)
/equipment              → EquipmentManagementPage (设备管理)
/equipment/inspections  → EquipmentInspectionPage (设备检查)
/equipment/maintenances → EquipmentMaintenancePage (设备维护)
/finance                → FinanceExpensePage (财务)
/finance/vouchers       → FinanceVoucherPage (凭证管理)
/finance/receivable-payable → FinanceReceivablePayablePage (应收应付)
/finance/reports        → FinanceReportsPage (财务报表)
/finance/budget         → FinanceBudgetPage (预算管理)
/administration         → AdministrationPage (行政管理)
/budget                 → BudgetManagementPage (预算管理)
/office-supplies        → OfficeSuppliesManagementPage (办公用品)
/meeting-rooms          → MeetingRoomManagementPage (会议室)
/vehicles               → VehicleManagementPage (车辆管理)
/announcements          → AnnouncementManagementPage (公告管理)
/finance/voucher-templates → VoucherTemplatePage (凭证模板)
/finance/financial-reports → FinancialReportsPage (财务报表)
/finance/accounts       → AccountManagementPage (账户管理)
/finance/bank-accounts  → BankAccountManagementPage (银行账户)
/finance/fixed-assets   → FixedAssetManagementPage (固定资产)
/finance/consolidation/scopes → ConsolidationScopePage (合并范围)
/finance/consolidation/reports → ConsolidationReportsPage (合并报表)
/finance/company-structure → CompanyStructurePage (公司结构)
/finance/opening-balances → OpeningBalancePage (期初余额)
```

**问题分析:**
- ✅ 路由覆盖全面
- ⚠️ 路径命名不一致 (`/finance` vs `/finance/vouchers`)
- ⚠️ 缺少详情页和编辑页路由
- ⚠️ 资产、设备、财务混在一起,建议拆分

#### 3.2.5 Flow模块路由

```
/flow                   → WorkflowDashboardPage (仪表盘)
/workflows              → FlowWorkflowPage (流程定义)
/workflow-designer      → WorkflowDesignerPage (流程设计器)
/flow/instances         → FlowInstanceListPage (流程实例列表)
/flow/instance/:id      → FlowInstanceDetailPage (流程实例详情)
/flow/approvals         → FlowApprovalPage (审批中心)
/flow/approval/:id      → FlowApprovalDetailPage (审批详情)
/flow/notifications     → FlowNotificationCenter (通知中心)
/flow/statistics        → FlowStatisticsPage (流程统计)
/flow/history           → FlowVersionHistoryPage (版本历史)
```

**问题分析:**
- ✅ 路由结构清晰
- ✅ 包含列表、详情、设计器
- ⚠️ `/workflows` 和 `/workflow-designer` 路径不一致,建议统一为 `/flow/...`

---

## 四、完整的一、二、三级菜单体系规划

### 4.1 一级菜单 (Header全局导航)

| 序号 | 菜单项 | 路径 | 图标 | 说明 |
|------|--------|------|------|------|
| 0 | **首页** | `/dashboard` | Home | 系统首页,唯一入口 |
| 1 | **人力** | `/hrm` | Users | 人力资源管理模块 |
| 2 | **客户** | `/crm` | Users2 | 客户关系管理模块 |
| 3 | **项目** | `/pm` | FolderKanban | 项目管理模块 |
| 4 | **财务** | `/finance` | DollarSign | 财务管理模块 (新增) |
| 5 | **数据** | `/bi` | BarChart3 | 商业智能模块 |
| 6 | **运营** | `/assets` | Building2 | 企业运营模块 |
| 7 | **工作流** | `/flow` | GitBranch | 工作流管理模块 |
| 8 | **协作** | `/im` | MessageCircle | 协作沟通模块 |
| 9 | **更多** | - | MoreHorizontal | 其他模块集合 |

### 4.2 二级菜单规划

#### 4.2.1 人力模块 (HRM)

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **概览** | 1 | HRM仪表盘 |
| **人事管理** | 3 | 员工列表、员工详情、合同管理 |
| **组织管理** | 4 | 公司管理、部门管理、岗位管理、组织架构 |
| **考勤管理** | 2 | 考勤记录、请假管理 |
| **薪酬绩效** | 3 | 薪酬管理、绩效管理、报表统计 |
| **人才发展** | 2 | 招聘管理、培训管理 |

#### 4.2.2 客户模块 (CRM)

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **概览** | 1 | CRM仪表盘 |
| **客户关系** | 4 | 客户列表、客户详情、商机列表、联系人列表 |
| **交互记录** | 1 | 交互记录列表 |
| **销售分析** | 3 | 客户评分、销售预测、计费管理 |

#### 4.2.3 项目模块 (PM)

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **概览** | 1 | PM仪表盘 |
| **项目管理** | 4 | 项目列表、项目详情、创建项目、编辑项目 |
| **合同管理** | 3 | 合同列表、合同详情、创建合同 |
| **模板与报表** | 2 | 模板库、项目报表 |

#### 4.2.4 财务模块 (Finance) - 新增

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **概览** | 1 | 财务仪表盘 |
| **凭证管理** | 3 | 凭证列表、凭证详情、凭证模板 |
| **应收应付** | 2 | 应收账款、应付账款 |
| **预算管理** | 2 | 预算列表、预算执行 |
| **资产管理** | 3 | 固定资产、资产台账、资产折旧 |
| **财务报表** | 4 | 财务报表、合并报表、公司结构、期初余额 |
| **账户管理** | 2 | 账户管理、银行账户 |

#### 4.2.5 运营模块 (Assets)

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **概览** | 1 | 运营仪表盘 |
| **资产设备** | 4 | 资产台账、设备管理、设备检查、设备维护 |
| **行政管理** | 4 | 行政管理、办公用品、车辆管理、会议室 |

#### 4.2.6 工作流模块 (Flow)

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **概览** | 1 | 工作流仪表盘 |
| **流程审批** | 3 | 审批中心、审批详情、实例管理 |
| **流程设计** | 2 | 流程定义、流程设计器 |
| **流程统计** | 2 | 流程统计、版本历史 |

#### 4.2.7 协作模块 (IM)

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **概览** | 1 | 协作仪表盘 |
| **即时通讯** | 1 | 聊天会话 |
| **邮件管理** | 3 | 收件箱、写邮件、邮件详情 |
| **文件管理** | 2 | 文件列表、文件详情 |
| **AI助手** | 1 | AI对话 |
| **知识库** | 2 | 知识库列表、知识库详情 |

#### 4.2.8 更多模块集合

| 二级菜单 | 三级菜单数量 | 主要功能 |
|----------|--------------|----------|
| **研发创新** | 3 | LIMS、RS研发、PDM |
| **质量安全** | 2 | QMS质量管理、EHS安全环保 |
| **供应链** | 4 | SRM供应商、SCM采购、WMS仓储、MES生产 |
| **地理信息** | 1 | GIS地图 |
| **系统管理** | 7 | 用户管理、角色管理、权限配置、插件市场、通知管理、系统集成、系统设置 |
| **帮助** | 1 | 帮助中心 |

### 4.3 三级菜单详细规划

#### 4.3.1 HRM模块三级菜单

| 二级菜单 | 三级菜单项 | 路径 | 页面类型 | 说明 |
|----------|-----------|------|----------|------|
| 概览 | HRM仪表盘 | `/hrm` | 仪表盘 | HRM模块概览统计 |
| 人事管理 | 员工列表 | `/hrm/employees` | 列表页 | 员工数据列表 |
| | 员工详情 | `/hrm/employees/:id` | 详情页 | 单个员工详细信息 |
| | 创建员工 | `/hrm/employees/create` | 表单页 | 新建员工表单 (新增) |
| | 编辑员工 | `/hrm/employees/:id/edit` | 表单页 | 编辑员工表单 (新增) |
| | 合同列表 | `/hrm/contracts` | 列表页 | 合同记录列表 |
| | 合同详情 | `/hrm/contracts/:id` | 详情页 | 合同详细信息 (新增) |
| 组织管理 | 公司列表 | `/hrm/companies` | 列表页 | 公司数据列表 |
| | 部门列表 | `/hrm/departments` | 列表页 | 部门数据列表 |
| | 岗位列表 | `/hrm/positions` | 列表页 | 岗位数据列表 |
| | 组织架构 | `/hrm/organization` | 特殊交互 | 组织架构树状图 |
| 考勤管理 | 考勤列表 | `/hrm/attendance` | 列表页 | 考勤记录列表 |
| | 请假列表 | `/hrm/leave` | 列表页 | 请假记录列表 |
| 薪酬绩效 | 薪酬列表 | `/hrm/payroll` | 列表页 | 薪酬记录列表 |
| | 绩效列表 | `/hrm/performance` | 列表页 | 绩效记录列表 |
| | HRM报表 | `/hrm/reports` | 列表页 | HRM报表统计 |
| 人才发展 | 招聘列表 | `/hrm/recruitment` | 列表页 | 招聘职位列表 |
| | 培训列表 | `/hrm/training` | 列表页 | 培训课程列表 |

#### 4.3.2 CRM模块三级菜单

| 二级菜单 | 三级菜单项 | 路径 | 页面类型 | 说明 |
|----------|-----------|------|----------|------|
| 概览 | CRM仪表盘 | `/crm/dashboard` | 仪表盘 | CRM模块概览统计 |
| 客户关系 | 客户列表 | `/crm/customers` | 列表页 | 客户数据列表 |
| | 客户详情 | `/crm/customers/:id` | 详情页 | 客户详细信息 |
| | 创建客户 | `/crm/customers/create` | 表单页 | 新建客户表单 (新增) |
| | 编辑客户 | `/crm/customers/:id/edit` | 表单页 | 编辑客户表单 (新增) |
| | 商机列表 | `/crm/opportunities` | 列表页 | 商机数据列表 |
| | 商机详情 | `/crm/opportunities/:id` | 详情页 | 商机详细信息 (新增) |
| | 联系人列表 | `/crm/contacts` | 列表页 | 联系人数据列表 |
| | 联系人详情 | `/crm/contacts/:id` | 详情页 | 联系人详细信息 (新增) |
| 交互记录 | 交互列表 | `/crm/interactions` | 列表页 | 交互记录列表 |
| | 交互详情 | `/crm/interactions/:id` | 详情页 | 交互记录详情 (新增) |
| 销售分析 | 客户评分 | `/crm/scoring` | 列表页 | 客户评分列表 |
| | 销售预测 | `/crm/forecast` | 列表页 | 销售预测列表 |
| | 计费管理 | `/crm/billing` | 列表页 | 计费管理列表 |

#### 4.3.3 PM模块三级菜单

| 二级菜单 | 三级菜单项 | 路径 | 页面类型 | 说明 |
|----------|-----------|------|----------|------|
| 概览 | PM仪表盘 | `/pm` | 仪表盘 | PM模块概览统计 |
| 项目管理 | 项目列表 | `/pm/projects` | 列表页 | 项目数据列表 |
| | 项目详情 | `/pm/projects/:id` | 详情页 | 项目详细信息 |
| | 创建项目 | `/pm/projects/create` | 表单页 | 新建项目表单 |
| | 编辑项目 | `/pm/projects/:id/edit` | 表单页 | 编辑项目表单 |
| 合同管理 | 合同列表 | `/pm/contracts` | 列表页 | 合同数据列表 |
| | 合同详情 | `/pm/contracts/:id` | 详情页 | 合同详细信息 |
| | 创建合同 | `/pm/contracts/create` | 表单页 | 新建合同表单 |
| 模板与报表 | 模板库 | `/pm/templates` | 列表页 | 项目模板列表 |
| | 项目报表 | `/pm/reports` | 列表页 | 项目报表列表 |

#### 4.3.4 Finance模块三级菜单 (新增模块)

| 二级菜单 | 三级菜单项 | 路径 | 页面类型 | 说明 |
|----------|-----------|------|----------|------|
| 概览 | 财务仪表盘 | `/finance` | 仪表盘 | 财务模块概览统计 (新增) |
| 凭证管理 | 凭证列表 | `/finance/vouchers` | 列表页 | 凭证数据列表 |
| | 凭证详情 | `/finance/vouchers/:id` | 详情页 | 凭证详细信息 (新增) |
| | 创建凭证 | `/finance/vouchers/create` | 表单页 | 新建凭证表单 (新增) |
| | 凭证模板 | `/finance/voucher-templates` | 列表页 | 凭证模板列表 |
| 应收应付 | 应收账款 | `/finance/receivables` | 列表页 | 应收账款列表 (新增) |
| | 应付账款 | `/finance/payables` | 列表页 | 应付账款列表 (新增) |
| 预算管理 | 预算列表 | `/finance/budgets` | 列表页 | 预算数据列表 |
| | 预算执行 | `/finance/budget-execution` | 列表页 | 预算执行情况 (新增) |
| 资产管理 | 固定资产 | `/finance/fixed-assets` | 列表页 | 固定资产列表 |
| | 资产台账 | `/finance/asset-ledger` | 列表页 | 资产台账列表 (新增) |
| | 资产折旧 | `/finance/asset-depreciation` | 列表页 | 资产折旧列表 (新增) |
| 财务报表 | 财务报表 | `/finance/reports` | 列表页 | 财务报表列表 |
| | 合并报表 | `/finance/consolidation/reports` | 列表页 | 合并报表列表 |
| | 公司结构 | `/finance/company-structure` | 特殊交互 | 公司结构图 |
| | 期初余额 | `/finance/opening-balances` | 表单页 | 期初余额录入 |
| 账户管理 | 账户列表 | `/finance/accounts` | 列表页 | 账户管理列表 |
| | 银行账户 | `/finance/bank-accounts` | 列表页 | 银行账户列表 |

#### 4.3.5 Assets模块三级菜单

| 二级菜单 | 三级菜单项 | 路径 | 页面类型 | 说明 |
|----------|-----------|------|----------|------|
| 概览 | 运营仪表盘 | `/assets` | 仪表盘 | 运营模块概览统计 |
| 资产设备 | 资产台账 | `/assets/ledger` | 列表页 | 资产台账列表 (拆分) |
| | 设备列表 | `/equipment` | 列表页 | 设备管理列表 |
| | 设备详情 | `/equipment/:id` | 详情页 | 设备详细信息 (新增) |
| | 设备检查 | `/equipment/inspections` | 列表页 | 设备检查记录 |
| | 设备维护 | `/equipment/maintenances` | 列表页 | 设备维护记录 |
| 行政管理 | 行政管理 | `/administration` | 列表页 | 行政管理列表 |
| | 办公用品 | `/office-supplies` | 列表页 | 办公用品列表 |
| | 车辆管理 | `/vehicles` | 列表页 | 车辆管理列表 |
| | 会议室 | `/meeting-rooms` | 列表页 | 会议室预约列表 |

#### 4.3.6 Flow模块三级菜单

| 二级菜单 | 三级菜单项 | 路径 | 页面类型 | 说明 |
|----------|-----------|------|----------|------|
| 概览 | 工作流仪表盘 | `/flow` | 仪表盘 | 工作流模块概览统计 |
| 流程审批 | 审批中心 | `/flow/approvals` | 列表页 | 待审批列表 |
| | 审批详情 | `/flow/approval/:id` | 详情页 | 审批详细信息 |
| | 实例列表 | `/flow/instances` | 列表页 | 流程实例列表 |
| | 实例详情 | `/flow/instance/:id` | 详情页 | 实例详细信息 |
| 流程设计 | 流程定义 | `/flow/definitions` | 列表页 | 流程定义列表 (新增) |
| | 流程设计器 | `/flow/designer` | 特殊交互 | 流程设计编辑器 (路径调整) |
| 流程统计 | 流程统计 | `/flow/statistics` | 列表页 | 流程统计列表 |
| | 版本历史 | `/flow/history` | 列表页 | 版本历史列表 |

#### 4.3.7 IM模块三级菜单

| 二级菜单 | 三级菜单项 | 路径 | 页面类型 | 说明 |
|----------|-----------|------|----------|------|
| 概览 | 协作仪表盘 | `/im` | 仪表盘 | 协作模块概览统计 |
| 即时通讯 | 聊天会话 | `/im/chats` | 特殊交互 | 聊天会话列表 (拆分) |
| | 聊天详情 | `/im/chats/:id` | 特殊交互 | 聊天会话详情 (新增) |
| 邮件管理 | 收件箱 | `/mail/inbox` | 列表页 | 邮件收件箱 (拆分) |
| | 写邮件 | `/mail/compose` | 表单页 | 编写邮件表单 (新增) |
| | 邮件详情 | `/mail/:id` | 详情页 | 邵件详细信息 |
| 文件管理 | 文件列表 | `/docs/files` | 列表页 | 文件管理列表 (拆分) |
| | 文件详情 | `/docs/files/:id` | 详情页 | 文件详细信息 (新增) |
| AI助手 | AI对话 | `/ai/chat` | 特殊交互 | AI对话交互 (拆分) |
| 知识库 | 知识库列表 | `/knowledge-base` | 列表页 | 知识库列表 |
| | 知识库详情 | `/knowledge-base/:id` | 详情页 | 知识库详情 (新增) |

---

## 五、页面拆分建议

### 5.1 页面拆分原则

| 原则 | 说明 |
|------|------|
| **一页一功能** | 每个页面只展示一个核心功能 |
| **列表独立** | 列表页独立,不与详情页混合 |
| **详情独立** | 详情页独立,通过Tab组织多维度内容 |
| **表单独立** | 创建/编辑表单独立,不与列表页混合 |
| **仪表盘独立** | 数据仪表盘独立,不与列表页混合 |

### 5.2 需要拆分的页面

#### 5.2.1 ERP模块拆分建议

**当前问题:** ERP模块包含资产、设备、财务、行政等多个子模块,路径混乱。

**拆分建议:**

| 原页面 | 拆分后页面 | 新路径 | 说明 |
|--------|-----------|--------|------|
| `/finance` | 财务仪表盘 | `/finance` | 独立财务模块 |
| `/finance/vouchers` | 凭证列表 | `/finance/vouchers` | 保持不变 |
| `/finance/receivable-payable` | 应收账款列表 | `/finance/receivables` | 拆分为应收 |
| | 应付账款列表 | `/finance/payables` | 拆分为应付 |
| `/assets` | 运营仪表盘 | `/assets` | 保持为运营模块入口 |
| | 资产台账列表 | `/assets/ledger` | 拆分资产台账 |
| `/equipment` | 设备列表 | `/equipment` | 保持不变 |

#### 5.2.2 IM模块拆分建议

**当前问题:** IM模块包含聊天、邮件、文件、AI等多个功能,路径混乱。

**拆分建议:**

| 原页面 | 拆分后页面 | 新路径 | 说明 |
|--------|-----------|--------|------|
| `/im` | 协作仪表盘 | `/im` | 模块入口改为仪表盘 |
| `/im` | 聊天会话列表 | `/im/chats` | 拆分聊天功能 |
| `/mail` | 邮件收件箱 | `/mail/inbox` | 拆分邮件功能 |
| `/docs` | 文件列表 | `/docs/files` | 拆分文件功能 |
| `/ai` | AI对话 | `/ai/chat` | 拆分AI功能 |

#### 5.2.3 Flow模块路径调整建议

**当前问题:** `/workflows` 和 `/workflow-designer` 路径不一致。

**调整建议:**

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `/workflows` | `/flow/definitions` | 统一为 `/flow/...` 路径 |
| `/workflow-designer` | `/flow/designer` | 统一为 `/flow/...` 路径 |

---

## 六、缺失页面补全建议

### 6.1 需要新增的详情页

| 模块 | 新增详情页 | 路径 | 说明 |
|------|-----------|------|------|
| HRM | 合同详情 | `/hrm/contracts/:id` | 合同详细信息 |
| CRM | 商机详情 | `/crm/opportunities/:id` | 商机详细信息 |
| CRM | 联系人详情 | `/crm/contacts/:id` | 联系人详细信息 |
| CRM | 交互详情 | `/crm/interactions/:id` | 交互记录详情 |
| Finance | 凭证详情 | `/finance/vouchers/:id` | 凭证详细信息 |
| Assets | 设备详情 | `/equipment/:id` | 设备详细信息 |
| IM | 聊天详情 | `/im/chats/:id` | 聊天会话详情 |
| IM | 文件详情 | `/docs/files/:id` | 文件详细信息 |
| IM | 知识库详情 | `/knowledge-base/:id` | 知识库详情 |

### 6.2 需要新增的表单页

| 模块 | 新增表单页 | 路径 | 说明 |
|------|-----------|------|------|
| HRM | 创建员工 | `/hrm/employees/create` | 新建员工表单 |
| HRM | 编辑员工 | `/hrm/employees/:id/edit` | 编辑员工表单 |
| CRM | 创建客户 | `/crm/customers/create` | 新建客户表单 |
| CRM | 编辑客户 | `/crm/customers/:id/edit` | 编辑客户表单 |
| Finance | 创建凭证 | `/finance/vouchers/create` | 新建凭证表单 |
| IM | 写邮件 | `/mail/compose` | 编写邮件表单 |

### 6.3 需要新增的仪表盘页

| 模块 | 新增仪表盘 | 路径 | 说明 |
|------|-----------|------|------|
| Finance | 财务仪表盘 | `/finance` | 财务模块概览统计 |
| IM | 协作仪表盘 | `/im` | 协作模块概览统计 |

### 6.4 需要新增的列表页

| 模块 | 新增列表页 | 路径 | 说明 |
|------|-----------|------|------|
| Finance | 应收账款列表 | `/finance/receivables` | 应收账款管理 |
| Finance | 应付账款列表 | `/finance/payables` | 应付账款管理 |
| Finance | 预算执行列表 | `/finance/budget-execution` | 预算执行情况 |
| Finance | 资产台账列表 | `/finance/asset-ledger` | 资产台账管理 |
| Finance | 资产折旧列表 | `/finance/asset-depreciation` | 资产折旧管理 |
| Assets | 资产台账列表 | `/assets/ledger` | 资产台账管理 |
| Flow | 流程定义列表 | `/flow/definitions` | 流程定义管理 |
| IM | 聊天会话列表 | `/im/chats` | 聊天会话管理 |
| IM | 文件列表 | `/docs/files` | 文件管理 |

---

## 七、页面统计汇总

### 7.1 按模块统计

| 模块 | 仪表盘 | 列表页 | 详情页 | 表单页 | 特殊交互 | 总计 | 新增页面数 |
|------|--------|--------|--------|--------|----------|------|-----------|
| HRM | 1 | 10 | 2 | 2 | 1 | 16 | +3 (创建员工、编辑员工、合同详情) |
| CRM | 1 | 7 | 4 | 2 | 0 | 14 | +6 (详情页、表单页) |
| PM | 1 | 4 | 2 | 2 | 0 | 9 | 0 (已完整) |
| Finance | 1 | 12 | 1 | 1 | 1 | 16 | +8 (仪表盘、详情页、表单页、列表页) |
| Assets | 1 | 6 | 1 | 0 | 0 | 8 | +1 (设备详情) |
| Flow | 1 | 5 | 2 | 0 | 1 | 9 | +1 (流程定义列表) |
| IM | 1 | 5 | 3 | 1 | 2 | 12 | +5 (仪表盘、详情页、表单页) |
| BI | 1 | 5 | 0 | 0 | 0 | 6 | 0 |
| LIMS | 1 | 4 | 0 | 0 | 0 | 5 | 0 |
| RS | 1 | 4 | 2 | 0 | 0 | 7 | 0 |
| PDM | 1 | 4 | 0 | 0 | 0 | 5 | 0 |
| QMS | 1 | 4 | 0 | 0 | 0 | 5 | 0 |
| EHS | 1 | 4 | 0 | 0 | 0 | 5 | 0 |
| SCM | 1 | 4 | 0 | 0 | 0 | 5 | 0 |
| SRM | 1 | 3 | 1 | 0 | 0 | 5 | 0 |
| WMS | 1 | 4 | 0 | 0 | 0 | 5 | 0 |
| MES | 1 | 4 | 0 | 0 | 0 | 5 | 0 |
| GIS | 1 | 0 | 0 | 0 | 1 | 2 | 0 |
| AI | 1 | 0 | 0 | 0 | 1 | 2 | 0 |
| IAM | 1 | 6 | 2 | 2 | 0 | 11 | 0 |
| **总计** | **19** | **82** | **15** | **10** | **5** | **131** | **+24** |

### 7.2 按页面类型统计

| 页面类型 | 现有数量 | 新增数量 | 总计 |
|----------|----------|----------|------|
| 仪表盘 | 18 | +1 (Finance) | 19 |
| 列表页 | 68 | +14 | 82 |
| 详情页 | 9 | +6 | 15 |
| 表单页 | 4 | +6 | 10 |
| 特殊交互 | 5 | 0 | 5 |
| **总计** | **104** | **+27** | **131** |

---

## 八、实施建议

### 8.1 实施优先级

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **P0** | 新增Finance模块 | 独立财务模块,拆分ERP财务功能 |
| **P0** | 补全HRM表单页 | 新增创建/编辑员工表单页 |
| **P0** | 补全CRM详情页 | 新增商机、联系人、交互详情页 |
| **P1** | 拆分IM模块 | 拆分聊天、邮件、文件、AI功能 |
| **P1** | 调整Flow路径 | 统一为 `/flow/...` 路径 |
| **P2** | 补全其他详情页 | 补全Finance、Assets、IM详情页 |
| **P2** | 统一页面模版 | 所有页面使用统一模版组件 |

### 8.2 实施步骤

#### 步骤1: 新增Finance模块 (P0)

1. 创建 `/finance` 仪表盘页面
2. 拆分应收应付为独立列表页
3. 新增凭证详情页和创建凭证表单页
4. 新增预算执行、资产台账、资产折旧列表页
5. 更新导航配置,新增"财务"一级菜单

#### 步骤2: 补全HRM表单页 (P0)

1. 创建 `/hrm/employees/create` 创建员工表单页
2. 创建 `/hrm/employees/:id/edit` 编辑员工表单页
3. 创建 `/hrm/contracts/:id` 合同详情页
4. 使用 `FormPageTemplate` 模版

#### 步骤3: 补全CRM详情页 (P0)

1. 创建 `/crm/opportunities/:id` 商机详情页
2. 创建 `/crm/contacts/:id` 联系人详情页
3. 创建 `/crm/interactions/:id` 交互详情页
4. 创建 `/crm/customers/create` 创建客户表单页
5. 创建 `/crm/customers/:id/edit` 编辑客户表单页
6. 使用 `DetailPageTemplate` 和 `FormPageTemplate` 模版

#### 步骤4: 拆分IM模块 (P1)

1. 创建 `/im` 协作仪表盘页面
2. 拆分 `/im` 为 `/im/chats` 聊天会话列表
3. 创建 `/im/chats/:id` 聊天详情页
4. 拆分 `/mail` 为 `/mail/inbox` 邮件收件箱
5. 创建 `/mail/compose` 写邮件表单页
6. 拆分 `/docs` 为 `/docs/files` 文件列表
7. 创建 `/docs/files/:id` 文件详情页
8. 拆分 `/ai` 为 `/ai/chat` AI对话
9. 更新导航配置

#### 步骤5: 调整Flow路径 (P1)

1. 将 `/workflows` 改为 `/flow/definitions`
2. 将 `/workflow-designer` 改为 `/flow/designer`
3. 更新路由配置和导航配置

#### 步骤6: 统一页面模版 (P2)

1. 检查所有页面是否使用统一模版
2. 重构不符合规范的页面
3. 统一页面头部、面包屑、操作按钮

### 8.3 验收标准

| 验收项 | 标准 |
|--------|------|
| **页面数量** | 总计131个页面,新增27个页面 |
| **路由结构** | 所有路由符合一页一功能原则 |
| **页面模版** | 所有页面使用四种核心模版 |
| **导航体系** | 三级导航体系完整,权限过滤正常 |
| **路径规范** | 所有路径统一,符合模块化结构 |
| **页面元素** | 所有页面包含必须元素 (面包屑、标题、帮助按钮等) |

---

## 九、附录

### 9.1 页面模版使用示例

#### ListPageTemplate 示例

```tsx
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';

const CustomerListPage: React.FC = () => {
  const columns: ColumnDef<Customer>[] = [
    { id: 'name', label: '客户名称', sortable: true },
    { id: 'code', label: '客户代码', width: 120 },
    { id: 'industry', label: '行业' },
    { id: 'status', label: '状态', render: (row) => <Chip label={row.status} /> },
  ];

  const rowActions: RowAction<Customer>[] = [
    { label: '查看', icon: <Eye />, onClick: (row) => navigate(`/crm/customers/${row.id}`) },
    { label: '编辑', icon: <Edit />, onClick: (row) => navigate(`/crm/customers/${row.id}/edit`) },
    { label: '删除', icon: <Trash2 />, color: 'error', onClick: (row) => handleDelete(row.id) },
  ];

  return (
    <ListPageTemplate
      title="客户列表"
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '客户', href: '/crm' }, { label: '客户列表' }]}
      columns={columns}
      data={customers}
      loading={loading}
      rowActions={rowActions}
      searchable
      searchPlaceholder="搜索客户..."
      pagination={{ page, pageSize, total, onPageChange }}
      actions={[{ label: '新建客户', icon: <Plus />, onClick: () => navigate('/crm/customers/create') }]}
    />
  );
};
```

#### DetailPageTemplate 示例

```tsx
import { DetailPageTemplate, type TabConfig } from '@/components/templates';

const CustomerDetailPage: React.FC = () => {
  const tabs: TabConfig[] = [
    { id: 'info', label: '基本信息', icon: <User />, content: <BasicInfoTab /> },
    { id: 'contacts', label: '联系人', icon: <Contacts />, badge: 5, content: <ContactsTab /> },
    { id: 'orders', label: '订单记录', icon: <Order />, content: <OrdersTab /> },
  ];

  return (
    <DetailPageTemplate
      title={customer.name}
      subtitle={customer.code}
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '客户', href: '/crm' }, { label: '客户列表', href: '/crm/customers' }, { label: customer.name }]}
      backHref="/crm/customers"
      tabs={tabs}
      infoCard={{
        avatar: <Avatar src={customer.avatar} />,
        title: customer.name,
        subtitle: customer.companyName,
        tags: [customer.industry, customer.status],
        stats: [{ label: '订单数', value: customer.orderCount }],
      }}
      onEdit={() => navigate(`/crm/customers/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
};
```

#### FormPageTemplate 示例

```tsx
import { FormPageTemplate, type FormSection } from '@/components/templates';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(1, '客户名称不能为空'),
  code: z.string().min(1, '客户代码不能为空'),
  industry: z.string().optional(),
});

const CreateCustomerPage: React.FC = () => {
  const sections: FormSection[] = [
    {
      id: 'basic',
      title: '基本信息',
      fields: [
        { name: 'name', label: '客户名称', type: 'text', required: true },
        { name: 'code', label: '客户代码', type: 'text', required: true },
        { name: 'industry', label: '行业', type: 'select', options: industries },
      ],
    },
    {
      id: 'contact',
      title: '联系方式',
      collapsible: true,
      fields: [
        { name: 'phone', label: '电话', type: 'text' },
        { name: 'email', label: '邮箱', type: 'email' },
        { name: 'address', label: '地址', type: 'textarea', rows: 3, span: 2 },
      ],
    },
  ];

  return (
    <FormPageTemplate
      title="新建客户"
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '客户', href: '/crm' }, { label: '客户列表', href: '/crm/customers' }, { label: '新建客户' }]}
      sections={sections}
      schema={customerSchema}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/crm/customers')}
      submitText="创建"
    />
  );
};
```

### 9.2 导航配置示例

```typescript
// navigation-v2.ts
export const topNavItems: NavGroup[] = [
  { label: '首页', path: '/dashboard' },
  {
    label: '人力',
    path: '/hrm',
    isGroup: true,
    children: [
      { label: '概览', path: '/hrm' },
      {
        label: '人事管理',
        children: [
          { label: '员工列表', path: '/hrm/employees' },
          { label: '合同管理', path: '/hrm/contracts' },
        ],
      },
      {
        label: '组织管理',
        children: [
          { label: '公司管理', path: '/hrm/companies' },
          { label: '部门管理', path: '/hrm/departments' },
          { label: '岗位管理', path: '/hrm/positions' },
        ],
      },
    ],
  },
  {
    label: '财务',
    path: '/finance',
    isGroup: true,
    children: [
      { label: '概览', path: '/finance' },
      {
        label: '凭证管理',
        children: [
          { label: '凭证列表', path: '/finance/vouchers' },
          { label: '凭证模板', path: '/finance/voucher-templates' },
        ],
      },
      {
        label: '应收应付',
        children: [
          { label: '应收账款', path: '/finance/receivables' },
          { label: '应付账款', path: '/finance/payables' },
        ],
      },
    ],
  },
];
```

---

**报告结束**

*本报告由 TOPEMS 前端团队生成*
*版本: v1.0.0*
*生成时间: 2026-06-20*