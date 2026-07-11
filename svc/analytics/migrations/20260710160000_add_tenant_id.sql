-- TOPEMS Analytics Service - Add tenant_id for multi-tenant support

-- ============================================
-- 1. Analytics Dashboards
-- ============================================
ALTER TABLE IF EXISTS analytics_dashboards ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_dashboards SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_dashboards ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_tenant_id ON analytics_dashboards(tenant_id);

-- ============================================
-- 2. Analytics Widgets
-- ============================================
ALTER TABLE IF EXISTS analytics_widgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_widgets aw SET tenant_id = (SELECT ad.tenant_id FROM analytics_dashboards ad WHERE ad.id = aw.dashboard_id) WHERE aw.dashboard_id IS NOT NULL;
UPDATE analytics_widgets SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_widgets ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_widgets_tenant_id ON analytics_widgets(tenant_id);

-- ============================================
-- 3. Analytics Datasources
-- ============================================
ALTER TABLE IF EXISTS analytics_datasources ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_datasources SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_datasources ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_datasources_tenant_id ON analytics_datasources(tenant_id);

-- ============================================
-- 4. Analytics Dashboard Templates
-- ============================================
ALTER TABLE IF EXISTS analytics_dashboard_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_dashboard_templates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_dashboard_templates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_templates_tenant_id ON analytics_dashboard_templates(tenant_id);

-- ============================================
-- 5. Analytics Dashboard Shares
-- ============================================
ALTER TABLE IF EXISTS analytics_dashboard_shares ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_dashboard_shares ads SET tenant_id = (SELECT ad.tenant_id FROM analytics_dashboards ad WHERE ad.id = ads.dashboard_id);
ALTER TABLE analytics_dashboard_shares ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_shares_tenant_id ON analytics_dashboard_shares(tenant_id);

-- ============================================
-- 6. Analytics Self Service Reports
-- ============================================
ALTER TABLE IF EXISTS analytics_self_service_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_self_service_reports SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_self_service_reports ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_self_service_reports_tenant_id ON analytics_self_service_reports(tenant_id);

-- ============================================
-- 7. Analytics Drilldown Paths
-- ============================================
ALTER TABLE IF EXISTS analytics_drilldown_paths ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_drilldown_paths adp SET tenant_id = (SELECT aw.tenant_id FROM analytics_widgets aw WHERE aw.id = adp.widget_id);
ALTER TABLE analytics_drilldown_paths ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_drilldown_paths_tenant_id ON analytics_drilldown_paths(tenant_id);

-- ============================================
-- 8. Analytics Drilldown History
-- ============================================
ALTER TABLE IF EXISTS analytics_drilldown_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_drilldown_history adh SET tenant_id = (SELECT aw.tenant_id FROM analytics_widgets aw WHERE aw.id = adh.widget_id);
ALTER TABLE analytics_drilldown_history ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_drilldown_history_tenant_id ON analytics_drilldown_history(tenant_id);

-- ============================================
-- 9. Analytics Row Level Permissions
-- ============================================
ALTER TABLE IF EXISTS analytics_row_level_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_row_level_permissions arlp SET tenant_id = (SELECT ad.tenant_id FROM analytics_datasources ad WHERE ad.id = arlp.datasource_id);
UPDATE analytics_row_level_permissions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_row_level_permissions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_row_level_permissions_tenant_id ON analytics_row_level_permissions(tenant_id);

-- ============================================
-- 10. Analytics Sync Records
-- ============================================
ALTER TABLE IF EXISTS analytics_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_sync_records asr SET tenant_id = (SELECT ad.tenant_id FROM analytics_datasources ad WHERE ad.id = asr.datasource_id);
ALTER TABLE analytics_sync_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_sync_records_tenant_id ON analytics_sync_records(tenant_id);

-- ============================================
-- 11. Analytics Comparison Analyses
-- ============================================
ALTER TABLE IF EXISTS analytics_comparison_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_comparison_analyses SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_comparison_analyses ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_comparison_analyses_tenant_id ON analytics_comparison_analyses(tenant_id);

-- ============================================
-- 12. Analytics Comparison Results
-- ============================================
ALTER TABLE IF EXISTS analytics_comparison_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_comparison_results acr SET tenant_id = (SELECT aca.tenant_id FROM analytics_comparison_analyses aca WHERE aca.id = acr.comparison_id);
ALTER TABLE analytics_comparison_results ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_comparison_results_tenant_id ON analytics_comparison_results(tenant_id);

-- ============================================
-- 13. Analytics Reports
-- ============================================
ALTER TABLE IF EXISTS analytics_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_reports SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_reports ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_reports_tenant_id ON analytics_reports(tenant_id);

-- ============================================
-- 14. Analytics Report Templates
-- ============================================
ALTER TABLE IF EXISTS analytics_report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_report_templates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE analytics_report_templates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_report_templates_tenant_id ON analytics_report_templates(tenant_id);

-- ============================================
-- 15. Analytics Report Schedules
-- ============================================
ALTER TABLE IF EXISTS analytics_report_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_report_schedules ars SET tenant_id = (SELECT ar.tenant_id FROM analytics_reports ar WHERE ar.id = ars.report_id);
ALTER TABLE analytics_report_schedules ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_report_schedules_tenant_id ON analytics_report_schedules(tenant_id);

-- ============================================
-- 16. Analytics Report Executions
-- ============================================
ALTER TABLE IF EXISTS analytics_report_executions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_report_executions arex SET tenant_id = (SELECT ar.tenant_id FROM analytics_reports ar WHERE ar.id = arex.report_id);
ALTER TABLE analytics_report_executions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_report_executions_tenant_id ON analytics_report_executions(tenant_id);

-- ============================================
-- 17. Analytics Report Subscriptions
-- ============================================
ALTER TABLE IF EXISTS analytics_report_subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE analytics_report_subscriptions ars SET tenant_id = (SELECT ar.tenant_id FROM analytics_reports ar WHERE ar.id = ars.report_id);
ALTER TABLE analytics_report_subscriptions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_report_subscriptions_tenant_id ON analytics_report_subscriptions(tenant_id);

-- ============================================
-- Enable Row Level Security for all tables
-- ============================================
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_datasources ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboard_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_self_service_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_drilldown_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_drilldown_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_row_level_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_comparison_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_comparison_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_report_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create tenant isolation policies
-- ============================================
CREATE POLICY "analytics_dashboards_tenant_isolation" ON analytics_dashboards
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_widgets_tenant_isolation" ON analytics_widgets
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_datasources_tenant_isolation" ON analytics_datasources
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_dashboard_templates_tenant_isolation" ON analytics_dashboard_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_dashboard_shares_tenant_isolation" ON analytics_dashboard_shares
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_self_service_reports_tenant_isolation" ON analytics_self_service_reports
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_drilldown_paths_tenant_isolation" ON analytics_drilldown_paths
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_drilldown_history_tenant_isolation" ON analytics_drilldown_history
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_row_level_permissions_tenant_isolation" ON analytics_row_level_permissions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_sync_records_tenant_isolation" ON analytics_sync_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_comparison_analyses_tenant_isolation" ON analytics_comparison_analyses
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_comparison_results_tenant_isolation" ON analytics_comparison_results
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_reports_tenant_isolation" ON analytics_reports
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_report_templates_tenant_isolation" ON analytics_report_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_report_schedules_tenant_isolation" ON analytics_report_schedules
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_report_executions_tenant_isolation" ON analytics_report_executions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "analytics_report_subscriptions_tenant_isolation" ON analytics_report_subscriptions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);