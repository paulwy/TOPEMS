-- 事项四：erp.holidays 平台语料 RLS 统一（2026-11-18 拍板）
--
-- 拍板口径：
--   SELECT 策略 = 系统通道 OR tenant_id IS NULL OR tenant_id = 当前租户；
--   ALL  策略 = 系统通道 OR tenant_id = 当前租户（写只允许本租户，平台行写入走系统通道）。
--   代码后续按「平台读」改造（不在本迁移内）。
--
-- 落地方差（与拍板谓词等价收紧，对齐 20261118110000 的 rls_platform_read）：
--   平台行分支追加「当前租户 GUC 非空」判定，未设/空串 GUC 不再放行平台行，
--   避免把刚清掉的 `tenant_id IS NULL` fail-open 重新引入。
--   即：rls_system='on' OR (tenant_id IS NULL AND GUC 非空) OR tenant_id = GUC。
--
-- 证据（2026-11-18 本地 topems_prod 只读核查 + 全仓走读）：
--   1. erp.holidays 实际列仅 id / deleted_at / date（date 由 20261115141200 补齐），
--      没有 tenant_id / year / kind / name，表 0 行，RLS=on/force=on，
--      现有唯一策略 erp_allow_all_holidays（ALL, USING true, WITH CHECK true）。
--   2. 全仓无任何对 erp.holidays 的 INSERT/UPDATE/DELETE（grep 无命中）；
--      唯一读路径是 svc/erp/src/modules/holidays.rs:84-148，裸池读取，
--      两个分支均引用 tenant_id/year/kind → 当前稳定 42703 → L2 静态兜底。
--   3. holidays.rs:90-98 的注释声明 tenant_id UUID NOT NULL，与拍板「平台行 tenant_id IS NULL」
--      冲突；本迁移以拍板为准，tenant_id 取可空。该注释需在代码改造时同步修正。
--
-- 本迁移范围（最小落地拍板策略）：
--   - 仅 ADD COLUMN tenant_id uuid（可空），不做 NOT NULL、不建索引/唯一键、不回填（0 行）；
--   - 删除 erp_allow_all_holidays，重建 rls_tenant_isolation + rls_platform_read；
--   - 保持 ENABLE/FORCE RLS。
--
-- 残余缺列（不在本批）：year / kind / name 仍未补齐（B 类遗留，见
--   column-drift-attribution-2026-11-15.md §4.2.3）。代码 L1 仍会 42703 → L2 兜底，
--   本迁移不改变该行为；唯一键/PK 形态（tenant_id 可空）待补列批次一并设计。
--
-- 回滚：database/rollback/20261118130000_erp_holidays_platform_corpus.rollback.sql
--   （恢复 erp_allow_all_holidays；tenant_id 仅当全列为空时才删除，有值则保留并提示）。
--
-- 锁影响：0 行表 ADD COLUMN（瞬时 ACCESS EXCLUSIVE）+ 策略替换；无数据回填。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
    n_col int;
    v_notnull boolean;
BEGIN
    IF to_regclass('erp.holidays') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：表 erp.holidays 不存在';
    END IF;

    EXECUTE 'SELECT count(*) FROM erp.holidays' INTO n_rows;
    IF n_rows <> 0 THEN
        RAISE EXCEPTION '前置断言失败：erp.holidays 有 % 行；拍板口径为平台行 tenant_id IS NULL + 租户行 tenant_id 非空，本迁移只允许对空表执行', n_rows;
    END IF;

    SELECT count(*) INTO n_col
      FROM information_schema.columns
     WHERE table_schema = 'erp' AND table_name = 'holidays' AND column_name = 'tenant_id';
    IF n_col > 0 THEN
        SELECT a.attnotnull INTO v_notnull
          FROM pg_attribute a
         WHERE a.attrelid = 'erp.holidays'::regclass AND a.attname = 'tenant_id' AND NOT a.attisdropped;
        IF coalesce(v_notnull, false) THEN
            RAISE EXCEPTION '前置断言失败：erp.holidays.tenant_id 为 NOT NULL，无法承载平台行（tenant_id IS NULL）';
        END IF;
    END IF;

    RAISE NOTICE '前置断言通过：erp.holidays 0 行，tenant_id %',
        CASE WHEN n_col > 0 THEN '已存在且可空（跳过补列）' ELSE '不存在（将补可空列）' END;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 补 tenant_id（可空；平台行 = NULL，租户行 = 租户 id）
ALTER TABLE erp.holidays ADD COLUMN IF NOT EXISTS tenant_id uuid;

COMMENT ON COLUMN erp.holidays.tenant_id IS
    '平台语料口径：NULL = 全租户共享的法定节假日；非空 = 租户自定义节假日（2026-11-18 拍板）';

-- 4. 清空既有策略（幂等）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'erp' AND p.tablename = 'holidays'
    LOOP
        EXECUTE format('DROP POLICY %I ON erp.holidays', r.policyname);
        RAISE NOTICE '已删除策略 erp.holidays.%', r.policyname;
    END LOOP;
END $$;

-- 5. 重建策略：严格租户隔离 + 平台读
ALTER TABLE erp.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.holidays FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_isolation ON erp.holidays
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

CREATE POLICY rls_platform_read ON erp.holidays
    FOR SELECT TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR (
            tenant_id IS NULL
            AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
        )
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 6. 后置断言
DO $$
DECLARE
    n_col int;
    v_notnull boolean;
    n_pol int;
    has_isolation boolean;
    has_platform boolean;
    has_allow_all boolean;
    v_qual text;
    rls boolean;
    frls boolean;
BEGIN
    SELECT count(*) INTO n_col
      FROM information_schema.columns
     WHERE table_schema = 'erp' AND table_name = 'holidays' AND column_name = 'tenant_id';
    IF n_col <> 1 THEN
        RAISE EXCEPTION '后置断言失败：erp.holidays.tenant_id 列数 = %', n_col;
    END IF;

    SELECT a.attnotnull INTO v_notnull
      FROM pg_attribute a
     WHERE a.attrelid = 'erp.holidays'::regclass AND a.attname = 'tenant_id' AND NOT a.attisdropped;
    IF coalesce(v_notnull, false) THEN
        RAISE EXCEPTION '后置断言失败：erp.holidays.tenant_id 不应为 NOT NULL（平台行需要 NULL）';
    END IF;

    SELECT count(*),
           bool_or(p.policyname = 'rls_tenant_isolation'),
           bool_or(p.policyname = 'rls_platform_read'),
           bool_or(p.policyname = 'erp_allow_all_holidays')
      INTO n_pol, has_isolation, has_platform, has_allow_all
      FROM pg_policies p
     WHERE p.schemaname = 'erp' AND p.tablename = 'holidays';

    IF n_pol <> 2 OR NOT coalesce(has_isolation, false) OR NOT coalesce(has_platform, false) THEN
        RAISE EXCEPTION '后置断言失败：erp.holidays 策略数 = %（期望 2：isolation + platform_read）', n_pol;
    END IF;
    IF coalesce(has_allow_all, false) THEN
        RAISE EXCEPTION '后置断言失败：erp.holidays 仍存在 erp_allow_all_holidays';
    END IF;

    SELECT p.qual::text INTO v_qual
      FROM pg_policies p
     WHERE p.schemaname = 'erp' AND p.tablename = 'holidays' AND p.policyname = 'rls_platform_read';
    IF position('tenant_id IS NULL' IN coalesce(v_qual, '')) = 0
       OR position('app.tenant_id' IN coalesce(v_qual, '')) = 0
       OR position('app.rls_system' IN coalesce(v_qual, '')) = 0
       OR position('NULLIF' IN coalesce(v_qual, '')) = 0 THEN
        RAISE EXCEPTION '后置断言失败：平台读谓词不完整（含非空 GUC 兜底）：%', v_qual;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c WHERE c.oid = 'erp.holidays'::regclass;
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '后置断言失败：erp.holidays 的 rls/force_rls = %/%（期望 true/true）', rls, frls;
    END IF;

    RAISE NOTICE '后置断言通过：erp.holidays = 严格租户隔离 + 平台读（NULL 平台行）';
END $$;
