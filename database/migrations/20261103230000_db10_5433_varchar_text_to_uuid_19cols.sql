-- ============================================================
-- DB-10: 5433 varchar/text → uuid 19 列对齐 test
--
-- 背景：类型批次——test=uuid, 5433=varchar/text，5433 对齐 test。
-- 关键实测（2026-11-03）：全空表，无数据转换。
-- ============================================================

SET lock_timeout = '5s';

ALTER TABLE hrm.audit_logs ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE integration.erp_connections ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE integration.erp_mappings ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE integration.external_erp_sync_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mes.permission_audit_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mes.teams ALTER COLUMN leader_id TYPE uuid USING leader_id::uuid;
ALTER TABLE mes.tenant_permissions ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mes.work_reports ALTER COLUMN approved_by TYPE uuid USING approved_by::uuid;
ALTER TABLE public.erp_connections ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.erp_mappings ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.external_erp_sync_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.permission_audit_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE wms.batches ALTER COLUMN location_id TYPE uuid USING location_id::uuid;
ALTER TABLE wms.batches ALTER COLUMN supplier_id TYPE uuid USING supplier_id::uuid;
ALTER TABLE mes.material_plans ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_announcements ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_calendar_events ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_meetings ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_tasks ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
