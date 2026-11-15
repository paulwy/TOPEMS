-- ============================================================
-- 拆除 prod 遗留空壳表 2 张（只 DROP）
-- 版本：20261115130000
-- 基线：origin/main c297e9042（K8 第二批）
--
-- 范围：
--   crm.core_crm_customers
--   erp.core_erp_suppliers
--
-- ============================================================
-- 核实证据（2026-11-15，prod/dev 只读）
-- ============================================================
-- 1) 形状（prod 快照，rollback 依据）
--    3 列：id uuid NOT NULL DEFAULT gen_random_uuid()、deleted_at timestamptz、
--    tenant_id uuid（可空，无默认）；pkey <table>_pkey(id)；
--    idx_<schema>_<table>_tenant_id(tenant_id)；rls=true、force_rls=true、
--    每表 1 条 rls_tenant_isolation（fail-closed：app.rls_system='on' OR tenant_id=GUC）；
--    owner topems_prod；无显式 ACL、无 reloptions、默认表空间。
--    dev 列序为 id/tenant_id/deleted_at（补建时不同），本迁移一并拆除，不再对齐。
-- 2) 行数：prod 两表 0 行；dev 两表 0 行。
-- 3) 依赖：外键（入向）0、视图/物化视图 0、非内部触发器 0、函数文本引用 0；
--    pg_class 中仅 relkind='r' 各 1 条。pkey 与 tenant_id 索引随表删除。
-- 4) 代码：svc/、lib/ 对该两表 0 命中（0 writers / 0 readers）。
--    其余命中仅为 database/ 历史定义、rollback、manifest 与
--    scripts/ci/data/prod_cols.psv 快照（后者需在投产后刷新，见运维注记）。
--
-- ============================================================
-- 行为
-- ============================================================
--   1. 前置断言：两表必须存在、0 行、无入向外键、无视图依赖、无非内部触发器、
--      无函数文本引用；任一不符即 RAISE EXCEPTION，整事务回滚。
--   2. 逐表 DROP TABLE IF EXISTS（显式 schema，无 CASCADE）。
--   3. 后置断言：两表不存在，且无同名策略/视图残留。
--
-- 回滚：database/rollback/20261115130000_drop_shell_tables_crm_erp_2.rollback.sql
--       （逐字重建 3 列 + pkey + tenant_id 索引 + RLS ENABLE/FORCE + 策略原文；
--        owner 与授权需人工复核，见该文件文末）
--
-- 运维注记：
--   · 投产后 scripts/ci/data/prod_cols.psv 仍登记这两张表，decode-contract 会报
--     「目录存在、库中已删」的预期漂移；如需消差可执行 scripts/ci/refresh-prod-cols.sh。
--   · dev 侧同版本拆除后，dev 与 prod 均不再有这两张表。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ---------- 前置断言 ----------
DO $shell_drop_pre$
DECLARE
    r      record;
    n      bigint;
    bad    text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('crm.core_crm_customers'),
            ('erp.core_erp_suppliers')
        ) AS v(t)
    LOOP
        IF to_regclass(r.t) IS NULL THEN
            RAISE EXCEPTION 'SHELL-DROP 前置断言失败：目标表不存在 → %', r.t;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s', r.t) INTO n;
        IF n <> 0 THEN
            bad := bad || format('%s=%s 行; ', r.t, n);
        END IF;
    END LOOP;
    IF bad <> '' THEN
        RAISE EXCEPTION 'SHELL-DROP 前置断言失败：目标表非空 → %', bad;
    END IF;

    -- 入向外键
    SELECT count(*) INTO n
      FROM pg_constraint con
     WHERE con.contype = 'f'
       AND con.conrelid <> con.confrelid
       AND con.confrelid IN ('crm.core_crm_customers'::regclass, 'erp.core_erp_suppliers'::regclass);
    IF n <> 0 THEN
        RAISE EXCEPTION 'SHELL-DROP 前置断言失败：存在 % 条入向外键', n;
    END IF;

    -- 视图/物化视图依赖
    SELECT count(*) INTO n
      FROM pg_rewrite rw
      JOIN pg_depend d ON d.objid = rw.oid
                      AND d.classid = 'pg_rewrite'::regclass
                      AND d.refclassid = 'pg_class'::regclass
     WHERE d.refobjid IN ('crm.core_crm_customers'::regclass, 'erp.core_erp_suppliers'::regclass)
       AND rw.ev_class <> d.refobjid;
    IF n <> 0 THEN
        RAISE EXCEPTION 'SHELL-DROP 前置断言失败：存在 % 个视图/物化视图依赖', n;
    END IF;

    -- 非内部触发器
    SELECT count(*) INTO n
      FROM pg_trigger
     WHERE tgrelid IN ('crm.core_crm_customers'::regclass, 'erp.core_erp_suppliers'::regclass)
       AND NOT tgisinternal;
    IF n <> 0 THEN
        RAISE EXCEPTION 'SHELL-DROP 前置断言失败：存在 % 个触发器', n;
    END IF;

    -- 函数文本引用
    SELECT count(*) INTO n
      FROM pg_proc p
      JOIN pg_namespace pn ON pn.oid = p.pronamespace
     WHERE pn.nspname NOT IN ('pg_catalog', 'information_schema')
       AND (p.prosrc LIKE '%core_crm_customers%' OR p.prosrc LIKE '%core_erp_suppliers%');
    IF n <> 0 THEN
        RAISE EXCEPTION 'SHELL-DROP 前置断言失败：存在 % 个函数文本引用', n;
    END IF;

    RAISE NOTICE 'SHELL-DROP 前置断言通过：2 表 0 行 / 无入向外键 / 无视图依赖 / 无触发器 / 无函数引用';
END
$shell_drop_pre$;

-- ---------------------------------------------------------------
-- 1/2 crm.core_crm_customers
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: prod 遗留空壳表：prod/dev 0 行，svc/lib 零引用，无入向外键/视图/触发器/函数引用
-- destructive-owner: crm 域 owner（待指派）
-- destructive-ticket: TOPEMS-SHELL-TABLES-20261115
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115130000_drop_shell_tables_crm_erp_2.rollback.sql
DROP TABLE IF EXISTS crm.core_crm_customers;

-- ---------------------------------------------------------------
-- 2/2 erp.core_erp_suppliers
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: prod 遗留空壳表：prod/dev 0 行，svc/lib 零引用，无入向外键/视图/触发器/函数引用
-- destructive-owner: erp 域 owner（待指派）
-- destructive-ticket: TOPEMS-SHELL-TABLES-20261115
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115130000_drop_shell_tables_crm_erp_2.rollback.sql
DROP TABLE IF EXISTS erp.core_erp_suppliers;

-- ---------- 后置断言 ----------
DO $shell_drop_post$
DECLARE
    r        record;
    leftover text := '';
    n        bigint;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('crm.core_crm_customers'),
            ('erp.core_erp_suppliers')
        ) AS v(t)
    LOOP
        IF to_regclass(r.t) IS NOT NULL THEN
            leftover := leftover || r.t || '; ';
        END IF;
    END LOOP;
    IF leftover <> '' THEN
        RAISE EXCEPTION 'SHELL-DROP 后置断言失败：目标表仍存在 → %', leftover;
    END IF;

    SELECT count(*) INTO n
      FROM pg_policies
     WHERE (schemaname, tablename) IN (('crm', 'core_crm_customers'), ('erp', 'core_erp_suppliers'));
    IF n <> 0 THEN
        RAISE EXCEPTION 'SHELL-DROP 后置断言失败：仍有 % 条策略残留', n;
    END IF;

    RAISE NOTICE 'SHELL-DROP 完成：2 张空壳表已删除';
END
$shell_drop_post$;
