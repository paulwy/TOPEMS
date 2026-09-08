-- =============================================================
-- 20260908000003: MES 材料计划表（第一批-② 前后端对应性修复）
-- =============================================================
-- 背景：前端 materialPlanApi（apps/web/src/api/aps/materialPlan.ts，8 方法：
--       list/get/create/update/delete/submit/requisition/cancel）经
--       /api/aps/material-plans 访问，aps_compat 兜底重定向至
--       /api/mes/material-plans；此前 mes 无对应路由（审计 P0）。
-- 本迁移建立 mes.material_plans 表，供 svc/mes modules/material_plan.rs 使用。
-- =============================================================

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
