-- ============================================================
-- W7 · B4 验证（PDM 试点）：结构断言 + 双身份 + 写探测 + 例外清单
--
-- 用法（必须用非超级用户；超级用户会绕过 RLS）：
--   psql -d <db> -v ON_ERROR_STOP=1 -v app_role=topems_prod \
--        -f scripts/ops/w7_b4_verify.sql
--   - app_role 为空时用当前连接角色（脚本拒绝 superuser / BYPASSRLS）
--   - 备份必须用超级用户（xingzhai/topems），验证只能用非超户，两者不得混用
--
-- 覆盖 21 张（20 张租户表 + 1 张全局只读表 pdm_master_data_refs）：
--   A  结构：ENABLE+FORCE、策略数 1（refs=2）、策略名、谓词形态
--   B  双身份：系统通道基线 / 租户 A / 租户 B / 无上下文，逐表比对
--   C  写探测（事务内 ROLLBACK）：租户改全局行 0 行、系统通道可写、
--      跨租户改写被拒、无上下文写 0 行
--   D  例外清单：schema_defense_ledger 未开 RLS 且无策略；refs 无上下文可读
--
-- ⚠ 关于 `::text`：`pg_get_expr(polqual, …)` 反解析后，
--   `current_setting('app.tenant_id', true)` 会渲染成
--   `current_setting('app.tenant_id'::text, true)` —— 这是**函数参数 cast**，
--   合法且必须存在；只有 `(tenant_id)::text` 这种**列侧 cast** 才是 fail-open
--   隐患（它会把租户列转成文本比较，绕过索引与 NULL 语义）。
--   因此 A2 的判据是 `LIKE '%(tenant_id)::text%'`，不是 `LIKE '%::text%'`；
--   同时反向断言「函数参数 cast 存在」，防止有人为了过门禁把谓词改坏。
-- ============================================================

SET client_min_messages = notice;
SET lock_timeout = '5s';

\if :{?app_role}
SET ROLE :"app_role";
\else
\echo '未传 -v app_role=...，使用当前连接角色验证'
\endif

\if :{?allow_missing}
SET app.w7_allow_missing = :'allow_missing';
\else
SET app.w7_allow_missing = 'off';
\endif

DO $guard$
DECLARE
    v_super boolean;
    v_bypass boolean;
BEGIN
    SELECT rolsuper, rolbypassrls INTO v_super, v_bypass
    FROM pg_roles WHERE rolname = current_user;
    IF v_super THEN
        RAISE EXCEPTION '禁止以超级用户验证 RLS：% 是 superuser', current_user;
    END IF;
    IF v_bypass THEN
        RAISE EXCEPTION '禁止以 BYPASSRLS 角色验证 RLS：%', current_user;
    END IF;
    RAISE NOTICE '验证角色 = %（非超户）', current_user;
END
$guard$;

DROP TABLE IF EXISTS pg_temp.w7_b4_t;
CREATE TEMP TABLE w7_b4_t AS
SELECT * FROM (VALUES
            ('module_settings',          false),
            ('pdm_bom_items',            false),
            ('pdm_boms',                 false),
            ('pdm_change_notices',       false),
            ('pdm_configurations',       false),
            ('pdm_document_versions',    false),
            ('pdm_documents',            false),
            ('pdm_drawings',             false),
            ('pdm_materials',            false),
            ('pdm_production_batches',   false),
            ('pdm_production_formulas',  false),
            ('pdm_production_processes', false),
            ('pdm_production_steps',     false),
            ('pdm_products',             false),
            ('pdm_project_members',      false),
            ('pdm_project_phases',       false),
            ('pdm_projects',             false),
            ('pdm_versions',             false),
            ('pdm_workflow_instances',   false),
            ('pdm_workflows',            false),
            ('pdm_master_data_refs',     true)
) AS v(tbl, global_read);

DROP TABLE IF EXISTS pg_temp.w7_b4_base;
CREATE TEMP TABLE w7_b4_base (tbl text, global_read boolean,
                              n_total bigint, n_a bigint, n_b bigint);

\echo ''
\echo '=== A. 结构断言 ==='
DO $struct$
DECLARE
    r record; v_pols int; v_bad text := ''; v_skip int := 0;
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b4_t LOOP
        IF to_regclass(format('pdm.%I', r.tbl)) IS NULL THEN
            IF coalesce(current_setting('app.w7_allow_missing', true), 'off') = 'on' THEN
                v_skip := v_skip + 1;
            ELSE
                v_bad := v_bad || format(' pdm.%s 不存在;', r.tbl);
            END IF;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('pdm.%I', r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' pdm.%s 未 ENABLE/FORCE;', r.tbl);
        END IF;
        SELECT count(*) INTO v_pols
        FROM pg_policies WHERE schemaname = 'pdm' AND tablename = r.tbl;
        IF v_pols <> (CASE WHEN r.global_read THEN 2 ELSE 1 END) THEN
            v_bad := v_bad || format(' pdm.%s 策略数=%s;', r.tbl, v_pols);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'A1 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'A1. 21 张 ENABLE+FORCE / 策略数 通过（missing 跳过 % 张）', v_skip;
END
$struct$;

DO $shape$
DECLARE
    v_true int; v_colcast int; v_hard int; v_nil int; v_sys int; v_null int;
    v_argcast int; v_tables int;
BEGIN
    SELECT count(*) FILTER (WHERE pg_get_expr(polqual, polrelid) = 'true'),
           -- 列侧 cast 才是隐患；函数参数 cast 见文件头说明
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%(tenant_id)::text%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000001%'
                              OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000001%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'
                              OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%app.rls_system%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%tenant_id IS NULL%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%current_setting(''app.tenant_id''::text%')
    INTO v_true, v_colcast, v_hard, v_nil, v_sys, v_null, v_argcast
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_temp.w7_b4_t t ON t.tbl = c.relname
    WHERE n.nspname = 'pdm';

    SELECT count(*) INTO v_tables FROM pg_temp.w7_b4_t t
    WHERE to_regclass(format('pdm.%I', t.tbl)) IS NOT NULL;

    IF v_true <> 1 THEN RAISE EXCEPTION 'A2. USING(true) 策略 % 条（期望 1：仅 refs 全局只读）', v_true; END IF;
    IF v_colcast <> 0 THEN RAISE EXCEPTION 'A2. 仍有列侧 cast 策略 % 条', v_colcast; END IF;
    IF v_hard <> 0 THEN RAISE EXCEPTION 'A2. 仍有硬编码 ...0001 策略 % 条', v_hard; END IF;
    IF v_nil <> 0 THEN RAISE EXCEPTION 'A2. 仍有 nil UUID 分支 % 条', v_nil; END IF;
    IF v_sys <> v_tables THEN RAISE EXCEPTION 'A2. 系统通道策略 % 条（期望 %：20 租户表 + refs 写）', v_sys, v_tables; END IF;
    IF v_null <> 0 THEN RAISE EXCEPTION 'A2. tenant_id IS NULL 分支 % 条（期望 0）', v_null; END IF;
    -- 反向断言：函数参数 cast 必须存在，否则谓词已被改坏
    IF v_argcast <> v_tables - 1 THEN
        RAISE EXCEPTION 'A2. 函数参数 cast 谓词 % 条（期望 %：20 张租户表，refs 只读策略为 true）', v_argcast, v_tables - 1;
    END IF;
    RAISE NOTICE 'A2. 谓词形态 通过（% 条含系统通道；列侧 cast 0；函数参数 cast % 条）', v_sys, v_argcast;
END
$shape$;

\echo ''
\echo '=== B. 双身份（基线=系统通道；逐表比对）==='
SET app.rls_system = 'on';
SET app.tenant_id = '';

DO $base$
DECLARE
    r record; v_t bigint; v_a bigint; v_b bigint;
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b4_t LOOP
        IF to_regclass(format('pdm.%I', r.tbl)) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('SELECT count(*) FROM pdm.%I', r.tbl) INTO v_t;
        -- 全局只读表（refs）无 tenant_id 列，不做租户切片，只取全量
        IF r.global_read THEN
            v_a := 0; v_b := 0;
        ELSE
            EXECUTE format('SELECT count(*) FROM pdm.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000001''', r.tbl) INTO v_a;
            EXECUTE format('SELECT count(*) FROM pdm.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000002''', r.tbl) INTO v_b;
        END IF;
        INSERT INTO pg_temp.w7_b4_base VALUES (r.tbl, r.global_read, v_t, v_a, v_b);
    END LOOP;
END
$base$;

SELECT count(*) AS tables, sum(n_total) AS total_rows,
       sum(n_a) AS rows_tenant_a, sum(n_b) AS rows_tenant_b
FROM pg_temp.w7_b4_base;

\echo '--- B1. tenant=...0001（期望 = 本租户行；全局只读表可见全量）---'
SET app.rls_system = 'off';
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';

DO $b1$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b4_base LOOP
        EXECUTE format('SELECT count(*) FROM pdm.%I', r.tbl) INTO v_vis;
        v_exp := CASE WHEN r.global_read THEN r.n_total ELSE r.n_a END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' pdm.%s 可见=%s 期望=%s;', r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B1 失败：%', v_bad; END IF;
    RAISE NOTICE 'B1. tenant=...0001 逐表可见性 通过';
END
$b1$;

\echo '--- B2. tenant=...0002（跨租户 0 泄漏）---'
SET app.tenant_id = '00000000-0000-0000-0000-000000000002';

DO $b2$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b4_base LOOP
        EXECUTE format('SELECT count(*) FROM pdm.%I', r.tbl) INTO v_vis;
        v_exp := CASE WHEN r.global_read THEN r.n_total ELSE r.n_b END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' pdm.%s 可见=%s 期望=%s;', r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B2 失败：%', v_bad; END IF;
    RAISE NOTICE 'B2. tenant=...0002 逐表可见性 通过（跨租户 0 行）';
END
$b2$;

\echo '--- B3. 无上下文（期望：20 张租户表 0 行；refs 全局只读可读）---'
SET app.rls_system = 'off';
SET app.tenant_id = '';

DO $b3$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b4_base LOOP
        EXECUTE format('SELECT count(*) FROM pdm.%I', r.tbl) INTO v_vis;
        v_exp := CASE WHEN r.global_read THEN r.n_total ELSE 0 END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' pdm.%s 可见=%s 期望=%s;', r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B3 失败：%', v_bad; END IF;
    RAISE NOTICE 'B3. 无上下文 fail-closed 通过（20 张租户表全 0）';
END
$b3$;

\echo ''
\echo '=== C. 写探测（事务内 ROLLBACK，不落数据）==='
\echo '--- C1. tenant=...0001 改 refs（期望 0 行）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
WITH u AS (
    UPDATE pdm.pdm_master_data_refs SET deleted_at = deleted_at RETURNING 1
)
SELECT count(*) AS tenant_wrote_global_rows FROM u;
ROLLBACK;

\echo '--- C2. 系统通道写 refs（空表期望 0 行；策略放行不报错）---'
BEGIN;
SET LOCAL app.rls_system = 'on';
SET LOCAL app.tenant_id = '';
WITH u AS (
    UPDATE pdm.pdm_master_data_refs SET deleted_at = deleted_at RETURNING 1
)
SELECT count(*) AS system_wrote_rows FROM u;
ROLLBACK;

\echo '--- C3. 跨租户改写 materials（期望 42501 或 0 行）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
DO $w3$
DECLARE n int;
BEGIN
    UPDATE pdm.pdm_materials
       SET tenant_id = '00000000-0000-0000-0000-000000000002'
     WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'C3 失败：% 行跨租户改写成功', n; END IF;
    RAISE NOTICE 'C3 通过：跨租户改写被 WITH CHECK 拒绝或 0 行';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'C3 通过：跨租户改写被 WITH CHECK 拒绝 (42501)';
END
$w3$;
ROLLBACK;

\echo '--- C4. 无上下文写 materials（期望 0 行，fail-closed）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '';
WITH u AS (
    UPDATE pdm.pdm_materials SET updated_at = updated_at RETURNING 1
)
SELECT count(*) AS wrote_without_context FROM u;
ROLLBACK;

\echo ''
\echo '=== D. 例外清单 ==='
DO $exc$
DECLARE
    v_rls boolean; v_force boolean; v_pols int; v_readable bigint;
BEGIN
    SELECT c.relrowsecurity, c.relforcerowsecurity INTO v_rls, v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pdm' AND c.relname = 'schema_defense_ledger';
    SELECT count(*) INTO v_pols
    FROM pg_policies WHERE schemaname = 'pdm' AND tablename = 'schema_defense_ledger';
    IF coalesce(v_rls, false) OR coalesce(v_force, false) OR v_pols <> 0 THEN
        RAISE EXCEPTION 'D 失败：schema_defense_ledger 被纳入 RLS（rls=% force=% 策略=%）', v_rls, v_force, v_pols;
    END IF;
    RAISE NOTICE 'D1. schema_defense_ledger 不在 RLS 范围（rls=f force=f 策略=0）';

    SET LOCAL app.rls_system = 'off';
    SET LOCAL app.tenant_id = '';
    EXECUTE 'SELECT count(*) FROM pdm.pdm_master_data_refs' INTO v_readable;
    RAISE NOTICE 'D2. refs 无上下文可读，行数=%（全局只读生效）', v_readable;
END
$exc$;

\echo ''
\echo '=== E. 逐表 RLS/FORCE 结果 ==='
SELECT c.relname, c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'pdm' AND p.tablename = c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'pdm' AND c.relkind = 'r'
ORDER BY c.relname;

RESET app.rls_system;
RESET app.tenant_id;
RESET ROLE;

\echo ''
\echo '=== W7-B4 验证结束（全部断言通过）==='
