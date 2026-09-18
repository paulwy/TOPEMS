-- TOPEMS database migration 20260918000043
-- 1) wms.stock_takes DROP CONSTRAINT ck_stock_takes_status_standard（代码 INSERT 固定 'planned'，
--    约束只允许 active/inactive/archived，同 000035 对 inbound_orders 的处理）
-- 2) audit_logs 补 entity_ids jsonb（bi/iam/public/scm/shared/srm/wms 缺；log_audit_event 写该列）
-- DO 块动态判断，幂等且双库安全。

DO $$
DECLARE s text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conrelid = 'wms.stock_takes'::regclass AND conname = 'ck_stock_takes_status_standard') THEN
        ALTER TABLE wms.stock_takes DROP CONSTRAINT ck_stock_takes_status_standard;
    END IF;
    FOREACH s IN ARRAY ARRAY['bi','iam','public','scm','shared','srm','wms'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = s AND table_name = 'audit_logs')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'entity_ids') THEN
            EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN entity_ids jsonb', s);
        END IF;
    END LOOP;
END $$;
