-- B348 回滚：恢复可空与旧约束名
ALTER TABLE mes.work_orders
    DROP CONSTRAINT IF EXISTS ck_mes_work_orders_status_standard;

ALTER TABLE mes.work_orders
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE mes.work_orders
    ADD CONSTRAINT work_orders_status_check
    CHECK (status IS NULL OR status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled'))
    NOT VALID;

ALTER TABLE mes.work_orders
    VALIDATE CONSTRAINT work_orders_status_check;
