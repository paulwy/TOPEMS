-- 回滚：20261119200000_unblock_and_archive_legacy_tenant_tables
-- 依据 archive._drop_manifest / _rls_policy_snapshot / _fk_out_snapshot / _view_snapshot /
--      _column_defaults / _sequence_snapshot 重建 8 张表的结构、数据、RLS、默认值、序列、出向外键。
-- 额外显式动作：
--   1) 把 iam.core_tenant_plugins 外键从 public.core_tenants 改回 iam.core_tenants（目标表恢复之后）；
--   2) 恢复 finance.bootstrap_defaults 旧函数体（含 iam/flow/iam.core_tenant_users 分支）。
-- 仅重建表结构与数据（LIKE INCLUDING ALL），不恢复 GRANT/COMMENT。
-- 事务：由调用方以 psql --single-transaction 执行，本文件不含 BEGIN/COMMIT。
SET search_path = public;
SET statement_timeout = '300s';

DO $restore_tables$
DECLARE
  r record; polrec record; fkrec record; viewrec record; seqrec record; defrec record;
  role_list text; stmt text; con_def text;
  n_restored int := 0;
  n_expected int;
BEGIN
  IF to_regclass('archive._drop_manifest') IS NULL THEN
    RAISE EXCEPTION 'archive metadata missing: archive._drop_manifest';
  END IF;

  SELECT count(*) INTO n_expected FROM archive._drop_manifest
  WHERE migration_version = '20261119200000';

  IF n_expected = 0 THEN
    RAISE NOTICE 'rollback: no rows for 20261119200000; nothing to restore';
    RETURN;
  END IF;

  -- 先目标表、后引用方，避免恢复顺序造成的可读性问题（外键统一在表恢复后补）
  FOR r IN SELECT * FROM archive._drop_manifest
           WHERE migration_version = '20261119200000'
           ORDER BY CASE WHEN table_name LIKE '\_deprecated\_core\_tenant\_%'
                         THEN 2 ELSE 1 END, schema_name, table_name
  LOOP
    IF to_regclass(format('%I.%I', r.schema_name, r.table_name)) IS NULL THEN
      EXECUTE format('CREATE TABLE %I.%I (LIKE archive.%I INCLUDING ALL)',
                     r.schema_name, r.table_name, r.archive_table);
      EXECUTE format('INSERT INTO %I.%I SELECT * FROM archive.%I',
                     r.schema_name, r.table_name, r.archive_table);
      n_restored := n_restored + 1;
    END IF;
    IF r.relrowsecurity THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    END IF;
    IF r.relforcerowsecurity THEN
      EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    END IF;
  END LOOP;

  IF n_restored <> n_expected THEN
    RAISE EXCEPTION 'rollback assertion failed: restored %, expected %', n_restored, n_expected;
  END IF;

  FOR seqrec IN SELECT * FROM archive._sequence_snapshot
                WHERE migration_version = '20261119200000'
  LOOP
    IF to_regclass(format('%I.%I', seqrec.seq_schema, seqrec.seq_name)) IS NULL THEN
      EXECUTE format('CREATE SEQUENCE %I.%I AS %s INCREMENT BY %s MINVALUE %s MAXVALUE %s START WITH %s CACHE %s %s',
                     seqrec.seq_schema, seqrec.seq_name, seqrec.data_type,
                     seqrec.increment_by, seqrec.min_value, seqrec.max_value,
                     seqrec.start_value, seqrec.cache_size,
                     CASE WHEN seqrec.is_cycle THEN 'CYCLE' ELSE 'NO CYCLE' END);
      EXECUTE format('ALTER SEQUENCE %I.%I OWNED BY %I.%I.%I',
                     seqrec.seq_schema, seqrec.seq_name,
                     seqrec.owned_schema, seqrec.owned_table, seqrec.owned_column);
      IF seqrec.last_value IS NOT NULL THEN
        EXECUTE format('SELECT setval(%L, %s, true)', format('%I.%I', seqrec.seq_schema, seqrec.seq_name), seqrec.last_value);
      END IF;
    END IF;
  END LOOP;

  FOR defrec IN SELECT * FROM archive._column_defaults
                WHERE migration_version = '20261119200000'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT %s',
                   defrec.schema_name, defrec.table_name, defrec.column_name, defrec.default_expr);
  END LOOP;

  FOR polrec IN SELECT * FROM archive._rls_policy_snapshot
                WHERE migration_version = '20261119200000'
  LOOP
    role_list := CASE WHEN polrec.roles IS NULL OR cardinality(polrec.roles) = 0 THEN 'PUBLIC'
                      ELSE (SELECT string_agg(CASE WHEN x = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(x) END, ', ')
                            FROM unnest(polrec.roles) x) END;
    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                   polrec.polname, polrec.schema_name, polrec.table_name,
                   polrec.permissive, polrec.cmd, role_list);
    IF polrec.cmd IN ('ALL','SELECT','UPDATE','DELETE') THEN
      stmt := stmt || format(' USING (%s)', coalesce(polrec.qual, 'true'));
    END IF;
    IF polrec.cmd IN ('ALL','INSERT','UPDATE') THEN
      stmt := stmt || format(' WITH CHECK (%s)', coalesce(polrec.with_check, 'true'));
    END IF;
    BEGIN
      EXECUTE stmt;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;

  -- 出向外键（含 iam.core_user_roles -> iam.core_roles / iam.core_users，
  -- 以及 4 张 flow 副本 -> flow.core_tenants）
  IF to_regclass('archive._fk_out_snapshot') IS NOT NULL THEN
    FOR fkrec IN SELECT * FROM archive._fk_out_snapshot
                 WHERE migration_version = '20261119200000'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
                       fkrec.src_schema, fkrec.src_table, fkrec.conname, fkrec.condef);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END LOOP;
  END IF;

  FOR viewrec IN SELECT * FROM archive._view_snapshot
                 WHERE migration_version = '20261119200000'
  LOOP
    IF viewrec.object_kind = 'm' THEN
      EXECUTE format('CREATE MATERIALIZED VIEW %I.%I AS %s',
                     viewrec.view_schema, viewrec.view_name, viewrec.view_def);
    ELSE
      EXECUTE format('CREATE VIEW %I.%I AS %s',
                     viewrec.view_schema, viewrec.view_name, viewrec.view_def);
    END IF;
  END LOOP;

  -- 插件外键改回 iam.core_tenants（目标表已恢复）
  IF to_regclass('iam.core_tenant_plugins') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL THEN
    ALTER TABLE iam.core_tenant_plugins
      DROP CONSTRAINT IF EXISTS core_tenant_plugins_tenant_id_fkey;
    ALTER TABLE iam.core_tenant_plugins
      ADD CONSTRAINT core_tenant_plugins_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id) ON DELETE CASCADE;

    SELECT pg_get_constraintdef(oid) INTO con_def FROM pg_constraint
     WHERE conname = 'core_tenant_plugins_tenant_id_fkey'
       AND conrelid = to_regclass('iam.core_tenant_plugins');
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'core_tenant_plugins_tenant_id_fkey'
          AND conrelid = to_regclass('iam.core_tenant_plugins')
          AND confrelid = to_regclass('iam.core_tenants')) THEN
      RAISE EXCEPTION 'rollback assertion failed: plugin FK not back on iam.core_tenants (%)', con_def;
    END IF;
  END IF;

  RAISE NOTICE 'rollback complete: restored % legacy tenant tables', n_restored;
END
$restore_tables$;

-- 恢复 finance.bootstrap_defaults 旧函数体（与 20261108135000 定义一致）
CREATE OR REPLACE FUNCTION finance.bootstrap_defaults(p_tenant_id uuid DEFAULT NULL)
RETURNS int AS $$
DECLARE
    t uuid;
    cnt int := 0;
    v_year int := EXTRACT(YEAR FROM NOW())::int;
    v_month int := EXTRACT(MONTH FROM NOW())::int;
    v_period text := TO_CHAR(NOW(), 'YYYYMM');
    v_start timestamptz := date_trunc('month', NOW());
    v_end timestamptz := (date_trunc('month', NOW()) + interval '1 month') - interval '1 second';
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS bootstrap_seed_tenants (tenant_id uuid) ON COMMIT DROP;
    TRUNCATE bootstrap_seed_tenants;

    IF p_tenant_id IS NOT NULL THEN
        INSERT INTO bootstrap_seed_tenants VALUES (p_tenant_id);
    ELSE
        -- 动态收集既有租户（各来源守卫表存在，避免环境缺表导致失败）
        IF to_regclass('iam.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM iam.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('public.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM public.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('flow.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM flow.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('iam.core_tenant_users') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT DISTINCT tenant_id FROM iam.core_tenant_users WHERE tenant_id IS NOT NULL';
        END IF;
        IF to_regclass('finance.core_finance_accounts') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT DISTINCT tenant_id FROM finance.core_finance_accounts WHERE tenant_id IS NOT NULL';
        END IF;
    END IF;

    -- 仅保留 FK 目标 public.core_tenants 中存在的租户
    IF to_regclass('public.core_tenants') IS NOT NULL THEN
        DELETE FROM bootstrap_seed_tenants s
        WHERE NOT EXISTS (
            SELECT 1 FROM public.core_tenants t WHERE t.id = s.tenant_id
        );
    END IF;

    FOR t IN SELECT DISTINCT tenant_id FROM bootstrap_seed_tenants LOOP
        -- 企业会计准则常用科目（成组补齐；缺失才插，不覆盖既有名称/自定义科目）
        INSERT INTO finance.core_finance_accounts
            (tenant_id, code, name, account_type, level, currency, is_enabled, status)
        SELECT t, a.code, a.name, a.account_type::account_type, 1, 'CNY', TRUE, 'active'
        FROM (VALUES
            ('1001', '库存现金',     'asset'),
            ('1002', '银行存款',     'asset'),
            ('1122', '应收账款',     'asset'),
            ('1123', '预付账款',     'asset'),
            ('1403', '原材料',       'asset'),
            ('1405', '库存商品',     'asset'),
            ('1601', '固定资产',     'asset'),
            ('2202', '应付账款',     'liability'),
            ('2203', '预收账款',     'liability'),
            ('2211', '应付职工薪酬', 'liability'),
            ('2221', '应交税费',     'liability'),
            ('2241', '其他应付款',   'liability'),
            ('4001', '实收资本',     'equity'),
            ('4103', '本年利润',     'equity'),
            ('4104', '利润分配',     'equity'),
            ('5001', '生产成本',     'cost'),
            ('5101', '制造费用',     'cost'),
            ('6001', '主营业务收入', 'income'),
            ('6051', '其他业务收入', 'income'),
            ('6401', '主营业务成本', 'expense'),
            ('6402', '其他业务成本', 'expense'),
            ('6601', '销售费用',     'expense'),
            ('6602', '管理费用',     'expense'),
            ('6603', '财务费用',     'expense')
        ) AS a(code, name, account_type)
        ON CONFLICT (tenant_id, code) DO NOTHING;

        INSERT INTO finance.core_finance_accounts
            (tenant_id, code, name, account_type, level, parent_id, parent_code,
             currency, is_enabled, status)
        SELECT t, a.code, a.name, a.account_type::account_type, 2,
               (SELECT fa.id FROM finance.core_finance_accounts fa
                WHERE fa.tenant_id = t AND fa.code = a.parent_code),
               a.parent_code, 'CNY', TRUE, 'active'
        FROM (VALUES
            ('100201', '银行存款-基本户',      'asset',     '1002'),
            ('222101', '应交税费-个人所得税',  'liability', '2221'),
            ('224101', '其他应付款-社保',      'liability', '2241'),
            ('660101', '管理费用-工资',        'expense',   '6602')
        ) AS a(code, name, account_type, parent_code)
        ON CONFLICT (tenant_id, code) DO NOTHING;

        INSERT INTO finance.core_finance_periods
            (tenant_id, year, month, period_name, status, start_date, end_date)
        SELECT t, v_year, v_month, v_period, 'open'::period_status, v_start, v_end
        WHERE NOT EXISTS (
            SELECT 1 FROM finance.core_finance_periods p
            WHERE p.tenant_id = t AND p.period_name = v_period
        );

        cnt := cnt + 1;
    END LOOP;

    DROP TABLE bootstrap_seed_tenants;
    RETURN cnt;
END $$ LANGUAGE plpgsql;

-- 校验：函数已恢复 legacy 分支，目标表均已重建
DO $verify$
DECLARE
  src text;
  n_tables int;
BEGIN
  SELECT p.prosrc INTO src
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults';
  IF src IS NULL OR src NOT LIKE '%iam.core_tenants%' OR src NOT LIKE '%flow.core_tenants%' THEN
    RAISE EXCEPTION 'rollback assertion failed: bootstrap_defaults legacy branches not restored';
  END IF;

  SELECT count(*) INTO n_tables
  FROM (VALUES
    ('iam', 'core_tenants'), ('iam', 'core_users'), ('iam', 'core_user_roles'),
    ('flow', 'core_tenants'),
    ('flow', '_deprecated_core_tenant_modules'), ('flow', '_deprecated_core_tenant_settings'),
    ('flow', '_deprecated_core_tenant_usage'), ('flow', '_deprecated_core_tenant_users')
  ) AS x(sch, tbl)
  WHERE to_regclass(format('%I.%I', x.sch, x.tbl)) IS NOT NULL;
  IF n_tables <> 8 THEN
    RAISE EXCEPTION 'rollback assertion failed: expected 8 restored tables, found %', n_tables;
  END IF;
END
$verify$;
