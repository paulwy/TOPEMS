use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::project::list_projects,
        crate::modules::project::create_project,
        crate::modules::project::get_project,
        crate::modules::project::update_project,
        crate::modules::project::delete_project,
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
        )
    ),
    tags(
        (name = "projects", description = "Project management endpoints"),
        (name = "audit", description = "Audit log management endpoints"),
        (name = "health", description = "Health check endpoints")
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
