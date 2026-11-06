-- 收紧 public 字典表租户隔离（B.10.12）
--
-- 背景：历史策略 tenant_isolation_core_dict_* / rls_tenant_isolation 把
--   app.tenant_id 为 NULL / 空串 / 全零 UUID 都视为“全放行”，导致两种越权：
--   1) 连接上没有任何租户 GUC 时（脚本/直连池/旧 handler）可读全表；
--   2) 中间件把超管/服务身份固定为 nil 租户时，普通写路径也可能落 tenant_id=0。
--
-- 收紧后只保留两条件：
--   - 系统通道：显式 app.rls_system='on'（由 tenant_middleware 的超管/服务身份分支、
--     seed_dict_data、以及运维脚本显式设置；事务级 GUC，不跨请求泄漏）；
--   - 租户通道：tenant_id = current_setting('app.tenant_id', true)::uuid。
-- 不再有 NULL / 空 / 0 的隐式放行；GUC 缺失时比较结果为 NULL → 不放行（fail-closed）。
--
-- 前置约定：public.core_dict_types / core_dict_items 的全部行都归属具体租户
-- （本地与 prod 实测均为 00000000-0000-0000-0000-000000000001），不存在依赖
-- “tenant_id IS NULL 才可见”的共享行。
--
-- 幂等：仅操作 public 两张字典表；先清空该表全部历史策略，再建唯一策略；
-- 表不存在时跳过并提示，不 CASCADE、不删数据。

DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['core_dict_types', 'core_dict_items'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'skip (table missing): public.%', t;
      CONTINUE;
    END IF;

    -- 历史策略名在不同环境不一致（本地 tenant_isolation_core_dict_*、prod rls_tenant_isolation）；
    -- 全部 DROP，避免多条 permissive 策略按 OR 叠加后重新出现放行分支。
    FOR p IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      RAISE NOTICE 'dropped policy % on public.%', p.policyname, t;
    END LOOP;

    EXECUTE format(
      $fmt$
      CREATE POLICY rls_tenant_isolation ON public.%I
        FOR ALL
        USING (
          COALESCE(current_setting('app.rls_system', true), '') = 'on'
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        WITH CHECK (
          COALESCE(current_setting('app.rls_system', true), '') = 'on'
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
      $fmt$,
      t
    );

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'strict tenant isolation applied: public.%', t;
  END LOOP;
END $$;

-- 断言：两张权威表各只有一条策略，且策略文本必须包含系统通道开关。
DO $$
DECLARE
  t text;
  n int;
  qual text;
BEGIN
  FOREACH t IN ARRAY ARRAY['core_dict_types', 'core_dict_items'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    SELECT count(*) INTO n
      FROM pg_policies WHERE schemaname = 'public' AND tablename = t;
    IF n <> 1 THEN
      RAISE EXCEPTION 'public.% 策略数量异常: %（期望 1 条）', t, n;
    END IF;
    SELECT pg_get_expr(polqual, polrelid) INTO qual
      FROM pg_policy
      WHERE polrelid = to_regclass('public.' || t)
        AND polname = 'rls_tenant_isolation';
    IF qual IS NULL OR position('app.rls_system' in qual) = 0 THEN
      RAISE EXCEPTION 'public.% 策略未包含系统通道断言: %', t, COALESCE(qual, '<null>');
    END IF;
  END LOOP;
  RAISE NOTICE 'dict strict RLS assertions OK';
END $$;
