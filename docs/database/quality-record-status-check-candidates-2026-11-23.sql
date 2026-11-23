-- B191 质量记录状态候选约束
-- 目标：mes.quality_records.quality_status 收敛为 pending / qualified / rejected。
BEGIN;

ALTER TABLE mes.quality_records
    DROP CONSTRAINT IF EXISTS ck_mes_quality_records_quality_status_standard;

ALTER TABLE mes.quality_records
    ADD CONSTRAINT ck_mes_quality_records_quality_status_standard
    CHECK (quality_status IN ('pending', 'qualified', 'rejected'))
    NOT VALID;

COMMIT;
