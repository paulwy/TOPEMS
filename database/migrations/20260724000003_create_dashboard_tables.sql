-- Dashboard data refresh tracking
CREATE TABLE IF NOT EXISTS core_dashboard_refresh_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(64) NOT NULL,
    tenant_id UUID NOT NULL,
    refresh_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    duration_ms INTEGER,
    row_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_refresh_module ON core_dashboard_refresh_log(module);
CREATE INDEX IF NOT EXISTS idx_dashboard_refresh_tenant ON core_dashboard_refresh_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_refresh_time ON core_dashboard_refresh_log(refresh_time);

-- EHS Dashboard Data (materialized view pattern)
CREATE TABLE IF NOT EXISTS ehs_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_accidents INTEGER DEFAULT 0,
    pending_hazards INTEGER DEFAULT 0,
    training_rate NUMERIC(5,2) DEFAULT 0,
    drill_count INTEGER DEFAULT 0,
    -- JSONB for flexible chart data
    accident_trend JSONB DEFAULT '[]',
    hazard_types JSONB DEFAULT '[]',
    training_trend JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, snapshot_date)
);

-- LIMS Dashboard
CREATE TABLE IF NOT EXISTS lims_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pending_samples INTEGER DEFAULT 0,
    in_progress_tasks INTEGER DEFAULT 0,
    instrument_utilization NUMERIC(5,2) DEFAULT 0,
    pass_rate NUMERIC(5,2) DEFAULT 0,
    sample_trend JSONB DEFAULT '[]',
    task_status JSONB DEFAULT '[]',
    instrument_status JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, snapshot_date)
);

-- CRM Dashboard
CREATE TABLE IF NOT EXISTS crm_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_opportunities INTEGER DEFAULT 0,
    win_amount NUMERIC(15,2) DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    avg_cycle_days NUMERIC(6,1) DEFAULT 0,
    stage_distribution JSONB DEFAULT '[]',
    trend_data JSONB DEFAULT '[]',
    industry_distribution JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, snapshot_date)
);

-- WMS Dashboard
CREATE TABLE IF NOT EXISTS wms_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_inventory INTEGER DEFAULT 0,
    pending_inbound INTEGER DEFAULT 0,
    pending_outbound INTEGER DEFAULT 0,
    space_utilization NUMERIC(5,2) DEFAULT 0,
    inbound_trend JSONB DEFAULT '[]',
    category_distribution JSONB DEFAULT '[]',
    outbound_trend JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, snapshot_date)
);

-- HRM Dashboard
CREATE TABLE IF NOT EXISTS hrm_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_employees INTEGER DEFAULT 0,
    new_hires INTEGER DEFAULT 0,
    on_leave INTEGER DEFAULT 0,
    avg_salary NUMERIC(10,2) DEFAULT 0,
    department_distribution JSONB DEFAULT '[]',
    hire_trend JSONB DEFAULT '[]',
    education_distribution JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, snapshot_date)
);

-- PDM Dashboard
CREATE TABLE IF NOT EXISTS pdm_dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active_projects INTEGER DEFAULT 0,
    pending_documents INTEGER DEFAULT 0,
    bom_changes INTEGER DEFAULT 0,
    completion_rate NUMERIC(5,2) DEFAULT 0,
    project_distribution JSONB DEFAULT '[]',
    document_types JSONB DEFAULT '[]',
    change_trend JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, snapshot_date)
);