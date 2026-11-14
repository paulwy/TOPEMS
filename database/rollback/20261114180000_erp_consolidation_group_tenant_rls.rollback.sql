-- ============================================================
-- rollback: 20261114180000_erp_consolidation_group_tenant_rls.sql
--
-- 目标：把 erp 合并域 8 张表恢复到迁移前的形状（prod 实测基线）：
--   7 张 = erp_allow_all_<table>，FOR ALL USING (true) WITH CHECK (true)
--   1 张 = erp.elimination_candidates 的 tenant_isolation（GUC 兜底放行写法）
-- 并删除本迁移新增的 erp.group_tenant_of(uuid)。
--
-- 注意：
--   * 反向恢复的是"迁移前策略原文"，即 fail-open 形状；仅用于回退，不得作为长期口径。
--   * 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- 1. 删除新策略
DO $drop_new$
DECLARE
    v_table text;
    v_tables text[] := ARRAY[
        'company_relations',
        'internal_transactions',
        'consolidation_scopes',
        'consolidation_scope_companies',
        'consolidation_reports',
        'consolidation_report_lines',
        'elimination_rules',
        'elimination_candidates'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON erp.%I', 'tenant_isolation_' || v_table, v_table);
    END LOOP;
END
$drop_new$;

-- 2. 恢复 7 张 allow-all 策略
DO $restore_allow_all$
DECLARE
    v_table text;
    v_tables text[] := ARRAY[
        'company_relations',
        'internal_transactions',
        'consolidation_scopes',
        'consolidation_scope_companies',
        'consolidation_reports',
        'consolidation_report_lines',
        'elimination_rules'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        EXECUTE format(
            'CREATE POLICY %I ON erp.%I FOR ALL USING (true) WITH CHECK (true)',
            'erp_allow_all_' || v_table, v_table);
    END LOOP;
END
$restore_allow_all$;

-- 3. 恢复 elimination_candidates 的 GUC 兜底策略（迁移前原文语义）
DO $restore_ec$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = 'elimination_candidates' AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON erp.elimination_candidates FOR ALL
        USING (
            current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
            OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        WITH CHECK (
            current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
            OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        );
    END IF;
END
$restore_ec$;

-- 4. 删除解析函数（此时已无策略引用）
DROP FUNCTION IF EXISTS erp.group_tenant_of(uuid);

-- 5. 回滚自检：8 张表策略数各为 1，且函数已不存在
DO $verify_rollback$
DECLARE
    v_tables text[] := ARRAY[
        'company_relations',
        'internal_transactions',
        'consolidation_scopes',
        'consolidation_scope_companies',
        'consolidation_reports',
        'consolidation_report_lines',
        'elimination_rules',
        'elimination_candidates'
    ];
    v_table text;
    v_cnt int;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT count(*) INTO v_cnt FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = v_table;
        IF v_cnt <> 1 THEN
            RAISE EXCEPTION 'rollback ABORT: erp.% 策略数=%（期望 1）', v_table, v_cnt;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'erp' AND p.proname = 'group_tenant_of'
    ) THEN
        RAISE EXCEPTION 'rollback ABORT: erp.group_tenant_of 仍存在';
    END IF;

    RAISE NOTICE 'rollback 完成：8 张表恢复为迁移前策略形状';
END
$verify_rollback$;
