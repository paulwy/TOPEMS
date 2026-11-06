use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use std::collections::HashMap;
use uuid::Uuid;

use topems_shared_core::{response::ApiResponse, TopemsError};

use crate::mes_qms_integration;
use crate::models::AppState;
use topems_shared_auth::get_tenant_id_from_claims;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:mes-qms:read"])),
    path = "/api/integration/mes-qms",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_mes_qms_sync_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Query(query): Query<HashMap<String, String>>,
) -> ApiResponse<Vec<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let sync_type = query.get("sync_type").map(|s| s.as_str());
    let direction = query.get("direction").map(|s| s.as_str());
    let status = query.get("status").map(|s| s.as_str());
    let limit = query
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(100);

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

    match mes_qms_integration::list_mes_qms_sync(
        &mut scope, tenant_id, sync_type, direction, status, limit,
    )
    .await
    {
        Ok(syncs) => ApiResponse::success(syncs, "MES↔QMS sync records retrieved successfully"),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS syncs: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to fetch MES↔QMS syncs", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:mes-qms:read"])),
    path = "/api/integration/mes-qms/{id}",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_mes_qms_sync_api(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Path(id): Path<Uuid>,
) -> ApiResponse<mes_qms_integration::MesQmsSync> {
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

    match mes_qms_integration::get_mes_qms_sync(&mut scope, id).await {
        Ok(Some(sync)) => ApiResponse::success(sync, "MES↔QMS sync found"),
        Ok(None) => ApiResponse::not_found("MES↔QMS sync not found"),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS sync: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to fetch MES↔QMS sync", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:mes-qms:read"])),
    path = "/api/integration/mes-qms/stats",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_mes_qms_stats_api(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<mes_qms_integration::SyncStats> {
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

    match mes_qms_integration::get_mes_qms_sync_stats(&mut scope).await {
        Ok(stats) => ApiResponse::success(stats, "MES↔QMS sync stats retrieved successfully"),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS stats: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to fetch MES↔QMS stats", e))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:admin"])),
    path = "/api/integration/mes-qms/trigger-inspection",
    request_body = mes_qms_integration::TriggerInspectionRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn trigger_qms_inspection_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<mes_qms_integration::TriggerInspectionRequest>,
) -> ApiResponse<mes_qms_integration::MesQmsSync> {
    let tenant_id = get_tenant_id_from_claims(&claims);
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

    match mes_qms_integration::trigger_qms_inspection(
        &mut scope,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "QMS inspection triggered successfully"),
        Err(e) => {
            tracing::error!("Failed to trigger QMS inspection: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to trigger QMS inspection", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:write"])),
    path = "/api/integration/mes-qms/sync-result",
    request_body = mes_qms_integration::SyncQualityResultRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_quality_result_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<mes_qms_integration::SyncQualityResultRequest>,
) -> ApiResponse<mes_qms_integration::MesQmsSync> {
    let tenant_id = get_tenant_id_from_claims(&claims);
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

    match mes_qms_integration::sync_quality_result_to_mes(
        &mut scope,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "Quality result synced to MES successfully"),
        Err(e) => {
            tracing::error!("Failed to sync quality result to MES: {}", e);
            ApiResponse::from(TopemsError::internal(
                "Failed to sync quality result to MES",
                e,
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:write"])),
    path = "/api/integration/mes-qms/sync-trace",
    request_body = mes_qms_integration::TraceChainSyncRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn sync_trace_chain_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<mes_qms_integration::TraceChainSyncRequest>,
) -> ApiResponse<mes_qms_integration::MesQmsSync> {
    let tenant_id = get_tenant_id_from_claims(&claims);
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

    match mes_qms_integration::sync_trace_chain_data(
        &mut scope,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "Trace chain data synced successfully"),
        Err(e) => {
            tracing::error!("Failed to sync trace chain data: {}", e);
            ApiResponse::from(TopemsError::internal("Failed to sync trace chain data", e))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:write"])),
    path = "/api/integration/mes-qms/defect-handling",
    request_body = mes_qms_integration::DefectHandlingRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn defect_handling_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<mes_qms_integration::DefectHandlingRequest>,
) -> ApiResponse<mes_qms_integration::MesQmsSync> {
    let tenant_id = get_tenant_id_from_claims(&claims);
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

    match mes_qms_integration::handle_defect_handling(
        &mut scope,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => ApiResponse::success(sync, "Defect handling processed successfully"),
        Err(e) => {
            tracing::error!("Failed to process defect handling: {}", e);
            ApiResponse::from(TopemsError::internal(
                "Failed to process defect handling",
                e,
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:mes-qms:write"])),
    path = "/api/integration/mes-qms/{id}/retry",
    tag = "integration",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn retry_mes_qms_sync_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<mes_qms_integration::MesQmsSync> {
    match mes_qms_integration::retry_failed_sync(&state.db, &state.mes_url, &state.qms_url, id)
        .await
    {
        Ok(sync) => ApiResponse::success(sync, "MES↔QMS sync retried successfully"),
        Err(e) => {
            tracing::error!("Failed to retry MES↔QMS sync: {}", e);
            ApiResponse::from(e)
        }
    }
}
