-- ============================================================
-- 20261123132000_search_projection_v2_company_scope.sql
--
-- W13 第一阶段：搜索投影 v2 建表（公司维度），先双写不切流
--
-- 背景（W13 三步方案，见 docs/database/company-scope-migration-waves-2026-11-23.md）：
--   * v1 `public.search_entity_projections` 无公司维度，无法按公司隔离检索；
--   * 本轮只建 v2 并开始双写，不做重命名切换、不改查询路径；
--   * v2.company_id 本轮允许 NULL：等待业务归属清单回填完成后，
--     另起迁移收紧为 NOT NULL（fail-closed 校验在收紧迁移里做）。
--
-- 变更内容：
--   1. 建 public.search_entity_projections_v2（列与 v1 对齐 + company_id uuid 可空）。
--   2. 建公司维度索引 (tenant_id, company_id, entity_type)。
--   3. GRANT 读写给 topems_app（search 服务写入与后续查询）。
--   4. ENABLE + FORCE RLS，两条策略：
--        - system：系统通道（搜索订阅者/回填/对账）全量读写；
--        - company_read：业务读按租户 + 公司可读（母公司可见其子公司，子公司仅本司）；
--          company_id IS NULL 的历史行对业务不可见（fail-closed，等待回填）。
--   5. COMMENT 说明 company_id 语义。
--   6. 后置断言：表/列/主键/索引/策略数/RLS ENABLE+FORCE。
--
-- 幂等性：CREATE TABLE/INDEX IF NOT EXISTS；策略先 DROP IF EXISTS 再建；
--   GRANT 幂等。文件内不含 BEGIN/COMMIT。
-- 回滚：database/rollback/20261123132000_search_projection_v2_company_scope.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

CREATE TABLE IF NOT EXISTS public.search_entity_projections_v2 (
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    company_id UUID,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    name TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT,
    remark TEXT,
    source_updated_at TIMESTAMPTZ,
    projected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, entity_type, entity_id)
);

-- 公司维度检索索引（母公司按公司过滤 / 子公司定位本司）
CREATE INDEX IF NOT EXISTS idx_sep_v2_tenant_company_type
    ON public.search_entity_projections_v2(tenant_id, company_id, entity_type);

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.search_entity_projections_v2 TO topems_app;

ALTER TABLE public.search_entity_projections_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_entity_projections_v2 FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_entity_projections_v2_system
    ON public.search_entity_projections_v2;
DROP POLICY IF EXISTS search_entity_projections_v2_company_read
    ON public.search_entity_projections_v2;

-- 系统通道：搜索订阅者、回填与对账脚本全量读写
CREATE POLICY search_entity_projections_v2_system
    ON public.search_entity_projections_v2
    FOR ALL
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

-- 业务读：本租户 + 公司可读；company_id NULL 的历史行不可见（等待回填）
CREATE POLICY search_entity_projections_v2_company_read
    ON public.search_entity_projections_v2
    FOR SELECT
    USING (
        tenant_id = erp.group_tenant_of(
            NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        AND company_id IS NOT NULL
        AND erp.company_readable(company_id)
    );

COMMENT ON COLUMN public.search_entity_projections_v2.company_id IS
    '投影归属公司（W13）：本轮可空；历史行待业务清单回填，之后另行收紧 NOT NULL';

DO $w13_v2_assert$
DECLARE
    v_policy_count integer;
BEGIN
    IF to_regclass('public.search_entity_projections_v2') IS NULL THEN
        RAISE EXCEPTION '后置断言失败：public.search_entity_projections_v2 不存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'search_entity_projections_v2'
           AND column_name = 'company_id'
           AND data_type = 'uuid'
           AND is_nullable = 'YES'
           AND column_default IS NULL
    ) THEN
        RAISE EXCEPTION '后置断言失败：search_entity_projections_v2.company_id 类型/可空/默认不符合预期';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename = 'search_entity_projections_v2'
           AND indexname = 'idx_sep_v2_tenant_company_type'
    ) THEN
        RAISE EXCEPTION '后置断言失败：idx_sep_v2_tenant_company_type 不存在';
    END IF;

    SELECT count(*) INTO v_policy_count
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'search_entity_projections_v2';

    IF v_policy_count <> 2
       OR NOT EXISTS (
            SELECT 1 FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename = 'search_entity_projections_v2'
               AND policyname = 'search_entity_projections_v2_system')
       OR NOT EXISTS (
            SELECT 1 FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename = 'search_entity_projections_v2'
               AND policyname = 'search_entity_projections_v2_company_read')
    THEN
        RAISE EXCEPTION '后置断言失败：v2 策略应为 system + company_read 共 2 条，实际 %', v_policy_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relname = 'search_entity_projections_v2'
           AND c.relrowsecurity
           AND c.relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：v2 未同时 ENABLE+FORCE RLS';
    END IF;

    RAISE NOTICE 'W13: search_entity_projections_v2 已就绪（company_id 可空、2 条策略、RLS FORCE）';
END
$w13_v2_assert$;
