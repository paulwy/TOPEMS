-- 回滚 20261117233000_master_data_schema_registry_rls.sql
-- 恢复：删除严格 B 范式策略与 RLS、恢复全局 name 唯一索引、移除 tenant_id 列与租户索引。
-- 注意：表在迁移前置断言中已保证为空；若回滚前已有租户数据，DROP COLUMN 会丢弃租户归属。

SELECT set_config('app.rls_system', 'on', false);

DROP POLICY IF EXISTS rls_tenant_isolation ON public.dynamic_data;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.schema_registry;

ALTER TABLE public.dynamic_data NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_registry NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.schema_registry DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS public.idx_dynamic_data_tenant_schema;
DROP INDEX IF EXISTS public.schema_registry_tenant_name_key;

CREATE UNIQUE INDEX schema_registry_name_key ON public.schema_registry (name);

ALTER TABLE public.dynamic_data DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.schema_registry DROP COLUMN IF EXISTS tenant_id;
