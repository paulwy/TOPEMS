-- ============================================================
-- 20261114180000_erp_consolidation_group_tenant_rls.sql
--
-- 背景（prod 只读核实 2026-11-14）：
--   erp 合并域 8 张表当前是"全放行"：
--     * 7 张：策略 erp_allow_all_<table>，cmd=ALL，qual=true，with_check=true；
--     * 1 张：erp.elimination_candidates 的 tenant_isolation 仍是 GUC 兜底写法
--       （GUC 缺失/空串/nil 哨兵/tenant_id IS NULL 时一律放行）。
--   8 张表均已 FORCE ROW LEVEL SECURITY，owner=topems_prod（非超户），
--   prod 行数全部为 0，因此本次收紧不涉及数据搬迁。
--
-- 口径（集团租户）：
--   这类数据的归属单位是集团，不是成员公司。经 prod 只读核对：
--     1. hrm.companies 没有 parent/group 字段，唯一归属列是 tenant_id；
--     2. erp.company_relations 的外键是
--          (tenant_id, parent_company_id) / (tenant_id, child_company_id)
--            -> hrm.companies(tenant_id, id)，
--        即母子公司必须同属一个 tenant_id；
--     3. public/iam.core_tenants 没有 parent_tenant_id，tenant_type 只是
--        shared/dedicated 部署形态，不是集团层级。
--   => 本模型里 tenant 本身就是集团边界：tenant_id 即集团租户，成员公司是同一
--      tenant 下的 hrm.companies 行。因此 group_tenant_of() 解析结果为租户自身；
--      不为"成员公司租户"臆造映射表（无数据来源、无人维护）。
--
-- 变更内容：
--   1. 新建稳定函数 erp.group_tenant_of(uuid)：
--        GUC 缺失/NULL/空串/nil 哨兵 -> NULL（fail-closed，任何谓词都为 NULL 即拒绝）
--        合法租户 -> 该租户自身（集团自身 -> 自身）
--      函数体内留注释：未来若引入租户级上下级，只改本函数，8 张表策略不动。
--   2. 8 张表策略统一改为 FOR ALL：
--        USING      (tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid))
--        WITH CHECK (tenant_id = erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::uuid))
--      先删除这些表上的全部既有策略（含 erp_allow_all_* 与 elimination_candidates 的
--      tenant_isolation），不留第二套放行口径。
--   3. 确认 ENABLE + FORCE ROW LEVEL SECURITY。
--   4. 形状自检：8 张表各只剩 1 条策略、策略表达式必须引用 group_tenant_of、
--      必须 FORCE；任一不满足 RAISE EXCEPTION 终止（psql --single-transaction 下整事务回滚）。
--
-- 幂等性：DROP POLICY IF EXISTS + CREATE POLICY 存在性守卫，可重复执行。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ------------------------------------------------------------
-- 1. 集团租户解析函数
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.group_tenant_of(p_tenant uuid)
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $fn$
    SELECT CASE
        WHEN p_tenant IS NULL THEN NULL
        WHEN p_tenant = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL
        -- 未来若引入"租户级上下级"（成员公司租户 -> 集团租户），只在此处追加解析；
        -- 8 张表的策略表达式保持不变。
        ELSE p_tenant
    END
$fn$;

COMMENT ON FUNCTION erp.group_tenant_of(uuid) IS
$c$
合并域集团租户解析。入参为 app.tenant_id；
NULL / 空串 / nil 哨兵 -> NULL（fail-closed）；合法租户 -> 自身。
当前数据模型下 tenant 即集团边界：hrm.companies.tenant_id 就是集团租户，
erp.company_relations 的 (tenant_id, company_id) 外键保证母子公司同租户。
$c$;

-- ------------------------------------------------------------
-- 2. 删除 8 张表上的全部既有策略（收敛 prod 的全放行与 dev 的 GUC 兜底两套形状）
-- ------------------------------------------------------------
DO $drop_old$
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
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON erp.%I', r.policyname, r.tablename);
        RAISE NOTICE 'dropped policy erp.%.%', r.tablename, r.policyname;
    END LOOP;
END
$drop_old$;

-- ------------------------------------------------------------
-- 3. 重建 fail-closed 集团租户策略 + 强制 RLS
-- ------------------------------------------------------------
DO $create_new$
DECLARE
    v_table text;
    v_policy text;
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
        v_policy := 'tenant_isolation_' || v_table;
        EXECUTE format(
            'CREATE POLICY %I ON erp.%I FOR ALL
               USING (tenant_id = erp.group_tenant_of(NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid))
               WITH CHECK (tenant_id = erp.group_tenant_of(NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid))',
            v_policy, v_table);
        EXECUTE format('ALTER TABLE erp.%I ENABLE ROW LEVEL SECURITY', v_table);
        EXECUTE format('ALTER TABLE erp.%I FORCE ROW LEVEL SECURITY', v_table);
        RAISE NOTICE 'installed % on erp.%', v_policy, v_table;
    END LOOP;
END
$create_new$;

-- ------------------------------------------------------------
-- 4. 形状自检
-- ------------------------------------------------------------
DO $verify$
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
    v_qual text;
    v_force boolean;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT count(*) INTO v_cnt
          FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = v_table;
        IF v_cnt <> 1 THEN
            RAISE EXCEPTION 'erp-group-tenant-rls ABORT: erp.% 策略数=%（期望 1）', v_table, v_cnt;
        END IF;

        SELECT qual INTO v_qual
          FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = v_table;
        IF v_qual IS NULL OR v_qual NOT LIKE '%group_tenant_of%' THEN
            RAISE EXCEPTION 'erp-group-tenant-rls ABORT: erp.% 策略未绑定 group_tenant_of（qual=%）', v_table, v_qual;
        END IF;

        SELECT relforcerowsecurity INTO v_force
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'erp' AND c.relname = v_table;
        IF NOT coalesce(v_force, false) THEN
            RAISE EXCEPTION 'erp-group-tenant-rls ABORT: erp.% 未启用 FORCE ROW LEVEL SECURITY', v_table;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'erp' AND p.proname = 'group_tenant_of'
    ) THEN
        RAISE EXCEPTION 'erp-group-tenant-rls ABORT: erp.group_tenant_of(uuid) 缺失';
    END IF;

    RAISE NOTICE 'erp-group-tenant-rls 自检通过：8 张表 = 1 条 group_tenant_of 策略 + FORCE RLS';
END
$verify$;
