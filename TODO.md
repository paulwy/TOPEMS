# 导航与路由路径修复任务清单

> 来源：全面路径有效性分析（2026-06-25）
> 修复完成时间：2026-06-25
> 涉及修改文件：34 个

---

## 修复结果总览

| 任务 | 状态 | 修复数量 |
|------|------|----------|
| 1. 修正 navigation-v2.ts 单复数和 admin 前缀 | completed | ~131 处路径替换 |
| 2. 修正 App.tsx /config-debug 重定向 | completed | 1 处 |
| 3. 清理 Dashboard 页面无效跳转 | completed | 27 处硬编码跳转修正 |
| 4. 修正模板字符串动态跳转 | completed | 17 处动态路径修正 |
| 5. 补充缺失路由或移除无效跳转 | completed | 8 处无效跳转移除/修正 |
| 6. 补全 finance/iam 等导航菜单 | completed | 新增 2 个模块导航（~30 项） |

---

## 验证结果

| 检查项 | 修复前无效数 | 修复后无效数 |
|--------|-------------|-------------|
| App.tsx 重定向 | 1 | **0** |
| 导航配置 (navigation-v2.ts) | 56 | **0** |
| 页面硬编码跳转 | 43 | **0** |
| 模板字符串动态跳转（不含查询参数） | 34 | **0** |

---

## 修改文件列表（34 个）

### 核心配置
- `apps/web/src/App.tsx` — /config-debug 重定向修正
- `apps/web/src/config/navigation-v2.ts` — 131+ 处路径修正 + finance/iam 导航补全

### Dashboard 页面（13 个）
- `pages/ai/DashboardPage.tsx`
- `pages/crm/DashboardPage.tsx`
- `pages/erp/DashboardPage.tsx`
- `pages/finance/DashboardPage.tsx`
- `pages/gis/DashboardPage.tsx`
- `pages/hrm/DashboardPage.tsx`
- `pages/mes/DashboardPage.tsx`
- `pages/pm/DashboardPage.tsx`
- `pages/scm/DashboardPage.tsx`
- `pages/wms/DashboardPage.tsx`
- `pages/rs/DashboardPage.tsx`

### 详情页/列表页（11 个）
- `pages/crm/ContactDetailPage.tsx`
- `pages/crm/OpportunityDetailPage.tsx`
- `pages/finance/VoucherDetailPage.tsx`
- `pages/hrm/HrmContractDetailPage.tsx`
- `pages/hrm/HrmEmployeeDetailPage.tsx`
- `pages/pm/PmContractDetailPage.tsx`
- `pages/pm/PmResourcePage.tsx`
- `pages/report/ReportListPage.tsx`
- `pages/srm/SrmContractPage.tsx`
- `pages/srm/SrmEvaluationPage.tsx`
- `pages/srm/SrmSupplierPage.tsx`

### Workflow 相关（5 个）
- `pages/workflow/FlowInstanceListPage.tsx`
- `pages/workflow/FlowNotificationCenter.tsx`
- `pages/workflow/FlowVersionHistoryPage.tsx`
- `pages/workflow/FlowWorkflowPage.tsx`
- `pages/templates/WorkflowDesignerPage.tsx`

### 其他（4 个）
- `components/ai/FloatingAIHelper.tsx`
- `pages/admin/CompanyStructurePage.tsx`
- `pages/finance/ConsolidationReportsPage.tsx`
- `pages/finance/ConsolidationScopePage.tsx`
- `pages/fixed/VoucherTemplatePage.tsx`

---

## 主要修复内容

### 一、navigation-v2.ts（131+ 处）
- **单复数统一**：employee→employees, customer→customers, contact→contacts 等 25 处
- **admin→iam**：/admin/audit, /admin/users, /admin/roles, /admin/permissions, /admin/system
- **路径对齐**：/mes/dashboard→/mes/board, /gis/dashboard→/gis/map, /monitor/performance→/monitor/metrics
- **缺失路径修正**：/knowledge→/knowledge-base, /erp/finance/voucher→/finance/vouchers, /wms/inbound→/wms/inbound-orders 等
- **新增 finance 导航菜单**：凭证、总账、应收应付、发票税务、预算、报表等 18 项
- **新增 iam 导航菜单**：用户、角色、权限、审计、字典、数据库、迁移、调试、插件等 11 项

### 二、App.tsx（1 处）
- `/config-debug` → `/debug` 改为 `/system/config-debug`

### 三、Dashboard 快捷入口（27 处）
- 移除或修正了 ai/crm/erp/finance/gis/hrm/mes/pm/scm/wms/rs 等模块 Dashboard 中指向不存在路由的按钮/链接

### 四、模板字符串动态跳转（17 处）
- `/crm/contact/${id}/edit` → `/crm/contacts/${id}`
- `/crm/opportunity/${id}/edit` → `/crm/opportunities/${id}`
- `/finance/vouchers/${id}` → `/finance/voucher/${id}`
- `/hrm/contracts/${id}/renew` → `/hrm/contract/${id}`
- `/hrm/employees/${id}/transfer` → `/hrm/employee/${id}`
- `/flow/designer?id=...` → `/flow/definitions`
- `/workflow-designer?id=...` → `/flow/definitions`
- 等

---

## 未处理项（需后续决策）

以下项目因**对应页面组件不存在**，未添加路由：
- `/portal/home` — PortalHomePage 不存在
- `/wms/inbound-orders/create` — 创建页面不存在
- `/wms/outbound-orders/create` — 创建页面不存在
- `/pm/resources/create` — 创建页面不存在
- `/srm/contracts/create` — 创建页面不存在
- `/srm/evaluations/create` — 创建页面不存在
- `/mes/orders/create` — 创建页面不存在
- `/report/reports/create` — 创建页面不存在

**建议**：如业务需要这些创建功能，需先开发对应页面组件，再添加路由。

---

*报告生成时间: 2026-06-25*

---

## 第二轮迭代修复（2026-06-25 续）

### 新增任务与结果

| 任务 | 状态 | 修复/新增数量 |
|------|------|---------------|
| 7. SystemManagementPage 路径修正 | completed | 7 处 admin→iam |
| 8. DashboardPage 系统/报表/合同路径修正 | completed | 3 处 |
| 9. MobileHomePage 路径修正 | completed | 3 处（employee/wms路径） |
| 10. CRM 导航菜单补全 | completed | 新增 6 项（分群/评分/漏斗/预测/推荐/账单） |
| 11. QMS 导航菜单补全 | completed | 新增 3 项（不合格品/改进/检验记录/APQP） |
| 12. WMS 导航菜单补全 | completed | 新增 2 项（仓库/盘点） |
| 13. HRM 导航菜单补全 | completed | 新增 7 项（公司/组织/职位/合同/调薪/培训/报表） |

### 最终验证结果

| 检查项 | 数量 |
|--------|------|
| 全站静态跳转路径总数 | 194 |
| 无效路径数 | **0** |
| 路由总数 | 278 |

### 各模块导航覆盖率（修复后）

| 模块 | 导航项 | 路由数 | 覆盖率 |
|------|--------|--------|--------|
| IAM | 10 | 10 | 100% |
| MES | 5 | 5 | 100% |
| HRM | 15 | 15 | 100% |
| QMS | 6 | 6 | 100% |
| FINANCE | 17 | 19 | 89% |
| WMS | 5 | 6 | 83% |
| CRM | 10 | 12 | 83% |
| ERP | 5 | 6 | 83% |
| EHS | 5 | 6 | 83% |
| LIMS | 4 | 5 | 80% |

### 本轮新增修改文件

- `apps/web/src/pages/admin/SystemManagementPage.tsx` — 7 处 /admin/* → /iam/*
- `apps/web/src/pages/shared/DashboardPage.tsx` — 3 处路径修正
- `apps/web/src/pages/mobile/MobileHomePage.tsx` — 3 处路径修正
- `apps/web/src/config/navigation-v2.ts` — 新增 18 个导航菜单项（CRM+QMS+WMS+HRM）

### 说明

- **FINANCE 覆盖率 89%**：缺 `/finance/financial-reports`（与 `/finance/reports` 指向同一组件，疑似别名）和 `/finance/voucher/create`（子页面，通常从列表页进入）
- **TypeScript 编译错误**：项目预存 47 个组件接口类型不匹配错误，与本次导航路径修复无关
- **移动端路径**：全部有效，跳转路径与路由完全匹配

---

## 第三轮：NavigationRegistry 导航系统全面分析（2026-06-26）

> 分析对象：`apps/web/src/lib/NavigationRegistry.ts`（新导航系统）
> 验证方法：页面文件 ↔ 路由配置 ↔ 导航注册 三方交叉比对

---

### 一、总体统计

| 指标 | 数量 | 说明 |
|------|------|------|
| 路由路径总数 | 274 | 全部页面组件存在 ✅ |
| 页面文件总数 | 255 | 排除测试文件和非页面组件 |
| 有路由且有页面 | 274 | 100% 匹配 ✅ |
| 有路由无页面 | 0 | 全部有效 ✅ |
| **有页面无路由** | **7** | ⚠️ 页面已开发但未配置路由 |
| 导航路径数（去重） | ~182 | top_nav + sidebar_nav + module_tabs |
| **导航指向不存在路由** | **37** | 🔴 点击会 404 |
| **有路由但无导航入口** | ~30+ | 🟡 主要功能页面无法通过菜单访问 |

---

### 二、🔴 P0 高优先级（必须修复 - 导致 404 错误）

> 导航项指向不存在的路由，用户点击后直接 404

#### 2.1 PM 项目管理模块（5条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| PM-01 | `/pm/tasks` | 路由不存在 | 新增任务管理页面路由 或 移除导航项 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| PM-02 | `/pm/gantt` | 路由不存在 | 新增甘特图页面路由 或 移除导航项 | 同上 | pending |
| PM-03 | `/pm/risk` | 路由不存在 | 新增风险管理页面路由 或 移除导航项 | 同上 | pending |
| PM-04 | `/pm/contract` | 单复数不一致 | 改为 `/pm/contracts` | 同上 | pending |
| PM-05 | `/pm/timeline` | 路由不存在 | 新增时间线页面路由 或 移除导航项 | 同上 | pending |

#### 2.2 MES 生产执行模块（5条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| MES-01 | `/mes/order` | 单复数不一致 | 改为 `/mes/orders` | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| MES-02 | `/mes/process` | 单复数不一致 | 改为 `/mes/processes` | 同上 | pending |
| MES-03 | `/mes/workstation` | 单复数不一致 | 改为 `/mes/workstations` | 同上 | pending |
| MES-04 | `/mes/equipment` | 路由不存在 | 新增设备管理页面路由 或 移除导航项 | 同上 | pending |
| MES-05 | `/mes/quality` | 路由不存在 | 新增质量管理页面路由 或 移除导航项 | 同上 | pending |

#### 2.3 Finance 财务管理模块（5条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| FIN-01 | `/finance/voucher` | 单复数不一致 | 改为 `/finance/vouchers` | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| FIN-02 | `/finance/report` | 单复数不一致 | 改为 `/finance/reports` | 同上 | pending |
| FIN-03 | `/finance/asset` | 单复数不一致 | 改为 `/finance/assets` | 同上 | pending |
| FIN-04 | `/finance/account` | 路由不存在 | 新增科目管理页面路由 或 移除导航项 | 同上 | pending |
| FIN-05 | `/finance/arap` | 路由拆分 | 改为 `/finance/receivable` 和 `/finance/payable` | 同上 | pending |

#### 2.4 SCM 供应链模块（4条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| SCM-01 | `/scm/purchase-order` | 单复数不一致 | 改为 `/scm/purchase-orders` | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| SCM-02 | `/scm/inventory` | 路由不存在 | 库存管理在 WMS 模块，应跳转 `/wms/inventory` 或移除 | 同上 | pending |
| SCM-03 | `/scm/warehouse` | 路由不存在 | 仓储管理在 WMS 模块，应跳转 `/wms/warehouses` 或移除 | 同上 | pending |
| SCM-04 | `/scm/logistics` | 路由不存在 | 新增物流追踪页面路由 或 移除导航项 | 同上 | pending |

#### 2.5 AI 智能助手模块（2条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| AI-01 | `/ai/analytics` | 路由不存在 | 新增数据分析页面路由 或 移除导航项 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| AI-02 | `/ai/workflows` | 路由不存在 | 新增工作流页面路由 或 移除导航项 | 同上 | pending |

#### 2.6 GIS 地理信息模块（2条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| GIS-01 | `/gis/layers` | 路由不存在 | 新增图层管理页面路由 或 移除导航项 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| GIS-02 | `/gis/analysis` | 路由不存在 | 新增空间分析页面路由 或 移除导航项 | 同上 | pending |

#### 2.7 IM 即时通讯模块（3条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| IM-01 | `/im/chats` | 路由不存在 | 新增聊天列表页面路由 或 移除导航项 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| IM-02 | `/im/contacts` | 路由不存在 | 新增联系人页面路由 或 移除导航项 | 同上 | pending |
| IM-03 | `/im/groups` | 路由不存在 | 新增群组管理页面路由 或 移除导航项 | 同上 | pending |

#### 2.8 ERP 企业资源模块（3条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| ERP-01 | `/erp/finance` | 路由不存在 | 跳转到 `/finance`（财务管理在 finance 模块） | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| ERP-02 | `/erp/inventory` | 路由不存在 | 跳转到 `/wms/inventory`（库存管理在 WMS 模块） | 同上 | pending |
| ERP-03 | `/erp/sales` | 父级路由缺失 | 有子页面 `/erp/sales/order`，需确认是否需要父级重定向 | 同上 | pending |

#### 2.9 CRM 客户关系模块（2条）

| 序号 | 导航路径 | 问题类型 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| CRM-01 | `/crm/activities` | 路由不存在 | 新增活动管理页面路由 或 移除导航项 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| CRM-02 | `/crm/reports` | 路由不存在 | 新增报表页面路由 或 移除导航项 | 同上 | pending |

#### 2.10 App.tsx 重复路由（1条）

| 序号 | 问题描述 | 影响范围 | 建议修复方案 | 涉及文件 | 状态 |
|------|----------|----------|-------------|----------|------|
| APP-01 | dashboardRoutes 被渲染两次 | React 警告（重复 key） | 删除第 190-207 行的手动渲染，保留 `renderRoutes(dashboardRoutes)` | [App.tsx](file:///Users/air/TOPEMS/apps/web/src/App.tsx#L190-L209) | pending |

**P0 小计：37 + 1 = 38 项**

---

### 三、🟡 P1 中优先级（功能缺失 - 影响用户访问）

#### 3.1 有页面但无路由（7个页面）

> 页面组件已开发完成，但未在路由配置中注册，用户无法通过 URL 直接访问

| 序号 | 页面文件 | 模块 | 建议路由路径 | 涉及文件 | 状态 |
|------|----------|------|-------------|----------|------|
| NOPAGE-01 | `AccountManagementPage.tsx` | admin/iam | `/iam/accounts` 或从路由移除该页面 | [routes/iam.ts](file:///Users/air/TOPEMS/apps/web/src/routes/iam.ts) | pending |
| NOPAGE-02 | `BankAccountManagementPage.tsx` | admin/iam | `/iam/bank-accounts` 或从路由移除该页面 | 同上 | pending |
| NOPAGE-03 | `DocumentsPage.tsx` | common | `/common/documents`（与 DocumentCenterPage 功能重叠？） | [routes/common.ts](file:///Users/air/TOPEMS/apps/web/src/routes/common.ts) | pending |
| NOPAGE-04 | `VoucherTemplatePage.tsx` | fixed/finance | `/finance/voucher-templates` 或 `/fixed/voucher-templates` | [routes/finance.ts](file:///Users/air/TOPEMS/apps/web/src/routes/finance.ts) | pending |
| NOPAGE-05 | `QualityTraceabilityPage.tsx` | mes | `/mes/quality-traceability` | [routes/mes.ts](file:///Users/air/TOPEMS/apps/web/src/routes/mes.ts) | pending |
| NOPAGE-06 | `WIPPage.tsx` | mes | `/mes/wip`（在制品管理） | 同上 | pending |
| NOPAGE-07 | `ErrorPage.tsx` | shared | 通常由路由框架自动调用，不需手动注册 | - | 无需处理 |

#### 3.2 主要功能页面缺失导航入口

> 路由和页面都存在，但侧边栏导航没有入口，用户无法通过菜单访问

**HRM 人力资源模块（缺失最严重 - 9项）**

| 序号 | 页面路径 | 页面名称 | 涉及文件 | 状态 |
|------|----------|----------|----------|------|
| HRM-NAV-01 | `/hrm/companies` | 公司管理 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| HRM-NAV-02 | `/hrm/departments` | 部门管理 | 同上 | pending |
| HRM-NAV-03 | `/hrm/organization` | 组织架构图 | 同上 | pending |
| HRM-NAV-04 | `/hrm/positions` | 职位管理 | 同上 | pending |
| HRM-NAV-05 | `/hrm/attendance` | 考勤管理 | 同上 | pending |
| HRM-NAV-06 | `/hrm/leave` | 请假管理 | 同上 | pending |
| HRM-NAV-07 | `/hrm/contracts` | 合同管理 | 同上 | pending |
| HRM-NAV-08 | `/hrm/payroll` | 薪酬管理 | 同上 | pending |
| HRM-NAV-09 | `/hrm/reports` | 人事报表 | 同上 | pending |

**Finance 财务管理模块（12项）**

| 序号 | 页面路径 | 页面名称 | 涉及文件 | 状态 |
|------|----------|----------|----------|------|
| FIN-NAV-01 | `/finance/ledger` | 总账管理 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| FIN-NAV-02 | `/finance/invoices` | 发票管理 | 同上 | pending |
| FIN-NAV-03 | `/finance/tax` | 税务管理 | 同上 | pending |
| FIN-NAV-04 | `/finance/expense` | 费用管理 | 同上 | pending |
| FIN-NAV-05 | `/finance/cost` | 成本管理 | 同上 | pending |
| FIN-NAV-06 | `/finance/receivable` | 应收管理 | 同上 | pending |
| FIN-NAV-07 | `/finance/payable` | 应付管理 | 同上 | pending |
| FIN-NAV-08 | `/finance/receipts` | 收款管理 | 同上 | pending |
| FIN-NAV-09 | `/finance/payments` | 付款管理 | 同上 | pending |
| FIN-NAV-10 | `/finance/consolidation` | 合并报表 | 同上 | pending |
| FIN-NAV-11 | `/finance/opening-balance` | 期初余额 | 同上 | pending |
| FIN-NAV-12 | `/finance/budget` | 预算管理 | 同上 | pending |

**CRM 客户关系模块（5项）**

| 序号 | 页面路径 | 页面名称 | 涉及文件 | 状态 |
|------|----------|----------|----------|------|
| CRM-NAV-01 | `/crm/contacts` | 联系人管理 | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| CRM-NAV-02 | `/crm/interactions` | 互动管理 | 同上 | pending |
| CRM-NAV-03 | `/crm/billing` | 账单管理 | 同上 | pending |
| CRM-NAV-04 | `/crm/scoring` | 客户评分 | 同上 | pending |
| CRM-NAV-05 | `/crm/forecast` | 销售预测 | 同上 | pending |

**其他模块（5项）**

| 序号 | 页面路径 | 页面名称 | 模块 | 涉及文件 | 状态 |
|------|----------|----------|------|----------|------|
| OTHER-NAV-01 | `/scm/purchase-items` | 采购物料 | SCM | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| OTHER-NAV-02 | `/scm/evaluations` | 供应商评估 | SCM | 同上 | pending |
| OTHER-NAV-03 | `/gis/fence` | 地理围栏 | GIS | 同上 | pending |
| OTHER-NAV-04 | `/gis/tracking` | 轨迹追踪 | GIS | 同上 | pending |
| OTHER-NAV-05 | `/bi/analytics` | 数据分析 | BI | 同上 | pending |

**P1 小计：7 + 9 + 12 + 5 + 5 = 38 项**

---

### 四、🟢 P2 低优先级（优化改进 - 提升一致性）

#### 4.1 侧边栏与标签页导航不一致

> 同一模块的 sidebar_nav 和 module_tabs 内容/数量不一致

| 模块 | sidebar_nav 数量 | module_tabs 数量 | 差异说明 | 涉及文件 | 状态 |
|------|-----------------|-----------------|----------|----------|------|
| SRM | 3 | 7 | tabs 多了 evaluations/performance/orders/contracts/finance | [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | pending |
| EHS | 2 | 5 | tabs 多了 checks/drills/incident/plan | 同上 | pending |
| LIMS | 2 | 4 | tabs 多了 processes/tasks/instruments | 同上 | pending |
| QMS | 2 | 6 | tabs 多了 checks/issues/improvements/audit/apqp | 同上 | pending |
| PDM | 8 | 5 | sidebar 多了 batch/step/product-config | 同上 | pending |
| Workflow | 12 | 8 | sidebar 多了 history/definition/flow-designer/templates | 同上 | pending |
| RS | 11 | 8 | sidebar 多了 milestones/reviews/settings | 同上 | pending |

#### 4.2 重复路由/冗余路由

> 多个路由指向同一个页面组件，可能是别名或冗余

| 路由1 | 路由2 | 共用组件 | 建议 | 涉及文件 | 状态 |
|-------|-------|----------|------|----------|------|
| `/finance/reports` | `/finance/financial-reports` | FinanceReportsPage | 保留一个，另一个做重定向 | [routes/finance.ts](file:///Users/air/TOPEMS/apps/web/src/routes/finance.ts) | pending |
| `/bi` | `/bi/dashboard` | BIDashboardPage | 保留一个，另一个做重定向 | [routes/bi.ts](file:///Users/air/TOPEMS/apps/web/src/routes/bi.ts) | pending |
| `/gis` | `/gis/map` | DashboardPage | 保留一个，另一个做重定向 | [routes/gis.ts](file:///Users/air/TOPEMS/apps/web/src/routes/gis.ts) | pending |
| `/monitor` | `/monitor/dashboard` | MonitorDashboardPage | 保留一个，另一个做重定向 | [routes/monitor.ts](file:///Users/air/TOPEMS/apps/web/src/routes/monitor.ts) | pending |
| `/pdm` | `/pdm/stats` | PdmStatsPage | 保留一个，另一个做重定向 | [routes/pdm.ts](file:///Users/air/TOPEMS/apps/web/src/routes/pdm.ts) | pending |
| `/mobile` | `/mobile/home` | MobileHomePage | 保留一个，另一个做重定向 | [routes/mobile.ts](file:///Users/air/TOPEMS/apps/web/src/routes/mobile.ts) | pending |
| `/mes` | `/mes/board` | DashboardPage | 保留一个，另一个做重定向 | [routes/mes.ts](file:///Users/air/TOPEMS/apps/web/src/routes/mes.ts) | pending |

#### 4.3 废弃导航配置清理

> 项目中存在两套导航配置，旧系统已废弃但仍被引用

| 项目 | 说明 | 涉及文件 | 状态 |
|------|------|----------|------|
| navigation-v2.ts | 已标注 @deprecated，仍被 15 个文件引用 | [navigation-v2.ts](file:///Users/air/TOPEMS/apps/web/src/config/navigation-v2.ts) | pending |

**建议**：逐步将引用迁移到 NavigationRegistry，完成后删除旧文件

---

### 五、修复计划建议

#### 第一阶段：P0 紧急修复（预计 2-3 天）
- [ ] 修复 37 条导航指向不存在路由的问题
- [ ] 修复 App.tsx 中 dashboardRoutes 重复渲染问题
- [ ] 验证：全站导航点击不出现 404

#### 第二阶段：P1 功能补全（预计 3-5 天）
- [ ] 为 7 个已开发页面添加路由配置
- [ ] 补全 HRM 模块导航菜单（9 项）
- [ ] 补全 Finance 模块导航菜单（12 项）
- [ ] 补全 CRM、SCM、GIS、BI 等模块缺失导航
- [ ] 验证：主要功能页面可通过菜单访问

#### 第三阶段：P2 优化改进（预计 2-3 天）
- [ ] 统一各模块 sidebar_nav 与 module_tabs 一致性
- [ ] 清理重复路由，统一使用重定向
- [ ] 迁移废弃的 navigation-v2.ts 引用
- [ ] 验证：导航结构清晰一致

---

### 六、验证工具

重新运行全面校验：

```bash
node /Users/air/TOPEMS/analyze-navigation-routes.js
```

数据文件：
- 路由快照：[routes_result.json](file:///Users/air/TOPEMS/routes_result.json)
- 导航注册表：[NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts)
- 路由配置目录：[routes/](file:///Users/air/TOPEMS/apps/web/src/routes)

---

*第三轮分析完成时间: 2026-06-26*

---

## 第四轮：后端 API vs 前端功能 全面对比分析（2026-06-26）

> 分析对象：后端 25 个服务 API vs 前端页面/路由/API
> 核心目标：找出后端有完整 API 但前端未实现页面的功能模块，补充缺失页面

---

### 一、总体统计

| 指标 | 数量 | 说明 |
|------|------|------|
| 后端服务模块数 | 25 个 | ai, analytics, crm, ehs, erp, gis, hrm, lims, mes, mobile, monitor, pdm, pm, qms, report, rs, scm, srm, wms, unified-core, shared, integration, quality-assurance, manufacturing, config-center |
| 后端总 API 数 | 1,931 个 | 含 1,530 个 /api/ 前缀业务接口 |
| 前端 API 函数数 | 1,288 个 | 28 个模块 |
| 前端页面路由数 | 286 条 | 27 个模块 |
| 前端页面文件数 | 250 个 | 35 个模块 |

### 模块状态分布

| 状态 | 模块数 | 模块列表 |
|------|--------|----------|
| 🔴 严重缺失 | 4 个 | manufacturing, mes, erp, shared |
| 🟡 部分缺失 | 4 个 | unified-core, analytics, mobile, monitor |
| 🟢 基本完整 | 16 个 | qms, ehs, lims, ai, wms, quality-assurance, rs, crm, integration, pdm, hrm, scm, pm, gis, report, srm |
| ⚪ 无业务 API | 1 个 | config-center |

---

### 二、已完成修复（本轮）

#### P0 严重缺失模块补充

**1. MES 制造执行系统**

| 新增页面 | 路由路径 | 对应后端 API |
|----------|----------|-------------|
| ProductionSchedulePage | `/mes/schedules` | 生产排程 CRUD + 甘特图 |
| EquipmentManagementPage | `/mes/equipment` | 设备管理 CRUD + 维护 |
| EquipmentOEEPage | `/mes/equipment-oee` | 设备 OEE 分析 |
| MaterialBOMPage | `/mes/boms` | 物料 BOM 管理 |
| MaterialIssuePage | `/mes/material-issues` | 物料领用管理 |
| MaterialReturnPage | `/mes/material-returns` | 物料退库管理 |

> MES 模块页面从 9 个 → 15 个，路由从 8 条 → 15 条，导航从 4 项 → 13 项

**2. ERP 企业资源计划**

| 新增页面 | 路由路径 | 对应后端 API |
|----------|----------|-------------|
| FinancialReportPage | `/erp/financial-reports` | 资产负债表/利润表/现金流量表 |
| VoucherManagementPage | `/erp/vouchers` | 会计凭证管理 + 审核 + 记账 |
| AuditLogPage | `/erp/audit-logs` | 审计日志查询 |
| DictManagementPage | `/erp/dict` | 数据字典管理 |
| DatabaseManagementPage | `/erp/database` | 数据库表管理 + 备份恢复 |

> ERP 模块页面新增 5 个，路由新增 6 条，导航从 4 项 → 9 项

#### 本轮修改文件清单

| 文件 | 修改内容 |
|------|----------|
| [apps/web/src/pages/mes/](file:///Users/air/TOPEMS/apps/web/src/pages/mes) | 新增 6 个页面文件 |
| [apps/web/src/pages/erp/](file:///Users/air/TOPEMS/apps/web/src/pages/erp) | 新增 5 个页面文件 |
| [routes/mes.ts](file:///Users/air/TOPEMS/apps/web/src/routes/mes.ts) | 新增 7 条路由 |
| [routes/erp.ts](file:///Users/air/TOPEMS/apps/web/src/routes/erp.ts) | 新增 6 条路由 |
| [NavigationRegistry.ts](file:///Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts) | MES 导航 4→13 项，ERP 导航 4→9 项 |

---

### 三、待补充功能（后续迭代）

#### P1 高优先级

| 模块 | 缺失功能 | 后端 API 数 | 说明 |
|------|----------|------------|------|
| **unified-core** | 工作流引擎 | 84 个 | 工作流定义、实例、审批任务、流程模板 |
| **unified-core** | 文件服务 | 32 个 | 文件上传下载、版本管理、分享 |
| **unified-core** | 插件市场 | 24 个 | 插件浏览、安装、配置、更新 |
| **unified-core** | 租户管理 | 11 个 | 租户 CRUD、配置、状态管理 |
| **analytics** | BI 高级功能 | ~50 个 | 行级权限、数据钻取、多维分析、预测分析 |
| **mobile** | 移动功能 | ~35 个 | 移动审批、推送通知、条码扫描 |

#### P2 中优先级

| 模块 | 缺失功能 | 后端 API 数 | 说明 |
|------|----------|------------|------|
| **monitor** | 监控告警 | ~18 个 | 告警规则、告警历史、通知渠道 |
| **shared** | 共享服务 | 7 个 | 序列号生成、映射管理、数据同步 |
| **ai** | 高级功能 | ~30 个 | 向量搜索、多模态、推荐系统 |

---

### 四、分析数据文件

- 📄 完整报告：[后端前端功能对比分析报告.md](file:///Users/air/TOPEMS/后端前端功能对比分析报告.md)
- 📊 后端路由：[svc/routes_extracted.json](file:///Users/air/TOPEMS/svc/routes_extracted.json)
- 📊 前端分析：[frontend_analysis.json](file:///Users/air/TOPEMS/frontend_analysis.json)
- 📊 差距详情：[backend_frontend_gap_detailed.json](file:///Users/air/TOPEMS/backend_frontend_gap_detailed.json)

---

*第四轮分析完成时间: 2026-06-26*
