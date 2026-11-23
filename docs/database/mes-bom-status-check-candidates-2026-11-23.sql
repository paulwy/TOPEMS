-- B179 物料 BOM 状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE mes.material_boms DROP CONSTRAINT IF EXISTS ck_mes_material_boms_status_standard;
ALTER TABLE mes.material_boms ADD CONSTRAINT ck_mes_material_boms_status_standard
  CHECK (status = ANY (ARRAY['draft','active','inactive','obsolete'])) NOT VALID;

COMMIT;
