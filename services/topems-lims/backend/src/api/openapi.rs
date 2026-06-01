use utoipa::OpenApi;
use utoipa::axum_extras::RouteExt;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::sample::list_samples,
        crate::api::sample::create_sample,
        crate::api::sample::get_sample,
        crate::api::sample::update_sample,
        crate::api::sample::delete_sample,
        crate::api::sample::batch_create_samples,
        crate::api::sample::batch_delete_samples,
        crate::api::sample::export_samples,
        crate::api::sample::import_samples,
        crate::api::audit::list_audit_logs,
        crate::api::audit::get_audit_log,
    ),
    components(
        schemas(
            crate::models::Sample,
            crate::models::CreateSampleRequest,
            crate::models::UpdateSampleRequest,
            crate::api::sample::ApiResponse<crate::models::Sample>,
            crate::api::sample::ApiResponse<String>,
            crate::api::sample::ApiResponse<serde_json::Value>,
            crate::api::sample::BatchCreateRequest,
            crate::api::sample::BatchDeleteRequest,
            crate::api::sample::BatchOperationResult,
            crate::models::AuditLog,
            crate::models::AuditLogQuery,
            crate::api::audit::ListAuditLogsQuery,
            crate::api::audit::ApiResponse<crate::models::AuditLog>,
            crate::api::audit::ApiResponse<serde_json::Value>,
        )
    ),
    tags(
        (name = "samples", description = "Sample management endpoints"),
        (name = "audit", description = "Audit log management endpoints"),
        (name = "health", description = "Health check endpoints")
    ),
    info(
        title = "TOPEMS LIMS API",
        version = "1.0.0",
        description = "Laboratory Information Management System API",
        contact(
            name = "TOPEMS Team",
            email = "topems@example.com"
        )
    )
)]
pub struct ApiDoc;
