-- 清理 finance schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS expenses_tenant_policy ON finance.expenses;
DROP POLICY IF EXISTS payables_tenant_policy ON finance.payables;
DROP POLICY IF EXISTS receivables_tenant_policy ON finance.receivables;
