-- schema_defense 服务级补列批次 [qms]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- public.qa_qms_sync_records: +11 列
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "error_msg" TEXT;
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "payload" JSONB;
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "response" JSONB;
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "source_id" UUID;
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "sync_no" VARCHAR(64);
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "sync_type" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "target_id" UUID;
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "target_service" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- qms.qa_audit_findings: +15 列
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "category" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "finding_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "plan_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "recommendation" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "responsible" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "severity" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "target_date" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "task_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_audit_findings" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP;

-- qms.qa_audit_plans: +13 列
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "actual_end" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "actual_start" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "audit_type" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "plan_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "scheduled_end" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "scheduled_start" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "standard_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_audit_plans" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256);

-- qms.qa_audit_tasks: +10 列
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "auditor" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "finding_count" INT;
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "plan_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "task_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_audit_tasks" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256);

-- qms.qa_corrective_action_items: +8 列
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "action_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "item_name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "remark" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "responsible" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_corrective_action_items" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- qms.qa_corrective_actions: +15 列
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "action_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "action_type" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "assignee" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "issue_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "priority" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "root_cause" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "target_date" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_corrective_actions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- qms.qa_eightd_audit_logs: +6 列
ALTER TABLE IF EXISTS "qms"."qa_eightd_audit_logs" ADD COLUMN IF NOT EXISTS "action" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_eightd_audit_logs" ADD COLUMN IF NOT EXISTS "comment" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_audit_logs" ADD COLUMN IF NOT EXISTS "operator" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_eightd_audit_logs" ADD COLUMN IF NOT EXISTS "report_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_eightd_audit_logs" ADD COLUMN IF NOT EXISTS "step" VARCHAR(8);
ALTER TABLE IF EXISTS "qms"."qa_eightd_audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- qms.qa_eightd_reports: +16 列
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "assignee" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d1_leader" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d2_problem_description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d3_containment_action" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d3_implemented_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d4_cause_analysis" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d5_permanent_action" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d6_verification_result" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d6_verified_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d7_preventive_action" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d8_closed_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "d8_congratulations" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "priority" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "related_issue_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_eightd_reports" ADD COLUMN IF NOT EXISTS "severity" VARCHAR(32);

-- qms.qa_fmea_analyses: +17 列
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "fmea_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "fmea_type" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "leader" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "process_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "process_name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "product_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "revision" VARCHAR(16);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "team" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_fmea_analyses" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- qms.qa_fmea_items: +22 列
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "action_status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "component" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "current_controls" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "detection" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "failure_cause" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "failure_effect" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "failure_mode" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "fmea_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "function" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "occurrence" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "recommended_actions" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "responsible" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "revised_detection" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "revised_occurrence" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "revised_rpn" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "revised_severity" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "rpn" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "severity" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "sort_order" INT;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "target_date" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_fmea_items" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- qms.qa_inspection_audits: +7 列
ALTER TABLE IF EXISTS "qms"."qa_inspection_audits" ADD COLUMN IF NOT EXISTS "action" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_inspection_audits" ADD COLUMN IF NOT EXISTS "comment" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_inspection_audits" ADD COLUMN IF NOT EXISTS "inspection_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_inspection_audits" ADD COLUMN IF NOT EXISTS "operator" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_inspection_audits" ADD COLUMN IF NOT EXISTS "status_from" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_inspection_audits" ADD COLUMN IF NOT EXISTS "status_to" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_inspection_audits" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- qms.qa_inspection_results: +7 列
ALTER TABLE IF EXISTS "qms"."qa_inspection_results" ADD COLUMN IF NOT EXISTS "inspection_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_inspection_results" ADD COLUMN IF NOT EXISTS "is_qualified" BOOLEAN;
ALTER TABLE IF EXISTS "qms"."qa_inspection_results" ADD COLUMN IF NOT EXISTS "item_name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_inspection_results" ADD COLUMN IF NOT EXISTS "measured_value" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_inspection_results" ADD COLUMN IF NOT EXISTS "remark" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_inspection_results" ADD COLUMN IF NOT EXISTS "standard_value" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_inspection_results" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- qms.qa_qms_sync_records: +11 列
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "error_msg" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "payload" JSONB;
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "response" JSONB;
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "source_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "sync_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "sync_type" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "target_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "target_service" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_qms_sync_records" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- qms.qa_quality_costs: +12 列
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(12,2);
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "cost_category" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "cost_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "cost_type" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "department" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "incurred_date" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "related_issue_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_quality_costs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- qms.qa_quality_inspections: +19 列
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "assignee" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "inspected_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "inspection_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "inspection_type" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "inspector" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "memo" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "product_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "qualification_rate" DECIMAL(5,2);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "qualified_quantity" DECIMAL(12,2);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(12,2);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "result" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "standard_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "unqualified_quantity" DECIMAL(12,2);
ALTER TABLE IF EXISTS "qms"."qa_quality_inspections" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- qms.qa_quality_issues: +12 列
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "issue_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "related_inspection_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "severity" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "source" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_quality_issues" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- qms.qa_spc_charts: +18 列
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "chart_no" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "chart_type" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "cl" DECIMAL(12,4);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "cp" DECIMAL(8,4);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "cpk" DECIMAL(8,4);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "lcl" DECIMAL(12,4);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "parameter_name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "pp" DECIMAL(8,4);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "ppk" DECIMAL(8,4);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "product_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "sample_count" INT;
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "ucl" DECIMAL(12,4);
ALTER TABLE IF EXISTS "qms"."qa_spc_charts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- qms.qa_spc_data_points: +8 列
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "chart_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "is_out_of_control" BOOLEAN;
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "measured_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "sample_no" INT;
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "subgroup_size" INT;
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "trend_flag" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_spc_data_points" ADD COLUMN IF NOT EXISTS "value" DECIMAL(12,4);

-- qms.qa_standard_revisions: +10 列
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "category" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "level" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "specification" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "standard_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_standard_revisions" ADD COLUMN IF NOT EXISTS "version" VARCHAR(16);

-- qms.qa_standards: +12 列
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "category" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "code" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(64);
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "level" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "specification" TEXT;
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE IF EXISTS "qms"."qa_standards" ADD COLUMN IF NOT EXISTS "version" VARCHAR(16);
