BEGIN;

DROP TABLE IF EXISTS analytics_dashboard_shares;
DROP TABLE IF EXISTS analytics_drilldown_paths;
DROP TABLE IF EXISTS analytics_drilldown_history;
DROP TABLE IF EXISTS analytics_self_service_reports;
DROP TABLE IF EXISTS analytics_row_level_permissions;

CREATE TABLE IF NOT EXISTS analytics_dashboard_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
    shared_with TEXT[] DEFAULT '{}',
    permission VARCHAR(16) NOT NULL DEFAULT 'view',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_self_service_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    datasource_id UUID NOT NULL,
    fields JSONB DEFAULT '[]',
    filters JSONB,
    config JSONB,
    owner_id VARCHAR(64) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_drilldown_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    datasource_id UUID NOT NULL,
    levels JSONB DEFAULT '[]',
    measures JSONB DEFAULT '[]',
    owner_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_drilldown_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL,
    path_id UUID NOT NULL REFERENCES analytics_drilldown_paths(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL,
    from_level INTEGER NOT NULL DEFAULT 0,
    to_level INTEGER NOT NULL DEFAULT 0,
    drill_dimension VARCHAR(64),
    drill_value VARCHAR(256),
    filters JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_row_level_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    datasource_id UUID NOT NULL,
    user_id VARCHAR(64),
    role_id VARCHAR(64),
    filter_expression JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shares_dashboard ON analytics_dashboard_shares(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_self_service_reports_owner ON analytics_self_service_reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_drilldown_paths_datasource ON analytics_drilldown_paths(datasource_id);
CREATE INDEX IF NOT EXISTS idx_drilldown_history_user ON analytics_drilldown_history(user_id);
CREATE INDEX IF NOT EXISTS idx_row_level_permissions_datasource ON analytics_row_level_permissions(datasource_id);

COMMIT;
