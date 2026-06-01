use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::project::list_projects,
        crate::api::project::create_project,
        crate::api::project::get_project,
        crate::api::project::update_project,
        crate::api::project::delete_project,
        crate::api::audit::list_audit_logs,
        crate::api::audit::get_audit_log,
    ),
    components(
        schemas(
            crate::models::Project,
            crate::models::CreateProjectRequest,
            crate::models::UpdateProjectRequest,
            crate::models::ProjectType,
            crate::models::ProjectStatus,
            crate::api::project::BatchCreateRequest,
            crate::api::project::BatchDeleteRequest,
            crate::api::project::BatchOperationResult,
            crate::models::AuditLog,
            crate::models::AuditLogQuery,
            crate::api::audit::ListAuditLogsQuery,
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
