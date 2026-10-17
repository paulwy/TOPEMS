-- 2026-10-17 ehs hazard 域：/hazards/{hazardId}/assessments|controls 补建真表（hazard 详情子资源）
-- 背景：前端 EhsHazardDetailPage（经 apps/web/src/modules/ehs/config.ts 注册可达）真实调用
--       ehsApi.listRiskAssessments(hazardId)（:184）/listControlMeasures(hazardId)（:200）/
--       createControlMeasure(hazardId,data)（:285）/deleteControlMeasure(hazardId,measureId)（:332）
--       （apps/web/src/api/ehs/hazard.ts：GET|POST /hazards/{id}/assessments、GET|POST /hazards/{id}/controls、
--       PUT|DELETE /hazards/{id}/controls/{measureId}），后端 hazard.rs 未注册这些路由 = 真实 404。
-- 现状：ehs.risk_assessments/risk_controls 是 Risk 域表（无 hazard_id 列、likelihood 为 integer、control_type 语义
--      不同），与前端 RiskAssessment（hazard_id/severity/likelihood 三态字符串/risklevel/recommendations）与
--      ControlMeasure（hazard_id/measure_type/description/responsible/deadline/effectiveness）契约深度错位，
--      复用会污染 Risk 域。方案：按前端契约新建 2 张 hazard 子资源表（qa_ 前缀表为业务台账，hazard_ 前缀对齐
--      现有 safety_hazards/risk_assessments 的裸表风格），RLS 策略照 risk_assessments 现有强制策略（含超管 nil 分支）。
-- 幂等：CREATE TABLE IF NOT EXISTS + CREATE POLICY IF NOT EXISTS 可重复执行。

CREATE TABLE IF NOT EXISTS ehs.hazard_risk_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_id uuid NOT NULL REFERENCES ehs.qa_ehs_hazards(id),
    assessment_date timestamptz,
    assessor varchar(100),
    severity varchar(16) NOT NULL DEFAULT 'medium',
    likelihood varchar(16) NOT NULL DEFAULT 'medium',
    risklevel varchar(32),
    recommendations text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
);
CREATE INDEX IF NOT EXISTS idx_hazard_risk_assessments_hazard_id
    ON ehs.hazard_risk_assessments(hazard_id);
ALTER TABLE ehs.hazard_risk_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_hazard_risk_assessments ON ehs.hazard_risk_assessments;
CREATE POLICY tenant_isolation_hazard_risk_assessments ON ehs.hazard_risk_assessments
    FOR ALL USING (
        (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')::text)
        OR (tenant_id IS NULL)
        OR (NULLIF(current_setting('app.tenant_id', true), '')::text = '00000000-0000-0000-0000-000000000000'::text)
    )
    WITH CHECK (
        (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')::text)
        OR (NULLIF(current_setting('app.tenant_id', true), '')::text = '00000000-0000-0000-0000-000000000000'::text)
    );

CREATE TABLE IF NOT EXISTS ehs.hazard_control_measures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_id uuid NOT NULL REFERENCES ehs.qa_ehs_hazards(id),
    measure_type varchar(32) NOT NULL DEFAULT 'engineering',
    description text,
    responsible varchar(100),
    deadline timestamptz,
    status varchar(32) NOT NULL DEFAULT 'pending',
    effectiveness varchar(50),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
);
CREATE INDEX IF NOT EXISTS idx_hazard_control_measures_hazard_id
    ON ehs.hazard_control_measures(hazard_id);
ALTER TABLE ehs.hazard_control_measures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_hazard_control_measures ON ehs.hazard_control_measures;
CREATE POLICY tenant_isolation_hazard_control_measures ON ehs.hazard_control_measures
    FOR ALL USING (
        (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')::text)
        OR (tenant_id IS NULL)
        OR (NULLIF(current_setting('app.tenant_id', true), '')::text = '00000000-0000-0000-0000-000000000000'::text)
    )
    WITH CHECK (
        (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')::text)
        OR (NULLIF(current_setting('app.tenant_id', true), '')::text = '00000000-0000-0000-0000-000000000000'::text)
    );
