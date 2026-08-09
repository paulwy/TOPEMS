use axum::extract::State;
use axum::Json;
use sqlx::Row;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

use crate::models::{AppState, CreateIntegrationEventRequest, IntegrationEvent, SyncStats};

#[utoipa::path(
    get,
    path = "/api/integration/stats",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_sync_stats(State(state): State<AppState>) -> Json<ApiResponse<SyncStats>> {
    let lims_qms_result = sqlx::query(
        "SELECT COUNT(*) as total,
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM lims_qms_sync",
    )
    .fetch_one(&state.pool)
    .await;

    let (lims_qms_total, lims_qms_synced, lims_qms_failed) = match lims_qms_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let mes_erp_result = sqlx::query(
        "SELECT COUNT(*) as total,
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM mes_erp_sync",
    )
    .fetch_one(&state.pool)
    .await;

    let (mes_erp_total, mes_erp_synced, mes_erp_failed) = match mes_erp_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let wms_scm_result = sqlx::query(
        "SELECT COUNT(*) as total,
                SUM(CASE WHEN synced THEN 1 ELSE 0 END) as synced,
                SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
           FROM wms_scm_sync",
    )
    .fetch_one(&state.pool)
    .await;

    let (wms_scm_total, wms_scm_synced, wms_scm_failed) = match wms_scm_result {
        Ok(row) => (
            row.try_get("total").unwrap_or(0),
            row.try_get("synced").unwrap_or(0),
            row.try_get("failed").unwrap_or(0),
        ),
        Err(_) => (0, 0, 0),
    };

    let last_sync_result = sqlx::query(
        "SELECT MAX(last_synced_at) as last_sync FROM (
            SELECT MAX(last_synced_at) as last_synced_at FROM lims_qms_sync
            UNION ALL
            SELECT MAX(last_synced_at) as last_synced_at FROM mes_erp_sync
            UNION ALL
            SELECT MAX(last_synced_at) as last_synced_at FROM wms_scm_sync
        ) t",
    )
    .fetch_one(&state.pool)
    .await;

    let last_sync = last_sync_result
        .ok()
        .and_then(|row| row.try_get("last_sync").ok());

    let stats = SyncStats {
        lims_qms_total,
        lims_qms_synced,
        lims_qms_failed,
        mes_erp_total,
        mes_erp_synced,
        mes_erp_failed,
        wms_scm_total,
        wms_scm_synced,
        wms_scm_failed,
        last_sync,
    };

    Json(ApiResponse::success(
        stats,
        "Sync stats retrieved successfully",
    ))
}

#[utoipa::path(
    get,
    path = "/api/integration/events",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_events(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<IntegrationEvent>>> {
    match sqlx::query_as::<_, IntegrationEvent>(
        "SELECT id, source_system, target_system, event_type, source_record_id,
                target_record_id, payload, status, error_message, synced_at, created_at
           FROM integration_events ORDER BY created_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(events) => Json(ApiResponse::success(
            events,
            "Events retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch events: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to fetch events: {}", e),
            ))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/events",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_event(
    State(state): State<AppState>,
    Json(req): Json<CreateIntegrationEventRequest>,
) -> Json<ApiResponse<IntegrationEvent>> {
    let id = Uuid::new_v4();
    let source_uuid = req.source_record_id.and_then(|s| Uuid::parse_str(&s).ok());

    match sqlx::query_as::<_, IntegrationEvent>(
        "INSERT INTO integration_events (
            id, source_system, target_system, event_type, source_record_id, payload
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, source_system, target_system, event_type, source_record_id,
                  target_record_id, payload, status, error_message, synced_at, created_at",
    )
    .bind(id)
    .bind(req.source_system)
    .bind(req.target_system)
    .bind(req.event_type)
    .bind(source_uuid)
    .bind(req.payload)
    .fetch_one(&state.pool)
    .await
    {
        Ok(event) => Json(ApiResponse::success(event, "Event created successfully")),
        Err(e) => {
            tracing::error!("Failed to create event: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to create event: {}", e),
            ))
        }
    }
}
