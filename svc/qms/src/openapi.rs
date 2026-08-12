// QMS 服务 OpenAPI 文档
//
// 说明：QMS 模块数量众多，此处注册 quality_standard、quality_inspection、quality_issue
// 三个核心模块的实体与路径，使 /api-docs/openapi.json 端点可用。
// 后续可逐步在各模块中添加 #[derive(ToSchema)] 并在此注册 schemas。
use utoipa::OpenApi;

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
use crate::modules::qms_compat;

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
        // QMS compatibility paths
        qms_compat::compat_post_api_qms_actions,
        qms_compat::compat_get_api_qms_actions_actionid_items,
        qms_compat::compat_delete_api_qms_actions_id,
        qms_compat::compat_get_api_qms_actions_id,
        qms_compat::compat_put_api_qms_actions_id,
        qms_compat::compat_post_api_qms_actions_id_complete,
        qms_compat::compat_post_api_qms_apqp_approvals,
        qms_compat::compat_post_api_qms_apqp_approvals_id_process,
        qms_compat::compat_post_api_qms_apqp_phases,
        qms_compat::compat_delete_api_qms_apqp_phases_id,
        qms_compat::compat_get_api_qms_apqp_phases_id,
        qms_compat::compat_put_api_qms_apqp_phases_id,
        qms_compat::compat_get_api_qms_apqp_projects,
        qms_compat::compat_post_api_qms_apqp_projects,
        qms_compat::compat_delete_api_qms_apqp_projects_id,
        qms_compat::compat_get_api_qms_apqp_projects_id,
        qms_compat::compat_put_api_qms_apqp_projects_id,
        qms_compat::compat_get_api_qms_apqp_projects_id_progress,
        qms_compat::compat_post_api_qms_apqp_projects_id_transition,
        qms_compat::compat_get_api_qms_apqp_risks,
        qms_compat::compat_post_api_qms_apqp_risks,
        qms_compat::compat_delete_api_qms_apqp_risks_id,
        qms_compat::compat_get_api_qms_apqp_risks_id,
        qms_compat::compat_put_api_qms_apqp_risks_id,
        qms_compat::compat_get_api_qms_apqp_tasks,
        qms_compat::compat_post_api_qms_apqp_tasks,
        qms_compat::compat_delete_api_qms_apqp_tasks_id,
        qms_compat::compat_get_api_qms_apqp_tasks_id,
        qms_compat::compat_put_api_qms_apqp_tasks_id,
        qms_compat::compat_post_api_qms_audit_findings,
        qms_compat::compat_post_api_qms_audit_findings_findingid_verify,
        qms_compat::compat_get_api_qms_audit_plans,
        qms_compat::compat_post_api_qms_audit_plans,
        qms_compat::compat_post_api_qms_audit_plans_id_complete,
        qms_compat::compat_post_api_qms_audit_plans_id_start,
        qms_compat::compat_post_api_qms_audit_tasks,
        qms_compat::compat_put_api_qms_audit_tasks_taskid_complete,
        qms_compat::compat_post_api_qms_checks_id_assign,
        qms_compat::compat_post_api_qms_checks_id_audit,
        qms_compat::compat_get_api_qms_checks_id_audits,
        qms_compat::compat_get_api_qms_checks_id_results,
        qms_compat::compat_post_api_qms_checks_id_rework,
        qms_compat::compat_post_api_qms_checks_id_submit,
        qms_compat::compat_get_api_qms_eightd,
        qms_compat::compat_post_api_qms_eightd,
        qms_compat::compat_delete_api_qms_eightd_id,
        qms_compat::compat_get_api_qms_eightd_id,
        qms_compat::compat_put_api_qms_eightd_id,
        qms_compat::compat_get_api_qms_eightd_id_audit_logs,
        qms_compat::compat_post_api_qms_eightd_id_close,
        qms_compat::compat_put_api_qms_eightd_id_d1_team,
        qms_compat::compat_post_api_qms_eightd_id_d3_containment,
        qms_compat::compat_post_api_qms_eightd_id_d4_root_cause,
        qms_compat::compat_post_api_qms_eightd_id_d5_permanent_action,
        qms_compat::compat_post_api_qms_eightd_id_d6_verify,
        qms_compat::compat_post_api_qms_eightd_id_d7_preventive,
        qms_compat::compat_get_api_qms_fmea,
        qms_compat::compat_post_api_qms_fmea,
        qms_compat::compat_get_api_qms_fmea_items,
        qms_compat::compat_post_api_qms_fmea_items,
        qms_compat::compat_delete_api_qms_fmea_items_id,
        qms_compat::compat_get_api_qms_fmea_items_id,
        qms_compat::compat_put_api_qms_fmea_items_id,
        qms_compat::compat_get_api_qms_fmea_fmeaid_statistics,
        qms_compat::compat_delete_api_qms_fmea_id,
        qms_compat::compat_get_api_qms_fmea_id,
        qms_compat::compat_put_api_qms_fmea_id,
        qms_compat::compat_get_api_qms_health,
        qms_compat::compat_delete_api_qms_issues_id,
        qms_compat::compat_get_api_qms_issues_id,
        qms_compat::compat_put_api_qms_issues_id,
        qms_compat::compat_get_api_qms_quality_costs,
        qms_compat::compat_post_api_qms_quality_costs,
        qms_compat::compat_get_api_qms_quality_costs_statistics,
        qms_compat::compat_get_api_qms_quality_costs_trend,
        qms_compat::compat_delete_api_qms_quality_costs_id,
        qms_compat::compat_get_api_qms_quality_costs_id,
        qms_compat::compat_put_api_qms_quality_costs_id,
        qms_compat::compat_get_api_qms_quality_dashboard_overview,
        qms_compat::compat_get_api_qms_spc_charts,
        qms_compat::compat_post_api_qms_spc_charts,
        qms_compat::compat_post_api_qms_spc_charts_chartid_calculate,
        qms_compat::compat_get_api_qms_spc_charts_chartid_data_points,
        qms_compat::compat_delete_api_qms_spc_charts_id,
        qms_compat::compat_get_api_qms_spc_charts_id,
        qms_compat::compat_put_api_qms_spc_charts_id,
        qms_compat::compat_post_api_qms_spc_data_points,
        qms_compat::compat_get_api_qms_standards_standardid_revisions,
        qms_compat::compat_get_api_qms_sync_records,
        qms_compat::compat_delete_api_qms_sync_records_id,
        qms_compat::compat_get_api_qms_sync_records_id,
        qms_compat::compat_post_api_qms_sync_records_id_retry,
        qms_compat::compat_post_api_qms_sync_inspection_to_lims,
        qms_compat::compat_post_api_qms_sync_issue_to_ehs,
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
        (name = "QMS-Compat", description = "QMS 前端兼容 OpenAPI 注解"),
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
    use tracing;

    #[test]
    fn extract_openapi_spec() {
        let spec = QmsApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-qms-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-qms-openapi.json");
    }
}
