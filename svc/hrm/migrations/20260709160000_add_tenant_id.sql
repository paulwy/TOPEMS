-- TOPEMS HRM 数据库迁移脚本
-- 为所有 HRM 表添加 tenant_id 字段以支持多租户

-- ============================================
-- 1. 公司表 (companies)
-- ============================================
ALTER TABLE hrm.companies ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.companies SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE hrm.companies ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON hrm.companies(tenant_id);

-- ============================================
-- 2. 部门表 (departments)
-- ============================================
ALTER TABLE hrm.departments ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.departments SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE hrm.departments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON hrm.departments(tenant_id);

-- ============================================
-- 3. 职位表 (positions)
-- ============================================
ALTER TABLE hrm.positions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.positions SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE hrm.positions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_positions_tenant_id ON hrm.positions(tenant_id);

-- ============================================
-- 4. 员工表 (employees)
-- ============================================
ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.employees SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE hrm.employees ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON hrm.employees(tenant_id);

-- ============================================
-- 5. 合同表 (contracts)
-- ============================================
ALTER TABLE hrm.contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.contracts c SET tenant_id = (SELECT e.tenant_id FROM hrm.employees e WHERE e.id = c.employee_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.contracts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON hrm.contracts(tenant_id);

-- ============================================
-- 6. 考勤表 (attendance_records)
-- ============================================
ALTER TABLE hrm.attendance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.attendance_records ar SET tenant_id = (SELECT e.tenant_id FROM hrm.employees e WHERE e.id = ar.employee_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.attendance_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON hrm.attendance_records(tenant_id);

-- ============================================
-- 7. 薪资表 (payroll_records)
-- ============================================
ALTER TABLE hrm.payroll_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.payroll_records pr SET tenant_id = (SELECT e.tenant_id FROM hrm.employees e WHERE e.id = pr.employee_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.payroll_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_id ON hrm.payroll_records(tenant_id);

-- ============================================
-- 8. 绩效表 (performance_records)
-- ============================================
ALTER TABLE hrm.performance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.performance_records pr SET tenant_id = (SELECT e.tenant_id FROM hrm.employees e WHERE e.id = pr.employee_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.performance_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_performance_tenant_id ON hrm.performance_records(tenant_id);

-- ============================================
-- 9. 培训表 (training_records)
-- ============================================
ALTER TABLE hrm.training_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.training_records SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE hrm.training_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_tenant_id ON hrm.training_records(tenant_id);

-- ============================================
-- 培训参与表 (training_participants)
-- ============================================
ALTER TABLE hrm.training_participants ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.training_participants tp SET tenant_id = (SELECT e.tenant_id FROM hrm.employees e WHERE e.id = tp.employee_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.training_participants ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_participants_tenant_id ON hrm.training_participants(tenant_id);

-- ============================================
-- 10. 招聘表 (recruitment_records)
-- ============================================
ALTER TABLE hrm.recruitment_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.recruitment_records SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE hrm.recruitment_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recruitment_tenant_id ON hrm.recruitment_records(tenant_id);

-- ============================================
-- 招聘申请表 (recruitment_applications)
-- ============================================
ALTER TABLE hrm.recruitment_applications ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.recruitment_applications ra SET tenant_id = (SELECT rr.tenant_id FROM hrm.recruitment_records rr WHERE rr.id = ra.recruitment_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.recruitment_applications ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_tenant_id ON hrm.recruitment_applications(tenant_id);

-- ============================================
-- 11. 请假表 (leave_records)
-- ============================================
ALTER TABLE hrm.leave_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.leave_records lr SET tenant_id = (SELECT e.tenant_id FROM hrm.employees e WHERE e.id = lr.employee_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.leave_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leave_tenant_id ON hrm.leave_records(tenant_id);

-- ============================================
-- 12. 薪资调整表 (salary_adjustments)
-- ============================================
ALTER TABLE hrm.salary_adjustments ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.salary_adjustments sa SET tenant_id = (SELECT e.tenant_id FROM hrm.employees e WHERE e.id = sa.employee_id) WHERE tenant_id IS NULL;
ALTER TABLE hrm.salary_adjustments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_tenant_id ON hrm.salary_adjustments(tenant_id);

-- ============================================
-- 13. 审计日志表 (audit_logs)
-- ============================================
ALTER TABLE hrm.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE hrm.audit_logs SET tenant_id = organization_id WHERE tenant_id IS NULL;
ALTER TABLE hrm.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON hrm.audit_logs(tenant_id);

COMMENT ON COLUMN hrm.companies.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.departments.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.positions.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.employees.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.contracts.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.attendance_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.payroll_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.performance_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.training_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.training_participants.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.recruitment_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.recruitment_applications.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.leave_records.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.salary_adjustments.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN hrm.audit_logs.tenant_id IS '租户ID，用于多租户隔离';
