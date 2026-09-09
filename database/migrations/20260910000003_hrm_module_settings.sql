-- 20260910000003: hrm 模块设置表（设置页持久化）
CREATE TABLE IF NOT EXISTS hrm.module_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, category, key)
);
CREATE INDEX IF NOT EXISTS idx_hrm_module_settings_category ON hrm.module_settings(tenant_id, category);
GRANT SELECT, INSERT, UPDATE, DELETE ON hrm.module_settings TO topems_app;
