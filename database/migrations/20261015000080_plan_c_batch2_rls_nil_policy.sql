-- 方案C批2：非 txn crate 写路径补绑租户后，RLS policy 需兼容 pool 直连（未 SET 上下文 = nil UUID 字符串）
-- 背景：PG18 下未 SET 的 current_setting('app.tenant_id', true) 返回 '00000000-0000-0000-0000-000000000000'（nil 字符串，非 SQL NULL/空串）
-- 旧 policy（rls_tenant_isolation / tenant_isolation_*）未含 nil 分支 → pool 直连 INSERT/DELETE 绑非 NULL 租户被 RLS 拒绝（实测 500）
-- 方案C 语义：非 txn crate 隔离靠 handler 显式 WHERE/绑租户，RLS 为兜底；补 nil 分支使 pool 直连路径放行
-- 涉及表：批2 补绑的 unified-core（automation/files）+ communication（notifications/emails）+ finance（voucher 写路径）
-- 健壮化：policy 不存在（如 automation_* 未纳入 RLS 批）时跳过并 NOTICE
DO $$
DECLARE
  t text;
  pol text;
  pol_sql constant text := '((tenant_id)::text = NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text) = ''00000000-0000-0000-0000-000000000000''::text)';
BEGIN
  FOREACH t IN ARRAY ARRAY['public.automation_rules', 'public.automation_variables', 'public.automation_runs', 'public.core_files', 'public.core_file_permissions', 'public.core_notifications', 'public.core_notification_templates', 'public.core_emails', 'public.core_email_templates', 'finance.core_finance_vouchers', 'finance.core_finance_voucher_lines'] LOOP
    pol := 'tenant_isolation_' || split_part(t, '.', 2);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = split_part(t,'.',1) AND tablename = split_part(t,'.',2) AND policyname = pol) THEN
      RAISE NOTICE 'skip (no policy): %', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', pol, split_part(t,'.',1), split_part(t,'.',2), pol_sql, pol_sql);
    RAISE NOTICE 'nil branch added: %', t;
  END LOOP;
END $$;
