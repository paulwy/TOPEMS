-- 回滚：20261118150000_batch0_active_residual_rls_strict.sql
-- 恢复 public.core_file_permissions / public.monitor_thresholds / public.core_users
-- 到「RLS 关闭、无策略」原状，并删除本批新增的 tenant_id 索引。
-- 本批不改数据，无需反向回填。

BEGIN;

DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_file_permissions;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.monitor_thresholds;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_users;

ALTER TABLE public.core_file_permissions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_file_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_thresholds   NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_thresholds   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_users           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_users           DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS public.idx_core_file_permissions_tenant_id;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261118150000;

COMMIT;
