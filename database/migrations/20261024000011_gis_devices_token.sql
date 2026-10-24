-- ============================================================================
-- 20261024000011_gis_devices_token.sql
--
-- 平台域补漏：gis.devices 补 device_token 上报认证令牌列。
--
-- 勘察（2026-10-24，topems_test，只读 information_schema / pg_policies）：
--   · gis.devices 现有列：id/deleted_at/created_at/description/device_code(100)/
--     device_name(255)/device_type(100)/properties(jsonb)/registered_by(uuid)/
--     status(50)/updated_at/tenant_id(uuid 可空)——无任何 token/secret 类列；
--     当前 0 行。
--   · 该表已 ENABLE + FORCE ROW LEVEL SECURITY，既有策略
--     gis_allow_all_devices 保持不动（本迁移只加列，不加策略）。
--
-- 认证约定（注释登记，应用层实现）：
--   device_token 存 sha256(hex, 64 字符)，不存明文；上报端点以
--   sha256(请求携带的明文 token) 与本列比对。varchar(64) 恰好容纳 hex 摘要。
--
-- 幂等：information_schema 列存在守卫 + IF NOT EXISTS，主/测库可重复执行。
-- ============================================================================

DO $$
BEGIN
    IF to_regclass('gis.devices') IS NULL THEN
        RAISE NOTICE 'gis.devices 不存在，跳过';
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'gis' AND table_name = 'devices' AND column_name = 'device_token'
        ) THEN
            ALTER TABLE gis.devices ADD COLUMN device_token varchar(64);

            COMMENT ON COLUMN gis.devices.device_token IS
              '设备上报认证令牌的 sha256 hex（64 字符）；不存明文，上报端点以 sha256(明文token) 比对；未认证设备为 NULL。';
        END IF;
    END IF;
END $$;
