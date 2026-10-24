-- =============================================================================
-- 由 scripts/gen-orphan-tables-migration.py 生成：5432 独有表（运行时自建）系统性补链
-- 独有表 304 张 | 序列 4 | PK/UNIQUE 413 |
-- FK（目标表∈独有表） 116 | POLICY 66 | RLS 62
-- =============================================================================

-- 0) schema 兜底（5433 可能缺独有表所在 schema）

CREATE SCHEMA IF NOT EXISTS "_sqlx_test";
CREATE SCHEMA IF NOT EXISTS "analytics";
CREATE SCHEMA IF NOT EXISTS "bi";
CREATE SCHEMA IF NOT EXISTS "communication";
CREATE SCHEMA IF NOT EXISTS "core";
CREATE SCHEMA IF NOT EXISTS "doc_service";
CREATE SCHEMA IF NOT EXISTS "erp";
CREATE SCHEMA IF NOT EXISTS "flow";
CREATE SCHEMA IF NOT EXISTS "iam";
CREATE SCHEMA IF NOT EXISTS "integration";
CREATE SCHEMA IF NOT EXISTS "master_data";
CREATE SCHEMA IF NOT EXISTS "mes";
CREATE SCHEMA IF NOT EXISTS "mobile";
CREATE SCHEMA IF NOT EXISTS "public";

-- 1) 序列（独有表 DEFAULT nextval 依赖）

CREATE SEQUENCE IF NOT EXISTS mes.dashboard_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS mes.permission_audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS mes.tenant_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS mes.tool_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- 2) 建表（含内联 CHECK；无 FK——FK 在步骤 3 后补）

CREATE TABLE IF NOT EXISTS _sqlx_test.databases (
    db_name text NOT NULL,
    test_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics.analytics_comparison_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    comparison_type text NOT NULL,
    dimension_a text NOT NULL,
    dimension_b text NOT NULL,
    indicators jsonb,
    filters jsonb,
    status text NOT NULL,
    last_run_at timestamp with time zone,
    created_by text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_comparison_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comparison_id uuid NOT NULL,
    status text NOT NULL,
    summary jsonb,
    data jsonb,
    generated_at timestamp with time zone,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_dashboard_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid NOT NULL,
    permission text NOT NULL,
    expires_at timestamp with time zone,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    shared_with text[]
);

CREATE TABLE IF NOT EXISTS analytics.analytics_dashboard_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    layout jsonb,
    preview_image text,
    is_active boolean DEFAULT true,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tags text[]
);

CREATE TABLE IF NOT EXISTS analytics.analytics_dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    layout jsonb,
    is_public boolean DEFAULT false,
    auto_refresh_enabled boolean DEFAULT false,
    auto_refresh_interval integer,
    owner_id text NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_datasets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    sql_query text,
    fields jsonb,
    filters jsonb,
    config jsonb,
    is_public boolean DEFAULT false,
    status text NOT NULL,
    published_at timestamp with time zone,
    last_refreshed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_datasources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    source_type text NOT NULL,
    host text,
    port integer,
    database text,
    username text,
    password text,
    connection_string text,
    connection_config jsonb,
    query_template text,
    sync_frequency text,
    is_enabled boolean DEFAULT true,
    status text NOT NULL,
    last_sync timestamp with time zone,
    data_volume bigint,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_drilldown_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    path_id uuid NOT NULL,
    user_id text NOT NULL,
    action text NOT NULL,
    from_level integer NOT NULL,
    to_level integer NOT NULL,
    drill_dimension text,
    drill_value text,
    filters jsonb,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_drilldown_paths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    owner_id text NOT NULL,
    levels jsonb,
    measures jsonb,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_row_level_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    table_name text NOT NULL,
    rule_type text NOT NULL,
    condition jsonb,
    is_active boolean DEFAULT true,
    created_by text NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    role_ids text[],
    user_ids text[]
);

CREATE TABLE IF NOT EXISTS analytics.analytics_self_service_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    datasource_id uuid NOT NULL,
    owner_id text NOT NULL,
    fields jsonb,
    filters jsonb,
    config jsonb,
    is_public boolean DEFAULT false,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_source_id uuid,
    sync_type text,
    status text NOT NULL,
    records_count integer DEFAULT 0,
    affected_records integer DEFAULT 0,
    duration_ms integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.analytics_widgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid,
    datasource_id uuid,
    name text NOT NULL,
    widget_type text NOT NULL,
    config jsonb,
    query_config jsonb,
    "position" jsonb,
    cache_ttl_seconds integer,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.report_execution_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid,
    schedule_name text,
    status text NOT NULL,
    output_path text,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.report_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    template_id uuid,
    schedule_type text,
    schedule_expression text,
    parameters jsonb,
    recipients jsonb,
    status text NOT NULL,
    run_count integer DEFAULT 0,
    last_run_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.report_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid,
    user_id uuid NOT NULL,
    email text,
    frequency text,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    report_type text,
    category text,
    data_source text,
    output_format text,
    columns jsonb,
    filter_config jsonb,
    layout_config jsonb,
    style_config jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS analytics.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    report_type text,
    template_id uuid,
    config jsonb,
    status text NOT NULL,
    last_run_at timestamp with time zone,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE OR REPLACE VIEW bi.report_stats AS
 SELECT report_type,
    status,
    count(*) AS count,
    count(
        CASE
            WHEN (last_generated_at > (CURRENT_TIMESTAMP - '24:00:00'::interval)) THEN 1
            ELSE NULL::integer
        END) AS recently_generated
   FROM bi.reports
  WHERE (is_active = true)
  GROUP BY report_type, status;

CREATE TABLE IF NOT EXISTS communication.core_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_email text NOT NULL,
    to_email text NOT NULL,
    subject character varying(512),
    body text,
    html_body text,
    cc text[],
    bcc text[],
    is_read boolean DEFAULT false,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication.core_location_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name character varying(255),
    location_type character varying(50) NOT NULL,
    coordinates jsonb NOT NULL,
    address text,
    place_name character varying(255),
    place_id character varying(255),
    gis_location_id uuid,
    gis_location_code character varying(100),
    gis_map_id uuid,
    gis_map_name character varying(255),
    map_provider character varying(50) DEFAULT 'osm'::character varying NOT NULL,
    static_map_url text,
    map_zoom integer DEFAULT 15,
    map_bearing double precision,
    map_tilt double precision,
    poi_types jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS communication.core_notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    title_template character varying(256) NOT NULL,
    content_template text NOT NULL,
    notification_type character varying(64) DEFAULT 'info'::character varying,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS communication.core_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(256) NOT NULL,
    content text,
    notification_type character varying(64) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    priority integer DEFAULT 0,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    is_archived boolean DEFAULT false,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    description text,
    icon character varying(64),
    sort_order integer DEFAULT 0,
    plugin_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_name character varying(128),
    rating integer,
    title character varying(256),
    content text,
    is_verified_purchase boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS core.core_plugin_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    version character varying(32) NOT NULL,
    release_notes text,
    is_stable boolean DEFAULT true,
    is_latest boolean DEFAULT false,
    download_url character varying(512),
    checksum character varying(64),
    file_size bigint,
    min_app_version character varying(32),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preference_key text NOT NULL,
    preference_value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS doc_service.core_doc_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS doc_service.core_doc_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS doc_service.core_doc_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS erp.event_idempotency (
    idempotency_key text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS flow.approval_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS flow.approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE IF NOT EXISTS public.core_billing_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    subscription_id uuid,
    invoice_number character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying,
    subtotal_cents integer DEFAULT 0,
    discount_cents integer DEFAULT 0,
    tax_cents integer DEFAULT 0,
    total_cents integer DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    paid_at timestamp with time zone,
    payment_method character varying(64),
    payment_reference character varying(256),
    line_items jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_billing_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    license_type character varying(32) DEFAULT 'subscription'::character varying,
    price_cents integer DEFAULT 0 NOT NULL,
    price_period character varying(32) DEFAULT 'monthly'::character varying,
    included_users integer DEFAULT 5,
    included_storage_gb bigint DEFAULT 5,
    included_api_calls bigint DEFAULT 50000,
    included_modules text[],
    overage_users_cents integer DEFAULT 500,
    overage_storage_cents integer DEFAULT 50,
    overage_api_calls_cents integer DEFAULT 10,
    is_active boolean DEFAULT true,
    is_trial boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_chat_members (
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    tenant_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name character varying(128),
    message_type character varying(32) DEFAULT 'text'::character varying,
    content text NOT NULL,
    file_url character varying(512),
    is_recalled boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128),
    room_type character varying(32) DEFAULT 'private'::character varying,
    creator_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_dashboard_refresh_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module character varying(64) NOT NULL,
    tenant_id uuid NOT NULL,
    refresh_time timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    duration_ms integer,
    row_count integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_dict_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dict_type_id uuid NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    value text,
    sort_order integer DEFAULT 0 NOT NULL,
    parent_id uuid,
    extra_data jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_dict_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_email_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_email character varying(256) NOT NULL,
    to_email character varying(256) NOT NULL,
    subject character varying(512),
    body text,
    html_body text,
    cc text[],
    bcc text[],
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    status character varying(32) DEFAULT 'pending'::character varying,
    error_message text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    subject_template character varying(512) NOT NULL,
    body_template text NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_email character varying(256) NOT NULL,
    to_email character varying(256) NOT NULL,
    subject character varying(512),
    body text,
    html_body text,
    cc text[],
    bcc text[],
    is_read boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    views bigint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_file_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    parent_id uuid,
    owner_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_files (
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
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
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
    tenant_id uuid NOT NULL,
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
    tenant_id uuid NOT NULL,
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
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_inter_module_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sync_type character varying(64) NOT NULL,
    source_module character varying(64) NOT NULL,
    target_module character varying(64) NOT NULL,
    source_entity character varying(128) NOT NULL,
    source_id uuid,
    source_code character varying(128),
    status character varying(32) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    next_retry_at timestamp with time zone,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_login_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    username character varying(64) NOT NULL,
    ip_address character varying(128) NOT NULL,
    user_agent text,
    status character varying(32) NOT NULL,
    error_message text,
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_menu_groups (
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

CREATE TABLE IF NOT EXISTS public.core_menus (
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

CREATE TABLE IF NOT EXISTS public.core_migration_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_name character varying(128) NOT NULL,
    version character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    applied_at timestamp with time zone,
    duration_ms bigint,
    success boolean DEFAULT true,
    error_message text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_mobile_offline_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    module character varying(64) NOT NULL,
    action character varying(64) NOT NULL,
    data jsonb NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    title_template character varying(256) NOT NULL,
    content_template text NOT NULL,
    notification_type character varying(64) DEFAULT 'info'::character varying,
    description text,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(256) NOT NULL,
    content text,
    notification_type character varying(64) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    priority integer DEFAULT 0,
    data jsonb,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    resource character varying(64),
    action character varying(32),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    description text,
    icon character varying(64),
    sort_order integer DEFAULT 0,
    plugin_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    runtime_url character varying(512),
    runtime_status character varying(32) DEFAULT 'stopped'::character varying,
    base_path character varying(128) DEFAULT '/api/plugins/{code}'::character varying,
    last_heartbeat timestamp without time zone,
    started_at timestamp with time zone,
    stopped_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(255),
    resource_type character varying(50),
    action character varying(50),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    plugin_name character varying(128) NOT NULL,
    base_price_cents integer DEFAULT 0,
    per_user_price_cents integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_name character varying(128),
    rating integer,
    title character varying(256),
    content text,
    is_verified_purchase boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS core.core_plugin_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    version character varying(32) NOT NULL,
    release_notes text,
    is_stable boolean DEFAULT true,
    is_latest boolean DEFAULT false,
    download_url character varying(512),
    checksum character varying(64),
    file_size bigint,
    min_app_version character varying(32),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    version character varying(32) NOT NULL,
    plugin_type character varying(32) DEFAULT 'business'::character varying,
    is_installed boolean DEFAULT false,
    installed_at timestamp with time zone,
    is_active boolean DEFAULT false,
    activated_at timestamp with time zone,
    is_free boolean DEFAULT true,
    price_cents integer DEFAULT 0,
    remote_url character varying(512),
    checksum character varying(64),
    entry_point character varying(256),
    dependencies jsonb DEFAULT '[]'::jsonb,
    install_count integer DEFAULT 0,
    rating numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    is_published boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    author_name character varying(128),
    author_url character varying(512),
    homepage_url character varying(512),
    screenshots jsonb DEFAULT '[]'::jsonb,
    tags text[],
    category character varying(64),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    current_period_start date NOT NULL,
    current_period_end date NOT NULL,
    is_trial boolean DEFAULT false,
    trial_ends_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    module_code character varying(64) NOT NULL,
    module_name character varying(128),
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_tenant_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    installed_version character varying(32),
    is_active boolean DEFAULT true,
    license_type character varying(32) DEFAULT 'subscription'::character varying,
    license_expires_at timestamp with time zone,
    purchase_order_id character varying(128),
    activated_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
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

CREATE TABLE IF NOT EXISTS public.core_tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email character varying(256) NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp without time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenants (
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

CREATE TABLE IF NOT EXISTS public.core_usage_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_type character varying(64) NOT NULL,
    metric_name character varying(128),
    quantity bigint DEFAULT 0 NOT NULL,
    unit character varying(32),
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    cost_cents integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(64) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(128),
    phone character varying(32),
    avatar_url character varying(512),
    status character varying(32) DEFAULT 'active'::character varying,
    is_superuser boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_workflow_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    title character varying(256) NOT NULL,
    initiator_id uuid NOT NULL,
    current_node_id character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    variables jsonb,
    tenant_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_workflow_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    node_id character varying(64) NOT NULL,
    assignee_id uuid NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    comment text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
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
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.crm_dashboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    total_opportunities integer DEFAULT 0,
    win_amount numeric(15,2) DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    avg_cycle_days numeric(6,1) DEFAULT 0,
    stage_distribution jsonb DEFAULT '[]'::jsonb,
    trend_data jsonb DEFAULT '[]'::jsonb,
    industry_distribution jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.dynamic_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_id uuid NOT NULL,
    data_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.ehs_dashboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    total_accidents integer DEFAULT 0,
    pending_hazards integer DEFAULT 0,
    training_rate numeric(5,2) DEFAULT 0,
    drill_count integer DEFAULT 0,
    accident_trend jsonb DEFAULT '[]'::jsonb,
    hazard_types jsonb DEFAULT '[]'::jsonb,
    training_trend jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.hrm_dashboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    total_employees integer DEFAULT 0,
    new_hires integer DEFAULT 0,
    on_leave integer DEFAULT 0,
    avg_salary numeric(10,2) DEFAULT 0,
    department_distribution jsonb DEFAULT '[]'::jsonb,
    hire_trend jsonb DEFAULT '[]'::jsonb,
    education_distribution jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.lims_dashboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    pending_samples integer DEFAULT 0,
    in_progress_tasks integer DEFAULT 0,
    instrument_utilization numeric(5,2) DEFAULT 0,
    pass_rate numeric(5,2) DEFAULT 0,
    sample_trend jsonb DEFAULT '[]'::jsonb,
    task_status jsonb DEFAULT '[]'::jsonb,
    instrument_status jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.pdm_dashboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    active_projects integer DEFAULT 0,
    pending_documents integer DEFAULT 0,
    bom_changes integer DEFAULT 0,
    completion_rate numeric(5,2) DEFAULT 0,
    project_distribution jsonb DEFAULT '[]'::jsonb,
    document_types jsonb DEFAULT '[]'::jsonb,
    change_trend jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.schema_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    schema_json jsonb NOT NULL,
    table_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.user_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS iam.wms_dashboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    total_inventory integer DEFAULT 0,
    pending_inbound integer DEFAULT 0,
    pending_outbound integer DEFAULT 0,
    space_utilization numeric(5,2) DEFAULT 0,
    inbound_trend jsonb DEFAULT '[]'::jsonb,
    category_distribution jsonb DEFAULT '[]'::jsonb,
    outbound_trend jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS integration.mes_erp_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_record_id uuid NOT NULL,
    sync_direction character varying(50) NOT NULL,
    sync_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    error_message text,
    attempt integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS integration.mes_qms_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sync_type character varying(50) NOT NULL,
    direction character varying(30) NOT NULL,
    mes_record_id uuid,
    mes_record_type character varying(50),
    qms_inspection_id uuid,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256),
    product_code character varying(64),
    batch_no character varying(64),
    quantity numeric(12,2),
    synced boolean DEFAULT false NOT NULL,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sync_error text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 5 NOT NULL,
    payload jsonb,
    result_payload jsonb,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS master_data.core_master_data_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS master_data.core_master_data_event_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS master_data.core_master_data_refs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS master_data.core_mdm_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS master_data.core_mdm_reconciliation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


CREATE TABLE IF NOT EXISTS mes.bom_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bom_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    specification character varying(256),
    unit character varying(32) NOT NULL,
    quantity numeric(12,4) NOT NULL,
    loss_rate numeric(5,4) DEFAULT 0,
    sequence integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_billing_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    subscription_id uuid,
    invoice_number character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying,
    subtotal_cents integer DEFAULT 0,
    discount_cents integer DEFAULT 0,
    tax_cents integer DEFAULT 0,
    total_cents integer DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    paid_at timestamp with time zone,
    payment_method character varying(64),
    payment_reference character varying(256),
    line_items jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_billing_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    license_type character varying(32) DEFAULT 'subscription'::character varying,
    price_cents integer DEFAULT 0 NOT NULL,
    price_period character varying(32) DEFAULT 'monthly'::character varying,
    included_users integer DEFAULT 5,
    included_storage_gb bigint DEFAULT 5,
    included_api_calls bigint DEFAULT 50000,
    included_modules text[],
    overage_users_cents integer DEFAULT 500,
    overage_storage_cents integer DEFAULT 50,
    overage_api_calls_cents integer DEFAULT 10,
    is_active boolean DEFAULT true,
    is_trial boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_chat_members (
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    tenant_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name character varying(128),
    message_type character varying(32) DEFAULT 'text'::character varying,
    content text NOT NULL,
    file_url character varying(512),
    is_recalled boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128),
    room_type character varying(32) DEFAULT 'private'::character varying,
    creator_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_dashboard_refresh_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module character varying(64) NOT NULL,
    tenant_id uuid NOT NULL,
    refresh_time timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    duration_ms integer,
    row_count integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_dict_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dict_type_id uuid NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    value text,
    sort_order integer DEFAULT 0 NOT NULL,
    parent_id uuid,
    extra_data jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_dict_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_email_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_email text NOT NULL,
    to_email text NOT NULL,
    subject character varying(512),
    body text,
    html_body text,
    cc text[],
    bcc text[],
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    status character varying(32) DEFAULT 'pending'::character varying,
    error_message text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    subject_template character varying(512) NOT NULL,
    body_template text NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_email text NOT NULL,
    to_email text NOT NULL,
    subject character varying(512),
    body text,
    html_body text,
    cc text[],
    bcc text[],
    is_read boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    views bigint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_file_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    parent_id uuid,
    owner_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_files (
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
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
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
    tenant_id uuid NOT NULL,
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
    tenant_id uuid NOT NULL,
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
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_inter_module_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sync_type character varying(64) NOT NULL,
    source_module character varying(64) NOT NULL,
    target_module character varying(64) NOT NULL,
    source_entity character varying(128) NOT NULL,
    source_id uuid,
    source_code character varying(128),
    status character varying(32) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    next_retry_at timestamp with time zone,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_login_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    username character varying(64) NOT NULL,
    ip_address character varying(128) NOT NULL,
    user_agent text,
    status character varying(32) NOT NULL,
    error_message text,
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_menu_groups (
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

CREATE TABLE IF NOT EXISTS public.core_menus (
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

CREATE TABLE IF NOT EXISTS public.core_migration_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_name character varying(128) NOT NULL,
    version character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    applied_at timestamp with time zone,
    duration_ms bigint,
    success boolean DEFAULT true,
    error_message text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_mobile_offline_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    module character varying(64) NOT NULL,
    action character varying(64) NOT NULL,
    data jsonb NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    title_template character varying(256) NOT NULL,
    content_template text NOT NULL,
    notification_type character varying(64) DEFAULT 'info'::character varying,
    description text,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(256) NOT NULL,
    content text,
    notification_type character varying(64) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    priority integer DEFAULT 0,
    data jsonb,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    resource character varying(64),
    action character varying(32),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    description text,
    icon character varying(64),
    sort_order integer DEFAULT 0,
    plugin_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    runtime_url character varying(512),
    runtime_status character varying(32) DEFAULT 'stopped'::character varying,
    base_path character varying(128) DEFAULT '/api/plugins/{code}'::character varying,
    last_heartbeat timestamp with time zone,
    started_at timestamp with time zone,
    stopped_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(255),
    resource_type character varying(50),
    action character varying(50),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    plugin_name character varying(128) NOT NULL,
    base_price_cents integer DEFAULT 0,
    per_user_price_cents integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugin_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_name character varying(128),
    rating integer,
    title character varying(256),
    content text,
    is_verified_purchase boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS core.core_plugin_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    version character varying(32) NOT NULL,
    release_notes text,
    is_stable boolean DEFAULT true,
    is_latest boolean DEFAULT false,
    download_url character varying(512),
    checksum character varying(64),
    file_size bigint,
    min_app_version character varying(32),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    version character varying(32) NOT NULL,
    plugin_type character varying(32) DEFAULT 'business'::character varying,
    is_installed boolean DEFAULT false,
    installed_at timestamp with time zone,
    is_active boolean DEFAULT false,
    activated_at timestamp with time zone,
    is_free boolean DEFAULT true,
    price_cents integer DEFAULT 0,
    remote_url character varying(512),
    checksum character varying(64),
    entry_point character varying(256),
    dependencies jsonb DEFAULT '[]'::jsonb,
    install_count integer DEFAULT 0,
    rating numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    is_published boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    author_name character varying(128),
    author_url character varying(512),
    homepage_url character varying(512),
    screenshots jsonb DEFAULT '[]'::jsonb,
    tags text[],
    category character varying(64),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    current_period_start date NOT NULL,
    current_period_end date NOT NULL,
    is_trial boolean DEFAULT false,
    trial_ends_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    module_code character varying(64) NOT NULL,
    module_name character varying(128),
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS core.core_tenant_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    installed_version character varying(32),
    is_active boolean DEFAULT true,
    license_type character varying(32) DEFAULT 'subscription'::character varying,
    license_expires_at timestamp with time zone,
    purchase_order_id character varying(128),
    activated_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
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

CREATE TABLE IF NOT EXISTS public.core_tenant_users (
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

CREATE TABLE IF NOT EXISTS public.core_tenants (
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

CREATE TABLE IF NOT EXISTS public.core_usage_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_type character varying(64) NOT NULL,
    metric_name character varying(128),
    quantity bigint DEFAULT 0 NOT NULL,
    unit character varying(32),
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    cost_cents integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(64) NOT NULL,
    email text NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(128),
    phone text,
    avatar_url character varying(512),
    status character varying(32) DEFAULT 'active'::character varying,
    is_superuser boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_workflow_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    title character varying(256) NOT NULL,
    initiator_id uuid NOT NULL,
    current_node_id character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    variables jsonb,
    tenant_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_workflow_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    node_id character varying(64) NOT NULL,
    assignee_id uuid NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    comment text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
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
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.dashboard_stats (
    id integer NOT NULL,
    tenant_id uuid NOT NULL,
    key character varying(100) NOT NULL,
    value character varying(255) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.financial_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    record_type character varying(50) NOT NULL,
    category character varying(255) NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text,
    transaction_date date NOT NULL,
    payment_method character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.inspection_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    inspector character varying(255),
    inspection_time timestamp with time zone NOT NULL,
    issues text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.material_issue_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    unit character varying(32) NOT NULL,
    planned_quantity numeric(12,4) NOT NULL,
    actual_quantity numeric(12,4) NOT NULL,
    batch_no character varying(64),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.permission_audit_logs (
    id bigint NOT NULL,
    tenant_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    action character varying(32) NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by character varying(64) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    details jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_action CHECK (((action)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying, 'activate'::character varying, 'deactivate'::character varying, 'role_change'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS mes.schema_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    schema_json jsonb NOT NULL,
    table_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.supply_chain_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    order_type character varying(50) NOT NULL,
    supplier_customer character varying(255) NOT NULL,
    product_name character varying(255) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    order_date date NOT NULL,
    delivery_date date,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS mes.tenant_permissions (
    id bigint NOT NULL,
    tenant_id character varying(64) NOT NULL,
    user_id character varying(64) NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_role CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS mes.tool_permissions (
    id bigint NOT NULL,
    tenant_permission_id bigint NOT NULL,
    tool_name character varying(64) NOT NULL,
    max_permission character varying(16) DEFAULT 'read'::character varying NOT NULL,
    allowed_operations text[],
    denied_operations text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_max_permission CHECK (((max_permission)::text = ANY ((ARRAY['read'::character varying, 'write'::character varying, 'admin'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS mobile.push_config (
    tenant_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    channel_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public._archive_core_workflow_versions (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT core_workflow_versions_id_not_null NOT NULL,
    workflow_id uuid,
    version integer,
    definition jsonb,
    isactive boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT core_workflow_versions_created_at_not_null NOT NULL,
    updated_at timestamp with time zone DEFAULT now() CONSTRAINT core_workflow_versions_updated_at_not_null NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.analytics_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.barcode_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    barcode character varying(500) NOT NULL,
    barcode_type character varying(50) NOT NULL,
    decoded_data text NOT NULL,
    location_lat double precision,
    location_lng double precision,
    result_action character varying(100),
    result_data jsonb,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.conversion_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.conversion_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_account_opening_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    account_type public.account_type,
    level integer DEFAULT 1 NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    is_enabled boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name_en character varying(255),
    full_name character varying(500),
    balance_direction character varying(20),
    type character varying(50),
    parent_code character varying(50),
    haschildren boolean DEFAULT false,
    is_cash_flow boolean DEFAULT false,
    enable_quantity boolean DEFAULT false,
    unit character varying(50),
    enable_foreign_currency boolean DEFAULT false,
    default_currency character varying(10),
    is_detail boolean DEFAULT false,
    status character varying(20) DEFAULT 'active'::character varying,
    isactive boolean DEFAULT true,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_approval_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_aux_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_aux_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_reconciliation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_reconciliation_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_voucher_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_voucher_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_voucher_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_finance_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    voucher_no character varying(50) NOT NULL,
    voucher_date timestamp without time zone NOT NULL,
    period character varying(6) NOT NULL,
    voucher_type public.voucher_type NOT NULL,
    total_debit numeric(18,4) DEFAULT 0 NOT NULL,
    total_credit numeric(18,4) DEFAULT 0 NOT NULL,
    status public.voucher_status DEFAULT 'draft'::public.voucher_status NOT NULL,
    description text,
    created_by character varying(100) NOT NULL,
    approved_by character varying(100),
    posted_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    voucher_number character varying(100),
    year integer,
    month integer,
    total_amount numeric(18,2),
    currency_code character varying(10) DEFAULT 'CNY'::character varying,
    submitter_id uuid,
    submitter_name character varying(255),
    maker_id uuid,
    maker_name character varying(255),
    submitted_at timestamp with time zone,
    approver_id uuid,
    approver_name character varying(255),
    checker_id uuid,
    checker_name character varying(255),
    approved_at timestamp with time zone,
    poster_id uuid,
    poster_name character varying(255),
    bookkeeper_id uuid,
    bookkeeper_name character varying(255),
    posted_at timestamp with time zone,
    is_reversed boolean DEFAULT false,
    reverse_voucher_id uuid,
    reversed_at timestamp with time zone,
    attachment_count integer DEFAULT 0,
    summary text,
    source_module character varying(50),
    source_id character varying(100),
    updated_by uuid,
    template_id uuid
);

CREATE TABLE IF NOT EXISTS public.core_flow_categories (
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

CREATE TABLE IF NOT EXISTS public.core_flow_delegates (
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

CREATE TABLE IF NOT EXISTS public.core_flow_rules (
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

CREATE TABLE IF NOT EXISTS public.core_flow_variable_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variable_id uuid,
    var_key character varying(128) NOT NULL,
    var_value jsonb NOT NULL,
    value_type character varying(32),
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_flow_variables (
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

CREATE TABLE IF NOT EXISTS public.core_geofences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_inter_module_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_plugin_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_plugin_navigation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_plugin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_plugin_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_plugin_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_refresh_tokens (
    user_id uuid NOT NULL,
    token_hash character varying(255),
    ip_address inet,
    user_agent text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone,
    revoked_reason character varying(255),
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_sessions (
    user_id uuid NOT NULL,
    token_hash character varying(255),
    ip_address inet,
    user_agent text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tenant_plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_ticket_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_ticket_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_ticket_sla_escalations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_ticket_sla_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.core_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_id character varying(255) NOT NULL,
    device_name character varying(255) NOT NULL,
    device_type character varying(100) NOT NULL,
    os_type character varying(100) NOT NULL,
    os_version character varying(50) NOT NULL,
    app_version character varying(50) NOT NULL,
    push_token character varying(512),
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.equipment_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_boms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_issue_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_requirement_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_return_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.material_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.media_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_url character varying(500),
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    uploaded_by character varying(255) NOT NULL,
    uploaded_by_name character varying(255),
    description text,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.mobile_scan_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scan_type character varying(100) NOT NULL,
    scan_data text NOT NULL,
    result_data jsonb,
    location_lat double precision,
    location_lng double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.mobile_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nickname character varying(255),
    phone text,
    email text,
    avatar_url character varying(500),
    department character varying(255),
    "position" character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.offline_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    operation_type character varying(50) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(255),
    operation_data jsonb NOT NULL,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sync_attempts integer DEFAULT 0 NOT NULL,
    last_sync_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    synced_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.offline_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sync_type character varying(100) NOT NULL,
    sync_data jsonb NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    synced_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.pdm_change_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    change_no character varying(50) DEFAULT ''::character varying NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ecn_no character varying(50),
    priority character varying(50),
    change_type character varying(50),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.pdm_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    material_no character varying(50) DEFAULT ''::character varying NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    spec character varying(255),
    unit character varying(50),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.pdm_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying NOT NULL,
    code character varying DEFAULT ''::character varying NOT NULL,
    status character varying DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    product_no character varying(50) DEFAULT ''::character varying NOT NULL,
    description text,
    version character varying(50),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.photo_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    width integer,
    height integer,
    compression_ratio double precision,
    has_watermark boolean DEFAULT false NOT NULL,
    watermark_text character varying(255),
    upload_status character varying(50) DEFAULT 'uploading'::character varying NOT NULL,
    upload_progress integer DEFAULT 0 NOT NULL,
    thumbnail_url character varying(500),
    location_lat double precision,
    location_lng double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.push_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_token character varying(512) NOT NULL,
    platform character varying(50) NOT NULL,
    device_model character varying(255) NOT NULL,
    app_version character varying(50) NOT NULL,
    os_version character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.push_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    notification_type character varying(100) DEFAULT 'info'::character varying NOT NULL,
    data jsonb,
    target_type character varying(50) NOT NULL,
    target_ids text[] NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    delivered_count integer DEFAULT 0 NOT NULL,
    clicked_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.push_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    title_template text NOT NULL,
    body_template text NOT NULL,
    notification_type character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_accident_investigations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    team jsonb,
    findings text,
    root_cause text,
    timeline jsonb,
    status character varying(32) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_accident_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    summary text,
    lessons_learned jsonb,
    recommendations jsonb,
    reviewer character varying(64),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_accident_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    actions jsonb,
    responsible character varying(64),
    status character varying(32) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_accidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    accident_type character varying(64),
    severity character varying(32),
    location character varying(128),
    occurred_at timestamp with time zone,
    casualties integer,
    economic_loss numeric(12,2),
    status character varying(32) DEFAULT 'reported'::character varying,
    reported_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_compliance_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eval_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    eval_type character varying(64) NOT NULL,
    eval_period character varying(128),
    start_date date,
    end_date date,
    evaluator character varying(64),
    status character varying(32) DEFAULT 'in_progress'::character varying,
    overall_result character varying(32),
    compliance_rate numeric(5,2),
    findings text,
    improvements text,
    evaluated_at timestamp with time zone,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_compliance_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evaluation_id uuid,
    regulation_id uuid,
    regulation_title character varying(256),
    item_description text,
    compliance_status character varying(32) NOT NULL,
    evidence text,
    issues text,
    corrective_action text,
    responsible_person character varying(64),
    deadline date,
    status character varying(32) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_contraindications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(64) NOT NULL,
    department character varying(128),
    "position" character varying(128),
    contraindication_type character varying(64) NOT NULL,
    description text,
    diagnosed_at date,
    hospital character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    work_restriction text,
    advised_position character varying(128),
    follow_up_date date,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_detection_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    factor_id uuid,
    factor_name character varying(256) NOT NULL,
    factor_type character varying(64),
    detect_point character varying(256) NOT NULL,
    detect_date date,
    detect_agency character varying(256),
    detect_method character varying(128),
    concentration character varying(64),
    unit character varying(32),
    standard_value character varying(64),
    result character varying(32),
    detector character varying(64),
    status character varying(32) DEFAULT 'completed'::character varying,
    remarks text,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_discharge_permits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    permit_no character varying(64) NOT NULL,
    permit_type character varying(64) NOT NULL,
    permit_name character varying(256),
    issuing_authority character varying(256),
    issued_date date,
    valid_from date,
    valid_to date,
    status character varying(32) DEFAULT 'valid'::character varying,
    pollutant_list jsonb,
    discharge_standard character varying(256),
    total_amount_limit text,
    discharge_location character varying(256),
    holder character varying(256),
    attachments jsonb,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_disease_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_no character varying(64) NOT NULL,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(64) NOT NULL,
    department character varying(128),
    "position" character varying(128),
    disease_type character varying(64) NOT NULL,
    disease_name character varying(256) NOT NULL,
    severity character varying(32),
    diagnosed_at date,
    diagnosing_hospital character varying(256),
    diagnosis_basis text,
    status character varying(32) DEFAULT 'active'::character varying,
    treatment_plan text,
    work_arrangement text,
    compensation_status character varying(32),
    outcome text,
    closed_at timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_drill_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drill_id uuid,
    evaluator character varying(64),
    overall_score integer,
    overall_comment text,
    objectives_met boolean,
    response_time_score integer,
    coordination_score integer,
    procedure_score integer,
    equipment_score integer,
    evaluated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_drill_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    drill_type character varying(64),
    plan_date date,
    location character varying(256),
    participants integer,
    estimated_duration integer,
    content text,
    organizer character varying(64),
    status character varying(32) DEFAULT 'planned'::character varying,
    related_plan_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_drill_problems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drill_id uuid,
    description text NOT NULL,
    category character varying(64),
    severity character varying(32),
    responsible_person character varying(64),
    deadline date,
    status character varying(32) DEFAULT 'pending'::character varying,
    rectification_measures text,
    rectified_at timestamp with time zone,
    verifier character varying(64),
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_drill_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    plan_id uuid,
    title character varying(256) NOT NULL,
    drill_type character varying(64),
    location character varying(256),
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration integer,
    participants integer,
    participant_list jsonb,
    content text,
    actual_content text,
    organizer character varying(64),
    recorder character varying(64),
    status character varying(32) DEFAULT 'in_progress'::character varying,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_emergency_plan_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    approver character varying(64),
    approver_role character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    opinion text,
    approved_at timestamp with time zone,
    order_num integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_emergency_plan_supplies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    name character varying(256) NOT NULL,
    specification character varying(256),
    quantity integer DEFAULT 0,
    unit character varying(32),
    storage_location character varying(256),
    responsible_person character varying(64),
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_emergency_plan_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    version character varying(32) NOT NULL,
    change_description text,
    changed_by character varying(64),
    changed_at timestamp with time zone,
    content text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_emergency_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    category character varying(64),
    version character varying(32),
    status character varying(32) DEFAULT 'draft'::character varying,
    scope text,
    emergency_level character varying(32),
    responsible_dept character varying(128),
    responsible_person character varying(64),
    contact_phone text,
    content text,
    created_by character varying(64),
    approved_by character varying(64),
    approved_at timestamp with time zone,
    effective_date date,
    expiry_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_employees (
    id uuid NOT NULL,
    employee_no character varying(64),
    name character varying(128) NOT NULL,
    email text,
    department_id uuid,
    department_name character varying(128),
    "position" character varying(128),
    status character varying(32) DEFAULT 'active'::character varying,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_env_monitor_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    monitor_type character varying(64) NOT NULL,
    monitor_point character varying(256) NOT NULL,
    monitor_date date,
    monitor_agency character varying(256),
    monitor_method character varying(128),
    pollutant character varying(128),
    concentration character varying(64),
    unit character varying(32),
    standard_value character varying(64),
    standard_type character varying(64),
    result character varying(32),
    flow_rate character varying(64),
    emission_rate character varying(64),
    status character varying(32) DEFAULT 'completed'::character varying,
    remarks text,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_environment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    monitor_type character varying(64),
    monitor_point character varying(128),
    data jsonb,
    status character varying(32) DEFAULT 'normal'::character varying,
    monitored_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_environment_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    incident_type character varying(64) NOT NULL,
    level character varying(32),
    location character varying(256),
    occurred_at timestamp with time zone,
    reported_by character varying(64),
    reported_at timestamp with time zone,
    description text,
    cause text,
    impact text,
    immediate_measures text,
    status character varying(32) DEFAULT 'reported'::character varying,
    responsible_person character varying(64),
    investigation_result text,
    corrective_actions text,
    preventive_measures text,
    closed_at timestamp with time zone,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_environmental_regulations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reg_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    category character varying(64) NOT NULL,
    regulation_type character varying(64),
    issuing_authority character varying(256),
    issued_date date,
    effective_date date,
    expiry_date date,
    status character varying(32) DEFAULT 'active'::character varying,
    content text,
    applicability text,
    related_files jsonb,
    version character varying(32),
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_hazard_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    factor_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    factor_type character varying(64) NOT NULL,
    category character varying(64),
    description text,
    hazard_level character varying(32),
    exposure_limit character varying(128),
    unit character varying(32),
    sources jsonb,
    affected_positions jsonb,
    affected_count integer,
    status character varying(32) DEFAULT 'active'::character varying,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_hazard_rectifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_id uuid,
    description text,
    responsible character varying(64),
    deadline date,
    status character varying(32) DEFAULT 'in_progress'::character varying,
    progress integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_hazard_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_id uuid,
    verifier character varying(64),
    result character varying(32),
    remarks text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_hazardous_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    alias character varying(256),
    english_name character varying(256),
    cas_no character varying(64),
    category character varying(64) NOT NULL,
    hazard_level character varying(32),
    hazard_class jsonb,
    specification character varying(256),
    unit character varying(32),
    packaging character varying(128),
    storage_condition text,
    storage_location character varying(256),
    max_stock numeric(12,2),
    min_stock numeric(12,2),
    current_stock numeric(12,2),
    safety_data_sheet text,
    emergency_measures text,
    supplier character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_hazards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    category character varying(64),
    level character varying(32),
    source character varying(64),
    location character varying(128),
    reported_by character varying(64),
    reported_at timestamp with time zone,
    status character varying(32) DEFAULT 'reported'::character varying,
    inspection_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_health_abnormalities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(64) NOT NULL,
    item_name character varying(128) NOT NULL,
    item_result character varying(128),
    reference_range character varying(128),
    severity character varying(32),
    status character varying(32) DEFAULT 'pending'::character varying,
    follow_up_advice text,
    follow_up_date date,
    follow_up_result text,
    responsible_person character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_health_exam_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    exam_type character varying(64),
    plan_date date,
    end_date date,
    location character varying(256),
    hospital character varying(256),
    participants_count integer,
    status character varying(32) DEFAULT 'planned'::character varying,
    organizer character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_health_exam_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    plan_id uuid,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(64) NOT NULL,
    department character varying(128),
    "position" character varying(128),
    exam_type character varying(64),
    exam_date date,
    hospital character varying(256),
    overall_result character varying(32),
    blood_pressure character varying(32),
    heart_rate integer,
    vision character varying(64),
    hearing character varying(64),
    lung_function character varying(64),
    liver_function character varying(64),
    kidney_function character varying(64),
    blood_routine character varying(64),
    urine_routine character varying(64),
    chest_xray character varying(64),
    ecg character varying(64),
    abnormal_items jsonb,
    diagnosis text,
    doctor_advice text,
    doctor character varying(64),
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_health_trainings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    training_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    training_type character varying(64),
    content text,
    trainer character varying(64),
    training_date date,
    location character varying(256),
    participants_count integer,
    duration_hours integer,
    status character varying(32) DEFAULT 'completed'::character varying,
    pass_rate numeric(5,2),
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_inspection_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    item_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    category character varying(64),
    standard text,
    order_num integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_inspection_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    inspection_type character varying(64),
    frequency character varying(32),
    start_date date,
    end_date date,
    inspector character varying(64),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_inspection_record_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid,
    item_id uuid,
    item_title character varying(256) NOT NULL,
    item_category character varying(64),
    result character varying(32),
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_inspection_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    plan_id uuid,
    title character varying(256) NOT NULL,
    inspection_type character varying(64),
    location character varying(128),
    inspector character varying(64),
    inspected_at timestamp with time zone,
    result character varying(32),
    issues jsonb,
    attachments jsonb,
    status character varying(32) DEFAULT 'in_progress'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_material_stocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid,
    material_name character varying(256) NOT NULL,
    batch_no character varying(64),
    quantity numeric(12,2) DEFAULT 0 NOT NULL,
    unit character varying(32),
    storage_location character varying(256),
    received_date date,
    expiry_date date,
    supplier character varying(256),
    status character varying(32) DEFAULT 'normal'::character varying,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_msds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid,
    material_name character varying(256) NOT NULL,
    version character varying(32),
    ingredients text,
    hazard_identification text,
    first_aid_measures text,
    fire_fighting_measures text,
    accidental_release_measures text,
    handling_and_storage text,
    exposure_control text,
    physical_chemical_properties text,
    stability_reactivity text,
    toxicological_info text,
    ecological_info text,
    disposal_considerations text,
    transport_info text,
    regulatory_info text,
    other_info text,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_protection_measures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    measure_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    measure_type character varying(64) NOT NULL,
    description text,
    related_factors jsonb,
    related_positions jsonb,
    implementation_date date,
    status character varying(32) DEFAULT 'active'::character varying,
    responsible_person character varying(64),
    effectiveness character varying(32),
    inspection_date date,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    risk_type character varying(64),
    hazard_factor character varying(128),
    likelihood integer,
    severity integer,
    risk_level character varying(32),
    control_measures text,
    status character varying(32) DEFAULT 'identified'::character varying,
    assessed_by character varying(64),
    assessed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_stock_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    material_id uuid,
    material_name character varying(256) NOT NULL,
    record_type character varying(32) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    unit character varying(32),
    batch_no character varying(64),
    related_order character varying(64),
    operator character varying(64),
    operation_time timestamp with time zone,
    from_location character varying(256),
    to_location character varying(256),
    recipient character varying(64),
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_no character varying(64) NOT NULL,
    sync_type character varying(32) NOT NULL,
    source_id uuid,
    target_service character varying(32) NOT NULL,
    target_id uuid,
    status character varying(32) DEFAULT 'pending'::character varying,
    payload jsonb,
    response jsonb,
    error_msg text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_ehs_trainings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    training_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    content text,
    trainer character varying(64),
    training_type character varying(64),
    duration_hours integer,
    scheduled_at timestamp with time zone,
    status character varying(32) DEFAULT 'scheduled'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_calibration_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    instrument_id uuid NOT NULL,
    instrument_no character varying(64) NOT NULL,
    instrument_name character varying(256) NOT NULL,
    calibrated_by character varying(64) NOT NULL,
    calibration_date timestamp with time zone NOT NULL,
    next_calibration_date timestamp with time zone,
    calibration_result character varying(32) NOT NULL,
    parameters jsonb,
    notes text,
    certificate_no character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_inspection_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    report_no character varying(64) NOT NULL,
    sample_id uuid NOT NULL,
    sample_no character varying(64) NOT NULL,
    sample_name character varying(256) NOT NULL,
    inspection_date timestamp with time zone,
    inspector character varying(64),
    inspection_items jsonb,
    conclusion character varying(32),
    remark text,
    status character varying(32) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_instruments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    instrument_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    model character varying(128),
    manufacturer character varying(128),
    status character varying(32) DEFAULT 'normal'::character varying,
    location character varying(128),
    last_calibration_at timestamp with time zone,
    next_calibration_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    process_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    steps jsonb,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_reagent_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    reagent_id uuid NOT NULL,
    reagent_no character varying(64) NOT NULL,
    reagent_name character varying(256) NOT NULL,
    alert_type character varying(32) NOT NULL,
    current_value numeric(12,2),
    threshold_value numeric(12,2),
    unit character varying(32),
    message text NOT NULL,
    is_resolved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_reagent_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    reagent_id uuid NOT NULL,
    adjustment_type character varying(16) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    reason text,
    operator character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_reagents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    reagent_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    specification character varying(128),
    manufacturer character varying(128),
    batch_no character varying(64),
    quantity numeric(12,2),
    unit character varying(32),
    status character varying(32) DEFAULT 'normal'::character varying,
    expired_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    record_no character varying(64) NOT NULL,
    task_id uuid NOT NULL,
    test_data jsonb NOT NULL,
    conclusion character varying(256) NOT NULL,
    recorded_by character varying(64) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lab_sample_lifecycle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    sample_id uuid NOT NULL,
    sample_no character varying(64) NOT NULL,
    lifecycle_stage character varying(32) NOT NULL,
    stage_description text,
    operator character varying(64),
    notes text,
    location character varying(128),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    action character varying(64) NOT NULL,
    entity_type character varying(64),
    entity_id uuid,
    entity_ids jsonb,
    user_id character varying(64),
    user_name character varying(128),
    request_details jsonb,
    response_details jsonb,
    status character varying(32) DEFAULT 'success'::character varying,
    error_message text,
    ip_address character varying(128),
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_barcode_scan_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    barcode_id uuid NOT NULL,
    barcode character varying(128) NOT NULL,
    scan_type character varying(32) NOT NULL,
    sample_id uuid,
    sample_no character varying(64),
    operator character varying(64),
    location character varying(128),
    notes text,
    scanned_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_collection_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    task_no character varying(64) NOT NULL,
    task_name character varying(256) NOT NULL,
    instrument_id uuid,
    protocol character varying(32) DEFAULT 'JSON'::character varying NOT NULL,
    collection_mode character varying(32) DEFAULT 'manual'::character varying,
    cron_expression character varying(128),
    interval_minutes integer,
    parse_rule_id uuid,
    status character varying(32) DEFAULT 'active'::character varying,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    total_collections bigint DEFAULT 0,
    success_count bigint DEFAULT 0,
    failed_count bigint DEFAULT 0,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_instrument_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    data_no character varying(64) NOT NULL,
    instrument_id uuid,
    batch_no character varying(64) NOT NULL,
    protocol character varying(32) DEFAULT 'JSON'::character varying NOT NULL,
    raw_data jsonb,
    parsed_data jsonb,
    status character varying(32) DEFAULT 'pending'::character varying,
    quality_score numeric(5,2),
    error_msg text,
    collected_at timestamp with time zone,
    parsed_at timestamp with time zone,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_method_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    category_code character varying(64) NOT NULL,
    category_name character varying(256) NOT NULL,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    description text,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_method_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    method_id uuid NOT NULL,
    method_code character varying(64) NOT NULL,
    method_name character varying(256) NOT NULL,
    version character varying(32) NOT NULL,
    validation_type character varying(64) NOT NULL,
    validation_date timestamp with time zone NOT NULL,
    validated_by character varying(64) NOT NULL,
    conclusion character varying(64) NOT NULL,
    parameters jsonb,
    report_url character varying(512),
    notes text,
    status character varying(32) DEFAULT 'completed'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_method_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    method_id uuid NOT NULL,
    version character varying(32) NOT NULL,
    version_description text,
    change_log text,
    is_current boolean DEFAULT false,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_parse_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    rule_no character varying(64) NOT NULL,
    rule_name character varying(256) NOT NULL,
    protocol character varying(32) DEFAULT 'JSON'::character varying NOT NULL,
    instrument_type character varying(64),
    parse_config jsonb,
    quality_rules jsonb,
    status character varying(32) DEFAULT 'active'::character varying,
    version character varying(32) DEFAULT '1.0'::character varying,
    description text,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_pt_corrective_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    plan_id uuid NOT NULL,
    plan_no character varying(64) NOT NULL,
    evaluation_id uuid NOT NULL,
    unsatisfactory_item character varying(256) NOT NULL,
    root_cause text,
    corrective_measures text,
    responsible_person character varying(64),
    deadline timestamp with time zone,
    status character varying(32) DEFAULT 'pending'::character varying,
    verification_result text,
    verified_by character varying(64),
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_pt_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    plan_id uuid NOT NULL,
    plan_no character varying(64) NOT NULL,
    sample_id uuid NOT NULL,
    sample_code character varying(128) NOT NULL,
    test_item character varying(256) NOT NULL,
    test_result numeric(18,6),
    assigned_value numeric(18,6),
    standard_deviation numeric(18,6),
    z_score numeric(10,4),
    en_score numeric(10,4),
    measurement_uncertainty numeric(18,6),
    reference_uncertainty numeric(18,6),
    evaluation_method character varying(32),
    evaluation_result character varying(32),
    evaluated_by character varying(64),
    evaluated_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_pt_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    plan_no character varying(64) NOT NULL,
    plan_name character varying(256) NOT NULL,
    provider character varying(256),
    test_item character varying(256),
    test_method character varying(256),
    plan_year character varying(16),
    sample_type character varying(64),
    expected_result jsonb,
    registration_date timestamp with time zone,
    test_deadline timestamp with time zone,
    report_deadline timestamp with time zone,
    status character varying(32) DEFAULT 'planning'::character varying,
    contact_person character varying(64),
    contact_phone text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_pt_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    plan_id uuid NOT NULL,
    plan_no character varying(64) NOT NULL,
    sample_id uuid NOT NULL,
    sample_code character varying(128) NOT NULL,
    test_item character varying(256) NOT NULL,
    test_result numeric(18,6),
    result_unit character varying(32),
    test_date timestamp with time zone,
    tested_by character varying(64),
    instrument character varying(256),
    test_method character varying(256),
    replicate_results jsonb,
    mean_value numeric(18,6),
    standard_deviation numeric(18,6),
    coefficient_variation numeric(10,4),
    notes text,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_pt_samples (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    plan_id uuid NOT NULL,
    plan_no character varying(64) NOT NULL,
    plan_name character varying(256) NOT NULL,
    sample_code character varying(128) NOT NULL,
    sample_name character varying(256),
    received_date timestamp with time zone,
    received_by character varying(64),
    storage_condition character varying(256),
    sample_status character varying(32) DEFAULT 'received'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_rfid_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    tag_id character varying(128) NOT NULL,
    tag_type character varying(32) DEFAULT 'uhf'::character varying,
    sample_id uuid,
    sample_no character varying(64),
    status character varying(32) DEFAULT 'unused'::character varying,
    assigned_at timestamp with time zone,
    last_read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_sample_barcodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    barcode character varying(128) NOT NULL,
    barcode_type character varying(32) NOT NULL,
    sample_id uuid,
    sample_no character varying(64),
    rfid_tag character varying(128),
    print_count integer DEFAULT 0,
    status character varying(32) DEFAULT 'active'::character varying,
    generated_by character varying(64),
    generated_at timestamp with time zone,
    last_printed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    sync_no character varying(64) NOT NULL,
    sync_type character varying(32) NOT NULL,
    source_id uuid,
    target_service character varying(32) NOT NULL,
    target_id uuid,
    status character varying(32) DEFAULT 'pending'::character varying,
    payload jsonb,
    response jsonb,
    error_msg text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_test_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    method_code character varying(64) NOT NULL,
    method_name character varying(256) NOT NULL,
    category_id uuid,
    standard character varying(256),
    version character varying(32) DEFAULT '1.0'::character varying,
    description text,
    principle text,
    instruments jsonb,
    reagents jsonb,
    parameters jsonb,
    steps jsonb,
    calculation_formula text,
    uncertainty_ref character varying(256),
    status character varying(32) DEFAULT 'draft'::character varying,
    validated boolean DEFAULT false,
    validated_at timestamp with time zone,
    validated_by character varying(64),
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_uncertainty_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    project_id uuid NOT NULL,
    source_id uuid NOT NULL,
    component_type character varying(16) NOT NULL,
    component_name character varying(256) NOT NULL,
    standard_uncertainty numeric(18,6),
    relative_uncertainty numeric(18,6),
    sensitivity_coefficient numeric(18,6),
    degrees_freedom numeric(18,6),
    calculation_method character varying(64),
    parameters jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_uncertainty_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    project_no character varying(64) NOT NULL,
    project_name character varying(256) NOT NULL,
    method_id uuid,
    method_name character varying(256),
    test_item character varying(256),
    measurand character varying(256),
    measurement_range character varying(128),
    unit character varying(32),
    status character varying(32) DEFAULT 'draft'::character varying,
    evaluator character varying(64),
    evaluation_date timestamp with time zone,
    combined_uncertainty numeric(18,6),
    expanded_uncertainty numeric(18,6),
    coverage_factor numeric(10,4) DEFAULT 2.0,
    confidence_level numeric(10,4) DEFAULT 95.0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_lims_uncertainty_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    project_id uuid NOT NULL,
    source_name character varying(256) NOT NULL,
    source_type character varying(32) NOT NULL,
    description text,
    distribution_type character varying(32),
    sensitivity_coefficient numeric(18,6),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.qa_qms_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token character varying(512) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.shortcuts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(100) NOT NULL,
    action_type character varying(100) NOT NULL,
    action_params jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.sync_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    auto_sync_enabled boolean DEFAULT true NOT NULL,
    sync_interval_minutes integer DEFAULT 5 NOT NULL,
    sync_on_network_change boolean DEFAULT true NOT NULL,
    conflict_strategy character varying(50) DEFAULT 'server优先'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    name character varying(128) DEFAULT 'Default Tenant'::character varying NOT NULL,
    slug character varying(64) DEFAULT 'default'::character varying NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    plan character varying(32) DEFAULT 'enterprise'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.ticket_automation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.ticket_knowledge_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);

-- 3) PK/UNIQUE（DO $$ 幂等；conname 同 schema 全局唯一预检）

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'databases_pkey' AND n.nspname = '_sqlx_test') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'databases_pkey' AND n.nspname = '_sqlx_test' AND con.conrelid = to_regclass('"_sqlx_test"."databases"')) THEN
        ALTER TABLE "_sqlx_test"."databases" ADD CONSTRAINT "databases_pkey" PRIMARY KEY (db_name);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_analyses_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_analyses_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_comparison_analyses"')) THEN
        ALTER TABLE "analytics"."analytics_comparison_analyses" ADD CONSTRAINT "analytics_comparison_analyses_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_results_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_comparison_results_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_comparison_results"')) THEN
        ALTER TABLE "analytics"."analytics_comparison_results" ADD CONSTRAINT "analytics_comparison_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_shares_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_shares_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_dashboard_shares"')) THEN
        ALTER TABLE "analytics"."analytics_dashboard_shares" ADD CONSTRAINT "analytics_dashboard_shares_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_templates_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboard_templates_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_dashboard_templates"')) THEN
        ALTER TABLE "analytics"."analytics_dashboard_templates" ADD CONSTRAINT "analytics_dashboard_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboards_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_dashboards_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_dashboards"')) THEN
        ALTER TABLE "analytics"."analytics_dashboards" ADD CONSTRAINT "analytics_dashboards_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasets_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasets_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_datasets"')) THEN
        ALTER TABLE "analytics"."analytics_datasets" ADD CONSTRAINT "analytics_datasets_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasources_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_datasources_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_datasources"')) THEN
        ALTER TABLE "analytics"."analytics_datasources" ADD CONSTRAINT "analytics_datasources_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_history_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_history_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_drilldown_history"')) THEN
        ALTER TABLE "analytics"."analytics_drilldown_history" ADD CONSTRAINT "analytics_drilldown_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_paths_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_drilldown_paths_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_drilldown_paths"')) THEN
        ALTER TABLE "analytics"."analytics_drilldown_paths" ADD CONSTRAINT "analytics_drilldown_paths_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_row_level_permissions_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_row_level_permissions_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_row_level_permissions"')) THEN
        ALTER TABLE "analytics"."analytics_row_level_permissions" ADD CONSTRAINT "analytics_row_level_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_self_service_reports_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_self_service_reports_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_self_service_reports"')) THEN
        ALTER TABLE "analytics"."analytics_self_service_reports" ADD CONSTRAINT "analytics_self_service_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_sync_records_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_sync_records_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_sync_records"')) THEN
        ALTER TABLE "analytics"."analytics_sync_records" ADD CONSTRAINT "analytics_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_widgets_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_widgets_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."analytics_widgets"')) THEN
        ALTER TABLE "analytics"."analytics_widgets" ADD CONSTRAINT "analytics_widgets_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_execution_records_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_execution_records_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."report_execution_records"')) THEN
        ALTER TABLE "analytics"."report_execution_records" ADD CONSTRAINT "report_execution_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_schedules_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_schedules_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."report_schedules"')) THEN
        ALTER TABLE "analytics"."report_schedules" ADD CONSTRAINT "report_schedules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_subscriptions_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_subscriptions_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."report_subscriptions"')) THEN
        ALTER TABLE "analytics"."report_subscriptions" ADD CONSTRAINT "report_subscriptions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_templates_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'report_templates_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."report_templates"')) THEN
        ALTER TABLE "analytics"."report_templates" ADD CONSTRAINT "report_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'reports_pkey' AND n.nspname = 'analytics') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'reports_pkey' AND n.nspname = 'analytics' AND con.conrelid = to_regclass('"analytics"."reports"')) THEN
        ALTER TABLE "analytics"."reports" ADD CONSTRAINT "reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_emails_pkey' AND n.nspname = 'communication') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_emails_pkey' AND n.nspname = 'communication' AND con.conrelid = to_regclass('"communication"."core_emails"')) THEN
        ALTER TABLE "communication"."core_emails" ADD CONSTRAINT "core_emails_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_location_messages_pkey' AND n.nspname = 'communication') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_location_messages_pkey' AND n.nspname = 'communication' AND con.conrelid = to_regclass('"communication"."core_location_messages"')) THEN
        ALTER TABLE "communication"."core_location_messages" ADD CONSTRAINT "core_location_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notification_templates_pkey' AND n.nspname = 'communication') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notification_templates_pkey' AND n.nspname = 'communication' AND con.conrelid = to_regclass('"communication"."core_notification_templates"')) THEN
        ALTER TABLE "communication"."core_notification_templates" ADD CONSTRAINT "core_notification_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notifications_pkey' AND n.nspname = 'communication') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notifications_pkey' AND n.nspname = 'communication' AND con.conrelid = to_regclass('"communication"."core_notifications"')) THEN
        ALTER TABLE "communication"."core_notifications" ADD CONSTRAINT "core_notifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_code_key' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_code_key' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."core_plugin_categories"')) THEN
        ALTER TABLE "core"."core_plugin_categories" ADD CONSTRAINT "core_plugin_categories_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."core_plugin_categories"')) THEN
        ALTER TABLE "core"."core_plugin_categories" ADD CONSTRAINT "core_plugin_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."core_plugin_reviews"')) THEN
        ALTER TABLE "core"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."core_plugin_versions"')) THEN
        ALTER TABLE "core"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_version_key' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_version_key' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."core_plugin_versions"')) THEN
        ALTER TABLE "core"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_plugin_id_version_key" UNIQUE (plugin_id, version);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_preferences_pkey' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_preferences_pkey' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."user_preferences"')) THEN
        ALTER TABLE "core"."user_preferences" ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_preferences_user_id_preference_key_key' AND n.nspname = 'core') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_preferences_user_id_preference_key_key' AND n.nspname = 'core' AND con.conrelid = to_regclass('"core"."user_preferences"')) THEN
        ALTER TABLE "core"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_preference_key_key" UNIQUE (user_id, preference_key);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_pkey' AND n.nspname = 'doc_service') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_documents_pkey' AND n.nspname = 'doc_service' AND con.conrelid = to_regclass('"doc_service"."core_doc_documents"')) THEN
        ALTER TABLE "doc_service"."core_doc_documents" ADD CONSTRAINT "core_doc_documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_pkey' AND n.nspname = 'doc_service') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_folders_pkey' AND n.nspname = 'doc_service' AND con.conrelid = to_regclass('"doc_service"."core_doc_folders"')) THEN
        ALTER TABLE "doc_service"."core_doc_folders" ADD CONSTRAINT "core_doc_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_templates_pkey' AND n.nspname = 'doc_service') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_doc_templates_pkey' AND n.nspname = 'doc_service' AND con.conrelid = to_regclass('"doc_service"."core_doc_templates"')) THEN
        ALTER TABLE "doc_service"."core_doc_templates" ADD CONSTRAINT "core_doc_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'event_idempotency_pkey' AND n.nspname = 'erp') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'event_idempotency_pkey' AND n.nspname = 'erp' AND con.conrelid = to_regclass('"erp"."event_idempotency"')) THEN
        ALTER TABLE "erp"."event_idempotency" ADD CONSTRAINT "event_idempotency_pkey" PRIMARY KEY (idempotency_key);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'approval_records_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'approval_records_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."approval_records"')) THEN
        ALTER TABLE "flow"."approval_records" ADD CONSTRAINT "approval_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'approvals_pkey' AND n.nspname = 'flow') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'approvals_pkey' AND n.nspname = 'flow' AND con.conrelid = to_regclass('"flow"."approvals"')) THEN
        ALTER TABLE "flow"."approvals" ADD CONSTRAINT "approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_tenant_id_invoice_number_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_tenant_id_invoice_number_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_tenant_id_invoice_number_key" UNIQUE (tenant_id, invoice_number);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_billing_plans"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_billing_plans" ADD CONSTRAINT "core_billing_plans_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_billing_plans"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_billing_plans" ADD CONSTRAINT "core_billing_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_members_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_members_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_chat_members"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_chat_members" ADD CONSTRAINT "core_chat_members_pkey" PRIMARY KEY (room_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_messages_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_messages_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_chat_messages"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_chat_messages" ADD CONSTRAINT "core_chat_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_rooms_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_rooms_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_chat_rooms"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_chat_rooms" ADD CONSTRAINT "core_chat_rooms_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dashboard_refresh_log_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dashboard_refresh_log_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_dashboard_refresh_log"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_dashboard_refresh_log" ADD CONSTRAINT "core_dashboard_refresh_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_dict_type_id_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_dict_type_id_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_dict_items" ADD CONSTRAINT "core_dict_items_dict_type_id_code_key" UNIQUE (dict_type_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_dict_items" ADD CONSTRAINT "core_dict_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_dict_types"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_dict_types" ADD CONSTRAINT "core_dict_types_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_dict_types"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_dict_types" ADD CONSTRAINT "core_dict_types_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_queue_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_queue_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_email_queue"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_email_queue" ADD CONSTRAINT "core_email_queue_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_templates_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_templates_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_email_templates"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_email_templates" ADD CONSTRAINT "core_email_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_emails_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_emails_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_emails"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_emails" ADD CONSTRAINT "core_emails_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_faqs"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_faqs" ADD CONSTRAINT "core_faqs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_folders_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_folders_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_file_folders"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_file_folders" ADD CONSTRAINT "core_file_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_files_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_files_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_files"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_files" ADD CONSTRAINT "core_files_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_guide_lessons"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_guide_lessons" ADD CONSTRAINT "core_guide_lessons_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_user_id_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_user_id_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_guide_progress"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_guide_id_user_id_key" UNIQUE (guide_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_guide_progress"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_guides"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_guides" ADD CONSTRAINT "core_guides_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_inter_module_sync_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_inter_module_sync_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_inter_module_sync"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_inter_module_sync" ADD CONSTRAINT "core_inter_module_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_login_logs_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_login_logs_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_login_logs"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_login_logs" ADD CONSTRAINT "core_login_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_menu_groups"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_menu_groups" ADD CONSTRAINT "core_menu_groups_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_tenant_id_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_tenant_id_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_menu_groups"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_menu_groups" ADD CONSTRAINT "core_menu_groups_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_menus" ADD CONSTRAINT "core_menus_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_tenant_id_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_tenant_id_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_menus" ADD CONSTRAINT "core_menus_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_migration_history"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_migration_history" ADD CONSTRAINT "core_migration_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_plugin_name_version_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_plugin_name_version_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_migration_history"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_migration_history" ADD CONSTRAINT "core_migration_history_plugin_name_version_key" UNIQUE (plugin_name, version);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mobile_offline_records_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mobile_offline_records_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_mobile_offline_records"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_mobile_offline_records" ADD CONSTRAINT "core_mobile_offline_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notification_templates_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notification_templates_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_notification_templates"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_notification_templates" ADD CONSTRAINT "core_notification_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notifications_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notifications_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_notifications"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_notifications" ADD CONSTRAINT "core_notifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_permissions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_permissions" ADD CONSTRAINT "core_permissions_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_permissions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_permissions" ADD CONSTRAINT "core_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_categories"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_categories" ADD CONSTRAINT "core_plugin_categories_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_categories"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_categories" ADD CONSTRAINT "core_plugin_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_instances"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_instances" ADD CONSTRAINT "core_plugin_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_plugin_id_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_plugin_id_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_instances"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_instances" ADD CONSTRAINT "core_plugin_instances_plugin_id_key" UNIQUE (plugin_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_permissions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_permissions" ADD CONSTRAINT "core_plugin_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_plugin_code_permission_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_plugin_code_permission_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_permissions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_permissions" ADD CONSTRAINT "core_plugin_permissions_plugin_code_permission_code_key" UNIQUE (plugin_code, permission_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_pricing"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_pricing" ADD CONSTRAINT "core_plugin_pricing_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_plugin_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_plugin_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_pricing"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_pricing" ADD CONSTRAINT "core_plugin_pricing_plugin_code_key" UNIQUE (plugin_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_reviews"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_versions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_version_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_version_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_versions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_plugin_id_version_key" UNIQUE (plugin_id, version);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugins"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugins" ADD CONSTRAINT "core_plugins_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugins"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugins" ADD CONSTRAINT "core_plugins_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_role_permissions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_role_permissions" ADD CONSTRAINT "core_role_permissions_pkey" PRIMARY KEY (role_id, permission_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_name_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_name_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_roles"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_roles" ADD CONSTRAINT "core_roles_name_key" UNIQUE (name);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_roles"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_roles" ADD CONSTRAINT "core_roles_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_tenant_id_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_tenant_id_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_tenant_id_key" UNIQUE (tenant_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_modules"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_modules"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_module_code_key" UNIQUE (tenant_id, module_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_tenant_id_plugin_id_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_tenant_id_plugin_id_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_tenant_id_plugin_id_key" UNIQUE (tenant_id, plugin_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_settings"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_settings"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_setting_key_key" UNIQUE (tenant_id, setting_key);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_usage"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_usage"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_period_start_key" UNIQUE (tenant_id, period_start);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_email_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_email_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_email_key" UNIQUE (tenant_id, email);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_user_id_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_user_id_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_user_id_key" UNIQUE (tenant_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_code_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_code_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenants"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenants" ADD CONSTRAINT "core_tenants_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenants"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenants" ADD CONSTRAINT "core_tenants_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_usage_records_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_usage_records_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_usage_records"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_usage_records" ADD CONSTRAINT "core_usage_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_user_roles"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_user_roles" ADD CONSTRAINT "core_user_roles_pkey" PRIMARY KEY (user_id, role_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_email_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_email_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_users"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_users" ADD CONSTRAINT "core_users_email_key" UNIQUE (email);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_users"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_users" ADD CONSTRAINT "core_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_username_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_username_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_users"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_users" ADD CONSTRAINT "core_users_username_key" UNIQUE (username);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_workflow_instances"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_workflow_tasks"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflows_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflows_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_workflows"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_workflows" ADD CONSTRAINT "core_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'crm_dashboard_snapshots_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'crm_dashboard_snapshots_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."crm_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."crm_dashboard_snapshots" ADD CONSTRAINT "crm_dashboard_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'crm_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'crm_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."crm_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."crm_dashboard_snapshots" ADD CONSTRAINT "crm_dashboard_snapshots_tenant_id_snapshot_date_key" UNIQUE (tenant_id, snapshot_date);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'dynamic_data_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'dynamic_data_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."dynamic_data"')) THEN
        ALTER TABLE "iam"."dynamic_data" ADD CONSTRAINT "dynamic_data_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ehs_dashboard_snapshots_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ehs_dashboard_snapshots_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."ehs_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."ehs_dashboard_snapshots" ADD CONSTRAINT "ehs_dashboard_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ehs_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ehs_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."ehs_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."ehs_dashboard_snapshots" ADD CONSTRAINT "ehs_dashboard_snapshots_tenant_id_snapshot_date_key" UNIQUE (tenant_id, snapshot_date);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'hrm_dashboard_snapshots_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'hrm_dashboard_snapshots_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."hrm_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."hrm_dashboard_snapshots" ADD CONSTRAINT "hrm_dashboard_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'hrm_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'hrm_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."hrm_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."hrm_dashboard_snapshots" ADD CONSTRAINT "hrm_dashboard_snapshots_tenant_id_snapshot_date_key" UNIQUE (tenant_id, snapshot_date);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'lims_dashboard_snapshots_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'lims_dashboard_snapshots_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."lims_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."lims_dashboard_snapshots" ADD CONSTRAINT "lims_dashboard_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'lims_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'lims_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."lims_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."lims_dashboard_snapshots" ADD CONSTRAINT "lims_dashboard_snapshots_tenant_id_snapshot_date_key" UNIQUE (tenant_id, snapshot_date);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'password_reset_tokens_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'password_reset_tokens_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."password_reset_tokens"')) THEN
        ALTER TABLE "iam"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_dashboard_snapshots_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_dashboard_snapshots_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."pdm_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."pdm_dashboard_snapshots" ADD CONSTRAINT "pdm_dashboard_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."pdm_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."pdm_dashboard_snapshots" ADD CONSTRAINT "pdm_dashboard_snapshots_tenant_id_snapshot_date_key" UNIQUE (tenant_id, snapshot_date);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_name_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_name_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."schema_registry"')) THEN
        ALTER TABLE "iam"."schema_registry" ADD CONSTRAINT "schema_registry_name_key" UNIQUE (name);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."schema_registry"')) THEN
        ALTER TABLE "iam"."schema_registry" ADD CONSTRAINT "schema_registry_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_access_logs_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_access_logs_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."user_access_logs"')) THEN
        ALTER TABLE "iam"."user_access_logs" ADD CONSTRAINT "user_access_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_roles_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_roles_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."user_roles"')) THEN
        ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'wms_dashboard_snapshots_pkey' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'wms_dashboard_snapshots_pkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."wms_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."wms_dashboard_snapshots" ADD CONSTRAINT "wms_dashboard_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'wms_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'wms_dashboard_snapshots_tenant_id_snapshot_date_key' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."wms_dashboard_snapshots"')) THEN
        ALTER TABLE "iam"."wms_dashboard_snapshots" ADD CONSTRAINT "wms_dashboard_snapshots_tenant_id_snapshot_date_key" UNIQUE (tenant_id, snapshot_date);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mes_erp_sync_logs_pkey' AND n.nspname = 'integration') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mes_erp_sync_logs_pkey' AND n.nspname = 'integration' AND con.conrelid = to_regclass('"integration"."mes_erp_sync_logs"')) THEN
        ALTER TABLE "integration"."mes_erp_sync_logs" ADD CONSTRAINT "mes_erp_sync_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mes_qms_sync_pkey' AND n.nspname = 'integration') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mes_qms_sync_pkey' AND n.nspname = 'integration' AND con.conrelid = to_regclass('"integration"."mes_qms_sync"')) THEN
        ALTER TABLE "integration"."mes_qms_sync" ADD CONSTRAINT "mes_qms_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_change_log_pkey' AND n.nspname = 'master_data') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_change_log_pkey' AND n.nspname = 'master_data' AND con.conrelid = to_regclass('"master_data"."core_master_data_change_log"')) THEN
        ALTER TABLE "master_data"."core_master_data_change_log" ADD CONSTRAINT "core_master_data_change_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_event_outbox_pkey' AND n.nspname = 'master_data') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_event_outbox_pkey' AND n.nspname = 'master_data' AND con.conrelid = to_regclass('"master_data"."core_master_data_event_outbox"')) THEN
        ALTER TABLE "master_data"."core_master_data_event_outbox" ADD CONSTRAINT "core_master_data_event_outbox_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_pkey' AND n.nspname = 'master_data') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_master_data_refs_pkey' AND n.nspname = 'master_data' AND con.conrelid = to_regclass('"master_data"."core_master_data_refs"')) THEN
        ALTER TABLE "master_data"."core_master_data_refs" ADD CONSTRAINT "core_master_data_refs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_approvals_pkey' AND n.nspname = 'master_data') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_approvals_pkey' AND n.nspname = 'master_data' AND con.conrelid = to_regclass('"master_data"."core_mdm_approvals"')) THEN
        ALTER TABLE "master_data"."core_mdm_approvals" ADD CONSTRAINT "core_mdm_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_reconciliation_log_pkey' AND n.nspname = 'master_data') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mdm_reconciliation_log_pkey' AND n.nspname = 'master_data' AND con.conrelid = to_regclass('"master_data"."core_mdm_reconciliation_log"')) THEN
        ALTER TABLE "master_data"."core_mdm_reconciliation_log" ADD CONSTRAINT "core_mdm_reconciliation_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'bom_items_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'bom_items_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."bom_items"')) THEN
        ALTER TABLE "mes"."bom_items" ADD CONSTRAINT "bom_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_tenant_id_invoice_number_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_tenant_id_invoice_number_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_tenant_id_invoice_number_key" UNIQUE (tenant_id, invoice_number);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_billing_plans"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_billing_plans" ADD CONSTRAINT "core_billing_plans_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_plans_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_billing_plans"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_billing_plans" ADD CONSTRAINT "core_billing_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_members_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_members_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_chat_members"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_chat_members" ADD CONSTRAINT "core_chat_members_pkey" PRIMARY KEY (room_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_messages_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_messages_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_chat_messages"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_chat_messages" ADD CONSTRAINT "core_chat_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_rooms_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_rooms_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_chat_rooms"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_chat_rooms" ADD CONSTRAINT "core_chat_rooms_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dashboard_refresh_log_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dashboard_refresh_log_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_dashboard_refresh_log"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_dashboard_refresh_log" ADD CONSTRAINT "core_dashboard_refresh_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_dict_type_id_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_dict_type_id_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_dict_items" ADD CONSTRAINT "core_dict_items_dict_type_id_code_key" UNIQUE (dict_type_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_dict_items" ADD CONSTRAINT "core_dict_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_dict_types"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_dict_types" ADD CONSTRAINT "core_dict_types_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_types_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_dict_types"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_dict_types" ADD CONSTRAINT "core_dict_types_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_queue_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_queue_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_email_queue"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_email_queue" ADD CONSTRAINT "core_email_queue_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_templates_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_email_templates_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_email_templates"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_email_templates" ADD CONSTRAINT "core_email_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_emails_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_emails_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_emails"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_emails" ADD CONSTRAINT "core_emails_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_faqs_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_faqs"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_faqs" ADD CONSTRAINT "core_faqs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_folders_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_file_folders_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_file_folders"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_file_folders" ADD CONSTRAINT "core_file_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_files_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_files_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_files"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_files" ADD CONSTRAINT "core_files_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_guide_lessons"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_guide_lessons" ADD CONSTRAINT "core_guide_lessons_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_user_id_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_user_id_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_guide_progress"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_guide_id_user_id_key" UNIQUE (guide_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_guide_progress"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guides_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_guides"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_guides" ADD CONSTRAINT "core_guides_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_inter_module_sync_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_inter_module_sync_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_inter_module_sync"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_inter_module_sync" ADD CONSTRAINT "core_inter_module_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_login_logs_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_login_logs_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_login_logs"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_login_logs" ADD CONSTRAINT "core_login_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_menu_groups"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_menu_groups" ADD CONSTRAINT "core_menu_groups_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_tenant_id_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menu_groups_tenant_id_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_menu_groups"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_menu_groups" ADD CONSTRAINT "core_menu_groups_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_menus" ADD CONSTRAINT "core_menus_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_tenant_id_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_tenant_id_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_menus" ADD CONSTRAINT "core_menus_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_migration_history"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_migration_history" ADD CONSTRAINT "core_migration_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_plugin_name_version_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_migration_history_plugin_name_version_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_migration_history"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_migration_history" ADD CONSTRAINT "core_migration_history_plugin_name_version_key" UNIQUE (plugin_name, version);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mobile_offline_records_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_mobile_offline_records_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_mobile_offline_records"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_mobile_offline_records" ADD CONSTRAINT "core_mobile_offline_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notification_templates_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notification_templates_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_notification_templates"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_notification_templates" ADD CONSTRAINT "core_notification_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notifications_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_notifications_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_notifications"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_notifications" ADD CONSTRAINT "core_notifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_permissions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_permissions" ADD CONSTRAINT "core_permissions_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_permissions_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_permissions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_permissions" ADD CONSTRAINT "core_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_categories"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_categories" ADD CONSTRAINT "core_plugin_categories_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_categories"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_categories" ADD CONSTRAINT "core_plugin_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_instances"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_instances" ADD CONSTRAINT "core_plugin_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_plugin_id_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_plugin_id_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_instances"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_instances" ADD CONSTRAINT "core_plugin_instances_plugin_id_key" UNIQUE (plugin_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_permissions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_permissions" ADD CONSTRAINT "core_plugin_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_plugin_code_permission_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_plugin_code_permission_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_permissions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_permissions" ADD CONSTRAINT "core_plugin_permissions_plugin_code_permission_code_key" UNIQUE (plugin_code, permission_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_pricing"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_pricing" ADD CONSTRAINT "core_plugin_pricing_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_plugin_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_pricing_plugin_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_pricing"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_pricing" ADD CONSTRAINT "core_plugin_pricing_plugin_code_key" UNIQUE (plugin_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_reviews"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_versions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_version_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_version_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_versions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_plugin_id_version_key" UNIQUE (plugin_id, version);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugins"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugins" ADD CONSTRAINT "core_plugins_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugins"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugins" ADD CONSTRAINT "core_plugins_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_role_permissions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_role_permissions" ADD CONSTRAINT "core_role_permissions_pkey" PRIMARY KEY (role_id, permission_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_name_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_name_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_roles"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_roles" ADD CONSTRAINT "core_roles_name_key" UNIQUE (name);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_roles_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_roles"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_roles" ADD CONSTRAINT "core_roles_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_tenant_id_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_tenant_id_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_tenant_id_key" UNIQUE (tenant_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_modules"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_module_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_modules"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_module_code_key" UNIQUE (tenant_id, module_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_tenant_id_plugin_id_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_tenant_id_plugin_id_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_tenant_id_plugin_id_key" UNIQUE (tenant_id, plugin_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_settings"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_setting_key_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_settings"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_setting_key_key" UNIQUE (tenant_id, setting_key);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_usage"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_period_start_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_usage"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_period_start_key" UNIQUE (tenant_id, period_start);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_email_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_email_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_email_key" UNIQUE (tenant_id, email);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_user_id_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_user_id_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_user_id_key" UNIQUE (tenant_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_code_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_code_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenants"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenants" ADD CONSTRAINT "core_tenants_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenants_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenants"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenants" ADD CONSTRAINT "core_tenants_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_usage_records_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_usage_records_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_usage_records"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_usage_records" ADD CONSTRAINT "core_usage_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_user_roles"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_user_roles" ADD CONSTRAINT "core_user_roles_pkey" PRIMARY KEY (user_id, role_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_email_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_email_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_users"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_users" ADD CONSTRAINT "core_users_email_key" UNIQUE (email);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_users"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_users" ADD CONSTRAINT "core_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_username_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_users_username_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_users"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_users" ADD CONSTRAINT "core_users_username_key" UNIQUE (username);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_workflow_instances"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_workflow_tasks"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflows_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflows_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_workflows"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_workflows" ADD CONSTRAINT "core_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'dashboard_stats_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'dashboard_stats_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."dashboard_stats"')) THEN
        ALTER TABLE "mes"."dashboard_stats" ADD CONSTRAINT "dashboard_stats_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'financial_records_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'financial_records_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."financial_records"')) THEN
        ALTER TABLE "mes"."financial_records" ADD CONSTRAINT "financial_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'inspection_records_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'inspection_records_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."inspection_records"')) THEN
        ALTER TABLE "mes"."inspection_records" ADD CONSTRAINT "inspection_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_issue_items_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_issue_items_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."material_issue_items"')) THEN
        ALTER TABLE "mes"."material_issue_items" ADD CONSTRAINT "material_issue_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'permission_audit_logs_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'permission_audit_logs_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."permission_audit_logs"')) THEN
        ALTER TABLE "mes"."permission_audit_logs" ADD CONSTRAINT "permission_audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_name_key' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_name_key' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."schema_registry"')) THEN
        ALTER TABLE "mes"."schema_registry" ADD CONSTRAINT "schema_registry_name_key" UNIQUE (name);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'schema_registry_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."schema_registry"')) THEN
        ALTER TABLE "mes"."schema_registry" ADD CONSTRAINT "schema_registry_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supply_chain_orders_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'supply_chain_orders_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."supply_chain_orders"')) THEN
        ALTER TABLE "mes"."supply_chain_orders" ADD CONSTRAINT "supply_chain_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'tenant_permissions_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'tenant_permissions_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."tenant_permissions"')) THEN
        ALTER TABLE "mes"."tenant_permissions" ADD CONSTRAINT "tenant_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'tool_permissions_pkey' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'tool_permissions_pkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."tool_permissions"')) THEN
        ALTER TABLE "mes"."tool_permissions" ADD CONSTRAINT "tool_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'uk_tenant_tool' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'uk_tenant_tool' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."tool_permissions"')) THEN
        ALTER TABLE "mes"."tool_permissions" ADD CONSTRAINT "uk_tenant_tool" UNIQUE (tenant_permission_id, tool_name);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'uk_tenant_user' AND n.nspname = 'mes') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'uk_tenant_user' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."tenant_permissions"')) THEN
        ALTER TABLE "mes"."tenant_permissions" ADD CONSTRAINT "uk_tenant_user" UNIQUE (tenant_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_config_pkey' AND n.nspname = 'mobile') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_config_pkey' AND n.nspname = 'mobile' AND con.conrelid = to_regclass('"mobile"."push_config"')) THEN
        ALTER TABLE "mobile"."push_config" ADD CONSTRAINT "push_config_pkey" PRIMARY KEY (tenant_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_sync_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'analytics_sync_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."analytics_sync_records"')) THEN
        ALTER TABLE "public"."analytics_sync_records" ADD CONSTRAINT "analytics_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'announcements_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'announcements_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."announcements"')) THEN
        ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'barcode_scans_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'barcode_scans_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."barcode_scans"')) THEN
        ALTER TABLE "public"."barcode_scans" ADD CONSTRAINT "barcode_scans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'conversion_executions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'conversion_executions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."conversion_executions"')) THEN
        ALTER TABLE "public"."conversion_executions" ADD CONSTRAINT "conversion_executions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'conversion_rules_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'conversion_rules_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."conversion_rules"')) THEN
        ALTER TABLE "public"."conversion_rules" ADD CONSTRAINT "conversion_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_account_opening_balances_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_account_opening_balances_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_account_opening_balances"')) THEN
        ALTER TABLE "public"."core_finance_account_opening_balances" ADD CONSTRAINT "core_finance_account_opening_balances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_accounts_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_accounts_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_accounts"')) THEN
        ALTER TABLE "public"."core_finance_accounts" ADD CONSTRAINT "core_finance_accounts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_approval_workflows_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_approval_workflows_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_approval_workflows"')) THEN
        ALTER TABLE "public"."core_finance_approval_workflows" ADD CONSTRAINT "core_finance_approval_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_aux_accounts_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_aux_accounts_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_aux_accounts"')) THEN
        ALTER TABLE "public"."core_finance_aux_accounts" ADD CONSTRAINT "core_finance_aux_accounts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_aux_balances_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_aux_balances_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_aux_balances"')) THEN
        ALTER TABLE "public"."core_finance_aux_balances" ADD CONSTRAINT "core_finance_aux_balances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_ledger_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_ledger_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_ledger"')) THEN
        ALTER TABLE "public"."core_finance_ledger" ADD CONSTRAINT "core_finance_ledger_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_periods_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_periods_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_periods"')) THEN
        ALTER TABLE "public"."core_finance_periods" ADD CONSTRAINT "core_finance_periods_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_reconciliation_items_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_reconciliation_items_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_reconciliation_items"')) THEN
        ALTER TABLE "public"."core_finance_reconciliation_items" ADD CONSTRAINT "core_finance_reconciliation_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_reconciliation_sessions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_reconciliation_sessions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_reconciliation_sessions"')) THEN
        ALTER TABLE "public"."core_finance_reconciliation_sessions" ADD CONSTRAINT "core_finance_reconciliation_sessions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_voucher_entries_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_voucher_entries_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_voucher_entries"')) THEN
        ALTER TABLE "public"."core_finance_voucher_entries" ADD CONSTRAINT "core_finance_voucher_entries_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_voucher_lines_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_voucher_lines_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_voucher_lines"')) THEN
        ALTER TABLE "public"."core_finance_voucher_lines" ADD CONSTRAINT "core_finance_voucher_lines_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_voucher_templates_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_voucher_templates_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_voucher_templates"')) THEN
        ALTER TABLE "public"."core_finance_voucher_templates" ADD CONSTRAINT "core_finance_voucher_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_vouchers_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_finance_vouchers_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_finance_vouchers"')) THEN
        ALTER TABLE "public"."core_finance_vouchers" ADD CONSTRAINT "core_finance_vouchers_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_categories_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_categories_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_flow_categories"')) THEN
        ALTER TABLE "public"."core_flow_categories" ADD CONSTRAINT "core_flow_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_delegates_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_delegates_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_flow_delegates"')) THEN
        ALTER TABLE "public"."core_flow_delegates" ADD CONSTRAINT "core_flow_delegates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_rules_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_rules_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_flow_rules"')) THEN
        ALTER TABLE "public"."core_flow_rules" ADD CONSTRAINT "core_flow_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variable_history_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variable_history_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_flow_variable_history"')) THEN
        ALTER TABLE "public"."core_flow_variable_history" ADD CONSTRAINT "core_flow_variable_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variables_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variables_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_flow_variables"')) THEN
        ALTER TABLE "public"."core_flow_variables" ADD CONSTRAINT "core_flow_variables_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_geofences_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_geofences_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_geofences"')) THEN
        ALTER TABLE "public"."core_geofences" ADD CONSTRAINT "core_geofences_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_inter_module_sync_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_inter_module_sync_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_inter_module_sync"')) THEN
        ALTER TABLE "public"."core_inter_module_sync" ADD CONSTRAINT "core_inter_module_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_categories_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_plugin_categories"')) THEN
        ALTER TABLE "public"."core_plugin_categories" ADD CONSTRAINT "core_plugin_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_plugin_instances"')) THEN
        ALTER TABLE "public"."core_plugin_instances" ADD CONSTRAINT "core_plugin_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_navigation_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_navigation_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_plugin_navigation"')) THEN
        ALTER TABLE "public"."core_plugin_navigation" ADD CONSTRAINT "core_plugin_navigation_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_permissions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_plugin_permissions"')) THEN
        ALTER TABLE "public"."core_plugin_permissions" ADD CONSTRAINT "core_plugin_permissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_plugin_reviews"')) THEN
        ALTER TABLE "public"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_plugin_versions"')) THEN
        ALTER TABLE "public"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugins_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_plugins"')) THEN
        ALTER TABLE "public"."core_plugins" ADD CONSTRAINT "core_plugins_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_refresh_tokens_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_refresh_tokens_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_refresh_tokens"')) THEN
        ALTER TABLE "public"."core_refresh_tokens" ADD CONSTRAINT "core_refresh_tokens_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_sessions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_sessions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_sessions"')) THEN
        ALTER TABLE "public"."core_sessions" ADD CONSTRAINT "core_sessions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tenant_plugins"')) THEN
        ALTER TABLE "public"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_activities_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_activities_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_ticket_activities"')) THEN
        ALTER TABLE "public"."core_ticket_activities" ADD CONSTRAINT "core_ticket_activities_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_comments_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_comments_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_ticket_comments"')) THEN
        ALTER TABLE "public"."core_ticket_comments" ADD CONSTRAINT "core_ticket_comments_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_sla_escalations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_sla_escalations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_ticket_sla_escalations"')) THEN
        ALTER TABLE "public"."core_ticket_sla_escalations" ADD CONSTRAINT "core_ticket_sla_escalations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_sla_policies_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_ticket_sla_policies_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_ticket_sla_policies"')) THEN
        ALTER TABLE "public"."core_ticket_sla_policies" ADD CONSTRAINT "core_ticket_sla_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tickets_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tickets_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_tickets"')) THEN
        ALTER TABLE "public"."core_tickets" ADD CONSTRAINT "core_tickets_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_versions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_versions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."_archive_core_workflow_versions"')) THEN
        ALTER TABLE "public"."_archive_core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'devices_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'devices_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."devices"')) THEN
        ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'equipment_inspections_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'equipment_inspections_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."equipment_inspections"')) THEN
        ALTER TABLE "public"."equipment_inspections" ADD CONSTRAINT "equipment_inspections_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'equipment_maintenance_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'equipment_maintenance_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."equipment_maintenance_records"')) THEN
        ALTER TABLE "public"."equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_boms_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_boms_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_boms"')) THEN
        ALTER TABLE "public"."material_boms" ADD CONSTRAINT "material_boms_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_categories_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_categories_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_categories"')) THEN
        ALTER TABLE "public"."material_categories" ADD CONSTRAINT "material_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_issue_items_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_issue_items_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_issue_items"')) THEN
        ALTER TABLE "public"."material_issue_items" ADD CONSTRAINT "material_issue_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_issues_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_issues_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_issues"')) THEN
        ALTER TABLE "public"."material_issues" ADD CONSTRAINT "material_issues_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_requirement_items_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_requirement_items_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_requirement_items"')) THEN
        ALTER TABLE "public"."material_requirement_items" ADD CONSTRAINT "material_requirement_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_requirements_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_requirements_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_requirements"')) THEN
        ALTER TABLE "public"."material_requirements" ADD CONSTRAINT "material_requirements_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_return_items_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_return_items_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_return_items"')) THEN
        ALTER TABLE "public"."material_return_items" ADD CONSTRAINT "material_return_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_returns_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'material_returns_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."material_returns"')) THEN
        ALTER TABLE "public"."material_returns" ADD CONSTRAINT "material_returns_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'media_files_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'media_files_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."media_files"')) THEN
        ALTER TABLE "public"."media_files" ADD CONSTRAINT "media_files_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mobile_scan_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mobile_scan_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."mobile_scan_records"')) THEN
        ALTER TABLE "public"."mobile_scan_records" ADD CONSTRAINT "mobile_scan_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mobile_users_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mobile_users_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."mobile_users"')) THEN
        ALTER TABLE "public"."mobile_users" ADD CONSTRAINT "mobile_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mobile_users_username_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mobile_users_username_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."mobile_users"')) THEN
        ALTER TABLE "public"."mobile_users" ADD CONSTRAINT "mobile_users_username_key" UNIQUE (username);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'offline_operations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'offline_operations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."offline_operations"')) THEN
        ALTER TABLE "public"."offline_operations" ADD CONSTRAINT "offline_operations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'offline_sync_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'offline_sync_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."offline_sync_records"')) THEN
        ALTER TABLE "public"."offline_sync_records" ADD CONSTRAINT "offline_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_change_notices_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_change_notices_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."pdm_change_notices"')) THEN
        ALTER TABLE "public"."pdm_change_notices" ADD CONSTRAINT "pdm_change_notices_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_materials_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_materials_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."pdm_materials"')) THEN
        ALTER TABLE "public"."pdm_materials" ADD CONSTRAINT "pdm_materials_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_products_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'pdm_products_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."pdm_products"')) THEN
        ALTER TABLE "public"."pdm_products" ADD CONSTRAINT "pdm_products_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'photo_uploads_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'photo_uploads_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."photo_uploads"')) THEN
        ALTER TABLE "public"."photo_uploads" ADD CONSTRAINT "photo_uploads_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_devices_device_token_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_devices_device_token_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."push_devices"')) THEN
        ALTER TABLE "public"."push_devices" ADD CONSTRAINT "push_devices_device_token_key" UNIQUE (device_token);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_devices_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_devices_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."push_devices"')) THEN
        ALTER TABLE "public"."push_devices" ADD CONSTRAINT "push_devices_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_notifications_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_notifications_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."push_notifications"')) THEN
        ALTER TABLE "public"."push_notifications" ADD CONSTRAINT "push_notifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_templates_name_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_templates_name_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."push_templates"')) THEN
        ALTER TABLE "public"."push_templates" ADD CONSTRAINT "push_templates_name_key" UNIQUE (name);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_templates_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_templates_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."push_templates"')) THEN
        ALTER TABLE "public"."push_templates" ADD CONSTRAINT "push_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_investigations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_investigations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accident_investigations"')) THEN
        ALTER TABLE "public"."qa_ehs_accident_investigations" ADD CONSTRAINT "qa_ehs_accident_investigations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_reviews_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_reviews_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accident_reviews"')) THEN
        ALTER TABLE "public"."qa_ehs_accident_reviews" ADD CONSTRAINT "qa_ehs_accident_reviews_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_treatments_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_treatments_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accident_treatments"')) THEN
        ALTER TABLE "public"."qa_ehs_accident_treatments" ADD CONSTRAINT "qa_ehs_accident_treatments_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accidents_accident_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accidents_accident_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accidents"')) THEN
        ALTER TABLE "public"."qa_ehs_accidents" ADD CONSTRAINT "qa_ehs_accidents_accident_no_key" UNIQUE (accident_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accidents_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accidents_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accidents"')) THEN
        ALTER TABLE "public"."qa_ehs_accidents" ADD CONSTRAINT "qa_ehs_accidents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_evaluations_eval_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_evaluations_eval_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_compliance_evaluations"')) THEN
        ALTER TABLE "public"."qa_ehs_compliance_evaluations" ADD CONSTRAINT "qa_ehs_compliance_evaluations_eval_no_key" UNIQUE (eval_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_evaluations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_evaluations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_compliance_evaluations"')) THEN
        ALTER TABLE "public"."qa_ehs_compliance_evaluations" ADD CONSTRAINT "qa_ehs_compliance_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_items_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_items_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_compliance_items"')) THEN
        ALTER TABLE "public"."qa_ehs_compliance_items" ADD CONSTRAINT "qa_ehs_compliance_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_contraindications_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_contraindications_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_contraindications"')) THEN
        ALTER TABLE "public"."qa_ehs_contraindications" ADD CONSTRAINT "qa_ehs_contraindications_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_detection_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_detection_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_detection_records"')) THEN
        ALTER TABLE "public"."qa_ehs_detection_records" ADD CONSTRAINT "qa_ehs_detection_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_detection_records_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_detection_records_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_detection_records"')) THEN
        ALTER TABLE "public"."qa_ehs_detection_records" ADD CONSTRAINT "qa_ehs_detection_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_discharge_permits_permit_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_discharge_permits_permit_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_discharge_permits"')) THEN
        ALTER TABLE "public"."qa_ehs_discharge_permits" ADD CONSTRAINT "qa_ehs_discharge_permits_permit_no_key" UNIQUE (permit_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_discharge_permits_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_discharge_permits_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_discharge_permits"')) THEN
        ALTER TABLE "public"."qa_ehs_discharge_permits" ADD CONSTRAINT "qa_ehs_discharge_permits_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_disease_cases_case_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_disease_cases_case_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_disease_cases"')) THEN
        ALTER TABLE "public"."qa_ehs_disease_cases" ADD CONSTRAINT "qa_ehs_disease_cases_case_no_key" UNIQUE (case_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_disease_cases_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_disease_cases_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_disease_cases"')) THEN
        ALTER TABLE "public"."qa_ehs_disease_cases" ADD CONSTRAINT "qa_ehs_disease_cases_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_evaluations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_evaluations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_evaluations"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_evaluations" ADD CONSTRAINT "qa_ehs_drill_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_plans_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_plans_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_plans" ADD CONSTRAINT "qa_ehs_drill_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_plans_plan_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_plans_plan_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_plans" ADD CONSTRAINT "qa_ehs_drill_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_problems_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_problems_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_problems"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_problems" ADD CONSTRAINT "qa_ehs_drill_problems_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_records"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_records" ADD CONSTRAINT "qa_ehs_drill_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_records_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_records_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_records"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_records" ADD CONSTRAINT "qa_ehs_drill_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_approvals_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_approvals_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plan_approvals"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plan_approvals" ADD CONSTRAINT "qa_ehs_emergency_plan_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_supplies_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_supplies_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plan_supplies"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plan_supplies" ADD CONSTRAINT "qa_ehs_emergency_plan_supplies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_versions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_versions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plan_versions"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plan_versions" ADD CONSTRAINT "qa_ehs_emergency_plan_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plans_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plans_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plans" ADD CONSTRAINT "qa_ehs_emergency_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plans_plan_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plans_plan_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plans" ADD CONSTRAINT "qa_ehs_emergency_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_employees_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_employees_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_employees"')) THEN
        ALTER TABLE "public"."qa_ehs_employees" ADD CONSTRAINT "qa_ehs_employees_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_env_monitor_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_env_monitor_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_env_monitor_records"')) THEN
        ALTER TABLE "public"."qa_ehs_env_monitor_records" ADD CONSTRAINT "qa_ehs_env_monitor_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_env_monitor_records_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_env_monitor_records_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_env_monitor_records"')) THEN
        ALTER TABLE "public"."qa_ehs_env_monitor_records" ADD CONSTRAINT "qa_ehs_env_monitor_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_incidents_incident_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_incidents_incident_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_environment_incidents"')) THEN
        ALTER TABLE "public"."qa_ehs_environment_incidents" ADD CONSTRAINT "qa_ehs_environment_incidents_incident_no_key" UNIQUE (incident_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_incidents_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_incidents_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_environment_incidents"')) THEN
        ALTER TABLE "public"."qa_ehs_environment_incidents" ADD CONSTRAINT "qa_ehs_environment_incidents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_environment"')) THEN
        ALTER TABLE "public"."qa_ehs_environment" ADD CONSTRAINT "qa_ehs_environment_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environment_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_environment"')) THEN
        ALTER TABLE "public"."qa_ehs_environment" ADD CONSTRAINT "qa_ehs_environment_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environmental_regulations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environmental_regulations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_environmental_regulations"')) THEN
        ALTER TABLE "public"."qa_ehs_environmental_regulations" ADD CONSTRAINT "qa_ehs_environmental_regulations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environmental_regulations_reg_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_environmental_regulations_reg_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_environmental_regulations"')) THEN
        ALTER TABLE "public"."qa_ehs_environmental_regulations" ADD CONSTRAINT "qa_ehs_environmental_regulations_reg_no_key" UNIQUE (reg_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_factors_factor_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_factors_factor_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazard_factors"')) THEN
        ALTER TABLE "public"."qa_ehs_hazard_factors" ADD CONSTRAINT "qa_ehs_hazard_factors_factor_no_key" UNIQUE (factor_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_factors_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_factors_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazard_factors"')) THEN
        ALTER TABLE "public"."qa_ehs_hazard_factors" ADD CONSTRAINT "qa_ehs_hazard_factors_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_rectifications_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_rectifications_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazard_rectifications"')) THEN
        ALTER TABLE "public"."qa_ehs_hazard_rectifications" ADD CONSTRAINT "qa_ehs_hazard_rectifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_verifications_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_verifications_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazard_verifications"')) THEN
        ALTER TABLE "public"."qa_ehs_hazard_verifications" ADD CONSTRAINT "qa_ehs_hazard_verifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazardous_materials_material_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazardous_materials_material_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazardous_materials"')) THEN
        ALTER TABLE "public"."qa_ehs_hazardous_materials" ADD CONSTRAINT "qa_ehs_hazardous_materials_material_no_key" UNIQUE (material_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazardous_materials_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazardous_materials_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazardous_materials"')) THEN
        ALTER TABLE "public"."qa_ehs_hazardous_materials" ADD CONSTRAINT "qa_ehs_hazardous_materials_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazards_hazard_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazards_hazard_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazards"')) THEN
        ALTER TABLE "public"."qa_ehs_hazards" ADD CONSTRAINT "qa_ehs_hazards_hazard_no_key" UNIQUE (hazard_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazards_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazards_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazards"')) THEN
        ALTER TABLE "public"."qa_ehs_hazards" ADD CONSTRAINT "qa_ehs_hazards_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_abnormalities_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_abnormalities_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_abnormalities"')) THEN
        ALTER TABLE "public"."qa_ehs_health_abnormalities" ADD CONSTRAINT "qa_ehs_health_abnormalities_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_plans_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_plans_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_exam_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_health_exam_plans" ADD CONSTRAINT "qa_ehs_health_exam_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_plans_plan_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_plans_plan_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_exam_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_health_exam_plans" ADD CONSTRAINT "qa_ehs_health_exam_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_exam_records"')) THEN
        ALTER TABLE "public"."qa_ehs_health_exam_records" ADD CONSTRAINT "qa_ehs_health_exam_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_records_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_records_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_exam_records"')) THEN
        ALTER TABLE "public"."qa_ehs_health_exam_records" ADD CONSTRAINT "qa_ehs_health_exam_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_trainings_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_trainings_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_trainings"')) THEN
        ALTER TABLE "public"."qa_ehs_health_trainings" ADD CONSTRAINT "qa_ehs_health_trainings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_trainings_training_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_trainings_training_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_trainings"')) THEN
        ALTER TABLE "public"."qa_ehs_health_trainings" ADD CONSTRAINT "qa_ehs_health_trainings_training_no_key" UNIQUE (training_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_items_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_items_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_items"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_items" ADD CONSTRAINT "qa_ehs_inspection_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_plans_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_plans_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_plans" ADD CONSTRAINT "qa_ehs_inspection_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_plans_plan_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_plans_plan_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_plans"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_plans" ADD CONSTRAINT "qa_ehs_inspection_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_record_items_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_record_items_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_record_items"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_record_items" ADD CONSTRAINT "qa_ehs_inspection_record_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_records"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_records" ADD CONSTRAINT "qa_ehs_inspection_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_records_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_records_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_records"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_records" ADD CONSTRAINT "qa_ehs_inspection_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_material_stocks_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_material_stocks_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_material_stocks"')) THEN
        ALTER TABLE "public"."qa_ehs_material_stocks" ADD CONSTRAINT "qa_ehs_material_stocks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_msds_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_msds_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_msds"')) THEN
        ALTER TABLE "public"."qa_ehs_msds" ADD CONSTRAINT "qa_ehs_msds_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_protection_measures_measure_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_protection_measures_measure_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_protection_measures"')) THEN
        ALTER TABLE "public"."qa_ehs_protection_measures" ADD CONSTRAINT "qa_ehs_protection_measures_measure_no_key" UNIQUE (measure_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_protection_measures_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_protection_measures_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_protection_measures"')) THEN
        ALTER TABLE "public"."qa_ehs_protection_measures" ADD CONSTRAINT "qa_ehs_protection_measures_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_risks_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_risks_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_risks"')) THEN
        ALTER TABLE "public"."qa_ehs_risks" ADD CONSTRAINT "qa_ehs_risks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_risks_risk_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_risks_risk_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_risks"')) THEN
        ALTER TABLE "public"."qa_ehs_risks" ADD CONSTRAINT "qa_ehs_risks_risk_no_key" UNIQUE (risk_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_stock_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_stock_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_stock_records"')) THEN
        ALTER TABLE "public"."qa_ehs_stock_records" ADD CONSTRAINT "qa_ehs_stock_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_stock_records_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_stock_records_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_stock_records"')) THEN
        ALTER TABLE "public"."qa_ehs_stock_records" ADD CONSTRAINT "qa_ehs_stock_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_sync_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_sync_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_sync_records"')) THEN
        ALTER TABLE "public"."qa_ehs_sync_records" ADD CONSTRAINT "qa_ehs_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_sync_records_sync_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_sync_records_sync_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_sync_records"')) THEN
        ALTER TABLE "public"."qa_ehs_sync_records" ADD CONSTRAINT "qa_ehs_sync_records_sync_no_key" UNIQUE (sync_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_trainings_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_trainings_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_trainings"')) THEN
        ALTER TABLE "public"."qa_ehs_trainings" ADD CONSTRAINT "qa_ehs_trainings_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_trainings_training_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_trainings_training_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_trainings"')) THEN
        ALTER TABLE "public"."qa_ehs_trainings" ADD CONSTRAINT "qa_ehs_trainings_training_no_key" UNIQUE (training_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_calibration_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_calibration_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_calibration_records"')) THEN
        ALTER TABLE "public"."qa_lab_calibration_records" ADD CONSTRAINT "qa_lab_calibration_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_inspection_reports_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_inspection_reports_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_inspection_reports"')) THEN
        ALTER TABLE "public"."qa_lab_inspection_reports" ADD CONSTRAINT "qa_lab_inspection_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_inspection_reports_report_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_inspection_reports_report_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_inspection_reports"')) THEN
        ALTER TABLE "public"."qa_lab_inspection_reports" ADD CONSTRAINT "qa_lab_inspection_reports_report_no_key" UNIQUE (report_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_instruments_instrument_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_instruments_instrument_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_instruments"')) THEN
        ALTER TABLE "public"."qa_lab_instruments" ADD CONSTRAINT "qa_lab_instruments_instrument_no_key" UNIQUE (instrument_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_instruments_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_instruments_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_instruments"')) THEN
        ALTER TABLE "public"."qa_lab_instruments" ADD CONSTRAINT "qa_lab_instruments_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_processes_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_processes_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_processes"')) THEN
        ALTER TABLE "public"."qa_lab_processes" ADD CONSTRAINT "qa_lab_processes_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_processes_process_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_processes_process_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_processes"')) THEN
        ALTER TABLE "public"."qa_lab_processes" ADD CONSTRAINT "qa_lab_processes_process_no_key" UNIQUE (process_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagent_alerts_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagent_alerts_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_reagent_alerts"')) THEN
        ALTER TABLE "public"."qa_lab_reagent_alerts" ADD CONSTRAINT "qa_lab_reagent_alerts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagent_history_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagent_history_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_reagent_history"')) THEN
        ALTER TABLE "public"."qa_lab_reagent_history" ADD CONSTRAINT "qa_lab_reagent_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagents_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagents_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_reagents"')) THEN
        ALTER TABLE "public"."qa_lab_reagents" ADD CONSTRAINT "qa_lab_reagents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagents_reagent_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagents_reagent_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_reagents"')) THEN
        ALTER TABLE "public"."qa_lab_reagents" ADD CONSTRAINT "qa_lab_reagents_reagent_no_key" UNIQUE (reagent_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_records"')) THEN
        ALTER TABLE "public"."qa_lab_records" ADD CONSTRAINT "qa_lab_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_records_record_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_records_record_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_records"')) THEN
        ALTER TABLE "public"."qa_lab_records" ADD CONSTRAINT "qa_lab_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_sample_lifecycle_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_sample_lifecycle_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_sample_lifecycle"')) THEN
        ALTER TABLE "public"."qa_lab_sample_lifecycle" ADD CONSTRAINT "qa_lab_sample_lifecycle_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_audit_logs_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_audit_logs_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_audit_logs"')) THEN
        ALTER TABLE "public"."qa_lims_audit_logs" ADD CONSTRAINT "qa_lims_audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_barcode_scan_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_barcode_scan_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_barcode_scan_records"')) THEN
        ALTER TABLE "public"."qa_lims_barcode_scan_records" ADD CONSTRAINT "qa_lims_barcode_scan_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_collection_tasks_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_collection_tasks_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_collection_tasks"')) THEN
        ALTER TABLE "public"."qa_lims_collection_tasks" ADD CONSTRAINT "qa_lims_collection_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_collection_tasks_task_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_collection_tasks_task_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_collection_tasks"')) THEN
        ALTER TABLE "public"."qa_lims_collection_tasks" ADD CONSTRAINT "qa_lims_collection_tasks_task_no_key" UNIQUE (task_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_instrument_data_data_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_instrument_data_data_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_instrument_data"')) THEN
        ALTER TABLE "public"."qa_lims_instrument_data" ADD CONSTRAINT "qa_lims_instrument_data_data_no_key" UNIQUE (data_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_instrument_data_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_instrument_data_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_instrument_data"')) THEN
        ALTER TABLE "public"."qa_lims_instrument_data" ADD CONSTRAINT "qa_lims_instrument_data_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_categories_category_code_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_categories_category_code_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_method_categories"')) THEN
        ALTER TABLE "public"."qa_lims_method_categories" ADD CONSTRAINT "qa_lims_method_categories_category_code_key" UNIQUE (category_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_categories_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_categories_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_method_categories"')) THEN
        ALTER TABLE "public"."qa_lims_method_categories" ADD CONSTRAINT "qa_lims_method_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_validations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_validations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_method_validations"')) THEN
        ALTER TABLE "public"."qa_lims_method_validations" ADD CONSTRAINT "qa_lims_method_validations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_versions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_versions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_method_versions"')) THEN
        ALTER TABLE "public"."qa_lims_method_versions" ADD CONSTRAINT "qa_lims_method_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_parse_rules_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_parse_rules_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_parse_rules"')) THEN
        ALTER TABLE "public"."qa_lims_parse_rules" ADD CONSTRAINT "qa_lims_parse_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_parse_rules_rule_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_parse_rules_rule_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_parse_rules"')) THEN
        ALTER TABLE "public"."qa_lims_parse_rules" ADD CONSTRAINT "qa_lims_parse_rules_rule_no_key" UNIQUE (rule_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_corrective_actions_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_corrective_actions_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_corrective_actions"')) THEN
        ALTER TABLE "public"."qa_lims_pt_corrective_actions" ADD CONSTRAINT "qa_lims_pt_corrective_actions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_evaluations_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_evaluations_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_evaluations"')) THEN
        ALTER TABLE "public"."qa_lims_pt_evaluations" ADD CONSTRAINT "qa_lims_pt_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_plans_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_plans_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_plans"')) THEN
        ALTER TABLE "public"."qa_lims_pt_plans" ADD CONSTRAINT "qa_lims_pt_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_plans_plan_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_plans_plan_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_plans"')) THEN
        ALTER TABLE "public"."qa_lims_pt_plans" ADD CONSTRAINT "qa_lims_pt_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_results_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_results_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_results"')) THEN
        ALTER TABLE "public"."qa_lims_pt_results" ADD CONSTRAINT "qa_lims_pt_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_samples_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_samples_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_samples"')) THEN
        ALTER TABLE "public"."qa_lims_pt_samples" ADD CONSTRAINT "qa_lims_pt_samples_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_rfid_tags_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_rfid_tags_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_rfid_tags"')) THEN
        ALTER TABLE "public"."qa_lims_rfid_tags" ADD CONSTRAINT "qa_lims_rfid_tags_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_rfid_tags_tag_id_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_rfid_tags_tag_id_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_rfid_tags"')) THEN
        ALTER TABLE "public"."qa_lims_rfid_tags" ADD CONSTRAINT "qa_lims_rfid_tags_tag_id_key" UNIQUE (tag_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sample_barcodes_barcode_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sample_barcodes_barcode_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_sample_barcodes"')) THEN
        ALTER TABLE "public"."qa_lims_sample_barcodes" ADD CONSTRAINT "qa_lims_sample_barcodes_barcode_key" UNIQUE (barcode);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sample_barcodes_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sample_barcodes_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_sample_barcodes"')) THEN
        ALTER TABLE "public"."qa_lims_sample_barcodes" ADD CONSTRAINT "qa_lims_sample_barcodes_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sync_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sync_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_sync_records"')) THEN
        ALTER TABLE "public"."qa_lims_sync_records" ADD CONSTRAINT "qa_lims_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sync_records_sync_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_sync_records_sync_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_sync_records"')) THEN
        ALTER TABLE "public"."qa_lims_sync_records" ADD CONSTRAINT "qa_lims_sync_records_sync_no_key" UNIQUE (sync_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_test_methods_method_code_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_test_methods_method_code_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_test_methods"')) THEN
        ALTER TABLE "public"."qa_lims_test_methods" ADD CONSTRAINT "qa_lims_test_methods_method_code_key" UNIQUE (method_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_test_methods_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_test_methods_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_test_methods"')) THEN
        ALTER TABLE "public"."qa_lims_test_methods" ADD CONSTRAINT "qa_lims_test_methods_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_components_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_components_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_uncertainty_components"')) THEN
        ALTER TABLE "public"."qa_lims_uncertainty_components" ADD CONSTRAINT "qa_lims_uncertainty_components_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_projects_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_projects_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_uncertainty_projects"')) THEN
        ALTER TABLE "public"."qa_lims_uncertainty_projects" ADD CONSTRAINT "qa_lims_uncertainty_projects_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_projects_project_no_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_projects_project_no_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_uncertainty_projects"')) THEN
        ALTER TABLE "public"."qa_lims_uncertainty_projects" ADD CONSTRAINT "qa_lims_uncertainty_projects_project_no_key" UNIQUE (project_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_sources_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_sources_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_uncertainty_sources"')) THEN
        ALTER TABLE "public"."qa_lims_uncertainty_sources" ADD CONSTRAINT "qa_lims_uncertainty_sources_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_qms_sync_records_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_qms_sync_records_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_qms_sync_records"')) THEN
        ALTER TABLE "public"."qa_qms_sync_records" ADD CONSTRAINT "qa_qms_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'refresh_tokens_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'refresh_tokens_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."refresh_tokens"')) THEN
        ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'refresh_tokens_refresh_token_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'refresh_tokens_refresh_token_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."refresh_tokens"')) THEN
        ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_refresh_token_key" UNIQUE (refresh_token);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'shortcuts_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'shortcuts_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."shortcuts"')) THEN
        ALTER TABLE "public"."shortcuts" ADD CONSTRAINT "shortcuts_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_policies_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_policies_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."sync_policies"')) THEN
        ALTER TABLE "public"."sync_policies" ADD CONSTRAINT "sync_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_policies_user_id_key' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_policies_user_id_key' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."sync_policies"')) THEN
        ALTER TABLE "public"."sync_policies" ADD CONSTRAINT "sync_policies_user_id_key" UNIQUE (user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'tenants_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'tenants_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."tenants"')) THEN
        ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ticket_automation_rules_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ticket_automation_rules_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."ticket_automation_rules"')) THEN
        ALTER TABLE "public"."ticket_automation_rules" ADD CONSTRAINT "ticket_automation_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ticket_knowledge_articles_pkey' AND n.nspname = 'public') AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'ticket_knowledge_articles_pkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."ticket_knowledge_articles"')) THEN
        ALTER TABLE "public"."ticket_knowledge_articles" ADD CONSTRAINT "ticket_knowledge_articles_pkey" PRIMARY KEY (id);
    END IF;
END $$;

-- 4) FK（目标表在独有表集合内——解掉目标表缺失跳过的 FK）

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_subscription_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.core_subscriptions(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_members_room_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_chat_members"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_chat_members" ADD CONSTRAINT "core_chat_members_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.core_chat_rooms(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_messages_room_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_chat_messages"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_chat_messages" ADD CONSTRAINT "core_chat_messages_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.core_chat_rooms(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_dict_type_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_dict_items" ADD CONSTRAINT "core_dict_items_dict_type_id_fkey" FOREIGN KEY (dict_type_id) REFERENCES public.core_dict_types(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_parent_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_dict_items" ADD CONSTRAINT "core_dict_items_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.core_dict_items(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_guide_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_guide_lessons"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_guide_lessons" ADD CONSTRAINT "core_guide_lessons_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES public.core_guides(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_guide_progress"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES public.core_guides(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_group_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_menus" ADD CONSTRAINT "core_menus_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.core_menu_groups(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_parent_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_menus" ADD CONSTRAINT "core_menus_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.core_menus(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_plugin_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_instances"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_instances" ADD CONSTRAINT "core_plugin_instances_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_plugin_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_reviews"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_plugin_versions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_permission_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_role_permissions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_role_permissions" ADD CONSTRAINT "core_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.core_permissions(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_role_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_role_permissions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_role_permissions" ADD CONSTRAINT "core_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.core_roles(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_plan_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.core_billing_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_modules"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_plugin_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_settings"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_usage"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_usage_records_tenant_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_usage_records"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_usage_records" ADD CONSTRAINT "core_usage_records_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_role_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_user_roles"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_user_roles" ADD CONSTRAINT "core_user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.core_roles(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_user_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_user_roles"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_user_roles" ADD CONSTRAINT "core_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.core_users(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_workflow_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_workflow_instances"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.core_workflows(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_instance_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."core_workflow_tasks"')) THEN
        ALTER TABLE IF EXISTS "iam"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_instance_id_fkey" FOREIGN KEY (instance_id) REFERENCES public.core_workflow_instances(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'dynamic_data_schema_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."dynamic_data"')) THEN
        ALTER TABLE "iam"."dynamic_data" ADD CONSTRAINT "dynamic_data_schema_id_fkey" FOREIGN KEY (schema_id) REFERENCES iam.schema_registry(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'refresh_tokens_user_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."refresh_tokens"')) THEN
        ALTER TABLE IF EXISTS "iam"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sessions_user_id_fkey' AND n.nspname = 'iam' AND con.conrelid = to_regclass('"iam"."sessions"')) THEN
        ALTER TABLE IF EXISTS "iam"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_subscription_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.core_subscriptions(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_billing_invoices_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_billing_invoices"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_billing_invoices" ADD CONSTRAINT "core_billing_invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_members_room_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_chat_members"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_chat_members" ADD CONSTRAINT "core_chat_members_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.core_chat_rooms(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_chat_messages_room_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_chat_messages"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_chat_messages" ADD CONSTRAINT "core_chat_messages_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.core_chat_rooms(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_dict_type_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_dict_items" ADD CONSTRAINT "core_dict_items_dict_type_id_fkey" FOREIGN KEY (dict_type_id) REFERENCES public.core_dict_types(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_dict_items_parent_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_dict_items"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_dict_items" ADD CONSTRAINT "core_dict_items_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.core_dict_items(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_lessons_guide_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_guide_lessons"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_guide_lessons" ADD CONSTRAINT "core_guide_lessons_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES public.core_guides(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_guide_progress_guide_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_guide_progress"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_guide_progress" ADD CONSTRAINT "core_guide_progress_guide_id_fkey" FOREIGN KEY (guide_id) REFERENCES public.core_guides(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_group_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_menus" ADD CONSTRAINT "core_menus_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.core_menu_groups(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_menus_parent_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_menus"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_menus" ADD CONSTRAINT "core_menus_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.core_menus(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_instances_plugin_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_instances"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_instances" ADD CONSTRAINT "core_plugin_instances_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_reviews_plugin_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_reviews"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_plugin_versions_plugin_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_plugin_versions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_permission_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_role_permissions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_role_permissions" ADD CONSTRAINT "core_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.core_permissions(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_role_permissions_role_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_role_permissions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_role_permissions" ADD CONSTRAINT "core_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.core_roles(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_plan_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.core_billing_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_subscriptions_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_subscriptions"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_subscriptions" ADD CONSTRAINT "core_subscriptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_modules_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_modules"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_plugin_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_plugins_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_plugins"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_plugins" ADD CONSTRAINT "core_tenant_plugins_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_settings_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_settings"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_usage_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_usage"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_tenant_users_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_tenant_users"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_usage_records_tenant_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_usage_records"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_usage_records" ADD CONSTRAINT "core_usage_records_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_role_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_user_roles"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_user_roles" ADD CONSTRAINT "core_user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.core_roles(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_user_roles_user_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_user_roles"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_user_roles" ADD CONSTRAINT "core_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.core_users(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_instances_workflow_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_workflow_instances"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.core_workflows(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_workflow_tasks_instance_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."core_workflow_tasks"')) THEN
        ALTER TABLE IF EXISTS "mes"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_instance_id_fkey" FOREIGN KEY (instance_id) REFERENCES public.core_workflow_instances(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'tool_permissions_tenant_permission_id_fkey' AND n.nspname = 'mes' AND con.conrelid = to_regclass('"mes"."tool_permissions"')) THEN
        ALTER TABLE "mes"."tool_permissions" ADD CONSTRAINT "tool_permissions_tenant_permission_id_fkey" FOREIGN KEY (tenant_permission_id) REFERENCES mes.tenant_permissions(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'barcode_scans_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."barcode_scans"')) THEN
        ALTER TABLE "public"."barcode_scans" ADD CONSTRAINT "barcode_scans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'core_flow_variable_history_variable_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."core_flow_variable_history"')) THEN
        ALTER TABLE "public"."core_flow_variable_history" ADD CONSTRAINT "core_flow_variable_history_variable_id_fkey" FOREIGN KEY (variable_id) REFERENCES public.core_flow_variables(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'devices_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."devices"')) THEN
        ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'mobile_scan_records_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."mobile_scan_records"')) THEN
        ALTER TABLE "public"."mobile_scan_records" ADD CONSTRAINT "mobile_scan_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'offline_operations_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."offline_operations"')) THEN
        ALTER TABLE "public"."offline_operations" ADD CONSTRAINT "offline_operations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'offline_sync_records_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."offline_sync_records"')) THEN
        ALTER TABLE "public"."offline_sync_records" ADD CONSTRAINT "offline_sync_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'photo_uploads_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."photo_uploads"')) THEN
        ALTER TABLE "public"."photo_uploads" ADD CONSTRAINT "photo_uploads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'push_devices_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."push_devices"')) THEN
        ALTER TABLE "public"."push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_investigations_accident_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accident_investigations"')) THEN
        ALTER TABLE "public"."qa_ehs_accident_investigations" ADD CONSTRAINT "qa_ehs_accident_investigations_accident_id_fkey" FOREIGN KEY (accident_id) REFERENCES public.qa_ehs_accidents(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_reviews_accident_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accident_reviews"')) THEN
        ALTER TABLE "public"."qa_ehs_accident_reviews" ADD CONSTRAINT "qa_ehs_accident_reviews_accident_id_fkey" FOREIGN KEY (accident_id) REFERENCES public.qa_ehs_accidents(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_accident_treatments_accident_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_accident_treatments"')) THEN
        ALTER TABLE "public"."qa_ehs_accident_treatments" ADD CONSTRAINT "qa_ehs_accident_treatments_accident_id_fkey" FOREIGN KEY (accident_id) REFERENCES public.qa_ehs_accidents(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_items_evaluation_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_compliance_items"')) THEN
        ALTER TABLE "public"."qa_ehs_compliance_items" ADD CONSTRAINT "qa_ehs_compliance_items_evaluation_id_fkey" FOREIGN KEY (evaluation_id) REFERENCES public.qa_ehs_compliance_evaluations(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_compliance_items_regulation_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_compliance_items"')) THEN
        ALTER TABLE "public"."qa_ehs_compliance_items" ADD CONSTRAINT "qa_ehs_compliance_items_regulation_id_fkey" FOREIGN KEY (regulation_id) REFERENCES public.qa_ehs_environmental_regulations(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_detection_records_factor_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_detection_records"')) THEN
        ALTER TABLE "public"."qa_ehs_detection_records" ADD CONSTRAINT "qa_ehs_detection_records_factor_id_fkey" FOREIGN KEY (factor_id) REFERENCES public.qa_ehs_hazard_factors(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_evaluations_drill_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_evaluations"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_evaluations" ADD CONSTRAINT "qa_ehs_drill_evaluations_drill_id_fkey" FOREIGN KEY (drill_id) REFERENCES public.qa_ehs_drill_records(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_problems_drill_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_problems"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_problems" ADD CONSTRAINT "qa_ehs_drill_problems_drill_id_fkey" FOREIGN KEY (drill_id) REFERENCES public.qa_ehs_drill_records(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_drill_records_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_drill_records"')) THEN
        ALTER TABLE "public"."qa_ehs_drill_records" ADD CONSTRAINT "qa_ehs_drill_records_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_drill_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_approvals_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plan_approvals"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plan_approvals" ADD CONSTRAINT "qa_ehs_emergency_plan_approvals_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_emergency_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_supplies_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plan_supplies"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plan_supplies" ADD CONSTRAINT "qa_ehs_emergency_plan_supplies_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_emergency_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_emergency_plan_versions_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_emergency_plan_versions"')) THEN
        ALTER TABLE "public"."qa_ehs_emergency_plan_versions" ADD CONSTRAINT "qa_ehs_emergency_plan_versions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_emergency_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_rectifications_hazard_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazard_rectifications"')) THEN
        ALTER TABLE "public"."qa_ehs_hazard_rectifications" ADD CONSTRAINT "qa_ehs_hazard_rectifications_hazard_id_fkey" FOREIGN KEY (hazard_id) REFERENCES public.qa_ehs_hazards(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazard_verifications_hazard_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazard_verifications"')) THEN
        ALTER TABLE "public"."qa_ehs_hazard_verifications" ADD CONSTRAINT "qa_ehs_hazard_verifications_hazard_id_fkey" FOREIGN KEY (hazard_id) REFERENCES public.qa_ehs_hazards(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_hazards_inspection_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_hazards"')) THEN
        ALTER TABLE "public"."qa_ehs_hazards" ADD CONSTRAINT "qa_ehs_hazards_inspection_id_fkey" FOREIGN KEY (inspection_id) REFERENCES public.qa_ehs_inspection_records(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_abnormalities_record_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_abnormalities"')) THEN
        ALTER TABLE "public"."qa_ehs_health_abnormalities" ADD CONSTRAINT "qa_ehs_health_abnormalities_record_id_fkey" FOREIGN KEY (record_id) REFERENCES public.qa_ehs_health_exam_records(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_health_exam_records_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_health_exam_records"')) THEN
        ALTER TABLE "public"."qa_ehs_health_exam_records" ADD CONSTRAINT "qa_ehs_health_exam_records_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_health_exam_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_items_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_items"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_items" ADD CONSTRAINT "qa_ehs_inspection_items_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_inspection_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_record_items_item_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_record_items"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_record_items" ADD CONSTRAINT "qa_ehs_inspection_record_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.qa_ehs_inspection_items(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_record_items_record_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_record_items"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_record_items" ADD CONSTRAINT "qa_ehs_inspection_record_items_record_id_fkey" FOREIGN KEY (record_id) REFERENCES public.qa_ehs_inspection_records(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_inspection_records_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_inspection_records"')) THEN
        ALTER TABLE "public"."qa_ehs_inspection_records" ADD CONSTRAINT "qa_ehs_inspection_records_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_inspection_plans(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_material_stocks_material_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_material_stocks"')) THEN
        ALTER TABLE "public"."qa_ehs_material_stocks" ADD CONSTRAINT "qa_ehs_material_stocks_material_id_fkey" FOREIGN KEY (material_id) REFERENCES public.qa_ehs_hazardous_materials(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_msds_material_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_msds"')) THEN
        ALTER TABLE "public"."qa_ehs_msds" ADD CONSTRAINT "qa_ehs_msds_material_id_fkey" FOREIGN KEY (material_id) REFERENCES public.qa_ehs_hazardous_materials(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_ehs_stock_records_material_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_ehs_stock_records"')) THEN
        ALTER TABLE "public"."qa_ehs_stock_records" ADD CONSTRAINT "qa_ehs_stock_records_material_id_fkey" FOREIGN KEY (material_id) REFERENCES public.qa_ehs_hazardous_materials(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_calibration_records_instrument_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_calibration_records"')) THEN
        ALTER TABLE "public"."qa_lab_calibration_records" ADD CONSTRAINT "qa_lab_calibration_records_instrument_id_fkey" FOREIGN KEY (instrument_id) REFERENCES public.qa_lab_instruments(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagent_alerts_reagent_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_reagent_alerts"')) THEN
        ALTER TABLE "public"."qa_lab_reagent_alerts" ADD CONSTRAINT "qa_lab_reagent_alerts_reagent_id_fkey" FOREIGN KEY (reagent_id) REFERENCES public.qa_lab_reagents(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lab_reagent_history_reagent_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lab_reagent_history"')) THEN
        ALTER TABLE "public"."qa_lab_reagent_history" ADD CONSTRAINT "qa_lab_reagent_history_reagent_id_fkey" FOREIGN KEY (reagent_id) REFERENCES public.qa_lab_reagents(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_barcode_scan_records_barcode_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_barcode_scan_records"')) THEN
        ALTER TABLE "public"."qa_lims_barcode_scan_records" ADD CONSTRAINT "qa_lims_barcode_scan_records_barcode_id_fkey" FOREIGN KEY (barcode_id) REFERENCES public.qa_lims_sample_barcodes(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_collection_tasks_instrument_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_collection_tasks"')) THEN
        ALTER TABLE "public"."qa_lims_collection_tasks" ADD CONSTRAINT "qa_lims_collection_tasks_instrument_id_fkey" FOREIGN KEY (instrument_id) REFERENCES public.qa_lab_instruments(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_instrument_data_instrument_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_instrument_data"')) THEN
        ALTER TABLE "public"."qa_lims_instrument_data" ADD CONSTRAINT "qa_lims_instrument_data_instrument_id_fkey" FOREIGN KEY (instrument_id) REFERENCES public.qa_lab_instruments(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_categories_parent_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_method_categories"')) THEN
        ALTER TABLE "public"."qa_lims_method_categories" ADD CONSTRAINT "qa_lims_method_categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.qa_lims_method_categories(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_validations_method_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_method_validations"')) THEN
        ALTER TABLE "public"."qa_lims_method_validations" ADD CONSTRAINT "qa_lims_method_validations_method_id_fkey" FOREIGN KEY (method_id) REFERENCES public.qa_lims_test_methods(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_method_versions_method_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_method_versions"')) THEN
        ALTER TABLE "public"."qa_lims_method_versions" ADD CONSTRAINT "qa_lims_method_versions_method_id_fkey" FOREIGN KEY (method_id) REFERENCES public.qa_lims_test_methods(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_corrective_actions_evaluation_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_corrective_actions"')) THEN
        ALTER TABLE "public"."qa_lims_pt_corrective_actions" ADD CONSTRAINT "qa_lims_pt_corrective_actions_evaluation_id_fkey" FOREIGN KEY (evaluation_id) REFERENCES public.qa_lims_pt_evaluations(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_corrective_actions_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_corrective_actions"')) THEN
        ALTER TABLE "public"."qa_lims_pt_corrective_actions" ADD CONSTRAINT "qa_lims_pt_corrective_actions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_evaluations_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_evaluations"')) THEN
        ALTER TABLE "public"."qa_lims_pt_evaluations" ADD CONSTRAINT "qa_lims_pt_evaluations_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_evaluations_sample_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_evaluations"')) THEN
        ALTER TABLE "public"."qa_lims_pt_evaluations" ADD CONSTRAINT "qa_lims_pt_evaluations_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES public.qa_lims_pt_samples(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_results_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_results"')) THEN
        ALTER TABLE "public"."qa_lims_pt_results" ADD CONSTRAINT "qa_lims_pt_results_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_results_sample_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_results"')) THEN
        ALTER TABLE "public"."qa_lims_pt_results" ADD CONSTRAINT "qa_lims_pt_results_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES public.qa_lims_pt_samples(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_pt_samples_plan_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_pt_samples"')) THEN
        ALTER TABLE "public"."qa_lims_pt_samples" ADD CONSTRAINT "qa_lims_pt_samples_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_test_methods_category_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_test_methods"')) THEN
        ALTER TABLE "public"."qa_lims_test_methods" ADD CONSTRAINT "qa_lims_test_methods_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.qa_lims_method_categories(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_components_project_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_uncertainty_components"')) THEN
        ALTER TABLE "public"."qa_lims_uncertainty_components" ADD CONSTRAINT "qa_lims_uncertainty_components_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.qa_lims_uncertainty_projects(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_components_source_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_uncertainty_components"')) THEN
        ALTER TABLE "public"."qa_lims_uncertainty_components" ADD CONSTRAINT "qa_lims_uncertainty_components_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.qa_lims_uncertainty_sources(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'qa_lims_uncertainty_sources_project_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."qa_lims_uncertainty_sources"')) THEN
        ALTER TABLE "public"."qa_lims_uncertainty_sources" ADD CONSTRAINT "qa_lims_uncertainty_sources_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.qa_lims_uncertainty_projects(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'refresh_tokens_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."refresh_tokens"')) THEN
        ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'shortcuts_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."shortcuts"')) THEN
        ALTER TABLE "public"."shortcuts" ADD CONSTRAINT "shortcuts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'sync_policies_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."sync_policies"')) THEN
        ALTER TABLE "public"."sync_policies" ADD CONSTRAINT "sync_policies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.conname = 'user_settings_user_id_fkey' AND n.nspname = 'public' AND con.conrelid = to_regclass('"public"."user_settings"')) THEN
        ALTER TABLE IF EXISTS "public"."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5) RLS POLICY + 启用（独有表启用 RLS 的）

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_comparison_analyses' AND polrelid = to_regclass('"analytics"."analytics_comparison_analyses"')) THEN
        CREATE POLICY "tenant_isolation_analytics_comparison_analyses" ON "analytics"."analytics_comparison_analyses" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_comparison_results' AND polrelid = to_regclass('"analytics"."analytics_comparison_results"')) THEN
        CREATE POLICY "tenant_isolation_analytics_comparison_results" ON "analytics"."analytics_comparison_results" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_dashboard_shares' AND polrelid = to_regclass('"analytics"."analytics_dashboard_shares"')) THEN
        CREATE POLICY "tenant_isolation_analytics_dashboard_shares" ON "analytics"."analytics_dashboard_shares" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_dashboard_templates' AND polrelid = to_regclass('"analytics"."analytics_dashboard_templates"')) THEN
        CREATE POLICY "tenant_isolation_analytics_dashboard_templates" ON "analytics"."analytics_dashboard_templates" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_dashboards' AND polrelid = to_regclass('"analytics"."analytics_dashboards"')) THEN
        CREATE POLICY "tenant_isolation_analytics_dashboards" ON "analytics"."analytics_dashboards" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_datasources' AND polrelid = to_regclass('"analytics"."analytics_datasources"')) THEN
        CREATE POLICY "tenant_isolation_analytics_datasources" ON "analytics"."analytics_datasources" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_drilldown_history' AND polrelid = to_regclass('"analytics"."analytics_drilldown_history"')) THEN
        CREATE POLICY "tenant_isolation_analytics_drilldown_history" ON "analytics"."analytics_drilldown_history" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_drilldown_paths' AND polrelid = to_regclass('"analytics"."analytics_drilldown_paths"')) THEN
        CREATE POLICY "tenant_isolation_analytics_drilldown_paths" ON "analytics"."analytics_drilldown_paths" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_row_level_permissions' AND polrelid = to_regclass('"analytics"."analytics_row_level_permissions"')) THEN
        CREATE POLICY "tenant_isolation_analytics_row_level_permissions" ON "analytics"."analytics_row_level_permissions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_self_service_reports' AND polrelid = to_regclass('"analytics"."analytics_self_service_reports"')) THEN
        CREATE POLICY "tenant_isolation_analytics_self_service_reports" ON "analytics"."analytics_self_service_reports" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_analytics_widgets' AND polrelid = to_regclass('"analytics"."analytics_widgets"')) THEN
        CREATE POLICY "tenant_isolation_analytics_widgets" ON "analytics"."analytics_widgets" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"mes"."dashboard_stats"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "mes"."dashboard_stats" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"mes"."financial_records"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "mes"."financial_records" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"mes"."inspection_records"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "mes"."inspection_records" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"mes"."supply_chain_orders"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "mes"."supply_chain_orders" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_billing_invoices"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_billing_invoices' AND polrelid = to_regclass('"mes"."core_billing_invoices"')) THEN
        CREATE POLICY "tenant_isolation_core_billing_invoices" ON "mes"."core_billing_invoices" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_billing_plans"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_billing_plans' AND polrelid = to_regclass('"mes"."core_billing_plans"')) THEN
        CREATE POLICY "tenant_isolation_core_billing_plans" ON "mes"."core_billing_plans" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_chat_members"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_chat_members' AND polrelid = to_regclass('"mes"."core_chat_members"')) THEN
        CREATE POLICY "tenant_isolation_core_chat_members" ON "mes"."core_chat_members" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_chat_messages"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_chat_messages' AND polrelid = to_regclass('"mes"."core_chat_messages"')) THEN
        CREATE POLICY "tenant_isolation_core_chat_messages" ON "mes"."core_chat_messages" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_chat_rooms"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_chat_rooms' AND polrelid = to_regclass('"mes"."core_chat_rooms"')) THEN
        CREATE POLICY "tenant_isolation_core_chat_rooms" ON "mes"."core_chat_rooms" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_dashboard_refresh_log"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_dashboard_refresh_log' AND polrelid = to_regclass('"mes"."core_dashboard_refresh_log"')) THEN
        CREATE POLICY "tenant_isolation_core_dashboard_refresh_log" ON "mes"."core_dashboard_refresh_log" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_dict_items"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_dict_items' AND polrelid = to_regclass('"mes"."core_dict_items"')) THEN
        CREATE POLICY "tenant_isolation_core_dict_items" ON "mes"."core_dict_items" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_dict_types"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_dict_types' AND polrelid = to_regclass('"mes"."core_dict_types"')) THEN
        CREATE POLICY "tenant_isolation_core_dict_types" ON "mes"."core_dict_types" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_email_queue"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_email_queue' AND polrelid = to_regclass('"mes"."core_email_queue"')) THEN
        CREATE POLICY "tenant_isolation_core_email_queue" ON "mes"."core_email_queue" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_email_templates"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_email_templates' AND polrelid = to_regclass('"mes"."core_email_templates"')) THEN
        CREATE POLICY "tenant_isolation_core_email_templates" ON "mes"."core_email_templates" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_emails"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_emails' AND polrelid = to_regclass('"mes"."core_emails"')) THEN
        CREATE POLICY "tenant_isolation_core_emails" ON "mes"."core_emails" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_faqs"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_faqs' AND polrelid = to_regclass('"mes"."core_faqs"')) THEN
        CREATE POLICY "tenant_isolation_core_faqs" ON "mes"."core_faqs" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_file_folders"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_file_folders' AND polrelid = to_regclass('"mes"."core_file_folders"')) THEN
        CREATE POLICY "tenant_isolation_core_file_folders" ON "mes"."core_file_folders" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_files"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_files' AND polrelid = to_regclass('"mes"."core_files"')) THEN
        CREATE POLICY "tenant_isolation_core_files" ON "mes"."core_files" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_guide_lessons"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_guide_lessons' AND polrelid = to_regclass('"mes"."core_guide_lessons"')) THEN
        CREATE POLICY "tenant_isolation_core_guide_lessons" ON "mes"."core_guide_lessons" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_guide_progress"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_guide_progress' AND polrelid = to_regclass('"mes"."core_guide_progress"')) THEN
        CREATE POLICY "tenant_isolation_core_guide_progress" ON "mes"."core_guide_progress" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_guides"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_guides' AND polrelid = to_regclass('"mes"."core_guides"')) THEN
        CREATE POLICY "tenant_isolation_core_guides" ON "mes"."core_guides" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_inter_module_sync"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_inter_module_sync' AND polrelid = to_regclass('"mes"."core_inter_module_sync"')) THEN
        CREATE POLICY "tenant_isolation_core_inter_module_sync" ON "mes"."core_inter_module_sync" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_login_logs"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_login_logs' AND polrelid = to_regclass('"mes"."core_login_logs"')) THEN
        CREATE POLICY "tenant_isolation_core_login_logs" ON "mes"."core_login_logs" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_menu_groups"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_menu_groups' AND polrelid = to_regclass('"mes"."core_menu_groups"')) THEN
        CREATE POLICY "tenant_isolation_core_menu_groups" ON "mes"."core_menu_groups" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_menus"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_menus' AND polrelid = to_regclass('"mes"."core_menus"')) THEN
        CREATE POLICY "tenant_isolation_core_menus" ON "mes"."core_menus" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_migration_history"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_migration_history' AND polrelid = to_regclass('"mes"."core_migration_history"')) THEN
        CREATE POLICY "tenant_isolation_core_migration_history" ON "mes"."core_migration_history" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_mobile_offline_records"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_mobile_offline_records' AND polrelid = to_regclass('"mes"."core_mobile_offline_records"')) THEN
        CREATE POLICY "tenant_isolation_core_mobile_offline_records" ON "mes"."core_mobile_offline_records" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_notification_templates"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_notification_templates' AND polrelid = to_regclass('"mes"."core_notification_templates"')) THEN
        CREATE POLICY "tenant_isolation_core_notification_templates" ON "mes"."core_notification_templates" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_notifications"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_notifications' AND polrelid = to_regclass('"mes"."core_notifications"')) THEN
        CREATE POLICY "tenant_isolation_core_notifications" ON "mes"."core_notifications" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_plugin_categories"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_plugin_categories' AND polrelid = to_regclass('"mes"."core_plugin_categories"')) THEN
        CREATE POLICY "tenant_isolation_core_plugin_categories" ON "mes"."core_plugin_categories" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_plugin_instances"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_plugin_instances' AND polrelid = to_regclass('"mes"."core_plugin_instances"')) THEN
        CREATE POLICY "tenant_isolation_core_plugin_instances" ON "mes"."core_plugin_instances" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_plugin_permissions"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_plugin_permissions' AND polrelid = to_regclass('"mes"."core_plugin_permissions"')) THEN
        CREATE POLICY "tenant_isolation_core_plugin_permissions" ON "mes"."core_plugin_permissions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_plugin_pricing"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_plugin_pricing' AND polrelid = to_regclass('"mes"."core_plugin_pricing"')) THEN
        CREATE POLICY "tenant_isolation_core_plugin_pricing" ON "mes"."core_plugin_pricing" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_plugin_reviews"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_plugin_reviews' AND polrelid = to_regclass('"mes"."core_plugin_reviews"')) THEN
        CREATE POLICY "tenant_isolation_core_plugin_reviews" ON "mes"."core_plugin_reviews" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_plugins"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_plugins' AND polrelid = to_regclass('"mes"."core_plugins"')) THEN
        CREATE POLICY "tenant_isolation_core_plugins" ON "mes"."core_plugins" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_roles"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_roles' AND polrelid = to_regclass('"mes"."core_roles"')) THEN
        CREATE POLICY "tenant_isolation_core_roles" ON "mes"."core_roles" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_subscriptions"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_subscriptions' AND polrelid = to_regclass('"mes"."core_subscriptions"')) THEN
        CREATE POLICY "tenant_isolation_core_subscriptions" ON "mes"."core_subscriptions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_tenant_modules"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_tenant_modules' AND polrelid = to_regclass('"mes"."core_tenant_modules"')) THEN
        CREATE POLICY "tenant_isolation_core_tenant_modules" ON "mes"."core_tenant_modules" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_tenant_plugins"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_tenant_plugins' AND polrelid = to_regclass('"mes"."core_tenant_plugins"')) THEN
        CREATE POLICY "tenant_isolation_core_tenant_plugins" ON "mes"."core_tenant_plugins" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_tenant_settings"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_tenant_settings' AND polrelid = to_regclass('"mes"."core_tenant_settings"')) THEN
        CREATE POLICY "tenant_isolation_core_tenant_settings" ON "mes"."core_tenant_settings" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_tenant_usage"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_tenant_usage' AND polrelid = to_regclass('"mes"."core_tenant_usage"')) THEN
        CREATE POLICY "tenant_isolation_core_tenant_usage" ON "mes"."core_tenant_usage" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_tenant_users"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_tenant_users' AND polrelid = to_regclass('"mes"."core_tenant_users"')) THEN
        CREATE POLICY "tenant_isolation_core_tenant_users" ON "mes"."core_tenant_users" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_usage_records"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_usage_records' AND polrelid = to_regclass('"mes"."core_usage_records"')) THEN
        CREATE POLICY "tenant_isolation_core_usage_records" ON "mes"."core_usage_records" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_users"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_users' AND polrelid = to_regclass('"mes"."core_users"')) THEN
        CREATE POLICY "tenant_isolation_core_users" ON "mes"."core_users" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_workflow_instances"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_workflow_instances' AND polrelid = to_regclass('"mes"."core_workflow_instances"')) THEN
        CREATE POLICY "tenant_isolation_core_workflow_instances" ON "mes"."core_workflow_instances" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_workflow_tasks"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_workflow_tasks' AND polrelid = to_regclass('"mes"."core_workflow_tasks"')) THEN
        CREATE POLICY "tenant_isolation_core_workflow_tasks" ON "mes"."core_workflow_tasks" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF to_regclass('"mes"."core_workflows"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_workflows' AND polrelid = to_regclass('"mes"."core_workflows"')) THEN
        CREATE POLICY "tenant_isolation_core_workflows" ON "mes"."core_workflows" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_dashboard_stats' AND polrelid = to_regclass('"mes"."dashboard_stats"')) THEN
        CREATE POLICY "tenant_isolation_dashboard_stats" ON "mes"."dashboard_stats" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_financial_records' AND polrelid = to_regclass('"mes"."financial_records"')) THEN
        CREATE POLICY "tenant_isolation_financial_records" ON "mes"."financial_records" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_inspection_records' AND polrelid = to_regclass('"mes"."inspection_records"')) THEN
        CREATE POLICY "tenant_isolation_inspection_records" ON "mes"."inspection_records" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_permission_audit_logs' AND polrelid = to_regclass('"mes"."permission_audit_logs"')) THEN
        CREATE POLICY "tenant_isolation_permission_audit_logs" ON "mes"."permission_audit_logs" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_supply_chain_orders' AND polrelid = to_regclass('"mes"."supply_chain_orders"')) THEN
        CREATE POLICY "tenant_isolation_supply_chain_orders" ON "mes"."supply_chain_orders" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_tenant_permissions' AND polrelid = to_regclass('"mes"."tenant_permissions"')) THEN
        CREATE POLICY "tenant_isolation_tenant_permissions" ON "mes"."tenant_permissions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'rls_tenant_isolation' AND polrelid = to_regclass('"public"."_archive_core_workflow_versions"')) THEN
        CREATE POLICY "rls_tenant_isolation" ON "public"."_archive_core_workflow_versions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation_core_workflow_versions' AND polrelid = to_regclass('"public"."_archive_core_workflow_versions"')) THEN
        CREATE POLICY "tenant_isolation_core_workflow_versions" ON "public"."_archive_core_workflow_versions" USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)))) WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text) OR (current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
    END IF;
END $$;
ALTER TABLE "public"."_archive_core_workflow_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_comparison_analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_comparison_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_dashboard_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_dashboard_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_dashboards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_datasources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_drilldown_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_drilldown_paths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_row_level_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_self_service_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics"."analytics_widgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_billing_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_billing_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_chat_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_chat_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_dashboard_refresh_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_dict_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_dict_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_email_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_emails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_faqs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_file_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_guide_lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_guide_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_guides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_inter_module_sync" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_login_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_menu_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_menus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_migration_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_mobile_offline_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_plugin_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_plugin_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_plugin_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_plugin_pricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_plugin_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_plugins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_tenant_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_tenant_plugins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_tenant_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_tenant_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_tenant_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_usage_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_workflow_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_workflow_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mes"."core_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mes"."dashboard_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mes"."financial_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mes"."inspection_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mes"."permission_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mes"."supply_chain_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mes"."tenant_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_archive_core_workflow_versions" ENABLE ROW LEVEL SECURITY;
