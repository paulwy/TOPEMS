-- 20261120200000: lims 42 张运行期表收口（W2-D2 第九个模块）
--
-- 背景：svc/lims/src/models/schema_defense.rs 的 TABLE_DEFS 声明 42 张表
-- （516 列），启动时由 schema_defense 建骨架表、逐列 ADD COLUMN IF NOT EXISTS。
-- 42 张表在 baseline+forward 库中全部存在；另有 lims.lims_inspection_records /
-- lims.lims_safety_tasks / lims.qa_lims_analytes 三张 live 表由既有迁移创建，
-- 不在 TABLE_DEFS 名单内，本迁移不纳入。
-- 以 live 真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS lims.ai_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.document_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.inspection_processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    code character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(64),
    name character varying(200),
    organization_id uuid,
    status character varying(32),
    steps jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS lims.inspection_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    conclusion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    inspector character varying(64),
    organization_id uuid,
    recorded_at timestamp with time zone DEFAULT now(),
    result text,
    step_id uuid,
    step_name character varying(128),
    task_id uuid,
    tenant_id uuid,
    instrument_id uuid,
    inspection_no text,
    sample_id uuid,
    sample_code text,
    inspection_type text,
    status text DEFAULT 'pending'::text,
    inspected_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS lims.inspection_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    sample_no text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(64),
    current_step integer DEFAULT 0,
    inspector character varying(64),
    organization_id uuid,
    priority character varying(16),
    process_id uuid,
    sample_id uuid,
    started_at timestamp with time zone,
    status character varying(32),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS lims.instrument_calibrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    calibrated_by character varying(64),
    calibration_date date,
    calibration_results jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    instrument_id uuid,
    notes text,
    organization_id uuid,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS lims.instruments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    code character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    instrument_type character varying(64),
    location character varying(200),
    manufacturer character varying(128),
    model character varying(128),
    name character varying(200),
    organization_id uuid,
    serial_number character varying(128),
    status character varying(32),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS lims.lab_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.maintenance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid,
    tenant_id uuid,
    instrument_id uuid,
    maintenance_type text,
    status text DEFAULT 'pending'::text,
    result text,
    notes text,
    performed_by uuid,
    planned_date timestamp with time zone,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    conclusion text,
    description text,
    performed_at timestamp with time zone,
    next_maintenance_date timestamp with time zone,
    cost numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_calibration_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_inspection_reports (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_instruments (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    process_no character varying(64),
    name character varying(256),
    description text,
    steps jsonb,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    process_name character varying,
    is_active boolean DEFAULT true,
    name_en character varying(255),
    process_name_en character varying(255),
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_reagent_alerts (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_reagent_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    reagent_id uuid NOT NULL,
    adjustment_type character varying(16) NOT NULL,
    quantity numeric(12,2) NOT NULL,
    reason text,
    operator character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_reagents (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    record_no character varying(64) NOT NULL,
    task_id uuid NOT NULL,
    test_data jsonb NOT NULL,
    conclusion character varying(256) NOT NULL,
    recorded_by character varying(64) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lab_sample_lifecycle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    sample_id uuid NOT NULL,
    sample_no character varying(64) NOT NULL,
    lifecycle_stage character varying(32) NOT NULL,
    stage_description text,
    operator character varying(64),
    notes text,
    location character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_audit_logs (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_barcode_scan_records (
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
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_collection_tasks (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_instrument_data (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_method_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    category_code character varying(64) NOT NULL,
    category_name character varying(256) NOT NULL,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    description text,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_method_validations (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_method_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    method_id uuid NOT NULL,
    version character varying(32) NOT NULL,
    version_description text,
    change_log text,
    is_current boolean DEFAULT false,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_parse_rules (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_pt_corrective_actions (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_pt_evaluations (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_pt_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_pt_results (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_pt_samples (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_rfid_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    tag_id character varying(128) NOT NULL,
    tag_type character varying(32) DEFAULT 'uhf'::character varying,
    sample_id uuid,
    sample_no character varying(64),
    status character varying(32) DEFAULT 'unused'::character varying,
    assigned_at timestamp with time zone,
    last_read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_sample_barcodes (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_sync_records (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_test_methods (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_uncertainty_components (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_uncertainty_projects (
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.qa_lims_uncertainty_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    project_id uuid NOT NULL,
    source_name character varying(256) NOT NULL,
    source_type character varying(32) NOT NULL,
    description text,
    distribution_type character varying(32),
    sensitivity_coefficient numeric(18,6),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.reagent_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.reagents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS lims.samples (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name character varying(200),
    code character varying(64),
    status character varying(32),
    received_date date,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE INDEX IF NOT EXISTS idx_qa_lab_calibration_records_instrument ON lims.qa_lab_calibration_records USING btree (instrument_id);
CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_no ON lims.qa_lab_instruments USING btree (instrument_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_status ON lims.qa_lab_instruments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lab_processes_no ON lims.qa_lab_processes USING btree (process_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_no ON lims.qa_lab_reagents USING btree (reagent_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_status ON lims.qa_lab_reagents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lab_records_no ON lims.qa_lab_records USING btree (record_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_records_task ON lims.qa_lab_records USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_action ON lims.qa_lims_audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_created_at ON lims.qa_lims_audit_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_entity_type ON lims.qa_lims_audit_logs USING btree (entity_type);
CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_status ON lims.qa_lims_audit_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_user_id ON lims.qa_lims_audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_barcode_scan_barcode ON lims.qa_lims_barcode_scan_records USING btree (barcode);
CREATE INDEX IF NOT EXISTS idx_qa_lims_barcode_scan_records_barcode_id ON lims.qa_lims_barcode_scan_records USING btree (barcode_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_barcode_scan_type ON lims.qa_lims_barcode_scan_records USING btree (scan_type);
CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_instrument ON lims.qa_lims_collection_tasks USING btree (instrument_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_no ON lims.qa_lims_collection_tasks USING btree (task_no);
CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_status ON lims.qa_lims_collection_tasks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_batch ON lims.qa_lims_instrument_data USING btree (batch_no);
CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_instrument ON lims.qa_lims_instrument_data USING btree (instrument_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_no ON lims.qa_lims_instrument_data USING btree (data_no);
CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_protocol ON lims.qa_lims_instrument_data USING btree (protocol);
CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_status ON lims.qa_lims_instrument_data USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_method_categories_code ON lims.qa_lims_method_categories USING btree (category_code);
CREATE INDEX IF NOT EXISTS idx_qa_lims_method_categories_parent_id ON lims.qa_lims_method_categories USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_method_validations_method ON lims.qa_lims_method_validations USING btree (method_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_method_versions_method ON lims.qa_lims_method_versions USING btree (method_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_parse_rules_no ON lims.qa_lims_parse_rules USING btree (rule_no);
CREATE INDEX IF NOT EXISTS idx_qa_lims_parse_rules_protocol ON lims.qa_lims_parse_rules USING btree (protocol);
CREATE INDEX IF NOT EXISTS idx_qa_lims_parse_rules_status ON lims.qa_lims_parse_rules USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_actions_evaluation_id ON lims.qa_lims_pt_corrective_actions USING btree (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_plan ON lims.qa_lims_pt_corrective_actions USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_status ON lims.qa_lims_pt_corrective_actions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_evaluations_plan ON lims.qa_lims_pt_evaluations USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_evaluations_sample_id ON lims.qa_lims_pt_evaluations USING btree (sample_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_plans_no ON lims.qa_lims_pt_plans USING btree (plan_no);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_plans_status ON lims.qa_lims_pt_plans USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_results_plan ON lims.qa_lims_pt_results USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_results_sample ON lims.qa_lims_pt_results USING btree (sample_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_samples_plan ON lims.qa_lims_pt_samples USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_rfid_tags_sample_id ON lims.qa_lims_rfid_tags USING btree (sample_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_rfid_tags_status ON lims.qa_lims_rfid_tags USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_rfid_tags_tag ON lims.qa_lims_rfid_tags USING btree (tag_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_no ON lims.qa_lims_sample_barcodes USING btree (barcode);
CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_sample ON lims.qa_lims_sample_barcodes USING btree (sample_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_status ON lims.qa_lims_sample_barcodes USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_no ON lims.qa_lims_sync_records USING btree (sync_no);
CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_status ON lims.qa_lims_sync_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_type ON lims.qa_lims_sync_records USING btree (sync_type);
CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_category ON lims.qa_lims_test_methods USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_code ON lims.qa_lims_test_methods USING btree (method_code);
CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_status ON lims.qa_lims_test_methods USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_components_project ON lims.qa_lims_uncertainty_components USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_components_source ON lims.qa_lims_uncertainty_components USING btree (source_id);
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_projects_no ON lims.qa_lims_uncertainty_projects USING btree (project_no);
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_projects_status ON lims.qa_lims_uncertainty_projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_sources_project ON lims.qa_lims_uncertainty_sources USING btree (project_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.ai_analyses'::regclass AND contype='p') THEN
        ALTER TABLE lims.ai_analyses ADD CONSTRAINT "ai_analyses_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.audit_logs'::regclass AND contype='p') THEN
        ALTER TABLE lims.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.document_relations'::regclass AND contype='p') THEN
        ALTER TABLE lims.document_relations ADD CONSTRAINT "document_relations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.inspection_processes'::regclass AND contype='p') THEN
        ALTER TABLE lims.inspection_processes ADD CONSTRAINT "inspection_processes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.inspection_records'::regclass AND contype='p') THEN
        ALTER TABLE lims.inspection_records ADD CONSTRAINT "inspection_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.inspection_tasks'::regclass AND contype='p') THEN
        ALTER TABLE lims.inspection_tasks ADD CONSTRAINT "inspection_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.instrument_calibrations'::regclass AND contype='p') THEN
        ALTER TABLE lims.instrument_calibrations ADD CONSTRAINT "instrument_calibrations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.instruments'::regclass AND contype='p') THEN
        ALTER TABLE lims.instruments ADD CONSTRAINT "instruments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.lab_ledger'::regclass AND contype='p') THEN
        ALTER TABLE lims.lab_ledger ADD CONSTRAINT "lab_ledger_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.maintenance_records'::regclass AND contype='p') THEN
        ALTER TABLE lims.maintenance_records ADD CONSTRAINT "maintenance_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_calibration_records'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_calibration_records ADD CONSTRAINT "qa_lab_calibration_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_inspection_reports'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_inspection_reports ADD CONSTRAINT "qa_lab_inspection_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_instruments'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_instruments ADD CONSTRAINT "qa_lab_instruments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_processes'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_processes ADD CONSTRAINT "qa_lab_processes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_reagent_alerts'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_reagent_alerts ADD CONSTRAINT "qa_lab_reagent_alerts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_reagent_history'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_reagent_history ADD CONSTRAINT "qa_lab_reagent_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_reagents'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_reagents ADD CONSTRAINT "qa_lab_reagents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_records'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_records ADD CONSTRAINT "qa_lab_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_sample_lifecycle'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lab_sample_lifecycle ADD CONSTRAINT "qa_lab_sample_lifecycle_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_audit_logs'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_audit_logs ADD CONSTRAINT "qa_lims_audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_barcode_scan_records'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_barcode_scan_records ADD CONSTRAINT "qa_lims_barcode_scan_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_collection_tasks'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_collection_tasks ADD CONSTRAINT "qa_lims_collection_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_instrument_data'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_instrument_data ADD CONSTRAINT "qa_lims_instrument_data_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_method_categories'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_method_categories ADD CONSTRAINT "qa_lims_method_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_method_validations'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_method_validations ADD CONSTRAINT "qa_lims_method_validations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_method_versions'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_method_versions ADD CONSTRAINT "qa_lims_method_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_parse_rules'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_parse_rules ADD CONSTRAINT "qa_lims_parse_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_pt_corrective_actions'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_pt_corrective_actions ADD CONSTRAINT "qa_lims_pt_corrective_actions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_pt_evaluations'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_pt_evaluations ADD CONSTRAINT "qa_lims_pt_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_pt_plans'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_pt_plans ADD CONSTRAINT "qa_lims_pt_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_pt_results'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_pt_results ADD CONSTRAINT "qa_lims_pt_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_pt_samples'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_pt_samples ADD CONSTRAINT "qa_lims_pt_samples_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_rfid_tags'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_rfid_tags ADD CONSTRAINT "qa_lims_rfid_tags_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_sample_barcodes'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_sample_barcodes ADD CONSTRAINT "qa_lims_sample_barcodes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_sync_records'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_sync_records ADD CONSTRAINT "qa_lims_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_test_methods'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_test_methods ADD CONSTRAINT "qa_lims_test_methods_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_uncertainty_components'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_uncertainty_components ADD CONSTRAINT "qa_lims_uncertainty_components_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_uncertainty_projects'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_uncertainty_projects ADD CONSTRAINT "qa_lims_uncertainty_projects_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_uncertainty_sources'::regclass AND contype='p') THEN
        ALTER TABLE lims.qa_lims_uncertainty_sources ADD CONSTRAINT "qa_lims_uncertainty_sources_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.reagent_usages'::regclass AND contype='p') THEN
        ALTER TABLE lims.reagent_usages ADD CONSTRAINT "reagent_usages_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.reagents'::regclass AND contype='p') THEN
        ALTER TABLE lims.reagents ADD CONSTRAINT "reagents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.samples'::regclass AND contype='p') THEN
        ALTER TABLE lims.samples ADD CONSTRAINT "samples_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_instruments'::regclass AND conname='qa_lab_instruments_instrument_no_key') THEN
        ALTER TABLE lims.qa_lab_instruments ADD CONSTRAINT "qa_lab_instruments_instrument_no_key" UNIQUE (instrument_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_processes'::regclass AND conname='qa_lab_processes_process_no_key') THEN
        ALTER TABLE lims.qa_lab_processes ADD CONSTRAINT "qa_lab_processes_process_no_key" UNIQUE (process_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_reagents'::regclass AND conname='qa_lab_reagents_reagent_no_key') THEN
        ALTER TABLE lims.qa_lab_reagents ADD CONSTRAINT "qa_lab_reagents_reagent_no_key" UNIQUE (reagent_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lab_records'::regclass AND conname='qa_lab_records_record_no_key') THEN
        ALTER TABLE lims.qa_lab_records ADD CONSTRAINT "qa_lab_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_collection_tasks'::regclass AND conname='qa_lims_collection_tasks_task_no_key') THEN
        ALTER TABLE lims.qa_lims_collection_tasks ADD CONSTRAINT "qa_lims_collection_tasks_task_no_key" UNIQUE (task_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_instrument_data'::regclass AND conname='qa_lims_instrument_data_data_no_key') THEN
        ALTER TABLE lims.qa_lims_instrument_data ADD CONSTRAINT "qa_lims_instrument_data_data_no_key" UNIQUE (data_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_method_categories'::regclass AND conname='qa_lims_method_categories_category_code_key') THEN
        ALTER TABLE lims.qa_lims_method_categories ADD CONSTRAINT "qa_lims_method_categories_category_code_key" UNIQUE (category_code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_parse_rules'::regclass AND conname='qa_lims_parse_rules_rule_no_key') THEN
        ALTER TABLE lims.qa_lims_parse_rules ADD CONSTRAINT "qa_lims_parse_rules_rule_no_key" UNIQUE (rule_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_pt_plans'::regclass AND conname='qa_lims_pt_plans_plan_no_key') THEN
        ALTER TABLE lims.qa_lims_pt_plans ADD CONSTRAINT "qa_lims_pt_plans_plan_no_key" UNIQUE (plan_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_rfid_tags'::regclass AND conname='qa_lims_rfid_tags_tag_id_key') THEN
        ALTER TABLE lims.qa_lims_rfid_tags ADD CONSTRAINT "qa_lims_rfid_tags_tag_id_key" UNIQUE (tag_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_sample_barcodes'::regclass AND conname='qa_lims_sample_barcodes_barcode_key') THEN
        ALTER TABLE lims.qa_lims_sample_barcodes ADD CONSTRAINT "qa_lims_sample_barcodes_barcode_key" UNIQUE (barcode);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_sync_records'::regclass AND conname='qa_lims_sync_records_sync_no_key') THEN
        ALTER TABLE lims.qa_lims_sync_records ADD CONSTRAINT "qa_lims_sync_records_sync_no_key" UNIQUE (sync_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_test_methods'::regclass AND conname='qa_lims_test_methods_method_code_key') THEN
        ALTER TABLE lims.qa_lims_test_methods ADD CONSTRAINT "qa_lims_test_methods_method_code_key" UNIQUE (method_code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lims.qa_lims_uncertainty_projects'::regclass AND conname='qa_lims_uncertainty_projects_project_no_key') THEN
        ALTER TABLE lims.qa_lims_uncertainty_projects ADD CONSTRAINT "qa_lims_uncertainty_projects_project_no_key" UNIQUE (project_no);
    END IF;
END $$;


ALTER TABLE lims.inspection_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.inspection_processes FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.inspection_records FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.inspection_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.inspection_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.instrument_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.instrument_calibrations FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.instruments FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.maintenance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_calibration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_calibration_records FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_instruments FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_processes FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_reagents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_reagents FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lab_records FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_barcode_scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_barcode_scan_records FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_collection_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_collection_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_instrument_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_instrument_data FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_method_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_method_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_method_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_method_validations FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_method_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_method_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_parse_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_parse_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_corrective_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_results FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_pt_samples FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_rfid_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_rfid_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_sample_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_sample_barcodes FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_sync_records FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_test_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_test_methods FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_uncertainty_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_uncertainty_components FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_uncertainty_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_uncertainty_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_uncertainty_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.qa_lims_uncertainty_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE lims.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.samples FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.inspection_processes;
CREATE POLICY "rls_tenant_isolation" ON lims.inspection_processes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.inspection_records;
CREATE POLICY "rls_tenant_isolation" ON lims.inspection_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.inspection_tasks;
CREATE POLICY "rls_tenant_isolation" ON lims.inspection_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.instrument_calibrations;
CREATE POLICY "rls_tenant_isolation" ON lims.instrument_calibrations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.instruments;
CREATE POLICY "rls_tenant_isolation" ON lims.instruments AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.maintenance_records;
CREATE POLICY "rls_tenant_isolation" ON lims.maintenance_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lab_calibration_records;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lab_calibration_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lab_instruments;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lab_instruments AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lab_processes;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lab_processes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lab_reagents;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lab_reagents AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lab_records;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lab_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_audit_logs;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_audit_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_barcode_scan_records;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_barcode_scan_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_collection_tasks;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_collection_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_instrument_data;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_instrument_data AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_method_categories;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_method_categories AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_method_validations;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_method_validations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_method_versions;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_method_versions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_parse_rules;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_parse_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_pt_corrective_actions;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_pt_corrective_actions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_pt_evaluations;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_pt_evaluations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_pt_plans;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_pt_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_pt_results;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_pt_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_pt_samples;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_pt_samples AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_rfid_tags;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_rfid_tags AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_sample_barcodes;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_sample_barcodes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_sync_records;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_sync_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_test_methods;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_test_methods AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_uncertainty_components;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_uncertainty_components AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_uncertainty_projects;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_uncertainty_projects AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.qa_lims_uncertainty_sources;
CREATE POLICY "rls_tenant_isolation" ON lims.qa_lims_uncertainty_sources AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON lims.samples;
CREATE POLICY "rls_tenant_isolation" ON lims.samples AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
