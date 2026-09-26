-- RLS 策略统一重建（幂等）
-- 背景：V521 批量重建 414 策略后，新增表/迁移建表产生的策略回落为旧式写法——
--   current_setting('app.tenant_id') 单参（GUC 未设置报错）+ 无 service nil 豁免分支，
--   导致 rls_middleware 服务无 header 时 500、service token(nil) 调用数据不可见。
-- 本脚本将全库含 app.tenant_id 的策略统一为新式：
--   (current_setting('app.tenant_id', true) IS NULL) OR (= '') OR (tenant_id IS NULL)
--   OR (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
-- tenant_id 为 text/varchar 列的表按文本比较（无 ::uuid cast）。
-- 用法：psql "postgres://topems:...@host:port/topems" -f scripts/db/rls-policy-unify.sql
-- 幂等：DROP POLICY IF EXISTS + CREATE POLICY，同一表达式重复执行结果不变。
DO $$
DECLARE
  r RECORD;
  col_type text;
  expr text;
  perm text;
  cmd text;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, c.relname AS tbl, p.polname, p.polcmd, p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid) AS q
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pg_get_expr(p.polqual, p.polrelid) LIKE '%app.tenant_id%'
      AND n.nspname NOT LIKE 'pg\_%'
  LOOP
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = r.sch AND table_name = r.tbl AND column_name = 'tenant_id'
    LIMIT 1;

    IF col_type = 'uuid' THEN
      expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
           || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
           || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
           || ' OR (tenant_id IS NULL)'
           || ' OR ((tenant_id)::text = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';
    ELSE
      -- text / character varying 列：文本比较，无 ::text cast（自身即文本）
      expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
           || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
           || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
           || ' OR (tenant_id IS NULL)'
           || ' OR (tenant_id = NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))';
    END IF;

    perm := CASE WHEN r.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
    cmd := CASE r.polcmd
             WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
             WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
             ELSE 'ALL' END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.polname, r.sch, r.tbl);
    EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s USING (%s) WITH CHECK (%s)',
                   r.polname, r.sch, r.tbl, perm, cmd, expr, expr);
    RAISE NOTICE 'rebuilt %I.%I policy %I (%s)', r.sch, r.tbl, r.polname, cmd;
  END LOOP;
END $$;
