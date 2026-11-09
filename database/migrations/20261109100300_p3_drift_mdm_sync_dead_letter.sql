-- P3 A 级止血 / 2026-11-09：补建 master_data.mdm_sync_dead_letter（生产缺失）
--
-- 背景（见 docs/quality/prod-schema-drift-2026-11-09.md 第 8 节 A3）：
--   迁移 20261107000033 声明的同步死信表从未进入生产账本。scm/srm → mdm 反向同步
--   失败时要落死信；表缺失会让“失败记录丢失 + 二次异常”。
--
-- 范围：只建表/索引/RLS/策略/授权/owner 归一。不清理、不回填、不动历史数据。
--
-- Idempotency：CREATE TABLE/INDEX IF NOT EXISTS、策略 DO $$ IF NOT EXISTS、owner 归一 no-op。
-- owner 归一：同 20261109100100（生产 pg_default_acl 为空，必须归 topems_prod）。
--
-- ROLLBACK（生产，仅当确认表内无业务数据）：
--   DROP TABLE IF EXISTS master_data.mdm_sync_dead_letter;

BEGIN;

CREATE TABLE IF NOT EXISTS master_data.mdm_sync_dead_letter (
    id            uuid         NOT NULL DEFAULT gen_random_uuid(),
    entity_type   varchar      NOT NULL,
    entity_key    varchar      NOT NULL,
    direction     varchar      NOT NULL,
    operation     varchar      NOT NULL,
    error_message text         NOT NULL,
    payload       jsonb        NULL,
    retry_count   int          NOT NULL DEFAULT 0,
    tenant_id     uuid         NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    resolved_at   timestamptz  NULL,
    CONSTRAINT mdm_sync_dead_letter_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE  master_data.mdm_sync_dead_letter IS 'MDM 双向同步死信表（同步失败落此，主写入不阻塞）';
COMMENT ON COLUMN master_data.mdm_sync_dead_letter.direction IS 'mdm_to_scm / mdm_to_srm / scm_to_mdm / srm_to_mdm';
COMMENT ON COLUMN master_data.mdm_sync_dead_letter.operation IS 'create / update / delete';

ALTER TABLE master_data.mdm_sync_dead_letter ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.mdm_sync_dead_letter FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'master_data'
          AND tablename  = 'mdm_sync_dead_letter'
          AND policyname = 'tenant_isolation_mdm_sync_dead_letter'
    ) THEN
        CREATE POLICY tenant_isolation_mdm_sync_dead_letter ON master_data.mdm_sync_dead_letter
            AS PERMISSIVE
            FOR ALL
            TO public
            USING (
                current_setting('app.tenant_id'::text, true) IS NULL
                OR current_setting('app.tenant_id'::text, true) = ''::text
                OR current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text
                OR tenant_id IS NULL
                OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
            )
            WITH CHECK (
                current_setting('app.tenant_id'::text, true) IS NULL
                OR current_setting('app.tenant_id'::text, true) = ''::text
                OR current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text
                OR tenant_id IS NULL
                OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
            );
    END IF;
END
$$;

DO $$
DECLARE
    svc_role text;
BEGIN
    IF to_regclass('master_data.mdm_sync_dead_letter') IS NULL THEN
        RAISE NOTICE 'P3 止血：mdm_sync_dead_letter 不存在，跳过授权/owner 归一';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P3 止血：未找到服务运行角色（topems_prod/topems_app），跳过 owner 归一';
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE master_data.mdm_sync_dead_letter OWNER TO %I', svc_role);
    RAISE NOTICE 'P3 止血：mdm_sync_dead_letter owner -> %', svc_role;

    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON master_data.mdm_sync_dead_letter TO topems_app;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_entity_idx   ON master_data.mdm_sync_dead_letter (entity_type, entity_key);
CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_dir_idx      ON master_data.mdm_sync_dead_letter (direction);
CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_resolved_idx ON master_data.mdm_sync_dead_letter (resolved_at);
CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_tenant_idx   ON master_data.mdm_sync_dead_letter (tenant_id);

COMMIT;
