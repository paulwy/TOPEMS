-- 回滚：20261118123000_core_plugins_platform_catalog.sql
-- 还原 allow_all、默认租户 …0001，移除归属列/索引/外键。RLS / FORCE 保持开启。

BEGIN;

DROP POLICY IF EXISTS rls_platform_read ON core.core_plugins;
DROP POLICY IF EXISTS rls_tenant_isolation ON core.core_plugins;
DROP POLICY IF EXISTS core_allow_all_core_plugins ON core.core_plugins;

CREATE POLICY core_allow_all_core_plugins ON core.core_plugins
    FOR ALL USING (true) WITH CHECK (true);

DROP INDEX IF EXISTS core.core_plugins_platform_name_key;
DROP INDEX IF EXISTS core.idx_core_plugins_owner_tenant;
DROP INDEX IF EXISTS core.idx_core_plugins_platform_tenant;

ALTER TABLE iam.core_tenant_plugins
    DROP CONSTRAINT IF EXISTS fk_core_tenant_plugins_plugin;

ALTER TABLE core.core_plugins
    DROP COLUMN IF EXISTS owner_tenant_id,
    DROP COLUMN IF EXISTS last_owner_tenant_id,
    DROP COLUMN IF EXISTS unpublished_at;

ALTER TABLE core.core_plugins
    ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

ALTER TABLE core.core_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.core_plugins FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'core' AND tablename = 'core_plugins') <> 1 THEN
        RAISE EXCEPTION '回滚断言失败：策略数未还原为 1';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'core' AND tablename = 'core_plugins'
          AND policyname = 'core_allow_all_core_plugins'
          AND (qual IS DISTINCT FROM 'true' OR with_check IS DISTINCT FROM 'true')
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'core' AND tablename = 'core_plugins'
          AND policyname = 'core_allow_all_core_plugins'
    ) THEN
        RAISE EXCEPTION '回滚断言失败：allow_all 策略未还原';
    END IF;

    IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'core.core_plugins'::regclass) THEN
        RAISE EXCEPTION '回滚断言失败：RLS / FORCE 未保持开启';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'core' AND table_name = 'core_plugins' AND column_name = 'owner_tenant_id'
    ) THEN
        RAISE EXCEPTION '回滚断言失败：归属列未删除';
    END IF;
END $$;

COMMIT;
