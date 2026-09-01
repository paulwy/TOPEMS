-- 2026-08-31 P1-2 阶段0 schema 归位（D 项）：跨域同步表 public → 业务 schema
-- 背景：public 中 7 张跨域同步表与目标 schema 同名并存（public 旧版 / 业务 schema 新版为运行真相）。
--      代码引用均指向业务 schema（lims/integration 显式前缀或 search_path 优先）。
-- 处理：public 旧版全部归档 _archive_*（数据保留）。
-- 幂等：仅在表仍位于 public 时执行。
DO $mig$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='analytics_sync_records' AND c.relkind='r')
  THEN ALTER TABLE public.analytics_sync_records RENAME TO _archive_analytics_sync_records; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='conversion_executions' AND c.relkind='r')
  THEN ALTER TABLE public.conversion_executions RENAME TO _archive_conversion_executions; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='conversion_rules' AND c.relkind='r')
  THEN ALTER TABLE public.conversion_rules RENAME TO _archive_conversion_rules; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_inter_module_sync' AND c.relkind='r')
  THEN ALTER TABLE public.core_inter_module_sync RENAME TO _archive_core_inter_module_sync; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_ehs_sync_records' AND c.relkind='r')
  THEN ALTER TABLE public.qa_ehs_sync_records RENAME TO _archive_qa_ehs_sync_records; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lims_sync_records' AND c.relkind='r')
  THEN ALTER TABLE public.qa_lims_sync_records RENAME TO _archive_qa_lims_sync_records; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_qms_sync_records' AND c.relkind='r')
  THEN ALTER TABLE public.qa_qms_sync_records RENAME TO _archive_qa_qms_sync_records; END IF;
END $mig$;
