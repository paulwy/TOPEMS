-- ============================================================
-- finance 空壳死表清理（6 张 · 只 DROP，不投生产）
-- 版本：20261114170000
-- 基线：origin/main 1975be1bdd7020c73599f6f3956ec2fa9f4f4cec
--
-- 范围（按 topems-table-inventory-2026-11-14.md 判为「死表 + 建议删」的 6 张）：
--   finance.finance_u
--   finance.finance_v
--   finance.finance_audit_rules_v
--   finance.finance_budget_variances_v
--   finance.finance_cash_flow_predictions_v
--   finance.finance_prediction_models_v
--
-- ============================================================
-- 核实证据（2026-11-14，prod 只读 / dev 只读）
-- ============================================================
-- 1) 代码引用
--    rg -n -w "<table>" svc/            → 6 张均 0 命中
--    rg -n -w "<table>" database/       → 6 张共 5+3 命中，全部为定义/守卫，无使用型引用：
--      · 20260725000000_business_base_tables.sql:3111-3117 本表自身
--        CREATE TABLE IF NOT EXISTS "finance"."<table>" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())
--      · 20261109160000_p5_b1_finance_audit_v52_tables.sql:43-46
--        finance_audit_rules_v → finance_audit_rules_v52 的守卫式 RENAME
--        （to_regclass('finance.finance_audit_rules_v52') IS NULL 才改名；
--          prod/dev 的 _v52 均已存在，该分支恒不触发，删表后同样为 no-op）
--      · migration_manifest.yaml:980 说明文字
--    全仓其它命中仅为快照类文件：fixtures/full_schema_contract.sql、
--    scripts/ci/data/prod_cols.psv、docs/database/Phase D DB 兜底登记-2026-10-23.md。
--
-- 2) 行数（\gexec 逐表 count(*)）
--    prod：6/6 = 0 行；dev：6/6 = 0 行。
--
-- 3) 外键（pg_constraint 中作为被引用表 confrelid，排除自引用）：prod 0 行、dev 0 行。
--
-- 4) 视图/物化视图依赖（pg_rewrite ⋈ pg_depend）：prod 0 行、dev 0 行。
--    剩余 pg_depend 仅自身 pg_type / pg_attrdef / pg_constraint（dev 另含 pg_policy），随表删除。
--    另核：pg_statistic_ext 0、pg_publication_rel 0、非内部触发器 0、表/列注释 0、
--    reloptions/reltablespace/relreplident 均为默认。
--
-- ============================================================
-- 形状差异（rollback 依据）
-- ============================================================
-- prod：2 列（id uuid NOT NULL DEFAULT gen_random_uuid()、deleted_at timestamptz），
--       PK <table>_pkey，无 RLS/策略，owner topems_prod。
-- dev ：3 列（多 tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'），
--       RLS ENABLE+FORCE，每表 2 条 fail-open 策略（rls_tenant_isolation、
--       tenant_isolation_<table>），owner topems_app；策略由 20260908000016 /
--       20261110120000 添加。
-- rollback 按仓库既有惯例「按生产只读快照」重建 prod 形状，并在文件内注明 dev 增量来源。
--
-- ============================================================
-- 行为
-- ============================================================
--   1. 前置断言：6 张表若存在必须 0 行；不得有外部外键引用；不得有视图/物化视图依赖。
--      任一不满足即 RAISE EXCEPTION，整事务回滚（apply-forward 使用 --single-transaction）。
--   2. 逐表 DROP TABLE IF EXISTS（显式 schema，无 CASCADE）。
--   3. 后置断言：6 张表均不存在。
--
-- 回滚：database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
--       （每张表 DROP 前对应一段完整 CREATE TABLE + 约束/索引）。
--
-- 运维注记：
--   · 本迁移仅入库，不在本次任务投递生产。
--   · 投产前请确认账本 max < 20261114170000；投产后刷新
--     scripts/ci/refresh-prod-cols.sh，否则 scripts/ci/data/prod_cols.psv
--     仍登记这 6 张表，decode-contract 检查会报「目录存在、库中已删」的预期漂移。
--   · dev 侧回滚若需恢复 tenant_id/RLS，见 rollback 文件 §附注。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ---------- 前置断言 ----------
DO $fin_dead_shells_pre$
DECLARE
    r      record;
    n      bigint;
    bad    text := '';
BEGIN
    -- 1) 存在则必须 0 行
    FOR r IN
        SELECT * FROM (VALUES
            ('finance.finance_u'),
            ('finance.finance_v'),
            ('finance.finance_audit_rules_v'),
            ('finance.finance_budget_variances_v'),
            ('finance.finance_cash_flow_predictions_v'),
            ('finance.finance_prediction_models_v')
        ) AS v(t)
    LOOP
        IF to_regclass(r.t) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('SELECT count(*) FROM %s', r.t) INTO n;
        IF n <> 0 THEN
            bad := bad || format('%s=%s 行; ', r.t, n);
        END IF;
    END LOOP;
    IF bad <> '' THEN
        RAISE EXCEPTION 'FIN-DEAD-SHELLS 前置断言失败：目标表非空 → %', bad;
    END IF;

    -- 2) 不得被外部外键引用（排除自引用）
    SELECT count(*) INTO n
      FROM pg_constraint con
      JOIN pg_class p      ON p.oid = con.confrelid
      JOIN pg_namespace pn ON pn.oid = p.relnamespace
     WHERE con.contype = 'f'
       AND con.conrelid <> con.confrelid
       AND pn.nspname = 'finance'
       AND p.relname IN ('finance_u','finance_v','finance_audit_rules_v',
                         'finance_budget_variances_v','finance_cash_flow_predictions_v',
                         'finance_prediction_models_v');
    IF n <> 0 THEN
        RAISE EXCEPTION 'FIN-DEAD-SHELLS 前置断言失败：存在 % 条外部外键引用', n;
    END IF;

    -- 3) 不得有视图/物化视图依赖
    SELECT count(*) INTO n
      FROM pg_rewrite rw
      JOIN pg_depend d  ON d.objid = rw.oid
                       AND d.classid = 'pg_rewrite'::regclass
                       AND d.refclassid = 'pg_class'::regclass
      JOIN pg_class src  ON src.oid = d.refobjid
      JOIN pg_namespace sn ON sn.oid = src.relnamespace
      JOIN pg_class dep  ON dep.oid = rw.ev_class
     WHERE sn.nspname = 'finance'
       AND src.relname IN ('finance_u','finance_v','finance_audit_rules_v',
                           'finance_budget_variances_v','finance_cash_flow_predictions_v',
                           'finance_prediction_models_v')
       AND dep.oid <> src.oid;
    IF n <> 0 THEN
        RAISE EXCEPTION 'FIN-DEAD-SHELLS 前置断言失败：存在 % 个视图/物化视图依赖', n;
    END IF;

    RAISE NOTICE 'FIN-DEAD-SHELLS 前置断言通过：6 张目标表 0 行 / 无外部外键 / 无视图依赖';
END
$fin_dead_shells_pre$;

-- ---------------------------------------------------------------
-- 1/6 finance.finance_u
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 空壳死表 finance.finance_u：prod/dev 0 行，svc/ 零引用，无外键与视图依赖
-- destructive-owner: finance 域 owner（待指派）
-- destructive-ticket: TOPEMS-FIN-DEAD-SHELLS-20261114
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
DROP TABLE IF EXISTS finance.finance_u;

-- ---------------------------------------------------------------
-- 2/6 finance.finance_v
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 空壳死表 finance.finance_v：prod/dev 0 行，svc/ 零引用，无外键与视图依赖
-- destructive-owner: finance 域 owner（待指派）
-- destructive-ticket: TOPEMS-FIN-DEAD-SHELLS-20261114
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
DROP TABLE IF EXISTS finance.finance_v;

-- ---------------------------------------------------------------
-- 3/6 finance.finance_audit_rules_v
--     （database/ 仅守卫式改名引用；_v52 已存在，守卫恒不触发）
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 空壳死表 finance.finance_audit_rules_v：prod/dev 0 行，改名守卫恒不触发，无外键与视图依赖
-- destructive-owner: finance 域 owner（待指派）
-- destructive-ticket: TOPEMS-FIN-DEAD-SHELLS-20261114
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
DROP TABLE IF EXISTS finance.finance_audit_rules_v;

-- ---------------------------------------------------------------
-- 4/6 finance.finance_budget_variances_v
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 空壳死表 finance.finance_budget_variances_v：prod/dev 0 行，svc/ 零引用，无外键与视图依赖
-- destructive-owner: finance 域 owner（待指派）
-- destructive-ticket: TOPEMS-FIN-DEAD-SHELLS-20261114
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
DROP TABLE IF EXISTS finance.finance_budget_variances_v;

-- ---------------------------------------------------------------
-- 5/6 finance.finance_cash_flow_predictions_v
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 空壳死表 finance.finance_cash_flow_predictions_v：prod/dev 0 行，svc/ 零引用，无外键与视图依赖
-- destructive-owner: finance 域 owner（待指派）
-- destructive-ticket: TOPEMS-FIN-DEAD-SHELLS-20261114
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
DROP TABLE IF EXISTS finance.finance_cash_flow_predictions_v;

-- ---------------------------------------------------------------
-- 6/6 finance.finance_prediction_models_v
-- ---------------------------------------------------------------
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 空壳死表 finance.finance_prediction_models_v：prod/dev 0 行，svc/ 零引用，无外键与视图依赖
-- destructive-owner: finance 域 owner（待指派）
-- destructive-ticket: TOPEMS-FIN-DEAD-SHELLS-20261114
-- destructive-expires: 2027-01-15
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
DROP TABLE IF EXISTS finance.finance_prediction_models_v;

-- ---------- 后置断言 ----------
DO $fin_dead_shells_post$
DECLARE
    r       record;
    leftover text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('finance.finance_u'),
            ('finance.finance_v'),
            ('finance.finance_audit_rules_v'),
            ('finance.finance_budget_variances_v'),
            ('finance.finance_cash_flow_predictions_v'),
            ('finance.finance_prediction_models_v')
        ) AS v(t)
    LOOP
        IF to_regclass(r.t) IS NOT NULL THEN
            leftover := leftover || r.t || '; ';
        END IF;
    END LOOP;
    IF leftover <> '' THEN
        RAISE EXCEPTION 'FIN-DEAD-SHELLS 后置断言失败：目标表仍存在 → %', leftover;
    END IF;
    RAISE NOTICE 'FIN-DEAD-SHELLS 完成：6 张空壳死表已删除';
END
$fin_dead_shells_post$;
