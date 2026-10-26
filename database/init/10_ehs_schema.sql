


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

-- =============================================================
-- 本文件为 ehs 域结构「参考快照」（2026-10-26 对齐迁移链终态）
-- -------------------------------------------------------------
-- 背景：本文件曾是未被迁移链消费的静态 DDL 快照，ehs 两表真实建表/演进全部走
--       database/migrations/（迁移链），快照严重滞后（training_records 缺 8 列、
--       health_records 缺 3 列、birth_date 类型 date、status DEFAULT 'active'），
--       构成「DDL 双轨」漂移根源。
-- 处置（2026-10-26，上游建议 B 项落地）：
--   1) 新增迁移 20261026120000_ehs_ddl_dual_track_align.sql，把两表补齐至迁移链
--      终态（dev 库实测：training_records 29 列 / health_records 28 列 / birth_date
--      timestamptz / status DEFAULT 三态对齐）。
--   2) 本文件两张表定义已同步为与迁移链相同的终态（仅作参考/追溯，不再作为建库输入）。
--   3) status DEFAULT：training_records 统一 'ongoing'（三态 ongoing/completed/failed）；
--      health_records 保持 'active'（与迁移链终态一致）。
-- 新库/生产建库一律以迁移链为准；本文件任何修改需与迁移链同步，否则视为漂移。
-- =============================================================


CREATE SCHEMA IF NOT EXISTS ehs;


SET default_tablespace = '';

SET default_table_access_method = heap;


CREATE TABLE IF NOT EXISTS ehs.audit_logs (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='audit_logs' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.audit_logs FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.drill_records (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT drill_records_drill_no_key UNIQUE (drill_no),
    CONSTRAINT drill_records_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='drill_records' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.drill_records FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.emergency_plans (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_emergency_plans_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT emergency_plans_pkey PRIMARY KEY (id),
    CONSTRAINT emergency_plans_plan_no_key UNIQUE (plan_no)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='emergency_plans' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.emergency_plans FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.environmental_alerts (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_environmental_alerts_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT environmental_alerts_pkey PRIMARY KEY (id),
    CONSTRAINT environmental_alerts_point_id_fkey FOREIGN KEY (point_id) REFERENCES ehs.monitoring_points(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='environmental_alerts' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.environmental_alerts FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.environmental_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    point_id uuid NOT NULL,
    data_time timestamp with time zone NOT NULL,
    parameter character varying(50) NOT NULL,
    value numeric(20,6) NOT NULL,
    unit character varying(20) NOT NULL,
    quality character varying(20),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT environmental_data_pkey PRIMARY KEY (id),
    CONSTRAINT environmental_data_point_id_fkey FOREIGN KEY (point_id) REFERENCES ehs.monitoring_points(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='environmental_data' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.environmental_data FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.hazard_control_measures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_id uuid NOT NULL,
    measure_type character varying(32) DEFAULT 'engineering'::character varying NOT NULL,
    description text,
    responsible character varying(100),
    deadline timestamp with time zone,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    effectiveness character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT hazard_control_measures_pkey PRIMARY KEY (id),
    CONSTRAINT hazard_control_measures_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id)
);



CREATE TABLE IF NOT EXISTS ehs.hazard_risk_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_id uuid NOT NULL,
    assessment_date timestamp with time zone,
    assessor character varying(100),
    severity character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    likelihood character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    risklevel character varying(32),
    recommendations text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT hazard_risk_assessments_pkey PRIMARY KEY (id),
    CONSTRAINT hazard_risk_assessments_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id)
);



CREATE TABLE IF NOT EXISTS ehs.health_checkups (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_health_checkups_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT health_checkups_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='health_checkups' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.health_checkups FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.health_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(128) NOT NULL,
    employee_name character varying(128) NOT NULL,
    gender character varying(16),
    birth_date timestamp with time zone,
    blood_type character varying(16),
    allergies jsonb DEFAULT '[]'::jsonb,
    chronic_diseases jsonb DEFAULT '[]'::jsonb,
    medical_history text,
    emergency_contact character varying(128),
    emergency_phone character varying(32),
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    record_no character varying(64),
    department character varying(100),
    "position" character varying(100),
    workplace character varying(100),
    hazard_factors jsonb,
    allergy_history text,
    contact_info text,
    check_type character varying(50),
    check_date date,
    result character varying(50),
    remarks text,
    CONSTRAINT health_records_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='health_records' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.health_records FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.monitoring_points (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_monitoring_points_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT monitoring_points_pkey PRIMARY KEY (id),
    CONSTRAINT monitoring_points_point_no_key UNIQUE (point_no)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='monitoring_points' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.monitoring_points FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_accident_investigations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    team jsonb,
    findings text,
    root_cause text,
    timeline jsonb,
    status character varying(32) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_accident_investigations_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_accident_investigations_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_accident_investigations_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES ehs.qa_ehs_accidents(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_accident_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    summary text,
    lessons_learned jsonb,
    recommendations jsonb,
    reviewer character varying(64),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_accident_reviews_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_accident_reviews_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES ehs.qa_ehs_accidents(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_accident_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    actions jsonb,
    responsible character varying(64),
    status character varying(32) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_accident_treatments_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_accident_treatments_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_accident_treatments_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES ehs.qa_ehs_accidents(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_accidents (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_accidents_accident_no_key UNIQUE (accident_no),
    CONSTRAINT qa_ehs_accidents_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_accidents' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_accidents FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    alert_type character varying(64),
    severity character varying(32),
    description text,
    status character varying(32) DEFAULT 'active'::character varying,
    source_system character varying(64),
    source_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_alerts_pkey PRIMARY KEY (id),
    CONSTRAINT uq_qa_ehs_alerts_no UNIQUE (alert_no)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_alerts' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_alerts FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_compliance_evaluations (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    non_complianceitems jsonb DEFAULT '[]'::jsonb,
    corrective_actions text,
    CONSTRAINT ck_qa_ehs_compliance_evaluations_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_compliance_evaluations_eval_no_key UNIQUE (eval_no),
    CONSTRAINT qa_ehs_compliance_evaluations_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_compliance_evaluations' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_compliance_evaluations FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_compliance_items (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_compliance_items_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_compliance_items_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_compliance_items_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES ehs.qa_ehs_compliance_evaluations(id),
    CONSTRAINT qa_ehs_compliance_items_regulation_id_fkey FOREIGN KEY (regulation_id) REFERENCES ehs.qa_ehs_environmental_regulations(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_contraindications (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_contraindications_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_contraindications_pkey PRIMARY KEY (id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_detection_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_detection_records_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_detection_records_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_detection_records_record_no_key UNIQUE (record_no),
    CONSTRAINT qa_ehs_detection_records_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES ehs.qa_ehs_hazard_factors(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_discharge_permits (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    permit_category character varying(64),
    discharge_limits jsonb DEFAULT '[]'::jsonb,
    monitoring_requirements text,
    CONSTRAINT ck_qa_ehs_discharge_permits_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_discharge_permits_permit_no_key UNIQUE (permit_no),
    CONSTRAINT qa_ehs_discharge_permits_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_discharge_permits' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_discharge_permits FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_disease_cases (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    gender character varying(16),
    age integer,
    hazard_factor character varying(128),
    work_related boolean DEFAULT false NOT NULL,
    attachments jsonb,
    reported_at timestamp with time zone,
    CONSTRAINT ck_qa_ehs_disease_cases_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_disease_cases_case_no_key UNIQUE (case_no),
    CONSTRAINT qa_ehs_disease_cases_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_disease_cases' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_disease_cases FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_drill_evaluations (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT qa_ehs_drill_evaluations_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_drill_evaluations_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_drill_plans (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_drill_plans_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_drill_plans_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_drill_plans_plan_no_key UNIQUE (plan_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_drill_problems (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_drill_problems_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_drill_problems_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_drill_problems_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_drill_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    issues_found text,
    improvements text,
    created_by character varying(128),
    tenant_id uuid,
    CONSTRAINT qa_ehs_drill_records_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_drill_records_record_no_key UNIQUE (record_no),
    CONSTRAINT qa_ehs_drill_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_drill_plans(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_drill_records' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_records FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_emergency_plan_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    approver character varying(64),
    approver_role character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    opinion text,
    approved_at timestamp with time zone,
    order_num integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_emergency_plan_approvals_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_emergency_plan_approvals_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_emergency_plan_approvals_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_emergency_plan_supplies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    name character varying(256) NOT NULL,
    specification character varying(256),
    quantity integer DEFAULT 0,
    unit character varying(32),
    storage_location character varying(256),
    responsible_person character varying(64),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_emergency_plan_supplies_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_emergency_plan_supplies_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_emergency_plan_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    version character varying(32) NOT NULL,
    change_description text,
    changed_by character varying(64),
    changed_at timestamp with time zone,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_emergency_plan_versions_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_emergency_plan_versions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_emergency_plans (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT qa_ehs_emergency_plans_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_emergency_plans_plan_no_key UNIQUE (plan_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_no character varying(64),
    name character varying(128) NOT NULL,
    email text,
    department_id uuid,
    department_name character varying(128),
    "position" character varying(128),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    CONSTRAINT qa_ehs_employees_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_employees' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_employees FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_env_monitor_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT qa_ehs_env_monitor_records_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_env_monitor_records_record_no_key UNIQUE (record_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_environment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    monitor_type character varying(64),
    monitor_point character varying(128),
    data jsonb,
    status character varying(32) DEFAULT 'normal'::character varying,
    monitored_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_environment_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_environment_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_environment_record_no_key UNIQUE (record_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_environment_incidents (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT qa_ehs_environment_incidents_incident_no_key UNIQUE (incident_no),
    CONSTRAINT qa_ehs_environment_incidents_pkey PRIMARY KEY (id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_environment_monitors (
    id uuid NOT NULL,
    monitor_no character varying(100),
    name character varying(200) NOT NULL,
    monitor_type character varying(50),
    location character varying(200),
    status character varying(20) DEFAULT 'active'::character varying,
    description text,
    monitor_frequency character varying(100),
    standard_value text,
    warning_threshold text,
    alarm_threshold text,
    unit character varying(50),
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    created_by uuid,
    CONSTRAINT qa_ehs_environment_monitors_monitor_no_key UNIQUE (monitor_no),
    CONSTRAINT qa_ehs_environment_monitors_pkey PRIMARY KEY (id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_environmental_regulations (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    keywords jsonb DEFAULT '[]'::jsonb,
    applicable_scopes jsonb DEFAULT '[]'::jsonb,
    created_by character varying(128),
    tenant_id uuid,
    CONSTRAINT qa_ehs_environmental_regulations_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_environmental_regulations_reg_no_key UNIQUE (reg_no)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_environmental_regulations' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_environmental_regulations FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazard_factors (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_hazard_factors_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_hazard_factors_factor_no_key UNIQUE (factor_no),
    CONSTRAINT qa_ehs_hazard_factors_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazard_factors' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_hazard_factors FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazard_rectifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_id uuid,
    description text,
    responsible character varying(64),
    deadline date,
    status character varying(32) DEFAULT 'in_progress'::character varying,
    progress integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_hazard_rectifications_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_hazard_rectifications_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazard_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_id uuid,
    verifier character varying(64),
    result character varying(32),
    remarks text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_hazard_verifications_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_hazard_verifications_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazardous_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_no character varying(64),
    name character varying(256) NOT NULL,
    name_en character varying(256),
    alias character varying(256),
    english_name character varying(256),
    cas_no character varying(64),
    category character varying(64),
    hazard_level character varying(32),
    hazard_class character varying(32),
    specification character varying(256),
    unit character varying(32),
    packaging character varying(128),
    storage_condition character varying(256),
    storage_location character varying(256),
    max_stock numeric(15,3),
    min_stock numeric(15,3),
    current_stock numeric(15,3),
    safety_data_sheet text,
    emergency_measures text,
    supplier character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    remarks text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    un_number character varying(64),
    description text,
    hazards jsonb,
    storage_requirements text,
    handling_requirements text,
    CONSTRAINT qa_ehs_hazardous_materials_material_no_key UNIQUE (material_no),
    CONSTRAINT qa_ehs_hazardous_materials_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazardous_materials' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_hazardous_materials FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazards (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    title_en character varying(255),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_hazards_hazard_no_key UNIQUE (hazard_no),
    CONSTRAINT qa_ehs_hazards_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_hazards_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES ehs.qa_ehs_inspection_records(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_hazards' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_hazards FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_health_abnormalities (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_health_abnormalities_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_health_abnormalities_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_health_abnormalities_record_id_fkey FOREIGN KEY (record_id) REFERENCES ehs.qa_ehs_health_exam_records(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_health_exam_plans (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_health_exam_plans_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_health_exam_plans_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_health_exam_plans_plan_no_key UNIQUE (plan_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_health_exam_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_health_exam_records_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_health_exam_records_record_no_key UNIQUE (record_no),
    CONSTRAINT qa_ehs_health_exam_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_health_exam_plans(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_health_trainings (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_health_trainings_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_health_trainings_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_health_trainings_training_no_key UNIQUE (training_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_incident_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid NOT NULL,
    title character varying(256),
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_incident_actions_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_incident_actions' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_incident_actions FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_inspection_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid,
    item_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    category character varying(64),
    standard text,
    order_num integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_inspection_items_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_inspection_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_inspection_plans(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_inspection_plans (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT qa_ehs_inspection_plans_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_inspection_plans_plan_no_key UNIQUE (plan_no)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_plans' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_plans FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_inspection_record_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid,
    item_id uuid,
    item_title character varying(256) NOT NULL,
    item_category character varying(64),
    result character varying(32),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_inspection_record_items_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_inspection_record_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES ehs.qa_ehs_inspection_items(id),
    CONSTRAINT qa_ehs_inspection_record_items_record_id_fkey FOREIGN KEY (record_id) REFERENCES ehs.qa_ehs_inspection_records(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_inspection_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT qa_ehs_inspection_records_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_inspection_records_record_no_key UNIQUE (record_no),
    CONSTRAINT qa_ehs_inspection_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_inspection_plans(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_inspection_records' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_records FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_investigations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid NOT NULL,
    team jsonb,
    findings text,
    root_cause text,
    timeline jsonb,
    status character varying(32) DEFAULT 'in_progress'::character varying NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_investigations_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_investigations' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_investigations FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_material_stocks (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_material_stocks_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_material_stocks_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_material_stocks_material_id_fkey FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_msds (
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    product_name character varying(256),
    manufacturer character varying(256),
    emergency_phone character varying(64),
    CONSTRAINT qa_ehs_msds_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_msds_material_id_fkey FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_msds' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_msds FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_protection_measures (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_protection_measures_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_protection_measures_measure_no_key UNIQUE (measure_no),
    CONSTRAINT qa_ehs_protection_measures_pkey PRIMARY KEY (id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid NOT NULL,
    summary text,
    lessons_learned jsonb,
    recommendations jsonb,
    reviewer character varying(128),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_reviews_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_reviews' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_reviews FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_risk_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_id uuid NOT NULL,
    measure_no character varying(64),
    title character varying(256) DEFAULT '未命名措施'::character varying NOT NULL,
    description text,
    measure_type character varying(64),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_risk_controls_measure_no_key UNIQUE (measure_no),
    CONSTRAINT qa_ehs_risk_controls_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_risk_controls' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_risk_controls FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_risks (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_risks_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_risks_risk_no_key UNIQUE (risk_no)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_risks' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_risks FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_stock_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_stock_records_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_stock_records_record_no_key UNIQUE (record_no),
    CONSTRAINT qa_ehs_stock_records_material_id_fkey FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_sync_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT ck_qa_ehs_sync_records_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT qa_ehs_sync_records_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_sync_records_sync_no_key UNIQUE (sync_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_training_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    certificate_no character varying(64),
    employee_id character varying(128),
    employee_name character varying(128) DEFAULT '未命名'::character varying NOT NULL,
    training_type character varying(64),
    certificate_type character varying(64),
    issue_date timestamp with time zone,
    expiry_date timestamp with time zone,
    issuing_authority character varying(256),
    status character varying(32) DEFAULT 'valid'::character varying NOT NULL,
    record_id uuid,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_training_certificates_certificate_no_key UNIQUE (certificate_no),
    CONSTRAINT qa_ehs_training_certificates_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_training_certificates' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_training_certificates FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_trainings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    training_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    content text,
    trainer character varying(64),
    training_type character varying(64),
    duration_hours integer,
    scheduled_at timestamp with time zone,
    status character varying(32) DEFAULT 'scheduled'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    CONSTRAINT qa_ehs_trainings_pkey PRIMARY KEY (id),
    CONSTRAINT qa_ehs_trainings_training_no_key UNIQUE (training_no)
);



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_treatment_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    treatment_id uuid NOT NULL,
    description text NOT NULL,
    responsible character varying(128),
    deadline timestamp with time zone,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_treatment_actions_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_treatment_actions' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_treatment_actions FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.qa_ehs_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid NOT NULL,
    responsible character varying(128),
    status character varying(32) DEFAULT 'in_progress'::character varying NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT qa_ehs_treatments_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='qa_ehs_treatments' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.qa_ehs_treatments FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.risk_assessments (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_risk_assessments_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT risk_assessments_assessment_no_key UNIQUE (assessment_no),
    CONSTRAINT risk_assessments_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='risk_assessments' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.risk_assessments FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.risk_controls (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_risk_controls_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT risk_controls_pkey PRIMARY KEY (id),
    CONSTRAINT risk_controls_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES ehs.risk_assessments(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='risk_controls' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.risk_controls FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.safety_checks (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_safety_checks_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT safety_checks_check_no_key UNIQUE (check_no),
    CONSTRAINT safety_checks_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='safety_checks' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.safety_checks FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.safety_hazards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    severity character varying(10),
    exposure character varying(10),
    likelihood character varying(10),
    hazard_no character varying(64),
    name character varying(256),
    category character varying(64),
    description text,
    level character varying(32),
    location character varying(256),
    risk_assessment text,
    control_measures jsonb DEFAULT '[]'::jsonb,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying,
    tenant_id uuid,
    CONSTRAINT safety_hazards_hazard_no_key UNIQUE (hazard_no),
    CONSTRAINT safety_hazards_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='safety_hazards' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.safety_hazards FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.safety_incidents (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT safety_incidents_incident_no_key UNIQUE (incident_no),
    CONSTRAINT safety_incidents_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='safety_incidents' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.safety_incidents FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.schema_defense_ledger (
    service_schema text NOT NULL,
    schema_hash text NOT NULL,
    tables_count integer DEFAULT 0 NOT NULL,
    cols_count integer DEFAULT 0 NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    last_skipped_ensure boolean DEFAULT false NOT NULL,
    CONSTRAINT schema_defense_ledger_pkey PRIMARY KEY (service_schema)
);



CREATE TABLE IF NOT EXISTS ehs.training_programs (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT training_programs_pkey PRIMARY KEY (id),
    CONSTRAINT training_programs_program_no_key UNIQUE (program_no)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='training_programs' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.training_programs FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.training_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    employee_id character varying(128),
    employee_name character varying(128),
    enrollment_date timestamp with time zone,
    completion_date timestamp with time zone,
    score numeric,
    certificate_no character varying(64),
    certificate_expiry timestamp with time zone,
    status character varying(32) DEFAULT 'ongoing'::character varying NOT NULL,
    remarks text,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    record_no character varying(64),
    title character varying(200),
    training_type character varying(64),
    category character varying(64),
    trainer character varying(128),
    training_date timestamp with time zone,
    location character varying(256),
    duration_hours numeric(5,1),
    participants jsonb DEFAULT '[]'::jsonb,
    content text,
    materials jsonb DEFAULT '[]'::jsonb,
    result character varying(32),
    pass_rate numeric(5,2),
    CONSTRAINT training_records_pkey PRIMARY KEY (id),
    CONSTRAINT uq_training_records_record_no UNIQUE (record_no),
    CONSTRAINT training_records_program_id_fkey FOREIGN KEY (program_id) REFERENCES ehs.training_programs(id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='training_records' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.training_records FORCE ROW LEVEL SECURITY; END IF; END $$;



CREATE TABLE IF NOT EXISTS ehs.vaccination_records (
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
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_vaccination_records_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT vaccination_records_pkey PRIMARY KEY (id)
);

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ehs' AND c.relname='vaccination_records' AND c.relrowsecurity) THEN ALTER TABLE ONLY ehs.vaccination_records FORCE ROW LEVEL SECURITY; END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='audit_logs_pkey' AND conrelid='ehs.audit_logs'::regclass) THEN ALTER TABLE ONLY ehs.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='drill_records_pkey' AND conrelid='ehs.drill_records'::regclass) THEN ALTER TABLE ONLY ehs.drill_records ADD CONSTRAINT drill_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='emergency_plans_pkey' AND conrelid='ehs.emergency_plans'::regclass) THEN ALTER TABLE ONLY ehs.emergency_plans ADD CONSTRAINT emergency_plans_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='environmental_alerts_pkey' AND conrelid='ehs.environmental_alerts'::regclass) THEN ALTER TABLE ONLY ehs.environmental_alerts ADD CONSTRAINT environmental_alerts_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='environmental_data_pkey' AND conrelid='ehs.environmental_data'::regclass) THEN ALTER TABLE ONLY ehs.environmental_data ADD CONSTRAINT environmental_data_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hazard_control_measures_pkey' AND conrelid='ehs.hazard_control_measures'::regclass) THEN ALTER TABLE ONLY ehs.hazard_control_measures ADD CONSTRAINT hazard_control_measures_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hazard_risk_assessments_pkey' AND conrelid='ehs.hazard_risk_assessments'::regclass) THEN ALTER TABLE ONLY ehs.hazard_risk_assessments ADD CONSTRAINT hazard_risk_assessments_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='health_checkups_pkey' AND conrelid='ehs.health_checkups'::regclass) THEN ALTER TABLE ONLY ehs.health_checkups ADD CONSTRAINT health_checkups_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='health_records_pkey' AND conrelid='ehs.health_records'::regclass) THEN ALTER TABLE ONLY ehs.health_records ADD CONSTRAINT health_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='monitoring_points_pkey' AND conrelid='ehs.monitoring_points'::regclass) THEN ALTER TABLE ONLY ehs.monitoring_points ADD CONSTRAINT monitoring_points_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accident_investigations_pkey' AND conrelid='ehs.qa_ehs_accident_investigations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accident_investigations ADD CONSTRAINT qa_ehs_accident_investigations_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accident_reviews_pkey' AND conrelid='ehs.qa_ehs_accident_reviews'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accident_reviews ADD CONSTRAINT qa_ehs_accident_reviews_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accident_treatments_pkey' AND conrelid='ehs.qa_ehs_accident_treatments'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accident_treatments ADD CONSTRAINT qa_ehs_accident_treatments_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accidents_accident_no_key' AND conrelid='ehs.qa_ehs_accidents'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accidents ADD CONSTRAINT qa_ehs_accidents_accident_no_key UNIQUE (accident_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accidents_pkey' AND conrelid='ehs.qa_ehs_accidents'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accidents ADD CONSTRAINT qa_ehs_accidents_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_alerts_pkey' AND conrelid='ehs.qa_ehs_alerts'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_alerts ADD CONSTRAINT qa_ehs_alerts_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_compliance_evaluations_eval_no_key' AND conrelid='ehs.qa_ehs_compliance_evaluations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_compliance_evaluations ADD CONSTRAINT qa_ehs_compliance_evaluations_eval_no_key UNIQUE (eval_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_compliance_evaluations_pkey' AND conrelid='ehs.qa_ehs_compliance_evaluations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_compliance_evaluations ADD CONSTRAINT qa_ehs_compliance_evaluations_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_compliance_items_pkey' AND conrelid='ehs.qa_ehs_compliance_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_compliance_items ADD CONSTRAINT qa_ehs_compliance_items_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_contraindications_pkey' AND conrelid='ehs.qa_ehs_contraindications'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_contraindications ADD CONSTRAINT qa_ehs_contraindications_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_detection_records_pkey' AND conrelid='ehs.qa_ehs_detection_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_detection_records ADD CONSTRAINT qa_ehs_detection_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_detection_records_record_no_key' AND conrelid='ehs.qa_ehs_detection_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_detection_records ADD CONSTRAINT qa_ehs_detection_records_record_no_key UNIQUE (record_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_discharge_permits_permit_no_key' AND conrelid='ehs.qa_ehs_discharge_permits'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_discharge_permits ADD CONSTRAINT qa_ehs_discharge_permits_permit_no_key UNIQUE (permit_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_discharge_permits_pkey' AND conrelid='ehs.qa_ehs_discharge_permits'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_discharge_permits ADD CONSTRAINT qa_ehs_discharge_permits_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_disease_cases_case_no_key' AND conrelid='ehs.qa_ehs_disease_cases'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_disease_cases ADD CONSTRAINT qa_ehs_disease_cases_case_no_key UNIQUE (case_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_disease_cases_pkey' AND conrelid='ehs.qa_ehs_disease_cases'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_disease_cases ADD CONSTRAINT qa_ehs_disease_cases_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_evaluations_pkey' AND conrelid='ehs.qa_ehs_drill_evaluations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_evaluations ADD CONSTRAINT qa_ehs_drill_evaluations_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_plans_pkey' AND conrelid='ehs.qa_ehs_drill_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_plans ADD CONSTRAINT qa_ehs_drill_plans_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_plans_plan_no_key' AND conrelid='ehs.qa_ehs_drill_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_plans ADD CONSTRAINT qa_ehs_drill_plans_plan_no_key UNIQUE (plan_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_problems_pkey' AND conrelid='ehs.qa_ehs_drill_problems'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_problems ADD CONSTRAINT qa_ehs_drill_problems_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_records_pkey' AND conrelid='ehs.qa_ehs_drill_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_records ADD CONSTRAINT qa_ehs_drill_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_records_record_no_key' AND conrelid='ehs.qa_ehs_drill_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_records ADD CONSTRAINT qa_ehs_drill_records_record_no_key UNIQUE (record_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plan_approvals_pkey' AND conrelid='ehs.qa_ehs_emergency_plan_approvals'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plan_approvals ADD CONSTRAINT qa_ehs_emergency_plan_approvals_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plan_supplies_pkey' AND conrelid='ehs.qa_ehs_emergency_plan_supplies'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plan_supplies ADD CONSTRAINT qa_ehs_emergency_plan_supplies_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plan_versions_pkey' AND conrelid='ehs.qa_ehs_emergency_plan_versions'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plan_versions ADD CONSTRAINT qa_ehs_emergency_plan_versions_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plans_pkey' AND conrelid='ehs.qa_ehs_emergency_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plans ADD CONSTRAINT qa_ehs_emergency_plans_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plans_plan_no_key' AND conrelid='ehs.qa_ehs_emergency_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plans ADD CONSTRAINT qa_ehs_emergency_plans_plan_no_key UNIQUE (plan_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_employees_pkey' AND conrelid='ehs.qa_ehs_employees'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_employees ADD CONSTRAINT qa_ehs_employees_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_env_monitor_records_pkey' AND conrelid='ehs.qa_ehs_env_monitor_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_env_monitor_records ADD CONSTRAINT qa_ehs_env_monitor_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_env_monitor_records_record_no_key' AND conrelid='ehs.qa_ehs_env_monitor_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_env_monitor_records ADD CONSTRAINT qa_ehs_env_monitor_records_record_no_key UNIQUE (record_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_environment_incidents_incident_no_key' AND conrelid='ehs.qa_ehs_environment_incidents'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_environment_incidents ADD CONSTRAINT qa_ehs_environment_incidents_incident_no_key UNIQUE (incident_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_environment_incidents_pkey' AND conrelid='ehs.qa_ehs_environment_incidents'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_environment_incidents ADD CONSTRAINT qa_ehs_environment_incidents_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_environment_monitors_pkey' AND conrelid='ehs.qa_ehs_environment_monitors'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_environment_monitors ADD CONSTRAINT qa_ehs_environment_monitors_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_environment_pkey' AND conrelid='ehs.qa_ehs_environment'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_environment ADD CONSTRAINT qa_ehs_environment_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_environment_record_no_key' AND conrelid='ehs.qa_ehs_environment'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_environment ADD CONSTRAINT qa_ehs_environment_record_no_key UNIQUE (record_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_environmental_regulations_pkey' AND conrelid='ehs.qa_ehs_environmental_regulations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_environmental_regulations ADD CONSTRAINT qa_ehs_environmental_regulations_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_environmental_regulations_reg_no_key' AND conrelid='ehs.qa_ehs_environmental_regulations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_environmental_regulations ADD CONSTRAINT qa_ehs_environmental_regulations_reg_no_key UNIQUE (reg_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_hazard_factors_pkey' AND conrelid='ehs.qa_ehs_hazard_factors'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_hazard_factors ADD CONSTRAINT qa_ehs_hazard_factors_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_hazard_rectifications_pkey' AND conrelid='ehs.qa_ehs_hazard_rectifications'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_hazard_rectifications ADD CONSTRAINT qa_ehs_hazard_rectifications_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_hazard_verifications_pkey' AND conrelid='ehs.qa_ehs_hazard_verifications'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_hazard_verifications ADD CONSTRAINT qa_ehs_hazard_verifications_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_hazardous_materials_pkey' AND conrelid='ehs.qa_ehs_hazardous_materials'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_hazardous_materials ADD CONSTRAINT qa_ehs_hazardous_materials_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_hazards_pkey' AND conrelid='ehs.qa_ehs_hazards'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_hazards ADD CONSTRAINT qa_ehs_hazards_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_abnormalities_pkey' AND conrelid='ehs.qa_ehs_health_abnormalities'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_abnormalities ADD CONSTRAINT qa_ehs_health_abnormalities_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_exam_plans_pkey' AND conrelid='ehs.qa_ehs_health_exam_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_exam_plans ADD CONSTRAINT qa_ehs_health_exam_plans_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_exam_plans_plan_no_key' AND conrelid='ehs.qa_ehs_health_exam_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_exam_plans ADD CONSTRAINT qa_ehs_health_exam_plans_plan_no_key UNIQUE (plan_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_exam_records_pkey' AND conrelid='ehs.qa_ehs_health_exam_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_exam_records ADD CONSTRAINT qa_ehs_health_exam_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_exam_records_record_no_key' AND conrelid='ehs.qa_ehs_health_exam_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_exam_records ADD CONSTRAINT qa_ehs_health_exam_records_record_no_key UNIQUE (record_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_trainings_pkey' AND conrelid='ehs.qa_ehs_health_trainings'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_trainings ADD CONSTRAINT qa_ehs_health_trainings_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_trainings_training_no_key' AND conrelid='ehs.qa_ehs_health_trainings'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_trainings ADD CONSTRAINT qa_ehs_health_trainings_training_no_key UNIQUE (training_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_incident_actions_pkey' AND conrelid='ehs.qa_ehs_incident_actions'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_incident_actions ADD CONSTRAINT qa_ehs_incident_actions_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_items_pkey' AND conrelid='ehs.qa_ehs_inspection_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_items ADD CONSTRAINT qa_ehs_inspection_items_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_plans_pkey' AND conrelid='ehs.qa_ehs_inspection_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_plans ADD CONSTRAINT qa_ehs_inspection_plans_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_plans_plan_no_key' AND conrelid='ehs.qa_ehs_inspection_plans'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_plans ADD CONSTRAINT qa_ehs_inspection_plans_plan_no_key UNIQUE (plan_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_record_items_pkey' AND conrelid='ehs.qa_ehs_inspection_record_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_record_items ADD CONSTRAINT qa_ehs_inspection_record_items_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_records_pkey' AND conrelid='ehs.qa_ehs_inspection_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_records ADD CONSTRAINT qa_ehs_inspection_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_records_record_no_key' AND conrelid='ehs.qa_ehs_inspection_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_records ADD CONSTRAINT qa_ehs_inspection_records_record_no_key UNIQUE (record_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_investigations_pkey' AND conrelid='ehs.qa_ehs_investigations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_investigations ADD CONSTRAINT qa_ehs_investigations_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_material_stocks_pkey' AND conrelid='ehs.qa_ehs_material_stocks'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_material_stocks ADD CONSTRAINT qa_ehs_material_stocks_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_msds_pkey' AND conrelid='ehs.qa_ehs_msds'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_msds ADD CONSTRAINT qa_ehs_msds_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_protection_measures_measure_no_key' AND conrelid='ehs.qa_ehs_protection_measures'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_protection_measures ADD CONSTRAINT qa_ehs_protection_measures_measure_no_key UNIQUE (measure_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_protection_measures_pkey' AND conrelid='ehs.qa_ehs_protection_measures'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_protection_measures ADD CONSTRAINT qa_ehs_protection_measures_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_reviews_pkey' AND conrelid='ehs.qa_ehs_reviews'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_reviews ADD CONSTRAINT qa_ehs_reviews_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_risk_controls_measure_no_key' AND conrelid='ehs.qa_ehs_risk_controls'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_risk_controls ADD CONSTRAINT qa_ehs_risk_controls_measure_no_key UNIQUE (measure_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_risk_controls_pkey' AND conrelid='ehs.qa_ehs_risk_controls'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_risk_controls ADD CONSTRAINT qa_ehs_risk_controls_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_risks_pkey' AND conrelid='ehs.qa_ehs_risks'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_risks ADD CONSTRAINT qa_ehs_risks_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_risks_risk_no_key' AND conrelid='ehs.qa_ehs_risks'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_risks ADD CONSTRAINT qa_ehs_risks_risk_no_key UNIQUE (risk_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_stock_records_pkey' AND conrelid='ehs.qa_ehs_stock_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_stock_records ADD CONSTRAINT qa_ehs_stock_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_stock_records_record_no_key' AND conrelid='ehs.qa_ehs_stock_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_stock_records ADD CONSTRAINT qa_ehs_stock_records_record_no_key UNIQUE (record_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_sync_records_pkey' AND conrelid='ehs.qa_ehs_sync_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_sync_records ADD CONSTRAINT qa_ehs_sync_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_sync_records_sync_no_key' AND conrelid='ehs.qa_ehs_sync_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_sync_records ADD CONSTRAINT qa_ehs_sync_records_sync_no_key UNIQUE (sync_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_training_certificates_certificate_no_key' AND conrelid='ehs.qa_ehs_training_certificates'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_training_certificates ADD CONSTRAINT qa_ehs_training_certificates_certificate_no_key UNIQUE (certificate_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_training_certificates_pkey' AND conrelid='ehs.qa_ehs_training_certificates'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_training_certificates ADD CONSTRAINT qa_ehs_training_certificates_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_trainings_pkey' AND conrelid='ehs.qa_ehs_trainings'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_trainings ADD CONSTRAINT qa_ehs_trainings_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_trainings_training_no_key' AND conrelid='ehs.qa_ehs_trainings'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_trainings ADD CONSTRAINT qa_ehs_trainings_training_no_key UNIQUE (training_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_treatment_actions_pkey' AND conrelid='ehs.qa_ehs_treatment_actions'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_treatment_actions ADD CONSTRAINT qa_ehs_treatment_actions_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_treatments_pkey' AND conrelid='ehs.qa_ehs_treatments'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_treatments ADD CONSTRAINT qa_ehs_treatments_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='risk_assessments_pkey' AND conrelid='ehs.risk_assessments'::regclass) THEN ALTER TABLE ONLY ehs.risk_assessments ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='risk_controls_pkey' AND conrelid='ehs.risk_controls'::regclass) THEN ALTER TABLE ONLY ehs.risk_controls ADD CONSTRAINT risk_controls_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='safety_checks_pkey' AND conrelid='ehs.safety_checks'::regclass) THEN ALTER TABLE ONLY ehs.safety_checks ADD CONSTRAINT safety_checks_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='safety_hazards_pkey' AND conrelid='ehs.safety_hazards'::regclass) THEN ALTER TABLE ONLY ehs.safety_hazards ADD CONSTRAINT safety_hazards_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='safety_incidents_pkey' AND conrelid='ehs.safety_incidents'::regclass) THEN ALTER TABLE ONLY ehs.safety_incidents ADD CONSTRAINT safety_incidents_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='schema_defense_ledger_pkey' AND conrelid='ehs.schema_defense_ledger'::regclass) THEN ALTER TABLE ONLY ehs.schema_defense_ledger ADD CONSTRAINT schema_defense_ledger_pkey PRIMARY KEY (service_schema); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='training_programs_pkey' AND conrelid='ehs.training_programs'::regclass) THEN ALTER TABLE ONLY ehs.training_programs ADD CONSTRAINT training_programs_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='training_records_pkey' AND conrelid='ehs.training_records'::regclass) THEN ALTER TABLE ONLY ehs.training_records ADD CONSTRAINT training_records_pkey PRIMARY KEY (id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_qa_ehs_alerts_no' AND conrelid='ehs.qa_ehs_alerts'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_alerts ADD CONSTRAINT uq_qa_ehs_alerts_no UNIQUE (alert_no); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vaccination_records_pkey' AND conrelid='ehs.vaccination_records'::regclass) THEN ALTER TABLE ONLY ehs.vaccination_records ADD CONSTRAINT vaccination_records_pkey PRIMARY KEY (id); END IF; END $$;



CREATE INDEX IF NOT EXISTS idx_hazard_control_measures_hazard_id ON ehs.hazard_control_measures USING btree (hazard_id);



CREATE INDEX IF NOT EXISTS idx_hazard_risk_assessments_hazard_id ON ehs.hazard_risk_assessments USING btree (hazard_id);



CREATE UNIQUE INDEX IF NOT EXISTS idx_health_records_record_no ON ehs.health_records USING btree (record_no) WHERE (record_no IS NOT NULL);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_investigations_accident_id ON ehs.qa_ehs_accident_investigations USING btree (accident_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_reviews_accident_id ON ehs.qa_ehs_accident_reviews USING btree (accident_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_treatments_accident_id ON ehs.qa_ehs_accident_treatments USING btree (accident_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_no ON ehs.qa_ehs_accidents USING btree (accident_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_status ON ehs.qa_ehs_accidents USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_alerts_status ON ehs.qa_ehs_alerts USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_evals_no ON ehs.qa_ehs_compliance_evaluations USING btree (eval_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_evals_status ON ehs.qa_ehs_compliance_evaluations USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_items_evaluation_id ON ehs.qa_ehs_compliance_items USING btree (evaluation_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_items_regulation_id ON ehs.qa_ehs_compliance_items USING btree (regulation_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_contraindications_employee ON ehs.qa_ehs_contraindications USING btree (employee_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_detection_records_factor_id ON ehs.qa_ehs_detection_records USING btree (factor_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_detection_records_no ON ehs.qa_ehs_detection_records USING btree (record_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_discharge_permits_no ON ehs.qa_ehs_discharge_permits USING btree (permit_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_discharge_permits_status ON ehs.qa_ehs_discharge_permits USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_disease_cases_no ON ehs.qa_ehs_disease_cases USING btree (case_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_disease_cases_status ON ehs.qa_ehs_disease_cases USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_evaluations_drill_id ON ehs.qa_ehs_drill_evaluations USING btree (drill_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_plans_no ON ehs.qa_ehs_drill_plans USING btree (plan_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_plans_status ON ehs.qa_ehs_drill_plans USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_problems_drill_id ON ehs.qa_ehs_drill_problems USING btree (drill_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_no ON ehs.qa_ehs_drill_records USING btree (record_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_plan_id ON ehs.qa_ehs_drill_records USING btree (plan_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_status ON ehs.qa_ehs_drill_records USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_approvals_plan_id ON ehs.qa_ehs_emergency_plan_approvals USING btree (plan_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_supplies_plan_id ON ehs.qa_ehs_emergency_plan_supplies USING btree (plan_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_versions_plan_id ON ehs.qa_ehs_emergency_plan_versions USING btree (plan_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_category ON ehs.qa_ehs_emergency_plans USING btree (category);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_no ON ehs.qa_ehs_emergency_plans USING btree (plan_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_status ON ehs.qa_ehs_emergency_plans USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_employees_dept ON ehs.qa_ehs_employees USING btree (department_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_employees_name ON ehs.qa_ehs_employees USING btree (name);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_incidents_no ON ehs.qa_ehs_environment_incidents USING btree (incident_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_incidents_status ON ehs.qa_ehs_environment_incidents USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_monitor_no ON ehs.qa_ehs_env_monitor_records USING btree (record_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_monitor_type ON ehs.qa_ehs_env_monitor_records USING btree (monitor_type);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_category ON ehs.qa_ehs_environmental_regulations USING btree (category);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_no ON ehs.qa_ehs_environmental_regulations USING btree (reg_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_status ON ehs.qa_ehs_environmental_regulations USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_factors_no ON ehs.qa_ehs_hazard_factors USING btree (factor_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_factors_type ON ehs.qa_ehs_hazard_factors USING btree (factor_type);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_rectifications_hazard_id ON ehs.qa_ehs_hazard_rectifications USING btree (hazard_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_verifications_hazard_id ON ehs.qa_ehs_hazard_verifications USING btree (hazard_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_category ON ehs.qa_ehs_hazardous_materials USING btree (category);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_no ON ehs.qa_ehs_hazardous_materials USING btree (material_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_status ON ehs.qa_ehs_hazardous_materials USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_no ON ehs.qa_ehs_hazards USING btree (hazard_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_status ON ehs.qa_ehs_hazards USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_abnormalities_record_id ON ehs.qa_ehs_health_abnormalities USING btree (record_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_plans_no ON ehs.qa_ehs_health_exam_plans USING btree (plan_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_plans_status ON ehs.qa_ehs_health_exam_plans USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_employee ON ehs.qa_ehs_health_exam_records USING btree (employee_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_no ON ehs.qa_ehs_health_exam_records USING btree (record_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_plan_id ON ehs.qa_ehs_health_exam_records USING btree (plan_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_items_plan_id ON ehs.qa_ehs_inspection_items USING btree (plan_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_item_id ON ehs.qa_ehs_inspection_record_items USING btree (item_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_record_id ON ehs.qa_ehs_inspection_record_items USING btree (record_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_records_plan_id ON ehs.qa_ehs_inspection_records USING btree (plan_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_material_stocks_material_id ON ehs.qa_ehs_material_stocks USING btree (material_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_msds_material_id ON ehs.qa_ehs_msds USING btree (material_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_plans_no ON ehs.qa_ehs_inspection_plans USING btree (plan_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_records_no ON ehs.qa_ehs_inspection_records USING btree (record_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_risks_no ON ehs.qa_ehs_risks USING btree (risk_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_material_id ON ehs.qa_ehs_stock_records USING btree (material_id);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_no ON ehs.qa_ehs_stock_records USING btree (record_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_type ON ehs.qa_ehs_stock_records USING btree (record_type);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_no ON ehs.qa_ehs_sync_records USING btree (sync_no);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_status ON ehs.qa_ehs_sync_records USING btree (status);



CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_type ON ehs.qa_ehs_sync_records USING btree (sync_type);



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hazard_control_measures_hazard_id_fkey' AND conrelid='ehs.hazard_control_measures'::regclass) THEN ALTER TABLE ONLY ehs.hazard_control_measures ADD CONSTRAINT hazard_control_measures_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hazard_risk_assessments_hazard_id_fkey' AND conrelid='ehs.hazard_risk_assessments'::regclass) THEN ALTER TABLE ONLY ehs.hazard_risk_assessments ADD CONSTRAINT hazard_risk_assessments_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accident_investigations_accident_id_fkey' AND conrelid='ehs.qa_ehs_accident_investigations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accident_investigations ADD CONSTRAINT qa_ehs_accident_investigations_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES ehs.qa_ehs_accidents(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accident_reviews_accident_id_fkey' AND conrelid='ehs.qa_ehs_accident_reviews'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accident_reviews ADD CONSTRAINT qa_ehs_accident_reviews_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES ehs.qa_ehs_accidents(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_accident_treatments_accident_id_fkey' AND conrelid='ehs.qa_ehs_accident_treatments'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_accident_treatments ADD CONSTRAINT qa_ehs_accident_treatments_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES ehs.qa_ehs_accidents(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_compliance_items_evaluation_id_fkey' AND conrelid='ehs.qa_ehs_compliance_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_compliance_items ADD CONSTRAINT qa_ehs_compliance_items_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES ehs.qa_ehs_compliance_evaluations(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_compliance_items_regulation_id_fkey' AND conrelid='ehs.qa_ehs_compliance_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_compliance_items ADD CONSTRAINT qa_ehs_compliance_items_regulation_id_fkey FOREIGN KEY (regulation_id) REFERENCES ehs.qa_ehs_environmental_regulations(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_detection_records_factor_id_fkey' AND conrelid='ehs.qa_ehs_detection_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_detection_records ADD CONSTRAINT qa_ehs_detection_records_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES ehs.qa_ehs_hazard_factors(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_evaluations_drill_id_fkey' AND conrelid='ehs.qa_ehs_drill_evaluations'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_evaluations ADD CONSTRAINT qa_ehs_drill_evaluations_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_problems_drill_id_fkey' AND conrelid='ehs.qa_ehs_drill_problems'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_problems ADD CONSTRAINT qa_ehs_drill_problems_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_drill_records_plan_id_fkey' AND conrelid='ehs.qa_ehs_drill_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_drill_records ADD CONSTRAINT qa_ehs_drill_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_drill_plans(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plan_approvals_plan_id_fkey' AND conrelid='ehs.qa_ehs_emergency_plan_approvals'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plan_approvals ADD CONSTRAINT qa_ehs_emergency_plan_approvals_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plan_supplies_plan_id_fkey' AND conrelid='ehs.qa_ehs_emergency_plan_supplies'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plan_supplies ADD CONSTRAINT qa_ehs_emergency_plan_supplies_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_emergency_plan_versions_plan_id_fkey' AND conrelid='ehs.qa_ehs_emergency_plan_versions'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_emergency_plan_versions ADD CONSTRAINT qa_ehs_emergency_plan_versions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_hazard_rectifications_hazard_id_fkey' AND conrelid='ehs.qa_ehs_hazard_rectifications'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_hazard_rectifications ADD CONSTRAINT qa_ehs_hazard_rectifications_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_hazard_verifications_hazard_id_fkey' AND conrelid='ehs.qa_ehs_hazard_verifications'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_hazard_verifications ADD CONSTRAINT qa_ehs_hazard_verifications_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_abnormalities_record_id_fkey' AND conrelid='ehs.qa_ehs_health_abnormalities'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_abnormalities ADD CONSTRAINT qa_ehs_health_abnormalities_record_id_fkey FOREIGN KEY (record_id) REFERENCES ehs.qa_ehs_health_exam_records(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_health_exam_records_plan_id_fkey' AND conrelid='ehs.qa_ehs_health_exam_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_health_exam_records ADD CONSTRAINT qa_ehs_health_exam_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_health_exam_plans(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_items_plan_id_fkey' AND conrelid='ehs.qa_ehs_inspection_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_items ADD CONSTRAINT qa_ehs_inspection_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_inspection_plans(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_record_items_item_id_fkey' AND conrelid='ehs.qa_ehs_inspection_record_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_record_items ADD CONSTRAINT qa_ehs_inspection_record_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES ehs.qa_ehs_inspection_items(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_record_items_record_id_fkey' AND conrelid='ehs.qa_ehs_inspection_record_items'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_record_items ADD CONSTRAINT qa_ehs_inspection_record_items_record_id_fkey FOREIGN KEY (record_id) REFERENCES ehs.qa_ehs_inspection_records(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_inspection_records_plan_id_fkey' AND conrelid='ehs.qa_ehs_inspection_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_inspection_records ADD CONSTRAINT qa_ehs_inspection_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_inspection_plans(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_material_stocks_material_id_fkey' AND conrelid='ehs.qa_ehs_material_stocks'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_material_stocks ADD CONSTRAINT qa_ehs_material_stocks_material_id_fkey FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_msds_material_id_fkey' AND conrelid='ehs.qa_ehs_msds'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_msds ADD CONSTRAINT qa_ehs_msds_material_id_fkey FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id); END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='qa_ehs_stock_records_material_id_fkey' AND conrelid='ehs.qa_ehs_stock_records'::regclass) THEN ALTER TABLE ONLY ehs.qa_ehs_stock_records ADD CONSTRAINT qa_ehs_stock_records_material_id_fkey FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id); END IF; END $$;



ALTER TABLE ehs.audit_logs ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.drill_records ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='audit_logs' AND policyname='ehs_allow_all_audit_logs') IS NULL THEN CREATE POLICY ehs_allow_all_audit_logs ON ehs.audit_logs USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='drill_records' AND policyname='ehs_allow_all_drill_records') IS NULL THEN CREATE POLICY ehs_allow_all_drill_records ON ehs.drill_records USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='emergency_plans' AND policyname='ehs_allow_all_emergency_plans') IS NULL THEN CREATE POLICY ehs_allow_all_emergency_plans ON ehs.emergency_plans USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='environmental_alerts' AND policyname='ehs_allow_all_environmental_alerts') IS NULL THEN CREATE POLICY ehs_allow_all_environmental_alerts ON ehs.environmental_alerts USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='environmental_data' AND policyname='ehs_allow_all_environmental_data') IS NULL THEN CREATE POLICY ehs_allow_all_environmental_data ON ehs.environmental_data USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='health_checkups' AND policyname='ehs_allow_all_health_checkups') IS NULL THEN CREATE POLICY ehs_allow_all_health_checkups ON ehs.health_checkups USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='health_records' AND policyname='ehs_allow_all_health_records') IS NULL THEN CREATE POLICY ehs_allow_all_health_records ON ehs.health_records USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='monitoring_points' AND policyname='ehs_allow_all_monitoring_points') IS NULL THEN CREATE POLICY ehs_allow_all_monitoring_points ON ehs.monitoring_points USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_employees' AND policyname='ehs_allow_all_qa_ehs_employees') IS NULL THEN CREATE POLICY ehs_allow_all_qa_ehs_employees ON ehs.qa_ehs_employees USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='risk_assessments' AND policyname='ehs_allow_all_risk_assessments') IS NULL THEN CREATE POLICY ehs_allow_all_risk_assessments ON ehs.risk_assessments USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='risk_controls' AND policyname='ehs_allow_all_risk_controls') IS NULL THEN CREATE POLICY ehs_allow_all_risk_controls ON ehs.risk_controls USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='safety_checks' AND policyname='ehs_allow_all_safety_checks') IS NULL THEN CREATE POLICY ehs_allow_all_safety_checks ON ehs.safety_checks USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='safety_hazards' AND policyname='ehs_allow_all_safety_hazards') IS NULL THEN CREATE POLICY ehs_allow_all_safety_hazards ON ehs.safety_hazards USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='safety_incidents' AND policyname='ehs_allow_all_safety_incidents') IS NULL THEN CREATE POLICY ehs_allow_all_safety_incidents ON ehs.safety_incidents USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='training_programs' AND policyname='ehs_allow_all_training_programs') IS NULL THEN CREATE POLICY ehs_allow_all_training_programs ON ehs.training_programs USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='training_records' AND policyname='ehs_allow_all_training_records') IS NULL THEN CREATE POLICY ehs_allow_all_training_records ON ehs.training_records USING (true) WITH CHECK (true); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='vaccination_records' AND policyname='ehs_allow_all_vaccination_records') IS NULL THEN CREATE POLICY ehs_allow_all_vaccination_records ON ehs.vaccination_records USING (true) WITH CHECK (true); END IF; END $$;



ALTER TABLE ehs.emergency_plans ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.environmental_alerts ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.environmental_data ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.hazard_control_measures ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.hazard_risk_assessments ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.health_checkups ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.health_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.monitoring_points ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_accidents ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_accidents' AND policyname='qa_ehs_accidents_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_accidents' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_accidents_tenant_policy ON ehs.qa_ehs_accidents USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.qa_ehs_alerts ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_compliance_evaluations ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_discharge_permits ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_disease_cases ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_drill_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_employees ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_environmental_regulations ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_hazard_factors ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_hazardous_materials ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_hazards ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_incident_actions ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_incident_actions' AND policyname='qa_ehs_incident_actions_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_incident_actions' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_incident_actions_tenant_policy ON ehs.qa_ehs_incident_actions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.qa_ehs_inspection_plans ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_inspection_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_investigations ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_investigations' AND policyname='qa_ehs_investigations_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_investigations' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_investigations_tenant_policy ON ehs.qa_ehs_investigations USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.qa_ehs_msds ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_reviews ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_reviews' AND policyname='qa_ehs_reviews_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_reviews' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_reviews_tenant_policy ON ehs.qa_ehs_reviews USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.qa_ehs_risk_controls ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_risk_controls' AND policyname='qa_ehs_risk_controls_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_risk_controls' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_risk_controls_tenant_policy ON ehs.qa_ehs_risk_controls USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.qa_ehs_risks ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.qa_ehs_training_certificates ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_training_certificates' AND policyname='qa_ehs_training_certificates_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_training_certificates' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_training_certificates_tenant_policy ON ehs.qa_ehs_training_certificates USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.qa_ehs_treatment_actions ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_treatment_actions' AND policyname='qa_ehs_treatment_actions_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_treatment_actions' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_treatment_actions_tenant_policy ON ehs.qa_ehs_treatment_actions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.qa_ehs_treatments ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_treatments' AND policyname='qa_ehs_treatments_tenant_policy') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_treatments' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY qa_ehs_treatments_tenant_policy ON ehs.qa_ehs_treatments USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.risk_assessments ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.risk_controls ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_alerts' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_alerts' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_alerts USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_compliance_evaluations' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_compliance_evaluations' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_compliance_evaluations USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_discharge_permits' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_discharge_permits' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_discharge_permits USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_disease_cases' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_disease_cases' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_disease_cases USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_drill_records' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_drill_records' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_drill_records USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_environmental_regulations' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_environmental_regulations' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_environmental_regulations USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_hazard_factors' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_hazard_factors' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_hazard_factors USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_hazardous_materials' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_hazardous_materials' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_hazardous_materials USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_hazards' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_hazards' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_hazards USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_inspection_plans' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_inspection_plans' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_inspection_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_inspection_records' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_inspection_records' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_inspection_records USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_msds' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_msds' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_msds USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_risks' AND policyname='rls_tenant_isolation') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_risks' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_risks USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))); END IF; END $$;



ALTER TABLE ehs.safety_checks ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.safety_hazards ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.safety_incidents ENABLE ROW LEVEL SECURITY;


DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='hazard_control_measures' AND policyname='tenant_isolation_hazard_control_measures') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='hazard_control_measures' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY tenant_isolation_hazard_control_measures ON ehs.hazard_control_measures USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))); END IF; END $$;



DO $$ BEGIN IF (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='hazard_risk_assessments' AND policyname='tenant_isolation_hazard_risk_assessments') IS NULL AND (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='hazard_risk_assessments' AND column_name='tenant_id') IS NOT NULL THEN CREATE POLICY tenant_isolation_hazard_risk_assessments ON ehs.hazard_risk_assessments USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))); END IF; END $$;



ALTER TABLE ehs.training_programs ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.training_records ENABLE ROW LEVEL SECURITY;


ALTER TABLE ehs.vaccination_records ENABLE ROW LEVEL SECURITY;



