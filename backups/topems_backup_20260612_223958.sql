--
-- PostgreSQL database dump
--

\restrict GioeKU1vq0AdCMIE6j4ZIp7vNjFOIBOJLPKebylf4ZPpFfmJIC3AzSH3nhHEV14

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
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
-- Name: ai; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA ai;


ALTER SCHEMA ai OWNER TO topems;

--
-- Name: crm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA crm;


ALTER SCHEMA crm OWNER TO topems;

--
-- Name: doc; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA doc;


ALTER SCHEMA doc OWNER TO topems;

--
-- Name: doc_service; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA doc_service;


ALTER SCHEMA doc_service OWNER TO topems;

--
-- Name: ehs; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA ehs;


ALTER SCHEMA ehs OWNER TO topems;

--
-- Name: erp; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA erp;


ALTER SCHEMA erp OWNER TO topems;

--
-- Name: gis; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA gis;


ALTER SCHEMA gis OWNER TO topems;

--
-- Name: hrm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA hrm;


ALTER SCHEMA hrm OWNER TO topems;

--
-- Name: iam; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA iam;


ALTER SCHEMA iam OWNER TO topems;

--
-- Name: im; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA im;


ALTER SCHEMA im OWNER TO topems;

--
-- Name: integration; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA integration;


ALTER SCHEMA integration OWNER TO topems;

--
-- Name: lims; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA lims;


ALTER SCHEMA lims OWNER TO topems;

--
-- Name: mail; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA mail;


ALTER SCHEMA mail OWNER TO topems;

--
-- Name: mes; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA mes;


ALTER SCHEMA mes OWNER TO topems;

--
-- Name: mobile; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA mobile;


ALTER SCHEMA mobile OWNER TO topems;

--
-- Name: pdm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA pdm;


ALTER SCHEMA pdm OWNER TO topems;

--
-- Name: pm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA pm;


ALTER SCHEMA pm OWNER TO topems;

--
-- Name: portal; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA portal;


ALTER SCHEMA portal OWNER TO topems;

--
-- Name: qms; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA qms;


ALTER SCHEMA qms OWNER TO topems;

--
-- Name: report; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA report;


ALTER SCHEMA report OWNER TO topems;

--
-- Name: rs; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA rs;


ALTER SCHEMA rs OWNER TO topems;

--
-- Name: rs_test; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA rs_test;


ALTER SCHEMA rs_test OWNER TO topems;

--
-- Name: scm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA scm;


ALTER SCHEMA scm OWNER TO topems;

--
-- Name: shared; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA shared;


ALTER SCHEMA shared OWNER TO topems;

--
-- Name: srm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA srm;


ALTER SCHEMA srm OWNER TO topems;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO topems;

--
-- Name: wms; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA wms;


ALTER SCHEMA wms OWNER TO topems;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_attachment_timestamp(); Type: FUNCTION; Schema: mail; Owner: topems
--

CREATE FUNCTION mail.update_attachment_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION mail.update_attachment_timestamp() OWNER TO topems;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: topems
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO topems;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: shared; Owner: topems
--

CREATE FUNCTION shared.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION shared.update_modified_column() OWNER TO topems;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: topems
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO topems;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE crm.audit_logs OWNER TO topems;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.audit_logs IS '审计日志表';


--
-- Name: contacts; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    full_name character varying(255),
    email character varying(100),
    phone character varying(50),
    mobile character varying(50),
    "position" character varying(100),
    department character varying(100),
    is_primary boolean DEFAULT false,
    is_decision_maker boolean DEFAULT false,
    gender character varying(20),
    birthday date,
    address text,
    notes text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE crm.contacts OWNER TO topems;

--
-- Name: TABLE contacts; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.contacts IS '联系人信息表';


--
-- Name: COLUMN contacts.is_primary; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.contacts.is_primary IS '是否为主要联系人';


--
-- Name: COLUMN contacts.is_decision_maker; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.contacts.is_decision_maker IS '是否为决策者';


--
-- Name: customer_tags; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.customer_tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE crm.customer_tags OWNER TO topems;

--
-- Name: TABLE customer_tags; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.customer_tags IS '客户标签关联表';


--
-- Name: customers; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100),
    industry character varying(100),
    company_size character varying(50),
    website character varying(255),
    email character varying(100),
    phone character varying(50),
    fax character varying(50),
    address text,
    city character varying(100),
    province character varying(100),
    country character varying(100),
    postal_code character varying(20),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    customer_type character varying(50) DEFAULT 'potential'::character varying,
    source character varying(50),
    rating character varying(20),
    revenue numeric(15,2),
    employee_count integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE crm.customers OWNER TO topems;

--
-- Name: TABLE customers; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.customers IS '客户信息表';


--
-- Name: COLUMN customers.customer_type; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.customers.customer_type IS '客户类型：potential, active, inactive, churned等';


--
-- Name: COLUMN customers.source; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.customers.source IS '客户来源：website, referral, campaign等';


--
-- Name: COLUMN customers.rating; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.customers.rating IS '客户评级：A, B, C, D等';


--
-- Name: dashboard_metrics; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.dashboard_metrics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    metric_type character varying(50) NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(15,2) NOT NULL,
    metric_unit character varying(20),
    period_type character varying(20) NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    comparison_value numeric(15,2),
    comparison_period_start date,
    comparison_period_end date,
    trend character varying(20),
    target_value numeric(15,2),
    achievement_percentage numeric(5,2),
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE crm.dashboard_metrics OWNER TO topems;

--
-- Name: TABLE dashboard_metrics; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.dashboard_metrics IS '仪表盘数据表';


--
-- Name: COLUMN dashboard_metrics.metric_type; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.dashboard_metrics.metric_type IS '指标类型：revenue, customers, opportunities, conversions等';


--
-- Name: COLUMN dashboard_metrics.period_type; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.dashboard_metrics.period_type IS '周期类型：daily, weekly, monthly, quarterly, yearly等';


--
-- Name: interactions; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.interactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid,
    contact_id uuid,
    opportunity_id uuid,
    interaction_type character varying(50) NOT NULL,
    subject character varying(255),
    content text,
    location character varying(255),
    duration_minutes integer,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    outcome character varying(50),
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    follow_up_notes text,
    assigned_to uuid,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE crm.interactions OWNER TO topems;

--
-- Name: TABLE interactions; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.interactions IS '交互记录表';


--
-- Name: COLUMN interactions.interaction_type; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.interactions.interaction_type IS '交互类型：call, email, meeting, visit, demo等';


--
-- Name: COLUMN interactions.status; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.interactions.status IS '状态：scheduled, in_progress, completed, cancelled等';


--
-- Name: opportunities; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.opportunities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid,
    contact_id uuid,
    name character varying(255) NOT NULL,
    code character varying(100),
    description text,
    value numeric(15,2),
    expected_revenue numeric(15,2),
    stage character varying(50) DEFAULT 'prospecting'::character varying NOT NULL,
    probability integer DEFAULT 0,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(20),
    source character varying(50),
    campaign_id uuid,
    close_date date,
    actual_close_date date,
    next_step text,
    competitor text,
    loss_reason text,
    win_reason text,
    assigned_to uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE crm.opportunities OWNER TO topems;

--
-- Name: TABLE opportunities; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.opportunities IS '商机信息表';


--
-- Name: COLUMN opportunities.stage; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.opportunities.stage IS '商机阶段：prospecting, qualification, proposal, negotiation, closed_won, closed_lost等';


--
-- Name: COLUMN opportunities.probability; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.opportunities.probability IS '成交概率（百分比）';


--
-- Name: tags; Type: TABLE; Schema: crm; Owner: topems
--

CREATE TABLE crm.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(20) DEFAULT '#3498db'::character varying,
    description text,
    category character varying(50),
    is_system boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE crm.tags OWNER TO topems;

--
-- Name: TABLE tags; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON TABLE crm.tags IS '标签表';


--
-- Name: COLUMN tags.is_system; Type: COMMENT; Schema: crm; Owner: topems
--

COMMENT ON COLUMN crm.tags.is_system IS '是否为系统标签';


--
-- Name: archive_borrows; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.archive_borrows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    archive_id uuid NOT NULL,
    borrower_id uuid NOT NULL,
    borrower_name character varying(255) NOT NULL,
    borrow_reason text NOT NULL,
    borrow_type character varying(20) NOT NULL,
    borrow_date date NOT NULL,
    due_date date NOT NULL,
    return_date date,
    status character varying(20) DEFAULT 'pending'::character varying,
    approver_id uuid,
    approval_comment text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.archive_borrows OWNER TO topems;

--
-- Name: archive_categories; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.archive_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    parent_id uuid,
    description text,
    retention_period integer,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.archive_categories OWNER TO topems;

--
-- Name: archive_destructions; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.archive_destructions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    archive_id uuid NOT NULL,
    reason text NOT NULL,
    approver_id uuid NOT NULL,
    approved_at timestamp with time zone,
    destroyed_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.archive_destructions OWNER TO topems;

--
-- Name: archive_metadata; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.archive_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    archive_id uuid NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE doc_service.archive_metadata OWNER TO topems;

--
-- Name: archives; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.archives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    archive_no character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    category_id uuid NOT NULL,
    file_id uuid,
    summary text,
    keywords text[],
    creator character varying(255),
    created_date date,
    retention_period integer,
    status character varying(20) DEFAULT 'active'::character varying,
    security_level character varying(20) DEFAULT 'internal'::character varying,
    department_id uuid,
    source_module character varying(50),
    source_id uuid,
    archived_at timestamp with time zone,
    archived_by character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.archives OWNER TO topems;

--
-- Name: faqs; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100),
    tags text[],
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.faqs OWNER TO topems;

--
-- Name: file_permissions; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.file_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid,
    role_id uuid,
    permission character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE doc_service.file_permissions OWNER TO topems;

--
-- Name: file_versions; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.file_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    version integer NOT NULL,
    size bigint NOT NULL,
    checksum character varying(255) NOT NULL,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.file_versions OWNER TO topems;

--
-- Name: files; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    folder_id uuid,
    size bigint NOT NULL,
    content_type character varying(255) NOT NULL,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.files OWNER TO topems;

--
-- Name: folder_permissions; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.folder_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    folder_id uuid NOT NULL,
    user_id uuid,
    role_id uuid,
    permission character varying(50) NOT NULL,
    inherit boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE doc_service.folder_permissions OWNER TO topems;

--
-- Name: folders; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.folders OWNER TO topems;

--
-- Name: help_articles; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.help_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(500) NOT NULL,
    slug character varying(500) NOT NULL,
    category_id uuid,
    module character varying(100),
    summary text,
    content text NOT NULL,
    tags text[],
    view_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.help_articles OWNER TO topems;

--
-- Name: help_categories; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.help_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    icon character varying(100),
    description text,
    module character varying(100),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.help_categories OWNER TO topems;

--
-- Name: template_categories; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.template_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    icon character varying(100),
    description text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.template_categories OWNER TO topems;

--
-- Name: templates; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    category_id uuid,
    module character varying(100) NOT NULL,
    description text,
    content text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    view_count integer DEFAULT 0,
    use_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.templates OWNER TO topems;

--
-- Name: video_tutorials; Type: TABLE; Schema: doc_service; Owner: topems
--

CREATE TABLE doc_service.video_tutorials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    thumbnail_url text,
    video_url text,
    duration character varying(50),
    module character varying(100),
    tags text[],
    view_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);


ALTER TABLE doc_service.video_tutorials OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    user_id character varying(100),
    user_name character varying(100),
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.audit_logs OWNER TO topems;

--
-- Name: drill_records; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.drill_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drill_no character varying(50) NOT NULL,
    plan_id uuid,
    drill_name character varying(200) NOT NULL,
    drill_date timestamp with time zone,
    participants jsonb DEFAULT '[]'::jsonb,
    duration_hours numeric(10,2) NOT NULL,
    location character varying(200),
    summary text,
    issues_found text,
    improvements text,
    attachments jsonb,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.drill_records OWNER TO topems;

--
-- Name: emergency_plans; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.emergency_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    plan_type character varying(50) NOT NULL,
    scope text,
    trigger_conditions text,
    response_procedures text,
    responsible_persons jsonb DEFAULT '[]'::jsonb,
    contact_info text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.emergency_plans OWNER TO topems;

--
-- Name: environmental_alerts; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.environmental_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    point_id uuid NOT NULL,
    alert_type character varying(50) NOT NULL,
    alert_level character varying(20) NOT NULL,
    parameter character varying(50) NOT NULL,
    threshold_value numeric(20,6) NOT NULL,
    actual_value numeric(20,6) NOT NULL,
    alert_time timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    handled_by character varying(100),
    handled_time timestamp with time zone,
    handle_result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.environmental_alerts OWNER TO topems;

--
-- Name: environmental_data; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.environmental_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    point_id uuid NOT NULL,
    data_time timestamp with time zone NOT NULL,
    parameter character varying(50) NOT NULL,
    value numeric(20,6) NOT NULL,
    unit character varying(20) NOT NULL,
    quality character varying(20),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.environmental_data OWNER TO topems;

--
-- Name: health_checkups; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.health_checkups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(50) NOT NULL,
    employee_name character varying(100) NOT NULL,
    checkup_date timestamp with time zone NOT NULL,
    checkup_type character varying(50) NOT NULL,
    institution character varying(200),
    result_summary text,
    abnormal_items jsonb,
    recommendations text,
    attachments jsonb,
    next_checkup_date timestamp with time zone,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.health_checkups OWNER TO topems;

--
-- Name: health_records; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.health_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(50) NOT NULL,
    employee_name character varying(100) NOT NULL,
    gender character varying(10),
    birth_date timestamp with time zone,
    blood_type character varying(5),
    allergies jsonb,
    chronic_diseases jsonb,
    medical_history text,
    emergency_contact character varying(100),
    emergency_phone character varying(20),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.health_records OWNER TO topems;

--
-- Name: monitoring_points; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.monitoring_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    point_no character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    point_type character varying(50) NOT NULL,
    location character varying(200),
    latitude numeric(10,6),
    longitude numeric(10,6),
    parameters jsonb DEFAULT '[]'::jsonb,
    thresholds jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_data_time timestamp with time zone,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.monitoring_points OWNER TO topems;

--
-- Name: risk_assessments; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.risk_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    assessment_type character varying(50) NOT NULL,
    risk_source character varying(100) NOT NULL,
    risk_category character varying(50) NOT NULL,
    likelihood integer NOT NULL,
    consequence integer NOT NULL,
    risk_level character varying(20) NOT NULL,
    risk_score integer NOT NULL,
    description text,
    affected_area character varying(200),
    affected_persons integer,
    existing_controls jsonb,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    assessor character varying(100),
    assessment_date timestamp with time zone,
    review_date timestamp with time zone,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.risk_assessments OWNER TO topems;

--
-- Name: risk_controls; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.risk_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    control_type character varying(50) NOT NULL,
    control_measure text NOT NULL,
    implementation_plan text,
    responsible_person character varying(100),
    target_date timestamp with time zone,
    completion_date timestamp with time zone,
    effectiveness character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.risk_controls OWNER TO topems;

--
-- Name: safety_checks; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.safety_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    check_no character varying(50) NOT NULL,
    check_type character varying(50) NOT NULL,
    inspector character varying(100) NOT NULL,
    check_date timestamp with time zone,
    location character varying(200),
    result character varying(20) NOT NULL,
    issues jsonb DEFAULT '[]'::jsonb,
    attachments jsonb,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.safety_checks OWNER TO topems;

--
-- Name: safety_hazards; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.safety_hazards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_no character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(50) NOT NULL,
    level character varying(20) NOT NULL,
    description text,
    location character varying(200),
    risk_assessment text,
    control_measures jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.safety_hazards OWNER TO topems;

--
-- Name: safety_incidents; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.safety_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    incident_type character varying(50) NOT NULL,
    incident_level character varying(20) NOT NULL,
    location character varying(200),
    incident_time timestamp with time zone NOT NULL,
    description text,
    casualties integer DEFAULT 0,
    injuries integer DEFAULT 0,
    economic_loss numeric(15,2),
    cause_analysis text,
    corrective_actions jsonb,
    responsible_persons jsonb,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    handled_by character varying(100),
    handled_time timestamp with time zone,
    attachments jsonb,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.safety_incidents OWNER TO topems;

--
-- Name: training_programs; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.training_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    training_type character varying(50) NOT NULL,
    content text,
    objectives text,
    target_audience text,
    duration_hours numeric(10,2),
    training_method character varying(50),
    instructor character varying(100),
    location character varying(200),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    max_participants integer,
    materials jsonb,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    completion_rate numeric(5,2),
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.training_programs OWNER TO topems;

--
-- Name: training_records; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.training_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    employee_id character varying(50) NOT NULL,
    employee_name character varying(100) NOT NULL,
    enrollment_date timestamp with time zone NOT NULL,
    completion_date timestamp with time zone,
    score numeric(5,2),
    certificate_no character varying(50),
    certificate_expiry timestamp with time zone,
    status character varying(20) DEFAULT 'enrolled'::character varying NOT NULL,
    remarks text,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.training_records OWNER TO topems;

--
-- Name: vaccination_records; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.vaccination_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(50) NOT NULL,
    employee_name character varying(100) NOT NULL,
    vaccine_name character varying(100) NOT NULL,
    vaccine_type character varying(50) NOT NULL,
    vaccination_date timestamp with time zone NOT NULL,
    dose_number integer NOT NULL,
    institution character varying(200),
    batch_number character varying(50),
    expiry_date timestamp with time zone,
    next_dose_date timestamp with time zone,
    remarks text,
    attachments jsonb,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE ehs.vaccination_records OWNER TO topems;

--
-- Name: accounting_subjects; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.accounting_subjects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100),
    level integer DEFAULT 1 NOT NULL,
    parent_code character varying(50),
    description text,
    is_cash_flow boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.accounting_subjects OWNER TO topems;

--
-- Name: assets; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_number character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    brand character varying(100),
    model character varying(100),
    purchase_date timestamp with time zone,
    purchase_amount numeric(15,2),
    location character varying(255),
    responsible_id uuid,
    status character varying(50) DEFAULT 'in_use'::character varying NOT NULL,
    serial_number character varying(100),
    manufacturer character varying(200),
    rated_power numeric(10,2),
    rated_voltage numeric(10,2),
    rated_current numeric(10,2),
    specifications jsonb,
    image_url character varying(500),
    department character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.assets OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_id character varying(255),
    user_name character varying(255),
    request_details jsonb,
    response_details jsonb,
    status character varying(50) NOT NULL,
    error_message text,
    ip_address character varying(255),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.audit_logs OWNER TO topems;

--
-- Name: budgets; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.budgets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    department_id uuid,
    budget_type character varying(100),
    fiscal_year character varying(20) NOT NULL,
    total_budget numeric(15,2) NOT NULL,
    used_amount numeric(15,2) DEFAULT 0 NOT NULL,
    remaining_amount numeric(15,2) NOT NULL,
    usage_rate numeric(5,2) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.budgets OWNER TO topems;

--
-- Name: db_changes; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.db_changes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    change_type character varying(50) NOT NULL,
    table_name character varying(200) NOT NULL,
    column_name character varying(200),
    old_definition jsonb,
    new_definition jsonb,
    sql_statement text NOT NULL,
    executed_by character varying(255),
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    backup_data jsonb,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.db_changes OWNER TO topems;

--
-- Name: dict_items; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.dict_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    dict_type_id uuid NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    value text,
    sort_order integer DEFAULT 0,
    parent_id uuid,
    extra_data jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.dict_items OWNER TO topems;

--
-- Name: dict_types; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.dict_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.dict_types OWNER TO topems;

--
-- Name: expenses; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expense_number character varying(100) NOT NULL,
    applicant_name character varying(255),
    department_id uuid,
    expense_type character varying(100),
    amount numeric(15,2) NOT NULL,
    description text,
    expense_date timestamp with time zone,
    receipt_count integer,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    approver_id uuid,
    approved_at timestamp with time zone,
    reimbursed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.expenses OWNER TO topems;

--
-- Name: financial_vouchers; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.financial_vouchers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    voucher_number character varying(100) NOT NULL,
    voucher_date timestamp with time zone NOT NULL,
    period character varying(20) NOT NULL,
    attachment_count integer DEFAULT 0,
    summary text,
    maker_id uuid,
    maker_name character varying(200),
    checker_id uuid,
    checker_name character varying(200),
    bookkeeper_id uuid,
    bookkeeper_name character varying(200),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    total_debit numeric(18,4) DEFAULT 0 NOT NULL,
    total_credit numeric(18,4) DEFAULT 0 NOT NULL,
    source_system character varying(50),
    source_id character varying(100),
    project_id uuid,
    contract_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.financial_vouchers OWNER TO topems;

--
-- Name: payables; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.payables (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_number character varying(100) NOT NULL,
    supplier_name character varying(255),
    category character varying(100),
    amount numeric(15,2) NOT NULL,
    invoice_date timestamp with time zone,
    due_date timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    paid_amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.payables OWNER TO topems;

--
-- Name: receivables; Type: TABLE; Schema: erp; Owner: topems
--

CREATE TABLE erp.receivables (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_number character varying(100) NOT NULL,
    customer_name character varying(255),
    project_name character varying(255),
    amount numeric(15,2) NOT NULL,
    invoice_date timestamp with time zone,
    due_date timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    received_amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE erp.receivables OWNER TO topems;

--
-- Name: audit_log; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action character varying(100) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id uuid,
    old_value jsonb,
    new_value jsonb,
    user_id uuid,
    ip_address character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE gis.audit_log OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    action character varying(100) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id uuid,
    old_value jsonb,
    new_value jsonb,
    user_id uuid,
    ip_address character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.audit_logs OWNER TO topems;

--
-- Name: business_locations; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.business_locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_type character varying(50) NOT NULL,
    business_name character varying(255) NOT NULL,
    business_code character varying(100),
    category character varying(100),
    "position" jsonb NOT NULL,
    address text,
    contact_person character varying(255),
    contact_phone character varying(50),
    capacity integer,
    current_usage integer,
    status character varying(50) DEFAULT 'active'::character varying,
    properties jsonb,
    description text,
    external_id uuid,
    external_type character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.business_locations OWNER TO topems;

--
-- Name: device_location_records; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.device_location_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    device_id uuid NOT NULL,
    "position" jsonb NOT NULL,
    accuracy numeric(10,2),
    speed numeric(10,2),
    direction numeric(5,2),
    altitude numeric(10,2),
    battery_level integer,
    signal_strength integer,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.device_location_records OWNER TO topems;

--
-- Name: device_locations; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.device_locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    map_id uuid NOT NULL,
    device_name character varying(255) NOT NULL,
    device_code character varying(100) NOT NULL,
    device_type character varying(100),
    "position" jsonb NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    description text,
    last_inspected timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.device_locations OWNER TO topems;

--
-- Name: devices; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.devices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    device_code character varying(100) NOT NULL,
    device_name character varying(255) NOT NULL,
    device_type character varying(50) NOT NULL,
    description text,
    properties jsonb,
    status character varying(50) DEFAULT 'active'::character varying,
    registered_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.devices OWNER TO topems;

--
-- Name: factory_maps; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.factory_maps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    map_type character varying(50) NOT NULL,
    file_url character varying(500) NOT NULL,
    bounds jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.factory_maps OWNER TO topems;

--
-- Name: geodata; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.geodata (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    data_type character varying(50) NOT NULL,
    format character varying(50) NOT NULL,
    file_path character varying(500),
    geojson_data jsonb,
    feature_count integer,
    extent jsonb,
    properties_schema jsonb,
    metadata jsonb,
    status character varying(50) DEFAULT 'active'::character varying,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.geodata OWNER TO topems;

--
-- Name: geofeatures; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.geofeatures (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    geodata_id uuid NOT NULL,
    feature_type character varying(50) NOT NULL,
    geometry jsonb NOT NULL,
    properties jsonb,
    centroid jsonb,
    area numeric(15,5),
    length numeric(15,5),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.geofeatures OWNER TO topems;

--
-- Name: location_photos; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.location_photos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    map_id uuid NOT NULL,
    "position" jsonb NOT NULL,
    photo_url character varying(500) NOT NULL,
    description text,
    taken_by character varying(255) NOT NULL,
    taken_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.location_photos OWNER TO topems;

--
-- Name: locations; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100),
    location_type character varying(50) NOT NULL,
    "position" jsonb NOT NULL,
    address text,
    description text,
    properties jsonb,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.locations OWNER TO topems;

--
-- Name: map_layers; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.map_layers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    map_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    layer_type character varying(50) NOT NULL,
    source_type character varying(50) NOT NULL,
    source_url character varying(500),
    source_data jsonb,
    style_config jsonb,
    opacity numeric(3,2) DEFAULT 1.0,
    visible boolean DEFAULT true,
    z_index integer DEFAULT 0,
    min_zoom integer,
    max_zoom integer,
    properties jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.map_layers OWNER TO topems;

--
-- Name: map_markers; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.map_markers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    marker_type character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    marker_style character varying(50),
    "position" jsonb NOT NULL,
    icon_svg text,
    color character varying(20),
    size integer DEFAULT 32,
    popup_content text,
    click_action character varying(50),
    action_data jsonb,
    visible boolean DEFAULT true,
    z_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.map_markers OWNER TO topems;

--
-- Name: maps; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.maps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    map_type character varying(50) DEFAULT 'base'::character varying NOT NULL,
    projection character varying(50) DEFAULT 'EPSG:4326'::character varying,
    bounds jsonb,
    center jsonb,
    zoom_level integer DEFAULT 10,
    status character varying(50) DEFAULT 'active'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.maps OWNER TO topems;

--
-- Name: pipelines; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.pipelines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    map_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    pipeline_type character varying(100),
    path jsonb NOT NULL,
    properties jsonb,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.pipelines OWNER TO topems;

--
-- Name: spatial_analysis; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.spatial_analysis (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    analysis_type character varying(50) NOT NULL,
    input_data jsonb NOT NULL,
    parameters jsonb,
    result_data jsonb,
    result_geometry jsonb,
    statistics jsonb,
    execution_time_ms integer,
    status character varying(50) DEFAULT 'completed'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.spatial_analysis OWNER TO topems;

--
-- Name: warehouse_locations; Type: TABLE; Schema: gis; Owner: topems
--

CREATE TABLE gis.warehouse_locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    map_id uuid NOT NULL,
    warehouse_name character varying(255) NOT NULL,
    zone character varying(100),
    "position" jsonb NOT NULL,
    capacity integer,
    usage_rate numeric(5,2),
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE gis.warehouse_locations OWNER TO topems;

--
-- Name: attendance_records; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.attendance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    date date NOT NULL,
    check_in_time time without time zone,
    check_out_time time without time zone,
    check_in_location character varying(255),
    check_out_location character varying(255),
    status character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    work_hours numeric(5,2),
    overtime_hours numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.attendance_records OWNER TO topems;

--
-- Name: TABLE attendance_records; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.attendance_records IS '考勤记录表';


--
-- Name: COLUMN attendance_records.status; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.attendance_records.status IS '考勤状态：normal, late, early_leave, absent, leave等';


--
-- Name: audit_logs; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE hrm.audit_logs OWNER TO topems;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.audit_logs IS '审计日志表';


--
-- Name: companies; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.companies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    short_name character varying(100),
    registration_number character varying(100),
    tax_number character varying(100),
    address text,
    contact_phone character varying(50),
    email character varying(100),
    website character varying(255),
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.companies OWNER TO topems;

--
-- Name: TABLE companies; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.companies IS '公司信息表';


--
-- Name: COLUMN companies.organization_id; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.companies.organization_id IS '组织ID，用于多组织隔离';


--
-- Name: COLUMN companies.deleted_at; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.companies.deleted_at IS '软删除时间戳';


--
-- Name: contracts; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    contract_no character varying(100),
    contract_type character varying(50) NOT NULL,
    party_a_name character varying(255),
    party_a_contact character varying(255),
    party_b_name character varying(255),
    party_b_contact character varying(255),
    start_date date NOT NULL,
    end_date date,
    salary numeric(15,2),
    probation_period_days integer,
    contract_file_path text,
    reminder_days integer DEFAULT 30,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.contracts OWNER TO topems;

--
-- Name: TABLE contracts; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.contracts IS '员工合同表';


--
-- Name: COLUMN contracts.contract_type; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.contracts.contract_type IS '合同类型：full_time, part_time, contractor, intern等';


--
-- Name: COLUMN contracts.reminder_days; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.contracts.reminder_days IS '合同到期提醒天数';


--
-- Name: departments; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.departments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    company_id uuid,
    name character varying(255) NOT NULL,
    code character varying(50),
    parent_id uuid,
    manager_id uuid,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.departments OWNER TO topems;

--
-- Name: TABLE departments; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.departments IS '部门信息表';


--
-- Name: COLUMN departments.parent_id; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.departments.parent_id IS '上级部门ID';


--
-- Name: COLUMN departments.manager_id; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.departments.manager_id IS '部门负责人ID（关联员工表）';


--
-- Name: employees; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.employees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    company_id uuid,
    department_id uuid,
    position_id uuid,
    employee_number character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    gender character varying(20),
    birth_date date,
    hire_date date,
    leave_date date,
    id_card_number character varying(50),
    job_title character varying(255),
    "position" character varying(255),
    email character varying(100),
    phone character varying(50),
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(50),
    address text,
    education character varying(50),
    marital_status character varying(20),
    nationality character varying(50),
    bank_account character varying(100),
    bank_name character varying(100),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.employees OWNER TO topems;

--
-- Name: TABLE employees; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.employees IS '员工信息表';


--
-- Name: COLUMN employees.employee_number; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.employees.employee_number IS '员工编号，组织内唯一';


--
-- Name: leave_records; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.leave_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days numeric(5,2) NOT NULL,
    reason text,
    approver_id uuid,
    approval_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approval_date date,
    rejection_reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.leave_records OWNER TO topems;

--
-- Name: TABLE leave_records; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.leave_records IS '请假记录表';


--
-- Name: COLUMN leave_records.leave_type; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.leave_records.leave_type IS '请假类型：annual, sick, personal, maternity等';


--
-- Name: payroll_records; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.payroll_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    base_salary numeric(15,2) NOT NULL,
    bonus numeric(15,2) DEFAULT 0,
    allowance numeric(15,2) DEFAULT 0,
    overtime_pay numeric(15,2) DEFAULT 0,
    deduction numeric(15,2) DEFAULT 0,
    tax numeric(15,2) DEFAULT 0,
    insurance numeric(15,2) DEFAULT 0,
    net_salary numeric(15,2) NOT NULL,
    payment_date date,
    payment_method character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.payroll_records OWNER TO topems;

--
-- Name: TABLE payroll_records; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.payroll_records IS '薪资记录表';


--
-- Name: COLUMN payroll_records.status; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.payroll_records.status IS '薪资状态：pending, approved, paid等';


--
-- Name: performance_records; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.performance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_year integer NOT NULL,
    period_month integer,
    period_quarter integer,
    performance_type character varying(50) NOT NULL,
    score numeric(5,2),
    level character varying(50),
    goals text,
    achievements text,
    strengths text,
    weaknesses text,
    improvement_plan text,
    reviewer_id uuid,
    review_date date,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.performance_records OWNER TO topems;

--
-- Name: TABLE performance_records; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.performance_records IS '绩效记录表';


--
-- Name: COLUMN performance_records.performance_type; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.performance_records.performance_type IS '绩效类型：monthly, quarterly, annual等';


--
-- Name: positions; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.positions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    company_id uuid,
    department_id uuid,
    name character varying(255) NOT NULL,
    code character varying(50),
    level integer DEFAULT 1,
    description text,
    responsibilities text,
    requirements text,
    salary_range_min numeric(15,2),
    salary_range_max numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.positions OWNER TO topems;

--
-- Name: TABLE positions; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.positions IS '职位信息表';


--
-- Name: recruitment_applications; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.recruitment_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    recruitment_id uuid NOT NULL,
    applicant_name character varying(255) NOT NULL,
    applicant_email character varying(100),
    applicant_phone character varying(50),
    resume_file_path text,
    education character varying(255),
    work_experience text,
    expected_salary numeric(15,2),
    application_date date NOT NULL,
    interview_date date,
    interview_result character varying(50),
    offer_status character varying(50),
    status character varying(20) DEFAULT 'submitted'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.recruitment_applications OWNER TO topems;

--
-- Name: TABLE recruitment_applications; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.recruitment_applications IS '招聘申请表';


--
-- Name: recruitment_records; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.recruitment_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    position_id uuid,
    title character varying(255) NOT NULL,
    description text,
    requirements text,
    salary_range_min numeric(15,2),
    salary_range_max numeric(15,2),
    location character varying(255),
    recruitment_type character varying(50),
    publish_date date,
    deadline date,
    vacancies integer DEFAULT 1,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.recruitment_records OWNER TO topems;

--
-- Name: TABLE recruitment_records; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.recruitment_records IS '招聘记录表';


--
-- Name: salary_adjustments; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.salary_adjustments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    adjustment_type character varying(50) NOT NULL,
    previous_salary numeric(15,2) NOT NULL,
    new_salary numeric(15,2) NOT NULL,
    adjustment_amount numeric(15,2) NOT NULL,
    adjustment_percentage numeric(5,2),
    effective_date date NOT NULL,
    reason text,
    approver_id uuid,
    approval_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approval_date date,
    rejection_reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.salary_adjustments OWNER TO topems;

--
-- Name: TABLE salary_adjustments; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.salary_adjustments IS '薪资调整记录表';


--
-- Name: COLUMN salary_adjustments.adjustment_type; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON COLUMN hrm.salary_adjustments.adjustment_type IS '调整类型：promotion, annual_raise, performance_raise等';


--
-- Name: training_participants; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.training_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    training_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    participation_status character varying(20) DEFAULT 'registered'::character varying NOT NULL,
    completion_status character varying(20),
    score numeric(5,2),
    certificate_no character varying(100),
    certificate_file_path text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.training_participants OWNER TO topems;

--
-- Name: TABLE training_participants; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.training_participants IS '培训参与记录表';


--
-- Name: training_records; Type: TABLE; Schema: hrm; Owner: topems
--

CREATE TABLE hrm.training_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    training_name character varying(255) NOT NULL,
    training_type character varying(50),
    training_category character varying(50),
    description text,
    instructor character varying(255),
    start_date date,
    end_date date,
    duration_hours numeric(5,2),
    location character varying(255),
    cost numeric(15,2),
    max_participants integer,
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE hrm.training_records OWNER TO topems;

--
-- Name: TABLE training_records; Type: COMMENT; Schema: hrm; Owner: topems
--

COMMENT ON TABLE hrm.training_records IS '培训记录表';


--
-- Name: audit_logs; Type: TABLE; Schema: iam; Owner: topems
--

CREATE TABLE iam.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100),
    resource_id uuid,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.audit_logs OWNER TO topems;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: iam; Owner: topems
--

CREATE TABLE iam.password_reset_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.password_reset_tokens OWNER TO topems;

--
-- Name: permissions; Type: TABLE; Schema: iam; Owner: topems
--

CREATE TABLE iam.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    description text
);


ALTER TABLE iam.permissions OWNER TO topems;

--
-- Name: role_permissions; Type: TABLE; Schema: iam; Owner: topems
--

CREATE TABLE iam.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


ALTER TABLE iam.role_permissions OWNER TO topems;

--
-- Name: roles; Type: TABLE; Schema: iam; Owner: topems
--

CREATE TABLE iam.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.roles OWNER TO topems;

--
-- Name: user_roles; Type: TABLE; Schema: iam; Owner: topems
--

CREATE TABLE iam.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.user_roles OWNER TO topems;

--
-- Name: users; Type: TABLE; Schema: iam; Owner: topems
--

CREATE TABLE iam.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100),
    is_active boolean DEFAULT true,
    is_superuser boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone
);


ALTER TABLE iam.users OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    details jsonb NOT NULL,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.audit_logs OWNER TO topems;

--
-- Name: chat_room_members; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.chat_room_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_room_id uuid NOT NULL,
    user_id character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_read_at timestamp without time zone,
    deleted_at timestamp without time zone
);


ALTER TABLE im.chat_room_members OWNER TO topems;

--
-- Name: chat_rooms; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255),
    room_type character varying(20) NOT NULL,
    members jsonb NOT NULL,
    created_by character varying(100) NOT NULL,
    last_message text,
    last_message_time timestamp without time zone,
    is_muted boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.chat_rooms OWNER TO topems;

--
-- Name: contact_group_members; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.contact_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.contact_group_members OWNER TO topems;

--
-- Name: contact_groups; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.contact_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.contact_groups OWNER TO topems;

--
-- Name: file_transfers; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.file_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    content_type character varying(100) NOT NULL,
    uploader_id character varying(100) NOT NULL,
    uploader_name character varying(100) NOT NULL,
    chat_room_id uuid,
    message_id uuid,
    is_shared boolean DEFAULT false NOT NULL,
    share_link character varying(100),
    download_count bigint DEFAULT 0 NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.file_transfers OWNER TO topems;

--
-- Name: friends; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.friends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    friend_id character varying(100) NOT NULL,
    friend_name character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.friends OWNER TO topems;

--
-- Name: message_read_receipts; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.message_read_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id character varying(100) NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.message_read_receipts OWNER TO topems;

--
-- Name: messages; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_room_id uuid,
    sender_id character varying(100) NOT NULL,
    sender_name character varying(100) NOT NULL,
    receiver_id character varying(100),
    message_type character varying(20) NOT NULL,
    content text NOT NULL,
    file_url character varying(500),
    file_name character varying(255),
    file_size bigint,
    reply_to_id uuid,
    forwarded_from_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE im.messages OWNER TO topems;

--
-- Name: notifications; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    notification_type character varying(50) NOT NULL,
    related_id uuid,
    related_type character varying(50),
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.notifications OWNER TO topems;

--
-- Name: project_groups; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.project_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    project_id uuid,
    members jsonb NOT NULL,
    created_by character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.project_groups OWNER TO topems;

--
-- Name: user_status; Type: TABLE; Schema: im; Owner: topems
--

CREATE TABLE im.user_status (
    user_id character varying(100) NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_online boolean DEFAULT false NOT NULL,
    status_type character varying(20) DEFAULT 'offline'::character varying NOT NULL,
    status_message character varying(255),
    last_seen timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE im.user_status OWNER TO topems;

--
-- Name: integration_configs; Type: TABLE; Schema: integration; Owner: topems
--

CREATE TABLE integration.integration_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_name character varying(100) NOT NULL,
    source_system character varying(50) NOT NULL,
    target_system character varying(50) NOT NULL,
    config_type character varying(50) NOT NULL,
    config_value jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE integration.integration_configs OWNER TO topems;

--
-- Name: integration_events; Type: TABLE; Schema: integration; Owner: topems
--

CREATE TABLE integration.integration_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_system character varying(50) NOT NULL,
    target_system character varying(50) NOT NULL,
    event_type character varying(100) NOT NULL,
    source_record_id uuid,
    target_record_id uuid,
    payload jsonb,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE integration.integration_events OWNER TO topems;

--
-- Name: lims_qms_sync; Type: TABLE; Schema: integration; Owner: topems
--

CREATE TABLE integration.lims_qms_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lims_sample_id uuid NOT NULL,
    qms_inspection_id uuid,
    sample_name character varying(255) NOT NULL,
    inspection_result text,
    inspection_notes text,
    synced boolean DEFAULT false NOT NULL,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sync_error text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE integration.lims_qms_sync OWNER TO topems;

--
-- Name: mes_erp_sync; Type: TABLE; Schema: integration; Owner: topems
--

CREATE TABLE integration.mes_erp_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mes_order_id uuid NOT NULL,
    erp_order_id uuid,
    order_number character varying(255) NOT NULL,
    product_name character varying(255),
    quantity numeric(15,2),
    synced boolean DEFAULT false NOT NULL,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sync_error text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE integration.mes_erp_sync OWNER TO topems;

--
-- Name: wms_scm_sync; Type: TABLE; Schema: integration; Owner: topems
--

CREATE TABLE integration.wms_scm_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wms_inventory_id uuid NOT NULL,
    scm_supply_id uuid,
    item_name character varying(255) NOT NULL,
    quantity numeric(15,2),
    unit character varying(50),
    synced boolean DEFAULT false NOT NULL,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sync_error text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE integration.wms_scm_sync OWNER TO topems;

--
-- Name: ai_analyses; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.ai_analyses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    analysis_type character varying(100) NOT NULL,
    prompt text NOT NULL,
    response text NOT NULL,
    ai_service_url character varying(500),
    created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.ai_analyses OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    action_type character varying(50) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id character varying(255) NOT NULL,
    target_name character varying(255),
    user_id character varying(255) NOT NULL,
    user_name character varying(255),
    details jsonb NOT NULL,
    ip_address character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.audit_logs OWNER TO topems;

--
-- Name: document_relations; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.document_relations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    doc_service_file_id uuid NOT NULL,
    doc_service_url character varying(500),
    file_name character varying(255) NOT NULL,
    file_size bigint,
    file_type character varying(100),
    description text,
    created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.document_relations OWNER TO topems;

--
-- Name: inspection_processes; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.inspection_processes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.inspection_processes OWNER TO topems;

--
-- Name: inspection_records; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.inspection_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    step_id uuid NOT NULL,
    step_name character varying(255) NOT NULL,
    result text NOT NULL,
    conclusion text NOT NULL,
    inspector character varying(255) NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.inspection_records OWNER TO topems;

--
-- Name: inspection_tasks; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.inspection_tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sample_id uuid NOT NULL,
    process_id uuid NOT NULL,
    current_step integer DEFAULT 1 NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    inspector character varying(255) NOT NULL,
    priority character varying(50) DEFAULT 'normal'::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.inspection_tasks OWNER TO topems;

--
-- Name: instrument_calibrations; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.instrument_calibrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    instrument_id uuid NOT NULL,
    calibration_date timestamp with time zone NOT NULL,
    calibrated_by character varying(255) NOT NULL,
    calibration_results jsonb NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.instrument_calibrations OWNER TO topems;

--
-- Name: instruments; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.instruments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    instrument_type character varying(255) NOT NULL,
    model character varying(255),
    manufacturer character varying(255),
    serial_number character varying(100),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    location character varying(255),
    purchase_date timestamp with time zone,
    calibration_date timestamp with time zone,
    next_calibration_date timestamp with time zone,
    maintenance_history jsonb DEFAULT '[]'::jsonb,
    responsible_person character varying(255),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.instruments OWNER TO topems;

--
-- Name: lab_ledger; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.lab_ledger (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ledger_type character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    quantity integer DEFAULT 0,
    location character varying(255),
    status character varying(50) DEFAULT 'available'::character varying,
    created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.lab_ledger OWNER TO topems;

--
-- Name: maintenance_records; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.maintenance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    instrument_id uuid NOT NULL,
    maintenance_type character varying(255) NOT NULL,
    description text NOT NULL,
    performed_by character varying(255) NOT NULL,
    performed_at timestamp with time zone NOT NULL,
    next_maintenance_date timestamp with time zone,
    cost numeric(18,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.maintenance_records OWNER TO topems;

--
-- Name: reagent_usages; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.reagent_usages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reagent_id uuid NOT NULL,
    quantity numeric(18,4) NOT NULL,
    usage_date timestamp with time zone NOT NULL,
    purpose character varying(255),
    used_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.reagent_usages OWNER TO topems;

--
-- Name: reagents; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.reagents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    category character varying(100),
    specification character varying(255),
    supplier character varying(255),
    batch_number character varying(100),
    quantity numeric(18,4) DEFAULT 0 NOT NULL,
    unit character varying(50) NOT NULL,
    location character varying(255),
    storage_condition character varying(255),
    expiration_date timestamp with time zone,
    status character varying(50) DEFAULT 'in_stock'::character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.reagents OWNER TO topems;

--
-- Name: samples; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.samples (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'received'::character varying NOT NULL,
    project_id uuid,
    batch_number character varying(100),
    source character varying(255),
    sample_type character varying(100),
    received_date timestamp with time zone DEFAULT now() NOT NULL,
    storage_location character varying(255),
    created_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE lims.samples OWNER TO topems;

--
-- Name: attachments; Type: TABLE; Schema: mail; Owner: topems
--

CREATE TABLE mail.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_id uuid,
    filename character varying(255) NOT NULL,
    original_filename character varying(500) NOT NULL,
    file_path character varying(1000) NOT NULL,
    file_size bigint NOT NULL,
    content_type character varying(100) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE mail.attachments OWNER TO topems;

--
-- Name: TABLE attachments; Type: COMMENT; Schema: mail; Owner: topems
--

COMMENT ON TABLE mail.attachments IS 'Mail attachment storage';


--
-- Name: emails; Type: TABLE; Schema: mail; Owner: topems
--

CREATE TABLE mail.emails (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    subject character varying(500) NOT NULL,
    from_address character varying(255) NOT NULL,
    to_addresses jsonb NOT NULL,
    cc_addresses jsonb,
    bcc_addresses jsonb,
    body text NOT NULL,
    body_html text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    sent_at timestamp with time zone,
    error_message text,
    template_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE mail.emails OWNER TO topems;

--
-- Name: templates; Type: TABLE; Schema: mail; Owner: topems
--

CREATE TABLE mail.templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    subject_template text NOT NULL,
    body_template text NOT NULL,
    body_html_template text,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    tags jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE mail.templates OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: mes; Owner: topems
--

CREATE TABLE mes.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE mes.audit_logs OWNER TO topems;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.audit_logs IS '审计日志表';


--
-- Name: equipment; Type: TABLE; Schema: mes; Owner: topems
--

CREATE TABLE mes.equipment (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.equipment OWNER TO topems;

--
-- Name: TABLE equipment; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.equipment IS '设备表';


--
-- Name: COLUMN equipment.equipment_type; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.equipment.equipment_type IS '设备类型：production, testing, auxiliary等';


--
-- Name: COLUMN equipment.status; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.equipment.status IS '状态：available, in_use, maintenance, repair, scrapped等';


--
-- Name: COLUMN equipment.operating_status; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.equipment.operating_status IS '运行状态：running, idle, standby, fault等';


--
-- Name: equipment_inspection_records; Type: TABLE; Schema: mes; Owner: topems
--

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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.equipment_inspection_records OWNER TO topems;

--
-- Name: TABLE equipment_inspection_records; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.equipment_inspection_records IS '设备检验记录表';


--
-- Name: COLUMN equipment_inspection_records.inspection_type; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.equipment_inspection_records.inspection_type IS '检验类型：routine, special, annual等';


--
-- Name: equipment_maintenance_records; Type: TABLE; Schema: mes; Owner: topems
--

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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.equipment_maintenance_records OWNER TO topems;

--
-- Name: TABLE equipment_maintenance_records; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.equipment_maintenance_records IS '设备维护记录表';


--
-- Name: COLUMN equipment_maintenance_records.maintenance_type; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.equipment_maintenance_records.maintenance_type IS '维护类型：preventive, corrective, emergency等';


--
-- Name: COLUMN equipment_maintenance_records.status; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.equipment_maintenance_records.status IS '状态：in_progress, completed, cancelled等';


--
-- Name: process_route_steps; Type: TABLE; Schema: mes; Owner: topems
--

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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.process_route_steps OWNER TO topems;

--
-- Name: TABLE process_route_steps; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.process_route_steps IS '工艺路线明细表';


--
-- Name: process_routes; Type: TABLE; Schema: mes; Owner: topems
--

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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.process_routes OWNER TO topems;

--
-- Name: TABLE process_routes; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.process_routes IS '工艺路线表';


--
-- Name: production_orders; Type: TABLE; Schema: mes; Owner: topems
--

CREATE TABLE mes.production_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    order_number character varying(100) NOT NULL,
    order_type character varying(50),
    product_name character varying(255) NOT NULL,
    product_code character varying(100),
    product_specification text,
    batch_number character varying(100),
    quantity integer NOT NULL,
    unit character varying(20) DEFAULT 'piece'::character varying,
    planned_quantity integer,
    completed_quantity integer DEFAULT 0,
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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.production_orders OWNER TO topems;

--
-- Name: TABLE production_orders; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.production_orders IS '生产订单表';


--
-- Name: COLUMN production_orders.order_type; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.production_orders.order_type IS '订单类型：standard, urgent, trial, sample等';


--
-- Name: COLUMN production_orders.priority; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.production_orders.priority IS '优先级：urgent, high, normal, low等';


--
-- Name: COLUMN production_orders.status; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.production_orders.status IS '状态：created, released, in_progress, completed, cancelled等';


--
-- Name: production_processes; Type: TABLE; Schema: mes; Owner: topems
--

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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.production_processes OWNER TO topems;

--
-- Name: TABLE production_processes; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.production_processes IS '生产工艺表';


--
-- Name: COLUMN production_processes.process_type; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.production_processes.process_type IS '工艺类型：assembly, machining, welding, inspection等';


--
-- Name: COLUMN production_processes.sequence; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.production_processes.sequence IS '工艺顺序号';


--
-- Name: production_records; Type: TABLE; Schema: mes; Owner: topems
--

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
    completed_quantity integer DEFAULT 0 NOT NULL,
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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.production_records OWNER TO topems;

--
-- Name: TABLE production_records; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.production_records IS '生产记录表';


--
-- Name: COLUMN production_records.quality_check_result; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.production_records.quality_check_result IS '质检结果：passed, failed, conditional等';


--
-- Name: COLUMN production_records.status; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.production_records.status IS '状态：in_progress, completed, paused, cancelled等';


--
-- Name: work_stations; Type: TABLE; Schema: mes; Owner: topems
--

CREATE TABLE mes.work_stations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
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
    deleted_at timestamp with time zone
);


ALTER TABLE mes.work_stations OWNER TO topems;

--
-- Name: TABLE work_stations; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON TABLE mes.work_stations IS '工作站表';


--
-- Name: COLUMN work_stations.station_type; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.work_stations.station_type IS '工作站类型：assembly, machining, welding, packaging等';


--
-- Name: COLUMN work_stations.status; Type: COMMENT; Schema: mes; Owner: topems
--

COMMENT ON COLUMN mes.work_stations.status IS '状态：available, busy, maintenance, offline等';


--
-- Name: audio_recordings; Type: TABLE; Schema: mobile; Owner: topems
--

CREATE TABLE mobile.audio_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    address character varying(500),
    duration_seconds integer,
    file_url character varying(500),
    recorded_by character varying(100) NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE mobile.audio_recordings OWNER TO topems;

--
-- Name: mobile_tasks; Type: TABLE; Schema: mobile; Owner: topems
--

CREATE TABLE mobile.mobile_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    task_type character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    assignee character varying(100),
    location_lat numeric(10,6),
    location_lng numeric(10,6),
    due_date date,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE mobile.mobile_tasks OWNER TO topems;

--
-- Name: patrol_records; Type: TABLE; Schema: mobile; Owner: topems
--

CREATE TABLE mobile.patrol_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    address character varying(500),
    patrol_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    checked_by character varying(100) NOT NULL,
    checked_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE mobile.patrol_records OWNER TO topems;

--
-- Name: photo_evidences; Type: TABLE; Schema: mobile; Owner: topems
--

CREATE TABLE mobile.photo_evidences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    address character varying(500),
    file_url character varying(500),
    recorded_by character varying(100) NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE mobile.photo_evidences OWNER TO topems;

--
-- Name: scan_records; Type: TABLE; Schema: mobile; Owner: topems
--

CREATE TABLE mobile.scan_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barcode character varying(100) NOT NULL,
    location_lat numeric(10,6) NOT NULL,
    location_lng numeric(10,6) NOT NULL,
    item_type character varying(50) NOT NULL,
    quantity numeric(10,2),
    operator character varying(100) NOT NULL,
    scanned_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE mobile.scan_records OWNER TO topems;

--
-- Name: video_recordings; Type: TABLE; Schema: mobile; Owner: topems
--

CREATE TABLE mobile.video_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    start_location_lat numeric(10,6) NOT NULL,
    start_location_lng numeric(10,6) NOT NULL,
    location_track jsonb,
    duration_seconds integer,
    file_url character varying(500),
    thumbnail_url character varying(500),
    recorded_by character varying(100) NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE mobile.video_recordings OWNER TO topems;

--
-- Name: acceptances; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    acceptance_no character varying(50) NOT NULL,
    acceptance_type character varying(50) NOT NULL,
    acceptance_date timestamp with time zone NOT NULL,
    acceptor character varying(100) NOT NULL,
    result character varying(20) NOT NULL,
    comments text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.acceptances OWNER TO topems;

--
-- Name: budgets; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    budget_type character varying(50) NOT NULL,
    planned_amount numeric(15,2) NOT NULL,
    actual_amount numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    period character varying(20),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.budgets OWNER TO topems;

--
-- Name: contracts; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    contract_no character varying(50) NOT NULL,
    contract_name character varying(200) NOT NULL,
    contract_type character varying(50) NOT NULL,
    party_a character varying(200) NOT NULL,
    party_b character varying(200) NOT NULL,
    amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    sign_date timestamp with time zone,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.contracts OWNER TO topems;

--
-- Name: documents; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    document_name character varying(200) NOT NULL,
    file_path character varying(500),
    file_size integer,
    version character varying(20),
    author character varying(100),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.documents OWNER TO topems;

--
-- Name: notifications; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    notification_type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    content text,
    recipient character varying(100) NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pm.notifications OWNER TO topems;

--
-- Name: project_approvals; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    approval_type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    applicant character varying(100) NOT NULL,
    approver character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.project_approvals OWNER TO topems;

--
-- Name: project_benefits; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    benefit_type character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    benefit_date timestamp with time zone NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.project_benefits OWNER TO topems;

--
-- Name: project_expenses; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    expense_type character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    expense_date timestamp with time zone NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approver character varying(100),
    approved_date timestamp with time zone,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.project_expenses OWNER TO topems;

--
-- Name: project_members; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id character varying(100) NOT NULL,
    user_name character varying(100) NOT NULL,
    role character varying(50) NOT NULL,
    join_date timestamp with time zone DEFAULT now() NOT NULL,
    leave_date timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pm.project_members OWNER TO topems;

--
-- Name: project_milestones; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    phase_id uuid,
    name character varying(100) NOT NULL,
    description text,
    due_date timestamp with time zone,
    completed_date timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.project_milestones OWNER TO topems;

--
-- Name: project_phases; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    progress integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.project_phases OWNER TO topems;

--
-- Name: project_resources; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_name character varying(100) NOT NULL,
    quantity numeric(10,2),
    unit character varying(20),
    cost numeric(15,2),
    status character varying(20) DEFAULT 'allocated'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.project_resources OWNER TO topems;

--
-- Name: project_type_configs; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.project_type_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_name character varying(50) NOT NULL,
    type_code character varying(20) NOT NULL,
    description text,
    default_phases jsonb,
    default_milestones jsonb,
    default_workflow uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.project_type_configs OWNER TO topems;

--
-- Name: projects; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    project_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    leader character varying(100),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    budget numeric(15,2),
    progress integer DEFAULT 0 NOT NULL,
    project_config jsonb,
    benefit_target jsonb,
    risk_level character varying(20),
    priority integer,
    tags jsonb,
    parent_id uuid,
    workspace_id uuid,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.projects OWNER TO topems;

--
-- Name: quality_checks; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.quality_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    check_type character varying(50) NOT NULL,
    check_name character varying(200) NOT NULL,
    check_date timestamp with time zone NOT NULL,
    checker character varying(100) NOT NULL,
    result character varying(20) NOT NULL,
    issues text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.quality_checks OWNER TO topems;

--
-- Name: risks; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    risk_type character varying(50) NOT NULL,
    risk_name character varying(200) NOT NULL,
    description text,
    probability character varying(20) NOT NULL,
    impact character varying(20) NOT NULL,
    risk_level character varying(20) NOT NULL,
    mitigation_plan text,
    contingency_plan text,
    owner character varying(100),
    status character varying(20) DEFAULT 'identified'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.risks OWNER TO topems;

--
-- Name: settlements; Type: TABLE; Schema: pm; Owner: topems
--

CREATE TABLE pm.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    settlement_no character varying(50) NOT NULL,
    settlement_type character varying(50) NOT NULL,
    settlement_date timestamp with time zone NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE pm.settlements OWNER TO topems;

--
-- Name: portal_access_logs; Type: TABLE; Schema: portal; Owner: topems
--

CREATE TABLE portal.portal_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100),
    session_id character varying(100),
    access_time timestamp with time zone DEFAULT now() NOT NULL,
    ip_address character varying(50),
    user_agent character varying(200),
    access_path character varying(200),
    access_method character varying(10),
    response_status integer,
    response_time integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE portal.portal_access_logs OWNER TO topems;

--
-- Name: portal_announcements; Type: TABLE; Schema: portal; Owner: topems
--

CREATE TABLE portal.portal_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    announcement_type character varying(50) DEFAULT 'general'::character varying NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    publish_date timestamp with time zone NOT NULL,
    expire_date timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    author character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE portal.portal_announcements OWNER TO topems;

--
-- Name: portal_configs; Type: TABLE; Schema: portal; Owner: topems
--

CREATE TABLE portal.portal_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text,
    config_type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE portal.portal_configs OWNER TO topems;

--
-- Name: portal_layouts; Type: TABLE; Schema: portal; Owner: topems
--

CREATE TABLE portal.portal_layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    layout_name character varying(100) NOT NULL,
    layout_type character varying(50) NOT NULL,
    layout_config jsonb,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE portal.portal_layouts OWNER TO topems;

--
-- Name: portal_menus; Type: TABLE; Schema: portal; Owner: topems
--

CREATE TABLE portal.portal_menus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_code character varying(50) NOT NULL,
    menu_name character varying(100) NOT NULL,
    menu_type character varying(20) DEFAULT 'link'::character varying NOT NULL,
    parent_id uuid,
    path character varying(200),
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    permissions jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE portal.portal_menus OWNER TO topems;

--
-- Name: user_preferences; Type: TABLE; Schema: portal; Owner: topems
--

CREATE TABLE portal.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    preference_key character varying(100) NOT NULL,
    preference_value jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE portal.user_preferences OWNER TO topems;

--
-- Name: audio_recordings; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.audio_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    location_lat double precision NOT NULL,
    location_lng double precision NOT NULL,
    address character varying(500),
    duration_seconds integer,
    file_url character varying(500),
    recorded_by character varying(255) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audio_recordings OWNER TO topems;

--
-- Name: business_locations; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.business_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_type character varying(100) NOT NULL,
    business_name character varying(255) NOT NULL,
    business_code character varying(100),
    category character varying(100),
    "position" jsonb NOT NULL,
    address text,
    contact_person character varying(255),
    contact_phone character varying(50),
    capacity integer,
    current_usage integer,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    properties jsonb,
    description text,
    external_id uuid,
    external_type character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.business_locations OWNER TO topems;

--
-- Name: device_locations; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.device_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    map_id uuid NOT NULL,
    device_name character varying(255) NOT NULL,
    device_code character varying(100) NOT NULL,
    device_type character varying(100),
    "position" jsonb NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    description text,
    last_inspected timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.device_locations OWNER TO topems;

--
-- Name: devices; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.devices (
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.devices OWNER TO topems;

--
-- Name: factory_maps; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.factory_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    map_type character varying(50) DEFAULT 'factory'::character varying NOT NULL,
    file_url text NOT NULL,
    bounds jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.factory_maps OWNER TO topems;

--
-- Name: location_photos; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.location_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    map_id uuid NOT NULL,
    "position" jsonb NOT NULL,
    photo_url text NOT NULL,
    description text,
    taken_by character varying(255) NOT NULL,
    taken_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.location_photos OWNER TO topems;

--
-- Name: map_markers; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.map_markers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marker_type character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    marker_style character varying(100),
    "position" jsonb NOT NULL,
    icon_svg text,
    color character varying(50),
    size integer DEFAULT 24,
    popup_content text,
    click_action character varying(100),
    action_data jsonb,
    visible boolean DEFAULT true,
    z_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.map_markers OWNER TO topems;

--
-- Name: mobile_scan_records; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.mobile_scan_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scan_type character varying(100) NOT NULL,
    scan_data text NOT NULL,
    result_data jsonb,
    location_lat double precision,
    location_lng double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mobile_scan_records OWNER TO topems;

--
-- Name: mobile_tasks; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.mobile_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    task_type character varying(100) NOT NULL,
    priority character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    assignee character varying(255),
    location_lat double precision,
    location_lng double precision,
    due_date date,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mobile_tasks OWNER TO topems;

--
-- Name: mobile_users; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.mobile_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nickname character varying(255),
    phone character varying(50),
    email character varying(255),
    avatar_url character varying(500),
    department character varying(255),
    "position" character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mobile_users OWNER TO topems;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    notification_type character varying(100) DEFAULT 'info'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO topems;

--
-- Name: offline_sync_records; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.offline_sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sync_type character varying(100) NOT NULL,
    sync_data jsonb NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    synced_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


ALTER TABLE public.offline_sync_records OWNER TO topems;

--
-- Name: patrol_records; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.patrol_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    location_lat double precision NOT NULL,
    location_lng double precision NOT NULL,
    address character varying(500),
    patrol_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    checked_by character varying(255) NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patrol_records OWNER TO topems;

--
-- Name: payment_schedules; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.payment_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    contract_id uuid,
    payment_number character varying(100) NOT NULL,
    payment_stage character varying(100),
    scheduled_amount numeric(18,2) NOT NULL,
    scheduled_date timestamp with time zone,
    actual_amount numeric(18,2),
    actual_date timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.payment_schedules OWNER TO topems;

--
-- Name: photo_evidences; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.photo_evidences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    location_lat double precision NOT NULL,
    location_lng double precision NOT NULL,
    address character varying(500),
    file_url character varying(500),
    recorded_by character varying(255) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.photo_evidences OWNER TO topems;

--
-- Name: pipelines; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.pipelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    map_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    pipeline_type character varying(100),
    path jsonb NOT NULL,
    properties jsonb,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pipelines OWNER TO topems;

--
-- Name: project_budget_items; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.project_budget_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    budget_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    item_category character varying(100),
    budget_amount numeric(18,2) NOT NULL,
    used_amount numeric(18,2) DEFAULT 0 NOT NULL,
    remaining_amount numeric(18,2) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.project_budget_items OWNER TO topems;

--
-- Name: project_budgets; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.project_budgets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid,
    budget_type character varying(100),
    fiscal_year character varying(20) NOT NULL,
    total_budget numeric(18,2) NOT NULL,
    used_amount numeric(18,2) DEFAULT 0 NOT NULL,
    remaining_amount numeric(18,2) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.project_budgets OWNER TO topems;

--
-- Name: project_contracts; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.project_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    contract_number character varying(100) NOT NULL,
    project_name character varying(255) NOT NULL,
    customer_name character varying(255),
    contract_amount numeric(18,2) NOT NULL,
    signed_date timestamp with time zone,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    contract_type character varying(100),
    payment_terms text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.project_contracts OWNER TO topems;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token character varying(512) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO topems;

--
-- Name: scan_records; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.scan_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barcode character varying(255) NOT NULL,
    location_lat double precision NOT NULL,
    location_lng double precision NOT NULL,
    item_type character varying(100) NOT NULL,
    quantity double precision,
    operator character varying(255) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.scan_records OWNER TO topems;

--
-- Name: shortcuts; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.shortcuts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(100) NOT NULL,
    action_type character varying(100) NOT NULL,
    action_params jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shortcuts OWNER TO topems;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    language character varying(50) DEFAULT 'zh-CN'::character varying NOT NULL,
    theme character varying(50) DEFAULT 'light'::character varying NOT NULL,
    notification_enabled boolean DEFAULT true NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    auto_sync boolean DEFAULT true NOT NULL,
    sync_interval integer DEFAULT 300 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_settings OWNER TO topems;

--
-- Name: video_recordings; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.video_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    start_location_lat double precision NOT NULL,
    start_location_lng double precision NOT NULL,
    location_track jsonb,
    duration_seconds integer,
    file_url character varying(500),
    thumbnail_url character varying(500),
    recorded_by character varying(255) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.video_recordings OWNER TO topems;

--
-- Name: voucher_items; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.voucher_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    voucher_id uuid NOT NULL,
    line_number integer NOT NULL,
    subject_code character varying(50) NOT NULL,
    subject_name character varying(200),
    summary text,
    debit_amount numeric(18,4) DEFAULT 0 NOT NULL,
    credit_amount numeric(18,4) DEFAULT 0 NOT NULL,
    quantity numeric(15,4),
    unit character varying(50),
    price numeric(15,4),
    department_id uuid,
    project_id uuid,
    contract_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.voucher_items OWNER TO topems;

--
-- Name: warehouse_locations; Type: TABLE; Schema: public; Owner: topems
--

CREATE TABLE public.warehouse_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    map_id uuid NOT NULL,
    warehouse_name character varying(255) NOT NULL,
    zone character varying(100),
    "position" jsonb NOT NULL,
    capacity integer,
    usage_rate double precision,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.warehouse_locations OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE qms.audit_logs OWNER TO topems;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON TABLE qms.audit_logs IS '审计日志表';


--
-- Name: corrective_actions; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.corrective_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    action_number character varying(100),
    issue_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    action_type character varying(50),
    category character varying(50),
    root_cause_analysis text,
    immediate_action text,
    long_term_action text,
    preventive_action text,
    assigned_to character varying(255) NOT NULL,
    assigned_to_id uuid,
    department character varying(100),
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    implementation_date date,
    implementation_details text,
    resources_required text,
    estimated_cost numeric(15,2),
    actual_cost numeric(15,2),
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0,
    effectiveness character varying(20),
    verification_method character varying(100),
    verification_criteria text,
    verification_result character varying(20),
    verified_by character varying(255),
    verified_by_id uuid,
    verification_date date,
    verification_notes text,
    effectiveness_review_date date,
    effectiveness_result character varying(20),
    recurrence_check_date date,
    recurrence_found boolean DEFAULT false,
    follow_up_actions text,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE qms.corrective_actions OWNER TO topems;

--
-- Name: TABLE corrective_actions; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON TABLE qms.corrective_actions IS '纠正措施表';


--
-- Name: COLUMN corrective_actions.action_type; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.corrective_actions.action_type IS '措施类型：corrective, preventive, improvement等';


--
-- Name: COLUMN corrective_actions.status; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.corrective_actions.status IS '状态：planned, in_progress, implemented, verified, closed等';


--
-- Name: COLUMN corrective_actions.effectiveness; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.corrective_actions.effectiveness IS '有效性：effective, partially_effective, ineffective等';


--
-- Name: dashboard_metrics; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.dashboard_metrics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    metric_type character varying(50) NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(15,2) NOT NULL,
    metric_unit character varying(20),
    period_type character varying(20) NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    comparison_value numeric(15,2),
    comparison_period_start date,
    comparison_period_end date,
    trend character varying(20),
    target_value numeric(15,2),
    achievement_percentage numeric(5,2),
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE qms.dashboard_metrics OWNER TO topems;

--
-- Name: TABLE dashboard_metrics; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON TABLE qms.dashboard_metrics IS '仪表盘数据表';


--
-- Name: COLUMN dashboard_metrics.metric_type; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.dashboard_metrics.metric_type IS '指标类型：inspection, issue, compliance, improvement等';


--
-- Name: COLUMN dashboard_metrics.period_type; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.dashboard_metrics.period_type IS '周期类型：daily, weekly, monthly, quarterly, yearly等';


--
-- Name: inspection_items; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.inspection_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    inspection_id uuid NOT NULL,
    item_number integer,
    item_name character varying(255) NOT NULL,
    item_category character varying(50),
    specification text,
    requirement text,
    test_method character varying(100),
    expected_value character varying(255),
    actual_value character varying(255),
    tolerance character varying(100),
    unit character varying(50),
    is_critical boolean DEFAULT false,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    result character varying(20),
    deviation text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE qms.inspection_items OWNER TO topems;

--
-- Name: TABLE inspection_items; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON TABLE qms.inspection_items IS '检验项明细表';


--
-- Name: quality_inspections; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.quality_inspections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    standard_id uuid,
    inspection_number character varying(100),
    title character varying(255) NOT NULL,
    description text,
    inspection_type character varying(50) NOT NULL,
    inspection_method character varying(50),
    inspection_category character varying(50),
    object_type character varying(50),
    object_id uuid,
    object_name character varying(255),
    object_batch character varying(100),
    inspector character varying(255) NOT NULL,
    inspector_id uuid,
    department character varying(100),
    location character varying(255),
    planned_date date,
    actual_date date,
    start_time time without time zone,
    end_time time without time zone,
    duration_minutes integer,
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    result character varying(20),
    score numeric(5,2),
    pass_rate numeric(5,2),
    total_items integer,
    passed_items integer,
    failed_items integer,
    findings text,
    conclusion text,
    recommendations text,
    risk_level character varying(20),
    next_inspection_date date,
    follow_up_required boolean DEFAULT false,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE qms.quality_inspections OWNER TO topems;

--
-- Name: TABLE quality_inspections; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON TABLE qms.quality_inspections IS '质量检验表';


--
-- Name: COLUMN quality_inspections.inspection_type; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_inspections.inspection_type IS '检验类型：incoming, in_process, final, audit等';


--
-- Name: COLUMN quality_inspections.status; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_inspections.status IS '状态：planned, in_progress, completed, cancelled等';


--
-- Name: COLUMN quality_inspections.result; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_inspections.result IS '检验结果：passed, failed, conditional等';


--
-- Name: quality_issues; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.quality_issues (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    issue_number character varying(100),
    title character varying(255) NOT NULL,
    description text NOT NULL,
    issue_type character varying(50),
    category character varying(50),
    severity character varying(20) NOT NULL,
    priority character varying(20),
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    source character varying(50),
    source_reference character varying(255),
    related_inspection_id uuid,
    related_standard_id uuid,
    affected_object_type character varying(50),
    affected_object_id uuid,
    affected_object_name character varying(255),
    affected_batch character varying(100),
    affected_quantity integer,
    location character varying(255),
    discovered_date date,
    discovered_by character varying(255),
    reported_date date,
    reported_by character varying(255),
    assigned_to character varying(255),
    assigned_to_id uuid,
    assigned_date date,
    due_date date,
    resolved_date date,
    resolution_time_hours numeric(10,2),
    root_cause text,
    impact_analysis text,
    cost_estimate numeric(15,2),
    actual_cost numeric(15,2),
    customer_impacted boolean DEFAULT false,
    customer_name character varying(255),
    customer_notification_date date,
    regulatory_impact boolean DEFAULT false,
    regulatory_body character varying(255),
    risk_level character varying(20),
    recurrence_probability character varying(20),
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE qms.quality_issues OWNER TO topems;

--
-- Name: TABLE quality_issues; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON TABLE qms.quality_issues IS '质量问题表';


--
-- Name: COLUMN quality_issues.severity; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_issues.severity IS '严重程度：critical, major, minor, observation等';


--
-- Name: COLUMN quality_issues.status; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_issues.status IS '状态：open, investigating, resolved, closed等';


--
-- Name: COLUMN quality_issues.source; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_issues.source IS '问题来源：inspection, complaint, audit, internal等';


--
-- Name: quality_standards; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.quality_standards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(50),
    version character varying(50) DEFAULT '1.0'::character varying,
    standard_type character varying(50),
    authority character varying(255),
    effective_date date,
    expiry_date date,
    requirements text,
    criteria text,
    compliance_level character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_mandatory boolean DEFAULT false,
    review_frequency character varying(50),
    last_review_date date,
    next_review_date date,
    reviewer character varying(255),
    notes text,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE qms.quality_standards OWNER TO topems;

--
-- Name: TABLE quality_standards; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON TABLE qms.quality_standards IS '质量标准表';


--
-- Name: COLUMN quality_standards.standard_type; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_standards.standard_type IS '标准类型：international, national, industry, company等';


--
-- Name: COLUMN quality_standards.compliance_level; Type: COMMENT; Schema: qms; Owner: topems
--

COMMENT ON COLUMN qms.quality_standards.compliance_level IS '合规级别：mandatory, recommended, optional等';


--
-- Name: report_exports; Type: TABLE; Schema: report; Owner: topems
--

CREATE TABLE report.report_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    export_format character varying(20) NOT NULL,
    file_path character varying(500),
    file_size integer,
    exported_by character varying(100),
    exported_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE report.report_exports OWNER TO topems;

--
-- Name: report_templates; Type: TABLE; Schema: report; Owner: topems
--

CREATE TABLE report.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    report_type character varying(50) NOT NULL,
    columns jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE report.report_templates OWNER TO topems;

--
-- Name: report_type_configs; Type: TABLE; Schema: report; Owner: topems
--

CREATE TABLE report.report_type_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_code character varying(50) NOT NULL,
    type_name character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    default_columns jsonb,
    available_filters jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE report.report_type_configs OWNER TO topems;

--
-- Name: reports; Type: TABLE; Schema: report; Owner: topems
--

CREATE TABLE report.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config jsonb NOT NULL,
    template_id uuid,
    data jsonb,
    row_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE report.reports OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_id character varying(255),
    user_name character varying(255),
    request_details jsonb,
    response_details jsonb,
    status character varying(50) NOT NULL,
    error_message text,
    ip_address character varying(100),
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE rs.audit_logs OWNER TO topems;

--
-- Name: experiments; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.experiments (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    project_id uuid NOT NULL,
    formula_id uuid,
    experiment_type character varying(100) NOT NULL,
    phase character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'planned'::character varying NOT NULL,
    objective text NOT NULL,
    method text,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    conclusions text,
    experimenter character varying(255) NOT NULL,
    batch_number character varying(100),
    scale double precision,
    scale_unit character varying(50),
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE rs.experiments OWNER TO topems;

--
-- Name: formula_versions; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.formula_versions (
    id uuid NOT NULL,
    formula_id uuid NOT NULL,
    version character varying(50) NOT NULL,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    process_steps text,
    process_params jsonb,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    changes text,
    approval_status character varying(50),
    approved_by character varying(255),
    approved_at timestamp with time zone,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE rs.formula_versions OWNER TO topems;

--
-- Name: formulas; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.formulas (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    version character varying(50) DEFAULT '1.0'::character varying NOT NULL,
    category character varying(100),
    description text,
    project_id uuid,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    approval_status character varying(50),
    approved_by character varying(255),
    approved_at timestamp with time zone,
    effective_date timestamp with time zone,
    expiration_date timestamp with time zone,
    ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
    process_steps text,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    components jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE rs.formulas OWNER TO topems;

--
-- Name: project_members; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.project_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
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
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE rs.project_members OWNER TO topems;

--
-- Name: project_milestones; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.project_milestones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
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
    accepted_at timestamp with time zone
);


ALTER TABLE rs.project_milestones OWNER TO topems;

--
-- Name: project_phases; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.project_phases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    phase_number integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    planned_duration_days integer,
    actual_duration_days integer,
    status character varying(50) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
    progress integer DEFAULT 0,
    predecessor_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    weight integer DEFAULT 1.0
);


ALTER TABLE rs.project_phases OWNER TO topems;

--
-- Name: projects; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.projects (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    project_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    leader character varying(255) NOT NULL,
    team_members jsonb,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    budget double precision,
    progress integer DEFAULT 0 NOT NULL,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_config jsonb DEFAULT '{}'::jsonb,
    benefit_target jsonb DEFAULT '{}'::jsonb,
    risk_level character varying(50) DEFAULT 'low'::character varying,
    priority integer DEFAULT 2,
    tags jsonb DEFAULT '[]'::jsonb,
    parent_id uuid,
    workspace_id uuid
);


ALTER TABLE rs.projects OWNER TO topems;

--
-- Name: projects; Type: TABLE; Schema: rs_test; Owner: topems
--

CREATE TABLE rs_test.projects (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    project_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    leader character varying(255) NOT NULL,
    team_members jsonb,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    budget double precision,
    progress integer DEFAULT 0 NOT NULL,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_config jsonb DEFAULT '{}'::jsonb,
    benefit_target jsonb DEFAULT '{}'::jsonb,
    risk_level character varying(50) DEFAULT 'low'::character varying,
    priority integer DEFAULT 2,
    tags jsonb DEFAULT '[]'::jsonb,
    parent_id uuid,
    workspace_id uuid
);


ALTER TABLE rs_test.projects OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: scm; Owner: topems
--

CREATE TABLE scm.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address character varying(50),
    user_agent character varying(200),
    organization_id uuid
);


ALTER TABLE scm.audit_logs OWNER TO topems;

--
-- Name: purchase_items; Type: TABLE; Schema: scm; Owner: topems
--

CREATE TABLE scm.purchase_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    item_no character varying(50) NOT NULL,
    item_name character varying(200) NOT NULL,
    specification character varying(200),
    unit character varying(20),
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    received_quantity numeric(10,2) DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE scm.purchase_items OWNER TO topems;

--
-- Name: purchase_orders; Type: TABLE; Schema: scm; Owner: topems
--

CREATE TABLE scm.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_no character varying(50) NOT NULL,
    supplier_id uuid NOT NULL,
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    expected_date timestamp with time zone,
    actual_date timestamp with time zone,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE scm.purchase_orders OWNER TO topems;

--
-- Name: supplier_evaluations; Type: TABLE; Schema: scm; Owner: topems
--

CREATE TABLE scm.supplier_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    evaluation_no character varying(50) NOT NULL,
    evaluation_date timestamp with time zone NOT NULL,
    evaluator character varying(100),
    overall_score numeric(5,2),
    quality_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    price_score numeric(5,2),
    comments text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE scm.supplier_evaluations OWNER TO topems;

--
-- Name: suppliers; Type: TABLE; Schema: scm; Owner: topems
--

CREATE TABLE scm.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_no character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    legal_name character varying(200),
    category character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tax_id character varying(50),
    address character varying(500),
    contact_person character varying(100),
    phone character varying(20),
    email character varying(100),
    website character varying(200),
    credit_rating character varying(20),
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    bank_name character varying(100),
    bank_account character varying(50),
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE scm.suppliers OWNER TO topems;

--
-- Name: companies; Type: TABLE; Schema: shared; Owner: topems
--

CREATE TABLE shared.companies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    short_name character varying(50),
    tax_id character varying(50),
    registered_address character varying(500),
    business_scope text,
    industry character varying(100),
    scale character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.companies OWNER TO topems;

--
-- Name: departments; Type: TABLE; Schema: shared; Owner: topems
--

CREATE TABLE shared.departments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    parent_id uuid,
    name character varying(100) NOT NULL,
    code character varying(50),
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.departments OWNER TO topems;

--
-- Name: employees; Type: TABLE; Schema: shared; Owner: topems
--

CREATE TABLE shared.employees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    department_id uuid,
    position_id uuid,
    employee_no character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    gender character varying(10),
    email character varying(200),
    phone character varying(50),
    hire_date date,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.employees OWNER TO topems;

--
-- Name: id_records; Type: TABLE; Schema: shared; Owner: topems
--

CREATE TABLE shared.id_records (
    id character varying(50) NOT NULL,
    id_type character varying(50) NOT NULL,
    entity_type character varying(100),
    entity_id uuid,
    company_id uuid,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb
);


ALTER TABLE shared.id_records OWNER TO topems;

--
-- Name: positions; Type: TABLE; Schema: shared; Owner: topems
--

CREATE TABLE shared.positions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    level character varying(20),
    department_id uuid,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.positions OWNER TO topems;

--
-- Name: system_params; Type: TABLE; Schema: shared; Owner: topems
--

CREATE TABLE shared.system_params (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    param_key character varying(100) NOT NULL,
    param_value text,
    param_type character varying(20) DEFAULT 'string'::character varying,
    description text,
    module character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.system_params OWNER TO topems;

--
-- Name: user_employee_map; Type: TABLE; Schema: shared; Owner: topems
--

CREATE TABLE shared.user_employee_map (
    user_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE shared.user_employee_map OWNER TO topems;

--
-- Name: audit_logs; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address character varying(50),
    user_agent character varying(200),
    organization_id uuid
);


ALTER TABLE srm.audit_logs OWNER TO topems;

--
-- Name: contract_terms; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.contract_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    term_type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    content text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE srm.contract_terms OWNER TO topems;

--
-- Name: purchase_orders; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_no character varying(50) NOT NULL,
    supplier_id uuid NOT NULL,
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    expected_date timestamp with time zone,
    actual_date timestamp with time zone,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE srm.purchase_orders OWNER TO topems;

--
-- Name: supplier_categories; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.supplier_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_no character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id uuid,
    level integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE srm.supplier_categories OWNER TO topems;

--
-- Name: supplier_contracts; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.supplier_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_no character varying(50) NOT NULL,
    supplier_id uuid NOT NULL,
    supplier_name character varying(200),
    title character varying(200) NOT NULL,
    contract_type character varying(50) NOT NULL,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    sign_date timestamp with time zone,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE srm.supplier_contracts OWNER TO topems;

--
-- Name: supplier_evaluations; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.supplier_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    evaluation_no character varying(50) NOT NULL,
    evaluation_date timestamp with time zone NOT NULL,
    evaluator character varying(100),
    overall_score numeric(5,2),
    quality_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    price_score numeric(5,2),
    comments text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE srm.supplier_evaluations OWNER TO topems;

--
-- Name: supplier_products; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.supplier_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_no character varying(50) NOT NULL,
    supplier_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    category character varying(50),
    unit character varying(20),
    unit_price numeric(10,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    min_order_qty integer,
    lead_time_days integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    specifications text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE srm.supplier_products OWNER TO topems;

--
-- Name: suppliers; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_no character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    legal_name character varying(200),
    category character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tax_id character varying(50),
    address character varying(500),
    contact_person character varying(100),
    phone character varying(20),
    email character varying(100),
    website character varying(200),
    credit_rating character varying(20),
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE srm.suppliers OWNER TO topems;

--
-- Name: backends; Type: TABLE; Schema: storage; Owner: topems
--

CREATE TABLE storage.backends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    backend_type character varying(50) NOT NULL,
    is_active boolean DEFAULT false,
    config jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.backends OWNER TO topems;

--
-- Name: TABLE backends; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON TABLE storage.backends IS '存储后端配置表';


--
-- Name: file_permissions; Type: TABLE; Schema: storage; Owner: topems
--

CREATE TABLE storage.file_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    principal_type character varying(20) NOT NULL,
    principal_id uuid NOT NULL,
    permission character varying(50) NOT NULL,
    granted_by uuid,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.file_permissions OWNER TO topems;

--
-- Name: TABLE file_permissions; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON TABLE storage.file_permissions IS '文件权限控制表';


--
-- Name: files; Type: TABLE; Schema: storage; Owner: topems
--

CREATE TABLE storage.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    owner_department_id uuid,
    filename character varying(500) NOT NULL,
    storage_path character varying(1000) NOT NULL,
    file_size bigint NOT NULL,
    content_type character varying(100) NOT NULL,
    file_type character varying(50) DEFAULT 'document'::character varying NOT NULL,
    category character varying(100),
    version integer DEFAULT 1,
    parent_id uuid,
    vector_status character varying(20) DEFAULT 'pending'::character varying,
    vector_document_id uuid,
    is_shared boolean DEFAULT false,
    visibility character varying(20) DEFAULT 'private'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE storage.files OWNER TO topems;

--
-- Name: TABLE files; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON TABLE storage.files IS '统一文件元数据表';


--
-- Name: COLUMN files.owner_id; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON COLUMN storage.files.owner_id IS '文件所有者用户ID';


--
-- Name: COLUMN files.owner_department_id; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON COLUMN storage.files.owner_department_id IS '文件所有者部门ID';


--
-- Name: COLUMN files.storage_path; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON COLUMN storage.files.storage_path IS '存储路径，相对于存储后端根目录';


--
-- Name: COLUMN files.file_type; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON COLUMN storage.files.file_type IS '文件类型: document/attachment/image/video/archive';


--
-- Name: COLUMN files.vector_status; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON COLUMN storage.files.vector_status IS '向量化状态: pending/processing/completed/failed';


--
-- Name: COLUMN files.visibility; Type: COMMENT; Schema: storage; Owner: topems
--

COMMENT ON COLUMN storage.files.visibility IS '可见性: private/department/public';


--
-- Name: audit_logs; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE wms.audit_logs OWNER TO topems;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.audit_logs IS '审计日志表';


--
-- Name: inbound_order_items; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.inbound_order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    line_number integer,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    specification text,
    batch_number character varying(100),
    lot_number character varying(100),
    serial_number character varying(100),
    expected_quantity numeric(15,2) NOT NULL,
    received_quantity numeric(15,2) DEFAULT 0,
    rejected_quantity numeric(15,2) DEFAULT 0,
    unit character varying(20) NOT NULL,
    location_id uuid,
    location_code character varying(100),
    location_name character varying(255),
    quality_status character varying(20) DEFAULT 'pending'::character varying,
    production_date date,
    expiry_date date,
    supplier_batch character varying(100),
    unit_price numeric(15,2),
    total_value numeric(15,2),
    weight numeric(15,2),
    volume numeric(15,2),
    inspection_required boolean DEFAULT true,
    inspection_status character varying(20),
    inspection_result character varying(20),
    inspector character varying(255),
    inspection_date date,
    inspection_notes text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.inbound_order_items OWNER TO topems;

--
-- Name: TABLE inbound_order_items; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.inbound_order_items IS '入库订单明细表';


--
-- Name: inbound_orders; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.inbound_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    order_number character varying(100) NOT NULL,
    order_type character varying(50) NOT NULL,
    reference_number character varying(100),
    reference_type character varying(50),
    warehouse_id uuid NOT NULL,
    warehouse_name character varying(255),
    supplier_id uuid,
    supplier_name character varying(255),
    supplier_code character varying(100),
    purchase_order_id uuid,
    purchase_order_number character varying(100),
    production_order_id uuid,
    production_order_number character varying(100),
    customer_id uuid,
    customer_name character varying(255),
    customer_order_number character varying(100),
    expected_arrival_date date,
    actual_arrival_date date,
    arrival_time time without time zone,
    received_date date,
    received_time time without time zone,
    carrier character varying(255),
    carrier_code character varying(100),
    vehicle_number character varying(100),
    driver_name character varying(255),
    driver_phone character varying(50),
    total_items integer,
    total_quantity numeric(15,2),
    received_quantity numeric(15,2),
    rejected_quantity numeric(15,2),
    total_weight numeric(15,2),
    total_volume numeric(15,2),
    total_value numeric(15,2),
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'created'::character varying NOT NULL,
    receiver character varying(255),
    receiver_id uuid,
    receiving_team character varying(100),
    inspection_required boolean DEFAULT true,
    inspection_status character varying(20),
    inspection_result character varying(20),
    inspector character varying(255),
    inspection_date date,
    quality_check_notes text,
    receiving_notes text,
    special_instructions text,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.inbound_orders OWNER TO topems;

--
-- Name: TABLE inbound_orders; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.inbound_orders IS '入库订单表';


--
-- Name: COLUMN inbound_orders.order_type; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.inbound_orders.order_type IS '订单类型：purchase, production_return, customer_return, transfer等';


--
-- Name: COLUMN inbound_orders.status; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.inbound_orders.status IS '状态：created, confirmed, receiving, received, completed, cancelled等';


--
-- Name: inventory; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    material_category character varying(50),
    specification text,
    batch_number character varying(100),
    lot_number character varying(100),
    serial_number character varying(100),
    quantity numeric(15,2) NOT NULL,
    unit character varying(20) NOT NULL,
    available_quantity numeric(15,2) NOT NULL,
    reserved_quantity numeric(15,2) DEFAULT 0,
    in_transit_quantity numeric(15,2) DEFAULT 0,
    quality_status character varying(20) DEFAULT 'qualified'::character varying NOT NULL,
    production_date date,
    expiry_date date,
    shelf_life_days integer,
    days_to_expiry integer,
    supplier_id uuid,
    supplier_name character varying(255),
    supplier_code character varying(100),
    purchase_order_number character varying(100),
    purchase_price numeric(15,2),
    total_value numeric(15,2),
    cost_method character varying(20),
    standard_cost numeric(15,2),
    average_cost numeric(15,2),
    last_movement_date timestamp with time zone,
    last_movement_type character varying(50),
    movement_count integer DEFAULT 0,
    min_quantity numeric(15,2),
    max_quantity numeric(15,2),
    reorder_point numeric(15,2),
    reorder_quantity numeric(15,2),
    safety_stock numeric(15,2),
    is_below_min boolean DEFAULT false,
    is_above_max boolean DEFAULT false,
    needs_reorder boolean DEFAULT false,
    weight numeric(15,2),
    volume numeric(15,2),
    special_attributes jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.inventory OWNER TO topems;

--
-- Name: TABLE inventory; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.inventory IS '库存信息表';


--
-- Name: COLUMN inventory.quality_status; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.inventory.quality_status IS '质量状态：qualified, quarantined, rejected, pending等';


--
-- Name: COLUMN inventory.cost_method; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.inventory.cost_method IS '成本方法：standard, average, fifo, lifo等';


--
-- Name: locations; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_code character varying(100) NOT NULL,
    location_name character varying(255) NOT NULL,
    location_type character varying(50),
    zone character varying(50),
    aisle character varying(50),
    shelf character varying(50),
    level character varying(50),
    "position" character varying(50),
    barcode character varying(100),
    description text,
    capacity numeric(15,2),
    current_quantity numeric(15,2) DEFAULT 0,
    max_weight numeric(15,2),
    current_weight numeric(15,2) DEFAULT 0,
    dimensions jsonb,
    is_active boolean DEFAULT true,
    is_blocked boolean DEFAULT false,
    block_reason text,
    temperature_requirement character varying(50),
    humidity_requirement character varying(50),
    special_requirements text,
    priority integer DEFAULT 0,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    last_inspection_date date,
    next_inspection_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.locations OWNER TO topems;

--
-- Name: TABLE locations; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.locations IS '库位信息表';


--
-- Name: COLUMN locations.location_type; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.locations.location_type IS '库位类型：storage, picking, receiving, shipping等';


--
-- Name: COLUMN locations.status; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.locations.status IS '状态：available, occupied, blocked, maintenance等';


--
-- Name: outbound_order_items; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.outbound_order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    line_number integer,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    specification text,
    batch_number character varying(100),
    lot_number character varying(100),
    serial_number character varying(100),
    requested_quantity numeric(15,2) NOT NULL,
    reserved_quantity numeric(15,2) DEFAULT 0,
    picked_quantity numeric(15,2) DEFAULT 0,
    packed_quantity numeric(15,2) DEFAULT 0,
    shipped_quantity numeric(15,2) DEFAULT 0,
    unit character varying(20) NOT NULL,
    source_location_id uuid,
    source_location_code character varying(100),
    source_location_name character varying(255),
    destination_location_id uuid,
    destination_location_code character varying(100),
    destination_location_name character varying(255),
    unit_price numeric(15,2),
    total_value numeric(15,2),
    weight numeric(15,2),
    volume numeric(15,2),
    picking_status character varying(20),
    packing_status character varying(20),
    picker character varying(255),
    picking_time timestamp with time zone,
    packer character varying(255),
    packing_time timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.outbound_order_items OWNER TO topems;

--
-- Name: TABLE outbound_order_items; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.outbound_order_items IS '出库订单明细表';


--
-- Name: outbound_orders; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.outbound_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    order_number character varying(100) NOT NULL,
    order_type character varying(50) NOT NULL,
    reference_number character varying(100),
    reference_type character varying(50),
    warehouse_id uuid NOT NULL,
    warehouse_name character varying(255),
    customer_id uuid,
    customer_name character varying(255),
    customer_code character varying(100),
    sales_order_id uuid,
    sales_order_number character varying(100),
    production_order_id uuid,
    production_order_number character varying(100),
    transfer_order_id uuid,
    transfer_order_number character varying(100),
    destination_warehouse_id uuid,
    destination_warehouse_name character varying(255),
    destination_address text,
    expected_ship_date date,
    actual_ship_date date,
    ship_time time without time zone,
    delivery_date date,
    delivery_time time without time zone,
    carrier character varying(255),
    carrier_code character varying(100),
    carrier_service character varying(100),
    vehicle_number character varying(100),
    driver_name character varying(255),
    driver_phone character varying(50),
    tracking_number character varying(100),
    total_items integer,
    total_quantity numeric(15,2),
    shipped_quantity numeric(15,2),
    total_weight numeric(15,2),
    total_volume numeric(15,2),
    total_value numeric(15,2),
    shipping_cost numeric(15,2),
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'created'::character varying NOT NULL,
    picker character varying(255),
    picker_id uuid,
    picking_team character varying(100),
    packer character varying(255),
    packer_id uuid,
    packing_team character varying(100),
    shipper character varying(255),
    shipper_id uuid,
    shipping_team character varying(100),
    picking_method character varying(50),
    packing_method character varying(50),
    shipping_method character varying(50),
    picking_status character varying(20),
    packing_status character varying(20),
    shipping_status character varying(20),
    picking_start_time timestamp with time zone,
    picking_end_time timestamp with time zone,
    packing_start_time timestamp with time zone,
    packing_end_time timestamp with time zone,
    special_instructions text,
    shipping_notes text,
    delivery_notes text,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.outbound_orders OWNER TO topems;

--
-- Name: TABLE outbound_orders; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.outbound_orders IS '出库订单表';


--
-- Name: COLUMN outbound_orders.order_type; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.outbound_orders.order_type IS '订单类型：sales, production, transfer, scrap等';


--
-- Name: COLUMN outbound_orders.status; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.outbound_orders.status IS '状态：created, confirmed, picking, picked, packing, packed, shipping, shipped, delivered, cancelled等';


--
-- Name: stock_take_items; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.stock_take_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    stock_take_id uuid NOT NULL,
    line_number integer,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    specification text,
    batch_number character varying(100),
    lot_number character varying(100),
    serial_number character varying(100),
    location_id uuid,
    location_code character varying(100),
    location_name character varying(255),
    system_quantity numeric(15,2) NOT NULL,
    counted_quantity numeric(15,2),
    discrepancy_quantity numeric(15,2) DEFAULT 0,
    discrepancy_type character varying(20),
    unit character varying(20) NOT NULL,
    unit_price numeric(15,2),
    discrepancy_value numeric(15,2),
    quality_status character varying(20),
    counter character varying(255),
    counter_id uuid,
    counting_time timestamp with time zone,
    recount_required boolean DEFAULT false,
    recount_quantity numeric(15,2),
    recount_by character varying(255),
    recount_time timestamp with time zone,
    discrepancy_reason character varying(100),
    discrepancy_notes text,
    adjustment_required boolean DEFAULT false,
    adjustment_quantity numeric(15,2),
    adjustment_status character varying(20),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.stock_take_items OWNER TO topems;

--
-- Name: TABLE stock_take_items; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.stock_take_items IS '盘点明细表';


--
-- Name: COLUMN stock_take_items.discrepancy_type; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.stock_take_items.discrepancy_type IS '差异类型：over, under, none等';


--
-- Name: stock_takes; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.stock_takes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    stock_take_number character varying(100) NOT NULL,
    stock_take_type character varying(50) NOT NULL,
    warehouse_id uuid NOT NULL,
    warehouse_name character varying(255),
    location_id uuid,
    location_code character varying(100),
    location_name character varying(255),
    material_code character varying(100),
    material_name character varying(255),
    planned_date date,
    actual_date date,
    start_time time without time zone,
    end_time time without time zone,
    planned_by character varying(255),
    planned_by_id uuid,
    executed_by character varying(255),
    executed_by_id uuid,
    team character varying(100),
    total_items integer,
    counted_items integer DEFAULT 0,
    discrepancy_items integer DEFAULT 0,
    total_quantity numeric(15,2),
    counted_quantity numeric(15,2),
    discrepancy_quantity numeric(15,2),
    discrepancy_value numeric(15,2),
    accuracy_rate numeric(5,2),
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    approval_status character varying(20),
    approved_by character varying(255),
    approved_by_id uuid,
    approval_date date,
    approval_notes text,
    adjustment_status character varying(20),
    adjusted_by character varying(255),
    adjusted_by_id uuid,
    adjustment_date date,
    adjustment_notes text,
    reason text,
    findings text,
    recommendations text,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.stock_takes OWNER TO topems;

--
-- Name: TABLE stock_takes; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.stock_takes IS '盘点表';


--
-- Name: COLUMN stock_takes.stock_take_type; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.stock_takes.stock_take_type IS '盘点类型：full, partial, cycle, spot_check等';


--
-- Name: COLUMN stock_takes.status; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.stock_takes.status IS '状态：planned, in_progress, completed, cancelled等';


--
-- Name: transfer_items; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.transfer_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    transfer_id uuid NOT NULL,
    line_number integer,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    material_type character varying(50),
    specification text,
    batch_number character varying(100),
    lot_number character varying(100),
    serial_number character varying(100),
    requested_quantity numeric(15,2) NOT NULL,
    transferred_quantity numeric(15,2) DEFAULT 0,
    received_quantity numeric(15,2) DEFAULT 0,
    unit character varying(20) NOT NULL,
    source_location_id uuid,
    source_location_code character varying(100),
    source_location_name character varying(255),
    destination_location_id uuid,
    destination_location_code character varying(100),
    destination_location_name character varying(255),
    unit_price numeric(15,2),
    total_value numeric(15,2),
    weight numeric(15,2),
    volume numeric(15,2),
    quality_status character varying(20),
    transfer_status character varying(20),
    receive_status character varying(20),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.transfer_items OWNER TO topems;

--
-- Name: TABLE transfer_items; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.transfer_items IS '转移明细表';


--
-- Name: transfers; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.transfers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    transfer_number character varying(100) NOT NULL,
    transfer_type character varying(50) NOT NULL,
    source_warehouse_id uuid NOT NULL,
    source_warehouse_name character varying(255),
    source_location_id uuid,
    source_location_code character varying(100),
    source_location_name character varying(255),
    destination_warehouse_id uuid NOT NULL,
    destination_warehouse_name character varying(255),
    destination_location_id uuid,
    destination_location_code character varying(100),
    destination_location_name character varying(255),
    reference_number character varying(100),
    reference_type character varying(50),
    planned_date date,
    actual_date date,
    start_time time without time zone,
    end_time time without time zone,
    total_items integer,
    total_quantity numeric(15,2),
    transferred_quantity numeric(15,2),
    total_weight numeric(15,2),
    total_volume numeric(15,2),
    total_value numeric(15,2),
    priority character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'created'::character varying NOT NULL,
    requester character varying(255),
    requester_id uuid,
    request_department character varying(100),
    request_reason text,
    approver character varying(255),
    approver_id uuid,
    approval_status character varying(20),
    approval_date date,
    approval_notes text,
    transfer_by character varying(255),
    transfer_by_id uuid,
    transfer_team character varying(100),
    transfer_start_time timestamp with time zone,
    transfer_end_time timestamp with time zone,
    receive_by character varying(255),
    receive_by_id uuid,
    receive_team character varying(100),
    receive_start_time timestamp with time zone,
    receive_end_time timestamp with time zone,
    carrier character varying(255),
    carrier_code character varying(100),
    vehicle_number character varying(100),
    driver_name character varying(255),
    driver_phone character varying(50),
    transfer_notes text,
    receive_notes text,
    special_instructions text,
    attachments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.transfers OWNER TO topems;

--
-- Name: TABLE transfers; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.transfers IS '转移记录表';


--
-- Name: COLUMN transfers.transfer_type; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.transfers.transfer_type IS '转移类型：warehouse_to_warehouse, location_to_location, replenishment等';


--
-- Name: COLUMN transfers.status; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.transfers.status IS '状态：created, approved, in_transit, received, completed, cancelled等';


--
-- Name: warehouses; Type: TABLE; Schema: wms; Owner: topems
--

CREATE TABLE wms.warehouses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    warehouse_code character varying(100) NOT NULL,
    warehouse_name character varying(255) NOT NULL,
    warehouse_type character varying(50),
    description text,
    address text,
    city character varying(100),
    province character varying(100),
    country character varying(100),
    postal_code character varying(20),
    contact_person character varying(255),
    contact_phone character varying(50),
    contact_email character varying(100),
    total_area numeric(15,2),
    usable_area numeric(15,2),
    total_capacity numeric(15,2),
    current_capacity numeric(15,2),
    utilization_rate numeric(5,2),
    temperature_min numeric(5,2),
    temperature_max numeric(5,2),
    humidity_min numeric(5,2),
    humidity_max numeric(5,2),
    is_temperature_controlled boolean DEFAULT false,
    is_humidity_controlled boolean DEFAULT false,
    security_level character varying(20),
    operating_hours jsonb,
    manager character varying(255),
    manager_id uuid,
    department character varying(100),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_inspection_date date,
    next_inspection_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


ALTER TABLE wms.warehouses OWNER TO topems;

--
-- Name: TABLE warehouses; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON TABLE wms.warehouses IS '仓库信息表';


--
-- Name: COLUMN warehouses.warehouse_type; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.warehouses.warehouse_type IS '仓库类型：raw_material, finished_goods, semi_finished, spare_parts等';


--
-- Name: COLUMN warehouses.status; Type: COMMENT; Schema: wms; Owner: topems
--

COMMENT ON COLUMN wms.warehouses.status IS '状态：active, inactive, maintenance等';


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.audit_logs (id, organization_id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.contacts (id, organization_id, customer_id, first_name, last_name, full_name, email, phone, mobile, "position", department, is_primary, is_decision_maker, gender, birthday, address, notes, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: customer_tags; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.customer_tags (id, organization_id, customer_id, tag_id, created_at, created_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.customers (id, organization_id, name, code, industry, company_size, website, email, phone, fax, address, city, province, country, postal_code, status, customer_type, source, rating, revenue, employee_count, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
e118c4a5-3745-493e-95b2-b016086ef6c0	00000000-0000-0000-0000-000000000001	示例科技有限公司	CUST001	Technology	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	active	\N	A	\N	\N	\N	2026-06-12 08:02:37.002156+00	2026-06-12 08:02:37.002156+00	\N	\N	\N
664553f9-7e24-44e9-b679-8f11a9636aa5	00000000-0000-0000-0000-000000000001	示例制造集团	CUST002	Manufacturing	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	active	\N	B	\N	\N	\N	2026-06-12 08:02:37.002156+00	2026-06-12 08:02:37.002156+00	\N	\N	\N
7ddf4a99-5280-4fb3-bf71-7cc0538ac516	00000000-0000-0000-0000-000000000001	示例金融公司	CUST003	Finance	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	potential	\N	A	\N	\N	\N	2026-06-12 08:02:37.002156+00	2026-06-12 08:02:37.002156+00	\N	\N	\N
\.


--
-- Data for Name: dashboard_metrics; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.dashboard_metrics (id, organization_id, metric_type, metric_name, metric_value, metric_unit, period_type, period_start, period_end, comparison_value, comparison_period_start, comparison_period_end, trend, target_value, achievement_percentage, details, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
f7350513-4bc8-47fe-b6db-e5a1fc56fbeb	00000000-0000-0000-0000-000000000001	revenue	本月销售额	1000000.00	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:37.003626+00	2026-06-12 08:02:37.003626+00	\N	\N	\N
5e5ac169-0005-416d-9224-0b6f980f80c8	00000000-0000-0000-0000-000000000001	customers	新增客户数	15.00	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:37.003626+00	2026-06-12 08:02:37.003626+00	\N	\N	\N
ed6cdaa5-dc9d-4584-9bf6-cbfd0a6a4f40	00000000-0000-0000-0000-000000000001	opportunities	活跃商机数	25.00	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:37.003626+00	2026-06-12 08:02:37.003626+00	\N	\N	\N
8f4b53c2-67c1-4427-a125-a0a1e34d0674	00000000-0000-0000-0000-000000000001	conversions	商机转化率	35.50	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:37.003626+00	2026-06-12 08:02:37.003626+00	\N	\N	\N
\.


--
-- Data for Name: interactions; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.interactions (id, organization_id, customer_id, contact_id, opportunity_id, interaction_type, subject, content, location, duration_minutes, scheduled_at, started_at, completed_at, status, outcome, follow_up_required, follow_up_date, follow_up_notes, assigned_to, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: opportunities; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.opportunities (id, organization_id, customer_id, contact_id, name, code, description, value, expected_revenue, stage, probability, status, priority, source, campaign_id, close_date, actual_close_date, next_step, competitor, loss_reason, win_reason, assigned_to, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: crm; Owner: topems
--

COPY crm.tags (id, organization_id, name, color, description, category, is_system, usage_count, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
600723da-52ec-4287-9894-ab7a5c2d05ec	00000000-0000-0000-0000-000000000001	VIP客户	#e74c3c	\N	customer_level	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
275f51ed-477b-41c1-af9d-1e93dfee6c9e	00000000-0000-0000-0000-000000000001	战略客户	#3498db	\N	customer_level	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
b973fa2c-32f3-46ef-8d99-513f2ebde888	00000000-0000-0000-0000-000000000001	高潜力	#f39c12	\N	potential	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
713f7d13-7129-481d-a1e7-2060f709d8d3	00000000-0000-0000-0000-000000000001	制造业	#9b59b6	\N	industry	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
36babbe1-cd8d-4ea7-91f6-b1cf1f6db062	00000000-0000-0000-0000-000000000001	科技行业	#1abc9c	\N	industry	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
7b42a7b9-6ae3-41d6-99aa-08a2d374333b	00000000-0000-0000-0000-000000000001	金融行业	#34495e	\N	industry	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
3e2a9499-3aac-463b-810c-b65c8b0bac6a	00000000-0000-0000-0000-000000000001	需跟进	#e67e22	\N	action	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
19f0be80-bb54-4a34-b0d2-3ef450f7e6d8	00000000-0000-0000-0000-000000000001	已签约	#27ae60	\N	status	t	0	2026-06-12 08:02:36.978354+00	2026-06-12 08:02:36.978354+00	\N	\N	\N
\.


--
-- Data for Name: archive_borrows; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.archive_borrows (id, archive_id, borrower_id, borrower_name, borrow_reason, borrow_type, borrow_date, due_date, return_date, status, approver_id, approval_comment, approved_at, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: archive_categories; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.archive_categories (id, code, name, parent_id, description, retention_period, sort_order, is_active, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: archive_destructions; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.archive_destructions (id, archive_id, reason, approver_id, approved_at, destroyed_at, status, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: archive_metadata; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.archive_metadata (id, archive_id, key, value, created_at) FROM stdin;
\.


--
-- Data for Name: archives; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.archives (id, archive_no, title, category_id, file_id, summary, keywords, creator, created_date, retention_period, status, security_level, department_id, source_module, source_id, archived_at, archived_by, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: faqs; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.faqs (id, question, answer, category, tags, sort_order, is_active, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: file_permissions; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.file_permissions (id, file_id, user_id, role_id, permission, created_at) FROM stdin;
\.


--
-- Data for Name: file_versions; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.file_versions (id, file_id, version, size, checksum, storage_path, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.files (id, name, folder_id, size, content_type, storage_path, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: folder_permissions; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.folder_permissions (id, folder_id, user_id, role_id, permission, inherit, created_at) FROM stdin;
\.


--
-- Data for Name: folders; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.folders (id, name, parent_id, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: help_articles; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.help_articles (id, title, slug, category_id, module, summary, content, tags, view_count, like_count, is_featured, is_active, sort_order, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: help_categories; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.help_categories (id, name, code, icon, description, module, sort_order, is_active, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: template_categories; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.template_categories (id, name, code, icon, description, sort_order, is_active, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.templates (id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, view_count, use_count, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: video_tutorials; Type: TABLE DATA; Schema: doc_service; Owner: topems
--

COPY doc_service.video_tutorials (id, title, description, thumbnail_url, video_url, duration, module, tags, view_count, like_count, is_active, sort_order, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.audit_logs (id, module, action, resource_type, resource_id, user_id, user_name, old_values, new_values, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: drill_records; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.drill_records (id, drill_no, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: emergency_plans; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.emergency_plans (id, plan_no, name, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: environmental_alerts; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.environmental_alerts (id, point_id, alert_type, alert_level, parameter, threshold_value, actual_value, alert_time, status, handled_by, handled_time, handle_result, created_at) FROM stdin;
\.


--
-- Data for Name: environmental_data; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.environmental_data (id, point_id, data_time, parameter, value, unit, quality, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: health_checkups; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.health_checkups (id, employee_id, employee_name, checkup_date, checkup_type, institution, result_summary, abnormal_items, recommendations, attachments, next_checkup_date, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: health_records; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.health_records (id, employee_id, employee_name, gender, birth_date, blood_type, allergies, chronic_diseases, medical_history, emergency_contact, emergency_phone, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: monitoring_points; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.monitoring_points (id, point_no, name, point_type, location, latitude, longitude, parameters, thresholds, status, last_data_time, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: risk_assessments; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.risk_assessments (id, assessment_no, title, assessment_type, risk_source, risk_category, likelihood, consequence, risk_level, risk_score, description, affected_area, affected_persons, existing_controls, status, assessor, assessment_date, review_date, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: risk_controls; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.risk_controls (id, assessment_id, control_type, control_measure, implementation_plan, responsible_person, target_date, completion_date, effectiveness, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: safety_checks; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.safety_checks (id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: safety_hazards; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.safety_hazards (id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: safety_incidents; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.safety_incidents (id, incident_no, title, incident_type, incident_level, location, incident_time, description, casualties, injuries, economic_loss, cause_analysis, corrective_actions, responsible_persons, status, handled_by, handled_time, attachments, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: training_programs; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.training_programs (id, program_no, title, training_type, content, objectives, target_audience, duration_hours, training_method, instructor, location, start_date, end_date, max_participants, materials, status, completion_rate, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: training_records; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.training_records (id, program_id, employee_id, employee_name, enrollment_date, completion_date, score, certificate_no, certificate_expiry, status, remarks, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: vaccination_records; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.vaccination_records (id, employee_id, employee_name, vaccine_name, vaccine_type, vaccination_date, dose_number, institution, batch_number, expiry_date, next_dose_date, remarks, attachments, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: accounting_subjects; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.accounting_subjects (id, organization_id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.assets (id, organization_id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, serial_number, manufacturer, rated_power, rated_voltage, rated_current, specifications, image_url, department, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.audit_logs (id, organization_id, action, entity_type, entity_id, entity_ids, user_id, user_name, request_details, response_details, status, error_message, ip_address, user_agent, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.budgets (id, organization_id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: db_changes; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.db_changes (id, organization_id, change_type, table_name, column_name, old_definition, new_definition, sql_statement, executed_by, executed_at, backup_data, deleted_at) FROM stdin;
\.


--
-- Data for Name: dict_items; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.dict_items (id, organization_id, dict_type_id, code, name, value, sort_order, parent_id, extra_data, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: dict_types; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.dict_types (id, organization_id, code, name, category, description, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.expenses (id, organization_id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: financial_vouchers; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.financial_vouchers (id, organization_id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: payables; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.payables (id, organization_id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: receivables; Type: TABLE DATA; Schema: erp; Owner: topems
--

COPY erp.receivables (id, organization_id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.audit_log (id, action, resource_type, resource_id, old_value, new_value, user_id, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.audit_logs (id, organization_id, action, resource_type, resource_id, old_value, new_value, user_id, ip_address, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: business_locations; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.business_locations (id, organization_id, business_type, business_name, business_code, category, "position", address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: device_location_records; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.device_location_records (id, organization_id, device_id, "position", accuracy, speed, direction, altitude, battery_level, signal_strength, recorded_at, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: device_locations; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.device_locations (id, organization_id, map_id, device_name, device_code, device_type, "position", status, description, last_inspected, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.devices (id, organization_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: factory_maps; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.factory_maps (id, organization_id, name, code, map_type, file_url, bounds, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: geodata; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.geodata (id, organization_id, name, data_type, format, file_path, geojson_data, feature_count, extent, properties_schema, metadata, status, uploaded_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: geofeatures; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.geofeatures (id, organization_id, geodata_id, feature_type, geometry, properties, centroid, area, length, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: location_photos; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.location_photos (id, organization_id, map_id, "position", photo_url, description, taken_by, taken_at, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.locations (id, organization_id, name, code, location_type, "position", address, description, properties, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: map_layers; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.map_layers (id, organization_id, map_id, name, layer_type, source_type, source_url, source_data, style_config, opacity, visible, z_index, min_zoom, max_zoom, properties, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: map_markers; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.map_markers (id, organization_id, marker_type, name, marker_style, "position", icon_svg, color, size, popup_content, click_action, action_data, visible, z_index, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: maps; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.maps (id, organization_id, name, code, description, map_type, projection, bounds, center, zoom_level, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: pipelines; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.pipelines (id, organization_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: spatial_analysis; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.spatial_analysis (id, organization_id, analysis_type, input_data, parameters, result_data, result_geometry, statistics, execution_time_ms, status, created_by, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: warehouse_locations; Type: TABLE DATA; Schema: gis; Owner: topems
--

COPY gis.warehouse_locations (id, organization_id, map_id, warehouse_name, zone, "position", capacity, usage_rate, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.attendance_records (id, organization_id, employee_id, date, check_in_time, check_out_time, check_in_location, check_out_location, status, work_hours, overtime_hours, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.audit_logs (id, organization_id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.companies (id, organization_id, name, short_name, registration_number, tax_number, address, contact_phone, email, website, description, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	我的公司	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-06-12 08:02:37.928854+00	2026-06-12 08:02:37.928854+00	\N	\N	\N
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.contracts (id, organization_id, employee_id, contract_no, contract_type, party_a_name, party_a_contact, party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days, contract_file_path, reminder_days, status, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.departments (id, organization_id, company_id, name, code, parent_id, manager_id, description, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.employees (id, organization_id, company_id, department_id, position_id, employee_number, name, gender, birth_date, hire_date, leave_date, id_card_number, job_title, "position", email, phone, emergency_contact_name, emergency_contact_phone, address, education, marital_status, nationality, bank_account, bank_name, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: leave_records; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.leave_records (id, organization_id, employee_id, leave_type, start_date, end_date, days, reason, approver_id, approval_status, approval_date, rejection_reason, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: payroll_records; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.payroll_records (id, organization_id, employee_id, period_year, period_month, base_salary, bonus, allowance, overtime_pay, deduction, tax, insurance, net_salary, payment_date, payment_method, status, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: performance_records; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.performance_records (id, organization_id, employee_id, period_year, period_month, period_quarter, performance_type, score, level, goals, achievements, strengths, weaknesses, improvement_plan, reviewer_id, review_date, status, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.positions (id, organization_id, company_id, department_id, name, code, level, description, responsibilities, requirements, salary_range_min, salary_range_max, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: recruitment_applications; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.recruitment_applications (id, organization_id, recruitment_id, applicant_name, applicant_email, applicant_phone, resume_file_path, education, work_experience, expected_salary, application_date, interview_date, interview_result, offer_status, status, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: recruitment_records; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.recruitment_records (id, organization_id, position_id, title, description, requirements, salary_range_min, salary_range_max, location, recruitment_type, publish_date, deadline, vacancies, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: salary_adjustments; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.salary_adjustments (id, organization_id, employee_id, adjustment_type, previous_salary, new_salary, adjustment_amount, adjustment_percentage, effective_date, reason, approver_id, approval_status, approval_date, rejection_reason, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: training_participants; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.training_participants (id, organization_id, training_id, employee_id, participation_status, completion_status, score, certificate_no, certificate_file_path, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: training_records; Type: TABLE DATA; Schema: hrm; Owner: topems
--

COPY hrm.training_records (id, organization_id, training_name, training_type, training_category, description, instructor, start_date, end_date, duration_hours, location, cost, max_participants, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.audit_logs (id, user_id, action, resource, resource_id, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.password_reset_tokens (id, user_id, token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.permissions (id, name, resource, action, description) FROM stdin;
b9ff00b8-0c92-4d44-9264-c2b393f468fb	rs_read	rs	read	RS模块读取权限
7d08e0b6-d9b8-4dcc-90ec-b8c835b51ee9	rs_write	rs	write	RS模块写入权限
1be7431d-d169-4ab5-9670-797c00cc312f	rs_delete	rs	delete	RS模块删除权限
beb597dd-a228-46c6-aa35-a9fe7b46f97c	rs_admin	rs	admin	RS模块管理权限
65a7eb04-cb07-4cb3-b47f-0e27516a6b3c	lims_read	lims	read	LIMS模块读取权限
1be8d1c3-cea4-455c-8a59-6ec534fcc563	lims_write	lims	write	LIMS模块写入权限
6a753ced-a746-4f42-be4e-fbf0b6ea847c	lims_delete	lims	delete	LIMS模块删除权限
399d0454-156f-478d-bb8b-18cfce165d04	lims_admin	lims	admin	LIMS模块管理权限
61dc1e43-bceb-46b2-b50f-9891c17b0792	qms_read	qms	read	QMS模块读取权限
d67b1ecd-5b7f-4e72-8d9b-96dba21d7da7	qms_write	qms	write	QMS模块写入权限
ecc2d3f8-aff5-40d3-8df6-bff0e869597b	qms_delete	qms	delete	QMS模块删除权限
4e9e2e88-4dda-4ae2-8c0f-caa285ed4af8	qms_admin	qms	admin	QMS模块管理权限
c7ea4c2b-19c9-4b85-ac89-b1db90dee57a	ehs_read	ehs	read	EHS模块读取权限
1d5b9bc7-4c13-4b35-8f0b-74a2dd0863a7	ehs_write	ehs	write	EHS模块写入权限
c72ad88f-9d81-48b4-9a0d-ed7f6f2dfe9d	ehs_delete	ehs	delete	EHS模块删除权限
7252553c-1fb3-4975-933c-6a6a31de2c72	ehs_admin	ehs	admin	EHS模块管理权限
e01dae5e-6a70-435c-9897-0856213dcb3b	srm_read	srm	read	SRM模块读取权限
0c083c9f-712f-4693-9ffc-56011c6536ad	srm_write	srm	write	SRM模块写入权限
b6f57bbc-898f-4ed1-a4d5-f5481eeba723	srm_delete	srm	delete	SRM模块删除权限
52290e02-2ff1-4b24-bc78-b78d2598c975	srm_admin	srm	admin	SRM模块管理权限
15d2c172-569f-453c-9278-fc030485a37d	pdm_read	pdm	read	PDM模块读取权限
7373340c-3ea0-4467-bb61-a3a69f85a948	pdm_write	pdm	write	PDM模块写入权限
8a2e0159-3543-4f44-988e-a22c89910fda	pdm_delete	pdm	delete	PDM模块删除权限
50ef7ea0-f596-4afb-920e-967e127f4593	pdm_admin	pdm	admin	PDM模块管理权限
1a16eb68-f7fc-4345-b916-6cfe4d2f56e1	workflow_read	workflow	read	Workflow模块读取权限
0d8299dc-9681-4c3f-ac75-85aa43e158f1	workflow_write	workflow	write	Workflow模块写入权限
d5bd8d21-e8d5-4b0a-b1f9-a71ea51b3b2a	workflow_delete	workflow	delete	Workflow模块删除权限
0befdfdb-a72b-465e-bf6d-9179c4ea5ceb	workflow_admin	workflow	admin	Workflow模块管理权限
add1c94f-d622-4b89-b45b-1bcd1d2cc7d4	doc_read	doc	read	文档模块读取权限
d049d75d-dd36-49c9-9573-0aa41805185a	doc_write	doc	write	文档模块写入权限
bb737ac7-d051-4904-90ba-2975ddeeb258	doc_delete	doc	delete	文档模块删除权限
650e877b-8967-40ef-911b-3f83d61d9cd3	doc_admin	doc	admin	文档模块管理权限
8461e847-6716-4dad-b6b7-b142292e4241	ai_read	ai	read	AI模块读取权限
4d9592d3-4113-475b-a642-cd23a80e762a	ai_write	ai	write	AI模块写入权限
8f26da43-6ec3-4abb-b9e0-cdf850bcffae	ai_delete	ai	delete	AI模块删除权限
8297c3b5-98d3-4615-ad3f-33bbbbe2fa7e	ai_admin	ai	admin	AI模块管理权限
10edc86e-24e2-4e6f-8602-825f33667144	mail_read	mail	read	邮件模块读取权限
8b5d16fa-2cd9-416e-b740-618d47db32fb	mail_write	mail	write	邮件模块写入权限
1eb97ccd-e491-4ffc-b272-67363e0e424c	mail_delete	mail	delete	邮件模块删除权限
0392f103-d67b-4d80-a34c-6301b6dc2ad3	mail_admin	mail	admin	邮件模块管理权限
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.role_permissions (role_id, permission_id) FROM stdin;
6c88db10-3a16-4f7e-a350-9164483da30a	b9ff00b8-0c92-4d44-9264-c2b393f468fb
6c88db10-3a16-4f7e-a350-9164483da30a	7d08e0b6-d9b8-4dcc-90ec-b8c835b51ee9
6c88db10-3a16-4f7e-a350-9164483da30a	1be7431d-d169-4ab5-9670-797c00cc312f
6c88db10-3a16-4f7e-a350-9164483da30a	beb597dd-a228-46c6-aa35-a9fe7b46f97c
6c88db10-3a16-4f7e-a350-9164483da30a	65a7eb04-cb07-4cb3-b47f-0e27516a6b3c
6c88db10-3a16-4f7e-a350-9164483da30a	1be8d1c3-cea4-455c-8a59-6ec534fcc563
6c88db10-3a16-4f7e-a350-9164483da30a	6a753ced-a746-4f42-be4e-fbf0b6ea847c
6c88db10-3a16-4f7e-a350-9164483da30a	399d0454-156f-478d-bb8b-18cfce165d04
6c88db10-3a16-4f7e-a350-9164483da30a	61dc1e43-bceb-46b2-b50f-9891c17b0792
6c88db10-3a16-4f7e-a350-9164483da30a	d67b1ecd-5b7f-4e72-8d9b-96dba21d7da7
6c88db10-3a16-4f7e-a350-9164483da30a	ecc2d3f8-aff5-40d3-8df6-bff0e869597b
6c88db10-3a16-4f7e-a350-9164483da30a	4e9e2e88-4dda-4ae2-8c0f-caa285ed4af8
6c88db10-3a16-4f7e-a350-9164483da30a	c7ea4c2b-19c9-4b85-ac89-b1db90dee57a
6c88db10-3a16-4f7e-a350-9164483da30a	1d5b9bc7-4c13-4b35-8f0b-74a2dd0863a7
6c88db10-3a16-4f7e-a350-9164483da30a	c72ad88f-9d81-48b4-9a0d-ed7f6f2dfe9d
6c88db10-3a16-4f7e-a350-9164483da30a	7252553c-1fb3-4975-933c-6a6a31de2c72
6c88db10-3a16-4f7e-a350-9164483da30a	e01dae5e-6a70-435c-9897-0856213dcb3b
6c88db10-3a16-4f7e-a350-9164483da30a	0c083c9f-712f-4693-9ffc-56011c6536ad
6c88db10-3a16-4f7e-a350-9164483da30a	b6f57bbc-898f-4ed1-a4d5-f5481eeba723
6c88db10-3a16-4f7e-a350-9164483da30a	52290e02-2ff1-4b24-bc78-b78d2598c975
6c88db10-3a16-4f7e-a350-9164483da30a	15d2c172-569f-453c-9278-fc030485a37d
6c88db10-3a16-4f7e-a350-9164483da30a	7373340c-3ea0-4467-bb61-a3a69f85a948
6c88db10-3a16-4f7e-a350-9164483da30a	8a2e0159-3543-4f44-988e-a22c89910fda
6c88db10-3a16-4f7e-a350-9164483da30a	50ef7ea0-f596-4afb-920e-967e127f4593
6c88db10-3a16-4f7e-a350-9164483da30a	1a16eb68-f7fc-4345-b916-6cfe4d2f56e1
6c88db10-3a16-4f7e-a350-9164483da30a	0d8299dc-9681-4c3f-ac75-85aa43e158f1
6c88db10-3a16-4f7e-a350-9164483da30a	d5bd8d21-e8d5-4b0a-b1f9-a71ea51b3b2a
6c88db10-3a16-4f7e-a350-9164483da30a	0befdfdb-a72b-465e-bf6d-9179c4ea5ceb
6c88db10-3a16-4f7e-a350-9164483da30a	add1c94f-d622-4b89-b45b-1bcd1d2cc7d4
6c88db10-3a16-4f7e-a350-9164483da30a	d049d75d-dd36-49c9-9573-0aa41805185a
6c88db10-3a16-4f7e-a350-9164483da30a	bb737ac7-d051-4904-90ba-2975ddeeb258
6c88db10-3a16-4f7e-a350-9164483da30a	650e877b-8967-40ef-911b-3f83d61d9cd3
6c88db10-3a16-4f7e-a350-9164483da30a	8461e847-6716-4dad-b6b7-b142292e4241
6c88db10-3a16-4f7e-a350-9164483da30a	4d9592d3-4113-475b-a642-cd23a80e762a
6c88db10-3a16-4f7e-a350-9164483da30a	8f26da43-6ec3-4abb-b9e0-cdf850bcffae
6c88db10-3a16-4f7e-a350-9164483da30a	8297c3b5-98d3-4615-ad3f-33bbbbe2fa7e
6c88db10-3a16-4f7e-a350-9164483da30a	10edc86e-24e2-4e6f-8602-825f33667144
6c88db10-3a16-4f7e-a350-9164483da30a	8b5d16fa-2cd9-416e-b740-618d47db32fb
6c88db10-3a16-4f7e-a350-9164483da30a	1eb97ccd-e491-4ffc-b272-67363e0e424c
6c88db10-3a16-4f7e-a350-9164483da30a	0392f103-d67b-4d80-a34c-6301b6dc2ad3
277605b6-5dd0-44de-a3e2-790467ba1d37	b9ff00b8-0c92-4d44-9264-c2b393f468fb
277605b6-5dd0-44de-a3e2-790467ba1d37	65a7eb04-cb07-4cb3-b47f-0e27516a6b3c
277605b6-5dd0-44de-a3e2-790467ba1d37	61dc1e43-bceb-46b2-b50f-9891c17b0792
277605b6-5dd0-44de-a3e2-790467ba1d37	c7ea4c2b-19c9-4b85-ac89-b1db90dee57a
277605b6-5dd0-44de-a3e2-790467ba1d37	e01dae5e-6a70-435c-9897-0856213dcb3b
277605b6-5dd0-44de-a3e2-790467ba1d37	15d2c172-569f-453c-9278-fc030485a37d
277605b6-5dd0-44de-a3e2-790467ba1d37	1a16eb68-f7fc-4345-b916-6cfe4d2f56e1
277605b6-5dd0-44de-a3e2-790467ba1d37	add1c94f-d622-4b89-b45b-1bcd1d2cc7d4
277605b6-5dd0-44de-a3e2-790467ba1d37	8461e847-6716-4dad-b6b7-b142292e4241
277605b6-5dd0-44de-a3e2-790467ba1d37	10edc86e-24e2-4e6f-8602-825f33667144
bc560132-4952-4d6f-91ba-2ce53de969d0	b9ff00b8-0c92-4d44-9264-c2b393f468fb
bc560132-4952-4d6f-91ba-2ce53de969d0	65a7eb04-cb07-4cb3-b47f-0e27516a6b3c
bc560132-4952-4d6f-91ba-2ce53de969d0	61dc1e43-bceb-46b2-b50f-9891c17b0792
bc560132-4952-4d6f-91ba-2ce53de969d0	c7ea4c2b-19c9-4b85-ac89-b1db90dee57a
bc560132-4952-4d6f-91ba-2ce53de969d0	e01dae5e-6a70-435c-9897-0856213dcb3b
bc560132-4952-4d6f-91ba-2ce53de969d0	15d2c172-569f-453c-9278-fc030485a37d
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.roles (id, name, description, created_at) FROM stdin;
6c88db10-3a16-4f7e-a350-9164483da30a	管理员	拥有所有权限的管理员角色	2026-06-12 08:02:27.176104+00
ed5a99cb-7c39-4390-a30a-ab284ca74943	部门经理	部门经理角色	2026-06-12 08:02:27.176104+00
277605b6-5dd0-44de-a3e2-790467ba1d37	普通用户	普通用户角色	2026-06-12 08:02:27.176104+00
bc560132-4952-4d6f-91ba-2ce53de969d0	访客	访客角色	2026-06-12 08:02:27.176104+00
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.user_roles (user_id, role_id, created_at) FROM stdin;
a00dab14-60e4-4a50-bd7e-10281669171e	6c88db10-3a16-4f7e-a350-9164483da30a	2026-06-12 08:05:38.121896+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.users (id, username, email, password_hash, full_name, is_active, is_superuser, created_at, updated_at, last_login_at) FROM stdin;
a00dab14-60e4-4a50-bd7e-10281669171e	admin	admin@topems.com	$2b$12$kPgIpcGnsFZp4FpVV2sMT.1A3ZNlDnEJhQ9cTrzGcu/dBUQm/FKqu	系统管理员	t	t	2026-06-12 08:05:38.078903+00	2026-06-12 08:05:38.078903+00	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.audit_logs (id, organization_id, user_id, action, resource_type, resource_id, details, ip_address, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: chat_room_members; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.chat_room_members (id, organization_id, chat_room_id, user_id, role, joined_at, last_read_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: chat_rooms; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.chat_rooms (id, organization_id, name, room_type, members, created_by, last_message, last_message_time, is_muted, is_pinned, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: contact_group_members; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.contact_group_members (id, organization_id, group_id, user_id, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: contact_groups; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.contact_groups (id, organization_id, user_id, name, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: file_transfers; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.file_transfers (id, organization_id, file_name, file_path, file_size, content_type, uploader_id, uploader_name, chat_room_id, message_id, is_shared, share_link, download_count, expires_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: friends; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.friends (id, organization_id, user_id, friend_id, friend_name, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: message_read_receipts; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.message_read_receipts (id, organization_id, message_id, user_id, read_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.messages (id, organization_id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, file_url, file_name, file_size, reply_to_id, forwarded_from_id, is_read, is_edited, is_deleted, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.notifications (id, organization_id, user_id, title, content, notification_type, related_id, related_type, is_read, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_groups; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.project_groups (id, organization_id, name, description, project_id, members, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: user_status; Type: TABLE DATA; Schema: im; Owner: topems
--

COPY im.user_status (user_id, organization_id, is_online, status_type, status_message, last_seen, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: integration_configs; Type: TABLE DATA; Schema: integration; Owner: topems
--

COPY integration.integration_configs (id, config_name, source_system, target_system, config_type, config_value, is_active, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: integration_events; Type: TABLE DATA; Schema: integration; Owner: topems
--

COPY integration.integration_events (id, source_system, target_system, event_type, source_record_id, target_record_id, payload, status, error_message, synced_at, created_at) FROM stdin;
\.


--
-- Data for Name: lims_qms_sync; Type: TABLE DATA; Schema: integration; Owner: topems
--

COPY integration.lims_qms_sync (id, lims_sample_id, qms_inspection_id, sample_name, inspection_result, inspection_notes, synced, sync_status, sync_error, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mes_erp_sync; Type: TABLE DATA; Schema: integration; Owner: topems
--

COPY integration.mes_erp_sync (id, mes_order_id, erp_order_id, order_number, product_name, quantity, synced, sync_status, sync_error, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wms_scm_sync; Type: TABLE DATA; Schema: integration; Owner: topems
--

COPY integration.wms_scm_sync (id, wms_inventory_id, scm_supply_id, item_name, quantity, unit, synced, sync_status, sync_error, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_analyses; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.ai_analyses (id, organization_id, entity_type, entity_id, analysis_type, prompt, response, ai_service_url, created_by, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.audit_logs (id, organization_id, action_type, target_type, target_id, target_name, user_id, user_name, details, ip_address, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: document_relations; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.document_relations (id, organization_id, entity_type, entity_id, doc_service_file_id, doc_service_url, file_name, file_size, file_type, description, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: inspection_processes; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.inspection_processes (id, organization_id, name, code, description, steps, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: inspection_records; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.inspection_records (id, organization_id, task_id, step_id, step_name, result, conclusion, inspector, attachments, recorded_at, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: inspection_tasks; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.inspection_tasks (id, organization_id, sample_id, process_id, current_step, status, inspector, priority, started_at, completed_at, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: instrument_calibrations; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.instrument_calibrations (id, organization_id, instrument_id, calibration_date, calibrated_by, calibration_results, notes, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: instruments; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.instruments (id, organization_id, name, code, instrument_type, model, manufacturer, serial_number, status, location, purchase_date, calibration_date, next_calibration_date, maintenance_history, responsible_person, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: lab_ledger; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.lab_ledger (id, organization_id, ledger_type, name, code, description, quantity, location, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: maintenance_records; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.maintenance_records (id, organization_id, instrument_id, maintenance_type, description, performed_by, performed_at, next_maintenance_date, cost, notes, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: reagent_usages; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.reagent_usages (id, organization_id, reagent_id, quantity, usage_date, purpose, used_by, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: reagents; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.reagents (id, organization_id, name, code, category, specification, supplier, batch_number, quantity, unit, location, storage_condition, expiration_date, status, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: samples; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.samples (id, organization_id, name, code, description, status, project_id, batch_number, source, sample_type, received_date, storage_location, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: mail; Owner: topems
--

COPY mail.attachments (id, email_id, filename, original_filename, file_path, file_size, content_type, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: emails; Type: TABLE DATA; Schema: mail; Owner: topems
--

COPY mail.emails (id, subject, from_address, to_addresses, cc_addresses, bcc_addresses, body, body_html, status, priority, sent_at, error_message, template_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: mail; Owner: topems
--

COPY mail.templates (id, code, name, description, subject_template, body_template, body_html_template, category, tags, status, created_at, updated_at) FROM stdin;
bee9e565-d7db-4433-8a1d-0a49e3acca2d	workflow_approval	流程审批通知	流程审批结果通知邮件模板	【TOPEMS】流程审批通知 - {{process_name}}	尊敬的{{user_name}}：\\n\\n您的流程【{{process_name}}】已{{approval_status}}。\\n\\n审批人：{{approver_name}}\\n审批时间：{{approval_time}}\\n审批意见：{{approval_comment}}\\n\\n如需查看详情，请登录系统查看。\\n\\nTOPEMS 系统	\N	workflow	\N	active	2026-06-12 14:37:42.930604+00	2026-06-12 14:37:42.930604+00
b330f633-b534-468a-97f6-e6522ca20dfe	system_alert	系统告警通知	系统告警通知邮件模板	【TOPEMS】系统告警 - {{alert_type}}	尊敬的管理员：\\n\\n系统检测到以下告警：\\n\\n告警类型：{{alert_type}}\\n告警级别：{{alert_level}}\\n告警时间：{{alert_time}}\\n告警详情：{{alert_message}}\\n\\n请及时处理。\\n\\nTOPEMS 系统	\N	system	\N	active	2026-06-12 14:37:42.930604+00	2026-06-12 14:37:42.930604+00
649accd5-54ad-492a-ae67-4a567317c2db	contract_notification	合同通知	合同相关通知邮件模板	【TOPEMS】合同{{contract_action}}通知	尊敬的{{user_name}}：\\n\\n合同【{{contract_name}}】已{{contract_action}}。\\n\\n合同编号：{{contract_no}}\\n{{contract_action}}时间：{{action_time}}\\n\\n请登录系统查看详情。\\n\\nTOPEMS 系统	\N	contract	\N	active	2026-06-12 14:37:42.930604+00	2026-06-12 14:37:42.930604+00
3d125084-1ec8-4943-80b4-ab28c1374316	user_register	用户注册通知	新用户注册通知邮件模板	【TOPEMS】欢迎注册	尊敬的{{user_name}}：\\n\\n欢迎注册 TOPEMS 系统！\\n\\n用户名：{{username}}\\n注册时间：{{register_time}}\\n\\n请登录系统完成后续操作。\\n\\nTOPEMS 系统	\N	user	\N	active	2026-06-12 14:37:42.930604+00	2026-06-12 14:37:42.930604+00
c6b30c45-99b2-4ad5-b0d3-9688bc10e7ce	password_reset	密码重置通知	密码重置邮件模板	【TOPEMS】密码重置请求	尊敬的{{user_name}}：\\n\\n您已申请重置密码。\\n\\n重置链接：{{reset_link}}\\n链接有效期：{{expire_time}}\\n\\n如果这不是您的操作，请忽略此邮件。\\n\\nTOPEMS 系统	\N	user	\N	active	2026-06-12 14:37:42.930604+00	2026-06-12 14:37:42.930604+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.audit_logs (id, organization_id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.equipment (id, organization_id, equipment_code, equipment_name, equipment_type, category, model, brand, serial_number, specification, manufacturer, manufacture_date, purchase_date, installation_date, location, building, floor, area, work_station_id, responsible_person, responsible_person_id, department, purchase_price, current_value, depreciation_rate, warranty_expiry_date, power_consumption, capacity, max_capacity, current_capacity, efficiency_percentage, availability_percentage, performance_percentage, quality_percentage, oee_percentage, status, operating_status, last_inspection_date, next_inspection_date, last_maintenance_date, next_maintenance_date, maintenance_frequency_days, total_operating_hours, total_maintenance_count, total_failure_count, last_failure_date, failure_description, operating_hours, maintenance_history, inspection_history, failure_history, notes, attachments, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
5c1cdc2c-0f40-4aed-b1eb-48e3ec46ae67	00000000-0000-0000-0000-000000000001	EQ001	数控车床1	production	machining	CNC-2000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:32.111276+00	2026-06-12 08:02:32.111276+00	\N	\N	\N
281ac01a-1dff-4cac-bcad-5bbd3761df3c	00000000-0000-0000-0000-000000000001	EQ002	数控车床2	production	machining	CNC-2000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:32.111276+00	2026-06-12 08:02:32.111276+00	\N	\N	\N
4cc1d374-8212-489d-b003-b7050a539b55	00000000-0000-0000-0000-000000000001	EQ003	装配机器人1	production	assembly	ARM-X100	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:32.111276+00	2026-06-12 08:02:32.111276+00	\N	\N	\N
97ccc09c-6174-46a3-a6d0-1775e70a2b02	00000000-0000-0000-0000-000000000001	EQ004	质量检测仪	testing	quality	QC-500	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:32.111276+00	2026-06-12 08:02:32.111276+00	\N	\N	\N
6fe9c90b-9677-48ae-a87d-26256e19e1ae	00000000-0000-0000-0000-000000000001	EQ005	包装机	production	packaging	PACK-300	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:32.111276+00	2026-06-12 08:02:32.111276+00	\N	\N	\N
\.


--
-- Data for Name: equipment_inspection_records; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.equipment_inspection_records (id, organization_id, equipment_id, equipment_code, equipment_name, inspection_type, inspector, inspector_id, inspection_date, inspection_time, location, temperature, vibration, noise_level, humidity, pressure, voltage, current, speed, inspection_items, overall_status, abnormalities, recommendations, next_inspection_date, status, attachments, remarks, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: equipment_maintenance_records; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.equipment_maintenance_records (id, organization_id, equipment_id, equipment_code, equipment_name, maintenance_type, maintenance_category, description, maintainer, maintainer_id, start_time, end_time, duration_minutes, cost, parts_replaced, parts_cost, labor_cost, other_cost, result, effectiveness, issues_found, recommendations, next_maintenance_date, status, approved_by, approved_at, attachments, remarks, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: process_route_steps; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.process_route_steps (id, organization_id, route_id, process_id, sequence, is_parallel, parallel_group, estimated_time_minutes, estimated_cost, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: process_routes; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.process_routes (id, organization_id, route_code, route_name, product_code, product_name, description, version, is_default, is_active, total_time_minutes, total_cost, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: production_orders; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.production_orders (id, organization_id, order_number, order_type, product_name, product_code, product_specification, batch_number, quantity, unit, planned_quantity, completed_quantity, rejected_quantity, scrapped_quantity, priority, status, progress_percentage, planned_start_date, planned_end_date, actual_start_date, actual_end_date, estimated_duration_hours, actual_duration_hours, customer_id, customer_name, customer_order_number, sales_order_id, process_route_id, process_route_name, work_station_id, work_station_name, assigned_to, assigned_to_id, team, material_requirements, tool_requirements, quality_requirements, special_instructions, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: production_processes; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.production_processes (id, organization_id, process_code, process_name, process_type, description, sequence, version, is_active, standard_time_minutes, setup_time_minutes, cycle_time_minutes, wait_time_minutes, work_station_id, work_station_name, required_skills, required_tools, required_materials, quality_check_points, safety_requirements, environmental_requirements, operation_instructions, parameters, predecessor_process_id, successor_process_id, status, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
e2c788ae-541d-4371-aa97-25fa2dc74a08	00000000-0000-0000-0000-000000000001	PROC001	原材料准备	preparation	\N	1	1.0	t	30.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-06-12 08:02:32.117909+00	2026-06-12 08:02:32.117909+00	\N	\N	\N
04d54e3b-6cee-4ce4-8b31-6a826161a3e5	00000000-0000-0000-0000-000000000001	PROC002	零件加工	machining	\N	2	1.0	t	60.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-06-12 08:02:32.117909+00	2026-06-12 08:02:32.117909+00	\N	\N	\N
07ff0fe4-6717-4336-92e4-7540b612bb85	00000000-0000-0000-0000-000000000001	PROC003	部件装配	assembly	\N	3	1.0	t	45.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-06-12 08:02:32.117909+00	2026-06-12 08:02:32.117909+00	\N	\N	\N
fc047088-1284-421c-865b-c116eba7a658	00000000-0000-0000-0000-000000000001	PROC004	质量检测	inspection	\N	4	1.0	t	20.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-06-12 08:02:32.117909+00	2026-06-12 08:02:32.117909+00	\N	\N	\N
388225f9-c3d7-4a8c-979e-101b71975366	00000000-0000-0000-0000-000000000001	PROC005	产品包装	packaging	\N	5	1.0	t	15.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2026-06-12 08:02:32.117909+00	2026-06-12 08:02:32.117909+00	\N	\N	\N
\.


--
-- Data for Name: production_records; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.production_records (id, organization_id, order_id, process_id, process_name, route_step_id, work_station_id, work_station_name, operator, operator_id, team, batch_number, start_time, end_time, duration_minutes, planned_quantity, completed_quantity, good_quantity, rejected_quantity, scrapped_quantity, rework_quantity, yield_rate, efficiency_rate, quality_check_result, quality_check_notes, material_usage, tool_usage, parameters, deviations, issues, status, approved_by, approved_at, notes, attachments, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: work_stations; Type: TABLE DATA; Schema: mes; Owner: topems
--

COPY mes.work_stations (id, organization_id, station_code, station_name, station_type, description, location, building, floor, area, capacity, current_load, efficiency_percentage, supervisor, supervisor_id, team, equipment_ids, available_skills, available_tools, status, last_maintenance_date, next_maintenance_date, maintenance_frequency_days, operating_hours, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
892be765-17e3-4990-84ef-9eaa75eccbd4	00000000-0000-0000-0000-000000000001	WS001	装配工作站1	assembly	\N	A区1楼	\N	\N	\N	5	0	100.00	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	2026-06-12 08:02:32.073092+00	2026-06-12 08:02:32.073092+00	\N	\N	\N
d8d1e136-1440-45af-8c3f-13e0a1f3c1f5	00000000-0000-0000-0000-000000000001	WS002	装配工作站2	assembly	\N	A区1楼	\N	\N	\N	5	0	100.00	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	2026-06-12 08:02:32.073092+00	2026-06-12 08:02:32.073092+00	\N	\N	\N
c8ff36e5-c804-4046-8189-03ee09f554c6	00000000-0000-0000-0000-000000000001	WS003	加工工作站1	machining	\N	B区2楼	\N	\N	\N	3	0	100.00	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	2026-06-12 08:02:32.073092+00	2026-06-12 08:02:32.073092+00	\N	\N	\N
d366e9b7-85e1-4b35-b557-8ef9eb7a86e3	00000000-0000-0000-0000-000000000001	WS004	检测工作站	inspection	\N	C区1楼	\N	\N	\N	2	0	100.00	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	2026-06-12 08:02:32.073092+00	2026-06-12 08:02:32.073092+00	\N	\N	\N
ee9e2d1b-939a-4981-99c3-5ccb6ad68ca4	00000000-0000-0000-0000-000000000001	WS005	包装工作站	packaging	\N	D区1楼	\N	\N	\N	4	0	100.00	\N	\N	\N	\N	\N	\N	available	\N	\N	\N	\N	\N	2026-06-12 08:02:32.073092+00	2026-06-12 08:02:32.073092+00	\N	\N	\N
\.


--
-- Data for Name: audio_recordings; Type: TABLE DATA; Schema: mobile; Owner: topems
--

COPY mobile.audio_recordings (id, title, description, location_lat, location_lng, address, duration_seconds, file_url, recorded_by, recorded_at, created_at) FROM stdin;
\.


--
-- Data for Name: mobile_tasks; Type: TABLE DATA; Schema: mobile; Owner: topems
--

COPY mobile.mobile_tasks (id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: patrol_records; Type: TABLE DATA; Schema: mobile; Owner: topems
--

COPY mobile.patrol_records (id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, checked_at, created_at) FROM stdin;
\.


--
-- Data for Name: photo_evidences; Type: TABLE DATA; Schema: mobile; Owner: topems
--

COPY mobile.photo_evidences (id, title, description, location_lat, location_lng, address, file_url, recorded_by, recorded_at, created_at) FROM stdin;
\.


--
-- Data for Name: scan_records; Type: TABLE DATA; Schema: mobile; Owner: topems
--

COPY mobile.scan_records (id, barcode, location_lat, location_lng, item_type, quantity, operator, scanned_at, created_at) FROM stdin;
\.


--
-- Data for Name: video_recordings; Type: TABLE DATA; Schema: mobile; Owner: topems
--

COPY mobile.video_recordings (id, title, description, start_location_lat, start_location_lng, location_track, duration_seconds, file_url, thumbnail_url, recorded_by, recorded_at, created_at) FROM stdin;
\.


--
-- Data for Name: acceptances; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.acceptances (id, project_id, acceptance_no, acceptance_type, acceptance_date, acceptor, result, comments, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.budgets (id, project_id, budget_type, planned_amount, actual_amount, currency, period, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.contracts (id, project_id, contract_no, contract_name, contract_type, party_a, party_b, amount, currency, sign_date, start_date, end_date, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.documents (id, project_id, document_type, document_name, file_path, file_size, version, author, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.notifications (id, project_id, notification_type, title, content, recipient, sent_at, status, created_at) FROM stdin;
\.


--
-- Data for Name: project_approvals; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_approvals (id, project_id, approval_type, title, description, applicant, approver, status, submitted_at, approved_at, comments, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_benefits; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_benefits (id, project_id, benefit_type, amount, currency, benefit_date, description, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_expenses; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_expenses (id, project_id, expense_type, amount, currency, expense_date, description, status, approver, approved_date, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_members (id, project_id, user_id, user_name, role, join_date, leave_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_milestones (id, project_id, phase_id, name, description, due_date, completed_date, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_phases; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_phases (id, project_id, name, description, status, start_date, end_date, progress, sort_order, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_resources; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_resources (id, project_id, resource_type, resource_name, quantity, unit, cost, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_type_configs; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.project_type_configs (id, type_name, type_code, description, default_phases, default_milestones, default_workflow, is_active, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.projects (id, name, code, description, project_type, status, leader, start_date, end_date, budget, progress, project_config, benefit_target, risk_level, priority, tags, parent_id, workspace_id, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: quality_checks; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.quality_checks (id, project_id, check_type, check_name, check_date, checker, result, issues, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: risks; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.risks (id, project_id, risk_type, risk_name, description, probability, impact, risk_level, mitigation_plan, contingency_plan, owner, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: pm; Owner: topems
--

COPY pm.settlements (id, project_id, settlement_no, settlement_type, settlement_date, amount, currency, status, remarks, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: portal_access_logs; Type: TABLE DATA; Schema: portal; Owner: topems
--

COPY portal.portal_access_logs (id, user_id, session_id, access_time, ip_address, user_agent, access_path, access_method, response_status, response_time, created_at) FROM stdin;
\.


--
-- Data for Name: portal_announcements; Type: TABLE DATA; Schema: portal; Owner: topems
--

COPY portal.portal_announcements (id, title, content, announcement_type, priority, publish_date, expire_date, status, author, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: portal_configs; Type: TABLE DATA; Schema: portal; Owner: topems
--

COPY portal.portal_configs (id, config_key, config_value, config_type, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: portal_layouts; Type: TABLE DATA; Schema: portal; Owner: topems
--

COPY portal.portal_layouts (id, layout_name, layout_type, layout_config, is_default, is_active, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: portal_menus; Type: TABLE DATA; Schema: portal; Owner: topems
--

COPY portal.portal_menus (id, menu_code, menu_name, menu_type, parent_id, path, icon, sort_order, is_visible, is_active, permissions, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: portal; Owner: topems
--

COPY portal.user_preferences (id, user_id, preference_key, preference_value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audio_recordings; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.audio_recordings (id, title, description, location_lat, location_lng, address, duration_seconds, file_url, recorded_by, recorded_at, created_at) FROM stdin;
\.


--
-- Data for Name: business_locations; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.business_locations (id, business_type, business_name, business_code, category, "position", address, contact_person, contact_phone, capacity, current_usage, status, properties, description, external_id, external_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: device_locations; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.device_locations (id, map_id, device_name, device_code, device_type, "position", status, description, last_inspected, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.devices (id, user_id, device_id, device_name, device_type, os_type, os_version, app_version, push_token, is_active, last_login_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: factory_maps; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.factory_maps (id, name, code, map_type, file_url, bounds, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: location_photos; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.location_photos (id, map_id, "position", photo_url, description, taken_by, taken_at, created_at) FROM stdin;
\.


--
-- Data for Name: map_markers; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.map_markers (id, marker_type, name, marker_style, "position", icon_svg, color, size, popup_content, click_action, action_data, visible, z_index, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mobile_scan_records; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.mobile_scan_records (id, user_id, scan_type, scan_data, result_data, location_lat, location_lng, created_at) FROM stdin;
\.


--
-- Data for Name: mobile_tasks; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.mobile_tasks (id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mobile_users; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.mobile_users (id, username, password_hash, nickname, phone, email, avatar_url, department, "position", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.notifications (id, user_id, title, content, notification_type, is_read, data, created_at) FROM stdin;
\.


--
-- Data for Name: offline_sync_records; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.offline_sync_records (id, user_id, sync_type, sync_data, status, synced_count, failed_count, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: patrol_records; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.patrol_records (id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, checked_at, created_at) FROM stdin;
\.


--
-- Data for Name: payment_schedules; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.payment_schedules (id, organization_id, contract_id, payment_number, payment_stage, scheduled_amount, scheduled_date, actual_amount, actual_date, status, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: photo_evidences; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.photo_evidences (id, title, description, location_lat, location_lng, address, file_url, recorded_by, recorded_at, created_at) FROM stdin;
\.


--
-- Data for Name: pipelines; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.pipelines (id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_budget_items; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.project_budget_items (id, organization_id, budget_id, item_name, item_category, budget_amount, used_amount, remaining_amount, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_budgets; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.project_budgets (id, organization_id, project_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: project_contracts; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.project_contracts (id, organization_id, contract_number, project_name, customer_name, contract_amount, signed_date, start_date, end_date, status, contract_type, payment_terms, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.refresh_tokens (id, user_id, refresh_token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: scan_records; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.scan_records (id, barcode, location_lat, location_lng, item_type, quantity, operator, scanned_at, created_at) FROM stdin;
\.


--
-- Data for Name: shortcuts; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.shortcuts (id, user_id, name, icon, action_type, action_params, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.user_settings (id, user_id, language, theme, notification_enabled, sound_enabled, auto_sync, sync_interval, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: video_recordings; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.video_recordings (id, title, description, start_location_lat, start_location_lng, location_track, duration_seconds, file_url, thumbnail_url, recorded_by, recorded_at, created_at) FROM stdin;
\.


--
-- Data for Name: voucher_items; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.voucher_items (id, organization_id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, quantity, unit, price, department_id, project_id, contract_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: warehouse_locations; Type: TABLE DATA; Schema: public; Owner: topems
--

COPY public.warehouse_locations (id, map_id, warehouse_name, zone, "position", capacity, usage_rate, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.audit_logs (id, organization_id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: corrective_actions; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.corrective_actions (id, organization_id, action_number, issue_id, title, description, action_type, category, root_cause_analysis, immediate_action, long_term_action, preventive_action, assigned_to, assigned_to_id, department, planned_start_date, planned_end_date, actual_start_date, actual_end_date, implementation_date, implementation_details, resources_required, estimated_cost, actual_cost, status, progress_percentage, effectiveness, verification_method, verification_criteria, verification_result, verified_by, verified_by_id, verification_date, verification_notes, effectiveness_review_date, effectiveness_result, recurrence_check_date, recurrence_found, follow_up_actions, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: dashboard_metrics; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.dashboard_metrics (id, organization_id, metric_type, metric_name, metric_value, metric_unit, period_type, period_start, period_end, comparison_value, comparison_period_start, comparison_period_end, trend, target_value, achievement_percentage, details, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
e50c8a1c-61fe-4c59-ba6b-9f9af6c7ed4a	00000000-0000-0000-0000-000000000001	inspection	本月检验次数	125.00	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.079282+00	2026-06-12 08:02:36.079282+00	\N	\N	\N
74370e91-d9d7-4411-8f8c-3f72adab0525	00000000-0000-0000-0000-000000000001	inspection	检验合格率	98.50	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.079282+00	2026-06-12 08:02:36.079282+00	\N	\N	\N
f7c24d5a-cbf1-49d3-a81e-7f2aed7082ce	00000000-0000-0000-0000-000000000001	issue	质量问题数	15.00	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.079282+00	2026-06-12 08:02:36.079282+00	\N	\N	\N
d3f1018b-1d88-4650-a95c-bee0e0c37c8d	00000000-0000-0000-0000-000000000001	issue	问题解决率	85.50	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.079282+00	2026-06-12 08:02:36.079282+00	\N	\N	\N
2de82f8a-02af-41d1-8ff2-3194e2feb06a	00000000-0000-0000-0000-000000000001	compliance	合规达标率	99.20	\N	monthly	2026-06-01	2026-06-30	\N	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.079282+00	2026-06-12 08:02:36.079282+00	\N	\N	\N
\.


--
-- Data for Name: inspection_items; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.inspection_items (id, organization_id, inspection_id, item_number, item_name, item_category, specification, requirement, test_method, expected_value, actual_value, tolerance, unit, is_critical, status, result, deviation, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: quality_inspections; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.quality_inspections (id, organization_id, standard_id, inspection_number, title, description, inspection_type, inspection_method, inspection_category, object_type, object_id, object_name, object_batch, inspector, inspector_id, department, location, planned_date, actual_date, start_time, end_time, duration_minutes, status, result, score, pass_rate, total_items, passed_items, failed_items, findings, conclusion, recommendations, risk_level, next_inspection_date, follow_up_required, approved_by, approved_at, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: quality_issues; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.quality_issues (id, organization_id, issue_number, title, description, issue_type, category, severity, priority, status, source, source_reference, related_inspection_id, related_standard_id, affected_object_type, affected_object_id, affected_object_name, affected_batch, affected_quantity, location, discovered_date, discovered_by, reported_date, reported_by, assigned_to, assigned_to_id, assigned_date, due_date, resolved_date, resolution_time_hours, root_cause, impact_analysis, cost_estimate, actual_cost, customer_impacted, customer_name, customer_notification_date, regulatory_impact, regulatory_body, risk_level, recurrence_probability, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: quality_standards; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.quality_standards (id, organization_id, code, name, description, category, version, standard_type, authority, effective_date, expiry_date, requirements, criteria, compliance_level, status, is_mandatory, review_frequency, last_review_date, next_review_date, reviewer, notes, attachments, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
802a5514-5950-4c0f-bd38-328870193f9a	00000000-0000-0000-0000-000000000001	ISO9001	ISO 9001质量管理体系	\N	quality_management	1.0	international	\N	\N	\N	\N	\N	\N	active	t	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.054328+00	2026-06-12 08:02:36.054328+00	\N	\N	\N
414e9c93-eb94-42f7-85c0-dfd5a8ddef95	00000000-0000-0000-0000-000000000001	ISO14001	ISO 14001环境管理体系	\N	environment	1.0	international	\N	\N	\N	\N	\N	\N	active	t	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.054328+00	2026-06-12 08:02:36.054328+00	\N	\N	\N
a16ffedc-8b7e-46e3-8aa0-68a12eeaddf5	00000000-0000-0000-0000-000000000001	QMS-001	企业内部质量标准	\N	internal	1.0	company	\N	\N	\N	\N	\N	\N	active	t	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.054328+00	2026-06-12 08:02:36.054328+00	\N	\N	\N
5fdc82a6-7b5d-4fe7-83e3-1644c75f2a80	00000000-0000-0000-0000-000000000001	QMS-002	产品检验标准	\N	product	1.0	company	\N	\N	\N	\N	\N	\N	active	t	\N	\N	\N	\N	\N	\N	2026-06-12 08:02:36.054328+00	2026-06-12 08:02:36.054328+00	\N	\N	\N
\.


--
-- Data for Name: report_exports; Type: TABLE DATA; Schema: report; Owner: topems
--

COPY report.report_exports (id, report_id, export_format, file_path, file_size, exported_by, exported_at, created_at) FROM stdin;
\.


--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: report; Owner: topems
--

COPY report.report_templates (id, name, report_type, columns, description, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: report_type_configs; Type: TABLE DATA; Schema: report; Owner: topems
--

COPY report.report_type_configs (id, type_code, type_name, module, default_columns, available_filters, is_active, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: report; Owner: topems
--

COPY report.reports (id, config, template_id, data, row_count, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.audit_logs (id, action, entity_type, entity_id, entity_ids, user_id, user_name, request_details, response_details, status, error_message, ip_address, user_agent, created_at) FROM stdin;
6ccd7b6e-ec39-4046-986a-4b266b75e50a	create	project	c0b11e1a-4557-4e74-9403-19d1f7ee7683	\N	\N	\N	{"code": "INT-001", "name": "Integration Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Created by integration test", "project_type": "R_D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "c0b11e1a-4557-4e74-9403-19d1f7ee7683", "code": "INT-001", "name": "Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:25:47.570793Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:25:47.570793Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:25:47.577526+00
1b52af0d-72af-4a6e-b24d-ffd2e005a640	update	project	c0b11e1a-4557-4e74-9403-19d1f7ee7683	\N	\N	\N	{"name": "Updated Integration Test Project", "tags": null, "budget": null, "leader": null, "status": "ACTIVE", "end_date": null, "priority": null, "progress": 25, "parent_id": null, "risk_level": null, "description": null, "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "c0b11e1a-4557-4e74-9403-19d1f7ee7683", "code": "INT-001", "name": "Updated Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "ACTIVE", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 25, "parent_id": null, "created_at": "2026-06-12T08:25:47.570793Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:25:47.590609Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:25:47.591891+00
9042c35d-2867-4689-8969-e78689dd1ba1	delete	project	c0b11e1a-4557-4e74-9403-19d1f7ee7683	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:25:47.593966+00
a276e37d-0d6d-4605-9945-9d22de724a2a	batch_create	project	\N	{"count": 2}	\N	\N	{"count": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:25:48.990214+00
ee99b297-0ace-43b5-84a8-e8ea5f463f30	batch_delete	project	\N	{"ids": ["5149bcce-8e83-4d9c-b203-4d7ca70cde8c", "929415bc-5ede-42cd-aa92-f974558cc93e"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:25:48.997211+00
d44b2d36-03aa-4389-b1c0-92a774c88432	create	project	381f40e4-1814-4106-86d7-6d1457e4b2ee	\N	\N	\N	{"code": "EXPORT-001", "name": "Export Test Project 1", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 1 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "381f40e4-1814-4106-86d7-6d1457e4b2ee", "code": "EXPORT-001", "name": "Export Test Project 1", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:25:50.176667Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:25:50.176667Z", "description": "Project 1 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:25:50.178264+00
f9a81db4-f3ab-40ad-bce2-a01d32c19915	create	project	1b3db9ba-ad81-49bd-b299-b3287df39282	\N	\N	\N	{"code": "EXPORT-002", "name": "Export Test Project 2", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 2 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "1b3db9ba-ad81-49bd-b299-b3287df39282", "code": "EXPORT-002", "name": "Export Test Project 2", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:25:50.180133Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:25:50.180133Z", "description": "Project 2 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:25:50.181339+00
4686dc71-1a27-4f8a-91dc-9c583ad579a2	export	project	\N	\N	\N	\N	\N	{"count": 9, "filename": "projects_20260612_082550.csv"}	success	\N	\N	\N	2026-06-12 08:25:50.183737+00
e152aa20-5f36-4725-aec3-bbdfc51d5cf2	batch_delete	project	\N	{"ids": ["1b3db9ba-ad81-49bd-b299-b3287df39282", "381f40e4-1814-4106-86d7-6d1457e4b2ee"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:25:50.19068+00
6263d870-90b6-4d81-bf18-1c7d9b72c1d6	import	project	\N	\N	\N	\N	{"total_rows": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:25:50.194+00
0ed3ff56-27f4-46cd-a598-d6275da253b1	batch_delete	project	\N	{"ids": ["f0453cea-e5ec-4088-a049-cf91f8726dce", "0d618da8-f929-425b-9db9-15b354bb4b92"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:25:50.198002+00
a0abb5f0-f399-453b-a88e-47cafdd440f1	create	project	c766a097-a8e6-489b-92bc-b782f421ed1d	\N	\N	\N	{"code": "AUDIT-001", "name": "Audit Test Project", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for audit log testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "c766a097-a8e6-489b-92bc-b782f421ed1d", "code": "AUDIT-001", "name": "Audit Test Project", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:25:51.259953Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:25:51.259953Z", "description": "Project for audit log testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:25:51.261549+00
b9480ccb-6589-449b-81a4-62b1c5a1f8d4	delete	project	c766a097-a8e6-489b-92bc-b782f421ed1d	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:25:51.263935+00
a3266773-59de-4ea3-a81f-1228061a0549	batch_delete	project	\N	{"ids": ["73dfbd68-5911-43e6-953a-5388a552811c", "fc5badc1-b79e-4d1e-96d8-c40096df590e"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:34:18.705936+00
58ab0468-dd86-4d84-be1e-c224763d9136	create	project	a4b8500f-41e0-432d-aa52-595bf05f02d3	\N	\N	\N	{"code": "INT-001", "name": "Integration Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Created by integration test", "project_type": "R_D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "a4b8500f-41e0-432d-aa52-595bf05f02d3", "code": "INT-001", "name": "Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:28:08.355599Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:28:08.355599Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:28:08.392563+00
ab49e914-c763-4d94-89e1-a63291352ac5	update	project	a4b8500f-41e0-432d-aa52-595bf05f02d3	\N	\N	\N	{"name": "Updated Integration Test Project", "tags": null, "budget": null, "leader": null, "status": "ACTIVE", "end_date": null, "priority": null, "progress": 25, "parent_id": null, "risk_level": null, "description": null, "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "a4b8500f-41e0-432d-aa52-595bf05f02d3", "code": "INT-001", "name": "Updated Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "ACTIVE", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 25, "parent_id": null, "created_at": "2026-06-12T08:28:08.355599Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:28:08.459475Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:28:08.46471+00
cbe1ec8c-9f3c-4dd5-8288-42021808e3e5	delete	project	a4b8500f-41e0-432d-aa52-595bf05f02d3	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:28:08.473295+00
aac104f7-dae9-469c-8a97-8a825fee1207	batch_create	project	\N	{"count": 2}	\N	\N	{"count": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:28:09.544513+00
3cb54a65-8a30-4474-a091-7ca518da9a90	batch_delete	project	\N	{"ids": ["cb102780-a99b-4fdc-8ff0-df9d6e025ff9", "58952dee-f2f5-4452-bf3d-83842403f798"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:28:09.568855+00
8d6afabc-633c-42c6-b957-a941cbc528bc	create	project	b3e8194b-d4b8-42b4-86b1-e988a38be034	\N	\N	\N	{"code": "EXPORT-001", "name": "Export Test Project 1", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 1 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "b3e8194b-d4b8-42b4-86b1-e988a38be034", "code": "EXPORT-001", "name": "Export Test Project 1", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:28:10.969627Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:28:10.969627Z", "description": "Project 1 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:28:10.973678+00
c52044ee-5863-4d6c-9fd3-e3fe2a061496	create	project	0eef6d2a-e442-4549-9c2d-e463bf78d64d	\N	\N	\N	{"code": "EXPORT-002", "name": "Export Test Project 2", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 2 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "0eef6d2a-e442-4549-9c2d-e463bf78d64d", "code": "EXPORT-002", "name": "Export Test Project 2", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:28:10.976273Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:28:10.976273Z", "description": "Project 2 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:28:10.976955+00
05023b40-524f-46bd-9e97-635870d5ea5d	export	project	\N	\N	\N	\N	\N	{"count": 13, "filename": "projects_20260612_082810.csv"}	success	\N	\N	\N	2026-06-12 08:28:10.980678+00
f652af45-97d1-41bf-881a-eea185c6f10c	batch_delete	project	\N	{"ids": ["0eef6d2a-e442-4549-9c2d-e463bf78d64d", "b3e8194b-d4b8-42b4-86b1-e988a38be034"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:28:10.986964+00
fcb82d89-221d-4f52-8d08-f26ad390ed25	import	project	\N	\N	\N	\N	{"total_rows": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:28:10.992181+00
83266dda-ddd7-4459-bcce-51bf51bc11df	batch_delete	project	\N	{"ids": ["aa15658e-77f1-4041-be0f-d03973d53309", "cef828e4-a59e-4d9d-8f5b-f11af0fadd05"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:28:11.000602+00
c81c625c-f419-4d87-87f5-3b429f6d67c6	create	project	f9a94d2c-d9a4-465c-ad88-dfeab3ff80b2	\N	\N	\N	{"code": "AUDIT-001", "name": "Audit Test Project", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for audit log testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "f9a94d2c-d9a4-465c-ad88-dfeab3ff80b2", "code": "AUDIT-001", "name": "Audit Test Project", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:28:12.610634Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:28:12.610634Z", "description": "Project for audit log testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:28:12.61184+00
20d673c8-9a62-4ae0-b6cd-29d250aa0e67	delete	project	f9a94d2c-d9a4-465c-ad88-dfeab3ff80b2	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:28:12.615286+00
1e2d2797-dd9e-483a-aebd-fbe9c08e2ddb	import	project	\N	\N	\N	\N	{"total_rows": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:34:20.524019+00
9696cd07-c6f3-45fd-bb5f-e13fd5b8b55f	batch_delete	project	\N	{"ids": ["63023c6f-4965-4a46-93d8-4369302daf46", "0a165db8-be95-4efb-8dfa-c02457803afc"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:34:20.536685+00
946c424a-787f-438b-9316-bf13c5f9ebf4	create	project	d4847ceb-4a8e-4f5f-aaca-b9d4e18943a9	\N	\N	\N	{"code": "INT-001", "name": "Integration Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Created by integration test", "project_type": "R_D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "d4847ceb-4a8e-4f5f-aaca-b9d4e18943a9", "code": "INT-001", "name": "Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:29:09.282201Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:29:09.282201Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:29:09.286806+00
16a98054-1f72-4136-b4c6-c1edc98d25ac	batch_create	project	\N	{"count": 2}	\N	\N	{"count": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:29:10.653645+00
c7efa4b0-2ed6-4d00-97d9-ddecfd0ee42d	update	project	d4847ceb-4a8e-4f5f-aaca-b9d4e18943a9	\N	\N	\N	{"name": "Updated Integration Test Project", "tags": null, "budget": null, "leader": null, "status": "ACTIVE", "end_date": null, "priority": null, "progress": 25, "parent_id": null, "risk_level": null, "description": null, "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "d4847ceb-4a8e-4f5f-aaca-b9d4e18943a9", "code": "INT-001", "name": "Updated Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "ACTIVE", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 25, "parent_id": null, "created_at": "2026-06-12T08:29:09.282201Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:29:09.298734Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:29:09.299417+00
c30f8f63-38e2-4650-993d-87d77bcdb834	delete	project	d4847ceb-4a8e-4f5f-aaca-b9d4e18943a9	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:29:09.301742+00
55056bfc-9767-4860-95e2-a6d9f322bb32	create	project	dec60fd8-f36c-4cce-b86e-7897fd4d8a7a	\N	\N	\N	{"code": "INT-001", "name": "Integration Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Created by integration test", "project_type": "R_D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "dec60fd8-f36c-4cce-b86e-7897fd4d8a7a", "code": "INT-001", "name": "Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:31:47.600698Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:31:47.600698Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:31:47.628171+00
78e7c724-4514-459e-9541-2bd1ce68b751	update	project	dec60fd8-f36c-4cce-b86e-7897fd4d8a7a	\N	\N	\N	{"name": "Updated Integration Test Project", "tags": null, "budget": null, "leader": null, "status": "ACTIVE", "end_date": null, "priority": null, "progress": 25, "parent_id": null, "risk_level": null, "description": null, "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "dec60fd8-f36c-4cce-b86e-7897fd4d8a7a", "code": "INT-001", "name": "Updated Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "ACTIVE", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 25, "parent_id": null, "created_at": "2026-06-12T08:31:47.600698Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:31:47.681043Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:31:47.689911+00
164cbe44-cc5c-4446-a1c6-55ae51e14b15	delete	project	dec60fd8-f36c-4cce-b86e-7897fd4d8a7a	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:31:47.703158+00
30719467-e5ad-4254-becf-571725989ee3	batch_create	project	\N	{"count": 2}	\N	\N	{"count": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:31:49.392677+00
3f6b5141-16fc-400a-b231-f7ada7a654b7	batch_delete	project	\N	{"ids": ["a34e70eb-d33d-4086-aeb8-ff7d2f313e9f", "c7912b81-ee1c-4e7f-8438-c7b9e899cc2e", "b81a7020-8812-477e-a717-e152c5426b52", "90c3ae34-6cf1-40c7-8433-7da49d9ce549"]}	\N	\N	\N	{"total": 4, "errors": [], "failed": 0, "success": 4}	success	\N	\N	\N	2026-06-12 08:31:49.427541+00
452dd3ae-4a78-4a14-9cc3-5fa4c8a76778	create	project	f1135949-a28d-4fee-93d8-0a7016a92315	\N	\N	\N	{"code": "EXPORT-001", "name": "Export Test Project 1", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 1 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "f1135949-a28d-4fee-93d8-0a7016a92315", "code": "EXPORT-001", "name": "Export Test Project 1", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:31:50.976260Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:31:50.976260Z", "description": "Project 1 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:31:50.978255+00
79a11394-0bc1-4266-8999-90c3a18ccc66	create	project	c2649242-8c11-48c8-adc6-dd976964fa49	\N	\N	\N	{"code": "EXPORT-002", "name": "Export Test Project 2", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 2 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "c2649242-8c11-48c8-adc6-dd976964fa49", "code": "EXPORT-002", "name": "Export Test Project 2", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:31:50.980594Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:31:50.980594Z", "description": "Project 2 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:31:50.982033+00
4d69c0bd-2d8c-44db-af60-be5a0d0f56aa	export	project	\N	\N	\N	\N	\N	{"count": 14, "filename": "projects_20260612_083150.csv"}	success	\N	\N	\N	2026-06-12 08:31:50.985994+00
091fb0ab-3539-4c03-824b-d46c6ac4a434	batch_delete	project	\N	{"ids": ["c2649242-8c11-48c8-adc6-dd976964fa49", "f1135949-a28d-4fee-93d8-0a7016a92315"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:31:50.992898+00
fdef8430-52f3-4c00-8b10-1ba7ad6682d2	import	project	\N	\N	\N	\N	{"total_rows": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:31:50.99852+00
99ce021e-3e60-49a8-9046-6092b800478d	batch_delete	project	\N	{"ids": ["773da783-e9ac-4900-abc2-fe74cc21ad17", "b9526197-2721-4ab8-8f24-b6ddf12a4951"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:31:51.007755+00
33bc455e-0641-4454-b77e-49472d4836d9	create	project	9732f24d-b6e3-4b83-98fa-d98651b81c29	\N	\N	\N	{"code": "AUDIT-001", "name": "Audit Test Project", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for audit log testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "9732f24d-b6e3-4b83-98fa-d98651b81c29", "code": "AUDIT-001", "name": "Audit Test Project", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:31:52.729820Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:31:52.729820Z", "description": "Project for audit log testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:31:52.73181+00
3ead8b7d-ebf5-48b7-9902-cc5b78134a67	delete	project	9732f24d-b6e3-4b83-98fa-d98651b81c29	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:31:52.738711+00
81fe83d2-239e-41d4-a6d1-98e03b5e1554	create	project	78c6d469-61b4-45e3-b1ba-59f0747b6919	\N	\N	\N	{"code": "PHASE-001", "name": "Test Phase Project", "tags": null, "budget": null, "leader": "admin", "end_date": null, "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": null, "project_type": "R_D", "team_members": ["admin"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "78c6d469-61b4-45e3-b1ba-59f0747b6919", "code": "PHASE-001", "name": "Test Phase Project", "tags": [], "budget": null, "leader": "admin", "status": "draft", "end_date": null, "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:32:20.577976Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:32:20.577976Z", "description": null, "project_type": "R&D", "team_members": ["admin"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	curl/8.7.1	2026-06-12 08:32:20.58046+00
6ae6400e-35a5-44cd-b77d-8a12c10e1b77	create	project	1b315458-5ff8-401b-9c17-26d1c69bd97b	\N	\N	\N	{"code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": null, "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for phase testing", "project_type": "R_D", "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "1b315458-5ff8-401b-9c17-26d1c69bd97b", "code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": null, "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:31:57.616791Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:31:57.616791Z", "description": "Project for phase testing", "project_type": "R&D", "team_members": null, "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:31:57.619052+00
7e22dfc8-3273-4c08-97a3-238357d513d4	create	project	52350a5f-8a85-4c1e-ad80-530735f5bbeb	\N	\N	\N	{"code": "INT-001", "name": "Integration Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Created by integration test", "project_type": "R_D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "52350a5f-8a85-4c1e-ad80-530735f5bbeb", "code": "INT-001", "name": "Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:00.468326Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:00.468326Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:00.474282+00
722cdb1b-774b-4edb-a018-aba1bcecdce9	update	project	52350a5f-8a85-4c1e-ad80-530735f5bbeb	\N	\N	\N	{"name": "Updated Integration Test Project", "tags": null, "budget": null, "leader": null, "status": "ACTIVE", "end_date": null, "priority": null, "progress": 25, "parent_id": null, "risk_level": null, "description": null, "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "52350a5f-8a85-4c1e-ad80-530735f5bbeb", "code": "INT-001", "name": "Updated Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "ACTIVE", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 25, "parent_id": null, "created_at": "2026-06-12T08:33:00.468326Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:00.486984Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:00.4882+00
9b597302-66a7-4a63-9e93-c23ac3a3b837	delete	project	52350a5f-8a85-4c1e-ad80-530735f5bbeb	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:33:00.491681+00
93491b9c-e66f-4d71-ba73-4b3dc7f396fa	batch_create	project	\N	{"count": 2}	\N	\N	{"count": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:02.06662+00
4d0f5f14-1668-4d86-8bbb-1c2dbd2d74cd	batch_delete	project	\N	{"ids": ["0371c2de-e5b2-4f12-b9c3-9f1f31b9c037", "25149a8a-227a-4811-8f24-5e8d705b6439"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:02.07671+00
1d9fef36-4c0d-44e7-ab7d-67c31bb9320a	create	project	6bd18b3d-9808-4687-a578-437d2e3c813d	\N	\N	\N	{"code": "EXPORT-001", "name": "Export Test Project 1", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 1 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "6bd18b3d-9808-4687-a578-437d2e3c813d", "code": "EXPORT-001", "name": "Export Test Project 1", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:03.553772Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:03.553772Z", "description": "Project 1 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:03.556085+00
c4fd6711-8b60-4111-9aa6-274fd6590b3b	create	project	2be8e7cf-f657-4b81-abe7-39d948501437	\N	\N	\N	{"code": "EXPORT-002", "name": "Export Test Project 2", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 2 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "2be8e7cf-f657-4b81-abe7-39d948501437", "code": "EXPORT-002", "name": "Export Test Project 2", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:03.558149Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:03.558149Z", "description": "Project 2 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:03.55906+00
50b03dc1-00f2-4d41-9d7b-ba4a47dc8a13	export	project	\N	\N	\N	\N	\N	{"count": 16, "filename": "projects_20260612_083303.csv"}	success	\N	\N	\N	2026-06-12 08:33:03.562037+00
35c0498b-a1f2-4d67-97ca-32d696c789ad	batch_delete	project	\N	{"ids": ["2be8e7cf-f657-4b81-abe7-39d948501437", "6bd18b3d-9808-4687-a578-437d2e3c813d"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:03.568513+00
8811f495-0af8-4430-8dbc-a0b7962a66c3	import	project	\N	\N	\N	\N	{"total_rows": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:03.573338+00
1aa82e8c-9630-42e8-960e-1b4bf14d650a	batch_delete	project	\N	{"ids": ["88dc0b0f-5772-4bbe-83fc-9b102f7acd16", "a7159d67-0b24-4f3c-9151-427f21f06808"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:03.579694+00
d20c23f8-7214-439f-bccf-823de2861d02	create	project	52667d07-0401-49f7-9fec-51b9d4fb992b	\N	\N	\N	{"code": "AUDIT-001", "name": "Audit Test Project", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for audit log testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "52667d07-0401-49f7-9fec-51b9d4fb992b", "code": "AUDIT-001", "name": "Audit Test Project", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:04.811722Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:04.811722Z", "description": "Project for audit log testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:04.813128+00
dd1a1849-af05-4af6-b138-c6a33ba58017	delete	project	52667d07-0401-49f7-9fec-51b9d4fb992b	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:33:04.816323+00
cd213f7e-96f9-48bb-bb99-8ba8e4a897f4	create	project	a0415fcc-b51c-4234-b94a-bb1e94c094bf	\N	\N	\N	{"code": "INT-001", "name": "Integration Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Created by integration test", "project_type": "R_D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "a0415fcc-b51c-4234-b94a-bb1e94c094bf", "code": "INT-001", "name": "Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:38.014932Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:38.014932Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:38.018197+00
c0700916-d85e-4d1c-b5f4-7dcf6458e36b	update	project	a0415fcc-b51c-4234-b94a-bb1e94c094bf	\N	\N	\N	{"name": "Updated Integration Test Project", "tags": null, "budget": null, "leader": null, "status": "ACTIVE", "end_date": null, "priority": null, "progress": 25, "parent_id": null, "risk_level": null, "description": null, "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "a0415fcc-b51c-4234-b94a-bb1e94c094bf", "code": "INT-001", "name": "Updated Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "ACTIVE", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 25, "parent_id": null, "created_at": "2026-06-12T08:33:38.014932Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:38.028295Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:38.029582+00
a65d2e79-96ca-4a7d-b491-dbebe07a2b71	delete	project	a0415fcc-b51c-4234-b94a-bb1e94c094bf	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:33:38.034998+00
e539cb64-53b6-44f0-af09-5bc90712d9ff	import	project	\N	\N	\N	\N	{"total_rows": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:41.477389+00
1a89cfa6-3a9c-4f4a-8ee6-cd652fe96174	batch_delete	project	\N	{"ids": ["39f14f8e-f341-4f89-a0a0-d660aab4d284", "976ab6ad-0d72-479b-9a58-1e2c8d1891cc"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:41.484091+00
b8db3de5-a840-4fa8-baa8-07c6781b8212	create	project	7b2e94e5-6f97-4ce5-bc7c-e75d87f2d1a3	\N	\N	\N	{"code": "AUDIT-001", "name": "Audit Test Project", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for audit log testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "7b2e94e5-6f97-4ce5-bc7c-e75d87f2d1a3", "code": "AUDIT-001", "name": "Audit Test Project", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:42.791636Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:42.791636Z", "description": "Project for audit log testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:42.79311+00
fec6d6ca-dcbd-419f-b708-37a82a46afff	delete	project	7b2e94e5-6f97-4ce5-bc7c-e75d87f2d1a3	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:33:42.795723+00
dddd4664-0cb1-46a0-9d9c-fcb2b7b0feda	create	project	52e79e56-c610-4da1-b014-7bcda72ad1e0	\N	\N	\N	{"code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": null, "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for phase testing", "project_type": "R_D", "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "52e79e56-c610-4da1-b014-7bcda72ad1e0", "code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": null, "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:08.307951Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:08.307951Z", "description": "Project for phase testing", "project_type": "R&D", "team_members": null, "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:08.310418+00
0e0f7d62-4e0a-4787-8616-e7551f8f9bfa	batch_create	project	\N	{"count": 2}	\N	\N	{"count": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:39.731647+00
0ab579ea-ab7c-4df5-b5bd-9af8f97bed98	batch_delete	project	\N	{"ids": ["740190ba-8fdb-469a-8532-bad47a15f2f2", "f64c6542-585b-461d-bea1-89b8a864cfad"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:39.738945+00
fdb5ca24-6037-4b8d-b2d7-e0c9cda010b3	create	project	6be9455b-88e6-4b8e-bc1e-4a1a75067dce	\N	\N	\N	{"code": "EXPORT-001", "name": "Export Test Project 1", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 1 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "6be9455b-88e6-4b8e-bc1e-4a1a75067dce", "code": "EXPORT-001", "name": "Export Test Project 1", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:41.455504Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:41.455504Z", "description": "Project 1 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:41.457604+00
d56ba5f0-772d-4ab5-abe5-9ff5f78964be	create	project	6b791cdd-9852-4f9f-9732-f0888f3f476c	\N	\N	\N	{"code": "EXPORT-002", "name": "Export Test Project 2", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 2 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "6b791cdd-9852-4f9f-9732-f0888f3f476c", "code": "EXPORT-002", "name": "Export Test Project 2", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:41.459350Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:41.459350Z", "description": "Project 2 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:41.460547+00
c8ed8ff6-a472-461c-8059-6d145af3410b	export	project	\N	\N	\N	\N	\N	{"count": 17, "filename": "projects_20260612_083341.csv"}	success	\N	\N	\N	2026-06-12 08:33:41.463662+00
7a6e6c11-4dfc-4c99-a027-0213f4ae4d29	batch_delete	project	\N	{"ids": ["6b791cdd-9852-4f9f-9732-f0888f3f476c", "6be9455b-88e6-4b8e-bc1e-4a1a75067dce"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:33:41.473579+00
ee4d5d74-037d-4c09-a8a7-b0fbf1e9380e	create	project	e9e6d5a2-e7e3-4761-85e6-97df1e6edd81	\N	\N	\N	{"code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": null, "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for phase testing", "project_type": "R_D", "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "e9e6d5a2-e7e3-4761-85e6-97df1e6edd81", "code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": null, "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:33:45.922202Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:33:45.922202Z", "description": "Project for phase testing", "project_type": "R&D", "team_members": null, "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:33:45.924272+00
887bd2a7-0b7f-443b-95fe-988777d5141e	create	project	6d6ed98a-2c80-46a0-ad09-851f8f68038a	\N	\N	\N	{"code": "INT-001", "name": "Integration Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Created by integration test", "project_type": "R_D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "6d6ed98a-2c80-46a0-ad09-851f8f68038a", "code": "INT-001", "name": "Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:34:16.912666Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:34:16.912666Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:34:16.943647+00
e51d6046-a727-40e3-9922-832ab3535d6f	update	project	6d6ed98a-2c80-46a0-ad09-851f8f68038a	\N	\N	\N	{"name": "Updated Integration Test Project", "tags": null, "budget": null, "leader": null, "status": "ACTIVE", "end_date": null, "priority": null, "progress": 25, "parent_id": null, "risk_level": null, "description": null, "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "6d6ed98a-2c80-46a0-ad09-851f8f68038a", "code": "INT-001", "name": "Updated Integration Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "ACTIVE", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 25, "parent_id": null, "created_at": "2026-06-12T08:34:16.912666Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:34:17.006555Z", "description": "Created by integration test", "project_type": "R&D", "team_members": ["user1", "user2"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:34:17.01596+00
3ba65fd6-53cd-4200-8ba5-28ffb6495ffb	delete	project	6d6ed98a-2c80-46a0-ad09-851f8f68038a	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:34:17.027661+00
41574ab6-b863-4f3d-82e5-4fb51c2ea669	batch_create	project	\N	{"count": 2}	\N	\N	{"count": 2}	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:34:18.674538+00
0dfb225e-7685-4121-9a5d-511fab7ddb76	create	project	60cf5624-dd5a-4043-82d0-c58aa7feb2b0	\N	\N	\N	{"code": "EXPORT-001", "name": "Export Test Project 1", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 1 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "60cf5624-dd5a-4043-82d0-c58aa7feb2b0", "code": "EXPORT-001", "name": "Export Test Project 1", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:34:20.495188Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:34:20.495188Z", "description": "Project 1 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:34:20.497502+00
716b98b3-219e-403d-bad0-ba4cf21b761f	create	project	a4d28bc6-12f2-45fb-977a-48cc55ad3437	\N	\N	\N	{"code": "EXPORT-002", "name": "Export Test Project 2", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project 2 for export testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "a4d28bc6-12f2-45fb-977a-48cc55ad3437", "code": "EXPORT-002", "name": "Export Test Project 2", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:34:20.502494Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:34:20.502494Z", "description": "Project 2 for export testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:34:20.503557+00
9f6c9822-81df-47d5-9301-9c73bf49efd8	export	project	\N	\N	\N	\N	\N	{"count": 18, "filename": "projects_20260612_083420.csv"}	success	\N	\N	\N	2026-06-12 08:34:20.507538+00
8ef7a572-350b-4d2e-8b3d-c4ddcc8ac55f	batch_delete	project	\N	{"ids": ["a4d28bc6-12f2-45fb-977a-48cc55ad3437", "60cf5624-dd5a-4043-82d0-c58aa7feb2b0"]}	\N	\N	\N	{"total": 2, "errors": [], "failed": 0, "success": 2}	success	\N	\N	\N	2026-06-12 08:34:20.515638+00
1ba8a4b4-dad9-4103-8d3d-7f2b20f63abb	create	project	afa19105-66cf-4e86-96b3-0df2383fbc5f	\N	\N	\N	{"code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": null, "budget": 100000.0, "leader": "admin", "end_date": null, "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for phase testing", "project_type": "R_D", "team_members": null, "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "afa19105-66cf-4e86-96b3-0df2383fbc5f", "code": "PHASE-TEST-001", "name": "Phase Test Project", "tags": [], "budget": 100000.0, "leader": "admin", "status": "draft", "end_date": null, "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:34:27.180418Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:34:27.180418Z", "description": "Project for phase testing", "project_type": "R&D", "team_members": null, "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:34:27.1828+00
4afbef74-5925-4e52-8ed5-db68c46f7041	create	project	6cfe41b4-5623-4655-b2b0-32f76853727b	\N	\N	\N	{"code": "AUDIT-001", "name": "Audit Test Project", "tags": null, "budget": 50000.0, "leader": "admin", "end_date": "2024-12-31T23:59:59Z", "priority": null, "parent_id": null, "risk_level": null, "start_date": "2024-01-01T00:00:00Z", "description": "Project for audit log testing", "project_type": "R_D", "team_members": ["user1"], "workspace_id": null, "benefit_target": null, "project_config": null}	{"id": "6cfe41b4-5623-4655-b2b0-32f76853727b", "code": "AUDIT-001", "name": "Audit Test Project", "tags": [], "budget": 50000.0, "leader": "admin", "status": "draft", "end_date": "2024-12-31T23:59:59Z", "priority": 3, "progress": 0, "parent_id": null, "created_at": "2026-06-12T08:34:22.579742Z", "created_by": "admin", "risk_level": "MEDIUM", "start_date": "2024-01-01T00:00:00Z", "updated_at": "2026-06-12T08:34:22.579742Z", "description": "Project for audit log testing", "project_type": "R&D", "team_members": ["user1"], "workspace_id": null, "benefit_target": {}, "project_config": {}}	success	\N	\N	\N	2026-06-12 08:34:22.582319+00
d60df8fb-19c3-496f-b7c4-0014b8a6e332	delete	project	6cfe41b4-5623-4655-b2b0-32f76853727b	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:34:22.58957+00
e3756358-1c87-4e3f-9b25-1bcba85515fb	delete	project	afa19105-66cf-4e86-96b3-0df2383fbc5f	\N	\N	\N	\N	{"rows_affected": 1}	success	\N	\N	\N	2026-06-12 08:34:27.222093+00
\.


--
-- Data for Name: experiments; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.experiments (id, name, code, project_id, formula_id, experiment_type, phase, status, objective, method, results, conclusions, experimenter, batch_number, scale, scale_unit, started_at, completed_at, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: formula_versions; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.formula_versions (id, formula_id, version, ingredients, process_steps, process_params, properties, changes, approval_status, approved_by, approved_at, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: formulas; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.formulas (id, name, code, version, category, description, project_id, status, approval_status, approved_by, approved_at, effective_date, expiration_date, ingredients, process_steps, properties, created_by, created_at, updated_at, components) FROM stdin;
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.project_members (id, project_id, employee_id, role, responsibility, allocation, join_date, leave_date, status, hourly_rate, cost_rate, budgeted_hours, actual_hours, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.project_milestones (id, project_id, phase_id, name, description, target_date, actual_date, status, created_at, updated_at, deliverable_type, acceptance_criteria, acceptance_status, accepted_by, accepted_at) FROM stdin;
\.


--
-- Data for Name: project_phases; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.project_phases (id, project_id, phase_number, name, description, start_date, end_date, planned_duration_days, actual_duration_days, status, progress, predecessor_id, created_at, updated_at, weight) FROM stdin;
aa6f3929-cf82-49da-a391-5e0ebf65366c	52e79e56-c610-4da1-b014-7bcda72ad1e0	1	Requirements Phase	Gather requirements	2024-01-01 00:00:00+00	2024-02-15 23:59:59+00	\N	\N	not_started	0	\N	2026-06-12 08:33:08.313972+00	2026-06-12 08:33:08.313972+00	0
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.projects (id, name, code, description, project_type, status, leader, team_members, start_date, end_date, budget, progress, created_by, created_at, updated_at, project_config, benefit_target, risk_level, priority, tags, parent_id, workspace_id) FROM stdin;
78c6d469-61b4-45e3-b1ba-59f0747b6919	Test Phase Project	PHASE-001	\N	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	\N	\N	0	admin	2026-06-12 08:32:20.577976+00	2026-06-12 08:32:20.577976+00	{}	{}	MEDIUM	3	[]	\N	\N
efe2035e-2638-4f41-822a-5e32e3bc4503	Integration Test Project	INT-001	Created by integration test	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	2024-12-31 23:59:59+00	100000	0	admin	2026-06-12 08:09:00.036002+00	2026-06-12 08:09:00.036002+00	{}	{}	MEDIUM	2	[]	\N	\N
30b8de98-be45-49c1-a20b-890222449baf	Integration Test Project	INT-001	Created by integration test	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	2024-12-31 23:59:59+00	100000	0	admin	2026-06-12 08:10:48.898922+00	2026-06-12 08:10:48.898922+00	{}	{}	MEDIUM	3	[]	\N	\N
406d1c5c-b51b-4fb1-b5cd-badf75805ab7	Integration Test Project	INT-001	Created by integration test	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	2024-12-31 23:59:59+00	100000	0	admin	2026-06-12 08:11:32.894758+00	2026-06-12 08:11:32.894758+00	{}	{}	MEDIUM	3	[]	\N	\N
036e64d0-803b-4e24-a84c-09749c5d9ed9	Integration Test Project	INT-001	Created by integration test	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	2024-12-31 23:59:59+00	100000	0	admin	2026-06-12 08:12:12.013538+00	2026-06-12 08:12:12.013538+00	{}	{}	MEDIUM	3	[]	\N	\N
832d57f5-a44d-46b2-9d2d-21ab66b72d2b	Integration Test Project	INT-001	Created by integration test	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	2024-12-31 23:59:59+00	100000	0	admin	2026-06-12 08:13:15.676855+00	2026-06-12 08:13:15.676855+00	{}	{}	MEDIUM	3	[]	\N	\N
d129be0b-ba54-4081-9fdf-2f3c1f04b0bd	Integration Test Project	INT-001	Created by integration test	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	2024-12-31 23:59:59+00	100000	0	admin	2026-06-12 08:14:33.230353+00	2026-06-12 08:14:33.230353+00	{}	{}	MEDIUM	3	[]	\N	\N
08137946-a2b8-4a69-8062-00948872fb93	Final Test Project	FINAL-001	Final integration test	R&D	draft	admin	["admin"]	2024-01-01 00:00:00+00	\N	50000	0	admin	2026-06-12 08:22:58.796972+00	2026-06-12 08:22:58.796972+00	{}	{}	MEDIUM	3	[]	\N	\N
3c269b8d-df00-4ee3-a64a-81587633a5b1	测试项目	RS-TEST-3c269b	\N	新产品研发	draft	测试负责人	[]	2026-06-12 08:25:52.009877+00	\N	\N	0	测试负责人	2026-06-12 08:25:52.017377+00	2026-06-12 08:25:52.017377+00	{}	{}	MEDIUM	3	[]	\N	\N
9d1b6f71-1d04-4bb5-8f34-0d0acba63710	测试里程碑项目	RS-MS-9d1b6f	\N	新产品研发	draft	测试负责人	[]	2026-06-12 08:25:52.24385+00	\N	\N	0	测试负责人	2026-06-12 08:25:52.262737+00	2026-06-12 08:25:52.262737+00	{}	{}	MEDIUM	3	[]	\N	\N
697ff30b-2525-4ac9-8def-2239d677f7e1	测试阶段项目	RS-PHASE-697ff3	\N	新产品研发	draft	测试负责人	[]	2026-06-12 08:25:52.385674+00	\N	\N	0	测试负责人	2026-06-12 08:25:52.397627+00	2026-06-12 08:25:52.397627+00	{}	{}	MEDIUM	3	[]	\N	\N
b3fd791e-f4a7-47d3-9479-cb10cedcbba2	测试阶段推进项目	RS-PHASE-ADV-b3fd79	\N	新产品研发	draft	测试负责人	[]	2026-06-12 08:25:52.533527+00	\N	\N	0	测试负责人	2026-06-12 08:25:52.545064+00	2026-06-12 08:25:52.545064+00	{}	{}	MEDIUM	3	[]	\N	\N
1b315458-5ff8-401b-9c17-26d1c69bd97b	Phase Test Project	PHASE-TEST-001	Project for phase testing	R&D	draft	admin	null	2024-01-01 00:00:00+00	\N	100000	0	admin	2026-06-12 08:31:57.616791+00	2026-06-12 08:31:57.616791+00	{}	{}	MEDIUM	3	[]	\N	\N
8a6089d1-4af4-43eb-a072-db202ada4235	测试阶段推进项目	RS-PHASE-ADV-8a6089	\N	新产品研发	draft	测试负责人	\N	2026-06-12 08:28:13.824825+00	\N	\N	0	测试负责人	2026-06-12 08:28:13.833043+00	2026-06-12 08:28:13.833043+00	{}	{}	MEDIUM	3	[]	\N	\N
52e79e56-c610-4da1-b014-7bcda72ad1e0	Phase Test Project	PHASE-TEST-001	Project for phase testing	R&D	draft	admin	null	2024-01-01 00:00:00+00	\N	100000	0	admin	2026-06-12 08:33:08.307951+00	2026-06-12 08:33:08.307951+00	{}	{}	MEDIUM	3	[]	\N	\N
e9e6d5a2-e7e3-4761-85e6-97df1e6edd81	Phase Test Project	PHASE-TEST-001	Project for phase testing	R&D	draft	admin	null	2024-01-01 00:00:00+00	\N	100000	0	admin	2026-06-12 08:33:45.922202+00	2026-06-12 08:33:45.922202+00	{}	{}	MEDIUM	3	[]	\N	\N
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: rs_test; Owner: topems
--

COPY rs_test.projects (id, name, code, description, project_type, status, leader, team_members, start_date, end_date, budget, progress, created_by, created_at, updated_at, project_config, benefit_target, risk_level, priority, tags, parent_id, workspace_id) FROM stdin;
3e36b251-3972-4df7-9732-1e7be2c7649e	List Project 1	LIST-001	\N	R&D	draft	admin	null	2026-06-12 08:34:14.940678+00	\N	\N	0	admin	2026-06-12 08:34:14.940682+00	2026-06-12 08:34:14.940682+00	\N	\N	\N	\N	\N	\N	\N
b06f7c50-006a-48ba-9d81-1906a1b044ce	List Project 2	LIST-002	\N	R&D	draft	admin	null	2026-06-12 08:34:14.969668+00	\N	\N	0	admin	2026-06-12 08:34:14.969672+00	2026-06-12 08:34:14.969672+00	\N	\N	\N	\N	\N	\N	\N
b55af210-3149-4dfb-a404-4345d693ea6b	List Project 3	LIST-003	\N	R&D	draft	admin	null	2026-06-12 08:34:14.986066+00	\N	\N	0	admin	2026-06-12 08:34:14.98607+00	2026-06-12 08:34:14.98607+00	\N	\N	\N	\N	\N	\N	\N
aa84e00a-5547-4224-a06f-70fd1822d728	List Project 4	LIST-004	\N	R&D	draft	admin	null	2026-06-12 08:34:14.987329+00	\N	\N	0	admin	2026-06-12 08:34:14.987334+00	2026-06-12 08:34:14.987334+00	\N	\N	\N	\N	\N	\N	\N
232235fb-5581-4414-bc71-b69a1f894b32	List Project 5	LIST-005	\N	R&D	draft	admin	null	2026-06-12 08:34:14.988379+00	\N	\N	0	admin	2026-06-12 08:34:14.988383+00	2026-06-12 08:34:14.988383+00	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: scm; Owner: topems
--

COPY scm.audit_logs (id, table_name, record_id, action, old_values, new_values, changed_by, changed_at, ip_address, user_agent, organization_id) FROM stdin;
\.


--
-- Data for Name: purchase_items; Type: TABLE DATA; Schema: scm; Owner: topems
--

COPY scm.purchase_items (id, order_id, item_no, item_name, specification, unit, quantity, unit_price, total_price, received_quantity, status, remarks, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: scm; Owner: topems
--

COPY scm.purchase_orders (id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: supplier_evaluations; Type: TABLE DATA; Schema: scm; Owner: topems
--

COPY scm.supplier_evaluations (id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: scm; Owner: topems
--

COPY scm.suppliers (id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, bank_name, bank_account, remarks, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: shared; Owner: topems
--

COPY shared.companies (id, name, short_name, tax_id, registered_address, business_scope, industry, scale, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: shared; Owner: topems
--

COPY shared.departments (id, company_id, parent_id, name, code, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: shared; Owner: topems
--

COPY shared.employees (id, company_id, department_id, position_id, employee_no, name, gender, email, phone, hire_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: id_records; Type: TABLE DATA; Schema: shared; Owner: topems
--

COPY shared.id_records (id, id_type, entity_type, entity_id, company_id, created_by, created_at, metadata) FROM stdin;
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: shared; Owner: topems
--

COPY shared.positions (id, company_id, name, code, level, department_id, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_params; Type: TABLE DATA; Schema: shared; Owner: topems
--

COPY shared.system_params (id, param_key, param_value, param_type, description, module, created_at, updated_at) FROM stdin;
b810d46f-d5c9-483f-8b04-4ad9c13d9707	system.name	TOPEMS	string	系统名称	system	2026-06-12 08:02:27.712803	2026-06-12 08:02:27.712803
9fb003bb-13db-43e5-9f55-828d0e3a911a	system.version	2.0.0	string	系统版本	system	2026-06-12 08:02:27.712803	2026-06-12 08:02:27.712803
3305fb8a-f317-4e43-b5a6-de530190b57f	erp.default_period	202601	string	ERP默认期间	erp	2026-06-12 08:02:27.712803	2026-06-12 08:02:27.712803
398f97d4-f8bc-46de-9762-2254eeacc29f	hrm.work_hours_per_day	8	integer	每日工作小时数	hrm	2026-06-12 08:02:27.712803	2026-06-12 08:02:27.712803
\.


--
-- Data for Name: user_employee_map; Type: TABLE DATA; Schema: shared; Owner: topems
--

COPY shared.user_employee_map (user_id, employee_id, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.audit_logs (id, table_name, record_id, action, old_values, new_values, changed_by, changed_at, ip_address, user_agent, organization_id) FROM stdin;
\.


--
-- Data for Name: contract_terms; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.contract_terms (id, contract_id, term_type, title, content, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.purchase_orders (id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: supplier_categories; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.supplier_categories (id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: supplier_contracts; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.supplier_contracts (id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: supplier_evaluations; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.supplier_evaluations (id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: supplier_products; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.supplier_products (id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.suppliers (id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: backends; Type: TABLE DATA; Schema: storage; Owner: topems
--

COPY storage.backends (id, name, backend_type, is_active, config, created_at, updated_at) FROM stdin;
704b1693-b551-4b19-a406-8da062f8f27e	local	local	t	{"base_path": "./storage/files", "max_file_size": 104857600}	2026-06-12 08:02:28.924177+00	2026-06-12 08:02:28.924177+00
\.


--
-- Data for Name: file_permissions; Type: TABLE DATA; Schema: storage; Owner: topems
--

COPY storage.file_permissions (id, file_id, principal_type, principal_id, permission, granted_by, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: storage; Owner: topems
--

COPY storage.files (id, owner_id, owner_department_id, filename, storage_path, file_size, content_type, file_type, category, version, parent_id, vector_status, vector_document_id, is_shared, visibility, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.audit_logs (id, organization_id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: inbound_order_items; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.inbound_order_items (id, organization_id, order_id, line_number, material_code, material_name, material_type, specification, batch_number, lot_number, serial_number, expected_quantity, received_quantity, rejected_quantity, unit, location_id, location_code, location_name, quality_status, production_date, expiry_date, supplier_batch, unit_price, total_value, weight, volume, inspection_required, inspection_status, inspection_result, inspector, inspection_date, inspection_notes, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: inbound_orders; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.inbound_orders (id, organization_id, order_number, order_type, reference_number, reference_type, warehouse_id, warehouse_name, supplier_id, supplier_name, supplier_code, purchase_order_id, purchase_order_number, production_order_id, production_order_number, customer_id, customer_name, customer_order_number, expected_arrival_date, actual_arrival_date, arrival_time, received_date, received_time, carrier, carrier_code, vehicle_number, driver_name, driver_phone, total_items, total_quantity, received_quantity, rejected_quantity, total_weight, total_volume, total_value, priority, status, receiver, receiver_id, receiving_team, inspection_required, inspection_status, inspection_result, inspector, inspection_date, quality_check_notes, receiving_notes, special_instructions, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.inventory (id, organization_id, warehouse_id, location_id, material_code, material_name, material_type, material_category, specification, batch_number, lot_number, serial_number, quantity, unit, available_quantity, reserved_quantity, in_transit_quantity, quality_status, production_date, expiry_date, shelf_life_days, days_to_expiry, supplier_id, supplier_name, supplier_code, purchase_order_number, purchase_price, total_value, cost_method, standard_cost, average_cost, last_movement_date, last_movement_type, movement_count, min_quantity, max_quantity, reorder_point, reorder_quantity, safety_stock, is_below_min, is_above_max, needs_reorder, weight, volume, special_attributes, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.locations (id, organization_id, warehouse_id, location_code, location_name, location_type, zone, aisle, shelf, level, "position", barcode, description, capacity, current_quantity, max_weight, current_weight, dimensions, is_active, is_blocked, block_reason, temperature_requirement, humidity_requirement, special_requirements, priority, status, last_inspection_date, next_inspection_date, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
1dfd601a-e882-4838-b1aa-3c6ac29c4d4b	00000000-0000-0000-0000-000000000001	a468967b-ed1f-40d4-830b-01bb0481c11b	A-01-01-01	库位A-01-01-01	storage	A	01	01	01	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
84f6dd07-cc8e-4815-ae12-4bd26b4e0331	00000000-0000-0000-0000-000000000001	823a3b3e-ce47-41ea-942a-bb0188a49983	A-01-01-01	库位A-01-01-01	storage	A	01	01	01	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
a29a9f30-8c3d-4b30-a0fd-5750f65f062e	00000000-0000-0000-0000-000000000001	a468967b-ed1f-40d4-830b-01bb0481c11b	A-01-01-02	库位A-01-01-02	storage	A	01	01	02	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
b41ce763-21a7-4090-ae3f-400706aee8a2	00000000-0000-0000-0000-000000000001	823a3b3e-ce47-41ea-942a-bb0188a49983	A-01-01-02	库位A-01-01-02	storage	A	01	01	02	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
d02b67bc-3759-431a-a36e-d2acfd1c5f01	00000000-0000-0000-0000-000000000001	a468967b-ed1f-40d4-830b-01bb0481c11b	A-01-02-01	库位A-01-02-01	storage	A	01	02	01	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
4aa9b0f5-5098-4489-a0bb-22a1498fd6ab	00000000-0000-0000-0000-000000000001	823a3b3e-ce47-41ea-942a-bb0188a49983	A-01-02-01	库位A-01-02-01	storage	A	01	02	01	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
542fe281-b128-405c-aca3-173187f47ebe	00000000-0000-0000-0000-000000000001	a468967b-ed1f-40d4-830b-01bb0481c11b	B-01-01-01	库位B-01-01-01	picking	B	01	01	01	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
b7c1ff68-3f0b-4d06-9e54-15652dc9ee7c	00000000-0000-0000-0000-000000000001	823a3b3e-ce47-41ea-942a-bb0188a49983	B-01-01-01	库位B-01-01-01	picking	B	01	01	01	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
b31b2da1-cda6-4fae-84eb-43bf304ebf36	00000000-0000-0000-0000-000000000001	a468967b-ed1f-40d4-830b-01bb0481c11b	B-01-01-02	库位B-01-01-02	picking	B	01	01	02	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
5ffe4c2b-f3f4-4959-88e1-f1ca0d46488f	00000000-0000-0000-0000-000000000001	823a3b3e-ce47-41ea-942a-bb0188a49983	B-01-01-02	库位B-01-01-02	picking	B	01	01	02	\N	\N	\N	\N	0.00	\N	0.00	\N	t	f	\N	\N	\N	\N	0	available	\N	\N	\N	2026-06-12 08:02:30.780341+00	2026-06-12 08:02:30.780341+00	\N	\N	\N
\.


--
-- Data for Name: outbound_order_items; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.outbound_order_items (id, organization_id, order_id, line_number, material_code, material_name, material_type, specification, batch_number, lot_number, serial_number, requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit, source_location_id, source_location_code, source_location_name, destination_location_id, destination_location_code, destination_location_name, unit_price, total_value, weight, volume, picking_status, packing_status, picker, picking_time, packer, packing_time, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: outbound_orders; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.outbound_orders (id, organization_id, order_number, order_type, reference_number, reference_type, warehouse_id, warehouse_name, customer_id, customer_name, customer_code, sales_order_id, sales_order_number, production_order_id, production_order_number, transfer_order_id, transfer_order_number, destination_warehouse_id, destination_warehouse_name, destination_address, expected_ship_date, actual_ship_date, ship_time, delivery_date, delivery_time, carrier, carrier_code, carrier_service, vehicle_number, driver_name, driver_phone, tracking_number, total_items, total_quantity, shipped_quantity, total_weight, total_volume, total_value, shipping_cost, priority, status, picker, picker_id, picking_team, packer, packer_id, packing_team, shipper, shipper_id, shipping_team, picking_method, packing_method, shipping_method, picking_status, packing_status, shipping_status, picking_start_time, picking_end_time, packing_start_time, packing_end_time, special_instructions, shipping_notes, delivery_notes, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: stock_take_items; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.stock_take_items (id, organization_id, stock_take_id, line_number, material_code, material_name, material_type, specification, batch_number, lot_number, serial_number, location_id, location_code, location_name, system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type, unit, unit_price, discrepancy_value, quality_status, counter, counter_id, counting_time, recount_required, recount_quantity, recount_by, recount_time, discrepancy_reason, discrepancy_notes, adjustment_required, adjustment_quantity, adjustment_status, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: stock_takes; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.stock_takes (id, organization_id, stock_take_number, stock_take_type, warehouse_id, warehouse_name, location_id, location_code, location_name, material_code, material_name, planned_date, actual_date, start_time, end_time, planned_by, planned_by_id, executed_by, executed_by_id, team, total_items, counted_items, discrepancy_items, total_quantity, counted_quantity, discrepancy_quantity, discrepancy_value, accuracy_rate, status, approval_status, approved_by, approved_by_id, approval_date, approval_notes, adjustment_status, adjusted_by, adjusted_by_id, adjustment_date, adjustment_notes, reason, findings, recommendations, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: transfer_items; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.transfer_items (id, organization_id, transfer_id, line_number, material_code, material_name, material_type, specification, batch_number, lot_number, serial_number, requested_quantity, transferred_quantity, received_quantity, unit, source_location_id, source_location_code, source_location_name, destination_location_id, destination_location_code, destination_location_name, unit_price, total_value, weight, volume, quality_status, transfer_status, receive_status, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.transfers (id, organization_id, transfer_number, transfer_type, source_warehouse_id, source_warehouse_name, source_location_id, source_location_code, source_location_name, destination_warehouse_id, destination_warehouse_name, destination_location_id, destination_location_code, destination_location_name, reference_number, reference_type, planned_date, actual_date, start_time, end_time, total_items, total_quantity, transferred_quantity, total_weight, total_volume, total_value, priority, status, requester, requester_id, request_department, request_reason, approver, approver_id, approval_status, approval_date, approval_notes, transfer_by, transfer_by_id, transfer_team, transfer_start_time, transfer_end_time, receive_by, receive_by_id, receive_team, receive_start_time, receive_end_time, carrier, carrier_code, vehicle_number, driver_name, driver_phone, transfer_notes, receive_notes, special_instructions, attachments, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: wms; Owner: topems
--

COPY wms.warehouses (id, organization_id, warehouse_code, warehouse_name, warehouse_type, description, address, city, province, country, postal_code, contact_person, contact_phone, contact_email, total_area, usable_area, total_capacity, current_capacity, utilization_rate, temperature_min, temperature_max, humidity_min, humidity_max, is_temperature_controlled, is_humidity_controlled, security_level, operating_hours, manager, manager_id, department, status, last_inspection_date, next_inspection_date, notes, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
a468967b-ed1f-40d4-830b-01bb0481c11b	00000000-0000-0000-0000-000000000001	WH001	原材料仓库	raw_material	\N	\N	上海	上海	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	active	\N	\N	\N	2026-06-12 08:02:30.749862+00	2026-06-12 08:02:30.749862+00	\N	\N	\N
823a3b3e-ce47-41ea-942a-bb0188a49983	00000000-0000-0000-0000-000000000001	WH002	成品仓库	finished_goods	\N	\N	上海	上海	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	active	\N	\N	\N	2026-06-12 08:02:30.749862+00	2026-06-12 08:02:30.749862+00	\N	\N	\N
f93e939d-0a9f-4e16-b924-a81af32cfec6	00000000-0000-0000-0000-000000000001	WH003	半成品仓库	semi_finished	\N	\N	上海	上海	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	active	\N	\N	\N	2026-06-12 08:02:30.749862+00	2026-06-12 08:02:30.749862+00	\N	\N	\N
99615a80-553d-49ae-8bf7-27550e44532b	00000000-0000-0000-0000-000000000001	WH004	备件仓库	spare_parts	\N	\N	上海	上海	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	active	\N	\N	\N	2026-06-12 08:02:30.749862+00	2026-06-12 08:02:30.749862+00	\N	\N	\N
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: customer_tags customer_tags_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.customer_tags
    ADD CONSTRAINT customer_tags_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: dashboard_metrics dashboard_metrics_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.dashboard_metrics
    ADD CONSTRAINT dashboard_metrics_pkey PRIMARY KEY (id);


--
-- Name: interactions interactions_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: archive_borrows archive_borrows_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_borrows
    ADD CONSTRAINT archive_borrows_pkey PRIMARY KEY (id);


--
-- Name: archive_categories archive_categories_code_key; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_categories
    ADD CONSTRAINT archive_categories_code_key UNIQUE (code);


--
-- Name: archive_categories archive_categories_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_categories
    ADD CONSTRAINT archive_categories_pkey PRIMARY KEY (id);


--
-- Name: archive_destructions archive_destructions_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_destructions
    ADD CONSTRAINT archive_destructions_pkey PRIMARY KEY (id);


--
-- Name: archive_metadata archive_metadata_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_metadata
    ADD CONSTRAINT archive_metadata_pkey PRIMARY KEY (id);


--
-- Name: archives archives_archive_no_key; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archives
    ADD CONSTRAINT archives_archive_no_key UNIQUE (archive_no);


--
-- Name: archives archives_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archives
    ADD CONSTRAINT archives_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: file_permissions file_permissions_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.file_permissions
    ADD CONSTRAINT file_permissions_pkey PRIMARY KEY (id);


--
-- Name: file_versions file_versions_file_id_version_key; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.file_versions
    ADD CONSTRAINT file_versions_file_id_version_key UNIQUE (file_id, version);


--
-- Name: file_versions file_versions_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.file_versions
    ADD CONSTRAINT file_versions_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: folder_permissions folder_permissions_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.folder_permissions
    ADD CONSTRAINT folder_permissions_pkey PRIMARY KEY (id);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: help_articles help_articles_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.help_articles
    ADD CONSTRAINT help_articles_pkey PRIMARY KEY (id);


--
-- Name: help_articles help_articles_slug_key; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.help_articles
    ADD CONSTRAINT help_articles_slug_key UNIQUE (slug);


--
-- Name: help_categories help_categories_code_key; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.help_categories
    ADD CONSTRAINT help_categories_code_key UNIQUE (code);


--
-- Name: help_categories help_categories_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.help_categories
    ADD CONSTRAINT help_categories_pkey PRIMARY KEY (id);


--
-- Name: template_categories template_categories_code_key; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.template_categories
    ADD CONSTRAINT template_categories_code_key UNIQUE (code);


--
-- Name: template_categories template_categories_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.template_categories
    ADD CONSTRAINT template_categories_pkey PRIMARY KEY (id);


--
-- Name: templates templates_code_key; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.templates
    ADD CONSTRAINT templates_code_key UNIQUE (code);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: video_tutorials video_tutorials_pkey; Type: CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.video_tutorials
    ADD CONSTRAINT video_tutorials_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: drill_records drill_records_drill_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.drill_records
    ADD CONSTRAINT drill_records_drill_no_key UNIQUE (drill_no);


--
-- Name: drill_records drill_records_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.drill_records
    ADD CONSTRAINT drill_records_pkey PRIMARY KEY (id);


--
-- Name: emergency_plans emergency_plans_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.emergency_plans
    ADD CONSTRAINT emergency_plans_pkey PRIMARY KEY (id);


--
-- Name: emergency_plans emergency_plans_plan_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.emergency_plans
    ADD CONSTRAINT emergency_plans_plan_no_key UNIQUE (plan_no);


--
-- Name: environmental_alerts environmental_alerts_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.environmental_alerts
    ADD CONSTRAINT environmental_alerts_pkey PRIMARY KEY (id);


--
-- Name: environmental_data environmental_data_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.environmental_data
    ADD CONSTRAINT environmental_data_pkey PRIMARY KEY (id);


--
-- Name: health_checkups health_checkups_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.health_checkups
    ADD CONSTRAINT health_checkups_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id);


--
-- Name: monitoring_points monitoring_points_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.monitoring_points
    ADD CONSTRAINT monitoring_points_pkey PRIMARY KEY (id);


--
-- Name: monitoring_points monitoring_points_point_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.monitoring_points
    ADD CONSTRAINT monitoring_points_point_no_key UNIQUE (point_no);


--
-- Name: risk_assessments risk_assessments_assessment_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.risk_assessments
    ADD CONSTRAINT risk_assessments_assessment_no_key UNIQUE (assessment_no);


--
-- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);


--
-- Name: risk_controls risk_controls_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.risk_controls
    ADD CONSTRAINT risk_controls_pkey PRIMARY KEY (id);


--
-- Name: safety_checks safety_checks_check_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_checks
    ADD CONSTRAINT safety_checks_check_no_key UNIQUE (check_no);


--
-- Name: safety_checks safety_checks_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_checks
    ADD CONSTRAINT safety_checks_pkey PRIMARY KEY (id);


--
-- Name: safety_hazards safety_hazards_hazard_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_hazards
    ADD CONSTRAINT safety_hazards_hazard_no_key UNIQUE (hazard_no);


--
-- Name: safety_hazards safety_hazards_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_hazards
    ADD CONSTRAINT safety_hazards_pkey PRIMARY KEY (id);


--
-- Name: safety_incidents safety_incidents_incident_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_incidents
    ADD CONSTRAINT safety_incidents_incident_no_key UNIQUE (incident_no);


--
-- Name: safety_incidents safety_incidents_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_incidents
    ADD CONSTRAINT safety_incidents_pkey PRIMARY KEY (id);


--
-- Name: training_programs training_programs_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.training_programs
    ADD CONSTRAINT training_programs_pkey PRIMARY KEY (id);


--
-- Name: training_programs training_programs_program_no_key; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.training_programs
    ADD CONSTRAINT training_programs_program_no_key UNIQUE (program_no);


--
-- Name: training_records training_records_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.training_records
    ADD CONSTRAINT training_records_pkey PRIMARY KEY (id);


--
-- Name: vaccination_records vaccination_records_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.vaccination_records
    ADD CONSTRAINT vaccination_records_pkey PRIMARY KEY (id);


--
-- Name: accounting_subjects accounting_subjects_code_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.accounting_subjects
    ADD CONSTRAINT accounting_subjects_code_key UNIQUE (code);


--
-- Name: accounting_subjects accounting_subjects_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.accounting_subjects
    ADD CONSTRAINT accounting_subjects_pkey PRIMARY KEY (id);


--
-- Name: assets assets_asset_number_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.assets
    ADD CONSTRAINT assets_asset_number_key UNIQUE (asset_number);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: db_changes db_changes_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.db_changes
    ADD CONSTRAINT db_changes_pkey PRIMARY KEY (id);


--
-- Name: dict_items dict_items_dict_type_id_code_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.dict_items
    ADD CONSTRAINT dict_items_dict_type_id_code_key UNIQUE (dict_type_id, code);


--
-- Name: dict_items dict_items_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.dict_items
    ADD CONSTRAINT dict_items_pkey PRIMARY KEY (id);


--
-- Name: dict_types dict_types_code_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.dict_types
    ADD CONSTRAINT dict_types_code_key UNIQUE (code);


--
-- Name: dict_types dict_types_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.dict_types
    ADD CONSTRAINT dict_types_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_expense_number_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: financial_vouchers financial_vouchers_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.financial_vouchers
    ADD CONSTRAINT financial_vouchers_pkey PRIMARY KEY (id);


--
-- Name: financial_vouchers financial_vouchers_voucher_number_period_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.financial_vouchers
    ADD CONSTRAINT financial_vouchers_voucher_number_period_key UNIQUE (voucher_number, period);


--
-- Name: payables payables_invoice_number_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.payables
    ADD CONSTRAINT payables_invoice_number_key UNIQUE (invoice_number);


--
-- Name: payables payables_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.payables
    ADD CONSTRAINT payables_pkey PRIMARY KEY (id);


--
-- Name: receivables receivables_invoice_number_key; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.receivables
    ADD CONSTRAINT receivables_invoice_number_key UNIQUE (invoice_number);


--
-- Name: receivables receivables_pkey; Type: CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.receivables
    ADD CONSTRAINT receivables_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: business_locations business_locations_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.business_locations
    ADD CONSTRAINT business_locations_pkey PRIMARY KEY (id);


--
-- Name: device_location_records device_location_records_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.device_location_records
    ADD CONSTRAINT device_location_records_pkey PRIMARY KEY (id);


--
-- Name: device_locations device_locations_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.device_locations
    ADD CONSTRAINT device_locations_pkey PRIMARY KEY (id);


--
-- Name: devices devices_device_code_key; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.devices
    ADD CONSTRAINT devices_device_code_key UNIQUE (device_code);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: factory_maps factory_maps_code_key; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.factory_maps
    ADD CONSTRAINT factory_maps_code_key UNIQUE (code);


--
-- Name: factory_maps factory_maps_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.factory_maps
    ADD CONSTRAINT factory_maps_pkey PRIMARY KEY (id);


--
-- Name: geodata geodata_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.geodata
    ADD CONSTRAINT geodata_pkey PRIMARY KEY (id);


--
-- Name: geofeatures geofeatures_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.geofeatures
    ADD CONSTRAINT geofeatures_pkey PRIMARY KEY (id);


--
-- Name: location_photos location_photos_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.location_photos
    ADD CONSTRAINT location_photos_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: map_layers map_layers_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.map_layers
    ADD CONSTRAINT map_layers_pkey PRIMARY KEY (id);


--
-- Name: map_markers map_markers_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.map_markers
    ADD CONSTRAINT map_markers_pkey PRIMARY KEY (id);


--
-- Name: maps maps_code_key; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.maps
    ADD CONSTRAINT maps_code_key UNIQUE (code);


--
-- Name: maps maps_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.maps
    ADD CONSTRAINT maps_pkey PRIMARY KEY (id);


--
-- Name: pipelines pipelines_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.pipelines
    ADD CONSTRAINT pipelines_pkey PRIMARY KEY (id);


--
-- Name: spatial_analysis spatial_analysis_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.spatial_analysis
    ADD CONSTRAINT spatial_analysis_pkey PRIMARY KEY (id);


--
-- Name: warehouse_locations warehouse_locations_pkey; Type: CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.warehouse_locations
    ADD CONSTRAINT warehouse_locations_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: leave_records leave_records_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.leave_records
    ADD CONSTRAINT leave_records_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: performance_records performance_records_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.performance_records
    ADD CONSTRAINT performance_records_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: recruitment_applications recruitment_applications_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.recruitment_applications
    ADD CONSTRAINT recruitment_applications_pkey PRIMARY KEY (id);


--
-- Name: recruitment_records recruitment_records_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.recruitment_records
    ADD CONSTRAINT recruitment_records_pkey PRIMARY KEY (id);


--
-- Name: salary_adjustments salary_adjustments_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.salary_adjustments
    ADD CONSTRAINT salary_adjustments_pkey PRIMARY KEY (id);


--
-- Name: training_participants training_participants_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.training_participants
    ADD CONSTRAINT training_participants_pkey PRIMARY KEY (id);


--
-- Name: training_records training_records_pkey; Type: CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.training_records
    ADD CONSTRAINT training_records_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: chat_room_members chat_room_members_chat_room_id_user_id_key; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.chat_room_members
    ADD CONSTRAINT chat_room_members_chat_room_id_user_id_key UNIQUE (chat_room_id, user_id);


--
-- Name: chat_room_members chat_room_members_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.chat_room_members
    ADD CONSTRAINT chat_room_members_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: contact_group_members contact_group_members_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.contact_group_members
    ADD CONSTRAINT contact_group_members_pkey PRIMARY KEY (id);


--
-- Name: contact_groups contact_groups_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.contact_groups
    ADD CONSTRAINT contact_groups_pkey PRIMARY KEY (id);


--
-- Name: file_transfers file_transfers_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.file_transfers
    ADD CONSTRAINT file_transfers_pkey PRIMARY KEY (id);


--
-- Name: friends friends_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.friends
    ADD CONSTRAINT friends_pkey PRIMARY KEY (id);


--
-- Name: friends friends_user_id_friend_id_key; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.friends
    ADD CONSTRAINT friends_user_id_friend_id_key UNIQUE (user_id, friend_id);


--
-- Name: message_read_receipts message_read_receipts_message_id_user_id_key; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.message_read_receipts
    ADD CONSTRAINT message_read_receipts_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- Name: message_read_receipts message_read_receipts_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.message_read_receipts
    ADD CONSTRAINT message_read_receipts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: project_groups project_groups_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.project_groups
    ADD CONSTRAINT project_groups_pkey PRIMARY KEY (id);


--
-- Name: user_status user_status_pkey; Type: CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.user_status
    ADD CONSTRAINT user_status_pkey PRIMARY KEY (user_id);


--
-- Name: integration_configs integration_configs_config_name_key; Type: CONSTRAINT; Schema: integration; Owner: topems
--

ALTER TABLE ONLY integration.integration_configs
    ADD CONSTRAINT integration_configs_config_name_key UNIQUE (config_name);


--
-- Name: integration_configs integration_configs_pkey; Type: CONSTRAINT; Schema: integration; Owner: topems
--

ALTER TABLE ONLY integration.integration_configs
    ADD CONSTRAINT integration_configs_pkey PRIMARY KEY (id);


--
-- Name: integration_events integration_events_pkey; Type: CONSTRAINT; Schema: integration; Owner: topems
--

ALTER TABLE ONLY integration.integration_events
    ADD CONSTRAINT integration_events_pkey PRIMARY KEY (id);


--
-- Name: lims_qms_sync lims_qms_sync_pkey; Type: CONSTRAINT; Schema: integration; Owner: topems
--

ALTER TABLE ONLY integration.lims_qms_sync
    ADD CONSTRAINT lims_qms_sync_pkey PRIMARY KEY (id);


--
-- Name: mes_erp_sync mes_erp_sync_pkey; Type: CONSTRAINT; Schema: integration; Owner: topems
--

ALTER TABLE ONLY integration.mes_erp_sync
    ADD CONSTRAINT mes_erp_sync_pkey PRIMARY KEY (id);


--
-- Name: wms_scm_sync wms_scm_sync_pkey; Type: CONSTRAINT; Schema: integration; Owner: topems
--

ALTER TABLE ONLY integration.wms_scm_sync
    ADD CONSTRAINT wms_scm_sync_pkey PRIMARY KEY (id);


--
-- Name: ai_analyses ai_analyses_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.ai_analyses
    ADD CONSTRAINT ai_analyses_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: document_relations document_relations_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.document_relations
    ADD CONSTRAINT document_relations_pkey PRIMARY KEY (id);


--
-- Name: inspection_processes inspection_processes_code_key; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.inspection_processes
    ADD CONSTRAINT inspection_processes_code_key UNIQUE (code);


--
-- Name: inspection_processes inspection_processes_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.inspection_processes
    ADD CONSTRAINT inspection_processes_pkey PRIMARY KEY (id);


--
-- Name: inspection_records inspection_records_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.inspection_records
    ADD CONSTRAINT inspection_records_pkey PRIMARY KEY (id);


--
-- Name: inspection_tasks inspection_tasks_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.inspection_tasks
    ADD CONSTRAINT inspection_tasks_pkey PRIMARY KEY (id);


--
-- Name: instrument_calibrations instrument_calibrations_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.instrument_calibrations
    ADD CONSTRAINT instrument_calibrations_pkey PRIMARY KEY (id);


--
-- Name: instruments instruments_code_key; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.instruments
    ADD CONSTRAINT instruments_code_key UNIQUE (code);


--
-- Name: instruments instruments_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.instruments
    ADD CONSTRAINT instruments_pkey PRIMARY KEY (id);


--
-- Name: lab_ledger lab_ledger_code_key; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.lab_ledger
    ADD CONSTRAINT lab_ledger_code_key UNIQUE (code);


--
-- Name: lab_ledger lab_ledger_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.lab_ledger
    ADD CONSTRAINT lab_ledger_pkey PRIMARY KEY (id);


--
-- Name: maintenance_records maintenance_records_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.maintenance_records
    ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: reagent_usages reagent_usages_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.reagent_usages
    ADD CONSTRAINT reagent_usages_pkey PRIMARY KEY (id);


--
-- Name: reagents reagents_code_key; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.reagents
    ADD CONSTRAINT reagents_code_key UNIQUE (code);


--
-- Name: reagents reagents_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.reagents
    ADD CONSTRAINT reagents_pkey PRIMARY KEY (id);


--
-- Name: samples samples_code_key; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.samples
    ADD CONSTRAINT samples_code_key UNIQUE (code);


--
-- Name: samples samples_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.samples
    ADD CONSTRAINT samples_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: mail; Owner: topems
--

ALTER TABLE ONLY mail.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: mail; Owner: topems
--

ALTER TABLE ONLY mail.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: templates templates_code_key; Type: CONSTRAINT; Schema: mail; Owner: topems
--

ALTER TABLE ONLY mail.templates
    ADD CONSTRAINT templates_code_key UNIQUE (code);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: mail; Owner: topems
--

ALTER TABLE ONLY mail.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: equipment_inspection_records equipment_inspection_records_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.equipment_inspection_records
    ADD CONSTRAINT equipment_inspection_records_pkey PRIMARY KEY (id);


--
-- Name: equipment_maintenance_records equipment_maintenance_records_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.equipment_maintenance_records
    ADD CONSTRAINT equipment_maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: process_route_steps process_route_steps_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.process_route_steps
    ADD CONSTRAINT process_route_steps_pkey PRIMARY KEY (id);


--
-- Name: process_routes process_routes_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.process_routes
    ADD CONSTRAINT process_routes_pkey PRIMARY KEY (id);


--
-- Name: production_orders production_orders_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);


--
-- Name: production_processes production_processes_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_pkey PRIMARY KEY (id);


--
-- Name: production_records production_records_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_pkey PRIMARY KEY (id);


--
-- Name: work_stations work_stations_pkey; Type: CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.work_stations
    ADD CONSTRAINT work_stations_pkey PRIMARY KEY (id);


--
-- Name: audio_recordings audio_recordings_pkey; Type: CONSTRAINT; Schema: mobile; Owner: topems
--

ALTER TABLE ONLY mobile.audio_recordings
    ADD CONSTRAINT audio_recordings_pkey PRIMARY KEY (id);


--
-- Name: mobile_tasks mobile_tasks_pkey; Type: CONSTRAINT; Schema: mobile; Owner: topems
--

ALTER TABLE ONLY mobile.mobile_tasks
    ADD CONSTRAINT mobile_tasks_pkey PRIMARY KEY (id);


--
-- Name: patrol_records patrol_records_pkey; Type: CONSTRAINT; Schema: mobile; Owner: topems
--

ALTER TABLE ONLY mobile.patrol_records
    ADD CONSTRAINT patrol_records_pkey PRIMARY KEY (id);


--
-- Name: photo_evidences photo_evidences_pkey; Type: CONSTRAINT; Schema: mobile; Owner: topems
--

ALTER TABLE ONLY mobile.photo_evidences
    ADD CONSTRAINT photo_evidences_pkey PRIMARY KEY (id);


--
-- Name: scan_records scan_records_pkey; Type: CONSTRAINT; Schema: mobile; Owner: topems
--

ALTER TABLE ONLY mobile.scan_records
    ADD CONSTRAINT scan_records_pkey PRIMARY KEY (id);


--
-- Name: video_recordings video_recordings_pkey; Type: CONSTRAINT; Schema: mobile; Owner: topems
--

ALTER TABLE ONLY mobile.video_recordings
    ADD CONSTRAINT video_recordings_pkey PRIMARY KEY (id);


--
-- Name: acceptances acceptances_acceptance_no_key; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.acceptances
    ADD CONSTRAINT acceptances_acceptance_no_key UNIQUE (acceptance_no);


--
-- Name: acceptances acceptances_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.acceptances
    ADD CONSTRAINT acceptances_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_contract_no_key; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.contracts
    ADD CONSTRAINT contracts_contract_no_key UNIQUE (contract_no);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: project_approvals project_approvals_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_approvals
    ADD CONSTRAINT project_approvals_pkey PRIMARY KEY (id);


--
-- Name: project_benefits project_benefits_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_benefits
    ADD CONSTRAINT project_benefits_pkey PRIMARY KEY (id);


--
-- Name: project_expenses project_expenses_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_expenses
    ADD CONSTRAINT project_expenses_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_phases project_phases_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_phases
    ADD CONSTRAINT project_phases_pkey PRIMARY KEY (id);


--
-- Name: project_resources project_resources_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_resources
    ADD CONSTRAINT project_resources_pkey PRIMARY KEY (id);


--
-- Name: project_type_configs project_type_configs_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_type_configs
    ADD CONSTRAINT project_type_configs_pkey PRIMARY KEY (id);


--
-- Name: project_type_configs project_type_configs_type_code_key; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_type_configs
    ADD CONSTRAINT project_type_configs_type_code_key UNIQUE (type_code);


--
-- Name: project_type_configs project_type_configs_type_name_key; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_type_configs
    ADD CONSTRAINT project_type_configs_type_name_key UNIQUE (type_name);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quality_checks quality_checks_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.quality_checks
    ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);


--
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_settlement_no_key; Type: CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.settlements
    ADD CONSTRAINT settlements_settlement_no_key UNIQUE (settlement_no);


--
-- Name: portal_access_logs portal_access_logs_pkey; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_access_logs
    ADD CONSTRAINT portal_access_logs_pkey PRIMARY KEY (id);


--
-- Name: portal_announcements portal_announcements_pkey; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_announcements
    ADD CONSTRAINT portal_announcements_pkey PRIMARY KEY (id);


--
-- Name: portal_configs portal_configs_config_key_key; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_configs
    ADD CONSTRAINT portal_configs_config_key_key UNIQUE (config_key);


--
-- Name: portal_configs portal_configs_pkey; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_configs
    ADD CONSTRAINT portal_configs_pkey PRIMARY KEY (id);


--
-- Name: portal_layouts portal_layouts_pkey; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_layouts
    ADD CONSTRAINT portal_layouts_pkey PRIMARY KEY (id);


--
-- Name: portal_menus portal_menus_menu_code_key; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_menus
    ADD CONSTRAINT portal_menus_menu_code_key UNIQUE (menu_code);


--
-- Name: portal_menus portal_menus_pkey; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_menus
    ADD CONSTRAINT portal_menus_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_preference_key_key; Type: CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.user_preferences
    ADD CONSTRAINT user_preferences_user_id_preference_key_key UNIQUE (user_id, preference_key);


--
-- Name: audio_recordings audio_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.audio_recordings
    ADD CONSTRAINT audio_recordings_pkey PRIMARY KEY (id);


--
-- Name: business_locations business_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.business_locations
    ADD CONSTRAINT business_locations_pkey PRIMARY KEY (id);


--
-- Name: device_locations device_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.device_locations
    ADD CONSTRAINT device_locations_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: factory_maps factory_maps_code_key; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.factory_maps
    ADD CONSTRAINT factory_maps_code_key UNIQUE (code);


--
-- Name: factory_maps factory_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.factory_maps
    ADD CONSTRAINT factory_maps_pkey PRIMARY KEY (id);


--
-- Name: location_photos location_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.location_photos
    ADD CONSTRAINT location_photos_pkey PRIMARY KEY (id);


--
-- Name: map_markers map_markers_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.map_markers
    ADD CONSTRAINT map_markers_pkey PRIMARY KEY (id);


--
-- Name: mobile_scan_records mobile_scan_records_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.mobile_scan_records
    ADD CONSTRAINT mobile_scan_records_pkey PRIMARY KEY (id);


--
-- Name: mobile_tasks mobile_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.mobile_tasks
    ADD CONSTRAINT mobile_tasks_pkey PRIMARY KEY (id);


--
-- Name: mobile_users mobile_users_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.mobile_users
    ADD CONSTRAINT mobile_users_pkey PRIMARY KEY (id);


--
-- Name: mobile_users mobile_users_username_key; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.mobile_users
    ADD CONSTRAINT mobile_users_username_key UNIQUE (username);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offline_sync_records offline_sync_records_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.offline_sync_records
    ADD CONSTRAINT offline_sync_records_pkey PRIMARY KEY (id);


--
-- Name: patrol_records patrol_records_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.patrol_records
    ADD CONSTRAINT patrol_records_pkey PRIMARY KEY (id);


--
-- Name: payment_schedules payment_schedules_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_payment_number_key UNIQUE (payment_number);


--
-- Name: payment_schedules payment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_pkey PRIMARY KEY (id);


--
-- Name: photo_evidences photo_evidences_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.photo_evidences
    ADD CONSTRAINT photo_evidences_pkey PRIMARY KEY (id);


--
-- Name: pipelines pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_pkey PRIMARY KEY (id);


--
-- Name: project_budget_items project_budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.project_budget_items
    ADD CONSTRAINT project_budget_items_pkey PRIMARY KEY (id);


--
-- Name: project_budgets project_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_pkey PRIMARY KEY (id);


--
-- Name: project_contracts project_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.project_contracts
    ADD CONSTRAINT project_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: project_contracts project_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.project_contracts
    ADD CONSTRAINT project_contracts_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_refresh_token_key UNIQUE (refresh_token);


--
-- Name: scan_records scan_records_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.scan_records
    ADD CONSTRAINT scan_records_pkey PRIMARY KEY (id);


--
-- Name: shortcuts shortcuts_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.shortcuts
    ADD CONSTRAINT shortcuts_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- Name: video_recordings video_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.video_recordings
    ADD CONSTRAINT video_recordings_pkey PRIMARY KEY (id);


--
-- Name: voucher_items voucher_items_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.voucher_items
    ADD CONSTRAINT voucher_items_pkey PRIMARY KEY (id);


--
-- Name: warehouse_locations warehouse_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: corrective_actions corrective_actions_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.corrective_actions
    ADD CONSTRAINT corrective_actions_pkey PRIMARY KEY (id);


--
-- Name: dashboard_metrics dashboard_metrics_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.dashboard_metrics
    ADD CONSTRAINT dashboard_metrics_pkey PRIMARY KEY (id);


--
-- Name: inspection_items inspection_items_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.inspection_items
    ADD CONSTRAINT inspection_items_pkey PRIMARY KEY (id);


--
-- Name: quality_inspections quality_inspections_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_inspections
    ADD CONSTRAINT quality_inspections_pkey PRIMARY KEY (id);


--
-- Name: quality_issues quality_issues_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_issues
    ADD CONSTRAINT quality_issues_pkey PRIMARY KEY (id);


--
-- Name: quality_standards quality_standards_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_standards
    ADD CONSTRAINT quality_standards_pkey PRIMARY KEY (id);


--
-- Name: report_exports report_exports_pkey; Type: CONSTRAINT; Schema: report; Owner: topems
--

ALTER TABLE ONLY report.report_exports
    ADD CONSTRAINT report_exports_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: report; Owner: topems
--

ALTER TABLE ONLY report.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: report_type_configs report_type_configs_pkey; Type: CONSTRAINT; Schema: report; Owner: topems
--

ALTER TABLE ONLY report.report_type_configs
    ADD CONSTRAINT report_type_configs_pkey PRIMARY KEY (id);


--
-- Name: report_type_configs report_type_configs_type_code_key; Type: CONSTRAINT; Schema: report; Owner: topems
--

ALTER TABLE ONLY report.report_type_configs
    ADD CONSTRAINT report_type_configs_type_code_key UNIQUE (type_code);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: report; Owner: topems
--

ALTER TABLE ONLY report.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: experiments experiments_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.experiments
    ADD CONSTRAINT experiments_pkey PRIMARY KEY (id);


--
-- Name: formula_versions formula_versions_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.formula_versions
    ADD CONSTRAINT formula_versions_pkey PRIMARY KEY (id);


--
-- Name: formulas formulas_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.formulas
    ADD CONSTRAINT formulas_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_phases project_phases_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_phases
    ADD CONSTRAINT project_phases_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: rs_test; Owner: topems
--

ALTER TABLE ONLY rs_test.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: purchase_items purchase_items_pkey; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.purchase_items
    ADD CONSTRAINT purchase_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_no_key; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.purchase_orders
    ADD CONSTRAINT purchase_orders_po_no_key UNIQUE (po_no);


--
-- Name: supplier_evaluations supplier_evaluations_evaluation_no_key; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_evaluation_no_key UNIQUE (evaluation_no);


--
-- Name: supplier_evaluations supplier_evaluations_pkey; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_supplier_no_key; Type: CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.suppliers
    ADD CONSTRAINT suppliers_supplier_no_key UNIQUE (supplier_no);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_no_key; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.employees
    ADD CONSTRAINT employees_employee_no_key UNIQUE (employee_no);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: id_records id_records_pkey; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.id_records
    ADD CONSTRAINT id_records_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: system_params system_params_param_key_key; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.system_params
    ADD CONSTRAINT system_params_param_key_key UNIQUE (param_key);


--
-- Name: system_params system_params_pkey; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.system_params
    ADD CONSTRAINT system_params_pkey PRIMARY KEY (id);


--
-- Name: user_employee_map user_employee_map_pkey; Type: CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.user_employee_map
    ADD CONSTRAINT user_employee_map_pkey PRIMARY KEY (user_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: contract_terms contract_terms_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.contract_terms
    ADD CONSTRAINT contract_terms_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_no_key; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.purchase_orders
    ADD CONSTRAINT purchase_orders_po_no_key UNIQUE (po_no);


--
-- Name: supplier_categories supplier_categories_category_no_key; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_categories
    ADD CONSTRAINT supplier_categories_category_no_key UNIQUE (category_no);


--
-- Name: supplier_categories supplier_categories_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_categories
    ADD CONSTRAINT supplier_categories_pkey PRIMARY KEY (id);


--
-- Name: supplier_contracts supplier_contracts_contract_no_key; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_contracts
    ADD CONSTRAINT supplier_contracts_contract_no_key UNIQUE (contract_no);


--
-- Name: supplier_contracts supplier_contracts_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_contracts
    ADD CONSTRAINT supplier_contracts_pkey PRIMARY KEY (id);


--
-- Name: supplier_evaluations supplier_evaluations_evaluation_no_key; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_evaluation_no_key UNIQUE (evaluation_no);


--
-- Name: supplier_evaluations supplier_evaluations_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_pkey PRIMARY KEY (id);


--
-- Name: supplier_products supplier_products_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_products
    ADD CONSTRAINT supplier_products_pkey PRIMARY KEY (id);


--
-- Name: supplier_products supplier_products_product_no_key; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_products
    ADD CONSTRAINT supplier_products_product_no_key UNIQUE (product_no);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_supplier_no_key; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.suppliers
    ADD CONSTRAINT suppliers_supplier_no_key UNIQUE (supplier_no);


--
-- Name: backends backends_name_key; Type: CONSTRAINT; Schema: storage; Owner: topems
--

ALTER TABLE ONLY storage.backends
    ADD CONSTRAINT backends_name_key UNIQUE (name);


--
-- Name: backends backends_pkey; Type: CONSTRAINT; Schema: storage; Owner: topems
--

ALTER TABLE ONLY storage.backends
    ADD CONSTRAINT backends_pkey PRIMARY KEY (id);


--
-- Name: file_permissions file_permissions_file_id_principal_type_principal_id_permis_key; Type: CONSTRAINT; Schema: storage; Owner: topems
--

ALTER TABLE ONLY storage.file_permissions
    ADD CONSTRAINT file_permissions_file_id_principal_type_principal_id_permis_key UNIQUE (file_id, principal_type, principal_id, permission);


--
-- Name: file_permissions file_permissions_pkey; Type: CONSTRAINT; Schema: storage; Owner: topems
--

ALTER TABLE ONLY storage.file_permissions
    ADD CONSTRAINT file_permissions_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: storage; Owner: topems
--

ALTER TABLE ONLY storage.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: inbound_order_items inbound_order_items_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inbound_order_items
    ADD CONSTRAINT inbound_order_items_pkey PRIMARY KEY (id);


--
-- Name: inbound_orders inbound_orders_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inbound_orders
    ADD CONSTRAINT inbound_orders_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: outbound_order_items outbound_order_items_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.outbound_order_items
    ADD CONSTRAINT outbound_order_items_pkey PRIMARY KEY (id);


--
-- Name: outbound_orders outbound_orders_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.outbound_orders
    ADD CONSTRAINT outbound_orders_pkey PRIMARY KEY (id);


--
-- Name: stock_take_items stock_take_items_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.stock_take_items
    ADD CONSTRAINT stock_take_items_pkey PRIMARY KEY (id);


--
-- Name: stock_takes stock_takes_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.stock_takes
    ADD CONSTRAINT stock_takes_pkey PRIMARY KEY (id);


--
-- Name: transfer_items transfer_items_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfer_items
    ADD CONSTRAINT transfer_items_pkey PRIMARY KEY (id);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_audit_logs_action ON crm.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON crm.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON crm.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_audit_logs_resource ON crm.audit_logs USING btree (resource);


--
-- Name: idx_audit_logs_resource_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_audit_logs_resource_id ON crm.audit_logs USING btree (resource_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON crm.audit_logs USING btree (user_id);


--
-- Name: idx_contacts_customer_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_contacts_customer_id ON crm.contacts USING btree (customer_id);


--
-- Name: idx_contacts_email; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_contacts_email ON crm.contacts USING btree (email);


--
-- Name: idx_contacts_is_primary; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_contacts_is_primary ON crm.contacts USING btree (is_primary);


--
-- Name: idx_contacts_name; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_contacts_name ON crm.contacts USING btree (first_name, last_name);


--
-- Name: idx_contacts_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_contacts_organization_id ON crm.contacts USING btree (organization_id);


--
-- Name: idx_contacts_phone; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_contacts_phone ON crm.contacts USING btree (phone);


--
-- Name: idx_contacts_status; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_contacts_status ON crm.contacts USING btree (status);


--
-- Name: idx_customer_tags_customer_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customer_tags_customer_id ON crm.customer_tags USING btree (customer_id);


--
-- Name: idx_customer_tags_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customer_tags_organization_id ON crm.customer_tags USING btree (organization_id);


--
-- Name: idx_customer_tags_tag_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customer_tags_tag_id ON crm.customer_tags USING btree (tag_id);


--
-- Name: idx_customer_tags_unique; Type: INDEX; Schema: crm; Owner: topems
--

CREATE UNIQUE INDEX idx_customer_tags_unique ON crm.customer_tags USING btree (customer_id, tag_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_customers_code; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_code ON crm.customers USING btree (code);


--
-- Name: idx_customers_code_unique; Type: INDEX; Schema: crm; Owner: topems
--

CREATE UNIQUE INDEX idx_customers_code_unique ON crm.customers USING btree (code, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_customers_customer_type; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_customer_type ON crm.customers USING btree (customer_type);


--
-- Name: idx_customers_industry; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_industry ON crm.customers USING btree (industry);


--
-- Name: idx_customers_name; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_name ON crm.customers USING btree (name);


--
-- Name: idx_customers_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_organization_id ON crm.customers USING btree (organization_id);


--
-- Name: idx_customers_rating; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_rating ON crm.customers USING btree (rating);


--
-- Name: idx_customers_source; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_source ON crm.customers USING btree (source);


--
-- Name: idx_customers_status; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_customers_status ON crm.customers USING btree (status);


--
-- Name: idx_dashboard_metrics_name; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_name ON crm.dashboard_metrics USING btree (metric_name);


--
-- Name: idx_dashboard_metrics_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_organization_id ON crm.dashboard_metrics USING btree (organization_id);


--
-- Name: idx_dashboard_metrics_period; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_period ON crm.dashboard_metrics USING btree (period_type, period_start, period_end);


--
-- Name: idx_dashboard_metrics_type; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_type ON crm.dashboard_metrics USING btree (metric_type);


--
-- Name: idx_interactions_assigned_to; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_assigned_to ON crm.interactions USING btree (assigned_to);


--
-- Name: idx_interactions_completed_at; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_completed_at ON crm.interactions USING btree (completed_at);


--
-- Name: idx_interactions_contact_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_contact_id ON crm.interactions USING btree (contact_id);


--
-- Name: idx_interactions_customer_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_customer_id ON crm.interactions USING btree (customer_id);


--
-- Name: idx_interactions_opportunity_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_opportunity_id ON crm.interactions USING btree (opportunity_id);


--
-- Name: idx_interactions_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_organization_id ON crm.interactions USING btree (organization_id);


--
-- Name: idx_interactions_scheduled_at; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_scheduled_at ON crm.interactions USING btree (scheduled_at);


--
-- Name: idx_interactions_status; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_status ON crm.interactions USING btree (status);


--
-- Name: idx_interactions_type; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_interactions_type ON crm.interactions USING btree (interaction_type);


--
-- Name: idx_opportunities_assigned_to; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_assigned_to ON crm.opportunities USING btree (assigned_to);


--
-- Name: idx_opportunities_close_date; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_close_date ON crm.opportunities USING btree (close_date);


--
-- Name: idx_opportunities_code; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_code ON crm.opportunities USING btree (code);


--
-- Name: idx_opportunities_contact_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_contact_id ON crm.opportunities USING btree (contact_id);


--
-- Name: idx_opportunities_customer_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_customer_id ON crm.opportunities USING btree (customer_id);


--
-- Name: idx_opportunities_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_organization_id ON crm.opportunities USING btree (organization_id);


--
-- Name: idx_opportunities_priority; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_priority ON crm.opportunities USING btree (priority);


--
-- Name: idx_opportunities_stage; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_stage ON crm.opportunities USING btree (stage);


--
-- Name: idx_opportunities_status; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_opportunities_status ON crm.opportunities USING btree (status);


--
-- Name: idx_tags_category; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_tags_category ON crm.tags USING btree (category);


--
-- Name: idx_tags_name; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_tags_name ON crm.tags USING btree (name);


--
-- Name: idx_tags_name_unique; Type: INDEX; Schema: crm; Owner: topems
--

CREATE UNIQUE INDEX idx_tags_name_unique ON crm.tags USING btree (name, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_tags_organization_id; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_tags_organization_id ON crm.tags USING btree (organization_id);


--
-- Name: idx_tags_usage_count; Type: INDEX; Schema: crm; Owner: topems
--

CREATE INDEX idx_tags_usage_count ON crm.tags USING btree (usage_count);


--
-- Name: idx_archive_categories_code; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archive_categories_code ON doc_service.archive_categories USING btree (code);


--
-- Name: idx_archive_categories_parent_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archive_categories_parent_id ON doc_service.archive_categories USING btree (parent_id);


--
-- Name: idx_archive_metadata_archive_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archive_metadata_archive_id ON doc_service.archive_metadata USING btree (archive_id);


--
-- Name: idx_archives_archive_no; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archives_archive_no ON doc_service.archives USING btree (archive_no);


--
-- Name: idx_archives_category_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archives_category_id ON doc_service.archives USING btree (category_id);


--
-- Name: idx_archives_file_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archives_file_id ON doc_service.archives USING btree (file_id);


--
-- Name: idx_archives_source; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archives_source ON doc_service.archives USING btree (source_module, source_id);


--
-- Name: idx_archives_status; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_archives_status ON doc_service.archives USING btree (status);


--
-- Name: idx_borrows_archive_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_borrows_archive_id ON doc_service.archive_borrows USING btree (archive_id);


--
-- Name: idx_borrows_borrower_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_borrows_borrower_id ON doc_service.archive_borrows USING btree (borrower_id);


--
-- Name: idx_borrows_status; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_borrows_status ON doc_service.archive_borrows USING btree (status);


--
-- Name: idx_destructions_archive_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_destructions_archive_id ON doc_service.archive_destructions USING btree (archive_id);


--
-- Name: idx_destructions_status; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_destructions_status ON doc_service.archive_destructions USING btree (status);


--
-- Name: idx_faqs_category; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_faqs_category ON doc_service.faqs USING btree (category);


--
-- Name: idx_file_permissions_file_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_file_permissions_file_id ON doc_service.file_permissions USING btree (file_id);


--
-- Name: idx_file_permissions_role_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_file_permissions_role_id ON doc_service.file_permissions USING btree (role_id);


--
-- Name: idx_file_permissions_user_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_file_permissions_user_id ON doc_service.file_permissions USING btree (user_id);


--
-- Name: idx_file_versions_file_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_file_versions_file_id ON doc_service.file_versions USING btree (file_id);


--
-- Name: idx_files_created_by; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_files_created_by ON doc_service.files USING btree (created_by);


--
-- Name: idx_files_folder_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_files_folder_id ON doc_service.files USING btree (folder_id);


--
-- Name: idx_folder_permissions_folder_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_folder_permissions_folder_id ON doc_service.folder_permissions USING btree (folder_id);


--
-- Name: idx_folder_permissions_role_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_folder_permissions_role_id ON doc_service.folder_permissions USING btree (role_id);


--
-- Name: idx_folder_permissions_user_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_folder_permissions_user_id ON doc_service.folder_permissions USING btree (user_id);


--
-- Name: idx_folders_created_by; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_folders_created_by ON doc_service.folders USING btree (created_by);


--
-- Name: idx_folders_parent_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_folders_parent_id ON doc_service.folders USING btree (parent_id);


--
-- Name: idx_help_articles_category_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_help_articles_category_id ON doc_service.help_articles USING btree (category_id);


--
-- Name: idx_help_articles_module; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_help_articles_module ON doc_service.help_articles USING btree (module);


--
-- Name: idx_help_articles_slug; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_help_articles_slug ON doc_service.help_articles USING btree (slug);


--
-- Name: idx_help_articles_tags; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_help_articles_tags ON doc_service.help_articles USING gin (tags);


--
-- Name: idx_templates_category_id; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_templates_category_id ON doc_service.templates USING btree (category_id);


--
-- Name: idx_templates_is_active; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_templates_is_active ON doc_service.templates USING btree (is_active);


--
-- Name: idx_templates_module; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_templates_module ON doc_service.templates USING btree (module);


--
-- Name: idx_video_tutorials_module; Type: INDEX; Schema: doc_service; Owner: topems
--

CREATE INDEX idx_video_tutorials_module ON doc_service.video_tutorials USING btree (module);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_audit_logs_created ON ehs.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_audit_logs_module ON ehs.audit_logs USING btree (module);


--
-- Name: idx_drill_records_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_drill_records_no ON ehs.drill_records USING btree (drill_no);


--
-- Name: idx_emergency_plans_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_emergency_plans_no ON ehs.emergency_plans USING btree (plan_no);


--
-- Name: idx_environmental_alerts_point; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_environmental_alerts_point ON ehs.environmental_alerts USING btree (point_id);


--
-- Name: idx_environmental_alerts_status; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_environmental_alerts_status ON ehs.environmental_alerts USING btree (status);


--
-- Name: idx_environmental_data_point; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_environmental_data_point ON ehs.environmental_data USING btree (point_id);


--
-- Name: idx_environmental_data_time; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_environmental_data_time ON ehs.environmental_data USING btree (data_time);


--
-- Name: idx_health_checkups_employee; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_health_checkups_employee ON ehs.health_checkups USING btree (employee_id);


--
-- Name: idx_health_records_employee; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_health_records_employee ON ehs.health_records USING btree (employee_id);


--
-- Name: idx_monitoring_points_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_monitoring_points_no ON ehs.monitoring_points USING btree (point_no);


--
-- Name: idx_risk_assessments_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_risk_assessments_no ON ehs.risk_assessments USING btree (assessment_no);


--
-- Name: idx_risk_controls_assessment; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_risk_controls_assessment ON ehs.risk_controls USING btree (assessment_id);


--
-- Name: idx_safety_checks_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_checks_no ON ehs.safety_checks USING btree (check_no);


--
-- Name: idx_safety_checks_status; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_checks_status ON ehs.safety_checks USING btree (status);


--
-- Name: idx_safety_hazards_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_hazards_no ON ehs.safety_hazards USING btree (hazard_no);


--
-- Name: idx_safety_hazards_status; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_hazards_status ON ehs.safety_hazards USING btree (status);


--
-- Name: idx_safety_incidents_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_incidents_no ON ehs.safety_incidents USING btree (incident_no);


--
-- Name: idx_safety_incidents_status; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_incidents_status ON ehs.safety_incidents USING btree (status);


--
-- Name: idx_training_programs_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_training_programs_no ON ehs.training_programs USING btree (program_no);


--
-- Name: idx_training_records_employee; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_training_records_employee ON ehs.training_records USING btree (employee_id);


--
-- Name: idx_training_records_program; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_training_records_program ON ehs.training_records USING btree (program_id);


--
-- Name: idx_vaccination_records_employee; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_vaccination_records_employee ON ehs.vaccination_records USING btree (employee_id);


--
-- Name: idx_accounting_subjects_code; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_accounting_subjects_code ON erp.accounting_subjects USING btree (code);


--
-- Name: idx_accounting_subjects_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_accounting_subjects_deleted_at ON erp.accounting_subjects USING btree (deleted_at);


--
-- Name: idx_accounting_subjects_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_accounting_subjects_organization_id ON erp.accounting_subjects USING btree (organization_id);


--
-- Name: idx_accounting_subjects_parent; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_accounting_subjects_parent ON erp.accounting_subjects USING btree (parent_code);


--
-- Name: idx_assets_asset_number; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_assets_asset_number ON erp.assets USING btree (asset_number);


--
-- Name: idx_assets_category; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_assets_category ON erp.assets USING btree (category);


--
-- Name: idx_assets_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_assets_deleted_at ON erp.assets USING btree (deleted_at);


--
-- Name: idx_assets_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_assets_organization_id ON erp.assets USING btree (organization_id);


--
-- Name: idx_assets_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_assets_status ON erp.assets USING btree (status);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_audit_logs_action ON erp.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON erp.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_audit_logs_deleted_at ON erp.audit_logs USING btree (deleted_at);


--
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_audit_logs_entity_type ON erp.audit_logs USING btree (entity_type);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON erp.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_audit_logs_status ON erp.audit_logs USING btree (status);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON erp.audit_logs USING btree (user_id);


--
-- Name: idx_budgets_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_budgets_deleted_at ON erp.budgets USING btree (deleted_at);


--
-- Name: idx_budgets_fiscal_year; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_budgets_fiscal_year ON erp.budgets USING btree (fiscal_year);


--
-- Name: idx_budgets_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_budgets_organization_id ON erp.budgets USING btree (organization_id);


--
-- Name: idx_budgets_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_budgets_status ON erp.budgets USING btree (status);


--
-- Name: idx_db_changes_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_db_changes_deleted_at ON erp.db_changes USING btree (deleted_at);


--
-- Name: idx_db_changes_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_db_changes_organization_id ON erp.db_changes USING btree (organization_id);


--
-- Name: idx_db_changes_table; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_db_changes_table ON erp.db_changes USING btree (table_name);


--
-- Name: idx_db_changes_time; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_db_changes_time ON erp.db_changes USING btree (executed_at DESC);


--
-- Name: idx_dict_items_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_items_deleted_at ON erp.dict_items USING btree (deleted_at);


--
-- Name: idx_dict_items_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_items_organization_id ON erp.dict_items USING btree (organization_id);


--
-- Name: idx_dict_items_parent; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_items_parent ON erp.dict_items USING btree (parent_id);


--
-- Name: idx_dict_items_type; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_items_type ON erp.dict_items USING btree (dict_type_id);


--
-- Name: idx_dict_types_category; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_types_category ON erp.dict_types USING btree (category);


--
-- Name: idx_dict_types_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_types_deleted_at ON erp.dict_types USING btree (deleted_at);


--
-- Name: idx_dict_types_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_types_organization_id ON erp.dict_types USING btree (organization_id);


--
-- Name: idx_dict_types_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_dict_types_status ON erp.dict_types USING btree (status);


--
-- Name: idx_expenses_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_expenses_deleted_at ON erp.expenses USING btree (deleted_at);


--
-- Name: idx_expenses_expense_number; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_expenses_expense_number ON erp.expenses USING btree (expense_number);


--
-- Name: idx_expenses_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_expenses_organization_id ON erp.expenses USING btree (organization_id);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_expenses_status ON erp.expenses USING btree (status);


--
-- Name: idx_financial_vouchers_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_financial_vouchers_deleted_at ON erp.financial_vouchers USING btree (deleted_at);


--
-- Name: idx_financial_vouchers_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_financial_vouchers_organization_id ON erp.financial_vouchers USING btree (organization_id);


--
-- Name: idx_financial_vouchers_period; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_financial_vouchers_period ON erp.financial_vouchers USING btree (period);


--
-- Name: idx_financial_vouchers_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_financial_vouchers_status ON erp.financial_vouchers USING btree (status);


--
-- Name: idx_financial_vouchers_voucher_number; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_financial_vouchers_voucher_number ON erp.financial_vouchers USING btree (voucher_number);


--
-- Name: idx_payables_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_payables_deleted_at ON erp.payables USING btree (deleted_at);


--
-- Name: idx_payables_invoice_number; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_payables_invoice_number ON erp.payables USING btree (invoice_number);


--
-- Name: idx_payables_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_payables_organization_id ON erp.payables USING btree (organization_id);


--
-- Name: idx_payables_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_payables_status ON erp.payables USING btree (status);


--
-- Name: idx_receivables_deleted_at; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_receivables_deleted_at ON erp.receivables USING btree (deleted_at);


--
-- Name: idx_receivables_invoice_number; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_receivables_invoice_number ON erp.receivables USING btree (invoice_number);


--
-- Name: idx_receivables_organization_id; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_receivables_organization_id ON erp.receivables USING btree (organization_id);


--
-- Name: idx_receivables_status; Type: INDEX; Schema: erp; Owner: topems
--

CREATE INDEX idx_receivables_status ON erp.receivables USING btree (status);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON gis.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_audit_logs_deleted_at ON gis.audit_logs USING btree (deleted_at);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON gis.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_resource_type; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_audit_logs_resource_type ON gis.audit_logs USING btree (resource_type);


--
-- Name: idx_business_locations_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_business_locations_deleted_at ON gis.business_locations USING btree (deleted_at);


--
-- Name: idx_business_locations_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_business_locations_organization_id ON gis.business_locations USING btree (organization_id);


--
-- Name: idx_business_locations_position; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_business_locations_position ON gis.business_locations USING gin ("position");


--
-- Name: idx_business_locations_type; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_business_locations_type ON gis.business_locations USING btree (business_type);


--
-- Name: idx_device_location_records_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_device_location_records_deleted_at ON gis.device_location_records USING btree (deleted_at);


--
-- Name: idx_device_location_records_device_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_device_location_records_device_id ON gis.device_location_records USING btree (device_id);


--
-- Name: idx_device_location_records_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_device_location_records_organization_id ON gis.device_location_records USING btree (organization_id);


--
-- Name: idx_device_location_records_recorded_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_device_location_records_recorded_at ON gis.device_location_records USING btree (recorded_at);


--
-- Name: idx_device_locations_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_device_locations_deleted_at ON gis.device_locations USING btree (deleted_at);


--
-- Name: idx_device_locations_map_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_device_locations_map_id ON gis.device_locations USING btree (map_id);


--
-- Name: idx_device_locations_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_device_locations_organization_id ON gis.device_locations USING btree (organization_id);


--
-- Name: idx_devices_code; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_devices_code ON gis.devices USING btree (device_code);


--
-- Name: idx_devices_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_devices_deleted_at ON gis.devices USING btree (deleted_at);


--
-- Name: idx_devices_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_devices_organization_id ON gis.devices USING btree (organization_id);


--
-- Name: idx_factory_maps_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_factory_maps_deleted_at ON gis.factory_maps USING btree (deleted_at);


--
-- Name: idx_factory_maps_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_factory_maps_organization_id ON gis.factory_maps USING btree (organization_id);


--
-- Name: idx_geodata_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_geodata_deleted_at ON gis.geodata USING btree (deleted_at);


--
-- Name: idx_geodata_name; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_geodata_name ON gis.geodata USING btree (name);


--
-- Name: idx_geodata_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_geodata_organization_id ON gis.geodata USING btree (organization_id);


--
-- Name: idx_geofeatures_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_geofeatures_deleted_at ON gis.geofeatures USING btree (deleted_at);


--
-- Name: idx_geofeatures_geodata_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_geofeatures_geodata_id ON gis.geofeatures USING btree (geodata_id);


--
-- Name: idx_geofeatures_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_geofeatures_organization_id ON gis.geofeatures USING btree (organization_id);


--
-- Name: idx_geofeatures_type; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_geofeatures_type ON gis.geofeatures USING btree (feature_type);


--
-- Name: idx_gis_device_location_records_device_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_gis_device_location_records_device_id ON gis.device_location_records USING btree (device_id);


--
-- Name: idx_gis_device_location_records_recorded_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_gis_device_location_records_recorded_at ON gis.device_location_records USING btree (recorded_at);


--
-- Name: idx_gis_geofeatures_geodata_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_gis_geofeatures_geodata_id ON gis.geofeatures USING btree (geodata_id);


--
-- Name: idx_location_photos_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_location_photos_deleted_at ON gis.location_photos USING btree (deleted_at);


--
-- Name: idx_location_photos_map_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_location_photos_map_id ON gis.location_photos USING btree (map_id);


--
-- Name: idx_location_photos_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_location_photos_organization_id ON gis.location_photos USING btree (organization_id);


--
-- Name: idx_locations_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_locations_deleted_at ON gis.locations USING btree (deleted_at);


--
-- Name: idx_locations_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_locations_organization_id ON gis.locations USING btree (organization_id);


--
-- Name: idx_locations_position; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_locations_position ON gis.locations USING gin ("position");


--
-- Name: idx_locations_type; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_locations_type ON gis.locations USING btree (location_type);


--
-- Name: idx_map_layers_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_map_layers_deleted_at ON gis.map_layers USING btree (deleted_at);


--
-- Name: idx_map_layers_map_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_map_layers_map_id ON gis.map_layers USING btree (map_id);


--
-- Name: idx_map_layers_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_map_layers_organization_id ON gis.map_layers USING btree (organization_id);


--
-- Name: idx_map_markers_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_map_markers_deleted_at ON gis.map_markers USING btree (deleted_at);


--
-- Name: idx_map_markers_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_map_markers_organization_id ON gis.map_markers USING btree (organization_id);


--
-- Name: idx_map_markers_type; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_map_markers_type ON gis.map_markers USING btree (marker_type);


--
-- Name: idx_maps_code; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_maps_code ON gis.maps USING btree (code);


--
-- Name: idx_maps_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_maps_deleted_at ON gis.maps USING btree (deleted_at);


--
-- Name: idx_maps_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_maps_organization_id ON gis.maps USING btree (organization_id);


--
-- Name: idx_pipelines_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_pipelines_deleted_at ON gis.pipelines USING btree (deleted_at);


--
-- Name: idx_pipelines_map_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_pipelines_map_id ON gis.pipelines USING btree (map_id);


--
-- Name: idx_pipelines_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_pipelines_organization_id ON gis.pipelines USING btree (organization_id);


--
-- Name: idx_spatial_analysis_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_spatial_analysis_deleted_at ON gis.spatial_analysis USING btree (deleted_at);


--
-- Name: idx_spatial_analysis_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_spatial_analysis_organization_id ON gis.spatial_analysis USING btree (organization_id);


--
-- Name: idx_warehouse_locations_deleted_at; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_warehouse_locations_deleted_at ON gis.warehouse_locations USING btree (deleted_at);


--
-- Name: idx_warehouse_locations_map_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_warehouse_locations_map_id ON gis.warehouse_locations USING btree (map_id);


--
-- Name: idx_warehouse_locations_organization_id; Type: INDEX; Schema: gis; Owner: topems
--

CREATE INDEX idx_warehouse_locations_organization_id ON gis.warehouse_locations USING btree (organization_id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_attendance_date ON hrm.attendance_records USING btree (date);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE UNIQUE INDEX idx_attendance_employee_date ON hrm.attendance_records USING btree (employee_id, date) WHERE (deleted_at IS NULL);


--
-- Name: idx_attendance_employee_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_attendance_employee_id ON hrm.attendance_records USING btree (employee_id);


--
-- Name: idx_attendance_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_attendance_organization_id ON hrm.attendance_records USING btree (organization_id);


--
-- Name: idx_attendance_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_attendance_status ON hrm.attendance_records USING btree (status);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_audit_logs_action ON hrm.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON hrm.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON hrm.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_audit_logs_resource ON hrm.audit_logs USING btree (resource);


--
-- Name: idx_audit_logs_resource_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_audit_logs_resource_id ON hrm.audit_logs USING btree (resource_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON hrm.audit_logs USING btree (user_id);


--
-- Name: idx_companies_name; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_companies_name ON hrm.companies USING btree (name);


--
-- Name: idx_companies_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_companies_organization_id ON hrm.companies USING btree (organization_id);


--
-- Name: idx_companies_registration_number; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE UNIQUE INDEX idx_companies_registration_number ON hrm.companies USING btree (registration_number) WHERE (deleted_at IS NULL);


--
-- Name: idx_companies_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_companies_status ON hrm.companies USING btree (status);


--
-- Name: idx_contracts_contract_no; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_contracts_contract_no ON hrm.contracts USING btree (contract_no);


--
-- Name: idx_contracts_contract_type; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_contracts_contract_type ON hrm.contracts USING btree (contract_type);


--
-- Name: idx_contracts_employee_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_contracts_employee_id ON hrm.contracts USING btree (employee_id);


--
-- Name: idx_contracts_end_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_contracts_end_date ON hrm.contracts USING btree (end_date);


--
-- Name: idx_contracts_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_contracts_organization_id ON hrm.contracts USING btree (organization_id);


--
-- Name: idx_contracts_start_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_contracts_start_date ON hrm.contracts USING btree (start_date);


--
-- Name: idx_contracts_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_contracts_status ON hrm.contracts USING btree (status);


--
-- Name: idx_departments_code; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_departments_code ON hrm.departments USING btree (code);


--
-- Name: idx_departments_company_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_departments_company_id ON hrm.departments USING btree (company_id);


--
-- Name: idx_departments_manager_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_departments_manager_id ON hrm.departments USING btree (manager_id);


--
-- Name: idx_departments_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_departments_organization_id ON hrm.departments USING btree (organization_id);


--
-- Name: idx_departments_parent_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_departments_parent_id ON hrm.departments USING btree (parent_id);


--
-- Name: idx_departments_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_departments_status ON hrm.departments USING btree (status);


--
-- Name: idx_employees_company_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_company_id ON hrm.employees USING btree (company_id);


--
-- Name: idx_employees_department_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_department_id ON hrm.employees USING btree (department_id);


--
-- Name: idx_employees_employee_number; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_employee_number ON hrm.employees USING btree (employee_number);


--
-- Name: idx_employees_employee_number_unique; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE UNIQUE INDEX idx_employees_employee_number_unique ON hrm.employees USING btree (employee_number, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_employees_hire_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_hire_date ON hrm.employees USING btree (hire_date);


--
-- Name: idx_employees_name; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_name ON hrm.employees USING btree (name);


--
-- Name: idx_employees_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_organization_id ON hrm.employees USING btree (organization_id);


--
-- Name: idx_employees_position_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_position_id ON hrm.employees USING btree (position_id);


--
-- Name: idx_employees_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_employees_status ON hrm.employees USING btree (status);


--
-- Name: idx_leave_approval_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_leave_approval_status ON hrm.leave_records USING btree (approval_status);


--
-- Name: idx_leave_dates; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_leave_dates ON hrm.leave_records USING btree (start_date, end_date);


--
-- Name: idx_leave_employee_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_leave_employee_id ON hrm.leave_records USING btree (employee_id);


--
-- Name: idx_leave_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_leave_organization_id ON hrm.leave_records USING btree (organization_id);


--
-- Name: idx_leave_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_leave_status ON hrm.leave_records USING btree (status);


--
-- Name: idx_leave_type; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_leave_type ON hrm.leave_records USING btree (leave_type);


--
-- Name: idx_payroll_employee_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_payroll_employee_id ON hrm.payroll_records USING btree (employee_id);


--
-- Name: idx_payroll_employee_period; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE UNIQUE INDEX idx_payroll_employee_period ON hrm.payroll_records USING btree (employee_id, period_year, period_month) WHERE (deleted_at IS NULL);


--
-- Name: idx_payroll_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_payroll_organization_id ON hrm.payroll_records USING btree (organization_id);


--
-- Name: idx_payroll_payment_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_payroll_payment_date ON hrm.payroll_records USING btree (payment_date);


--
-- Name: idx_payroll_period; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_payroll_period ON hrm.payroll_records USING btree (period_year, period_month);


--
-- Name: idx_payroll_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_payroll_status ON hrm.payroll_records USING btree (status);


--
-- Name: idx_performance_employee_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_performance_employee_id ON hrm.performance_records USING btree (employee_id);


--
-- Name: idx_performance_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_performance_organization_id ON hrm.performance_records USING btree (organization_id);


--
-- Name: idx_performance_period; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_performance_period ON hrm.performance_records USING btree (period_year, period_month, period_quarter);


--
-- Name: idx_performance_reviewer_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_performance_reviewer_id ON hrm.performance_records USING btree (reviewer_id);


--
-- Name: idx_performance_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_performance_status ON hrm.performance_records USING btree (status);


--
-- Name: idx_performance_type; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_performance_type ON hrm.performance_records USING btree (performance_type);


--
-- Name: idx_positions_code; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_positions_code ON hrm.positions USING btree (code);


--
-- Name: idx_positions_company_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_positions_company_id ON hrm.positions USING btree (company_id);


--
-- Name: idx_positions_department_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_positions_department_id ON hrm.positions USING btree (department_id);


--
-- Name: idx_positions_level; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_positions_level ON hrm.positions USING btree (level);


--
-- Name: idx_positions_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_positions_organization_id ON hrm.positions USING btree (organization_id);


--
-- Name: idx_positions_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_positions_status ON hrm.positions USING btree (status);


--
-- Name: idx_recruitment_applications_application_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_applications_application_date ON hrm.recruitment_applications USING btree (application_date);


--
-- Name: idx_recruitment_applications_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_applications_organization_id ON hrm.recruitment_applications USING btree (organization_id);


--
-- Name: idx_recruitment_applications_recruitment_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_applications_recruitment_id ON hrm.recruitment_applications USING btree (recruitment_id);


--
-- Name: idx_recruitment_applications_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_applications_status ON hrm.recruitment_applications USING btree (status);


--
-- Name: idx_recruitment_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_organization_id ON hrm.recruitment_records USING btree (organization_id);


--
-- Name: idx_recruitment_position_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_position_id ON hrm.recruitment_records USING btree (position_id);


--
-- Name: idx_recruitment_publish_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_publish_date ON hrm.recruitment_records USING btree (publish_date);


--
-- Name: idx_recruitment_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_recruitment_status ON hrm.recruitment_records USING btree (status);


--
-- Name: idx_salary_adjustments_effective_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_salary_adjustments_effective_date ON hrm.salary_adjustments USING btree (effective_date);


--
-- Name: idx_salary_adjustments_employee_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_salary_adjustments_employee_id ON hrm.salary_adjustments USING btree (employee_id);


--
-- Name: idx_salary_adjustments_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_salary_adjustments_organization_id ON hrm.salary_adjustments USING btree (organization_id);


--
-- Name: idx_salary_adjustments_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_salary_adjustments_status ON hrm.salary_adjustments USING btree (status);


--
-- Name: idx_salary_adjustments_type; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_salary_adjustments_type ON hrm.salary_adjustments USING btree (adjustment_type);


--
-- Name: idx_training_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_organization_id ON hrm.training_records USING btree (organization_id);


--
-- Name: idx_training_participants_employee_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_participants_employee_id ON hrm.training_participants USING btree (employee_id);


--
-- Name: idx_training_participants_organization_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_participants_organization_id ON hrm.training_participants USING btree (organization_id);


--
-- Name: idx_training_participants_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_participants_status ON hrm.training_participants USING btree (participation_status);


--
-- Name: idx_training_participants_training_id; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_participants_training_id ON hrm.training_participants USING btree (training_id);


--
-- Name: idx_training_participants_unique; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE UNIQUE INDEX idx_training_participants_unique ON hrm.training_participants USING btree (training_id, employee_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_training_start_date; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_start_date ON hrm.training_records USING btree (start_date);


--
-- Name: idx_training_status; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_status ON hrm.training_records USING btree (status);


--
-- Name: idx_training_type; Type: INDEX; Schema: hrm; Owner: topems
--

CREATE INDEX idx_training_type ON hrm.training_records USING btree (training_type);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: iam; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON iam.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: iam; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON iam.audit_logs USING btree (user_id);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: iam; Owner: topems
--

CREATE INDEX idx_role_permissions_permission_id ON iam.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: iam; Owner: topems
--

CREATE INDEX idx_role_permissions_role_id ON iam.role_permissions USING btree (role_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: iam; Owner: topems
--

CREATE INDEX idx_user_roles_role_id ON iam.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: iam; Owner: topems
--

CREATE INDEX idx_user_roles_user_id ON iam.user_roles USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_audit_logs_action ON im.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON im.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_audit_logs_deleted_at ON im.audit_logs USING btree (deleted_at);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON im.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON im.audit_logs USING btree (user_id);


--
-- Name: idx_chat_room_members_chat_room_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_chat_room_members_chat_room_id ON im.chat_room_members USING btree (chat_room_id);


--
-- Name: idx_chat_room_members_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_chat_room_members_deleted_at ON im.chat_room_members USING btree (deleted_at);


--
-- Name: idx_chat_room_members_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_chat_room_members_organization_id ON im.chat_room_members USING btree (organization_id);


--
-- Name: idx_chat_room_members_user_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_chat_room_members_user_id ON im.chat_room_members USING btree (user_id);


--
-- Name: idx_chat_rooms_created_by; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_chat_rooms_created_by ON im.chat_rooms USING btree (created_by);


--
-- Name: idx_chat_rooms_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_chat_rooms_deleted_at ON im.chat_rooms USING btree (deleted_at);


--
-- Name: idx_chat_rooms_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_chat_rooms_organization_id ON im.chat_rooms USING btree (organization_id);


--
-- Name: idx_contact_group_members_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_contact_group_members_deleted_at ON im.contact_group_members USING btree (deleted_at);


--
-- Name: idx_contact_group_members_group_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_contact_group_members_group_id ON im.contact_group_members USING btree (group_id);


--
-- Name: idx_contact_group_members_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_contact_group_members_organization_id ON im.contact_group_members USING btree (organization_id);


--
-- Name: idx_contact_groups_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_contact_groups_deleted_at ON im.contact_groups USING btree (deleted_at);


--
-- Name: idx_contact_groups_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_contact_groups_organization_id ON im.contact_groups USING btree (organization_id);


--
-- Name: idx_contact_groups_user_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_contact_groups_user_id ON im.contact_groups USING btree (user_id);


--
-- Name: idx_file_transfers_chat_room_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_file_transfers_chat_room_id ON im.file_transfers USING btree (chat_room_id);


--
-- Name: idx_file_transfers_created_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_file_transfers_created_at ON im.file_transfers USING btree (created_at);


--
-- Name: idx_file_transfers_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_file_transfers_deleted_at ON im.file_transfers USING btree (deleted_at);


--
-- Name: idx_file_transfers_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_file_transfers_organization_id ON im.file_transfers USING btree (organization_id);


--
-- Name: idx_file_transfers_uploader_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_file_transfers_uploader_id ON im.file_transfers USING btree (uploader_id);


--
-- Name: idx_friends_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_friends_deleted_at ON im.friends USING btree (deleted_at);


--
-- Name: idx_friends_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_friends_organization_id ON im.friends USING btree (organization_id);


--
-- Name: idx_friends_status; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_friends_status ON im.friends USING btree (status);


--
-- Name: idx_friends_user_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_friends_user_id ON im.friends USING btree (user_id);


--
-- Name: idx_message_read_receipts_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_message_read_receipts_deleted_at ON im.message_read_receipts USING btree (deleted_at);


--
-- Name: idx_message_read_receipts_message_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_message_read_receipts_message_id ON im.message_read_receipts USING btree (message_id);


--
-- Name: idx_message_read_receipts_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_message_read_receipts_organization_id ON im.message_read_receipts USING btree (organization_id);


--
-- Name: idx_message_read_receipts_user_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_message_read_receipts_user_id ON im.message_read_receipts USING btree (user_id);


--
-- Name: idx_messages_chat_room_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_messages_chat_room_id ON im.messages USING btree (chat_room_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_messages_created_at ON im.messages USING btree (created_at);


--
-- Name: idx_messages_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_messages_deleted_at ON im.messages USING btree (deleted_at);


--
-- Name: idx_messages_is_read; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_messages_is_read ON im.messages USING btree (is_read);


--
-- Name: idx_messages_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_messages_organization_id ON im.messages USING btree (organization_id);


--
-- Name: idx_messages_receiver_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_messages_receiver_id ON im.messages USING btree (receiver_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_messages_sender_id ON im.messages USING btree (sender_id);


--
-- Name: idx_notifications_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_notifications_deleted_at ON im.notifications USING btree (deleted_at);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_notifications_is_read ON im.notifications USING btree (is_read);


--
-- Name: idx_notifications_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_notifications_organization_id ON im.notifications USING btree (organization_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_notifications_user_id ON im.notifications USING btree (user_id);


--
-- Name: idx_project_groups_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_project_groups_deleted_at ON im.project_groups USING btree (deleted_at);


--
-- Name: idx_project_groups_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_project_groups_organization_id ON im.project_groups USING btree (organization_id);


--
-- Name: idx_user_status_deleted_at; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_user_status_deleted_at ON im.user_status USING btree (deleted_at);


--
-- Name: idx_user_status_is_online; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_user_status_is_online ON im.user_status USING btree (is_online);


--
-- Name: idx_user_status_organization_id; Type: INDEX; Schema: im; Owner: topems
--

CREATE INDEX idx_user_status_organization_id ON im.user_status USING btree (organization_id);


--
-- Name: idx_integration_configs_name; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_integration_configs_name ON integration.integration_configs USING btree (config_name);


--
-- Name: idx_integration_events_created; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_integration_events_created ON integration.integration_events USING btree (created_at);


--
-- Name: idx_integration_events_source; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_integration_events_source ON integration.integration_events USING btree (source_system);


--
-- Name: idx_integration_events_status; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_integration_events_status ON integration.integration_events USING btree (status);


--
-- Name: idx_integration_events_target; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_integration_events_target ON integration.integration_events USING btree (target_system);


--
-- Name: idx_lims_qms_sync_sample; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_lims_qms_sync_sample ON integration.lims_qms_sync USING btree (lims_sample_id);


--
-- Name: idx_lims_qms_sync_status; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_lims_qms_sync_status ON integration.lims_qms_sync USING btree (sync_status);


--
-- Name: idx_mes_erp_sync_order; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_mes_erp_sync_order ON integration.mes_erp_sync USING btree (mes_order_id);


--
-- Name: idx_mes_erp_sync_status; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_mes_erp_sync_status ON integration.mes_erp_sync USING btree (sync_status);


--
-- Name: idx_wms_scm_sync_inventory; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_wms_scm_sync_inventory ON integration.wms_scm_sync USING btree (wms_inventory_id);


--
-- Name: idx_wms_scm_sync_status; Type: INDEX; Schema: integration; Owner: topems
--

CREATE INDEX idx_wms_scm_sync_status ON integration.wms_scm_sync USING btree (sync_status);


--
-- Name: idx_ai_analyses_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_ai_analyses_deleted_at ON lims.ai_analyses USING btree (deleted_at);


--
-- Name: idx_ai_analyses_entity; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_ai_analyses_entity ON lims.ai_analyses USING btree (entity_type, entity_id);


--
-- Name: idx_ai_analyses_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_ai_analyses_organization_id ON lims.ai_analyses USING btree (organization_id);


--
-- Name: idx_audit_logs_action_type; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_audit_logs_action_type ON lims.audit_logs USING btree (action_type);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON lims.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_audit_logs_deleted_at ON lims.audit_logs USING btree (deleted_at);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON lims.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_target_type; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_audit_logs_target_type ON lims.audit_logs USING btree (target_type);


--
-- Name: idx_document_relations_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_document_relations_deleted_at ON lims.document_relations USING btree (deleted_at);


--
-- Name: idx_document_relations_entity; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_document_relations_entity ON lims.document_relations USING btree (entity_type, entity_id);


--
-- Name: idx_document_relations_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_document_relations_organization_id ON lims.document_relations USING btree (organization_id);


--
-- Name: idx_inspection_processes_code; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_processes_code ON lims.inspection_processes USING btree (code);


--
-- Name: idx_inspection_processes_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_processes_deleted_at ON lims.inspection_processes USING btree (deleted_at);


--
-- Name: idx_inspection_processes_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_processes_organization_id ON lims.inspection_processes USING btree (organization_id);


--
-- Name: idx_inspection_processes_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_processes_status ON lims.inspection_processes USING btree (status);


--
-- Name: idx_inspection_records_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_records_deleted_at ON lims.inspection_records USING btree (deleted_at);


--
-- Name: idx_inspection_records_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_records_organization_id ON lims.inspection_records USING btree (organization_id);


--
-- Name: idx_inspection_records_task_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_records_task_id ON lims.inspection_records USING btree (task_id);


--
-- Name: idx_inspection_tasks_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_tasks_deleted_at ON lims.inspection_tasks USING btree (deleted_at);


--
-- Name: idx_inspection_tasks_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_tasks_organization_id ON lims.inspection_tasks USING btree (organization_id);


--
-- Name: idx_inspection_tasks_process_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_tasks_process_id ON lims.inspection_tasks USING btree (process_id);


--
-- Name: idx_inspection_tasks_sample_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_tasks_sample_id ON lims.inspection_tasks USING btree (sample_id);


--
-- Name: idx_inspection_tasks_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_inspection_tasks_status ON lims.inspection_tasks USING btree (status);


--
-- Name: idx_instrument_calibrations_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_instrument_calibrations_deleted_at ON lims.instrument_calibrations USING btree (deleted_at);


--
-- Name: idx_instrument_calibrations_instrument_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_instrument_calibrations_instrument_id ON lims.instrument_calibrations USING btree (instrument_id);


--
-- Name: idx_instrument_calibrations_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_instrument_calibrations_organization_id ON lims.instrument_calibrations USING btree (organization_id);


--
-- Name: idx_instruments_code; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_instruments_code ON lims.instruments USING btree (code);


--
-- Name: idx_instruments_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_instruments_deleted_at ON lims.instruments USING btree (deleted_at);


--
-- Name: idx_instruments_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_instruments_organization_id ON lims.instruments USING btree (organization_id);


--
-- Name: idx_instruments_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_instruments_status ON lims.instruments USING btree (status);


--
-- Name: idx_lab_ledger_code; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_lab_ledger_code ON lims.lab_ledger USING btree (code);


--
-- Name: idx_lab_ledger_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_lab_ledger_deleted_at ON lims.lab_ledger USING btree (deleted_at);


--
-- Name: idx_lab_ledger_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_lab_ledger_organization_id ON lims.lab_ledger USING btree (organization_id);


--
-- Name: idx_maintenance_records_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_maintenance_records_deleted_at ON lims.maintenance_records USING btree (deleted_at);


--
-- Name: idx_maintenance_records_instrument_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_maintenance_records_instrument_id ON lims.maintenance_records USING btree (instrument_id);


--
-- Name: idx_maintenance_records_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_maintenance_records_organization_id ON lims.maintenance_records USING btree (organization_id);


--
-- Name: idx_reagent_usages_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_reagent_usages_deleted_at ON lims.reagent_usages USING btree (deleted_at);


--
-- Name: idx_reagent_usages_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_reagent_usages_organization_id ON lims.reagent_usages USING btree (organization_id);


--
-- Name: idx_reagent_usages_reagent_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_reagent_usages_reagent_id ON lims.reagent_usages USING btree (reagent_id);


--
-- Name: idx_reagents_code; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_reagents_code ON lims.reagents USING btree (code);


--
-- Name: idx_reagents_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_reagents_deleted_at ON lims.reagents USING btree (deleted_at);


--
-- Name: idx_reagents_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_reagents_organization_id ON lims.reagents USING btree (organization_id);


--
-- Name: idx_reagents_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_reagents_status ON lims.reagents USING btree (status);


--
-- Name: idx_samples_code; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_samples_code ON lims.samples USING btree (code);


--
-- Name: idx_samples_deleted_at; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_samples_deleted_at ON lims.samples USING btree (deleted_at);


--
-- Name: idx_samples_organization_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_samples_organization_id ON lims.samples USING btree (organization_id);


--
-- Name: idx_samples_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_samples_status ON lims.samples USING btree (status);


--
-- Name: idx_mail_attachments_created_at; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_attachments_created_at ON mail.attachments USING btree (created_at DESC);


--
-- Name: idx_mail_attachments_created_by; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_attachments_created_by ON mail.attachments USING btree (created_by);


--
-- Name: idx_mail_attachments_email_id; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_attachments_email_id ON mail.attachments USING btree (email_id);


--
-- Name: idx_mail_attachments_filename; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_attachments_filename ON mail.attachments USING btree (filename);


--
-- Name: idx_mail_emails_created_at; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_emails_created_at ON mail.emails USING btree (created_at DESC);


--
-- Name: idx_mail_emails_priority; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_emails_priority ON mail.emails USING btree (priority);


--
-- Name: idx_mail_emails_status; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_emails_status ON mail.emails USING btree (status);


--
-- Name: idx_mail_templates_category; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_templates_category ON mail.templates USING btree (category);


--
-- Name: idx_mail_templates_code; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_templates_code ON mail.templates USING btree (code);


--
-- Name: idx_mail_templates_status; Type: INDEX; Schema: mail; Owner: topems
--

CREATE INDEX idx_mail_templates_status ON mail.templates USING btree (status);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_audit_logs_action ON mes.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON mes.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON mes.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_audit_logs_resource ON mes.audit_logs USING btree (resource);


--
-- Name: idx_audit_logs_resource_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_audit_logs_resource_id ON mes.audit_logs USING btree (resource_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON mes.audit_logs USING btree (user_id);


--
-- Name: idx_equipment_category; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_category ON mes.equipment USING btree (category);


--
-- Name: idx_equipment_code; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_code ON mes.equipment USING btree (equipment_code);


--
-- Name: idx_equipment_code_unique; Type: INDEX; Schema: mes; Owner: topems
--

CREATE UNIQUE INDEX idx_equipment_code_unique ON mes.equipment USING btree (equipment_code, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_equipment_inspection_date; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_inspection_date ON mes.equipment_inspection_records USING btree (inspection_date);


--
-- Name: idx_equipment_inspection_equipment_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_inspection_equipment_id ON mes.equipment_inspection_records USING btree (equipment_id);


--
-- Name: idx_equipment_inspection_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_inspection_organization_id ON mes.equipment_inspection_records USING btree (organization_id);


--
-- Name: idx_equipment_inspection_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_inspection_status ON mes.equipment_inspection_records USING btree (overall_status);


--
-- Name: idx_equipment_inspection_type; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_inspection_type ON mes.equipment_inspection_records USING btree (inspection_type);


--
-- Name: idx_equipment_location; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_location ON mes.equipment USING btree (location);


--
-- Name: idx_equipment_maintenance_end_time; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_maintenance_end_time ON mes.equipment_maintenance_records USING btree (end_time);


--
-- Name: idx_equipment_maintenance_equipment_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_maintenance_equipment_id ON mes.equipment_maintenance_records USING btree (equipment_id);


--
-- Name: idx_equipment_maintenance_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_maintenance_organization_id ON mes.equipment_maintenance_records USING btree (organization_id);


--
-- Name: idx_equipment_maintenance_start_time; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_maintenance_start_time ON mes.equipment_maintenance_records USING btree (start_time);


--
-- Name: idx_equipment_maintenance_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_maintenance_status ON mes.equipment_maintenance_records USING btree (status);


--
-- Name: idx_equipment_maintenance_type; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_maintenance_type ON mes.equipment_maintenance_records USING btree (maintenance_type);


--
-- Name: idx_equipment_name; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_name ON mes.equipment USING btree (equipment_name);


--
-- Name: idx_equipment_next_inspection_date; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_next_inspection_date ON mes.equipment USING btree (next_inspection_date);


--
-- Name: idx_equipment_next_maintenance_date; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_next_maintenance_date ON mes.equipment USING btree (next_maintenance_date);


--
-- Name: idx_equipment_operating_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_operating_status ON mes.equipment USING btree (operating_status);


--
-- Name: idx_equipment_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_organization_id ON mes.equipment USING btree (organization_id);


--
-- Name: idx_equipment_responsible_person; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_responsible_person ON mes.equipment USING btree (responsible_person);


--
-- Name: idx_equipment_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_status ON mes.equipment USING btree (status);


--
-- Name: idx_equipment_type; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_type ON mes.equipment USING btree (equipment_type);


--
-- Name: idx_equipment_work_station_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_equipment_work_station_id ON mes.equipment USING btree (work_station_id);


--
-- Name: idx_process_route_steps_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_route_steps_organization_id ON mes.process_route_steps USING btree (organization_id);


--
-- Name: idx_process_route_steps_process_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_route_steps_process_id ON mes.process_route_steps USING btree (process_id);


--
-- Name: idx_process_route_steps_route_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_route_steps_route_id ON mes.process_route_steps USING btree (route_id);


--
-- Name: idx_process_route_steps_sequence; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_route_steps_sequence ON mes.process_route_steps USING btree (sequence);


--
-- Name: idx_process_routes_code; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_routes_code ON mes.process_routes USING btree (route_code);


--
-- Name: idx_process_routes_code_unique; Type: INDEX; Schema: mes; Owner: topems
--

CREATE UNIQUE INDEX idx_process_routes_code_unique ON mes.process_routes USING btree (route_code, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_process_routes_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_routes_organization_id ON mes.process_routes USING btree (organization_id);


--
-- Name: idx_process_routes_product_code; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_routes_product_code ON mes.process_routes USING btree (product_code);


--
-- Name: idx_process_routes_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_process_routes_status ON mes.process_routes USING btree (status);


--
-- Name: idx_production_orders_actual_start_date; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_actual_start_date ON mes.production_orders USING btree (actual_start_date);


--
-- Name: idx_production_orders_assigned_to; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_assigned_to ON mes.production_orders USING btree (assigned_to);


--
-- Name: idx_production_orders_number_unique; Type: INDEX; Schema: mes; Owner: topems
--

CREATE UNIQUE INDEX idx_production_orders_number_unique ON mes.production_orders USING btree (order_number, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_production_orders_order_number; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_order_number ON mes.production_orders USING btree (order_number);


--
-- Name: idx_production_orders_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_organization_id ON mes.production_orders USING btree (organization_id);


--
-- Name: idx_production_orders_planned_end_date; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_planned_end_date ON mes.production_orders USING btree (planned_end_date);


--
-- Name: idx_production_orders_planned_start_date; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_planned_start_date ON mes.production_orders USING btree (planned_start_date);


--
-- Name: idx_production_orders_priority; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_priority ON mes.production_orders USING btree (priority);


--
-- Name: idx_production_orders_product_code; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_product_code ON mes.production_orders USING btree (product_code);


--
-- Name: idx_production_orders_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_status ON mes.production_orders USING btree (status);


--
-- Name: idx_production_orders_work_station_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_orders_work_station_id ON mes.production_orders USING btree (work_station_id);


--
-- Name: idx_production_processes_code; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_code ON mes.production_processes USING btree (process_code);


--
-- Name: idx_production_processes_name; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_name ON mes.production_processes USING btree (process_name);


--
-- Name: idx_production_processes_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_organization_id ON mes.production_processes USING btree (organization_id);


--
-- Name: idx_production_processes_predecessor_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_predecessor_id ON mes.production_processes USING btree (predecessor_process_id);


--
-- Name: idx_production_processes_sequence; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_sequence ON mes.production_processes USING btree (sequence);


--
-- Name: idx_production_processes_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_status ON mes.production_processes USING btree (status);


--
-- Name: idx_production_processes_successor_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_successor_id ON mes.production_processes USING btree (successor_process_id);


--
-- Name: idx_production_processes_work_station_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_processes_work_station_id ON mes.production_processes USING btree (work_station_id);


--
-- Name: idx_production_records_batch_number; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_batch_number ON mes.production_records USING btree (batch_number);


--
-- Name: idx_production_records_end_time; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_end_time ON mes.production_records USING btree (end_time);


--
-- Name: idx_production_records_operator; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_operator ON mes.production_records USING btree (operator);


--
-- Name: idx_production_records_order_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_order_id ON mes.production_records USING btree (order_id);


--
-- Name: idx_production_records_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_organization_id ON mes.production_records USING btree (organization_id);


--
-- Name: idx_production_records_process_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_process_id ON mes.production_records USING btree (process_id);


--
-- Name: idx_production_records_start_time; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_start_time ON mes.production_records USING btree (start_time);


--
-- Name: idx_production_records_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_status ON mes.production_records USING btree (status);


--
-- Name: idx_production_records_work_station_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_production_records_work_station_id ON mes.production_records USING btree (work_station_id);


--
-- Name: idx_work_stations_code; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_work_stations_code ON mes.work_stations USING btree (station_code);


--
-- Name: idx_work_stations_location; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_work_stations_location ON mes.work_stations USING btree (location);


--
-- Name: idx_work_stations_name; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_work_stations_name ON mes.work_stations USING btree (station_name);


--
-- Name: idx_work_stations_organization_id; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_work_stations_organization_id ON mes.work_stations USING btree (organization_id);


--
-- Name: idx_work_stations_status; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_work_stations_status ON mes.work_stations USING btree (status);


--
-- Name: idx_work_stations_supervisor; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_work_stations_supervisor ON mes.work_stations USING btree (supervisor);


--
-- Name: idx_work_stations_type; Type: INDEX; Schema: mes; Owner: topems
--

CREATE INDEX idx_work_stations_type ON mes.work_stations USING btree (station_type);


--
-- Name: idx_audio_recordings_recorded_by; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_audio_recordings_recorded_by ON mobile.audio_recordings USING btree (recorded_by);


--
-- Name: idx_mobile_tasks_assignee; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_mobile_tasks_assignee ON mobile.mobile_tasks USING btree (assignee);


--
-- Name: idx_mobile_tasks_due_date; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_mobile_tasks_due_date ON mobile.mobile_tasks USING btree (due_date);


--
-- Name: idx_mobile_tasks_status; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_mobile_tasks_status ON mobile.mobile_tasks USING btree (status);


--
-- Name: idx_mobile_tasks_type; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_mobile_tasks_type ON mobile.mobile_tasks USING btree (task_type);


--
-- Name: idx_patrol_records_checked_at; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_patrol_records_checked_at ON mobile.patrol_records USING btree (checked_at);


--
-- Name: idx_patrol_records_checked_by; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_patrol_records_checked_by ON mobile.patrol_records USING btree (checked_by);


--
-- Name: idx_patrol_records_status; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_patrol_records_status ON mobile.patrol_records USING btree (status);


--
-- Name: idx_patrol_records_type; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_patrol_records_type ON mobile.patrol_records USING btree (patrol_type);


--
-- Name: idx_photo_evidences_recorded_by; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_photo_evidences_recorded_by ON mobile.photo_evidences USING btree (recorded_by);


--
-- Name: idx_scan_records_barcode; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_scan_records_barcode ON mobile.scan_records USING btree (barcode);


--
-- Name: idx_scan_records_operator; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_scan_records_operator ON mobile.scan_records USING btree (operator);


--
-- Name: idx_scan_records_scanned_at; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_scan_records_scanned_at ON mobile.scan_records USING btree (scanned_at);


--
-- Name: idx_video_recordings_recorded_by; Type: INDEX; Schema: mobile; Owner: topems
--

CREATE INDEX idx_video_recordings_recorded_by ON mobile.video_recordings USING btree (recorded_by);


--
-- Name: idx_acceptances_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_acceptances_project ON pm.acceptances USING btree (project_id);


--
-- Name: idx_budgets_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_budgets_project ON pm.budgets USING btree (project_id);


--
-- Name: idx_contracts_no; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_contracts_no ON pm.contracts USING btree (contract_no);


--
-- Name: idx_contracts_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_contracts_project ON pm.contracts USING btree (project_id);


--
-- Name: idx_documents_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_documents_project ON pm.documents USING btree (project_id);


--
-- Name: idx_notifications_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_notifications_project ON pm.notifications USING btree (project_id);


--
-- Name: idx_project_approvals_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_approvals_project ON pm.project_approvals USING btree (project_id);


--
-- Name: idx_project_benefits_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_benefits_project ON pm.project_benefits USING btree (project_id);


--
-- Name: idx_project_expenses_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_expenses_project ON pm.project_expenses USING btree (project_id);


--
-- Name: idx_project_members_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_members_project ON pm.project_members USING btree (project_id);


--
-- Name: idx_project_members_user; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_members_user ON pm.project_members USING btree (user_id);


--
-- Name: idx_project_milestones_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_milestones_project ON pm.project_milestones USING btree (project_id);


--
-- Name: idx_project_phases_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_phases_project ON pm.project_phases USING btree (project_id);


--
-- Name: idx_project_resources_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_project_resources_project ON pm.project_resources USING btree (project_id);


--
-- Name: idx_projects_code; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_projects_code ON pm.projects USING btree (code);


--
-- Name: idx_projects_leader; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_projects_leader ON pm.projects USING btree (leader);


--
-- Name: idx_projects_parent; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_projects_parent ON pm.projects USING btree (parent_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_projects_status ON pm.projects USING btree (status);


--
-- Name: idx_quality_checks_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_quality_checks_project ON pm.quality_checks USING btree (project_id);


--
-- Name: idx_risks_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_risks_project ON pm.risks USING btree (project_id);


--
-- Name: idx_settlements_project; Type: INDEX; Schema: pm; Owner: topems
--

CREATE INDEX idx_settlements_project ON pm.settlements USING btree (project_id);


--
-- Name: idx_portal_access_logs_time; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_portal_access_logs_time ON portal.portal_access_logs USING btree (access_time);


--
-- Name: idx_portal_access_logs_user; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_portal_access_logs_user ON portal.portal_access_logs USING btree (user_id);


--
-- Name: idx_portal_announcements_publish; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_portal_announcements_publish ON portal.portal_announcements USING btree (publish_date);


--
-- Name: idx_portal_announcements_status; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_portal_announcements_status ON portal.portal_announcements USING btree (status);


--
-- Name: idx_portal_configs_key; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_portal_configs_key ON portal.portal_configs USING btree (config_key);


--
-- Name: idx_portal_menus_code; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_portal_menus_code ON portal.portal_menus USING btree (menu_code);


--
-- Name: idx_portal_menus_parent; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_portal_menus_parent ON portal.portal_menus USING btree (parent_id);


--
-- Name: idx_user_preferences_user; Type: INDEX; Schema: portal; Owner: topems
--

CREATE INDEX idx_user_preferences_user ON portal.user_preferences USING btree (user_id);


--
-- Name: idx_audio_recordings_created_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_audio_recordings_created_at ON public.audio_recordings USING btree (created_at);


--
-- Name: idx_business_locations_type; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_business_locations_type ON public.business_locations USING btree (business_type);


--
-- Name: idx_device_locations_map_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_device_locations_map_id ON public.device_locations USING btree (map_id);


--
-- Name: idx_devices_device_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_devices_device_id ON public.devices USING btree (device_id);


--
-- Name: idx_devices_user_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_devices_user_id ON public.devices USING btree (user_id);


--
-- Name: idx_location_photos_map_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_location_photos_map_id ON public.location_photos USING btree (map_id);


--
-- Name: idx_map_markers_type; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_map_markers_type ON public.map_markers USING btree (marker_type);


--
-- Name: idx_mobile_scan_records_user_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_mobile_scan_records_user_id ON public.mobile_scan_records USING btree (user_id);


--
-- Name: idx_mobile_tasks_created_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_mobile_tasks_created_at ON public.mobile_tasks USING btree (created_at);


--
-- Name: idx_mobile_tasks_status; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_mobile_tasks_status ON public.mobile_tasks USING btree (status);


--
-- Name: idx_mobile_users_username; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_mobile_users_username ON public.mobile_users USING btree (username);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_offline_sync_status; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_offline_sync_status ON public.offline_sync_records USING btree (status);


--
-- Name: idx_offline_sync_user_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_offline_sync_user_id ON public.offline_sync_records USING btree (user_id);


--
-- Name: idx_patrol_records_created_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_patrol_records_created_at ON public.patrol_records USING btree (created_at);


--
-- Name: idx_payment_schedules_contract_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_payment_schedules_contract_id ON public.payment_schedules USING btree (contract_id);


--
-- Name: idx_payment_schedules_organization_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_payment_schedules_organization_id ON public.payment_schedules USING btree (organization_id);


--
-- Name: idx_payment_schedules_status; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_payment_schedules_status ON public.payment_schedules USING btree (status);


--
-- Name: idx_photo_evidences_created_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_photo_evidences_created_at ON public.photo_evidences USING btree (created_at);


--
-- Name: idx_pipelines_map_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_pipelines_map_id ON public.pipelines USING btree (map_id);


--
-- Name: idx_project_contracts_contract_number; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_project_contracts_contract_number ON public.project_contracts USING btree (contract_number);


--
-- Name: idx_project_contracts_deleted_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_project_contracts_deleted_at ON public.project_contracts USING btree (deleted_at);


--
-- Name: idx_project_contracts_organization_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_project_contracts_organization_id ON public.project_contracts USING btree (organization_id);


--
-- Name: idx_project_contracts_status; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_project_contracts_status ON public.project_contracts USING btree (status);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (refresh_token);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_scan_records_created_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_scan_records_created_at ON public.scan_records USING btree (created_at);


--
-- Name: idx_shortcuts_sort_order; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_shortcuts_sort_order ON public.shortcuts USING btree (sort_order);


--
-- Name: idx_shortcuts_user_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_shortcuts_user_id ON public.shortcuts USING btree (user_id);


--
-- Name: idx_user_settings_user_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_user_settings_user_id ON public.user_settings USING btree (user_id);


--
-- Name: idx_video_recordings_created_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_video_recordings_created_at ON public.video_recordings USING btree (created_at);


--
-- Name: idx_voucher_items_deleted_at; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_voucher_items_deleted_at ON public.voucher_items USING btree (deleted_at);


--
-- Name: idx_voucher_items_organization_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_voucher_items_organization_id ON public.voucher_items USING btree (organization_id);


--
-- Name: idx_voucher_items_subject_code; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_voucher_items_subject_code ON public.voucher_items USING btree (subject_code);


--
-- Name: idx_voucher_items_voucher_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_voucher_items_voucher_id ON public.voucher_items USING btree (voucher_id);


--
-- Name: idx_warehouse_locations_map_id; Type: INDEX; Schema: public; Owner: topems
--

CREATE INDEX idx_warehouse_locations_map_id ON public.warehouse_locations USING btree (map_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_audit_logs_action ON qms.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON qms.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON qms.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_audit_logs_resource ON qms.audit_logs USING btree (resource);


--
-- Name: idx_audit_logs_resource_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_audit_logs_resource_id ON qms.audit_logs USING btree (resource_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON qms.audit_logs USING btree (user_id);


--
-- Name: idx_corrective_actions_action_number; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_action_number ON qms.corrective_actions USING btree (action_number);


--
-- Name: idx_corrective_actions_assigned_to; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_assigned_to ON qms.corrective_actions USING btree (assigned_to);


--
-- Name: idx_corrective_actions_effectiveness; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_effectiveness ON qms.corrective_actions USING btree (effectiveness);


--
-- Name: idx_corrective_actions_issue_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_issue_id ON qms.corrective_actions USING btree (issue_id);


--
-- Name: idx_corrective_actions_organization_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_organization_id ON qms.corrective_actions USING btree (organization_id);


--
-- Name: idx_corrective_actions_planned_end_date; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_planned_end_date ON qms.corrective_actions USING btree (planned_end_date);


--
-- Name: idx_corrective_actions_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_status ON qms.corrective_actions USING btree (status);


--
-- Name: idx_corrective_actions_type; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_corrective_actions_type ON qms.corrective_actions USING btree (action_type);


--
-- Name: idx_dashboard_metrics_name; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_name ON qms.dashboard_metrics USING btree (metric_name);


--
-- Name: idx_dashboard_metrics_organization_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_organization_id ON qms.dashboard_metrics USING btree (organization_id);


--
-- Name: idx_dashboard_metrics_period; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_period ON qms.dashboard_metrics USING btree (period_type, period_start, period_end);


--
-- Name: idx_dashboard_metrics_type; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_dashboard_metrics_type ON qms.dashboard_metrics USING btree (metric_type);


--
-- Name: idx_inspection_items_inspection_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_inspection_items_inspection_id ON qms.inspection_items USING btree (inspection_id);


--
-- Name: idx_inspection_items_is_critical; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_inspection_items_is_critical ON qms.inspection_items USING btree (is_critical);


--
-- Name: idx_inspection_items_organization_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_inspection_items_organization_id ON qms.inspection_items USING btree (organization_id);


--
-- Name: idx_inspection_items_result; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_inspection_items_result ON qms.inspection_items USING btree (result);


--
-- Name: idx_inspection_items_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_inspection_items_status ON qms.inspection_items USING btree (status);


--
-- Name: idx_quality_inspections_actual_date; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_actual_date ON qms.quality_inspections USING btree (actual_date);


--
-- Name: idx_quality_inspections_inspection_number; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_inspection_number ON qms.quality_inspections USING btree (inspection_number);


--
-- Name: idx_quality_inspections_inspector; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_inspector ON qms.quality_inspections USING btree (inspector);


--
-- Name: idx_quality_inspections_object_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_object_id ON qms.quality_inspections USING btree (object_id);


--
-- Name: idx_quality_inspections_organization_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_organization_id ON qms.quality_inspections USING btree (organization_id);


--
-- Name: idx_quality_inspections_planned_date; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_planned_date ON qms.quality_inspections USING btree (planned_date);


--
-- Name: idx_quality_inspections_result; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_result ON qms.quality_inspections USING btree (result);


--
-- Name: idx_quality_inspections_standard_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_standard_id ON qms.quality_inspections USING btree (standard_id);


--
-- Name: idx_quality_inspections_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_status ON qms.quality_inspections USING btree (status);


--
-- Name: idx_quality_inspections_type; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_inspections_type ON qms.quality_inspections USING btree (inspection_type);


--
-- Name: idx_quality_issues_assigned_to; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_assigned_to ON qms.quality_issues USING btree (assigned_to);


--
-- Name: idx_quality_issues_discovered_date; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_discovered_date ON qms.quality_issues USING btree (discovered_date);


--
-- Name: idx_quality_issues_due_date; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_due_date ON qms.quality_issues USING btree (due_date);


--
-- Name: idx_quality_issues_issue_number; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_issue_number ON qms.quality_issues USING btree (issue_number);


--
-- Name: idx_quality_issues_organization_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_organization_id ON qms.quality_issues USING btree (organization_id);


--
-- Name: idx_quality_issues_priority; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_priority ON qms.quality_issues USING btree (priority);


--
-- Name: idx_quality_issues_related_inspection_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_related_inspection_id ON qms.quality_issues USING btree (related_inspection_id);


--
-- Name: idx_quality_issues_severity; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_severity ON qms.quality_issues USING btree (severity);


--
-- Name: idx_quality_issues_source; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_source ON qms.quality_issues USING btree (source);


--
-- Name: idx_quality_issues_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_status ON qms.quality_issues USING btree (status);


--
-- Name: idx_quality_issues_type; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_type ON qms.quality_issues USING btree (issue_type);


--
-- Name: idx_quality_standards_category; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_category ON qms.quality_standards USING btree (category);


--
-- Name: idx_quality_standards_code; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_code ON qms.quality_standards USING btree (code);


--
-- Name: idx_quality_standards_code_unique; Type: INDEX; Schema: qms; Owner: topems
--

CREATE UNIQUE INDEX idx_quality_standards_code_unique ON qms.quality_standards USING btree (code, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_quality_standards_effective_date; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_effective_date ON qms.quality_standards USING btree (effective_date);


--
-- Name: idx_quality_standards_name; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_name ON qms.quality_standards USING btree (name);


--
-- Name: idx_quality_standards_next_review_date; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_next_review_date ON qms.quality_standards USING btree (next_review_date);


--
-- Name: idx_quality_standards_organization_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_organization_id ON qms.quality_standards USING btree (organization_id);


--
-- Name: idx_quality_standards_standard_type; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_standard_type ON qms.quality_standards USING btree (standard_type);


--
-- Name: idx_quality_standards_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_status ON qms.quality_standards USING btree (status);


--
-- Name: idx_report_exports_format; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_report_exports_format ON report.report_exports USING btree (export_format);


--
-- Name: idx_report_exports_report; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_report_exports_report ON report.report_exports USING btree (report_id);


--
-- Name: idx_report_templates_name; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_report_templates_name ON report.report_templates USING btree (name);


--
-- Name: idx_report_templates_type; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_report_templates_type ON report.report_templates USING btree (report_type);


--
-- Name: idx_report_type_configs_code; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_report_type_configs_code ON report.report_type_configs USING btree (type_code);


--
-- Name: idx_report_type_configs_module; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_report_type_configs_module ON report.report_type_configs USING btree (module);


--
-- Name: idx_reports_created; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_reports_created ON report.reports USING btree (created_at);


--
-- Name: idx_reports_template; Type: INDEX; Schema: report; Owner: topems
--

CREATE INDEX idx_reports_template ON report.reports USING btree (template_id);


--
-- Name: idx_milestones_acceptance_status; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_milestones_acceptance_status ON rs.project_milestones USING btree (acceptance_status);


--
-- Name: idx_project_members_employee_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_members_employee_id ON rs.project_members USING btree (employee_id);


--
-- Name: idx_project_members_project_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_members_project_id ON rs.project_members USING btree (project_id);


--
-- Name: idx_project_members_status; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_members_status ON rs.project_members USING btree (status);


--
-- Name: idx_project_milestones_phase_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_milestones_phase_id ON rs.project_milestones USING btree (phase_id);


--
-- Name: idx_project_milestones_project_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_milestones_project_id ON rs.project_milestones USING btree (project_id);


--
-- Name: idx_project_milestones_status; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_milestones_status ON rs.project_milestones USING btree (status);


--
-- Name: idx_project_phases_project_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_phases_project_id ON rs.project_phases USING btree (project_id);


--
-- Name: idx_project_phases_status; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_project_phases_status ON rs.project_phases USING btree (status);


--
-- Name: idx_projects_code; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_code ON rs.projects USING btree (code);


--
-- Name: idx_projects_leader; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_leader ON rs.projects USING btree (leader);


--
-- Name: idx_projects_parent_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_parent_id ON rs.projects USING btree (parent_id);


--
-- Name: idx_projects_priority; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_priority ON rs.projects USING btree (priority);


--
-- Name: idx_projects_project_type; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_project_type ON rs.projects USING btree (project_type);


--
-- Name: idx_projects_risk_level; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_risk_level ON rs.projects USING btree (risk_level);


--
-- Name: idx_projects_status; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_status ON rs.projects USING btree (status);


--
-- Name: idx_audit_logs_record; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_audit_logs_record ON scm.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_table; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_audit_logs_table ON scm.audit_logs USING btree (table_name);


--
-- Name: idx_purchase_items_order; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_purchase_items_order ON scm.purchase_items USING btree (order_id);


--
-- Name: idx_purchase_orders_no; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_purchase_orders_no ON scm.purchase_orders USING btree (po_no);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_purchase_orders_status ON scm.purchase_orders USING btree (status);


--
-- Name: idx_purchase_orders_supplier; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_purchase_orders_supplier ON scm.purchase_orders USING btree (supplier_id);


--
-- Name: idx_supplier_evaluations_no; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_supplier_evaluations_no ON scm.supplier_evaluations USING btree (evaluation_no);


--
-- Name: idx_supplier_evaluations_supplier; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_supplier_evaluations_supplier ON scm.supplier_evaluations USING btree (supplier_id);


--
-- Name: idx_suppliers_category; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_suppliers_category ON scm.suppliers USING btree (category);


--
-- Name: idx_suppliers_no; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_suppliers_no ON scm.suppliers USING btree (supplier_no);


--
-- Name: idx_suppliers_status; Type: INDEX; Schema: scm; Owner: topems
--

CREATE INDEX idx_suppliers_status ON scm.suppliers USING btree (status);


--
-- Name: idx_companies_name; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_companies_name ON shared.companies USING btree (name);


--
-- Name: idx_companies_status; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_companies_status ON shared.companies USING btree (status);


--
-- Name: idx_departments_company; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_departments_company ON shared.departments USING btree (company_id);


--
-- Name: idx_departments_parent; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_departments_parent ON shared.departments USING btree (parent_id);


--
-- Name: idx_employees_company; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_employees_company ON shared.employees USING btree (company_id);


--
-- Name: idx_employees_department; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_employees_department ON shared.employees USING btree (department_id);


--
-- Name: idx_employees_no; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_employees_no ON shared.employees USING btree (employee_no);


--
-- Name: idx_id_records_company; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_id_records_company ON shared.id_records USING btree (company_id);


--
-- Name: idx_id_records_type; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_id_records_type ON shared.id_records USING btree (id_type);


--
-- Name: idx_positions_company; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_positions_company ON shared.positions USING btree (company_id);


--
-- Name: idx_positions_department; Type: INDEX; Schema: shared; Owner: topems
--

CREATE INDEX idx_positions_department ON shared.positions USING btree (department_id);


--
-- Name: idx_audit_logs_record; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_audit_logs_record ON srm.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_table; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_audit_logs_table ON srm.audit_logs USING btree (table_name);


--
-- Name: idx_contract_terms_contract; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_contract_terms_contract ON srm.contract_terms USING btree (contract_id);


--
-- Name: idx_purchase_orders_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_purchase_orders_no ON srm.purchase_orders USING btree (po_no);


--
-- Name: idx_purchase_orders_supplier; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_purchase_orders_supplier ON srm.purchase_orders USING btree (supplier_id);


--
-- Name: idx_supplier_categories_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_categories_no ON srm.supplier_categories USING btree (category_no);


--
-- Name: idx_supplier_categories_parent; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_categories_parent ON srm.supplier_categories USING btree (parent_id);


--
-- Name: idx_supplier_contracts_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_contracts_no ON srm.supplier_contracts USING btree (contract_no);


--
-- Name: idx_supplier_contracts_status; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_contracts_status ON srm.supplier_contracts USING btree (status);


--
-- Name: idx_supplier_contracts_supplier; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_contracts_supplier ON srm.supplier_contracts USING btree (supplier_id);


--
-- Name: idx_supplier_evaluations_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_evaluations_no ON srm.supplier_evaluations USING btree (evaluation_no);


--
-- Name: idx_supplier_evaluations_supplier; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_evaluations_supplier ON srm.supplier_evaluations USING btree (supplier_id);


--
-- Name: idx_supplier_products_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_products_no ON srm.supplier_products USING btree (product_no);


--
-- Name: idx_supplier_products_supplier; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_products_supplier ON srm.supplier_products USING btree (supplier_id);


--
-- Name: idx_suppliers_category; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_suppliers_category ON srm.suppliers USING btree (category);


--
-- Name: idx_suppliers_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_suppliers_no ON srm.suppliers USING btree (supplier_no);


--
-- Name: idx_suppliers_status; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_suppliers_status ON srm.suppliers USING btree (status);


--
-- Name: idx_file_perms_expires; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_file_perms_expires ON storage.file_permissions USING btree (expires_at);


--
-- Name: idx_file_perms_file; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_file_perms_file ON storage.file_permissions USING btree (file_id);


--
-- Name: idx_file_perms_principal; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_file_perms_principal ON storage.file_permissions USING btree (principal_type, principal_id);


--
-- Name: idx_storage_files_category; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_category ON storage.files USING btree (category);


--
-- Name: idx_storage_files_created_at; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_created_at ON storage.files USING btree (created_at DESC);


--
-- Name: idx_storage_files_department; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_department ON storage.files USING btree (owner_department_id);


--
-- Name: idx_storage_files_owner; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_owner ON storage.files USING btree (owner_id);


--
-- Name: idx_storage_files_status; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_status ON storage.files USING btree (status);


--
-- Name: idx_storage_files_type; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_type ON storage.files USING btree (file_type);


--
-- Name: idx_storage_files_vector; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_vector ON storage.files USING btree (vector_status);


--
-- Name: idx_storage_files_visibility; Type: INDEX; Schema: storage; Owner: topems
--

CREATE INDEX idx_storage_files_visibility ON storage.files USING btree (visibility);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_audit_logs_action ON wms.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_audit_logs_created_at ON wms.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_audit_logs_organization_id ON wms.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_audit_logs_resource ON wms.audit_logs USING btree (resource);


--
-- Name: idx_audit_logs_resource_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_audit_logs_resource_id ON wms.audit_logs USING btree (resource_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_audit_logs_user_id ON wms.audit_logs USING btree (user_id);


--
-- Name: idx_inbound_order_items_batch_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_order_items_batch_number ON wms.inbound_order_items USING btree (batch_number);


--
-- Name: idx_inbound_order_items_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_order_items_location_id ON wms.inbound_order_items USING btree (location_id);


--
-- Name: idx_inbound_order_items_material_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_order_items_material_code ON wms.inbound_order_items USING btree (material_code);


--
-- Name: idx_inbound_order_items_order_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_order_items_order_id ON wms.inbound_order_items USING btree (order_id);


--
-- Name: idx_inbound_order_items_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_order_items_organization_id ON wms.inbound_order_items USING btree (organization_id);


--
-- Name: idx_inbound_order_items_quality_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_order_items_quality_status ON wms.inbound_order_items USING btree (quality_status);


--
-- Name: idx_inbound_orders_actual_arrival_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_actual_arrival_date ON wms.inbound_orders USING btree (actual_arrival_date);


--
-- Name: idx_inbound_orders_expected_arrival_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_expected_arrival_date ON wms.inbound_orders USING btree (expected_arrival_date);


--
-- Name: idx_inbound_orders_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_number ON wms.inbound_orders USING btree (order_number);


--
-- Name: idx_inbound_orders_number_unique; Type: INDEX; Schema: wms; Owner: topems
--

CREATE UNIQUE INDEX idx_inbound_orders_number_unique ON wms.inbound_orders USING btree (order_number, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_inbound_orders_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_organization_id ON wms.inbound_orders USING btree (organization_id);


--
-- Name: idx_inbound_orders_reference_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_reference_number ON wms.inbound_orders USING btree (reference_number);


--
-- Name: idx_inbound_orders_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_status ON wms.inbound_orders USING btree (status);


--
-- Name: idx_inbound_orders_supplier_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_supplier_id ON wms.inbound_orders USING btree (supplier_id);


--
-- Name: idx_inbound_orders_type; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_type ON wms.inbound_orders USING btree (order_type);


--
-- Name: idx_inbound_orders_warehouse_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inbound_orders_warehouse_id ON wms.inbound_orders USING btree (warehouse_id);


--
-- Name: idx_inventory_batch_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_batch_number ON wms.inventory USING btree (batch_number);


--
-- Name: idx_inventory_expiry_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_expiry_date ON wms.inventory USING btree (expiry_date);


--
-- Name: idx_inventory_is_below_min; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_is_below_min ON wms.inventory USING btree (is_below_min);


--
-- Name: idx_inventory_last_movement_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_last_movement_date ON wms.inventory USING btree (last_movement_date);


--
-- Name: idx_inventory_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_location_id ON wms.inventory USING btree (location_id);


--
-- Name: idx_inventory_lot_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_lot_number ON wms.inventory USING btree (lot_number);


--
-- Name: idx_inventory_material_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_material_code ON wms.inventory USING btree (material_code);


--
-- Name: idx_inventory_material_name; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_material_name ON wms.inventory USING btree (material_name);


--
-- Name: idx_inventory_needs_reorder; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_needs_reorder ON wms.inventory USING btree (needs_reorder);


--
-- Name: idx_inventory_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_organization_id ON wms.inventory USING btree (organization_id);


--
-- Name: idx_inventory_production_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_production_date ON wms.inventory USING btree (production_date);


--
-- Name: idx_inventory_quality_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_quality_status ON wms.inventory USING btree (quality_status);


--
-- Name: idx_inventory_supplier_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_supplier_id ON wms.inventory USING btree (supplier_id);


--
-- Name: idx_inventory_warehouse_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_inventory_warehouse_id ON wms.inventory USING btree (warehouse_id);


--
-- Name: idx_locations_barcode; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_barcode ON wms.locations USING btree (barcode);


--
-- Name: idx_locations_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_code ON wms.locations USING btree (location_code);


--
-- Name: idx_locations_code_unique; Type: INDEX; Schema: wms; Owner: topems
--

CREATE UNIQUE INDEX idx_locations_code_unique ON wms.locations USING btree (location_code, warehouse_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_locations_is_active; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_is_active ON wms.locations USING btree (is_active);


--
-- Name: idx_locations_is_blocked; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_is_blocked ON wms.locations USING btree (is_blocked);


--
-- Name: idx_locations_name; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_name ON wms.locations USING btree (location_name);


--
-- Name: idx_locations_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_organization_id ON wms.locations USING btree (organization_id);


--
-- Name: idx_locations_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_status ON wms.locations USING btree (status);


--
-- Name: idx_locations_type; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_type ON wms.locations USING btree (location_type);


--
-- Name: idx_locations_warehouse_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_warehouse_id ON wms.locations USING btree (warehouse_id);


--
-- Name: idx_locations_zone; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_locations_zone ON wms.locations USING btree (zone);


--
-- Name: idx_outbound_order_items_batch_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_order_items_batch_number ON wms.outbound_order_items USING btree (batch_number);


--
-- Name: idx_outbound_order_items_destination_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_order_items_destination_location_id ON wms.outbound_order_items USING btree (destination_location_id);


--
-- Name: idx_outbound_order_items_material_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_order_items_material_code ON wms.outbound_order_items USING btree (material_code);


--
-- Name: idx_outbound_order_items_order_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_order_items_order_id ON wms.outbound_order_items USING btree (order_id);


--
-- Name: idx_outbound_order_items_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_order_items_organization_id ON wms.outbound_order_items USING btree (organization_id);


--
-- Name: idx_outbound_order_items_picking_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_order_items_picking_status ON wms.outbound_order_items USING btree (picking_status);


--
-- Name: idx_outbound_order_items_source_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_order_items_source_location_id ON wms.outbound_order_items USING btree (source_location_id);


--
-- Name: idx_outbound_orders_actual_ship_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_actual_ship_date ON wms.outbound_orders USING btree (actual_ship_date);


--
-- Name: idx_outbound_orders_customer_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_customer_id ON wms.outbound_orders USING btree (customer_id);


--
-- Name: idx_outbound_orders_expected_ship_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_expected_ship_date ON wms.outbound_orders USING btree (expected_ship_date);


--
-- Name: idx_outbound_orders_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_number ON wms.outbound_orders USING btree (order_number);


--
-- Name: idx_outbound_orders_number_unique; Type: INDEX; Schema: wms; Owner: topems
--

CREATE UNIQUE INDEX idx_outbound_orders_number_unique ON wms.outbound_orders USING btree (order_number, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_outbound_orders_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_organization_id ON wms.outbound_orders USING btree (organization_id);


--
-- Name: idx_outbound_orders_packing_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_packing_status ON wms.outbound_orders USING btree (packing_status);


--
-- Name: idx_outbound_orders_picking_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_picking_status ON wms.outbound_orders USING btree (picking_status);


--
-- Name: idx_outbound_orders_reference_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_reference_number ON wms.outbound_orders USING btree (reference_number);


--
-- Name: idx_outbound_orders_shipping_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_shipping_status ON wms.outbound_orders USING btree (shipping_status);


--
-- Name: idx_outbound_orders_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_status ON wms.outbound_orders USING btree (status);


--
-- Name: idx_outbound_orders_tracking_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_tracking_number ON wms.outbound_orders USING btree (tracking_number);


--
-- Name: idx_outbound_orders_type; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_type ON wms.outbound_orders USING btree (order_type);


--
-- Name: idx_outbound_orders_warehouse_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_outbound_orders_warehouse_id ON wms.outbound_orders USING btree (warehouse_id);


--
-- Name: idx_stock_take_items_adjustment_required; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_adjustment_required ON wms.stock_take_items USING btree (adjustment_required);


--
-- Name: idx_stock_take_items_batch_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_batch_number ON wms.stock_take_items USING btree (batch_number);


--
-- Name: idx_stock_take_items_discrepancy_type; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_discrepancy_type ON wms.stock_take_items USING btree (discrepancy_type);


--
-- Name: idx_stock_take_items_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_location_id ON wms.stock_take_items USING btree (location_id);


--
-- Name: idx_stock_take_items_material_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_material_code ON wms.stock_take_items USING btree (material_code);


--
-- Name: idx_stock_take_items_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_organization_id ON wms.stock_take_items USING btree (organization_id);


--
-- Name: idx_stock_take_items_recount_required; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_recount_required ON wms.stock_take_items USING btree (recount_required);


--
-- Name: idx_stock_take_items_stock_take_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_take_items_stock_take_id ON wms.stock_take_items USING btree (stock_take_id);


--
-- Name: idx_stock_takes_actual_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_actual_date ON wms.stock_takes USING btree (actual_date);


--
-- Name: idx_stock_takes_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_location_id ON wms.stock_takes USING btree (location_id);


--
-- Name: idx_stock_takes_material_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_material_code ON wms.stock_takes USING btree (material_code);


--
-- Name: idx_stock_takes_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_number ON wms.stock_takes USING btree (stock_take_number);


--
-- Name: idx_stock_takes_number_unique; Type: INDEX; Schema: wms; Owner: topems
--

CREATE UNIQUE INDEX idx_stock_takes_number_unique ON wms.stock_takes USING btree (stock_take_number, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_stock_takes_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_organization_id ON wms.stock_takes USING btree (organization_id);


--
-- Name: idx_stock_takes_planned_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_planned_date ON wms.stock_takes USING btree (planned_date);


--
-- Name: idx_stock_takes_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_status ON wms.stock_takes USING btree (status);


--
-- Name: idx_stock_takes_type; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_type ON wms.stock_takes USING btree (stock_take_type);


--
-- Name: idx_stock_takes_warehouse_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_stock_takes_warehouse_id ON wms.stock_takes USING btree (warehouse_id);


--
-- Name: idx_transfer_items_batch_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfer_items_batch_number ON wms.transfer_items USING btree (batch_number);


--
-- Name: idx_transfer_items_destination_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfer_items_destination_location_id ON wms.transfer_items USING btree (destination_location_id);


--
-- Name: idx_transfer_items_material_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfer_items_material_code ON wms.transfer_items USING btree (material_code);


--
-- Name: idx_transfer_items_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfer_items_organization_id ON wms.transfer_items USING btree (organization_id);


--
-- Name: idx_transfer_items_source_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfer_items_source_location_id ON wms.transfer_items USING btree (source_location_id);


--
-- Name: idx_transfer_items_transfer_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfer_items_transfer_id ON wms.transfer_items USING btree (transfer_id);


--
-- Name: idx_transfers_actual_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_actual_date ON wms.transfers USING btree (actual_date);


--
-- Name: idx_transfers_destination_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_destination_location_id ON wms.transfers USING btree (destination_location_id);


--
-- Name: idx_transfers_destination_warehouse_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_destination_warehouse_id ON wms.transfers USING btree (destination_warehouse_id);


--
-- Name: idx_transfers_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_number ON wms.transfers USING btree (transfer_number);


--
-- Name: idx_transfers_number_unique; Type: INDEX; Schema: wms; Owner: topems
--

CREATE UNIQUE INDEX idx_transfers_number_unique ON wms.transfers USING btree (transfer_number, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_transfers_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_organization_id ON wms.transfers USING btree (organization_id);


--
-- Name: idx_transfers_planned_date; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_planned_date ON wms.transfers USING btree (planned_date);


--
-- Name: idx_transfers_reference_number; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_reference_number ON wms.transfers USING btree (reference_number);


--
-- Name: idx_transfers_source_location_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_source_location_id ON wms.transfers USING btree (source_location_id);


--
-- Name: idx_transfers_source_warehouse_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_source_warehouse_id ON wms.transfers USING btree (source_warehouse_id);


--
-- Name: idx_transfers_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_status ON wms.transfers USING btree (status);


--
-- Name: idx_transfers_type; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_transfers_type ON wms.transfers USING btree (transfer_type);


--
-- Name: idx_warehouses_code; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_warehouses_code ON wms.warehouses USING btree (warehouse_code);


--
-- Name: idx_warehouses_code_unique; Type: INDEX; Schema: wms; Owner: topems
--

CREATE UNIQUE INDEX idx_warehouses_code_unique ON wms.warehouses USING btree (warehouse_code, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_warehouses_location; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_warehouses_location ON wms.warehouses USING btree (city, province);


--
-- Name: idx_warehouses_manager; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_warehouses_manager ON wms.warehouses USING btree (manager);


--
-- Name: idx_warehouses_name; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_warehouses_name ON wms.warehouses USING btree (warehouse_name);


--
-- Name: idx_warehouses_organization_id; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_warehouses_organization_id ON wms.warehouses USING btree (organization_id);


--
-- Name: idx_warehouses_status; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_warehouses_status ON wms.warehouses USING btree (status);


--
-- Name: idx_warehouses_type; Type: INDEX; Schema: wms; Owner: topems
--

CREATE INDEX idx_warehouses_type ON wms.warehouses USING btree (warehouse_type);


--
-- Name: contacts update_updated_at_trigger; Type: TRIGGER; Schema: crm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON crm.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_updated_at_trigger; Type: TRIGGER; Schema: crm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON crm.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dashboard_metrics update_updated_at_trigger; Type: TRIGGER; Schema: crm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON crm.dashboard_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: interactions update_updated_at_trigger; Type: TRIGGER; Schema: crm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON crm.interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: opportunities update_updated_at_trigger; Type: TRIGGER; Schema: crm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON crm.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags update_updated_at_trigger; Type: TRIGGER; Schema: crm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON crm.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attendance_records update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: companies update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contracts update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employees update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_records update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.leave_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payroll_records update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.payroll_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: performance_records update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.performance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: positions update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recruitment_applications update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.recruitment_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recruitment_records update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.recruitment_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salary_adjustments update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.salary_adjustments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_participants update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.training_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_records update_updated_at_trigger; Type: TRIGGER; Schema: hrm; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.training_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attachments update_mail_attachment_timestamp; Type: TRIGGER; Schema: mail; Owner: topems
--

CREATE TRIGGER update_mail_attachment_timestamp BEFORE UPDATE ON mail.attachments FOR EACH ROW EXECUTE FUNCTION mail.update_attachment_timestamp();


--
-- Name: equipment update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: equipment_inspection_records update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.equipment_inspection_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: equipment_maintenance_records update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.equipment_maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: process_route_steps update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.process_route_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: process_routes update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.process_routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_orders update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.production_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_processes update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.production_processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_records update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.production_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: work_stations update_updated_at_trigger; Type: TRIGGER; Schema: mes; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON mes.work_stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: corrective_actions update_updated_at_trigger; Type: TRIGGER; Schema: qms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON qms.corrective_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dashboard_metrics update_updated_at_trigger; Type: TRIGGER; Schema: qms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON qms.dashboard_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inspection_items update_updated_at_trigger; Type: TRIGGER; Schema: qms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON qms.inspection_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_inspections update_updated_at_trigger; Type: TRIGGER; Schema: qms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON qms.quality_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_issues update_updated_at_trigger; Type: TRIGGER; Schema: qms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON qms.quality_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quality_standards update_updated_at_trigger; Type: TRIGGER; Schema: qms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON qms.quality_standards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: companies trigger_companies_updated_at; Type: TRIGGER; Schema: shared; Owner: topems
--

CREATE TRIGGER trigger_companies_updated_at BEFORE UPDATE ON shared.companies FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();


--
-- Name: departments trigger_departments_updated_at; Type: TRIGGER; Schema: shared; Owner: topems
--

CREATE TRIGGER trigger_departments_updated_at BEFORE UPDATE ON shared.departments FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();


--
-- Name: employees trigger_employees_updated_at; Type: TRIGGER; Schema: shared; Owner: topems
--

CREATE TRIGGER trigger_employees_updated_at BEFORE UPDATE ON shared.employees FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();


--
-- Name: positions trigger_positions_updated_at; Type: TRIGGER; Schema: shared; Owner: topems
--

CREATE TRIGGER trigger_positions_updated_at BEFORE UPDATE ON shared.positions FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();


--
-- Name: system_params trigger_system_params_updated_at; Type: TRIGGER; Schema: shared; Owner: topems
--

CREATE TRIGGER trigger_system_params_updated_at BEFORE UPDATE ON shared.system_params FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();


--
-- Name: backends update_storage_backends_updated_at; Type: TRIGGER; Schema: storage; Owner: topems
--

CREATE TRIGGER update_storage_backends_updated_at BEFORE UPDATE ON storage.backends FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: files update_storage_files_updated_at; Type: TRIGGER; Schema: storage; Owner: topems
--

CREATE TRIGGER update_storage_files_updated_at BEFORE UPDATE ON storage.files FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: inbound_order_items update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.inbound_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inbound_orders update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.inbound_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: locations update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: outbound_order_items update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.outbound_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: outbound_orders update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.outbound_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_take_items update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.stock_take_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_takes update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.stock_takes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transfer_items update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.transfer_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transfers update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warehouses update_updated_at_trigger; Type: TRIGGER; Schema: wms; Owner: topems
--

CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON wms.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contacts contacts_customer_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.contacts
    ADD CONSTRAINT contacts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES crm.customers(id) ON DELETE SET NULL;


--
-- Name: customer_tags customer_tags_customer_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.customer_tags
    ADD CONSTRAINT customer_tags_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES crm.customers(id) ON DELETE CASCADE;


--
-- Name: customer_tags customer_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.customer_tags
    ADD CONSTRAINT customer_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES crm.tags(id) ON DELETE CASCADE;


--
-- Name: interactions interactions_contact_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.interactions
    ADD CONSTRAINT interactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES crm.contacts(id) ON DELETE SET NULL;


--
-- Name: interactions interactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.interactions
    ADD CONSTRAINT interactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES crm.customers(id) ON DELETE SET NULL;


--
-- Name: interactions interactions_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.interactions
    ADD CONSTRAINT interactions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES crm.opportunities(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_contact_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.opportunities
    ADD CONSTRAINT opportunities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES crm.contacts(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_customer_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: topems
--

ALTER TABLE ONLY crm.opportunities
    ADD CONSTRAINT opportunities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES crm.customers(id) ON DELETE SET NULL;


--
-- Name: archive_borrows archive_borrows_archive_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_borrows
    ADD CONSTRAINT archive_borrows_archive_id_fkey FOREIGN KEY (archive_id) REFERENCES doc_service.archives(id) ON DELETE CASCADE;


--
-- Name: archive_categories archive_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_categories
    ADD CONSTRAINT archive_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES doc_service.archive_categories(id) ON DELETE SET NULL;


--
-- Name: archive_destructions archive_destructions_archive_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_destructions
    ADD CONSTRAINT archive_destructions_archive_id_fkey FOREIGN KEY (archive_id) REFERENCES doc_service.archives(id) ON DELETE CASCADE;


--
-- Name: archive_metadata archive_metadata_archive_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archive_metadata
    ADD CONSTRAINT archive_metadata_archive_id_fkey FOREIGN KEY (archive_id) REFERENCES doc_service.archives(id) ON DELETE CASCADE;


--
-- Name: archives archives_category_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archives
    ADD CONSTRAINT archives_category_id_fkey FOREIGN KEY (category_id) REFERENCES doc_service.archive_categories(id);


--
-- Name: archives archives_file_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.archives
    ADD CONSTRAINT archives_file_id_fkey FOREIGN KEY (file_id) REFERENCES doc_service.files(id) ON DELETE SET NULL;


--
-- Name: file_permissions file_permissions_file_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.file_permissions
    ADD CONSTRAINT file_permissions_file_id_fkey FOREIGN KEY (file_id) REFERENCES doc_service.files(id) ON DELETE CASCADE;


--
-- Name: file_versions file_versions_file_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.file_versions
    ADD CONSTRAINT file_versions_file_id_fkey FOREIGN KEY (file_id) REFERENCES doc_service.files(id) ON DELETE CASCADE;


--
-- Name: folder_permissions folder_permissions_folder_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.folder_permissions
    ADD CONSTRAINT folder_permissions_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES doc_service.folders(id) ON DELETE CASCADE;


--
-- Name: folders folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.folders
    ADD CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES doc_service.folders(id) ON DELETE CASCADE;


--
-- Name: help_articles help_articles_category_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.help_articles
    ADD CONSTRAINT help_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES doc_service.help_categories(id) ON DELETE SET NULL;


--
-- Name: templates templates_category_id_fkey; Type: FK CONSTRAINT; Schema: doc_service; Owner: topems
--

ALTER TABLE ONLY doc_service.templates
    ADD CONSTRAINT templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES doc_service.template_categories(id) ON DELETE SET NULL;


--
-- Name: drill_records drill_records_plan_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.drill_records
    ADD CONSTRAINT drill_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.emergency_plans(id);


--
-- Name: environmental_alerts environmental_alerts_point_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.environmental_alerts
    ADD CONSTRAINT environmental_alerts_point_id_fkey FOREIGN KEY (point_id) REFERENCES ehs.monitoring_points(id);


--
-- Name: environmental_data environmental_data_point_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.environmental_data
    ADD CONSTRAINT environmental_data_point_id_fkey FOREIGN KEY (point_id) REFERENCES ehs.monitoring_points(id);


--
-- Name: risk_controls risk_controls_assessment_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.risk_controls
    ADD CONSTRAINT risk_controls_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES ehs.risk_assessments(id);


--
-- Name: training_records training_records_program_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.training_records
    ADD CONSTRAINT training_records_program_id_fkey FOREIGN KEY (program_id) REFERENCES ehs.training_programs(id);


--
-- Name: dict_items dict_items_dict_type_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.dict_items
    ADD CONSTRAINT dict_items_dict_type_id_fkey FOREIGN KEY (dict_type_id) REFERENCES erp.dict_types(id) ON DELETE CASCADE;


--
-- Name: dict_items dict_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: topems
--

ALTER TABLE ONLY erp.dict_items
    ADD CONSTRAINT dict_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES erp.dict_items(id);


--
-- Name: device_location_records device_location_records_device_id_fkey; Type: FK CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.device_location_records
    ADD CONSTRAINT device_location_records_device_id_fkey FOREIGN KEY (device_id) REFERENCES gis.devices(id) ON DELETE CASCADE;


--
-- Name: device_locations device_locations_map_id_fkey; Type: FK CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.device_locations
    ADD CONSTRAINT device_locations_map_id_fkey FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;


--
-- Name: geofeatures geofeatures_geodata_id_fkey; Type: FK CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.geofeatures
    ADD CONSTRAINT geofeatures_geodata_id_fkey FOREIGN KEY (geodata_id) REFERENCES gis.geodata(id) ON DELETE CASCADE;


--
-- Name: location_photos location_photos_map_id_fkey; Type: FK CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.location_photos
    ADD CONSTRAINT location_photos_map_id_fkey FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;


--
-- Name: map_layers map_layers_map_id_fkey; Type: FK CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.map_layers
    ADD CONSTRAINT map_layers_map_id_fkey FOREIGN KEY (map_id) REFERENCES gis.maps(id) ON DELETE CASCADE;


--
-- Name: pipelines pipelines_map_id_fkey; Type: FK CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.pipelines
    ADD CONSTRAINT pipelines_map_id_fkey FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;


--
-- Name: warehouse_locations warehouse_locations_map_id_fkey; Type: FK CONSTRAINT; Schema: gis; Owner: topems
--

ALTER TABLE ONLY gis.warehouse_locations
    ADD CONSTRAINT warehouse_locations_map_id_fkey FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_employee_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.contracts
    ADD CONSTRAINT contracts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE CASCADE;


--
-- Name: departments departments_company_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.departments
    ADD CONSTRAINT departments_company_id_fkey FOREIGN KEY (company_id) REFERENCES hrm.companies(id) ON DELETE SET NULL;


--
-- Name: departments departments_parent_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.departments
    ADD CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES hrm.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_company_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.employees
    ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES hrm.companies(id) ON DELETE SET NULL;


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES hrm.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_position_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.employees
    ADD CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES hrm.positions(id) ON DELETE SET NULL;


--
-- Name: leave_records leave_records_approver_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.leave_records
    ADD CONSTRAINT leave_records_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES hrm.employees(id) ON DELETE SET NULL;


--
-- Name: leave_records leave_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.leave_records
    ADD CONSTRAINT leave_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE CASCADE;


--
-- Name: performance_records performance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.performance_records
    ADD CONSTRAINT performance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE CASCADE;


--
-- Name: performance_records performance_records_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.performance_records
    ADD CONSTRAINT performance_records_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES hrm.employees(id) ON DELETE SET NULL;


--
-- Name: positions positions_company_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.positions
    ADD CONSTRAINT positions_company_id_fkey FOREIGN KEY (company_id) REFERENCES hrm.companies(id) ON DELETE SET NULL;


--
-- Name: positions positions_department_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.positions
    ADD CONSTRAINT positions_department_id_fkey FOREIGN KEY (department_id) REFERENCES hrm.departments(id) ON DELETE SET NULL;


--
-- Name: recruitment_applications recruitment_applications_recruitment_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.recruitment_applications
    ADD CONSTRAINT recruitment_applications_recruitment_id_fkey FOREIGN KEY (recruitment_id) REFERENCES hrm.recruitment_records(id) ON DELETE CASCADE;


--
-- Name: recruitment_records recruitment_records_position_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.recruitment_records
    ADD CONSTRAINT recruitment_records_position_id_fkey FOREIGN KEY (position_id) REFERENCES hrm.positions(id) ON DELETE SET NULL;


--
-- Name: salary_adjustments salary_adjustments_approver_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.salary_adjustments
    ADD CONSTRAINT salary_adjustments_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES hrm.employees(id) ON DELETE SET NULL;


--
-- Name: salary_adjustments salary_adjustments_employee_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.salary_adjustments
    ADD CONSTRAINT salary_adjustments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE CASCADE;


--
-- Name: training_participants training_participants_employee_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.training_participants
    ADD CONSTRAINT training_participants_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrm.employees(id) ON DELETE CASCADE;


--
-- Name: training_participants training_participants_training_id_fkey; Type: FK CONSTRAINT; Schema: hrm; Owner: topems
--

ALTER TABLE ONLY hrm.training_participants
    ADD CONSTRAINT training_participants_training_id_fkey FOREIGN KEY (training_id) REFERENCES hrm.training_records(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES iam.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: chat_room_members chat_room_members_chat_room_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.chat_room_members
    ADD CONSTRAINT chat_room_members_chat_room_id_fkey FOREIGN KEY (chat_room_id) REFERENCES im.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: contact_group_members contact_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.contact_group_members
    ADD CONSTRAINT contact_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES im.contact_groups(id) ON DELETE CASCADE;


--
-- Name: file_transfers file_transfers_chat_room_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.file_transfers
    ADD CONSTRAINT file_transfers_chat_room_id_fkey FOREIGN KEY (chat_room_id) REFERENCES im.chat_rooms(id) ON DELETE SET NULL;


--
-- Name: file_transfers file_transfers_message_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.file_transfers
    ADD CONSTRAINT file_transfers_message_id_fkey FOREIGN KEY (message_id) REFERENCES im.messages(id) ON DELETE SET NULL;


--
-- Name: message_read_receipts message_read_receipts_message_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.message_read_receipts
    ADD CONSTRAINT message_read_receipts_message_id_fkey FOREIGN KEY (message_id) REFERENCES im.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_room_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.messages
    ADD CONSTRAINT messages_chat_room_id_fkey FOREIGN KEY (chat_room_id) REFERENCES im.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: messages messages_forwarded_from_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.messages
    ADD CONSTRAINT messages_forwarded_from_id_fkey FOREIGN KEY (forwarded_from_id) REFERENCES im.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: im; Owner: topems
--

ALTER TABLE ONLY im.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES im.messages(id) ON DELETE SET NULL;


--
-- Name: inspection_records inspection_records_task_id_fkey; Type: FK CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.inspection_records
    ADD CONSTRAINT inspection_records_task_id_fkey FOREIGN KEY (task_id) REFERENCES lims.inspection_tasks(id) ON DELETE CASCADE;


--
-- Name: inspection_tasks inspection_tasks_process_id_fkey; Type: FK CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.inspection_tasks
    ADD CONSTRAINT inspection_tasks_process_id_fkey FOREIGN KEY (process_id) REFERENCES lims.inspection_processes(id) ON DELETE CASCADE;


--
-- Name: inspection_tasks inspection_tasks_sample_id_fkey; Type: FK CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.inspection_tasks
    ADD CONSTRAINT inspection_tasks_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES lims.samples(id) ON DELETE CASCADE;


--
-- Name: instrument_calibrations instrument_calibrations_instrument_id_fkey; Type: FK CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.instrument_calibrations
    ADD CONSTRAINT instrument_calibrations_instrument_id_fkey FOREIGN KEY (instrument_id) REFERENCES lims.instruments(id) ON DELETE CASCADE;


--
-- Name: maintenance_records maintenance_records_instrument_id_fkey; Type: FK CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.maintenance_records
    ADD CONSTRAINT maintenance_records_instrument_id_fkey FOREIGN KEY (instrument_id) REFERENCES lims.instruments(id) ON DELETE CASCADE;


--
-- Name: reagent_usages reagent_usages_reagent_id_fkey; Type: FK CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.reagent_usages
    ADD CONSTRAINT reagent_usages_reagent_id_fkey FOREIGN KEY (reagent_id) REFERENCES lims.reagents(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_email_id_fkey; Type: FK CONSTRAINT; Schema: mail; Owner: topems
--

ALTER TABLE ONLY mail.attachments
    ADD CONSTRAINT attachments_email_id_fkey FOREIGN KEY (email_id) REFERENCES mail.emails(id) ON DELETE SET NULL;


--
-- Name: emails emails_template_id_fkey; Type: FK CONSTRAINT; Schema: mail; Owner: topems
--

ALTER TABLE ONLY mail.emails
    ADD CONSTRAINT emails_template_id_fkey FOREIGN KEY (template_id) REFERENCES mail.templates(id);


--
-- Name: equipment_inspection_records equipment_inspection_records_equipment_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.equipment_inspection_records
    ADD CONSTRAINT equipment_inspection_records_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;


--
-- Name: equipment_maintenance_records equipment_maintenance_records_equipment_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.equipment_maintenance_records
    ADD CONSTRAINT equipment_maintenance_records_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;


--
-- Name: equipment equipment_work_station_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.equipment
    ADD CONSTRAINT equipment_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;


--
-- Name: process_route_steps process_route_steps_process_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.process_route_steps
    ADD CONSTRAINT process_route_steps_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE CASCADE;


--
-- Name: process_route_steps process_route_steps_route_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.process_route_steps
    ADD CONSTRAINT process_route_steps_route_id_fkey FOREIGN KEY (route_id) REFERENCES mes.process_routes(id) ON DELETE CASCADE;


--
-- Name: production_processes production_processes_predecessor_process_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_predecessor_process_id_fkey FOREIGN KEY (predecessor_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;


--
-- Name: production_processes production_processes_successor_process_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_processes
    ADD CONSTRAINT production_processes_successor_process_id_fkey FOREIGN KEY (successor_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;


--
-- Name: production_records production_records_order_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_records production_records_process_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_process_id_fkey FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;


--
-- Name: production_records production_records_work_station_id_fkey; Type: FK CONSTRAINT; Schema: mes; Owner: topems
--

ALTER TABLE ONLY mes.production_records
    ADD CONSTRAINT production_records_work_station_id_fkey FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;


--
-- Name: acceptances acceptances_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.acceptances
    ADD CONSTRAINT acceptances_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: budgets budgets_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.budgets
    ADD CONSTRAINT budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: contracts contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.contracts
    ADD CONSTRAINT contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: project_approvals project_approvals_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_approvals
    ADD CONSTRAINT project_approvals_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: project_benefits project_benefits_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_benefits
    ADD CONSTRAINT project_benefits_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: project_expenses project_expenses_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_expenses
    ADD CONSTRAINT project_expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: project_milestones project_milestones_phase_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_milestones
    ADD CONSTRAINT project_milestones_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES pm.project_phases(id);


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: project_phases project_phases_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_phases
    ADD CONSTRAINT project_phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: project_resources project_resources_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.project_resources
    ADD CONSTRAINT project_resources_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: projects projects_parent_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.projects
    ADD CONSTRAINT projects_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES pm.projects(id);


--
-- Name: quality_checks quality_checks_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.quality_checks
    ADD CONSTRAINT quality_checks_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: risks risks_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.risks
    ADD CONSTRAINT risks_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: settlements settlements_project_id_fkey; Type: FK CONSTRAINT; Schema: pm; Owner: topems
--

ALTER TABLE ONLY pm.settlements
    ADD CONSTRAINT settlements_project_id_fkey FOREIGN KEY (project_id) REFERENCES pm.projects(id);


--
-- Name: portal_menus portal_menus_parent_id_fkey; Type: FK CONSTRAINT; Schema: portal; Owner: topems
--

ALTER TABLE ONLY portal.portal_menus
    ADD CONSTRAINT portal_menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES portal.portal_menus(id);


--
-- Name: device_locations device_locations_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.device_locations
    ADD CONSTRAINT device_locations_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.factory_maps(id) ON DELETE CASCADE;


--
-- Name: devices devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;


--
-- Name: location_photos location_photos_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.location_photos
    ADD CONSTRAINT location_photos_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.factory_maps(id) ON DELETE CASCADE;


--
-- Name: mobile_scan_records mobile_scan_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.mobile_scan_records
    ADD CONSTRAINT mobile_scan_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;


--
-- Name: offline_sync_records offline_sync_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.offline_sync_records
    ADD CONSTRAINT offline_sync_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;


--
-- Name: payment_schedules payment_schedules_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.project_contracts(id) ON DELETE CASCADE;


--
-- Name: pipelines pipelines_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.factory_maps(id) ON DELETE CASCADE;


--
-- Name: project_budget_items project_budget_items_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.project_budget_items
    ADD CONSTRAINT project_budget_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.project_budgets(id) ON DELETE CASCADE;


--
-- Name: project_budgets project_budgets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project_contracts(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;


--
-- Name: shortcuts shortcuts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.shortcuts
    ADD CONSTRAINT shortcuts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mobile_users(id) ON DELETE CASCADE;


--
-- Name: voucher_items voucher_items_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.voucher_items
    ADD CONSTRAINT voucher_items_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES erp.financial_vouchers(id) ON DELETE CASCADE;


--
-- Name: warehouse_locations warehouse_locations_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: topems
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.factory_maps(id) ON DELETE CASCADE;


--
-- Name: corrective_actions corrective_actions_issue_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.corrective_actions
    ADD CONSTRAINT corrective_actions_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES qms.quality_issues(id) ON DELETE CASCADE;


--
-- Name: inspection_items inspection_items_inspection_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.inspection_items
    ADD CONSTRAINT inspection_items_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES qms.quality_inspections(id) ON DELETE CASCADE;


--
-- Name: quality_inspections quality_inspections_standard_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_inspections
    ADD CONSTRAINT quality_inspections_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES qms.quality_standards(id) ON DELETE SET NULL;


--
-- Name: quality_issues quality_issues_related_inspection_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_issues
    ADD CONSTRAINT quality_issues_related_inspection_id_fkey FOREIGN KEY (related_inspection_id) REFERENCES qms.quality_inspections(id) ON DELETE SET NULL;


--
-- Name: quality_issues quality_issues_related_standard_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_issues
    ADD CONSTRAINT quality_issues_related_standard_id_fkey FOREIGN KEY (related_standard_id) REFERENCES qms.quality_standards(id) ON DELETE SET NULL;


--
-- Name: report_exports report_exports_report_id_fkey; Type: FK CONSTRAINT; Schema: report; Owner: topems
--

ALTER TABLE ONLY report.report_exports
    ADD CONSTRAINT report_exports_report_id_fkey FOREIGN KEY (report_id) REFERENCES report.reports(id);


--
-- Name: reports reports_template_id_fkey; Type: FK CONSTRAINT; Schema: report; Owner: topems
--

ALTER TABLE ONLY report.reports
    ADD CONSTRAINT reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES report.report_templates(id);


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES rs.projects(id) ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_phase_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_milestones
    ADD CONSTRAINT project_milestones_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES rs.project_phases(id);


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES rs.projects(id) ON DELETE CASCADE;


--
-- Name: project_phases project_phases_predecessor_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_phases
    ADD CONSTRAINT project_phases_predecessor_id_fkey FOREIGN KEY (predecessor_id) REFERENCES rs.project_phases(id);


--
-- Name: project_phases project_phases_project_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.project_phases
    ADD CONSTRAINT project_phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES rs.projects(id) ON DELETE CASCADE;


--
-- Name: purchase_items purchase_items_order_id_fkey; Type: FK CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.purchase_items
    ADD CONSTRAINT purchase_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES scm.purchase_orders(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES scm.suppliers(id);


--
-- Name: supplier_evaluations supplier_evaluations_supplier_id_fkey; Type: FK CONSTRAINT; Schema: scm; Owner: topems
--

ALTER TABLE ONLY scm.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES scm.suppliers(id);


--
-- Name: departments departments_company_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.departments
    ADD CONSTRAINT departments_company_id_fkey FOREIGN KEY (company_id) REFERENCES shared.companies(id) ON DELETE CASCADE;


--
-- Name: departments departments_parent_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.departments
    ADD CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES shared.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_company_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.employees
    ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES shared.companies(id) ON DELETE CASCADE;


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES shared.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_position_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.employees
    ADD CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES shared.positions(id) ON DELETE SET NULL;


--
-- Name: id_records id_records_company_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.id_records
    ADD CONSTRAINT id_records_company_id_fkey FOREIGN KEY (company_id) REFERENCES shared.companies(id) ON DELETE SET NULL;


--
-- Name: positions positions_company_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.positions
    ADD CONSTRAINT positions_company_id_fkey FOREIGN KEY (company_id) REFERENCES shared.companies(id) ON DELETE CASCADE;


--
-- Name: positions positions_department_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.positions
    ADD CONSTRAINT positions_department_id_fkey FOREIGN KEY (department_id) REFERENCES shared.departments(id) ON DELETE SET NULL;


--
-- Name: user_employee_map user_employee_map_employee_id_fkey; Type: FK CONSTRAINT; Schema: shared; Owner: topems
--

ALTER TABLE ONLY shared.user_employee_map
    ADD CONSTRAINT user_employee_map_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES shared.employees(id) ON DELETE CASCADE;


--
-- Name: contract_terms contract_terms_contract_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.contract_terms
    ADD CONSTRAINT contract_terms_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES srm.supplier_contracts(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id);


--
-- Name: supplier_categories supplier_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_categories
    ADD CONSTRAINT supplier_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES srm.supplier_categories(id);


--
-- Name: supplier_contracts supplier_contracts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_contracts
    ADD CONSTRAINT supplier_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id);


--
-- Name: supplier_evaluations supplier_evaluations_supplier_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id);


--
-- Name: supplier_products supplier_products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_products
    ADD CONSTRAINT supplier_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id);


--
-- Name: file_permissions file_permissions_file_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: topems
--

ALTER TABLE ONLY storage.file_permissions
    ADD CONSTRAINT file_permissions_file_id_fkey FOREIGN KEY (file_id) REFERENCES storage.files(id) ON DELETE CASCADE;


--
-- Name: files files_parent_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: topems
--

ALTER TABLE ONLY storage.files
    ADD CONSTRAINT files_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES storage.files(id) ON DELETE SET NULL;


--
-- Name: inbound_order_items inbound_order_items_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inbound_order_items
    ADD CONSTRAINT inbound_order_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: inbound_order_items inbound_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inbound_order_items
    ADD CONSTRAINT inbound_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES wms.inbound_orders(id) ON DELETE CASCADE;


--
-- Name: inbound_orders inbound_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inbound_orders
    ADD CONSTRAINT inbound_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES wms.warehouses(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inventory
    ADD CONSTRAINT inventory_location_id_fkey FOREIGN KEY (location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: inventory inventory_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.inventory
    ADD CONSTRAINT inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES wms.warehouses(id) ON DELETE CASCADE;


--
-- Name: locations locations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.locations
    ADD CONSTRAINT locations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES wms.warehouses(id) ON DELETE CASCADE;


--
-- Name: outbound_order_items outbound_order_items_destination_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.outbound_order_items
    ADD CONSTRAINT outbound_order_items_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: outbound_order_items outbound_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.outbound_order_items
    ADD CONSTRAINT outbound_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES wms.outbound_orders(id) ON DELETE CASCADE;


--
-- Name: outbound_order_items outbound_order_items_source_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.outbound_order_items
    ADD CONSTRAINT outbound_order_items_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: outbound_orders outbound_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.outbound_orders
    ADD CONSTRAINT outbound_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES wms.warehouses(id) ON DELETE CASCADE;


--
-- Name: stock_take_items stock_take_items_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.stock_take_items
    ADD CONSTRAINT stock_take_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: stock_take_items stock_take_items_stock_take_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.stock_take_items
    ADD CONSTRAINT stock_take_items_stock_take_id_fkey FOREIGN KEY (stock_take_id) REFERENCES wms.stock_takes(id) ON DELETE CASCADE;


--
-- Name: stock_takes stock_takes_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.stock_takes
    ADD CONSTRAINT stock_takes_location_id_fkey FOREIGN KEY (location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: stock_takes stock_takes_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.stock_takes
    ADD CONSTRAINT stock_takes_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES wms.warehouses(id) ON DELETE CASCADE;


--
-- Name: transfer_items transfer_items_destination_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfer_items
    ADD CONSTRAINT transfer_items_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: transfer_items transfer_items_source_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfer_items
    ADD CONSTRAINT transfer_items_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: transfer_items transfer_items_transfer_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfer_items
    ADD CONSTRAINT transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES wms.transfers(id) ON DELETE CASCADE;


--
-- Name: transfers transfers_destination_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfers
    ADD CONSTRAINT transfers_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: transfers transfers_destination_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfers
    ADD CONSTRAINT transfers_destination_warehouse_id_fkey FOREIGN KEY (destination_warehouse_id) REFERENCES wms.warehouses(id) ON DELETE CASCADE;


--
-- Name: transfers transfers_source_location_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfers
    ADD CONSTRAINT transfers_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES wms.locations(id) ON DELETE SET NULL;


--
-- Name: transfers transfers_source_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: wms; Owner: topems
--

ALTER TABLE ONLY wms.transfers
    ADD CONSTRAINT transfers_source_warehouse_id_fkey FOREIGN KEY (source_warehouse_id) REFERENCES wms.warehouses(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO topems;


--
-- PostgreSQL database dump complete
--

\unrestrict GioeKU1vq0AdCMIE6j4ZIp7vNjFOIBOJLPKebylf4ZPpFfmJIC3AzSH3nhHEV14

