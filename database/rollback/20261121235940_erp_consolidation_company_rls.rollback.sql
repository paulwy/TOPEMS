-- ============================================================
-- rollback: 20261121235940_erp_consolidation_company_rls.sql
--
-- 目标：把 erp 合并域 8 张表恢复为「租户内全可见」的迁移前形状：
--   * 每张表 1 条 rls_tenant_isolation（FOR ALL，tenant + 系统通道旁路）；
--   * 删除本迁移新增的公司维度策略与解析函数；
--   * 删除 4 张表的 company_id / period_version 列（含其外键与索引）。
--
-- 注意：
--   * 回滚会丢失 company_id / period_version 的已填数据，仅用于功能回退。
--   * 恢复后的策略是租户级（同租户内公司彼此可见），不得作为长期口径。
--   * 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ------------------------------------------------------------
-- 1. 删除本迁移创建的策略
-- ------------------------------------------------------------
DO $drop_new$
DECLARE
    r record;
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
    FOR r IN
        SELECT p.tablename, p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'erp'
           AND p.tablename = ANY (v_tables)
           AND p.policyname LIKE '%\_company\_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON erp.%I', r.policyname, r.tablename);
    END LOOP;
END
$drop_new$;

-- ------------------------------------------------------------
-- 2. 恢复迁移前的租户级策略
-- ------------------------------------------------------------
DO $restore_tenant$
DECLARE
    v_table text;
    v_tenant constant text :=
        'tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid';
    v_system constant text :=
        'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''';
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON erp.%I', 'rls_tenant_isolation', v_table);
        EXECUTE format(
            'CREATE POLICY %I ON erp.%I FOR ALL USING ((%s) OR (%s)) WITH CHECK ((%s) OR (%s))',
            'rls_tenant_isolation', v_table, v_system, v_tenant, v_system, v_tenant);
    END LOOP;
END
$restore_tenant$;

-- ------------------------------------------------------------
-- 3. 删除本迁移新增的索引、外键与列
-- ------------------------------------------------------------
DROP INDEX IF EXISTS erp.idx_consolidation_scopes_tenant_company;
DROP INDEX IF EXISTS erp.idx_consolidation_reports_tenant_company;
DROP INDEX IF EXISTS erp.idx_consolidation_report_lines_tenant_company;
DROP INDEX IF EXISTS erp.idx_elimination_rules_tenant_company;

ALTER TABLE erp.consolidation_scopes
    DROP CONSTRAINT IF EXISTS fk_consolidation_scopes_company;
ALTER TABLE erp.consolidation_reports
    DROP CONSTRAINT IF EXISTS fk_consolidation_reports_company;
ALTER TABLE erp.consolidation_report_lines
    DROP CONSTRAINT IF EXISTS fk_consolidation_report_lines_company;
ALTER TABLE erp.elimination_rules
    DROP CONSTRAINT IF EXISTS fk_elimination_rules_company;

ALTER TABLE erp.consolidation_scopes
    DROP COLUMN IF EXISTS company_id;
ALTER TABLE erp.consolidation_reports
    DROP COLUMN IF EXISTS period_version;
ALTER TABLE erp.consolidation_reports
    DROP COLUMN IF EXISTS company_id;
ALTER TABLE erp.consolidation_report_lines
    DROP COLUMN IF EXISTS period_version;
ALTER TABLE erp.consolidation_report_lines
    DROP COLUMN IF EXISTS company_id;
ALTER TABLE erp.elimination_rules
    DROP COLUMN IF EXISTS company_id;

-- ------------------------------------------------------------
-- 4. 删除公司维度解析函数（此时已无策略引用）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS erp.company_readable(uuid);
DROP FUNCTION IF EXISTS erp.parent_visible_company_ids();
DROP FUNCTION IF EXISTS erp.current_company_id();

-- ------------------------------------------------------------
-- 5. 回滚自检：8 张表策略数各为 1，且新增列/函数已不存在
-- ------------------------------------------------------------
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
        SELECT count(*) INTO v_cnt
          FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = v_table;
        IF v_cnt <> 1 THEN
            RAISE EXCEPTION 'rollback ABORT: erp.% 策略数=%（期望 1）', v_table, v_cnt;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'erp'
           AND table_name IN (
               'consolidation_scopes',
               'consolidation_reports',
               'consolidation_report_lines',
               'elimination_rules'
           )
           AND column_name = 'company_id'
    ) THEN
        RAISE EXCEPTION 'rollback ABORT: company_id 列仍存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'erp'
           AND p.proname IN ('current_company_id', 'parent_visible_company_ids', 'company_readable')
    ) THEN
        RAISE EXCEPTION 'rollback ABORT: 公司维度解析函数仍存在';
    END IF;

    RAISE NOTICE 'rollback 完成：8 张表恢复为租户级策略，公司维度列与函数已移除';
END
$verify_rollback$;
