-- 2026-08-31 P1-2 阶段0 schema 归位（B 项子项）：core_master_data_*/core_mdm_* public → master_data
-- 背景：master-data 域表（5 张，空表）历史遗留 public；建立 master_data schema 归位。
--      引用方为 shared-db（MasterDataRefService::new 默认表名 / ReconciliationLogService），
--      迁移后以显式 master_data.* 前缀访问（见 lib/shared-db 同步修改）。
-- 幂等：schema 已建则跳过 CREATE；表仅当仍位于 public 时迁移。
CREATE SCHEMA IF NOT EXISTS master_data;
DO $mig$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND (c.relname LIKE 'core\_master\_data\_%' ESCAPE '\' OR c.relname LIKE 'core\_mdm\_%' ESCAPE '\')
    ORDER BY 1
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c2 JOIN pg_namespace n2 ON n2.oid=c2.relnamespace
                   WHERE n2.nspname='master_data' AND c2.relname=r.relname AND c2.relkind='r') THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA master_data', r.relname);
      RAISE NOTICE 'migrated % → master_data', r.relname;
    ELSE
      EXECUTE format('ALTER TABLE public.%I RENAME TO _archive_%I', r.relname, r.relname);
      RAISE NOTICE 'archived % (master_data 同名)', r.relname;
    END IF;
  END LOOP;
END $mig$;
