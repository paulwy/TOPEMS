-- 20260910000005: mes 模块设置表（设置页持久化）
-- 背景：mes 4 个设置页（ApsConfig/BomVersionPolicy/EquipmentThreshold/QualityTemplate）
--       为纯占位模板，无后端接口/表，D4 评估不通过。
-- 通用键值表，按 category 分组，支持任意设置项。
-- 幂等创建，GRANT topems_app。

CREATE TABLE IF NOT EXISTS mes.module_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_mes_module_settings_category ON mes.module_settings(tenant_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON mes.module_settings TO topems_app;
