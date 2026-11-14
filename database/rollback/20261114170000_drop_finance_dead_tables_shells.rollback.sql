-- ============================================================
-- 回滚：20261114170000_drop_finance_dead_tables_shells.sql
--
-- 口径：按 2026-11-14 生产只读快照（topems_prod）逐表重建 6 张空壳表。
--       生产实测形状：每表 2 列（id uuid NOT NULL DEFAULT gen_random_uuid()、
--       deleted_at timestamptz），PK <table>_pkey，其余索引 0、触发器 0、
--       表/列注释 0、reloptions/reltablespace 默认、无 RLS/策略、无扩展统计、
--       无逻辑复制发布。下列 DDL 与生产 pg_get_constraintdef / pg_indexes 逐字一致。
--
-- 与 dev 的差异（不回滚到 dev 形状）：
--   dev 副本另有 tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'
--   （20260908000016 补列）、RLS ENABLE+FORCE 及每表 2 条 fail-open 策略
--   （20260908000016 / 20261110120000）。生产从未收敛到该形状，故不在此重建；
--   如需在 dev 回滚后保持契约形状，执行文末 §附注 的语句。
--
-- 用于生产急停：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f database/rollback/20261114170000_drop_finance_dead_tables_shells.rollback.sql
--
-- 幂等：CREATE TABLE IF NOT EXISTS；表已存在时整段跳过，不改既有结构。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ---------------------------------------------------------------
-- 1/6 finance.finance_u
-- 生产 DDL：id uuid NOT NULL DEFAULT gen_random_uuid(); deleted_at timestamptz;
--           CONSTRAINT finance_u_pkey PRIMARY KEY (id)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.finance_u (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamptz,
    CONSTRAINT finance_u_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------
-- 2/6 finance.finance_v
-- 生产 DDL：id uuid NOT NULL DEFAULT gen_random_uuid(); deleted_at timestamptz;
--           CONSTRAINT finance_v_pkey PRIMARY KEY (id)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.finance_v (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamptz,
    CONSTRAINT finance_v_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------
-- 3/6 finance.finance_audit_rules_v
-- 生产 DDL：id uuid NOT NULL DEFAULT gen_random_uuid(); deleted_at timestamptz;
--           CONSTRAINT finance_audit_rules_v_pkey PRIMARY KEY (id)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.finance_audit_rules_v (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamptz,
    CONSTRAINT finance_audit_rules_v_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------
-- 4/6 finance.finance_budget_variances_v
-- 生产 DDL：id uuid NOT NULL DEFAULT gen_random_uuid(); deleted_at timestamptz;
--           CONSTRAINT finance_budget_variances_v_pkey PRIMARY KEY (id)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.finance_budget_variances_v (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamptz,
    CONSTRAINT finance_budget_variances_v_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------
-- 5/6 finance.finance_cash_flow_predictions_v
-- 生产 DDL：id uuid NOT NULL DEFAULT gen_random_uuid(); deleted_at timestamptz;
--           CONSTRAINT finance_cash_flow_predictions_v_pkey PRIMARY KEY (id)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.finance_cash_flow_predictions_v (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamptz,
    CONSTRAINT finance_cash_flow_predictions_v_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------
-- 6/6 finance.finance_prediction_models_v
-- 生产 DDL：id uuid NOT NULL DEFAULT gen_random_uuid(); deleted_at timestamptz;
--           CONSTRAINT finance_prediction_models_v_pkey PRIMARY KEY (id)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.finance_prediction_models_v (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamptz,
    CONSTRAINT finance_prediction_models_v_pkey PRIMARY KEY (id)
);

-- ---------------------------------------------------------------
-- 属主恢复：生产/ dev 的这 6 张表属主均与 finance schema 属主一致
-- （prod=topems_prod，dev=topems_app），按 schema 属主回填，避免硬编码角色名。
-- ---------------------------------------------------------------
DO $fin_dead_shells_rb_owner$
DECLARE
    r record;
    schema_owner text;
BEGIN
    SELECT pg_get_userbyid(nspowner) INTO schema_owner
      FROM pg_namespace WHERE nspname = 'finance';

    IF schema_owner IS NULL THEN
        RAISE EXCEPTION 'FIN-DEAD-SHELLS 回滚失败：finance schema 不存在';
    END IF;

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
        EXECUTE format('ALTER TABLE %s OWNER TO %I', r.t, schema_owner);
    END LOOP;

    RAISE NOTICE 'FIN-DEAD-SHELLS 回滚：6 张表属主已恢复为 %', schema_owner;
END
$fin_dead_shells_rb_owner$;

-- ---------------------------------------------------------------
-- 回滚形状自检：6 张表存在、2 列、PK 名与列正确
-- ---------------------------------------------------------------
DO $fin_dead_shells_rb_verify$
DECLARE
    r record;
    n_col int;
    pk_name text;
    bad text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('finance.finance_u',              'finance_u_pkey'),
            ('finance.finance_v',              'finance_v_pkey'),
            ('finance.finance_audit_rules_v',  'finance_audit_rules_v_pkey'),
            ('finance.finance_budget_variances_v', 'finance_budget_variances_v_pkey'),
            ('finance.finance_cash_flow_predictions_v', 'finance_cash_flow_predictions_v_pkey'),
            ('finance.finance_prediction_models_v', 'finance_prediction_models_v_pkey')
        ) AS v(t, pk)
    LOOP
        IF to_regclass(r.t) IS NULL THEN
            bad := bad || r.t || ' 缺失; ';
            CONTINUE;
        END IF;

        SELECT count(*) INTO n_col
          FROM pg_attribute
         WHERE attrelid = r.t::regclass AND attnum > 0 AND NOT attisdropped;
        IF n_col <> 2 THEN
            bad := bad || format('%s 列数=%s; ', r.t, n_col);
        END IF;

        SELECT conname INTO pk_name
          FROM pg_constraint
         WHERE conrelid = r.t::regclass AND contype = 'p';
        IF pk_name IS DISTINCT FROM r.pk THEN
            bad := bad || format('%s PK=%s; ', r.t, coalesce(pk_name, '无'));
        END IF;
    END LOOP;

    IF bad <> '' THEN
        RAISE EXCEPTION 'FIN-DEAD-SHELLS 回滚自检失败：%', bad;
    END IF;

    RAISE NOTICE 'FIN-DEAD-SHELLS 回滚自检通过：6 张表 2 列 + 预期主键';
END
$fin_dead_shells_rb_verify$;

-- ============================================================
-- §附注（dev 契约形状增量，默认不执行）
--
-- dev 副本的这 6 张表另有 tenant_id 与 RLS。若在 dev 回滚后需要保持与
-- 20260908000016 / 20261110120000 一致的形状，按下列语句逐表执行
-- （<t> 替换为 finance_u 等表名）：
--
--   ALTER TABLE finance.<t>
--       ADD COLUMN IF NOT EXISTS tenant_id uuid
--       DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
--
--   ALTER TABLE finance.<t> ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE finance.<t> FORCE ROW LEVEL SECURITY;
--
--   CREATE POLICY rls_tenant_isolation ON finance.<t> FOR ALL TO PUBLIC
--       USING ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text)
--                 = '00000000-0000-0000-0000-000000000000'::text)
--              OR (current_setting('app.tenant_id'::text, true) IS NULL)
--              OR (current_setting('app.tenant_id'::text, true) = ''::text)
--              OR (tenant_id IS NULL)
--              OR ((tenant_id)::text
--                  = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))
--       WITH CHECK (同 USING 表达式);
--
--   CREATE POLICY tenant_isolation_<t> ON finance.<t> FOR ALL TO PUBLIC
--       USING ((current_setting('app.tenant_id'::text, true) IS NULL)
--              OR (current_setting('app.tenant_id'::text, true) = ''::text)
--              OR (current_setting('app.tenant_id'::text, true)
--                  = '00000000-0000-0000-0000-000000000000'::text)
--              OR (tenant_id IS NULL)
--              OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
--       WITH CHECK (同 USING 表达式);
--
-- 精确表达式以 2026-11-14 dev 只读快照为准（pg_policies.qual / with_check）。
-- ============================================================
