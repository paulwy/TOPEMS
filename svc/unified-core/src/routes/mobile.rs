use axum::routing::{delete, get, post};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn mobile_sync_routes(state: &AppState) -> Router<AppState> {
    let sync_read = Router::new()
        .route(
            "/sync/v1/task/{task_id}",
            get(modules::sync::handlers::get_task),
        )
        .route(
            "/sync/v1/pending",
            get(modules::sync::handlers::get_pending),
        )
        .route(
            "/sync/v1/statistics",
            get(modules::sync::handlers::get_statistics),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:read"),
        ));

    let sync_write = Router::new()
        .route("/sync/v1/task", post(modules::sync::handlers::create_task))
        .route(
            "/sync/v1/task/{task_id}/status",
            post(modules::sync::handlers::update_status),
        )
        .route(
            "/sync/v1/retry-failed",
            post(modules::sync::handlers::retry_failed),
        )
        .route(
            "/sync/v1/trigger/scm-to-wms",
            post(modules::sync::handlers::trigger_scm_wms),
        )
        .route(
            "/sync/v1/trigger/wms-to-crm",
            post(modules::sync::handlers::trigger_wms_crm),
        )
        .route(
            "/sync/v1/trigger/srm-to-scm",
            post(modules::sync::handlers::trigger_srm_scm),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:write"),
        ));

    let mobile_offline = Router::new()
        .route(
            "/sync/v1/mobile/sync",
            post(modules::sync::handlers::mobile_sync_records),
        )
        .route(
            "/sync/v1/mobile/pending",
            get(modules::sync::handlers::mobile_get_pending_records),
        )
        .route(
            "/sync/v1/mobile/records/{record_id}/synced",
            post(modules::sync::handlers::mobile_mark_synced),
        )
        .route(
            "/sync/v1/mobile/records/synced/clear",
            delete(modules::sync::handlers::mobile_clear_synced),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:write"),
        ));

    sync_read.merge(sync_write).merge(mobile_offline)
}

pub fn mobile_routes(state: &AppState) -> Router<AppState> {
    mobile_sync_routes(state).merge(modules::mobile::create_mobile_routes(state))
}
