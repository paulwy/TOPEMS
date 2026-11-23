-- ============================================================
-- 回滚 20261123120000_system_settings_company_scope
--
-- 行为：
--   1. 数据保护：统计 company_id IS NOT NULL 的行数。非 0 时 RAISE EXCEPTION
--      并打印计数——删列会把公司覆盖合并回租户级参数，丢失公司归属，
--      本脚本不删除、不改写任何数据，也不提供 override；请先归档公司行。
--   2. 删策略（枚举本表全部策略）。
--   3. 删两条部分唯一索引、CHECK 与同租户公司外键。
--   4. 删列 company_id。
--   5. 恢复旧唯一索引 uq_system_settings_tenant_key (tenant_id, key)。
--   6. 恢复迁移前的租户级策略 rls_tenant_isolation。
--   7. 清理账本行 20261123120000 并做后置断言。
--
-- 幂等：DROP ... IF EXISTS / 存在性守卫；列已不存在时按迁移前状态收尾。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

SET app.rls_system = 'on';

-- 数据保护统计必须在 FORCE RLS 下看到全量行；迁移会话没有单一租户上下文。
-- 事务内临时关闭 RLS（持 ACCESS EXCLUSIVE 锁，不对外暴露），末尾恢复。
DO $disable_rls$
BEGIN
    IF to_regclass('public.system_settings') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY';
    END IF;
END
$disable_rls$;

-- ------------------------------------------------------------
-- 1. 数据保护：有公司级行时明确中止
-- ------------------------------------------------------------
DO $guard$
DECLARE
    v_has_column  boolean;
    v_company     bigint;
BEGIN
    IF to_regclass('public.system_settings') IS NULL THEN
        RAISE NOTICE '表 public.system_settings 不存在，跳过数据保护检查';
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.system_settings'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_has_column;

    IF NOT v_has_column THEN
        RAISE NOTICE 'company_id 不存在：已处于迁移前状态，仅做幂等收尾';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.system_settings WHERE company_id IS NOT NULL'
       INTO v_company;

    IF v_company > 0 THEN
        RAISE EXCEPTION '回滚中止：存在 % 行公司级参数（company_id IS NOT NULL）。删除 company_id 会丢失公司归属并可能与租户级唯一键冲突；本脚本不删除、不改写任何数据。请先归档公司行后重跑', v_company;
    END IF;

    RAISE NOTICE '公司级行数为 0（仅平台行），可安全回滚';
END
$guard$;

-- ------------------------------------------------------------
-- 2. 删策略（枚举本表全部策略）
-- ------------------------------------------------------------
DO $drop_policies$
DECLARE
    r record;
BEGIN
    IF to_regclass('public.system_settings') IS NULL THEN
        RETURN;
    END IF;
    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'system_settings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_settings', r.policyname);
        RAISE NOTICE '已删除策略 public.system_settings.%', r.policyname;
    END LOOP;
END
$drop_policies$;

-- ------------------------------------------------------------
-- 3. 删索引与 CHECK
-- ------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_system_settings_platform;
DROP INDEX IF EXISTS public.uq_system_settings_company;

ALTER TABLE public.system_settings
    DROP CONSTRAINT IF EXISTS chk_system_settings_company_tenant;

ALTER TABLE public.system_settings
    DROP CONSTRAINT IF EXISTS fk_system_settings_company;

-- ------------------------------------------------------------
-- 4. 删列
-- ------------------------------------------------------------
DO $drop_column$
BEGIN
    IF to_regclass('public.system_settings') IS NULL THEN
        RETURN;
    END IF;
    IF EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.system_settings'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) THEN
        EXECUTE 'ALTER TABLE public.system_settings DROP COLUMN company_id';
        RAISE NOTICE '已删除列 public.system_settings.company_id';
    ELSE
        RAISE NOTICE '列 company_id 已不存在，跳过删除';
    END IF;
END
$drop_column$;

-- ------------------------------------------------------------
-- 5. 恢复旧唯一索引 (tenant_id, key)
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_settings_tenant_key
    ON public.system_settings (tenant_id, key);

-- ------------------------------------------------------------
-- 6. 恢复迁移前策略 rls_tenant_isolation
-- ------------------------------------------------------------
DO $restore_policy$
BEGIN
    IF to_regclass('public.system_settings') IS NULL THEN
        RETURN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'system_settings'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE '
            CREATE POLICY rls_tenant_isolation ON public.system_settings
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
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 7. 清理账本行
-- ------------------------------------------------------------
DELETE FROM public._sqlx_migrations WHERE version = 20261123120000;

-- ------------------------------------------------------------
-- 8. 后置断言
-- ------------------------------------------------------------
DO $assert$
DECLARE
    v_has_column boolean;
    v_policies   int;
BEGIN
    IF to_regclass('public.system_settings') IS NULL THEN
        RAISE EXCEPTION '后置断言失败：public.system_settings 不存在';
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'public.system_settings'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_has_column;
    IF v_has_column THEN
        RAISE EXCEPTION '后置断言失败：company_id 列仍存在';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_system_settings_platform')
       OR EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_system_settings_company') THEN
        RAISE EXCEPTION '后置断言失败：本迁移新增索引仍存在';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_system_settings_tenant_key') THEN
        RAISE EXCEPTION '后置断言失败：旧唯一索引 uq_system_settings_tenant_key 未恢复';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.system_settings'::regclass
           AND conname = 'chk_system_settings_company_tenant'
    ) THEN
        RAISE EXCEPTION '后置断言失败：CHECK chk_system_settings_company_tenant 仍存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.system_settings'::regclass
           AND conname = 'fk_system_settings_company'
    ) THEN
        RAISE EXCEPTION '后置断言失败：公司外键 fk_system_settings_company 仍存在';
    END IF;

    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'system_settings';
    IF v_policies <> 1 THEN
        RAISE EXCEPTION '后置断言失败：策略数为 %，期望 1（rls_tenant_isolation）', v_policies;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'system_settings'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        RAISE EXCEPTION '后置断言失败：未恢复 rls_tenant_isolation';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
         WHERE oid = 'public.system_settings'::regclass
           AND relrowsecurity
           AND relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：RLS 未保持 ENABLE+FORCE';
    END IF;

    IF EXISTS (SELECT 1 FROM public._sqlx_migrations WHERE version = 20261123120000) THEN
        RAISE EXCEPTION '后置断言失败：账本仍残留 20261123120000';
    END IF;

    RAISE NOTICE '回滚完成：company_id 已删除、新索引与 CHECK 已清理、旧唯一索引与策略已恢复、账本残留 0';
END
$assert$;

ANALYZE public.system_settings;
