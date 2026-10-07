-- 清理 scm schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS supplier_evaluations_tenant_policy ON scm.supplier_evaluations;
DROP POLICY IF EXISTS suppliers_tenant_policy ON scm.suppliers;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON scm.audit_logs;
DROP POLICY IF EXISTS purchase_items_tenant_policy ON scm.purchase_items;
DROP POLICY IF EXISTS supplier_delivery_appointments_tenant_policy ON scm.supplier_delivery_appointments;
DROP POLICY IF EXISTS purchase_orders_tenant_policy ON scm.purchase_orders;
