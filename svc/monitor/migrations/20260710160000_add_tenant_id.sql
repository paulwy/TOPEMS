BEGIN;

ALTER TABLE IF EXISTS monitor.alerts
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE IF EXISTS monitor.alert_rules
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE IF EXISTS monitor.alert_templates
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE IF EXISTS monitor.suppression_rules
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE IF EXISTS monitor.api_performance
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE monitor.alerts
SET tenant_id = (SELECT COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID) FROM monitor.alerts LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE monitor.alert_rules
SET tenant_id = (SELECT COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID) FROM monitor.alert_rules LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE monitor.alert_templates
SET tenant_id = (SELECT COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID) FROM monitor.alert_templates LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE monitor.suppression_rules
SET tenant_id = (SELECT COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID) FROM monitor.suppression_rules LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE monitor.api_performance
SET tenant_id = (SELECT COALESCE(tenant_id, '00000000-0000-0000-0000-000000000001'::UUID) FROM monitor.api_performance LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE IF EXISTS monitor.alerts
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE IF EXISTS monitor.alert_rules
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE IF EXISTS monitor.alert_templates
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE IF EXISTS monitor.suppression_rules
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE IF EXISTS monitor.api_performance
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_tenant_id ON monitor.alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant_id ON monitor.alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alert_templates_tenant_id ON monitor.alert_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppression_rules_tenant_id ON monitor.suppression_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_performance_tenant_id ON monitor.api_performance(tenant_id);

ALTER TABLE monitor.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor.alert_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor.suppression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor.api_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS alerts_tenant_policy ON monitor.alerts
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS alert_rules_tenant_policy ON monitor.alert_rules
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS alert_templates_tenant_policy ON monitor.alert_templates
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS suppression_rules_tenant_policy ON monitor.suppression_rules
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS api_performance_tenant_policy ON monitor.api_performance
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

COMMIT;