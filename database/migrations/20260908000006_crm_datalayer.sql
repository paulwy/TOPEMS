-- CRM 数据层落地（15 表）—— 审计批次 ⑥ 专项
-- 背景：crm schema 在 95 个迁移中 0 张表，23 个模块引用的 16 张表全部缺失；
-- 核对后 audit_logs 不建（读取改指 public.audit_logs，见 svc/crm/src/modules/audit.rs），
-- customer_orders/billing_records 无写入方（建表待接通）。
-- 列类型按各模块 INSERT bind / SELECT 列反推（sqlx Decimal→NUMERIC、f64→DOUBLE PRECISION、
-- i32→INTEGER、i64→BIGINT、DateTime→TIMESTAMPTZ、Value→JSONB）。
CREATE SCHEMA IF NOT EXISTS crm;

-- ============ 第一批 · 核心业务表 ============

-- 1. 客户主表（customer.rs INSERT / rls 测试）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.customers 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='customers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='customers' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.customers;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    org_id          UUID,
    name            TEXT NOT NULL,
    customer_type   TEXT,
    industry        TEXT,
    rating          TEXT DEFAULT 'C',
    region          TEXT,
    owner_id        UUID,
    tags            TEXT[] DEFAULT '{}',
    code            TEXT,
    email           TEXT,
    phone           TEXT,
    website         TEXT,
    address         TEXT,
    city            TEXT,
    province        TEXT,
    country         TEXT,
    company_size    TEXT,
    employee_count  INTEGER,
    revenue         DOUBLE PRECISION,
    source          TEXT,
    status          TEXT,
    approval_status TEXT DEFAULT 'none',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_crm_customers_tenant ON crm.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_owner ON crm.customers(owner_id);

-- 2. 联系人（contact.rs INSERT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.contacts 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='contacts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='contacts' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.contacts;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    org_id          UUID,
    customer_id     UUID,
    first_name      TEXT NOT NULL,
    last_name       TEXT,
    email           TEXT,
    phone           TEXT,
    position        TEXT,
    notes           TEXT,
    status          TEXT DEFAULT 'active',
    approval_status TEXT DEFAULT 'none',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer ON crm.contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm.contacts(tenant_id);

-- 3. 商机（opportunity.rs INSERT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.opportunities 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='opportunities')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='opportunities' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.opportunities;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.opportunities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    org_id        UUID,
    opp_no        TEXT,
    name          TEXT NOT NULL,
    customer_id   UUID,
    customer_name TEXT,
    stage         TEXT DEFAULT 'new',
    priority      TEXT,
    value         NUMERIC(15,2),
    probability   INTEGER,
    close_date    TIMESTAMPTZ,
    owner_id      UUID,
    status        TEXT DEFAULT 'open',
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_customer ON crm.opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant ON crm.opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm.opportunities(stage);

-- 4. 互动记录（event_handlers/mod.rs INSERT：aftersales_ticket / follow_up；interaction.rs SELECT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.interactions 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='interactions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='interactions' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.interactions;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.interactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID,
    org_id             UUID,
    customer_id        UUID,
    contact_id         UUID,
    opportunity_id     UUID,
    interaction_type   TEXT NOT NULL,
    subject            TEXT,
    content            TEXT,
    status             TEXT DEFAULT 'pending',
    scheduled_at       TIMESTAMPTZ,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date     TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    notes              TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer ON crm.interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created ON crm.interactions(created_at);

-- 5. 客户评分（customer_scoring.rs INSERT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.customer_scores 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='customer_scores')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='customer_scores' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.customer_scores;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.customer_scores (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    customer_id   UUID NOT NULL,
    customer_name TEXT,
    score         INTEGER NOT NULL,
    score_level   TEXT,
    scoring_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    factors       JSONB,
    trend         TEXT,
    last_score    INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_customer_scores_customer ON crm.customer_scores(customer_id);

-- 6. 客户分群（customer_segmentation.rs INSERT；无 tenant 维度）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.customer_segments 仅为 business_base_tables 建的 2 列裸骨架
-- （无 name 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='customer_segments')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='customer_segments' AND column_name='name')
  THEN
    DROP TABLE crm.customer_segments;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.customer_segments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    description    TEXT,
    criteria       JSONB,
    customer_count BIGINT DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 客户推荐（customer_recommendation.rs INSERT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.customer_recommendations 仅为 business_base_tables 建的 2 列裸骨架
-- （无 customer_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='customer_recommendations')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='customer_recommendations' AND column_name='customer_id')
  THEN
    DROP TABLE crm.customer_recommendations;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.customer_recommendations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id          UUID,
    customer_name        TEXT,
    recommendations      JSONB,
    recommendation_type  TEXT,
    model                TEXT DEFAULT 'TOPEMS-AI',
    confidence           NUMERIC(5,2),
    created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_customer_recommendations_customer ON crm.customer_recommendations(customer_id);

-- 8. 客户-标签关联（tag.rs + customer_profile.rs INSERT；tag_id 与 tag 双写兼容）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.customer_tags 仅为 business_base_tables 建的 2 列裸骨架
-- （无 customer_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='customer_tags')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='customer_tags' AND column_name='customer_id')
  THEN
    DROP TABLE crm.customer_tags;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.customer_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    tag_id      UUID,
    tag         TEXT,
    tenant_id   UUID,
    org_id      UUID,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (customer_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_customer_tags_tag ON crm.customer_tags(tag_id);

-- ============ 第二批 · 增强表 ============

-- 9. 标签字典（tag.rs INSERT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.tags 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='tags')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='tags' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.tags;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    org_id      UUID,
    name        TEXT NOT NULL,
    color       TEXT DEFAULT '#8BC8EA',
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_tags_tenant ON crm.tags(tenant_id);

-- 10. 销售预测（sales_forecast.rs INSERT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.sales_forecasts 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='sales_forecasts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='sales_forecasts' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.sales_forecasts;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.sales_forecasts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL,
    period_type      TEXT,
    period           TEXT NOT NULL,
    predicted_amount NUMERIC(15,2) DEFAULT 0,
    actual_amount    NUMERIC(15,2),
    accuracy         NUMERIC(6,3),
    trend            TEXT DEFAULT 'stable',
    confidence_level NUMERIC(6,3) DEFAULT 0.7,
    factors          JSONB,
    status           TEXT DEFAULT 'draft',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_sales_forecasts_period ON crm.sales_forecasts(tenant_id, period);

-- 11. RFM 分析结果（rfm.rs INSERT；id 自动生成）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.rfm_results 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='rfm_results')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='rfm_results' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.rfm_results;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.rfm_results (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL,
    customer_id  UUID NOT NULL,
    recency_days DOUBLE PRECISION,
    frequency    DOUBLE PRECISION,
    monetary     DOUBLE PRECISION,
    r_score      INTEGER,
    f_score      INTEGER,
    m_score      INTEGER,
    rfm_score    DOUBLE PRECISION,
    segment      TEXT,
    analyzed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_rfm_results_tenant ON crm.rfm_results(tenant_id, customer_id);

-- 12. 客户订单（已废弃：rfm 改读 crm.sales_orders——wms ShippingOrderRequested 事件真实写入；
--      保留本表兼容历史引用，不再被代码使用）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.customer_orders 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='customer_orders')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='customer_orders' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.customer_orders;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.customer_orders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL,
    customer_id  UUID NOT NULL,
    order_date   DATE NOT NULL,
    order_amount NUMERIC(15,2) NOT NULL,
    status       TEXT DEFAULT 'completed',
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_customer_orders_customer ON crm.customer_orders(customer_id, tenant_id, status);

-- ============ 第三批 · 业务台账表 ============

-- 13. 账单记录（billing.rs SELECT 只读；无写入方，待 finance/erp 接通）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.billing_records 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='billing_records')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='billing_records' AND column_name='tenant_id')
  THEN
    DROP TABLE crm.billing_records;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.billing_records (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    customer_id   UUID,
    customer_name TEXT,
    invoice_no    TEXT,
    amount        NUMERIC(15,2),
    currency      TEXT DEFAULT 'CNY',
    status        TEXT,
    due_date      TIMESTAMPTZ,
    paid_at       TIMESTAMPTZ,
    items         JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_crm_billing_records_tenant ON crm.billing_records(tenant_id);

-- 14. 退换货单（aftersales.rs INSERT；FSM 状态机）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.returns 仅为 business_base_tables 建的 2 列裸骨架
-- （无 return_no 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='returns')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='returns' AND column_name='return_no')
  THEN
    DROP TABLE crm.returns;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.returns (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no          TEXT,
    tenant_id          UUID NOT NULL,
    customer_id        UUID,
    order_id           UUID,
    ticket_id          UUID,
    warehouse_id       UUID,
    return_type        TEXT,
    reason             TEXT,
    reason_detail      TEXT,
    status             TEXT DEFAULT 'pending',
    refund_amount      NUMERIC(15,2) DEFAULT 0,
    exchange_product_id UUID,
    received           BOOLEAN DEFAULT FALSE,
    created_by         UUID,
    updated_by         UUID,
    received_at        TIMESTAMPTZ,
    approved_at        TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    resolved_at        TIMESTAMPTZ,
    approved_by        UUID,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_crm_returns_tenant ON crm.returns(tenant_id, status);

-- 15. 退换货明细（aftersales.rs INSERT）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.return_items 仅为 business_base_tables 建的 2 列裸骨架
-- （无 return_id 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='return_items')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='return_items' AND column_name='return_id')
  THEN
    DROP TABLE crm.return_items;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.return_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id    UUID NOT NULL,
    tenant_id    UUID,
    product_id   UUID,
    quantity     INTEGER NOT NULL,
    unit_price   NUMERIC(15,2),
    total_amount NUMERIC(15,2),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_return_items_return ON crm.return_items(return_id);

-- 16. 销售订单（wms ShippingOrderRequested 事件驱动写入；rfm.rs 数据源）
-- 2026-09-18 防御化（空库重建链卡点）：若 crm.sales_orders 仅为 business_base_tables 建的 2 列裸骨架
-- （无 order_number 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='sales_orders')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='sales_orders' AND column_name='order_number')
  THEN
    DROP TABLE crm.sales_orders;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS crm.sales_orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number  TEXT NOT NULL UNIQUE,
    customer_id   UUID,
    order_date    DATE,
    total_amount  NUMERIC(15,2),
    status        TEXT DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_sales_orders_customer ON crm.sales_orders(customer_id);
