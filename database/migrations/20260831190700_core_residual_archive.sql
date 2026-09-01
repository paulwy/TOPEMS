-- 2026-08-31 P1-2 阶段0 收尾：public 中无代码引用的 core_* 业务域残留表 → archive
-- 背景：逐表精确检查（裸名 + core_ 前缀词边界）确认以下 17 张无 svc/lib 代码引用，
--      属已合并/废弃服务的旧版残留（billing/ticket 部分/ticket 活动/guide 进度/email/mobile/tenant 用量等）。
--      平台契约表（core_users/tenants/roles/permissions/dict/menu/file/notification/plugin/workflows/subscriptions 等）保留 public。
-- 幂等：仅表仍在 public 且 archive 无同名时 SET SCHEMA。
DO $mig$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'core_billing_invoices','core_billing_plans',
    'core_ticket_activities','core_ticket_comments','core_ticket_sla_escalations','core_ticket_sla_policies',
    'core_guide_lessons','core_guide_progress',
    'core_location_messages','core_mobile_offline_records',
    'core_email_queue','core_email_templates','core_mail_templates',
    'core_tenant_usage','core_tenant_modules','core_tenant_settings',
    'core_api_version_configs'
  ]) AS relname
  LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=r.relname AND c.relkind='r')
       AND NOT EXISTS (SELECT 1 FROM pg_class c2 JOIN pg_namespace n2 ON n2.oid=c2.relnamespace
               WHERE n2.nspname='archive' AND c2.relname=r.relname AND c2.relkind='r') THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', r.relname);
      RAISE NOTICE 'archived %', r.relname;
    END IF;
  END LOOP;
END $mig$;
