-- TOPEMS database migration 20260918000058
-- qms.qa_apqp_{phases,tasks,risks,approvals} 补 tenant_id uuid（create INSERT 引用）
-- DO 块动态判断，幂等且双库安全。

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['qa_apqp_phases','qa_apqp_tasks','qa_apqp_risks','qa_apqp_approvals'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='qms' AND table_name=t)
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='qms' AND table_name=t AND column_name='tenant_id') THEN
            EXECUTE format('ALTER TABLE qms.%I ADD COLUMN tenant_id uuid', t);
        END IF;
    END LOOP;
END $$;
