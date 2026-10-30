-- pm schema 从未建（pg_namespace 不存在），pm 模块真实 handler 查询 FROM pm.projects 必 500。
-- 按 Project struct + list SELECT 列 + tenant_id 过滤建最小表（smoke 仅覆盖 GET/PUT projects）。
-- 2026-10-30 批三后收尾：pm ×2 豁免核销。
CREATE SCHEMA IF NOT EXISTS pm;

CREATE TABLE IF NOT EXISTS pm.projects (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name             TEXT NOT NULL,
    name_en          TEXT,
    code             TEXT,
    description      TEXT,
    project_type     TEXT,
    status           TEXT,
    leader           TEXT,
    start_date       TIMESTAMPTZ,
    end_date         TIMESTAMPTZ,
    budget           NUMERIC,
    progress         INTEGER NOT NULL DEFAULT 0,
    project_config   JSONB,
    benefit_target   JSONB,
    risk_level       TEXT,
    priority         INTEGER,
    tags             TEXT[],
    parent_id        UUID,
    workspace_id     UUID,
    cost_center_id   TEXT,
    cost_center_name TEXT,
    created_by       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_tenant_id ON pm.projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_created_at ON pm.projects (created_at DESC);
