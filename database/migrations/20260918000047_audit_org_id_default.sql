-- TOPEMS database migration 20260918000047
-- audit_logs.org_id NOT NULL 无默认，log_audit_event 未绑定 org_id（只填 organization_id/tenant_id）
-- → 设默认单租户 org_id（同 000041）。DO 块动态判断，幂等且双库安全。

DO $$
DECLARE s text;
BEGIN
    FOREACH s IN ARRAY ARRAY['wms','crm'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = s AND table_name = 'audit_logs'
                     AND column_name = 'org_id' AND is_nullable = 'NO'
                     AND column_default IS NULL) THEN
            EXECUTE format('ALTER TABLE %I.audit_logs ALTER COLUMN org_id SET DEFAULT %L',
                           s, '00000000-0000-0000-0000-000000000001');
        END IF;
    END LOOP;
END $$;
