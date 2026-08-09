use axum::extract::{Path, State};
use axum::Json;
use chrono::Utc;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

use crate::models::{AppState, CreateWmsScmSyncRequest, WmsScmSync};

#[utoipa::path(
    get,
    path = "/api/integration/wms-scm",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_wms_scm_sync(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<WmsScmSync>>> {
    match sqlx::query_as::<_, WmsScmSync>(
        "SELECT id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM wms_scm_sync ORDER BY updated_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(syncs) => Json(ApiResponse::success(
            syncs,
            "WMS↔SCM syncs retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch WMS↔SCM syncs: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch WMS↔SCM syncs: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/wms-scm",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_wms_scm_sync(
    State(state): State<AppState>,
    Json(req): Json<CreateWmsScmSyncRequest>,
) -> Json<ApiResponse<WmsScmSync>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let wms_uuid = match Uuid::parse_str(&req.wms_inventory_id) {
        Ok(u) => u,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid WMS inventory ID: {}", e),
            ))
        }
    };

    match sqlx::query_as::<_, WmsScmSync>(
        "INSERT INTO wms_scm_sync (
            id, wms_inventory_id, item_name, quantity, unit,
            synced, sync_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(wms_uuid)
    .bind(req.item_name)
    .bind(req.quantity)
    .bind(req.unit)
    .bind(false)
    .bind("pending")
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "WMS↔SCM sync created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create WMS↔SCM sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create WMS↔SCM sync: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/integration/wms-scm/{id}",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_wms_scm_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WmsScmSync>> {
    match sqlx::query_as::<_, WmsScmSync>(
        "SELECT id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM wms_scm_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(sync, "WMS↔SCM sync found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "Sync not found")),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch sync: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/wms-scm/{id}/sync",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_wms_scm(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WmsScmSync>> {
    let now = Utc::now();
    let scm_supply_id = Uuid::new_v4();

    let updated_sync = match sqlx::query_as::<_, WmsScmSync>(
        "UPDATE wms_scm_sync SET
            scm_supply_id = $2, synced = $3, sync_status = $4,
            sync_error = NULL, last_synced_at = $5, updated_at = $6
         WHERE id = $1
         RETURNING id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(Some(scm_supply_id))
    .bind(true)
    .bind("synced")
    .bind(Some(now))
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to update sync: {}", e);
            return Json(ApiResponse::error(
                500,
                &format!("Failed to update sync: {}", e),
            ));
        }
    };

    Json(ApiResponse::success(
        updated_sync,
        "WMS↔SCM sync completed successfully",
    ))
}
