-- ============================================================
-- W7 · B4 LIMS 验证：结构断言 + 双身份 + 写探测
--
-- 覆盖 76 张（lims 45 + public.qa_* 31），全局只读表 0 张。
--
-- 用法（必须用非超级用户；超级用户会绕过 RLS）：
--   psql -d <db> -v ON_ERROR_STOP=1 -v app_role=topems_prod \
--        -f scripts/ops/w7_b4_lims_verify.sql
--   - app_role 为空时用当前连接角色（脚本拒绝 superuser / BYPASSRLS）
--   - 备份必须用超级用户，验证只能用非超户，两者不得混用
--
-- ⚠ 关于 `::text`：`pg_get_expr` 反解析后，`current_setting('app.tenant_id', true)`
--   会渲染成 `current_setting('app.tenant_id'::text, true)` —— 这是**函数参数 cast**，
--   合法且必须存在；只有 `(tenant_id)::text` 这种**列侧 cast** 才是 fail-open 隐患。
--   因此判据是 `LIKE '%(tenant_id)::text%'`，并反向断言函数参数 cast 存在。
--
-- 依赖：验证前需在目标库造 A/B 双租户数据（见 scripts/ops/w7_b4_lims_seed.sql）。
-- ============================================================

SET client_min_messages = notice;
SET lock_timeout = '5s';

\if :{?app_role}
SET ROLE :"app_role";
\else
\echo '未传 -v app_role=...，使用当前连接角色验证'
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
        RAISE EXCEPTION '禁止以 BYPASSRLS 角色验证 RLS：% 是 BYPASSRLS', current_user;
    END IF;
    RAISE NOTICE '验证角色 = %（非超户）', current_user;
END
$guard$;

DROP TABLE IF EXISTS pg_temp.w7_lims_t;
CREATE TEMP TABLE w7_lims_t AS
SELECT * FROM (VALUES
    ('lims','ai_analyses'), ('lims','audit_logs'), ('lims','document_relations'),
    ('lims','inspection_processes'), ('lims','inspection_records'), ('lims','inspection_tasks'),
    ('lims','instrument_calibrations'), ('lims','instruments'), ('lims','lab_ledger'),
    ('lims','lims_inspection_records'), ('lims','lims_safety_tasks'), ('lims','maintenance_records'),
    ('lims','qa_lab_calibration_records'), ('lims','qa_lab_inspection_reports'), ('lims','qa_lab_instruments'),
    ('lims','qa_lab_processes'), ('lims','qa_lab_reagent_alerts'), ('lims','qa_lab_reagent_history'),
    ('lims','qa_lab_reagents'), ('lims','qa_lab_records'), ('lims','qa_lab_sample_lifecycle'),
    ('lims','qa_lims_analytes'), ('lims','qa_lims_audit_logs'), ('lims','qa_lims_barcode_scan_records'),
    ('lims','qa_lims_collection_tasks'), ('lims','qa_lims_instrument_data'), ('lims','qa_lims_method_categories'),
    ('lims','qa_lims_method_validations'), ('lims','qa_lims_method_versions'), ('lims','qa_lims_parse_rules'),
    ('lims','qa_lims_pt_corrective_actions'), ('lims','qa_lims_pt_evaluations'), ('lims','qa_lims_pt_plans'),
    ('lims','qa_lims_pt_results'), ('lims','qa_lims_pt_samples'), ('lims','qa_lims_rfid_tags'),
    ('lims','qa_lims_sample_barcodes'), ('lims','qa_lims_sync_records'), ('lims','qa_lims_test_methods'),
    ('lims','qa_lims_uncertainty_components'), ('lims','qa_lims_uncertainty_projects'), ('lims','qa_lims_uncertainty_sources'),
    ('lims','reagent_usages'), ('lims','reagents'), ('lims','samples'),
    ('public','qa_lab_calibration_records'), ('public','qa_lab_inspection_reports'), ('public','qa_lab_instruments'),
    ('public','qa_lab_processes'), ('public','qa_lab_reagent_alerts'), ('public','qa_lab_reagent_history'),
    ('public','qa_lab_reagents'), ('public','qa_lab_records'), ('public','qa_lab_sample_lifecycle'),
    ('public','qa_lab_samples'), ('public','qa_lab_tasks'),
    ('public','qa_lims_audit_logs'), ('public','qa_lims_barcode_scan_records'), ('public','qa_lims_collection_tasks'),
    ('public','qa_lims_instrument_data'), ('public','qa_lims_method_categories'), ('public','qa_lims_method_validations'),
    ('public','qa_lims_method_versions'), ('public','qa_lims_parse_rules'), ('public','qa_lims_pt_corrective_actions'),
    ('public','qa_lims_pt_evaluations'), ('public','qa_lims_pt_plans'), ('public','qa_lims_pt_results'),
    ('public','qa_lims_pt_samples'), ('public','qa_lims_rfid_tags'), ('public','qa_lims_sample_barcodes'),
    ('public','qa_lims_sync_records'), ('public','qa_lims_test_methods'), ('public','qa_lims_uncertainty_components'),
    ('public','qa_lims_uncertainty_projects'), ('public','qa_lims_uncertainty_sources')
) AS v(sch, tbl);

DROP TABLE IF EXISTS pg_temp.w7_lims_base;
CREATE TEMP TABLE w7_lims_base (sch text, tbl text, n_total bigint, n_a bigint, n_b bigint);

\echo ''
\echo '=== A. 结构断言（76/76）==='
DO $struct$
DECLARE
    r record; v_n int; v_bad text := ''; v_seen int := 0;
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_lims_t LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            v_bad := v_bad || format(' %I.%I 不存在;', r.sch, r.tbl);
            CONTINUE;
        END IF;
        v_seen := v_seen + 1;

        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' %I.%I 未 ENABLE/FORCE;', r.sch, r.tbl);
        END IF;

        SELECT count(*) INTO v_n
        FROM pg_policies WHERE schemaname = r.sch AND tablename = r.tbl;
        IF v_n <> 1 THEN
            v_bad := v_bad || format(' %I.%I 策略数=%s;', r.sch, r.tbl, v_n);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = r.sch AND tablename = r.tbl
              AND policyname = 'rls_tenant_isolation'
        ) THEN
            v_bad := v_bad || format(' %I.%I 缺 rls_tenant_isolation;', r.sch, r.tbl);
        END IF;
    END LOOP;

    IF v_bad <> '' THEN
        RAISE EXCEPTION 'A1 结构断言失败：%', v_bad;
    END IF;
    IF v_seen <> 76 THEN
        RAISE EXCEPTION 'A1 只找到 % 张表，期望 76', v_seen;
    END IF;
    RAISE NOTICE 'A1. 76 张 ENABLE+FORCE / 单策略 rls_tenant_isolation 通过';
END
$struct$;

DO $shape$
DECLARE
    v_true int; v_colcast int; v_nil int; v_sys int; v_null int; v_argcast int;
BEGIN
    SELECT count(*) FILTER (WHERE pg_get_expr(polqual, polrelid) = 'true'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%(tenant_id)::text%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'
                              OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%app.rls_system%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%tenant_id IS NULL%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%current_setting(''app.tenant_id''::text%')
    INTO v_true, v_colcast, v_nil, v_sys, v_null, v_argcast
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_temp.w7_lims_t t ON t.sch = n.nspname AND t.tbl = c.relname;

    IF v_true <> 0 THEN RAISE EXCEPTION 'A2. USING(true) 策略 % 条（期望 0）', v_true; END IF;
    IF v_colcast <> 0 THEN RAISE EXCEPTION 'A2. 列侧 cast 策略 % 条', v_colcast; END IF;
    IF v_nil <> 0 THEN RAISE EXCEPTION 'A2. nil UUID 分支 % 条', v_nil; END IF;
    IF v_null <> 0 THEN RAISE EXCEPTION 'A2. tenant_id IS NULL 分支 % 条', v_null; END IF;
    IF v_sys <> 76 THEN RAISE EXCEPTION 'A2. 系统通道策略 % 条（期望 76）', v_sys; END IF;
    IF v_argcast <> 76 THEN RAISE EXCEPTION 'A2. 函数参数 cast 谓词 % 条（期望 76）', v_argcast; END IF;
    RAISE NOTICE 'A2. 谓词形态 通过（系统通道 76；USING(true)/列侧 cast/nil/NULL 分支 均 0）';
END
$shape$;

\echo ''
\echo '=== B. 双身份（基线=系统通道）==='
SET app.rls_system = 'on';
SET app.tenant_id = '';

DO $base$
DECLARE
    r record; v_t bigint; v_a bigint; v_b bigint;
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_lims_t LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_t;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000001''', r.sch, r.tbl) INTO v_a;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000002''', r.sch, r.tbl) INTO v_b;
        INSERT INTO pg_temp.w7_lims_base VALUES (r.sch, r.tbl, v_t, v_a, v_b);
    END LOOP;
END
$base$;

SELECT count(*) AS tables, sum(n_total) AS total_rows,
       sum(n_a) AS rows_tenant_a, sum(n_b) AS rows_tenant_b
FROM pg_temp.w7_lims_base;

\echo '--- B1. tenant=...0001（期望 = 本租户行）---'
SET app.rls_system = 'off';
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';

DO $b1$
DECLARE
    r record; v_vis bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_lims_base LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_vis;
        IF v_vis <> r.n_a THEN
            v_bad := v_bad || format(' %I.%I 可见=%s 期望=%s;', r.sch, r.tbl, v_vis, r.n_a);
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
    r record; v_vis bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_lims_base LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_vis;
        IF v_vis <> r.n_b THEN
            v_bad := v_bad || format(' %I.%I 可见=%s 期望=%s;', r.sch, r.tbl, v_vis, r.n_b);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B2 失败：%', v_bad; END IF;
    RAISE NOTICE 'B2. tenant=...0002 逐表可见性 通过（跨租户 0 行）';
END
$b2$;

\echo '--- B3. 无上下文（期望 76 张全 0）---'
SET app.rls_system = 'off';
SET app.tenant_id = '';

DO $b3$
DECLARE
    r record; v_vis bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_lims_base LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_vis;
        IF v_vis <> 0 THEN
            v_bad := v_bad || format(' %I.%I 可见=%s 期望=0;', r.sch, r.tbl, v_vis);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B3 失败：%', v_bad; END IF;
    RAISE NOTICE 'B3. 无上下文 fail-closed 通过（76 张全 0）';
END
$b3$;

\echo ''
\echo '=== C. 写探测（事务内 ROLLBACK，不落数据）==='
\echo '--- C1. tenant=...0001 跨租户改写（期望 0 行）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
DO $c1$
DECLARE v_n bigint;
BEGIN
    UPDATE public.qa_lab_samples SET updated_at = NOW()
     WHERE tenant_id = '00000000-0000-0000-0000-000000000002';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 THEN RAISE EXCEPTION 'C1 失败：跨租户改写了 % 行', v_n; END IF;
    RAISE NOTICE 'C1. 跨租户改写 0 行 通过';
END
$c1$;
ROLLBACK;

\echo '--- C2. 系统通道可写（同事务内 UPDATE 后 ROLLBACK）---'
BEGIN;
SET LOCAL app.rls_system = 'on';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000000';
DO $c2$
DECLARE v_n bigint;
BEGIN
    UPDATE public.qa_lab_samples SET updated_at = NOW()
     WHERE tenant_id = '00000000-0000-0000-0000-000000000002';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN RAISE EXCEPTION 'C2 失败：系统通道未命中任何行'; END IF;
    RAISE NOTICE 'C2. 系统通道可写 % 行 通过', v_n;
END
$c2$;
ROLLBACK;

\echo '--- C3. 无上下文写（期望 0 行）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '';
DO $c3$
DECLARE v_n bigint;
BEGIN
    UPDATE public.qa_lab_samples SET updated_at = NOW();
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 0 THEN RAISE EXCEPTION 'C3 失败：无上下文写了 % 行', v_n; END IF;
    RAISE NOTICE 'C3. 无上下文写 0 行 通过';
END
$c3$;
ROLLBACK;

\echo '--- C4. 事件幂等键含 tenant_id（跨租户同 source_id 不冲突）---'
DO $c4$
DECLARE v_idx text;
BEGIN
    SELECT pg_get_indexdef(i.indexrelid) INTO v_idx
    FROM pg_index i
    WHERE i.indrelid = 'lims.lims_inspection_records'::regclass
      AND i.indisunique
      AND pg_get_indexdef(i.indexrelid) LIKE '%source_inspection_id%';
    IF v_idx IS NULL OR v_idx NOT LIKE '%tenant_id%' THEN
        RAISE EXCEPTION 'C4 失败：lims_inspection_records 幂等索引未含 tenant_id: %', v_idx;
    END IF;

    SELECT pg_get_indexdef(i.indexrelid) INTO v_idx
    FROM pg_index i
    WHERE i.indrelid = 'lims.lims_safety_tasks'::regclass
      AND i.indisunique
      AND pg_get_indexdef(i.indexrelid) LIKE '%source_hazard_id%';
    IF v_idx IS NULL OR v_idx NOT LIKE '%tenant_id%' THEN
        RAISE EXCEPTION 'C4 失败：lims_safety_tasks 幂等索引未含 tenant_id: %', v_idx;
    END IF;
    RAISE NOTICE 'C4. 事件幂等索引含 tenant_id 通过';
END
$c4$;

\echo ''
\echo '=== D. 全局只读表登记（期望 0 张）==='
DO $d$
DECLARE v_n int;
BEGIN
    SELECT count(*) INTO v_n
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lims' AND pg_get_expr(p.polqual, p.polrelid) = 'true';
    IF v_n <> 0 THEN RAISE EXCEPTION 'D 失败：lims 下仍有 USING(true) 表 % 张', v_n; END IF;
    RAISE NOTICE 'D. 全局只读表 0 张 通过';
END
$d$;

\echo ''
\echo '=== LIMS 验证全部通过 ==='
