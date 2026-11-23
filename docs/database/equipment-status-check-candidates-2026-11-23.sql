-- B189 设备主状态候选约束
-- 目标：mes.equipment.status 收敛为 idle / running / maintenance / fault / scrapped。
-- 历史 available / normal 在应用前归一为 idle。
BEGIN;

UPDATE mes.equipment
SET status = 'idle', updated_at = now()
WHERE status IN ('available', 'normal');

ALTER TABLE mes.equipment
    DROP CONSTRAINT IF EXISTS ck_mes_equipment_status_standard;

ALTER TABLE mes.equipment
    ADD CONSTRAINT ck_mes_equipment_status_standard
    CHECK (status IN ('idle', 'running', 'maintenance', 'fault', 'scrapped'))
    NOT VALID;

COMMIT;
