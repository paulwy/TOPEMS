use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

use crate::mes_erp_sync;
use crate::models::{AppState, CreateMesErpSyncRequest, MesErpSync};
use topems_shared_auth::get_tenant_id_from_claims;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncErpToMesRequest {
    pub erp_order_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncMesToErpRequest {
    pub mes_order_id: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:mes-erp:read"])),
    path = "/api/integration/mes-erp",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_mes_erp_sync(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<MesErpSync>>> {
    match sqlx::query_as::<_, MesErpSync>(
        "SELECT id, mes_order_id, erp_order_id, order_number, product_name, quantity,
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM mes_erp_sync ORDER BY updated_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(syncs) => Json(ApiResponse::success(
            syncs,
            "MES↔ERP syncs retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔ERP syncs: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔ERP syncs: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:mes-erp:write"])),
    path = "/api/integration/mes-erp",
    request_body = CreateMesErpSyncRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_mes_erp_sync(
    State(state): State<AppState>,
    Json(req): Json<CreateMesErpSyncRequest>,
) -> Json<ApiResponse<MesErpSync>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let mes_uuid = match Uuid::parse_str(&req.mes_order_id) {
        Ok(u) => u,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid MES order ID: {}", e),
            ))
        }
    };

    match sqlx::query_as::<_, MesErpSync>(
        "INSERT INTO mes_erp_sync (
            id, mes_order_id, order_number, product_name, quantity,
            synced, sync_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, mes_order_id, erp_order_id, order_number, product_name, quantity,
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(mes_uuid)
    .bind(req.order_number)
    .bind(req.product_name)
    .bind(req.quantity)
    .bind(false)
    .bind("pending")
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "MES↔ERP sync created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create MES↔ERP sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create MES↔ERP sync: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:mes-erp:read"])),
    path = "/api/integration/mes-erp/{id}",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_mes_erp_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MesErpSync>> {
    match sqlx::query_as::<_, MesErpSync>(
        "SELECT id, mes_order_id, erp_order_id, order_number, product_name, quantity,
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM mes_erp_sync WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(sync) => Json(ApiResponse::success(sync, "MES↔ERP sync found")),
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
    security(("BearerAuth" = ["integration:sync:mes-erp:write"])),
    path = "/api/integration/mes-erp/{id}/sync",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_mes_erp(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MesErpSync>> {
    let now = Utc::now();
    let erp_order_id = Uuid::new_v4();

    let updated_sync = match sqlx::query_as::<_, MesErpSync>(
        "UPDATE mes_erp_sync SET
            erp_order_id = $2, synced = $3, sync_status = $4,
            sync_error = NULL, last_synced_at = $5, updated_at = $6
         WHERE id = $1
         RETURNING id, mes_order_id, erp_order_id, order_number, product_name, quantity,
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at",
    )
    .bind(id)
    .bind(Some(erp_order_id))
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
        "MES↔ERP sync completed successfully",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:write"])),
    path = "/api/integration/mes-erp/sync/erp-to-mes",
    request_body = SyncErpToMesRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_erp_order_to_mes(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<SyncErpToMesRequest>,
) -> Json<ApiResponse<mes_erp_sync::SyncResult>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let erp_order_id = match Uuid::parse_str(&req.erp_order_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid ERP order ID: {}", e),
            ));
        }
    };

    match state
        .mes_erp_sync_service
        .sync_erp_to_mes(tenant_id, erp_order_id)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "ERP→MES 同步成功")),
        Err(e) => {
            tracing::error!("ERP→MES sync failed: {}", e);
            Json(ApiResponse::error(500, &format!("ERP→MES 同步失败: {}", e)))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:write"])),
    path = "/api/integration/mes-erp/sync/mes-to-erp",
    request_body = SyncMesToErpRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_mes_progress_to_erp(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<SyncMesToErpRequest>,
) -> Json<ApiResponse<mes_erp_sync::SyncResult>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mes_order_id = match Uuid::parse_str(&req.mes_order_id) {
        Ok(id) => id,
        Err(e) => {
            return Json(ApiResponse::error(
                400,
                &format!("Invalid MES order ID: {}", e),
            ));
        }
    };

    match state
        .mes_erp_sync_service
        .sync_mes_progress_to_erp(tenant_id, mes_order_id)
        .await
    {
        Ok(result) => Json(ApiResponse::success(result, "MES→ERP 进度同步成功")),
        Err(e) => {
            tracing::error!("MES→ERP progress sync failed: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("MES→ERP 进度同步失败: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:mes-erp:write"])),
    path = "/api/integration/mes-erp/{id}/retry",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn retry_mes_erp_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<mes_erp_sync::SyncResult>> {
    match state.mes_erp_sync_service.retry_failed_sync(id).await {
        Ok(result) => Json(ApiResponse::success(result, "MES↔ERP 同步重试成功")),
        Err(e) => {
            tracing::error!("MES↔ERP sync retry failed: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("MES↔ERP 同步重试失败: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:read"])),
    path = "/api/integration/mes-erp/{id}/logs",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_mes_erp_sync_logs(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<mes_erp_sync::SyncLog>>> {
    match state.mes_erp_sync_service.get_sync_logs(id).await {
        Ok(logs) => Json(ApiResponse::success(logs, "同步日志获取成功")),
        Err(e) => {
            tracing::error!("Failed to fetch sync logs: {}", e);
            Json(ApiResponse::error(500, &format!("获取同步日志失败: {}", e)))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:read"])),
    path = "/api/integration/mes-erp/records",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_mes_erp_sync_records(
    State(state): State<AppState>,
    Query(query): Query<HashMap<String, String>>,
) -> Json<ApiResponse<Vec<mes_erp_sync::MesErpSyncRecord>>> {
    let direction = query.get("direction").map(|s| s.as_str());
    let status = query.get("status").map(|s| s.as_str());
    let limit = query
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(100);
    let offset = query
        .get("offset")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    match state
        .mes_erp_sync_service
        .list_sync_records(direction, status, limit, offset)
        .await
    {
        Ok(records) => Json(ApiResponse::success(records, "同步记录获取成功")),
        Err(e) => {
            tracing::error!("Failed to fetch sync records: {}", e);
            Json(ApiResponse::error(500, &format!("获取同步记录失败: {}", e)))
        }
    }
}
