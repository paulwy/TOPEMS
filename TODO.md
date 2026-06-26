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
