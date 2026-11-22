-- B178 质量检验状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE mes.quality_inspections DROP CONSTRAINT IF EXISTS ck_mes_quality_inspections_status_standard;
ALTER TABLE mes.quality_inspections ADD CONSTRAINT ck_mes_quality_inspections_status_standard
  CHECK (status = ANY (ARRAY['pending','inspecting','passed','failed','rework','scrapped','concession_received'])) NOT VALID;

COMMIT;
