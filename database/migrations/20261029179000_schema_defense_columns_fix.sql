-- schema_defense 补充补列：门禁 FAIL 剩余 12 处（deleted_at/updated_at/created_at/constraint）
-- 幂等 ALTER TABLE ADD COLUMN IF NOT EXISTS；类型取服务自建定义

ALTER TABLE IF EXISTS "public"."analysis_results" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."document_chunks" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."maps" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."pipelines" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."qa_history" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."wms_approval_events" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."inquiries" ADD COLUMN IF NOT EXISTS "constraint" TIMESTAMPTZ;
