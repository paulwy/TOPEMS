-- 清理 crm schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS customer_tags_tenant_policy ON crm.customer_tags;
DROP POLICY IF EXISTS interactions_tenant_policy ON crm.interactions;
DROP POLICY IF EXISTS tags_tenant_policy ON crm.tags;
DROP POLICY IF EXISTS opportunities_tenant_policy ON crm.opportunities;
DROP POLICY IF EXISTS contracts_tenant_policy ON crm.contracts;
DROP POLICY IF EXISTS customers_tenant_policy ON crm.customers;
DROP POLICY IF EXISTS contacts_tenant_policy ON crm.contacts;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON crm.audit_logs;
