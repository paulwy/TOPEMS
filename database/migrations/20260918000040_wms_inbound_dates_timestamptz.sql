-- TOPEMS database migration 20260918000040
-- wms.inbound_orders 日期列 DATE → TIMESTAMPTZ（模型 InboundOrder 日期字段为 Option<DateTime<Utc>>，
-- sqlx 严格解码 DATE 失败：receive/complete 读回报 actual_arrival_date mismatched）。
-- 幂等：仅当当前为 date 时转换。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='inbound_orders' AND column_name='expected_arrival_date'
                 AND data_type='date') THEN
        ALTER TABLE wms.inbound_orders
            ALTER COLUMN expected_arrival_date TYPE timestamptz USING expected_arrival_date::timestamptz,
            ALTER COLUMN actual_arrival_date TYPE timestamptz USING actual_arrival_date::timestamptz,
            ALTER COLUMN received_date TYPE timestamptz USING received_date::timestamptz,
            ALTER COLUMN inspection_date TYPE timestamptz USING inspection_date::timestamptz;
    END IF;
END $$;
