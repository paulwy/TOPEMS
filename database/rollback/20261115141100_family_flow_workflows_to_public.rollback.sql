-- 回滚 20261115141100 family_flow_workflows_to_public
-- 本迁移对外层去重后写入 0 行；隔离表可能留有条目，一并清理，便于重跑。
DELETE FROM public.migration_quarantine_rows WHERE migration_version = '20261115141100';
