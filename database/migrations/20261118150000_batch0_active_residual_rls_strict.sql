-- 批 0 剩余 3 张活表补严格 RLS（本文件只出方案，生产另行开窗）
--
-- 范围说明：87 张「无策略、未开 RLS」表的定性结论里，15 张是运行期活表；
--   其中 12 张已由既有草案覆盖，不在本迁移重复：
--     bi 8 张            → 20261118093000_bi_core_tables_rls_strict.sql
--     qms 3 张           → 20261118100000_qms_inspection_tables_rls_strict.sql
--     iam.core_tenant_plugins → 20261118124000_iam_tenant_plugins_rls_strict.sql
--   本迁移只补剩下的 3 张，避免同一张表被两条迁移重复建策略。
--
-- 定性结论（2026-11-18 生产 topems_prod 只读核查 + 全仓代码走读）：
--
--   1. public.core_file_permissions —— 租户表（文件授权）
--      读：svc/unified-core 文件权限查询走请求事务作用域，带 tenant_id 谓词；
--      写：svc/unified-core/src/modules/file/manage.rs:1292
--          `INSERT INTO core_file_permissions (file_id,user_id,permission,tenant_id) VALUES (...,$4)`
--          显式绑定请求租户，无 NULL 写入点。
--      数据：0 行；tenant_id 可空、无默认值；唯一键 (file_id,user_id)；tenant_id 无索引。
--
--   2. public.monitor_thresholds —— 租户表（监控阈值）
--      读：svc/monitor/src/modules/monitor/alert_evaluator.rs:337-351
--          `scope_with(txn)` + 租户谓词，绑定 claims 租户；
--      写：同模块创建/更新阈值均走请求事务作用域并显式绑定 tenant_id。
--      数据：0 行；tenant_id 可空、无默认值；已有 idx_monitor_thresholds_tenant。
--
--   3. public.core_users —— 租户表（用户镜像，只读消费）
--      读：svc/analytics/src/main.rs:308-430（reports-center / user-growth / role-distribution）
--          走 TenantScope::from_claims + open_read_scope，查询带 tenant_id 谓词；
--          search_path = bi, public，未限定 core_users 命中 public.core_users。
--      写：全仓无 INSERT/UPDATE/DELETE（写路径在 iam.users / core_tenant_users）。
--      数据：0 行；tenant_id NOT NULL、无默认值；已有 idx_core_users_tenant。
--
--   注意：public.core_users 无写入方，收紧后分析看板的用户计数仍为 0（现状即 0），
--   本迁移不改变该行为；待 IAM 用户同步落库后另行评估。
--
-- 变更：ENABLE + FORCE RLS → 清空既有策略（当前 0 条，幂等）→
--       建唯一严格 B 范式策略 rls_tenant_isolation（USING + WITH CHECK，
--       系统通道 OR 本租户行，GUC 未设/空串/全零天然不匹配）→
--       补 idx_core_file_permissions_tenant_id。不改列、不改数据、不做 NULL 归一。
--
-- 可见范围：未设/空串/全零 GUC → 0 行；租户 A → 仅 A 行；租户 B → 仅 B 行；
--   A + app.rls_system='on' → 全部行。
--
-- 锁影响：3 次 ENABLE + 3 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ 3 次 CREATE POLICY
--   + 1 次 CREATE INDEX IF NOT EXISTS（0 行表，毫秒级）。
--
-- 回滚：database/rollback/20261118150000_batch0_active_residual_rls_strict.rollback.sql
--
-- 部署耦合：与 svc/unified-core、svc/monitor、svc/analytics 本波次代码同窗口。
--   只上迁移 → 未设置租户 GUC 的裸池读写被拒（0 行表，读 0 行、写 42501）；
--   只上代码 → 池直连仍可绕过。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    rec record;
    n_rows bigint;
    n_null bigint;
    n_col int;
    n_pol int;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('public.core_file_permissions'),
            ('public.monitor_thresholds'),
            ('public.core_users')
        ) AS v(t)
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

        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', rec.t)
           INTO n_rows, n_null;
        IF n_rows <> 0 THEN
            RAISE EXCEPTION '前置断言失败：% 有 % 行数据，超出本批「空表」范围', rec.t, n_rows;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = split_part(rec.t, '.', 1)
           AND p.tablename = split_part(rec.t, '.', 2);
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '前置断言失败：% 已有 % 条策略，与盘点「0 条」不符，需重新定性', rec.t, n_pol;
        END IF;

        RAISE NOTICE '迁移前 %：行 %，NULL 租户 %，策略 %', rec.t, n_rows, n_null, n_pol;
    END LOOP;
END $$;

-- 2. 清空既有策略（幂等）→ ENABLE + FORCE → 严格 B 范式
DO $$
DECLARE
    r record;
    t text;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE (p.schemaname, p.tablename) IN (
             ('public', 'core_file_permissions'),
             ('public', 'monitor_thresholds'),
             ('public', 'core_users')
         )
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;

    FOREACH t IN ARRAY ARRAY[
        'public.core_file_permissions',
        'public.monitor_thresholds',
        'public.core_users'
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
END $$;

-- 3. tenant_id 索引（仅 core_file_permissions 缺）
CREATE INDEX IF NOT EXISTS idx_core_file_permissions_tenant_id
    ON public.core_file_permissions (tenant_id);

-- 4. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_file_permissions',
        'public.monitor_thresholds',
        'public.core_users'
    ] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;

        SELECT p.qual::text, p.with_check::text INTO v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2)
           AND p.policyname = 'rls_tenant_isolation';
        IF position('app.rls_system' IN coalesce(v_qual, '')) = 0
           OR position('app.tenant_id' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的隔离策略 USING 不完整：%', t, v_qual;
        END IF;
        IF position('app.rls_system' IN coalesce(v_wcheck, '')) = 0
           OR position('app.tenant_id' IN coalesce(v_wcheck, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的隔离策略 WITH CHECK 不完整：%', t, v_wcheck;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;
    END LOOP;
    RAISE NOTICE '后置断言通过：3 表已严格 B 范式';
END $$;
