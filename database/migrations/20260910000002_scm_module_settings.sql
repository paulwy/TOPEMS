-- 20260910000002: scm 模块设置表（设置页持久化）
-- 背景：scm 4 个设置页（SourcingStrategy/QuotaTemplate/PurchaseThreshold/SupplierTier）
--       为纯占位模板，无后端接口/表，D4 评估不通过。
-- 通用键值表，按 category 分组，支持任意设置项。
-- 幂等创建，GRANT topems_app。

-- 2026-09-18 防御化（空库重建链卡点）：若 scm.module_settings 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='module_settings')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='module_settings' AND column_name='tenant_id')
  THEN
    DROP TABLE scm.module_settings;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS scm.module_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_scm_module_settings_category ON scm.module_settings(tenant_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON scm.module_settings TO topems_app;
