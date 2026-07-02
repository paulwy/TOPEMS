use axum::{
    extract::{Json, Path, State},
    http::HeaderMap,
};
use std::time::Instant;

use super::models::*;
use super::service::MigrationServiceLayer;
use crate::{AppState, CoreResponse};

pub async fn list_services(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<MigrationService>>> {
    let start_time = Instant::now();
    tracing::info!("[Migration] list_services START");

    let service_layer = MigrationServiceLayer::new(state.pool.clone());

    let result = match service_layer.list_services().await {
        Ok(services) => {
            let elapsed = start_time.elapsed();
            tracing::info!(
                "[Migration] list_services END - count: {}, elapsed: {:?}",
                services.len(),
                elapsed
            );
            Json(CoreResponse::success(services, "Services retrieved"))
        }
        Err(e) => {
            let elapsed = start_time.elapsed();
            tracing::error!(
                "[Migration] list_services ERROR - elapsed: {:?}, error: {}",
                elapsed,
                e
            );
            Json(CoreResponse::error(&format!(
                "Failed to list services: {}",
                e
            )))
        }
    };

    result
}

pub async fn get_status(
    State(state): State<AppState>,
    Path(service_name): Path<String>,
    headers: HeaderMap,
) -> Json<CoreResponse<MigrationStatus>> {
    let start_time = Instant::now();
    let x_debug = headers.get("X-Debug").map(|h| h.to_str().unwrap_or(""));
    tracing::info!(
        "[Migration] get_status START - service: {}, X-Debug: {:?}",
        service_name,
        x_debug
    );

    let service_layer = MigrationServiceLayer::new(state.pool.clone());

    let result = match service_layer.get_status(&service_name).await {
        Ok(status) => {
            let elapsed = start_time.elapsed();
            tracing::info!(
                "[Migration] get_status END - service: {}, pending: {}, applied: {}, elapsed: {:?}",
                service_name,
                status.pending.len(),
                status.applied.len(),
                elapsed
            );
            Json(CoreResponse::success(status, "Status retrieved"))
        }
        Err(e) => {
            let elapsed = start_time.elapsed();
            tracing::error!(
                "[Migration] get_status ERROR - service: {}, elapsed: {:?}, error: {}",
                service_name,
                elapsed,
                e
            );
            Json(CoreResponse::error(&format!("Failed to get status: {}", e)))
        }
    };

    result
}

pub async fn apply_migration(
    State(state): State<AppState>,
    Path(service_name): Path<String>,
    Json(req): Json<ApplyMigrationRequest>,
) -> Json<CoreResponse<MigrationApplyResult>> {
    tracing::info!(
        "[Migration] Applying migration for service: {}, type: {}",
        service_name,
        req.r#type
    );

    let service_layer = MigrationServiceLayer::new(state.pool.clone());
    let migration_type = req.r#type.as_str();

    match service_layer
        .apply_migration(&service_name, migration_type)
        .await
    {
        Ok(result) => Json(CoreResponse::success(result, "Migration applied")),
        Err(e) => {
            tracing::error!(
                "[Migration] Failed to apply migration for {}: {}",
                service_name,
                e
            );
            Json(CoreResponse::error(&format!(
                "Failed to apply migration: {}",
                e
            )))
        }
    }
}

pub async fn rollback_migration(
    State(state): State<AppState>,
    Path(service_name): Path<String>,
    Json(req): Json<RollbackMigrationRequest>,
) -> Json<CoreResponse<RollbackResult>> {
    tracing::info!(
        "[Migration] Rolling back migration for service: {}, version: {:?}",
        service_name,
        req.version
    );

    let service_layer = MigrationServiceLayer::new(state.pool.clone());

    match service_layer
        .rollback_migration(&service_name, req.version.as_deref())
        .await
    {
        Ok(result) => Json(CoreResponse::success(result, "Rollback completed")),
        Err(e) => {
            tracing::error!(
                "[Migration] Failed to rollback migration for {}: {}",
                service_name,
                e
            );
            Json(CoreResponse::error(&format!(
                "Failed to rollback migration: {}",
                e
            )))
        }
    }
}
