-- 20261120190000: ehs 33 张运行期表收口（W2-D2 第八个模块）
--
-- 背景：svc/ehs/src/models/mod.rs 与 svc/ehs/src/schema_defense.rs 各有一份
-- TABLE_DEFS（43 表 / 581 列），启动时由 schema_defense 建表并逐列补列。
-- 其中 10 张表已被 20261119110000_drop_dead_tables_batch2 作为死表删除：
--   qa_ehs_accident_investigations/reviews/treatments、qa_ehs_compliance_items、
--   qa_ehs_detection_records、qa_ehs_environment、qa_ehs_health_abnormalities、
--   qa_ehs_health_trainings、qa_ehs_material_stocks、qa_ehs_protection_measures。
-- 本迁移只固化仍在 live 的 33 张表，删除运行期 TABLE_DEFS 后这 10 张不会复活。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

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
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

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
    non_complianceitems jsonb DEFAULT '[]'::jsonb,
    corrective_actions text,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_contraindications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(64) NOT NULL,
    department character varying(128),
    position character varying(128),
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
    tenant_id uuid
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
    permit_category character varying(64),
    discharge_limits jsonb DEFAULT '[]'::jsonb,
    monitoring_requirements text,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_disease_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_no character varying(64) NOT NULL,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(64) NOT NULL,
    department character varying(128),
    position character varying(128),
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
    gender character varying(16),
    age integer,
    hazard_factor character varying(128),
    work_related boolean DEFAULT false NOT NULL,
    attachments jsonb,
    reported_at timestamp with time zone,
    tenant_id uuid
);

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
    tenant_id uuid
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
    tenant_id uuid
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
    tenant_id uuid
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
    tenant_id uuid
);

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
    tenant_id uuid
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
    tenant_id uuid
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
    tenant_id uuid
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
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_no character varying(64),
    name character varying(128) NOT NULL,
    email text,
    department_id uuid,
    department_name character varying(128),
    position character varying(128),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
);

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
    tenant_id uuid
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
    tenant_id uuid
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
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazard_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    factor_no character varying(64),
    name character varying(256) NOT NULL,
    name_en character varying(256),
    factor_type character varying(64),
    category character varying(64),
    description text,
    hazard_level character varying(32),
    exposure_limit character varying(128),
    unit character varying(32),
    sources text,
    affected_positions text,
    affected_count integer DEFAULT 0,
    status character varying(32) DEFAULT 'active'::character varying,
    remarks text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

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
    tenant_id uuid
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
    tenant_id uuid
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
    storage_condition text,
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
    handling_requirements text
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hazard_no character varying(64),
    title character varying(256) NOT NULL,
    title_en character varying(256),
    description text,
    category character varying(64),
    level character varying(32),
    source character varying(128),
    location character varying(256),
    reported_by character varying(128),
    reported_at timestamp with time zone,
    status character varying(32) DEFAULT 'active'::character varying,
    inspection_id uuid,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    assessments jsonb,
    controls jsonb
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
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_health_exam_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_no character varying(64) NOT NULL,
    plan_id uuid,
    employee_id character varying(64) NOT NULL,
    employee_name character varying(64) NOT NULL,
    department character varying(128),
    position character varying(128),
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
    tenant_id uuid
);

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
    tenant_id uuid
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
    check_no character varying(64)
);

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
    tenant_id uuid
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
    check_no character varying(64)
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
    product_name character varying(256),
    manufacturer character varying(256),
    emergency_phone character varying(64),
    tenant_id uuid,
    hazard_no character varying(64)
);

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
    tenant_id uuid,
    location text,
    department_id uuid,
    mitigation jsonb,
    created_by uuid
);

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
    tenant_id uuid
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
    tenant_id uuid
);

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
    tenant_id uuid,
    program_no character varying(64),
    program_id uuid
);

CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_no ON ehs.qa_ehs_accidents USING btree (accident_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_status ON ehs.qa_ehs_accidents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_evals_no ON ehs.qa_ehs_compliance_evaluations USING btree (eval_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_evals_status ON ehs.qa_ehs_compliance_evaluations USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_contraindications_employee ON ehs.qa_ehs_contraindications USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_discharge_permits_no ON ehs.qa_ehs_discharge_permits USING btree (permit_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_discharge_permits_status ON ehs.qa_ehs_discharge_permits USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_disease_cases_no ON ehs.qa_ehs_disease_cases USING btree (case_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_disease_cases_status ON ehs.qa_ehs_disease_cases USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_evaluations_drill_id ON ehs.qa_ehs_drill_evaluations USING btree (drill_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_plans_no ON ehs.qa_ehs_drill_plans USING btree (plan_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_plans_status ON ehs.qa_ehs_drill_plans USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_problems_drill_id ON ehs.qa_ehs_drill_problems USING btree (drill_id);
CREATE INDEX IF NOT EXISTS qa_ehs_drill_problems_drill_id_idx ON ehs.qa_ehs_drill_problems USING btree (drill_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_no ON ehs.qa_ehs_drill_records USING btree (record_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_plan_id ON ehs.qa_ehs_drill_records USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_status ON ehs.qa_ehs_drill_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_approvals_plan_id ON ehs.qa_ehs_emergency_plan_approvals USING btree (plan_id);
CREATE INDEX IF NOT EXISTS qa_ehs_emergency_plan_approvals_plan_id_idx ON ehs.qa_ehs_emergency_plan_approvals USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_supplies_plan_id ON ehs.qa_ehs_emergency_plan_supplies USING btree (plan_id);
CREATE INDEX IF NOT EXISTS qa_ehs_emergency_plan_supplies_plan_id_idx ON ehs.qa_ehs_emergency_plan_supplies USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_versions_plan_id ON ehs.qa_ehs_emergency_plan_versions USING btree (plan_id);
CREATE INDEX IF NOT EXISTS qa_ehs_emergency_plan_versions_plan_id_idx ON ehs.qa_ehs_emergency_plan_versions USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_category ON ehs.qa_ehs_emergency_plans USING btree (category);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_no ON ehs.qa_ehs_emergency_plans USING btree (plan_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_status ON ehs.qa_ehs_emergency_plans USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_employees_dept ON ehs.qa_ehs_employees USING btree (department_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_employees_name ON ehs.qa_ehs_employees USING btree (name);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_monitor_no ON ehs.qa_ehs_env_monitor_records USING btree (record_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_monitor_type ON ehs.qa_ehs_env_monitor_records USING btree (monitor_type);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_incidents_no ON ehs.qa_ehs_environment_incidents USING btree (incident_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_incidents_status ON ehs.qa_ehs_environment_incidents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_category ON ehs.qa_ehs_environmental_regulations USING btree (category);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_no ON ehs.qa_ehs_environmental_regulations USING btree (reg_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_status ON ehs.qa_ehs_environmental_regulations USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_factors_no ON ehs.qa_ehs_hazard_factors USING btree (factor_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_factors_type ON ehs.qa_ehs_hazard_factors USING btree (factor_type);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_rectifications_hazard_id ON ehs.qa_ehs_hazard_rectifications USING btree (hazard_id);
CREATE INDEX IF NOT EXISTS qa_ehs_hazard_rectifications_hazard_id_idx ON ehs.qa_ehs_hazard_rectifications USING btree (hazard_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_verifications_hazard_id ON ehs.qa_ehs_hazard_verifications USING btree (hazard_id);
CREATE INDEX IF NOT EXISTS qa_ehs_hazard_verifications_hazard_id_idx ON ehs.qa_ehs_hazard_verifications USING btree (hazard_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_category ON ehs.qa_ehs_hazardous_materials USING btree (category);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_no ON ehs.qa_ehs_hazardous_materials USING btree (material_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_status ON ehs.qa_ehs_hazardous_materials USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_no ON ehs.qa_ehs_hazards USING btree (hazard_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_status ON ehs.qa_ehs_hazards USING btree (status);
CREATE INDEX IF NOT EXISTS qa_ehs_hazards_inspection_id_idx ON ehs.qa_ehs_hazards USING btree (inspection_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_plans_no ON ehs.qa_ehs_health_exam_plans USING btree (plan_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_plans_status ON ehs.qa_ehs_health_exam_plans USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_employee ON ehs.qa_ehs_health_exam_records USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_no ON ehs.qa_ehs_health_exam_records USING btree (record_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_plan_id ON ehs.qa_ehs_health_exam_records USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_items_plan_id ON ehs.qa_ehs_inspection_items USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_plans_no ON ehs.qa_ehs_inspection_plans USING btree (plan_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_item_id ON ehs.qa_ehs_inspection_record_items USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_record_id ON ehs.qa_ehs_inspection_record_items USING btree (record_id);
CREATE INDEX IF NOT EXISTS qa_ehs_inspection_record_items_item_id_idx ON ehs.qa_ehs_inspection_record_items USING btree (item_id);
CREATE INDEX IF NOT EXISTS qa_ehs_inspection_record_items_record_id_idx ON ehs.qa_ehs_inspection_record_items USING btree (record_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_records_plan_id ON ehs.qa_ehs_inspection_records USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_records_no ON ehs.qa_ehs_inspection_records USING btree (record_no);
CREATE INDEX IF NOT EXISTS qa_ehs_inspection_records_plan_id_idx ON ehs.qa_ehs_inspection_records USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_msds_material_id ON ehs.qa_ehs_msds USING btree (material_id);
CREATE INDEX IF NOT EXISTS qa_ehs_msds_material_id_idx ON ehs.qa_ehs_msds USING btree (material_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_risks_no ON ehs.qa_ehs_risks USING btree (risk_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_material_id ON ehs.qa_ehs_stock_records USING btree (material_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_no ON ehs.qa_ehs_stock_records USING btree (record_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_type ON ehs.qa_ehs_stock_records USING btree (record_type);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_no ON ehs.qa_ehs_sync_records USING btree (sync_no);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_status ON ehs.qa_ehs_sync_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_type ON ehs.qa_ehs_sync_records USING btree (sync_type);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_accidents'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_accidents ADD CONSTRAINT "qa_ehs_accidents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_compliance_evaluations'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_compliance_evaluations ADD CONSTRAINT "qa_ehs_compliance_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_contraindications'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_contraindications ADD CONSTRAINT "qa_ehs_contraindications_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_discharge_permits'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_discharge_permits ADD CONSTRAINT "qa_ehs_discharge_permits_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_disease_cases'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_disease_cases ADD CONSTRAINT "qa_ehs_disease_cases_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_evaluations'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_drill_evaluations ADD CONSTRAINT "qa_ehs_drill_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_plans'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_drill_plans ADD CONSTRAINT "qa_ehs_drill_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_problems'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_drill_problems ADD CONSTRAINT "qa_ehs_drill_problems_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_records'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_drill_records ADD CONSTRAINT "qa_ehs_drill_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plan_approvals'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plan_approvals ADD CONSTRAINT "qa_ehs_emergency_plan_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plan_supplies'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plan_supplies ADD CONSTRAINT "qa_ehs_emergency_plan_supplies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plan_versions'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plan_versions ADD CONSTRAINT "qa_ehs_emergency_plan_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plans'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plans ADD CONSTRAINT "qa_ehs_emergency_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_employees'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_employees ADD CONSTRAINT "qa_ehs_employees_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_env_monitor_records'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_env_monitor_records ADD CONSTRAINT "qa_ehs_env_monitor_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_environment_incidents'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_environment_incidents ADD CONSTRAINT "qa_ehs_environment_incidents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_environmental_regulations'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_environmental_regulations ADD CONSTRAINT "qa_ehs_environmental_regulations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazard_factors'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_hazard_factors ADD CONSTRAINT "qa_ehs_hazard_factors_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazard_rectifications'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_hazard_rectifications ADD CONSTRAINT "qa_ehs_hazard_rectifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazard_verifications'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_hazard_verifications ADD CONSTRAINT "qa_ehs_hazard_verifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazardous_materials'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_hazardous_materials ADD CONSTRAINT "qa_ehs_hazardous_materials_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazards'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_hazards ADD CONSTRAINT "qa_ehs_hazards_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_health_exam_plans'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_health_exam_plans ADD CONSTRAINT "qa_ehs_health_exam_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_health_exam_records'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_health_exam_records ADD CONSTRAINT "qa_ehs_health_exam_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_items'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_inspection_items ADD CONSTRAINT "qa_ehs_inspection_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_plans'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_inspection_plans ADD CONSTRAINT "qa_ehs_inspection_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_record_items'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_inspection_record_items ADD CONSTRAINT "qa_ehs_inspection_record_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_records'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_inspection_records ADD CONSTRAINT "qa_ehs_inspection_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_msds'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_msds ADD CONSTRAINT "qa_ehs_msds_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_risks'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_risks ADD CONSTRAINT "qa_ehs_risks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_stock_records'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_stock_records ADD CONSTRAINT "qa_ehs_stock_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_sync_records'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_sync_records ADD CONSTRAINT "qa_ehs_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_trainings'::regclass AND contype='p') THEN
        ALTER TABLE ehs.qa_ehs_trainings ADD CONSTRAINT "qa_ehs_trainings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_accidents'::regclass AND conname='qa_ehs_accidents_accident_no_key') THEN
        ALTER TABLE ehs.qa_ehs_accidents ADD CONSTRAINT "qa_ehs_accidents_accident_no_key" UNIQUE (accident_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_compliance_evaluations'::regclass AND conname='qa_ehs_compliance_evaluations_eval_no_key') THEN
        ALTER TABLE ehs.qa_ehs_compliance_evaluations ADD CONSTRAINT "qa_ehs_compliance_evaluations_eval_no_key" UNIQUE (eval_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_discharge_permits'::regclass AND conname='qa_ehs_discharge_permits_permit_no_key') THEN
        ALTER TABLE ehs.qa_ehs_discharge_permits ADD CONSTRAINT "qa_ehs_discharge_permits_permit_no_key" UNIQUE (permit_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_disease_cases'::regclass AND conname='qa_ehs_disease_cases_case_no_key') THEN
        ALTER TABLE ehs.qa_ehs_disease_cases ADD CONSTRAINT "qa_ehs_disease_cases_case_no_key" UNIQUE (case_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_plans'::regclass AND conname='qa_ehs_drill_plans_plan_no_key') THEN
        ALTER TABLE ehs.qa_ehs_drill_plans ADD CONSTRAINT "qa_ehs_drill_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_records'::regclass AND conname='qa_ehs_drill_records_record_no_key') THEN
        ALTER TABLE ehs.qa_ehs_drill_records ADD CONSTRAINT "qa_ehs_drill_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plans'::regclass AND conname='qa_ehs_emergency_plans_plan_no_key') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plans ADD CONSTRAINT "qa_ehs_emergency_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_env_monitor_records'::regclass AND conname='qa_ehs_env_monitor_records_record_no_key') THEN
        ALTER TABLE ehs.qa_ehs_env_monitor_records ADD CONSTRAINT "qa_ehs_env_monitor_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_environment_incidents'::regclass AND conname='qa_ehs_environment_incidents_incident_no_key') THEN
        ALTER TABLE ehs.qa_ehs_environment_incidents ADD CONSTRAINT "qa_ehs_environment_incidents_incident_no_key" UNIQUE (incident_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_environmental_regulations'::regclass AND conname='qa_ehs_environmental_regulations_reg_no_key') THEN
        ALTER TABLE ehs.qa_ehs_environmental_regulations ADD CONSTRAINT "qa_ehs_environmental_regulations_reg_no_key" UNIQUE (reg_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazard_factors'::regclass AND conname='qa_ehs_hazard_factors_factor_no_key') THEN
        ALTER TABLE ehs.qa_ehs_hazard_factors ADD CONSTRAINT "qa_ehs_hazard_factors_factor_no_key" UNIQUE (factor_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazardous_materials'::regclass AND conname='qa_ehs_hazardous_materials_material_no_key') THEN
        ALTER TABLE ehs.qa_ehs_hazardous_materials ADD CONSTRAINT "qa_ehs_hazardous_materials_material_no_key" UNIQUE (material_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazards'::regclass AND conname='qa_ehs_hazards_hazard_no_key') THEN
        ALTER TABLE ehs.qa_ehs_hazards ADD CONSTRAINT "qa_ehs_hazards_hazard_no_key" UNIQUE (hazard_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_health_exam_plans'::regclass AND conname='qa_ehs_health_exam_plans_plan_no_key') THEN
        ALTER TABLE ehs.qa_ehs_health_exam_plans ADD CONSTRAINT "qa_ehs_health_exam_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_health_exam_records'::regclass AND conname='qa_ehs_health_exam_records_record_no_key') THEN
        ALTER TABLE ehs.qa_ehs_health_exam_records ADD CONSTRAINT "qa_ehs_health_exam_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_plans'::regclass AND conname='qa_ehs_inspection_plans_plan_no_key') THEN
        ALTER TABLE ehs.qa_ehs_inspection_plans ADD CONSTRAINT "qa_ehs_inspection_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_records'::regclass AND conname='qa_ehs_inspection_records_record_no_key') THEN
        ALTER TABLE ehs.qa_ehs_inspection_records ADD CONSTRAINT "qa_ehs_inspection_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_risks'::regclass AND conname='qa_ehs_risks_risk_no_key') THEN
        ALTER TABLE ehs.qa_ehs_risks ADD CONSTRAINT "qa_ehs_risks_risk_no_key" UNIQUE (risk_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_stock_records'::regclass AND conname='qa_ehs_stock_records_record_no_key') THEN
        ALTER TABLE ehs.qa_ehs_stock_records ADD CONSTRAINT "qa_ehs_stock_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_sync_records'::regclass AND conname='qa_ehs_sync_records_sync_no_key') THEN
        ALTER TABLE ehs.qa_ehs_sync_records ADD CONSTRAINT "qa_ehs_sync_records_sync_no_key" UNIQUE (sync_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_trainings'::regclass AND conname='qa_ehs_trainings_training_no_key') THEN
        ALTER TABLE ehs.qa_ehs_trainings ADD CONSTRAINT "qa_ehs_trainings_training_no_key" UNIQUE (training_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_disease_cases'::regclass AND conname='ck_qa_ehs_disease_cases_status_standard') THEN
        ALTER TABLE ehs.qa_ehs_disease_cases ADD CONSTRAINT "ck_qa_ehs_disease_cases_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,suspected}'::text[]))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_environmental_regulations'::regclass AND conname='ck_qa_ehs_environmental_regulations_status_standard') THEN
        ALTER TABLE ehs.qa_ehs_environmental_regulations ADD CONSTRAINT "ck_qa_ehs_environmental_regulations_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,draft}'::text[]))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_evaluations'::regclass AND conname='qa_ehs_drill_evaluations_drill_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_drill_evaluations ADD CONSTRAINT "qa_ehs_drill_evaluations_drill_id_fkey" FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_problems'::regclass AND conname='qa_ehs_drill_problems_drill_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_drill_problems ADD CONSTRAINT "qa_ehs_drill_problems_drill_id_fkey" FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_drill_records'::regclass AND conname='qa_ehs_drill_records_plan_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_drill_records ADD CONSTRAINT "qa_ehs_drill_records_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_drill_plans(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plan_approvals'::regclass AND conname='qa_ehs_emergency_plan_approvals_plan_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plan_approvals ADD CONSTRAINT "qa_ehs_emergency_plan_approvals_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plan_supplies'::regclass AND conname='qa_ehs_emergency_plan_supplies_plan_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plan_supplies ADD CONSTRAINT "qa_ehs_emergency_plan_supplies_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_emergency_plan_versions'::regclass AND conname='qa_ehs_emergency_plan_versions_plan_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_emergency_plan_versions ADD CONSTRAINT "qa_ehs_emergency_plan_versions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_emergency_plans(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazard_rectifications'::regclass AND conname='qa_ehs_hazard_rectifications_hazard_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_hazard_rectifications ADD CONSTRAINT "qa_ehs_hazard_rectifications_hazard_id_fkey" FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_hazard_verifications'::regclass AND conname='qa_ehs_hazard_verifications_hazard_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_hazard_verifications ADD CONSTRAINT "qa_ehs_hazard_verifications_hazard_id_fkey" FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_health_exam_records'::regclass AND conname='qa_ehs_health_exam_records_plan_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_health_exam_records ADD CONSTRAINT "qa_ehs_health_exam_records_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_health_exam_plans(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_items'::regclass AND conname='qa_ehs_inspection_items_plan_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_inspection_items ADD CONSTRAINT "qa_ehs_inspection_items_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_inspection_plans(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_record_items'::regclass AND conname='qa_ehs_inspection_record_items_item_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_inspection_record_items ADD CONSTRAINT "qa_ehs_inspection_record_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES ehs.qa_ehs_inspection_items(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_record_items'::regclass AND conname='qa_ehs_inspection_record_items_record_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_inspection_record_items ADD CONSTRAINT "qa_ehs_inspection_record_items_record_id_fkey" FOREIGN KEY (record_id) REFERENCES ehs.qa_ehs_inspection_records(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_inspection_records'::regclass AND conname='qa_ehs_inspection_records_plan_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_inspection_records ADD CONSTRAINT "qa_ehs_inspection_records_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_inspection_plans(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_msds'::regclass AND conname='qa_ehs_msds_material_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_msds ADD CONSTRAINT "qa_ehs_msds_material_id_fkey" FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ehs.qa_ehs_stock_records'::regclass AND conname='qa_ehs_stock_records_material_id_fkey') THEN
        ALTER TABLE ehs.qa_ehs_stock_records ADD CONSTRAINT "qa_ehs_stock_records_material_id_fkey" FOREIGN KEY (material_id) REFERENCES ehs.qa_ehs_hazardous_materials(id);
    END IF;
END $$;


ALTER TABLE ehs.qa_ehs_accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_accidents FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_compliance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_compliance_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_contraindications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_contraindications FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_discharge_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_discharge_permits FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_disease_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_disease_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_problems FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_drill_records FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plan_approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plan_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plan_supplies FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plan_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_emergency_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_employees FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_env_monitor_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_env_monitor_records FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_environment_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_environment_incidents FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_environmental_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_environmental_regulations FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazard_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazard_factors FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazard_rectifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazard_rectifications FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazard_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazard_verifications FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazardous_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazardous_materials FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_hazards FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_health_exam_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_health_exam_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_health_exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_health_exam_records FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_items FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_record_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_record_items FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_inspection_records FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_msds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_msds FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_risks FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_stock_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_stock_records FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_sync_records FORCE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_trainings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_accidents;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_accidents AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_compliance_evaluations;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_compliance_evaluations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_contraindications;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_contraindications AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_discharge_permits;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_discharge_permits AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_disease_cases;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_disease_cases AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_drill_evaluations;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_drill_evaluations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_drill_plans;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_drill_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_drill_problems;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_drill_problems AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_drill_records;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_drill_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plan_approvals;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plan_approvals AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plan_supplies;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plan_supplies AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plan_versions;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plan_versions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plans;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_emergency_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_employees;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_employees AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_env_monitor_records;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_env_monitor_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_environment_incidents;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_environment_incidents AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_environmental_regulations;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_environmental_regulations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_hazard_factors;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_hazard_factors AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_hazard_rectifications;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_hazard_rectifications AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_hazard_verifications;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_hazard_verifications AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_hazardous_materials;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_hazardous_materials AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_hazards;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_hazards AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_health_exam_plans;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_health_exam_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_health_exam_records;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_health_exam_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_inspection_items;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_inspection_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_inspection_plans;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_inspection_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_inspection_record_items;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_inspection_record_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_inspection_records;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_inspection_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_msds;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_msds AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_risks;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_risks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_stock_records;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_stock_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_sync_records;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_sync_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON ehs.qa_ehs_trainings;
CREATE POLICY "rls_tenant_isolation" ON ehs.qa_ehs_trainings AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
