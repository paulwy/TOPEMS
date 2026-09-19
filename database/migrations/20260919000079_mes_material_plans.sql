-- TOPEMS database migration 20260919000079
-- POST 深冒烟（422 补齐 body 重试）暴露：mes/material-plans/{id}/submit、cancel 500
-- 根因：5432 缺 mes.material_plans 表（000003 建表被删/未落），UPDATE 报 relation does not exist。
-- 幂等补建（与 20260908000003 同 DDL），5433 已有则跳过，双库安全。

CREATE SCHEMA IF NOT EXISTS mes;

CREATE TABLE IF NOT EXISTS mes.material_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_no TEXT NOT NULL UNIQUE,
    plan_id UUID,
    material_id UUID,
    material_code TEXT,
    material_name TEXT,
    required_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    available_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    shortfall_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    required_date TIMESTAMPTZ,
    supply_type TEXT NOT NULL DEFAULT 'purchase',
    status TEXT NOT NULL DEFAULT 'pending',
    tenant_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_plans_status ON mes.material_plans (status);
CREATE INDEX IF NOT EXISTS idx_material_plans_plan_id ON mes.material_plans (plan_id);
CREATE INDEX IF NOT EXISTS idx_material_plans_material_id ON mes.material_plans (material_id);
CREATE INDEX IF NOT EXISTS idx_material_plans_required_date ON mes.material_plans (required_date);
