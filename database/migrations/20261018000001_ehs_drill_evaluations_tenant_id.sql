-- ehs.qa_ehs_drill_evaluations 补 tenant_id（对齐 qa_ehs_drill_records；submit_drill_evaluation INSERT 引用）
ALTER TABLE ehs.qa_ehs_drill_evaluations ADD COLUMN IF NOT EXISTS tenant_id uuid;
