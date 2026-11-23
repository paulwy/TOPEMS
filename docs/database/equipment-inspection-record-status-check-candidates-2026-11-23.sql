-- B193 设备点检记录状态候选约束（两列）
-- overall_status：normal / abnormal；status：completed / needs_repair。
BEGIN;

ALTER TABLE mes.equipment_inspection_records
    DROP CONSTRAINT IF EXISTS ck_mes_equipment_inspection_records_overall_status_standard;

ALTER TABLE mes.equipment_inspection_records
    ADD CONSTRAINT ck_mes_equipment_inspection_records_overall_status_standard
    CHECK (overall_status IN ('normal', 'abnormal'))
    NOT VALID;

ALTER TABLE mes.equipment_inspection_records
    DROP CONSTRAINT IF EXISTS ck_mes_equipment_inspection_records_status_standard;

ALTER TABLE mes.equipment_inspection_records
    ADD CONSTRAINT ck_mes_equipment_inspection_records_status_standard
    CHECK (status IN ('completed', 'needs_repair'))
    NOT VALID;

COMMIT;
