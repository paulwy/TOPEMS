-- 2026-09-01 活跃表归位：quality→mes（mes 引用 + qms 用显式 qa_ 前缀表无冲突 + 0 行）；quality_tasks 无引用死表 DROP
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='quality_inspections' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='quality_inspections' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."quality_inspections" SET SCHEMA mes';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='quality_standards' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='quality_standards' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."quality_standards" SET SCHEMA mes';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='quality_patrols' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='quality_patrols' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."quality_patrols" SET SCHEMA mes';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='quality_patrol_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."quality_patrol_items" SET SCHEMA mes';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='quality_standard_values' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."quality_standard_values" SET SCHEMA mes';
  END IF;
END $rehome$;
DROP TABLE IF EXISTS public.quality_tasks CASCADE;
