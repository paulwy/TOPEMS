-- CRM 数据层落地（15 表）—— 审计批次 ⑥ 专项
-- 背景：crm schema 在 95 个迁移中 0 张表，23 个模块引用的 16 张表全部缺失；
-- 核对后 audit_logs 不建（读取改指 public.audit_logs，见 svc/crm/src/modules/audit.rs），
-- customer_orders/billing_records 无写入方（建表待接通）。
-- 列类型按各模块 INSERT bind / SELECT 列反推（sqlx Decimal→NUMERIC、f64→DOUBLE PRECISION、
-- i32→INTEGER、i64→BIGINT、DateTime→TIMESTAMPTZ、Value→JSONB）。
CREATE SCHEMA IF NOT EXISTS crm;

-- ============ 第一批 · 核心业务表 ============

-- 1. 客户主表（customer.rs INSERT / rls 测试）
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

-- 12. 客户订单（rfm.rs JOIN 只读；无写入方，待 erp/订单服务接通）
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
