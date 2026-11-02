-- 2026-11-02: ehs 环境合规子模块（svc/ehs/src/modules/environmental_compliance.rs）
-- handler 引用的列在既有建表迁移中缺失，导致 GET/PUT/DELETE regulations/{id}、
-- 列表、monitoring、incidents 等系列端点 body 500（42P01 column does not exist）。
-- 按 handler SELECT/INSERT 列契约补列；ADD COLUMN IF NOT EXISTS 幂等（selfheal 惯例）。

ALTER TABLE ehs.qa_ehs_environmental_regulations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE ehs.qa_ehs_environmental_regulations ADD COLUMN IF NOT EXISTS keywords JSONB;
ALTER TABLE ehs.qa_ehs_environmental_regulations ADD COLUMN IF NOT EXISTS applicable_scopes JSONB;
ALTER TABLE ehs.qa_ehs_environmental_regulations ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);

ALTER TABLE ehs.qa_ehs_env_monitor_records ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE ehs.qa_ehs_environment_incidents ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE ehs.qa_ehs_discharge_permits ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE ehs.qa_ehs_compliance_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
