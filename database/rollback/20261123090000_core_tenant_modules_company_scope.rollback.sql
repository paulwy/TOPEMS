-- ============================================================
-- 回滚 20261123090000_core_tenant_modules_company_scope
--
-- 行为：
--   1. 数据保护：统计 company_id IS NOT NULL 的行数。非 0 时默认 RAISE EXCEPTION
--      并打印计数，不删除、不改写任何业务行；显式 SET app.allow_scope_rollback='on'
--      后仍先检查 (tenant_id, module_code) 是否出现重复（母版行 + 公司行），
--      有重复则继续明确失败——恢复旧唯一约束必然冲突，不允许静默丢归属。
--   2. 删策略（枚举本表全部策略）。
--   3. 删两条部分唯一索引、公司查询索引、公司外键。
--   4. 恢复旧唯一约束 UNIQUE (tenant_id, module_code)。
--   5. 删列 company_id。
--   6. 恢复迁移前的租户级策略 rls_tenant_isolation。
--   7. 清理账本行 20261123090000 并做后置断言。
--
-- 幂等：DROP ... IF EXISTS / 约束存在性守卫；列已不存在时按迁移前状态收尾。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

SET app.rls_system = 'on';

-- ------------------------------------------------------------
-- 1. 数据保护：有公司级行时明确中止
-- ------------------------------------------------------------
DO $guard$
DECLARE
    v_has_column  boolean;
    v_company     bigint;
    v_dups        bigint;
    v_allow       boolean;
BEGIN
    IF to_regclass('public.core_tenant_modules') IS NULL THEN
        RAISE NOTICE '表 public.core_tenant_modules 不存在，跳过数据保护检查';
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.core_tenant_modules'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_has_column;

    IF NOT v_has_column THEN
        RAISE NOTICE 'company_id 不存在：已处于迁移前状态，仅做幂等收尾';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.core_tenant_modules WHERE company_id IS NOT NULL'
       INTO v_company;

    IF v_company = 0 THEN
        RAISE NOTICE '公司级行数为 0，可安全恢复旧唯一约束';
        RETURN;
    END IF;

    v_allow := COALESCE(current_setting('app.allow_scope_rollback', true), 'off') = 'on';
    IF NOT v_allow THEN
        RAISE EXCEPTION '回滚中止：存在 % 行公司级数据（company_id IS NOT NULL）。恢复 UNIQUE (tenant_id, module_code) 会与母版行冲突；本脚本不删除、不改写任何数据。请先归档公司行；如确需评估带数据回滚，显式 SET app.allow_scope_rollback = ''on''', v_company;
    END IF;

    EXECUTE '
        SELECT count(*)
          FROM (
                SELECT tenant_id, module_code
                  FROM public.core_tenant_modules
                 GROUP BY tenant_id, module_code
                HAVING count(*) > 1
               ) d'
       INTO v_dups;

    IF v_dups > 0 THEN
        RAISE EXCEPTION '回滚中止：已允许带数据回滚，但检测到 % 组重复 (tenant_id, module_code)（母版行与公司行并存），恢复唯一约束必然失败；不删除任何数据。请先归档公司行后重跑', v_dups;
    END IF;

    RAISE NOTICE '带数据回滚：公司级行 %，无重复键，继续（不修改任何数据）', v_company;
END
$guard$;

-- ------------------------------------------------------------
-- 2. 删策略（枚举本表全部策略）
-- ------------------------------------------------------------
DO $drop_policies$
DECLARE
    r record;
BEGIN
    IF to_regclass('public.core_tenant_modules') IS NULL THEN
        RETURN;
    END IF;
    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'core_tenant_modules'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.core_tenant_modules', r.policyname);
        RAISE NOTICE '已删除策略 public.core_tenant_modules.%', r.policyname;
    END LOOP;
END
$drop_policies$;

-- ------------------------------------------------------------
-- 3. 删索引与外键
-- ------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_core_tenant_modules_master;
DROP INDEX IF EXISTS public.uq_core_tenant_modules_company;
DROP INDEX IF EXISTS public.idx_core_tenant_modules_tenant_company;

ALTER TABLE public.core_tenant_modules
    DROP CONSTRAINT IF EXISTS fk_core_tenant_modules_company;

-- ------------------------------------------------------------
-- 4. 恢复旧唯一约束（存在性守卫）
-- ------------------------------------------------------------
DO $restore_constraint$
BEGIN
    IF to_regclass('public.core_tenant_modules') IS NULL THEN
        RETURN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.core_tenant_modules'::regclass
           AND conname = 'core_tenant_modules_tenant_id_module_code_key'
    ) THEN
        EXECUTE 'ALTER TABLE public.core_tenant_modules '
             || 'ADD CONSTRAINT core_tenant_modules_tenant_id_module_code_key '
             || 'UNIQUE (tenant_id, module_code)';
        RAISE NOTICE '已恢复唯一约束 core_tenant_modules_tenant_id_module_code_key';
    ELSE
        RAISE NOTICE '唯一约束已存在，跳过恢复';
    END IF;
END
$restore_constraint$;

-- ------------------------------------------------------------
-- 5. 删列
-- ------------------------------------------------------------
ALTER TABLE public.core_tenant_modules
    DROP COLUMN IF EXISTS company_id;

-- ------------------------------------------------------------
-- 6. 恢复迁移前租户级策略
-- ------------------------------------------------------------
DO $restore_policy$
BEGIN
    IF to_regclass('public.core_tenant_modules') IS NULL THEN
        RETURN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'core_tenant_modules'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE '
            CREATE POLICY rls_tenant_isolation ON public.core_tenant_modules
            USING (
                COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''
                OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''
                OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid
            )';
        RAISE NOTICE '已恢复租户级策略 rls_tenant_isolation';
    ELSE
        RAISE NOTICE '策略 rls_tenant_isolation 已存在，跳过恢复';
    END IF;
END
$restore_policy$;

-- 保持 RLS ENABLE + FORCE（迁移前状态）
ALTER TABLE public.core_tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenant_modules FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 7. 清理账本行
-- ------------------------------------------------------------
DELETE FROM public._sqlx_migrations WHERE version = 20261123090000;

-- ------------------------------------------------------------
-- 8. 后置断言
-- ------------------------------------------------------------
DO $assert$
DECLARE
    v_has_column boolean;
    v_policies   int;
BEGIN
    IF to_regclass('public.core_tenant_modules') IS NULL THEN
        RAISE EXCEPTION '后置断言失败：public.core_tenant_modules 不存在';
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.core_tenant_modules'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_has_column;
    IF v_has_column THEN
        RAISE EXCEPTION '后置断言失败：company_id 列仍存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.core_tenant_modules'::regclass
           AND conname = 'core_tenant_modules_tenant_id_module_code_key'
    ) THEN
        RAISE EXCEPTION '后置断言失败：旧唯一约束 core_tenant_modules_tenant_id_module_code_key 未恢复';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_core_tenant_modules_master')
       OR EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_core_tenant_modules_company')
       OR EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_core_tenant_modules_tenant_company') THEN
        RAISE EXCEPTION '后置断言失败：本迁移新增索引仍存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.core_tenant_modules'::regclass
           AND conname = 'fk_core_tenant_modules_company'
    ) THEN
        RAISE EXCEPTION '后置断言失败：公司外键仍存在';
    END IF;

    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'core_tenant_modules';
    IF v_policies <> 1 THEN
        RAISE EXCEPTION '后置断言失败：策略数为 %，期望 1（rls_tenant_isolation）', v_policies;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'core_tenant_modules'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        RAISE EXCEPTION '后置断言失败：未恢复 rls_tenant_isolation';
    END IF;

    IF EXISTS (SELECT 1 FROM public._sqlx_migrations WHERE version = 20261123090000) THEN
        RAISE EXCEPTION '后置断言失败：账本仍残留 20261123090000';
    END IF;

    RAISE NOTICE '回滚完成：company_id 已删除、旧唯一约束已恢复、策略恢复为 1 条、账本残留 0';
END
$assert$;

ANALYZE public.core_tenant_modules;
