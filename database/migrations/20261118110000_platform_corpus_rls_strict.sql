-- Batch A：平台语料 5 表严格 RLS + 平台读分支
--（本文件只出方案，生产另行开窗；生产零 DDL / 零数据修复 / 零停服）
--
-- 定性结论（2026-11-17/18 生产 topems_prod 与克隆库 m2_dryrun_20261116 只读核查，superuser）：
--
--   以下 5 表均为「严格 B + rls_global_read」叠加：
--     rls_tenant_isolation  FOR ALL（USING/WITH CHECK 严格 B）
--     rls_global_read       FOR SELECT（追加 OR tenant_id IS NULL）
--   叠加后：全零/未设/空串 GUC 也能读到 NULL 平台行（fail-open 残留）。
--
--   1. finance.core_finance_currencies   16 行 = NULL 8 + 租户1 8
--   2. finance.core_finance_report_line_map 48 行 = 全 NULL
--   3. public.core_roles                 17 行 = NULL 16 + 租户1 1
--   4. pm.project_type_configs            1 行 = NULL 1
--   5. mobile.sync_policies               1 行 = NULL 1（超管公共行）
--
-- 处置：NULL 归一为全零哨兵（PLATFORM_TENANT_ID），去掉 rls_global_read；
--       前 4 表新增 rls_platform_read（FOR SELECT，仅「非空租户 GUC 上下文」可读平台行），
--       即读取谓词 = 平台行 OR 本租户行；未设/空串 GUC 一律 0 行。
--       mobile.sync_policies 不加平台读：超管公共行只对全零 GUC / 系统通道可见，
--       普通租户不再能看到它（本次唯一一处「租户可见范围净减少」，属修越权）。
--
-- 数据变更：仅 5 表 74 行 tenant_id NULL → 全零哨兵（8/48/16/1/1），
--   不涉及其他表、不删行、不改业务列；随本迁移在同一事务内完成。
--
-- 锁影响：5 次 UPDATE（74 行，秒级）+ 5 次 DROP/CREATE POLICY + 5 次 ENABLE/FORCE
--   （ACCESS EXCLUSIVE 瞬时）。无 CREATE INDEX（5 表均已有 tenant_id 前导索引/唯一键）。
--
-- 回滚：database/rollback/20261118110000_platform_corpus_rls_strict.rollback.sql
--       恢复 rls_global_read、删除 rls_platform_read、哨兵回退为 NULL。
--
-- 部署耦合：必须与 svc/finance、svc/unified-core、svc/mobile 本波次代码同窗口。
--   只上迁移 → 旧代码写 NULL 平台行会被 WITH CHECK 拒绝、core_roles 的
--   `tenant_id IS NULL` 谓词取不到模板；只上代码 → 池直连仍可绕过。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    rec record;
    n_rows bigint;
    n_null bigint;
    n_zero bigint;
    n_col int;
    expected bigint;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('finance.core_finance_currencies', 8::bigint),
            ('finance.core_finance_report_line_map', 48::bigint),
            ('public.core_roles', 16::bigint),
            ('pm.project_type_configs', 1::bigint),
            ('mobile.sync_policies', 1::bigint)
        ) AS v(t, expected)
    LOOP
        IF to_regclass(rec.t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', rec.t;
        END IF;

        SELECT count(*) INTO n_col
          FROM information_schema.columns
         WHERE table_schema = split_part(rec.t, '.', 1)
           AND table_name = split_part(rec.t, '.', 2)
           AND column_name = 'tenant_id';
        IF n_col <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列', rec.t;
        END IF;

        EXECUTE format(
            'SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL), '
            'count(*) FILTER (WHERE tenant_id = %L::uuid) FROM %s',
            '00000000-0000-0000-0000-000000000000', rec.t
        ) INTO n_rows, n_null, n_zero;

        expected := rec.expected;
        RAISE NOTICE '迁移前 %：总行 %，NULL 租户 %，哨兵 %（期望 NULL=%）',
            rec.t, n_rows, n_null, n_zero, expected;

        IF n_null <> expected THEN
            RAISE EXCEPTION '前置断言失败：% 的 NULL 行数为 %，与基线 % 不符，需重新定性',
                rec.t, n_null, expected;
        END IF;
        IF n_zero <> 0 THEN
            RAISE EXCEPTION '前置断言失败：% 已有 % 行哨兵租户，疑似重复归一',
                rec.t, n_zero;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 数据归一：NULL → 全零哨兵（74 行）

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 平台语料币种租户归一，NULL → 全零哨兵，配合 rls_platform_read「平台行 OR 本租户行」
-- destructive-owner: finance
-- destructive-ticket: RESIDUAL-RLS-20261118
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 8
-- destructive-backup: 窗口前超户 pg_dump -t finance.core_finance_currencies
UPDATE finance.core_finance_currencies
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid, updated_at = CURRENT_TIMESTAMP
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 报表行映射租户归一，NULL → 全零哨兵
-- destructive-owner: finance
-- destructive-ticket: RESIDUAL-RLS-20261118
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 48
-- destructive-backup: 窗口前超户 pg_dump -t finance.core_finance_report_line_map
UPDATE finance.core_finance_report_line_map
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid, updated_at = now()
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 全局角色模板租户归一，NULL → 全零哨兵
-- destructive-owner: iam
-- destructive-ticket: RESIDUAL-RLS-20261118
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 16
-- destructive-backup: 窗口前超户 pg_dump -t public.core_roles
UPDATE public.core_roles
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid, updated_at = now()
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 项目类型平台默认租户归一，NULL → 全零哨兵
-- destructive-owner: pm
-- destructive-ticket: RESIDUAL-RLS-20261118
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1
-- destructive-backup: 窗口前超户 pg_dump -t pm.project_type_configs
UPDATE pm.project_type_configs
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid, updated_at = now()
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 超管同步策略公共行租户归一，NULL → 全零哨兵（该行不再对普通租户可见）
-- destructive-owner: mobile
-- destructive-ticket: RESIDUAL-RLS-20261118
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1
-- destructive-backup: 窗口前超户 pg_dump -t mobile.sync_policies
UPDATE mobile.sync_policies
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid, updated_at = now()
 WHERE tenant_id IS NULL;

DO $$
DECLARE
    t text;
    n_left bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'finance.core_finance_currencies',
        'finance.core_finance_report_line_map',
        'public.core_roles',
        'pm.project_type_configs',
        'mobile.sync_policies'
    ] LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_left;
        IF n_left <> 0 THEN
            RAISE EXCEPTION '归一失败：% 仍有 % 行 NULL 租户', t, n_left;
        END IF;
    END LOOP;
    RAISE NOTICE '归一完成：5 表 NULL 租户已清零';
END $$;

-- 4. 清空 5 张目标表的既有策略（幂等）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE (p.schemaname, p.tablename) IN (
             ('finance', 'core_finance_currencies'),
             ('finance', 'core_finance_report_line_map'),
             ('public', 'core_roles'),
             ('pm', 'project_type_configs'),
             ('mobile', 'sync_policies')
         )
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 5. 严格 B 范式 + 平台读分支
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'finance.core_finance_currencies',
        'finance.core_finance_report_line_map',
        'public.core_roles',
        'pm.project_type_configs',
        'mobile.sync_policies'
    ] LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
        EXECUTE format($f$
            CREATE POLICY rls_tenant_isolation ON %s
                FOR ALL TO public
                USING (
                    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                )
                WITH CHECK (
                    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                )
        $f$, t);
        RAISE NOTICE '已收紧 %（rls_tenant_isolation）', t;
    END LOOP;

    -- 平台读：平台行 OR 本租户行由两条策略合并实现；平台分支要求非空租户 GUC，
    -- 未设/空串 GUC 不再放行任何行。
    FOREACH t IN ARRAY ARRAY[
        'finance.core_finance_currencies',
        'finance.core_finance_report_line_map',
        'public.core_roles',
        'pm.project_type_configs'
    ] LOOP
        EXECUTE format($f$
            CREATE POLICY rls_platform_read ON %s
                FOR SELECT TO public
                USING (
                    tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
                    AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
                )
        $f$, t);
        RAISE NOTICE '已增加平台读 %（rls_platform_read）', t;
    END LOOP;
END $$;

-- 6. 后置断言
DO $$
DECLARE
    rec record;
    n_null bigint;
    n_zero bigint;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    has_platform_read boolean;
    has_legacy_null_branch boolean;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('finance.core_finance_currencies', 8::bigint, 2),
            ('finance.core_finance_report_line_map', 48::bigint, 2),
            ('public.core_roles', 16::bigint, 2),
            ('pm.project_type_configs', 1::bigint, 2),
            ('mobile.sync_policies', 1::bigint, 1)
        ) AS v(t, expected, pol_count)
    LOOP
        EXECUTE format(
            'SELECT count(*) FILTER (WHERE tenant_id IS NULL), '
            'count(*) FILTER (WHERE tenant_id = %L::uuid) FROM %s',
            '00000000-0000-0000-0000-000000000000', rec.t
        ) INTO n_null, n_zero;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '后置断言失败：% 仍有 % 行 NULL 租户', rec.t, n_null;
        END IF;
        IF n_zero <> rec.expected THEN
            RAISE EXCEPTION '后置断言失败：% 哨兵行数 = %（期望 %）', rec.t, n_zero, rec.expected;
        END IF;

        SELECT count(*),
               bool_or(p.policyname = 'rls_platform_read'),
               bool_or(coalesce(p.qual, '') LIKE '%tenant_id IS NULL%' OR coalesce(p.with_check, '') LIKE '%tenant_id IS NULL%')
          INTO n_pol, has_platform_read, has_legacy_null_branch
          FROM pg_policies p
         WHERE p.schemaname = split_part(rec.t, '.', 1)
           AND p.tablename = split_part(rec.t, '.', 2);

        IF n_pol <> rec.pol_count THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 %）', rec.t, n_pol, rec.pol_count;
        END IF;
        IF has_legacy_null_branch THEN
            RAISE EXCEPTION '后置断言失败：% 仍有 tenant_id IS NULL 放行分支', rec.t;
        END IF;

        IF rec.pol_count = 2 THEN
            IF NOT coalesce(has_platform_read, false) THEN
                RAISE EXCEPTION '后置断言失败：% 缺少 rls_platform_read', rec.t;
            END IF;
            SELECT p.qual::text INTO v_qual
              FROM pg_policies p
             WHERE p.schemaname = split_part(rec.t, '.', 1)
               AND p.tablename = split_part(rec.t, '.', 2)
               AND p.policyname = 'rls_platform_read';
            IF position('00000000-0000-0000-0000-000000000000' IN coalesce(v_qual, '')) = 0 THEN
                RAISE EXCEPTION '后置断言失败：% 平台读缺少哨兵谓词：%', rec.t, v_qual;
            END IF;
            IF position('current_setting' IN coalesce(v_qual, '')) = 0 THEN
                RAISE EXCEPTION '后置断言失败：% 平台读缺少非空 GUC 判定：%', rec.t, v_qual;
            END IF;
        ELSIF coalesce(has_platform_read, false) THEN
            RAISE EXCEPTION '后置断言失败：% 不应有 rls_platform_read（唯一净减少表）', rec.t;
        END IF;

        SELECT max(p.qual::text), max(p.with_check::text) INTO v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = split_part(rec.t, '.', 1)
           AND p.tablename = split_part(rec.t, '.', 2)
           AND p.policyname = 'rls_tenant_isolation';
        IF position('app.rls_system' IN coalesce(v_qual, '')) = 0
           OR position('app.tenant_id' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的隔离策略 USING 不完整：%', rec.t, v_qual;
        END IF;
        IF position('app.rls_system' IN coalesce(v_wcheck, '')) = 0
           OR position('app.tenant_id' IN coalesce(v_wcheck, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的隔离策略 WITH CHECK 不完整：%', rec.t, v_wcheck;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(rec.t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', rec.t, rls, frls;
        END IF;
    END LOOP;
    RAISE NOTICE '后置断言通过：5 表已严格 B + 前 4 表平台读；sync_policies 无平台读（唯一净减少）';
END $$;
