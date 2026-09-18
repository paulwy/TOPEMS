-- 20260910000003: hrm 模块设置表（设置页持久化）
-- 2026-09-18 防御化（空库重建链卡点）：若 hrm.module_settings 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='hrm' AND table_name='module_settings')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='module_settings' AND column_name='tenant_id')
  THEN
    DROP TABLE hrm.module_settings;
  END IF;
END $skel$;

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
