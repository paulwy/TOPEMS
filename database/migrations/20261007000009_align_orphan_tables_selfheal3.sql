-- =============================================================================
-- 由 scripts/gen-orphan-tables-migration.py 生成：5432 独有表（运行时自建）系统性补链
-- 独有表 263 张 | 序列 0 | PK/UNIQUE 285 |
-- FK（目标表∈独有表） 35 | POLICY 53 | RLS 99
-- =============================================================================

-- 0) schema 兜底（5433 可能缺独有表所在 schema）

CREATE SCHEMA IF NOT EXISTS "bi";
CREATE SCHEMA IF NOT EXISTS "core";
CREATE SCHEMA IF NOT EXISTS "crm";
CREATE SCHEMA IF NOT EXISTS "finance";
CREATE SCHEMA IF NOT EXISTS "flow";
CREATE SCHEMA IF NOT EXISTS "gis";
CREATE SCHEMA IF NOT EXISTS "hrm";
CREATE SCHEMA IF NOT EXISTS "mes";
CREATE SCHEMA IF NOT EXISTS "portal";
CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "qms";
CREATE SCHEMA IF NOT EXISTS "rs";
CREATE SCHEMA IF NOT EXISTS "scm";
CREATE SCHEMA IF NOT EXISTS "srm";
CREATE SCHEMA IF NOT EXISTS "wms";

-- 1) 序列（独有表 DEFAULT nextval 依赖）

-- 2) 建表（含内联 CHECK；无 FK——FK 在步骤 3 后补）

CREATE TABLE IF NOT EXISTS bi.analytics_comparison_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    comparison_type character varying(32) NOT NULL,
    dimension_a character varying(128) NOT NULL,
    dimension_b character varying(128) NOT NULL,
    indicators jsonb DEFAULT '[]'::jsonb,
    filters jsonb,
    status character varying(16) DEFAULT 'draft'::character varying NOT NULL,
    last_run_at timestamp with time zone,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_comparison_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comparison_id uuid NOT NULL,
    status character varying(16) DEFAULT 'success'::character varying NOT NULL,
    data jsonb DEFAULT '[]'::jsonb,
    summary jsonb,
    generated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_dashboard_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid NOT NULL,
    shared_with text[] DEFAULT '{}'::text[],
    permission character varying(16) DEFAULT 'view'::character varying NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_dashboard_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    layout jsonb,
    preview_image character varying(256),
    category character varying(64),
    tags text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    layout jsonb,
    owner_id character varying(64) NOT NULL,
    is_public boolean DEFAULT false,
    auto_refresh_enabled boolean DEFAULT false,
    auto_refresh_interval integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS bi.analytics_datasets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    sql_query text NOT NULL,
    fields jsonb DEFAULT '[]'::jsonb,
    filters jsonb,
    config jsonb,
    status character varying(16) DEFAULT 'draft'::character varying NOT NULL,
    is_public boolean DEFAULT false,
    published_at timestamp with time zone,
    last_refreshed_at timestamp with time zone,
    owner_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    source_type character varying(50),
    source_id uuid,
    created_by uuid
);

CREATE TABLE IF NOT EXISTS bi.analytics_datasources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    source_type character varying(32) NOT NULL,
    status character varying(16) DEFAULT 'inactive'::character varying NOT NULL,
    host character varying(256),
    database character varying(128),
    port integer,
    username character varying(128),
    password character varying(256),
    connection_string text,
    last_sync timestamp with time zone,
    data_volume bigint DEFAULT 0,
    sync_frequency character varying(32),
    description text,
    is_enabled boolean DEFAULT true,
    connection_config jsonb,
    query_template text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS bi.analytics_drilldown_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(64) NOT NULL,
    path_id uuid NOT NULL,
    action character varying(32) NOT NULL,
    from_level integer DEFAULT 0 NOT NULL,
    to_level integer DEFAULT 0 NOT NULL,
    drill_dimension character varying(64),
    drill_value character varying(256),
    filters jsonb,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_drilldown_paths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    levels jsonb DEFAULT '[]'::jsonb,
    measures jsonb DEFAULT '[]'::jsonb,
    owner_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_row_level_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    table_name character varying(128) NOT NULL,
    rule_type character varying(32) NOT NULL,
    condition jsonb DEFAULT '{}'::jsonb,
    role_ids text[] DEFAULT '{}'::text[],
    user_ids text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_by character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_self_service_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    fields jsonb DEFAULT '[]'::jsonb,
    filters jsonb,
    config jsonb,
    owner_id character varying(64) NOT NULL,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_source_id uuid,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    sync_type character varying(64) NOT NULL,
    records_count bigint,
    affected_records bigint,
    error_message text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.analytics_widgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid,
    name character varying(128) NOT NULL,
    widget_type character varying(32) NOT NULL,
    config jsonb,
    "position" jsonb,
    datasource_id uuid,
    query_config jsonb,
    cache_ttl_seconds integer DEFAULT 60,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS bi.report_execution_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid NOT NULL,
    schedule_name character varying(256) NOT NULL,
    status character varying(32) NOT NULL,
    output_path text,
    error_message text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bi.report_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    user_id character varying(64) NOT NULL,
    email text,
    frequency character varying(32) NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id character varying(128) NOT NULL,
    title character varying(200) DEFAULT '新对话'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS crm.crm_master_data_refs (
    master_data_id character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    domain character varying(32) NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    source_service character varying(64) NOT NULL,
    local_entity_type character varying(64),
    local_entity_id uuid,
    payload_snapshot jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance.finance_compliance_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    severity character varying(20) NOT NULL,
    category character varying(50) NOT NULL,
    control_point_code character varying(50) NOT NULL,
    description text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    impact_assessment text NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_fraud_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    rule_type character varying(50) NOT NULL,
    condition text NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_fraud_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    transaction_id character varying(100) NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    triggered_rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    risk_level character varying(20) NOT NULL,
    recommendation character varying(20) NOT NULL,
    scored_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_review_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100) NOT NULL,
    rule_id uuid NOT NULL,
    passed boolean DEFAULT true NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    reviewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewer character varying(100) NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_review_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    regulation character varying(50) NOT NULL,
    category character varying(100) NOT NULL,
    severity character varying(20) DEFAULT 'low'::character varying NOT NULL,
    action character varying(20) DEFAULT 'approve'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_review_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    assigned_to character varying(100),
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_risk_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    indicator_id uuid NOT NULL,
    level character varying(20) NOT NULL,
    message text NOT NULL,
    entity character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged boolean DEFAULT false NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v54_risk_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    current_value double precision DEFAULT 0 NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    unit character varying(20) DEFAULT ''::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    description character varying(500) NOT NULL,
    quantity double precision DEFAULT 0 NOT NULL,
    unit_price double precision DEFAULT 0 NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    tax_rate double precision DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    number character varying(100) NOT NULL,
    vendor character varying(255) NOT NULL,
    invoice_date timestamp with time zone NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    tax_amount double precision DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    purchase_order_id character varying(100),
    recognized_at timestamp with time zone,
    validated_at timestamp with time zone,
    posted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    from_account character varying(100) NOT NULL,
    to_account character varying(100) NOT NULL,
    method character varying(30) DEFAULT 'bank_transfer'::character varying NOT NULL,
    reference character varying(255) NOT NULL,
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_payment_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    request_id uuid NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    transaction_ref character varying(255),
    fee double precision DEFAULT 0 NOT NULL,
    processed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_reconciliation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bank_transaction_id character varying(100) NOT NULL,
    system_record_id character varying(100) NOT NULL,
    match_status character varying(30) DEFAULT 'unmatched'::character varying NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    difference_amount double precision DEFAULT 0 NOT NULL,
    notes text,
    approved boolean DEFAULT false NOT NULL,
    disputed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v55_reconciliation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    match_type character varying(30) DEFAULT 'exact'::character varying NOT NULL,
    tolerance double precision DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_brackets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    rate_id uuid NOT NULL,
    bracket_order integer NOT NULL,
    threshold_from double precision DEFAULT 0 NOT NULL,
    threshold_to double precision,
    rate double precision DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    form_type character varying(30) DEFAULT 'vat'::character varying NOT NULL,
    jurisdiction character varying(100) DEFAULT 'CN'::character varying NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    total_tax_amount double precision DEFAULT 0 NOT NULL,
    filed_at timestamp with time zone,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    form_id uuid NOT NULL,
    line_no integer NOT NULL,
    description character varying(500) NOT NULL,
    taxable_amount double precision DEFAULT 0 NOT NULL,
    tax_rate double precision DEFAULT 0 NOT NULL,
    tax_amount double precision DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity character varying(255) NOT NULL,
    period character varying(50) NOT NULL,
    strategy character varying(50) DEFAULT 'legal_optimization'::character varying NOT NULL,
    projected_savings double precision DEFAULT 0 NOT NULL,
    risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    jurisdiction character varying(100) DEFAULT 'CN'::character varying NOT NULL,
    rate_type character varying(30) DEFAULT 'vat'::character varying NOT NULL,
    rate double precision DEFAULT 0 NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    effective_to timestamp with time zone,
    description text,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v56_tax_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    description text NOT NULL,
    estimated_savings double precision DEFAULT 0 NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    action_items text[],
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_analysis_dimensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    hierarchy text[],
    filters jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_analysis_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    dimensions text[] NOT NULL,
    measures text[] NOT NULL,
    data jsonb,
    aggregations jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_forecast_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    model_type character varying(50) DEFAULT 'linear_regression'::character varying NOT NULL,
    target_metric character varying(100) NOT NULL,
    features text[],
    accuracy double precision,
    trained_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_generated_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    template_id uuid,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    data jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    format character varying(20) DEFAULT 'json'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    insight_type character varying(30) DEFAULT 'trend'::character varying NOT NULL,
    description text NOT NULL,
    confidence double precision,
    data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v57_report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    report_type character varying(50) DEFAULT 'balance_sheet'::character varying NOT NULL,
    layout character varying(20) DEFAULT 'json'::character varying NOT NULL,
    parameters jsonb,
    schedule character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_cash_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    pool_type character varying(20) DEFAULT 'physical'::character varying NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    entities text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_forecast_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    date date NOT NULL,
    inflow double precision DEFAULT 0 NOT NULL,
    outflow double precision DEFAULT 0 NOT NULL,
    net double precision DEFAULT 0 NOT NULL,
    closing_balance double precision DEFAULT 0 NOT NULL,
    confidence_interval jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_forecast_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    scenario_type character varying(30) DEFAULT 'medium_term'::character varying NOT NULL,
    horizon_days integer DEFAULT 90 NOT NULL,
    assumptions jsonb,
    confidence double precision DEFAULT 0.5 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_liquidity_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    min_balance double precision DEFAULT 0 NOT NULL,
    max_balance double precision DEFAULT 0 NOT NULL,
    target_balance double precision DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_optimization_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    recommended_actions jsonb,
    projected_savings double precision DEFAULT 0 NOT NULL,
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_pool_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    pool_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    percentage double precision DEFAULT 0 NOT NULL,
    allocated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v58_pool_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    from_pool uuid NOT NULL,
    to_pool uuid NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    reference character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_credit_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    score integer DEFAULT 300 NOT NULL,
    grade character varying(5) DEFAULT 'D'::character varying NOT NULL,
    factors jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_device_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    device_id character varying(255) NOT NULL,
    fingerprint character varying(255) NOT NULL,
    trust_score double precision DEFAULT 1.0 NOT NULL,
    last_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_history jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_fraud_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    transaction_id character varying(100) NOT NULL,
    risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    action character varying(20) DEFAULT 'approve'::character varying NOT NULL,
    reason text NOT NULL,
    signals jsonb,
    decided_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_fraud_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    signal_type character varying(30) NOT NULL,
    threshold double precision DEFAULT 0.5 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_fraud_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    signal_type character varying(30) NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    metadata jsonb,
    detected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_scoring_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(50) NOT NULL,
    features jsonb,
    weights jsonb,
    accuracy double precision DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_stress_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    entity_id character varying(100) NOT NULL,
    impact_value double precision DEFAULT 0 NOT NULL,
    capital_adequacy double precision DEFAULT 0 NOT NULL,
    liquidity_ratio double precision DEFAULT 0 NOT NULL,
    pass_fail boolean DEFAULT true NOT NULL,
    details jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v59_stress_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    scenario_type character varying(30) DEFAULT 'market'::character varying NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    assumptions jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_alert_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    channel_type character varying(30) DEFAULT 'email'::character varying NOT NULL,
    config jsonb,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    metric_name character varying(100) NOT NULL,
    condition character varying(20) DEFAULT 'above'::character varying NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    metric_name character varying(100) NOT NULL,
    current_value double precision DEFAULT 0 NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_decision_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    recommended_action character varying(500) NOT NULL,
    alternatives jsonb,
    expected_impact jsonb,
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    decided_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_decision_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    scenario_type character varying(30) DEFAULT 'investment'::character varying NOT NULL,
    parameters jsonb,
    objectives jsonb,
    constraints jsonb,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_schedule_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    task_id uuid NOT NULL,
    depends_on uuid NOT NULL,
    condition jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_schedule_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    task_id uuid NOT NULL,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_ms double precision,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    output jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS finance.finance_v60_schedule_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    task_type character varying(30) DEFAULT 'recurring'::character varying NOT NULL,
    cron_expression character varying(100),
    action jsonb,
    priority integer DEFAULT 5 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_doc_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    folder_id uuid,
    template_id uuid,
    content text,
    content_type character varying(50) DEFAULT 'html'::character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    tags text[],
    description text,
    file_name character varying(200),
    file_path character varying(500),
    file_size bigint,
    mime_type character varying(100),
    published_at timestamp with time zone,
    published_by character varying(100),
    archived_at timestamp with time zone,
    archived_by character varying(100),
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_doc_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    parent_id uuid,
    description text,
    sort_order integer DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_doc_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100),
    description text,
    content text NOT NULL,
    content_type character varying(50) DEFAULT 'html'::character varying,
    fields jsonb DEFAULT '[]'::jsonb,
    is_enabled boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_file_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    parent_id uuid,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_file_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(256) NOT NULL,
    original_name character varying(256),
    path character varying(512) NOT NULL,
    size bigint NOT NULL,
    mime_type character varying(128),
    extension character varying(32),
    folder_id uuid,
    uploader_id uuid NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flow.core_flow_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    code character varying(64),
    parent_id uuid,
    sort_order integer DEFAULT 0,
    status character varying(32) DEFAULT 'active'::character varying,
    description text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS flow.core_flow_delegates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delegator_id uuid NOT NULL,
    attorney_id uuid NOT NULL,
    workflow_id uuid,
    scope character varying(16) DEFAULT 'all'::character varying,
    start_date date,
    end_date date,
    reason text,
    status character varying(16) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS flow.core_flow_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    workflow_id uuid,
    node_id character varying(64),
    rule_type character varying(32) DEFAULT 'condition'::character varying,
    condition jsonb DEFAULT '{}'::jsonb NOT NULL,
    action jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority integer DEFAULT 0,
    status character varying(16) DEFAULT 'active'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS flow.core_flow_variable_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variable_id uuid,
    var_key character varying(128) NOT NULL,
    var_value jsonb NOT NULL,
    value_type character varying(32),
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flow.core_flow_variables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope character varying(16) NOT NULL,
    instance_id uuid,
    task_id uuid,
    workflow_id uuid,
    var_key character varying(128) NOT NULL,
    var_value jsonb DEFAULT 'null'::jsonb NOT NULL,
    value_type character varying(32) DEFAULT 'string'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS flow.core_master_data_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    master_data_id text NOT NULL,
    tenant_id uuid NOT NULL,
    action text NOT NULL,
    source_service text NOT NULL,
    operator text,
    changed_fields jsonb,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_master_data_event_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    action text NOT NULL,
    master_data_id text NOT NULL,
    payload jsonb NOT NULL,
    published_at timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_master_data_refs (
    master_data_id text NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_service text NOT NULL,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS flow.core_mdm_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    master_data_id text NOT NULL,
    domain text NOT NULL,
    action text NOT NULL,
    requested_by text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_comment text,
    payload jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_mdm_reconciliation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    master_data_id text NOT NULL,
    issue_type text NOT NULL,
    description text,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_menu_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(100) NOT NULL,
    icon character varying(200),
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_menus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    group_id uuid NOT NULL,
    parent_id uuid,
    name character varying(200) NOT NULL,
    code character varying(100) NOT NULL,
    path character varying(500),
    icon character varying(200),
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    permissions jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_migration_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_name character varying(128) NOT NULL,
    version character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    applied_at timestamp without time zone,
    duration_ms bigint,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_operation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    user_name character varying(128) NOT NULL,
    module character varying(64) NOT NULL,
    operation character varying(32) NOT NULL,
    resource_type character varying(64) NOT NULL,
    resource_id character varying(128),
    description text,
    request_data jsonb,
    response_status integer,
    ip_address character varying(128),
    user_agent text,
    trace_id character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_tenant_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    module_code character varying(64) NOT NULL,
    module_name character varying(128),
    tier character varying(32) DEFAULT 'basic'::character varying,
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    setting_key character varying(128) NOT NULL,
    setting_value text,
    is_public boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_tenant_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    users_count integer DEFAULT 0,
    storage_used_mb bigint DEFAULT 0,
    api_calls_count bigint DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    base_cost numeric(10,2) DEFAULT 0,
    overage_cost numeric(10,2) DEFAULT 0,
    plugin_cost numeric(10,2) DEFAULT 0,
    total_cost numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    code character varying(64) NOT NULL,
    tenant_type character varying(32) DEFAULT 'shared'::character varying,
    plan character varying(32) DEFAULT 'basic'::character varying,
    license_type character varying(32) DEFAULT 'subscription'::character varying,
    license_expires_at timestamp with time zone,
    database_host character varying(256),
    database_port integer DEFAULT 5432,
    database_name character varying(64),
    quota_users integer DEFAULT 20,
    quota_storage_gb bigint DEFAULT 10,
    quota_api_calls bigint DEFAULT 100000,
    quota_plugins text[],
    features jsonb DEFAULT '{}'::jsonb,
    status character varying(32) DEFAULT 'trial'::character varying,
    trial_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    activated_at timestamp with time zone,
    suspended_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_workflow_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    title character varying(256) NOT NULL,
    initiator_id uuid NOT NULL,
    current_node_id character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    variables jsonb,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.core_workflow_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    node_id character varying(64) NOT NULL,
    assignee_id uuid NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    priority integer DEFAULT 0,
    due_time timestamp with time zone,
    claimed_at timestamp with time zone,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS gis.geofences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    chat_id uuid,
    creator_id uuid,
    shape_type character varying(50) NOT NULL,
    coordinates jsonb NOT NULL,
    radius double precision,
    event_types jsonb DEFAULT '["enter"]'::jsonb,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    trigger_cooldown integer DEFAULT 300,
    notify_channels jsonb DEFAULT '["notification"]'::jsonb,
    notify_users jsonb DEFAULT '[]'::jsonb,
    gis_fence_id uuid,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS gis.track_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    track_id uuid,
    "position" point,
    altitude numeric(10,2),
    speed numeric(10,2),
    heading numeric(10,2),
    accuracy numeric(10,2),
    battery_level numeric(5,2),
    "timestamp" timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS hrm.hrm_master_data_refs (
    master_data_id character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    domain character varying(32) NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    source_service character varying(64) NOT NULL,
    local_entity_type character varying(64),
    local_entity_id uuid,
    payload_snapshot jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mes.material_return_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    unit character varying(32) NOT NULL,
    quantity numeric(12,4) NOT NULL,
    reason text,
    batch_no character varying(64),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.material_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    warehouse_id uuid,
    operator_id uuid,
    return_time timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.core_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    views bigint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.core_guide_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    duration character varying(50) DEFAULT '5min'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.core_guide_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    completed_lessons uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.core_guides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    duration character varying(50) DEFAULT '10min'::character varying NOT NULL,
    lessons_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.federation_compensation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying(64) NOT NULL,
    step_id character varying(64) NOT NULL,
    compensation_action character varying(32) NOT NULL,
    status character varying(32) NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.federation_execution_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_id character varying(64) NOT NULL,
    subgraph_id character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    duration_ms integer DEFAULT 0 NOT NULL,
    result jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.federation_query_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operations jsonb DEFAULT '[]'::jsonb NOT NULL,
    merge_strategy character varying(64) NOT NULL,
    estimated_total_cost double precision DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.federation_subgraphs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    url character varying(512) NOT NULL,
    types jsonb DEFAULT '[]'::jsonb NOT NULL,
    entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    health_status character varying(32) DEFAULT 'unknown'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.federation_transaction_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying(64) NOT NULL,
    action character varying(32) NOT NULL,
    target_service character varying(128) NOT NULL,
    payload jsonb,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.federation_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participants jsonb DEFAULT '[]'::jsonb NOT NULL,
    state character varying(32) DEFAULT 'init'::character varying NOT NULL,
    timeout_ms integer DEFAULT 30000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.gateway_degradation_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level character varying(32) NOT NULL,
    latency_threshold_ms bigint DEFAULT 1000 NOT NULL,
    error_rate_threshold double precision DEFAULT 0.1 NOT NULL,
    cpu_threshold double precision DEFAULT 0.85 NOT NULL,
    fallback_strategy character varying(64) DEFAULT 'cache'::character varying NOT NULL,
    notification_channels jsonb DEFAULT '["alert"]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.gateway_health_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(256) NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    error_rate double precision DEFAULT 0.0 NOT NULL,
    cpu_usage double precision DEFAULT 0.0 NOT NULL,
    memory_usage double precision DEFAULT 0.0 NOT NULL,
    request_count bigint DEFAULT 0 NOT NULL,
    success_count bigint DEFAULT 0 NOT NULL,
    failure_count bigint DEFAULT 0 NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.gateway_protocols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    max_connections integer DEFAULT 1000 NOT NULL,
    timeout_ms bigint DEFAULT 30000 NOT NULL,
    rate_limit_per_sec integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.gateway_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(256) NOT NULL,
    protocol character varying(32) NOT NULL,
    path_pattern character varying(512) NOT NULL,
    target_service character varying(256) NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    load_balancing_strategy character varying(32) DEFAULT 'round_robin'::character varying NOT NULL,
    circuit_breaker_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_breaking_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_type character varying(64) NOT NULL,
    path character varying(512) NOT NULL,
    description text NOT NULL,
    affected_queries jsonb DEFAULT '[]'::jsonb NOT NULL,
    severity character varying(16) NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_execution_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    total_queries bigint DEFAULT 0 NOT NULL,
    successful_queries bigint DEFAULT 0 NOT NULL,
    failed_queries bigint DEFAULT 0 NOT NULL,
    avg_complexity double precision DEFAULT 0 NOT NULL,
    avg_timeout_ms double precision DEFAULT 0 NOT NULL,
    avg_parallelism double precision DEFAULT 0 NOT NULL,
    degraded_queries bigint DEFAULT 0 NOT NULL,
    total_execution_time_ms bigint DEFAULT 0 NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_execution_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    complexity_score double precision DEFAULT 0 NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    timeout_ms bigint DEFAULT 5000 NOT NULL,
    parallelism_level integer DEFAULT 1 NOT NULL,
    degradation_applied boolean DEFAULT false NOT NULL,
    strategy character varying(32) DEFAULT 'balanced'::character varying NOT NULL,
    field_count integer DEFAULT 0 NOT NULL,
    query_depth integer DEFAULT 0 NOT NULL,
    connection_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_optimization_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_query text NOT NULL,
    optimized_query text NOT NULL,
    original_cost double precision DEFAULT 0 NOT NULL,
    optimized_cost double precision DEFAULT 0 NOT NULL,
    estimated_savings double precision DEFAULT 0 NOT NULL,
    cache_key character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_schema_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(32) NOT NULL,
    schema_definition text NOT NULL,
    change_type character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    change_description text,
    approved_by character varying(128),
    is_current boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_stream_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(128) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    sequence bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_stream_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscriber_id character varying(128) NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(256) NOT NULL,
    topic character varying(256) NOT NULL,
    state character varying(32) DEFAULT 'active'::character varying NOT NULL,
    buffer_size integer DEFAULT 1000 NOT NULL,
    batch_interval_ms bigint DEFAULT 100 NOT NULL,
    max_subscribers integer DEFAULT 100 NOT NULL,
    filter_expression text,
    heartbeat_interval_ms bigint DEFAULT 30000 NOT NULL,
    reconnect_max_attempts integer DEFAULT 5 NOT NULL,
    subscriber_count integer DEFAULT 0 NOT NULL,
    event_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_event_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    optimization_id character varying(128) NOT NULL,
    suggestion_type character varying(64) NOT NULL,
    description text NOT NULL,
    current_cost double precision DEFAULT 0 NOT NULL,
    suggested_cost double precision DEFAULT 0 NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    applicable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_version_negotiations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requested_version character varying(32) NOT NULL,
    matched_version character varying(32),
    fallback_used boolean DEFAULT false NOT NULL,
    strategy_used character varying(64) NOT NULL,
    negotiated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_affinities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(128) NOT NULL,
    entity_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_name character varying(128) NOT NULL,
    conflicting_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    resolution character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_routing_table (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(128) NOT NULL,
    intent character varying(32) NOT NULL,
    target_service character varying(128) NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    reason text,
    alternatives jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_stitch_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id character varying(64) NOT NULL,
    action character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_stitch_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subgraphs jsonb DEFAULT '[]'::jsonb NOT NULL,
    merged_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    conflicts jsonb DEFAULT '[]'::jsonb NOT NULL,
    resolution_strategy character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_accel_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    locations jsonb DEFAULT '[]'::jsonb NOT NULL,
    routing_strategy character varying(32) DEFAULT 'nearest'::character varying NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    compression_enabled boolean DEFAULT true NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_acceleration_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_acceleration_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    strategy character varying(64) NOT NULL,
    original_time_ms bigint DEFAULT 0 NOT NULL,
    optimized_time_ms bigint DEFAULT 0 NOT NULL,
    speedup_factor double precision DEFAULT 1.0 NOT NULL,
    steps_saved integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_access_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(128),
    actor_id character varying(128),
    resource character varying(256),
    action character varying(128),
    decision character varying(16) DEFAULT 'allow'::character varying NOT NULL,
    reason text,
    matched_policy_id character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_access_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type character varying(128) NOT NULL,
    resource_pattern character varying(256) NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    effect character varying(16) DEFAULT 'allow'::character varying NOT NULL,
    conditions jsonb,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_aggregation_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic character varying(128) NOT NULL,
    window_size_ms bigint DEFAULT 60000 NOT NULL,
    aggregation_type character varying(32) DEFAULT 'count'::character varying NOT NULL,
    group_by jsonb,
    filter_expr text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_aggregation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id character varying(64) NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    groups jsonb DEFAULT '[]'::jsonb NOT NULL,
    "values" jsonb DEFAULT '{}'::jsonb NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_alert_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name character varying(128) NOT NULL,
    warning_threshold double precision NOT NULL,
    critical_threshold double precision NOT NULL,
    comparison_operator character varying(16) DEFAULT 'gt'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_anomalies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    anomaly_type character varying(32) NOT NULL,
    severity character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    metric_name character varying(128) NOT NULL,
    expected_value double precision DEFAULT 0 NOT NULL,
    actual_value double precision DEFAULT 0 NOT NULL,
    deviation double precision DEFAULT 0 NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_api_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    released_at timestamp with time zone DEFAULT now() NOT NULL,
    deprecated_at timestamp with time zone,
    sunset_at timestamp with time zone,
    changelog text,
    breaking_changes jsonb DEFAULT '[]'::jsonb NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_audit_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id character varying(128),
    actor_type character varying(32) DEFAULT 'user'::character varying NOT NULL,
    action character varying(128) NOT NULL,
    resource_type character varying(128) NOT NULL,
    resource_id character varying(128),
    old_value jsonb,
    new_value jsonb,
    ip_address character varying(64),
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id character varying(128),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_audit_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    format character varying(16) DEFAULT 'json'::character varying NOT NULL,
    filter jsonb,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_auth_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    federation_id character varying(64) NOT NULL,
    required_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    token_issuer character varying(256) NOT NULL,
    audience character varying(256) NOT NULL,
    token_validity bigint DEFAULT 3600 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_backpressure_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    max_queue_size integer DEFAULT 10000 NOT NULL,
    high_watermark double precision DEFAULT 0.8 NOT NULL,
    low_watermark double precision DEFAULT 0.2 NOT NULL,
    overflow_strategy character varying(32) DEFAULT 'drop'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_backpressure_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    queue_depth integer DEFAULT 0 NOT NULL,
    utilization double precision DEFAULT 0 NOT NULL,
    dropped_count bigint DEFAULT 0 NOT NULL,
    last_drop_reason character varying(128),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_cache_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    value jsonb NOT NULL,
    ttl bigint DEFAULT 3600000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT now() NOT NULL,
    access_count bigint DEFAULT 0 NOT NULL,
    last_accessed timestamp with time zone,
    cache_value jsonb NOT NULL,
    version_id character varying(64) NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    tags jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_cache_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    scope character varying(32) DEFAULT 'query'::character varying NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    invalidation_strategy character varying(32) DEFAULT 'time_based'::character varying NOT NULL,
    max_size bigint DEFAULT 10000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_cache_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description character varying(256),
    entry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_canary_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(64) NOT NULL,
    percentage integer DEFAULT 0 NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_canary_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id character varying(64) NOT NULL,
    total_requests bigint DEFAULT 0 NOT NULL,
    canary_requests bigint DEFAULT 0 NOT NULL,
    baseline_requests bigint DEFAULT 0 NOT NULL,
    error_rate_canary double precision DEFAULT 0 NOT NULL,
    error_rate_baseline double precision DEFAULT 0 NOT NULL,
    winner character varying(32),
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_compatibility_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    min_compatibility_level character varying(32) DEFAULT 'partial'::character varying NOT NULL,
    require_migration_path boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_compatibility_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_version character varying(64) NOT NULL,
    to_version character varying(64) NOT NULL,
    breaking_changes jsonb DEFAULT '[]'::jsonb NOT NULL,
    deprecated_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    compatible boolean DEFAULT true NOT NULL,
    migration_path jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_compilation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_type character varying(64) NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_compiled_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_query text NOT NULL,
    optimized_query text NOT NULL,
    complexity_score double precision DEFAULT 0 NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    optimizations_applied jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_config_diffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id character varying(64) NOT NULL,
    old_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by character varying(128),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_config_environments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(32) NOT NULL,
    base_url character varying(512),
    variables jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_protected boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_consistency_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    model character varying(32) NOT NULL,
    violations jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'passed'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_dead_letter_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_message_id character varying(64) NOT NULL,
    topic character varying(128) NOT NULL,
    message_value jsonb NOT NULL,
    error_reason text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    last_retry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_dedup_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id character varying(64) NOT NULL,
    original_id character varying(64) NOT NULL,
    duplicate_of character varying(64),
    action character varying(32) DEFAULT 'pass'::character varying NOT NULL,
    merged_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_dedup_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    dedup_key character varying(256) NOT NULL,
    window_ms bigint DEFAULT 5000 NOT NULL,
    strategy character varying(32) DEFAULT 'first_writer'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_deployment_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deployment_id character varying(64) NOT NULL,
    step_type character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    message text,
    duration_ms bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(64) NOT NULL,
    environment character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    strategy character varying(32) DEFAULT 'rolling'::character varying NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_detection_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name character varying(128) NOT NULL,
    algorithm character varying(32) NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    sensitivity double precision DEFAULT 0.05 NOT NULL,
    trained_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_distributed_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_plan jsonb DEFAULT '{}'::jsonb NOT NULL,
    routing_map jsonb DEFAULT '{}'::jsonb NOT NULL,
    consistency_requirement character varying(32) DEFAULT 'eventual'::character varying NOT NULL,
    timeout_ms bigint DEFAULT 30000 NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data jsonb NOT NULL,
    location character varying(64) NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_id character varying(64) NOT NULL,
    location character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'deploying'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    deployed_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key character varying(512) NOT NULL,
    cache_value jsonb NOT NULL,
    location character varying(32) NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    replicated_at timestamp with time zone DEFAULT now() NOT NULL,
    sync_status character varying(32) DEFAULT 'synced'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_functions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    location character varying(64) DEFAULT 'apac'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    timeout_ms integer DEFAULT 5000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_replication (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_location character varying(32) NOT NULL,
    target_location character varying(32) NOT NULL,
    cache_key character varying(512) NOT NULL,
    replicated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_execution_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    parallelism integer DEFAULT 1 NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_execution_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id character varying(64) NOT NULL,
    service character varying(128) NOT NULL,
    operation character varying(128) NOT NULL,
    depends_on jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    result jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_federated_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(32) NOT NULL,
    claims jsonb DEFAULT '{}'::jsonb NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    authenticated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_gateway_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    version character varying(64) NOT NULL,
    environment character varying(32) NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_healing_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger character varying(32) NOT NULL,
    action_type character varying(32) NOT NULL,
    target character varying(256) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    executed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_health_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(128) NOT NULL,
    interval_ms bigint DEFAULT 10000 NOT NULL,
    timeout_ms bigint DEFAULT 5000 NOT NULL,
    healthy_threshold integer DEFAULT 2 NOT NULL,
    unhealthy_threshold integer DEFAULT 3 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_identity_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text,
    risk_threshold double precision DEFAULT 0.7 NOT NULL,
    require_mfa boolean DEFAULT false NOT NULL,
    allowed_locations jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_devices jsonb DEFAULT '[]'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_invalidation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key character varying(512) NOT NULL,
    reason character varying(256),
    triggered_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_latency_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(64),
    total_ms integer DEFAULT 0 NOT NULL,
    render_ms integer DEFAULT 0 NOT NULL,
    network_ms integer DEFAULT 0 NOT NULL,
    processing_ms integer DEFAULT 0 NOT NULL,
    location character varying(64),
    cache_hit boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_masking_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_path character varying(256) NOT NULL,
    mask_type character varying(32) NOT NULL,
    pattern character varying(256),
    applied_to jsonb DEFAULT '[]'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    metric_type character varying(32) NOT NULL,
    value double precision DEFAULT 0 NOT NULL,
    labels jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_orchestration_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_id character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    timeout_ms bigint DEFAULT 30000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_persisted_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_name character varying(128),
    query_text text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    access_count bigint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_persisted_query_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    version integer NOT NULL,
    query_text text NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_plan_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id character varying(64) NOT NULL,
    service character varying(128) NOT NULL,
    field_path text NOT NULL,
    depends_on jsonb,
    estimated_time_ms bigint DEFAULT 0 NOT NULL,
    strategy character varying(64) DEFAULT 'sequential'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_push_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_window_ms integer DEFAULT 100 NOT NULL,
    total_pushes bigint DEFAULT 0 NOT NULL,
    batched_pushes bigint DEFAULT 0 NOT NULL,
    messages_pushed bigint DEFAULT 0 NOT NULL,
    avg_batch_size double precision DEFAULT 0 NOT NULL,
    backpressure_events bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_queue_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(32) DEFAULT 'memory'::character varying NOT NULL,
    max_size integer DEFAULT 10000 NOT NULL,
    batch_size integer DEFAULT 100 NOT NULL,
    dead_letter_queue character varying(128),
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_queue_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic character varying(128) NOT NULL,
    message_key character varying(256),
    message_value jsonb NOT NULL,
    headers jsonb,
    provider character varying(32) DEFAULT 'memory'::character varying NOT NULL,
    consumed boolean DEFAULT false NOT NULL,
    consumed_at timestamp with time zone,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_recovery_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(128) NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    estimated_duration_ms bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_replay_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id character varying(64) NOT NULL,
    from_sequence bigint DEFAULT 0 NOT NULL,
    to_sequence bigint,
    batch_size integer DEFAULT 100 NOT NULL,
    replay_type character varying(32) DEFAULT 'full'::character varying NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_replay_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(64) NOT NULL,
    events_replayed bigint DEFAULT 0 NOT NULL,
    events_skipped bigint DEFAULT 0 NOT NULL,
    duration_ms bigint DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_resolver_timings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trace_id character varying(64) NOT NULL,
    path character varying(256) NOT NULL,
    duration_ms bigint DEFAULT 0 NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_rollback_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_id character varying(64) NOT NULL,
    action character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    executed_at timestamp with time zone,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_rollback_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    trigger character varying(32) DEFAULT 'manual'::character varying NOT NULL,
    condition jsonb,
    rollback_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_rollbacks integer DEFAULT 5 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_route_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern character varying(256) NOT NULL,
    target_service character varying(128) NOT NULL,
    condition jsonb,
    priority integer DEFAULT 0 NOT NULL,
    weight integer DEFAULT 100 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_routing_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(128),
    matched_rule_id character varying(64),
    target_service character varying(128) NOT NULL,
    reason character varying(256),
    confidence double precision DEFAULT 0 NOT NULL,
    routed_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id character varying(64) NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_routing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    condition jsonb DEFAULT '{}'::jsonb NOT NULL,
    target_service character varying(128) NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    weight integer DEFAULT 100 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(32) NOT NULL,
    client_ip character varying(64),
    query_hash character varying(128),
    action character varying(64),
    details jsonb,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_security_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_type character varying(32) NOT NULL,
    severity character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    source_ip character varying(64),
    user_agent text,
    payload jsonb,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_security_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    authentication_type character varying(32) DEFAULT 'jwt'::character varying NOT NULL,
    token_validity_sec integer DEFAULT 3600 NOT NULL,
    rate_limit_per_min integer DEFAULT 100 NOT NULL,
    ip_whitelist jsonb DEFAULT '[]'::jsonb NOT NULL,
    require_https boolean DEFAULT true NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rate_limit_per_sec integer DEFAULT 100 NOT NULL,
    max_query_depth integer DEFAULT 10 NOT NULL,
    max_complexity integer DEFAULT 1000 NOT NULL,
    require_auth boolean DEFAULT true NOT NULL,
    allowed_operations jsonb DEFAULT '["query", "mutation", "subscription"]'::jsonb NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_service_descriptors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(64) NOT NULL,
    endpoint character varying(512) NOT NULL,
    capabilities jsonb DEFAULT '[]'::jsonb NOT NULL,
    health_status character varying(32) DEFAULT 'healthy'::character varying NOT NULL,
    last_heartbeat timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_service_heartbeats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_service_loads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cpu_usage double precision DEFAULT 0 NOT NULL,
    memory_usage double precision DEFAULT 0 NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    active_queries integer DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_stream_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    event_type character varying(64) NOT NULL,
    payload jsonb NOT NULL,
    sequence bigint NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic character varying(128) NOT NULL,
    stream_type character varying(32) DEFAULT 'event_stream'::character varying NOT NULL,
    filter jsonb,
    batch_size integer DEFAULT 100 NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_sub_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_id character varying(64) NOT NULL,
    service character varying(128) NOT NULL,
    query text NOT NULL,
    variables jsonb,
    depends_on jsonb DEFAULT '[]'::jsonb NOT NULL,
    result jsonb,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying(128) NOT NULL,
    channels jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'connected'::character varying NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_subscription_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    subscriber_count integer DEFAULT 0 NOT NULL,
    message_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_subscription_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id character varying(64) NOT NULL,
    event_type character varying(64) NOT NULL,
    payload jsonb NOT NULL,
    sequence bigint NOT NULL,
    delivered_at timestamp with time zone,
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_subscription_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscriber_id character varying(128) NOT NULL,
    topic character varying(128) NOT NULL,
    filter jsonb,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity timestamp with time zone DEFAULT now() NOT NULL,
    delivered_count bigint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_traces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(128),
    duration_ms bigint DEFAULT 0 NOT NULL,
    cache_hits integer DEFAULT 0 NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    traced_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_trust_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identity character varying(128) NOT NULL,
    decision character varying(32) NOT NULL,
    risk_score double precision DEFAULT 0 NOT NULL,
    reason text,
    context jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_version_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_version character varying(64) NOT NULL,
    server_version character varying(64) NOT NULL,
    compatibility character varying(32) DEFAULT 'full'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_version_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    versions jsonb DEFAULT '{}'::jsonb NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_api_version_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    deprecated_since date,
    sunset_date date,
    message text,
    migration_guide text,
    changes text,
    is_current boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_doc_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    folder_id uuid,
    template_id uuid,
    content text,
    content_type character varying(50) DEFAULT 'html'::character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    tags text[],
    description text,
    file_name character varying(200),
    file_path character varying(500),
    file_size bigint,
    mime_type character varying(100),
    published_at timestamp with time zone,
    published_by character varying(100),
    archived_at timestamp with time zone,
    archived_by character varying(100),
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_doc_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    parent_id uuid,
    description text,
    sort_order integer DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_doc_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100),
    description text,
    content text NOT NULL,
    content_type character varying(50) DEFAULT 'html'::character varying,
    fields jsonb DEFAULT '[]'::jsonb,
    is_enabled boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    views bigint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_file_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_guide_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    duration character varying(50) DEFAULT '5min'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_guide_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    completed_lessons uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_guides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    duration character varying(50) DEFAULT '10min'::character varying NOT NULL,
    lessons_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_master_data_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    master_data_id text NOT NULL,
    tenant_id uuid NOT NULL,
    action text NOT NULL,
    source_service text NOT NULL,
    operator text,
    changed_fields jsonb,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_master_data_event_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    action text NOT NULL,
    master_data_id text NOT NULL,
    payload jsonb NOT NULL,
    published_at timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_master_data_refs (
    master_data_id text NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_service text NOT NULL,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.core_mdm_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    master_data_id text NOT NULL,
    domain text NOT NULL,
    action text NOT NULL,
    requested_by text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_comment text,
    payload jsonb,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_mdm_reconciliation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    master_data_id text NOT NULL,
    issue_type text NOT NULL,
    description text,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    module_code character varying(64) NOT NULL,
    module_name character varying(128),
    tier character varying(32) DEFAULT 'basic'::character varying,
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    setting_key character varying(128) NOT NULL,
    setting_value text,
    is_public boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    users_count integer DEFAULT 0,
    storage_used_mb bigint DEFAULT 0,
    api_calls_count bigint DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    base_cost numeric(10,2) DEFAULT 0,
    overage_cost numeric(10,2) DEFAULT 0,
    plugin_cost numeric(10,2) DEFAULT 0,
    total_cost numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    definition jsonb NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    task_no character varying(64) NOT NULL,
    sample_id uuid NOT NULL,
    sample_no character varying(64) NOT NULL,
    test_items jsonb NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    assigned_to character varying(64),
    instrument_id uuid,
    planned_date timestamp with time zone,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    result jsonb,
    conclusion character varying(500),
    recorded_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT ck_qa_lab_tasks_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'pending'::character varying, 'received'::character varying, 'registered'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'testing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))))
);

CREATE TABLE IF NOT EXISTS qms.qa_alert_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid,
    rule_name character varying(256),
    alert_type character varying(32) NOT NULL,
    severity character varying(32),
    title character varying(256) NOT NULL,
    message text,
    metric_value numeric(12,4),
    threshold numeric(12,4),
    status character varying(32) DEFAULT 'active'::character varying,
    acknowledged_by character varying(64),
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS qms.qa_apqp_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    approval_type character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    applicant character varying(64),
    approver character varying(64),
    comment text,
    submitted_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_apqp_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    phase_code character varying(32) NOT NULL,
    phase_name character varying(128) NOT NULL,
    description text,
    status character varying(32) DEFAULT 'pending'::character varying,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    progress integer DEFAULT 0,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_apqp_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_no character varying(64) NOT NULL,
    project_name character varying(256) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    customer character varying(256),
    description text,
    status character varying(32) DEFAULT 'planning'::character varying,
    current_phase character varying(32),
    leader character varying(64),
    team text,
    start_date timestamp with time zone,
    target_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    progress integer DEFAULT 0,
    risk_level character varying(32) DEFAULT 'low'::character varying,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS qms.qa_apqp_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    risk_name character varying(256) NOT NULL,
    description text,
    risk_category character varying(64),
    severity integer DEFAULT 1,
    occurrence integer DEFAULT 1,
    detection integer DEFAULT 1,
    rpn integer,
    status character varying(32) DEFAULT 'open'::character varying,
    mitigation_plan text,
    responsible character varying(64),
    target_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_apqp_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    phase_id uuid NOT NULL,
    task_name character varying(256) NOT NULL,
    description text,
    task_type character varying(64),
    deliverable text,
    status character varying(32) DEFAULT 'pending'::character varying,
    assignee character varying(64),
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rs.change_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    change_request_id uuid NOT NULL,
    title text NOT NULL,
    execution_plan text,
    status text DEFAULT 'planned'::text NOT NULL,
    executed_by text,
    executed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rs.project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    role character varying(50) DEFAULT 'OTHER'::character varying NOT NULL,
    responsibility text,
    allocation numeric(5,2) DEFAULT 1.0,
    join_date timestamp with time zone NOT NULL,
    leave_date timestamp with time zone,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    hourly_rate numeric(10,2),
    cost_rate numeric(10,2),
    budgeted_hours numeric(10,2),
    actual_hours numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rs.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    phase_id uuid,
    name character varying(200) NOT NULL,
    description text,
    target_date timestamp with time zone NOT NULL,
    actual_date timestamp with time zone,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deliverable_type character varying(100),
    acceptance_criteria text,
    acceptance_status character varying(50),
    accepted_by character varying(255),
    accepted_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.mrp_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    suggestion_number character varying(100) NOT NULL,
    material_code character varying(100) NOT NULL,
    material_name character varying(500) NOT NULL,
    specification text,
    unit character varying(50),
    current_stock numeric(18,4) DEFAULT 0 NOT NULL,
    required_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    suggested_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    supplier_id uuid,
    supplier_name character varying(200),
    lead_time_days integer,
    suggested_order_date date,
    suggested_delivery_date date,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    source_type character varying(50),
    source_order_id uuid,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.price_comparison_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comparison_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    quote_id uuid NOT NULL,
    quality_score numeric(5,2),
    price_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    total_score numeric(5,2),
    rank integer,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.price_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    comparison_no character varying(50) NOT NULL,
    compared_at timestamp with time zone DEFAULT now() NOT NULL,
    recommended_supplier_id uuid,
    recommended_quote_id uuid,
    total_score numeric(5,2),
    quality_score numeric(5,2),
    price_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.purchase_contract_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    line_number integer NOT NULL,
    product_code character varying(100),
    product_name character varying(500) NOT NULL,
    specification text,
    unit character varying(50),
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,4),
    amount numeric(18,2),
    delivery_date date,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.purchase_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_no character varying(100) NOT NULL,
    title character varying(500) NOT NULL,
    contract_type character varying(100) NOT NULL,
    supplier_id character varying(100) NOT NULL,
    supplier_name character varying(200),
    sign_date date,
    effective_date date,
    expiry_date date,
    total_amount numeric(18,2),
    currency character varying(10),
    payment_terms text,
    delivery_terms text,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    approval_status character varying(50),
    approver character varying(100),
    approved_at timestamp with time zone,
    signed_by character varying(100),
    contract_file character varying(500),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.purchase_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    inquiry_date timestamp with time zone DEFAULT now() NOT NULL,
    deadline timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.purchase_inquiry_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    item_name character varying(200) NOT NULL,
    specification character varying(200),
    unit character varying(20),
    quantity numeric(10,2) NOT NULL,
    target_price numeric(10,2),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.purchase_requisitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requisition_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    applicant_id uuid,
    applicant_name character varying(100),
    department_id uuid,
    department_name character varying(100),
    request_date timestamp with time zone NOT NULL,
    required_date timestamp with time zone,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying,
    supplier_id uuid,
    supplier_name character varying(200),
    approval_status character varying(50),
    approver character varying(100),
    approved_at timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.scm_master_data_refs (
    master_data_id character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    domain character varying(32) NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    source_service character varying(64) NOT NULL,
    local_entity_type character varying(64),
    local_entity_id uuid,
    payload_snapshot jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.supplier_admission_audit_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    audit_item character varying(200) NOT NULL,
    audit_result character varying(50),
    auditor character varying(100),
    audit_date timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.supplier_admissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_no character varying(100) NOT NULL,
    supplier_name character varying(200) NOT NULL,
    short_name character varying(100),
    contact_person character varying(100),
    contact_phone character varying(50),
    contact_email character varying(100),
    address text,
    business_license character varying(200),
    tax_registration character varying(200),
    organization_code character varying(100),
    legal_representative character varying(100),
    registered_capital character varying(50),
    established_date date,
    business_scope text,
    supplier_category character varying(100),
    risk_level character varying(50),
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    approval_status character varying(50),
    approver character varying(100),
    approved_at timestamp with time zone,
    applicant character varying(100),
    application_date date,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.supplier_quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    inquiry_item_id uuid NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    lead_time_days integer,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.supplier_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    quote_no character varying(50) NOT NULL,
    quote_date timestamp with time zone DEFAULT now() NOT NULL,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    delivery_days integer,
    valid_until timestamp with time zone,
    payment_terms character varying(200),
    status character varying(20) DEFAULT 'submitted'::character varying NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_type character varying(50) NOT NULL,
    source_module character varying(50) NOT NULL,
    target_module character varying(50) NOT NULL,
    source_entity character varying(50) NOT NULL,
    source_id uuid,
    source_code character varying(100),
    target_id uuid,
    target_code character varying(100),
    operation character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    next_retry_at timestamp with time zone,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.sync_record_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_id uuid NOT NULL,
    record_id character varying(100),
    record_name character varying(200),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_no character varying(50) NOT NULL,
    source_system character varying(50) NOT NULL,
    target_system character varying(50) NOT NULL,
    sync_type character varying(50) NOT NULL,
    sync_direction character varying(20) DEFAULT 'push'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    error_message text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS srm.bid_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    deadline timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS srm.bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    supplier_id uuid,
    supplier_name character varying(200),
    price numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    valid_until timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.replenishment_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    line_number integer NOT NULL,
    sku character varying(100) NOT NULL,
    material_name character varying(200) NOT NULL,
    specification character varying(200),
    unit character varying(50) NOT NULL,
    quantity bigint DEFAULT 0 NOT NULL,
    unit_price numeric(18,4),
    total_amount numeric(18,4),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.replenishment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(200),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_quantity bigint DEFAULT 0,
    total_amount numeric(18,4) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.replenishment_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name character varying(200) NOT NULL,
    rule_type character varying(50) DEFAULT 'custom'::character varying NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(200),
    material_category character varying(100),
    material_code character varying(100),
    safety_stock numeric(18,4),
    reorder_point numeric(18,4),
    max_stock numeric(18,4),
    safety_factor numeric(10,4),
    lead_time_days integer,
    consumption_days integer,
    enabled boolean DEFAULT true NOT NULL,
    priority_order integer DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.replenishment_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    suggestion_number text,
    material_code text,
    material_name text,
    specification text,
    unit text,
    warehouse_id uuid,
    location_id uuid,
    current_stock double precision,
    available_stock double precision,
    safety_stock double precision,
    reorder_point double precision,
    max_stock double precision,
    suggested_quantity double precision,
    consumption_rate double precision,
    lead_time_days integer,
    trigger_type text,
    priority text,
    status text,
    supplier_id uuid,
    supplier_name text,
    warehouse_name text,
    remarks text,
    org_id uuid,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.safety_stock_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(200),
    material_code character varying(100) NOT NULL,
    material_name character varying(200) NOT NULL,
    specification character varying(200),
    safety_stock numeric(18,4) DEFAULT 0,
    reorder_point numeric(18,4) DEFAULT 0,
    max_stock numeric(18,4),
    safety_factor numeric(10,4),
    lead_time_days integer,
    consumption_days integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS wms.sync_record_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_record_id uuid NOT NULL,
    record_id character varying(100),
    record_type character varying(50),
    record_name character varying(200),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    source_data jsonb,
    target_data jsonb,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms.sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_no character varying(50) NOT NULL,
    source_system character varying(50) NOT NULL,
    target_system character varying(50) NOT NULL,
    sync_type character varying(50) NOT NULL,
    sync_direction character varying(20) DEFAULT 'push'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    skipped_count integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    error_message text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3) PK/UNIQUE（DO $$ 幂等；conname 同 schema 全局唯一预检）

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_analyses_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_analyses_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_comparison_analyses"')) THEN
        ALTER TABLE "bi"."analytics_comparison_analyses" ADD CONSTRAINT "analytics_comparison_analyses_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_results_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_results_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_comparison_results"')) THEN
        ALTER TABLE "bi"."analytics_comparison_results" ADD CONSTRAINT "analytics_comparison_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_shares_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_shares_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_dashboard_shares"')) THEN
        ALTER TABLE "bi"."analytics_dashboard_shares" ADD CONSTRAINT "analytics_dashboard_shares_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_templates_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_templates_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_dashboard_templates"')) THEN
        ALTER TABLE "bi"."analytics_dashboard_templates" ADD CONSTRAINT "analytics_dashboard_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboards_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboards_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_dashboards"')) THEN
        ALTER TABLE "bi"."analytics_dashboards" ADD CONSTRAINT "analytics_dashboards_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasets_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasets_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_datasets"')) THEN
        ALTER TABLE "bi"."analytics_datasets" ADD CONSTRAINT "analytics_datasets_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasources_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasources_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_datasources"')) THEN
        ALTER TABLE "bi"."analytics_datasources" ADD CONSTRAINT "analytics_datasources_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_history_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_history_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_drilldown_history"')) THEN
        ALTER TABLE "bi"."analytics_drilldown_history" ADD CONSTRAINT "analytics_drilldown_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_paths_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_paths_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_drilldown_paths"')) THEN
        ALTER TABLE "bi"."analytics_drilldown_paths" ADD CONSTRAINT "analytics_drilldown_paths_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_row_level_permissions_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_row_level_permissions_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_row_level_permissions"')) THEN
        ALTER TABLE "bi"."analytics_row_level_permissions" ADD CONSTRAINT "analytics_row_level_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_self_service_reports_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_self_service_reports_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_self_service_reports"')) THEN
        ALTER TABLE "bi"."analytics_self_service_reports" ADD CONSTRAINT "analytics_self_service_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_sync_records_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_sync_records_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_sync_records"')) THEN
        ALTER TABLE "bi"."analytics_sync_records" ADD CONSTRAINT "analytics_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_widgets_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_widgets_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_widgets"')) THEN
        ALTER TABLE "bi"."analytics_widgets" ADD CONSTRAINT "analytics_widgets_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_execution_records_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_execution_records_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."report_execution_records"')) THEN
        ALTER TABLE "bi"."report_execution_records" ADD CONSTRAINT "report_execution_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_subscriptions_pkey' AND n.nspname = 'bi') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_subscriptions_pkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."report_subscriptions"')) THEN
        ALTER TABLE "bi"."report_subscriptions" ADD CONSTRAINT "report_subscriptions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ai_conversations_pkey' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ai_conversations_pkey' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."ai_conversations"')) THEN
        ALTER TABLE "core"."ai_conversations" ADD CONSTRAINT "ai_conversations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'crm_master_data_refs_pkey' AND n.nspname = 'crm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'crm_master_data_refs_pkey' AND n.nspname = 'crm' AND con.conrelid = to_regclass('"crm"."crm_master_data_refs"')) THEN
        ALTER TABLE "crm"."crm_master_data_refs" ADD CONSTRAINT "crm_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_compliance_issues_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_compliance_issues_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_compliance_issues"')) THEN
        ALTER TABLE "finance"."finance_compliance_issues" ADD CONSTRAINT "finance_compliance_issues_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_fraud_rules_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_fraud_rules_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v54_fraud_rules"')) THEN
        ALTER TABLE "finance"."finance_v54_fraud_rules" ADD CONSTRAINT "finance_v54_fraud_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_fraud_scores_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_fraud_scores_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v54_fraud_scores"')) THEN
        ALTER TABLE "finance"."finance_v54_fraud_scores" ADD CONSTRAINT "finance_v54_fraud_scores_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_review_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_review_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v54_review_results"')) THEN
        ALTER TABLE "finance"."finance_v54_review_results" ADD CONSTRAINT "finance_v54_review_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_review_rules_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_review_rules_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v54_review_rules"')) THEN
        ALTER TABLE "finance"."finance_v54_review_rules" ADD CONSTRAINT "finance_v54_review_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_review_workflows_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_review_workflows_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v54_review_workflows"')) THEN
        ALTER TABLE "finance"."finance_v54_review_workflows" ADD CONSTRAINT "finance_v54_review_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_risk_alerts_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_risk_alerts_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v54_risk_alerts"')) THEN
        ALTER TABLE "finance"."finance_v54_risk_alerts" ADD CONSTRAINT "finance_v54_risk_alerts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_risk_indicators_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v54_risk_indicators_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v54_risk_indicators"')) THEN
        ALTER TABLE "finance"."finance_v54_risk_indicators" ADD CONSTRAINT "finance_v54_risk_indicators_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_invoice_items_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_invoice_items_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v55_invoice_items"')) THEN
        ALTER TABLE "finance"."finance_v55_invoice_items" ADD CONSTRAINT "finance_v55_invoice_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_invoices_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_invoices_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v55_invoices"')) THEN
        ALTER TABLE "finance"."finance_v55_invoices" ADD CONSTRAINT "finance_v55_invoices_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_payment_requests_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_payment_requests_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v55_payment_requests"')) THEN
        ALTER TABLE "finance"."finance_v55_payment_requests" ADD CONSTRAINT "finance_v55_payment_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_payment_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_payment_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v55_payment_results"')) THEN
        ALTER TABLE "finance"."finance_v55_payment_results" ADD CONSTRAINT "finance_v55_payment_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_reconciliation_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_reconciliation_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v55_reconciliation_results"')) THEN
        ALTER TABLE "finance"."finance_v55_reconciliation_results" ADD CONSTRAINT "finance_v55_reconciliation_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_reconciliation_rules_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v55_reconciliation_rules_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v55_reconciliation_rules"')) THEN
        ALTER TABLE "finance"."finance_v55_reconciliation_rules" ADD CONSTRAINT "finance_v55_reconciliation_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_brackets_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_brackets_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v56_tax_brackets"')) THEN
        ALTER TABLE "finance"."finance_v56_tax_brackets" ADD CONSTRAINT "finance_v56_tax_brackets_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_forms_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_forms_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v56_tax_forms"')) THEN
        ALTER TABLE "finance"."finance_v56_tax_forms" ADD CONSTRAINT "finance_v56_tax_forms_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_lines_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_lines_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v56_tax_lines"')) THEN
        ALTER TABLE "finance"."finance_v56_tax_lines" ADD CONSTRAINT "finance_v56_tax_lines_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_plans_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_plans_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v56_tax_plans"')) THEN
        ALTER TABLE "finance"."finance_v56_tax_plans" ADD CONSTRAINT "finance_v56_tax_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_rates_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_rates_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v56_tax_rates"')) THEN
        ALTER TABLE "finance"."finance_v56_tax_rates" ADD CONSTRAINT "finance_v56_tax_rates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_suggestions_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v56_tax_suggestions_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v56_tax_suggestions"')) THEN
        ALTER TABLE "finance"."finance_v56_tax_suggestions" ADD CONSTRAINT "finance_v56_tax_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_analysis_dimensions_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_analysis_dimensions_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v57_analysis_dimensions"')) THEN
        ALTER TABLE "finance"."finance_v57_analysis_dimensions" ADD CONSTRAINT "finance_v57_analysis_dimensions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_analysis_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_analysis_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v57_analysis_results"')) THEN
        ALTER TABLE "finance"."finance_v57_analysis_results" ADD CONSTRAINT "finance_v57_analysis_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_forecast_models_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_forecast_models_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v57_forecast_models"')) THEN
        ALTER TABLE "finance"."finance_v57_forecast_models" ADD CONSTRAINT "finance_v57_forecast_models_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_generated_reports_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_generated_reports_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v57_generated_reports"')) THEN
        ALTER TABLE "finance"."finance_v57_generated_reports" ADD CONSTRAINT "finance_v57_generated_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_insights_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_insights_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v57_insights"')) THEN
        ALTER TABLE "finance"."finance_v57_insights" ADD CONSTRAINT "finance_v57_insights_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_report_templates_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_report_templates_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v57_report_templates"')) THEN
        ALTER TABLE "finance"."finance_v57_report_templates" ADD CONSTRAINT "finance_v57_report_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_cash_pools_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_cash_pools_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_cash_pools"')) THEN
        ALTER TABLE "finance"."finance_v58_cash_pools" ADD CONSTRAINT "finance_v58_cash_pools_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_forecast_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_forecast_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_forecast_results"')) THEN
        ALTER TABLE "finance"."finance_v58_forecast_results" ADD CONSTRAINT "finance_v58_forecast_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_forecast_scenarios_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_forecast_scenarios_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_forecast_scenarios"')) THEN
        ALTER TABLE "finance"."finance_v58_forecast_scenarios" ADD CONSTRAINT "finance_v58_forecast_scenarios_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_liquidity_targets_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_liquidity_targets_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_liquidity_targets"')) THEN
        ALTER TABLE "finance"."finance_v58_liquidity_targets" ADD CONSTRAINT "finance_v58_liquidity_targets_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_optimization_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_optimization_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_optimization_results"')) THEN
        ALTER TABLE "finance"."finance_v58_optimization_results" ADD CONSTRAINT "finance_v58_optimization_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_pool_allocations_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_pool_allocations_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_pool_allocations"')) THEN
        ALTER TABLE "finance"."finance_v58_pool_allocations" ADD CONSTRAINT "finance_v58_pool_allocations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_pool_transfers_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_pool_transfers_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_pool_transfers"')) THEN
        ALTER TABLE "finance"."finance_v58_pool_transfers" ADD CONSTRAINT "finance_v58_pool_transfers_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_credit_profiles_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_credit_profiles_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_credit_profiles"')) THEN
        ALTER TABLE "finance"."finance_v59_credit_profiles" ADD CONSTRAINT "finance_v59_credit_profiles_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_device_profiles_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_device_profiles_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_device_profiles"')) THEN
        ALTER TABLE "finance"."finance_v59_device_profiles" ADD CONSTRAINT "finance_v59_device_profiles_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_fraud_decisions_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_fraud_decisions_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_fraud_decisions"')) THEN
        ALTER TABLE "finance"."finance_v59_fraud_decisions" ADD CONSTRAINT "finance_v59_fraud_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_fraud_rules_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_fraud_rules_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_fraud_rules"')) THEN
        ALTER TABLE "finance"."finance_v59_fraud_rules" ADD CONSTRAINT "finance_v59_fraud_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_fraud_signals_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_fraud_signals_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_fraud_signals"')) THEN
        ALTER TABLE "finance"."finance_v59_fraud_signals" ADD CONSTRAINT "finance_v59_fraud_signals_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_scoring_models_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_scoring_models_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_scoring_models"')) THEN
        ALTER TABLE "finance"."finance_v59_scoring_models" ADD CONSTRAINT "finance_v59_scoring_models_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_stress_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_stress_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_stress_results"')) THEN
        ALTER TABLE "finance"."finance_v59_stress_results" ADD CONSTRAINT "finance_v59_stress_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_stress_scenarios_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_stress_scenarios_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_stress_scenarios"')) THEN
        ALTER TABLE "finance"."finance_v59_stress_scenarios" ADD CONSTRAINT "finance_v59_stress_scenarios_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_alert_channels_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_alert_channels_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_alert_channels"')) THEN
        ALTER TABLE "finance"."finance_v60_alert_channels" ADD CONSTRAINT "finance_v60_alert_channels_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_alert_rules_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_alert_rules_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_alert_rules"')) THEN
        ALTER TABLE "finance"."finance_v60_alert_rules" ADD CONSTRAINT "finance_v60_alert_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_alerts_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_alerts_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_alerts"')) THEN
        ALTER TABLE "finance"."finance_v60_alerts" ADD CONSTRAINT "finance_v60_alerts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_decision_results_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_decision_results_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_decision_results"')) THEN
        ALTER TABLE "finance"."finance_v60_decision_results" ADD CONSTRAINT "finance_v60_decision_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_decision_scenarios_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_decision_scenarios_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_decision_scenarios"')) THEN
        ALTER TABLE "finance"."finance_v60_decision_scenarios" ADD CONSTRAINT "finance_v60_decision_scenarios_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_dependencies_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_dependencies_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_schedule_dependencies"')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_dependencies" ADD CONSTRAINT "finance_v60_schedule_dependencies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_executions_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_executions_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_schedule_executions"')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_executions" ADD CONSTRAINT "finance_v60_schedule_executions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_tasks_pkey' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_tasks_pkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_schedule_tasks"')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_tasks" ADD CONSTRAINT "finance_v60_schedule_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'unique_v59_credit_entity' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'unique_v59_credit_entity' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_credit_profiles"')) THEN
        ALTER TABLE "finance"."finance_v59_credit_profiles" ADD CONSTRAINT "unique_v59_credit_entity" UNIQUE (tenant_id, entity_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'unique_v59_device_id' AND n.nspname = 'finance') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'unique_v59_device_id' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_device_profiles"')) THEN
        ALTER TABLE "finance"."finance_v59_device_profiles" ADD CONSTRAINT "unique_v59_device_id" UNIQUE (tenant_id, device_id);
    END IF;
END $$;
-- ============================================================================
-- PK 名规整：_archive_core_doc_* 让出主名给业务表（对齐 5432 命名约定）
-- 5432 形态：业务表 public.core_doc_{documents,folders,templates} 占主名
--   core_doc_*_pkey；归档表 public._archive_core_doc_* 用 core_doc_*_pkey1。
-- 5433 空库重放链中，早期迁移（rehome/骨架演进）以主名给归档表建 PK，
-- 导致 0009 给重建的业务表加主名 PK 时被"同 schema 约束名已占用"守卫跳过，
-- 业务表无 PK → 下游 FK 失败。
-- 本段把归档表 PK 从主名 RENAME 为 pkey1（幂等：仅当 PK 名为主名时执行；
-- 5432 上已是 pkey1 → no-op；RENAME 不重建索引、不重算数据）。
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."_archive_core_doc_documents"')) THEN
        ALTER TABLE "public"."_archive_core_doc_documents" RENAME CONSTRAINT "core_doc_documents_pkey" TO "core_doc_documents_pkey1";
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."_archive_core_doc_folders"')) THEN
        ALTER TABLE "public"."_archive_core_doc_folders" RENAME CONSTRAINT "core_doc_folders_pkey" TO "core_doc_folders_pkey1";
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_templates_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."_archive_core_doc_templates"')) THEN
        ALTER TABLE "public"."_archive_core_doc_templates" RENAME CONSTRAINT "core_doc_templates_pkey" TO "core_doc_templates_pkey1";
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_doc_documents"')) THEN
        ALTER TABLE "flow"."core_doc_documents" ADD CONSTRAINT "core_doc_documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_doc_folders"')) THEN
        ALTER TABLE "flow"."core_doc_folders" ADD CONSTRAINT "core_doc_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_templates_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_templates_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_doc_templates"')) THEN
        ALTER TABLE "flow"."core_doc_templates" ADD CONSTRAINT "core_doc_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_folders_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_folders_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_file_folders"')) THEN
        ALTER TABLE "flow"."core_file_folders" ADD CONSTRAINT "core_file_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_file_id_user_id_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_file_id_user_id_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_file_permissions"')) THEN
        ALTER TABLE "flow"."core_file_permissions" ADD CONSTRAINT "core_file_permissions_file_id_user_id_key" UNIQUE (file_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_file_permissions"')) THEN
        ALTER TABLE "flow"."core_file_permissions" ADD CONSTRAINT "core_file_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_files_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_files_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_files"')) THEN
        ALTER TABLE "flow"."core_files" ADD CONSTRAINT "core_files_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_categories_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_categories_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_flow_categories"')) THEN
        ALTER TABLE "flow"."core_flow_categories" ADD CONSTRAINT "core_flow_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_delegates_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_delegates_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_flow_delegates"')) THEN
        ALTER TABLE "flow"."core_flow_delegates" ADD CONSTRAINT "core_flow_delegates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_rules_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_rules_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_flow_rules"')) THEN
        ALTER TABLE "flow"."core_flow_rules" ADD CONSTRAINT "core_flow_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variable_history_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variable_history_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_flow_variable_history"')) THEN
        ALTER TABLE "flow"."core_flow_variable_history" ADD CONSTRAINT "core_flow_variable_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variables_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variables_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_flow_variables"')) THEN
        ALTER TABLE "flow"."core_flow_variables" ADD CONSTRAINT "core_flow_variables_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_change_log_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_change_log_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_master_data_change_log"')) THEN
        ALTER TABLE "flow"."core_master_data_change_log" ADD CONSTRAINT "core_master_data_change_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_event_outbox_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_event_outbox_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_master_data_event_outbox"')) THEN
        ALTER TABLE "flow"."core_master_data_event_outbox" ADD CONSTRAINT "core_master_data_event_outbox_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_master_data_refs"')) THEN
        ALTER TABLE "flow"."core_master_data_refs" ADD CONSTRAINT "core_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_tenant_id_domain_code_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_tenant_id_domain_code_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_master_data_refs"')) THEN
        ALTER TABLE "flow"."core_master_data_refs" ADD CONSTRAINT "core_master_data_refs_tenant_id_domain_code_key" UNIQUE (tenant_id, domain, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_approvals_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_approvals_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_mdm_approvals"')) THEN
        ALTER TABLE "flow"."core_mdm_approvals" ADD CONSTRAINT "core_mdm_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_reconciliation_log_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_reconciliation_log_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_mdm_reconciliation_log"')) THEN
        ALTER TABLE "flow"."core_mdm_reconciliation_log" ADD CONSTRAINT "core_mdm_reconciliation_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_menu_groups"')) THEN
        ALTER TABLE "flow"."core_menu_groups" ADD CONSTRAINT "core_menu_groups_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_tenant_id_code_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_tenant_id_code_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_menu_groups"')) THEN
        ALTER TABLE "flow"."core_menu_groups" ADD CONSTRAINT "core_menu_groups_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_menus"')) THEN
        ALTER TABLE "flow"."core_menus" ADD CONSTRAINT "core_menus_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_tenant_id_code_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_tenant_id_code_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_menus"')) THEN
        ALTER TABLE "flow"."core_menus" ADD CONSTRAINT "core_menus_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_migration_history"')) THEN
        ALTER TABLE "flow"."core_migration_history" ADD CONSTRAINT "core_migration_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_plugin_name_version_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_plugin_name_version_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_migration_history"')) THEN
        ALTER TABLE "flow"."core_migration_history" ADD CONSTRAINT "core_migration_history_plugin_name_version_key" UNIQUE (plugin_name, version);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_operation_logs_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_operation_logs_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_operation_logs"')) THEN
        ALTER TABLE "flow"."core_operation_logs" ADD CONSTRAINT "core_operation_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_modules"')) THEN
        ALTER TABLE "flow"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_modules"')) THEN
        ALTER TABLE "flow"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_module_code_key" UNIQUE (tenant_id, module_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_settings"')) THEN
        ALTER TABLE "flow"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_settings"')) THEN
        ALTER TABLE "flow"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_setting_key_key" UNIQUE (tenant_id, setting_key);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_usage"')) THEN
        ALTER TABLE "flow"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_usage"')) THEN
        ALTER TABLE "flow"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_period_start_key" UNIQUE (tenant_id, period_start);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_users"')) THEN
        ALTER TABLE "flow"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_email_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_email_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_users"')) THEN
        ALTER TABLE "flow"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_email_key" UNIQUE (tenant_id, email);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_user_id_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_user_id_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_users"')) THEN
        ALTER TABLE "flow"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_user_id_key" UNIQUE (tenant_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_code_key' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_code_key' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenants"')) THEN
        ALTER TABLE "flow"."core_tenants" ADD CONSTRAINT "core_tenants_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenants"')) THEN
        ALTER TABLE "flow"."core_tenants" ADD CONSTRAINT "core_tenants_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_workflow_instances"')) THEN
        ALTER TABLE "flow"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_workflow_tasks"')) THEN
        ALTER TABLE "flow"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'geofences_pkey' AND n.nspname = 'gis') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'geofences_pkey' AND n.nspname = 'gis' AND con.conrelid = to_regclass('"gis"."geofences"')) THEN
        ALTER TABLE "gis"."geofences" ADD CONSTRAINT "geofences_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'track_positions_pkey' AND n.nspname = 'gis') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'track_positions_pkey' AND n.nspname = 'gis' AND con.conrelid = to_regclass('"gis"."track_positions"')) THEN
        ALTER TABLE "gis"."track_positions" ADD CONSTRAINT "track_positions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'hrm_master_data_refs_pkey' AND n.nspname = 'hrm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'hrm_master_data_refs_pkey' AND n.nspname = 'hrm' AND con.conrelid = to_regclass('"hrm"."hrm_master_data_refs"')) THEN
        ALTER TABLE "hrm"."hrm_master_data_refs" ADD CONSTRAINT "hrm_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_return_items_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_return_items_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."material_return_items"')) THEN
        ALTER TABLE "mes"."material_return_items" ADD CONSTRAINT "material_return_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_returns_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_returns_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."material_returns"')) THEN
        ALTER TABLE "mes"."material_returns" ADD CONSTRAINT "material_returns_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_returns_return_no_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_returns_return_no_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."material_returns"')) THEN
        ALTER TABLE "mes"."material_returns" ADD CONSTRAINT "material_returns_return_no_key" UNIQUE (return_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."core_faqs"')) THEN
        ALTER TABLE "portal"."core_faqs" ADD CONSTRAINT "core_faqs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."core_guide_lessons"')) THEN
        ALTER TABLE "portal"."core_guide_lessons" ADD CONSTRAINT "core_guide_lessons_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."core_guide_progress"')) THEN
        ALTER TABLE "portal"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."core_guides"')) THEN
        ALTER TABLE "portal"."core_guides" ADD CONSTRAINT "core_guides_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_compensation_logs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_compensation_logs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."federation_compensation_logs"')) THEN
        ALTER TABLE "portal"."federation_compensation_logs" ADD CONSTRAINT "federation_compensation_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_execution_logs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_execution_logs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."federation_execution_logs"')) THEN
        ALTER TABLE "portal"."federation_execution_logs" ADD CONSTRAINT "federation_execution_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_query_plans_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_query_plans_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."federation_query_plans"')) THEN
        ALTER TABLE "portal"."federation_query_plans" ADD CONSTRAINT "federation_query_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_subgraphs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_subgraphs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."federation_subgraphs"')) THEN
        ALTER TABLE "portal"."federation_subgraphs" ADD CONSTRAINT "federation_subgraphs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_transaction_steps_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_transaction_steps_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."federation_transaction_steps"')) THEN
        ALTER TABLE "portal"."federation_transaction_steps" ADD CONSTRAINT "federation_transaction_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_transactions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'federation_transactions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."federation_transactions"')) THEN
        ALTER TABLE "portal"."federation_transactions" ADD CONSTRAINT "federation_transactions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_degradation_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_degradation_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."gateway_degradation_policies"')) THEN
        ALTER TABLE "portal"."gateway_degradation_policies" ADD CONSTRAINT "gateway_degradation_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_health_metrics_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_health_metrics_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."gateway_health_metrics"')) THEN
        ALTER TABLE "portal"."gateway_health_metrics" ADD CONSTRAINT "gateway_health_metrics_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_protocols_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_protocols_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."gateway_protocols"')) THEN
        ALTER TABLE "portal"."gateway_protocols" ADD CONSTRAINT "gateway_protocols_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_routes_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'gateway_routes_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."gateway_routes"')) THEN
        ALTER TABLE "portal"."gateway_routes" ADD CONSTRAINT "gateway_routes_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_breaking_changes_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_breaking_changes_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_breaking_changes"')) THEN
        ALTER TABLE "portal"."graphql_breaking_changes" ADD CONSTRAINT "graphql_breaking_changes_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_execution_metrics_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_execution_metrics_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_execution_metrics"')) THEN
        ALTER TABLE "portal"."graphql_execution_metrics" ADD CONSTRAINT "graphql_execution_metrics_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_execution_profiles_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_execution_profiles_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_execution_profiles"')) THEN
        ALTER TABLE "portal"."graphql_execution_profiles" ADD CONSTRAINT "graphql_execution_profiles_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_optimization_history_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_optimization_history_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_optimization_history"')) THEN
        ALTER TABLE "portal"."graphql_optimization_history" ADD CONSTRAINT "graphql_optimization_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_schema_versions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_schema_versions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_schema_versions"')) THEN
        ALTER TABLE "portal"."graphql_schema_versions" ADD CONSTRAINT "graphql_schema_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_stream_events_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_stream_events_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_stream_events"')) THEN
        ALTER TABLE "portal"."graphql_stream_events" ADD CONSTRAINT "graphql_stream_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_stream_subscribers_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_stream_subscribers_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_stream_subscribers"')) THEN
        ALTER TABLE "portal"."graphql_stream_subscribers" ADD CONSTRAINT "graphql_stream_subscribers_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_streams_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_streams_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_streams"')) THEN
        ALTER TABLE "portal"."graphql_streams" ADD CONSTRAINT "graphql_streams_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_suggestions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_suggestions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_suggestions"')) THEN
        ALTER TABLE "portal"."graphql_suggestions" ADD CONSTRAINT "graphql_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_version_negotiations_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'graphql_version_negotiations_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."graphql_version_negotiations"')) THEN
        ALTER TABLE "portal"."graphql_version_negotiations" ADD CONSTRAINT "graphql_version_negotiations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_affinities_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_affinities_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."intelligent_gw_affinities"')) THEN
        ALTER TABLE "portal"."intelligent_gw_affinities" ADD CONSTRAINT "intelligent_gw_affinities_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_conflicts_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_conflicts_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."intelligent_gw_conflicts"')) THEN
        ALTER TABLE "portal"."intelligent_gw_conflicts" ADD CONSTRAINT "intelligent_gw_conflicts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_routing_table_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_routing_table_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."intelligent_gw_routing_table"')) THEN
        ALTER TABLE "portal"."intelligent_gw_routing_table" ADD CONSTRAINT "intelligent_gw_routing_table_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_stitch_logs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_stitch_logs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."intelligent_gw_stitch_logs"')) THEN
        ALTER TABLE "portal"."intelligent_gw_stitch_logs" ADD CONSTRAINT "intelligent_gw_stitch_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_stitch_plans_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'intelligent_gw_stitch_plans_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."intelligent_gw_stitch_plans"')) THEN
        ALTER TABLE "portal"."intelligent_gw_stitch_plans" ADD CONSTRAINT "intelligent_gw_stitch_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_accel_configs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_accel_configs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_accel_configs"')) THEN
        ALTER TABLE "portal"."portal_accel_configs" ADD CONSTRAINT "portal_accel_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_acceleration_configs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_acceleration_configs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_acceleration_configs"')) THEN
        ALTER TABLE "portal"."portal_acceleration_configs" ADD CONSTRAINT "portal_acceleration_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_acceleration_results_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_acceleration_results_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_acceleration_results"')) THEN
        ALTER TABLE "portal"."portal_acceleration_results" ADD CONSTRAINT "portal_acceleration_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_access_decisions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_access_decisions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_access_decisions"')) THEN
        ALTER TABLE "portal"."portal_access_decisions" ADD CONSTRAINT "portal_access_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_access_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_access_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_access_policies"')) THEN
        ALTER TABLE "portal"."portal_access_policies" ADD CONSTRAINT "portal_access_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_aggregation_configs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_aggregation_configs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_aggregation_configs"')) THEN
        ALTER TABLE "portal"."portal_aggregation_configs" ADD CONSTRAINT "portal_aggregation_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_aggregation_results_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_aggregation_results_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_aggregation_results"')) THEN
        ALTER TABLE "portal"."portal_aggregation_results" ADD CONSTRAINT "portal_aggregation_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_alert_thresholds_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_alert_thresholds_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_alert_thresholds"')) THEN
        ALTER TABLE "portal"."portal_alert_thresholds" ADD CONSTRAINT "portal_alert_thresholds_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_anomalies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_anomalies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_anomalies"')) THEN
        ALTER TABLE "portal"."portal_anomalies" ADD CONSTRAINT "portal_anomalies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_api_versions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_api_versions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_api_versions"')) THEN
        ALTER TABLE "portal"."portal_api_versions" ADD CONSTRAINT "portal_api_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_audit_entries_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_audit_entries_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_audit_entries"')) THEN
        ALTER TABLE "portal"."portal_audit_entries" ADD CONSTRAINT "portal_audit_entries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_audit_exports_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_audit_exports_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_audit_exports"')) THEN
        ALTER TABLE "portal"."portal_audit_exports" ADD CONSTRAINT "portal_audit_exports_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_auth_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_auth_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_auth_policies"')) THEN
        ALTER TABLE "portal"."portal_auth_policies" ADD CONSTRAINT "portal_auth_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_backpressure_configs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_backpressure_configs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_backpressure_configs"')) THEN
        ALTER TABLE "portal"."portal_backpressure_configs" ADD CONSTRAINT "portal_backpressure_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_backpressure_states_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_backpressure_states_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_backpressure_states"')) THEN
        ALTER TABLE "portal"."portal_backpressure_states" ADD CONSTRAINT "portal_backpressure_states_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_cache_entries_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_cache_entries_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_cache_entries"')) THEN
        ALTER TABLE "portal"."portal_cache_entries" ADD CONSTRAINT "portal_cache_entries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_cache_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_cache_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_cache_policies"')) THEN
        ALTER TABLE "portal"."portal_cache_policies" ADD CONSTRAINT "portal_cache_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_cache_versions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_cache_versions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_cache_versions"')) THEN
        ALTER TABLE "portal"."portal_cache_versions" ADD CONSTRAINT "portal_cache_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_canary_configs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_canary_configs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_canary_configs"')) THEN
        ALTER TABLE "portal"."portal_canary_configs" ADD CONSTRAINT "portal_canary_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_canary_results_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_canary_results_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_canary_results"')) THEN
        ALTER TABLE "portal"."portal_canary_results" ADD CONSTRAINT "portal_canary_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compatibility_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compatibility_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_compatibility_policies"')) THEN
        ALTER TABLE "portal"."portal_compatibility_policies" ADD CONSTRAINT "portal_compatibility_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compatibility_reports_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compatibility_reports_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_compatibility_reports"')) THEN
        ALTER TABLE "portal"."portal_compatibility_reports" ADD CONSTRAINT "portal_compatibility_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compilation_rules_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compilation_rules_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_compilation_rules"')) THEN
        ALTER TABLE "portal"."portal_compilation_rules" ADD CONSTRAINT "portal_compilation_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compiled_queries_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_compiled_queries_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_compiled_queries"')) THEN
        ALTER TABLE "portal"."portal_compiled_queries" ADD CONSTRAINT "portal_compiled_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_config_diffs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_config_diffs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_config_diffs"')) THEN
        ALTER TABLE "portal"."portal_config_diffs" ADD CONSTRAINT "portal_config_diffs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_config_environments_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_config_environments_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_config_environments"')) THEN
        ALTER TABLE "portal"."portal_config_environments" ADD CONSTRAINT "portal_config_environments_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_consistency_checks_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_consistency_checks_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_consistency_checks"')) THEN
        ALTER TABLE "portal"."portal_consistency_checks" ADD CONSTRAINT "portal_consistency_checks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_dead_letter_queue_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_dead_letter_queue_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_dead_letter_queue"')) THEN
        ALTER TABLE "portal"."portal_dead_letter_queue" ADD CONSTRAINT "portal_dead_letter_queue_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_dedup_results_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_dedup_results_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_dedup_results"')) THEN
        ALTER TABLE "portal"."portal_dedup_results" ADD CONSTRAINT "portal_dedup_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_dedup_rules_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_dedup_rules_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_dedup_rules"')) THEN
        ALTER TABLE "portal"."portal_dedup_rules" ADD CONSTRAINT "portal_dedup_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_deployment_steps_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_deployment_steps_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_deployment_steps"')) THEN
        ALTER TABLE "portal"."portal_deployment_steps" ADD CONSTRAINT "portal_deployment_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_deployments_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_deployments_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_deployments"')) THEN
        ALTER TABLE "portal"."portal_deployments" ADD CONSTRAINT "portal_deployments_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_detection_models_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_detection_models_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_detection_models"')) THEN
        ALTER TABLE "portal"."portal_detection_models" ADD CONSTRAINT "portal_detection_models_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_distributed_queries_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_distributed_queries_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_distributed_queries"')) THEN
        ALTER TABLE "portal"."portal_distributed_queries" ADD CONSTRAINT "portal_distributed_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_cache_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_cache_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_edge_cache"')) THEN
        ALTER TABLE "portal"."portal_edge_cache" ADD CONSTRAINT "portal_edge_cache_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_deployments_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_deployments_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_edge_deployments"')) THEN
        ALTER TABLE "portal"."portal_edge_deployments" ADD CONSTRAINT "portal_edge_deployments_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_entries_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_entries_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_edge_entries"')) THEN
        ALTER TABLE "portal"."portal_edge_entries" ADD CONSTRAINT "portal_edge_entries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_functions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_functions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_edge_functions"')) THEN
        ALTER TABLE "portal"."portal_edge_functions" ADD CONSTRAINT "portal_edge_functions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_replication_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_edge_replication_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_edge_replication"')) THEN
        ALTER TABLE "portal"."portal_edge_replication" ADD CONSTRAINT "portal_edge_replication_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_execution_plans_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_execution_plans_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_execution_plans"')) THEN
        ALTER TABLE "portal"."portal_execution_plans" ADD CONSTRAINT "portal_execution_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_execution_steps_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_execution_steps_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_execution_steps"')) THEN
        ALTER TABLE "portal"."portal_execution_steps" ADD CONSTRAINT "portal_execution_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_federated_identities_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_federated_identities_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_federated_identities"')) THEN
        ALTER TABLE "portal"."portal_federated_identities" ADD CONSTRAINT "portal_federated_identities_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_gateway_configs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_gateway_configs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_gateway_configs"')) THEN
        ALTER TABLE "portal"."portal_gateway_configs" ADD CONSTRAINT "portal_gateway_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_healing_actions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_healing_actions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_healing_actions"')) THEN
        ALTER TABLE "portal"."portal_healing_actions" ADD CONSTRAINT "portal_healing_actions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_health_checks_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_health_checks_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_health_checks"')) THEN
        ALTER TABLE "portal"."portal_health_checks" ADD CONSTRAINT "portal_health_checks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_identity_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_identity_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_identity_policies"')) THEN
        ALTER TABLE "portal"."portal_identity_policies" ADD CONSTRAINT "portal_identity_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_invalidation_events_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_invalidation_events_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_invalidation_events"')) THEN
        ALTER TABLE "portal"."portal_invalidation_events" ADD CONSTRAINT "portal_invalidation_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_latency_stats_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_latency_stats_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_latency_stats"')) THEN
        ALTER TABLE "portal"."portal_latency_stats" ADD CONSTRAINT "portal_latency_stats_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_masking_rules_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_masking_rules_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_masking_rules"')) THEN
        ALTER TABLE "portal"."portal_masking_rules" ADD CONSTRAINT "portal_masking_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_metrics_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_metrics_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_metrics"')) THEN
        ALTER TABLE "portal"."portal_metrics" ADD CONSTRAINT "portal_metrics_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_orchestration_plans_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_orchestration_plans_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_orchestration_plans"')) THEN
        ALTER TABLE "portal"."portal_orchestration_plans" ADD CONSTRAINT "portal_orchestration_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_persisted_queries_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_persisted_queries_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_persisted_queries"')) THEN
        ALTER TABLE "portal"."portal_persisted_queries" ADD CONSTRAINT "portal_persisted_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_persisted_query_versions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_persisted_query_versions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_persisted_query_versions"')) THEN
        ALTER TABLE "portal"."portal_persisted_query_versions" ADD CONSTRAINT "portal_persisted_query_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_plan_steps_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_plan_steps_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_plan_steps"')) THEN
        ALTER TABLE "portal"."portal_plan_steps" ADD CONSTRAINT "portal_plan_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_push_stats_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_push_stats_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_push_stats"')) THEN
        ALTER TABLE "portal"."portal_push_stats" ADD CONSTRAINT "portal_push_stats_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_queue_configs_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_queue_configs_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_queue_configs"')) THEN
        ALTER TABLE "portal"."portal_queue_configs" ADD CONSTRAINT "portal_queue_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_queue_messages_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_queue_messages_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_queue_messages"')) THEN
        ALTER TABLE "portal"."portal_queue_messages" ADD CONSTRAINT "portal_queue_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_recovery_plans_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_recovery_plans_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_recovery_plans"')) THEN
        ALTER TABLE "portal"."portal_recovery_plans" ADD CONSTRAINT "portal_recovery_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_replay_requests_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_replay_requests_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_replay_requests"')) THEN
        ALTER TABLE "portal"."portal_replay_requests" ADD CONSTRAINT "portal_replay_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_replay_results_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_replay_results_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_replay_results"')) THEN
        ALTER TABLE "portal"."portal_replay_results" ADD CONSTRAINT "portal_replay_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_resolver_timings_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_resolver_timings_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_resolver_timings"')) THEN
        ALTER TABLE "portal"."portal_resolver_timings" ADD CONSTRAINT "portal_resolver_timings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_rollback_actions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_rollback_actions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_rollback_actions"')) THEN
        ALTER TABLE "portal"."portal_rollback_actions" ADD CONSTRAINT "portal_rollback_actions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_rollback_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_rollback_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_rollback_policies"')) THEN
        ALTER TABLE "portal"."portal_rollback_policies" ADD CONSTRAINT "portal_rollback_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_route_rules_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_route_rules_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_route_rules"')) THEN
        ALTER TABLE "portal"."portal_route_rules" ADD CONSTRAINT "portal_route_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_routing_decisions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_routing_decisions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_routing_decisions"')) THEN
        ALTER TABLE "portal"."portal_routing_decisions" ADD CONSTRAINT "portal_routing_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_routing_rules_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_routing_rules_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_routing_rules"')) THEN
        ALTER TABLE "portal"."portal_routing_rules" ADD CONSTRAINT "portal_routing_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_security_events_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_security_events_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_security_events"')) THEN
        ALTER TABLE "portal"."portal_security_events" ADD CONSTRAINT "portal_security_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_security_incidents_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_security_incidents_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_security_incidents"')) THEN
        ALTER TABLE "portal"."portal_security_incidents" ADD CONSTRAINT "portal_security_incidents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_security_policies_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_security_policies_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_security_policies"')) THEN
        ALTER TABLE "portal"."portal_security_policies" ADD CONSTRAINT "portal_security_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_service_descriptors_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_service_descriptors_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_service_descriptors"')) THEN
        ALTER TABLE "portal"."portal_service_descriptors" ADD CONSTRAINT "portal_service_descriptors_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_service_heartbeats_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_service_heartbeats_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_service_heartbeats"')) THEN
        ALTER TABLE "portal"."portal_service_heartbeats" ADD CONSTRAINT "portal_service_heartbeats_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_service_loads_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_service_loads_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_service_loads"')) THEN
        ALTER TABLE "portal"."portal_service_loads" ADD CONSTRAINT "portal_service_loads_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_stream_events_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_stream_events_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_stream_events"')) THEN
        ALTER TABLE "portal"."portal_stream_events" ADD CONSTRAINT "portal_stream_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_streams_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_streams_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_streams"')) THEN
        ALTER TABLE "portal"."portal_streams" ADD CONSTRAINT "portal_streams_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_sub_queries_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_sub_queries_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_sub_queries"')) THEN
        ALTER TABLE "portal"."portal_sub_queries" ADD CONSTRAINT "portal_sub_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscribers_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscribers_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_subscribers"')) THEN
        ALTER TABLE "portal"."portal_subscribers" ADD CONSTRAINT "portal_subscribers_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscription_channels_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscription_channels_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_subscription_channels"')) THEN
        ALTER TABLE "portal"."portal_subscription_channels" ADD CONSTRAINT "portal_subscription_channels_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscription_events_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscription_events_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_subscription_events"')) THEN
        ALTER TABLE "portal"."portal_subscription_events" ADD CONSTRAINT "portal_subscription_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscription_records_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_subscription_records_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_subscription_records"')) THEN
        ALTER TABLE "portal"."portal_subscription_records" ADD CONSTRAINT "portal_subscription_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_traces_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_traces_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_traces"')) THEN
        ALTER TABLE "portal"."portal_traces" ADD CONSTRAINT "portal_traces_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_trust_decisions_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_trust_decisions_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_trust_decisions"')) THEN
        ALTER TABLE "portal"."portal_trust_decisions" ADD CONSTRAINT "portal_trust_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_version_mappings_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_version_mappings_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_version_mappings"')) THEN
        ALTER TABLE "portal"."portal_version_mappings" ADD CONSTRAINT "portal_version_mappings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_version_vectors_pkey' AND n.nspname = 'portal') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'portal_version_vectors_pkey' AND n.nspname = 'portal' AND con.conrelid = to_regclass('"portal"."portal_version_vectors"')) THEN
        ALTER TABLE "portal"."portal_version_vectors" ADD CONSTRAINT "portal_version_vectors_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_api_version_configs_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_api_version_configs_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_api_version_configs"')) THEN
        ALTER TABLE "public"."core_api_version_configs" ADD CONSTRAINT "core_api_version_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_doc_documents"')) THEN
        ALTER TABLE "public"."core_doc_documents" ADD CONSTRAINT "core_doc_documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_doc_folders"')) THEN
        ALTER TABLE "public"."core_doc_folders" ADD CONSTRAINT "core_doc_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_templates_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_templates_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_doc_templates"')) THEN
        ALTER TABLE "public"."core_doc_templates" ADD CONSTRAINT "core_doc_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_faqs"')) THEN
        ALTER TABLE "public"."core_faqs" ADD CONSTRAINT "core_faqs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_file_id_user_id_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_file_id_user_id_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_file_permissions"')) THEN
        ALTER TABLE "public"."core_file_permissions" ADD CONSTRAINT "core_file_permissions_file_id_user_id_key" UNIQUE (file_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_permissions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_file_permissions"')) THEN
        ALTER TABLE "public"."core_file_permissions" ADD CONSTRAINT "core_file_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_guide_lessons"')) THEN
        ALTER TABLE "public"."core_guide_lessons" ADD CONSTRAINT "core_guide_lessons_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_user_id_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_user_id_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_guide_progress"')) THEN
        ALTER TABLE "public"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_guide_id_user_id_key" UNIQUE (guide_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_guide_progress"')) THEN
        ALTER TABLE "public"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_guides"')) THEN
        ALTER TABLE "public"."core_guides" ADD CONSTRAINT "core_guides_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_change_log_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_change_log_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_master_data_change_log"')) THEN
        ALTER TABLE "public"."core_master_data_change_log" ADD CONSTRAINT "core_master_data_change_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_event_outbox_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_event_outbox_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_master_data_event_outbox"')) THEN
        ALTER TABLE "public"."core_master_data_event_outbox" ADD CONSTRAINT "core_master_data_event_outbox_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_master_data_refs"')) THEN
        ALTER TABLE "public"."core_master_data_refs" ADD CONSTRAINT "core_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_tenant_id_domain_code_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_tenant_id_domain_code_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_master_data_refs"')) THEN
        ALTER TABLE "public"."core_master_data_refs" ADD CONSTRAINT "core_master_data_refs_tenant_id_domain_code_key" UNIQUE (tenant_id, domain, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_approvals_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_approvals_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_mdm_approvals"')) THEN
        ALTER TABLE "public"."core_mdm_approvals" ADD CONSTRAINT "core_mdm_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_reconciliation_log_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_reconciliation_log_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_mdm_reconciliation_log"')) THEN
        ALTER TABLE "public"."core_mdm_reconciliation_log" ADD CONSTRAINT "core_mdm_reconciliation_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tenant_modules"')) THEN
        ALTER TABLE "public"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tenant_modules"')) THEN
        ALTER TABLE "public"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_module_code_key" UNIQUE (tenant_id, module_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tenant_settings"')) THEN
        ALTER TABLE "public"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tenant_settings"')) THEN
        ALTER TABLE "public"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_setting_key_key" UNIQUE (tenant_id, setting_key);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tenant_usage"')) THEN
        ALTER TABLE "public"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tenant_usage"')) THEN
        ALTER TABLE "public"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_period_start_key" UNIQUE (tenant_id, period_start);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflows_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflows_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_workflows"')) THEN
        ALTER TABLE "public"."core_workflows" ADD CONSTRAINT "core_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_tasks_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_tasks_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_tasks"')) THEN
        ALTER TABLE "public"."qa_lab_tasks" ADD CONSTRAINT "qa_lab_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_tasks_task_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_tasks_task_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_tasks"')) THEN
        ALTER TABLE "public"."qa_lab_tasks" ADD CONSTRAINT "qa_lab_tasks_task_no_key" UNIQUE (task_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_alert_messages_pkey' AND n.nspname = 'qms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_alert_messages_pkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_alert_messages"')) THEN
        ALTER TABLE "qms"."qa_alert_messages" ADD CONSTRAINT "qa_alert_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_approvals_pkey' AND n.nspname = 'qms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_approvals_pkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_approvals"')) THEN
        ALTER TABLE "qms"."qa_apqp_approvals" ADD CONSTRAINT "qa_apqp_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_phases_pkey' AND n.nspname = 'qms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_phases_pkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_phases"')) THEN
        ALTER TABLE "qms"."qa_apqp_phases" ADD CONSTRAINT "qa_apqp_phases_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_projects_pkey' AND n.nspname = 'qms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_projects_pkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_projects"')) THEN
        ALTER TABLE "qms"."qa_apqp_projects" ADD CONSTRAINT "qa_apqp_projects_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_projects_project_no_key' AND n.nspname = 'qms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_projects_project_no_key' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_projects"')) THEN
        ALTER TABLE "qms"."qa_apqp_projects" ADD CONSTRAINT "qa_apqp_projects_project_no_key" UNIQUE (project_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_risks_pkey' AND n.nspname = 'qms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_risks_pkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_risks"')) THEN
        ALTER TABLE "qms"."qa_apqp_risks" ADD CONSTRAINT "qa_apqp_risks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_tasks_pkey' AND n.nspname = 'qms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_tasks_pkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_tasks"')) THEN
        ALTER TABLE "qms"."qa_apqp_tasks" ADD CONSTRAINT "qa_apqp_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'change_orders_pkey' AND n.nspname = 'rs') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'change_orders_pkey' AND n.nspname = 'rs' AND con.conrelid = to_regclass('"rs"."change_orders"')) THEN
        ALTER TABLE "rs"."change_orders" ADD CONSTRAINT "change_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'project_members_pkey' AND n.nspname = 'rs') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'project_members_pkey' AND n.nspname = 'rs' AND con.conrelid = to_regclass('"rs"."project_members"')) THEN
        ALTER TABLE "rs"."project_members" ADD CONSTRAINT "project_members_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'project_milestones_pkey' AND n.nspname = 'rs') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'project_milestones_pkey' AND n.nspname = 'rs' AND con.conrelid = to_regclass('"rs"."project_milestones"')) THEN
        ALTER TABLE "rs"."project_milestones" ADD CONSTRAINT "project_milestones_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mrp_suggestions_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mrp_suggestions_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."mrp_suggestions"')) THEN
        ALTER TABLE "scm"."mrp_suggestions" ADD CONSTRAINT "mrp_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'price_comparison_items_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'price_comparison_items_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."price_comparison_items"')) THEN
        ALTER TABLE "scm"."price_comparison_items" ADD CONSTRAINT "price_comparison_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'price_comparisons_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'price_comparisons_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."price_comparisons"')) THEN
        ALTER TABLE "scm"."price_comparisons" ADD CONSTRAINT "price_comparisons_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_contract_items_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_contract_items_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."purchase_contract_items"')) THEN
        ALTER TABLE "scm"."purchase_contract_items" ADD CONSTRAINT "purchase_contract_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_contracts_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_contracts_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."purchase_contracts"')) THEN
        ALTER TABLE "scm"."purchase_contracts" ADD CONSTRAINT "purchase_contracts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_inquiries_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_inquiries_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."purchase_inquiries"')) THEN
        ALTER TABLE "scm"."purchase_inquiries" ADD CONSTRAINT "purchase_inquiries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_inquiry_items_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_inquiry_items_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."purchase_inquiry_items"')) THEN
        ALTER TABLE "scm"."purchase_inquiry_items" ADD CONSTRAINT "purchase_inquiry_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_requisitions_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'purchase_requisitions_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."purchase_requisitions"')) THEN
        ALTER TABLE "scm"."purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'scm_master_data_refs_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'scm_master_data_refs_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."scm_master_data_refs"')) THEN
        ALTER TABLE "scm"."scm_master_data_refs" ADD CONSTRAINT "scm_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_admission_audit_items_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_admission_audit_items_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."supplier_admission_audit_items"')) THEN
        ALTER TABLE "scm"."supplier_admission_audit_items" ADD CONSTRAINT "supplier_admission_audit_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_admissions_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_admissions_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."supplier_admissions"')) THEN
        ALTER TABLE "scm"."supplier_admissions" ADD CONSTRAINT "supplier_admissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_quote_items_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_quote_items_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."supplier_quote_items"')) THEN
        ALTER TABLE "scm"."supplier_quote_items" ADD CONSTRAINT "supplier_quote_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_quotes_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supplier_quotes_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."supplier_quotes"')) THEN
        ALTER TABLE "scm"."supplier_quotes" ADD CONSTRAINT "supplier_quotes_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_logs_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_logs_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."sync_logs"')) THEN
        ALTER TABLE "scm"."sync_logs" ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_record_details_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_record_details_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."sync_record_details"')) THEN
        ALTER TABLE "scm"."sync_record_details" ADD CONSTRAINT "sync_record_details_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_records_pkey' AND n.nspname = 'scm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_records_pkey' AND n.nspname = 'scm' AND con.conrelid = to_regclass('"scm"."sync_records"')) THEN
        ALTER TABLE "scm"."sync_records" ADD CONSTRAINT "sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'bid_requests_pkey' AND n.nspname = 'srm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'bid_requests_pkey' AND n.nspname = 'srm' AND con.conrelid = to_regclass('"srm"."bid_requests"')) THEN
        ALTER TABLE "srm"."bid_requests" ADD CONSTRAINT "bid_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'bids_pkey' AND n.nspname = 'srm') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'bids_pkey' AND n.nspname = 'srm' AND con.conrelid = to_regclass('"srm"."bids"')) THEN
        ALTER TABLE "srm"."bids" ADD CONSTRAINT "bids_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_order_items_pkey' AND n.nspname = 'wms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_order_items_pkey' AND n.nspname = 'wms' AND con.conrelid = to_regclass('"wms"."replenishment_order_items"')) THEN
        ALTER TABLE "wms"."replenishment_order_items" ADD CONSTRAINT "replenishment_order_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_orders_pkey' AND n.nspname = 'wms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_orders_pkey' AND n.nspname = 'wms' AND con.conrelid = to_regclass('"wms"."replenishment_orders"')) THEN
        ALTER TABLE "wms"."replenishment_orders" ADD CONSTRAINT "replenishment_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_rules_pkey' AND n.nspname = 'wms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_rules_pkey' AND n.nspname = 'wms' AND con.conrelid = to_regclass('"wms"."replenishment_rules"')) THEN
        ALTER TABLE "wms"."replenishment_rules" ADD CONSTRAINT "replenishment_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_suggestions_pkey' AND n.nspname = 'wms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'replenishment_suggestions_pkey' AND n.nspname = 'wms' AND con.conrelid = to_regclass('"wms"."replenishment_suggestions"')) THEN
        ALTER TABLE "wms"."replenishment_suggestions" ADD CONSTRAINT "replenishment_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'safety_stock_settings_pkey' AND n.nspname = 'wms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'safety_stock_settings_pkey' AND n.nspname = 'wms' AND con.conrelid = to_regclass('"wms"."safety_stock_settings"')) THEN
        ALTER TABLE "wms"."safety_stock_settings" ADD CONSTRAINT "safety_stock_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_record_details_pkey' AND n.nspname = 'wms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_record_details_pkey' AND n.nspname = 'wms' AND con.conrelid = to_regclass('"wms"."sync_record_details"')) THEN
        ALTER TABLE "wms"."sync_record_details" ADD CONSTRAINT "sync_record_details_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_records_pkey' AND n.nspname = 'wms') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_records_pkey' AND n.nspname = 'wms' AND con.conrelid = to_regclass('"wms"."sync_records"')) THEN
        ALTER TABLE "wms"."sync_records" ADD CONSTRAINT "sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

-- 4) FK（目标表在独有表集合内——解掉目标表缺失跳过的 FK）

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_results_comparison_id_fkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_comparison_results"')) THEN
        ALTER TABLE "bi"."analytics_comparison_results" ADD CONSTRAINT "analytics_comparison_results_comparison_id_fkey" FOREIGN KEY (comparison_id) REFERENCES bi.analytics_comparison_analyses(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_shares_dashboard_id_fkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_dashboard_shares"')) THEN
        ALTER TABLE "bi"."analytics_dashboard_shares" ADD CONSTRAINT "analytics_dashboard_shares_dashboard_id_fkey" FOREIGN KEY (dashboard_id) REFERENCES bi.analytics_dashboards(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasets_datasource_id_fkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_datasets"')) THEN
        ALTER TABLE "bi"."analytics_datasets" ADD CONSTRAINT "analytics_datasets_datasource_id_fkey" FOREIGN KEY (datasource_id) REFERENCES bi.analytics_datasources(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_history_path_id_fkey' AND n.nspname = 'bi' AND con.conrelid = to_regclass('"bi"."analytics_drilldown_history"')) THEN
        ALTER TABLE "bi"."analytics_drilldown_history" ADD CONSTRAINT "analytics_drilldown_history_path_id_fkey" FOREIGN KEY (path_id) REFERENCES bi.analytics_drilldown_paths(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v57_generated_reports_template_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v57_generated_reports"')) THEN
        ALTER TABLE "finance"."finance_v57_generated_reports" ADD CONSTRAINT "finance_v57_generated_reports_template_id_fkey" FOREIGN KEY (template_id) REFERENCES finance.finance_v57_report_templates(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_forecast_results_scenario_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_forecast_results"')) THEN
        ALTER TABLE "finance"."finance_v58_forecast_results" ADD CONSTRAINT "finance_v58_forecast_results_scenario_id_fkey" FOREIGN KEY (scenario_id) REFERENCES finance.finance_v58_forecast_scenarios(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_pool_allocations_pool_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_pool_allocations"')) THEN
        ALTER TABLE "finance"."finance_v58_pool_allocations" ADD CONSTRAINT "finance_v58_pool_allocations_pool_id_fkey" FOREIGN KEY (pool_id) REFERENCES finance.finance_v58_cash_pools(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_pool_transfers_from_pool_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_pool_transfers"')) THEN
        ALTER TABLE "finance"."finance_v58_pool_transfers" ADD CONSTRAINT "finance_v58_pool_transfers_from_pool_fkey" FOREIGN KEY (from_pool) REFERENCES finance.finance_v58_cash_pools(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v58_pool_transfers_to_pool_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v58_pool_transfers"')) THEN
        ALTER TABLE "finance"."finance_v58_pool_transfers" ADD CONSTRAINT "finance_v58_pool_transfers_to_pool_fkey" FOREIGN KEY (to_pool) REFERENCES finance.finance_v58_cash_pools(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v59_stress_results_scenario_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v59_stress_results"')) THEN
        ALTER TABLE "finance"."finance_v59_stress_results" ADD CONSTRAINT "finance_v59_stress_results_scenario_id_fkey" FOREIGN KEY (scenario_id) REFERENCES finance.finance_v59_stress_scenarios(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_alerts_rule_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_alerts"')) THEN
        ALTER TABLE "finance"."finance_v60_alerts" ADD CONSTRAINT "finance_v60_alerts_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES finance.finance_v60_alert_rules(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_decision_results_scenario_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_decision_results"')) THEN
        ALTER TABLE "finance"."finance_v60_decision_results" ADD CONSTRAINT "finance_v60_decision_results_scenario_id_fkey" FOREIGN KEY (scenario_id) REFERENCES finance.finance_v60_decision_scenarios(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_dependencies_depends_on_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_schedule_dependencies"')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_dependencies" ADD CONSTRAINT "finance_v60_schedule_dependencies_depends_on_fkey" FOREIGN KEY (depends_on) REFERENCES finance.finance_v60_schedule_tasks(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_dependencies_task_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_schedule_dependencies"')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_dependencies" ADD CONSTRAINT "finance_v60_schedule_dependencies_task_id_fkey" FOREIGN KEY (task_id) REFERENCES finance.finance_v60_schedule_tasks(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'finance_v60_schedule_executions_task_id_fkey' AND n.nspname = 'finance' AND con.conrelid = to_regclass('"finance"."finance_v60_schedule_executions"')) THEN
        ALTER TABLE "finance"."finance_v60_schedule_executions" ADD CONSTRAINT "finance_v60_schedule_executions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES finance.finance_v60_schedule_tasks(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_folder_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_doc_documents"')) THEN
        ALTER TABLE "flow"."core_doc_documents" ADD CONSTRAINT "core_doc_documents_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.core_doc_folders(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_template_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_doc_documents"')) THEN
        ALTER TABLE "flow"."core_doc_documents" ADD CONSTRAINT "core_doc_documents_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.core_doc_templates(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_parent_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_doc_folders"')) THEN
        ALTER TABLE "flow"."core_doc_folders" ADD CONSTRAINT "core_doc_folders_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES flow.core_doc_folders(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variable_history_variable_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_flow_variable_history"')) THEN
        ALTER TABLE "flow"."core_flow_variable_history" ADD CONSTRAINT "core_flow_variable_history_variable_id_fkey" FOREIGN KEY (variable_id) REFERENCES flow.core_flow_variables(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_group_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_menus"')) THEN
        ALTER TABLE "flow"."core_menus" ADD CONSTRAINT "core_menus_group_id_fkey" FOREIGN KEY (group_id) REFERENCES flow.core_menu_groups(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_parent_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_menus"')) THEN
        ALTER TABLE "flow"."core_menus" ADD CONSTRAINT "core_menus_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES flow.core_menus(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_modules"')) THEN
        ALTER TABLE "flow"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_settings"')) THEN
        ALTER TABLE "flow"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_usage"')) THEN
        ALTER TABLE "flow"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_tenant_users"')) THEN
        ALTER TABLE "flow"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_instance_id_fkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."core_workflow_tasks"')) THEN
        ALTER TABLE "flow"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_instance_id_fkey" FOREIGN KEY (instance_id) REFERENCES flow.core_workflow_instances(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_return_items_return_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."material_return_items"')) THEN
        ALTER TABLE "mes"."material_return_items" ADD CONSTRAINT "material_return_items_return_id_fkey" FOREIGN KEY (return_id) REFERENCES mes.material_returns(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_guide_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_guide_lessons"')) THEN
        ALTER TABLE "public"."core_guide_lessons" ADD CONSTRAINT "core_guide_lessons_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES public.core_guides(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_guide_progress"')) THEN
        ALTER TABLE "public"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES public.core_guides(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_records_task_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_records"')) THEN
        ALTER TABLE "public"."qa_lab_records" ADD CONSTRAINT "qa_lab_records_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.qa_lab_tasks(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_approvals_project_id_fkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_approvals"')) THEN
        ALTER TABLE "qms"."qa_apqp_approvals" ADD CONSTRAINT "qa_apqp_approvals_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_phases_project_id_fkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_phases"')) THEN
        ALTER TABLE "qms"."qa_apqp_phases" ADD CONSTRAINT "qa_apqp_phases_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_risks_project_id_fkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_risks"')) THEN
        ALTER TABLE "qms"."qa_apqp_risks" ADD CONSTRAINT "qa_apqp_risks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_tasks_phase_id_fkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_tasks"')) THEN
        ALTER TABLE "qms"."qa_apqp_tasks" ADD CONSTRAINT "qa_apqp_tasks_phase_id_fkey" FOREIGN KEY (phase_id) REFERENCES qms.qa_apqp_phases(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_apqp_tasks_project_id_fkey' AND n.nspname = 'qms' AND con.conrelid = to_regclass('"qms"."qa_apqp_tasks"')) THEN
        ALTER TABLE "qms"."qa_apqp_tasks" ADD CONSTRAINT "qa_apqp_tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5) RLS POLICY + 启用（独有表启用 RLS 的）

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v54_fraud_rules"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v54_fraud_rules" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v54_fraud_scores"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v54_fraud_scores" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v54_review_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v54_review_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v54_review_rules"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v54_review_rules" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v54_review_workflows"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v54_review_workflows" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v54_risk_alerts"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v54_risk_alerts" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v54_risk_indicators"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v54_risk_indicators" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v55_invoice_items"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v55_invoice_items" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v55_invoices"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v55_invoices" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v55_payment_requests"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v55_payment_requests" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v55_payment_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v55_payment_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v55_reconciliation_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v55_reconciliation_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v55_reconciliation_rules"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v55_reconciliation_rules" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v56_tax_brackets"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v56_tax_brackets" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v56_tax_forms"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v56_tax_forms" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v56_tax_lines"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v56_tax_lines" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v56_tax_plans"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v56_tax_plans" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v56_tax_rates"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v56_tax_rates" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v56_tax_suggestions"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v56_tax_suggestions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v57_analysis_dimensions"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v57_analysis_dimensions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v57_analysis_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v57_analysis_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v57_forecast_models"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v57_forecast_models" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v57_generated_reports"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v57_generated_reports" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v57_insights"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v57_insights" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v57_report_templates"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v57_report_templates" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v58_cash_pools"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v58_cash_pools" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v58_forecast_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v58_forecast_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v58_forecast_scenarios"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v58_forecast_scenarios" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v58_liquidity_targets"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v58_liquidity_targets" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v58_optimization_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v58_optimization_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v58_pool_allocations"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v58_pool_allocations" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v58_pool_transfers"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v58_pool_transfers" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_credit_profiles"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_credit_profiles" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_device_profiles"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_device_profiles" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_fraud_decisions"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_fraud_decisions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_fraud_rules"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_fraud_rules" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_fraud_signals"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_fraud_signals" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_scoring_models"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_scoring_models" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_stress_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_stress_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v59_stress_scenarios"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v59_stress_scenarios" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_alert_channels"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_alert_channels" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_alert_rules"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_alert_rules" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_alerts"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_alerts" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_decision_results"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_decision_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_decision_scenarios"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_decision_scenarios" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_schedule_dependencies"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_schedule_dependencies" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_schedule_executions"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_schedule_executions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"finance"."finance_v60_schedule_tasks"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "finance"."finance_v60_schedule_tasks" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'gis_allow_all_geofences' AND polrelid = to_regclass('"gis"."geofences"')) THEN
        CREATE POLICY "gis_allow_all_geofences" ON "gis"."geofences" USING (true) WITH CHECK (true);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'gis_allow_all_track_positions' AND polrelid = to_regclass('"gis"."track_positions"')) THEN
        CREATE POLICY "gis_allow_all_track_positions" ON "gis"."track_positions" USING (true) WITH CHECK (true);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_qa_alert_messages' AND polrelid = to_regclass('"qms"."qa_alert_messages"')) THEN
        CREATE POLICY "tenant_isolation_qa_alert_messages" ON "qms"."qa_alert_messages" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_qa_apqp_projects' AND polrelid = to_regclass('"qms"."qa_apqp_projects"')) THEN
        CREATE POLICY "tenant_isolation_qa_apqp_projects" ON "qms"."qa_apqp_projects" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_replenishment_suggestions' AND polrelid = to_regclass('"wms"."replenishment_suggestions"')) THEN
        CREATE POLICY "tenant_isolation_replenishment_suggestions" ON "wms"."replenishment_suggestions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
ALTER TABLE "finance"."finance_v54_fraud_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_fraud_scores" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_review_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_review_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_review_workflows" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_risk_alerts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_risk_indicators" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_invoice_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_payment_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_payment_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_reconciliation_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_reconciliation_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_brackets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_forms" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_lines" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_plans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_rates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_suggestions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_analysis_dimensions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_analysis_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_forecast_models" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_generated_reports" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_insights" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_report_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_cash_pools" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_forecast_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_forecast_scenarios" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_liquidity_targets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_optimization_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_pool_allocations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_pool_transfers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_credit_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_device_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_fraud_decisions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_fraud_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_fraud_signals" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_scoring_models" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_stress_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_stress_scenarios" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_alert_channels" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_alert_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_alerts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_decision_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_decision_scenarios" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_schedule_dependencies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_schedule_executions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_schedule_tasks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_fraud_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_fraud_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_review_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_review_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_review_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_risk_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v54_risk_indicators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_payment_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_payment_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_reconciliation_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v55_reconciliation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_brackets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v56_tax_suggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_analysis_dimensions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_analysis_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_forecast_models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_generated_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_insights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v57_report_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_cash_pools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_forecast_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_forecast_scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_liquidity_targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_optimization_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_pool_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v58_pool_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_credit_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_device_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_fraud_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_fraud_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_fraud_signals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_scoring_models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_stress_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v59_stress_scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_alert_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_alert_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_decision_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_decision_scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_schedule_dependencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_schedule_executions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance"."finance_v60_schedule_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."qa_alert_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms"."qa_apqp_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wms"."replenishment_suggestions" ENABLE ROW LEVEL SECURITY;
