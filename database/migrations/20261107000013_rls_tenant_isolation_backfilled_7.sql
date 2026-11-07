-- 收紧“先回填后收紧”的 7 张表租户隔离（窗口第四段）
--
-- 范围（已定口径）：
--   public.audit_logs
--   crm.rfm_results
--   crm.crm_master_data_refs
--   crm.returns
--   crm.customers
--   ehs.qa_ehs_risks
--   ehs.qa_ehs_environment_monitors
--
-- 前置：窗口第二段已回填 317 行（rfm 300 + audit 17），第三段已清理 A 组
-- （refs/returns/risks/monitors），B 组 audit 孤儿已打 `_orphan` 标记但保留 tenant_id。
--
-- 策略与本批字典（20261107000008）完全一致：删除该表全部历史策略，只保留一条
--   rls_tenant_isolation =
--     COALESCE(current_setting('app.rls_system', true), '') = 'on'
--     OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
-- 不再有 NULL / 空串 / 全零 UUID 的隐式放行；GUC 缺失时 fail-closed。
--
-- 幂等：表不存在只提示不报错；策略先 DROP 再建；末尾断言每表恰好 1 条策略。
-- 不 CASCADE、不删数据、不改列。

DO $$
DECLARE
  t record;
  p record;
  qual text;
  n int;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('public', 'audit_logs'),
      ('crm',    'rfm_results'),
      ('crm',    'crm_master_data_refs'),
      ('crm',    'returns'),
      ('crm',    'customers'),
      ('ehs',    'qa_ehs_risks'),
      ('ehs',    'qa_ehs_environment_monitors')
    ) AS v(schema_name, table_name)
  LOOP
    IF to_regclass(format('%I.%I', t.schema_name, t.table_name)) IS NULL THEN
      RAISE NOTICE 'skip (table missing): %.%', t.schema_name, t.table_name;
      CONTINUE;
    END IF;

    -- 历史策略名在不同环境不一致（rls_tenant_isolation / tenant_isolation_* /
    -- qa_ehs_*_tenant_policy），全部 DROP，避免 permissive OR 叠加后重新出现放行分支。
    FOR p IN
      SELECT policyname
        FROM pg_policies
       WHERE schemaname = t.schema_name AND tablename = t.table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                     p.policyname, t.schema_name, t.table_name);
      RAISE NOTICE 'dropped policy % on %.%', p.policyname, t.schema_name, t.table_name;
    END LOOP;

    EXECUTE format($fmt$
      CREATE POLICY rls_tenant_isolation ON %I.%I
        FOR ALL
        USING (
          COALESCE(current_setting('app.rls_system', true), '') = 'on'
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        WITH CHECK (
          COALESCE(current_setting('app.rls_system', true), '') = 'on'
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
    $fmt$, t.schema_name, t.table_name);

    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                   t.schema_name, t.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
                   t.schema_name, t.table_name);
    RAISE NOTICE 'strict tenant isolation applied: %.%', t.schema_name, t.table_name;
  END LOOP;

  -- 断言：每表恰好一条策略，且表达式包含系统通道开关。
  FOR t IN
    SELECT * FROM (VALUES
      ('public', 'audit_logs'),
      ('crm',    'rfm_results'),
      ('crm',    'crm_master_data_refs'),
      ('crm',    'returns'),
      ('crm',    'customers'),
      ('ehs',    'qa_ehs_risks'),
      ('ehs',    'qa_ehs_environment_monitors')
    ) AS v(schema_name, table_name)
  LOOP
    IF to_regclass(format('%I.%I', t.schema_name, t.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT count(*) INTO n FROM pg_policies
     WHERE schemaname = t.schema_name AND tablename = t.table_name;
    IF n <> 1 THEN
      RAISE EXCEPTION '%.% 策略数量异常: %（期望 1 条）',
                      t.schema_name, t.table_name, n;
    END IF;

    SELECT pg_get_expr(polqual, polrelid) INTO qual
      FROM pg_policy
     WHERE polrelid = to_regclass(format('%I.%I', t.schema_name, t.table_name))
       AND polname = 'rls_tenant_isolation';
    IF qual IS NULL OR position('app.rls_system' in qual) = 0 THEN
      RAISE EXCEPTION '%.% 策略未包含系统通道断言: %',
                      t.schema_name, t.table_name, COALESCE(qual, '<null>');
    END IF;
  END LOOP;

  RAISE NOTICE 'backfilled-7 strict RLS assertions OK';
END $$;
