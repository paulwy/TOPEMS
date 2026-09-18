-- TOPEMS database migration 20260918000042
-- 1) wms.stock_takes.warehouse_id NOT NULL 但 create INSERT 绑定 Option（None→NULL）→ DROP NOT NULL（与代码语义一致）
-- 2) wms.labor_shifts.tasks_assigned/tasks_completed INT4 → INT8（模型 i64，sqlx 严格解码报 mismatched）
-- DO 块动态判断，幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='stock_takes' AND column_name='warehouse_id'
                 AND is_nullable='NO') THEN
        ALTER TABLE wms.stock_takes ALTER COLUMN warehouse_id DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='labor_shifts' AND column_name='tasks_assigned'
                 AND data_type='integer') THEN
        ALTER TABLE wms.labor_shifts
            ALTER COLUMN tasks_assigned TYPE bigint,
            ALTER COLUMN tasks_completed TYPE bigint;
    END IF;
END $$;
