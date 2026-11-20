-- 20261120230000: qms 30 张运行期表收口（W2-D2 第十一个模块）
--
-- 背景：svc/qms/src/models/schema_defense.rs 的 TABLE_DEFS 声明 30 张表（406 列），
-- 启动时由 modules::run_schema_defense 调用 shared-db 的 run_schema_defense 逐列补列。
-- 30 张表在 baseline+forward 库中全部存在；qa_approval_events / qa_ehs_hazards /
-- quality_standards 由既有迁移维护，不在 TABLE_DEFS 名单内，本迁移不纳入。
-- 20261119110000_drop_dead_tables_batch2 删除的 qms.audit_logs/corrective_actions/
-- dashboard_metrics/inspection_items/quality_inspections/quality_issues 为无 qa_ 前缀的
-- 旧表，与本迁移的 qa_* 表不同名，不冲突。
-- 以 live 真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

CREATE SCHEMA IF NOT EXISTS qms;

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

CREATE TABLE IF NOT EXISTS qms.qa_alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name character varying NOT NULL,
    alert_type character varying NOT NULL,
    metric character varying NOT NULL,
    condition character varying NOT NULL,
    threshold numeric NOT NULL,
    duration integer,
    severity character varying,
    status character varying DEFAULT 'active'::character varying,
    notification_type character varying,
    recipients text,
    description text,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    name text DEFAULT ''::text NOT NULL,
    sequence integer DEFAULT 0,
    planned_start timestamp with time zone,
    planned_end timestamp with time zone,
    actual_start timestamp with time zone,
    actual_end timestamp with time zone,
    deliverables jsonb,
    created_by uuid
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    risk_code text,
    title text DEFAULT ''::text NOT NULL,
    risk_type text,
    probability integer DEFAULT 1,
    impact integer DEFAULT 1,
    mitigation text,
    created_by uuid
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    task_code text,
    name text DEFAULT ''::text NOT NULL,
    assignee_id uuid,
    created_by uuid
);

CREATE TABLE IF NOT EXISTS qms.qa_audit_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    finding_no character varying(64) NOT NULL,
    task_id uuid,
    plan_id uuid,
    title character varying(256) NOT NULL,
    description text,
    severity character varying(32) DEFAULT 'minor'::character varying,
    category character varying(64),
    status character varying(32) DEFAULT 'open'::character varying,
    recommendation text,
    responsible character varying(64),
    target_date timestamp with time zone,
    verified_at timestamp with time zone,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_audit_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    audit_type character varying(32) NOT NULL,
    scope text,
    standard_id uuid,
    status character varying(32) DEFAULT 'draft'::character varying,
    scheduled_start text,
    scheduled_end text,
    actual_start text,
    actual_end text,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_audit_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_no character varying(64) NOT NULL,
    plan_id uuid NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    auditor character varying(64),
    status character varying(32) DEFAULT 'pending'::character varying,
    completed_at timestamp with time zone,
    finding_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_corrective_action_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    item_name character varying(256) NOT NULL,
    responsible character varying(64),
    due_date timestamp with time zone,
    status character varying(32) DEFAULT 'pending'::character varying,
    completed_at timestamp with time zone,
    remark text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_corrective_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_no character varying(64) NOT NULL,
    issue_id uuid,
    title character varying(256) NOT NULL,
    description text,
    root_cause text,
    action_type character varying(32),
    status character varying(32) DEFAULT 'pending'::character varying,
    priority character varying(32) DEFAULT 'medium'::character varying,
    assignee character varying(64),
    target_date text,
    completed_at text,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    related_issue_type text
);

CREATE TABLE IF NOT EXISTS qms.qa_eightd_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    action character varying(32) NOT NULL,
    step character varying(8),
    operator character varying(64),
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_eightd_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    status character varying(32) DEFAULT 'new'::character varying,
    severity character varying(32),
    priority character varying(32),
    related_issue_id uuid,
    d1_team text,
    d1_leader character varying(64),
    d2_problem_description text,
    d3_containment_action text,
    d3_implemented_at timestamp with time zone,
    d4_root_cause text,
    d4_cause_analysis text,
    d5_permanent_action text,
    d6_verification_result text,
    d6_verified_at timestamp with time zone,
    d7_preventive_action text,
    d8_congratulations text,
    d8_closed_at timestamp with time zone,
    assignee character varying(64),
    due_date timestamp with time zone,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    description text,
    d2_description jsonb,
    d3_interim jsonb,
    d5_corrective jsonb,
    d6_implement jsonb,
    d7_prevent jsonb,
    d8_celebrate jsonb
);

CREATE TABLE IF NOT EXISTS qms.qa_fmea_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fmea_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    fmea_type character varying(32) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    process_id uuid,
    process_name character varying(256),
    scope text,
    status character varying(32) DEFAULT 'draft'::character varying,
    revision character varying(16),
    team text,
    leader character varying(64),
    description text,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS qms.qa_fmea_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fmea_id uuid NOT NULL,
    component character varying(256) NOT NULL,
    function character varying(256),
    failure_mode character varying(256) NOT NULL,
    failure_effect text,
    failure_cause text,
    severity integer DEFAULT 1 NOT NULL,
    occurrence integer DEFAULT 1 NOT NULL,
    detection integer DEFAULT 1 NOT NULL,
    rpn integer,
    current_controls text,
    recommended_actions text,
    responsible character varying(64),
    target_date timestamp with time zone,
    action_status character varying(32) DEFAULT 'open'::character varying,
    revised_severity integer,
    revised_occurrence integer,
    revised_detection integer,
    revised_rpn integer,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_inspection_audits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspection_id uuid NOT NULL,
    status_from character varying(32) NOT NULL,
    status_to character varying(32) NOT NULL,
    action character varying(64) NOT NULL,
    operator character varying(64) NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_inspection_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(64),
    specification text,
    method character varying(255),
    unit character varying(32),
    standard_value character varying(128),
    tolerance character varying(64),
    status character varying(32) DEFAULT 'active'::character varying,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_inspection_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    item_id uuid NOT NULL,
    sample_qty integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qms.qa_inspection_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    product_code character varying(128),
    product_name character varying(255),
    sampling_plan_id uuid,
    status character varying(32) DEFAULT 'active'::character varying,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_inspection_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspection_id uuid NOT NULL,
    item_name character varying(256) NOT NULL,
    standard_value character varying(256),
    measured_value character varying(256),
    is_qualified boolean NOT NULL,
    remark text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    item_name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS qms.qa_qms_sync_records (
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
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_quality_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cost_no character varying(64) NOT NULL,
    cost_category character varying(32) NOT NULL,
    cost_type character varying(64),
    amount numeric(12,2) NOT NULL,
    department character varying(64),
    description text,
    related_issue_id uuid,
    incurred_date timestamp with time zone,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS qms.qa_quality_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inspection_no character varying(64) NOT NULL,
    inspection_type character varying(32) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    standard_id uuid,
    quantity numeric(12,2) NOT NULL,
    qualified_quantity numeric(12,2),
    unqualified_quantity numeric(12,2),
    qualification_rate numeric(5,2),
    status character varying(32) DEFAULT 'pending'::character varying,
    inspector character varying(64),
    assignee character varying(64),
    inspected_at timestamp with time zone,
    result character varying(32),
    memo text,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    product_name_en character varying(255),
    test_data jsonb
);

CREATE TABLE IF NOT EXISTS qms.qa_quality_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    severity character varying(32),
    status character varying(32) DEFAULT 'open'::character varying,
    source character varying(32),
    related_inspection_id uuid,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    title_en character varying(255)
);

CREATE TABLE IF NOT EXISTS qms.qa_sampling_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    level character varying(64),
    sample_size integer,
    aql character varying(32),
    inspection_level character varying(32),
    status character varying(32) DEFAULT 'active'::character varying,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_spc_charts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chart_no character varying(64) NOT NULL,
    chart_type character varying(32) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    parameter_name character varying(256) NOT NULL,
    ucl numeric(12,4),
    cl numeric(12,4),
    lcl numeric(12,4),
    cp numeric(8,4),
    cpk numeric(8,4),
    pp numeric(8,4),
    ppk numeric(8,4),
    sample_count integer DEFAULT 0,
    status character varying(32) DEFAULT 'active'::character varying,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    chart_name character varying(256),
    process_name character varying(256),
    unit character varying(32),
    usl numeric(12,4),
    lsl numeric(12,4),
    target numeric(12,4),
    sample_size integer,
    sampling_frequency character varying(128),
    description text
);

CREATE TABLE IF NOT EXISTS qms.qa_spc_data_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chart_id uuid NOT NULL,
    sample_no integer NOT NULL,
    value numeric(12,4) NOT NULL,
    subgroup_size integer,
    is_out_of_control boolean DEFAULT false,
    trend_flag character varying(32),
    measured_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    mean numeric(12,4),
    range numeric(12,4),
    operator character varying(64),
    remark text
);

CREATE TABLE IF NOT EXISTS qms.qa_standard_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    standard_id uuid NOT NULL,
    version character varying(16) NOT NULL,
    name character varying(256) NOT NULL,
    category character varying(64) NOT NULL,
    level character varying(32),
    specification text,
    description text,
    status character varying(32),
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS qms.qa_standards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    category character varying(64) NOT NULL,
    level character varying(32),
    specification text,
    description text,
    version character varying(16) DEFAULT '1.0'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_by character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE INDEX IF NOT EXISTS idx_qa_alert_messages_severity ON qms.qa_alert_messages USING btree (severity);
CREATE INDEX IF NOT EXISTS idx_qa_alert_messages_status ON qms.qa_alert_messages USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_alert_rules_status ON qms.qa_alert_rules USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_alert_rules_type ON qms.qa_alert_rules USING btree (alert_type);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_approvals_project ON qms.qa_apqp_approvals USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_approvals_project_id ON qms.qa_apqp_approvals USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_approvals_status ON qms.qa_apqp_approvals USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_phases_project ON qms.qa_apqp_phases USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_phases_project_id ON qms.qa_apqp_phases USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_phases_status ON qms.qa_apqp_phases USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_projects_created_at ON qms.qa_apqp_projects USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_projects_no ON qms.qa_apqp_projects USING btree (project_no);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_projects_status ON qms.qa_apqp_projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_risks_project ON qms.qa_apqp_risks USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_risks_project_id ON qms.qa_apqp_risks USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_risks_rpn ON qms.qa_apqp_risks USING btree (rpn);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_risks_status ON qms.qa_apqp_risks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_phase ON qms.qa_apqp_tasks USING btree (phase_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_phase_id ON qms.qa_apqp_tasks USING btree (phase_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_project ON qms.qa_apqp_tasks USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_project_id ON qms.qa_apqp_tasks USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_status ON qms.qa_apqp_tasks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_audit_findings_no ON qms.qa_audit_findings USING btree (finding_no);
CREATE INDEX IF NOT EXISTS idx_qa_audit_findings_plan ON qms.qa_audit_findings USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_audit_findings_status ON qms.qa_audit_findings USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_audit_plans_no ON qms.qa_audit_plans USING btree (plan_no);
CREATE INDEX IF NOT EXISTS idx_qa_audit_plans_status ON qms.qa_audit_plans USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_audit_tasks_plan ON qms.qa_audit_tasks USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_audit_tasks_status ON qms.qa_audit_tasks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_action_items_action ON qms.qa_corrective_action_items USING btree (action_id);
CREATE INDEX IF NOT EXISTS idx_qa_actions_issue ON qms.qa_corrective_actions USING btree (issue_id);
CREATE INDEX IF NOT EXISTS idx_qa_actions_no ON qms.qa_corrective_actions USING btree (action_no);
CREATE INDEX IF NOT EXISTS idx_qa_actions_status ON qms.qa_corrective_actions USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_qa_corrective_actions_no ON qms.qa_corrective_actions USING btree (action_no);
CREATE INDEX IF NOT EXISTS idx_qa_eightd_audit_logs_report ON qms.qa_eightd_audit_logs USING btree (report_id);
CREATE INDEX IF NOT EXISTS idx_qa_eightd_reports_no ON qms.qa_eightd_reports USING btree (report_no);
CREATE INDEX IF NOT EXISTS idx_qa_eightd_reports_status ON qms.qa_eightd_reports USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_fmea_analyses_no ON qms.qa_fmea_analyses USING btree (fmea_no);
CREATE INDEX IF NOT EXISTS idx_qa_fmea_analyses_status ON qms.qa_fmea_analyses USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_fmea_items_fmea ON qms.qa_fmea_items USING btree (fmea_id);
CREATE INDEX IF NOT EXISTS idx_qa_fmea_items_rpn ON qms.qa_fmea_items USING btree (rpn);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_audits_inspection ON qms.qa_inspection_audits USING btree (inspection_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_items_tenant_id ON qms.qa_inspection_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_plan_items_plan_id ON qms.qa_inspection_plan_items USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_plans_sampling_plan_id ON qms.qa_inspection_plans USING btree (sampling_plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_plans_tenant_id ON qms.qa_inspection_plans USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_results_inspection ON qms.qa_inspection_results USING btree (inspection_id);
CREATE INDEX IF NOT EXISTS idx_qa_qms_sync_no ON qms.qa_qms_sync_records USING btree (sync_no);
CREATE INDEX IF NOT EXISTS idx_qa_qms_sync_status ON qms.qa_qms_sync_records USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_qms_sync_type ON qms.qa_qms_sync_records USING btree (sync_type);
CREATE INDEX IF NOT EXISTS idx_qa_quality_costs_category ON qms.qa_quality_costs USING btree (cost_category);
CREATE INDEX IF NOT EXISTS idx_qa_quality_costs_dept ON qms.qa_quality_costs USING btree (department);
CREATE INDEX IF NOT EXISTS idx_qa_quality_costs_no ON qms.qa_quality_costs USING btree (cost_no);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_created_at ON qms.qa_quality_inspections USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_inspector ON qms.qa_quality_inspections USING btree (inspector);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_no ON qms.qa_quality_inspections USING btree (inspection_no);
CREATE INDEX IF NOT EXISTS idx_qa_inspections_status ON qms.qa_quality_inspections USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_issues_created_at ON qms.qa_quality_issues USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_qa_issues_no ON qms.qa_quality_issues USING btree (issue_no);
CREATE INDEX IF NOT EXISTS idx_qa_issues_status ON qms.qa_quality_issues USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qa_sampling_plans_tenant_id ON qms.qa_sampling_plans USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_spc_charts_no ON qms.qa_spc_charts USING btree (chart_no);
CREATE INDEX IF NOT EXISTS idx_qa_spc_charts_type ON qms.qa_spc_charts USING btree (chart_type);
CREATE INDEX IF NOT EXISTS idx_qa_spc_data_points_chart ON qms.qa_spc_data_points USING btree (chart_id);
CREATE INDEX IF NOT EXISTS idx_qa_standard_revisions_standard ON qms.qa_standard_revisions USING btree (standard_id);
CREATE INDEX IF NOT EXISTS idx_qa_standards_code ON qms.qa_standards USING btree (code);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_alert_messages'::regclass AND conname='qa_alert_messages_pkey') THEN
        ALTER TABLE qms.qa_alert_messages ADD CONSTRAINT "qa_alert_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_alert_rules'::regclass AND conname='qa_alert_rules_pkey') THEN
        ALTER TABLE qms.qa_alert_rules ADD CONSTRAINT "qa_alert_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_approvals'::regclass AND conname='qa_apqp_approvals_pkey') THEN
        ALTER TABLE qms.qa_apqp_approvals ADD CONSTRAINT "qa_apqp_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_phases'::regclass AND conname='qa_apqp_phases_pkey') THEN
        ALTER TABLE qms.qa_apqp_phases ADD CONSTRAINT "qa_apqp_phases_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_projects'::regclass AND conname='qa_apqp_projects_pkey') THEN
        ALTER TABLE qms.qa_apqp_projects ADD CONSTRAINT "qa_apqp_projects_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_risks'::regclass AND conname='qa_apqp_risks_pkey') THEN
        ALTER TABLE qms.qa_apqp_risks ADD CONSTRAINT "qa_apqp_risks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_tasks'::regclass AND conname='qa_apqp_tasks_pkey') THEN
        ALTER TABLE qms.qa_apqp_tasks ADD CONSTRAINT "qa_apqp_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_audit_findings'::regclass AND conname='qa_audit_findings_pkey') THEN
        ALTER TABLE qms.qa_audit_findings ADD CONSTRAINT "qa_audit_findings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_audit_plans'::regclass AND conname='qa_audit_plans_pkey') THEN
        ALTER TABLE qms.qa_audit_plans ADD CONSTRAINT "qa_audit_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_audit_tasks'::regclass AND conname='qa_audit_tasks_pkey') THEN
        ALTER TABLE qms.qa_audit_tasks ADD CONSTRAINT "qa_audit_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_corrective_action_items'::regclass AND conname='qa_corrective_action_items_pkey') THEN
        ALTER TABLE qms.qa_corrective_action_items ADD CONSTRAINT "qa_corrective_action_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_corrective_actions'::regclass AND conname='qa_corrective_actions_pkey') THEN
        ALTER TABLE qms.qa_corrective_actions ADD CONSTRAINT "qa_corrective_actions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_eightd_audit_logs'::regclass AND conname='qa_eightd_audit_logs_pkey') THEN
        ALTER TABLE qms.qa_eightd_audit_logs ADD CONSTRAINT "qa_eightd_audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_eightd_reports'::regclass AND conname='qa_eightd_reports_pkey') THEN
        ALTER TABLE qms.qa_eightd_reports ADD CONSTRAINT "qa_eightd_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_fmea_analyses'::regclass AND conname='qa_fmea_analyses_pkey') THEN
        ALTER TABLE qms.qa_fmea_analyses ADD CONSTRAINT "qa_fmea_analyses_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_fmea_items'::regclass AND conname='qa_fmea_items_pkey') THEN
        ALTER TABLE qms.qa_fmea_items ADD CONSTRAINT "qa_fmea_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_audits'::regclass AND conname='qa_inspection_audits_pkey') THEN
        ALTER TABLE qms.qa_inspection_audits ADD CONSTRAINT "qa_inspection_audits_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_items'::regclass AND conname='qa_inspection_items_pkey') THEN
        ALTER TABLE qms.qa_inspection_items ADD CONSTRAINT "qa_inspection_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_plan_items'::regclass AND conname='qa_inspection_plan_items_pkey') THEN
        ALTER TABLE qms.qa_inspection_plan_items ADD CONSTRAINT "qa_inspection_plan_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_plans'::regclass AND conname='qa_inspection_plans_pkey') THEN
        ALTER TABLE qms.qa_inspection_plans ADD CONSTRAINT "qa_inspection_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_results'::regclass AND conname='qa_inspection_results_pkey') THEN
        ALTER TABLE qms.qa_inspection_results ADD CONSTRAINT "qa_inspection_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_qms_sync_records'::regclass AND conname='qa_qms_sync_records_pkey') THEN
        ALTER TABLE qms.qa_qms_sync_records ADD CONSTRAINT "qa_qms_sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_quality_costs'::regclass AND conname='qa_quality_costs_pkey') THEN
        ALTER TABLE qms.qa_quality_costs ADD CONSTRAINT "qa_quality_costs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_quality_inspections'::regclass AND conname='qa_quality_inspections_pkey') THEN
        ALTER TABLE qms.qa_quality_inspections ADD CONSTRAINT "qa_quality_inspections_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_quality_issues'::regclass AND conname='qa_quality_issues_pkey') THEN
        ALTER TABLE qms.qa_quality_issues ADD CONSTRAINT "qa_quality_issues_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_sampling_plans'::regclass AND conname='qa_sampling_plans_pkey') THEN
        ALTER TABLE qms.qa_sampling_plans ADD CONSTRAINT "qa_sampling_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_spc_charts'::regclass AND conname='qa_spc_charts_pkey') THEN
        ALTER TABLE qms.qa_spc_charts ADD CONSTRAINT "qa_spc_charts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_spc_data_points'::regclass AND conname='qa_spc_data_points_pkey') THEN
        ALTER TABLE qms.qa_spc_data_points ADD CONSTRAINT "qa_spc_data_points_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_standard_revisions'::regclass AND conname='qa_standard_revisions_pkey') THEN
        ALTER TABLE qms.qa_standard_revisions ADD CONSTRAINT "qa_standard_revisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_standards'::regclass AND conname='qa_standards_pkey') THEN
        ALTER TABLE qms.qa_standards ADD CONSTRAINT "qa_standards_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_projects'::regclass AND conname='qa_apqp_projects_project_no_key') THEN
        ALTER TABLE qms.qa_apqp_projects ADD CONSTRAINT "qa_apqp_projects_project_no_key" UNIQUE (project_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_eightd_reports'::regclass AND conname='qa_eightd_reports_report_no_key') THEN
        ALTER TABLE qms.qa_eightd_reports ADD CONSTRAINT "qa_eightd_reports_report_no_key" UNIQUE (report_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_fmea_analyses'::regclass AND conname='qa_fmea_analyses_fmea_no_key') THEN
        ALTER TABLE qms.qa_fmea_analyses ADD CONSTRAINT "qa_fmea_analyses_fmea_no_key" UNIQUE (fmea_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_items'::regclass AND conname='qa_inspection_items_tenant_id_code_key') THEN
        ALTER TABLE qms.qa_inspection_items ADD CONSTRAINT "qa_inspection_items_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_plan_items'::regclass AND conname='qa_inspection_plan_items_plan_id_item_id_key') THEN
        ALTER TABLE qms.qa_inspection_plan_items ADD CONSTRAINT "qa_inspection_plan_items_plan_id_item_id_key" UNIQUE (plan_id, item_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_plans'::regclass AND conname='qa_inspection_plans_tenant_id_code_key') THEN
        ALTER TABLE qms.qa_inspection_plans ADD CONSTRAINT "qa_inspection_plans_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_qms_sync_records'::regclass AND conname='qa_qms_sync_records_sync_no_key') THEN
        ALTER TABLE qms.qa_qms_sync_records ADD CONSTRAINT "qa_qms_sync_records_sync_no_key" UNIQUE (sync_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_quality_costs'::regclass AND conname='qa_quality_costs_cost_no_key') THEN
        ALTER TABLE qms.qa_quality_costs ADD CONSTRAINT "qa_quality_costs_cost_no_key" UNIQUE (cost_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_quality_inspections'::regclass AND conname='qa_quality_inspections_inspection_no_key') THEN
        ALTER TABLE qms.qa_quality_inspections ADD CONSTRAINT "qa_quality_inspections_inspection_no_key" UNIQUE (inspection_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_quality_issues'::regclass AND conname='qa_quality_issues_issue_no_key') THEN
        ALTER TABLE qms.qa_quality_issues ADD CONSTRAINT "qa_quality_issues_issue_no_key" UNIQUE (issue_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_sampling_plans'::regclass AND conname='qa_sampling_plans_tenant_id_code_key') THEN
        ALTER TABLE qms.qa_sampling_plans ADD CONSTRAINT "qa_sampling_plans_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_spc_charts'::regclass AND conname='qa_spc_charts_chart_no_key') THEN
        ALTER TABLE qms.qa_spc_charts ADD CONSTRAINT "qa_spc_charts_chart_no_key" UNIQUE (chart_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_standards'::regclass AND conname='qa_standards_code_key') THEN
        ALTER TABLE qms.qa_standards ADD CONSTRAINT "qa_standards_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_alert_messages'::regclass AND conname='ck_qa_alert_messages_status_standard') THEN
        ALTER TABLE qms.qa_alert_messages ADD CONSTRAINT "ck_qa_alert_messages_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,open,pending,acknowledged}'::text[]))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_approvals'::regclass AND conname='qa_apqp_approvals_project_id_fkey') THEN
        ALTER TABLE qms.qa_apqp_approvals ADD CONSTRAINT "qa_apqp_approvals_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_phases'::regclass AND conname='qa_apqp_phases_project_id_fkey') THEN
        ALTER TABLE qms.qa_apqp_phases ADD CONSTRAINT "qa_apqp_phases_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_risks'::regclass AND conname='qa_apqp_risks_project_id_fkey') THEN
        ALTER TABLE qms.qa_apqp_risks ADD CONSTRAINT "qa_apqp_risks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_tasks'::regclass AND conname='qa_apqp_tasks_phase_id_fkey') THEN
        ALTER TABLE qms.qa_apqp_tasks ADD CONSTRAINT "qa_apqp_tasks_phase_id_fkey" FOREIGN KEY (phase_id) REFERENCES qms.qa_apqp_phases(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_apqp_tasks'::regclass AND conname='qa_apqp_tasks_project_id_fkey') THEN
        ALTER TABLE qms.qa_apqp_tasks ADD CONSTRAINT "qa_apqp_tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES qms.qa_apqp_projects(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_plan_items'::regclass AND conname='qa_inspection_plan_items_item_id_fkey') THEN
        ALTER TABLE qms.qa_inspection_plan_items ADD CONSTRAINT "qa_inspection_plan_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES qms.qa_inspection_items(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_plan_items'::regclass AND conname='qa_inspection_plan_items_plan_id_fkey') THEN
        ALTER TABLE qms.qa_inspection_plan_items ADD CONSTRAINT "qa_inspection_plan_items_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES qms.qa_inspection_plans(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='qms.qa_inspection_plans'::regclass AND conname='qa_inspection_plans_sampling_plan_id_fkey') THEN
        ALTER TABLE qms.qa_inspection_plans ADD CONSTRAINT "qa_inspection_plans_sampling_plan_id_fkey" FOREIGN KEY (sampling_plan_id) REFERENCES qms.qa_sampling_plans(id) ON DELETE SET NULL;
    END IF;
END $$;


ALTER TABLE qms.qa_alert_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_alert_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_alert_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_phases FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_risks FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_apqp_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_audit_findings FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_audit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_audit_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_audit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_audit_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_corrective_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_corrective_action_items FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_corrective_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_eightd_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_eightd_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_eightd_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_eightd_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_fmea_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_fmea_analyses FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_fmea_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_fmea_items FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_audits FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_items FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_inspection_results FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_qms_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_qms_sync_records FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_quality_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_quality_costs FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_quality_inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_quality_issues FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_sampling_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_sampling_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_spc_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_spc_charts FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_spc_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_spc_data_points FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_standard_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_standard_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms.qa_standards FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_alert_messages;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_alert_messages AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_alert_rules;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_alert_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_apqp_phases;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_apqp_phases AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_apqp_projects;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_apqp_projects AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_apqp_risks;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_apqp_risks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_apqp_tasks;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_apqp_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_audit_findings;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_audit_findings AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_audit_plans;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_audit_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_audit_tasks;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_audit_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_corrective_action_items;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_corrective_action_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_corrective_actions;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_corrective_actions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_eightd_audit_logs;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_eightd_audit_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_eightd_reports;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_eightd_reports AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_fmea_analyses;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_fmea_analyses AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_fmea_items;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_fmea_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_inspection_audits;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_inspection_audits AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_inspection_items;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_inspection_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_inspection_plans;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_inspection_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_inspection_results;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_inspection_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_qms_sync_records;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_qms_sync_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_quality_costs;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_quality_costs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_quality_inspections;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_quality_inspections AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_quality_issues;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_quality_issues AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_sampling_plans;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_sampling_plans AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_spc_charts;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_spc_charts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_spc_data_points;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_spc_data_points AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_standard_revisions;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_standard_revisions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON qms.qa_standards;
CREATE POLICY "rls_tenant_isolation" ON qms.qa_standards AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
