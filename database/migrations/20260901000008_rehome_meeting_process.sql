-- 2026-09-01 活跃表归位：meeting→erp、process→mes（仅引用服务 + search_path 含目标 schema + 0 行 + 无同名冲突）
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='meeting_bookings' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='erp' AND c.relname='meeting_bookings' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."meeting_bookings" SET SCHEMA erp';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='meeting_rooms' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='erp' AND c.relname='meeting_rooms' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."meeting_rooms" SET SCHEMA erp';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='process_flows' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='process_flows' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."process_flows" SET SCHEMA mes';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='process_flow_steps' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."process_flow_steps" SET SCHEMA mes';
  END IF;
END $rehome$;
