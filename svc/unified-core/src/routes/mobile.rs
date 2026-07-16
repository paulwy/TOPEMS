use axum::routing::{delete, get, post};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn mobile_routes(state: &AppState) -> Router<AppState> {
    let sync_read = Router::new()
        .route(
            "/api/core/sync/task/{task_id}",
            get(modules::sync::handlers::get_task),
        )
        .route(
            "/api/core/sync/pending",
            get(modules::sync::handlers::get_pending),
        )
        .route(
            "/api/core/sync/statistics",
            get(modules::sync::handlers::get_statistics),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:read"),
        ));

    let sync_write = Router::new()
        .route(
            "/api/core/sync/task",
            post(modules::sync::handlers::create_task),
        )
        .route(
            "/api/core/sync/task/{task_id}/status",
            post(modules::sync::handlers::update_status),
        )
        .route(
            "/api/core/sync/retry-failed",
            post(modules::sync::handlers::retry_failed),
        )
        .route(
            "/api/core/sync/trigger/scm-to-wms",
            post(modules::sync::handlers::trigger_scm_wms),
        )
        .route(
            "/api/core/sync/trigger/wms-to-crm",
            post(modules::sync::handlers::trigger_wms_crm),
        )
        .route(
            "/api/core/sync/trigger/srm-to-scm",
            post(modules::sync::handlers::trigger_srm_scm),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:write"),
        ));

    let mobile_offline = Router::new()
        .route(
            "/api/core/sync/mobile/sync",
            post(modules::sync::handlers::mobile_sync_records),
        )
        .route(
            "/api/core/sync/mobile/pending",
            get(modules::sync::handlers::mobile_get_pending_records),
        )
        .route(
            "/api/core/sync/mobile/records/{record_id}/synced",
            post(modules::sync::handlers::mobile_mark_synced),
        )
        .route(
            "/api/core/sync/mobile/records/synced/clear",
            delete(modules::sync::handlers::mobile_clear_synced),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:write"),
        ));

    let mobile_api = modules::mobile::create_mobile_routes(state);

    sync_read
        .merge(sync_write)
        .merge(mobile_offline)
        .merge(mobile_api)
}
