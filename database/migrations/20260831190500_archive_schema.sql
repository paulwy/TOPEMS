-- 2026-08-31 P1-2 阶段0 收尾：public 中 _archive_* 旧版表移入独立 archive schema
-- 背景：阶段 0 A-E 归位过程中，同名旧版表归档为 _archive_*（数据保留，101 张）。
--       为收敛 public，将其整体移入 archive schema（数据不删除，仅物理归位）。
-- 幂等：schema 已建跳过 CREATE；仅移动 public 中 _archive_* 表。
CREATE SCHEMA IF NOT EXISTS archive;
DO $mig$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE '\_archive\_%' ESCAPE '\'
    ORDER BY 1
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c2 JOIN pg_namespace n2 ON n2.oid=c2.relnamespace
                   WHERE n2.nspname='archive' AND c2.relname=r.relname AND c2.relkind='r') THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', r.relname);
    END IF;
  END LOOP;
END $mig$;
