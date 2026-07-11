-- TOPEMS Integration Service - Add tenant_id for multi-tenant support

-- ============================================
-- 1. Conversion Rules
-- ============================================
ALTER TABLE IF EXISTS conversion_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_conversion_rules_tenant_isolation" ON conversion_rules
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 2. Conversion Executions
-- ============================================
ALTER TABLE IF EXISTS conversion_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_conversion_executions_tenant_isolation" ON conversion_executions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);