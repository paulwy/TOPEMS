-- B161 EHS 旧状态约束统一为标准命名（本地应用；值集不变）
BEGIN;

ALTER TABLE ehs.qa_ehs_risks DROP CONSTRAINT IF EXISTS qa_ehs_risks_status_check;
ALTER TABLE ehs.qa_ehs_risks DROP CONSTRAINT IF EXISTS ck_qa_ehs_risks_status_standard;
ALTER TABLE ehs.qa_ehs_risks ADD CONSTRAINT ck_qa_ehs_risks_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['identified','assessed','controlled'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_hazards DROP CONSTRAINT IF EXISTS qa_ehs_hazards_status_check;
ALTER TABLE ehs.qa_ehs_hazards DROP CONSTRAINT IF EXISTS ck_qa_ehs_hazards_status_standard;
ALTER TABLE ehs.qa_ehs_hazards ADD CONSTRAINT ck_qa_ehs_hazards_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['reported','pending_approval','rectifying','pending_verification','verified','closed','rejected','resolved'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_hazard_rectifications DROP CONSTRAINT IF EXISTS qa_ehs_hazard_rectifications_status_check;
ALTER TABLE ehs.qa_ehs_hazard_rectifications DROP CONSTRAINT IF EXISTS ck_qa_ehs_hazard_rectifications_status_standard;
ALTER TABLE ehs.qa_ehs_hazard_rectifications ADD CONSTRAINT ck_qa_ehs_hazard_rectifications_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['pending','in_progress','submitted'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_accidents DROP CONSTRAINT IF EXISTS qa_ehs_accidents_status_check;
ALTER TABLE ehs.qa_ehs_accidents DROP CONSTRAINT IF EXISTS ck_qa_ehs_accidents_status_standard;
ALTER TABLE ehs.qa_ehs_accidents ADD CONSTRAINT ck_qa_ehs_accidents_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['reported','closed'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_drill_plans DROP CONSTRAINT IF EXISTS qa_ehs_drill_plans_status_check;
ALTER TABLE ehs.qa_ehs_drill_plans DROP CONSTRAINT IF EXISTS ck_qa_ehs_drill_plans_status_standard;
ALTER TABLE ehs.qa_ehs_drill_plans ADD CONSTRAINT ck_qa_ehs_drill_plans_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['planned','completed','cancelled'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_drill_records DROP CONSTRAINT IF EXISTS qa_ehs_drill_records_status_check;
ALTER TABLE ehs.qa_ehs_drill_records DROP CONSTRAINT IF EXISTS ck_qa_ehs_drill_records_status_standard;
ALTER TABLE ehs.qa_ehs_drill_records ADD CONSTRAINT ck_qa_ehs_drill_records_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['in_progress','completed','cancelled'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_risk_controls DROP CONSTRAINT IF EXISTS qa_ehs_risk_controls_status_check;
ALTER TABLE ehs.qa_ehs_risk_controls DROP CONSTRAINT IF EXISTS ck_qa_ehs_risk_controls_status_standard;
ALTER TABLE ehs.qa_ehs_risk_controls ADD CONSTRAINT ck_qa_ehs_risk_controls_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['active','completed'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_investigations DROP CONSTRAINT IF EXISTS qa_ehs_investigations_status_check;
ALTER TABLE ehs.qa_ehs_investigations DROP CONSTRAINT IF EXISTS ck_qa_ehs_investigations_status_standard;
ALTER TABLE ehs.qa_ehs_investigations ADD CONSTRAINT ck_qa_ehs_investigations_status_standard
  CHECK (status = ANY (ARRAY['in_progress','completed'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_treatments DROP CONSTRAINT IF EXISTS qa_ehs_treatments_status_check;
ALTER TABLE ehs.qa_ehs_treatments DROP CONSTRAINT IF EXISTS ck_qa_ehs_treatments_status_standard;
ALTER TABLE ehs.qa_ehs_treatments ADD CONSTRAINT ck_qa_ehs_treatments_status_standard
  CHECK (status = ANY (ARRAY['in_progress','completed'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_treatment_actions DROP CONSTRAINT IF EXISTS qa_ehs_treatment_actions_status_check;
ALTER TABLE ehs.qa_ehs_treatment_actions DROP CONSTRAINT IF EXISTS ck_qa_ehs_treatment_actions_status_standard;
ALTER TABLE ehs.qa_ehs_treatment_actions ADD CONSTRAINT ck_qa_ehs_treatment_actions_status_standard
  CHECK (status = ANY (ARRAY['pending','completed'])) NOT VALID;

ALTER TABLE ehs.qa_ehs_incident_actions DROP CONSTRAINT IF EXISTS qa_ehs_incident_actions_status_check;
ALTER TABLE ehs.qa_ehs_incident_actions DROP CONSTRAINT IF EXISTS ck_qa_ehs_incident_actions_status_standard;
ALTER TABLE ehs.qa_ehs_incident_actions ADD CONSTRAINT ck_qa_ehs_incident_actions_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','verified'])) NOT VALID;

COMMIT;
