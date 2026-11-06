use axum::extract::{Extension, Path, State};
use axum::Json;
use chrono::Utc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use topems_shared_core::{response::ApiResponse, TopemsError};

use crate::models::{AppState, CreateWmsScmSyncRequest, WmsScmSync};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:wms-scm:read"])),
    path = "/api/integration/wms-scm",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_wms_scm_sync(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<Vec<WmsScmSync>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, WmsScmSync>(only_own_schema_query!(
        "integration",
        "SELECT id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM integration.wms_scm_sync ORDER BY updated_at DESC LIMIT 100"
    ))
    .fetch_all(&mut scope)
    .await
    {
        Ok(syncs) => ApiResponse::success(syncs, "WMS↔SCM syncs retrieved successfully"),
        Err(e) => {
            tracing::error!("Failed to fetch WMS↔SCM syncs: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to fetch WMS↔SCM syncs", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:wms-scm:write"])),
    path = "/api/integration/wms-scm",
    request_body = CreateWmsScmSyncRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_wms_scm_sync(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateWmsScmSyncRequest>,
) -> ApiResponse<WmsScmSync> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let wms_uuid = match Uuid::parse_str(&req.wms_inventory_id) {
        Ok(u) => u,
        Err(e) => {
            tracing::warn!("Invalid WMS inventory ID: {}", e);
            return ApiResponse::from(TopemsError::ValidationFailed(
                "Invalid WMS inventory ID".to_string(),
            ));
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, WmsScmSync>(only_own_schema_query!(
        "integration",
        "INSERT INTO integration.wms_scm_sync (
            id, wms_inventory_id, item_name, quantity, unit,
            synced, sync_status, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                  COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid,
                           '00000000-0000-0000-0000-000000000000'::uuid))
        RETURNING id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at"
    ))
    .bind(id)
    .bind(wms_uuid)
    .bind(req.item_name)
    .bind(req.quantity)
    .bind(req.unit)
    .bind(false)
    .bind("pending")
    .bind(now)
    .bind(now)
    .fetch_one(&mut scope)
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "WMS↔SCM sync created successfully"),
        Err(e) => {
            tracing::error!("Failed to create WMS↔SCM sync: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to create WMS↔SCM sync", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:wms-scm:read"])),
    path = "/api/integration/wms-scm/{id}",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_wms_scm_sync(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Path(id): Path<Uuid>,
) -> ApiResponse<WmsScmSync> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, WmsScmSync>(only_own_schema_query!(
        "integration",
        "SELECT id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                synced, sync_status, sync_error, last_synced_at, created_at, updated_at
           FROM integration.wms_scm_sync WHERE id = $1"
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "WMS↔SCM sync found"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("Sync not found"),
        Err(e) => {
            tracing::error!("Failed to fetch sync: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to fetch sync", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:wms-scm:write"])),
    path = "/api/integration/wms-scm/{id}/sync",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_wms_scm(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Path(id): Path<Uuid>,
) -> ApiResponse<WmsScmSync> {
    let now = Utc::now();
    let scm_supply_id = Uuid::new_v4();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let updated_sync = match sqlx::query_as::<_, WmsScmSync>(only_own_schema_query!(
        "integration",
        "UPDATE integration.wms_scm_sync SET
            scm_supply_id = $2, synced = $3, sync_status = $4,
            sync_error = NULL, last_synced_at = $5, updated_at = $6
         WHERE id = $1 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
         RETURNING id, wms_inventory_id, scm_supply_id, item_name, quantity, unit,
                  synced, sync_status, sync_error, last_synced_at, created_at, updated_at"
    ))
    .bind(id)
    .bind(Some(scm_supply_id))
    .bind(true)
    .bind("synced")
    .bind(Some(now))
    .bind(now)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(s)) => s,
        Ok(None) => return ApiResponse::not_found("Sync not found"),
        Err(e) => {
            tracing::error!("Failed to update sync: {}", e);
            return ApiResponse::from(TopemsError::internal(
                "Failed to update sync",
                e,
            ));
        }
    };

    ApiResponse::success(updated_sync, "WMS↔SCM sync completed successfully")
}
