-- 回滚 20261127200000：按 pg_dump 原样重建 public 层 33 张死表（结构 + 约束 + 索引 + RLS + 策略 + 授权）
-- 说明：本轮删除的均为 0 行表（生产侧 0 张存在），回滚只恢复空结构，无数据可恢复。
--       授权语句对 topems_app 角色做了存在性包裹，生产库缺该角色时不会报错。

BEGIN;
CREATE TABLE public.configurations (
    id uuid NOT NULL,
    config_key character varying(255) NOT NULL,
    config_value text NOT NULL,
    description text,
    product_id uuid,
    version_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);
ALTER TABLE ONLY public.configurations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.configurations OWNER TO topems_owner;
CREATE TABLE public.core_finance_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    voucher_no character varying(50) NOT NULL,
    voucher_date timestamp with time zone NOT NULL,
    period character varying(6) NOT NULL,
    voucher_type public.voucher_type NOT NULL,
    total_debit numeric(18,4) DEFAULT 0 NOT NULL,
    total_credit numeric(18,4) DEFAULT 0 NOT NULL,
    status public.voucher_status DEFAULT 'draft'::public.voucher_status NOT NULL,
    description text,
    created_by character varying(100) NOT NULL,
    approved_by character varying(100),
    posted_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
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
ALTER TABLE ONLY public.core_finance_vouchers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_finance_vouchers OWNER TO topems_owner;
CREATE TABLE public.finance_voucher_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100),
    description text,
    template_type character varying(50),
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT ck_finance_voucher_templates_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE ONLY public.finance_voucher_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.finance_voucher_templates OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_accident_investigations (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_accident_investigations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accident_investigations OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_accident_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    summary text,
    lessons_learned jsonb,
    recommendations jsonb,
    reviewer character varying(64),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_accident_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accident_reviews OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_accident_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accident_id uuid,
    actions jsonb,
    responsible character varying(64),
    status character varying(32) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_accident_treatments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accident_treatments OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_accidents (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_accidents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accidents OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_hazardous_materials (
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
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_qa_ehs_hazardous_materials_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE ONLY public.qa_ehs_hazardous_materials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_hazardous_materials OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_health_abnormalities (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_health_abnormalities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_health_abnormalities OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_health_exam_plans (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_health_exam_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_health_exam_plans OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_health_exam_records (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_health_exam_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_health_exam_records OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_inspection_items (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_inspection_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_inspection_items OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_inspection_plans (
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
    tenant_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_qa_ehs_inspection_plans_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE ONLY public.qa_ehs_inspection_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_inspection_plans OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_material_stocks (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_material_stocks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_material_stocks OWNER TO topems_owner;
CREATE TABLE public.qa_ehs_stock_records (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.qa_ehs_stock_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_stock_records OWNER TO topems_owner;
CREATE TABLE public.qa_lab_reagent_alerts (
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
ALTER TABLE ONLY public.qa_lab_reagent_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lab_reagent_alerts OWNER TO topems_owner;
CREATE TABLE public.qa_lab_reagent_history (
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
ALTER TABLE ONLY public.qa_lab_reagent_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lab_reagent_history OWNER TO topems_owner;
CREATE TABLE public.qa_lab_reagents (
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
ALTER TABLE ONLY public.qa_lab_reagents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lab_reagents OWNER TO topems_owner;
CREATE TABLE public.qa_lims_barcode_scan_records (
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
ALTER TABLE ONLY public.qa_lims_barcode_scan_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_barcode_scan_records OWNER TO topems_owner;
CREATE TABLE public.qa_lims_method_categories (
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
    deleted_at timestamp with time zone,
    CONSTRAINT ck_qa_lims_method_categories_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE ONLY public.qa_lims_method_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_method_categories OWNER TO topems_owner;
CREATE TABLE public.qa_lims_method_validations (
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
ALTER TABLE ONLY public.qa_lims_method_validations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_method_validations OWNER TO topems_owner;
CREATE TABLE public.qa_lims_method_versions (
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
ALTER TABLE ONLY public.qa_lims_method_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_method_versions OWNER TO topems_owner;
CREATE TABLE public.qa_lims_pt_corrective_actions (
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
ALTER TABLE ONLY public.qa_lims_pt_corrective_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_corrective_actions OWNER TO topems_owner;
CREATE TABLE public.qa_lims_pt_evaluations (
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
ALTER TABLE ONLY public.qa_lims_pt_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_evaluations OWNER TO topems_owner;
CREATE TABLE public.qa_lims_pt_plans (
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
ALTER TABLE ONLY public.qa_lims_pt_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_plans OWNER TO topems_owner;
CREATE TABLE public.qa_lims_pt_results (
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
ALTER TABLE ONLY public.qa_lims_pt_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_results OWNER TO topems_owner;
CREATE TABLE public.qa_lims_pt_samples (
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
ALTER TABLE ONLY public.qa_lims_pt_samples FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_samples OWNER TO topems_owner;
CREATE TABLE public.qa_lims_sample_barcodes (
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
    deleted_at timestamp with time zone,
    CONSTRAINT ck_qa_lims_sample_barcodes_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE ONLY public.qa_lims_sample_barcodes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_sample_barcodes OWNER TO topems_owner;
CREATE TABLE public.qa_lims_test_methods (
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
ALTER TABLE ONLY public.qa_lims_test_methods FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_test_methods OWNER TO topems_owner;
CREATE TABLE public.qa_lims_uncertainty_components (
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
ALTER TABLE ONLY public.qa_lims_uncertainty_components FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_uncertainty_components OWNER TO topems_owner;
CREATE TABLE public.qa_lims_uncertainty_projects (
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
ALTER TABLE ONLY public.qa_lims_uncertainty_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_uncertainty_projects OWNER TO topems_owner;
CREATE TABLE public.qa_lims_uncertainty_sources (
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
ALTER TABLE ONLY public.qa_lims_uncertainty_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_uncertainty_sources OWNER TO topems_owner;
CREATE TABLE public.versions (
    id uuid NOT NULL,
    version_no character varying(100) NOT NULL,
    product_id uuid NOT NULL,
    description text,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    release_date timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);
ALTER TABLE public.versions OWNER TO topems_owner;
ALTER TABLE ONLY public.configurations
    ADD CONSTRAINT configurations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.core_finance_vouchers
    ADD CONSTRAINT core_finance_vouchers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.finance_voucher_templates
    ADD CONSTRAINT finance_voucher_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_accident_investigations
    ADD CONSTRAINT qa_ehs_accident_investigations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_accident_reviews
    ADD CONSTRAINT qa_ehs_accident_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_accident_treatments
    ADD CONSTRAINT qa_ehs_accident_treatments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_accidents
    ADD CONSTRAINT qa_ehs_accidents_accident_no_key UNIQUE (accident_no);
ALTER TABLE ONLY public.qa_ehs_accidents
    ADD CONSTRAINT qa_ehs_accidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_hazardous_materials
    ADD CONSTRAINT qa_ehs_hazardous_materials_material_no_key UNIQUE (material_no);
ALTER TABLE ONLY public.qa_ehs_hazardous_materials
    ADD CONSTRAINT qa_ehs_hazardous_materials_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_health_abnormalities
    ADD CONSTRAINT qa_ehs_health_abnormalities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_health_exam_plans
    ADD CONSTRAINT qa_ehs_health_exam_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_health_exam_plans
    ADD CONSTRAINT qa_ehs_health_exam_plans_plan_no_key UNIQUE (plan_no);
ALTER TABLE ONLY public.qa_ehs_health_exam_records
    ADD CONSTRAINT qa_ehs_health_exam_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_health_exam_records
    ADD CONSTRAINT qa_ehs_health_exam_records_record_no_key UNIQUE (record_no);
ALTER TABLE ONLY public.qa_ehs_inspection_items
    ADD CONSTRAINT qa_ehs_inspection_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_inspection_plans
    ADD CONSTRAINT qa_ehs_inspection_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_inspection_plans
    ADD CONSTRAINT qa_ehs_inspection_plans_plan_no_key UNIQUE (plan_no);
ALTER TABLE ONLY public.qa_ehs_material_stocks
    ADD CONSTRAINT qa_ehs_material_stocks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_stock_records
    ADD CONSTRAINT qa_ehs_stock_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_ehs_stock_records
    ADD CONSTRAINT qa_ehs_stock_records_record_no_key UNIQUE (record_no);
ALTER TABLE ONLY public.qa_lab_reagent_alerts
    ADD CONSTRAINT qa_lab_reagent_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lab_reagent_history
    ADD CONSTRAINT qa_lab_reagent_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lab_reagents
    ADD CONSTRAINT qa_lab_reagents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lab_reagents
    ADD CONSTRAINT qa_lab_reagents_reagent_no_key UNIQUE (reagent_no);
ALTER TABLE ONLY public.qa_lims_barcode_scan_records
    ADD CONSTRAINT qa_lims_barcode_scan_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_method_categories
    ADD CONSTRAINT qa_lims_method_categories_category_code_key UNIQUE (category_code);
ALTER TABLE ONLY public.qa_lims_method_categories
    ADD CONSTRAINT qa_lims_method_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_method_validations
    ADD CONSTRAINT qa_lims_method_validations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_method_versions
    ADD CONSTRAINT qa_lims_method_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_pt_corrective_actions
    ADD CONSTRAINT qa_lims_pt_corrective_actions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_pt_evaluations
    ADD CONSTRAINT qa_lims_pt_evaluations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_pt_plans
    ADD CONSTRAINT qa_lims_pt_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_pt_plans
    ADD CONSTRAINT qa_lims_pt_plans_plan_no_key UNIQUE (plan_no);
ALTER TABLE ONLY public.qa_lims_pt_results
    ADD CONSTRAINT qa_lims_pt_results_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_pt_samples
    ADD CONSTRAINT qa_lims_pt_samples_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_sample_barcodes
    ADD CONSTRAINT qa_lims_sample_barcodes_barcode_key UNIQUE (barcode);
ALTER TABLE ONLY public.qa_lims_sample_barcodes
    ADD CONSTRAINT qa_lims_sample_barcodes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_test_methods
    ADD CONSTRAINT qa_lims_test_methods_method_code_key UNIQUE (method_code);
ALTER TABLE ONLY public.qa_lims_test_methods
    ADD CONSTRAINT qa_lims_test_methods_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_uncertainty_components
    ADD CONSTRAINT qa_lims_uncertainty_components_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_uncertainty_projects
    ADD CONSTRAINT qa_lims_uncertainty_projects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.qa_lims_uncertainty_projects
    ADD CONSTRAINT qa_lims_uncertainty_projects_project_no_key UNIQUE (project_no);
ALTER TABLE ONLY public.qa_lims_uncertainty_sources
    ADD CONSTRAINT qa_lims_uncertainty_sources_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_pkey PRIMARY KEY (id);
CREATE INDEX idx_configurations_product_id ON public.configurations USING btree (product_id);
CREATE INDEX idx_configurations_version_id ON public.configurations USING btree (version_id);
CREATE INDEX idx_core_finance_vouchers_template_id ON public.core_finance_vouchers USING btree (template_id);
CREATE INDEX idx_core_finance_vouchers_tenant_id ON public.core_finance_vouchers USING btree (tenant_id);
CREATE INDEX idx_public_versions_tenant_id ON public.versions USING btree (tenant_id);
CREATE INDEX idx_qa_ehs_accident_investigations_accident_id ON public.qa_ehs_accident_investigations USING btree (accident_id);
CREATE INDEX idx_qa_ehs_accident_reviews_accident_id ON public.qa_ehs_accident_reviews USING btree (accident_id);
CREATE INDEX idx_qa_ehs_accident_treatments_accident_id ON public.qa_ehs_accident_treatments USING btree (accident_id);
CREATE INDEX idx_qa_ehs_accidents_no ON public.qa_ehs_accidents USING btree (accident_no);
CREATE INDEX idx_qa_ehs_accidents_status ON public.qa_ehs_accidents USING btree (status);
CREATE INDEX idx_qa_ehs_hazardous_materials_category ON public.qa_ehs_hazardous_materials USING btree (category);
CREATE INDEX idx_qa_ehs_hazardous_materials_no ON public.qa_ehs_hazardous_materials USING btree (material_no);
CREATE INDEX idx_qa_ehs_hazardous_materials_status ON public.qa_ehs_hazardous_materials USING btree (status);
CREATE INDEX idx_qa_ehs_health_abnormalities_record_id ON public.qa_ehs_health_abnormalities USING btree (record_id);
CREATE INDEX idx_qa_ehs_health_exam_plans_no ON public.qa_ehs_health_exam_plans USING btree (plan_no);
CREATE INDEX idx_qa_ehs_health_exam_plans_status ON public.qa_ehs_health_exam_plans USING btree (status);
CREATE INDEX idx_qa_ehs_health_exam_records_employee ON public.qa_ehs_health_exam_records USING btree (employee_id);
CREATE INDEX idx_qa_ehs_health_exam_records_no ON public.qa_ehs_health_exam_records USING btree (record_no);
CREATE INDEX idx_qa_ehs_health_exam_records_plan_id ON public.qa_ehs_health_exam_records USING btree (plan_id);
CREATE INDEX idx_qa_ehs_inspection_items_plan_id ON public.qa_ehs_inspection_items USING btree (plan_id);
CREATE INDEX idx_qa_ehs_material_stocks_material_id ON public.qa_ehs_material_stocks USING btree (material_id);
CREATE INDEX idx_qa_ehs_plans_no ON public.qa_ehs_inspection_plans USING btree (plan_no);
CREATE INDEX idx_qa_ehs_stock_records_material_id ON public.qa_ehs_stock_records USING btree (material_id);
CREATE INDEX idx_qa_ehs_stock_records_no ON public.qa_ehs_stock_records USING btree (record_no);
CREATE INDEX idx_qa_ehs_stock_records_type ON public.qa_ehs_stock_records USING btree (record_type);
CREATE INDEX idx_qa_lab_reagent_alerts_reagent ON public.qa_lab_reagent_alerts USING btree (reagent_id);
CREATE INDEX idx_qa_lab_reagent_alerts_reagent_id ON public.qa_lab_reagent_alerts USING btree (reagent_id);
CREATE INDEX idx_qa_lab_reagent_history_reagent ON public.qa_lab_reagent_history USING btree (reagent_id);
CREATE INDEX idx_qa_lab_reagent_history_reagent_id ON public.qa_lab_reagent_history USING btree (reagent_id);
CREATE INDEX idx_qa_lab_reagents_status ON public.qa_lab_reagents USING btree (status);
CREATE INDEX idx_qa_lims_barcode_scan_barcode ON public.qa_lims_barcode_scan_records USING btree (barcode);
CREATE INDEX idx_qa_lims_barcode_scan_records_barcode_id ON public.qa_lims_barcode_scan_records USING btree (barcode_id);
CREATE INDEX idx_qa_lims_barcode_scan_type ON public.qa_lims_barcode_scan_records USING btree (scan_type);
CREATE INDEX idx_qa_lims_method_categories_parent_id ON public.qa_lims_method_categories USING btree (parent_id);
CREATE INDEX idx_qa_lims_method_validations_method ON public.qa_lims_method_validations USING btree (method_id);
CREATE INDEX idx_qa_lims_method_validations_method_id ON public.qa_lims_method_validations USING btree (method_id);
CREATE INDEX idx_qa_lims_method_versions_method ON public.qa_lims_method_versions USING btree (method_id);
CREATE INDEX idx_qa_lims_method_versions_method_id ON public.qa_lims_method_versions USING btree (method_id);
CREATE INDEX idx_qa_lims_pt_corrective_actions_evaluation_id ON public.qa_lims_pt_corrective_actions USING btree (evaluation_id);
CREATE INDEX idx_qa_lims_pt_corrective_actions_plan_id ON public.qa_lims_pt_corrective_actions USING btree (plan_id);
CREATE INDEX idx_qa_lims_pt_corrective_plan ON public.qa_lims_pt_corrective_actions USING btree (plan_id);
CREATE INDEX idx_qa_lims_pt_corrective_status ON public.qa_lims_pt_corrective_actions USING btree (status);
CREATE INDEX idx_qa_lims_pt_evaluations_plan ON public.qa_lims_pt_evaluations USING btree (plan_id);
CREATE INDEX idx_qa_lims_pt_evaluations_plan_id ON public.qa_lims_pt_evaluations USING btree (plan_id);
CREATE INDEX idx_qa_lims_pt_evaluations_sample_id ON public.qa_lims_pt_evaluations USING btree (sample_id);
CREATE INDEX idx_qa_lims_pt_plans_status ON public.qa_lims_pt_plans USING btree (status);
CREATE INDEX idx_qa_lims_pt_results_plan ON public.qa_lims_pt_results USING btree (plan_id);
CREATE INDEX idx_qa_lims_pt_results_plan_id ON public.qa_lims_pt_results USING btree (plan_id);
CREATE INDEX idx_qa_lims_pt_results_sample ON public.qa_lims_pt_results USING btree (sample_id);
CREATE INDEX idx_qa_lims_pt_results_sample_id ON public.qa_lims_pt_results USING btree (sample_id);
CREATE INDEX idx_qa_lims_pt_samples_plan ON public.qa_lims_pt_samples USING btree (plan_id);
CREATE INDEX idx_qa_lims_pt_samples_plan_id ON public.qa_lims_pt_samples USING btree (plan_id);
CREATE INDEX idx_qa_lims_sample_barcodes_sample ON public.qa_lims_sample_barcodes USING btree (sample_id);
CREATE INDEX idx_qa_lims_sample_barcodes_sample_id ON public.qa_lims_sample_barcodes USING btree (sample_id);
CREATE INDEX idx_qa_lims_sample_barcodes_status ON public.qa_lims_sample_barcodes USING btree (status);
CREATE INDEX idx_qa_lims_test_methods_category ON public.qa_lims_test_methods USING btree (category_id);
CREATE INDEX idx_qa_lims_test_methods_category_id ON public.qa_lims_test_methods USING btree (category_id);
CREATE INDEX idx_qa_lims_test_methods_status ON public.qa_lims_test_methods USING btree (status);
CREATE INDEX idx_qa_lims_uncertainty_components_project ON public.qa_lims_uncertainty_components USING btree (project_id);
CREATE INDEX idx_qa_lims_uncertainty_components_project_id ON public.qa_lims_uncertainty_components USING btree (project_id);
CREATE INDEX idx_qa_lims_uncertainty_components_source ON public.qa_lims_uncertainty_components USING btree (source_id);
CREATE INDEX idx_qa_lims_uncertainty_components_source_id ON public.qa_lims_uncertainty_components USING btree (source_id);
CREATE INDEX idx_qa_lims_uncertainty_projects_status ON public.qa_lims_uncertainty_projects USING btree (status);
CREATE INDEX idx_qa_lims_uncertainty_sources_project ON public.qa_lims_uncertainty_sources USING btree (project_id);
CREATE INDEX idx_qa_lims_uncertainty_sources_project_id ON public.qa_lims_uncertainty_sources USING btree (project_id);
CREATE INDEX idx_versions_product_id ON public.versions USING btree (product_id);
CREATE INDEX idx_versions_status ON public.versions USING btree (status);
CREATE INDEX idx_vouchers_status ON public.core_finance_vouchers USING btree (status);
CREATE INDEX idx_vouchers_submitter ON public.core_finance_vouchers USING btree (submitter_id);
CREATE INDEX idx_vouchers_template_id ON public.core_finance_vouchers USING btree (template_id) WHERE (template_id IS NOT NULL);
CREATE INDEX idx_vouchers_year_month ON public.core_finance_vouchers USING btree (year, month);
ALTER TABLE ONLY public.configurations
    ADD CONSTRAINT configurations_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.versions(id);
ALTER TABLE ONLY public.core_finance_vouchers
    ADD CONSTRAINT core_finance_vouchers_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.finance_voucher_templates(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.qa_ehs_accident_investigations
    ADD CONSTRAINT qa_ehs_accident_investigations_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES public.qa_ehs_accidents(id);
ALTER TABLE ONLY public.qa_ehs_accident_reviews
    ADD CONSTRAINT qa_ehs_accident_reviews_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES public.qa_ehs_accidents(id);
ALTER TABLE ONLY public.qa_ehs_accident_treatments
    ADD CONSTRAINT qa_ehs_accident_treatments_accident_id_fkey FOREIGN KEY (accident_id) REFERENCES public.qa_ehs_accidents(id);
ALTER TABLE ONLY public.qa_ehs_health_abnormalities
    ADD CONSTRAINT qa_ehs_health_abnormalities_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.qa_ehs_health_exam_records(id);
ALTER TABLE ONLY public.qa_ehs_health_exam_records
    ADD CONSTRAINT qa_ehs_health_exam_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_health_exam_plans(id);
ALTER TABLE ONLY public.qa_ehs_inspection_items
    ADD CONSTRAINT qa_ehs_inspection_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.qa_ehs_inspection_plans(id);
ALTER TABLE ONLY public.qa_ehs_material_stocks
    ADD CONSTRAINT qa_ehs_material_stocks_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.qa_ehs_hazardous_materials(id);
ALTER TABLE ONLY public.qa_ehs_stock_records
    ADD CONSTRAINT qa_ehs_stock_records_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.qa_ehs_hazardous_materials(id);
ALTER TABLE ONLY public.qa_lab_reagent_alerts
    ADD CONSTRAINT qa_lab_reagent_alerts_reagent_id_fkey FOREIGN KEY (reagent_id) REFERENCES public.qa_lab_reagents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lab_reagent_history
    ADD CONSTRAINT qa_lab_reagent_history_reagent_id_fkey FOREIGN KEY (reagent_id) REFERENCES public.qa_lab_reagents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_barcode_scan_records
    ADD CONSTRAINT qa_lims_barcode_scan_records_barcode_id_fkey FOREIGN KEY (barcode_id) REFERENCES public.qa_lims_sample_barcodes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_method_categories
    ADD CONSTRAINT qa_lims_method_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.qa_lims_method_categories(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_method_validations
    ADD CONSTRAINT qa_lims_method_validations_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.qa_lims_test_methods(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_method_versions
    ADD CONSTRAINT qa_lims_method_versions_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.qa_lims_test_methods(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_pt_corrective_actions
    ADD CONSTRAINT qa_lims_pt_corrective_actions_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.qa_lims_pt_evaluations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_pt_corrective_actions
    ADD CONSTRAINT qa_lims_pt_corrective_actions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_pt_evaluations
    ADD CONSTRAINT qa_lims_pt_evaluations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_pt_evaluations
    ADD CONSTRAINT qa_lims_pt_evaluations_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.qa_lims_pt_samples(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_pt_results
    ADD CONSTRAINT qa_lims_pt_results_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_pt_results
    ADD CONSTRAINT qa_lims_pt_results_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.qa_lims_pt_samples(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_pt_samples
    ADD CONSTRAINT qa_lims_pt_samples_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.qa_lims_pt_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_sample_barcodes
    ADD CONSTRAINT qa_lims_sample_barcodes_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.qa_lims_test_methods
    ADD CONSTRAINT qa_lims_test_methods_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.qa_lims_method_categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.qa_lims_uncertainty_components
    ADD CONSTRAINT qa_lims_uncertainty_components_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.qa_lims_uncertainty_projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_uncertainty_components
    ADD CONSTRAINT qa_lims_uncertainty_components_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.qa_lims_uncertainty_sources(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.qa_lims_uncertainty_sources
    ADD CONSTRAINT qa_lims_uncertainty_sources_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.qa_lims_uncertainty_projects(id) ON DELETE CASCADE;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_finance_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_voucher_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accident_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accident_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accident_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_hazardous_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_health_abnormalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_health_exam_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_health_exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_inspection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_material_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_ehs_stock_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lab_reagent_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lab_reagent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lab_reagents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_barcode_scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_method_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_method_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_method_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_pt_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_sample_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_test_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_uncertainty_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_uncertainty_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_lims_uncertainty_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_accident_investigations USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_accident_reviews USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_accident_treatments USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_accidents USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_hazardous_materials USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_health_abnormalities USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_health_exam_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_health_exam_records USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_inspection_items USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_inspection_plans USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_material_stocks USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_ehs_stock_records USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lab_reagent_alerts USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lab_reagent_history USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lab_reagents USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_barcode_scan_records USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_method_categories USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_method_validations USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_method_versions USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_pt_corrective_actions USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_pt_evaluations USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_pt_plans USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_pt_results USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_pt_samples USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_sample_barcodes USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_test_methods USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_uncertainty_components USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_uncertainty_projects USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY rls_tenant_isolation ON public.qa_lims_uncertainty_sources USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY tenant_isolation_configurations ON public.configurations USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
CREATE POLICY tenant_isolation_core_finance_vouchers ON public.core_finance_vouchers USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
CREATE POLICY tenant_isolation_finance_voucher_templates ON public.finance_voucher_templates USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
CREATE POLICY tenant_isolation_versions ON public.versions USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
DO $rb$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
    EXECUTE $q$GRANT SELECT, INSERT, DELETE, UPDATE ON ALL TABLES IN SCHEMA public TO topems_app$q$;
  END IF;
END
$rb$;

COMMIT;
