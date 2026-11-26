-- B347 回滚：恢复可空与旧约束名
ALTER TABLE mes.production_schedules
    DROP CONSTRAINT IF EXISTS ck_mes_production_schedules_status_standard;

ALTER TABLE mes.production_schedules
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE mes.production_schedules
    ADD CONSTRAINT production_schedules_status_check
    CHECK (status IS NULL OR status IN ('pending', 'scheduled', 'released', 'running', 'completed', 'cancelled'))
    NOT VALID;

ALTER TABLE mes.production_schedules
    VALIDATE CONSTRAINT production_schedules_status_check;
