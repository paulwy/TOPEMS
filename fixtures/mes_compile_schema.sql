-- ============================================================================
-- mes 编译结构快照（mes_guard.sh --sync-snapshot 自动生成，勿手改）
-- 来源: postgres://topems_app:topems_app_secret@127.0.0.1:5432/topems@postgres://topems_app:topems_app_secret@127.0.0.1:5432/topems:postgres://topems_app:topems_app_secret@127.0.0.1:5432/topems/postgres://topems_app:topems_app_secret@127.0.0.1:5432/topems  生成时间: 2026-09-28T14:35:43Z
-- 用途: CI mes-online-check 干净库编译（导入本文件后在线解析）
-- 规则: 任何 mes schema / public 共享表结构变更后，必须重新执行本脚本同步
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS mes;
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET app.tenant_id = %L', current_database(), '00000000-0000-0000-0000-000000000000'); EXCEPTION WHEN OTHERS THEN NULL; END $$;



-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;






CREATE FUNCTION mes.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;



SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE mes._sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);




CREATE TABLE mes.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    action character varying(128) DEFAULT ''::character varying NOT NULL,
    entity_type character varying(64) DEFAULT ''::character varying NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_id uuid,
    user_name character varying(256),
    request_details jsonb,
    response_details jsonb,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    ip_address character varying(64),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.audit_logs FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.batch_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    product_code character varying(64),
    quantity numeric(12,2) NOT NULL,
    unit character varying(32),
    production_date date,
    expiry_date date,
    supplier character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.bom_items (
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
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.capacities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_center_id uuid NOT NULL,
    work_center_name character varying(256),
    capacity_date date,
    available_hours numeric(10,2),
    used_hours double precision DEFAULT 0,
    utilization_rate numeric(5,2),
    status character varying(32) DEFAULT 'available'::character varying,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    workshop text
);

ALTER TABLE ONLY mes.capacities FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.core_billing_invoices (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_billing_plans (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_chat_members (
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    tenant_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name character varying(128),
    message_type character varying(32) DEFAULT 'text'::character varying,
    content text NOT NULL,
    file_url character varying(512),
    is_recalled boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128),
    room_type character varying(32) DEFAULT 'private'::character varying,
    creator_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_dashboard_refresh_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module character varying(64) NOT NULL,
    tenant_id uuid NOT NULL,
    refresh_time timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    duration_ms integer,
    row_count integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_dict_items (
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_dict_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_email_queue (
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
    sent_at timestamp with time zone
);




CREATE TABLE mes.core_email_templates (
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




CREATE TABLE mes.core_emails (
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




CREATE TABLE mes.core_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    views bigint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_file_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    parent_id uuid,
    owner_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_files (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_guide_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    duration character varying(50) DEFAULT '5min'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_guide_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    completed_lessons uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_guides (
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_inter_module_sync (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_login_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    username character varying(64) NOT NULL,
    ip_address character varying(128) NOT NULL,
    user_agent text,
    status character varying(32) NOT NULL,
    error_message text,
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_menu_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(100) NOT NULL,
    icon character varying(200),
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_menus (
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.core_migration_history (
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
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_mobile_offline_records (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_notification_templates (
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




CREATE TABLE mes.core_notifications (
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
    read_at timestamp with time zone
);




CREATE TABLE mes.core_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    resource character varying(64),
    action character varying(32),
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    description text,
    icon character varying(64),
    sort_order integer DEFAULT 0,
    plugin_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_plugin_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    runtime_url character varying(512),
    runtime_status character varying(32) DEFAULT 'stopped'::character varying,
    base_path character varying(128) DEFAULT '/api/plugins/{code}'::character varying,
    last_heartbeat timestamp without time zone,
    started_at timestamp with time zone,
    stopped_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_plugin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(255),
    resource_type character varying(50),
    action character varying(50),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_plugin_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    plugin_name character varying(128) NOT NULL,
    base_price_cents integer DEFAULT 0,
    per_user_price_cents integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_plugin_reviews (
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
    CONSTRAINT core_plugin_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);




CREATE TABLE mes.core_plugin_versions (
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
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_plugins (
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
    published_at timestamp with time zone
);




CREATE TABLE mes.core_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_subscriptions (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_tenant_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    module_code character varying(64) NOT NULL,
    module_name character varying(128),
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);




CREATE TABLE mes.core_tenant_plugins (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    setting_key character varying(128) NOT NULL,
    setting_value text,
    is_public boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_tenant_usage (
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
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email character varying(256) NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp without time zone
);




CREATE TABLE mes.core_tenants (
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
    suspended_at timestamp with time zone
);




CREATE TABLE mes.core_usage_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_type character varying(64) NOT NULL,
    metric_name character varying(128),
    quantity bigint DEFAULT 0 NOT NULL,
    unit character varying(32),
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    cost_cents integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_users (
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
    last_login_at timestamp with time zone
);




CREATE TABLE mes.core_workflow_instances (
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
    updated_at timestamp with time zone DEFAULT now()
);




CREATE TABLE mes.core_workflow_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    node_id character varying(64) NOT NULL,
    assignee_id uuid NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    comment text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);




CREATE TABLE mes.core_workflows (
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
    published_at timestamp with time zone
);




CREATE TABLE mes.crm_dashboard_snapshots (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.demand_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    forecast_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    forecast_period character varying(32),
    forecast_date date,
    forecast_quantity numeric(14,2),
    actual_quantity numeric(14,2),
    accuracy_rate numeric(5,2),
    method character varying(64) DEFAULT 'moving_average'::character varying,
    confidence_level numeric(5,2),
    notes text,
    status character varying(32) DEFAULT 'draft'::character varying,
    tenant_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.demand_forecasts FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.dynamic_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_id uuid NOT NULL,
    data_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




COMMENT ON TABLE mes.dynamic_data IS '动态数据存储表 - 根据 Schema 存储业务数据（JSONB）';



COMMENT ON COLUMN mes.dynamic_data.data_json IS '业务数据（JSONB，结构由 schema_id 对应的 schema_json 定义）';



CREATE TABLE mes.ehs_dashboard_snapshots (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.equipment (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    equipment_code character varying(100) NOT NULL,
    equipment_name character varying(255) NOT NULL,
    equipment_type character varying(50),
    category character varying(50),
    model character varying(100),
    brand character varying(100),
    serial_number character varying(100),
    specification text,
    manufacturer character varying(255),
    manufacture_date date,
    purchase_date date,
    installation_date date,
    location character varying(255),
    building character varying(100),
    floor character varying(50),
    area character varying(100),
    work_station_id uuid,
    responsible_person character varying(255),
    responsible_person_id uuid,
    department character varying(100),
    purchase_price numeric(15,2),
    current_value numeric(15,2),
    depreciation_rate numeric(5,2),
    warranty_expiry_date date,
    power_consumption numeric(10,2),
    capacity character varying(100),
    max_capacity numeric(10,2),
    current_capacity numeric(10,2),
    efficiency_percentage numeric(5,2),
    availability_percentage numeric(5,2),
    performance_percentage numeric(5,2),
    quality_percentage numeric(5,2),
    oee_percentage numeric(5,2),
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    operating_status character varying(20),
    last_inspection_date date,
    next_inspection_date date,
    last_maintenance_date date,
    next_maintenance_date date,
    maintenance_frequency_days integer,
    total_operating_hours numeric(10,2),
    total_maintenance_count integer,
    total_failure_count integer,
    last_failure_date date,
    failure_description text,
    operating_hours jsonb,
    maintenance_history jsonb,
    inspection_history jsonb,
    failure_history jsonb,
    notes text,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    description text,
    equipment_no text,
    equipment_name_en character varying(255)
);

ALTER TABLE ONLY mes.equipment FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.equipment IS '设备表';



COMMENT ON COLUMN mes.equipment.equipment_type IS '设备类型：production, testing, auxiliary等';



COMMENT ON COLUMN mes.equipment.status IS '状态：available, in_use, maintenance, repair, scrapped等';



COMMENT ON COLUMN mes.equipment.operating_status IS '运行状态：running, idle, standby, fault等';



CREATE TABLE mes.equipment_inspection_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    equipment_code character varying(100),
    equipment_name character varying(255),
    inspection_type character varying(50),
    inspector character varying(255) NOT NULL,
    inspector_id uuid,
    inspection_date date NOT NULL,
    inspection_time time without time zone,
    location character varying(255),
    temperature numeric(10,2),
    vibration numeric(10,2),
    noise_level numeric(10,2),
    humidity numeric(5,2),
    pressure numeric(10,2),
    voltage numeric(10,2),
    current numeric(10,2),
    speed numeric(10,2),
    inspection_items jsonb,
    overall_status character varying(20) NOT NULL,
    abnormalities text,
    recommendations text,
    next_inspection_date date,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    attachments jsonb,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.equipment_inspection_records FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.equipment_inspection_records IS '设备检验记录表';



COMMENT ON COLUMN mes.equipment_inspection_records.inspection_type IS '检验类型：routine, special, annual等';



CREATE TABLE mes.equipment_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    equipment_code character varying(64),
    equipment_name character varying(128),
    inspector character varying(128) NOT NULL,
    inspection_date character varying(32) NOT NULL,
    location character varying(256),
    temperature numeric(10,2),
    vibration numeric(10,4),
    noiselevel numeric(10,2),
    status character varying(32) DEFAULT 'normal'::character varying,
    items jsonb,
    abnormalities text,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.equipment_maintenance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    equipment_code character varying(100),
    equipment_name character varying(255),
    maintenance_type character varying(50) NOT NULL,
    maintenance_category character varying(50),
    description text NOT NULL,
    maintainer character varying(255) NOT NULL,
    maintainer_id uuid,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_minutes numeric(10,2),
    cost numeric(15,2),
    parts_replaced jsonb,
    parts_cost numeric(15,2),
    labor_cost numeric(15,2),
    other_cost numeric(15,2),
    result character varying(20),
    effectiveness character varying(20),
    issues_found text,
    recommendations text,
    next_maintenance_date date,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    attachments jsonb,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    completed_at timestamp with time zone,
    fault_reason text
);

ALTER TABLE ONLY mes.equipment_maintenance_records FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.equipment_maintenance_records IS '设备维护记录表';



COMMENT ON COLUMN mes.equipment_maintenance_records.maintenance_type IS '维护类型：preventive, corrective, emergency等';



COMMENT ON COLUMN mes.equipment_maintenance_records.status IS '状态：in_progress, completed, cancelled等';



CREATE TABLE mes.equipment_oee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    record_date date NOT NULL,
    planned_production_time numeric(10,2) NOT NULL,
    actual_run_time numeric(10,2) NOT NULL,
    downtime numeric(10,2) DEFAULT 0,
    ideal_cycle_time numeric(10,4) NOT NULL,
    actual_output numeric(12,2) NOT NULL,
    good_output numeric(12,2) NOT NULL,
    defective_output numeric(12,2) DEFAULT 0,
    availability numeric(5,4) DEFAULT 0,
    performance numeric(5,4) DEFAULT 0,
    quality_rate numeric(5,4) DEFAULT 0,
    oee numeric(5,4) DEFAULT 0,
    shift character varying(32),
    operator character varying(128),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    tenant_id uuid
);




CREATE TABLE mes.hrm_dashboard_snapshots (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.lims_dashboard_snapshots (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.material_boms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bom_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256) NOT NULL,
    product_code character varying(64) NOT NULL,
    version character varying(32) DEFAULT '1.0'::character varying,
    status character varying(32) DEFAULT 'draft'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);




CREATE TABLE mes.material_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL
);




CREATE TABLE mes.material_issue_items (
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
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.material_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    bom_id uuid,
    status character varying(32) DEFAULT 'pending'::character varying,
    warehouse_id uuid,
    operator_id uuid,
    issue_time timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);




CREATE TABLE mes.material_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no text NOT NULL,
    plan_id uuid,
    material_id uuid,
    material_code text,
    material_name text,
    required_quantity double precision DEFAULT 0 NOT NULL,
    available_quantity double precision DEFAULT 0 NOT NULL,
    shortfall_quantity double precision DEFAULT 0 NOT NULL,
    required_date timestamp with time zone,
    supply_type text DEFAULT 'purchase'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    tenant_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.material_requirement_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL
);




CREATE TABLE mes.material_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mrp_no character varying(64) NOT NULL,
    order_id uuid,
    order_number character varying(64),
    product_code character varying(64) NOT NULL,
    product_name character varying(256) NOT NULL,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    specification character varying(256),
    unit character varying(32),
    required_quantity numeric(12,4) NOT NULL,
    available_quantity numeric(12,4) DEFAULT 0,
    shortfall_quantity numeric(12,4) DEFAULT 0,
    required_date character varying(32) NOT NULL,
    priority character varying(32) DEFAULT 'normal'::character varying,
    status character varying(32) DEFAULT 'pending'::character varying,
    source_type character varying(32),
    remark text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.material_return_items (
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
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.material_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    warehouse_id uuid,
    operator_id uuid,
    return_time timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);




CREATE TABLE mes.module_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    category text NOT NULL,
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);




CREATE TABLE mes.pdm_dashboard_snapshots (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.process_flow_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_id uuid NOT NULL,
    process_id uuid NOT NULL,
    sequence integer NOT NULL,
    work_station_id uuid,
    equipment_ids uuid[] DEFAULT '{}'::uuid[],
    standard_time double precision,
    wait_time double precision,
    transfer_time text,
    quality_check_required boolean DEFAULT false,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.process_flow_steps FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.process_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    version integer,
    status character varying(32) DEFAULT 'active'::character varying,
    route_id uuid,
    production_line character varying(256),
    capacity double precision,
    unit character varying(32),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone,
    name_en character varying(255)
);

ALTER TABLE ONLY mes.process_flows FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.process_route_steps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    route_id uuid NOT NULL,
    process_id uuid NOT NULL,
    sequence integer NOT NULL,
    is_parallel boolean DEFAULT false,
    parallel_group integer,
    estimated_time_minutes numeric(10,2),
    estimated_cost numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.process_route_steps FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.process_route_steps IS '工艺路线明细表';



CREATE TABLE mes.process_routes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    route_code character varying(100) NOT NULL,
    route_name character varying(255) NOT NULL,
    product_code character varying(100),
    product_name character varying(255),
    description text,
    version character varying(20) DEFAULT '1.0'::character varying,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    total_time_minutes numeric(10,2),
    total_cost numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.process_routes FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.process_routes IS '工艺路线表';



CREATE TABLE mes.production_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid,
    order_id uuid,
    cost_category text,
    cost_date date,
    quantity double precision DEFAULT 0,
    total_cost numeric DEFAULT 0,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workshop text
);




CREATE TABLE mes.production_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid,
    order_number character varying(100) NOT NULL,
    order_type character varying(50),
    product_name character varying(255) NOT NULL,
    product_code character varying(100),
    product_specification text,
    batch_number character varying(100),
    quantity integer NOT NULL,
    unit character varying(20) DEFAULT 'piece'::character varying,
    planned_quantity integer,
    completed_quantity numeric(12,2) DEFAULT 0,
    rejected_quantity integer DEFAULT 0,
    scrapped_quantity integer DEFAULT 0,
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'created'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    estimated_duration_hours numeric(10,2),
    actual_duration_hours numeric(10,2),
    customer_id uuid,
    customer_name character varying(255),
    customer_order_number character varying(100),
    sales_order_id uuid,
    process_route_id uuid,
    process_route_name character varying(255),
    work_station_id uuid,
    work_station_name character varying(255),
    assigned_to character varying(255),
    assigned_to_id uuid,
    team character varying(100),
    material_requirements jsonb,
    tool_requirements jsonb,
    quality_requirements jsonb,
    special_instructions text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    source_order_id uuid,
    source_order_number character varying,
    workshop_id uuid,
    product_name_en character varying(255),
    order_no character varying(100) DEFAULT ''::character varying NOT NULL
);

ALTER TABLE ONLY mes.production_orders FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.production_orders IS '生产订单表';



COMMENT ON COLUMN mes.production_orders.order_type IS '订单类型：standard, urgent, trial, sample等';



COMMENT ON COLUMN mes.production_orders.priority IS '优先级：urgent, high, normal, low等';



COMMENT ON COLUMN mes.production_orders.status IS '状态：created, released, in_progress, completed, cancelled等';



CREATE TABLE mes.production_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    plan_name character varying(256) NOT NULL,
    plan_type character varying(32) DEFAULT 'monthly'::character varying,
    start_date date,
    end_date date,
    status character varying(32) DEFAULT 'draft'::character varying,
    product_id uuid,
    product_name character varying(256),
    target_quantity numeric(14,2),
    notes text,
    tenant_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.production_plans FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.production_processes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    process_code character varying(100),
    process_name character varying(255) NOT NULL,
    process_type character varying(50),
    description text,
    sequence integer NOT NULL,
    version character varying(20) DEFAULT '1.0'::character varying,
    is_active boolean DEFAULT true,
    standard_time_minutes numeric(10,2),
    setup_time_minutes numeric(10,2),
    cycle_time_minutes numeric(10,2),
    wait_time_minutes numeric(10,2),
    work_station_id uuid,
    work_station_name character varying(255),
    required_skills jsonb,
    required_tools jsonb,
    required_materials jsonb,
    quality_check_points jsonb,
    safety_requirements text,
    environmental_requirements text,
    operation_instructions text,
    parameters jsonb,
    predecessor_process_id uuid,
    successor_process_id uuid,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    equipment_required boolean
);

ALTER TABLE ONLY mes.production_processes FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.production_processes IS '生产工艺表';



COMMENT ON COLUMN mes.production_processes.process_type IS '工艺类型：assembly, machining, welding, inspection等';



COMMENT ON COLUMN mes.production_processes.sequence IS '工艺顺序号';



CREATE TABLE mes.production_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    process_id uuid,
    process_name character varying(255),
    route_step_id uuid,
    work_station_id uuid,
    work_station_name character varying(255),
    operator character varying(255) NOT NULL,
    operator_id uuid,
    team character varying(100),
    batch_number character varying(100),
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_minutes numeric(10,2),
    planned_quantity integer,
    completed_quantity numeric(12,2) DEFAULT 0 NOT NULL,
    good_quantity integer DEFAULT 0,
    rejected_quantity integer DEFAULT 0,
    scrapped_quantity integer DEFAULT 0,
    rework_quantity integer DEFAULT 0,
    yield_rate numeric(5,2),
    efficiency_rate numeric(5,2),
    quality_check_result character varying(20),
    quality_check_notes text,
    material_usage jsonb,
    tool_usage jsonb,
    parameters jsonb,
    deviations text,
    issues text,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    notes text,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

ALTER TABLE ONLY mes.production_records FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.production_records IS '生产记录表';



COMMENT ON COLUMN mes.production_records.quality_check_result IS '质检结果：passed, failed, conditional等';



COMMENT ON COLUMN mes.production_records.status IS '状态：in_progress, completed, paused, cancelled等';



CREATE TABLE mes.production_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256) NOT NULL,
    product_code character varying(64) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    completed_quantity numeric(12,2) DEFAULT 0,
    work_station_id uuid,
    equipment_id uuid,
    process_id uuid,
    planned_start_time timestamp without time zone,
    planned_end_time timestamp without time zone,
    actual_start_time timestamp without time zone,
    actual_end_time timestamp without time zone,
    status character varying(32) DEFAULT 'pending'::character varying,
    priority integer DEFAULT 0,
    sequence integer DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    tenant_id uuid
);




CREATE TABLE mes.quality_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspection_no character varying(64) NOT NULL,
    order_id uuid,
    order_number character varying(64),
    product_code character varying(64) NOT NULL,
    product_name character varying(256) NOT NULL,
    process_id uuid,
    process_name character varying(128),
    inspection_type character varying(32) NOT NULL,
    quantity numeric(12,4) DEFAULT 0 NOT NULL,
    qualified_quantity numeric(12,4) DEFAULT 0 NOT NULL,
    unqualified_quantity numeric(12,4) DEFAULT 0 NOT NULL,
    qualification_rate numeric(6,2) DEFAULT 0,
    inspector character varying(128),
    inspection_time character varying(32),
    status character varying(32) DEFAULT 'pending'::character varying,
    result character varying(32),
    memo text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone,
    concession_approval_id uuid
);

ALTER TABLE ONLY mes.quality_inspections FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_patrol_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patrol_id uuid NOT NULL,
    item_name character varying(256) NOT NULL,
    standard character varying(256),
    actual_value character varying(256),
    status character varying(32) DEFAULT 'pending'::character varying,
    remark text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.quality_patrol_items FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_patrols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patrol_no character varying(64) NOT NULL,
    production_line character varying(128),
    workstation_id uuid,
    workstation_name character varying(256),
    inspector character varying(128) NOT NULL,
    patrol_time character varying(32),
    status character varying(32) DEFAULT 'pending'::character varying,
    result character varying(32),
    findings text,
    memo text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.quality_patrols FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    record_type character varying(32) DEFAULT 'inspection'::character varying,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256),
    product_code character varying(64),
    batch_no character varying(64),
    quantity numeric(12,2) NOT NULL,
    qualified_quantity numeric(12,2) DEFAULT 0,
    defective_quantity numeric(12,2) DEFAULT 0,
    quality_status character varying(32) DEFAULT 'pending'::character varying,
    inspector character varying(128),
    inspection_time timestamp without time zone,
    defect_reason text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.quality_standard_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    standard_id uuid NOT NULL,
    item_name character varying(256) NOT NULL,
    lower_limit numeric(12,4),
    upper_limit numeric(12,4),
    unit character varying(32),
    inspection_method character varying(256),
    remark text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.quality_standard_values FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.quality_standards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    product_code character varying(64),
    product_name character varying(256),
    inspection_type character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    version integer,
    effective_date character varying(32),
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY mes.quality_standards FORCE ROW LEVEL SECURITY;




CREATE TABLE mes.schema_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    schema_json jsonb NOT NULL,
    table_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);




COMMENT ON TABLE mes.schema_registry IS 'Schema 注册表 - 存储前端 EntitySchema 配置，驱动动态 CRUD API';



COMMENT ON COLUMN mes.schema_registry.schema_json IS 'EntitySchema JSON 配置（含 fields、list、form 等）';



COMMENT ON COLUMN mes.schema_registry.table_name IS '动态创建的数据表名（dynamic_<name>）';



CREATE TABLE mes.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(128) NOT NULL,
    employee_code character varying(64),
    "position" character varying(64),
    join_date timestamp without time zone DEFAULT now(),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_code character varying(64) NOT NULL,
    team_name character varying(128) NOT NULL,
    team_type character varying(32),
    work_station_id uuid,
    leader_id uuid,
    leader_name character varying(128),
    member_count integer DEFAULT 0,
    status character varying(32) DEFAULT 'active'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    tenant_id uuid
);




CREATE TABLE mes.wip_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_no character varying(64) NOT NULL,
    wip_id uuid NOT NULL,
    from_process_id uuid,
    from_work_station_id uuid,
    to_process_id uuid,
    to_work_station_id uuid,
    quantity numeric(12,2) NOT NULL,
    transfer_time timestamp without time zone NOT NULL,
    operator character varying(128),
    transfer_type character varying(32) DEFAULT 'process_transfer'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp with time zone
);




CREATE TABLE mes.wips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wip_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256) NOT NULL,
    product_code character varying(64) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    current_process_id uuid,
    current_work_station_id uuid,
    status character varying(32) DEFAULT 'in_progress'::character varying,
    batch_no character varying(64),
    start_time timestamp without time zone,
    last_transfer_time timestamp without time zone,
    operator character varying(128),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);




CREATE TABLE mes.wms_dashboard_snapshots (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);




CREATE TABLE mes.work_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_no character varying(64) NOT NULL,
    order_id uuid,
    order_no character varying(64),
    product_code character varying(64),
    product_name character varying(256),
    work_station_id uuid,
    process_id uuid,
    planned_quantity numeric(12,2) DEFAULT 0,
    completed_quantity numeric(12,2) DEFAULT 0,
    plan_start_date timestamp without time zone,
    plan_end_date timestamp without time zone,
    actual_start_date timestamp without time zone,
    actual_end_date timestamp without time zone,
    team_id uuid,
    operator character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    priority integer DEFAULT 0,
    remark text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);




CREATE TABLE mes.work_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_no character varying(100) NOT NULL,
    organization_id uuid,
    work_order_id uuid,
    work_order_no character varying(100),
    order_id uuid,
    order_no character varying(100),
    work_station_id uuid,
    work_station_name character varying(255),
    reporter_name character varying(255) NOT NULL,
    report_date date,
    shift character varying(50),
    output_quantity numeric DEFAULT 0,
    defect_quantity numeric DEFAULT 0,
    labor_hours numeric DEFAULT 0,
    remark text,
    status character varying(50) DEFAULT 'pending'::character varying,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_remark text
);




CREATE TABLE mes.work_stations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid,
    station_code character varying(100),
    station_name character varying(255) NOT NULL,
    station_type character varying(50),
    description text,
    location character varying(255),
    building character varying(100),
    floor character varying(50),
    area character varying(100),
    capacity integer DEFAULT 1,
    current_load integer DEFAULT 0,
    efficiency_percentage numeric(5,2) DEFAULT 100,
    supervisor character varying(255),
    supervisor_id uuid,
    team character varying(100),
    equipment_ids jsonb,
    available_skills jsonb,
    available_tools jsonb,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    last_maintenance_date date,
    next_maintenance_date date,
    maintenance_frequency_days integer,
    operating_hours jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    station_no character varying(100),
    workshop_id uuid,
    equipment_id uuid,
    process_id uuid
);

ALTER TABLE ONLY mes.work_stations FORCE ROW LEVEL SECURITY;




COMMENT ON TABLE mes.work_stations IS '工作站表';



COMMENT ON COLUMN mes.work_stations.station_type IS '工作站类型：assembly, machining, welding, packaging等';



COMMENT ON COLUMN mes.work_stations.status IS '状态：available, busy, maintenance, offline等';



ALTER TABLE ONLY mes._sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);



ALTER TABLE ONLY mes.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.batch_records
    ADD CONSTRAINT batch_records_batch_no_key UNIQUE (batch_no);



ALTER TABLE ONLY mes.batch_records
    ADD CONSTRAINT batch_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.capacities
    ADD CONSTRAINT capacities_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.capacities
    ADD CONSTRAINT capacities_tenant_id_work_center_id_capacity_date_key UNIQUE (tenant_id, work_center_id, capacity_date);



ALTER TABLE ONLY mes.core_billing_invoices
    ADD CONSTRAINT core_billing_invoices_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_billing_invoices
    ADD CONSTRAINT core_billing_invoices_tenant_id_invoice_number_key UNIQUE (tenant_id, invoice_number);



ALTER TABLE ONLY mes.core_billing_plans
    ADD CONSTRAINT core_billing_plans_code_key UNIQUE (code);



ALTER TABLE ONLY mes.core_billing_plans
    ADD CONSTRAINT core_billing_plans_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_chat_members
    ADD CONSTRAINT core_chat_members_pkey PRIMARY KEY (room_id, user_id);



ALTER TABLE ONLY mes.core_chat_messages
    ADD CONSTRAINT core_chat_messages_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_chat_rooms
    ADD CONSTRAINT core_chat_rooms_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_dashboard_refresh_log
    ADD CONSTRAINT core_dashboard_refresh_log_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_dict_items
    ADD CONSTRAINT core_dict_items_dict_type_id_code_key UNIQUE (dict_type_id, code);



ALTER TABLE ONLY mes.core_dict_items
    ADD CONSTRAINT core_dict_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_dict_types
    ADD CONSTRAINT core_dict_types_code_key UNIQUE (code);



ALTER TABLE ONLY mes.core_dict_types
    ADD CONSTRAINT core_dict_types_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_email_queue
    ADD CONSTRAINT core_email_queue_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_email_templates
    ADD CONSTRAINT core_email_templates_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_emails
    ADD CONSTRAINT core_emails_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_faqs
    ADD CONSTRAINT core_faqs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_file_folders
    ADD CONSTRAINT core_file_folders_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_files
    ADD CONSTRAINT core_files_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_guide_lessons
    ADD CONSTRAINT core_guide_lessons_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_guide_progress
    ADD CONSTRAINT core_guide_progress_guide_id_user_id_key UNIQUE (guide_id, user_id);



ALTER TABLE ONLY mes.core_guide_progress
    ADD CONSTRAINT core_guide_progress_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_guides
    ADD CONSTRAINT core_guides_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_inter_module_sync
    ADD CONSTRAINT core_inter_module_sync_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_login_logs
    ADD CONSTRAINT core_login_logs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_menu_groups
    ADD CONSTRAINT core_menu_groups_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_menu_groups
    ADD CONSTRAINT core_menu_groups_tenant_id_code_key UNIQUE (tenant_id, code);



ALTER TABLE ONLY mes.core_menus
    ADD CONSTRAINT core_menus_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_menus
    ADD CONSTRAINT core_menus_tenant_id_code_key UNIQUE (tenant_id, code);



ALTER TABLE ONLY mes.core_migration_history
    ADD CONSTRAINT core_migration_history_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_migration_history
    ADD CONSTRAINT core_migration_history_plugin_name_version_key UNIQUE (plugin_name, version);



ALTER TABLE ONLY mes.core_mobile_offline_records
    ADD CONSTRAINT core_mobile_offline_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_notification_templates
    ADD CONSTRAINT core_notification_templates_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_notifications
    ADD CONSTRAINT core_notifications_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_permissions
    ADD CONSTRAINT core_permissions_code_key UNIQUE (code);



ALTER TABLE ONLY mes.core_permissions
    ADD CONSTRAINT core_permissions_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_plugin_categories
    ADD CONSTRAINT core_plugin_categories_code_key UNIQUE (code);



ALTER TABLE ONLY mes.core_plugin_categories
    ADD CONSTRAINT core_plugin_categories_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_plugin_id_key UNIQUE (plugin_id);



ALTER TABLE ONLY mes.core_plugin_permissions
    ADD CONSTRAINT core_plugin_permissions_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_plugin_permissions
    ADD CONSTRAINT core_plugin_permissions_plugin_code_permission_code_key UNIQUE (plugin_code, permission_code);



ALTER TABLE ONLY mes.core_plugin_pricing
    ADD CONSTRAINT core_plugin_pricing_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_plugin_pricing
    ADD CONSTRAINT core_plugin_pricing_plugin_code_key UNIQUE (plugin_code);



ALTER TABLE ONLY mes.core_plugin_reviews
    ADD CONSTRAINT core_plugin_reviews_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_plugin_id_version_key UNIQUE (plugin_id, version);



ALTER TABLE ONLY mes.core_plugins
    ADD CONSTRAINT core_plugins_code_key UNIQUE (code);



ALTER TABLE ONLY mes.core_plugins
    ADD CONSTRAINT core_plugins_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_role_permissions
    ADD CONSTRAINT core_role_permissions_pkey PRIMARY KEY (role_id, permission_id);



ALTER TABLE ONLY mes.core_roles
    ADD CONSTRAINT core_roles_name_key UNIQUE (name);



ALTER TABLE ONLY mes.core_roles
    ADD CONSTRAINT core_roles_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_subscriptions
    ADD CONSTRAINT core_subscriptions_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_subscriptions
    ADD CONSTRAINT core_subscriptions_tenant_id_key UNIQUE (tenant_id);



ALTER TABLE ONLY mes.core_tenant_modules
    ADD CONSTRAINT core_tenant_modules_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_tenant_modules
    ADD CONSTRAINT core_tenant_modules_tenant_id_module_code_key UNIQUE (tenant_id, module_code);



ALTER TABLE ONLY mes.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_tenant_id_plugin_id_key UNIQUE (tenant_id, plugin_id);



ALTER TABLE ONLY mes.core_tenant_settings
    ADD CONSTRAINT core_tenant_settings_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_tenant_settings
    ADD CONSTRAINT core_tenant_settings_tenant_id_setting_key_key UNIQUE (tenant_id, setting_key);



ALTER TABLE ONLY mes.core_tenant_usage
    ADD CONSTRAINT core_tenant_usage_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_tenant_usage
    ADD CONSTRAINT core_tenant_usage_tenant_id_period_start_key UNIQUE (tenant_id, period_start);



ALTER TABLE ONLY mes.core_tenant_users
    ADD CONSTRAINT core_tenant_users_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_tenant_users
    ADD CONSTRAINT core_tenant_users_tenant_id_email_key UNIQUE (tenant_id, email);



ALTER TABLE ONLY mes.core_tenant_users
    ADD CONSTRAINT core_tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id);



ALTER TABLE ONLY mes.core_tenants
    ADD CONSTRAINT core_tenants_code_key UNIQUE (code);



ALTER TABLE ONLY mes.core_tenants
    ADD CONSTRAINT core_tenants_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_usage_records
    ADD CONSTRAINT core_usage_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_user_roles
    ADD CONSTRAINT core_user_roles_pkey PRIMARY KEY (user_id, role_id);



ALTER TABLE ONLY mes.core_users
    ADD CONSTRAINT core_users_email_key UNIQUE (email);



ALTER TABLE ONLY mes.core_users
    ADD CONSTRAINT core_users_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_users
    ADD CONSTRAINT core_users_username_key UNIQUE (username);



ALTER TABLE ONLY mes.core_workflow_instances
    ADD CONSTRAINT core_workflow_instances_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_workflow_tasks
    ADD CONSTRAINT core_workflow_tasks_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.core_workflows
    ADD CONSTRAINT core_workflows_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.crm_dashboard_snapshots
    ADD CONSTRAINT crm_dashboard_snapshots_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.crm_dashboard_snapshots
    ADD CONSTRAINT crm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);



ALTER TABLE ONLY mes.demand_forecasts
    ADD CONSTRAINT demand_forecasts_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.demand_forecasts
    ADD CONSTRAINT demand_forecasts_tenant_id_forecast_no_key UNIQUE (tenant_id, forecast_no);



ALTER TABLE ONLY mes.dynamic_data
    ADD CONSTRAINT dynamic_data_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.ehs_dashboard_snapshots
    ADD CONSTRAINT ehs_dashboard_snapshots_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.ehs_dashboard_snapshots
    ADD CONSTRAINT ehs_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);



ALTER TABLE ONLY mes.equipment_inspection_records
    ADD CONSTRAINT equipment_inspection_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment_inspections
    ADD CONSTRAINT equipment_inspections_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment_maintenance_records
    ADD CONSTRAINT equipment_maintenance_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment_oee
    ADD CONSTRAINT equipment_oee_equipment_id_record_date_shift_key UNIQUE (equipment_id, record_date, shift);



ALTER TABLE ONLY mes.equipment_oee
    ADD CONSTRAINT equipment_oee_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.hrm_dashboard_snapshots
    ADD CONSTRAINT hrm_dashboard_snapshots_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.hrm_dashboard_snapshots
    ADD CONSTRAINT hrm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);



ALTER TABLE ONLY mes.lims_dashboard_snapshots
    ADD CONSTRAINT lims_dashboard_snapshots_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.lims_dashboard_snapshots
    ADD CONSTRAINT lims_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);



ALTER TABLE ONLY mes.material_boms
    ADD CONSTRAINT material_boms_bom_no_key UNIQUE (bom_no);



ALTER TABLE ONLY mes.material_boms
    ADD CONSTRAINT material_boms_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_issue_items
    ADD CONSTRAINT material_issue_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_issue_no_key UNIQUE (issue_no);



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_plans
    ADD CONSTRAINT material_plans_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_plans
    ADD CONSTRAINT material_plans_plan_no_key UNIQUE (plan_no);



ALTER TABLE ONLY mes.material_requirement_items
    ADD CONSTRAINT material_requirement_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_requirements
    ADD CONSTRAINT material_requirements_mrp_no_key UNIQUE (mrp_no);



ALTER TABLE ONLY mes.material_requirements
    ADD CONSTRAINT material_requirements_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_return_items
    ADD CONSTRAINT material_return_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_returns
    ADD CONSTRAINT material_returns_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.material_returns
    ADD CONSTRAINT material_returns_return_no_key UNIQUE (return_no);



ALTER TABLE ONLY mes.module_settings
    ADD CONSTRAINT module_settings_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.module_settings
    ADD CONSTRAINT module_settings_tenant_id_category_key_key UNIQUE (tenant_id, category, key);



ALTER TABLE ONLY mes.pdm_dashboard_snapshots
    ADD CONSTRAINT pdm_dashboard_snapshots_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.pdm_dashboard_snapshots
    ADD CONSTRAINT pdm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);



ALTER TABLE ONLY mes.process_flow_steps
    ADD CONSTRAINT process_flow_steps_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.process_flows
    ADD CONSTRAINT process_flows_code_key UNIQUE (code);



ALTER TABLE ONLY mes.process_flows
    ADD CONSTRAINT process_flows_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.process_route_steps
    ADD CONSTRAINT process_route_steps_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.process_routes
    ADD CONSTRAINT process_routes_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_costs
    ADD CONSTRAINT production_costs_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_plans
    ADD CONSTRAINT production_plans_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_plans
    ADD CONSTRAINT production_plans_tenant_id_plan_no_key UNIQUE (tenant_id, plan_no);



ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_schedule_no_key UNIQUE (schedule_no);



ALTER TABLE ONLY mes.quality_inspections
    ADD CONSTRAINT quality_inspections_inspection_no_key UNIQUE (inspection_no);



ALTER TABLE ONLY mes.quality_inspections
    ADD CONSTRAINT quality_inspections_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_patrol_items
    ADD CONSTRAINT quality_patrol_items_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_patrols
    ADD CONSTRAINT quality_patrols_patrol_no_key UNIQUE (patrol_no);



ALTER TABLE ONLY mes.quality_patrols
    ADD CONSTRAINT quality_patrols_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_records
    ADD CONSTRAINT quality_records_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_records
    ADD CONSTRAINT quality_records_record_no_key UNIQUE (record_no);



ALTER TABLE ONLY mes.quality_standard_values
    ADD CONSTRAINT quality_standard_values_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.quality_standards
    ADD CONSTRAINT quality_standards_code_key UNIQUE (code);



ALTER TABLE ONLY mes.quality_standards
    ADD CONSTRAINT quality_standards_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.schema_registry
    ADD CONSTRAINT schema_registry_name_key UNIQUE (name);



ALTER TABLE ONLY mes.schema_registry
    ADD CONSTRAINT schema_registry_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.teams
    ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_transfer_no_key UNIQUE (transfer_no);



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_wip_no_key UNIQUE (wip_no);



ALTER TABLE ONLY mes.wms_dashboard_snapshots
    ADD CONSTRAINT wms_dashboard_snapshots_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.wms_dashboard_snapshots
    ADD CONSTRAINT wms_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);



ALTER TABLE ONLY mes.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.work_orders
    ADD CONSTRAINT work_orders_work_order_no_key UNIQUE (work_order_no);



ALTER TABLE ONLY mes.work_reports
    ADD CONSTRAINT work_reports_pkey PRIMARY KEY (id);



ALTER TABLE ONLY mes.work_stations
    ADD CONSTRAINT work_stations_pkey PRIMARY KEY (id);



CREATE INDEX audit_logs_tenant_id_idx ON mes.audit_logs USING btree (tenant_id);



CREATE INDEX equipment_tenant_id_idx ON mes.equipment USING btree (tenant_id);



CREATE INDEX idx_batch_records_batch_no ON mes.batch_records USING btree (batch_no);



CREATE INDEX idx_bom_items_bom_id ON mes.bom_items USING btree (bom_id);



CREATE INDEX idx_core_billing_plans_tenant ON mes.core_billing_plans USING btree (tenant_id);



CREATE INDEX idx_core_chat_members_tenant ON mes.core_chat_members USING btree (tenant_id);



CREATE INDEX idx_core_chat_messages_room ON mes.core_chat_messages USING btree (room_id);



CREATE INDEX idx_core_chat_messages_tenant ON mes.core_chat_messages USING btree (tenant_id);



CREATE INDEX idx_core_chat_rooms_members ON mes.core_chat_members USING btree (user_id);



CREATE INDEX idx_core_emails_tenant ON mes.core_emails USING btree (tenant_id);



CREATE INDEX idx_core_emails_to ON mes.core_emails USING btree (to_email);



CREATE INDEX idx_core_faqs_active ON mes.core_faqs USING btree (is_active);



CREATE INDEX idx_core_faqs_category ON mes.core_faqs USING btree (category);



CREATE INDEX idx_core_faqs_sort ON mes.core_faqs USING btree (sort_order);



CREATE INDEX idx_core_faqs_tenant ON mes.core_faqs USING btree (tenant_id);



CREATE INDEX idx_core_file_folders_parent ON mes.core_file_folders USING btree (parent_id);



CREATE INDEX idx_core_file_folders_tenant ON mes.core_file_folders USING btree (tenant_id);



CREATE INDEX idx_core_files_folder ON mes.core_files USING btree (folder_id);



CREATE INDEX idx_core_files_tenant ON mes.core_files USING btree (tenant_id);



CREATE INDEX idx_core_files_uploader ON mes.core_files USING btree (uploader_id);



CREATE INDEX idx_core_guide_lessons_active ON mes.core_guide_lessons USING btree (is_active);



CREATE INDEX idx_core_guide_lessons_guide_id ON mes.core_guide_lessons USING btree (guide_id);



CREATE INDEX idx_core_guide_lessons_sort ON mes.core_guide_lessons USING btree (sort_order);



CREATE INDEX idx_core_guide_lessons_tenant ON mes.core_guide_lessons USING btree (tenant_id);



CREATE INDEX idx_core_guide_progress_guide ON mes.core_guide_progress USING btree (guide_id);



CREATE INDEX idx_core_guide_progress_tenant ON mes.core_guide_progress USING btree (tenant_id);



CREATE INDEX idx_core_guide_progress_user ON mes.core_guide_progress USING btree (user_id);



CREATE INDEX idx_core_guides_active ON mes.core_guides USING btree (is_active);



CREATE INDEX idx_core_guides_category ON mes.core_guides USING btree (category);



CREATE INDEX idx_core_guides_sort ON mes.core_guides USING btree (sort_order);



CREATE INDEX idx_core_guides_tenant ON mes.core_guides USING btree (tenant_id);



CREATE INDEX idx_core_instances_tenant ON mes.core_workflow_instances USING btree (tenant_id);



CREATE INDEX idx_core_instances_workflow ON mes.core_workflow_instances USING btree (workflow_id);



CREATE INDEX idx_core_invoices_status ON mes.core_billing_invoices USING btree (status);



CREATE INDEX idx_core_invoices_tenant ON mes.core_billing_invoices USING btree (tenant_id);



CREATE INDEX idx_core_menu_groups_status ON mes.core_menu_groups USING btree (status);



CREATE INDEX idx_core_menu_groups_tenant_id ON mes.core_menu_groups USING btree (tenant_id);



CREATE INDEX idx_core_menus_group_id ON mes.core_menus USING btree (group_id);



CREATE INDEX idx_core_menus_parent_id ON mes.core_menus USING btree (parent_id);



CREATE INDEX idx_core_menus_status ON mes.core_menus USING btree (status);



CREATE INDEX idx_core_menus_tenant_id ON mes.core_menus USING btree (tenant_id);



CREATE INDEX idx_core_migration_history_plugin ON mes.core_migration_history USING btree (plugin_name);



CREATE INDEX idx_core_migration_history_tenant ON mes.core_migration_history USING btree (tenant_id);



CREATE INDEX idx_core_notifications_tenant ON mes.core_notifications USING btree (tenant_id);



CREATE INDEX idx_core_notifications_user ON mes.core_notifications USING btree (user_id);



CREATE INDEX idx_core_plugin_instances_status ON mes.core_plugin_instances USING btree (runtime_status);



CREATE INDEX idx_core_plugin_instances_tenant ON mes.core_plugin_instances USING btree (tenant_id);



CREATE INDEX idx_core_plugin_permissions_code ON mes.core_plugin_permissions USING btree (plugin_code);



CREATE INDEX idx_core_plugin_permissions_tenant ON mes.core_plugin_permissions USING btree (tenant_id);



CREATE INDEX idx_core_plugin_pricing_tenant ON mes.core_plugin_pricing USING btree (tenant_id);



CREATE INDEX idx_core_plugin_reviews_plugin ON mes.core_plugin_reviews USING btree (plugin_id);



CREATE INDEX idx_core_plugin_reviews_tenant ON mes.core_plugin_reviews USING btree (tenant_id);



CREATE INDEX idx_core_plugins_category ON mes.core_plugins USING btree (category);



CREATE INDEX idx_core_plugins_code ON mes.core_plugins USING btree (code);



CREATE INDEX idx_core_plugins_installed ON mes.core_plugins USING btree (is_installed);



CREATE INDEX idx_core_plugins_tenant ON mes.core_plugins USING btree (tenant_id);



CREATE INDEX idx_core_role_permissions_role_id ON mes.core_role_permissions USING btree (role_id);



CREATE INDEX idx_core_roles_name ON mes.core_roles USING btree (name);



CREATE INDEX idx_core_roles_tenant ON mes.core_roles USING btree (tenant_id);



CREATE INDEX idx_core_subscriptions_tenant ON mes.core_subscriptions USING btree (tenant_id);



CREATE INDEX idx_core_tasks_instance ON mes.core_workflow_tasks USING btree (instance_id);



CREATE INDEX idx_core_tasks_tenant ON mes.core_workflow_tasks USING btree (tenant_id);



CREATE INDEX idx_core_tenant_plugins_tenant ON mes.core_tenant_plugins USING btree (tenant_id);



CREATE INDEX idx_core_tenant_usage_period ON mes.core_tenant_usage USING btree (tenant_id, period_start);



CREATE INDEX idx_core_tenant_users_email ON mes.core_tenant_users USING btree (email);



CREATE INDEX idx_core_tenant_users_tenant ON mes.core_tenant_users USING btree (tenant_id);



CREATE INDEX idx_core_tenants_code ON mes.core_tenants USING btree (code);



CREATE INDEX idx_core_tenants_status ON mes.core_tenants USING btree (status);



CREATE INDEX idx_core_usage_tenant_period ON mes.core_usage_records USING btree (tenant_id, period_start);



CREATE INDEX idx_core_user_roles_user_id ON mes.core_user_roles USING btree (user_id);



CREATE INDEX idx_core_users_email ON mes.core_users USING btree (email);



CREATE INDEX idx_core_users_tenant ON mes.core_users USING btree (tenant_id);



CREATE INDEX idx_core_users_username ON mes.core_users USING btree (username);



CREATE INDEX idx_core_workflows_status ON mes.core_workflows USING btree (status);



CREATE INDEX idx_core_workflows_tenant ON mes.core_workflows USING btree (tenant_id);



CREATE INDEX idx_dashboard_refresh_module ON mes.core_dashboard_refresh_log USING btree (module);



CREATE INDEX idx_dashboard_refresh_tenant ON mes.core_dashboard_refresh_log USING btree (tenant_id);



CREATE INDEX idx_dashboard_refresh_time ON mes.core_dashboard_refresh_log USING btree (refresh_time);



CREATE INDEX idx_dict_items_parent_id ON mes.core_dict_items USING btree (parent_id);



CREATE INDEX idx_dict_items_tenant ON mes.core_dict_items USING btree (tenant_id);



CREATE INDEX idx_dict_items_type_id ON mes.core_dict_items USING btree (dict_type_id);



CREATE INDEX idx_dict_types_category ON mes.core_dict_types USING btree (category);



CREATE INDEX idx_dict_types_tenant ON mes.core_dict_types USING btree (tenant_id);



CREATE INDEX idx_dynamic_data_created_at ON mes.dynamic_data USING btree (created_at DESC);



CREATE INDEX idx_dynamic_data_data_json_gin ON mes.dynamic_data USING gin (data_json);



CREATE INDEX idx_dynamic_data_schema_id ON mes.dynamic_data USING btree (schema_id);



CREATE INDEX idx_equipment_category ON mes.equipment USING btree (category);



CREATE INDEX idx_equipment_code ON mes.equipment USING btree (equipment_code);



CREATE UNIQUE INDEX idx_equipment_code_unique ON mes.equipment USING btree (equipment_code, organization_id) WHERE (deleted_at IS NULL);



CREATE INDEX idx_equipment_inspection_date ON mes.equipment_inspection_records USING btree (inspection_date);



CREATE INDEX idx_equipment_inspection_equipment_id ON mes.equipment_inspection_records USING btree (equipment_id);



CREATE INDEX idx_equipment_inspection_organization_id ON mes.equipment_inspection_records USING btree (organization_id);



CREATE INDEX idx_equipment_inspection_records_equipment_id ON mes.equipment_inspection_records USING btree (equipment_id);



CREATE INDEX idx_equipment_inspection_status ON mes.equipment_inspection_records USING btree (overall_status);



CREATE INDEX idx_equipment_inspection_type ON mes.equipment_inspection_records USING btree (inspection_type);



CREATE INDEX idx_equipment_inspections_equipment_id ON mes.equipment_inspections USING btree (equipment_id);



CREATE INDEX idx_equipment_inspections_inspection_date ON mes.equipment_inspections USING btree (inspection_date);



CREATE INDEX idx_equipment_location ON mes.equipment USING btree (location);



CREATE INDEX idx_equipment_maintenance_end_time ON mes.equipment_maintenance_records USING btree (end_time);



CREATE INDEX idx_equipment_maintenance_equipment_id ON mes.equipment_maintenance_records USING btree (equipment_id);



CREATE INDEX idx_equipment_maintenance_organization_id ON mes.equipment_maintenance_records USING btree (organization_id);



CREATE INDEX idx_equipment_maintenance_records_equipment_id ON mes.equipment_maintenance_records USING btree (equipment_id);



CREATE INDEX idx_equipment_maintenance_records_status ON mes.equipment_maintenance_records USING btree (status);



CREATE INDEX idx_equipment_maintenance_start_time ON mes.equipment_maintenance_records USING btree (start_time);



CREATE INDEX idx_equipment_maintenance_status ON mes.equipment_maintenance_records USING btree (status);



CREATE INDEX idx_equipment_maintenance_type ON mes.equipment_maintenance_records USING btree (maintenance_type);



CREATE INDEX idx_equipment_name ON mes.equipment USING btree (equipment_name);



CREATE INDEX idx_equipment_next_inspection_date ON mes.equipment USING btree (next_inspection_date);



CREATE INDEX idx_equipment_next_maintenance_date ON mes.equipment USING btree (next_maintenance_date);



CREATE INDEX idx_equipment_no ON mes.equipment USING btree (equipment_no);



CREATE INDEX idx_equipment_oee_equipment_id ON mes.equipment_oee USING btree (equipment_id);



CREATE INDEX idx_equipment_oee_record_date ON mes.equipment_oee USING btree (record_date);



CREATE INDEX idx_equipment_operating_status ON mes.equipment USING btree (operating_status);



CREATE INDEX idx_equipment_organization_id ON mes.equipment USING btree (organization_id);



CREATE INDEX idx_equipment_responsible_person ON mes.equipment USING btree (responsible_person);



CREATE INDEX idx_equipment_status ON mes.equipment USING btree (status);



CREATE INDEX idx_equipment_type ON mes.equipment USING btree (equipment_type);



CREATE INDEX idx_equipment_work_station_id ON mes.equipment USING btree (work_station_id);



CREATE INDEX idx_inter_module_sync_source ON mes.core_inter_module_sync USING btree (source_module);



CREATE INDEX idx_inter_module_sync_status ON mes.core_inter_module_sync USING btree (status);



CREATE INDEX idx_inter_module_sync_tenant ON mes.core_inter_module_sync USING btree (tenant_id);



CREATE INDEX idx_login_logs_login_time ON mes.core_login_logs USING btree (login_time);



CREATE INDEX idx_login_logs_status ON mes.core_login_logs USING btree (status);



CREATE INDEX idx_login_logs_tenant_id ON mes.core_login_logs USING btree (tenant_id);



CREATE INDEX idx_login_logs_user_id ON mes.core_login_logs USING btree (user_id);



CREATE INDEX idx_material_boms_bom_no ON mes.material_boms USING btree (bom_no);



CREATE INDEX idx_material_boms_product_id ON mes.material_boms USING btree (product_id);



CREATE INDEX idx_material_issue_items_issue_id ON mes.material_issue_items USING btree (issue_id);



CREATE INDEX idx_material_issues_bom_id ON mes.material_issues USING btree (bom_id);



CREATE INDEX idx_material_issues_issue_no ON mes.material_issues USING btree (issue_no);



CREATE INDEX idx_material_issues_order_id ON mes.material_issues USING btree (order_id);



CREATE INDEX idx_material_plans_material_id ON mes.material_plans USING btree (material_id);



CREATE INDEX idx_material_plans_plan_id ON mes.material_plans USING btree (plan_id);



CREATE INDEX idx_material_plans_required_date ON mes.material_plans USING btree (required_date);



CREATE INDEX idx_material_plans_status ON mes.material_plans USING btree (status);



CREATE INDEX idx_material_requirements_material_code ON mes.material_requirements USING btree (material_code);



CREATE INDEX idx_material_requirements_mrp_no ON mes.material_requirements USING btree (mrp_no);



CREATE INDEX idx_material_requirements_order_id ON mes.material_requirements USING btree (order_id);



CREATE INDEX idx_material_requirements_status ON mes.material_requirements USING btree (status);



CREATE INDEX idx_material_return_items_return_id ON mes.material_return_items USING btree (return_id);



CREATE INDEX idx_material_returns_order_id ON mes.material_returns USING btree (order_id);



CREATE INDEX idx_material_returns_return_no ON mes.material_returns USING btree (return_no);



CREATE INDEX idx_mes_audit_logs_action ON mes.audit_logs USING btree (action);



CREATE INDEX idx_mes_audit_logs_created_at ON mes.audit_logs USING btree (created_at DESC);



CREATE INDEX idx_mes_audit_logs_entity_type ON mes.audit_logs USING btree (entity_type);



CREATE INDEX idx_mes_audit_logs_tenant_id ON mes.audit_logs USING btree (tenant_id);



CREATE INDEX idx_mes_audit_logs_user_id ON mes.audit_logs USING btree (user_id);



CREATE INDEX idx_mes_equipment_inspection_records_tenant_id ON mes.equipment_inspection_records USING btree (tenant_id);



CREATE INDEX idx_mes_equipment_maintenance_records_tenant_id ON mes.equipment_maintenance_records USING btree (tenant_id);



CREATE INDEX idx_mes_equipment_tenant_id ON mes.equipment USING btree (tenant_id);



CREATE INDEX idx_mes_module_settings_category ON mes.module_settings USING btree (tenant_id, category);



CREATE INDEX idx_mes_process_route_steps_tenant_id ON mes.process_route_steps USING btree (tenant_id);



CREATE INDEX idx_mes_process_routes_tenant_id ON mes.process_routes USING btree (tenant_id);



CREATE INDEX idx_mes_production_orders_tenant_id ON mes.production_orders USING btree (tenant_id);



CREATE INDEX idx_mes_production_processes_tenant_id ON mes.production_processes USING btree (tenant_id);



CREATE INDEX idx_mes_production_records_tenant_id ON mes.production_records USING btree (tenant_id);



CREATE INDEX idx_mes_work_stations_tenant_id ON mes.work_stations USING btree (tenant_id);



CREATE INDEX idx_mobile_offline_module ON mes.core_mobile_offline_records USING btree (module);



CREATE INDEX idx_mobile_offline_status ON mes.core_mobile_offline_records USING btree (status);



CREATE INDEX idx_mobile_offline_user ON mes.core_mobile_offline_records USING btree (user_id);



CREATE INDEX idx_process_flow_steps_flow_id ON mes.process_flow_steps USING btree (flow_id);



CREATE INDEX idx_process_flow_steps_process_id ON mes.process_flow_steps USING btree (process_id);



CREATE INDEX idx_process_flows_code ON mes.process_flows USING btree (code);



CREATE INDEX idx_process_flows_route_id ON mes.process_flows USING btree (route_id);



CREATE INDEX idx_process_flows_status ON mes.process_flows USING btree (status);



CREATE INDEX idx_process_route_steps_organization_id ON mes.process_route_steps USING btree (organization_id);



CREATE INDEX idx_process_route_steps_process_id ON mes.process_route_steps USING btree (process_id);



CREATE INDEX idx_process_route_steps_route_id ON mes.process_route_steps USING btree (route_id);



CREATE INDEX idx_process_route_steps_sequence ON mes.process_route_steps USING btree (sequence);



CREATE INDEX idx_process_routes_code ON mes.process_routes USING btree (route_code);



CREATE UNIQUE INDEX idx_process_routes_code_unique ON mes.process_routes USING btree (route_code, organization_id) WHERE (deleted_at IS NULL);



CREATE INDEX idx_process_routes_organization_id ON mes.process_routes USING btree (organization_id);



CREATE INDEX idx_process_routes_product_code ON mes.process_routes USING btree (product_code);



CREATE INDEX idx_process_routes_status ON mes.process_routes USING btree (status);



CREATE INDEX idx_production_orders_actual_start_date ON mes.production_orders USING btree (actual_start_date);



CREATE INDEX idx_production_orders_assigned_to ON mes.production_orders USING btree (assigned_to);



CREATE INDEX idx_production_orders_created_at ON mes.production_orders USING btree (created_at);



CREATE UNIQUE INDEX idx_production_orders_number_unique ON mes.production_orders USING btree (order_number, organization_id) WHERE (deleted_at IS NULL);



CREATE INDEX idx_production_orders_order_no ON mes.production_orders USING btree (order_number);



CREATE INDEX idx_production_orders_order_number ON mes.production_orders USING btree (order_number);



CREATE INDEX idx_production_orders_organization_id ON mes.production_orders USING btree (organization_id);



CREATE INDEX idx_production_orders_planned_end_date ON mes.production_orders USING btree (planned_end_date);



CREATE INDEX idx_production_orders_planned_start_date ON mes.production_orders USING btree (planned_start_date);



CREATE INDEX idx_production_orders_priority ON mes.production_orders USING btree (priority);



CREATE INDEX idx_production_orders_product_code ON mes.production_orders USING btree (product_code);



CREATE INDEX idx_production_orders_status ON mes.production_orders USING btree (status);



CREATE INDEX idx_production_orders_work_station_id ON mes.production_orders USING btree (work_station_id);



CREATE INDEX idx_production_processes_code ON mes.production_processes USING btree (process_code);



CREATE INDEX idx_production_processes_name ON mes.production_processes USING btree (process_name);



CREATE INDEX idx_production_processes_organization_id ON mes.production_processes USING btree (organization_id);



CREATE INDEX idx_production_processes_predecessor_id ON mes.production_processes USING btree (predecessor_process_id);



CREATE INDEX idx_production_processes_predecessor_process_id ON mes.production_processes USING btree (predecessor_process_id);



CREATE INDEX idx_production_processes_sequence ON mes.production_processes USING btree (sequence);



CREATE INDEX idx_production_processes_status ON mes.production_processes USING btree (status);



CREATE INDEX idx_production_processes_successor_id ON mes.production_processes USING btree (successor_process_id);



CREATE INDEX idx_production_processes_successor_process_id ON mes.production_processes USING btree (successor_process_id);



CREATE INDEX idx_production_processes_work_station_id ON mes.production_processes USING btree (work_station_id);



CREATE INDEX idx_production_records_batch_number ON mes.production_records USING btree (batch_number);



CREATE INDEX idx_production_records_created_at ON mes.production_records USING btree (created_at);



CREATE INDEX idx_production_records_end_time ON mes.production_records USING btree (end_time);



CREATE INDEX idx_production_records_operator ON mes.production_records USING btree (operator);



CREATE INDEX idx_production_records_order_id ON mes.production_records USING btree (order_id);



CREATE INDEX idx_production_records_organization_id ON mes.production_records USING btree (organization_id);



CREATE INDEX idx_production_records_process_id ON mes.production_records USING btree (process_id);



CREATE INDEX idx_production_records_start_time ON mes.production_records USING btree (start_time);



CREATE INDEX idx_production_records_status ON mes.production_records USING btree (status);



CREATE INDEX idx_production_records_work_station_id ON mes.production_records USING btree (work_station_id);



CREATE INDEX idx_production_schedules_equipment_id ON mes.production_schedules USING btree (equipment_id);



CREATE INDEX idx_production_schedules_order_id ON mes.production_schedules USING btree (order_id);



CREATE INDEX idx_production_schedules_process_id ON mes.production_schedules USING btree (process_id);



CREATE INDEX idx_production_schedules_schedule_no ON mes.production_schedules USING btree (schedule_no);



CREATE INDEX idx_production_schedules_status ON mes.production_schedules USING btree (status);



CREATE INDEX idx_production_schedules_work_station_id ON mes.production_schedules USING btree (work_station_id);



CREATE INDEX idx_public_process_flow_steps_tenant_id ON mes.process_flow_steps USING btree (tenant_id);



CREATE INDEX idx_public_process_flows_tenant_id ON mes.process_flows USING btree (tenant_id);



CREATE INDEX idx_public_quality_inspections_tenant_id ON mes.quality_inspections USING btree (tenant_id);



CREATE INDEX idx_public_quality_patrol_items_tenant_id ON mes.quality_patrol_items USING btree (tenant_id);



CREATE INDEX idx_public_quality_patrols_tenant_id ON mes.quality_patrols USING btree (tenant_id);



CREATE INDEX idx_public_quality_standard_values_tenant_id ON mes.quality_standard_values USING btree (tenant_id);



CREATE INDEX idx_public_quality_standards_tenant_id ON mes.quality_standards USING btree (tenant_id);



CREATE INDEX idx_quality_inspections_inspection_no ON mes.quality_inspections USING btree (inspection_no);



CREATE INDEX idx_quality_inspections_order_id ON mes.quality_inspections USING btree (order_id);



CREATE INDEX idx_quality_inspections_status ON mes.quality_inspections USING btree (status);



CREATE INDEX idx_quality_patrol_items_patrol_id ON mes.quality_patrol_items USING btree (patrol_id);



CREATE INDEX idx_quality_patrols_patrol_no ON mes.quality_patrols USING btree (patrol_no);



CREATE INDEX idx_quality_patrols_status ON mes.quality_patrols USING btree (status);



CREATE INDEX idx_quality_patrols_workstation_id ON mes.quality_patrols USING btree (workstation_id);



CREATE INDEX idx_quality_records_order_id ON mes.quality_records USING btree (order_id);



CREATE INDEX idx_quality_records_record_no ON mes.quality_records USING btree (record_no);



CREATE INDEX idx_quality_standard_values_standard_id ON mes.quality_standard_values USING btree (standard_id);



CREATE INDEX idx_quality_standards_code ON mes.quality_standards USING btree (code);



CREATE INDEX idx_quality_standards_status ON mes.quality_standards USING btree (status);



CREATE INDEX idx_schema_registry_active ON mes.schema_registry USING btree (is_active);



CREATE INDEX idx_schema_registry_created_at ON mes.schema_registry USING btree (created_at DESC);



CREATE INDEX idx_schema_registry_name ON mes.schema_registry USING btree (name);



CREATE INDEX idx_team_members_employee_id ON mes.team_members USING btree (employee_id);



CREATE INDEX idx_team_members_team_id ON mes.team_members USING btree (team_id);



CREATE INDEX idx_teams_status ON mes.teams USING btree (status);



CREATE INDEX idx_teams_team_code ON mes.teams USING btree (team_code);



CREATE INDEX idx_teams_work_station_id ON mes.teams USING btree (work_station_id);



CREATE INDEX idx_wip_transfers_from_process_id ON mes.wip_transfers USING btree (from_process_id);



CREATE INDEX idx_wip_transfers_from_work_station_id ON mes.wip_transfers USING btree (from_work_station_id);



CREATE INDEX idx_wip_transfers_to_process_id ON mes.wip_transfers USING btree (to_process_id);



CREATE INDEX idx_wip_transfers_to_work_station_id ON mes.wip_transfers USING btree (to_work_station_id);



CREATE INDEX idx_wip_transfers_wip_id ON mes.wip_transfers USING btree (wip_id);



CREATE INDEX idx_wips_created_at ON mes.wips USING btree (created_at);



CREATE INDEX idx_wips_current_process_id ON mes.wips USING btree (current_process_id);



CREATE INDEX idx_wips_current_work_station_id ON mes.wips USING btree (current_work_station_id);



CREATE INDEX idx_wips_order_id ON mes.wips USING btree (order_id);



CREATE INDEX idx_wips_status ON mes.wips USING btree (status);



CREATE INDEX idx_wips_wip_no ON mes.wips USING btree (wip_no);



CREATE INDEX idx_work_orders_order_id ON mes.work_orders USING btree (order_id);



CREATE INDEX idx_work_stations_code ON mes.work_stations USING btree (station_code);



CREATE INDEX idx_work_stations_location ON mes.work_stations USING btree (location);



CREATE INDEX idx_work_stations_name ON mes.work_stations USING btree (station_name);



CREATE INDEX idx_work_stations_organization_id ON mes.work_stations USING btree (organization_id);



CREATE INDEX idx_work_stations_station_code ON mes.work_stations USING btree (station_code);



CREATE INDEX idx_work_stations_station_no ON mes.work_stations USING btree (station_no);



CREATE INDEX idx_work_stations_status ON mes.work_stations USING btree (status);



CREATE INDEX idx_work_stations_supervisor ON mes.work_stations USING btree (supervisor);



CREATE INDEX idx_work_stations_type ON mes.work_stations USING btree (station_type);



CREATE INDEX process_flows_tenant_id_idx ON mes.process_flows USING btree (tenant_id);



CREATE INDEX process_routes_tenant_id_idx ON mes.process_routes USING btree (tenant_id);



CREATE INDEX production_orders_tenant_id_idx ON mes.production_orders USING btree (tenant_id);



CREATE INDEX production_processes_tenant_id_idx ON mes.production_processes USING btree (tenant_id);



CREATE INDEX production_records_tenant_id_idx ON mes.production_records USING btree (tenant_id);



CREATE INDEX quality_inspections_tenant_id_idx ON mes.quality_inspections USING btree (tenant_id);



CREATE INDEX quality_patrols_tenant_id_idx ON mes.quality_patrols USING btree (tenant_id);



CREATE INDEX quality_standards_tenant_id_idx ON mes.quality_standards USING btree (tenant_id);




































ALTER TABLE ONLY mes.bom_items
    ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_billing_invoices
    ADD CONSTRAINT core_billing_invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES mes.core_subscriptions(id);



ALTER TABLE ONLY mes.core_billing_invoices
    ADD CONSTRAINT core_billing_invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id);



ALTER TABLE ONLY mes.core_chat_members
    ADD CONSTRAINT core_chat_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES mes.core_chat_rooms(id);



ALTER TABLE ONLY mes.core_chat_messages
    ADD CONSTRAINT core_chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES mes.core_chat_rooms(id);



ALTER TABLE ONLY mes.core_dict_items
    ADD CONSTRAINT core_dict_items_dict_type_id_fkey FOREIGN KEY (dict_type_id) REFERENCES mes.core_dict_types(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_dict_items
    ADD CONSTRAINT core_dict_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES mes.core_dict_items(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.core_guide_lessons
    ADD CONSTRAINT core_guide_lessons_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES mes.core_guides(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_guide_progress
    ADD CONSTRAINT core_guide_progress_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES mes.core_guides(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_menus
    ADD CONSTRAINT core_menus_group_id_fkey FOREIGN KEY (group_id) REFERENCES mes.core_menu_groups(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_menus
    ADD CONSTRAINT core_menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES mes.core_menus(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES mes.core_plugins(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_plugin_reviews
    ADD CONSTRAINT core_plugin_reviews_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES mes.core_plugins(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES mes.core_plugins(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_role_permissions
    ADD CONSTRAINT core_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES mes.core_permissions(id);



ALTER TABLE ONLY mes.core_role_permissions
    ADD CONSTRAINT core_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES mes.core_roles(id);



ALTER TABLE ONLY mes.core_subscriptions
    ADD CONSTRAINT core_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES mes.core_billing_plans(id);



ALTER TABLE ONLY mes.core_subscriptions
    ADD CONSTRAINT core_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id);



ALTER TABLE ONLY mes.core_tenant_modules
    ADD CONSTRAINT core_tenant_modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id);



ALTER TABLE ONLY mes.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES mes.core_plugins(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_tenant_settings
    ADD CONSTRAINT core_tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id);



ALTER TABLE ONLY mes.core_tenant_usage
    ADD CONSTRAINT core_tenant_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id);



ALTER TABLE ONLY mes.core_tenant_users
    ADD CONSTRAINT core_tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.core_usage_records
    ADD CONSTRAINT core_usage_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES mes.core_tenants(id);



ALTER TABLE ONLY mes.core_user_roles
    ADD CONSTRAINT core_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES mes.core_roles(id);



ALTER TABLE ONLY mes.core_user_roles
    ADD CONSTRAINT core_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES mes.core_users(id);



ALTER TABLE ONLY mes.core_workflow_instances
    ADD CONSTRAINT core_workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES mes.core_workflows(id);



ALTER TABLE ONLY mes.core_workflow_tasks
    ADD CONSTRAINT core_workflow_tasks_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES mes.core_workflow_instances(id);



ALTER TABLE ONLY mes.dynamic_data
    ADD CONSTRAINT dynamic_data_schema_id_fkey FOREIGN KEY (schema_id) REFERENCES mes.schema_registry(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment_inspection_records
    ADD CONSTRAINT equipment_inspection_records_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment_inspections
    ADD CONSTRAINT equipment_inspections_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment_maintenance_records
    ADD CONSTRAINT equipment_maintenance_records_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment_oee
    ADD CONSTRAINT equipment_oee_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.equipment
    ADD CONSTRAINT equipment_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_issue_items
    ADD CONSTRAINT material_issue_items_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES mes.material_issues(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_issues
    ADD CONSTRAINT material_issues_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_requirements
    ADD CONSTRAINT material_requirements_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.material_return_items
    ADD CONSTRAINT material_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES mes.material_returns(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.material_returns
    ADD CONSTRAINT material_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.process_flow_steps
    ADD CONSTRAINT process_flow_steps_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES mes.process_flows(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.process_route_steps
    ADD CONSTRAINT process_route_steps_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.process_route_steps
    ADD CONSTRAINT process_route_steps_route_id_fkey FOREIGN KEY (route_id) REFERENCES mes.process_routes(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_predecessor_process_id_fkey FOREIGN KEY (predecessor_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_successor_process_id_fkey FOREIGN KEY (successor_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.production_schedules
    ADD CONSTRAINT production_schedules_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.quality_patrol_items
    ADD CONSTRAINT quality_patrol_items_patrol_id_fkey FOREIGN KEY (patrol_id) REFERENCES mes.quality_patrols(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.quality_records
    ADD CONSTRAINT quality_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.quality_standard_values
    ADD CONSTRAINT quality_standard_values_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES mes.quality_standards(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES mes.teams(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.teams
    ADD CONSTRAINT teams_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_from_process_id_fkey FOREIGN KEY (from_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_from_work_station_id_fkey FOREIGN KEY (from_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_to_process_id_fkey FOREIGN KEY (to_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_to_work_station_id_fkey FOREIGN KEY (to_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wip_transfers
    ADD CONSTRAINT wip_transfers_wip_id_fkey FOREIGN KEY (wip_id) REFERENCES mes.wips(id) ON DELETE CASCADE;



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_current_process_id_fkey FOREIGN KEY (current_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_current_work_station_id_fkey FOREIGN KEY (current_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.wips
    ADD CONSTRAINT wips_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE ONLY mes.work_orders
    ADD CONSTRAINT work_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;



ALTER TABLE mes.audit_logs ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.capacities ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.demand_forecasts ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.equipment ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.equipment_inspection_records ENABLE ROW LEVEL SECURITY;


CREATE POLICY equipment_inspection_records_tenant_policy ON mes.equipment_inspection_records USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.equipment_maintenance_records ENABLE ROW LEVEL SECURITY;


CREATE POLICY equipment_maintenance_records_tenant_policy ON mes.equipment_maintenance_records USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



CREATE POLICY equipment_tenant_policy ON mes.equipment USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.module_settings ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.process_flow_steps ENABLE ROW LEVEL SECURITY;


CREATE POLICY process_flow_steps_tenant_policy ON mes.process_flow_steps USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.process_flows ENABLE ROW LEVEL SECURITY;


CREATE POLICY process_flows_tenant_policy ON mes.process_flows USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.process_route_steps ENABLE ROW LEVEL SECURITY;


CREATE POLICY process_route_steps_tenant_policy ON mes.process_route_steps USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.process_routes ENABLE ROW LEVEL SECURITY;


CREATE POLICY process_routes_tenant_policy ON mes.process_routes USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.production_orders ENABLE ROW LEVEL SECURITY;


CREATE POLICY production_orders_tenant_policy ON mes.production_orders USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.production_plans ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.production_processes ENABLE ROW LEVEL SECURITY;


CREATE POLICY production_processes_tenant_policy ON mes.production_processes USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.production_records ENABLE ROW LEVEL SECURITY;


CREATE POLICY production_records_tenant_policy ON mes.production_records USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.quality_inspections ENABLE ROW LEVEL SECURITY;


CREATE POLICY quality_inspections_tenant_policy ON mes.quality_inspections USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.quality_patrol_items ENABLE ROW LEVEL SECURITY;


CREATE POLICY quality_patrol_items_tenant_policy ON mes.quality_patrol_items USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.quality_patrols ENABLE ROW LEVEL SECURITY;


CREATE POLICY quality_patrols_tenant_policy ON mes.quality_patrols USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.quality_standard_values ENABLE ROW LEVEL SECURITY;


CREATE POLICY quality_standard_values_tenant_policy ON mes.quality_standard_values USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



ALTER TABLE mes.quality_standards ENABLE ROW LEVEL SECURITY;


CREATE POLICY quality_standards_tenant_policy ON mes.quality_standards USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



CREATE POLICY rls_tenant_isolation ON mes.audit_logs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.capacities USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.demand_forecasts USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.module_settings USING (((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.current_tenant_id'::text, true) IS NULL) OR (current_setting('app.current_tenant_id'::text, true) = ''::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.production_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY rls_tenant_isolation ON mes.work_reports USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY tenant_isolation_audit_logs ON mes.audit_logs USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_capacities ON mes.capacities USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_demand_forecasts ON mes.demand_forecasts USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_equipment ON mes.equipment USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_equipment_inspection_records ON mes.equipment_inspection_records USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_equipment_maintenance_records ON mes.equipment_maintenance_records USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_module_settings ON mes.module_settings USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_process_flow_steps ON mes.process_flow_steps USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_process_flows ON mes.process_flows USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_process_route_steps ON mes.process_route_steps USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_process_routes ON mes.process_routes USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_production_orders ON mes.production_orders USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_production_plans ON mes.production_plans USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_production_processes ON mes.production_processes USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_production_records ON mes.production_records USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_quality_inspections ON mes.quality_inspections USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_quality_patrol_items ON mes.quality_patrol_items USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_quality_patrols ON mes.quality_patrols USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_quality_standard_values ON mes.quality_standard_values USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_quality_standards ON mes.quality_standards USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



CREATE POLICY tenant_isolation_work_reports ON mes.work_reports USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));



CREATE POLICY tenant_isolation_work_stations ON mes.work_stations USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));



ALTER TABLE mes.work_reports ENABLE ROW LEVEL SECURITY;


ALTER TABLE mes.work_stations ENABLE ROW LEVEL SECURITY;


CREATE POLICY work_stations_tenant_policy ON mes.work_stations USING (((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
























-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE public.inspection_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    inspector character varying(255),
    inspection_time timestamp without time zone NOT NULL,
    issues text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);




ALTER TABLE ONLY public.inspection_records
    ADD CONSTRAINT inspection_records_pkey PRIMARY KEY (id);



CREATE INDEX idx_inspection_records_tenant_id ON public.inspection_records USING btree (tenant_id);









-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    action character varying(255) DEFAULT ''::character varying NOT NULL,
    entity_type character varying(50) DEFAULT ''::character varying NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_id uuid,
    user_name text,
    request_details jsonb,
    response_details jsonb,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    success boolean
);

ALTER TABLE ONLY public.audit_logs FORCE ROW LEVEL SECURITY;




ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);



CREATE INDEX audit_logs_tenant_id_idx ON public.audit_logs USING btree (tenant_id);



CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);



CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);



CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);



CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);



ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


CREATE POLICY rls_tenant_isolation ON public.audit_logs USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));



CREATE POLICY tenant_isolation_audit_logs ON public.audit_logs USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));




