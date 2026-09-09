-- 20260910000006: pdm 模块设置表（设置页持久化）
-- 背景：pdm 4 个设置页（BomTemplate/CategoryRule/ChangeTemplate/DocApprovalFlow）
--       为纯占位模板，无后端接口/表。
-- 通用键值表，按 category 分组，支持任意设置项。
-- 幂等创建，GRANT topems_app。

CREATE TABLE IF NOT EXISTS pdm.module_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_pdm_module_settings_category ON pdm.module_settings(tenant_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON pdm.module_settings TO topems_app;
