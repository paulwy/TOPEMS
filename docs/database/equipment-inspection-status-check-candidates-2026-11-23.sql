-- B190 设备点检状态候选约束
-- 目标：mes.equipment_inspections.status 收敛为 normal / abnormal。
BEGIN;

ALTER TABLE mes.equipment_inspections
    DROP CONSTRAINT IF EXISTS ck_mes_equipment_inspections_status_standard;

ALTER TABLE mes.equipment_inspections
    ADD CONSTRAINT ck_mes_equipment_inspections_status_standard
    CHECK (status IN ('normal', 'abnormal'))
    NOT VALID;

COMMIT;
