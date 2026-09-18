-- TOPEMS database migration 20260918000045
-- audit_logs 补 log_audit_event 用列（request_details/response_details/status/error_message/success）
-- 7 个 schema 缺：bi/iam/public/scm/shared/srm/wms。DO 块动态判断，幂等且双库安全。

DO $$
DECLARE s text;
BEGIN
    FOREACH s IN ARRAY ARRAY['bi','iam','public','scm','shared','srm','wms'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = s AND table_name = 'audit_logs') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'request_details') THEN
                EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN request_details jsonb', s);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'response_details') THEN
                EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN response_details jsonb', s);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'status') THEN
                EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN status varchar(32)', s);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'error_message') THEN
                EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN error_message text', s);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'success') THEN
                EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN success boolean', s);
            END IF;
        END IF;
    END LOOP;
END $$;
