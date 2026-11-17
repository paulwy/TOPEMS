-- master-data 低代码动态 Schema / 动态数据：补租户列 + 严格 B 范式 RLS
--
-- 定性依据（2026-11-17 克隆库 m2_dryrun_20261116 与生产 topems_prod 只读核查）：
--   public.schema_registry：列 id/deleted_at/name/title/description/schema_json/table_name/
--     is_active/version/created_at/updated_at，无 tenant_id；0 行；rls=false、0 策略；
--     建表迁移 20260725000001 无任何平台种子写入；name 为全局 UNIQUE。
--   public.dynamic_data：列 id/deleted_at/schema_id/data_json/created_at/updated_at，
--     无 tenant_id；0 行；rls=false、0 策略。
--   → 两表均由已认证请求写入租户自定义 Schema/数据，既无平台种子、也无租户列，
--     不属于「平台内置语料」；按用户规则判为漏隔离缺陷，走 B 范式补 tenant_id + 严格 RLS。
--
-- 严格 B 范式策略文本（与 20261117180000 一致）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 回填策略：硬断言两表为空，非 0 直接 RAISE 中止（历史行归属无法自动推断）。
--
-- 锁影响：ADD COLUMN（无默认值）+ SET NOT NULL 在空表上为瞬时；ENABLE/FORCE RLS
--   SHARE ROW EXCLUSIVE；CREATE POLICY ACCESS EXCLUSIVE。无 DML。

SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 1. 前置断言：表为空、列尚不存在
DO $pre$
DECLARE
    n_schema bigint;
    n_data bigint;
BEGIN
    SELECT count(*) INTO n_schema FROM public.schema_registry;
    SELECT count(*) INTO n_data FROM public.dynamic_data;
    IF n_schema <> 0 OR n_data <> 0 THEN
        RAISE EXCEPTION 'schema_registry/dynamic_data 非空（schema=%, data=%），需先人工确定租户归属再发数据迁移',
            n_schema, n_data;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'schema_registry' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'public.schema_registry.tenant_id 已存在，迁移疑似重复执行';
    END IF;
END
$pre$;

-- 2. 补租户列并收紧为 NOT NULL（空表，无需回填）
ALTER TABLE public.schema_registry ADD COLUMN tenant_id UUID;
ALTER TABLE public.dynamic_data ADD COLUMN tenant_id UUID;
ALTER TABLE public.schema_registry ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.dynamic_data ALTER COLUMN tenant_id SET NOT NULL;

-- 3. 名称唯一性从「全局」改为「租户内」，避免跨租户名称占用
DROP INDEX IF EXISTS public.schema_registry_name_key;
CREATE UNIQUE INDEX schema_registry_tenant_name_key
    ON public.schema_registry (tenant_id, name);
CREATE INDEX idx_dynamic_data_tenant_schema
    ON public.dynamic_data (tenant_id, schema_id);

-- 4. 严格 B 范式 RLS
ALTER TABLE public.schema_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.schema_registry
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.dynamic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_data FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.dynamic_data
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
