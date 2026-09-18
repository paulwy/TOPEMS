-- TOPEMS database migration 20260918000046
-- audit_logs.ip_address inet → text（log_audit_event 绑定 String；inet 与 text 不兼容报错）
-- wms/crm/iam/hrm 为 inet，其余 schema 已是 text/varchar。DO 块动态判断，幂等且双库安全。

DO $$
DECLARE s text;
BEGIN
    FOREACH s IN ARRAY ARRAY['wms','crm','iam','hrm'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = s AND table_name = 'audit_logs'
                     AND column_name = 'ip_address' AND data_type = 'inet') THEN
            EXECUTE format('ALTER TABLE %I.audit_logs ALTER COLUMN ip_address TYPE text', s);
        END IF;
    END LOOP;
END $$;
