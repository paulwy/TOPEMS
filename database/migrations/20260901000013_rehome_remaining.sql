-- 2026-09-01 剩余归位收尾：
-- DROP ticket 服务旧二进制测试重建的 3 张 public 影子表（0 行，正式二进制用 ticket schema）
-- 归位 vehicle_requests/vehicles → erp（仅 erp 引用、0 行）
-- DROP public.batch_records 影子（mes schema 有同名活表，mes 引用解析到 mes）
DROP TABLE IF EXISTS public.core_tickets CASCADE;
DROP TABLE IF EXISTS public.ticket_automation_rules CASCADE;
DROP TABLE IF EXISTS public.ticket_knowledge_articles CASCADE;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='vehicle_requests' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='erp' AND c.relname='vehicle_requests' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."vehicle_requests" SET SCHEMA erp';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='vehicles' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='erp' AND c.relname='vehicles' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."vehicles" SET SCHEMA erp';
  END IF;
END $rehome$;
DROP TABLE IF EXISTS public.batch_records CASCADE;
