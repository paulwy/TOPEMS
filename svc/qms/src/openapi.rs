// QMS 服务 OpenAPI 文档
//
// 说明：QMS 模块数量众多，此处注册 quality_standard、quality_inspection、quality_issue
// 三个核心模块的实体与路径，使 /api-docs/openapi.json 端点可用。
// 后续可逐步在各模块中添加 #[derive(ToSchema)] 并在此注册 schemas。
use utoipa::OpenApi;

use crate::models::quality_cost::{
    CostCategorySummary, CostDepartmentSummary, CostTrendItem, CreateQualityCostRequest,
    ListQualityCostsResponse, QualityCost, QualityCostQuery, QualityCostStatistics,
    UpdateQualityCostRequest,
};
use crate::models::quality_inspection::{
    AssignInspectionRequest, AuditInspectionRequest, CreateInspectionRequest, Inspection,
    InspectionAudit, InspectionResultItem, ListInspectionsResponse, SubmitInspectionResultRequest,
    UpdateInspectionRequest,
};
use crate::models::quality_issue::{
    CreateIssueRequest, QualityIssue, QualityIssueWithWorkflow, UpdateIssueRequest,
};
use crate::models::quality_standard::{
    CreateStandardRequest, ListStandardsResponse, QualityStandard, StandardRevision,
    UpdateStandardRequest,
};

// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
// =============================================================================

fn _home() {}

fn _health() {}

fn _detailed_health() {}

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            // quality_standard
            QualityStandard,
            StandardRevision,
            ListStandardsResponse,
            CreateStandardRequest,
            UpdateStandardRequest,
            // quality_inspection
            Inspection,
            InspectionAudit,
            InspectionResultItem,
            ListInspectionsResponse,
            CreateInspectionRequest,
            UpdateInspectionRequest,
            AssignInspectionRequest,
            SubmitInspectionResultRequest,
            AuditInspectionRequest,
            // quality_issue
            QualityIssue,
            QualityIssueWithWorkflow,
            CreateIssueRequest,
            UpdateIssueRequest,
            // quality_cost
            QualityCost,
            QualityCostQuery,
            ListQualityCostsResponse,
            CreateQualityCostRequest,
            UpdateQualityCostRequest,
            CostCategorySummary,
            CostDepartmentSummary,
            CostTrendItem,
            QualityCostStatistics,
        ),
    ),
    paths(
        crate::modules::quality_standard::list_standards,
        crate::modules::quality_standard::create_standard,
        crate::modules::quality_standard::get_standard,
        crate::modules::quality_standard::update_standard,
        crate::modules::quality_standard::delete_standard,
        crate::modules::quality_inspection::list_inspections,
        crate::modules::quality_inspection::create_inspection,
        crate::modules::quality_inspection::get_inspection,
        crate::modules::quality_inspection::update_inspection,
        crate::modules::quality_inspection::delete_inspection,
        crate::modules::quality_issue::list_issues,
        crate::modules::quality_issue::create_issue,
        crate::modules::quality_issue::get_issue,
        crate::modules::quality_issue::update_issue,
        crate::modules::quality_issue::delete_issue,
        // quality_cost
        crate::modules::quality_cost::list_quality_costs,
        crate::modules::quality_cost::create_quality_cost,
        crate::modules::quality_cost::get_quality_cost,
        crate::modules::quality_cost::update_quality_cost,
        crate::modules::quality_cost::delete_quality_cost,
        crate::modules::quality_cost::get_cost_statistics,
        crate::modules::quality_cost::get_cost_trend,
        crate::modules::quality_standard::list_revisions,
        crate::modules::quality_standard::create_revision,
        crate::modules::corrective_action::list_actions,
        crate::modules::corrective_action::create_action,
        crate::modules::corrective_action::get_action,
        crate::modules::corrective_action::get_action_items,
        crate::modules::corrective_action::update_action,
        crate::modules::corrective_action::complete_action,
        crate::modules::corrective_action::delete_action,
        crate::modules::audit::list_audit_plans,
        crate::modules::audit::create_audit_plan,
        crate::modules::audit::get_audit_plan,
        crate::modules::audit::schedule_audit_plan,
        crate::modules::audit::start_audit_plan,
        crate::modules::audit::complete_audit_plan,
        crate::modules::audit::list_audit_tasks,
        crate::modules::audit::create_audit_task,
        crate::modules::audit::complete_audit_task,
        crate::modules::audit::list_audit_findings,
        crate::modules::audit::create_audit_finding,
        crate::modules::audit::verify_audit_finding,
        crate::modules::quality_inspection::submit_result,
        crate::modules::quality_inspection::audit_inspection,
        crate::modules::quality_inspection::rework_inspection,
        crate::modules::quality_inspection::get_inspection_results,
        crate::modules::quality_inspection::get_inspection_audits,
        crate::modules::quality_inspection::approve_inspection,
        crate::modules::quality_inspection::reject_inspection,
        crate::modules::data_sync::list_sync_records,
        crate::modules::data_sync::get_sync_record,
        crate::modules::data_sync::sync_inspection_to_lims,
        crate::modules::data_sync::sync_issue_to_ehs,
        crate::modules::data_sync::retry_sync,
        crate::modules::data_sync::delete_sync_record,
        crate::modules::fmea::list_fmea_analyses,
        crate::modules::fmea::create_fmea_analysis,
        crate::modules::fmea::get_fmea_analysis,
        crate::modules::fmea::update_fmea_analysis,
        crate::modules::fmea::delete_fmea_analysis,
        crate::modules::fmea::list_fmea_items,
        crate::modules::fmea::create_fmea_item,
        crate::modules::fmea::get_fmea_item,
        crate::modules::fmea::update_fmea_item,
        crate::modules::fmea::delete_fmea_item,
        crate::modules::fmea::get_fmea_statistics,
        crate::modules::quality_dashboard::get_quality_overview,
        crate::modules::quality_dashboard::get_quality_trend,
        crate::modules::quality_dashboard::get_defect_distribution,
        crate::modules::quality_dashboard::list_alert_rules,
        crate::modules::quality_dashboard::create_alert_rule,
        crate::modules::quality_dashboard::get_alert_rule,
        crate::modules::quality_dashboard::update_alert_rule,
        crate::modules::quality_dashboard::delete_alert_rule,
        crate::modules::quality_dashboard::list_alert_messages,
        crate::modules::quality_dashboard::create_alert_message,
        crate::modules::quality_dashboard::acknowledge_alert,
        crate::modules::quality_issue::approve_issue,
        crate::modules::quality_issue::reject_issue,
        crate::modules::quality_issue::approve_issue_status,
        crate::modules::quality_issue::reject_issue_status,
        crate::modules::quality_issue::cancel_issue,
        crate::modules::spc::list_spc_charts,
        crate::modules::spc::create_spc_chart,
        crate::modules::spc::get_spc_chart,
        crate::modules::spc::update_spc_chart,
        crate::modules::spc::delete_spc_chart,
        crate::modules::spc::get_spc_data_points,
        crate::modules::spc::add_spc_data_point,
        crate::modules::spc::calculate_control_limits,
        crate::modules::eight_d::list_eightd_reports,
        crate::modules::eight_d::create_eightd_report,
        crate::modules::eight_d::get_eightd_report,
        crate::modules::eight_d::update_eightd_report,
        crate::modules::eight_d::delete_eightd_report,
        crate::modules::eight_d::update_d1_team,
        crate::modules::eight_d::submit_d3_containment,
        crate::modules::eight_d::submit_d4_root_cause,
        crate::modules::eight_d::submit_d5_permanent_action,
        crate::modules::eight_d::verify_d6_effectiveness,
        crate::modules::eight_d::submit_d7_preventive,
        crate::modules::eight_d::close_eightd_report,
        crate::modules::eight_d::get_eightd_audit_logs,
        crate::modules::eight_d::approve_eightd,
        crate::modules::eight_d::close_eightd_approval,
        crate::modules::eight_d::cancel_eightd,
        crate::modules::dashboard::get_today_quality_pass_rate,
        crate::modules::dashboard::get_dashboard_stats,
        crate::modules::apqp::list_apqp_projects,
        crate::modules::apqp::create_apqp_project,
        crate::modules::apqp::get_apqp_project,
        crate::modules::apqp::update_apqp_project,
        crate::modules::apqp::delete_apqp_project,
        crate::modules::apqp::transition_project_status,
        crate::modules::apqp::list_apqp_phases,
        crate::modules::apqp::create_apqp_phase,
        crate::modules::apqp::get_apqp_phase,
        crate::modules::apqp::update_apqp_phase,
        crate::modules::apqp::delete_apqp_phase,
        crate::modules::apqp::list_apqp_tasks,
        crate::modules::apqp::create_apqp_task,
        crate::modules::apqp::get_apqp_task,
        crate::modules::apqp::update_apqp_task,
        crate::modules::apqp::delete_apqp_task,
        crate::modules::apqp::list_apqp_risks,
        crate::modules::apqp::create_apqp_risk,
        crate::modules::apqp::get_apqp_risk,
        crate::modules::apqp::update_apqp_risk,
        crate::modules::apqp::delete_apqp_risk,
        crate::modules::apqp::get_apqp_progress,
        crate::modules::apqp::list_apqp_approvals,
        crate::modules::apqp::create_apqp_approval,
        crate::modules::apqp::process_apqp_approval,
        crate::modules::apqp::approve_apqp,
        crate::modules::apqp::complete_apqp,
        crate::modules::apqp::cancel_apqp,
        crate::modules::quality_inspection::assign_inspection,
        crate::modules::quality_issue::resolve_issue,
        crate::modules::quality_issue::start_issue_approval,
        crate::modules::qms_plugin::get_plugin_info,
        crate::modules::qms_plugin::plugin_health_check,
        crate::modules::quality_task::list_quality_tasks,
        crate::modules::quality_task::get_quality_task,
        crate::modules::quality_task::list_defect_records,
        crate::modules::inspection_standard::list_inspection_items,
        crate::modules::inspection_standard::get_inspection_item,
        crate::modules::inspection_standard::create_inspection_item,
        crate::modules::inspection_standard::update_inspection_item,
        crate::modules::inspection_standard::delete_inspection_item,
        crate::modules::inspection_standard::list_sampling_plans,
        crate::modules::inspection_standard::get_sampling_plan,
        crate::modules::inspection_standard::create_sampling_plan,
        crate::modules::inspection_standard::update_sampling_plan,
        crate::modules::inspection_standard::delete_sampling_plan,
        crate::modules::inspection_standard::list_inspection_plans,
        crate::modules::inspection_standard::get_inspection_plan,
        crate::modules::inspection_standard::create_inspection_plan,
        crate::modules::inspection_standard::update_inspection_plan,
        crate::modules::inspection_standard::delete_inspection_plan,
        crate::modules::inspection_standard::list_plan_items,
        crate::modules::inspection_standard::add_plan_item,
        crate::modules::inspection_standard::remove_plan_item,
        crate::modules::qms_plugin::qms_health,
        crate::modules::spc::get_spc_chart_data_points,
        crate::modules::spc::calculate_spc_chart_limits,
    ),
    tags(
        (name = "quality_standard", description = "质量标准 API"),
        (name = "quality_inspection", description = "质量检验 API"),
        (name = "quality_issue", description = "质量问题 API"),
        (name = "quality_cost", description = "质量成本 API"),
        (name = "apqp", description = "产品质量先期策划 API"),
        (name = "fmea", description = "失效模式分析 API"),
        (name = "eight_d", description = "8D 报告 API"),
        (name = "corrective_action", description = "纠正措施 API"),
        (name = "spc", description = "统计过程控制 API"),
        (name = "dashboard", description = "质量仪表盘 API"),
    ),
    info(
        title = "TOPEMS QMS API",
        version = "1.0.0",
        description = "质量管理系统 API - 包含质量标准、检验、问题、成本、APQP、FMEA、8D、纠正措施、SPC 等"
    )
)]
pub struct QmsApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = QmsApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        let out_path = std::env::temp_dir().join("topems-qms-openapi.json");
        std::fs::write(&out_path, json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to {:?}", out_path);
    }
}
