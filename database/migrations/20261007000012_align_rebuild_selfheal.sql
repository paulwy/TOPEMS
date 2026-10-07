-- ============================================================================
-- 20261007000012 — 双库收敛收尾：清理 5432 演进库残留表 + 补齐 5433 空库重建缺口
-- ============================================================================
-- 背景（②重建验证第三次全量复扫）:
--   * 5432 应用磁盘版 0004-0007（checksum 对齐重放）+ 0009-0011 后，
--     复扫暴露 4 张"迁移链决策已淘汰/运行时 DDL 残留"表（全 0 行）:
--       - iam.tenant_permissions / iam.tool_permissions：服务以 search_path=iam
--         运行时内联 DDL 自建（迁移链 20260825000000/20260827000000 无前缀建表
--         在 public 解析），5433 空库链无此表；
--       - plugin_erp.accounting_subjects：V321(20260827000002) 已 DROP 迁往
--         plugin_finance（见该迁移 L45），5432 残留为历史未生效；
--       - public.equipment：服务运行时旧版 DDL 产物，迁移链无 CREATE。
--   * 同时补齐同表列缺口 58 列（5432 演进库有/5433 空库重放无）：
--       hrm.initialization_logs.tenant_id、iam.permission_audit_logs 9 列、
--       lims 13 表 tenant_id、public.equipment_* 27 列、wms 9 表 org_id。
-- 本迁移（幂等，可安全重放于 5432/5433）:
--   1. DROP IF EXISTS 上述 4 张残留表（全空，无数据丢失）；
--   2. ADD COLUMN IF NOT EXISTS 补齐 58 列（5432 已有 → no-op）。
-- ============================================================================
DROP TABLE IF EXISTS iam.tool_permissions;
DROP TABLE IF EXISTS iam.tenant_permissions;
DROP TABLE IF EXISTS plugin_erp.accounting_subjects;
-- public.equipment 被 public.equipment_*（运行时 DDL 旧版 FK）引用 → 先卸 FK 再 DROP
ALTER TABLE public.equipment_inspections DROP CONSTRAINT IF EXISTS equipment_inspections_equipment_id_fkey;
ALTER TABLE public.equipment_maintenance_records DROP CONSTRAINT IF EXISTS equipment_maintenance_records_equipment_id_fkey;
DROP TABLE IF EXISTS public.equipment;

-- =============================================================================
-- 由 scripts/gen-missing-columns-migration.py 生成（自愈验证后系统性补链）
-- 基线: postgres://topems:topems_secret@localhost:5432/topems?options=-csearch_path%3Diam%2Cmes%2Cpublic%2Canalytics  目标: postgres://topems:topems_secret@127.0.0.1:5433/topems
-- 同表缺失列: 58（ADD COLUMN IF NOT EXISTS 幂等）
-- =============================================================================

ALTER TABLE "hrm"."initialization_logs" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NOT NULL;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "changed_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "changed_by" character varying(64) NOT NULL;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "details" jsonb;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" inet;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "new_value" jsonb;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "old_value" jsonb;
ALTER TABLE "iam"."permission_audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "lims"."ai_analyses" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."document_relations" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."inspection_processes" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."inspection_records" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."inspection_tasks" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."instrument_calibrations" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."instruments" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."lab_ledger" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."maintenance_records" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."reagent_usages" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."reagents" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lims"."samples" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "abnormalities" text;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "created_at" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_code" character varying(64);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_id" uuid;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "equipment_name" character varying(256);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "inspection_date" timestamp without time zone;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "inspector" character varying(128);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "items" text;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "location" character varying(256);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "noiselevel" numeric(8,2);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'pending'::character varying;
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "temperature" numeric(8,2);
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "updated_at" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment_inspections" ADD COLUMN IF NOT EXISTS "vibration" numeric(8,2);
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "cost" numeric(12,2) DEFAULT 0;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "end_time" timestamp without time zone;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "equipment_id" uuid;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintainer" character varying(128);
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintenance_type" character varying(64) NOT NULL;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "remarks" text;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "result" character varying(256);
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "start_time" timestamp without time zone NOT NULL;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "status" character varying(32) DEFAULT 'pending'::character varying;
ALTER TABLE "public"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "updated_at" timestamp without time zone NOT NULL DEFAULT now();
ALTER TABLE "wms"."audit_logs" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."inbound_order_items" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."inventory_alert_records" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."inventory_alert_rules" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."outbound_order_items" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."transfer_items" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."transfers" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."wave_pick_items" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
ALTER TABLE "wms"."wave_picks" ADD COLUMN IF NOT EXISTS "org_id" uuid NOT NULL;
