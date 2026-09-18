-- TOPEMS database migration 20260918000044
-- 1) wms.stock_takes.start_time/end_time TIME → TIMESTAMPTZ（模型 Option<DateTime<Utc>>，sqlx 严格解码不匹配）
-- 2) audit_logs 补 user_name text（public/scm/wms/iam/shared/srm 缺；log_audit_event 写该列）
-- DO 块动态判断，幂等且双库安全。

DO $$
DECLARE s text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='stock_takes' AND column_name='start_time'
                 AND data_type='time without time zone') THEN
        ALTER TABLE wms.stock_takes
            ALTER COLUMN start_time TYPE timestamptz USING NULL,
            ALTER COLUMN end_time TYPE timestamptz USING NULL;
    END IF;
    FOREACH s IN ARRAY ARRAY['public','scm','wms','iam','shared','srm'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = s AND table_name = 'audit_logs')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'user_name') THEN
            EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN user_name text', s);
        END IF;
    END LOOP;
END $$;
