# 导航数据与路由路径映射报告

生成时间: 2026/6/30 21:24:13

## 概览统计

| 指标 | 数量 |
|------|------|
| 导航模块 | 32 |
| 路由模块 | 33 |
| 导航项总数 | 329 |
| 路由总数 | 376 |
| 动态路由 | 22 |

## 模块对照表

| 模块代码 | 导航名称 | 导航路径 | 路由数量 | 导航项数量 | 状态 |
|----------|----------|----------|----------|------------|------|
| admin | 系统管理 | /admin | 20 | 18 | online |
| ai | 智能助手 | /ai | 7 | 7 | online |
| asset | 资产管理 | /asset | 7 | 7 | online |
| bi | 商业智能 | /bi | 13 | 11 | online |
| crm | 客户关系 | /crm | 16 | 11 | online |
| docs | 知识文档 | /docs | 5 | 4 | online |
| document | 文档中心 | /document | 3 | 3 | online |
| ehs | 安全环保 | /ehs | 14 | 13 | online |
| erp | 企业资源计划 | /erp | 12 | 12 | online |
| finance | 财务管理 | /finance | 19 | 15 | online |
| gis | 地理信息 | /gis | 4 | 4 | online |
| hrm | 人力资源 | /hrm | 20 | 16 | online |
| iam | 身份权限 | /iam | 13 | 13 | online |
| im | 即时通讯 | /im | 1 | 1 | online |
| integration | 集成平台 | /integration | 9 | 9 | online |
| lims | 实验室管理 | /lims | 17 | 13 | online |
| lowcode | 低代码平台 | /lowcode | 11 | 10 | online |
| mes | 生产执行 | /mes | 24 | 19 | online |
| mobile | 移动端 | /mobile | 12 | 12 | online |
| monitor | 系统监控 | /monitor | 7 | 7 | online |
| notification | 通知中心 | /notification | 8 | 7 | online |
| oa | 行政办公 | /oa | 8 | 8 | online |
| pdm | 产品数据 | /pdm | 14 | 14 | online |
| plugin | 插件市场 | /plugin | 3 | 2 | online |
| pm | 项目管理 | /pm | 10 | 6 | online |
| qms | 质量管理 | /qms | 12 | 11 | online |
| report | 报表中心 | /report | 8 | 7 | online |
| rs | 研发管理 | /rs | 23 | 17 | online |
| scm | 供应链管理 | /scm | 14 | 14 | online |
| srm | 供应商关系 | /srm | 13 | 13 | online |
| wms | 仓储管理 | /wms | 16 | 15 | online |
| workflow | 工作流 | /workflow | 13 | 10 | online |
| index | - | - | 0 | 0 | - |

## 详细路径映射

### admin (系统管理)

**模块信息:**
- 路径: /admin
- 图标: Settings
- 权限: admin:read
- 来源: core
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| admin-tenant | 租户管理 | /admin/tenant | ✅ | admin-tenant | list | admin:tenant:read |
| admin-tenant-billing | 租户计费 | /admin/tenant-billing | ✅ | admin-tenant-billing | list | admin:tenant:read |
| admin-user | 用户管理 | /admin/user | ✅ | admin-user | list | admin:user:read |
| admin-role | 角色管理 | /admin/role | ✅ | admin-role | list | admin:role:read |
| admin-permission | 权限管理 | /admin/permission | ✅ | admin-permission | list | admin:permission:read |
| admin-account | 账号管理 | /admin/account | ✅ | admin-account | list | admin:account:read |
| admin-dictionary | 数据字典 | /admin/dictionary | ✅ | admin-dictionary | list | admin:dictionary:read |
| admin-system | 系统管理 | /admin/system | ✅ | admin-system | settings | admin:system:read |
| admin-system-settings | 系统设置 | /admin/system-settings | ✅ | admin-system-settings | settings | admin:system:write |
| admin-plugin | 插件管理 | /admin/plugin | ✅ | admin-plugin | list | admin:plugin:read |
| admin-database | 数据库结构 | /admin/database | ✅ | admin-database | list | admin:database:read |
| admin-migration | 数据迁移 | /admin/migration | ✅ | admin-migration | list | admin:migration:read |
| admin-config-debug | 配置调试 | /admin/config-debug | ✅ | admin-config-debug | settings | admin:debug:read |
| admin-audit-log | 审计日志 | /admin/audit-log | ✅ | admin-audit-log | list | admin:audit:read |
| admin-monitor | 系统监控 | /admin/monitor | ✅ | admin-monitor | stats | admin:monitor:read |
| admin-performance | 性能监控 | /admin/performance | ✅ | admin-performance | stats | admin:monitor:read |
| admin-company-structure | 公司结构 | /admin/company-structure | ✅ | admin-company-structure | list | admin:structure:read |
| admin-bank-account | 银行账号 | /admin/bank-account | ✅ | admin-bank-account | list | admin:bank-account:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /admin/tenant-detail | admin-tenant-detail | 租户详情 | detail | admin:tenant:read |
| /admin/tenant-settings | admin-tenant-settings | 租户设置 | form | admin:tenant:write |

### ai (智能助手)

**模块信息:**
- 路径: /ai
- 图标: Sparkles
- 权限: ai:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| ai-dashboard | AI助手概览 | /ai/dashboard | ✅ | ai-dashboard | dashboard | ai:read |
| ai-chat | 智能对话 | /ai/chat | ✅ | ai-chat | form | ai:chat:read |
| ai-code | 代码助手 | /ai/code | ✅ | ai-code | form | ai:code:read |
| ai-document | 文档分析 | /ai/document | ✅ | ai-document | form | ai:document:read |
| ai-knowledge | 知识库 | /ai/knowledge | ✅ | ai-knowledge | list | ai:knowledge:read |
| ai-prompts | 提示词库 | /ai/prompts | ✅ | ai-prompts | list | ai:prompt:read |
| ai-settings | 模型设置 | /ai/settings | ✅ | ai-settings | settings | ai:admin |

### asset (资产管理)

**模块信息:**
- 路径: /asset
- 图标: Landmark
- 权限: asset:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| asset-equipment | 设备管理 | /asset/equipment | ✅ | asset-equipment | list | asset:equipment:read |
| asset-maintenance | 设备维护 | /asset/maintenance | ✅ | asset-maintenance | list | asset:maintenance:read |
| asset-inspection | 设备巡检 | /asset/inspection | ✅ | asset-inspection | list | asset:inspection:read |
| asset-vehicle | 车辆管理 | /asset/vehicle | ✅ | asset-vehicle | list | asset:vehicle:read |
| asset-voucher-template | 凭证模板 | /asset/voucher-template | ✅ | asset-voucher-template | list | asset:voucher:read |
| asset-asset-management | 资产台账 | /asset/asset-management | ✅ | asset-asset-management | list | asset:asset:read |
| asset-office-supplies | 办公用品 | /asset/office-supplies | ✅ | asset-office-supplies | list | asset:supplies:read |

### bi (商业智能)

**模块信息:**
- 路径: /bi
- 图标: BarChart3
- 权限: bi:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| bi-dashboard | 仪表盘 | /bi/dashboard | ✅ | bi-dashboard | dashboard | bi:read |
| bi-analytics | 数据分析 | /bi/analytics | ✅ | bi-analytics | stats | bi:analytics:read |
| bi-comparison | 对比分析 | /bi/comparison | ✅ | bi-comparison | stats | bi:comparison:read |
| bi-data-source | 数据源 | /bi/data-source | ✅ | bi-data-source | list | bi:data-source:read |
| bi-dataset | 数据集 | /bi/dataset | ✅ | bi-dataset | list | bi:dataset:read |
| bi-report | 报表中心 | /bi/report | ✅ | bi-report | list | bi:report:read |
| bi-visualization | 可视化 | /bi/visualization | ✅ | bi-visualization | stats | bi:visualization:read |
| bi-report-builder | 报表设计 | /bi/report-builder | ✅ | bi-report-builder | form | bi:report:write |
| bi-permission | 权限管理 | /bi/permission | ✅ | bi-permission | settings | bi:admin |
| bi-index | 指标管理 | /bi/index | ✅ | bi-index | list | bi:index:read |
| bi-gis | GIS分析 | /bi/gis | ✅ | bi-gis | stats | bi:gis:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /bi/module-detail | bi-module-detail | 模块详情 | detail | bi:read |
| /bi/data-analysis | bi-data-analysis | 数据分析 | stats | bi:analytics:read |

### crm (客户关系)

**模块信息:**
- 路径: /crm
- 图标: Users
- 权限: crm:read
- 来源: core
- 套件: crm
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| crm-dashboard | 仪表盘 | /crm/dashboard | ✅ | crm-dashboard | dashboard | crm:read |
| crm-customers | 客户管理 | /crm/customers | ✅ | crm-customers | list | crm:customer:read |
| crm-contacts | 联系人 | /crm/contacts | ✅ | crm-contacts | list | crm:contact:read |
| crm-opportunities | 商机管理 | /crm/opportunities | ✅ | crm-opportunities | list | crm:opportunity:read |
| crm-interactions | 互动记录 | /crm/interactions | ✅ | crm-interactions | list | crm:interaction:read |
| crm-customer-segmentation | 客户分群 | /crm/customer-segmentation | ✅ | crm-customer-segmentation | stats | crm:segmentation:read |
| crm-customer-scoring | 客户评分 | /crm/customer-scoring | ✅ | crm-customer-scoring | stats | crm:scoring:read |
| crm-sales-funnel | 销售漏斗 | /crm/sales-funnel | ✅ | crm-sales-funnel | kanban | crm:funnel:read |
| crm-sales-forecast | 销售预测 | /crm/sales-forecast | ✅ | crm-sales-forecast | stats | crm:forecast:read |
| crm-billing | 计费管理 | /crm/billing | ✅ | crm-billing | list | crm:billing:read |
| crm-recommendation | 智能推荐 | /crm/recommendation | ✅ | crm-recommendation | dashboard | crm:recommendation:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /crm/customers/create | crm-customer-create | 创建客户 | form | crm:customer:create |
| /crm/customers/:id | crm-customer-detail | 客户详情 | detail | crm:customer:read |
| /crm/customers/:id/edit | crm-customer-edit | 编辑客户 | form | crm:customer:update |
| /crm/contacts/:id | crm-contact-detail | 联系人详情 | detail | crm:contact:read |
| /crm/opportunities/:id | crm-opportunity-detail | 商机详情 | detail | crm:opportunity:read |

### docs (知识文档)

**模块信息:**
- 路径: /docs
- 图标: BookOpen
- 权限: docs:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| docs-dashboard | 文档概览 | /docs/dashboard | ✅ | docs-dashboard | dashboard | docs:dashboard:read |
| docs-knowledge-base | 知识库 | /docs/knowledge-base | ✅ | docs-knowledge-base | list | docs:knowledge:read |
| docs-document-center | 文档中心 | /docs/document-center | ✅ | docs-document-center | list | docs:center:read |
| docs-documents | 文档管理 | /docs/documents | ✅ | docs-documents | list | docs:document:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /docs/file/:id | docs-file-detail | 文档详情 | detail | docs:document:read |

### document (文档中心)

**模块信息:**
- 路径: /document
- 图标: FileText
- 权限: document:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| document-dashboard | 仪表盘 | /document/dashboard | ✅ | document-dashboard | dashboard | document:read |
| document-list | 文档列表 | /document/list | ✅ | document-list | list | document:read |
| document-knowledge-base | 知识库 | /document/knowledge-base | ✅ | document-knowledge-base | tree | document:read |

### ehs (安全环保)

**模块信息:**
- 路径: /ehs
- 图标: ShieldCheck
- 权限: ehs:read
- 来源: plugin
- 套件: manufacturing
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| ehs-check | 安全检查 | /ehs/check | ✅ | ehs-check | list | ehs:check:read |
| ehs-hazard | 危险源管理 | /ehs/hazard | ✅ | ehs-hazard | list | ehs:hazard:read |
| ehs-accident | 事故管理 | /ehs/accident | ✅ | ehs-accident | list | ehs:accident:read |
| ehs-plan | 工作计划 | /ehs/plan | ✅ | ehs-plan | list | ehs:plan:read |
| ehs-compliance | 合规管理 | /ehs/compliance | ✅ | ehs-compliance | list | ehs:compliance:read |
| ehs-environment | 环境监测 | /ehs/environment | ✅ | ehs-environment | stats | ehs:environment:read |
| ehs-training | 培训管理 | /ehs/training | ✅ | ehs-training | list | ehs:training:read |
| ehs-occupational-disease | 职业病管理 | /ehs/occupational-disease | ✅ | ehs-occupational-disease | list | ehs:occupational-disease:read |
| ehs-health-management | 健康管理 | /ehs/health-management | ✅ | ehs-health-management | list | ehs:health:read |
| ehs-hazardous-material | 危化品管理 | /ehs/hazardous-material | ✅ | ehs-hazardous-material | list | ehs:hazardous-material:read |
| ehs-emergency | 应急管理 | /ehs/emergency | ✅ | ehs-emergency | list | ehs:emergency:read |
| ehs-drill | 应急演练 | /ehs/drill | ✅ | ehs-drill | list | ehs:drill:read |
| ehs-incident-report | 事件报告 | /ehs/incident-report | ✅ | ehs-incident-report | form | ehs:incident:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /ehs/hazard-detail | ehs-hazard-detail | 危险源详情 | detail | ehs:hazard:read |

### erp (企业资源计划)

**模块信息:**
- 路径: /erp
- 图标: Grid3X3
- 权限: erp:read
- 来源: core
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| erp-dashboard | 仪表盘 | /erp/dashboard | ✅ | erp-dashboard | dashboard | erp:read |
| erp-general-ledger | 总账管理 | /erp/voucher-management | ✅ | erp-general-ledger | list | erp:general_ledger:read |
| erp-customer-management | 客户管理 | /erp/customer-management | ✅ | erp-customer-management | list | erp:customer:read |
| erp-supplier-management | 供应商管理 | /erp/supplier-management | ✅ | erp-supplier-management | list | erp:supplier:read |
| erp-inventory-management | 库存管理 | /erp/inventory-management | ✅ | erp-inventory-management | list | erp:inventory:read |
| erp-material-management | 物料管理 | /erp/material-management | ✅ | erp-material-management | list | erp:material:read |
| erp-purchase-order | 采购订单 | /erp/purchase-order | ✅ | erp-purchase-order | list | erp:purchase_order:read |
| erp-sales-order | 销售订单 | /erp/sales-order | ✅ | erp-sales-order | list | erp:sales_order:read |
| erp-financial-statements | 财务报表 | /erp/financial-report | ✅ | erp-financial-statements | stats | erp:financial_statement:read |
| erp-dictionaries | 数据字典 | /erp/dict-management | ✅ | erp-dictionaries | tree | erp:dictionary:read |
| erp-database-management | 数据库管理 | /erp/database-management | ✅ | erp-database-management | list | erp:database:read |
| erp-audit-log | 审计日志 | /erp/audit-log | ✅ | erp-audit-log | list | erp:audit:read |

### finance (财务管理)

**模块信息:**
- 路径: /finance
- 图标: Wallet
- 权限: finance:read
- 来源: core
- 套件: finance
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| finance-dashboard | 仪表盘 | /finance/dashboard | ✅ | finance-dashboard | dashboard | finance:read |
| finance-vouchers | 凭证管理 | /finance/vouchers | ✅ | finance-vouchers | list | finance:voucher:read |
| finance-ledger | 总账管理 | /finance/ledger | ✅ | finance-ledger | list | finance:ledger:read |
| finance-receivable-payable | 应收应付 | /finance/receivable-payable | ✅ | finance-receivable-payable | list | finance:receivable:read |
| finance-receipts | 收款管理 | /finance/receipts | ✅ | finance-receipts | list | finance:receipt:read |
| finance-payments | 付款管理 | /finance/payments | ✅ | finance-payments | list | finance:payment:read |
| finance-invoices | 发票管理 | /finance/invoices | ✅ | finance-invoices | list | finance:invoice:read |
| finance-expense | 费用管理 | /finance/expense | ✅ | finance-expense | list | finance:expense:read |
| finance-budget | 预算管理 | /finance/budget | ✅ | finance-budget | list | finance:budget:read |
| finance-assets | 资产管理 | /finance/assets | ✅ | finance-assets | list | finance:asset:read |
| finance-tax | 税务管理 | /finance/tax | ✅ | finance-tax | list | finance:tax:read |
| finance-cost | 成本管理 | /finance/cost | ✅ | finance-cost | list | finance:cost:read |
| finance-reports | 财务报表 | /finance/reports | ✅ | finance-reports | stats | finance:report:read |
| finance-opening-balance | 期初余额 | /finance/opening-balance | ✅ | finance-opening-balance | form | finance:opening_balance:read |
| finance-consolidation | 合并报表 | /finance/consolidation | ✅ | finance-consolidation | list | finance:consolidation:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /finance/vouchers/create | finance-voucher-create | 创建凭证 | form | finance:voucher:create |
| /finance/vouchers/:id | finance-voucher-detail | 凭证详情 | detail | finance:voucher:read |
| /finance/budget-detail | finance-budget-detail | 预算详情 | detail | finance:budget:read |
| /finance/consolidation-reports | finance-consolidation-reports | 合并报表详情 | stats | finance:consolidation:read |

### gis (地理信息)

**模块信息:**
- 路径: /gis
- 图标: Map
- 权限: gis:read
- 来源: plugin
- 套件: gis
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| gis-dashboard | 仪表盘 | /gis/dashboard | ✅ | gis-dashboard | dashboard | gis:read |
| gis-map | 地图展示 | /gis/map | ✅ | gis-map | dashboard | gis:map:read |
| gis-tracking | 轨迹追踪 | /gis/tracking | ✅ | gis-tracking | stats | gis:tracking:read |
| gis-fence | 地理围栏 | /gis/fence | ✅ | gis-fence | list | gis:fence:read |

### hrm (人力资源)

**模块信息:**
- 路径: /hrm
- 图标: Users
- 权限: hrm:read
- 来源: core
- 套件: hr
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| hrm-dashboard | 仪表盘 | /hrm/dashboard | ✅ | hrm-dashboard | dashboard | hrm:read |
| hrm-employees | 员工管理 | /hrm/employees | ✅ | hrm-employees | list | hrm:employee:read |
| hrm-departments | 部门管理 | /hrm/departments | ✅ | hrm-departments | list | hrm:department:read |
| hrm-organization | 组织架构 | /hrm/organization | ✅ | hrm-organization | tree | hrm:organization:read |
| hrm-positions | 岗位管理 | /hrm/positions | ✅ | hrm-positions | list | hrm:position:read |
| hrm-contracts | 合同管理 | /hrm/contracts | ✅ | hrm-contracts | list | hrm:contract:read |
| hrm-company | 公司信息 | /hrm/company | ✅ | hrm-company | detail | hrm:company:read |
| hrm-attendance | 考勤管理 | /hrm/attendance | ✅ | hrm-attendance | list | hrm:attendance:read |
| hrm-leave | 请假管理 | /hrm/leave | ✅ | hrm-leave | list | hrm:leave:read |
| hrm-payroll | 薪资管理 | /hrm/payroll | ✅ | hrm-payroll | list | hrm:payroll:read |
| hrm-salary-adjustment | 调薪管理 | /hrm/salary-adjustment | ✅ | hrm-salary-adjustment | list | hrm:salary_adjustment:read |
| hrm-recruitment | 招聘管理 | /hrm/recruitment | ✅ | hrm-recruitment | list | hrm:recruitment:read |
| hrm-training | 培训管理 | /hrm/training | ✅ | hrm-training | list | hrm:training:read |
| hrm-performance | 绩效管理 | /hrm/performance | ✅ | hrm-performance | list | hrm:performance:read |
| hrm-reports | 统计报表 | /hrm/reports | ✅ | hrm-reports | stats | hrm:report:read |
| hrm-overview | 数据概览 | /hrm/overview | ✅ | hrm-overview | dashboard | hrm:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /hrm/employees/create | hrm-employee-create | 创建员工 | form | hrm:employee:create |
| /hrm/employees/:id | hrm-employee-detail | 员工详情 | detail | hrm:employee:read |
| /hrm/employees/:id/edit | hrm-employee-edit | 编辑员工 | form | hrm:employee:update |
| /hrm/contracts/:id | hrm-contract-detail | 合同详情 | detail | hrm:contract:read |

### iam (身份权限)

**模块信息:**
- 路径: /iam
- 图标: Shield
- 权限: iam:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| iam-dashboard | 仪表盘 | /iam/dashboard | ✅ | iam-dashboard | dashboard | iam:read |
| iam-users | 用户管理 | /iam/users | ✅ | iam-users | list | iam:user:read |
| iam-roles | 角色管理 | /iam/roles | ✅ | iam-roles | list | iam:role:read |
| iam-permissions | 权限管理 | /iam/permissions | ✅ | iam-permissions | tree | iam:permission:read |
| iam-accounts | 账号管理 | /iam/accounts | ✅ | iam-accounts | list | iam:account:read |
| iam-bank-accounts | 银行账号 | /iam/bank-accounts | ✅ | iam-bank-accounts | list | iam:bank:read |
| iam-audit-logs | 审计日志 | /iam/audit-logs | ✅ | iam-audit-logs | list | iam:audit:read |
| iam-dictionaries | 数据字典 | /iam/dictionaries | ✅ | iam-dictionaries | tree | iam:dictionary:read |
| iam-system | 系统设置 | /iam/system | ✅ | iam-system | settings | iam:system:read |
| iam-plugins | 插件管理 | /iam/plugins | ✅ | iam-plugins | list | iam:plugin:read |
| iam-database | 数据库结构 | /iam/database | ✅ | iam-database | list | iam:system:read |
| iam-migration | 数据迁移 | /iam/migration | ✅ | iam-migration | list | iam:system:update |
| iam-debug | 配置调试 | /iam/debug | ✅ | iam-debug | list | iam:system:update |

### im (即时通讯)

**模块信息:**
- 路径: /im
- 图标: MessageSquare
- 权限: im:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| im-mail | 邮件管理 | /im/mail | ✅ | im-mail | list | im:mail:read |

### integration (集成平台)

**模块信息:**
- 路径: /integration
- 图标: Plug
- 权限: integration:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| integration-dashboard | 集成概览 | /integration/dashboard | ✅ | integration-dashboard | dashboard | integration:read |
| integration-connections | 连接管理 | /integration/connections | ✅ | integration-connections | list | integration:connection:read |
| integration-mappings | 数据映射 | /integration/mappings | ✅ | integration-mappings | list | integration:mapping:read |
| integration-events | 事件日志 | /integration/events | ✅ | integration-events | list | integration:event:read |
| integration-erp | ERP集成 | /integration/erp-overview | ✅ | integration-erp | detail | integration:erp:read |
| integration-lims-qms | LIMS-QMS集成 | /integration/lims-qms | ✅ | integration-lims-qms | detail | integration:lims:read |
| integration-mes-erp | MES-ERP集成 | /integration/mes-erp | ✅ | integration-mes-erp | detail | integration:mes:read |
| integration-wms-scm | WMS-SCM集成 | /integration/wms-scm | ✅ | integration-wms-scm | detail | integration:wms:read |
| integration-settings | 集成设置 | /integration/settings | ✅ | integration-settings | settings | integration:admin |

### lims (实验室管理)

**模块信息:**
- 路径: /lims
- 图标: FlaskConical
- 权限: lims:read
- 来源: plugin
- 套件: quality
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| lims-sample | 样品管理 | /lims/sample | ✅ | lims-sample | list | lims:sample:read |
| lims-sample-receive | 样品接收 | /lims/sample-receive | ✅ | lims-sample-receive | form | lims:sample:write |
| lims-task | 检验任务 | /lims/task | ✅ | lims-task | list | lims:task:read |
| lims-inspection-task | 检验任务列表 | /lims/inspection-task | ✅ | lims-inspection-task | list | lims:task:read |
| lims-process | 检验流程 | /lims/process | ✅ | lims-process | list | lims:process:read |
| lims-instrument | 仪器设备 | /lims/instrument | ✅ | lims-instrument | list | lims:instrument:read |
| lims-instrument-maintenance | 仪器维护 | /lims/instrument-maintenance | ✅ | lims-instrument-maintenance | form | lims:instrument:write |
| lims-reagent | 试剂管理 | /lims/reagent | ✅ | lims-reagent | list | lims:reagent:read |
| lims-test-method | 测试方法 | /lims/test-method | ✅ | lims-test-method | list | lims:test-method:read |
| lims-barcode | 条码管理 | /lims/barcode | ✅ | lims-barcode | list | lims:barcode:read |
| lims-uncertainty | 不确定度 | /lims/uncertainty | ✅ | lims-uncertainty | stats | lims:uncertainty:read |
| lims-inspection-result | 检验结果 | /lims/inspection-result | ✅ | lims-inspection-result | detail | lims:result:read |
| lims-proficiency-testing | 能力验证 | /lims/proficiency-testing | ✅ | lims-proficiency-testing | list | lims:proficiency:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /lims/sample-detail | lims-sample-detail | 样品详情 | detail | lims:sample:read |
| /lims/task-detail | lims-task-detail | 任务详情 | detail | lims:task:read |
| /lims/instrument-detail | lims-instrument-detail | 仪器详情 | detail | lims:instrument:read |
| /lims/instrument-data | lims-instrument-data | 仪器数据 | detail | lims:instrument:read |

### lowcode (低代码平台)

**模块信息:**
- 路径: /lowcode
- 图标: Blocks
- 权限: lowcode:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| lowcode-home | 首页 | /lowcode/home | ✅ | lowcode-home | dashboard | lowcode:read |
| lowcode-app | 应用管理 | /lowcode/app | ✅ | lowcode-app | list | lowcode:app:read |
| lowcode-app-overview | 应用概览 | /lowcode/app-overview | ✅ | lowcode-app-overview | dashboard | lowcode:app:read |
| lowcode-page | 页面管理 | /lowcode/page | ✅ | lowcode-page | list | lowcode:page:read |
| lowcode-page-designer | 页面设计器 | /lowcode/page-designer | ✅ | lowcode-page-designer | form | lowcode:page:write |
| lowcode-form | 表单管理 | /lowcode/form | ✅ | lowcode-form | list | lowcode:form:read |
| lowcode-form-designer | 表单设计器 | /lowcode/form-designer | ✅ | lowcode-form-designer | form | lowcode:form:write |
| lowcode-data-model | 数据模型 | /lowcode/data-model | ✅ | lowcode-data-model | list | lowcode:data-model:read |
| lowcode-data-model-designer | 数据模型设计器 | /lowcode/data-model-designer | ✅ | lowcode-data-model-designer | form | lowcode:data-model:write |
| lowcode-data-source | 数据源 | /lowcode/data-source | ✅ | lowcode-data-source | list | lowcode:data-source:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /lowcode/app-detail | lowcode-app-detail | 应用详情 | detail | lowcode:app:read |

### mes (生产执行)

**模块信息:**
- 路径: /mes
- 图标: Factory
- 权限: mes:read
- 来源: core
- 套件: manufacturing
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| mes-dashboard | 仪表盘 | /mes/dashboard | ✅ | mes-dashboard | dashboard | mes:read |
| mes-production-orders | 生产订单 | /mes/production-orders | ✅ | mes-production-orders | list | mes:production_order:read |
| mes-work-orders | 工单管理 | /mes/work-orders | ✅ | mes-work-orders | list | mes:work_order:read |
| mes-equipment | 设备管理 | /mes/equipment | ✅ | mes-equipment | list | mes:equipment:read |
| mes-work-stations | 工位管理 | /mes/work-stations | ✅ | mes-work-stations | list | mes:work_station:read |
| mes-teams | 班组管理 | /mes/teams | ✅ | mes-teams | list | mes:team:read |
| mes-material-requirement | 物料需求 | /mes/material-requirement | ✅ | mes-material-requirement | list | mes:material:read |
| mes-process-routes | 工艺路线 | /mes/process-routes | ✅ | mes-process-routes | list | mes:process_route:read |
| mes-process-flow | 工艺流程 | /mes/process-flow | ✅ | mes-process-flow | list | mes:process_flow:read |
| mes-production-process | 生产过程 | /mes/production-process | ✅ | mes-production-process | detail | mes:production_process:read |
| mes-production-schedule | 生产计划 | /mes/production-schedule | ✅ | mes-production-schedule | list | mes:production_schedule:read |
| mes-wip | 在制品 | /mes/wip | ✅ | mes-wip | list | mes:wip:read |
| mes-quality-inspection | 过程质检 | /mes/quality-inspection | ✅ | mes-quality-inspection | list | mes:quality:read |
| mes-traceability | 质量追溯 | /mes/traceability | ✅ | mes-traceability | detail | mes:traceability:read |
| mes-production-kanban | 生产看板 | /mes/production-kanban | ✅ | mes-production-kanban | kanban | mes:kanban:read |
| mes-production-record | 生产记录 | /mes/production-record | ✅ | mes-production-record | list | mes:production_record:read |
| mes-work-report | 工作报告 | /mes/work-report | ✅ | mes-work-report | list | mes:work_report:read |
| mes-equipment-oee | 设备OEE | /mes/equipment-oee | ✅ | mes-equipment-oee | stats | mes:oee:read |
| mes-production-dashboard | 生产总览 | /mes/production-dashboard | ✅ | mes-production-dashboard | dashboard | mes:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /mes/production-orders/:id | mes-production-order-detail | 生产订单详情 | detail | mes:production_order:read |
| /mes/equipment/:id | mes-equipment-detail | 设备详情 | detail | mes:equipment:read |
| /mes/material-bom | mes-material-bom | 物料BOM | tree | mes:material:read |
| /mes/material-issue | mes-material-issue | 物料出库 | form | mes:material:update |
| /mes/material-return | mes-material-return | 物料退回 | form | mes:material:update |

### mobile (移动端)

**模块信息:**
- 路径: /mobile
- 图标: Smartphone
- 权限: mobile:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| mobile-home | 首页 | /mobile/home | ✅ | mobile-home | dashboard | mobile:read |
| mobile-workbench | 工作台 | /mobile/workbench | ✅ | mobile-workbench | dashboard | mobile:read |
| mobile-attendance | 考勤打卡 | /mobile/attendance | ✅ | mobile-attendance | form | mobile:attendance:read |
| mobile-tasks | 我的任务 | /mobile/tasks | ✅ | mobile-tasks | list | mobile:task:read |
| mobile-approvals | 审批中心 | /mobile/approvals | ✅ | mobile-approvals | list | mobile:approval:read |
| mobile-inventory | 库存查询 | /mobile/inventory | ✅ | mobile-inventory | list | mobile:inventory:read |
| mobile-quality | 质量巡检 | /mobile/quality | ✅ | mobile-quality | list | mobile:quality:read |
| mobile-production | 生产报工 | /mobile/production | ✅ | mobile-production | form | mobile:production:read |
| mobile-scan | 扫码功能 | /mobile/scan | ✅ | mobile-scan | form | mobile:scan:read |
| mobile-notifications | 消息通知 | /mobile/notifications | ✅ | mobile-notifications | list | mobile:notification:read |
| mobile-profile | 个人中心 | /mobile/profile | ✅ | mobile-profile | detail | mobile:read |
| mobile-settings | 应用设置 | /mobile/settings | ✅ | mobile-settings | settings | mobile:admin |

### monitor (系统监控)

**模块信息:**
- 路径: /monitor
- 图标: Activity
- 权限: monitor:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| monitor-dashboard | 仪表盘 | /monitor/dashboard | ✅ | monitor-dashboard | dashboard | monitor:read |
| monitor-alerts | 告警中心 | /monitor/alerts | ✅ | monitor-alerts | list | monitor:alert:read |
| monitor-alert-history | 告警历史 | /monitor/alerts/history | ✅ | monitor-alert-history | list | monitor:alert:read |
| monitor-rules | 告警规则 | /monitor/rules | ✅ | monitor-rules | list | monitor:rule:read |
| monitor-metrics | 指标监控 | /monitor/metrics | ✅ | monitor-metrics | stats | monitor:metric:read |
| monitor-logs | 系统日志 | /monitor/logs | ✅ | monitor-logs | list | monitor:log:read |
| monitor-settings | 监控设置 | /monitor/settings | ✅ | monitor-settings | settings | monitor:admin |

### notification (通知中心)

**模块信息:**
- 路径: /notification
- 图标: Bell
- 权限: notification:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| notification-dashboard | 仪表盘 | /notification/dashboard | ✅ | notification-dashboard | dashboard | notification:read |
| notification-list | 通知列表 | /notification/list | ✅ | notification-list | list | notification:read |
| notification-archive | 通知归档 | /notification/archive | ✅ | notification-archive | list | notification:read |
| notification-center | 通知中心 | /notification/center | ✅ | notification-center | list | notification:read |
| notification-templates | 模板管理 | /notification/templates | ✅ | notification-templates | list | notification:read |
| notification-statistics | 发送统计 | /notification/statistics | ✅ | notification-statistics | stats | notification:read |
| notification-settings | 通知设置 | /notification/settings | ✅ | notification-settings | settings | notification:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /notification/:id | notification-detail | 通知详情 | detail | notification:read |

### oa (行政办公)

**模块信息:**
- 路径: /oa
- 图标: Briefcase
- 权限: oa:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| oa-dashboard | 仪表盘 | /oa/dashboard | ✅ | oa-dashboard | dashboard | oa:read |
| oa-announcement | 公告管理 | /oa/announcement | ✅ | oa-announcement | list | oa:announcement:read |
| oa-addressbook | 通讯录 | /oa/addressbook | ✅ | oa-addressbook | list | oa:addressbook:read |
| oa-meeting-room | 会议室管理 | /oa/meeting-room | ✅ | oa-meeting-room | list | oa:meeting-room:read |
| oa-office-supplies | 办公用品 | /oa/office-supplies | ✅ | oa-office-supplies | list | oa:office-supplies:read |
| oa-vehicle | 车辆管理 | /oa/vehicle | ✅ | oa-vehicle | list | oa:vehicle:read |
| oa-expense-claim | 费用报销 | /oa/expense-claim | ✅ | oa-expense-claim | list | oa:expense:read |
| oa-budget | 预算管理 | /oa/budget | ✅ | oa-budget | list | oa:budget:read |

### pdm (产品数据)

**模块信息:**
- 路径: /pdm
- 图标: Package
- 权限: pdm:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| pdm-product | 产品管理 | /pdm/product | ✅ | pdm-product | list | pdm:product:read |
| pdm-material | 物料管理 | /pdm/material | ✅ | pdm-material | list | pdm:material:read |
| pdm-bom | BOM管理 | /pdm/bom | ✅ | pdm-bom | list | pdm:bom:read |
| pdm-pdm-bom | PDM BOM | /pdm/pdm-bom | ✅ | pdm-pdm-bom | list | pdm:bom:read |
| pdm-document | 文档管理 | /pdm/document | ✅ | pdm-document | list | pdm:document:read |
| pdm-version | 版本管理 | /pdm/version | ✅ | pdm-version | list | pdm:version:read |
| pdm-change | 变更管理 | /pdm/change | ✅ | pdm-change | list | pdm:change:read |
| pdm-project | 项目管理 | /pdm/project | ✅ | pdm-project | list | pdm:project:read |
| pdm-product-config | 产品配置 | /pdm/product-config | ✅ | pdm-product-config | form | pdm:product:read |
| pdm-formula | 配方管理 | /pdm/formula | ✅ | pdm-formula | list | pdm:formula:read |
| pdm-process | 工艺管理 | /pdm/process | ✅ | pdm-process | list | pdm:process:read |
| pdm-batch | 批次管理 | /pdm/batch | ✅ | pdm-batch | list | pdm:batch:read |
| pdm-step | 步骤管理 | /pdm/step | ✅ | pdm-step | list | pdm:step:read |
| pdm-stats | 统计分析 | /pdm/stats | ✅ | pdm-stats | stats | pdm:stats:read |

### plugin (插件市场)

**模块信息:**
- 路径: /plugin
- 图标: Puzzle
- 权限: plugin:read
- 来源: plugin
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| plugin-marketplace | 插件市场 | /plugin/marketplace | ✅ | plugin-marketplace | list | plugin:marketplace:read |
| plugin-upload | 上传插件 | /plugin/upload | ✅ | plugin-upload | form | plugin:upload:write |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /plugin/:id | plugin-detail | 插件详情 | detail | plugin:detail:read |

### pm (项目管理)

**模块信息:**
- 路径: /pm
- 图标: FolderKanban
- 权限: pm:read
- 来源: core
- 套件: project
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| pm-dashboard | 仪表盘 | /pm/dashboard | ✅ | pm-dashboard | dashboard | pm:read |
| pm-projects | 项目列表 | /pm/projects | ✅ | pm-projects | list | pm:project:read |
| pm-contracts | 合同管理 | /pm/contracts | ✅ | pm-contracts | list | pm:contract:read |
| pm-resources | 资源管理 | /pm/resources | ✅ | pm-resources | list | pm:resource:read |
| pm-templates | 模板管理 | /pm/templates | ✅ | pm-templates | list | pm:template:read |
| pm-reports | 项目报表 | /pm/reports | ✅ | pm-reports | stats | pm:report:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /pm/projects/create | pm-project-create | 创建项目 | form | pm:project:create |
| /pm/projects/:id | pm-project-detail | 项目详情 | detail | pm:project:read |
| /pm/contracts/create | pm-contract-create | 创建合同 | form | pm:contract:create |
| /pm/contracts/:id | pm-contract-detail | 合同详情 | detail | pm:contract:read |

### qms (质量管理)

**模块信息:**
- 路径: /qms
- 图标: Shield
- 权限: qms:read
- 来源: core
- 套件: quality
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| qms-dashboard | 仪表盘 | /qms/dashboard | ✅ | qms-dashboard | dashboard | qms:read |
| qms-inspection | 质检任务 | /qms/inspection | ✅ | qms-inspection | list | qms:inspection:read |
| qms-quality-control | 质量控制 | /qms/quality-control | ✅ | qms-quality-control | list | qms:quality_control:read |
| qms-nonconformance | 不合格品 | /qms/nonconformance | ✅ | qms-nonconformance | list | qms:nonconformance:read |
| qms-standards | 质量标准 | /qms/standards | ✅ | qms-standards | list | qms:standard:read |
| qms-audit-management | 审核管理 | /qms/audit-management | ✅ | qms-audit-management | list | qms:audit:read |
| qms-apqp | APQP管理 | /qms/apqp | ✅ | qms-apqp | list | qms:apqp:read |
| qms-fmea | FMEA分析 | /qms/fmea | ✅ | qms-fmea | list | qms:fmea:read |
| qms-eightd | 8D报告 | /qms/eightd | ✅ | qms-eightd | list | qms:eightd:read |
| qms-spc | SPC统计 | /qms/spc | ✅ | qms-spc | stats | qms:spc:read |
| qms-quality-cost | 质量成本 | /qms/quality-cost | ✅ | qms-quality-cost | stats | qms:quality_cost:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /qms/standards/:id | qms-standard-detail | 标准详情 | detail | qms:standard:read |

### report (报表中心)

**模块信息:**
- 路径: /report
- 图标: FileSpreadsheet
- 权限: report:read
- 来源: core
- 套件: enterprise
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| report-dashboard | 报表中心 | /report/dashboard | ✅ | report-dashboard | dashboard | report:read |
| report-list | 报表列表 | /report/list | ✅ | report-list | list | report:read |
| report-design | 报表设计 | /report/design | ✅ | report-design | form | report:design:write |
| report-builder | 报表构建 | /report/builder | ✅ | report-builder | form | report:builder:write |
| report-schedule | 定时任务 | /report/schedule | ✅ | report-schedule | list | report:schedule:read |
| report-subscription | 报表订阅 | /report/subscription | ✅ | report-subscription | list | report:subscription:read |
| report-template | 模板管理 | /report/template | ✅ | report-template | list | report:template:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /report/viewer | report-viewer | 报表查看 | detail | report:read |

### rs (研发管理)

**模块信息:**
- 路径: /rs
- 图标: FlaskConical
- 权限: rs:read
- 来源: plugin
- 套件: project
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| rs-dashboard | 研发概览 | /rs/dashboard | ✅ | rs-dashboard | dashboard | rs:dashboard:read |
| rs-overview | 项目总览 | /rs/overview | ✅ | rs-overview | dashboard | rs:overview:read |
| rs-project | 项目列表 | /rs/project | ✅ | rs-project | list | rs:project:read |
| rs-experiment | 实验列表 | /rs/experiment | ✅ | rs-experiment | list | rs:experiment:read |
| rs-formula | 配方列表 | /rs/formula | ✅ | rs-formula | list | rs:formula:read |
| rs-material | 物料管理 | /rs/material | ✅ | rs-material | list | rs:material:read |
| rs-code | 代码管理 | /rs/code | ✅ | rs-code | list | rs:code:read |
| rs-build | 构建管理 | /rs/build | ✅ | rs-build | list | rs:build:read |
| rs-test | 测试管理 | /rs/test | ✅ | rs-test | list | rs:test:read |
| rs-bug | Bug管理 | /rs/bug | ✅ | rs-bug | list | rs:bug:read |
| rs-review | 代码评审 | /rs/review | ✅ | rs-review | list | rs:review:read |
| rs-deploy | 部署管理 | /rs/deploy | ✅ | rs-deploy | list | rs:deploy:read |
| rs-release | 发布管理 | /rs/release | ✅ | rs-release | list | rs:release:read |
| rs-milestone | 里程碑 | /rs/milestone | ✅ | rs-milestone | list | rs:milestone:read |
| rs-doc | 文档管理 | /rs/doc | ✅ | rs-doc | list | rs:doc:read |
| rs-report | 统计报表 | /rs/report | ✅ | rs-report | stats | rs:report:read |
| rs-settings | 系统设置 | /rs/settings | ✅ | rs-settings | settings | rs:settings:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /rs/project/create | rs-project-create | 创建项目 | form | rs:project:write |
| /rs/project/:id | rs-project-detail | 项目详情 | detail | rs:project:read |
| /rs/experiment/create | rs-experiment-create | 创建实验 | form | rs:experiment:write |
| /rs/experiment/:id | rs-experiment-detail | 实验详情 | detail | rs:experiment:read |
| /rs/formula/create | rs-formula-create | 创建配方 | form | rs:formula:write |
| /rs/formula/:id | rs-formula-detail | 配方详情 | detail | rs:formula:read |

### scm (供应链管理)

**模块信息:**
- 路径: /scm
- 图标: Truck
- 权限: scm:read
- 来源: core
- 套件: supply
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| scm-dashboard | 仪表盘 | /scm/dashboard | ✅ | scm-dashboard | dashboard | scm:read |
| scm-purchase-orders | 采购订单 | /scm/purchase-orders | ✅ | scm-purchase-orders | list | scm:purchase_order:read |
| scm-purchase-requisition | 采购申请 | /scm/purchase-requisition | ✅ | scm-purchase-requisition | list | scm:purchase_requisition:read |
| scm-purchase-items | 采购明细 | /scm/purchase-items | ✅ | scm-purchase-items | list | scm:purchase_item:read |
| scm-suppliers | 供应商管理 | /scm/suppliers | ✅ | scm-suppliers | list | scm:supplier:read |
| scm-supplier-admission | 供应商准入 | /scm/supplier-admission | ✅ | scm-supplier-admission | list | scm:supplier_admission:read |
| scm-supplier-evaluation | 供应商评估 | /scm/supplier-evaluation | ✅ | scm-supplier-evaluation | list | scm:supplier_evaluation:read |
| scm-contracts | 合同管理 | /scm/contracts | ✅ | scm-contracts | list | scm:contract:read |
| scm-delivery-appointment | 交期预约 | /scm/delivery-appointment | ✅ | scm-delivery-appointment | list | scm:delivery_appointment:read |
| scm-mrp-plan | MRP计划 | /scm/mrp-plan | ✅ | scm-mrp-plan | list | scm:mrp_plan:read |
| scm-mrp-suggestion | MRP建议 | /scm/mrp-suggestion | ✅ | scm-mrp-suggestion | list | scm:mrp_suggestion:read |
| scm-overview | 供应链概览 | /scm/overview | ✅ | scm-overview | dashboard | scm:read |
| scm-inventory-turnover | 库存周转 | /scm/inventory-turnover | ✅ | scm-inventory-turnover | stats | scm:inventory_turnover:read |
| scm-price-comparison | 价格对比 | /scm/price-comparison | ✅ | scm-price-comparison | stats | scm:price_comparison:read |

### srm (供应商关系)

**模块信息:**
- 路径: /srm
- 图标: Users
- 权限: srm:read
- 来源: plugin
- 套件: supply
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| srm-dashboard | 仪表盘 | /srm/dashboard | ✅ | srm-dashboard | dashboard | srm:read |
| srm-supplier | 供应商管理 | /srm/supplier | ✅ | srm-supplier | list | srm:supplier:read |
| srm-category | 品类管理 | /srm/category | ✅ | srm-category | list | srm:category:read |
| srm-product | 产品管理 | /srm/product | ✅ | srm-product | list | srm:product:read |
| srm-contract | 合同管理 | /srm/contract | ✅ | srm-contract | list | srm:contract:read |
| srm-order | 采购订单 | /srm/order | ✅ | srm-order | list | srm:order:read |
| srm-evaluation | 供应商评估 | /srm/evaluation | ✅ | srm-evaluation | list | srm:evaluation:read |
| srm-performance | 绩效分析 | /srm/performance | ✅ | srm-performance | stats | srm:performance:read |
| srm-scoring-dimension | 评分维度 | /srm/scoring-dimension | ✅ | srm-scoring-dimension | list | srm:evaluation:read |
| srm-inquiry | 询报价管理 | /srm/inquiry | ✅ | srm-inquiry | list | srm:inquiry:read |
| srm-bidding | 招标管理 | /srm/bidding | ✅ | srm-bidding | list | srm:bidding:read |
| srm-finance | 财务管理 | /srm/finance | ✅ | srm-finance | list | srm:finance:read |
| srm-portal | 供应商门户 | /srm/portal | ✅ | srm-portal | dashboard | srm:portal:read |

### wms (仓储管理)

**模块信息:**
- 路径: /wms
- 图标: Warehouse
- 权限: wms:read
- 来源: core
- 套件: supply
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| wms-dashboard | 仪表盘 | /wms/dashboard | ✅ | wms-dashboard | dashboard | wms:read |
| wms-warehouses | 仓库管理 | /wms/warehouse-management | ✅ | wms-warehouses | list | wms:warehouse:read |
| wms-locations | 库位管理 | /wms/location-management | ✅ | wms-locations | tree | wms:location:read |
| wms-batches | 批次管理 | /wms/batch-management | ✅ | wms-batches | list | wms:batch:read |
| wms-serial-number | 序列号管理 | /wms/serial-number | ✅ | wms-serial-number | list | wms:serial_number:read |
| wms-supplier-management | 供应商管理 | /wms/supplier-management | ✅ | wms-supplier-management | list | wms:supplier:read |
| wms-inbound | 入库管理 | /wms/inbound | ✅ | wms-inbound | list | wms:inbound:read |
| wms-inbound-order | 入库单 | /wms/inbound-order | ✅ | wms-inbound-order | list | wms:inbound:read |
| wms-outbound | 出库管理 | /wms/outbound | ✅ | wms-outbound | list | wms:outbound:read |
| wms-outbound-order | 出库单 | /wms/outbound-order | ✅ | wms-outbound-order | list | wms:outbound:read |
| wms-transfer | 调拨管理 | /wms/transfer | ✅ | wms-transfer | list | wms:transfer:read |
| wms-inventory-check | 库存盘点 | /wms/stock-take | ✅ | wms-inventory-check | list | wms:inventory_check:read |
| wms-replenishment | 补货管理 | /wms/replenishment | ✅ | wms-replenishment | list | wms:replenishment:read |
| wms-items | 库存查询 | /wms/inventory | ✅ | wms-items | list | wms:inventory:read |
| wms-inventory-report | 库存报表 | /wms/inventory-report | ✅ | wms-inventory-report | stats | wms:report:read |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /wms/supplier-detail/:id | wms-supplier-detail | 供应商详情 | detail | wms:supplier:read |

### workflow (工作流)

**模块信息:**
- 路径: /workflow
- 图标: Workflow
- 权限: workflow:read
- 来源: core
- 套件: -
- 状态: online

**导航项与路由对照:**

| 导航代码 | 导航名称 | 导航路径 | 路由存在 | 路由代码 | 页面模板 | 权限 |
|----------|----------|----------|----------|----------|----------|------|
| workflow-dashboard | 仪表盘 | /workflow/dashboard | ✅ | workflow-dashboard | dashboard | workflow:read |
| workflow-definitions | 流程定义 | /workflow/definitions | ✅ | workflow-definitions | list | workflow:definition:read |
| workflow-designer | 流程设计器 | /workflow/designer | ✅ | workflow-designer | form | workflow:definition:write |
| workflow-instances | 流程实例 | /workflow/instances | ✅ | workflow-instances | list | workflow:instance:read |
| workflow-approvals | 审批任务 | /workflow/approvals | ✅ | workflow-approvals | list | workflow:approval:read |
| workflow-notification-center | 通知中心 | /workflow/notification-center | ✅ | workflow-notification-center | list | workflow:notification:read |
| workflow-monitor | 流程监控 | /workflow/monitor | ✅ | workflow-monitor | stats | workflow:monitor:read |
| workflow-statistics | 统计分析 | /workflow/statistics | ✅ | workflow-statistics | stats | workflow:statistics:read |
| workflow-templates | 流程模板 | /workflow/templates | ✅ | workflow-templates | list | workflow:template:read |
| workflow-settings | 系统设置 | /workflow/settings | ✅ | workflow-settings | settings | workflow:admin |

**仅存在于路由中（详情页/创建页/动态路由）:**

| 路由路径 | 路由代码 | 页面标题 | 模板 | 权限 |
|----------|----------|----------|------|------|
| /workflow/version-history | workflow-version-history | 版本历史 | list | workflow:definition:read |
| /workflow/instances/:id | workflow-instance-detail | 实例详情 | detail | workflow:instance:read |
| /workflow/approvals/:id | workflow-approval-detail | 审批详情 | detail | workflow:approval:read |

## 问题汇总

❌ **发现问题 1 个**

| 问题类型 | 模块 | 路径 | 详情 |
|----------|------|------|------|
| 模块缺少导航配置 | index |  | 路由模块 "index" 没有对应的导航配置文件 |

## 页面跳转逻辑验证

### 导航层级结构

导航系统采用四层模型：

1. **顶层导航（TopNav）** - 模块级导航，用于切换不同业务模块
2. **侧边栏导航（SidebarNav）** - 模块内导航，按分组展示功能项
3. **分组导航（NavGroup）** - 功能分组，如 "设计"、"运行"、"任务"、"分析"、"设置"
4. **面包屑导航（Breadcrumb）** - 路径层级，显示当前页面的完整路径

### 跳转路径确认

| 跳转场景 | 起始位置 | 目标位置 | 跳转方式 |
|----------|----------|----------|----------|
| 模块切换 | TopNav | 模块首页 | navigate(module.path) |
| 功能切换 | SidebarNav | 功能页面 | navigate(item.path) |
| 详情查看 | 列表页 | 详情页 | navigate(`${path}/${id}`) |
| 创建操作 | 列表页 | 创建页 | navigate(`${path}/create`) |
| 返回操作 | 详情页 | 列表页 | navigate(path) 或 backButton |
| Tab切换 | ModuleTabs | 子页面 | navigate(tab.path) |

### 动态路由支持

以下动态路由模式已正确配置：

| 模式 | 用途 | 示例 |
|------|------|------|
| `:id` | 详情页 | `/hrm/employees/:id` |
| `:id/edit` | 编辑页 | `/hrm/employees/:id/edit` |
| `/create` | 创建页 | `/hrm/employees/create` |
| `-detail` | 详情页 | `/wms/supplier-detail/:id` |
| `-detail` | 详情页（无参数） | `/admin/tenant-detail` |

