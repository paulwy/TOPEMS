-- ============================================================
-- 档 2 · 五条漂移策略订正补丁（生产窗口手工执行 / 兜底直改）
--
-- 生成日期：2026-11-25  ·  批次：tier2-drift-fix-20261125
-- 依据：docs/ops/allow-all-policy-review-2026-11-24.md §3
--       database/rls_policy_expected.json（代码基准）
--
-- 【优先路径】档 2 五条在迁移链中均已有对应严格化 forward 脚本：
--   · iam.roles                      → 20261119161000_zero_path_retained_tables_policy_fix
--   · core.core_tenant_plugins       → 20261119161000_zero_path_retained_tables_policy_fix
--   · portal.user_preferences        → 20261119161000_zero_path_retained_tables_policy_fix
--   · mobile.oa_announcement_reads   → 20261119151000_mobile_oa_announcement_reads_tenant_rls
--   · pdm.pdm_master_data_refs       → 20261119150000_pdm_master_data_refs_rls_strict_forward
-- 生产 allow-all 漂移根因是账本滞后（水位 20261119000002，上述脚本未重放）。
-- 正常订正 = 追平账本、重放既有迁移；本补丁仅在账本无法重放、需窗口内直改
-- 这五张表时作为兜底使用。脚本幂等，可重复执行。
--
-- 用法：psql -v ON_ERROR_STOP=1 -d topems_prod -f scripts/ops/rls-tier2-drift-fix-2026-11-25.sql
--       （本文件不含 BEGIN/COMMIT；由执行方按窗口事务口径包裹）
--
-- 前置条件：
--   1. 已在预发/演练库跑通本补丁并核对 scripts/ops/rls-tier2-drift-fix-2026-11-25.verify.sql。
--   2. 应用侧系统通道注入（app.rls_system / app.tenant_id GUC）已在位；roles 字典的
--      种子/后台写路径走系统通道。
--   3. mobile.oa_announcement_reads、pdm.pdm_master_data_refs 的 tenant_id 列已就绪；
--      若列缺失，本补丁前置断言中止，请先重放既有完整迁移（含补列/回填/索引）。
--
-- 不改列、不改数据、不补索引；只做策略层订正（DROP 既有全放行 → 按基准重建）。
-- 回滚：scripts/ops/rls-tier2-drift-fix-2026-11-25.rollback.sql（恢复快照内原策略）
-- ============================================================

\pset pager off

-- 1. 前置断言：表存在；租户隔离表具备 tenant_id 列；记录迁移前读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
    n_col int;
    isolation_only text[] := ARRAY[
        'mobile.oa_announcement_reads',
        'pdm.pdm_master_data_refs'
    ];
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'iam.roles',
        'core.core_tenant_plugins',
        'portal.user_preferences',
        'mobile.oa_announcement_reads',
        'pdm.pdm_master_data_refs'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        IF t = ANY(isolation_only) THEN
            SELECT count(*) INTO n_col
              FROM information_schema.columns
             WHERE table_schema = split_part(t, '.', 1)
               AND table_name = split_part(t, '.', 2)
               AND column_name = 'tenant_id';
            IF n_col <> 1 THEN
                RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列；请先重放既有完整迁移（补列/回填/索引）', t;
            END IF;
            EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', t)
              INTO n_rows, n_null;
            RAISE NOTICE '迁移前 %：总行 %，NULL 租户 % 行', t, n_rows, n_null;
            IF n_null <> 0 THEN
                RAISE EXCEPTION '中止：% 存在 % 行 tenant_id IS NULL，需先定性归属或回填，再做严格化', t, n_null;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移/补丁会话显式走系统通道（建策略 DDL 与后置探测不被 RLS 拦）
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 快照既有策略（便于回滚）；快照表由 20261119161000 建，幂等补建
CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive._rls_policy_snapshot (
    migration_version text NOT NULL,
    batch text NOT NULL,
    schema_name text NOT NULL,
    table_name text NOT NULL,
    polname text NOT NULL,
    permissive text NOT NULL,
    cmd text NOT NULL,
    roles text[] NOT NULL,
    qual text,
    with_check text,
    PRIMARY KEY (migration_version, schema_name, table_name, polname)
);

DO $snapshot$
DECLARE
    r record; pol record;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('iam', 'roles'),
        ('core', 'core_tenant_plugins'),
        ('portal', 'user_preferences'),
        ('mobile', 'oa_announcement_reads'),
        ('pdm', 'pdm_master_data_refs')
    ) AS x(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;

        INSERT INTO archive._rls_policy_snapshot
            (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
        SELECT 'tier2-drift-fix-20261125', 'tier2-drift-fix', r.sch, r.tbl, p.polname,
               CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
               CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
                             WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
               CASE WHEN 0 = ANY(p.polroles) THEN ARRAY['PUBLIC']
                    ELSE ARRAY(SELECT pg_get_userbyid(x) FROM unnest(p.polroles) x) END,
               pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.sch AND c.relname = r.tbl
        ON CONFLICT DO NOTHING;

        -- 4. 清空既有策略（幂等）
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = r.sch AND tablename = r.tbl
        LOOP
            EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, r.sch, r.tbl);
            RAISE NOTICE '已删除既有策略 %.%.%', r.sch, r.tbl, pol.policyname;
        END LOOP;

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);
    END LOOP;
END
$snapshot$;

-- 5. 按代码基准重建策略
DO $policies$
BEGIN
    -- 5.1 仅系统通道：core.core_tenant_plugins（遗留壳，权威表 iam.core_tenant_plugins）
    IF to_regclass('core.core_tenant_plugins') IS NOT NULL THEN
        CREATE POLICY rls_system_only ON core.core_tenant_plugins
            FOR ALL TO public
            USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
            WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
    END IF;

    -- 5.2 仅系统通道：portal.user_preferences（portal 预留表，设置实际走 core.user_preferences）
    IF to_regclass('portal.user_preferences') IS NOT NULL THEN
        CREATE POLICY rls_system_only ON portal.user_preferences
            FOR ALL TO public
            USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
            WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
    END IF;

    -- 5.3 全局只读 + 写仅系统通道：iam.roles（全局角色字典，无租户维度）
    IF to_regclass('iam.roles') IS NOT NULL THEN
        CREATE POLICY rls_global_read ON iam.roles
            FOR SELECT TO public
            USING (true);
        CREATE POLICY rls_system_write ON iam.roles
            FOR ALL TO public
            USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
            WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
    END IF;

    -- 5.4 租户隔离：mobile.oa_announcement_reads
    IF to_regclass('mobile.oa_announcement_reads') IS NOT NULL THEN
        CREATE POLICY rls_tenant_isolation ON mobile.oa_announcement_reads
            FOR ALL TO public
            USING (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            );
    END IF;

    -- 5.5 租户隔离：pdm.pdm_master_data_refs
    IF to_regclass('pdm.pdm_master_data_refs') IS NOT NULL THEN
        CREATE POLICY rls_tenant_isolation ON pdm.pdm_master_data_refs
            FOR ALL TO public
            USING (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            );
    END IF;
END
$policies$;

-- 6. 后置断言：策略集合与基准精确匹配
DO $post$
DECLARE
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    sch_tbl record;
BEGIN
    -- core.core_tenant_plugins：1 条 rls_system_only
    IF to_regclass('core.core_tenant_plugins') IS NOT NULL THEN
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = 'core' AND tablename = 'core_tenant_plugins';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：core.core_tenant_plugins 策略数 = %（期望 1）', n_pol;
        END IF;
        SELECT qual, with_check INTO v_qual, v_wcheck FROM pg_policies
         WHERE schemaname = 'core' AND tablename = 'core_tenant_plugins' AND policyname = 'rls_system_only';
        IF v_qual IS NULL OR v_qual NOT LIKE '%app.rls_system%' THEN
            RAISE EXCEPTION '后置断言失败：core.core_tenant_plugins 策略口径不符：%', v_qual;
        END IF;
    END IF;

    -- portal.user_preferences：1 条 rls_system_only
    IF to_regclass('portal.user_preferences') IS NOT NULL THEN
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = 'portal' AND tablename = 'user_preferences';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：portal.user_preferences 策略数 = %（期望 1）', n_pol;
        END IF;
        SELECT qual INTO v_qual FROM pg_policies
         WHERE schemaname = 'portal' AND tablename = 'user_preferences' AND policyname = 'rls_system_only';
        IF v_qual IS NULL OR v_qual NOT LIKE '%app.rls_system%' THEN
            RAISE EXCEPTION '后置断言失败：portal.user_preferences 策略口径不符：%', v_qual;
        END IF;
    END IF;

    -- iam.roles：2 条 rls_global_read(SELECT) + rls_system_write(ALL)
    IF to_regclass('iam.roles') IS NOT NULL THEN
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = 'iam' AND tablename = 'roles';
        IF n_pol <> 2 THEN
            RAISE EXCEPTION '后置断言失败：iam.roles 策略数 = %（期望 2）', n_pol;
        END IF;
        SELECT qual INTO v_qual FROM pg_policies
         WHERE schemaname = 'iam' AND tablename = 'roles' AND policyname = 'rls_global_read';
        IF v_qual IS NULL OR v_qual NOT LIKE '%true%' THEN
            RAISE EXCEPTION '后置断言失败：iam.roles rls_global_read 口径不符：%', v_qual;
        END IF;
        SELECT qual INTO v_qual FROM pg_policies
         WHERE schemaname = 'iam' AND tablename = 'roles' AND policyname = 'rls_system_write';
        IF v_qual IS NULL OR v_qual NOT LIKE '%app.rls_system%' THEN
            RAISE EXCEPTION '后置断言失败：iam.roles rls_system_write 口径不符：%', v_qual;
        END IF;
    END IF;

    -- mobile.oa_announcement_reads：1 条 rls_tenant_isolation
    IF to_regclass('mobile.oa_announcement_reads') IS NOT NULL THEN
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：mobile.oa_announcement_reads 策略数 = %（期望 1）', n_pol;
        END IF;
        SELECT qual, with_check INTO v_qual, v_wcheck FROM pg_policies
         WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads' AND policyname = 'rls_tenant_isolation';
        IF v_qual NOT LIKE '%app.rls_system%' OR v_qual NOT LIKE '%app.tenant_id%' THEN
            RAISE EXCEPTION '后置断言失败：mobile.oa_announcement_reads USING 缺系统/租户分支：%', v_qual;
        END IF;
        IF v_wcheck NOT LIKE '%app.rls_system%' OR v_wcheck NOT LIKE '%app.tenant_id%' THEN
            RAISE EXCEPTION '后置断言失败：mobile.oa_announcement_reads WITH CHECK 缺分支：%', v_wcheck;
        END IF;
    END IF;

    -- pdm.pdm_master_data_refs：1 条 rls_tenant_isolation
    IF to_regclass('pdm.pdm_master_data_refs') IS NOT NULL THEN
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：pdm.pdm_master_data_refs 策略数 = %（期望 1）', n_pol;
        END IF;
        SELECT qual, with_check INTO v_qual, v_wcheck FROM pg_policies
         WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs' AND policyname = 'rls_tenant_isolation';
        IF v_qual NOT LIKE '%app.rls_system%' OR v_qual NOT LIKE '%app.tenant_id%' THEN
            RAISE EXCEPTION '后置断言失败：pdm.pdm_master_data_refs USING 缺系统/租户分支：%', v_qual;
        END IF;
        IF v_wcheck NOT LIKE '%app.rls_system%' OR v_wcheck NOT LIKE '%app.tenant_id%' THEN
            RAISE EXCEPTION '后置断言失败：pdm.pdm_master_data_refs WITH CHECK 缺分支：%', v_wcheck;
        END IF;
    END IF;

    -- RLS + FORCE 全开
    FOR sch_tbl IN SELECT * FROM (VALUES
        ('core', 'core_tenant_plugins'),
        ('portal', 'user_preferences'),
        ('iam', 'roles'),
        ('mobile', 'oa_announcement_reads'),
        ('pdm', 'pdm_master_data_refs')
    ) AS x(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', sch_tbl.sch, sch_tbl.tbl)) IS NOT NULL THEN
            SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
              FROM pg_class c WHERE c.oid = to_regclass(format('%I.%I', sch_tbl.sch, sch_tbl.tbl));
            IF NOT rls OR NOT frls THEN
                RAISE EXCEPTION '后置断言失败：%.% rls/force = %/%（期望 true/true）', sch_tbl.sch, sch_tbl.tbl, rls, frls;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE '档 2 五条漂移策略订正完成：策略集合已对齐代码基准';
END
$post$;
