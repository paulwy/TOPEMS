-- B176 MRP 建议状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.mrp_suggestions DROP CONSTRAINT IF EXISTS ck_scm_mrp_suggestions_status_standard;
ALTER TABLE scm.mrp_suggestions ADD CONSTRAINT ck_scm_mrp_suggestions_status_standard
  CHECK (status = ANY (ARRAY['draft','pending','confirmed','rejected','completed'])) NOT VALID;

COMMIT;
