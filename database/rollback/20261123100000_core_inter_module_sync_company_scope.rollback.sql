-- ============================================================
-- 回滚 20261123100000_core_inter_module_sync_company_scope
--
-- 行为：
--   1. 数据保护：统计 company_id IS NOT NULL 的行数。非 0 时 RAISE EXCEPTION
--      并打印计数——删列必然丢失公司归属，本脚本不删除、不改写任何数据，
--      也不提供 override；请先归档公司行后重跑。集团级 NULL 行不阻断。
--   2. 删策略（枚举本表全部策略）。
--   3. 删两条索引与公司外键。
--   4. 删列 company_id。
--   5. 恢复迁移前的租户级策略 rls_tenant_isolation。
--   6. 清理账本行 20261123100000 并做后置断言。
--
-- 幂等：DROP ... IF EXISTS / 约束存在性守卫；列已不存在时按迁移前状态收尾。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

SET app.rls_system = 'on';

-- 数据保护统计必须在 FORCE RLS 下看到全量公司行；迁移会话没有单一租户上下文，
-- 新策略的 tenant 谓词会把扫描收敛为 0 行。这里在事务内临时关闭 RLS
-- （持 ACCESS EXCLUSIVE 锁，不对外暴露），脚本末尾恢复 ENABLE + FORCE。
DO $disable_rls$
BEGIN
    IF to_regclass('integration.core_inter_module_sync') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE integration.core_inter_module_sync DISABLE ROW LEVEL SECURITY';
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
    IF to_regclass('integration.core_inter_module_sync') IS NULL THEN
        RAISE NOTICE '表 integration.core_inter_module_sync 不存在，跳过数据保护检查';
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'integration.core_inter_module_sync'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_has_column;

    IF NOT v_has_column THEN
        RAISE NOTICE 'company_id 不存在：已处于迁移前状态，仅做幂等收尾';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM integration.core_inter_module_sync WHERE company_id IS NOT NULL'
       INTO v_company;

    IF v_company > 0 THEN
        RAISE EXCEPTION '回滚中止：存在 % 行公司级同步任务（company_id IS NOT NULL）。删除 company_id 会丢失公司归属；本脚本不删除、不改写任何数据。请先归档/迁移这些公司行后重跑', v_company;
    END IF;

    RAISE NOTICE '公司级行数为 0（仅集团级任务），可安全回滚';
END
$guard$;

-- ------------------------------------------------------------
-- 2. 删策略（枚举本表全部策略）
-- ------------------------------------------------------------
DO $drop_policies$
DECLARE
    r record;
BEGIN
    IF to_regclass('integration.core_inter_module_sync') IS NULL THEN
        RETURN;
    END IF;
    FOR r IN
        SELECT policyname
          FROM pg_policies
         WHERE schemaname = 'integration'
           AND tablename = 'core_inter_module_sync'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON integration.core_inter_module_sync', r.policyname);
        RAISE NOTICE '已删除策略 integration.core_inter_module_sync.%', r.policyname;
    END LOOP;
END
$drop_policies$;

-- ------------------------------------------------------------
-- 3. 删索引与外键
-- ------------------------------------------------------------
DROP INDEX IF EXISTS integration.idx_core_inter_module_sync_tenant_company_created;
DROP INDEX IF EXISTS integration.idx_core_inter_module_sync_tenant_group;

ALTER TABLE integration.core_inter_module_sync
    DROP CONSTRAINT IF EXISTS fk_core_inter_module_sync_company;

-- ------------------------------------------------------------
-- 4. 删列
-- ------------------------------------------------------------
DO $drop_column$
BEGIN
    IF to_regclass('integration.core_inter_module_sync') IS NULL THEN
        RETURN;
    END IF;
    IF EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'integration.core_inter_module_sync'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) THEN
        EXECUTE 'ALTER TABLE integration.core_inter_module_sync DROP COLUMN company_id';
        RAISE NOTICE '已删除列 integration.core_inter_module_sync.company_id';
    ELSE
        RAISE NOTICE '列 company_id 已不存在，跳过删除';
    END IF;
END
$drop_column$;

-- ------------------------------------------------------------
-- 5. 恢复迁移前策略 rls_tenant_isolation
-- ------------------------------------------------------------
DO $restore_policy$
BEGIN
    IF to_regclass('integration.core_inter_module_sync') IS NULL THEN
        RETURN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'integration'
           AND tablename = 'core_inter_module_sync'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE '
            CREATE POLICY rls_tenant_isolation ON integration.core_inter_module_sync
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
ALTER TABLE integration.core_inter_module_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.core_inter_module_sync FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 6. 清理账本行
-- ------------------------------------------------------------
DELETE FROM public._sqlx_migrations WHERE version = 20261123100000;

-- ------------------------------------------------------------
-- 7. 后置断言
-- ------------------------------------------------------------
DO $assert$
DECLARE
    v_has_column boolean;
    v_policies   int;
BEGIN
    IF to_regclass('integration.core_inter_module_sync') IS NULL THEN
        RAISE EXCEPTION '后置断言失败：integration.core_inter_module_sync 不存在';
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = 'integration.core_inter_module_sync'::regclass
           AND attname = 'company_id'
           AND attnum > 0
           AND NOT attisdropped
    ) INTO v_has_column;
    IF v_has_column THEN
        RAISE EXCEPTION '后置断言失败：company_id 列仍存在';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'integration' AND indexname = 'idx_core_inter_module_sync_tenant_company_created')
       OR EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'integration' AND indexname = 'idx_core_inter_module_sync_tenant_group') THEN
        RAISE EXCEPTION '后置断言失败：本迁移新增索引仍存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'integration.core_inter_module_sync'::regclass
           AND conname = 'fk_core_inter_module_sync_company'
    ) THEN
        RAISE EXCEPTION '后置断言失败：公司外键仍存在';
    END IF;

    SELECT count(*) INTO v_policies
      FROM pg_policies
     WHERE schemaname = 'integration'
       AND tablename = 'core_inter_module_sync';
    IF v_policies <> 1 THEN
        RAISE EXCEPTION '后置断言失败：策略数为 %，期望 1（rls_tenant_isolation）', v_policies;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'integration'
           AND tablename = 'core_inter_module_sync'
           AND policyname = 'rls_tenant_isolation'
    ) THEN
        RAISE EXCEPTION '后置断言失败：未恢复 rls_tenant_isolation';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
         WHERE oid = 'integration.core_inter_module_sync'::regclass
           AND relrowsecurity
           AND relforcerowsecurity
    ) THEN
        RAISE EXCEPTION '后置断言失败：RLS 未保持 ENABLE+FORCE';
    END IF;

    IF EXISTS (SELECT 1 FROM public._sqlx_migrations WHERE version = 20261123100000) THEN
        RAISE EXCEPTION '后置断言失败：账本仍残留 20261123100000';
    END IF;

    RAISE NOTICE '回滚完成：company_id 已删除、索引与外键已清理、策略恢复为 1 条、账本残留 0';
END
$assert$;

ANALYZE integration.core_inter_module_sync;
