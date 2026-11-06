use axum::extract::{Extension, Path, State};
use axum::Json;
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use topems_shared_core::{response::ApiResponse, TopemsError};

use crate::models::{AppState, CreateLimsQmsSyncRequest, LimsQmsSync};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:lims-qms:read"])),
    path = "/api/integration/lims-qms",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_lims_qms_sync(State(state): State<AppState>) -> ApiResponse<Vec<LimsQmsSync>> {
    match sqlx::query_as::<_, LimsQmsSync>(only_own_schema_query!(
        "integration",
        "SELECT id, lims_sample_id, qms_inspection_id, sample_name, inspection_result,
                inspection_notes, synced, sync_status, sync_error, last_synced_at,
                created_at, updated_at
           FROM integration.lims_qms_sync ORDER BY updated_at DESC LIMIT 100"
    ))
    .fetch_all(&state.pool)
    .await
    {
        Ok(syncs) => ApiResponse::success(syncs, "LIMS↔QMS syncs retrieved successfully"),
        Err(e) => {
            tracing::error!("Failed to fetch LIMS↔QMS syncs: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to fetch LIMS↔QMS syncs", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:lims-qms:write"])),
    path = "/api/integration/lims-qms",
    request_body = CreateLimsQmsSyncRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_lims_qms_sync(
    State(state): State<AppState>,
    Json(req): Json<CreateLimsQmsSyncRequest>,
) -> ApiResponse<LimsQmsSync> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let lims_uuid = match Uuid::parse_str(&req.lims_sample_id) {
        Ok(u) => u,
        Err(e) => {
            tracing::warn!("Invalid LIMS sample ID: {}", e);
            return ApiResponse::from(TopemsError::ValidationFailed(
                "Invalid LIMS sample ID".to_string(),
            ));
        }
    };

    match sqlx::query_as::<_, LimsQmsSync>(only_own_schema_query!(
        "integration",
        "INSERT INTO integration.lims_qms_sync (
            id, lims_sample_id, sample_name, inspection_result, inspection_notes,
            synced, sync_status, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, lims_sample_id, qms_inspection_id, sample_name, inspection_result,
                  inspection_notes, synced, sync_status, sync_error, last_synced_at,
                  created_at, updated_at"
    ))
    .bind(id)
    .bind(lims_uuid)
    .bind(req.sample_name)
    .bind(req.inspection_result)
    .bind(req.inspection_notes)
    .bind(false)
    .bind("pending")
    .bind(now)
    .bind(now)
    .bind(Uuid::nil())
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "LIMS↔QMS sync created successfully"),
        Err(e) => {
            tracing::error!("Failed to create LIMS↔QMS sync: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to create LIMS↔QMS sync", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:lims-qms:read"])),
    path = "/api/integration/lims-qms/{id}",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_lims_qms_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<LimsQmsSync> {
    match sqlx::query_as::<_, LimsQmsSync>(only_own_schema_query!(
        "integration",
        "SELECT id, lims_sample_id, qms_inspection_id, sample_name, inspection_result,
                inspection_notes, synced, sync_status, sync_error, last_synced_at,
                created_at, updated_at
           FROM integration.lims_qms_sync WHERE id = $1"
    ))
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "LIMS↔QMS sync found"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("Sync not found"),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to fetch sync", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:lims-qms:write"])),
    path = "/api/integration/lims-qms/{id}/sync",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_lims_qms(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<LimsQmsSync> {
    let tenant_id = topems_shared_auth::middleware::get_tenant_id_from_claims(&claims);
    let now = Utc::now();

    // Check if sync exists
    let _exists = match sqlx::query_as::<_, LimsQmsSync>(only_own_schema_query!(
        "integration",
        "SELECT id, lims_sample_id, qms_inspection_id, sample_name, inspection_result,
                inspection_notes, synced, sync_status, sync_error, last_synced_at,
                created_at, updated_at
           FROM integration.lims_qms_sync WHERE id = $1
             AND ($2::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $2::uuid)"
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(s) => s,
        Err(sqlx::Error::RowNotFound) => return ApiResponse::not_found("Sync not found"),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            return ApiResponse::from(TopemsError::internal("Failed to fetch sync", e));
        }
    };

    let qms_inspection_id = Uuid::new_v4();
    let updated_sync = match sqlx::query_as::<_, LimsQmsSync>(only_own_schema_query!(
        "integration",
        "UPDATE integration.lims_qms_sync SET
            qms_inspection_id = $2, synced = $3, sync_status = $4,
            sync_error = NULL, last_synced_at = $5, updated_at = $6
         WHERE id = $1 AND ($7::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $7::uuid)
         RETURNING id, lims_sample_id, qms_inspection_id, sample_name, inspection_result,
                  inspection_notes, synced, sync_status, sync_error, last_synced_at,
                  created_at, updated_at"
    ))
    .bind(id)
    .bind(Some(qms_inspection_id))
    .bind(true)
    .bind("synced")
    .bind(Some(now))
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to update sync: {}", e);
            return ApiResponse::from(TopemsError::internal(
                "Failed to update sync",
                e,
            ));
        }
    };

    ApiResponse::success(updated_sync, "LIMS↔QMS sync completed successfully")
}
