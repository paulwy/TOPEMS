-- schema_defense 服务级补列批次 [finance]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- finance.finance_compliance_reports: +10 列
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "controls_checked" BIGINT;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "executive_summary" TEXT;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "generated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "issues_found" BIGINT;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "period_end" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "period_start" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "recommendations" JSONB;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "report_type" VARCHAR(30);
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "risk_assessments" JSONB;
ALTER TABLE IF EXISTS "finance"."finance_compliance_reports" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- finance.finance_control_matrices: +8 列
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "compliance_rate" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "controls" JSONB;
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(100);
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "effective_controls" BIGINT;
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "name" VARCHAR(200);
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "period" VARCHAR(20);
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "finance"."finance_control_matrices" ADD COLUMN IF NOT EXISTS "total_controls" BIGINT;

-- finance.finance_control_points: +12 列
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "category" VARCHAR(30);
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "code" VARCHAR(50);
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "control_type" VARCHAR(30);
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(100);
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "frequency" VARCHAR(30);
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN;
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "name" VARCHAR(200);
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "risk_level" VARCHAR(30);
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "finance"."finance_control_points" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- finance.finance_risk_assessments: +10 列
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "assessed_by" VARCHAR(100);
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "control_point_id" UUID;
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "impact" VARCHAR(20);
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "likelihood" VARCHAR(20);
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "mitigation_strategy" TEXT;
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "residual_risk" VARCHAR(20);
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "risk_level" VARCHAR(20);
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "risk_score" INT;
ALTER TABLE IF EXISTS "finance"."finance_risk_assessments" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- finance.settlement_center_dashboards: +6 列
ALTER TABLE IF EXISTS "finance"."settlement_center_dashboards" ADD COLUMN IF NOT EXISTS "config" JSONB;
ALTER TABLE IF EXISTS "finance"."settlement_center_dashboards" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "finance"."settlement_center_dashboards" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE IF EXISTS "finance"."settlement_center_dashboards" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN;
ALTER TABLE IF EXISTS "finance"."settlement_center_dashboards" ADD COLUMN IF NOT EXISTS "name" VARCHAR(100);
ALTER TABLE IF EXISTS "finance"."settlement_center_dashboards" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
