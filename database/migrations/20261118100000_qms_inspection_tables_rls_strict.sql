-- qms schema 3 张无策略表补严格 RLS（检验标准波次；本文件只出方案，生产另行开窗）
--
-- 定性结论（2026-11-17 生产 topems_prod 与克隆库 m2_dryrun_20261116 只读核查）：
--
--   1. 三张表均无 RLS、无策略：relrowsecurity=false、relforcerowsecurity=false、
--      pg_policies 0 条；tenant_id uuid 可空、无默认值；两库实测均 0 行、无 NULL 租户行。
--   2. 读写路径全部在 svc/qms/src/modules/inspection_standard.rs（本波次已从 state.pool
--      切到 RlsTxnCell 请求事务 + read_scope_for_claims / scope_with，写路径 commit），
--      并按 tenant_id 显式谓词；INSERT 侧改用 require_tenant 严格取租户，
--      不再使用 get_tenant_id 的随机 UUID 兜底。
--   3. 明细表 qms.qa_inspection_plan_items 无 tenant_id 列，租户归属由父方案
--      qms.qa_inspection_plans 决定，故本批不给明细表建策略（其读写已在同一租户事务内）。
--   4. lims.lims_safety_tasks 有零租户/待定性行，按盘点结论顺延，不在本批。
--
-- 变更：3 张表 ENABLE + FORCE RLS → 清空既有策略（当前为 0 条，幂等）→
--       重建唯一严格 B 范式策略 rls_tenant_isolation（USING + WITH CHECK）→
--       补 tenant_id 索引。不改列、不改数据、不做 NULL→全零归一。
--
-- 锁影响：3 次 ENABLE + 3 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ 3 次 CREATE POLICY
--   + 3 次 CREATE INDEX IF NOT EXISTS（0 行表，秒级）。
--
-- 回滚：database/rollback/20261118100000_qms_inspection_tables_rls_strict.rollback.sql
--       回滚恢复「无 RLS、无策略、无 tenant_id 索引」的原状。
--
-- 部署耦合：必须与 svc/qms 本波次代码同窗口。只上迁移 → 旧裸池直连在 FORCE RLS
--   下读 0 行、写 42501；只上代码 → 池直连仍可绕过。
--
-- destructive-gate: allow
-- ticket: QMS-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
    n_col int;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'qms.qa_inspection_plans',
        'qms.qa_inspection_items',
        'qms.qa_sampling_plans'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        SELECT count(*) INTO n_col
          FROM information_schema.columns
         WHERE table_schema = 'qms' AND table_name = split_part(t, '.', 2)
           AND column_name = 'tenant_id';
        IF n_col <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列', t;
        END IF;

        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', t)
          INTO n_rows, n_null;
        RAISE NOTICE '迁移前 %：总行 %，NULL 租户 % 行', t, n_rows, n_null;
        -- 允许已有真实租户行；NULL 归属行在严格策略下只对系统通道可见，必须先定性
        IF n_null <> 0 THEN
            RAISE EXCEPTION '中止：% 存在 % 行 tenant_id IS NULL，需先定性归属或回填，再做严格化', t, n_null;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'qms' AND p.tablename = split_part(t, '.', 2)) THEN
            RAISE NOTICE '迁移前 % 已有策略，将在第 3 步清空后重建', t;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 清空 3 张目标表的既有策略（幂等；当前均为 0 条）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'qms'
           AND p.tablename IN ('qa_inspection_plans', 'qa_inspection_items', 'qa_sampling_plans')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 4. 严格 B 范式：ENABLE + FORCE + 唯一策略
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'qms.qa_inspection_plans',
        'qms.qa_inspection_items',
        'qms.qa_sampling_plans'
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
        RAISE NOTICE '已收紧 %', t;
    END LOOP;
END $$;

-- 5. tenant_id 索引（3 张表 0 行，秒级）
CREATE INDEX IF NOT EXISTS idx_qa_inspection_plans_tenant_id ON qms.qa_inspection_plans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_items_tenant_id ON qms.qa_inspection_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_sampling_plans_tenant_id ON qms.qa_sampling_plans (tenant_id);

-- 6. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    has_idx boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'qms.qa_inspection_plans',
        'qms.qa_inspection_items',
        'qms.qa_sampling_plans'
    ] LOOP
        SELECT count(*), max(p.qual::text), max(p.with_check::text) INTO n_pol, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = 'qms' AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;
        IF position('app.rls_system' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.rls_system 分支：%', t, v_qual;
        END IF;
        IF position('app.tenant_id' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.tenant_id 分支：%', t, v_qual;
        END IF;
        IF position('tenant_id IS NULL' IN coalesce(v_qual, '')) > 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 仍含 tenant_id IS NULL 放行分支：%', t, v_qual;
        END IF;
        IF position('app.rls_system' IN coalesce(v_wcheck, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 WITH CHECK 缺失或未显式：%', t, v_wcheck;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM pg_indexes i
             WHERE i.schemaname = 'qms' AND i.tablename = split_part(t, '.', 2)
               AND i.indexdef LIKE '%(tenant_id)%'
        ) INTO has_idx;
        IF NOT has_idx THEN
            RAISE EXCEPTION '后置断言失败：% 缺少 tenant_id 索引', t;
        END IF;
    END LOOP;
    RAISE NOTICE '后置断言通过：qms 3 张表均已严格 B 范式（rls/force + 唯一策略 + tenant_id 索引）';
END $$;
