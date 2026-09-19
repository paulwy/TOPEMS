-- TOPEMS database migration 20260920000084
-- GET 升级冒烟（检查 body code）暴露的缺表（HTTP200 内嵌业务 500）——第一批补建：
--   crm.customer_segments / sales_forecasts / customer_scores / customer_recommendations（5433 完整版）
--   public.sys_db_changes / pm.acceptance_plans（代码 INSERT 列明确）
-- 幂等建表，双库安全；软删列 deleted_at + tenant_id 按代码引用补齐。

CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE IF NOT EXISTS crm.customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    criteria JSONB,
    customer_count BIGINT DEFAULT 0,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm.sales_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    period_type TEXT,
    period TEXT,
    predicted_amount NUMERIC(20,4),
    actual_amount NUMERIC(20,4),
    accuracy NUMERIC(10,4),
    trend TEXT,
    confidence_level NUMERIC(10,4),
    factors JSONB,
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm.customer_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    customer_id UUID,
    customer_name TEXT,
    score INTEGER,
    score_level TEXT,
    scoring_date TIMESTAMPTZ,
    factors JSONB,
    trend TEXT,
    last_score INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm.customer_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    customer_name TEXT,
    recommendations JSONB,
    recommendation_type TEXT,
    model TEXT,
    confidence NUMERIC(10,4),
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.sys_db_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_type TEXT,
    table_name TEXT,
    column_name TEXT,
    new_definition TEXT,
    sql_statement TEXT,
    executed_by UUID,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm.acceptance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    plan_code TEXT,
    plan_name TEXT,
    acceptance_type TEXT,
    milestone_id UUID,
    phase_id UUID,
    acceptance_criteria TEXT,
    expected_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    participants JSONB,
    documents_required JSONB,
    tenant_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
