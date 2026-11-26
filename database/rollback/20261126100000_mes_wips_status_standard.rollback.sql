-- B341 回滚：恢复可空与"允许 NULL"的四态 CHECK
ALTER TABLE mes.wips
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE mes.wips
    DROP CONSTRAINT IF EXISTS ck_mes_wips_status_standard;

ALTER TABLE mes.wips
    ADD CONSTRAINT ck_mes_wips_status_standard
    CHECK (status IS NULL OR status IN ('pending', 'in_progress', 'completed', 'transferred'))
    NOT VALID;

ALTER TABLE mes.wips
    VALIDATE CONSTRAINT ck_mes_wips_status_standard;
