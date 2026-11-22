-- B160 EHS 培训域状态标准约束（本地应用，生产按窗口另行执行）
BEGIN;

ALTER TABLE ehs.training_programs DROP CONSTRAINT IF EXISTS ck_training_programs_status_standard;
ALTER TABLE ehs.training_programs ADD CONSTRAINT ck_training_programs_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['draft','active','completed','cancelled'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_trainings DROP CONSTRAINT IF EXISTS ck_qa_ehs_trainings_status_standard;
ALTER TABLE ehs.qa_ehs_trainings ADD CONSTRAINT ck_qa_ehs_trainings_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['scheduled','in_progress','completed','cancelled'])) NOT VALID;

ALTER TABLE ehs.training_records DROP CONSTRAINT IF EXISTS ck_training_records_status;
ALTER TABLE ehs.training_records DROP CONSTRAINT IF EXISTS ck_training_records_status_standard;
ALTER TABLE ehs.training_records ADD CONSTRAINT ck_training_records_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['ongoing','completed','failed'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_training_certificates DROP CONSTRAINT IF EXISTS ck_qa_ehs_training_certificates_status_standard;
ALTER TABLE ehs.qa_ehs_training_certificates ADD CONSTRAINT ck_qa_ehs_training_certificates_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['valid','expired','revoked'])) NOT VALID;

COMMIT;
