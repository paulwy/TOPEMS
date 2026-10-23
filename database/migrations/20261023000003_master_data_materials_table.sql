-- ============================================================================
-- 20261023000003_master_data_materials_table.sql
--
-- §4 物料主数据（master-data）：补建 `master_data.materials` 表。
--
-- 背景：§4 最小业务闭环的物料环节此前因 `master_data.materials` 表缺失记为
-- 环境制约（master_data schema 已有 mdm_* 系列表，但物料核心表从未建）。
-- master-data 服务 create_material 直接 INSERT 该表（依赖 COALESCE(GUC, 000)
-- 的 tenant 兜底），本迁移补齐表结构（对齐 Material 模型 + CreateMaterialRequest）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重放。
-- ============================================================================

CREATE TABLE IF NOT EXISTS master_data.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(128) NOT NULL,
    material_name VARCHAR(256) NOT NULL,
    name_en VARCHAR(256),
    material_type VARCHAR(64),
    specification TEXT,
    unit VARCHAR(32),
    uom_id UUID,
    status VARCHAR(32) DEFAULT 'active',
    description TEXT,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_by UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mdm_materials_code ON master_data.materials (material_code);
CREATE INDEX IF NOT EXISTS idx_mdm_materials_tenant ON master_data.materials (tenant_id);
