-- TOPEMS EHS 数据库迁移脚本
-- 为所有 EHS 表添加 tenant_id 字段以支持多租户
-- 包含数据填充、NOT NULL 约束、索引和 RLS 策略

BEGIN;

-- ============================================
-- 1. 风险表 (qa_ehs_risks)
-- ============================================
ALTER TABLE qa_ehs_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_risks SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_risks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_risks_tenant_id ON qa_ehs_risks(tenant_id);
ALTER TABLE qa_ehs_risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_risks ON qa_ehs_risks;
CREATE POLICY tenant_isolation_qa_ehs_risks ON qa_ehs_risks
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 2. 检查计划表 (qa_ehs_inspection_plans)
-- ============================================
ALTER TABLE qa_ehs_inspection_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_inspection_plans SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_inspection_plans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_plans_tenant_id ON qa_ehs_inspection_plans(tenant_id);
ALTER TABLE qa_ehs_inspection_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_inspection_plans ON qa_ehs_inspection_plans;
CREATE POLICY tenant_isolation_qa_ehs_inspection_plans ON qa_ehs_inspection_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 3. 检查项表 (qa_ehs_inspection_items)
-- ============================================
ALTER TABLE qa_ehs_inspection_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_inspection_items i
SET tenant_id = (SELECT p.tenant_id FROM qa_ehs_inspection_plans p WHERE p.id = i.plan_id)
WHERE tenant_id IS NULL AND plan_id IS NOT NULL;
UPDATE qa_ehs_inspection_items SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_inspection_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_items_tenant_id ON qa_ehs_inspection_items(tenant_id);
ALTER TABLE qa_ehs_inspection_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_inspection_items ON qa_ehs_inspection_items;
CREATE POLICY tenant_isolation_qa_ehs_inspection_items ON qa_ehs_inspection_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 4. 检查记录表 (qa_ehs_inspection_records)
-- ============================================
ALTER TABLE qa_ehs_inspection_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_inspection_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_inspection_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_records_tenant_id ON qa_ehs_inspection_records(tenant_id);
ALTER TABLE qa_ehs_inspection_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_inspection_records ON qa_ehs_inspection_records;
CREATE POLICY tenant_isolation_qa_ehs_inspection_records ON qa_ehs_inspection_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 5. 检查记录项表 (qa_ehs_inspection_record_items)
-- ============================================
ALTER TABLE qa_ehs_inspection_record_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_inspection_record_items ri
SET tenant_id = (SELECT r.tenant_id FROM qa_ehs_inspection_records r WHERE r.id = ri.record_id)
WHERE tenant_id IS NULL AND record_id IS NOT NULL;
UPDATE qa_ehs_inspection_record_items SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_inspection_record_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_tenant_id ON qa_ehs_inspection_record_items(tenant_id);
ALTER TABLE qa_ehs_inspection_record_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_inspection_record_items ON qa_ehs_inspection_record_items;
CREATE POLICY tenant_isolation_qa_ehs_inspection_record_items ON qa_ehs_inspection_record_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 6. 隐患表 (qa_ehs_hazards)
-- ============================================
ALTER TABLE qa_ehs_hazards ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_hazards SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_hazards ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_tenant_id ON qa_ehs_hazards(tenant_id);
ALTER TABLE qa_ehs_hazards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_hazards ON qa_ehs_hazards;
CREATE POLICY tenant_isolation_qa_ehs_hazards ON qa_ehs_hazards
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 7. 隐患整改表 (qa_ehs_hazard_rectifications)
-- ============================================
ALTER TABLE qa_ehs_hazard_rectifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_hazard_rectifications hr
SET tenant_id = (SELECT h.tenant_id FROM qa_ehs_hazards h WHERE h.id = hr.hazard_id)
WHERE tenant_id IS NULL AND hazard_id IS NOT NULL;
UPDATE qa_ehs_hazard_rectifications SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_hazard_rectifications ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_rectifications_tenant_id ON qa_ehs_hazard_rectifications(tenant_id);
ALTER TABLE qa_ehs_hazard_rectifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_hazard_rectifications ON qa_ehs_hazard_rectifications;
CREATE POLICY tenant_isolation_qa_ehs_hazard_rectifications ON qa_ehs_hazard_rectifications
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 8. 隐患验收表 (qa_ehs_hazard_verifications)
-- ============================================
ALTER TABLE qa_ehs_hazard_verifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_hazard_verifications hv
SET tenant_id = (SELECT h.tenant_id FROM qa_ehs_hazards h WHERE h.id = hv.hazard_id)
WHERE tenant_id IS NULL AND hazard_id IS NOT NULL;
UPDATE qa_ehs_hazard_verifications SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_hazard_verifications ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_verifications_tenant_id ON qa_ehs_hazard_verifications(tenant_id);
ALTER TABLE qa_ehs_hazard_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_hazard_verifications ON qa_ehs_hazard_verifications;
CREATE POLICY tenant_isolation_qa_ehs_hazard_verifications ON qa_ehs_hazard_verifications
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 9. 事故表 (qa_ehs_accidents)
-- ============================================
ALTER TABLE qa_ehs_accidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_accidents SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_accidents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_tenant_id ON qa_ehs_accidents(tenant_id);
ALTER TABLE qa_ehs_accidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_accidents ON qa_ehs_accidents;
CREATE POLICY tenant_isolation_qa_ehs_accidents ON qa_ehs_accidents
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 10. 事故调查表 (qa_ehs_accident_investigations)
-- ============================================
ALTER TABLE qa_ehs_accident_investigations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_accident_investigations ai
SET tenant_id = (SELECT a.tenant_id FROM qa_ehs_accidents a WHERE a.id = ai.accident_id)
WHERE tenant_id IS NULL AND accident_id IS NOT NULL;
UPDATE qa_ehs_accident_investigations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_accident_investigations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_investigations_tenant_id ON qa_ehs_accident_investigations(tenant_id);
ALTER TABLE qa_ehs_accident_investigations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_accident_investigations ON qa_ehs_accident_investigations;
CREATE POLICY tenant_isolation_qa_ehs_accident_investigations ON qa_ehs_accident_investigations
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 11. 事故处理表 (qa_ehs_accident_treatments)
-- ============================================
ALTER TABLE qa_ehs_accident_treatments ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_accident_treatments at
SET tenant_id = (SELECT a.tenant_id FROM qa_ehs_accidents a WHERE a.id = at.accident_id)
WHERE tenant_id IS NULL AND accident_id IS NOT NULL;
UPDATE qa_ehs_accident_treatments SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_accident_treatments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_treatments_tenant_id ON qa_ehs_accident_treatments(tenant_id);
ALTER TABLE qa_ehs_accident_treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_accident_treatments ON qa_ehs_accident_treatments;
CREATE POLICY tenant_isolation_qa_ehs_accident_treatments ON qa_ehs_accident_treatments
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 12. 事故复盘表 (qa_ehs_accident_reviews)
-- ============================================
ALTER TABLE qa_ehs_accident_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_accident_reviews ar
SET tenant_id = (SELECT a.tenant_id FROM qa_ehs_accidents a WHERE a.id = ar.accident_id)
WHERE tenant_id IS NULL AND accident_id IS NOT NULL;
UPDATE qa_ehs_accident_reviews SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_accident_reviews ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_reviews_tenant_id ON qa_ehs_accident_reviews(tenant_id);
ALTER TABLE qa_ehs_accident_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_accident_reviews ON qa_ehs_accident_reviews;
CREATE POLICY tenant_isolation_qa_ehs_accident_reviews ON qa_ehs_accident_reviews
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 13. 环境记录表 (qa_ehs_environment)
-- ============================================
ALTER TABLE qa_ehs_environment ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_environment SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_environment ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_environment_tenant_id ON qa_ehs_environment(tenant_id);
ALTER TABLE qa_ehs_environment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_environment ON qa_ehs_environment;
CREATE POLICY tenant_isolation_qa_ehs_environment ON qa_ehs_environment
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 14. 培训表 (qa_ehs_trainings)
-- ============================================
ALTER TABLE qa_ehs_trainings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_trainings SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_trainings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_trainings_tenant_id ON qa_ehs_trainings(tenant_id);
ALTER TABLE qa_ehs_trainings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_trainings ON qa_ehs_trainings;
CREATE POLICY tenant_isolation_qa_ehs_trainings ON qa_ehs_trainings
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 15. 同步记录表 (qa_ehs_sync_records)
-- ============================================
ALTER TABLE qa_ehs_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_sync_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_sync_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_records_tenant_id ON qa_ehs_sync_records(tenant_id);
ALTER TABLE qa_ehs_sync_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_sync_records ON qa_ehs_sync_records;
CREATE POLICY tenant_isolation_qa_ehs_sync_records ON qa_ehs_sync_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 16. 应急预案表 (qa_ehs_emergency_plans)
-- ============================================
ALTER TABLE qa_ehs_emergency_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_emergency_plans SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_emergency_plans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_tenant_id ON qa_ehs_emergency_plans(tenant_id);
ALTER TABLE qa_ehs_emergency_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_emergency_plans ON qa_ehs_emergency_plans;
CREATE POLICY tenant_isolation_qa_ehs_emergency_plans ON qa_ehs_emergency_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 17. 应急物资表 (qa_ehs_emergency_plan_supplies)
-- ============================================
ALTER TABLE qa_ehs_emergency_plan_supplies ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_emergency_plan_supplies eps
SET tenant_id = (SELECT ep.tenant_id FROM qa_ehs_emergency_plans ep WHERE ep.id = eps.plan_id)
WHERE tenant_id IS NULL AND plan_id IS NOT NULL;
UPDATE qa_ehs_emergency_plan_supplies SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_emergency_plan_supplies ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_supplies_tenant_id ON qa_ehs_emergency_plan_supplies(tenant_id);
ALTER TABLE qa_ehs_emergency_plan_supplies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_emergency_plan_supplies ON qa_ehs_emergency_plan_supplies;
CREATE POLICY tenant_isolation_qa_ehs_emergency_plan_supplies ON qa_ehs_emergency_plan_supplies
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 18. 预案版本表 (qa_ehs_emergency_plan_versions)
-- ============================================
ALTER TABLE qa_ehs_emergency_plan_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_emergency_plan_versions epv
SET tenant_id = (SELECT ep.tenant_id FROM qa_ehs_emergency_plans ep WHERE ep.id = epv.plan_id)
WHERE tenant_id IS NULL AND plan_id IS NOT NULL;
UPDATE qa_ehs_emergency_plan_versions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_emergency_plan_versions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_versions_tenant_id ON qa_ehs_emergency_plan_versions(tenant_id);
ALTER TABLE qa_ehs_emergency_plan_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_emergency_plan_versions ON qa_ehs_emergency_plan_versions;
CREATE POLICY tenant_isolation_qa_ehs_emergency_plan_versions ON qa_ehs_emergency_plan_versions
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 19. 预案审批表 (qa_ehs_emergency_plan_approvals)
-- ============================================
ALTER TABLE qa_ehs_emergency_plan_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_emergency_plan_approvals epa
SET tenant_id = (SELECT ep.tenant_id FROM qa_ehs_emergency_plans ep WHERE ep.id = epa.plan_id)
WHERE tenant_id IS NULL AND plan_id IS NOT NULL;
UPDATE qa_ehs_emergency_plan_approvals SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_emergency_plan_approvals ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_approvals_tenant_id ON qa_ehs_emergency_plan_approvals(tenant_id);
ALTER TABLE qa_ehs_emergency_plan_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_emergency_plan_approvals ON qa_ehs_emergency_plan_approvals;
CREATE POLICY tenant_isolation_qa_ehs_emergency_plan_approvals ON qa_ehs_emergency_plan_approvals
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 20. 演练计划表 (qa_ehs_drill_plans)
-- ============================================
ALTER TABLE qa_ehs_drill_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_drill_plans SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_drill_plans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_plans_tenant_id ON qa_ehs_drill_plans(tenant_id);
ALTER TABLE qa_ehs_drill_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_drill_plans ON qa_ehs_drill_plans;
CREATE POLICY tenant_isolation_qa_ehs_drill_plans ON qa_ehs_drill_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 21. 演练记录表 (qa_ehs_drill_records)
-- ============================================
ALTER TABLE qa_ehs_drill_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_drill_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_drill_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_tenant_id ON qa_ehs_drill_records(tenant_id);
ALTER TABLE qa_ehs_drill_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_drill_records ON qa_ehs_drill_records;
CREATE POLICY tenant_isolation_qa_ehs_drill_records ON qa_ehs_drill_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 22. 演练评估表 (qa_ehs_drill_evaluations)
-- ============================================
ALTER TABLE qa_ehs_drill_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_drill_evaluations de
SET tenant_id = (SELECT dr.tenant_id FROM qa_ehs_drill_records dr WHERE dr.id = de.drill_id)
WHERE tenant_id IS NULL AND drill_id IS NOT NULL;
UPDATE qa_ehs_drill_evaluations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_drill_evaluations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_evaluations_tenant_id ON qa_ehs_drill_evaluations(tenant_id);
ALTER TABLE qa_ehs_drill_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_drill_evaluations ON qa_ehs_drill_evaluations;
CREATE POLICY tenant_isolation_qa_ehs_drill_evaluations ON qa_ehs_drill_evaluations
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 23. 演练问题表 (qa_ehs_drill_problems)
-- ============================================
ALTER TABLE qa_ehs_drill_problems ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_drill_problems dp
SET tenant_id = (SELECT dr.tenant_id FROM qa_ehs_drill_records dr WHERE dr.id = dp.drill_id)
WHERE tenant_id IS NULL AND drill_id IS NOT NULL;
UPDATE qa_ehs_drill_problems SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_drill_problems ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_problems_tenant_id ON qa_ehs_drill_problems(tenant_id);
ALTER TABLE qa_ehs_drill_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_drill_problems ON qa_ehs_drill_problems;
CREATE POLICY tenant_isolation_qa_ehs_drill_problems ON qa_ehs_drill_problems
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 24. 体检计划表 (qa_ehs_health_exam_plans)
-- ============================================
ALTER TABLE qa_ehs_health_exam_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_health_exam_plans SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_health_exam_plans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_plans_tenant_id ON qa_ehs_health_exam_plans(tenant_id);
ALTER TABLE qa_ehs_health_exam_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_health_exam_plans ON qa_ehs_health_exam_plans;
CREATE POLICY tenant_isolation_qa_ehs_health_exam_plans ON qa_ehs_health_exam_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 25. 体检记录表 (qa_ehs_health_exam_records)
-- ============================================
ALTER TABLE qa_ehs_health_exam_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_health_exam_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_health_exam_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_tenant_id ON qa_ehs_health_exam_records(tenant_id);
ALTER TABLE qa_ehs_health_exam_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_health_exam_records ON qa_ehs_health_exam_records;
CREATE POLICY tenant_isolation_qa_ehs_health_exam_records ON qa_ehs_health_exam_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 26. 禁忌症表 (qa_ehs_contraindications)
-- ============================================
ALTER TABLE qa_ehs_contraindications ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_contraindications SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_contraindications ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_contraindications_tenant_id ON qa_ehs_contraindications(tenant_id);
ALTER TABLE qa_ehs_contraindications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_contraindications ON qa_ehs_contraindications;
CREATE POLICY tenant_isolation_qa_ehs_contraindications ON qa_ehs_contraindications
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 27. 健康异常表 (qa_ehs_health_abnormalities)
-- ============================================
ALTER TABLE qa_ehs_health_abnormalities ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_health_abnormalities ha
SET tenant_id = (SELECT her.tenant_id FROM qa_ehs_health_exam_records her WHERE her.id = ha.record_id)
WHERE tenant_id IS NULL AND record_id IS NOT NULL;
UPDATE qa_ehs_health_abnormalities SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_health_abnormalities ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_abnormalities_tenant_id ON qa_ehs_health_abnormalities(tenant_id);
ALTER TABLE qa_ehs_health_abnormalities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_health_abnormalities ON qa_ehs_health_abnormalities;
CREATE POLICY tenant_isolation_qa_ehs_health_abnormalities ON qa_ehs_health_abnormalities
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 28. 危害因素表 (qa_ehs_hazard_factors)
-- ============================================
ALTER TABLE qa_ehs_hazard_factors ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_hazard_factors SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_hazard_factors ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_factors_tenant_id ON qa_ehs_hazard_factors(tenant_id);
ALTER TABLE qa_ehs_hazard_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_hazard_factors ON qa_ehs_hazard_factors;
CREATE POLICY tenant_isolation_qa_ehs_hazard_factors ON qa_ehs_hazard_factors
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 29. 检测记录表 (qa_ehs_detection_records)
-- ============================================
ALTER TABLE qa_ehs_detection_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_detection_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_detection_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_detection_records_tenant_id ON qa_ehs_detection_records(tenant_id);
ALTER TABLE qa_ehs_detection_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_detection_records ON qa_ehs_detection_records;
CREATE POLICY tenant_isolation_qa_ehs_detection_records ON qa_ehs_detection_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 30. 职业病案例表 (qa_ehs_disease_cases)
-- ============================================
ALTER TABLE qa_ehs_disease_cases ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_disease_cases SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_disease_cases ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_disease_cases_tenant_id ON qa_ehs_disease_cases(tenant_id);
ALTER TABLE qa_ehs_disease_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_disease_cases ON qa_ehs_disease_cases;
CREATE POLICY tenant_isolation_qa_ehs_disease_cases ON qa_ehs_disease_cases
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 31. 防护措施表 (qa_ehs_protection_measures)
-- ============================================
ALTER TABLE qa_ehs_protection_measures ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_protection_measures SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_protection_measures ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_protection_measures_tenant_id ON qa_ehs_protection_measures(tenant_id);
ALTER TABLE qa_ehs_protection_measures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_protection_measures ON qa_ehs_protection_measures;
CREATE POLICY tenant_isolation_qa_ehs_protection_measures ON qa_ehs_protection_measures
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 32. 健康培训表 (qa_ehs_health_trainings)
-- ============================================
ALTER TABLE qa_ehs_health_trainings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_health_trainings SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_health_trainings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_trainings_tenant_id ON qa_ehs_health_trainings(tenant_id);
ALTER TABLE qa_ehs_health_trainings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_health_trainings ON qa_ehs_health_trainings;
CREATE POLICY tenant_isolation_qa_ehs_health_trainings ON qa_ehs_health_trainings
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 33. 危险化学品表 (qa_ehs_hazardous_materials)
-- ============================================
ALTER TABLE qa_ehs_hazardous_materials ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_hazardous_materials SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_hazardous_materials ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_tenant_id ON qa_ehs_hazardous_materials(tenant_id);
ALTER TABLE qa_ehs_hazardous_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_hazardous_materials ON qa_ehs_hazardous_materials;
CREATE POLICY tenant_isolation_qa_ehs_hazardous_materials ON qa_ehs_hazardous_materials
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 34. 物料库存表 (qa_ehs_material_stocks)
-- ============================================
ALTER TABLE qa_ehs_material_stocks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_material_stocks ms
SET tenant_id = (SELECT hm.tenant_id FROM qa_ehs_hazardous_materials hm WHERE hm.id = ms.material_id)
WHERE tenant_id IS NULL AND material_id IS NOT NULL;
UPDATE qa_ehs_material_stocks SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_material_stocks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_material_stocks_tenant_id ON qa_ehs_material_stocks(tenant_id);
ALTER TABLE qa_ehs_material_stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_material_stocks ON qa_ehs_material_stocks;
CREATE POLICY tenant_isolation_qa_ehs_material_stocks ON qa_ehs_material_stocks
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 35. 库存记录表 (qa_ehs_stock_records)
-- ============================================
ALTER TABLE qa_ehs_stock_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_stock_records sr
SET tenant_id = (SELECT hm.tenant_id FROM qa_ehs_hazardous_materials hm WHERE hm.id = sr.material_id)
WHERE tenant_id IS NULL AND material_id IS NOT NULL;
UPDATE qa_ehs_stock_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_stock_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_tenant_id ON qa_ehs_stock_records(tenant_id);
ALTER TABLE qa_ehs_stock_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_stock_records ON qa_ehs_stock_records;
CREATE POLICY tenant_isolation_qa_ehs_stock_records ON qa_ehs_stock_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 36. MSDS表 (qa_ehs_msds)
-- ============================================
ALTER TABLE qa_ehs_msds ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_msds m
SET tenant_id = (SELECT hm.tenant_id FROM qa_ehs_hazardous_materials hm WHERE hm.id = m.material_id)
WHERE tenant_id IS NULL AND material_id IS NOT NULL;
UPDATE qa_ehs_msds SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_msds ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_msds_tenant_id ON qa_ehs_msds(tenant_id);
ALTER TABLE qa_ehs_msds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_msds ON qa_ehs_msds;
CREATE POLICY tenant_isolation_qa_ehs_msds ON qa_ehs_msds
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 37. 环保法规表 (qa_ehs_environmental_regulations)
-- ============================================
ALTER TABLE qa_ehs_environmental_regulations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_environmental_regulations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_environmental_regulations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_environmental_regulations_tenant_id ON qa_ehs_environmental_regulations(tenant_id);
ALTER TABLE qa_ehs_environmental_regulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_environmental_regulations ON qa_ehs_environmental_regulations;
CREATE POLICY tenant_isolation_qa_ehs_environmental_regulations ON qa_ehs_environmental_regulations
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 38. 合规评估表 (qa_ehs_compliance_evaluations)
-- ============================================
ALTER TABLE qa_ehs_compliance_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_compliance_evaluations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_compliance_evaluations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_evaluations_tenant_id ON qa_ehs_compliance_evaluations(tenant_id);
ALTER TABLE qa_ehs_compliance_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_compliance_evaluations ON qa_ehs_compliance_evaluations;
CREATE POLICY tenant_isolation_qa_ehs_compliance_evaluations ON qa_ehs_compliance_evaluations
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 39. 合规项表 (qa_ehs_compliance_items)
-- ============================================
ALTER TABLE qa_ehs_compliance_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_compliance_items ci
SET tenant_id = (SELECT ce.tenant_id FROM qa_ehs_compliance_evaluations ce WHERE ce.id = ci.evaluation_id)
WHERE tenant_id IS NULL AND evaluation_id IS NOT NULL;
UPDATE qa_ehs_compliance_items SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_compliance_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_items_tenant_id ON qa_ehs_compliance_items(tenant_id);
ALTER TABLE qa_ehs_compliance_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_compliance_items ON qa_ehs_compliance_items;
CREATE POLICY tenant_isolation_qa_ehs_compliance_items ON qa_ehs_compliance_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 40. 环境监测记录表 (qa_ehs_env_monitor_records)
-- ============================================
ALTER TABLE qa_ehs_env_monitor_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_env_monitor_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_env_monitor_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_monitor_records_tenant_id ON qa_ehs_env_monitor_records(tenant_id);
ALTER TABLE qa_ehs_env_monitor_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_env_monitor_records ON qa_ehs_env_monitor_records;
CREATE POLICY tenant_isolation_qa_ehs_env_monitor_records ON qa_ehs_env_monitor_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 41. 排污许可证表 (qa_ehs_discharge_permits)
-- ============================================
ALTER TABLE qa_ehs_discharge_permits ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_discharge_permits SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_discharge_permits ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_discharge_permits_tenant_id ON qa_ehs_discharge_permits(tenant_id);
ALTER TABLE qa_ehs_discharge_permits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_discharge_permits ON qa_ehs_discharge_permits;
CREATE POLICY tenant_isolation_qa_ehs_discharge_permits ON qa_ehs_discharge_permits
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 42. 环境事件表 (qa_ehs_environment_incidents)
-- ============================================
ALTER TABLE qa_ehs_environment_incidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_ehs_environment_incidents SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_ehs_environment_incidents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_ehs_environment_incidents_tenant_id ON qa_ehs_environment_incidents(tenant_id);
ALTER TABLE qa_ehs_environment_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_qa_ehs_environment_incidents ON qa_ehs_environment_incidents;
CREATE POLICY tenant_isolation_qa_ehs_environment_incidents ON qa_ehs_environment_incidents
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMIT;
