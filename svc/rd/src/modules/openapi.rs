use utoipa::OpenApi;

// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
// =============================================================================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/health",
    tag = "rd",
    responses((status = 200, description = "health_check OK")),
)]
fn _health_check() {}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/health/detailed",
    tag = "rd",
    responses((status = 200, description = "health_check_detailed OK")),
)]
fn _health_check_detailed() {}

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::project::list_projects,
        crate::modules::project::create_project,
        crate::modules::project::get_project,
        crate::modules::project::update_project,
        crate::modules::project::delete_project,
        crate::modules::project::batch_create_projects,
        crate::modules::project::batch_delete_projects,
        crate::modules::project::export_projects,
        crate::modules::project::import_projects,
        crate::modules::project::get_project_dashboard,
        crate::modules::project::get_project_gantt,
        crate::modules::audit::list_audit_logs,
        crate::modules::audit::get_audit_log,
        crate::modules::patent::list_patents,
        crate::modules::patent::list_patents_by_project,
        crate::modules::patent::get_patent,
        crate::modules::audit::list_audit_logs,
        crate::modules::audit::get_audit_log,
        crate::modules::audit::export_audit_logs,
        crate::modules::doc_integration::list_documents,
        crate::modules::doc_integration::create_document_relation,
        crate::modules::doc_integration::get_document_relation,
        crate::modules::doc_integration::delete_document_relation,
        crate::modules::doc_integration::get_entity_documents,
        crate::modules::project_member::create_member,
        crate::modules::project_member::get_project_members,
        crate::modules::project_member::update_member,
        crate::modules::project_member::delete_member,
        crate::modules::formula::list_formulas,
        crate::modules::formula::get_formula,
        crate::modules::formula::get_formula_versions,
        crate::modules::formula::approve_formula,
        crate::modules::material::list_material_tests,
        crate::modules::material::list_by_project,
        crate::modules::material::list_by_experiment,
        crate::modules::material::get_material_test,
        crate::modules::change_management::list_change_requests,
        crate::modules::change_management::get_change_request,
        crate::modules::change_management::transition_change_request,
        crate::modules::change_management::create_change_order,
        crate::modules::change_management::list_change_orders,
        crate::modules::project_milestone::create_milestone,
        crate::modules::project_milestone::get_project_milestones,
        crate::modules::project_milestone::update_milestone,
        crate::modules::project_milestone::delete_milestone,
        crate::modules::research_cost::list_costs,
        crate::modules::research_cost::get_cost,
        crate::modules::research_cost::list_costs_by_project,
        crate::modules::research_cost::get_cost_statistics,
        crate::modules::ai_integration::list_analyses,
        crate::modules::ai_integration::create_analysis,
        crate::modules::ai_integration::get_analysis,
        crate::modules::ai_integration::ai_chat,
        crate::modules::ai_integration::get_entity_analyses,
        crate::modules::project::list_projects,
        crate::modules::project::create_project,
        crate::modules::project::get_project,
        crate::modules::project::update_project,
        crate::modules::project::delete_project,
        crate::modules::project::batch_create_projects,
        crate::modules::project::batch_delete_projects,
        crate::modules::project::export_projects,
        crate::modules::project::import_projects,
        crate::modules::project::get_project_dashboard,
        crate::modules::project::get_project_gantt,
        crate::modules::rd_ci_cd::list_bugs,
        crate::modules::rd_ci_cd::get_bug,
        crate::modules::rd_ci_cd::list_builds,
        crate::modules::rd_ci_cd::get_build,
        crate::modules::rd_ci_cd::list_deploys,
        crate::modules::rd_ci_cd::get_deploy,
        crate::modules::rd_ci_cd::list_tests,
        crate::modules::rd_ci_cd::get_test,
        crate::modules::statistics::get_statistics,
        crate::modules::project_phase::create_phase,
        crate::modules::project_phase::get_project_phases,
        crate::modules::project_phase::update_phase,
        crate::modules::project_phase::delete_phase,
        crate::modules::project_report::get_project_summary,
        crate::modules::project_report::get_project_trends,
        crate::modules::project_report::get_project_type_stats,
        crate::modules::project_report::get_performance_metrics,
        crate::modules::project_report::get_project_detail_report,
        crate::modules::settings::get_settings,
        crate::modules::experiment::list_experiments,
        crate::modules::experiment::get_experiment,
        crate::modules::experiment::get_experiment_records,
        crate::modules::experiment::list_lab_experiments,
        crate::modules::experiment::list_pilot_experiments,
        crate::modules::experiment::list_scaleup_experiments,
        crate::modules::experiment::advance_phase,
        crate::modules::experiment::trace_batch,
            crate::modules::rs_plugin::get_plugin_info,
        crate::modules::rs_plugin::plugin_health_check,
        _health_check,
        _health_check_detailed,
),
    components(
        schemas(
            crate::models::Project,
            crate::models::CreateProjectRequest,
            crate::models::UpdateProjectRequest,
            crate::models::ProjectType,
            crate::models::ProjectStatus,
            crate::modules::project::BatchCreateRequest,
            crate::modules::project::BatchDeleteRequest,
            crate::modules::project::BatchOperationResult,
            crate::models::AuditLog,
            crate::models::AuditLogQuery,
            crate::modules::audit::ListAuditLogsQuery,
            crate::modules::project::ProjectDashboardResponse,
            crate::modules::project::ProjectGanttResponse,
            crate::modules::project::GanttPhase,
            crate::modules::project::GanttMilestone,
            crate::modules::project::GanttResource,
        )
    ),
    tags(
        (name = "projects", description = "Project management endpoints"),
        (name = "audit", description = "Audit log management endpoints"),
        (name = "health", description = "Health check endpoints"),
        (name = "patent", description = "patent 接口"),
        (name = "doc_integration", description = "doc_integration 接口"),
        (name = "project_member", description = "project_member 接口"),
        (name = "formula", description = "formula 接口"),
        (name = "material", description = "material 接口"),
        (name = "change_management", description = "change_management 接口"),
        (name = "project_milestone", description = "project_milestone 接口"),
        (name = "research_cost", description = "research_cost 接口"),
        (name = "ai_integration", description = "ai_integration 接口"),
        (name = "project", description = "project 接口"),
        (name = "rd_ci_cd", description = "rd_ci_cd 接口"),
        (name = "statistics", description = "statistics 接口"),
        (name = "project_phase", description = "project_phase 接口"),
        (name = "project_report", description = "project_report 接口"),
        (name = "settings", description = "settings 接口"),
        (name = "experiment", description = "experiment 接口"),
    ),
    info(
        title = "TOPEMS RS API",
        version = "1.0.0",
        description = "Research Management System API",
        contact(
            name = "TOPEMS Team",
            email = "topems@example.com"
        )
    )
)]
pub struct ApiDoc;

#[cfg(test)]
mod tests {
    use super::ApiDoc;
    use utoipa::OpenApi;

    #[test]
    fn extract_openapi_spec() {
        let spec = ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-rd-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-rd-openapi.json");
    }
}
