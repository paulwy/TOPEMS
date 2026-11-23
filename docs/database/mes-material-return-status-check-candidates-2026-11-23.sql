-- B180 物料退库状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE mes.material_returns DROP CONSTRAINT IF EXISTS ck_mes_material_returns_status_standard;
ALTER TABLE mes.material_returns ADD CONSTRAINT ck_mes_material_returns_status_standard
  CHECK (status = ANY (ARRAY['pending','approved','returned','cancelled'])) NOT VALID;

COMMIT;
