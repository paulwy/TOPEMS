-- 第二轮宽松策略收口：hrm.initialization_logs + qms 两张遗留表补严格 RLS
--（本文件只出方案，生产另行开窗；生产零 DDL / 零数据修复 / 零停服）
--
-- 定性结论（2026-11-17 生产 topems_prod 与克隆库 m2_dryrun_20261116 只读核查，superuser）：
--
--   1. hrm.initialization_logs：1 行（tenant_id=...0001，无 NULL、NOT NULL、无默认），
--      现策略 hrm_allow_all_initialization_logs（USING true / WITH CHECK true）。
--      全仓读写路径只有 svc/hrm/src/modules/setup.rs 一处 INSERT，无任何 SELECT；
--      本批同时把该 INSERT 从 GUC 取租户改为显式绑定 claims 租户（tenant_uuid），
--      与同函数 companies INSERT 一致。无跨租户读路径。
--
--   2. qms.quality_inspections / qms.quality_standards：两库均 0 行、tenant_id 可空，
--      现策略 qms_allow_all_quality_inspections / qms_allow_all_quality_standards
--      （USING true / WITH CHECK true）。qms 模型（svc/qms/src/models/schema_defense.rs）
--      已把 7 张同名污染表列为幻影表并移除代码引用，本批仅对其中仍带 tenant_id 的
--      这两张做防遗留收严；其余 5 张（audit_logs/corrective_actions/dashboard_metrics/
--      inspection_items/quality_issues）无 tenant_id 列，不建租户策略，登记为 DROP 候选。
--
--   3. 其余宽松表均有跨租户读路径或零租户回填前置，不在本批，顺延矩阵见
--      docs/database/repo-wide-rls-pool-closure-2026-11-18.md 与迁移 manifest。
--
-- 变更：3 张表动态清空既有 allow_all 策略 → ENABLE + FORCE RLS →
--       重建唯一严格 B 范式策略 rls_tenant_isolation（USING + WITH CHECK）→
--       补 tenant_id 索引。不改列、不改数据、不做 NULL→全零归一。
--
-- 锁影响：3 次 ENABLE + 3 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ 3 次 DROP/CREATE POLICY
--   + 3 次 CREATE INDEX IF NOT EXISTS（0/1 行表，秒级）。
--
-- 回滚：database/rollback/20261118103000_residual_loose_tables_rls_strict.rollback.sql
--       回滚重建原 allow_all 策略并恢复无 tenant_id 索引的原状。
--
-- 部署耦合：必须与 svc/hrm 本波次代码同窗口。只上迁移 → 旧代码在 FORCE RLS 下
--   initialization_logs 写入触发策略/非空失败（该写入为 best-effort，不阻断主流程）；
--   只上代码 → 池直连仍可绕过。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
    n_col int;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'hrm.initialization_logs',
        'qms.quality_inspections',
        'qms.quality_standards'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        SELECT count(*) INTO n_col
          FROM information_schema.columns
         WHERE table_schema = split_part(t, '.', 1)
           AND table_name = split_part(t, '.', 2)
           AND column_name = 'tenant_id';
        IF n_col <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列', t;
        END IF;

        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', t)
          INTO n_rows, n_null;
        RAISE NOTICE '迁移前 %：总行 %，NULL 租户 % 行', t, n_rows, n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '中止：% 存在 % 行 tenant_id IS NULL，需先定性归属或回填，再做严格化', t, n_null;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = split_part(t, '.', 1)
                      AND p.tablename = split_part(t, '.', 2)) THEN
            RAISE NOTICE '迁移前 % 已有策略，将在第 3 步清空后重建', t;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 清空 3 张目标表的既有策略（幂等）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE (p.schemaname = 'hrm' AND p.tablename = 'initialization_logs')
            OR (p.schemaname = 'qms' AND p.tablename IN ('quality_inspections', 'quality_standards'))
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
        'hrm.initialization_logs',
        'qms.quality_inspections',
        'qms.quality_standards'
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

-- 5. tenant_id 索引（0/1 行表，秒级）
--    qms 两张遗留表已存在 tenant_id 索引（idx_qms_quality_inspections_tenant_id /
--    idx_qms_quality_standards_tenant_id 等），不重复创建；仅 hrm.initialization_logs 需要补。
CREATE INDEX IF NOT EXISTS idx_initialization_logs_tenant_id ON hrm.initialization_logs (tenant_id);

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
        'hrm.initialization_logs',
        'qms.quality_inspections',
        'qms.quality_standards'
    ] LOOP
        SELECT count(*), max(p.qual::text), max(p.with_check::text) INTO n_pol, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2);
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
             WHERE i.schemaname = split_part(t, '.', 1)
               AND i.tablename = split_part(t, '.', 2)
               AND i.indexdef LIKE '%(tenant_id)%'
        ) INTO has_idx;
        IF NOT has_idx THEN
            RAISE EXCEPTION '后置断言失败：% 缺少 tenant_id 索引', t;
        END IF;
    END LOOP;
    RAISE NOTICE '后置断言通过：3 张表均已严格 B 范式（rls/force + 唯一策略 + tenant_id 索引）';
END $$;
