-- TOPEMS database migration 20260918000038
-- 1) wms.inbound_orders.order_date: DATE → TIMESTAMPTZ（代码模型 InboundOrder.order_date 为 DateTime<Utc>，
--    sqlx 严格模式 DATE 无法解码/绑定 TIMESTAMPTZ，此前 create 报 mismatched types）
-- 2) audit_logs 补 entity_id uuid（bi/iam/public/scm/shared/srm/wms 缺；log_audit_event 写该列）
-- DO 块动态判断，幂等且双库安全。

DO $$
BEGIN
    -- order_date: date → timestamptz（仅当当前为 date 时转换，幂等）
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='inbound_orders' AND column_name='order_date'
                 AND data_type='date') THEN
        ALTER TABLE wms.inbound_orders ALTER COLUMN order_date TYPE timestamptz USING order_date::timestamptz;
    END IF;
END $$;

DO $$
DECLARE s text;
BEGIN
    FOREACH s IN ARRAY ARRAY['bi','iam','public','scm','shared','srm','wms'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = s AND table_name = 'audit_logs')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = s AND table_name = 'audit_logs' AND column_name = 'entity_id') THEN
            EXECUTE format('ALTER TABLE %I.audit_logs ADD COLUMN entity_id uuid', s);
        END IF;
    END LOOP;
END $$;
