-- 2026-09-02 运行库(5433)治理：qa_ehs_*/qa_* 活跃表归位 ehs/qms schema（对齐 5432 治理后结构）
-- 依据：5432 ehs/qms schema 同名表已归位；5433 因旧镜像服务未 schema 化残留在 public
-- 执行时机：停服后、新服务启动前（避免新服务建空表冲突）
-- 前置：5433 无 ehs/qms schema（服务 init_database 建 schema，停服期间需显式创建）
CREATE SCHEMA IF NOT EXISTS ehs;
CREATE SCHEMA IF NOT EXISTS qms;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_accident_investigations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_accident_investigations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_accident_investigations" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_accident_reviews' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_accident_reviews' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_accident_reviews" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_accident_treatments' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_accident_treatments' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_accident_treatments" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_accidents' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_accidents' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_accidents" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_compliance_evaluations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_compliance_evaluations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_compliance_evaluations" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_compliance_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_compliance_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_compliance_items" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_contraindications' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_contraindications' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_contraindications" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_detection_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_detection_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_detection_records" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_discharge_permits' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_discharge_permits' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_discharge_permits" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_disease_cases' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_disease_cases' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_disease_cases" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_drill_evaluations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_evaluations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_drill_evaluations" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_drill_plans' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_plans' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_drill_plans" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_drill_problems' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_problems' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_drill_problems" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_drill_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_drill_records" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_emergency_plan_approvals' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plan_approvals' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_emergency_plan_approvals" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_emergency_plan_supplies' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plan_supplies' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_emergency_plan_supplies" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_emergency_plan_versions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plan_versions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_emergency_plan_versions" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_emergency_plans' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_emergency_plans' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_emergency_plans" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_employees' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_employees' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_employees" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_env_monitor_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_env_monitor_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_env_monitor_records" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_environment' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_environment' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_environment" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_environment_incidents' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_environment_incidents' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_environment_incidents" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_environmental_regulations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_environmental_regulations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_environmental_regulations" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_hazard_factors' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazard_factors' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_hazard_factors" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_hazard_rectifications' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazard_rectifications' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_hazard_rectifications" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_hazard_verifications' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazard_verifications' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_hazard_verifications" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_hazardous_materials' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazardous_materials' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_hazardous_materials" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_hazards' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazards' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_hazards" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_health_abnormalities' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_abnormalities' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_health_abnormalities" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_health_exam_plans' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_exam_plans' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_health_exam_plans" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_health_exam_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_exam_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_health_exam_records" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_health_trainings' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_health_trainings' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_health_trainings" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_inspection_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_inspection_items" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_inspection_plans' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_plans' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_inspection_plans" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_inspection_record_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_record_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_inspection_record_items" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_inspection_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_inspection_records" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_material_stocks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_material_stocks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_material_stocks" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_msds' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_msds' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_msds" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_protection_measures' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_protection_measures' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_protection_measures" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_risks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_risks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_risks" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_stock_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_stock_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_stock_records" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_sync_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_sync_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_sync_records" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_ehs_trainings' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ehs' AND c.relname='qa_ehs_trainings' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_ehs_trainings" SET SCHEMA ehs';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_alert_messages' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_alert_messages' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_alert_messages" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_alert_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_alert_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_alert_rules" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_apqp_approvals' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_apqp_approvals' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_apqp_approvals" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_apqp_phases' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_apqp_phases' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_apqp_phases" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_apqp_projects' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_apqp_projects' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_apqp_projects" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_apqp_risks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_apqp_risks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_apqp_risks" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_apqp_tasks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_apqp_tasks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_apqp_tasks" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_audit_findings' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_audit_findings' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_audit_findings" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_audit_plans' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_audit_plans' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_audit_plans" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_audit_tasks' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_audit_tasks' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_audit_tasks" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_corrective_action_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_corrective_action_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_corrective_action_items" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_corrective_actions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_corrective_actions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_corrective_actions" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_eightd_audit_logs' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_eightd_audit_logs' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_eightd_audit_logs" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_eightd_reports' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_eightd_reports' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_eightd_reports" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_fmea_analyses' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_fmea_analyses' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_fmea_analyses" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_fmea_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_fmea_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_fmea_items" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_inspection_audits' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_inspection_audits' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_inspection_audits" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_inspection_results' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_inspection_results' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_inspection_results" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_qms_sync_records' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_qms_sync_records' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_qms_sync_records" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_quality_costs' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_quality_costs' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_quality_costs" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_quality_inspections' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_quality_inspections' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_quality_inspections" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_quality_issues' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_quality_issues' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_quality_issues" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_spc_charts' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_spc_charts' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_spc_charts" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_spc_data_points' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_spc_data_points' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_spc_data_points" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_standard_revisions' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_standard_revisions' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_standard_revisions" SET SCHEMA qms';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='qa_standards' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='qms' AND c.relname='qa_standards' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."qa_standards" SET SCHEMA qms';
  END IF;
END $rehome$;
