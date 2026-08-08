use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use std::collections::HashMap;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

use crate::mes_qms_integration;
use crate::models::{get_tenant_id, AppState};

pub async fn list_mes_qms_sync_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Query(query): Query<HashMap<String, String>>,
) -> Json<ApiResponse<Vec<mes_qms_integration::MesQmsSync>>> {
    let tenant_id = get_tenant_id(&claims);
    let sync_type = query.get("sync_type").map(|s| s.as_str());
    let direction = query.get("direction").map(|s| s.as_str());
    let status = query.get("status").map(|s| s.as_str());
    let limit = query
        .get("limit")
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(100);

    match mes_qms_integration::list_mes_qms_sync(
        &state.pool,
        tenant_id,
        sync_type,
        direction,
        status,
        limit,
    )
    .await
    {
        Ok(syncs) => Json(ApiResponse::success(
            syncs,
            "MES↔QMS sync records retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS syncs: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔QMS syncs: {}", e),
            ))
        }
    }
}

pub async fn get_mes_qms_sync_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    match mes_qms_integration::get_mes_qms_sync(&state.pool, id).await {
        Ok(Some(sync)) => Json(ApiResponse::success(sync, "MES↔QMS sync found")),
        Ok(None) => Json(ApiResponse::error(404, "MES↔QMS sync not found")),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔QMS sync: {}", e),
            ))
        }
    }
}

pub async fn get_mes_qms_stats_api(
    State(state): State<AppState>,
) -> Json<ApiResponse<mes_qms_integration::SyncStats>> {
    match mes_qms_integration::get_mes_qms_sync_stats(&state.pool).await {
        Ok(stats) => Json(ApiResponse::success(
            stats,
            "MES↔QMS sync stats retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch MES↔QMS stats: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch MES↔QMS stats: {}", e),
            ))
        }
    }
}

pub async fn trigger_qms_inspection_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<mes_qms_integration::TriggerInspectionRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::trigger_qms_inspection(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "QMS inspection triggered successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to trigger QMS inspection: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to trigger QMS inspection: {}", e),
            ))
        }
    }
}

pub async fn sync_quality_result_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<mes_qms_integration::SyncQualityResultRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::sync_quality_result_to_mes(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "Quality result synced to MES successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to sync quality result to MES: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to sync quality result to MES: {}", e),
            ))
        }
    }
}

pub async fn sync_trace_chain_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<mes_qms_integration::TraceChainSyncRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::sync_trace_chain_data(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "Trace chain data synced successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to sync trace chain data: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to sync trace chain data: {}", e),
            ))
        }
    }
}

pub async fn defect_handling_api(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<mes_qms_integration::DefectHandlingRequest>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    let tenant_id = get_tenant_id(&claims);
    match mes_qms_integration::handle_defect_handling(
        &state.pool,
        tenant_id,
        &state.mes_url,
        &state.qms_url,
        &req,
    )
    .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "Defect handling processed successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to process defect handling: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to process defect handling: {}", e),
            ))
        }
    }
}

pub async fn retry_mes_qms_sync_api(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<mes_qms_integration::MesQmsSync>> {
    match mes_qms_integration::retry_failed_sync(&state.pool, &state.mes_url, &state.qms_url, id)
        .await
    {
        Ok(sync) => Json(ApiResponse::success(
            sync,
            "MES↔QMS sync retried successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to retry MES↔QMS sync: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to retry MES↔QMS sync: {}", e),
            ))
        }
    }
}
