-- TOPEMS database migration 20260920000081
-- flow create 500：core_workflows CHECK 约束 ck_core_workflows_status_standard
-- 仅允许 active/inactive/archived，但代码 status 为自由文本（draft/published/deleted/system...），
-- create 默认 draft 违反约束。约束过严且与应用层状态机冲突，移除（status 由应用层校验）。
-- 三 schema 副本（public/rs/core）全部处理，幂等。

DO $$
BEGIN
  IF to_regclass('public.core_workflows') IS NOT NULL THEN
    ALTER TABLE public.core_workflows DROP CONSTRAINT IF EXISTS ck_core_workflows_status_standard;
  END IF;
  IF to_regclass('rs.core_workflows') IS NOT NULL THEN
    ALTER TABLE rs.core_workflows DROP CONSTRAINT IF EXISTS ck_core_workflows_status_standard;
  END IF;
  IF to_regclass('core.core_workflows') IS NOT NULL THEN
    ALTER TABLE core.core_workflows DROP CONSTRAINT IF EXISTS ck_core_workflows_status_standard;
  END IF;
END $$;
