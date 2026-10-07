-- 清理 erp schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS dict_items_tenant_policy ON erp.dict_items;
DROP POLICY IF EXISTS dict_types_tenant_policy ON erp.dict_types;
DROP POLICY IF EXISTS assets_tenant_policy ON erp.assets;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON erp.audit_logs;
DROP POLICY IF EXISTS customers_tenant_policy ON erp.customers;
DROP POLICY IF EXISTS bank_accounts_tenant_policy ON erp.bank_accounts;
DROP POLICY IF EXISTS expenses_tenant_policy ON erp.expenses;
DROP POLICY IF EXISTS financial_vouchers_tenant_policy ON erp.financial_vouchers;
DROP POLICY IF EXISTS materials_tenant_policy ON erp.materials;
DROP POLICY IF EXISTS company_relations_tenant_policy ON erp.company_relations;
DROP POLICY IF EXISTS consolidation_report_lines_tenant_policy ON erp.consolidation_report_lines;
DROP POLICY IF EXISTS consolidation_reports_tenant_policy ON erp.consolidation_reports;
DROP POLICY IF EXISTS sales_orders_tenant_policy ON erp.sales_orders;
DROP POLICY IF EXISTS suppliers_tenant_policy ON erp.suppliers;
DROP POLICY IF EXISTS opening_balances_tenant_policy ON erp.opening_balances;
DROP POLICY IF EXISTS consolidation_scope_companies_tenant_policy ON erp.consolidation_scope_companies;
DROP POLICY IF EXISTS consolidation_scopes_tenant_policy ON erp.consolidation_scopes;
DROP POLICY IF EXISTS elimination_rules_tenant_policy ON erp.elimination_rules;
DROP POLICY IF EXISTS fixed_assets_tenant_policy ON erp.fixed_assets;
DROP POLICY IF EXISTS internal_transactions_tenant_policy ON erp.internal_transactions;
DROP POLICY IF EXISTS receivables_tenant_policy ON erp.receivables;
DROP POLICY IF EXISTS payables_tenant_policy ON erp.payables;
