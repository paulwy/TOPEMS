-- =============================================================================
-- 由 scripts/gen-missing-columns-migration.py 生成（自愈验证后系统性补链）
-- 基线: postgres://topems:topems_secret@127.0.0.1:5433/topems  目标: postgres://topems:topems_secret@localhost:5432/topems
-- 同表缺失列: 20（ADD COLUMN IF NOT EXISTS 幂等）
-- =============================================================================

ALTER TABLE "hrm"."attendance_records" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "hrm"."initialization_status" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "after" jsonb;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "before" jsonb;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "target_id" uuid;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "target_type" character varying(64) NOT NULL;
ALTER TABLE "lims"."samples" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "plugin_finance"."accounting_subjects" ADD COLUMN IF NOT EXISTS "organization_id" uuid NOT NULL DEFAULT gen_random_uuid();
