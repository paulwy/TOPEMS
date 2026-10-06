-- 清理 srm schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS purchase_orders_tenant_policy ON srm.purchase_orders;
DROP POLICY IF EXISTS supplier_categories_tenant_policy ON srm.supplier_categories;
DROP POLICY IF EXISTS supplier_contracts_tenant_policy ON srm.supplier_contracts;
DROP POLICY IF EXISTS supplier_evaluations_tenant_policy ON srm.supplier_evaluations;
DROP POLICY IF EXISTS supplier_products_tenant_policy ON srm.supplier_products;
DROP POLICY IF EXISTS suppliers_tenant_policy ON srm.suppliers;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON srm.audit_logs;
DROP POLICY IF EXISTS contract_terms_tenant_policy ON srm.contract_terms;
