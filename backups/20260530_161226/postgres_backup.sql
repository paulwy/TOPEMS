--
-- PostgreSQL database cluster dump
--

\restrict qQtv9gSTqDaCKpObcuexuQKgICl57tabuSSnL72V2dzI7p2xVzjvN6sBbZoxk0R

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE topems;
ALTER ROLE topems WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:/5rkrAWFdKDRN7AQrgv3pw==$iNl1w0cX3YKeldMTG2z/RHr3vC0/7089PdxWH3gpmiQ=:WNbvKXzXaWBWy3sfR1m9jDgtiNmKZYauQG/LT2qseBY=';

--
-- User Configurations
--








\unrestrict qQtv9gSTqDaCKpObcuexuQKgICl57tabuSSnL72V2dzI7p2xVzjvN6sBbZoxk0R

--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

\restrict GbAI4EkHeGyTw7JKccuz4CpO7Jfh2sZcnVEkVpKubv1VzlsHrJka7cdOKa55Orp

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict GbAI4EkHeGyTw7JKccuz4CpO7Jfh2sZcnVEkVpKubv1VzlsHrJka7cdOKa55Orp

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

\restrict 4ZlV3vZmYdaVUfMq9hXN6XHpgT0VtOixeyQNeNQEI1Or25gGO3j1h0zDHd9vG2a

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict 4ZlV3vZmYdaVUfMq9hXN6XHpgT0VtOixeyQNeNQEI1Or25gGO3j1h0zDHd9vG2a

--
-- Database "topems" dump
--

--
-- PostgreSQL database dump
--

\restrict V0QkvRZNhSpfxjX6Lk3Syv8oJxvrz8XyZQD0Ta1CFik6t5Gw703139IUQeJwowl

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: topems; Type: DATABASE; Schema: -; Owner: topems
--

CREATE DATABASE topems WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE topems OWNER TO topems;

\unrestrict V0QkvRZNhSpfxjX6Lk3Syv8oJxvrz8XyZQD0Ta1CFik6t5Gw703139IUQeJwowl
\connect topems
\restrict V0QkvRZNhSpfxjX6Lk3Syv8oJxvrz8XyZQD0Ta1CFik6t5Gw703139IUQeJwowl

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: doc; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA doc;


ALTER SCHEMA doc OWNER TO topems;

--
-- Name: ehs; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA ehs;


ALTER SCHEMA ehs OWNER TO topems;

--
-- Name: flow; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA flow;


ALTER SCHEMA flow OWNER TO topems;

--
-- Name: iam; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA iam;


ALTER SCHEMA iam OWNER TO topems;

--
-- Name: lims; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA lims;


ALTER SCHEMA lims OWNER TO topems;

--
-- Name: pdm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA pdm;


ALTER SCHEMA pdm OWNER TO topems;

--
-- Name: qms; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA qms;


ALTER SCHEMA qms OWNER TO topems;

--
-- Name: rs; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA rs;


ALTER SCHEMA rs OWNER TO topems;

--
-- Name: srm; Type: SCHEMA; Schema: -; Owner: topems
--

CREATE SCHEMA srm;


ALTER SCHEMA srm OWNER TO topems;

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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: document_tags; Type: TABLE; Schema: ai; Owner: topems
--

CREATE TABLE ai.document_tags (
    document_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE ai.document_tags OWNER TO topems;

--
-- Name: documents; Type: TABLE; Schema: ai; Owner: topems
--

CREATE TABLE ai.documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(500) NOT NULL,
    content text,
    metadata jsonb,
    file_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ai.documents OWNER TO topems;

--
-- Name: tags; Type: TABLE; Schema: ai; Owner: topems
--

CREATE TABLE ai.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7) DEFAULT '#3b82f6'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ai.tags OWNER TO topems;

--
-- Name: file_permissions; Type: TABLE; Schema: doc; Owner: topems
--

CREATE TABLE doc.file_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid,
    role_id uuid,
    permission character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT file_permissions_check CHECK (((user_id IS NOT NULL) OR (role_id IS NOT NULL)))
);


ALTER TABLE doc.file_permissions OWNER TO topems;

--
-- Name: file_versions; Type: TABLE; Schema: doc; Owner: topems
--

CREATE TABLE doc.file_versions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    version integer NOT NULL,
    size bigint NOT NULL,
    checksum character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100) NOT NULL
);


ALTER TABLE doc.file_versions OWNER TO topems;

--
-- Name: files; Type: TABLE; Schema: doc; Owner: topems
--

CREATE TABLE doc.files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    folder_id uuid,
    size bigint DEFAULT 0 NOT NULL,
    content_type character varying(100) NOT NULL,
    checksum character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100) NOT NULL
);


ALTER TABLE doc.files OWNER TO topems;

--
-- Name: folders; Type: TABLE; Schema: doc; Owner: topems
--

CREATE TABLE doc.folders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100) NOT NULL
);


ALTER TABLE doc.folders OWNER TO topems;

--
-- Name: drill_records; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.drill_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    plan_id uuid,
    drill_name character varying(255) NOT NULL,
    drill_date date NOT NULL,
    participants text[],
    duration interval,
    location character varying(255),
    summary text,
    issues_found text,
    improvements text,
    attachments text[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.drill_records OWNER TO topems;

--
-- Name: emergency_plans; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.emergency_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    plan_no character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100),
    scope text,
    trigger_conditions text,
    response_procedures text,
    responsible_persons text[],
    contact_info text,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.emergency_plans OWNER TO topems;

--
-- Name: safety_check_items; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.safety_check_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    check_id uuid NOT NULL,
    hazard_id uuid,
    item_name character varying(255) NOT NULL,
    check_method text,
    standard text,
    is_conform boolean,
    remarks text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.safety_check_items OWNER TO topems;

--
-- Name: safety_checks; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.safety_checks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    check_no character varying(100) NOT NULL,
    check_type character varying(100) NOT NULL,
    inspector character varying(255),
    check_date date,
    location character varying(255),
    result character varying(50),
    issues text[],
    attachments text[],
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.safety_checks OWNER TO topems;

--
-- Name: safety_hazards; Type: TABLE; Schema: ehs; Owner: topems
--

CREATE TABLE ehs.safety_hazards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    hazard_no character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    level character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    description text,
    location character varying(255),
    risk_assessment jsonb,
    control_measures text[],
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ehs.safety_hazards OWNER TO topems;

--
-- Name: approvals; Type: TABLE; Schema: flow; Owner: topems
--

CREATE TABLE flow.approvals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workflow_instance_id uuid,
    task_name character varying(200) NOT NULL,
    assignee_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    comment text,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE flow.approvals OWNER TO topems;

--
-- Name: workflow_instances; Type: TABLE; Schema: flow; Owner: topems
--

CREATE TABLE flow.workflow_instances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workflow_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    initiator_id uuid,
    data jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE flow.workflow_instances OWNER TO topems;

--
-- Name: workflows; Type: TABLE; Schema: flow; Owner: topems
--

CREATE TABLE flow.workflows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    definition jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE flow.workflows OWNER TO topems;

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
    avatar_url character varying(500),
    is_active boolean DEFAULT true,
    is_superuser boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone
);


ALTER TABLE iam.users OWNER TO topems;

--
-- Name: equipments; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.equipments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    model character varying(255),
    serial_number character varying(255),
    status character varying(50) DEFAULT 'available'::character varying NOT NULL,
    location character varying(255),
    last_calibration_date date,
    next_calibration_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE lims.equipments OWNER TO topems;

--
-- Name: samples; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.samples (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sample_id character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sample_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    received_date date NOT NULL,
    analysis_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE lims.samples OWNER TO topems;

--
-- Name: test_records; Type: TABLE; Schema: lims; Owner: topems
--

CREATE TABLE lims.test_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sample_id uuid NOT NULL,
    test_name character varying(255) NOT NULL,
    test_method character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    result text,
    unit character varying(50),
    standard text,
    tested_by uuid,
    tested_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE lims.test_records OWNER TO topems;

--
-- Name: formula_ingredients; Type: TABLE; Schema: pdm; Owner: topems
--

CREATE TABLE pdm.formula_ingredients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    formula_id uuid NOT NULL,
    material_name character varying(255) NOT NULL,
    quantity numeric(15,4) NOT NULL,
    unit character varying(50) NOT NULL,
    percentage numeric(5,2),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pdm.formula_ingredients OWNER TO topems;

--
-- Name: production_batches; Type: TABLE; Schema: pdm; Owner: topems
--

CREATE TABLE pdm.production_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    batch_no character varying(100) NOT NULL,
    product_name character varying(255) NOT NULL,
    formula_id uuid,
    process_id uuid,
    planned_quantity numeric(15,2),
    actual_quantity numeric(15,2),
    unit character varying(50),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(50) DEFAULT 'planned'::character varying NOT NULL,
    operator character varying(255),
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pdm.production_batches OWNER TO topems;

--
-- Name: production_formulas; Type: TABLE; Schema: pdm; Owner: topems
--

CREATE TABLE pdm.production_formulas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    formula_no character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    version character varying(50) DEFAULT '1.0'::character varying NOT NULL,
    process_id uuid,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pdm.production_formulas OWNER TO topems;

--
-- Name: production_processes; Type: TABLE; Schema: pdm; Owner: topems
--

CREATE TABLE pdm.production_processes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    process_no character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    version character varying(50) DEFAULT '1.0'::character varying NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pdm.production_processes OWNER TO topems;

--
-- Name: production_statistics; Type: TABLE; Schema: pdm; Owner: topems
--

CREATE TABLE pdm.production_statistics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    batch_id uuid,
    stat_date date NOT NULL,
    output_quantity numeric(15,2),
    reject_quantity numeric(15,2),
    pass_rate numeric(5,2),
    cycle_time interval,
    energy_consumption numeric(15,2),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pdm.production_statistics OWNER TO topems;

--
-- Name: production_steps; Type: TABLE; Schema: pdm; Owner: topems
--

CREATE TABLE pdm.production_steps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    process_id uuid NOT NULL,
    step_no character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    duration interval,
    equipment_required text,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE pdm.production_steps OWNER TO topems;

--
-- Name: check_items; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.check_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    check_id uuid NOT NULL,
    standard_id uuid,
    item_name character varying(255) NOT NULL,
    check_method text,
    standard_value character varying(255),
    actual_value character varying(255),
    is_conform boolean,
    remarks text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE qms.check_items OWNER TO topems;

--
-- Name: quality_checks; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.quality_checks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    check_no character varying(100) NOT NULL,
    project_id uuid,
    check_type character varying(100) NOT NULL,
    inspector character varying(255),
    check_date date,
    location character varying(255),
    result character varying(50),
    conclusion text,
    attachments text[],
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE qms.quality_checks OWNER TO topems;

--
-- Name: quality_improvements; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.quality_improvements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    improvement_no character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    issue_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    owner uuid,
    start_date date,
    end_date date,
    actual_end_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE qms.quality_improvements OWNER TO topems;

--
-- Name: quality_issues; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.quality_issues (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    issue_no character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    severity character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    category character varying(100),
    status character varying(50) DEFAULT 'open'::character varying NOT NULL,
    assignee uuid,
    due_date date,
    resolution text,
    closed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE qms.quality_issues OWNER TO topems;

--
-- Name: quality_standards; Type: TABLE; Schema: qms; Owner: topems
--

CREATE TABLE qms.quality_standards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    category character varying(100),
    version character varying(50) DEFAULT '1.0'::character varying NOT NULL,
    description text,
    content text,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    effective_date date,
    expiry_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE qms.quality_standards OWNER TO topems;

--
-- Name: experiments; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.experiments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    experiment_type character varying(100),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);


ALTER TABLE rs.experiments OWNER TO topems;

--
-- Name: formulas; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.formulas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid,
    name character varying(255) NOT NULL,
    version character varying(50) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rs.formulas OWNER TO topems;

--
-- Name: ingredients; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.ingredients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    formula_id uuid,
    name character varying(255) NOT NULL,
    quantity numeric NOT NULL,
    unit character varying(50) NOT NULL,
    percentage numeric NOT NULL
);


ALTER TABLE rs.ingredients OWNER TO topems;

--
-- Name: projects; Type: TABLE; Schema: rs; Owner: topems
--

CREATE TABLE rs.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    start_date date,
    end_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE rs.projects OWNER TO topems;

--
-- Name: purchase_order_items; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.purchase_order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    po_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    description text,
    quantity numeric(15,2) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    unit character varying(50),
    line_total numeric(15,2) NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE srm.purchase_order_items OWNER TO topems;

--
-- Name: purchase_orders; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.purchase_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    po_no character varying(100) NOT NULL,
    supplier_id uuid NOT NULL,
    order_date date NOT NULL,
    expected_date date,
    actual_date date,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE srm.purchase_orders OWNER TO topems;

--
-- Name: supplier_evaluations; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.supplier_evaluations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    supplier_id uuid NOT NULL,
    evaluation_no character varying(100) NOT NULL,
    evaluation_date date NOT NULL,
    evaluator character varying(255),
    overall_score numeric(5,2),
    quality_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    price_score numeric(5,2),
    comments text,
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE srm.supplier_evaluations OWNER TO topems;

--
-- Name: suppliers; Type: TABLE; Schema: srm; Owner: topems
--

CREATE TABLE srm.suppliers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    supplier_no character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    legal_name character varying(255),
    category character varying(100),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    tax_id character varying(100),
    address text,
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    website character varying(500),
    credit_rating character varying(50),
    risk_level character varying(50) DEFAULT 'low'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE srm.suppliers OWNER TO topems;

--
-- Data for Name: document_tags; Type: TABLE DATA; Schema: ai; Owner: topems
--

COPY ai.document_tags (document_id, tag_id) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: ai; Owner: topems
--

COPY ai.documents (id, title, content, metadata, file_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: ai; Owner: topems
--

COPY ai.tags (id, name, color, created_at) FROM stdin;
\.


--
-- Data for Name: file_permissions; Type: TABLE DATA; Schema: doc; Owner: topems
--

COPY doc.file_permissions (id, file_id, user_id, role_id, permission, created_at) FROM stdin;
\.


--
-- Data for Name: file_versions; Type: TABLE DATA; Schema: doc; Owner: topems
--

COPY doc.file_versions (id, file_id, version, size, checksum, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: doc; Owner: topems
--

COPY doc.files (id, name, folder_id, size, content_type, checksum, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: folders; Type: TABLE DATA; Schema: doc; Owner: topems
--

COPY doc.folders (id, name, parent_id, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: drill_records; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.drill_records (id, plan_id, drill_name, drill_date, participants, duration, location, summary, issues_found, improvements, attachments, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: emergency_plans; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.emergency_plans (id, plan_no, name, type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: safety_check_items; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.safety_check_items (id, check_id, hazard_id, item_name, check_method, standard, is_conform, remarks, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: safety_checks; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.safety_checks (id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: safety_hazards; Type: TABLE DATA; Schema: ehs; Owner: topems
--

COPY ehs.safety_hazards (id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: flow; Owner: topems
--

COPY flow.approvals (id, workflow_instance_id, task_name, assignee_id, status, comment, approved_by, approved_at, created_at) FROM stdin;
\.


--
-- Data for Name: workflow_instances; Type: TABLE DATA; Schema: flow; Owner: topems
--

COPY flow.workflow_instances (id, workflow_id, status, initiator_id, data, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: flow; Owner: topems
--

COPY flow.workflows (id, name, description, definition, is_active, created_by, created_at, updated_at) FROM stdin;
b4b85c19-3ced-4ff2-a980-41499638accd	文件上传审批	文件上传到特定目录需要审批	{"steps": []}	t	\N	2026-05-22 08:17:43.553167+00	2026-05-22 08:17:43.553167+00
db431aa7-ec5a-44a0-8a14-e983270ae871	请假流程	员工请假审批流程	{"steps": []}	t	\N	2026-05-22 08:17:43.553167+00	2026-05-22 08:17:43.553167+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.audit_logs (id, user_id, action, resource, resource_id, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.permissions (id, name, resource, action, description) FROM stdin;
12e23ced-2581-4333-ba4c-0de47bf7a3c3	read:users	users	read	查看用户
0857ba6c-a673-4937-9e45-c3254f754cbe	write:users	users	write	创建/编辑用户
ce6d006b-72f2-46ce-b3ac-7acbf0e2dadd	delete:users	users	delete	删除用户
4a24bce3-6bf9-43c7-8a4f-d7ab52e4d4af	read:files	files	read	查看文件
bbd3f3db-48f8-4294-9d8f-6b9ec8be3f35	write:files	files	write	上传文件
8f7211a3-9667-437f-b95f-8eb4bcfa674b	delete:files	files	delete	删除文件
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.role_permissions (role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.roles (id, name, description, created_at) FROM stdin;
6976a817-b48c-4eec-95c2-03ecdf2394ba	admin	系统管理员	2026-05-22 08:17:43.538943+00
da840faf-d5ae-4227-acdd-ec70e354a459	user	普通用户	2026-05-22 08:17:43.538943+00
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.user_roles (user_id, role_id, created_at) FROM stdin;
c8ff059c-e34d-4464-a9a0-d012a1f36338	6976a817-b48c-4eec-95c2-03ecdf2394ba	2026-05-22 08:17:43.539167+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: iam; Owner: topems
--

COPY iam.users (id, username, email, password_hash, full_name, avatar_url, is_active, is_superuser, created_at, updated_at, last_login_at) FROM stdin;
c8ff059c-e34d-4464-a9a0-d012a1f36338	admin	admin@topems.com	$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5Gy8J4VdQwK2u	系统管理员	\N	t	t	2026-05-22 08:17:43.538626+00	2026-05-22 08:17:43.538626+00	\N
\.


--
-- Data for Name: equipments; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.equipments (id, name, model, serial_number, status, location, last_calibration_date, next_calibration_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: samples; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.samples (id, sample_id, name, description, sample_type, status, received_date, analysis_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: test_records; Type: TABLE DATA; Schema: lims; Owner: topems
--

COPY lims.test_records (id, sample_id, test_name, test_method, status, result, unit, standard, tested_by, tested_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: formula_ingredients; Type: TABLE DATA; Schema: pdm; Owner: topems
--

COPY pdm.formula_ingredients (id, formula_id, material_name, quantity, unit, percentage, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: production_batches; Type: TABLE DATA; Schema: pdm; Owner: topems
--

COPY pdm.production_batches (id, batch_no, product_name, formula_id, process_id, planned_quantity, actual_quantity, unit, start_date, end_date, status, operator, remarks, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_formulas; Type: TABLE DATA; Schema: pdm; Owner: topems
--

COPY pdm.production_formulas (id, formula_no, name, description, version, process_id, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_processes; Type: TABLE DATA; Schema: pdm; Owner: topems
--

COPY pdm.production_processes (id, process_no, name, description, version, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_statistics; Type: TABLE DATA; Schema: pdm; Owner: topems
--

COPY pdm.production_statistics (id, batch_id, stat_date, output_quantity, reject_quantity, pass_rate, cycle_time, energy_consumption, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: production_steps; Type: TABLE DATA; Schema: pdm; Owner: topems
--

COPY pdm.production_steps (id, process_id, step_no, name, description, duration, equipment_required, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: check_items; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.check_items (id, check_id, standard_id, item_name, check_method, standard_value, actual_value, is_conform, remarks, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: quality_checks; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.quality_checks (id, check_no, project_id, check_type, inspector, check_date, location, result, conclusion, attachments, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quality_improvements; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.quality_improvements (id, improvement_no, title, description, issue_id, status, priority, owner, start_date, end_date, actual_end_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quality_issues; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.quality_issues (id, issue_no, title, description, severity, category, status, assignee, due_date, resolution, closed_at, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quality_standards; Type: TABLE DATA; Schema: qms; Owner: topems
--

COPY qms.quality_standards (id, name, code, category, version, description, content, status, effective_date, expiry_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: experiments; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.experiments (id, project_id, name, description, status, experiment_type, created_by, created_at, started_at, completed_at) FROM stdin;
\.


--
-- Data for Name: formulas; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.formulas (id, project_id, name, version, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ingredients; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.ingredients (id, formula_id, name, quantity, unit, percentage) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: rs; Owner: topems
--

COPY rs.projects (id, name, description, status, priority, start_date, end_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.purchase_order_items (id, po_id, item_name, description, quantity, unit_price, unit, line_total, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.purchase_orders (id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: supplier_evaluations; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.supplier_evaluations (id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: srm; Owner: topems
--

COPY srm.suppliers (id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Name: document_tags document_tags_pkey; Type: CONSTRAINT; Schema: ai; Owner: topems
--

ALTER TABLE ONLY ai.document_tags
    ADD CONSTRAINT document_tags_pkey PRIMARY KEY (document_id, tag_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: ai; Owner: topems
--

ALTER TABLE ONLY ai.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: ai; Owner: topems
--

ALTER TABLE ONLY ai.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: ai; Owner: topems
--

ALTER TABLE ONLY ai.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: file_permissions file_permissions_pkey; Type: CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.file_permissions
    ADD CONSTRAINT file_permissions_pkey PRIMARY KEY (id);


--
-- Name: file_versions file_versions_file_id_version_key; Type: CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.file_versions
    ADD CONSTRAINT file_versions_file_id_version_key UNIQUE (file_id, version);


--
-- Name: file_versions file_versions_pkey; Type: CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.file_versions
    ADD CONSTRAINT file_versions_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


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
-- Name: safety_check_items safety_check_items_pkey; Type: CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_check_items
    ADD CONSTRAINT safety_check_items_pkey PRIMARY KEY (id);


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
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: flow; Owner: topems
--

ALTER TABLE ONLY flow.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: workflow_instances workflow_instances_pkey; Type: CONSTRAINT; Schema: flow; Owner: topems
--

ALTER TABLE ONLY flow.workflow_instances
    ADD CONSTRAINT workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: flow; Owner: topems
--

ALTER TABLE ONLY flow.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: iam; Owner: topems
--

ALTER TABLE ONLY iam.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


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
-- Name: equipments equipments_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.equipments
    ADD CONSTRAINT equipments_pkey PRIMARY KEY (id);


--
-- Name: equipments equipments_serial_number_key; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.equipments
    ADD CONSTRAINT equipments_serial_number_key UNIQUE (serial_number);


--
-- Name: samples samples_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.samples
    ADD CONSTRAINT samples_pkey PRIMARY KEY (id);


--
-- Name: samples samples_sample_id_key; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.samples
    ADD CONSTRAINT samples_sample_id_key UNIQUE (sample_id);


--
-- Name: test_records test_records_pkey; Type: CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.test_records
    ADD CONSTRAINT test_records_pkey PRIMARY KEY (id);


--
-- Name: formula_ingredients formula_ingredients_pkey; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.formula_ingredients
    ADD CONSTRAINT formula_ingredients_pkey PRIMARY KEY (id);


--
-- Name: production_batches production_batches_batch_no_key; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_batches
    ADD CONSTRAINT production_batches_batch_no_key UNIQUE (batch_no);


--
-- Name: production_batches production_batches_pkey; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_batches
    ADD CONSTRAINT production_batches_pkey PRIMARY KEY (id);


--
-- Name: production_formulas production_formulas_formula_no_key; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_formulas
    ADD CONSTRAINT production_formulas_formula_no_key UNIQUE (formula_no);


--
-- Name: production_formulas production_formulas_pkey; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_formulas
    ADD CONSTRAINT production_formulas_pkey PRIMARY KEY (id);


--
-- Name: production_processes production_processes_pkey; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_processes
    ADD CONSTRAINT production_processes_pkey PRIMARY KEY (id);


--
-- Name: production_processes production_processes_process_no_key; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_processes
    ADD CONSTRAINT production_processes_process_no_key UNIQUE (process_no);


--
-- Name: production_statistics production_statistics_batch_id_stat_date_key; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_statistics
    ADD CONSTRAINT production_statistics_batch_id_stat_date_key UNIQUE (batch_id, stat_date);


--
-- Name: production_statistics production_statistics_pkey; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_statistics
    ADD CONSTRAINT production_statistics_pkey PRIMARY KEY (id);


--
-- Name: production_steps production_steps_pkey; Type: CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_steps
    ADD CONSTRAINT production_steps_pkey PRIMARY KEY (id);


--
-- Name: check_items check_items_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.check_items
    ADD CONSTRAINT check_items_pkey PRIMARY KEY (id);


--
-- Name: quality_checks quality_checks_check_no_key; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_checks
    ADD CONSTRAINT quality_checks_check_no_key UNIQUE (check_no);


--
-- Name: quality_checks quality_checks_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_checks
    ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);


--
-- Name: quality_improvements quality_improvements_improvement_no_key; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_improvements
    ADD CONSTRAINT quality_improvements_improvement_no_key UNIQUE (improvement_no);


--
-- Name: quality_improvements quality_improvements_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_improvements
    ADD CONSTRAINT quality_improvements_pkey PRIMARY KEY (id);


--
-- Name: quality_issues quality_issues_issue_no_key; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_issues
    ADD CONSTRAINT quality_issues_issue_no_key UNIQUE (issue_no);


--
-- Name: quality_issues quality_issues_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_issues
    ADD CONSTRAINT quality_issues_pkey PRIMARY KEY (id);


--
-- Name: quality_standards quality_standards_code_key; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_standards
    ADD CONSTRAINT quality_standards_code_key UNIQUE (code);


--
-- Name: quality_standards quality_standards_pkey; Type: CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_standards
    ADD CONSTRAINT quality_standards_pkey PRIMARY KEY (id);


--
-- Name: experiments experiments_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.experiments
    ADD CONSTRAINT experiments_pkey PRIMARY KEY (id);


--
-- Name: formulas formulas_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.formulas
    ADD CONSTRAINT formulas_pkey PRIMARY KEY (id);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


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
-- Name: idx_document_tags_document_id; Type: INDEX; Schema: ai; Owner: topems
--

CREATE INDEX idx_document_tags_document_id ON ai.document_tags USING btree (document_id);


--
-- Name: idx_document_tags_tag_id; Type: INDEX; Schema: ai; Owner: topems
--

CREATE INDEX idx_document_tags_tag_id ON ai.document_tags USING btree (tag_id);


--
-- Name: idx_documents_created_at; Type: INDEX; Schema: ai; Owner: topems
--

CREATE INDEX idx_documents_created_at ON ai.documents USING btree (created_at);


--
-- Name: idx_documents_created_by; Type: INDEX; Schema: ai; Owner: topems
--

CREATE INDEX idx_documents_created_by ON ai.documents USING btree (created_by);


--
-- Name: idx_file_permissions_file_id; Type: INDEX; Schema: doc; Owner: topems
--

CREATE INDEX idx_file_permissions_file_id ON doc.file_permissions USING btree (file_id);


--
-- Name: idx_file_permissions_user_id; Type: INDEX; Schema: doc; Owner: topems
--

CREATE INDEX idx_file_permissions_user_id ON doc.file_permissions USING btree (user_id);


--
-- Name: idx_file_versions_file_id; Type: INDEX; Schema: doc; Owner: topems
--

CREATE INDEX idx_file_versions_file_id ON doc.file_versions USING btree (file_id);


--
-- Name: idx_files_created_by; Type: INDEX; Schema: doc; Owner: topems
--

CREATE INDEX idx_files_created_by ON doc.files USING btree (created_by);


--
-- Name: idx_files_folder_id; Type: INDEX; Schema: doc; Owner: topems
--

CREATE INDEX idx_files_folder_id ON doc.files USING btree (folder_id);


--
-- Name: idx_folders_parent_id; Type: INDEX; Schema: doc; Owner: topems
--

CREATE INDEX idx_folders_parent_id ON doc.folders USING btree (parent_id);


--
-- Name: idx_drill_records_plan_id; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_drill_records_plan_id ON ehs.drill_records USING btree (plan_id);


--
-- Name: idx_emergency_plans_plan_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_emergency_plans_plan_no ON ehs.emergency_plans USING btree (plan_no);


--
-- Name: idx_emergency_plans_status; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_emergency_plans_status ON ehs.emergency_plans USING btree (status);


--
-- Name: idx_safety_check_items_check_id; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_check_items_check_id ON ehs.safety_check_items USING btree (check_id);


--
-- Name: idx_safety_checks_check_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_checks_check_no ON ehs.safety_checks USING btree (check_no);


--
-- Name: idx_safety_checks_status; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_checks_status ON ehs.safety_checks USING btree (status);


--
-- Name: idx_safety_hazards_hazard_no; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_hazards_hazard_no ON ehs.safety_hazards USING btree (hazard_no);


--
-- Name: idx_safety_hazards_level; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_hazards_level ON ehs.safety_hazards USING btree (level);


--
-- Name: idx_safety_hazards_status; Type: INDEX; Schema: ehs; Owner: topems
--

CREATE INDEX idx_safety_hazards_status ON ehs.safety_hazards USING btree (status);


--
-- Name: idx_approvals_assignee_id; Type: INDEX; Schema: flow; Owner: topems
--

CREATE INDEX idx_approvals_assignee_id ON flow.approvals USING btree (assignee_id);


--
-- Name: idx_approvals_status; Type: INDEX; Schema: flow; Owner: topems
--

CREATE INDEX idx_approvals_status ON flow.approvals USING btree (status);


--
-- Name: idx_approvals_workflow_instance_id; Type: INDEX; Schema: flow; Owner: topems
--

CREATE INDEX idx_approvals_workflow_instance_id ON flow.approvals USING btree (workflow_instance_id);


--
-- Name: idx_workflow_instances_initiator_id; Type: INDEX; Schema: flow; Owner: topems
--

CREATE INDEX idx_workflow_instances_initiator_id ON flow.workflow_instances USING btree (initiator_id);


--
-- Name: idx_workflow_instances_status; Type: INDEX; Schema: flow; Owner: topems
--

CREATE INDEX idx_workflow_instances_status ON flow.workflow_instances USING btree (status);


--
-- Name: idx_workflows_is_active; Type: INDEX; Schema: flow; Owner: topems
--

CREATE INDEX idx_workflows_is_active ON flow.workflows USING btree (is_active);


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
-- Name: idx_equipments_serial_number; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_equipments_serial_number ON lims.equipments USING btree (serial_number);


--
-- Name: idx_equipments_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_equipments_status ON lims.equipments USING btree (status);


--
-- Name: idx_samples_sample_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_samples_sample_id ON lims.samples USING btree (sample_id);


--
-- Name: idx_samples_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_samples_status ON lims.samples USING btree (status);


--
-- Name: idx_test_records_sample_id; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_test_records_sample_id ON lims.test_records USING btree (sample_id);


--
-- Name: idx_test_records_status; Type: INDEX; Schema: lims; Owner: topems
--

CREATE INDEX idx_test_records_status ON lims.test_records USING btree (status);


--
-- Name: idx_formula_ingredients_formula_id; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_formula_ingredients_formula_id ON pdm.formula_ingredients USING btree (formula_id);


--
-- Name: idx_production_batches_batch_no; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_batches_batch_no ON pdm.production_batches USING btree (batch_no);


--
-- Name: idx_production_batches_formula_id; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_batches_formula_id ON pdm.production_batches USING btree (formula_id);


--
-- Name: idx_production_batches_status; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_batches_status ON pdm.production_batches USING btree (status);


--
-- Name: idx_production_formulas_formula_no; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_formulas_formula_no ON pdm.production_formulas USING btree (formula_no);


--
-- Name: idx_production_formulas_status; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_formulas_status ON pdm.production_formulas USING btree (status);


--
-- Name: idx_production_processes_process_no; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_processes_process_no ON pdm.production_processes USING btree (process_no);


--
-- Name: idx_production_processes_status; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_processes_status ON pdm.production_processes USING btree (status);


--
-- Name: idx_production_statistics_batch_id; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_statistics_batch_id ON pdm.production_statistics USING btree (batch_id);


--
-- Name: idx_production_statistics_stat_date; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_statistics_stat_date ON pdm.production_statistics USING btree (stat_date);


--
-- Name: idx_production_steps_process_id; Type: INDEX; Schema: pdm; Owner: topems
--

CREATE INDEX idx_production_steps_process_id ON pdm.production_steps USING btree (process_id);


--
-- Name: idx_check_items_check_id; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_check_items_check_id ON qms.check_items USING btree (check_id);


--
-- Name: idx_quality_checks_check_no; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_checks_check_no ON qms.quality_checks USING btree (check_no);


--
-- Name: idx_quality_checks_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_checks_status ON qms.quality_checks USING btree (status);


--
-- Name: idx_quality_improvements_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_improvements_status ON qms.quality_improvements USING btree (status);


--
-- Name: idx_quality_issues_issue_no; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_issue_no ON qms.quality_issues USING btree (issue_no);


--
-- Name: idx_quality_issues_severity; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_severity ON qms.quality_issues USING btree (severity);


--
-- Name: idx_quality_issues_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_issues_status ON qms.quality_issues USING btree (status);


--
-- Name: idx_quality_standards_code; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_code ON qms.quality_standards USING btree (code);


--
-- Name: idx_quality_standards_status; Type: INDEX; Schema: qms; Owner: topems
--

CREATE INDEX idx_quality_standards_status ON qms.quality_standards USING btree (status);


--
-- Name: idx_experiments_project_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_experiments_project_id ON rs.experiments USING btree (project_id);


--
-- Name: idx_experiments_status; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_experiments_status ON rs.experiments USING btree (status);


--
-- Name: idx_formulas_project_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_formulas_project_id ON rs.formulas USING btree (project_id);


--
-- Name: idx_ingredients_formula_id; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_ingredients_formula_id ON rs.ingredients USING btree (formula_id);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_created_by ON rs.projects USING btree (created_by);


--
-- Name: idx_projects_status; Type: INDEX; Schema: rs; Owner: topems
--

CREATE INDEX idx_projects_status ON rs.projects USING btree (status);


--
-- Name: idx_purchase_order_items_po_id; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_purchase_order_items_po_id ON srm.purchase_order_items USING btree (po_id);


--
-- Name: idx_purchase_orders_po_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_purchase_orders_po_no ON srm.purchase_orders USING btree (po_no);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_purchase_orders_status ON srm.purchase_orders USING btree (status);


--
-- Name: idx_purchase_orders_supplier_id; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_purchase_orders_supplier_id ON srm.purchase_orders USING btree (supplier_id);


--
-- Name: idx_supplier_evaluations_evaluation_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_evaluations_evaluation_no ON srm.supplier_evaluations USING btree (evaluation_no);


--
-- Name: idx_supplier_evaluations_supplier_id; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_supplier_evaluations_supplier_id ON srm.supplier_evaluations USING btree (supplier_id);


--
-- Name: idx_suppliers_category; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_suppliers_category ON srm.suppliers USING btree (category);


--
-- Name: idx_suppliers_status; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_suppliers_status ON srm.suppliers USING btree (status);


--
-- Name: idx_suppliers_supplier_no; Type: INDEX; Schema: srm; Owner: topems
--

CREATE INDEX idx_suppliers_supplier_no ON srm.suppliers USING btree (supplier_no);


--
-- Name: document_tags document_tags_document_id_fkey; Type: FK CONSTRAINT; Schema: ai; Owner: topems
--

ALTER TABLE ONLY ai.document_tags
    ADD CONSTRAINT document_tags_document_id_fkey FOREIGN KEY (document_id) REFERENCES ai.documents(id) ON DELETE CASCADE;


--
-- Name: document_tags document_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: ai; Owner: topems
--

ALTER TABLE ONLY ai.document_tags
    ADD CONSTRAINT document_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES ai.tags(id) ON DELETE CASCADE;


--
-- Name: file_permissions file_permissions_file_id_fkey; Type: FK CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.file_permissions
    ADD CONSTRAINT file_permissions_file_id_fkey FOREIGN KEY (file_id) REFERENCES doc.files(id) ON DELETE CASCADE;


--
-- Name: file_versions file_versions_file_id_fkey; Type: FK CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.file_versions
    ADD CONSTRAINT file_versions_file_id_fkey FOREIGN KEY (file_id) REFERENCES doc.files(id) ON DELETE CASCADE;


--
-- Name: files files_folder_id_fkey; Type: FK CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.files
    ADD CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES doc.folders(id) ON DELETE CASCADE;


--
-- Name: folders folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: doc; Owner: topems
--

ALTER TABLE ONLY doc.folders
    ADD CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES doc.folders(id) ON DELETE CASCADE;


--
-- Name: drill_records drill_records_plan_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.drill_records
    ADD CONSTRAINT drill_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.emergency_plans(id) ON DELETE CASCADE;


--
-- Name: safety_check_items safety_check_items_check_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_check_items
    ADD CONSTRAINT safety_check_items_check_id_fkey FOREIGN KEY (check_id) REFERENCES ehs.safety_checks(id) ON DELETE CASCADE;


--
-- Name: safety_check_items safety_check_items_hazard_id_fkey; Type: FK CONSTRAINT; Schema: ehs; Owner: topems
--

ALTER TABLE ONLY ehs.safety_check_items
    ADD CONSTRAINT safety_check_items_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.safety_hazards(id) ON DELETE SET NULL;


--
-- Name: approvals approvals_workflow_instance_id_fkey; Type: FK CONSTRAINT; Schema: flow; Owner: topems
--

ALTER TABLE ONLY flow.approvals
    ADD CONSTRAINT approvals_workflow_instance_id_fkey FOREIGN KEY (workflow_instance_id) REFERENCES flow.workflow_instances(id) ON DELETE CASCADE;


--
-- Name: workflow_instances workflow_instances_workflow_id_fkey; Type: FK CONSTRAINT; Schema: flow; Owner: topems
--

ALTER TABLE ONLY flow.workflow_instances
    ADD CONSTRAINT workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES flow.workflows(id) ON DELETE CASCADE;


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
-- Name: test_records test_records_sample_id_fkey; Type: FK CONSTRAINT; Schema: lims; Owner: topems
--

ALTER TABLE ONLY lims.test_records
    ADD CONSTRAINT test_records_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES lims.samples(id) ON DELETE CASCADE;


--
-- Name: formula_ingredients formula_ingredients_formula_id_fkey; Type: FK CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.formula_ingredients
    ADD CONSTRAINT formula_ingredients_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES pdm.production_formulas(id) ON DELETE CASCADE;


--
-- Name: production_batches production_batches_formula_id_fkey; Type: FK CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_batches
    ADD CONSTRAINT production_batches_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES pdm.production_formulas(id) ON DELETE SET NULL;


--
-- Name: production_batches production_batches_process_id_fkey; Type: FK CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_batches
    ADD CONSTRAINT production_batches_process_id_fkey FOREIGN KEY (process_id) REFERENCES pdm.production_processes(id) ON DELETE SET NULL;


--
-- Name: production_formulas production_formulas_process_id_fkey; Type: FK CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_formulas
    ADD CONSTRAINT production_formulas_process_id_fkey FOREIGN KEY (process_id) REFERENCES pdm.production_processes(id) ON DELETE SET NULL;


--
-- Name: production_statistics production_statistics_batch_id_fkey; Type: FK CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_statistics
    ADD CONSTRAINT production_statistics_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES pdm.production_batches(id) ON DELETE CASCADE;


--
-- Name: production_steps production_steps_process_id_fkey; Type: FK CONSTRAINT; Schema: pdm; Owner: topems
--

ALTER TABLE ONLY pdm.production_steps
    ADD CONSTRAINT production_steps_process_id_fkey FOREIGN KEY (process_id) REFERENCES pdm.production_processes(id) ON DELETE CASCADE;


--
-- Name: check_items check_items_check_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.check_items
    ADD CONSTRAINT check_items_check_id_fkey FOREIGN KEY (check_id) REFERENCES qms.quality_checks(id) ON DELETE CASCADE;


--
-- Name: check_items check_items_standard_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.check_items
    ADD CONSTRAINT check_items_standard_id_fkey FOREIGN KEY (standard_id) REFERENCES qms.quality_standards(id) ON DELETE SET NULL;


--
-- Name: quality_improvements quality_improvements_issue_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: topems
--

ALTER TABLE ONLY qms.quality_improvements
    ADD CONSTRAINT quality_improvements_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES qms.quality_issues(id) ON DELETE SET NULL;


--
-- Name: experiments experiments_project_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.experiments
    ADD CONSTRAINT experiments_project_id_fkey FOREIGN KEY (project_id) REFERENCES rs.projects(id) ON DELETE CASCADE;


--
-- Name: formulas formulas_project_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.formulas
    ADD CONSTRAINT formulas_project_id_fkey FOREIGN KEY (project_id) REFERENCES rs.projects(id) ON DELETE CASCADE;


--
-- Name: ingredients ingredients_formula_id_fkey; Type: FK CONSTRAINT; Schema: rs; Owner: topems
--

ALTER TABLE ONLY rs.ingredients
    ADD CONSTRAINT ingredients_formula_id_fkey FOREIGN KEY (formula_id) REFERENCES rs.formulas(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES srm.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_evaluations supplier_evaluations_supplier_id_fkey; Type: FK CONSTRAINT; Schema: srm; Owner: topems
--

ALTER TABLE ONLY srm.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict V0QkvRZNhSpfxjX6Lk3Syv8oJxvrz8XyZQD0Ta1CFik6t5Gw703139IUQeJwowl

--
-- PostgreSQL database cluster dump complete
--

