-- [batch33] mdm ↔ scm ↔ srm 双向同步死信表
--
-- 用途：供应商主数据双向同步管道（mdm → scm/srm 下游写、scm/srm → mdm 反向写）
--       同步失败时落死信，主写入不阻塞、不返回 5xx；运维可凭此表重放。
--
-- 设计要点：
--   * entity_type  = 'supplier'（当前仅供应商，预留扩展）
--   * entity_key   = supplier_no（业务主键，便于人工定位）
--   * direction    = 'mdm_to_scm' / 'mdm_to_srm' / 'scm_to_mdm' / 'srm_to_mdm'
--   * operation    = 'create' / 'update' / 'delete'
--   * payload      = 同步时的业务字段快照（jsonb），便于重放
--   * resolved_at = NULL 表示未处理；人工/重放后置时间戳
--
-- RLS：完全照抄 mdm_suppliers 的 tenant_isolation_mdm_suppliers 策略表达式。
-- 授权：GRANT SELECT, INSERT, UPDATE, DELETE ON master_data.mdm_sync_dead_letter
--       TO topems_app（与同 schema 其他 mdm 表一致）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / 策略 DO $$ IF NOT EXISTS / GRANT 幂等。

BEGIN;

CREATE TABLE IF NOT EXISTS master_data.mdm_sync_dead_letter (
    id             uuid         NOT NULL DEFAULT gen_random_uuid(),
    entity_type    varchar      NOT NULL,
    entity_key     varchar      NOT NULL,
    direction      varchar      NOT NULL,
    operation      varchar      NOT NULL,
    error_message  text         NOT NULL,
    payload        jsonb        NULL,
    retry_count    int          NOT NULL DEFAULT 0,
    tenant_id      uuid         NULL,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    resolved_at    timestamptz  NULL,
    CONSTRAINT mdm_sync_dead_letter_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE  master_data.mdm_sync_dead_letter IS 'MDM 双向同步死信表（batch33，同步失败落此，主写入不阻塞）';
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

GRANT SELECT, INSERT, UPDATE, DELETE ON master_data.mdm_sync_dead_letter TO topems_app;

CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_entity_idx   ON master_data.mdm_sync_dead_letter (entity_type, entity_key);
CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_dir_idx      ON master_data.mdm_sync_dead_letter (direction);
CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_resolved_idx ON master_data.mdm_sync_dead_letter (resolved_at);
CREATE INDEX IF NOT EXISTS mdm_sync_dead_letter_tenant_idx   ON master_data.mdm_sync_dead_letter (tenant_id);

COMMIT;
