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
| `crm.interactions` | interaction/customer_profile/customer_scoring/dashboard（4） | （仅 SELECT，无 INSERT 列；按 SELECT 列 + deleted_at 推断） | P0 |
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
| `crm.customer_orders` | rfm（已挂载，只读聚合） | （仅 SELECT/JOIN，订单数据源；需确认是否由其他服务写入） | P2 |

### 第三批 · 业务台账表（已挂载模块，4 张）

| 表 | 使用模块 | 核心字段 | 优先级 |
|---|---|---|---|
| `crm.billing_records` | billing（已挂载，只读） | （仅 SELECT） | P2 |
| `crm.returns` | aftersales（已挂载） | id, tenant_id, return_no, customer_id, order_id, ticket_id, warehouse_id, return_type, status, reason, reason_detail, refund_amount, exchange_product_id, received, created_by, updated_by, created_at, updated_at | P2 |
| `crm.return_items` | aftersales（已挂载） | id, tenant_id, return_id, product_id, quantity, unit_price, total_amount, created_at | P2 |
| `crm.audit_logs` | audit（已挂载） | （仅 SELECT；**需核对是否应指向 public.audit_logs**——第一批已显式化 public.audit_logs，此表可能为误标） | P2 |

## 3. 迁移方案要点

1. **单迁移文件** `20260908000006_crm_datalayer.sql`：`CREATE SCHEMA IF NOT EXISTS crm;` + 16 张表 `IF NOT EXISTS`，UUID 主键（`gen_random_uuid()`）、`tenant_id UUID NOT NULL`、`created_at/updated_at TIMESTAMPTZ DEFAULT NOW()`、业务字段按模块 bind 类型（VARCHAR/TEXT/DOUBLE PRECISION/INTEGER/BOOLEAN/JSONB）精确定稿。
2. **只读表特殊处理**：`customer_orders`（RFM 数据源）、`billing_records`、`interactions` 需先确认写入方（可能在其他服务/未实现），第一批先建表结构，写入方另行排查。
3. **audit_logs 先核对**：若 public.audit_logs 已承载审计，crm.audit_logs 应改指向 public 或归档，不建重复表。
4. **重挂 6 模块**：迁移落地后取消 mod.rs 注释（18-21/27-28 声明 + 87-89/100-102 merge）+ openapi.rs 注册；新逻辑层（scoring_logic/sales_funnel_logic/rfm/forecast）保持不动。
5. **前端**：mock 开关保留（受控演示），生产自动走真实 API，无需前端改动。

## 4. 验证与风险

- 验证：`cargo check`（topems-crm）+ schema-boundary 门禁（crm 自引用）+ tsc/eslint。
- 本地 postgres(:5433) 未启动，迁移 SQL 无法实跑 → 人工核对 + 类型从 bind 反推；交付前建议在可用环境跑一次 dry-run。
- 风险：旧模块（6 个被注释 + 已挂载的 16 张表）未经真实数据验证，DDL 字段类型可能与 bind 不完全匹配 → 落地后跑一次各模块 smoke test（真实 SQL 执行）。
- 范围控制：本次仅数据层 + 重挂，不含 crm 业务逻辑重构（旧模块与新逻辑层并存问题留后续）。

## 5. 建议执行顺序

1. 核对 audit_logs/customer_orders/billing_records/interactions 写入方（0.5 天）
2. 精确定稿 16 表 DDL（按 bind 类型）（1 天）
3. 迁移 + 重挂 6 模块 + openapi（0.5 天）
4. cargo check + 门禁 + smoke（0.5 天）
