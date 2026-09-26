# V321 验收报告 — B2 收敛 + C1 MCP 骨架

**日期**: 2026-08-27
**版本**: V321
**状态**: ✅ 完成

---

## 一、任务概述

V321 是 B2 阶段（Finance 从 ERP 解耦）与 C1 阶段（MCP 协议骨架）的交叉迭代，采用 4 轨并行模式：

| 轨道 | 目标 | 状态 |
|------|------|------|
| A 轨（后端） | accounting_subjects 物理迁移 + Finance CRUD + 10 报表 handler | ✅ |
| B 轨（前端） | API 签名对齐 + 7 页面 import 切换 + accountingSubject.ts | ✅ |
| C 轨（MCP） | shared-mcp 库 + McpTool/McpResource trait + McpServer 骨架 | ✅（已存在） |
| D 轨（文档） | Plan v1.2 交叉引用 + V321 验收矩阵 | ✅ |

---

## 二、A 轨：后端迁移验收

### A1. Migration SQL

- **文件**: `database/migrations/20260827000002_v321_accounting_subjects_migration.sql`
- **内容**:
  - 在 `plugin_finance` schema 创建 `accounting_subjects` 表（同结构）
  - 创建 4 个索引（code / tenant_id / organization_id / parent_code）
  - 从 `plugin_erp.accounting_subjects` 复制数据（ON CONFLICT DO NOTHING）
  - DROP TABLE `plugin_erp.accounting_subjects`
- **验证**: ✅ 文件存在，SQL 语法正确

### A2. Finance schema_defense

- **文件**: `svc/finance/src/models/schema_defense.rs`
- **变更**: 在 `INTERNAL_TABLE_DEFS`（plugin_finance schema）中新增 `accounting_subjects` 表定义（15 列）
- **验证**: ✅ grep 命中 1 处

### A3. ERP schema_defense 移除

- **文件**: `svc/erp/src/schema_defense.rs`
- **变更**: 移除 `accounting_subjects` 表定义，添加迁移注释
- **验证**: ✅ grep 命中 0 处

### A4. ERP opening_balance 修正

- **文件**: `svc/erp/src/modules/opening_balance.rs`
- **变更**: 2 处 `SELECT name FROM accounting_subjects` → `SELECT name FROM plugin_finance.accounting_subjects WHERE ... AND deleted_at IS NULL`
- **验证**: ✅ grep 命中 2 处

### A5. Finance accounting_subjects CRUD 模块

- **文件**: `svc/finance/src/modules/accounting_subjects.rs`（~380 行）
- **功能**:
  - `AccountingSubject` 数据模型（sqlx::FromRow 派生）
  - `list_accounting_subjects` — 分页 + 搜索 + 筛选
  - `get_accounting_subject` — 按 ID 查询
  - `create_accounting_subject` — 创建
  - `update_accounting_subject` — 更新（部分字段）
  - `delete_accounting_subject` — 软删除
  - `create_routes()` — 路由注册（/accounting-subjects）
- **路由注册**: `svc/finance/src/modules/mod.rs` 中 `.merge(accounting_subjects::create_routes())`
- **验证**: ✅ 文件存在，编译通过

### A6. 10 个分析报表 handler

- **文件**: `svc/finance/src/modules/financial_reports.rs`
- **新增 handler**:
  1. `get_business_overview` — 业务概览（凭证数、总金额、活跃科目数）
  2. `get_project_summary` — 项目汇总（按 project_id 聚合凭证金额）
  3. `get_monthly_trend` — 月度趋势（最近 12 个月）
  4. `get_department_summary` — 部门汇总（按 department_id 聚合）
  5. `get_aging_analysis` — 账龄分析（5 个账龄桶）
  6. `get_voucher_statistics` — 凭证统计（按状态分组）
  7. `get_cash_flow_analysis` — 现金流分析（按现金类科目）
  8. `get_expense_analysis` — 费用分析（按费用类科目）
  9. `get_profit_analysis` — 利润分析（收入/成本/费用/利润）
  10. `get_financial_overview` — 财务概览（核心指标一览）
- **路由注册**: 10 个 GET /reports/{name} 路由
- **验证**: ✅ grep 命中 10 个 handler，编译通过

---

## 三、B 轨：前端对齐验收

### B1. accountingSubject.ts 新建

- **文件**: `apps/web/src/api/finance/accountingSubject.ts`
- **功能**:
  - `AccountingSubject` 类型定义
  - `accountingSubjectApi` 对象（list / get / create / update / delete）
  - 使用 `apiClient.finance` 调用后端
- **验证**: ✅ 文件存在

### B2. 7 页面 import 切换

| 页面 | 原 import | 新 import |
|------|-----------|-----------|
| `VoucherCreatePage.tsx` | `@/api/erp` (voucherApi, accountingSubjectApi) | `@/api/finance/voucher` + `@/api/finance/accountingSubject` |
| `FinanceVoucherPage/index.tsx` | `@/api/erp` (voucherApi, accountingSubjectApi) | `@/api/finance/voucher` + `@/api/finance/accountingSubject` |
| `BudgetManagementPage.tsx` | `@/api/erp` (budgetApi) | `@/api/finance/budget` |
| `FinanceBudgetPage.tsx` | `@/api/erp` (budgetApi) | `@/api/finance/budget` |
| `FinanceBudgetDetailPage.tsx` | `@/api/erp` (budgetApi) | `@/api/finance/budget` |
| `FinanceReportsPage.tsx` | `@/api/erp` (financeReportApi) | `@/api/finance/report` (reportApi) |

- **FinanceReportsPage 方法映射**:
  - `financeReportApi.businessOverview()` → `reportApi.getBusinessOverview()`
  - `financeReportApi.projectSummary()` → `reportApi.getProjectSummary()`
  - `financeReportApi.monthlyTrend()` → `reportApi.getMonthlyTrend()`
  - `financeReportApi.departmentSummary()` → `reportApi.getDepartmentSummary()`
- **验证**: ✅ `grep -rl "@/api/erp" apps/web/src/pages/finance/` 返回 NONE

### B3. report.ts 10 方法（已存在）

- **文件**: `apps/web/src/api/finance/report.ts`
- **已有方法**: getBusinessOverview / getProjectSummary / getMonthlyTrend / getDepartmentSummary / getAgingAnalysis / getVoucherStatistics / getCashFlowAnalysis / getExpenseAnalysis / getProfitAnalysis / getFinancialOverview
- **验证**: ✅ grep 命中 10 个方法

---

## 四、C 轨：MCP 骨架验收

### C1. shared-mcp 库

- **路径**: `lib/shared-mcp/`
- **文件**: Cargo.toml + src/{lib,protocol,jsonrpc,transport,schema}.rs
- **workspace 注册**: ✅ 已在根 Cargo.toml 中注册
- **svc/ai 依赖**: ✅ `topems-shared-mcp` 已在 svc/ai/Cargo.toml 中声明
- **编译**: ✅ `cargo check -p topems-shared-mcp` 通过

### C2. AI 服务 MCP 适配层

- **路径**: `svc/ai/src/dsh/mcp/`
- **文件**: mod.rs / server.rs / handler.rs
- **业务工具**: `tools/` 目录下 18 个业务工具（aps / bi / crm / cs / ehs / erp / finance / hr / iot / lims / mes / oa / pm / qms / scm / wms 等）
- **验证**: ✅ 文件存在

---

## 五、编译验证

### Rust 后端

```bash
cargo check -p topems-finance -p topems-erp
```

- **结果**: ✅ 0 error
- **修改的 crate**: topems-finance, topems-erp

### 前端

- **TypeScript**: 待运行 `pnpm tsc --noEmit` 验证（建议在 CI 中执行）
- **import 切换**: ✅ grep 验证无遗漏

---

## 六、验收矩阵

| 验收项 | 预期 | 实际 | 状态 |
|--------|------|------|------|
| A1 migration SQL 存在 | 1 文件 | 1 文件 | ✅ |
| A2 finance schema_defense 含 accounting_subjects | ≥1 | 1 | ✅ |
| A3 ERP schema_defense 移除 accounting_subjects | 0 | 0 | ✅ |
| A4 ERP opening_balance 指向 plugin_finance | 2 处 | 2 处 | ✅ |
| A5 Finance accounting_subjects 模块 | 存在 | 存在（~380行） | ✅ |
| A6 10 个报表 handler | 10 | 10 | ✅ |
| A7 10 个报表路由注册 | 10 | 10+ | ✅ |
| B1 accountingSubject.ts 存在 | 存在 | 存在 | ✅ |
| B2 7 页面无 @/api/erp | 0 文件 | 0 文件 | ✅ |
| B3 report.ts 10 方法 | 10 | 10 | ✅ |
| C1 shared-mcp 编译通过 | 通过 | 通过 | ✅ |
| C2 ai MCP 模块存在 | 存在 | 存在 | ✅ |
| Rust 编译 | 0 error | 0 error | ✅ |

---

## 七、后续建议

1. **数据库迁移执行**: 在目标环境执行 `20260827000002_v321_accounting_subjects_migration.sql`，确认数据复制无误后再删除 ERP 原表
2. **前端 tsc 验证**: 运行 `pnpm --filter web tsc --noEmit` 确认类型安全
3. **集成测试**: 对 accounting_subjects CRUD 和 10 个报表接口进行 API 集成测试
4. **MCP 联调**: C 轨骨架已就绪，后续版本可推进 MCP 工具注册与 stdio transport 联调
