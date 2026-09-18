-- 为 wms.labor_shifts 班次表补建表结构
-- 背景：labor.rs 的 list_labor_shifts/create_labor_shift 端点依赖该表，
-- 但此前全仓无任何 CREATE TABLE 迁移或自愈合 DDL 创建它（仅 rls_gap_fill 注释提及），
-- 导致端点运行时 500。此处按代码实际使用列名幂等建表。
-- 注意：WMS 全模块组织列名为 organization_id（非 org_id），与 labor.rs 字段一致。

CREATE TABLE IF NOT EXISTS wms.labor_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_name VARCHAR(255),
    shift_date DATE NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    warehouse_id UUID,
    zone VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    tasks_assigned INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_labor_shifts_org
    ON wms.labor_shifts (organization_id);

CREATE INDEX IF NOT EXISTS idx_wms_labor_shifts_tenant
    ON wms.labor_shifts (tenant_id);
