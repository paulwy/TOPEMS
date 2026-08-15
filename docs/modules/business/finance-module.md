# Finance 模块技术文档

## 1. 概述

Finance（财务管理）模块是 TOPEMS 平台财务域的核心服务，采用 CQRS + 事件溯源架构，覆盖凭证管理、科目管理、收付款、报表生成、成本核算、预算管理、风险管理、税务管理等场景。后端服务位于 `svc/finance/`，前端页面位于 `apps/web/src/pages/finance/`，API 客户端位于 `apps/web/src/api/finance/`。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 凭证管理 | 凭证录入、模板、自动生成规则、审核过账 |
| 科目管理 | 科目体系、辅助核算、期初余额 |
| 收付款管理 | 应收应付、收款付款、付款审批、付款记录 |
| 财务报表 | 资产负债表、利润表、现金流量表、试算平衡 |
| 成本核算 | 多维度成本分析、运营成本 |
| 预算管理 | 预算编制、执行监控、差异分析 |
| 风险管理 | 实时风险监测、反欺诈、信用评分、压力测试 |
| 税务管理 | 税务计算、税务申报 |
| 结算中心 | 内部结算、对账 |
| 合规管理 | 合规审查、审计日志 |

### 1.2 架构设计

Finance 模块是 28 个服务中唯一采用完整 CQRS + 事件溯源架构的服务 `[Data-backed]`。

```
┌─────────────────────────────────────────────────────────────┐
│                   Finance 模块架构 (CQRS)                    │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                                │
│  ├── pages/finance/              # 19 条路由对应页面         │
│  └── modules/finance/config.ts                               │
│      ├── source: plugin          # 插件模块                  │
│      ├── suite: finance          # 财务管理组                │
│      └── order: 8                                            │
├─────────────────────────────────────────────────────────────┤
│  API 层 (TypeScript)                                        │
│  └── api/finance/index.ts                                   │
│      ├── account / voucher / receivablePayable / report     │
│      ├── period / counterparty / payment / expense          │
│      ├── cashFlow / voucherTemplate / settlementCenter      │
│      ├── budget / reconciliation                            │
│      └── risk / riskV54 / riskV59 / tax                     │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL, svc/finance/)                 │
│  ├── main.rs                     # 端口 8011, api_prefix     │
│  │                               # /api/finance              │
│  ├── domain/                     # CQRS 领域层 (21 文件)     │
│  │   ├── cqrs                    # CQRS 上下文初始化         │
│  │   ├── pg_event_store          # PostgreSQL 事件存储       │
│  │   ├── event_pipeline          # 事件管道 + 处理器路由     │
│  │   ├── async_projector         # 异步投影器                │
│  │   ├── aggregates              # 聚合根                    │
│  │   ├── events / entities       # 领域事件 / 实体           │
│  │   ├── value_objects           # 值对象                    │
│  │   ├── saga                    # Saga 协调                 │
│  │   ├── materialized_view       # 物化视图                  │
│  │   ├── audit_log / compliance  # 审计 / 合规               │
│  │   └── repository              # 仓储接口                  │
│  ├── modules/                    # 业务模块                  │
│  │   ├── settlement_center/      # 结算中心                  │
│  │   ├── risk_v54 / risk_v59     # 风险管理(两代)            │
│  │   ├── forecast_v53            # 财务预测                  │
│  │   ├── tax_v56 / treasury_v58  # 税务 / 资金               │
│  │   ├── reports_v57             # 报表                      │
│  │   ├── decision_v60            # 决策支持                  │
│  │   ├── compliance_v51          # 合规审查                  │
│  │   ├── reconciliation          # 对账                      │
│  │   ├── multi_dimensional       # 多维分析                  │
│  │   ├── financial_reports       # 财务报表                  │
│  │   ├── voucher_template        # 凭证模板                  │
│  │   └── cqrs_routes             # CQRS 路由                 │
│  ├── services/finance/           # 服务层 (18 文件)          │
│  │   ├── account / voucher / payment / receivable / payable │
│  │   ├── voucher_generation / voucher_template               │
│  │   ├── report / reconciliation / periods                   │
│  │   ├── aging / approval_configs / aux_accounts             │
│  │   ├── collection / payment_record / payment_workflow      │
│  │   ├── database / u8_import                               │
│  └── shared/                                                │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 服务配置

| 配置项 | 值 | 来源 |
|--------|-----|------|
| 服务端口 | 8011 | `architecture/ports.md` `[Data-backed]` |
| API 前缀 | `/api/finance` | `svc/finance/src/main.rs` `[Data-backed]` |
| 旧版前缀 | `/api/v1/finance`, `/api/core/finance/v1` | 兼容保留 `[Data-backed]` |
| 环境变量 | `FINANCE_PORT` | `ports.md` `[Data-backed]` |
| 最大数据库连接 | 20 | `main.rs` `[Data-backed]` |
| 事件系统 | 启用 | `main.rs` `[Data-backed]` |
| RLS | 禁用 | `main.rs` `[Data-backed]` |
| 工作流客户端 | `WORKFLOW_SERVICE_URL` (默认 8000) | `main.rs` `[Data-backed]` |
| 插件类型 | service | `plugin.yaml` `[Data-backed]` |

---

## 2. CQRS 架构详解

Finance 模块通过 `domain::cqrs::init_pg_cqrs_context` 初始化 PostgreSQL 事件存储 + 异步投影器 `[Data-backed]`。写入请求经 Command → Aggregate → Event Store 持久化，异步投影器(`start_async_projection`)将事件投影到读模型（物化视图），实现读写分离。

### 2.1 事件管道

`event_pipeline` 模块（V45.0 Track A 落地）包含处理器路由器和 Saga 协调器 `[Data-backed]`。领域事件经管道分发至：
- `event_handler` — 业务事件处理器
- `async_projector` — 读模型投影
- `saga` — 跨服务 Saga 协调

### 2.2 物化视图

`pg_materialized_views` 模块管理 PostgreSQL 物化视图，为报表查询提供预聚合数据 `[Data-backed]`。`materialized_view` 模块定义视图接口和刷新策略。

---

## 3. 核心数据模型

OpenAPI 定义了 36 个 Schema `[Data-backed]`，核心模型包括：

### 3.1 凭证体系

| 模型 | 说明 |
|------|------|
| Voucher | 会计凭证主体，含编号、日期、类型、状态、明细行 |
| VoucherLine | 凭证明细行，含科目、借方、贷方、辅助核算 |
| VoucherType | 凭证类型（收/付/转） |
| VoucherStatus | 凭证状态（草稿/已提交/已审核/已过账） |
| VoucherTemplate | 凭证模板 |
| VoucherResponse | 凭证查询响应 |

### 3.2 科目体系

| 模型 | 说明 |
|------|------|
| Account | 会计科目，含编码、名称、类型、余额方向 |
| AccountType | 科目类型（资产/负债/权益/成本/损益） |
| AuxiliaryAccount | 辅助核算项 |
| AuxType | 辅助核算类型 |
| TrialBalance | 试算平衡表 |
| Period | 会计期间 |
| PeriodStatus | 期间状态（开放/关闭） |

### 3.3 收付款体系

| 模型 | 说明 |
|------|------|
| Payment | 付款单 |
| PaymentItem | 付款明细 |
| PaymentApprovalConfig | 付款审批配置 |
| ApprovalNode | 审批节点 |
| PaymentListResponse | 付款列表响应 |

### 3.4 报表体系

| 模型 | 说明 |
|------|------|
| BalanceSheet | 资产负债表 |
| BalanceItem | 资产负债表项目 |
| IncomeStatement | 利润表 |
| IncomeItem | 利润表项目 |
| CashFlowStatement | 现金流量表 |
| CashFlowItem | 现金流量表项目 |
| LedgerEntry | 分类账分录 |
| FinanceDashboardStats | 仪表盘统计 |

---

## 4. 前端路由与导航

Finance 模块共 19 条前端路由，按 5 个分组组织 `[Data-backed]`：

| 分组 | 路由 | 说明 |
|------|------|------|
| overview | dashboard | 财务仪表盘 |
| business | vouchers, voucherCreate, voucherDetail, receivablePayable, receipts, payments, expense, expenseApproval | 凭证与收付款 |
| master | ledger, approvalConfig, invoices, tax, openingBalance | 科目与配置 |
| analytics | reports, cost, assets, budget, budgetDetail, consolidation, consolidationReports | 报表与分析 |
| setting | financialAnalysis | 财务分析设置 |

默认访问权限：`finance:dashboard:read` `[Data-backed]`。

### Dashboard 统计

`FinanceDashboardStats` 提供以下聚合指标 `[Data-backed]`：
- total_vouchers / draft / submitted / approved / posted_vouchers — 凭证状态分布
- total_payments / pending_payments — 付款统计
- total_receivables / overdue_receivables — 应收与逾期
- total_payables / overdue_payables — 应付与逾期
- pending_approvals — 待审批数

---

## 5. OpenAPI Tags

14 个 API 标签分组 `[Data-backed]`：Finance / Voucher / Voucher Template / Voucher Generation Rule / Voucher Generation / Accounting / Report / Payment / Approval Config / Receivable / Payable / Cost / Reconciliation / Health。

---

## 6. 权限定义

`plugin.yaml` 定义了 6 级权限 `[Data-backed]`：

| 权限标识 | 说明 |
|---------|------|
| `finance:read` | 查询 |
| `finance:write` | 录入 |
| `finance:approve` | 审批 |
| `finance:post` | 过账 |
| `finance:report` | 报表 |
| `finance:admin` | 管理 |

---

## 7. 相关文档

- [Finance API 文档](../../api/API_FINANCE.md)
- [Finance 用户手册](../../user-guide/modules/finance.md)
- [系统架构总览](../../architecture/overview.md)
- [标准端口分配](../../architecture/ports.md)
- [事件驱动架构](../../architecture/event-driven.md)
- [Code Wiki 项目百科](../../architecture/code-wiki.md)
