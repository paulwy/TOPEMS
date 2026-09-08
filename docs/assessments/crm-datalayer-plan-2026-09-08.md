# CRM 数据层落地专项方案（评审稿）

> 状态：待评审 · 日期：2026-09-08 · 编制：审计批次 ⑥ 后续专项
> 关联报告：`docs/assessments/frontend-backend-mapping-assessment-2026-09-08.html`

## 1. 问题现状（已核实）

- **crm schema 在 95 个迁移中 0 张表**（`000_create_schemas.sql` 仅建库；`grep -rln "crm.customers|crm.opportunities"` 无命中；crm 服务无运行时建表）。
- **23 个 crm 模块共引用 16 张 `crm.*` 表，全部不存在**——不止 6 个被注释模块（customer_scoring/customer_segmentation/sales_forecast/sales_funnel/customer_profile/customer_recommendation），**挂载中的真实模块（customer/contact/opportunity/interaction/audit/billing/tag/rfm/aftersales）同样无表**。
- 前端 21 个 crm 页面 + 17 个 API 文件 + 后端 23 个模块构成完整功能面，**数据层零落地**；生产环境所有 crm 查询必然报错（relation does not exist），页面依赖 `useCrmMock`（受控演示开关）或空态兜底。
- 结论：crm 是"全功能面 + 零数据层"的系统性缺口，非单点 404。

## 2. 表清单（16 张，字段取自各模块 INSERT/SELECT 列，类型待按 bind 类型精确定稿）

### 第一批 · 核心业务表（挂载模块直接依赖，8 张）

| 表 | 使用模块 | 核心字段（INSERT 列） | 优先级 |
|---|---|---|---|
| `crm.customers` | customer/customer_profile/customer_recommendation/customer_scoring/customer_segmentation/dashboard/rfm/tag（8） | id, tenant_id, org_id, name, industry, customer_type, owner_id, rating, region, tags, approval_status, created_at, updated_at | P0 |
| `crm.contacts` | contact/customer_profile/dashboard（3） | id, tenant_id, org_id, customer_id, first_name, last_name, email, phone, position, status, notes, approval_status, created_at, updated_at | P0 |
| `crm.opportunities` | opportunity/customer_profile/customer_scoring/dashboard/sales_funnel（5） | id, tenant_id, org_id, opp_no, name, customer_id, customer_name, value, stage, priority, probability, close_date, owner_id, status, notes, created_at, updated_at | P0 |
| `crm.interactions` | interaction/customer_profile/customer_scoring/dashboard（4） | **核对结论：建表（有写入方）**。event_handlers/mod.rs:135/202 INSERT（id/org_id/customer_id/interaction_type/subject/content/status/scheduled_at/created_at/updated_at） | P0 |
| `crm.customer_scores` | customer_scoring/customer_segmentation/customer_profile（3） | id, tenant_id, customer_id, customer_name, score, score_level, scoring_date, factors, trend, last_score, created_at, updated_at | P1（6 模块重挂依赖） |
| `crm.customer_segments` | customer_segmentation（1） | id, name, description, criteria, customer_count, created_at, updated_at | P1 |
| `crm.sales_forecasts` | sales_forecast（1） | id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at | P1 |
| `crm.customer_tags` | customer_profile/tag（2） | id, tenant_id, org_id, customer_id, tag_id, tag, created_at | P1 |

### 第二批 · 增强表（6 模块重挂 + 扩展功能，4 张）

| 表 | 使用模块 | 核心字段 | 优先级 |
|---|---|---|---|
| `crm.tags` | tag（1） | id, tenant_id, org_id, name, color, description, created_at, updated_at | P1 |
| `crm.customer_recommendations` | customer_recommendation（1） | id, customer_id, customer_name, recommendations, recommendation_type, model, confidence, created_at | P2 |
| `crm.rfm_results` | rfm（已挂载） | id, tenant_id, customer_id, r_score, f_score, m_score, recency_days, frequency, monetary, rfm_score, segment, analyzed_at, created_at, updated_at | P2 |
| `crm.customer_orders` | rfm（已挂载） | **核对结论：建表**。SELECT 列已取（id/customer_id/order_date/order_amount/status/tenant_id）；**全仓库无写入方** → 建表 + 写入方待接通（预期 erp/订单服务），RFM 在空表下返回 9999 天/0 次 | P2 |

### 第三批 · 业务台账表（已挂载模块，4 张）

| 表 | 使用模块 | 核心字段 | 优先级 |
|---|---|---|---|
| `crm.billing_records` | billing（已挂载） | **核对结论：建表**。SELECT 列已取（id/tenant_id/customer_id/customer_name/invoice_no/amount/currency/status/due_date/paid_at/items/deleted_at）；**全仓库无写入方** → 建表 + 写入方待接通（预期 finance/erp 账单服务） | P2 |
| `crm.returns` | aftersales（已挂载） | id, tenant_id, return_no, customer_id, order_id, ticket_id, warehouse_id, return_type, status, reason, reason_detail, refund_amount, exchange_product_id, received, created_by, updated_by, created_at, updated_at | P2 |
| `crm.return_items` | aftersales（已挂载） | id, tenant_id, return_id, product_id, quantity, unit_price, total_amount, created_at | P2 |
| ~~`crm.audit_logs`~~ | audit（已挂载） | **核对结论：不建表**。全仓库无 INSERT INTO crm.audit_logs；审计写入统一走 public.audit_logs（unified-core 3 处）。audit.rs SELECT 含 user_name/entity_ids/error_message（public 无此列）→ 列入专项附项：audit.rs 改指 public.audit_logs + 列适配 | 附项 |

## 3. 迁移方案要点

1. **单迁移文件** `20260908000006_crm_datalayer.sql`：`CREATE SCHEMA IF NOT EXISTS crm;` + 16 张表 `IF NOT EXISTS`，UUID 主键（`gen_random_uuid()`）、`tenant_id UUID NOT NULL`、`created_at/updated_at TIMESTAMPTZ DEFAULT NOW()`、业务字段按模块 bind 类型（VARCHAR/TEXT/DOUBLE PRECISION/INTEGER/BOOLEAN/JSONB）精确定稿。
2. **只读表核对结果**：`interactions` 有真实写入方（crm event_handlers）→ 必建；`customer_orders`/`billing_records` 无写入方 → 建表 + 写入方待接通（预期 erp/finance 服务，专项外待办）；`audit_logs` 不建（改指 public，附项）。
3. **audit_logs 不建**：审计写入统一在 public.audit_logs（unified-core 3 处 INSERT 已核实）；audit.rs 列不兼容（user_name/entity_ids/error_message）→ 单独附项改造，不纳入本迁移。
4. **重挂 6 模块**：迁移落地后取消 mod.rs 注释（18-21/27-28 声明 + 87-89/100-102 merge）+ openapi.rs 注册；新逻辑层（scoring_logic/sales_funnel_logic/rfm/forecast）保持不动。
5. **前端**：mock 开关保留（受控演示），生产自动走真实 API，无需前端改动。

## 4. 验证与风险

- 验证：`cargo check`（topems-crm）+ schema-boundary 门禁（crm 自引用）+ tsc/eslint。
- 本地 postgres(:5433) 未启动，迁移 SQL 无法实跑 → 人工核对 + 类型从 bind 反推；交付前建议在可用环境跑一次 dry-run。
- 风险：旧模块（6 个被注释 + 已挂载的 16 张表）未经真实数据验证，DDL 字段类型可能与 bind 不完全匹配 → 落地后跑一次各模块 smoke test（真实 SQL 执行）。
- 范围控制：本次仅数据层 + 重挂，不含 crm 业务逻辑重构（旧模块与新逻辑层并存问题留后续）。

## 5. 建议执行顺序

1. ✅ 核对写入方（已完成 2026-09-08）：interactions 有写入方（event_handlers）；customer_orders/billing_records 无写入方（建表+待接通）；audit_logs 不建（改指 public，附项）
2. 精确定稿 16 表 DDL（按 bind 类型）（1 天）
3. 迁移 + 重挂 6 模块 + openapi（0.5 天）
4. cargo check + 门禁 + smoke（0.5 天）

## 6. 核对记录（2026-09-08 完成）

| 表 | 写入方 | 结论 |
|---|---|---|
| crm.interactions | ✅ event_handlers/mod.rs:135/202（aftersales_ticket 事件） | 建表（列已取） |
| crm.customer_orders | ❌ 全仓库无 | 建表 + 写入方待接通（RFM 空表兜底） |
| crm.billing_records | ❌ 全仓库无 | 建表 + 写入方待接通 |
| crm.audit_logs | ❌ 无（审计统一走 public.audit_logs） | 不建；audit.rs 改指 public（附项） |
| crm.customers/contacts/opportunities/tags/returns/return_items | ✅ 挂载模块自带 INSERT（customer/contact/opportunity/tag/aftersales 各 ≥1） | 建表即闭环 |

> 挂载模块 INSERT 确认：customer.rs/contact.rs/opportunity.rs/tag.rs 各 1 处、aftersales.rs 2 处。
