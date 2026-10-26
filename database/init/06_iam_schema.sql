--
-- PostgreSQL database dump
--

\restrict 73kLWPrkbg1cDgu6KyujNFxTOfracdmR6cuucdg9WpG6wFvCTBpwKg8QdK31NAJ

-- Dumped from database version 17.11 (Homebrew)
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

--
-- Name: iam; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iam;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) DEFAULT ''::character varying NOT NULL,
    resource character varying(100),
    resource_id uuid,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    entity_type text,
    entity_id uuid,
    entity_ids jsonb,
    user_name text,
    request_details jsonb,
    response_details jsonb,
    status character varying(32),
    error_message text,
    success boolean,
    CONSTRAINT ck_audit_logs_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.audit_logs FORCE ROW LEVEL SECURITY;


--
-- Name: auth_sessions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    token text,
    device_info text,
    ip_address text,
    user_agent text,
    active boolean DEFAULT true,
    expires_at timestamp with time zone,
    last_active_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: core_chat_members; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_chat_members (
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    tenant_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT core_chat_members_pkey PRIMARY KEY (room_id, user_id)
);

ALTER TABLE ONLY iam.core_chat_members FORCE ROW LEVEL SECURITY;


--
-- Name: core_chat_messages; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name character varying(128),
    message_type character varying(32) DEFAULT 'text'::character varying,
    content text NOT NULL,
    file_url character varying(512),
    is_recalled boolean DEFAULT false,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_chat_messages_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_chat_messages FORCE ROW LEVEL SECURITY;


--
-- Name: core_chat_rooms; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128),
    room_type character varying(32) DEFAULT 'private'::character varying,
    creator_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_chat_rooms_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_chat_rooms FORCE ROW LEVEL SECURITY;


--
-- Name: core_dashboard_refresh_log; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_dashboard_refresh_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module character varying(64) NOT NULL,
    tenant_id uuid NOT NULL,
    refresh_time timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    duration_ms integer,
    row_count integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_dashboard_refresh_log_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_dashboard_refresh_log FORCE ROW LEVEL SECURITY;


--
-- Name: core_dict_items; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_dict_items (
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
    deleted_at timestamp with time zone,
    CONSTRAINT core_dict_items_dict_type_id_code_key UNIQUE (dict_type_id, code),
    CONSTRAINT core_dict_items_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_dict_items FORCE ROW LEVEL SECURITY;


--
-- Name: core_dict_types; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_dict_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_dict_types_code_key UNIQUE (code),
    CONSTRAINT core_dict_types_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_dict_types FORCE ROW LEVEL SECURITY;


--
-- Name: core_email_queue; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_email_queue (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_email_queue_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_email_queue FORCE ROW LEVEL SECURITY;


--
-- Name: core_email_templates; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    subject_template character varying(512) NOT NULL,
    body_template text NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_email_templates_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_email_templates FORCE ROW LEVEL SECURITY;


--
-- Name: core_emails; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_emails (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT core_emails_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_emails FORCE ROW LEVEL SECURITY;


--
-- Name: core_faqs; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_faqs (
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
    deleted_at timestamp with time zone,
    CONSTRAINT core_faqs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_faqs FORCE ROW LEVEL SECURITY;


--
-- Name: core_file_folders; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_file_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    parent_id uuid,
    owner_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_file_folders_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_file_folders FORCE ROW LEVEL SECURITY;


--
-- Name: core_files; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_files (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_files_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_files FORCE ROW LEVEL SECURITY;


--
-- Name: core_guide_lessons; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_guide_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    duration character varying(50) DEFAULT '5min'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_guide_lessons_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_guide_lessons FORCE ROW LEVEL SECURITY;


--
-- Name: core_guide_progress; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_guide_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guide_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    completed_lessons uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_guide_progress_guide_id_user_id_key UNIQUE (guide_id, user_id),
    CONSTRAINT core_guide_progress_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_guide_progress FORCE ROW LEVEL SECURITY;


--
-- Name: core_guides; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_guides (
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
    deleted_at timestamp with time zone,
    CONSTRAINT core_guides_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_guides FORCE ROW LEVEL SECURITY;


--
-- Name: core_inter_module_sync; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_inter_module_sync (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_inter_module_sync_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_inter_module_sync FORCE ROW LEVEL SECURITY;


--
-- Name: core_login_logs; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_login_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    username character varying(64) NOT NULL,
    ip_address character varying(128) NOT NULL,
    user_agent text,
    status character varying(32) NOT NULL,
    error_message text,
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_login_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_login_logs FORCE ROW LEVEL SECURITY;


--
-- Name: core_menu_groups; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_menu_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(100) NOT NULL,
    icon character varying(200),
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_menu_groups_pkey PRIMARY KEY (id),
    CONSTRAINT core_menu_groups_tenant_id_code_key UNIQUE (tenant_id, code)
);

ALTER TABLE ONLY iam.core_menu_groups FORCE ROW LEVEL SECURITY;


--
-- Name: core_menus; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_menus (
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
    deleted_at timestamp with time zone,
    CONSTRAINT core_menus_pkey PRIMARY KEY (id),
    CONSTRAINT core_menus_tenant_id_code_key UNIQUE (tenant_id, code)
);

ALTER TABLE ONLY iam.core_menus FORCE ROW LEVEL SECURITY;


--
-- Name: core_migration_history; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_migration_history (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_migration_history_pkey PRIMARY KEY (id),
    CONSTRAINT core_migration_history_plugin_name_version_key UNIQUE (plugin_name, version)
);

ALTER TABLE ONLY iam.core_migration_history FORCE ROW LEVEL SECURITY;


--
-- Name: core_mobile_offline_records; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_mobile_offline_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_mobile_offline_records_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_mobile_offline_records FORCE ROW LEVEL SECURITY;


--
-- Name: core_notification_templates; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    title_template character varying(256) NOT NULL,
    content_template text NOT NULL,
    notification_type character varying(64) DEFAULT 'info'::character varying,
    description text,
    created_by uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_notification_templates_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_notification_templates FORCE ROW LEVEL SECURITY;


--
-- Name: core_notifications; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_notifications (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_notifications_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_notifications FORCE ROW LEVEL SECURITY;


--
-- Name: core_permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    resource character varying(64),
    action character varying(32),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_permissions_code_key UNIQUE (code),
    CONSTRAINT core_permissions_pkey PRIMARY KEY (id)
);


--
-- Name: core_plugin_categories; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_plugin_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    code character varying(64) NOT NULL,
    description text,
    icon character varying(64),
    sort_order integer DEFAULT 0,
    plugin_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_categories_code_key UNIQUE (code),
    CONSTRAINT core_plugin_categories_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_plugin_categories FORCE ROW LEVEL SECURITY;


--
-- Name: core_plugin_instances; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_plugin_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_id uuid NOT NULL,
    runtime_url character varying(512),
    runtime_status character varying(32) DEFAULT 'stopped'::character varying,
    base_path character varying(128) DEFAULT '/api/plugins/{code}'::character varying,
    last_heartbeat timestamp with time zone,
    started_at timestamp with time zone,
    stopped_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_instances_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_instances_plugin_id_key UNIQUE (plugin_id)
);

ALTER TABLE ONLY iam.core_plugin_instances FORCE ROW LEVEL SECURITY;


--
-- Name: core_plugin_permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_plugin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(255),
    resource_type character varying(50),
    action character varying(50),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_permissions_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_permissions_plugin_code_permission_code_key UNIQUE (plugin_code, permission_code)
);

ALTER TABLE ONLY iam.core_plugin_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: core_plugin_pricing; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_plugin_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plugin_code character varying(64) NOT NULL,
    plugin_name character varying(128) NOT NULL,
    base_price_cents integer DEFAULT 0,
    per_user_price_cents integer DEFAULT 0,
    is_active boolean DEFAULT true,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_pricing_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_pricing_plugin_code_key UNIQUE (plugin_code)
);

ALTER TABLE ONLY iam.core_plugin_pricing FORCE ROW LEVEL SECURITY;


--
-- Name: core_plugin_reviews; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_plugin_reviews (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT core_plugin_reviews_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_plugin_reviews FORCE ROW LEVEL SECURITY;


--
-- Name: core_plugin_versions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_plugin_versions (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugin_versions_pkey PRIMARY KEY (id),
    CONSTRAINT core_plugin_versions_plugin_id_version_key UNIQUE (plugin_id, version)
);


--
-- Name: core_plugins; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_plugins (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_plugins_code_key UNIQUE (code),
    CONSTRAINT core_plugins_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_plugins FORCE ROW LEVEL SECURITY;


--
-- Name: core_role_permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT core_role_permissions_pkey PRIMARY KEY (role_id, permission_id)
);


--
-- Name: core_roles; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_roles_name_key UNIQUE (name),
    CONSTRAINT core_roles_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_roles FORCE ROW LEVEL SECURITY;


--
-- Name: core_tenant_modules; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_tenant_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    module_code character varying(64) NOT NULL,
    module_name character varying(128),
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_tenant_modules_pkey PRIMARY KEY (id),
    CONSTRAINT core_tenant_modules_tenant_id_module_code_key UNIQUE (tenant_id, module_code)
);

ALTER TABLE ONLY iam.core_tenant_modules FORCE ROW LEVEL SECURITY;


--
-- Name: core_tenant_plugins; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_tenant_plugins (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_tenant_plugins_pkey PRIMARY KEY (id),
    CONSTRAINT core_tenant_plugins_tenant_id_plugin_id_key UNIQUE (tenant_id, plugin_id)
);

ALTER TABLE ONLY iam.core_tenant_plugins FORCE ROW LEVEL SECURITY;


--
-- Name: core_tenant_settings; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    setting_key character varying(128) NOT NULL,
    setting_value text,
    is_public boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_tenant_settings_pkey PRIMARY KEY (id),
    CONSTRAINT core_tenant_settings_tenant_id_setting_key_key UNIQUE (tenant_id, setting_key)
);

ALTER TABLE ONLY iam.core_tenant_settings FORCE ROW LEVEL SECURITY;


--
-- Name: core_tenant_usage; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_tenant_usage (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY iam.core_tenant_usage FORCE ROW LEVEL SECURITY;


--
-- Name: core_tenant_users; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email character varying(256) NOT NULL,
    role character varying(32) DEFAULT 'member'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_tenant_users_pkey PRIMARY KEY (id),
    CONSTRAINT core_tenant_users_tenant_id_email_key UNIQUE (tenant_id, email),
    CONSTRAINT core_tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id)
);

ALTER TABLE ONLY iam.core_tenant_users FORCE ROW LEVEL SECURITY;


--
-- Name: core_tenants; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_tenants (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    suspended_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_tenants_code_key UNIQUE (code),
    CONSTRAINT core_tenants_pkey PRIMARY KEY (id)
);


--
-- Name: core_usage_records; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_usage_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_type character varying(64) NOT NULL,
    metric_name character varying(128),
    quantity bigint DEFAULT 0 NOT NULL,
    unit character varying(32),
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    cost_cents integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_usage_records_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_usage_records FORCE ROW LEVEL SECURITY;


--
-- Name: core_user_roles; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT core_user_roles_pkey PRIMARY KEY (user_id, role_id)
);


--
-- Name: core_users; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_users (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_users_email_key UNIQUE (email),
    CONSTRAINT core_users_pkey PRIMARY KEY (id),
    CONSTRAINT core_users_username_key UNIQUE (username)
);

ALTER TABLE ONLY iam.core_users FORCE ROW LEVEL SECURITY;


--
-- Name: core_workflow_instances; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_workflow_instances (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT core_workflow_instances_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_workflow_instances FORCE ROW LEVEL SECURITY;


--
-- Name: core_workflow_tasks; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_workflow_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    node_id character varying(64) NOT NULL,
    assignee_id uuid NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying,
    comment text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_workflow_tasks_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_workflow_tasks FORCE ROW LEVEL SECURITY;


--
-- Name: core_workflows; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.core_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    definition jsonb NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying,
    version integer DEFAULT 1,
    created_by uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT core_workflows_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.core_workflows FORCE ROW LEVEL SECURITY;


--
-- Name: crm_dashboard_snapshots; Type: TABLE; Schema: iam; Owner: -
--

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
    deleted_at timestamp with time zone,
    CONSTRAINT crm_dashboard_snapshots_pkey PRIMARY KEY (id),
    CONSTRAINT crm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date)
);

ALTER TABLE ONLY iam.crm_dashboard_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: data_permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.data_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    resource_type character varying(64) NOT NULL,
    conditions jsonb NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT data_permissions_pkey PRIMARY KEY (id)
);


--
-- Name: dynamic_data; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.dynamic_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_id uuid NOT NULL,
    data_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT dynamic_data_pkey PRIMARY KEY (id)
);


--
-- Name: ehs_dashboard_snapshots; Type: TABLE; Schema: iam; Owner: -
--

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
    deleted_at timestamp with time zone,
    CONSTRAINT ehs_dashboard_snapshots_pkey PRIMARY KEY (id),
    CONSTRAINT ehs_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date)
);

ALTER TABLE ONLY iam.ehs_dashboard_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: hrm_dashboard_snapshots; Type: TABLE; Schema: iam; Owner: -
--

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
    deleted_at timestamp with time zone,
    CONSTRAINT hrm_dashboard_snapshots_pkey PRIMARY KEY (id),
    CONSTRAINT hrm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date)
);

ALTER TABLE ONLY iam.hrm_dashboard_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: lims_dashboard_snapshots; Type: TABLE; Schema: iam; Owner: -
--

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
    deleted_at timestamp with time zone,
    CONSTRAINT lims_dashboard_snapshots_pkey PRIMARY KEY (id),
    CONSTRAINT lims_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date)
);

ALTER TABLE ONLY iam.lims_dashboard_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id)
);


--
-- Name: pdm_dashboard_snapshots; Type: TABLE; Schema: iam; Owner: -
--

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
    deleted_at timestamp with time zone,
    CONSTRAINT pdm_dashboard_snapshots_pkey PRIMARY KEY (id),
    CONSTRAINT pdm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date)
);

ALTER TABLE ONLY iam.pdm_dashboard_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: permission_audit_logs; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.permission_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action character varying(64) NOT NULL,
    target_type character varying(64) NOT NULL,
    target_id uuid,
    before jsonb,
    after jsonb,
    reason text,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by character varying(64) NOT NULL,
    details jsonb,
    ip_address inet,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_value jsonb,
    old_value jsonb,
    user_agent text,
    CONSTRAINT chk_action CHECK (((action)::text = ANY (ARRAY[('create'::character varying)::text, ('update'::character varying)::text, ('delete'::character varying)::text, ('activate'::character varying)::text, ('deactivate'::character varying)::text, ('role_change'::character varying)::text]))),
    CONSTRAINT permission_audit_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.permission_audit_logs FORCE ROW LEVEL SECURITY;


--
-- Name: permission_templates; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.permission_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    tenant_id uuid NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT permission_templates_name_tenant_id_key UNIQUE (name, tenant_id),
    CONSTRAINT permission_templates_pkey PRIMARY KEY (id)
);


--
-- Name: permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    description text,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT permissions_name_key UNIQUE (name),
    CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.permissions FORCE ROW LEVEL SECURITY;


--
-- Name: position_permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.position_permissions (
    id bigint NOT NULL,
    position_id uuid NOT NULL,
    permission character varying(255),
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT position_permissions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.position_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: position_roles; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.position_roles (
    id bigint NOT NULL,
    position_id uuid NOT NULL,
    role_id uuid NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT position_roles_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.position_roles FORCE ROW LEVEL SECURITY;


--
-- Name: positions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    department_id uuid,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT positions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.positions FORCE ROW LEVEL SECURITY;


--
-- Name: refresh_tokens; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id)
);


--
-- Name: resource_permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.resource_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type character varying(64) NOT NULL,
    resource_id uuid,
    user_id uuid NOT NULL,
    permission character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT resource_permissions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.resource_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: roles; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    status character varying(50),
    CONSTRAINT ck_roles_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT roles_name_key UNIQUE (name),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.roles FORCE ROW LEVEL SECURITY;


--
-- Name: schema_defense_ledger; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.schema_defense_ledger (
    service_schema text NOT NULL,
    schema_hash text NOT NULL,
    tables_count integer DEFAULT 0 NOT NULL,
    cols_count integer DEFAULT 0 NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    last_skipped_ensure boolean DEFAULT false NOT NULL
);


--
-- Name: schema_registry; Type: TABLE; Schema: iam; Owner: -
--

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
    deleted_at timestamp with time zone,
    CONSTRAINT schema_registry_name_key UNIQUE (name),
    CONSTRAINT schema_registry_pkey PRIMARY KEY (id)
);


--
-- Name: sessions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);


--
-- Name: tenant_users; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.tenant_users (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role character varying,
    status character varying,
    created_at timestamp with time zone NOT NULL,
    last_login timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT tenant_users_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.tenant_users FORCE ROW LEVEL SECURITY;


--
-- Name: user_access_logs; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.user_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT user_access_logs_pkey PRIMARY KEY (id)
);


--
-- Name: user_positions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.user_positions (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    position_id uuid NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT user_positions_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY iam.user_positions FORCE ROW LEVEL SECURITY;


--
-- Name: user_roles; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);


--
-- Name: users; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE IF NOT EXISTS iam.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    email text NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255),
    phone text,
    avatar_url text,
    role_id uuid,
    department_id uuid,
    "position" character varying(255),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    phone_verified boolean DEFAULT false NOT NULL,
    last_login_at timestamp with time zone,
    last_login_ip inet,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    password_changed_at timestamp with time zone,
    must_change_password boolean DEFAULT false NOT NULL,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret character varying(255),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_superuser boolean DEFAULT false NOT NULL,
    roles text[],
    permissions text[],
    deleted_at timestamp with time zone,
    full_name_en character varying,
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username)
);


--
-- Name: wms_dashboard_snapshots; Type: TABLE; Schema: iam; Owner: -
--

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
    deleted_at timestamp with time zone,
    CONSTRAINT wms_dashboard_snapshots_pkey PRIMARY KEY (id),
    CONSTRAINT wms_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date)
);

ALTER TABLE ONLY iam.wms_dashboard_snapshots FORCE ROW LEVEL SECURITY;


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: core_chat_members core_chat_members_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_chat_members
    ADD CONSTRAINT core_chat_members_pkey PRIMARY KEY (room_id, user_id);


--
-- Name: core_chat_messages core_chat_messages_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_chat_messages
    ADD CONSTRAINT core_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: core_chat_rooms core_chat_rooms_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_chat_rooms
    ADD CONSTRAINT core_chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: core_dashboard_refresh_log core_dashboard_refresh_log_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_dashboard_refresh_log
    ADD CONSTRAINT core_dashboard_refresh_log_pkey PRIMARY KEY (id);


--
-- Name: core_dict_items core_dict_items_dict_type_id_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_dict_items
    ADD CONSTRAINT core_dict_items_dict_type_id_code_key UNIQUE (dict_type_id, code);


--
-- Name: core_dict_items core_dict_items_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_dict_items
    ADD CONSTRAINT core_dict_items_pkey PRIMARY KEY (id);


--
-- Name: core_dict_types core_dict_types_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_dict_types
    ADD CONSTRAINT core_dict_types_code_key UNIQUE (code);


--
-- Name: core_dict_types core_dict_types_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_dict_types
    ADD CONSTRAINT core_dict_types_pkey PRIMARY KEY (id);


--
-- Name: core_email_queue core_email_queue_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_email_queue
    ADD CONSTRAINT core_email_queue_pkey PRIMARY KEY (id);


--
-- Name: core_email_templates core_email_templates_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_email_templates
    ADD CONSTRAINT core_email_templates_pkey PRIMARY KEY (id);


--
-- Name: core_emails core_emails_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_emails
    ADD CONSTRAINT core_emails_pkey PRIMARY KEY (id);


--
-- Name: core_faqs core_faqs_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_faqs
    ADD CONSTRAINT core_faqs_pkey PRIMARY KEY (id);


--
-- Name: core_file_folders core_file_folders_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_file_folders
    ADD CONSTRAINT core_file_folders_pkey PRIMARY KEY (id);


--
-- Name: core_files core_files_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_files
    ADD CONSTRAINT core_files_pkey PRIMARY KEY (id);


--
-- Name: core_guide_lessons core_guide_lessons_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_guide_lessons
    ADD CONSTRAINT core_guide_lessons_pkey PRIMARY KEY (id);


--
-- Name: core_guide_progress core_guide_progress_guide_id_user_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_guide_progress
    ADD CONSTRAINT core_guide_progress_guide_id_user_id_key UNIQUE (guide_id, user_id);


--
-- Name: core_guide_progress core_guide_progress_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_guide_progress
    ADD CONSTRAINT core_guide_progress_pkey PRIMARY KEY (id);


--
-- Name: core_guides core_guides_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_guides
    ADD CONSTRAINT core_guides_pkey PRIMARY KEY (id);


--
-- Name: core_inter_module_sync core_inter_module_sync_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_inter_module_sync
    ADD CONSTRAINT core_inter_module_sync_pkey PRIMARY KEY (id);


--
-- Name: core_login_logs core_login_logs_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_login_logs
    ADD CONSTRAINT core_login_logs_pkey PRIMARY KEY (id);


--
-- Name: core_menu_groups core_menu_groups_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_menu_groups
    ADD CONSTRAINT core_menu_groups_pkey PRIMARY KEY (id);


--
-- Name: core_menu_groups core_menu_groups_tenant_id_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_menu_groups
    ADD CONSTRAINT core_menu_groups_tenant_id_code_key UNIQUE (tenant_id, code);


--
-- Name: core_menus core_menus_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_menus
    ADD CONSTRAINT core_menus_pkey PRIMARY KEY (id);


--
-- Name: core_menus core_menus_tenant_id_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_menus
    ADD CONSTRAINT core_menus_tenant_id_code_key UNIQUE (tenant_id, code);


--
-- Name: core_migration_history core_migration_history_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_migration_history
    ADD CONSTRAINT core_migration_history_pkey PRIMARY KEY (id);


--
-- Name: core_migration_history core_migration_history_plugin_name_version_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_migration_history
    ADD CONSTRAINT core_migration_history_plugin_name_version_key UNIQUE (plugin_name, version);


--
-- Name: core_mobile_offline_records core_mobile_offline_records_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_mobile_offline_records
    ADD CONSTRAINT core_mobile_offline_records_pkey PRIMARY KEY (id);


--
-- Name: core_notification_templates core_notification_templates_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_notification_templates
    ADD CONSTRAINT core_notification_templates_pkey PRIMARY KEY (id);


--
-- Name: core_notifications core_notifications_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_notifications
    ADD CONSTRAINT core_notifications_pkey PRIMARY KEY (id);


--
-- Name: core_permissions core_permissions_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_permissions
    ADD CONSTRAINT core_permissions_code_key UNIQUE (code);


--
-- Name: core_permissions core_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_permissions
    ADD CONSTRAINT core_permissions_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_categories core_plugin_categories_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_categories
    ADD CONSTRAINT core_plugin_categories_code_key UNIQUE (code);


--
-- Name: core_plugin_categories core_plugin_categories_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_categories
    ADD CONSTRAINT core_plugin_categories_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_instances core_plugin_instances_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_instances core_plugin_instances_plugin_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_plugin_id_key UNIQUE (plugin_id);


--
-- Name: core_plugin_permissions core_plugin_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_permissions
    ADD CONSTRAINT core_plugin_permissions_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_permissions core_plugin_permissions_plugin_code_permission_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_permissions
    ADD CONSTRAINT core_plugin_permissions_plugin_code_permission_code_key UNIQUE (plugin_code, permission_code);


--
-- Name: core_plugin_pricing core_plugin_pricing_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_pricing
    ADD CONSTRAINT core_plugin_pricing_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_pricing core_plugin_pricing_plugin_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_pricing
    ADD CONSTRAINT core_plugin_pricing_plugin_code_key UNIQUE (plugin_code);


--
-- Name: core_plugin_reviews core_plugin_reviews_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_reviews
    ADD CONSTRAINT core_plugin_reviews_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_versions core_plugin_versions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_pkey PRIMARY KEY (id);


--
-- Name: core_plugin_versions core_plugin_versions_plugin_id_version_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_plugin_id_version_key UNIQUE (plugin_id, version);


--
-- Name: core_plugins core_plugins_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugins
    ADD CONSTRAINT core_plugins_code_key UNIQUE (code);


--
-- Name: core_plugins core_plugins_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugins
    ADD CONSTRAINT core_plugins_pkey PRIMARY KEY (id);


--
-- Name: core_role_permissions core_role_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_role_permissions
    ADD CONSTRAINT core_role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: core_roles core_roles_name_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_roles
    ADD CONSTRAINT core_roles_name_key UNIQUE (name);


--
-- Name: core_roles core_roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_roles
    ADD CONSTRAINT core_roles_pkey PRIMARY KEY (id);


--
-- Name: core_tenant_modules core_tenant_modules_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_modules
    ADD CONSTRAINT core_tenant_modules_pkey PRIMARY KEY (id);


--
-- Name: core_tenant_modules core_tenant_modules_tenant_id_module_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_modules
    ADD CONSTRAINT core_tenant_modules_tenant_id_module_code_key UNIQUE (tenant_id, module_code);


--
-- Name: core_tenant_plugins core_tenant_plugins_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_pkey PRIMARY KEY (id);


--
-- Name: core_tenant_plugins core_tenant_plugins_tenant_id_plugin_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_tenant_id_plugin_id_key UNIQUE (tenant_id, plugin_id);


--
-- Name: core_tenant_settings core_tenant_settings_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_settings
    ADD CONSTRAINT core_tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: core_tenant_settings core_tenant_settings_tenant_id_setting_key_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_settings
    ADD CONSTRAINT core_tenant_settings_tenant_id_setting_key_key UNIQUE (tenant_id, setting_key);


--
-- Name: core_tenant_usage core_tenant_usage_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_usage
    ADD CONSTRAINT core_tenant_usage_pkey PRIMARY KEY (id);


--
-- Name: core_tenant_usage core_tenant_usage_tenant_id_period_start_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_usage
    ADD CONSTRAINT core_tenant_usage_tenant_id_period_start_key UNIQUE (tenant_id, period_start);


--
-- Name: core_tenant_users core_tenant_users_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_users
    ADD CONSTRAINT core_tenant_users_pkey PRIMARY KEY (id);


--
-- Name: core_tenant_users core_tenant_users_tenant_id_email_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_users
    ADD CONSTRAINT core_tenant_users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: core_tenant_users core_tenant_users_tenant_id_user_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_users
    ADD CONSTRAINT core_tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: core_tenants core_tenants_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenants
    ADD CONSTRAINT core_tenants_code_key UNIQUE (code);


--
-- Name: core_tenants core_tenants_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenants
    ADD CONSTRAINT core_tenants_pkey PRIMARY KEY (id);


--
-- Name: core_usage_records core_usage_records_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_usage_records
    ADD CONSTRAINT core_usage_records_pkey PRIMARY KEY (id);


--
-- Name: core_user_roles core_user_roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_user_roles
    ADD CONSTRAINT core_user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: core_users core_users_email_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_users
    ADD CONSTRAINT core_users_email_key UNIQUE (email);


--
-- Name: core_users core_users_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_users
    ADD CONSTRAINT core_users_pkey PRIMARY KEY (id);


--
-- Name: core_users core_users_username_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_users
    ADD CONSTRAINT core_users_username_key UNIQUE (username);


--
-- Name: core_workflow_instances core_workflow_instances_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_workflow_instances
    ADD CONSTRAINT core_workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: core_workflow_tasks core_workflow_tasks_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_workflow_tasks
    ADD CONSTRAINT core_workflow_tasks_pkey PRIMARY KEY (id);


--
-- Name: core_workflows core_workflows_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_workflows
    ADD CONSTRAINT core_workflows_pkey PRIMARY KEY (id);


--
-- Name: crm_dashboard_snapshots crm_dashboard_snapshots_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.crm_dashboard_snapshots
    ADD CONSTRAINT crm_dashboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: crm_dashboard_snapshots crm_dashboard_snapshots_tenant_id_snapshot_date_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.crm_dashboard_snapshots
    ADD CONSTRAINT crm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);


--
-- Name: data_permissions data_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.data_permissions
    ADD CONSTRAINT data_permissions_pkey PRIMARY KEY (id);


--
-- Name: dynamic_data dynamic_data_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.dynamic_data
    ADD CONSTRAINT dynamic_data_pkey PRIMARY KEY (id);


--
-- Name: ehs_dashboard_snapshots ehs_dashboard_snapshots_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.ehs_dashboard_snapshots
    ADD CONSTRAINT ehs_dashboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: ehs_dashboard_snapshots ehs_dashboard_snapshots_tenant_id_snapshot_date_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.ehs_dashboard_snapshots
    ADD CONSTRAINT ehs_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);


--
-- Name: hrm_dashboard_snapshots hrm_dashboard_snapshots_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.hrm_dashboard_snapshots
    ADD CONSTRAINT hrm_dashboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: hrm_dashboard_snapshots hrm_dashboard_snapshots_tenant_id_snapshot_date_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.hrm_dashboard_snapshots
    ADD CONSTRAINT hrm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);


--
-- Name: lims_dashboard_snapshots lims_dashboard_snapshots_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.lims_dashboard_snapshots
    ADD CONSTRAINT lims_dashboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: lims_dashboard_snapshots lims_dashboard_snapshots_tenant_id_snapshot_date_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.lims_dashboard_snapshots
    ADD CONSTRAINT lims_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: pdm_dashboard_snapshots pdm_dashboard_snapshots_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.pdm_dashboard_snapshots
    ADD CONSTRAINT pdm_dashboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: pdm_dashboard_snapshots pdm_dashboard_snapshots_tenant_id_snapshot_date_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.pdm_dashboard_snapshots
    ADD CONSTRAINT pdm_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);


--
-- Name: permission_audit_logs permission_audit_logs_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: permission_templates permission_templates_name_tenant_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.permission_templates
    ADD CONSTRAINT permission_templates_name_tenant_id_key UNIQUE (name, tenant_id);


--
-- Name: permission_templates permission_templates_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.permission_templates
    ADD CONSTRAINT permission_templates_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: position_permissions position_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.position_permissions
    ADD CONSTRAINT position_permissions_pkey PRIMARY KEY (id);


--
-- Name: position_permissions position_permissions_position_id_permission_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.position_permissions
    ADD CONSTRAINT position_permissions_position_id_permission_key UNIQUE (position_id, permission);


--
-- Name: position_roles position_roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.position_roles
    ADD CONSTRAINT position_roles_pkey PRIMARY KEY (id);


--
-- Name: position_roles position_roles_position_id_role_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.position_roles
    ADD CONSTRAINT position_roles_position_id_role_id_key UNIQUE (position_id, role_id);


--
-- Name: positions positions_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.positions
    ADD CONSTRAINT positions_code_key UNIQUE (code);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: resource_permissions resource_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.resource_permissions
    ADD CONSTRAINT resource_permissions_pkey PRIMARY KEY (id);


--
-- Name: resource_permissions resource_permissions_resource_type_resource_id_user_id_perm_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.resource_permissions
    ADD CONSTRAINT resource_permissions_resource_type_resource_id_user_id_perm_key UNIQUE (resource_type, resource_id, user_id, permission);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schema_defense_ledger schema_defense_ledger_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.schema_defense_ledger
    ADD CONSTRAINT schema_defense_ledger_pkey PRIMARY KEY (service_schema);


--
-- Name: schema_registry schema_registry_name_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.schema_registry
    ADD CONSTRAINT schema_registry_name_key UNIQUE (name);


--
-- Name: schema_registry schema_registry_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.schema_registry
    ADD CONSTRAINT schema_registry_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: tenant_users tenant_users_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.tenant_users
    ADD CONSTRAINT tenant_users_pkey PRIMARY KEY (id);


--
-- Name: user_access_logs user_access_logs_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.user_access_logs
    ADD CONSTRAINT user_access_logs_pkey PRIMARY KEY (id);


--
-- Name: user_positions user_positions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.user_positions
    ADD CONSTRAINT user_positions_pkey PRIMARY KEY (id);


--
-- Name: user_positions user_positions_user_id_position_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.user_positions
    ADD CONSTRAINT user_positions_user_id_position_id_key UNIQUE (user_id, position_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: wms_dashboard_snapshots wms_dashboard_snapshots_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.wms_dashboard_snapshots
    ADD CONSTRAINT wms_dashboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: wms_dashboard_snapshots wms_dashboard_snapshots_tenant_id_snapshot_date_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.wms_dashboard_snapshots
    ADD CONSTRAINT wms_dashboard_snapshots_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date);


--
-- Name: idx_core_role_permissions_permission_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_role_permissions_permission_id ON iam.core_role_permissions USING btree (permission_id);


--
-- Name: idx_core_tenant_plugins_plugin_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_tenant_plugins_plugin_id ON iam.core_tenant_plugins USING btree (plugin_id);


--
-- Name: idx_core_user_roles_role_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_core_user_roles_role_id ON iam.core_user_roles USING btree (role_id);


--
-- Name: idx_data_permissions_user_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_data_permissions_user_id ON iam.data_permissions USING btree (user_id);


--
-- Name: idx_permission_audit_logs_created_at; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_created_at ON iam.permission_audit_logs USING btree (created_at);


--
-- Name: idx_permission_audit_logs_target; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_target ON iam.permission_audit_logs USING btree (target_type, target_id);


--
-- Name: idx_permission_audit_logs_user_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON iam.permission_audit_logs USING btree (user_id);


--
-- Name: idx_permission_templates_name; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_permission_templates_name ON iam.permission_templates USING btree (name);


--
-- Name: idx_position_permissions_position_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_position_permissions_position_id ON iam.position_permissions USING btree (position_id);


--
-- Name: idx_position_roles_position_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_position_roles_position_id ON iam.position_roles USING btree (position_id);


--
-- Name: idx_position_roles_role_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_position_roles_role_id ON iam.position_roles USING btree (role_id);


--
-- Name: idx_positions_department_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_positions_department_id ON iam.positions USING btree (department_id);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON iam.refresh_tokens USING btree (user_id);


--
-- Name: idx_resource_permissions_resource; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON iam.resource_permissions USING btree (resource_type, resource_id);


--
-- Name: idx_resource_permissions_user_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_id ON iam.resource_permissions USING btree (user_id);


--
-- Name: idx_roles_status; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_roles_status ON iam.roles USING btree (status);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON iam.sessions USING btree (user_id);


--
-- Name: idx_user_positions_position_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_positions_position_id ON iam.user_positions USING btree (position_id);


--
-- Name: idx_user_positions_user_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON iam.user_positions USING btree (user_id);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_department_id ON iam.users USING btree (department_id);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_role_id ON iam.users USING btree (role_id);


--
-- Name: idx_users_status; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_status ON iam.users USING btree (status);


--
-- Name: core_chat_members core_chat_members_room_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_chat_members
    ADD CONSTRAINT core_chat_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES iam.core_chat_rooms(id);


--
-- Name: core_chat_messages core_chat_messages_room_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_chat_messages
    ADD CONSTRAINT core_chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES iam.core_chat_rooms(id);


--
-- Name: core_dict_items core_dict_items_dict_type_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_dict_items
    ADD CONSTRAINT core_dict_items_dict_type_id_fkey FOREIGN KEY (dict_type_id) REFERENCES iam.core_dict_types(id) ON DELETE CASCADE;


--
-- Name: core_dict_items core_dict_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_dict_items
    ADD CONSTRAINT core_dict_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES iam.core_dict_items(id) ON DELETE SET NULL;


--
-- Name: core_guide_lessons core_guide_lessons_guide_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_guide_lessons
    ADD CONSTRAINT core_guide_lessons_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES iam.core_guides(id) ON DELETE CASCADE;


--
-- Name: core_guide_progress core_guide_progress_guide_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_guide_progress
    ADD CONSTRAINT core_guide_progress_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES iam.core_guides(id) ON DELETE CASCADE;


--
-- Name: core_menus core_menus_group_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_menus
    ADD CONSTRAINT core_menus_group_id_fkey FOREIGN KEY (group_id) REFERENCES iam.core_menu_groups(id) ON DELETE CASCADE;


--
-- Name: core_menus core_menus_parent_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_menus
    ADD CONSTRAINT core_menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES iam.core_menus(id) ON DELETE SET NULL;


--
-- Name: core_plugin_instances core_plugin_instances_plugin_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_instances
    ADD CONSTRAINT core_plugin_instances_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES iam.core_plugins(id) ON DELETE CASCADE;


--
-- Name: core_plugin_reviews core_plugin_reviews_plugin_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_reviews
    ADD CONSTRAINT core_plugin_reviews_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES iam.core_plugins(id) ON DELETE CASCADE;


--
-- Name: core_plugin_versions core_plugin_versions_plugin_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_plugin_versions
    ADD CONSTRAINT core_plugin_versions_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES iam.core_plugins(id) ON DELETE CASCADE;


--
-- Name: core_role_permissions core_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_role_permissions
    ADD CONSTRAINT core_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES iam.core_permissions(id);


--
-- Name: core_role_permissions core_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_role_permissions
    ADD CONSTRAINT core_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.core_roles(id);


--
-- Name: core_tenant_modules core_tenant_modules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_modules
    ADD CONSTRAINT core_tenant_modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id);


--
-- Name: core_tenant_plugins core_tenant_plugins_plugin_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES iam.core_plugins(id) ON DELETE CASCADE;


--
-- Name: core_tenant_plugins core_tenant_plugins_tenant_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id) ON DELETE CASCADE;


--
-- Name: core_tenant_settings core_tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_settings
    ADD CONSTRAINT core_tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id);


--
-- Name: core_tenant_usage core_tenant_usage_tenant_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_usage
    ADD CONSTRAINT core_tenant_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id);


--
-- Name: core_tenant_users core_tenant_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_tenant_users
    ADD CONSTRAINT core_tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id) ON DELETE CASCADE;


--
-- Name: core_usage_records core_usage_records_tenant_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_usage_records
    ADD CONSTRAINT core_usage_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id);


--
-- Name: core_user_roles core_user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_user_roles
    ADD CONSTRAINT core_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.core_roles(id);


--
-- Name: core_user_roles core_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_user_roles
    ADD CONSTRAINT core_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.core_users(id);


--
-- Name: core_workflow_instances core_workflow_instances_workflow_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_workflow_instances
    ADD CONSTRAINT core_workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES iam.core_workflows(id);


--
-- Name: core_workflow_tasks core_workflow_tasks_instance_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.core_workflow_tasks
    ADD CONSTRAINT core_workflow_tasks_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES iam.core_workflow_instances(id);


--
-- Name: data_permissions data_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.data_permissions
    ADD CONSTRAINT data_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: dynamic_data dynamic_data_schema_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.dynamic_data
    ADD CONSTRAINT dynamic_data_schema_id_fkey FOREIGN KEY (schema_id) REFERENCES iam.schema_registry(id) ON DELETE CASCADE;


--
-- Name: permission_audit_logs permission_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: position_permissions position_permissions_position_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.position_permissions
    ADD CONSTRAINT position_permissions_position_id_fkey FOREIGN KEY (position_id) REFERENCES iam.positions(id) ON DELETE CASCADE;


--
-- Name: position_roles position_roles_position_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.position_roles
    ADD CONSTRAINT position_roles_position_id_fkey FOREIGN KEY (position_id) REFERENCES iam.positions(id) ON DELETE CASCADE;


--
-- Name: position_roles position_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.position_roles
    ADD CONSTRAINT position_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;


--
-- Name: resource_permissions resource_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.resource_permissions
    ADD CONSTRAINT resource_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;


--
-- Name: user_positions user_positions_position_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.user_positions
    ADD CONSTRAINT user_positions_position_id_fkey FOREIGN KEY (position_id) REFERENCES iam.positions(id) ON DELETE CASCADE;


--
-- Name: user_positions user_positions_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.user_positions
    ADD CONSTRAINT user_positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id);


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: core_chat_members; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_chat_members ENABLE ROW LEVEL SECURITY;

--
-- Name: core_chat_messages; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: core_chat_rooms; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: core_dashboard_refresh_log; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_dashboard_refresh_log ENABLE ROW LEVEL SECURITY;

--
-- Name: core_dict_items; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_dict_items ENABLE ROW LEVEL SECURITY;

--
-- Name: core_dict_types; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_dict_types ENABLE ROW LEVEL SECURITY;

--
-- Name: core_email_queue; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_email_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: core_email_templates; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: core_emails; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: core_faqs; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_faqs ENABLE ROW LEVEL SECURITY;

--
-- Name: core_file_folders; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_file_folders ENABLE ROW LEVEL SECURITY;

--
-- Name: core_files; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_files ENABLE ROW LEVEL SECURITY;

--
-- Name: core_guide_lessons; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_guide_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: core_guide_progress; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_guide_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: core_guides; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_guides ENABLE ROW LEVEL SECURITY;

--
-- Name: core_inter_module_sync; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_inter_module_sync ENABLE ROW LEVEL SECURITY;

--
-- Name: core_login_logs; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_login_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: core_menu_groups; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_menu_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: core_menus; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_menus ENABLE ROW LEVEL SECURITY;

--
-- Name: core_migration_history; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_migration_history ENABLE ROW LEVEL SECURITY;

--
-- Name: core_mobile_offline_records; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_mobile_offline_records ENABLE ROW LEVEL SECURITY;

--
-- Name: core_notification_templates; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_notification_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: core_notifications; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: core_plugin_categories; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_plugin_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: core_plugin_instances; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_plugin_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: core_plugin_permissions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_plugin_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: core_plugin_pricing; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_plugin_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: core_plugin_reviews; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_plugin_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: core_plugins; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_plugins ENABLE ROW LEVEL SECURITY;

--
-- Name: core_roles; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: core_tenant_modules; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_tenant_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: core_tenant_plugins; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_tenant_plugins ENABLE ROW LEVEL SECURITY;

--
-- Name: core_tenant_settings; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_tenant_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: core_tenant_usage; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_tenant_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: core_tenant_users; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_tenant_users ENABLE ROW LEVEL SECURITY;

--
-- Name: core_usage_records; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_usage_records ENABLE ROW LEVEL SECURITY;

--
-- Name: core_users; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_users ENABLE ROW LEVEL SECURITY;

--
-- Name: core_workflow_instances; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_workflow_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: core_workflow_tasks; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_workflow_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: core_workflows; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.core_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_dashboard_snapshots; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.crm_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: data_permissions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.data_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: ehs_dashboard_snapshots; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.ehs_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: hrm_dashboard_snapshots; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.hrm_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs iam_allow_all_audit_logs; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY iam_allow_all_audit_logs ON iam.audit_logs USING (true) WITH CHECK (true);


--
-- Name: permissions iam_allow_all_permissions; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY iam_allow_all_permissions ON iam.permissions USING (true) WITH CHECK (true);


--
-- Name: roles iam_allow_all_roles; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY iam_allow_all_roles ON iam.roles USING (true) WITH CHECK (true);


--
-- Name: lims_dashboard_snapshots; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.lims_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: pdm_dashboard_snapshots; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.pdm_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_audit_logs; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.permission_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_templates; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.permission_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: permissions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: position_permissions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.position_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: position_roles; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.position_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: positions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.positions ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_permissions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.resource_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: core_dashboard_refresh_log rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.core_dashboard_refresh_log USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: core_email_queue rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.core_email_queue USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: core_plugin_pricing rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.core_plugin_pricing USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: core_usage_records rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.core_usage_records USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: crm_dashboard_snapshots rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.crm_dashboard_snapshots USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: ehs_dashboard_snapshots rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.ehs_dashboard_snapshots USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: hrm_dashboard_snapshots rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.hrm_dashboard_snapshots USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: lims_dashboard_snapshots rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.lims_dashboard_snapshots USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: pdm_dashboard_snapshots rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.pdm_dashboard_snapshots USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: position_permissions rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.position_permissions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: position_roles rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.position_roles USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: positions rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.positions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: resource_permissions rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.resource_permissions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: user_positions rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.user_positions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: wms_dashboard_snapshots rls_tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY rls_tenant_isolation ON iam.wms_dashboard_snapshots USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));


--
-- Name: roles; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: core_chat_members tenant_isolation_core_chat_members; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_chat_members ON iam.core_chat_members USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_chat_messages tenant_isolation_core_chat_messages; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_chat_messages ON iam.core_chat_messages USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_chat_rooms tenant_isolation_core_chat_rooms; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_chat_rooms ON iam.core_chat_rooms USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_dict_items tenant_isolation_core_dict_items; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_dict_items ON iam.core_dict_items USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_dict_types tenant_isolation_core_dict_types; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_dict_types ON iam.core_dict_types USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_email_templates tenant_isolation_core_email_templates; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_email_templates ON iam.core_email_templates USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_emails tenant_isolation_core_emails; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_emails ON iam.core_emails USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_faqs tenant_isolation_core_faqs; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_faqs ON iam.core_faqs USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_file_folders tenant_isolation_core_file_folders; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_file_folders ON iam.core_file_folders USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_files tenant_isolation_core_files; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_files ON iam.core_files USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_guide_lessons tenant_isolation_core_guide_lessons; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_guide_lessons ON iam.core_guide_lessons USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_guide_progress tenant_isolation_core_guide_progress; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_guide_progress ON iam.core_guide_progress USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_guides tenant_isolation_core_guides; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_guides ON iam.core_guides USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_inter_module_sync tenant_isolation_core_inter_module_sync; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_inter_module_sync ON iam.core_inter_module_sync USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_login_logs tenant_isolation_core_login_logs; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_login_logs ON iam.core_login_logs USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_menu_groups tenant_isolation_core_menu_groups; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_menu_groups ON iam.core_menu_groups USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_menus tenant_isolation_core_menus; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_menus ON iam.core_menus USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_migration_history tenant_isolation_core_migration_history; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_migration_history ON iam.core_migration_history USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_mobile_offline_records tenant_isolation_core_mobile_offline_records; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_mobile_offline_records ON iam.core_mobile_offline_records USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_notification_templates tenant_isolation_core_notification_templates; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_notification_templates ON iam.core_notification_templates USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_notifications tenant_isolation_core_notifications; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_notifications ON iam.core_notifications USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_plugin_categories tenant_isolation_core_plugin_categories; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_plugin_categories ON iam.core_plugin_categories USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_plugin_instances tenant_isolation_core_plugin_instances; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_plugin_instances ON iam.core_plugin_instances USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_plugin_permissions tenant_isolation_core_plugin_permissions; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_plugin_permissions ON iam.core_plugin_permissions USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_plugin_reviews tenant_isolation_core_plugin_reviews; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_plugin_reviews ON iam.core_plugin_reviews USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_plugins tenant_isolation_core_plugins; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_plugins ON iam.core_plugins USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_roles tenant_isolation_core_roles; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_roles ON iam.core_roles USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_tenant_modules tenant_isolation_core_tenant_modules; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_tenant_modules ON iam.core_tenant_modules USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_tenant_plugins tenant_isolation_core_tenant_plugins; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_tenant_plugins ON iam.core_tenant_plugins USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_tenant_settings tenant_isolation_core_tenant_settings; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_tenant_settings ON iam.core_tenant_settings USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_tenant_usage tenant_isolation_core_tenant_usage; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_tenant_usage ON iam.core_tenant_usage USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_tenant_users tenant_isolation_core_tenant_users; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_tenant_users ON iam.core_tenant_users USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_users tenant_isolation_core_users; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_users ON iam.core_users USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_workflow_instances tenant_isolation_core_workflow_instances; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_workflow_instances ON iam.core_workflow_instances USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_workflow_tasks tenant_isolation_core_workflow_tasks; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_workflow_tasks ON iam.core_workflow_tasks USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: core_workflows tenant_isolation_core_workflows; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_core_workflows ON iam.core_workflows USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: data_permissions tenant_isolation_data_permissions; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_data_permissions ON iam.data_permissions USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));


--
-- Name: permission_audit_logs tenant_isolation_permission_audit_logs; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_permission_audit_logs ON iam.permission_audit_logs USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: permission_templates tenant_isolation_permission_templates; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_permission_templates ON iam.permission_templates USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: position_permissions tenant_isolation_position_permissions; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_position_permissions ON iam.position_permissions USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));


--
-- Name: position_roles tenant_isolation_position_roles; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_position_roles ON iam.position_roles USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));


--
-- Name: positions tenant_isolation_positions; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_positions ON iam.positions USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));


--
-- Name: resource_permissions tenant_isolation_resource_permissions; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_resource_permissions ON iam.resource_permissions USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));


--
-- Name: tenant_users tenant_isolation_tenant_users; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_tenant_users ON iam.tenant_users USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));


--
-- Name: user_positions tenant_isolation_user_positions; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation_user_positions ON iam.user_positions USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL)));


--
-- Name: tenant_users; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.tenant_users ENABLE ROW LEVEL SECURITY;

--
-- Name: user_positions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.user_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: wms_dashboard_snapshots; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.wms_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict 73kLWPrkbg1cDgu6KyujNFxTOfracdmR6cuucdg9WpG6wFvCTBpwKg8QdK31NAJ

