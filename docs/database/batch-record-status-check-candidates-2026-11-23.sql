-- B192 生产批次状态候选约束
-- 目标：mes.batch_records.status 收敛为 active / completed / cancelled；列可空，保留 NULL。
BEGIN;

ALTER TABLE mes.batch_records
    DROP CONSTRAINT IF EXISTS ck_mes_batch_records_status_standard;

ALTER TABLE mes.batch_records
    ADD CONSTRAINT ck_mes_batch_records_status_standard
    CHECK (status IS NULL OR status IN ('active', 'completed', 'cancelled'))
    NOT VALID;

COMMIT;
