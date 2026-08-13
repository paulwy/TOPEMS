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
