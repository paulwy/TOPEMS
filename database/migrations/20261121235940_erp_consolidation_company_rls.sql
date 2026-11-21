-- ============================================================
-- 20261121235940_erp_consolidation_company_rls.sql
--
-- 业务定性（2026-11-21）：
--   * 集团 = 一个租户下挂多家公司（同一 tenant_id 下的 hrm.companies 行）；
--   * 母公司是集团内一家，可读全部子公司；
--   * 子公司之间不可互看（含同一母公司下的兄弟公司）；
--   * 写侧仍限本公司，不代子公司记账。
--
-- 本迁移把 erp 合并域 8 张表从「租户内全可见」收紧到「公司维度」：
--   * 读：本公司可见；仅当请求显式声明母公司视角（app.actor_is_parent='on'）
--         且目标公司在 app.visible_company_ids 内时，母公司可额外读取；
--   * 写：公司列必须等于 app.company_id，系统通道不豁免（后台任务需带公司上下文）；
--   * 租户边界不变：仍复用 erp.group_tenant_of(app.tenant_id)，不引入跨租户读。
--
-- 公司归属表达式（逐表）：
--   company_relations           parent_company_id / child_company_id（双向，关系双方可见）
--   internal_transactions       from_company_id / to_company_id（双向，交易双方可见）
--   consolidation_scopes        company_id（本迁移新增）
--   consolidation_scope_companies company_id（既有）
--   consolidation_reports       company_id（本迁移新增）
--   consolidation_report_lines  company_id（本迁移新增）
--   elimination_rules           company_id（本迁移新增）
--   elimination_candidates      from_company_id / to_company_id（双向，配对双方可见）
--
-- 新增列（4 张缺公司列的表）：
--   consolidation_scopes.company_id、consolidation_reports.company_id + period_version、
--   consolidation_report_lines.company_id + period_version、elimination_rules.company_id。
--   company_id 允许 NULL（历史行 fail-closed：对普通用户不可见），不做 NOT NULL 强推，
--   避免存量脏数据让上线迁移整体失败；回填只做可推导的部分。
--   period_version 为 Q-G3 暂定规则「期间快照 + 版本」的落点，默认 1。
--
-- 幂等性：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / CREATE OR REPLACE
--   FUNCTION / DROP POLICY IF EXISTS + 约束存在性守卫，可重复执行。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ------------------------------------------------------------
-- 1. 公司维度 GUC 解析函数（fail-closed）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $fn$
    SELECT CASE
        WHEN v IS NULL OR v = '' OR v = '00000000-0000-0000-0000-000000000000' THEN NULL
        ELSE v::uuid
    END
    FROM (SELECT NULLIF(current_setting('app.company_id', true), '') AS v) s
$fn$;

COMMENT ON FUNCTION erp.current_company_id() IS
$c$
当前请求的公司主体（app.company_id）。
未设置 / 空串 / nil 哨兵 -> NULL（fail-closed，公司谓词全部为 NULL 即拒绝）。
$c$;

CREATE OR REPLACE FUNCTION erp.parent_visible_company_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $fn$
    SELECT CASE
        WHEN COALESCE(current_setting('app.actor_is_parent', true), 'off') <> 'on'
            THEN ARRAY[]::uuid[]
        ELSE COALESCE(
            string_to_array(NULLIF(current_setting('app.visible_company_ids', true), ''), ','),
            ARRAY[]::text[]
        )::uuid[]
    END
$fn$;

COMMENT ON FUNCTION erp.parent_visible_company_ids() IS
$c$
母公司视角下可见的子公司集合（app.visible_company_ids，逗号分隔 UUID）。
仅当 app.actor_is_parent='on' 时生效；否则恒为空数组（子公司之间互不可见）。
$c$;

CREATE OR REPLACE FUNCTION erp.company_readable(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $fn$
    SELECT p_company IS NOT NULL
       AND (
           p_company = erp.current_company_id()
           OR p_company = ANY (erp.parent_visible_company_ids())
       )
$fn$;

COMMENT ON FUNCTION erp.company_readable(uuid) IS
$c$
读侧公司可见性：本公司恒可见；仅母公司视角可额外读取可见集合内的子公司。
NULL 公司不可见（历史行 fail-closed）。
$c$;

-- ------------------------------------------------------------
-- 2. 补公司列（4 张）与期间版本列
-- ------------------------------------------------------------
ALTER TABLE erp.consolidation_scopes
    ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE erp.consolidation_reports
    ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE erp.consolidation_reports
    ADD COLUMN IF NOT EXISTS period_version integer NOT NULL DEFAULT 1;
ALTER TABLE erp.consolidation_report_lines
    ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE erp.consolidation_report_lines
    ADD COLUMN IF NOT EXISTS period_version integer NOT NULL DEFAULT 1;
ALTER TABLE erp.elimination_rules
    ADD COLUMN IF NOT EXISTS company_id uuid;

COMMENT ON COLUMN erp.consolidation_scopes.company_id IS
    '合并范围归属公司（hrm.companies.id）；NULL 对普通用户不可见';
COMMENT ON COLUMN erp.consolidation_reports.company_id IS
    '报表编制公司（hrm.companies.id）；母公司合并读按 company_readable 收敛';
COMMENT ON COLUMN erp.consolidation_reports.period_version IS
    '期间快照版本（Q-G3 暂定规则）：同一 period 可多次重述，默认 1';
COMMENT ON COLUMN erp.consolidation_report_lines.company_id IS
    '报表行归属公司，通常与报表头一致；NULL 对普通用户不可见';
COMMENT ON COLUMN erp.consolidation_report_lines.period_version IS
    '与报表头 period_version 对齐的期间快照版本，默认 1';
COMMENT ON COLUMN erp.elimination_rules.company_id IS
    '抵消规则归属公司（hrm.companies.id）；NULL 对普通用户不可见';

-- 回填：能从 scope / report 推导的先补上，推导不出的一律保持 NULL（fail-closed）。
UPDATE erp.consolidation_reports r
   SET company_id = s.company_id
  FROM erp.consolidation_scopes s
 WHERE r.scope_id = s.id
   AND r.company_id IS NULL
   AND s.company_id IS NOT NULL;

UPDATE erp.consolidation_report_lines l
   SET company_id = r.company_id
  FROM erp.consolidation_reports r
 WHERE l.report_id = r.id
   AND l.company_id IS NULL
   AND r.company_id IS NOT NULL;

UPDATE erp.elimination_rules x
   SET company_id = s.company_id
  FROM erp.consolidation_scopes s
 WHERE x.scope_id = s.id
   AND x.company_id IS NULL
   AND s.company_id IS NOT NULL;

-- 公司外键：与既有 fk_scope_companies_company 同口径，限定同租户。
DO $fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'erp.consolidation_scopes'::regclass
           AND conname = 'fk_consolidation_scopes_company'
    ) THEN
        ALTER TABLE erp.consolidation_scopes
            ADD CONSTRAINT fk_consolidation_scopes_company
            FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'erp.consolidation_reports'::regclass
           AND conname = 'fk_consolidation_reports_company'
    ) THEN
        ALTER TABLE erp.consolidation_reports
            ADD CONSTRAINT fk_consolidation_reports_company
            FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'erp.consolidation_report_lines'::regclass
           AND conname = 'fk_consolidation_report_lines_company'
    ) THEN
        ALTER TABLE erp.consolidation_report_lines
            ADD CONSTRAINT fk_consolidation_report_lines_company
            FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'erp.elimination_rules'::regclass
           AND conname = 'fk_elimination_rules_company'
    ) THEN
        ALTER TABLE erp.elimination_rules
            ADD CONSTRAINT fk_elimination_rules_company
            FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id);
    END IF;
END
$fk$;

CREATE INDEX IF NOT EXISTS idx_consolidation_scopes_tenant_company
    ON erp.consolidation_scopes (tenant_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consolidation_reports_tenant_company
    ON erp.consolidation_reports (tenant_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consolidation_report_lines_tenant_company
    ON erp.consolidation_report_lines (tenant_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_elimination_rules_tenant_company
    ON erp.elimination_rules (tenant_id, company_id) WHERE company_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. 收敛策略：先删除 8 张表上的全部既有策略，再按公司维度重建
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

DO $create_new$
DECLARE
    r record;
    v_tenant constant text :=
        'tenant_id = erp.group_tenant_of(NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)';
    v_system constant text :=
        'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on''';
BEGIN
    FOR r IN
        SELECT *
          FROM (VALUES
              ('company_relations',
               'erp.company_readable(parent_company_id) OR erp.company_readable(child_company_id)',
               'parent_company_id = erp.current_company_id()'),
              ('internal_transactions',
               'erp.company_readable(from_company_id) OR erp.company_readable(to_company_id)',
               'from_company_id = erp.current_company_id() OR to_company_id = erp.current_company_id()'),
              ('consolidation_scopes',
               'erp.company_readable(company_id)',
               'company_id = erp.current_company_id()'),
              ('consolidation_scope_companies',
               'erp.company_readable(company_id)',
               'company_id = erp.current_company_id()'),
              ('consolidation_reports',
               'erp.company_readable(company_id)',
               'company_id = erp.current_company_id()'),
              ('consolidation_report_lines',
               'erp.company_readable(company_id)',
               'company_id = erp.current_company_id()'),
              ('elimination_rules',
               'erp.company_readable(company_id)',
               'company_id = erp.current_company_id()'),
              ('elimination_candidates',
               'erp.company_readable(from_company_id) OR erp.company_readable(to_company_id)',
               'from_company_id = erp.current_company_id() OR to_company_id = erp.current_company_id()')
          ) AS t(tbl, read_expr, write_expr)
    LOOP
        -- 读：本公司 或 母公司可见集合；系统通道保留旁路（后台只读/运维）
        EXECUTE format(
            'CREATE POLICY %I ON erp.%I FOR SELECT USING (%s AND (%s OR (%s)))',
            r.tbl || '_company_select', r.tbl, v_tenant, v_system, r.read_expr);

        -- 写：仅本公司；系统通道不豁免，后台任务必须显式带 app.company_id
        EXECUTE format(
            'CREATE POLICY %I ON erp.%I FOR INSERT WITH CHECK (%s AND (%s))',
            r.tbl || '_company_insert', r.tbl, v_tenant, r.write_expr);
        EXECUTE format(
            'CREATE POLICY %I ON erp.%I FOR UPDATE USING (%s AND (%s)) WITH CHECK (%s AND (%s))',
            r.tbl || '_company_update', r.tbl, v_tenant, r.write_expr, v_tenant, r.write_expr);
        EXECUTE format(
            'CREATE POLICY %I ON erp.%I FOR DELETE USING (%s AND (%s))',
            r.tbl || '_company_delete', r.tbl, v_tenant, r.write_expr);

        RAISE NOTICE 'installed company policies on erp.%', r.tbl;
    END LOOP;
END
$create_new$;

-- 强制 RLS 保持开启（与既有 8 张表一致）
ALTER TABLE erp.company_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.company_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.internal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.internal_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scopes FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scope_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scope_companies FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_report_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_report_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.elimination_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.elimination_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.elimination_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.elimination_candidates FORCE ROW LEVEL SECURITY;

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
    v_force boolean;
    v_has_select boolean;
    v_has_write boolean;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        SELECT count(*) INTO v_cnt
          FROM pg_policies
         WHERE schemaname = 'erp' AND tablename = v_table;
        IF v_cnt <> 4 THEN
            RAISE EXCEPTION 'erp-company-rls ABORT: erp.% 策略数=%（期望 4：select/insert/update/delete）',
                v_table, v_cnt;
        END IF;

        SELECT relforcerowsecurity INTO v_force
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'erp' AND c.relname = v_table;
        IF NOT coalesce(v_force, false) THEN
            RAISE EXCEPTION 'erp-company-rls ABORT: erp.% 未启用 FORCE ROW LEVEL SECURITY', v_table;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM pg_policies
             WHERE schemaname = 'erp' AND tablename = v_table
               AND policyname = v_table || '_company_select'
               AND qual LIKE '%company_readable%'
        ) INTO v_has_select;
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
             WHERE schemaname = 'erp' AND tablename = v_table
               AND policyname = v_table || '_company_insert'
               AND with_check LIKE '%current_company_id%'
        ) INTO v_has_write;
        IF NOT v_has_select OR NOT v_has_write THEN
            RAISE EXCEPTION 'erp-company-rls ABORT: erp.% 读写策略未绑定公司维度', v_table;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'erp' AND p.proname = 'current_company_id'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'erp' AND p.proname = 'company_readable'
    ) THEN
        RAISE EXCEPTION 'erp-company-rls ABORT: 公司维度解析函数缺失';
    END IF;

    FOREACH v_table IN ARRAY ARRAY[
        'consolidation_scopes',
        'consolidation_reports',
        'consolidation_report_lines',
        'elimination_rules'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'erp' AND table_name = v_table
               AND column_name = 'company_id'
        ) THEN
            RAISE EXCEPTION 'erp-company-rls ABORT: erp.% 缺少 company_id', v_table;
        END IF;
    END LOOP;

    RAISE NOTICE 'erp-company-rls 自检通过：8 张表 = 4 条公司维度策略 + FORCE RLS；4 张表已补 company_id';
END
$verify$;
