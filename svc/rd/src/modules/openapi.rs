use utoipa::OpenApi;

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
        // ===== RD compatibility paths =====
        crate::modules::rd_compat::compat_get_api_rd_bugs_id,
        crate::modules::rd_compat::compat_post_api_rd_bugs,
        crate::modules::rd_compat::compat_put_api_rd_bugs_id,
        crate::modules::rd_compat::compat_delete_api_rd_bugs_id,
        crate::modules::rd_compat::compat_get_api_rd_builds_id,
        crate::modules::rd_compat::compat_post_api_rd_builds,
        crate::modules::rd_compat::compat_get_api_rd_deploys_id,
        crate::modules::rd_compat::compat_post_api_rd_deploys,
        crate::modules::rd_compat::compat_get_api_rd_experiments_id,
        crate::modules::rd_compat::compat_post_api_rd_experiments,
        crate::modules::rd_compat::compat_put_api_rd_experiments_id,
        crate::modules::rd_compat::compat_delete_api_rd_experiments_id,
        crate::modules::rd_compat::compat_get_api_rd_experiments_project_projectid,
        crate::modules::rd_compat::compat_post_api_rd_experiments_id_advance_phase,
        crate::modules::rd_compat::compat_get_api_rd_batch_trace_batchnumber,
        crate::modules::rd_compat::compat_get_api_rd_experiments_experimentid_records,
        crate::modules::rd_compat::compat_post_api_rd_experiments_experimentid_records,
        crate::modules::rd_compat::compat_get_api_rd_formulas_id,
        crate::modules::rd_compat::compat_post_api_rd_formulas,
        crate::modules::rd_compat::compat_put_api_rd_formulas_id,
        crate::modules::rd_compat::compat_delete_api_rd_formulas_id,
        crate::modules::rd_compat::compat_get_api_rd_formulas_formulaid_versions,
        crate::modules::rd_compat::compat_post_api_rd_formulas_formulaid_versions,
        crate::modules::rd_compat::compat_post_api_rd_formulas_id_approve,
        crate::modules::rd_compat::compat_get_api_rd_health,
        crate::modules::rd_compat::compat_get_api_rd_materials_id,
        crate::modules::rd_compat::compat_post_api_rd_materials,
        crate::modules::rd_compat::compat_put_api_rd_materials_id,
        crate::modules::rd_compat::compat_delete_api_rd_materials_id,
        crate::modules::rd_compat::compat_delete_api_rd_materials_batch,
        crate::modules::rd_compat::compat_post_api_rd_materials_import,
        crate::modules::rd_compat::compat_get_api_rd_statistics,
        // === RD-Compat: missing project & audit-log endpoints ===
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
        (name = "RD-Compat", description = "RD 前端兼容 OpenAPI 注解")
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
        println!("OpenAPI spec written to /tmp/topems-rd-openapi.json");
    }
}
