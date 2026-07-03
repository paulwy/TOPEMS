BEGIN;

CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    layout JSONB,
    owner_id VARCHAR(64) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    auto_refresh_enabled BOOLEAN DEFAULT FALSE,
    auto_refresh_interval INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID,
    name VARCHAR(128) NOT NULL,
    widget_type VARCHAR(32) NOT NULL,
    config JSONB,
    position JSONB,
    datasource_id UUID,
    query_config JSONB,
    cache_ttl_seconds INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_datasources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'inactive',
    host VARCHAR(256),
    database VARCHAR(128),
    port INTEGER,
    username VARCHAR(128),
    password VARCHAR(256),
    connection_string TEXT,
    last_sync TIMESTAMP,
    data_volume BIGINT DEFAULT 0,
    sync_frequency VARCHAR(32),
    description TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    connection_config JSONB,
    query_template TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_dashboard_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    layout JSONB,
    preview_image TEXT,
    category VARCHAR(64),
    tags JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_dashboard_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    permission_level VARCHAR(16) NOT NULL DEFAULT 'view',
    shared_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_self_service_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    query_config JSONB,
    chart_config JSONB,
    filters JSONB,
    columns JSONB,
    owner_id VARCHAR(64) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_drilldown_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL,
    path_name VARCHAR(64) NOT NULL,
    target_dimension VARCHAR(128),
    filter_config JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_drilldown_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL,
    widget_id UUID NOT NULL,
    drilldown_path VARCHAR(256),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_row_level_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64),
    role_id VARCHAR(64),
    datasource_id UUID,
    filter_expression JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_sync_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datasource_id UUID NOT NULL,
    sync_type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_comparison_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    comparison_type VARCHAR(32) NOT NULL,
    dimension_a VARCHAR(128) NOT NULL,
    dimension_b VARCHAR(128) NOT NULL,
    indicators JSONB DEFAULT '[]',
    filters JSONB,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    last_run_at TIMESTAMP,
    created_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_comparison_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_id UUID NOT NULL REFERENCES analytics_comparison_analyses(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'success',
    data JSONB DEFAULT '[]',
    summary JSONB,
    generated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    report_type VARCHAR(32) NOT NULL,
    template_id UUID,
    parameters JSONB,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    last_run_at TIMESTAMP,
    owner_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    report_type VARCHAR(32) NOT NULL,
    content JSONB,
    parameters JSONB,
    category VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES analytics_reports(id) ON DELETE CASCADE,
    schedule_type VARCHAR(32) NOT NULL,
    cron_expression VARCHAR(128),
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    schedule_id UUID,
    status VARCHAR(16) NOT NULL DEFAULT 'running',
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    output_path TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_report_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES analytics_reports(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    delivery_method VARCHAR(32) NOT NULL,
    schedule_type VARCHAR(32),
    format VARCHAR(16) DEFAULT 'pdf',
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_owner_id ON analytics_dashboards(owner_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_is_public ON analytics_dashboards(is_public);
CREATE INDEX IF NOT EXISTS idx_analytics_widgets_dashboard_id ON analytics_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_analytics_datasources_source_type ON analytics_datasources(source_type);
CREATE INDEX IF NOT EXISTS idx_analytics_datasources_status ON analytics_datasources(status);
CREATE INDEX IF NOT EXISTS idx_analytics_comparison_status ON analytics_comparison_analyses(status);
CREATE INDEX IF NOT EXISTS idx_analytics_comparison_type ON analytics_comparison_analyses(comparison_type);
CREATE INDEX IF NOT EXISTS idx_analytics_comparison_results_comparison_id ON analytics_comparison_results(comparison_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_status ON analytics_reports(status);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_owner_id ON analytics_reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_analytics_report_templates_is_active ON analytics_report_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_report_schedules_status ON analytics_report_schedules(status);
CREATE INDEX IF NOT EXISTS idx_analytics_report_subscriptions_user_id ON analytics_report_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_report_subscriptions_status ON analytics_report_subscriptions(status);

COMMIT;
