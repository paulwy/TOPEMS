-- 2026-10-17 ehs environmental_compliance 域：assessments + permits 接真表补列
-- 背景：前端 compliance.ts（CompliancePage 真实消费 listComplianceAssessments/listDischargePermits 等，
--       前端契约 apps/web/src/api/ehs/types/environment.ts）调 /environmental-compliance/assessments 与
--       /environmental-compliance/permits；后端 handler 为内存桩，且 assessments 路径（前端 /assessments
--       vs 后端 /evaluations）此前不匹配 → 前端真实调用 404 = 契约撒谎面。
-- 现状：ehs.qa_ehs_compliance_evaluations（20 列，RLS 已就绪）缺 non_complianceitems/corrective_actions 2 列
--       对齐前端 ComplianceAssessment；ehs.qa_ehs_discharge_permits（20 列，RLS 已就绪）缺
--       permit_category/discharge_limits/monitoring_requirements 3 列对齐前端 DischargePermit。两表均 0 行。
-- 方案（后端宽容、零回归）：仅补缺列，既有列/RLS 不动；列别名映射（handler 层做）：
--       assessment_no←eval_no、assessment_type←eval_type、scope←eval_period、period_start←start_date、
--       period_end←end_date、assessor←evaluator、assessment_date←evaluated_at、result←overall_result、
--       score←compliance_rate、title←permit_name、issue_date←issued_date、effective_date←valid_from、
--       expiry_date←valid_to。幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE ehs.qa_ehs_compliance_evaluations
    ADD COLUMN IF NOT EXISTS non_complianceitems jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS corrective_actions text;

ALTER TABLE ehs.qa_ehs_discharge_permits
    ADD COLUMN IF NOT EXISTS permit_category varchar(64),
    ADD COLUMN IF NOT EXISTS discharge_limits jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS monitoring_requirements text;
